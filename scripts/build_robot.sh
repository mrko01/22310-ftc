#!/bin/bash
# Build the robot model from the CAD step.
#
# The plates in this machine are flat sheet metal, so they tessellate into a
# handful of triangles each. A high minimum face count silently deletes them
# and the model arrives with holes in it, so the threshold stays low.
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="$PWD/node_modules/.bin:/Users/mirkoruberto/Library/Application Support/MacStudioAI/runtime/node/bin:$PATH"

STEP="${1:-/Users/mirkoruberto/Downloads/Mecanum Drivebase.step}"
OUT="${2:-src/assets/robot.glb}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

python3 scripts/convert_step_to_glb.py "$STEP" "$WORK/1-raw.glb" --deflection 1.3 --relative --min-faces 6
gltf-transform weld "$WORK/1-raw.glb" "$WORK/2-weld.glb"
# The error based simplifier keeps the thin sheet metal panels. A ratio
# based one collapses a flat plate into a single triangle and the panel
# disappears from the model.
gltf-transform simplify "$WORK/2-weld.glb" "$WORK/3-simple.glb" --error 0.002
gltf-transform meshopt "$WORK/3-simple.glb" "$WORK/4-meshopt.glb" --level high
python3 scripts/fix_gltf_hierarchy.py "$WORK/4-meshopt.glb" "$WORK/5-grouped.glb"
cp "$WORK/5-grouped.glb" "$OUT"
ls -l "$OUT"
npm run build
echo "robot model rebuilt: $OUT"
