// One WebGL stage for the whole homepage. The page's scroll director hands it
// a target state every frame; the stage eases toward it and renders.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {finishRobot, finishField} from './materials.js';

const SAFFRON = new THREE.Color('#ef3326'), EMBER = new THREE.Color('#ff7a2f'), POLLEN = new THREE.Color('#f5b335'), PAPER = new THREE.Color('#f2ede6');
const INK = 0x0a0a0b;
/* global __ASSETS__ */
const asset = name => '/assets/' + name + (typeof __ASSETS__ !== 'undefined' && __ASSETS__[name] ? '?v=' + __ASSETS__[name] : '');
export const STATE_KEYS = ['cx', 'cy', 'cz', 'tx', 'ty', 'tz', 'yaw', 'spin', 'explode', 'holo', 'field', 'morph', 'dust', 'grid', 'parallax'];

/** Exploded-view offsets (metres), applied to each assembly as explode → 1. Front of the robot is +z. */
const EXPLODE = {
  SOURCE_SHOOTER: [0, .2, -.02],
  INFERRED_INDEXER: [0, .11, -.05],
  INFERRED_INTAKE: [0, .07, .17],
  INFERRED_CHASSIS: [0, .045, 0],
  INFERRED_DRIVETRAIN: [0, 0, 0]
};
export const PARTS = [
  ['SOURCE_SHOOTER', 'Shooter', 'From team CAD'],
  ['INFERRED_INTAKE', 'Intake', 'Collects game pieces'],
  ['INFERRED_INDEXER', 'Indexer', 'Feeds the shooter'],
  ['INFERRED_CHASSIS', 'Chassis', 'Structure & electronics'],
  ['INFERRED_DRIVETRAIN', 'Drivetrain', 'Mecanum drive']
];

const rand = (() => {let n = 22310; return () => (n = (n * 1664525 + 1013904223) >>> 0) / 4294967296;})();

/* ---------- Shader patches ---------- */
const worldPosVertex = `
  vec4 sfWorld = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    sfWorld = instanceMatrix * sfWorld;
  #endif
  vSfWorld = (modelMatrix * sfWorld).xyz;`;

/** Robot finish → blueprint hologram, swept by a horizontal scan plane. */
function patchHolo(material, uniforms) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSfWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>' + worldPosVertex);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vSfWorld; uniform float uScan; uniform float uHolo; uniform vec3 uHoloColor; uniform vec3 uHoloEdge; uniform float uTime;
        float sfGrid(float v, float s){ float g = abs(fract(v / s - .5) - .5) / fwidth(v / s); return 1. - min(g, 1.); }`)
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
        {
          float above = smoothstep(uScan - .004, uScan + .004, vSfWorld.y);
          float band = exp(-abs(vSfWorld.y - uScan) * 140.) * step(.001, uHolo) * step(uHolo, .999);
          vec3 n = normalize(normal); vec3 v = normalize(vViewPosition);
          float fres = pow(1. - abs(dot(n, v)), 2.2);
          float grid = max(sfGrid(vSfWorld.x, .025), max(sfGrid(vSfWorld.y, .025), sfGrid(vSfWorld.z, .025)));
          vec3 holo = vec3(.018, .016, .02) + uHoloColor * (fres * 1.35 + grid * .32) + uHoloEdge * pow(fres, 6.) * 1.2;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, holo, above * step(.001, uHolo));
          gl_FragColor.rgb += uHoloEdge * band * 3.;
        }`);
  };
  material.customProgramCacheKey = () => 'sf-holo';
  material.needsUpdate = true;
}

/** Field reveal: a ring expands from the robot; beyond it the field is not drawn. */
function patchReveal(material, uniforms) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSfWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>' + worldPosVertex);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSfWorld; uniform float uRadius; uniform vec3 uRing;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float sfD = length(vSfWorld.xz);
        if (sfD > uRadius) discard;`)
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
        gl_FragColor.rgb += uRing * smoothstep(.09, 0., uRadius - sfD) * 3.;`);
  };
  material.customProgramCacheKey = () => 'sf-reveal';
  material.needsUpdate = true;
}

