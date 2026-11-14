#!/usr/bin/env python3
"""Convert a Fusion 360 STEP assembly into a coloured, web-sized GLB.

The STEP is read with the XCAF reader so the assembly structure and the
COLOUR_RGB values survive the conversion. Every solid body is meshed with
OpenCASCADE, tagged with its CAD colour, and grouped into the named
assemblies the site animates on scroll (shooter, intake, indexer, chassis,
drivetrain). The finished model is centred on the origin with its wheels on
the ground so it lines up with the field.
"""

import argparse
import json
import os
import re
import sys
import time

import numpy as np
from OCP.BRep import BRep_Tool
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.Quantity import Quantity_Color
from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.TCollection import TCollection_ExtendedString
from OCP.TDataStd import TDataStd_Name
from OCP.TDF import TDF_Label, TDF_LabelSequence
from OCP.TDocStd import TDocStd_Document
from OCP.TopAbs import TopAbs_FACE, TopAbs_REVERSED, TopAbs_SHELL, TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer
from OCP.TopLoc import TopLoc_Location
from OCP.TopoDS import TopoDS
from OCP.XCAFDoc import XCAFDoc_ColorType, XCAFDoc_DocumentTool, XCAFDoc_ShapeTool

import trimesh

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import step_colors  # noqa: E402

COLOUR_TYPES = (
    XCAFDoc_ColorType.XCAFDoc_ColorGen,
    XCAFDoc_ColorType.XCAFDoc_ColorSurf,
)
DEFAULT_COLOUR = (150, 150, 150)

SHOOTER = "SOURCE_SHOOTER"
INTAKE = "INFERRED_INTAKE"
INDEXER = "INFERRED_INDEXER"
CHASSIS = "INFERRED_CHASSIS"
DRIVETRAIN = "INFERRED_DRIVETRAIN"

ASSEMBLY_ORDER = (SHOOTER, INTAKE, INDEXER, CHASSIS, DRIVETRAIN)

DRIVE_WORDS = re.compile(
    r"mecanum|wheel|tyre|tire|motor|gearbox|hex|shaft|bearing|encoder|"
    r"bushing|pulley|belt|tensioner|spacer|chassis|plate|bracket|rail",
    re.I,
)


def classify(name, centroid_y, bounds_top):
    """Map a part to one of the assemblies the site animates."""
    text = name or ""
    if re.search(r"intake", text, re.I):
        return INTAKE
    if re.search(r"index", text, re.I):
        return INDEXER
    if centroid_y > bounds_top * 0.62 and not re.search(r"intake|index", text, re.I):
        return SHOOTER
    if re.search(r"mecanum|wheel", text, re.I):
        return DRIVETRAIN
    if centroid_y < 0.045 and DRIVE_WORDS.search(text):
        return DRIVETRAIN
    return CHASSIS


def read_step(path):
    reader = STEPCAFControl_Reader()
    doc = TDocStd_Document(TCollection_ExtendedString("XmlOcaf"))
    status = reader.ReadFile(path)
    if not status:
        raise SystemExit(f"could not read STEP: {status}")
    if not reader.Transfer(doc):
        raise SystemExit("could not transfer STEP into the XCAF document")
    main = doc.Main()
    # The document and reader must outlive the shape tool: once they are
    # collected the labels and shapes they own are released with them.
    return (
        XCAFDoc_DocumentTool.ShapeTool_s(main),
        XCAFDoc_DocumentTool.ColorTool_s(main),
        doc,
        reader,
    )


def colour_of(color_tool, shape):
    """Return the CAD colour of a shape as an (r, g, b) 0-255 tuple."""
    colour = Quantity_Color()
    for kind in COLOUR_TYPES:
        try:
            if color_tool.GetColor(shape, kind, colour):
                return (
                    round(colour.Red() * 255),
                    round(colour.Green() * 255),
                    round(colour.Blue() * 255),
                )
        except Exception:
            pass
    return None


def label_name(label):
    """The part name the CAD gives this node of the assembly."""
    name = TDataStd_Name()
    if label.FindAttribute(TDataStd_Name.GetID_s(), name):
        return name.Get().ToExtString()
    return ""


