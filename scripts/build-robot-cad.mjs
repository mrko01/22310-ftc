// Builds the homepage robot from the team's Fusion CAD.
//
// Input: a geometry export of the Fusion share ("Robot Assembly v4") taken
// from the Autodesk viewer: unique part meshes + one placement per instance,
// CAD appearance colour, and the top-level assembly each part belongs to.
//   node scripts/build-robot-cad.mjs path/to/saffron-robot-cad.bin
//
// Output: src/assets/robot.glb (desktop) and src/assets/robot-mobile.glb,
// one node per assembly (SHOOTER, INTAKE, INDEXER, DRIVEBASE, SENSORS), one
// primitive per CAD colour, creased normals, meshopt compressed.
import {readFileSync} from 'node:fs';
import {Document, NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld, simplify, quantize, meshopt, reorder, prune, dedup, unweld} from '@gltf-transform/functions';
import {MeshoptEncoder, MeshoptSimplifier} from 'meshoptimizer';

const source = process.argv[2] || 'scripts/robot-sources/saffron-robot-cad.bin';
const INCH = .0254;
const CREASE = Math.cos(36 * Math.PI / 180);
const ASSEMBLY = name => /shooter/i.test(name) ? 'SHOOTER' : /intake/i.test(name) ? 'INTAKE' : /indexer/i.test(name) ? 'INDEXER' : /drive/i.test(name) ? 'DRIVEBASE' : /sensor/i.test(name) ? 'SENSORS' : 'OTHER';

await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const bin = readFileSync(source);
if (bin.readUInt32LE(0) !== 0x46414153) throw new Error('Not a Saffron CAD export');
const headerLength = bin.readUInt32LE(4);
const header = JSON.parse(bin.subarray(8, 8 + headerLength).toString('utf8'));
const dataStart = 8 + headerLength + (4 - headerLength % 4) % 4;
const data = bin.buffer.slice(bin.byteOffset + dataStart, bin.byteOffset + bin.length);
const scale = header.units === 'in' ? INCH : header.units === 'mm' ? .001 : header.units === 'cm' ? .01 : 1;

/* ---- Expand every instance into world space, grouped by assembly + colour ---- */
const groups = new Map();
let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
for (const frag of header.frags) {
  const g = header.geoms[frag.g];
  const pos = new Float32Array(data, g.po, g.v * 3), idx = new Uint16Array(data, g.io, g.i);
  const m = frag.m, key = `${ASSEMBLY(frag.a)}|${frag.c}`;
  let group = groups.get(key);
  if (!group) groups.set(key, group = {assembly: ASSEMBLY(frag.a), colour: frag.c, p: [], i: [], v: 0});
  for (let v = 0; v < g.v; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    const wx = (m[0] * x + m[4] * y + m[8] * z + m[12]) * scale;
    const wy = (m[1] * x + m[5] * y + m[9] * z + m[13]) * scale;
    const wz = (m[2] * x + m[6] * y + m[10] * z + m[14]) * scale;
    group.p.push(wx, wy, wz);
    if (wx < min[0]) min[0] = wx; if (wy < min[1]) min[1] = wy; if (wz < min[2]) min[2] = wz;
    if (wx > max[0]) max[0] = wx; if (wy > max[1]) max[1] = wy; if (wz > max[2]) max[2] = wz;
  }
  for (let k = 0; k < g.i; k++) group.i.push(idx[k] + group.v);
  group.v += g.v;
}

/* ---- Stand the robot on the ground, centred, intake facing +Z ---- */
const centre = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2];
const assemblyCentre = name => {
  let s = [0, 0, 0], n = 0;
  for (const g of groups.values()) if (g.assembly === name) for (let k = 0; k < g.p.length; k += 3) {s[0] += g.p[k]; s[2] += g.p[k + 2]; n++;}
  return n ? [s[0] / n - centre[0], 0, s[2] / n - centre[2]] : [0, 0, 1];
};
const facing = assemblyCentre('INTAKE');
const yaw = Math.round(Math.atan2(facing[0], facing[2]) / (Math.PI / 2)) * (Math.PI / 2); // quarter turns only: the intake faces +Z
const cos = Math.cos(-yaw), sin = Math.sin(-yaw);
for (const g of groups.values()) {
  for (let k = 0; k < g.p.length; k += 3) {
    const x = g.p[k] - centre[0], z = g.p[k + 2] - centre[2];
    g.p[k] = x * cos + z * sin; g.p[k + 1] -= centre[1]; g.p[k + 2] = -x * sin + z * cos;
  }
}
const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]].map(v => v.toFixed(3));
console.log(`${header.name}: ${header.frags.length} parts, ${groups.size} assembly/colour groups, size ${size.join(' × ')} m, intake yaw ${(yaw * 180 / Math.PI).toFixed(1)}°`);

