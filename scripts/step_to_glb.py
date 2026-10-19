#!/usr/bin/env python3
"""Build a coloured, web-sized GLB from a Fusion 360 STEP assembly.

The geometry comes from the OpenCASCADE STEP reader; the colours come from the
COLOUR_RGB values in the file, recovered by scripts/step_colors.py and matched
to the parts by their product name.
"""

import argparse
import json
import os
import re
import sys
import time

import numpy as np
import trimesh

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import step_colors  # noqa: E402


def normalise(name):
    """Strip the instance suffix OpenCASCADE appends to repeated parts."""
    base = re.sub(r"_\d+$", "", name or "")
    return base.strip()


def build(step_path, out_path, colours):
    started = time.time()
    scene = trimesh.load(step_path)
    print(f"loaded geometry in {time.time() - started:.1f}s", flush=True)

    lookup = {normalise(name): colour for name, colour in colours.items()}
    exact = {name: colour for name, colour in colours.items()}

    matched = 0
    unmatched = []
    for name, geometry in list(scene.geometry.items()):
        colour = exact.get(name) or lookup.get(normalise(name))
        if colour is None:
            unmatched.append(name)
            continue
        matched += 1
        rgb = (
            round(float(colour[1]) * 255),
            round(float(colour[2]) * 255),
            round(float(colour[3]) * 255),
        )
        vertex_colors = np.zeros((len(geometry.vertices), 4), dtype=np.uint8)
        vertex_colors[:, 0] = rgb[0]
        vertex_colors[:, 1] = rgb[1]
        vertex_colors[:, 2] = rgb[2]
        vertex_colors[:, 3] = 255
        geometry.visual = trimesh.visual.ColorVisuals(
            mesh=geometry, vertex_colors=vertex_colors
        )

    print(f"coloured {matched}/{len(scene.geometry)} parts", flush=True)
    if unmatched:
        print(f"unmatched sample: {unmatched[:8]}", flush=True)

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    scene.export(out_path)
    print(
        json.dumps(
            {
                "out": out_path,
                "bytes": os.path.getsize(out_path),
                "parts": len(scene.geometry),
                "coloured": matched,
            }
        )
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("step")
    parser.add_argument("out")
    parser.add_argument("--colours", required=True, help="json produced by step_colors.py")
    args = parser.parse_args()

    with open(args.colours) as handle:
        raw = json.load(handle)
    colours = {name: tuple(value) for name, value in raw.items()}
    build(args.step, args.out, colours)


if __name__ == "__main__":
    main()
