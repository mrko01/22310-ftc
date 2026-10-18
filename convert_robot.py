#!/usr/bin/env python3
"""Convert STEP to GLB with proper assembly structure.

Groups零件 into assemblies matching the names that Three.js code expects:
- SOURCE_SHOOTER
- INFERRED_INTAKE
- INFERRED_INDEXER
- INFERRED_CHASSIS
- INFERRED_DRIVETRAIN
- INFERRED_WHEEL_L_FRONT
- INFERRED_WHEEL_R_FRONT
- INFERRED_WHEEL_L_REAR
- INFERRED_WHEEL_R_REAR
"""

import trimesh
import json
import struct
import os
import sys
from collections import defaultdict
import tempfile

STEP_PATH = "/Users/mirkoruberto/Downloads/FULL ROBOT OCT 16 SAFFRON.step"
OUTPUT_PATH = "/Users/mirkoruberto/Documents/22310-ftc/src/assets/robot.glb"

# Assembly classification patterns - order matters (first match wins)
ASSEMBLY_PATTERNS = {
    'SOURCE_SHOOTER': [
        'source', 'shooter', 'fly wheel', 'magazine', 'launcher', 'arm',
        'top arm', 'limiting plate', 'mounting plate', 'feed clear',
        'feed upper guide', 'feed stand', 'feed mount', 'intake floor ramp',
        'intake shaft', 'intake roller', 'intake grip', 'intake adjustment',
    ],
    'INFERRED_INTAKE': [
        'intake', 'grip', 'adjustment', 'roller front', 'roller transfer',
        'shaft front', 'shaft transfer', 'floor ramp',
    ],
    'INFERRED_INDEXER': [
        'indexer', 'belt', 'cleat', 'motor end connector', 'return', 'motor harness',
        'sensor harness', 'motor shield',
    ],
    'INFERRED_CHASSIS': [
        'chassis', 'body', 'plate', 'mount', 'bracket', 'inlay', 'corner',
        'crossmember', 'fastener', 'retaining strap', 'harness', 'connector',
        'hub motor connector', 'bearing bolt', 'hopper floor', 'dark composite',
        'saffron red accent', 'satin aluminum', 'dark anodized',
    ],
    'INFERRED_DRIVETRAIN': [
        'gearbox', 'motor shaft', 'hex shaft', 'pulley', 'bearing',
        'hex encoder', 'encoder', 'cap screw', 'shaft', 'gearbox barrel',
        'gearbox face', 'gearbox bearing', 'gearbox shaft', 'gearbox snap ring',
        'gearbox base', 'rev-40-16', 'rev-41-16', 'motor dummy',
        'no gearbox', 'gearbox collar', 'drive bearing', 'drive gear',
    ],
    'INFERRED_WHEEL_L_FRONT': [
        'wheel hub l front', 'pin l front', 'roller l front',
        'wheel axle cap l front', 'spoke l front',
    ],
    'INFERRED_WHEEL_R_FRONT': [
        'wheel hub r front', 'pin r front', 'roller r front',
        'wheel axle cap r front', 'spoke r front',
    ],
    'INFERRED_WHEEL_L_REAR': [
        'wheel hub l rear', 'pin l rear', 'roller l rear',
        'wheel axle cap l rear', 'spoke l rear',
    ],
    'INFERRED_WHEEL_R_REAR': [
        'wheel hub r rear', 'pin r rear', 'roller r rear',
        'wheel axle cap r rear', 'spoke r rear',
    ],
}


def classify_name(name):
    """Classify a零件 name into an assembly group."""
    name_lower = name.lower()
    # Sort by pattern length descending so longer patterns match first
    for assembly, patterns in ASSEMBLY_PATTERNS.items():
        for pattern in patterns:
            if pattern in name_lower:
                return assembly
    return 'UNCLASSIFIED_DETAIL'


def build_assembly_scene(step_scene):
    """Group零件 into assemblies and build a GLB-compatible scene."""
    classifications = defaultdict(list)
    for name, geom in step_scene.geometry.items():
        cls = classify_name(name)
        classifications[cls].append((name, geom))
    
    # Print classification results
    print("\n=== Classification Results ===")
    for cls, items in sorted(classifications.items()):
        print(f"\n{cls}: {len(items)}零件")
        for name, _ in items:
            print(f"  - {name}")
    
    # Check required assemblies
    required = ['SOURCE_SHOOTER', 'INFERRED_CHASSIS', 'INFERRED_INTAKE', 
                'INFERRED_INDEXER', 'INFERRED_DRIVETRAIN']
    print("\n=== Required Assembly Check ===")
    for req in required:
        if req in classifications:
            print(f"✓ {req}: {len(classifications[req])}零件")
        else:
            print(f"✗ {req}: MISSING")
    
    # Check all零件 were classified
    total_classified = sum(len(items) for items in classifications.values())
    total_original = len(step_scene.geometry)
    unclassified = total_original - total_classified
    print(f"\n=== Summary ===")
    print(f"Total零件: {total_original}")
    print(f"Classified: {total_classified}")
    print(f"Unclassified: {unclassified}")
    
    return classifications


