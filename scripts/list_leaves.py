#!/usr/bin/env python3
"""List the CAD assembly leaves with their names and what geometry they carry.

The CAD holds mirrored instances of some panels. A reader that skips the
mirror placeholders leaves those plates out of the model, so this prints the
name of every leaf, how much geometry it has and whether it is placed.
"""

import importlib.util
import sys

from OCP.TopAbs import TopAbs_FACE, TopAbs_SHELL, TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer
from OCP.TopLoc import TopLoc_Location
from OCP.TDataStd import TDataStd_Name
from OCP.TDF import TDF_LabelSequence, TDF_Tool
from OCP.XCAFDoc import XCAFDoc_ShapeTool

STEP = sys.argv[1] if len(sys.argv) > 1 else "/Users/mirkoruberto/Downloads/Mecanum Drivebase.step"

spec = importlib.util.spec_from_file_location("conv", "scripts/convert_step_to_glb.py")
conv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(conv)

shape_tool, color_tool, doc, reader = conv.read_step(STEP)


def label_name(label):
    from OCP.TDataStd import TDataStd_Name
    attribute = TDataStd_Name()
    if label.FindAttribute(TDataStd_Name.GetID_s(), attribute):
        return attribute.Get().ToExtString()
    return ""


def counts(shape):
    result = {}
    for kind, name in ((TopAbs_SOLID, "solids"), (TopAbs_SHELL, "shells"), (TopAbs_FACE, "faces")):
        explorer = TopExp_Explorer(shape, kind)
        count = 0
        while explorer.More():
            count += 1
            explorer.Next()
        result[name] = count
    return result


def placed(shape):
    return not shape.Location().IsIdentity()


free_labels = TDF_LabelSequence()
shape_tool.GetFreeShapes(free_labels)
leaves = []


def walk(label, depth=0):
    components = TDF_LabelSequence()
    shape_tool.GetComponents_s(label, components)
    if components.Length() == 0:
        leaves.append(label)
        return
    for index in range(components.Length()):
        walk(components.Value(index + 1), depth + 1)


for index in range(free_labels.Length()):
    walk(free_labels.Value(index + 1))

print("leaves:", len(leaves))
for label in leaves:
    name = label_name(label)
    try:
        shape = shape_tool.GetShape_s(label)
    except Exception:
        shape = None
    info = counts(shape) if shape is not None and not shape.IsNull() else {"solids": 0, "shells": 0, "faces": 0}
    placed_flag = placed(shape) if shape is not None and not shape.IsNull() else False
    if info["solids"] == 0 or "irror" in name or "panel" in name.lower() or "plate" in name.lower():
        print(f"  {name[:60]:60} {info} placed={placed_flag}")
