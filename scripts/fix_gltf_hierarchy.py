#!/usr/bin/env python3
"""Group the robot model under named assembly nodes.

The model is exported as one mesh per assembly and colour, all already placed
in world space. The site animates named assemblies (the shooter, the intake,
the indexer, the chassis and the drivetrain), so this rebuilds the node tree
as:

    world
      SOURCE_SHOOTER
        <the colour meshes of the shooter>
      INFERRED_CHASSIS
        ...

Every node keeps an identity transform, so the parts keep the world position
they were built with.
"""

import argparse
import json
import struct
import sys

ASSEMBLIES = (
    "SOURCE_SHOOTER",
    "INFERRED_INTAKE",
    "INFERRED_INDEXER",
    "INFERRED_CHASSIS",
    "INFERRED_DRIVETRAIN",
)


def read_glb(path):
    with open(path, "rb") as handle:
        magic, version, length = struct.unpack("<III", handle.read(12))
        if magic != 0x46546C67:
            raise SystemExit(f"{path} is not a GLB file")
        chunks = []
        while handle.tell() < length:
            chunk_length, chunk_type = struct.unpack("<II", handle.read(8))
            chunks.append((chunk_type, handle.read(chunk_length)))
    document = json.loads(chunks[0][1].decode("utf-8"))
    binary = b"".join(payload for kind, payload in chunks[1:] if kind == 0x004E4942)
    return document, binary


def write_glb(path, document, binary):
    encoded = json.dumps(document, separators=(",", ":")).encode("utf-8")
    encoded += b" " * ((4 - len(encoded) % 4) % 4)
    chunks = [struct.pack("<II", len(encoded), 0x4E4F534A) + encoded]
    if binary:
        padded = binary + b"\x00" * ((4 - len(binary) % 4) % 4)
        chunks.append(struct.pack("<II", len(padded), 0x004E4942) + padded)
    with open(path, "wb") as handle:
        handle.write(struct.pack("<III", 0x46546C67, 2, 12 + sum(len(chunk) for chunk in chunks)))
        for chunk in chunks:
            handle.write(chunk)


def assembly_of(name):
    for assembly in ASSEMBLIES:
        if (name or "").startswith(assembly):
            return assembly
    return None


def repair(path, out_path):
    document, binary = read_glb(path)
    nodes = list(document.get("nodes", []))
    meshes = document.get("meshes", [])

    # Parts are the nodes that belong to an assembly but are not one.
    parts = {assembly: [] for assembly in ASSEMBLIES}
    for index, node in enumerate(nodes):
        name = node.get("name") or ""
        assembly = assembly_of(name)
        if assembly and name != assembly:
            parts[assembly].append(index)

    # A mesh that no node points at is never drawn, so it needs a node.
    used = {node.get("mesh") for node in nodes if node.get("mesh") is not None}
    for mesh_index in range(len(meshes)):
        if mesh_index in used:
            continue
        mesh = meshes[mesh_index]
        name = mesh.get("name") or f"mesh_{mesh_index}"
        nodes.append({
            "name": name,
            "mesh": mesh_index,
            "translation": [0.0, 0.0, 0.0],
            "scale": [1.0, 1.0, 1.0],
        })
        assembly = assembly_of(name)
        if assembly:
            parts[assembly].append(len(nodes) - 1)

    # Build the new tree: root, the assembly parents, then the parts. The
    # indices are laid out up front so every child list stays valid.
    layout = [{"name": "world", "children": [], "mesh": None, "source": None,
               "transform": {}}]  # the root
    for assembly in ASSEMBLIES:
        layout.append({"name": assembly, "children": [], "mesh": None, "source": None,
                       "transform": {}})
    for assembly in ASSEMBLIES:
        for index in parts[assembly]:
            source = nodes[index]
            layout.append({"name": source.get("name"), "children": None,
                           "mesh": source.get("mesh"), "source": index,
                           "transform": {key: source[key] for key in
                                         ("translation", "rotation", "scale", "matrix")
                                         if key in source}})

    root_index = 0
    for offset, assembly in enumerate(ASSEMBLIES):
        parent_index = 1 + offset
        layout[parent_index]["children"] = [
            index for index in range(1 + len(ASSEMBLIES), len(layout))
            if layout[index]["name"] and assembly_of(layout[index]["name"]) == assembly
        ]
    layout[root_index]["children"] = [1 + offset for offset in range(len(ASSEMBLIES))]

    new_nodes = []
    for entry in layout:
        node = {"name": entry["name"]}
        if entry["mesh"] is not None:
            node["mesh"] = entry["mesh"]
        # Keep the node transform: it carries the dequantisation scale that
        # KHR_mesh_quantization puts on the node, and dropping it blows the
        # model up to the full integer range.
        for key, value in (entry.get("transform") or {}).items():
            node[key] = value
        if entry["children"]:
            node["children"] = entry["children"]
        new_nodes.append(node)

    document["nodes"] = new_nodes
    document["scenes"] = [{"name": "Scene", "nodes": [root_index]}]
    write_glb(out_path, document, binary)

    total = sum(len(parts[assembly]) for assembly in ASSEMBLIES)
    print(f"{path}: grouped {total} part nodes under {len(ASSEMBLIES)} assemblies")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    args = parser.parse_args()
    repair(args.input, args.output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
