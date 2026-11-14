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

// The robot wears the colours the CAD gives it. The step file carries the
// colour of every solid, and the machine is a study in yellow pulleys, a
// black shield, silver motors and a grey frame. Rewriting those into a
// team colour made the robot look like a different machine, so the colour
// is used as it is and only the finish is chosen from it.
const ANODISED=0x3c434c;
const GRAPHITE=0x2b3037;
const ALUMINIUM=0x8d949d;
const STEEL=0x767e87;
const DEEP_BLUE=0x1f3f7a;
const BRIGHT_BLUE=0x2f5fb0;

function palette(name, colour){
  // Returns {color, metalness, roughness, kind} for a CAD colour.
  //
  // The colour is the one the CAD gives the part. Only the finish is
  // chosen: a saturated colour is paint, a bright neutral is bare metal, a
  // dark neutral is the black hardware, and a mid grey is anodised.
  if(!colour)return {color:ALUMINIUM,metalness:.85,roughness:.34,kind:'metal'};
  const [r,g,b]=colour,max=Math.max(r,g,b),min=Math.min(r,g,b);
  const saturation=max?(max-min)/max:0;
  if(saturation>0.18){
    // The yellow pulleys and the blue motor bodies keep their own colour.
    const metalness=saturation>0.5?.45:.25;
    return {color:(r<<16)|(g<<8)|b,metalness,roughness:saturation>0.5?.34:.42,kind:'paint'};
  }
  if(max>=215)return {color:(r<<16)|(g<<8)|b,metalness:.86,roughness:.36,kind:'metal'};
  if(max>=170)return {color:(r<<16)|(g<<8)|b,metalness:.88,roughness:.4,kind:'metal'};
  if(max>=100)return {color:(r<<16)|(g<<8)|b,metalness:.82,roughness:.44,kind:'metal'};
  if(max>=55)return {color:(r<<16)|(g<<8)|b,metalness:.72,roughness:.48,kind:'metal'};
  // The black hardware: the shield, the frame, the wheels.
  return {color:(r<<16)|(g<<8)|b,metalness:.35,roughness:.62,kind:'composite'};
}

export function finishRobot(robot){
  const brushed=surfaceTexture('brushed'),composite=surfaceTexture('composite'),rubber=surfaceTexture('rubber'),plastic=surfaceTexture('plastic'),machined=surfaceTexture('machined'),finishes=new Map();
  robot.traverse(object=>{
    if(!object.isMesh)return;ensureUV(object.geometry);object.castShadow=true;object.receiveShadow=true;
    const present=(original,meshName)=>{
      // The finish is keyed by the mesh as well as the material, because the
      // same CAD colour is used by parts that are finished differently.
      const finishKey=`${original.uuid}|${meshName||''}`;
      if(finishes.has(finishKey))return finishes.get(finishKey);
      // The CAD base colour is authoritative for the palette decision, but the
      // finish pass decides the surface response so the robot reads as metal
      // and painted parts rather than flat plastic.
      const name=original.name||'',material=new THREE.MeshPhysicalMaterial();
      // MeshPhysicalMaterial.copy() trips on standard-only sources in r180;
      // copy the shared standard properties through the prototype instead.
      THREE.MeshStandardMaterial.prototype.copy.call(material,original);
      const opaque=/^Opaque\((\d+),(\d+),(\d+)\)/i.exec(name);
      const cad=opaque?[+opaque[1],+opaque[2],+opaque[3]]:null;
      const look=palette(`${name} ${meshName||''}`,cad);
      material.color=new THREE.Color(look.color);
      material.metalness=look.metalness;
      material.roughness=look.roughness;
      // Sheet metal panels in the CAD are open surfaces, so the model has to
      // be drawn from both sides or the plates disappear.
      material.side=THREE.DoubleSide;
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
      material.needsUpdate=true;finishes.set(finishKey,material);return material;
    };
    object.material=Array.isArray(object.material)?object.material.map(material=>present(material,object.name)):present(object.material,object.name);
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
