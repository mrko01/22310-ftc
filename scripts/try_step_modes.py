#!/usr/bin/env python3
"""Try the STEP reader settings that change how instances are resolved.

The CAD stores some panels as instances that point at a shared
representation. The default reader leaves those instances empty, which
removes the plates from the model.
"""

import importlib.util
import sys
from collections import Counter

from OCP.IFSelect import IFSelect_RetDone
from OCP.Interface import Interface_Static
from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.TDF import TDF_LabelSequence
from OCP.TopAbs import TopAbs_FACE, TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer

STEP = sys.argv[1] if len(sys.argv) > 1 else "/Users/mirkoruberto/Downloads/Mecanum Drivebase.step"

MODES = [
    ("default", {}),
    ("product-mode-1", {"read.step.product.mode": "1"}),
    ("assembly-level-0", {"read.step.assembly.level": "0"}),
    ("shape-repr", {"read.step.shape.repr": "1"}),
    ("product+assembly", {"read.step.product.mode": "1", "read.step.assembly.level": "0"}),
]


def read(settings):
    for key, value in settings.items():
        Interface_Static.SetCVal_s(key, value)
    reader = STEPCAFControl_Reader()
    if reader.ReadFile(STEP) != IFSelect_RetDone:
        return None
    from OCP.TCollection import TCollection_ExtendedString
    from OCP.TDocStd import TDocStd_Document
    from OCP.XCAFDoc import XCAFDoc_DocumentTool
    doc = TDocStd_Document(TCollection_ExtendedString("XmlOcaf"))
    if not reader.Transfer(doc):
        return None
    shape_tool = XCAFDoc_DocumentTool.ShapeTool_s(doc.Main())
    color_tool = XCAFDoc_DocumentTool.ColorTool_s(doc.Main())
    free = TDF_LabelSequence()
    shape_tool.GetFreeShapes(free)
    counts = Counter()
    empty = 0

    def walk(label):
        nonlocal empty
        comps = TDF_LabelSequence()
        shape_tool.GetComponents_s(label, comps)
        if comps.Length() == 0:
            try:
                shape = shape_tool.GetShape_s(label)
            except Exception:
                return
            if shape is None or shape.IsNull():
                return
            s = 0
            ex = TopExp_Explorer(shape, TopAbs_SOLID)
            while ex.More():
                s += 1
                ex.Next()
            f = 0
            ex = TopExp_Explorer(shape, TopAbs_FACE)
            while ex.More():
                f += 1
                ex.Next()
            if s == 0 and f == 0:
                empty += 1
            counts["solids"] += s
            counts["faces"] += f
            return
        for i in range(comps.Length()):
            walk(comps.Value(i + 1))

    for i in range(free.Length()):
        walk(free.Value(i + 1))
    return counts, empty


for name, settings in MODES:
    result = read(settings)
    if result is None:
        print(f"{name}: read failed")
        continue
    counts, empty = result
    print(f"{name:18} solids={counts['solids']:5d} faces={counts['faces']:7d} empty_leaves={empty}")
