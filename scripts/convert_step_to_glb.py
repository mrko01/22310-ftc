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
from OCP.TDF import TDF_LabelSequence
from OCP.TDocStd import TDocStd_Document
from OCP.TopAbs import TopAbs_FACE, TopAbs_REVERSED, TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer
from OCP.TopLoc import TopLoc_Location
from OCP.TopoDS import TopoDS
from OCP.XCAFDoc import XCAFDoc_ColorType, XCAFDoc_DocumentTool

import trimesh

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


def collect(shape_tool, color_tool, deflection, min_faces, relative=False):
    """Walk the assembly tree and mesh every coloured solid body."""
    free_labels = TDF_LabelSequence()
    shape_tool.GetFreeShapes(free_labels)

    bodies = []
    histogram = {}

    def walk(label):
        components = TDF_LabelSequence()
        shape_tool.GetComponents_s(label, components)
        if components.Length() == 0:
            try:
                shape = shape_tool.GetShape_s(label)
            except Exception:
                return
            if shape is None or shape.IsNull():
                return
            explorer = TopExp_Explorer(shape, TopAbs_SOLID)
            while explorer.More():
                body = explorer.Current()
                colour = colour_of(color_tool, body) or colour_of(color_tool, shape)
                vertices, faces = tessellate(body, deflection, relative)
                explorer.Next()
                if len(faces) < min_faces:
                    continue
                bodies.append((vertices, faces, colour))
                if colour:
                    histogram[colour] = histogram.get(colour, 0) + len(faces)
            return
        for index in range(components.Length()):
            walk(components.Value(index + 1))

    for index in range(free_labels.Length()):
        walk(free_labels.Value(index + 1))
    return bodies, histogram


def name_index(step_path):
    """Part name and centroid for every solid, taken from the STEP itself."""
    scene = trimesh.load(step_path)
    names = []
    for name, geometry in scene.geometry.items():
        centroid = geometry.centroid
        names.append((name, (float(centroid[0]), float(centroid[1]), float(centroid[2]))))
    return names


def assign_assemblies(bodies, names, scale, bounds_top):
    """Give every meshed body the assembly of the nearest named part."""
    if not names:
        return [CHASSIS] * len(bodies)
    points = np.array([centroid for _, centroid in names])
    assigned = []
    for vertices, _, _ in bodies:
        centre = np.mean(np.asarray(vertices) * scale, axis=0)
        distance = np.linalg.norm(points - centre, axis=1)
        index = int(np.argmin(distance))
        assigned.append(classify(names[index][0], float(centre[1]), bounds_top))
    return assigned


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
    bodies, histogram = collect(shape_tool, color_tool, args.deflection, args.min_faces, args.relative)
    print(f"meshed {len(bodies)} bodies in {time.time() - started:.1f}s", flush=True)

    every = np.concatenate([np.asarray(v) for v, _, _ in bodies]) * args.scale
    low = every.min(axis=0)
    high = every.max(axis=0)
    centre = (low + high) / 2
    bounds_top = float(high[1] - low[1])
    print(f"bounds min {low.round(3).tolist()} max {high.round(3).tolist()}", flush=True)

    names = name_index(args.step)
    assemblies = assign_assemblies(bodies, names, args.scale, bounds_top)
    counts = {}
    for assembly in assemblies:
        counts[assembly] = counts.get(assembly, 0) + 1
    print("assemblies:", counts, flush=True)

    # Group by assembly and colour so the browser draws a handful of materials
    # while the scene can still move each assembly on scroll.
    buckets = {}
    for (vertices, faces, colour), assembly in zip(bodies, assemblies):
        key = (assembly, colour or DEFAULT_COLOUR)
        bucket = buckets.setdefault(key, ([], []))
        offset = len(bucket[0])
        bucket[0].extend((np.asarray(vertices) * args.scale))
        bucket[1].extend((offset + a, offset + b, offset + c) for a, b, c in faces)

    scene = trimesh.Scene()
    for assembly in ASSEMBLY_ORDER:
        for (bucket_assembly, colour), (vertices, faces) in buckets.items():
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
            scene.add_geometry(
                mesh,
                geom_name=f"{assembly}_{colour[0]:02x}{colour[1]:02x}{colour[2]:02x}",
                node_name=f"{assembly}_{colour[0]:02x}{colour[1]:02x}{colour[2]:02x}",
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
