#!/usr/bin/env python3
"""Convert a Fusion 360 STEP assembly into a coloured, web-sized GLB.

The STEP is read with the XCAF reader so the assembly structure survives the
conversion. Every solid body is meshed with OpenCASCADE and tagged with the
COLOUR_RGB value Fusion 360 assigned to it, keeping the CAD colour name so the
presentation pass can still tell aluminium from rubber. Bodies that share a
colour are merged into one mesh so the browser draws a handful of materials
instead of a thousand.
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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import step_colors  # noqa: E402

COLOUR_TYPES = (
    XCAFDoc_ColorType.XCAFDoc_ColorGen,
    XCAFDoc_ColorType.XCAFDoc_ColorSurf,
)
DEFAULT_COLOUR = (150, 150, 150)


def colour_names(step_path):
    """Map an (r, g, b) triple to the CAD colour name used in the STEP."""
    names = {}
    path = step_path
    entity = step_colors.ENTITY
    buffer = ""
    with open(path, "r", errors="ignore") as handle:
        for line in handle:
            buffer += line
            if ";" not in buffer:
                continue
            pieces = buffer.split(";")
            buffer = pieces.pop()
            for chunk in pieces:
                match = entity.match(chunk.strip())
                if not match or match.group(2) != "COLOUR_RGB":
                    continue
                args = step_colors.split_args(match.group(3))
                if len(args) < 4:
                    continue
                rgb = tuple(round(float(value) * 255) for value in args[1:4])
                names.setdefault(rgb, step_colors.unquote(args[0]))
    return names


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


def tessellate(shape, deflection):
    """Mesh a shape and return (vertices, faces)."""
    BRepMesh_IncrementalMesh(shape, deflection, False, 0.5, True)
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


def collect(shape_tool, color_tool, deflection, min_faces):
    """Walk the assembly tree and mesh every coloured solid body."""
    free_labels = TDF_LabelSequence()
    shape_tool.GetFreeShapes(free_labels)

    parts = []
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
                vertices, faces = tessellate(body, deflection)
                explorer.Next()
                if len(faces) < min_faces:
                    continue
                parts.append((vertices, faces, colour))
                if colour:
                    histogram[colour] = histogram.get(colour, 0) + len(faces)
            return
        for index in range(components.Length()):
            walk(components.Value(index + 1))

    for index in range(free_labels.Length()):
        walk(free_labels.Value(index + 1))
    return parts, histogram


def merge_by_colour(parts):
    """Merge bodies that share a colour into a single mesh per colour."""
    buckets = {}
    for vertices, faces, colour in parts:
        key = colour or DEFAULT_COLOUR
        bucket = buckets.setdefault(key, ([], []))
        offset = len(bucket[0])
        bucket[0].extend(vertices)
        bucket[1].extend((offset + a, offset + b, offset + c) for a, b, c in faces)
    return [
        (colour, vertices, faces)
        for colour, (vertices, faces) in sorted(
            buckets.items(), key=lambda item: -len(item[1][1])
        )
    ]


def material_for(name, colour):
    """A PBR material that keeps the CAD colour and reads as a real surface."""
    rgb = [value / 255 for value in colour]
    metallic = 0.85 if re.search(r"steel|alum|anod|chrome|brass", name, re.I) else 0.05
    roughness = 0.3 if metallic > 0.5 else 0.55
    material = trimesh.visual.material.PBRMaterial(
        name=name,
        baseColorFactor=rgb + [1.0],
        metallicFactor=metallic,
        roughnessFactor=roughness,
        doubleSided=True,
    )
    return material


def rename_root_node(path, name):
    """Rename the glTF root node so the site can group it as an assembly."""
    import struct

    with open(path, "rb") as handle:
        magic, version, length = struct.unpack("<III", handle.read(12))
        chunks = []
        while handle.tell() < length:
            chunk_length, chunk_type = struct.unpack("<II", handle.read(8))
            chunks.append((chunk_type, handle.read(chunk_length)))

    document = json.loads(chunks[0][1].decode("utf-8"))
    for node in document.get("nodes", []):
        if node.get("name") == "world":
            node["name"] = name
    for scene in document.get("scenes", []):
        scene["name"] = name
    encoded = json.dumps(document, separators=(",", ":")).encode("utf-8")
    encoded += b" " * ((4 - len(encoded) % 4) % 4)

    rebuilt = [struct.pack("<II", len(encoded), 0x4E4F534A) + encoded]
    rebuilt.extend(struct.pack("<II", len(payload), kind) + payload for kind, payload in chunks[1:])
    with open(path, "wb") as handle:
        handle.write(struct.pack("<III", 0x46546C67, 2, 12 + sum(len(c) for c in rebuilt)))
        for chunk in rebuilt:
            handle.write(chunk)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("step")
    parser.add_argument("out")
    parser.add_argument("--deflection", type=float, default=0.8)
    parser.add_argument("--min-faces", type=int, default=6)
    parser.add_argument("--scale", type=float, default=0.001, help="STEP units to metres")
    parser.add_argument("--root-name", default="INFERRED_DRIVETRAIN")
    args = parser.parse_args()

    started = time.time()
    shape_tool, color_tool, doc, reader = read_step(args.step)
    print(f"read in {time.time() - started:.1f}s", flush=True)

    started = time.time()
    parts, histogram = collect(shape_tool, color_tool, args.deflection, args.min_faces)
    print(f"meshed {len(parts)} bodies in {time.time() - started:.1f}s", flush=True)

    names = colour_names(args.step)
    merged = merge_by_colour(parts)
    print(f"merged into {len(merged)} meshes", flush=True)

    scene = trimesh.Scene()
    for index, (colour, vertices, faces) in enumerate(merged):
        mesh = trimesh.Trimesh(
            vertices=np.asarray(vertices, dtype=np.float64) * args.scale,
            faces=faces,
            process=False,
        )
        name = names.get(colour, f"Opaque({colour[0]},{colour[1]},{colour[2]})")
        mesh.visual = trimesh.visual.TextureVisuals(material=material_for(name, colour))
        scene.add_geometry(mesh, geom_name=f"cad_{index:02d}", node_name=f"cad_{index:02d}")

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    scene.export(args.out)
    rename_root_node(args.out, args.root_name)
    print(
        json.dumps(
            {
                "out": args.out,
                "bytes": os.path.getsize(args.out),
                "meshes": len(merged),
                "faces": sum(len(m.faces) for m in scene.geometry.values()),
                "colours": len(histogram),
            }
        )
    )


if __name__ == "__main__":
    main()