def export_assembly_glb(classifications, output_path):
    """Export classification results as GLB."""
    import trimesh
    
    # Build a scene with proper hierarchy
    # Each assembly becomes a mesh with multiple primitives
    # We create one mesh per assembly, with primitives named after零件
    
    meshes = []
    assembly_meshes = {}
    
    for assembly_name, parts in classifications.items():
        # Concatenate all零件 into one mesh for this assembly
        part_meshes = [geom for _, geom in parts if isinstance(geom, trimesh.Trimesh)]
        if not part_meshes:
            continue
        
        try:
            combined = trimesh.util.concatenate(part_meshes)
            combined.name = assembly_name
            meshes.append(combined)
            assembly_meshes[assembly_name] = len(meshes) - 1
        except Exception as e:
            print(f"ERROR: Failed to combine {assembly_name}: {e}")
    
    # Create scene with meshes
    scene_dict = {name: mesh for name, mesh in zip(assembly_meshes.keys(), meshes)}
    final_scene = trimesh.Scene(scene_dict)
    
    # Export
    print(f"\n=== Exporting GLB ===")
    print(f"Scene meshes: {len(final_scene.geometry)}")
    
    # Save to temp path first
    temp_path = output_path.replace('.glb', '_temp.glb')
    final_scene.export(temp_path, file_type='glb')
    
    size = os.path.getsize(temp_path)
    print(f"Exported: {size / 1024 / 1024:.1f} MB")
    
    # Verify the exported GLB
    print("\n=== Verifying Export ===")
    with open(temp_path, 'rb') as f:
        magic, version, length = struct.unpack('<III', f.read(12))
        print(f"GLB v{version}, {size / 1024 / 1024:.1f} MB")
        
        off = 12
        while off < length - 8:
            chunk_len, chunk_type_raw = struct.unpack('<II', f.read(8))
            chunk_type = chunk_type_raw.to_bytes(4, 'little').decode('ascii', errors='replace')
            chunk_data = f.read(chunk_len)
            off += 8 + chunk_len
            
            if chunk_type == "JSON":
                json_data = json.loads(chunk_data)
                print(f"\nJSON structure:")
                print(f"  meshes: {len(json_data.get('meshes', []))}")
                print(f"  nodes: {len(json_data.get('nodes', []))}")
                
                # Show mesh names
                for i, mesh in enumerate(json_data.get('meshes', [])):
                    print(f"    Mesh {i}: {mesh.get('name', 'unnamed')}")
                
                # Show node names
                for i, node in enumerate(json_data.get('nodes', [])):
                    name = node.get('name', 'unnamed')
                    mesh = node.get('mesh', -1)
                    children = node.get('children', [])
                    if children:
                        print(f"    Node {i}: '{name}' mesh={mesh} children={len(children)}")
                    else:
                        print(f"    Node {i}: '{name}' mesh={mesh}")
                
                # Check for required assemblies
                required = ['SOURCE_SHOOTER', 'INFERRED_CHASSIS', 'INFERRED_INTAKE',
                           'INFERRED_INDEXER', 'INFERRED_DRIVETRAIN']
                found = []
                for mesh in json_data.get('meshes', []):
                    for req in required:
                        if req in mesh.get('name', ''):
                            found.append(mesh['name'])
                
                if found:
                    print(f"\n✓ Found assemblies: {found}")
                else:
                    print(f"\n✗ No required assemblies found!")
                
                break
            elif chunk_type == "BIN\0":
                print(f"\nBIN chunk: {chunk_len} bytes")
            else:
                print(f"\nChunk: {chunk_type}")
    
    # Move to final location
    os.replace(temp_path, output_path)
    print(f"\n✓ Saved to {output_path}")


if __name__ == '__main__':
    print("Loading STEP file...")
    step = trimesh.load(STEP_PATH, file_type='step', process=False)
    
    if not isinstance(step, trimesh.Scene):
        print("ERROR: STEP not a Scene")
        sys.exit(1)
    
    print(f"STEP loaded: {len(step.geometry)} geometry objects")
    
    # Build classifications
    classifications = build_assembly_scene(step)
    
    # Export as GLB
    export_assembly_glb(classifications, OUTPUT_PATH)