/** Creased normals for an indexed triangle list (returns non-indexed positions + normals). */
function creased(positions, indices) {
  const n = indices.length / 3, p = new Float32Array(n * 9);
  for (let t = 0; t < n; t++) for (let c = 0; c < 3; c++) p.set(positions.subarray(indices[t * 3 + c] * 3, indices[t * 3 + c] * 3 + 3), t * 9 + c * 3);
  const face = new Float32Array(n * 3), unit = new Float32Array(n * 3);
  for (let t = 0; t < n; t++) {
    const i = t * 9;
    const ux = p[i + 3] - p[i], uy = p[i + 4] - p[i + 1], uz = p[i + 5] - p[i + 2];
    const vx = p[i + 6] - p[i], vy = p[i + 7] - p[i + 1], vz = p[i + 8] - p[i + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx, l = Math.hypot(fx, fy, fz) || 1;
    face[t * 3] = fx; face[t * 3 + 1] = fy; face[t * 3 + 2] = fz;
    unit[t * 3] = fx / l; unit[t * 3 + 1] = fy / l; unit[t * 3 + 2] = fz / l;
  }
  // Corners that share a welded vertex share an index; group faces by vertex index.
  const byVertex = new Map();
  for (let c = 0; c < n * 3; c++) {const v = indices[c]; let s = byVertex.get(v); if (!s) byVertex.set(v, s = []); s.push(c / 3 | 0);}
  const normals = new Float32Array(n * 9);
  for (let c = 0; c < n * 3; c++) {
    const t = c / 3 | 0; let x = 0, y = 0, z = 0;
    for (const f of byVertex.get(indices[c])) {
      if (unit[t * 3] * unit[f * 3] + unit[t * 3 + 1] * unit[f * 3 + 1] + unit[t * 3 + 2] * unit[f * 3 + 2] < CREASE) continue;
      x += face[f * 3]; y += face[f * 3 + 1]; z += face[f * 3 + 2];
    }
    const l = Math.hypot(x, y, z) || 1;
    normals[c * 3] = x / l; normals[c * 3 + 1] = y / l; normals[c * 3 + 2] = z / l;
  }
  return {p, normals};
}

/** Weld by position (exact after quantising to 0.01 mm) so CAD faces join into one surface. */
function welded(p, i) {
  const keys = new Map(), out = [], remap = new Uint32Array(p.length / 3);
  for (let v = 0; v < p.length / 3; v++) {
    const k = `${Math.round(p[v * 3] * 1e5)},${Math.round(p[v * 3 + 1] * 1e5)},${Math.round(p[v * 3 + 2] * 1e5)}`;
    let id = keys.get(k); if (id === undefined) {id = out.length / 3; keys.set(k, id); out.push(p[v * 3], p[v * 3 + 1], p[v * 3 + 2]);}
    remap[v] = id;
  }
  const idx = new Uint32Array(i.length);
  for (let k = 0; k < i.length; k++) idx[k] = remap[i[k]];
  return {positions: new Float32Array(out), indices: idx};
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder': MeshoptEncoder});
const weldedGroups = [...groups.values()].map(g => ({...g, ...welded(g.p, g.i)}));
for (const [error, out] of [[.0007, 'src/assets/robot.glb'], [.0019, 'src/assets/robot-mobile.glb']]) {
  const doc = new Document(), buffer = doc.createBuffer(), scene = doc.createScene('robot');
  const nodes = new Map(), stats = {};
  for (const g of weldedGroups) {
    // meshopt's error is relative to the mesh extent; scale it so every group
    // gets the same absolute tolerance (error × 0.45 m robot).
    const extent = (() => {let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; for (let k = 0; k < g.positions.length; k += 3) for (let a = 0; a < 3; a++) {lo[a] = Math.min(lo[a], g.positions[k + a]); hi[a] = Math.max(hi[a], g.positions[k + a]);} return Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) || 1;})();
    const [kept] = MeshoptSimplifier.simplify(g.indices, g.positions, 3, 0, Math.min(.05, error * .45 / extent), []);
    if (!kept.length) continue;
    const {p, normals} = creased(g.positions, kept);
    const rgb = [0, 2, 4].map(o => parseInt(g.colour.slice(o, o + 2), 16));
    const name = `Opaque(${rgb.join(',')})`;
    const linear = rgb.map(v => {v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;});
    const material = doc.getRoot().listMaterials().find(m => m.getName() === name) ?? doc.createMaterial(name).setBaseColorFactor([...linear, 1]).setMetallicFactor(.5).setRoughnessFactor(.5).setDoubleSided(true);
    const prim = doc.createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(p).setBuffer(buffer))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(normals).setBuffer(buffer))
      .setMaterial(material);
    if (!nodes.has(g.assembly)) {const mesh = doc.createMesh(g.assembly); const node = doc.createNode(g.assembly).setMesh(mesh); scene.addChild(node); nodes.set(g.assembly, mesh);}
    nodes.get(g.assembly).addPrimitive(prim);
    stats[g.assembly] = (stats[g.assembly] ?? 0) + kept.length / 3;
  }
  await doc.transform(weld(), dedup(), prune(), reorder({encoder: MeshoptEncoder}), quantize({quantizePosition: 14, quantizeNormal: 8}), meshopt({encoder: MeshoptEncoder, level: 'high'}));
  await io.write(out, doc);
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  console.log(out, Math.round(total), 'triangles', JSON.stringify(Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, Math.round(v)]))));
}
