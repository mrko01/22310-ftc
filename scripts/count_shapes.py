#!/usr/bin/env python3
"""Report the shape types in the CAD file.

Sheet metal panels are often modelled as shells or single faces rather than
solids. A converter that only walks solids silently leaves those panels out
of the model, which shows up as missing plates.
"""

import importlib.util
import sys
from collections import Counter

from OCP.TopAbs import TopAbs_FACE, TopAbs_SHELL, TopAbs_SOLID, TopAbs_WIRE
from OCP.TopExp import TopExp_Explorer
from OCP.GProp import GProp_GProps
from OCP.BRepGProp import BRepGProp

STEP = sys.argv[1] if len(sys.argv) > 1 else "/Users/mirkoruberto/Downloads/Mecanum Drivebase.step"

spec = importlib.util.spec_from_file_location("conv", "scripts/convert_step_to_glb.py")
conv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(conv)

shape_tool, color_tool, doc, reader = conv.read_step(STEP)

counts = Counter()
areas = Counter()
leaf_shapes = []
free_labels = conv.TDF_LabelSequence()
shape_tool.GetFreeShapes(free_labels)


def measure(shape):
    for kind, name in ((TopAbs_SOLID, "solid"), (TopAbs_SHELL, "shell"), (TopAbs_FACE, "face"), (TopAbs_WIRE, "wire")):
        explorer = TopExp_Explorer(shape, kind)
        while explorer.More():
            counts[name] += 1
            sub = explorer.Current()
            if name in ("face", "shell", "solid"):
                props = GProp_GProps()
                try:
                    BRepGProp.SurfaceProperties_s(sub, props)
                    areas[name] += props.Mass()
                except Exception:
                    pass
            explorer.Next()


def walk(label):
    components = conv.TDF_LabelSequence()
    shape_tool.GetComponents_s(label, components)
    if components.Length() == 0:
        try:
            shape = shape_tool.GetShape_s(label)
        except Exception:
            return
        if shape is None or shape.IsNull():
            return
        measure(shape)
        leaf_shapes.append(shape)
        return
    for index in range(components.Length()):
        walk(components.Value(index + 1))


for index in range(free_labels.Length()):
    walk(free_labels.Value(index + 1))

print("shape counts:", dict(counts))
print("surface area:", {k: round(v, 4) for k, v in areas.items()})
print("leaf shapes:", len(leaf_shapes))

# How many leaves are shells or faces without a solid inside them?
shell_only = 0
face_only = 0
for shape in leaf_shapes:
    solids = 0
    shells = 0
    for kind, name in ((TopAbs_SOLID, "solid"), (TopAbs_SHELL, "shell")):
        explorer = TopExp_Explorer(shape, kind)
        while explorer.More():
            if name == "solid":
                solids += 1
            else:
                shells += 1
            explorer.Next()
    if solids == 0 and shells > 0:
        shell_only += 1
    if shells == 0:
        face_only += 1
print("leaves without a solid (shell or face bodies):", shell_only)
print("leaves with no shell (bare face bodies):", face_only)
