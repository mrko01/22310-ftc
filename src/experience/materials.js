import * as THREE from 'three';

// Presentation finishes only. Geometry and CAD engineering remain unchanged.
function surfaceTexture(kind){
  const size=128,data=new Uint8Array(size*size*4);let seed=22310;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const rows=Array.from({length:size},()=>rand());
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let value;
    if(kind==='brushed')value=190+rows[y]*45+rand()*20;
    else if(kind==='composite'){const weave=((Math.floor(x/8)+Math.floor(y/8))%2===0?Math.sin(y*1.5):Math.sin(x*1.5));value=176+weave*22+rand()*12;}
    else if(kind==='plastic')value=222+rows[y]*14+rand()*16;
    else if(kind==='machined')value=150+rows[y]*70+rand()*35;
    else value=195+rand()*60;
    const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(kind==='composite'?5:4,kind==='brushed'?8:5);texture.needsUpdate=true;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.anisotropy=4;return texture;
}
function ensureUV(geometry){
  if(geometry.attributes.uv)return;
  geometry.computeBoundingBox();const box=geometry.boundingBox,size=box.getSize(new THREE.Vector3()),positions=geometry.attributes.position,normals=geometry.attributes.normal,uv=new Float32Array(positions.count*2);
  for(let i=0;i<positions.count;i++){
    const px=(positions.getX(i)-box.min.x)/Math.max(size.x,.00001),py=(positions.getY(i)-box.min.y)/Math.max(size.y,.00001),pz=(positions.getZ(i)-box.min.z)/Math.max(size.z,.00001);
    const nx=Math.abs(normals?.getX(i)||0),ny=Math.abs(normals?.getY(i)||0),nz=Math.abs(normals?.getZ(i)||1);
    uv[i*2]=nx>ny&&nx>nz?pz:px;uv[i*2+1]=ny>nx&&ny>nz?pz:py;
  }
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
}

// The CAD exports neutral greys, so the palette is rebuilt from the colour
// itself. The team colour is saffron red: it lands on the saturated warm
// parts (motors, hubs, belt hardware) while the structure stays metal.
const TEAM_RED=0xa8122c;
const DEEP_RED=0x8f1226;
const ANODISED=0x3c434c;
const GRAPHITE=0x2b3037;
const ALUMINIUM=0x8d949d;
const STEEL=0x767e87;
const BRONZE=0x8a6a3c;
const DEEP_BLUE=0x1f3f7a;
const BRIGHT_BLUE=0x2f5fb0;

function palette(name, colour){
  // Returns {color, metalness, roughness, kind} for a CAD colour.
  if(!colour)return {color:ALUMINIUM,metalness:.85,roughness:.34,kind:'metal'};
  const [r,g,b]=colour,max=Math.max(r,g,b),min=Math.min(r,g,b);
  const saturation=max?(max-min)/max:0;
  const warm=r>=g&&g>=b,cool=b>r;
  if(saturation>0.55&&warm){
    // The strongest saffron accents carry the team colour.
    return {color:TEAM_RED,metalness:.35,roughness:.32,kind:'paint'};
  }
  if(saturation>0.3&&warm){
    // Warmer hardware stays metal so the robot is not uniformly red.
    return {color:BRONZE,metalness:.88,roughness:.4,kind:'metal'};
  }
  if(saturation>0.3&&cool){
    return {color:DEEP_BLUE,metalness:.6,roughness:.28,kind:'paint'};
  }
  if(r>90&&g>60&&b<95&&r-b>40){
    return {color:BRONZE,metalness:.88,roughness:.44,kind:'metal'};
  }
  if(max>=215&&saturation<0.12){
    // Clear or white polycarbonate: keep it translucent.
    return {color:0xe8eef4,metalness:.05,roughness:.12,kind:'clear'};
  }
  if(max>=185){
    return {color:ALUMINIUM,metalness:.88,roughness:.4,kind:'metal'};
  }
  if(max>=120){
    return {color:STEEL,metalness:.86,roughness:.42,kind:'metal'};
  }
  if(max>=60){
    return {color:ANODISED,metalness:.8,roughness:.44,kind:'metal'};
  }
  return {color:GRAPHITE,metalness:.12,roughness:.58,kind:'composite'};
}