/* ---------- Scene pieces ---------- */
function backdrop() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {uGlow: {value: 1}, uColor: {value: EMBER.clone()}, uField: {value: 0}},
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec3 vDir; uniform float uGlow; uniform vec3 uColor; uniform float uField;
      void main(){
        vec3 base = vec3(.0039, .0039, .0045);
        float g = pow(max(dot(vDir, normalize(vec3(-.25, .18, -1.))), 0.), 5.) * .022 * uGlow;
        float h = smoothstep(-.2, .6, vDir.y) * .004;
        gl_FragColor = vec4(base + uColor * g + vec3(h) * (1. - uField), 1.);
      }`
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), material);
  mesh.renderOrder = -10;
  return mesh;
}

function floorGrid() {
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {uOpacity: {value: 1}, uColor: {value: PAPER.clone()}, uAccent: {value: SAFFRON.clone()}},
    vertexShader: 'varying vec2 vP; void main(){ vP = (modelMatrix * vec4(position,1.)).xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec2 vP; uniform float uOpacity; uniform vec3 uColor; uniform vec3 uAccent;
      float line(vec2 p, float s, float w){ vec2 g = abs(fract(p / s - .5) - .5) / fwidth(p / s); return 1. - min(min(g.x, g.y) / w, 1.); }
      void main(){
        float d = length(vP);
        float fade = smoothstep(2.6, .25, d);
        float minor = line(vP, .05, 1.) * .07, major = line(vP, .25, 1.2) * .16;
        float axis = (1. - min(abs(vP.x) / fwidth(vP.x), 1.)) + (1. - min(abs(vP.y) / fwidth(vP.y), 1.));
        vec3 c = uColor * (minor + major) + uAccent * axis * .5;
        gl_FragColor = vec4(c, (minor + major + axis * .5) * fade * uOpacity);
      }`
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), material);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = -.001; mesh.renderOrder = -5;
  return mesh;
}

function contactShadow() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,.85)'); grad.addColorStop(.55, 'rgba(0,0,0,.35)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(.75, .75), new THREE.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false}));
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = .0005; mesh.renderOrder = -4;
  return mesh;
}

/** Points for "22310", sampled from the team's Neuropol numerals. */
async function numeralTargets(count, width, center) {
  try {await document.fonts.load('200px Neuropol');} catch {}
  const c = document.createElement('canvas'), g = c.getContext('2d', {willReadFrequently: true});
  c.width = 1400; c.height = 300;
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '230px Neuropol, Archivo, sans-serif';
  g.fillText('22310', 700, 155);
  const data = g.getImageData(0, 0, c.width, c.height).data, hits = [];
  for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) if (data[(y * c.width + x) * 4 + 3] > 128) hits.push(x, y);
  const out = new Float32Array(count * 3), scale = width / c.width, n = hits.length / 2;
  for (let i = 0; i < count; i++) {
    const k = Math.floor(rand() * n) * 2;
    out[i * 3] = center.x + (hits[k] - c.width / 2 + (rand() - .5) * 2) * scale;
    out[i * 3 + 1] = center.y - (hits[k + 1] - c.height / 2 + (rand() - .5) * 2) * scale;
    out[i * 3 + 2] = center.z + (rand() - .5) * .03;
  }
  return out;
}

