#!/usr/bin/env python3
"""Recover the per-part CAD colours from a Fusion 360 STEP file.

OpenCASCADE's XCAF reader does not expose the COLOUR_RGB values that
Fusion 360 writes into a STEP, so the file is parsed directly. A coloured
part is reachable through this chain of STEP entities:

    STYLED_ITEM('', (#presentation_style), #solid)
      -> PRESENTATION_STYLE_ASSIGNMENT((#surface_style_usage))
      -> SURFACE_STYLE_USAGE(.BOTH., #surface_side_style)
      -> SURFACE_SIDE_STYLE('', (#surface_style_fill_area))
      -> SURFACE_STYLE_FILL_AREA(#fill_area_style)
      -> FILL_AREA_STYLE_COLOUR('', #colour)
      -> COLOUR_RGB('name', r, g, b)

The solid is linked to its product through the shape representation graph,
which gives the readable part name used to match the meshed geometry.
"""

import argparse
import json
import re

ENTITY = re.compile(r"^#(\d+)\s*=\s*([A-Za-z_][A-Za-z_0-9]*)\s*\((.*)\)\s*$", re.S)
REF = re.compile(r"#(\d+)")

WANTED = {
    "STYLED_ITEM",
    "PRESENTATION_STYLE_ASSIGNMENT",
    "SURFACE_STYLE_USAGE",
    "SURFACE_SIDE_STYLE",
    "SURFACE_STYLE_FILL_AREA",
    "FILL_AREA_STYLE",
    "FILL_AREA_STYLE_COLOUR",
    "COLOUR_RGB",
    "MANIFOLD_SOLID_BREP",
    "ADVANCED_BREP_SHAPE_REPRESENTATION",
    "SHAPE_REPRESENTATION",
    "SHAPE_REPRESENTATION_RELATIONSHIP",
    "SHAPE_DEFINITION_REPRESENTATION",
    "PRODUCT_DEFINITION_SHAPE",
    "PRODUCT_DEFINITION",
    "PRODUCT_DEFINITION_FORMATION",
    "PRODUCT",
}


def split_args(text):
    """Split a STEP argument list on top level commas."""
    args = []
    depth = 0
    quoted = False
    current = []
    index = 0
    while index < len(text):
        char = text[index]
        if quoted:
            if char == "'":
                if index + 1 < len(text) and text[index + 1] == "'":
                    current.append("''")
                    index += 2
                    continue
                quoted = False
            current.append(char)
        elif char == "'":
            quoted = True
            current.append(char)
        elif char == "(":
            depth += 1
            current.append(char)
        elif char == ")":
            depth -= 1
            current.append(char)
        elif char == "," and depth == 0:
            args.append("".join(current).strip())
            current = []
        else:
            current.append(char)
        index += 1
    if current:
        args.append("".join(current).strip())
    return args


def first_ref(text):
    match = REF.search(text or "")
    return match.group(1) if match else None


def all_refs(text):
    return [match.group(1) for match in REF.finditer(text or "")]


def unquote(text):
    text = (text or "").strip()
    if text.startswith("'") and text.endswith("'"):
        return text[1:-1].replace("''", "'")
    return text