export function finishRobot(robot){
  const brushed=surfaceTexture('brushed'),composite=surfaceTexture('composite'),rubber=surfaceTexture('rubber'),plastic=surfaceTexture('plastic'),machined=surfaceTexture('machined'),finishes=new Map();
  robot.traverse(object=>{
    if(!object.isMesh)return;ensureUV(object.geometry);object.castShadow=true;object.receiveShadow=true;
    const present=original=>{
      if(finishes.has(original))return finishes.get(original);
      // The CAD base colour is authoritative for the palette decision, but the
      // finish pass decides the surface response so the robot reads as metal
      // and painted parts rather than flat plastic.
      const name=original.name||'',material=new THREE.MeshPhysicalMaterial();
      // MeshPhysicalMaterial.copy() trips on standard-only sources in r180;
      // copy the shared standard properties through the prototype instead.
      THREE.MeshStandardMaterial.prototype.copy.call(material,original);
      const opaque=/^Opaque\((\d+),(\d+),(\d+)\)/i.exec(name);
      const cad=opaque?[+opaque[1],+opaque[2],+opaque[3]]:null;
      const look=palette(name,cad);
      material.color=new THREE.Color(look.color);
      material.metalness=look.metalness;
      material.roughness=look.roughness;
      if(/polycarbonate|clear|guard/i.test(name)||look.kind==='clear'){
        material.depthWrite=false;material.side=THREE.DoubleSide;material.clearcoat=.6;material.clearcoatRoughness=.08;material.envMapIntensity=1.1;material.forceSinglePass=true;material.transparent=true;material.opacity=.55;
      }
      else if(/rubber|tyre|tire/i.test(name)||look.kind==='composite'){
        material.roughnessMap=rubber;material.bumpMap=rubber;material.bumpScale=.00022;material.clearcoat=.05;material.clearcoatRoughness=.7;material.envMapIntensity=.7;
      }
      else if(/composite/i.test(name)){
        material.roughnessMap=composite;material.bumpMap=composite;material.bumpScale=.00016;material.clearcoat=.12;material.clearcoatRoughness=.5;material.envMapIntensity=.8;
      }
      else if(/ABS/i.test(name)){
        material.roughnessMap=plastic;material.bumpMap=plastic;material.bumpScale=.00012;material.clearcoat=.2;material.clearcoatRoughness=.42;material.envMapIntensity=.8;
      }
      else if(look.kind==='paint'){
        material.roughnessMap=plastic;material.bumpMap=plastic;material.bumpScale=.00005;material.clearcoat=.5;material.clearcoatRoughness=.16;material.envMapIntensity=.85;
      }
      else if(look.kind==='metal'){
        material.roughnessMap=machined;material.bumpMap=machined;material.bumpScale=.00005;material.clearcoat=.16;material.clearcoatRoughness=.38;material.envMapIntensity=.85;
      }
      else{
        material.roughnessMap=brushed;material.bumpMap=brushed;material.bumpScale=.00005;material.clearcoat=.14;material.clearcoatRoughness=.4;material.envMapIntensity=.95;
      }
      material.needsUpdate=true;finishes.set(original,material);return material;
    };
    object.material=Array.isArray(object.material)?object.material.map(present):present(object.material);
  });
  return {materials:[...finishes.values()],textures:[brushed,composite,rubber,plastic,machined]};
}

// Source CAD colors and placements remain authoritative. These small shared
// textures supply surface response only; they do not imitate missing artwork.
export function finishField(field){
  const brushed=surfaceTexture('brushed'),foam=surfaceTexture('rubber');
  foam.repeat.set(40,40);
  const seen=new Set();
  field.traverse(object=>{
    if(!object.isMesh)return;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    if(materials.some(material=>/FIELD_(METAL|FOAM|FABRIC)/.test(material.name)))ensureUV(object.geometry);
    for(const material of materials){
      if(seen.has(material))continue;seen.add(material);
      if(/FIELD_METAL/.test(material.name)){
        material.roughnessMap=brushed;material.bumpMap=brushed;material.bumpScale=.000035;
      }else if(/FIELD_(FOAM|FABRIC)/.test(material.name)){
        material.roughnessMap=foam;material.bumpMap=foam;material.bumpScale=.00025;
      }
      material.envMapIntensity=1.0;
    }
  });
  return {textures:[brushed,foam]};
}