async function particles(count, center) {
  const positions = new Float32Array(count * 3), seeds = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    // A loose shell of dust around the robot, thicker towards the finale height.
    const u = rand() * Math.PI * 2, v = Math.acos(2 * rand() - 1), r = .75 + Math.pow(rand(), .7) * 4.2;
    positions[i * 3] = Math.sin(v) * Math.cos(u) * r;
    positions[i * 3 + 1] = .3 + Math.cos(v) * r * .7 + (rand() < .35 ? center.y * rand() : 0);
    positions[i * 3 + 2] = Math.sin(v) * Math.sin(u) * r - .6;
    seeds.set([rand(), .35 + rand() * .9, rand(), rand()], i * 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aTarget', new THREE.BufferAttribute(await numeralTargets(count, 1.95, center), 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {uTime: {value: 0}, uMorph: {value: 0}, uOpacity: {value: 1}, uPR: {value: 1}, uSize: {value: 9},
      uSaffron: {value: SAFFRON}, uEmber: {value: EMBER}, uPollen: {value: POLLEN}, uPaper: {value: PAPER}},
    vertexShader: `attribute vec3 aTarget; attribute vec4 aSeed;
      uniform float uTime, uMorph, uOpacity, uPR, uSize; uniform vec3 uSaffron, uEmber, uPollen, uPaper;
      varying float vA; varying vec3 vC;
      void main(){
        float ph = aSeed.z * 6.2831;
        vec3 dust = position + vec3(sin(uTime * .21 + ph) * .06, cos(uTime * .17 + ph * 1.3) * .07, sin(uTime * .13 + ph * .7) * .06);
        float m = clamp((uMorph - aSeed.x * .4) / .6, 0., 1.); m = m * m * (3. - 2. * m);
        float mid = sin(m * 3.14159);
        vec3 p = mix(dust, aTarget, m);
        p += vec3(sin(ph * 3. + uTime * .9), cos(ph * 2. + uTime * .7), sin(ph * 5.)) * .32 * mid;
        p.y += sin(uTime * 2.2 + ph * 9.) * .0025 * m;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * aSeed.y * uPR * mix(1., .75, m) / -mv.z;
        float tw = .45 + .55 * (.5 + .5 * sin(uTime * .8 + ph * 7.));
        vA = uOpacity * mix(.42 * tw, .95, m);
        vec3 dc = aSeed.w < .16 ? uSaffron : aSeed.w < .22 ? uPollen : uPaper * .8;
        vec3 tc = mix(uSaffron, mix(uEmber, uPollen, aSeed.w), smoothstep(-.9, 1.4, aTarget.x + aSeed.w * .4));
        vC = mix(dc, tc * 1.6, m) + uPollen * mid * .8;
      }`,
    fragmentShader: `varying float vA; varying vec3 vC;
      void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, d); gl_FragColor = vec4(vC * a, a * vA); }`
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

const FinalShader = {
  uniforms: {tDiffuse: {value: null}, uTime: {value: 0}, uCA: {value: .006}, uGrain: {value: .045}, uVignette: {value: .55}, uRes: {value: new THREE.Vector2(1, 1)}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uCA, uGrain, uVignette; uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 d = vUv - .5; float r = dot(d, d);
      vec3 c = vec3(texture2D(tDiffuse, vUv + d * uCA * r * 4.).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d * uCA * r * 4.).b);
      c *= mix(1., smoothstep(.75, .05, r * 1.5), uVignette);
      c += (hash(vUv * uRes + fract(uTime) * 91.) - .5) * uGrain;
      gl_FragColor = vec4(c, 1.);
    }`
};

/* ---------- Stage ---------- */
export async function createStage(canvas, {onProgress = () => {}} = {}) {
  const mobile = matchMedia('(max-width: 800px), (pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({canvas, antialias: !mobile, powerPreference: 'high-performance'});
  if (renderer.getContext().isContextLost()) throw new Error('WebGL unavailable');
  const dpr = () => Math.min(devicePixelRatio, mobile ? 1.35 : 1.75);
  renderer.setPixelRatio(dpr()); renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(INK, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .92;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, .02, 120);

  const pmrem = new THREE.PMREMGenerator(renderer);
  // A procedural studio: no 1.6 MB HDR download or decode before first frame.
  const room = new RoomEnvironment(); const environment = pmrem.fromScene(room, .04); room.dispose();
  pmrem.dispose();
  scene.environment = environment.texture; scene.environmentIntensity = .55; scene.environmentRotation.y = .65;

  const key = new THREE.DirectionalLight(0xfff4ea, 2.1); key.position.set(-1.4, 2.6, 1.6);
  const rim = new THREE.DirectionalLight(0xff4a30, 2.6); rim.position.set(1.6, 1.1, -2.2);
  const rim2 = new THREE.DirectionalLight(0xffb070, 1.1); rim2.position.set(-2, .6, -1.5);
  const cursorLight = new THREE.PointLight(0xff7a2f, 0, 3, 2); cursorLight.position.set(0, .4, .8);
  scene.add(key, rim, rim2, cursorLight, new THREE.AmbientLight(0x8890a0, .18));

  const sky = backdrop(), grid = floorGrid(), shadow = contactShadow();
  scene.add(sky, grid, shadow);

  /* Robot */
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const T = {t0: performance.now() | 0}; window.__SAFFRON_QA__.stageTiming = T;
  const gltf = await loader.loadAsync(asset('robot.glb'), e => e.total && onProgress(e.loaded / e.total));
  const robot = new THREE.Group(); robot.add(gltf.scene); scene.add(robot);
  T.glb = performance.now() | 0;
  const finishes = finishRobot(robot);
  T.finish = performance.now() | 0;
  const holoUniforms = {uScan: {value: 1}, uHolo: {value: 0}, uTime: {value: 0}, uHoloColor: {value: SAFFRON.clone().multiplyScalar(1.1)}, uHoloEdge: {value: EMBER.clone()}};
  const patched = new Set();
  robot.traverse(o => {
    if (!o.isMesh) return;
    for (const m of [o.material].flat()) if (!patched.has(m)) {patched.add(m); patchHolo(m, holoUniforms);}
  });
  const assemblies = [];
  robot.traverse(o => {if (EXPLODE[o.name]) assemblies.push({object: o, origin: o.position.clone(), offset: new THREE.Vector3(...EXPLODE[o.name]), center: new THREE.Vector3()});});
  robot.updateWorldMatrix(true, true);
  for (const a of assemblies) {new THREE.Box3().setFromObject(a.object).getCenter(a.center); robot.worldToLocal(a.center);}
  const bounds = new THREE.Box3().setFromObject(robot).getSize(new THREE.Vector3());

  /* Particles */
  const finaleCenter = new THREE.Vector3(0, 2.6, 0);
  const dust = await particles(mobile ? 7000 : 18000, finaleCenter);
  scene.add(dust);
  T.dust = performance.now() | 0;

  /* Field (lazy) */
  const field = new THREE.Group(); field.position.set(-1.1, 0, -1.1); field.visible = false; scene.add(field);
  const revealUniforms = {uRadius: {value: 0}, uRing: {value: SAFFRON.clone()}};
  let fieldState = 'idle';
  async function loadField() {
    if (fieldState !== 'idle') return; fieldState = 'loading';
    try {
      const fieldGltf = await loader.loadAsync(asset('field-compressed.glb'));
      field.add(fieldGltf.scene); finishes.textures.push(...finishField(field).textures);
      const seen = new Set();
      field.traverse(o => {
        if (!o.isMesh) return;
        for (const m of [o.material].flat()) {
          if (seen.has(m)) continue; seen.add(m);
          if (!/CLEAR|GLASS|TRANSPARENT/i.test(m.name || '')) {m.transparent = false; m.depthWrite = true; m.opacity = 1;}
          patchReveal(m, revealUniforms);
        }
      });
      await renderer.compileAsync(field, camera, scene).catch(() => {});
      fieldState = 'ready';
    } catch (error) {console.warn('Field unavailable', error); fieldState = 'failed';}
  }

  /* Post */
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(dpr()); composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), .42, .5, .96);
  bloom.enabled = !mobile; composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const final = new ShaderPass(FinalShader); composer.addPass(final);
  final.uniforms.uCA.value = mobile ? 0 : .006;

  /* State */
  const current = {}, target = {};
  const mouse = {x: 0, y: 0, sx: 0, sy: 0};
  const onPointer = e => {mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1;};
  addEventListener('pointermove', onPointer, {passive: true});
  let time = 0, last = performance.now(), raf = 0, covered = false, disposed = false, first = true;
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), right = new THREE.Vector3(), tmp = new THREE.Vector3();
  const projected = PARTS.map(([name, label, note]) => ({name, label, note, x: 0, y: 0, z: 0}));

  function apply() {
    const s = current;
    camPos.set(s.cx, s.cy, s.cz); camTgt.set(s.tx, s.ty, s.tz);
    // Cursor parallax: a small, eased orbit offset, never more than ~2°.
    right.subVectors(camPos, camTgt).cross(camera.up).normalize();
    const dist = camPos.distanceTo(camTgt);
    camPos.addScaledVector(right, -mouse.sx * .035 * dist * s.parallax).addScaledVector(camera.up, mouse.sy * .025 * dist * s.parallax);
    camera.position.copy(camPos); camera.lookAt(camTgt);
    robot.rotation.y = s.yaw + time * .16 * s.spin;
    for (const a of assemblies) a.object.position.copy(a.origin).addScaledVector(a.offset, s.explode);
    shadow.material.opacity = 1 - s.explode * .4;
    holoUniforms.uHolo.value = s.holo;
    holoUniforms.uScan.value = THREE.MathUtils.lerp(Math.max(bounds.y, .45) + .25, -.02, s.holo);
    grid.material.uniforms.uOpacity.value = s.grid;
    grid.visible = s.grid > .003;
    // Field reveal ring
    if (s.field > .001 && fieldState === 'idle') loadField();
    field.visible = fieldState === 'ready' && s.field > .002;
    revealUniforms.uRadius.value = Math.pow(s.field, 1.4) * 4.6;
    sky.material.uniforms.uField.value = s.field;
    sky.material.uniforms.uGlow.value = 1 - s.field * .6;
    dust.material.uniforms.uMorph.value = s.morph;
    dust.material.uniforms.uOpacity.value = s.dust;
    dust.visible = s.dust > .003;
    cursorLight.position.set(mouse.sx * .6, .25 - mouse.sy * .3, .7);
    cursorLight.intensity = (1 - s.field) * .7 * s.parallax;
    rim.intensity = 2.6 * (1 - s.field * .6);
    renderer.toneMappingExposure = .92 - s.field * .34;
    scene.environmentIntensity = .55 - s.field * .22;
    key.intensity = 2.1 - s.field * .9;
  }

  function frame(now) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .1); last = now;
    if (document.hidden) return;
    time += dt;
    // While an opaque section covers the stage, jump straight to the target
    // so the next reveal starts from the right shot, and skip drawing.
    const k = first || covered ? 1 : 1 - Math.exp(-dt * 5.5);
    for (const key of STATE_KEYS) current[key] += (target[key] - current[key]) * k;
    first = false;
    if (covered) return;
    const mk = 1 - Math.exp(-dt * 3);
    mouse.sx += (mouse.x - mouse.sx) * mk; mouse.sy += (mouse.y - mouse.sy) * mk;
    apply();
    holoUniforms.uTime.value = time;
    dust.material.uniforms.uTime.value = time;
    dust.material.uniforms.uPR.value = renderer.getPixelRatio() * (innerHeight / 900);
    final.uniforms.uTime.value = time;
    composer.render(dt);
    // Screen positions for the HTML callouts.
    robot.updateMatrixWorld();
    for (let i = 0; i < assemblies.length; i++) {
      const a = assemblies[i], p = projected.find(q => q.name === a.object.name);
      tmp.copy(a.center).addScaledVector(a.offset, current.explode).applyMatrix4(robot.matrixWorld).project(camera);
      p.x = (tmp.x * .5 + .5) * innerWidth; p.y = (-tmp.y * .5 + .5) * innerHeight; p.z = tmp.z;
    }
  }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    // Keep the robot's apparent size in portrait screens by widening the lens.
    camera.fov = camera.aspect < 1 ? 30 + (1 - camera.aspect) * 22 : 30;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr()); renderer.setSize(innerWidth, innerHeight, false);
    composer.setPixelRatio(dpr()); composer.setSize(innerWidth, innerHeight);
    final.uniforms.uRes.value.set(innerWidth, innerHeight);
  }
  addEventListener('resize', resize); resize();

  return {
    bounds,
    parts: projected,
    state: current,
    setTarget(state, snap = false) {Object.assign(target, state); if (snap || !('cx' in current)) Object.assign(current, state);},
    setCovered(value) {covered = value;},
    preloadField: loadField,
    async start() {
      Object.assign(current, target); apply();
      T.c0 = performance.now() | 0;
      await renderer.compileAsync(scene, camera).catch(() => {});
      T.compiled = performance.now() | 0;
      last = performance.now(); raf = requestAnimationFrame(frame);
    },
    dispose() {
      disposed = true; cancelAnimationFrame(raf);
      removeEventListener('resize', resize); removeEventListener('pointermove', onPointer);
      scene.traverse(o => {o.geometry?.dispose(); for (const m of [o.material ?? []].flat()) m.dispose?.();});
      finishes.textures.forEach(t => t.dispose()); environment.dispose(); composer.dispose(); renderer.dispose();
    }
  };
}
