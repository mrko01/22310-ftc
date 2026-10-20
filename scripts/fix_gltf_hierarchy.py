#!/usr/bin/env python3
"""Repair the glTF node hierarchy of a model exported by trimesh.

trimesh writes one node per assembly but keeps only a single mesh on it, so
every other mesh ends up unreferenced. A glTF optimiser then prunes those
orphans and the model silently loses most of its parts. This re-homes the
unreferenced meshes under the assembly node that owns them, and leaves an
already correct tree untouched.
"""

import argparse
import json
import re
import struct
import sys

MESH_NAME = re.compile(r"^(.*)_[0-9a-fA-F]{6}$")


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
        handle.write(struct.pack("<III", 0x46546C67, 2, 12 + sum(len(c) for c in chunks)))
        for chunk in chunks:
            handle.write(chunk)


def repair(path, out_path):
    document, binary = read_glb(path)
    meshes = document.get("meshes", [])
    nodes = document.get("nodes", [])
    if not nodes:
        print(f"{path}: no nodes, nothing to repair")
        return 0

    parent_of = {}
    for index, node in enumerate(nodes):
        for child in node.get("children", []) or []:
            parent_of[child] = index

    # Assembly nodes own children and are named after an assembly.
    assembly_of_node = {}
    for index, node in enumerate(nodes):
        name = node.get("name") or ""
        if node.get("children") and not name.startswith("mesh_"):
            assembly_of_node[index] = name

    referenced = set()
    for index, node in enumerate(nodes):
        if node.get("mesh") is not None:
            referenced.add(node["mesh"])
    orphans = [index for index in range(len(meshes)) if index not in referenced]
    if not orphans:
        print(f"{path}: hierarchy already complete ({len(meshes)} meshes)")
        return 0

    def assembly_for(mesh_index):
        mesh_name = meshes[mesh_index].get("name") or ""
        # Prefer the assembly of a node that already uses this mesh.
        for index, node in enumerate(nodes):
            if node.get("mesh") == mesh_index and index in assembly_of_node:
                return assembly_of_node[index]
        match = MESH_NAME.match(mesh_name)
        if match:
            candidate = match.group(1)
            for name in assembly_of_node.values():
                if name == candidate:
                    return candidate
            return candidate
        return None

    # Create one node per orphan and attach it to its assembly.
    created = []
    for mesh_index in orphans:
        mesh_name = meshes[mesh_index].get("name") or f"mesh_{mesh_index}"
        node = {"name": mesh_name, "mesh": mesh_index}
        nodes.append(node)
        created.append((len(nodes) - 1, assembly_for(mesh_index)))

    for node_index, assembly in created:
        if assembly is None:
            continue
        for index, candidate in enumerate(nodes):
            if (candidate.get("name") or "") == assembly and candidate.get("children") is not None:
                candidate["children"] = list(candidate.get("children") or []) + [node_index]
                break

    document["nodes"] = nodes
    write_glb(out_path, document, binary)
    print(f"{path}: re-homed {len(orphans)} orphaned meshes under the assembly nodes")
    return len(orphans)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    args = parser.parse_args()
    repair(args.input, args.output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
