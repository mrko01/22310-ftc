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
export function finishRobot(robot){
  const brushed=surfaceTexture('brushed'),composite=surfaceTexture('composite'),rubber=surfaceTexture('rubber'),finishes=new Map();
  robot.traverse(object=>{
    if(!object.isMesh)return;ensureUV(object.geometry);object.castShadow=true;object.receiveShadow=true;
    const present=original=>{
      if(finishes.has(original))return finishes.get(original);
      // Source CAD base color, metalness and roughness stay authoritative. The
      // finish pass adds surface response (maps, coat, env intensity) and swaps
      // in a physical material so paint and metal read as materials, not plastic.
      const name=original.name||'',material=new THREE.MeshPhysicalMaterial();
      // MeshPhysicalMaterial.copy() trips on standard-only sources in r180;
      // copy the shared standard properties through the prototype instead.
      THREE.MeshStandardMaterial.prototype.copy.call(material,original);
      if(/polycarbonate|clear|guard/i.test(name)){material.depthWrite=false;material.side=THREE.DoubleSide;material.clearcoat=.55;material.clearcoatRoughness=.12;material.envMapIntensity=1.35;material.forceSinglePass=true}
      else if(/rubber/i.test(name)){material.roughnessMap=rubber;material.bumpMap=rubber;material.bumpScale=.00018;material.envMapIntensity=.85}
      else if(/composite/i.test(name)){material.roughnessMap=composite;material.bumpMap=composite;material.bumpScale=.00015;material.clearcoat=.14;material.clearcoatRoughness=.5;material.envMapIntensity=.95}
      else if(/ABS/i.test(name)){material.roughnessMap=composite;material.bumpMap=composite;material.bumpScale=.00012;material.clearcoat=.22;material.clearcoatRoughness=.4;material.envMapIntensity=1.0}
      else if(/accent/i.test(name)){material.roughnessMap=brushed;material.bumpMap=brushed;material.bumpScale=.00005;material.clearcoat=.3;material.clearcoatRoughness=.28;material.envMapIntensity=1.2}
      else if(/wire|cable/i.test(name)){material.envMapIntensity=.7}
      else if(/anodized|aluminum|steel|hardware|satin|^Opaque|connector|housing/i.test(name)){material.roughnessMap=brushed;material.bumpMap=brushed;material.bumpScale=.00005;material.clearcoat=.12;material.clearcoatRoughness=.4;material.envMapIntensity=1.3}
      else{material.roughnessMap=brushed;material.envMapIntensity=1.1}
      material.needsUpdate=true;finishes.set(original,material);return material;
    };
    object.material=Array.isArray(object.material)?object.material.map(present):present(object.material);
  });
  return {materials:[...finishes.values()],textures:[brushed,composite,rubber]};
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
