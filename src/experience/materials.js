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
  const brushed=surfaceTexture('brushed'),composite=surfaceTexture('composite'),rubber=surfaceTexture('rubber'),materials=new Map();
  robot.traverse(object=>{
    if(!object.isMesh)return;ensureUV(object.geometry);object.castShadow=true;object.receiveShadow=true;
    const convert=original=>{
      if(materials.has(original))return materials.get(original);
      const name=original.name;let options;
      if(/polycarbonate|clear|guard/i.test(name))options={color:0x8c9ba5,metalness:.05,roughness:.16,transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide,clearcoat:.5,clearcoatRoughness:.15};
      else if(/rubber/i.test(name))options={color:0x101114,metalness:0,roughness:.82,roughnessMap:rubber,bumpMap:rubber,bumpScale:.00015};
      else if(/composite/i.test(name))options={color:0x15171c,metalness:.16,roughness:.48,clearcoat:.12,clearcoatRoughness:.45,roughnessMap:composite,bumpMap:composite,bumpScale:.00013};
      else if(/red_accent/i.test(name))options={color:0xa70b20,metalness:.42,roughness:.32,clearcoat:.24,clearcoatRoughness:.25,roughnessMap:rubber};
      else if(/anodized/i.test(name))options={color:0x242933,metalness:.9,roughness:.29,roughnessMap:brushed,bumpMap:brushed,bumpScale:.000055};
      else if(/ABS/i.test(name))options={color:0x333842,metalness:0,roughness:.5,roughnessMap:rubber,bumpMap:rubber,bumpScale:.00006,clearcoat:.1};
      else if(/Opaque\((26|64),/i.test(name))options={color:/26,/.test(name)?0x171a20:0x343943,metalness:.6,roughness:.36,roughnessMap:brushed};
      else options={color:/Hardware|Steel/i.test(name)?0x8a929c:0xadb4bf,metalness:.98,roughness:/Hardware/i.test(name)?.23:.32,roughnessMap:brushed,bumpMap:brushed,bumpScale:.000035};
      const material=new THREE.MeshPhysicalMaterial({...options,envMapIntensity:1.0});material.name='VISUAL_FINISH_'+name;materials.set(original,material);return material;
    };
    object.material=Array.isArray(object.material)?object.material.map(convert):convert(object.material);
  });
  return {materials:[...materials.values()],textures:[brushed,composite,rubber]};
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
