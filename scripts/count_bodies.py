#!/usr/bin/env python3
"""Count how many CAD bodies the mesh keeps at different face thresholds.

Flat plates tessellate into a couple of triangles, so a high minimum face
count silently deletes them. This prints the body count and the face
histogram for a few thresholds so the right value can be chosen.
"""

import importlib.util
import sys
import time

STEP = sys.argv[1] if len(sys.argv) > 1 else "/Users/mirkoruberto/Downloads/Mecanum Drivebase.step"
DEFLECTION = float(sys.argv[2]) if len(sys.argv) > 2 else 1.3

spec = importlib.util.spec_from_file_location("conv", "scripts/convert_step_to_glb.py")
conv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(conv)

started = time.time()
shape_tool, color_tool, doc, reader = conv.read_step(STEP)
print(f"read in {time.time() - started:.1f}s", flush=True)

started = time.time()
bodies, histogram = conv.collect(shape_tool, color_tool, DEFLECTION, 0, True)
print(f"meshed {len(bodies)} bodies in {time.time() - started:.1f}s", flush=True)

counts = sorted(len(faces) for _, faces, _ in bodies)
print("total faces:", sum(counts))
for threshold in (0, 2, 4, 6, 10, 20, 60):
    kept = sum(1 for c in counts if c >= threshold)
    dropped = len(counts) - kept
    print(f"  min_faces={threshold:3d} -> keeps {kept:5d} bodies, drops {dropped:5d}")
print("smallest 20 body face counts:", counts[:20])
print("face count percentiles:", [counts[int(len(counts) * p)] for p in (0.05, 0.1, 0.25, 0.5)])
