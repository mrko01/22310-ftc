#!/usr/bin/env python3
"""Find the geometry that belongs to the instances the CAD reader left empty.

Some mirrored instances in the CAD are placed with a transform but carry no
geometry, so their plates are missing from the model. The transform is still
known, so the prototype can be found: mirrored copies of parts that land in an
empty spot inside the machine are the ones that fill a hole.
"""

import importlib.util
import sys
from collections import defaultdict

import numpy as np
from OCP.TDF import TDF_LabelSequence
from OCP.TDataStd import TDataStd_Name
from OCP.TopAbs import TopAbs_FACE, TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer

spec = importlib.util.spec_from_file_location("conv", "scripts/convert_step_to_glb.py")
conv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(conv)

shape_tool, color_tool, doc, reader = conv.read_step(
    "/Users/mirkoruberto/Downloads/Mecanum Drivebase.step"
)


def label_name(label):
    a = TDataStd_Name()
    return a.Get().ToExtString() if label.FindAttribute(TDataStd_Name.GetID_s(), a) else ""


free = TDF_LabelSequence()
shape_tool.GetFreeShapes(free)

bodies = []   # (name, vertices np array, area)
empties = []  # (name, 4x4 transform)


def collect(shape, name):
    from OCP.BRepMesh import BRepMesh_IncrementalMesh
    BRepMesh_IncrementalMesh(shape, 1.3, False, 0.5, True)
    solid_faces = []
    ex = TopExp_Explorer(shape, TopAbs_SOLID)
    while ex.More():
        solid = ex.Current()
        fex = TopExp_Explorer(solid, TopAbs_FACE)
        while fex.More():
            solid_faces.append(fex.Current())
            fex.Next()
        ex.Next()
    points = []
    from OCP.BRep import BRep_Tool
    from OCP.TopLoc import TopLoc_Location
    from OCP.TopoDS import TopoDS
    for face in solid_faces:
        triangulation = BRep_Tool.Triangulation_s(TopoDS.Face_s(face), TopLoc_Location())
        if triangulation is None:
            continue
        transform = face.Location().Transformation()
        for index in range(1, triangulation.NbNodes() + 1):
            point = triangulation.Node(index).Transformed(transform)
            points.append((point.X(), point.Y(), point.Z()))
    if not points:
        return
    array = np.asarray(points)
    # rough surface area from the bounding box diagonal and the point spread
    spread = array.max(axis=0) - array.min(axis=0)
    bodies.append((name, array, float(np.prod(np.sort(spread)[::-1][:3]))))


def walk(label):
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
        name = label_name(label)
        if s == 0 and f == 0:
            trsf = shape.Location().Transformation()
            matrix = np.array([
                [trsf.Value(1, 1), trsf.Value(1, 2), trsf.Value(1, 3), trsf.Value(1, 4)],
                [trsf.Value(2, 1), trsf.Value(2, 2), trsf.Value(2, 3), trsf.Value(2, 4)],
                [trsf.Value(3, 1), trsf.Value(3, 2), trsf.Value(3, 3), trsf.Value(3, 4)],
                [0, 0, 0, 1],
            ], dtype=float)
            empties.append((name, matrix))
            print(f"empty instance: {name!r}")
        else:
            collect(shape, name)
        return
    for i in range(comps.Length()):
        walk(comps.Value(i + 1))


for i in range(free.Length()):
    walk(free.Value(i + 1))

all_points = np.concatenate([b[1] for b in bodies])
low = all_points.min(axis=0)
high = all_points.max(axis=0)
print("model bounds mm:", low.round(1), high.round(1))

# a coarse grid of the model's points to test for holes
cell = 10.0
grid = defaultdict(list)
for point in all_points:
    key = tuple((point // cell).astype(int))
    grid[key].append(point)


def near_any(point, radius=12.0):
    key = tuple((point // cell).astype(int))
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                for other in grid.get((key[0] + dx, key[1] + dy, key[2] + dz), ()):
                    if float(np.linalg.norm(other - point)) < radius:
                        return True
    return False


margin = 0.04
inner_low = low + (high - low) * margin
inner_high = high - (high - low) * margin

for name, matrix in empties:
    print(f"\ncandidates for {name!r}:")
    found = []
    for body_name, points, size in bodies:
        centre = points.mean(axis=0)
        mirrored = matrix @ np.array([centre[0], centre[1], centre[2], 1.0])
        spot = mirrored[:3]
        if not np.all(spot > inner_low) or not np.all(spot < inner_high):
            continue
        if near_any(spot):
            continue
        found.append((size, body_name, spot.round(1)))
    found.sort(reverse=True)
    for size, body_name, spot in found[:8]:
        print(f"   {size:12.0f}  {body_name!r:60} at {spot}")