def tessellate(shape, deflection, relative=False):
    """Mesh a shape and return (vertices, faces).

    A relative deflection keeps small parts (screws, pulleys, hubs) detailed
    while letting large flat panels use far fewer triangles, which is what
    makes the model web sized without losing the small hardware.
    """
    BRepMesh_IncrementalMesh(shape, deflection, relative, 0.5, True)
    vertices = []
    faces = []
    explorer = TopExp_Explorer(shape, TopAbs_FACE)
    while explorer.More():
        face = TopoDS.Face_s(explorer.Current())
        location = TopLoc_Location()
        triangulation = BRep_Tool.Triangulation_s(face, location)
        if triangulation is not None:
            transform = location.Transformation()
            offset = len(vertices)
            for index in range(1, triangulation.NbNodes() + 1):
                point = triangulation.Node(index).Transformed(transform)
                vertices.append((point.X(), point.Y(), point.Z()))
            for index in range(1, triangulation.NbTriangles() + 1):
                a, b, c = triangulation.Triangle(index).Get()
                if face.Orientation() == TopAbs_REVERSED:
                    b, c = c, b
                faces.append((offset + a - 1, offset + b - 1, offset + c - 1))
        explorer.Next()
    return vertices, faces


def collect(shape_tool, color_tool, deflection, min_faces, relative=False, fallback=None):
    """Walk the assembly tree and mesh every coloured solid body.

    ``fallback`` is an optional map of part name to (vertices, faces) for the
    parts the XCAF reader cannot hand over. Some mirrored instances in a Fusion
    export point at a shared representation that no reader attaches to the
    instance, so those plates would simply be missing from the model. A second
    reader does resolve them, and they are filled in from there.
    """
    free_labels = TDF_LabelSequence()
    shape_tool.GetFreeShapes(free_labels)

    bodies = []
    histogram = {}
    panel_source = None
    missing_panels = []
    mirrored_leaves = []
    part_centroids = {}

    def resolve_shape(label, shape):
        """Return a shape that carries geometry.

        Some mirrored instances in the CAD are stored as references: the
        instance itself has no geometry and points at a prototype elsewhere in
        the document. Without resolving the reference those plates are simply
        missing from the model.
        """
        if shape is None or shape.IsNull():
            return None
        explorer = TopExp_Explorer(shape, TopAbs_SOLID)
        if explorer.More():
            return shape
        explorer = TopExp_Explorer(shape, TopAbs_FACE)
        if explorer.More():
            return shape
        referred = TDF_Label()
        try:
            if XCAFDoc_ShapeTool.GetReferredShape_s(label, referred):
                prototype = shape_tool.GetShape_s(referred)
                if prototype is not None and not prototype.IsNull():
                    return prototype.Moved(shape.Location())
        except Exception:
            pass
        return shape

    def add_fallback_part(name, offset=None):
        """Add a part the XCAF reader could not hand over.

        The name of the leaf carries the instance suffix, so the lookup uses
        the part name on its own. The second reader works in its own frame,
        which is the CAD's frame moved a little, so every part it hands over
        is moved back before it is used.
        """
        nonlocal panel_source
        if not fallback:
            return False
        key = re.sub(r":\d+$", "", name or "")
        entry = fallback.get(key)
        if entry is None:
            return False
        vertices, faces, colour = entry
        if len(faces) < min_faces:
            return False
        if offset is not None:
            vertices = [(x - offset[0], y - offset[1], z - offset[2]) for x, y, z in vertices]
        bodies.append((vertices, faces, colour))
        if colour:
            histogram[colour] = histogram.get(colour, 0) + len(faces)
        if "Outerpanel" in name and panel_source is None:
            panel_source = bodies[-1]
        print(f"filled in {name!r} from the second reader", flush=True)
        return True

    def is_mirrored(name):
        return "(Mirror)" in (name or "")

    def walk(label):
        nonlocal panel_source
        components = TDF_LabelSequence()
        shape_tool.GetComponents_s(label, components)
        if components.Length() == 0:
            name = label_name(label)
            try:
                shape = shape_tool.GetShape_s(label)
            except Exception:
                return
            shape = resolve_shape(label, shape)
            if shape is None or shape.IsNull():
                # The CAD export leaves this part without any geometry: the
                # product has no shape of its own. A second reader does resolve
                # it, so the part is filled in from there when it is available.
                if not add_fallback_part(name):
                    if "Innerpanel" in name:
                        missing_panels.append(name)
                return
            if is_mirrored(name):
                # A mirrored instance is stored as a reflection. OpenCASCADE
                # cannot carry a reflection, so it hands back the prototype
                # turned instead: the part lands on the wrong side of the
                # machine. The second reader keeps the reflection, so the
                # mirrored parts are taken from there once the frames agree.
                mirrored_leaves.append(name)
                return
            bodies_before = len(bodies)
            # Solids first, then the open bodies that are not part of any
            # solid. Sheet metal panels are often modelled as a shell or a
            # single face, and walking solids alone leaves those plates out
            # of the model.
            solid_faces = []
            bodies_for_label = 0
            explorer = TopExp_Explorer(shape, TopAbs_SOLID)
            while explorer.More():
                body = explorer.Current()
                colour = colour_of(color_tool, body) or colour_of(color_tool, shape)
                vertices, faces = tessellate(body, deflection, relative)
                explorer.Next()
                if len(faces) < min_faces:
                    continue
                bodies.append((vertices, faces, colour))
                bodies_for_label += 1
                if colour:
                    histogram[colour] = histogram.get(colour, 0) + len(faces)
                face_explorer = TopExp_Explorer(body, TopAbs_FACE)
                while face_explorer.More():
                    solid_faces.append(face_explorer.Current())
                    face_explorer.Next()
            if bodies_for_label:
                # Remember where this part sits, so the second reader's frame
                # can be lined up with this one.
                points = np.concatenate([np.asarray(body[0]) for body in bodies[bodies_before:]])
                part_centroids[re.sub(r":\d+$", "", name)] = points.mean(axis=0)

            def is_solid_face(face):
                return any(face.IsSame(other) for other in solid_faces)

            shell_explorer = TopExp_Explorer(shape, TopAbs_SHELL)
            while shell_explorer.More():
                shell = shell_explorer.Current()
                shell_faces = []
                face_explorer = TopExp_Explorer(shell, TopAbs_FACE)
                while face_explorer.More():
                    shell_faces.append(face_explorer.Current())
                    face_explorer.Next()
                if shell_faces and not any(is_solid_face(face) for face in shell_faces):
                    colour = colour_of(color_tool, shell) or colour_of(color_tool, shape)
                    vertices, faces = tessellate(shell, deflection, relative)
                    if len(faces) >= min_faces:
                        bodies.append((vertices, faces, colour))
                        bodies_for_label += 1
                        if colour:
                            histogram[colour] = histogram.get(colour, 0) + len(faces)
                shell_explorer.Next()

            face_explorer = TopExp_Explorer(shape, TopAbs_FACE)
            while face_explorer.More():
                face = face_explorer.Current()
                if not is_solid_face(face):
                    colour = colour_of(color_tool, face) or colour_of(color_tool, shape)
                    vertices, faces = tessellate(face, deflection, relative)
                    if len(faces) >= min_faces:
                        bodies.append((vertices, faces, colour))
                        bodies_for_label += 1
                        if colour:
                            histogram[colour] = histogram.get(colour, 0) + len(faces)
                face_explorer.Next()
            if not bodies_for_label and add_fallback_part(name):
                bodies_for_label += 1
            if "Innerpanel" in name and not bodies_for_label:
                missing_panels.append(name)
            if "Outerpanel" in name and panel_source is None and len(bodies) > bodies_before:
                panel_source = bodies[bodies_before]
            return
        for index in range(components.Length()):
            walk(components.Value(index + 1))

    for index in range(free_labels.Length()):
        walk(free_labels.Value(index + 1))

    # Line the second reader's frame up with this one, then bring in the
    # mirrored parts. The two readers place the machine's parts in almost the
    # same place, but not exactly, and a part that is a few millimetres out of
    # step shows on a machine this size.
    offset = frame_offset(part_centroids, fallback)
    if offset is not None:
        print(f"second reader frame offset: {tuple(round(v, 2) for v in offset)}", flush=True)
    for name in mirrored_leaves:
        add_fallback_part(name, offset)
    # The CAD carries no geometry for the mirrored inner panel. Making a plate
    # up put a part where the CAD has none, which is worse than the gap it
    # filled: the machine's outside is closed by the side panels that are in
    # the file, and the inner plate never shows.
    if missing_panels:
        print(f"parts with no geometry in the CAD: {missing_panels}", flush=True)
    return bodies, histogram


