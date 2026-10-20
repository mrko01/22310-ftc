#!/usr/bin/env python3
"""Repair the glTF node hierarchy of a model exported by trimesh.

trimesh writes one node per assembly but keeps only a single mesh on it, so
every other mesh ends up on a node that no parent points at. A glTF optimiser
then prunes those unreferenced meshes and the model silently loses most of its
parts. This re-homes every unreachable mesh node under the assembly node that
owns it, and leaves an already correct tree untouched.
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
    nodes = document.get("nodes", [])
    scenes = document.get("scenes", [])
    if not nodes or not scenes:
        print(f"{path}: nothing to repair")
        return 0

    # Nodes reachable from the scene roots are the ones the renderer sees.
    reachable = set()
    stack = list(scenes[0].get("nodes", []) or [])
    while stack:
        index = stack.pop()
        if index in reachable or index >= len(nodes):
            continue
        reachable.add(index)
        stack.extend(nodes[index].get("children", []) or [])

    unreachable = [index for index in range(len(nodes)) if index not in reachable]
    if not unreachable:
        print(f"{path}: hierarchy already complete ({len(nodes)} nodes)")
        if out_path != path:
            with open(path, "rb") as src, open(out_path, "wb") as dst:
                dst.write(src.read())
        return 0

    # Assembly nodes are the named groups that already own a mesh.
    assemblies = {}
    for index, node in enumerate(nodes):
        name = node.get("name") or ""
        if index in reachable and node.get("mesh") is not None and not name.startswith("mesh_"):
            assemblies[name] = index

    def assembly_for(node_name):
        match = MESH_NAME.match(node_name or "")
        if match and match.group(1) in assemblies:
            return assemblies[match.group(1)]
        for name, index in assemblies.items():
            if (node_name or "").startswith(name):
                return index
        return None

    moved = 0
    for index in unreachable:
        node = nodes[index]
        if node.get("mesh") is None:
            continue
        target = assembly_for(node.get("name"))
        if target is None:
            continue
        holder = nodes[target]
        holder["children"] = list(holder.get("children", []) or []) + [index]
        moved += 1

    if moved:
        document["nodes"] = nodes
    write_glb(out_path, document, binary)
    print(f"{path}: re-homed {moved} unreachable mesh nodes under their assembly")
    return moved


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    args = parser.parse_args()
    repair(args.input, args.output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
