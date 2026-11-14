import * as THREE from './vendor/three.module.js';
import {FLOOR_Y,PROP_LANE_Z,propTypes,propSequence,createFlight,sampleFlight} from './props-motion.js';

export function createSceneProps(scene, camera, shadowTexture) {
  const material=(color,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness:metalness?.28:.43,metalness});
  const green=material(0x7eae42),purple=material(0x7851b7),orange=material(0xE07A2F),ivory=material(0xffefcc),rubber=material(0x303d39),steel=material(0xa9b7ad,.75);
  // A small procedural texture gives the DECODE-inspired balls recessed dimples
  // without loading a model or building dozens of separate hole meshes.
  const texCanvas=document.createElement('canvas');texCanvas.width=512;texCanvas.height=256;
  const ctx=texCanvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,512,256);
  for(let row=1;row<6;row++)for(let col=0;col<12;col++){
    const x=(col+(row%2)*.5)*512/12,y=row*256/6;
    const gradient=ctx.createRadialGradient(x,y,2,x,y,8);gradient.addColorStop(0,'#18241e');gradient.addColorStop(.68,'#26342b');gradient.addColorStop(.83,'#788477');gradient.addColorStop(1,'#ffffff');ctx.fillStyle=gradient;ctx.beginPath();ctx.ellipse(x,y,8,8,0,0,Math.PI*2);ctx.fill();
  }
  const texture=new THREE.CanvasTexture(texCanvas);texture.colorSpace=THREE.SRGBColorSpace;
  for(const mat of [green,purple]){mat.map=texture;mat.bumpMap=texture;mat.bumpScale=.009;}
  const add=(group,geometry,mat)=>{const mesh=new THREE.Mesh(geometry,mat);group.add(mesh);return mesh;};
  const ballGeometry=new THREE.SphereGeometry(.23,32,20);
  const shadowGeometry=new THREE.PlaneGeometry(1,1);
  const items=propTypes.map(type=>{
    const group=new THREE.Group();group.visible=false;scene.add(group);
    const spin=new THREE.Group();group.add(spin);
    if(!type.kind.endsWith('artifact'))group.rotation.y=.24;
    if(type.kind.endsWith('artifact'))add(spin,ballGeometry,type.kind.startsWith('green')?green:purple);
    if(type.kind==='ring'){
      add(spin,new THREE.TorusGeometry(.205,.065,12,48),orange);
      for(let i=0;i<3;i++){const stripe=add(spin,new THREE.TorusGeometry(.205,.067,8,6,.16),ivory);stripe.rotation.z=i*Math.PI*2/3;}
    }
    if(type.kind==='wheel'){
      const tire=add(spin,new THREE.CylinderGeometry(.24,.24,.16,32),rubber);tire.rotation.x=Math.PI/2;
      for(const side of [-1,1]){
        const hub=add(spin,new THREE.CylinderGeometry(.155,.155,.025,24),orange);hub.rotation.x=Math.PI/2;hub.position.z=side*.088;
        const axle=add(spin,new THREE.CylinderGeometry(.055,.055,.03,16),steel);axle.rotation.x=Math.PI/2;axle.position.z=side*.108;
        for(let i=0;i<5;i++){const inset=add(spin,new THREE.CircleGeometry(.026,10),rubber);inset.position.set(Math.cos(i*Math.PI*2/5)*.106,Math.sin(i*Math.PI*2/5)*.106,side*.104);if(side<0)inset.rotation.y=Math.PI;}
      }
    }
    if(type.kind==='nut'){
      const shape=new THREE.Shape();for(let i=0;i<=6;i++){const a=i*Math.PI/3;const x=Math.cos(a)*.212,y=Math.sin(a)*.212;i?shape.lineTo(x,y):shape.moveTo(x,y);}
      const hole=new THREE.Path();hole.absarc(0,0,.105,0,Math.PI*2,true);shape.holes.push(hole);
      const nut=add(spin,new THREE.ExtrudeGeometry(shape,{depth:.11,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.008,bevelThickness:.008,curveSegments:16}),steel);nut.position.z=-.055;
      // Shallow concentric rings suggest the inner thread at this viewing scale.
      for(const z of [-.03,0,.03]){const thread=add(spin,new THREE.TorusGeometry(.105,.005,5,24),steel);thread.position.z=z;}
    }
    const shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,opacity:1.6});
    const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=FLOOR_Y+.003;shadow.visible=false;scene.add(shadow);
    return {type,group,spin,shadow,flight:null,age:0};
  });
  const next=propSequence();let untilNext=0,focus=null;
  const corner=new THREE.Vector3();
  return {
    update(dt,paused){
      if(paused)return focus;
      untilNext-=dt;
      if(untilNext<=0){
        const cue=next(),item=items.find(item=>item.type===cue.type);
        // Same camera and world units as the robots; spawn beyond the frustum.

        let halfWidth=0,top=0;
        camera.updateMatrixWorld();
        // Intersect all viewport corners with the props' actual depth plane.
        for(const x of [-1,1])for(const y of [-1,1]){
          corner.set(x,y,.5).unproject(camera).sub(camera.position);
          corner.multiplyScalar((PROP_LANE_Z-camera.position.z)/corner.z).add(camera.position);
          halfWidth=Math.max(halfWidth,Math.abs(corner.x));top=Math.max(top,corner.y);
        }
        if(!item.flight){item.flight=createFlight(cue.type,halfWidth,cue.loft,cue.speed,cue.route,top);item.age=0;item.group.visible=item.shadow.visible=true;}
        untilNext=cue.delay;
      }
      focus=null;
      for(const item of items){
        if(!item.flight)continue;
        item.age+=dt;const pose=sampleFlight(item.flight,item.age);
        if(pose.done){item.flight=null;item.group.visible=item.shadow.visible=false;continue;}
        item.group.position.set(pose.x,pose.y,pose.z);item.spin.rotation.z=pose.angle;
        // The nut lands on its actual rotating hexagonal silhouette.
        if(item.type.kind==='nut'){
          let support=0;for(let i=0;i<6;i++)support=Math.max(support,-Math.sin(i*Math.PI/3+pose.angle)*.212+.008);
          item.group.position.y+=support-item.type.radius;
        }
        const spread=item.type.radius*3.1+pose.height*.32;
        item.shadow.position.set(pose.x+pose.height*.35,FLOOR_Y+.003,pose.z-pose.height*.24);
        item.shadow.scale.set(spread,spread*.76,1);item.shadow.material.opacity=1.65/(1+pose.height*1.9);
        if(Math.abs(pose.x)<2.6)focus=pose;
      }
      return focus;
    },
    dispose(){const geometries=new Set(),materials=new Set();for(const item of items){for(const root of [item.group,item.shadow]){root.traverse(node=>{if(node.geometry)geometries.add(node.geometry);if(node.material)materials.add(node.material);});scene.remove(root);}}for(const g of geometries)g.dispose();for(const m of materials)m.dispose();texture.dispose();}
  };
}