def frame_offset(part_centroids, fallback):
    """The shift between the two readers' frames, in millimetres.

    The same part is found in both. The difference between where each reader
    puts it is the offset between the two frames.
    """
    if not part_centroids or not fallback:
        return None
    differences = []
    for name, centre in part_centroids.items():
        entry = fallback.get(name)
        if entry is None:
            continue
        points = np.asarray(entry[0], dtype=float)
        differences.append(points.mean(axis=0) - centre)
    if not differences:
        return None
    return tuple(np.median(np.asarray(differences), axis=0))


def build_inner_panel(bodies, panel_source):
    """Rebuild the chassis inner panel from the outer panel that survived.

    The CAD export of the mirrored inner panel carries no geometry at all, so
    the plate is rebuilt from the outer side panel: the same shape, a little
    smaller, and set just inside the frame. It keeps the machine's side from
    reading as an open hole.
    """
    vertices, faces, colour = panel_source
    points = np.asarray(vertices, dtype=float)
    low = points.min(axis=0)
    high = points.max(axis=0)
    extent = high - low
    # The plate is thin across one axis: that axis is its normal.
    normal = int(np.argmin(extent))
    in_plane = [axis for axis in range(3) if axis != normal]
    centre = (low + high) / 2.0

    # The inside of the frame is towards the middle of the machine.
    everything = np.concatenate([np.asarray(body[0], dtype=float) for body in bodies])
    machine_centre = (everything.min(axis=0) + everything.max(axis=0)) / 2.0
    inward = 1.0 if machine_centre[normal] >= centre[normal] else -1.0

    rebuilt = points.copy()
    for axis in in_plane:
        rebuilt[:, axis] = centre[axis] + (rebuilt[:, axis] - centre[axis]) * 0.94
    rebuilt[:, normal] += inward * max(extent[normal] * 1.5, 2.0)
    print(
        f"rebuilt the inner panel from the outer panel "
        f"(normal axis {normal}, extent {np.round(extent, 2).tolist()})"
    )
    return ([tuple(point) for point in rebuilt], faces, colour)