def parse(path):
    styled = {}
    presentation = {}
    usage = {}
    side_style = {}
    fill_area = {}
    fill_area_style = {}
    fill_area_colour = {}
    colours = {}
    breps = {}
    representations = {}
    relationships = {}
    shape_definitions = {}
    product_shapes = {}
    product_definitions = {}
    formations = {}
    products = {}

    buffer = ""
    with open(path, "r", errors="ignore") as handle:
        for line in handle:
            buffer += line
            if ";" not in buffer:
                continue
            pieces = buffer.split(";")
            buffer = pieces.pop()
            for chunk in pieces:
                chunk = chunk.strip()
                if not chunk:
                    continue
                match = ENTITY.match(chunk)
                if not match:
                    continue
                ident, kind, body = match.groups()
                if kind not in WANTED:
                    continue
                args = split_args(body)
                if kind == "STYLED_ITEM" and len(args) >= 3:
                    style_refs = all_refs(args[1])
                    for item in all_refs(args[2]):
                        if style_refs:
                            styled[item] = style_refs[0]
                elif kind == "PRESENTATION_STYLE_ASSIGNMENT":
                    presentation[ident] = all_refs(args[0])
                elif kind == "SURFACE_STYLE_USAGE":
                    usage[ident] = all_refs(" ".join(args))
                elif kind == "SURFACE_SIDE_STYLE":
                    side_style[ident] = all_refs(" ".join(args))
                elif kind == "SURFACE_STYLE_FILL_AREA":
                    fill_area[ident] = all_refs(" ".join(args))
                elif kind == "FILL_AREA_STYLE":
                    fill_area_style[ident] = all_refs(" ".join(args))
                elif kind == "FILL_AREA_STYLE_COLOUR":
                    fill_area_colour[ident] = first_ref(" ".join(args))
                elif kind == "COLOUR_RGB" and len(args) >= 4:
                    colours[ident] = (
                        unquote(args[0]),
                        float(args[1]),
                        float(args[2]),
                        float(args[3]),
                    )
                elif kind == "MANIFOLD_SOLID_BREP":
                    breps[ident] = unquote(args[0]) if args else ""
                elif kind in ("ADVANCED_BREP_SHAPE_REPRESENTATION", "SHAPE_REPRESENTATION"):
                    representations[ident] = all_refs(args[1]) if len(args) >= 2 else []
                elif kind == "SHAPE_REPRESENTATION_RELATIONSHIP" and len(args) >= 4:
                    relationships.setdefault(ident, (first_ref(args[2]), first_ref(args[3])))
                elif kind == "SHAPE_DEFINITION_REPRESENTATION" and len(args) >= 2:
                    shape_definitions.setdefault(ident, (first_ref(args[0]), first_ref(args[1])))
                elif kind == "PRODUCT_DEFINITION_SHAPE" and len(args) >= 3:
                    product_shapes[ident] = first_ref(args[2])
                elif kind == "PRODUCT_DEFINITION" and len(args) >= 3:
                    product_definitions[ident] = first_ref(args[2])
                elif kind == "PRODUCT_DEFINITION_FORMATION":
                    formations[ident] = first_ref(" ".join(args))
                elif kind == "PRODUCT" and args:
                    products[ident] = unquote(args[0])

    # solid -> colour
    solid_colour = {}
    for solid, style_ref in styled.items():
        colour = None
        for presentation_ref in presentation.get(style_ref, []):
            for usage_ref in usage.get(presentation_ref, []):
                for side_ref in side_style.get(usage_ref, []):
                    for fill_ref in fill_area.get(side_ref, []):
                        for style_ref in fill_area_style.get(fill_ref, []):
                            colour_ref = fill_area_colour.get(style_ref)
                            if colour_ref and colour_ref in colours:
                                colour = colours[colour_ref]
        if colour:
            solid_colour[solid] = colour

    # solid -> product name
    # A shape definition representation links the product definition shape to a
    # plain shape representation; a shape representation relationship then
    # joins that representation to the BREP representation holding the bodies.
    brep_of_representation = {}
    for ident, (left, right) in relationships.items():
        for plain_ref, brep_ref in ((left, right), (right, left)):
            if plain_ref and brep_ref:
                brep_of_representation[plain_ref] = brep_ref

    solid_product = {}
    for ident, (shape_ref, rep_ref) in shape_definitions.items():
        if not shape_ref or not rep_ref:
            continue
        product_definition = product_definitions.get(product_shapes.get(shape_ref))
        name = products.get(formations.get(product_definition))
        if not name:
            continue
        brep_ref = brep_of_representation.get(rep_ref, rep_ref)
        for solid in representations.get(brep_ref, []):
            if solid in breps:
                solid_product[solid] = name

    # product name -> colour
    by_name = {}
    for solid, colour in solid_colour.items():
        name = solid_product.get(solid)
        if name:
            by_name.setdefault(name, colour)
    return by_name, solid_colour, solid_product


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("step")
    parser.add_argument("--out")
    args = parser.parse_args()

    by_name, solid_colour, solid_product = parse(args.step)
    print(f"coloured solids: {len(solid_colour)}")
    print(f"named products: {len(solid_product)}")
    print(f"product/name colours: {len(by_name)}")
    for name, colour in list(sorted(by_name.items()))[:12]:
        print(f"  {name!r}: {colour}")
    if args.out:
        with open(args.out, "w") as handle:
            json.dump({name: list(colour) for name, colour in by_name.items()}, handle, indent=1)
        print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