def name_index(step_path):
    """Part name and centroid for every solid, taken from the STEP itself."""
    scene = trimesh.load(step_path)
    names = []
    for name, geometry in scene.geometry.items():
        centroid = geometry.centroid
        names.append((name, (float(centroid[0]), float(centroid[1]), float(centroid[2]))))
    return names


def assign_assemblies(bodies, names, scale, bounds_top):
    """Give every meshed body the assembly and part name of the nearest part."""
    if not names:
        return [CHASSIS] * len(bodies), [""] * len(bodies)
    points = np.array([centroid for _, centroid in names])
    assigned = []
    part_names = []
    for vertices, _, _ in bodies:
        centre = np.mean(np.asarray(vertices) * scale, axis=0)
        distance = np.linalg.norm(points - centre, axis=1)
        index = int(np.argmin(distance))
        assigned.append(classify(names[index][0], float(centre[1]), bounds_top))
        part_names.append(names[index][0])
    return assigned, part_names


def fallback_parts(step_path):
    """Parts the XCAF reader cannot hand over, taken from a second reader.

    A Fusion export stores some mirrored instances against a shared
    representation. OpenCASCADE's assembly reader never attaches that
    geometry to the instance, so the plate would be missing from the model.
    Trimesh reads the same file and does resolve it, with the placement the
    CAD gives it, so those parts are taken from there.
    """
    try:
        # The scene graph holds the placement of every instance. Reading the
        # geometry directly gives the parts in their own local frames, which
        # puts every mirrored part at the origin.
        scene = trimesh.load(step_path, process=False)
    except Exception as error:
        print(f"no fallback reader: {error}", flush=True)
        return {}
    try:
        by_name, _, _ = step_colors.parse(step_path)
    except Exception as error:
        print(f"no step colours: {error}", flush=True)
        by_name = {}
    parts = {}
    for geometry in scene.dump(concatenate=False):
        meta = getattr(geometry, "metadata", {}) or {}
        name = str(meta.get("file_name") or meta.get("name") or "")
        vertices = np.asarray(geometry.vertices, dtype=float) * 1000.0
        faces = np.asarray(geometry.faces, dtype=int)
        if not len(faces) or not name:
            continue
        colour = by_name.get(name) or by_name.get(name.replace("(Mirror) (1)", "").strip())
        rgb = None
        if colour and len(colour) >= 4:
            # The STEP colour is (name, r, g, b) with the channels in 0..1.
            rgb = tuple(int(round(float(channel) * 255)) for channel in colour[1:4])
        parts[name] = (
            [tuple(vertex) for vertex in vertices],
            [tuple(int(index) for index in face) for face in faces],
            rgb,
        )
    print(f"fallback parts: {len(parts)}", flush=True)
    return parts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("step")
    parser.add_argument("out")
    parser.add_argument("--deflection", type=float, default=0.8)
    parser.add_argument("--relative", action="store_true", help="treat deflection as a fraction of each part size")
    parser.add_argument("--min-faces", type=int, default=6)
    parser.add_argument("--scale", type=float, default=0.001, help="STEP units to metres")
    args = parser.parse_args()

    started = time.time()
    shape_tool, color_tool, doc, reader = read_step(args.step)
    print(f"read in {time.time() - started:.1f}s", flush=True)

    started = time.time()
    bodies, histogram = collect(shape_tool, color_tool, args.deflection, args.min_faces, args.relative,
                                fallback_parts(args.step))
    print(f"meshed {len(bodies)} bodies in {time.time() - started:.1f}s", flush=True)

    every = np.concatenate([np.asarray(v) for v, _, _ in bodies]) * args.scale
    low = every.min(axis=0)
    high = every.max(axis=0)
    centre = (low + high) / 2
    bounds_top = float(high[1] - low[1])
    print(f"bounds min {low.round(3).tolist()} max {high.round(3).tolist()}", flush=True)

    names = name_index(args.step)
    assemblies, part_names = assign_assemblies(bodies, names, args.scale, bounds_top)
    counts = {}
    for assembly in assemblies:
        counts[assembly] = counts.get(assembly, 0) + 1
    print("assemblies:", counts, flush=True)

    # Group by assembly and colour so the browser draws a handful of materials
    # while the scene can still move each assembly on scroll. The ramp is kept
    # in a bucket of its own so the site can give that plate its own colour.
    buckets = {}
    for (vertices, faces, colour), assembly, part_name in zip(bodies, assemblies, part_names):
        tag = ""
        if re.search(r"ramp", part_name or "", re.IGNORECASE):
            tag = "RAMP_"
        key = (assembly, tag, colour or DEFAULT_COLOUR)
        bucket = buckets.setdefault(key, ([], []))
        offset = len(bucket[0])
        bucket[0].extend((np.asarray(vertices) * args.scale))
        bucket[1].extend((offset + a, offset + b, offset + c) for a, b, c in faces)

    scene = trimesh.Scene()
    for assembly in ASSEMBLY_ORDER:
        for (bucket_assembly, tag, colour), (vertices, faces) in buckets.items():
            if bucket_assembly != assembly or not faces:
                continue
            points = np.asarray(vertices)
            points[:, 0] -= centre[0]
            points[:, 2] -= centre[2]
            points[:, 1] -= low[1]
            mesh = trimesh.Trimesh(vertices=points, faces=faces, process=False)
            name = f"Opaque({colour[0]},{colour[1]},{colour[2]})"
            mesh.visual = trimesh.visual.TextureVisuals(
                material=trimesh.visual.material.PBRMaterial(
                    name=name,
                    baseColorFactor=[value / 255 for value in colour] + [1.0],
                    metallicFactor=0.1,
                    roughnessFactor=0.5,
                    doubleSided=True,
                )
            )
            # A unique node per colour mesh keeps every part in world space
            # with an identity transform; the assembly grouping is applied
            # afterwards by scripts/fix_gltf_hierarchy.py.
            label = f"{assembly}_{tag}{colour[0]:02x}{colour[1]:02x}{colour[2]:02x}"
            scene.add_geometry(
                mesh,
                geom_name=label,
                node_name=label,
            )

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    scene.export(args.out)
    # trimesh only keeps one mesh per named node, so the rest are orphaned and
    # a later optimisation pass would prune them. Rebuild the tree first.
    import subprocess

    fixed = args.out + ".fixed.glb"
    subprocess.run(
        [sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "fix_gltf_hierarchy.py"), args.out, fixed],
        check=True,
    )
    os.replace(fixed, args.out)
    print(
        json.dumps(
            {
                "out": args.out,
                "bytes": os.path.getsize(args.out),
                "meshes": len(scene.geometry),
                "faces": sum(len(m.faces) for m in scene.geometry.values()),
                "colours": len(histogram),
                "assemblies": counts,
            }
        )
    )


if __name__ == "__main__":
    main()
