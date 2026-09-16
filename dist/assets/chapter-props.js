import * as THREE from './vendor/three.module.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {FLOOR_Y} from './props-motion.js';

export function createChapterProps(scene,shadowTexture){
  const groups=[],materials=[];
  const makeMaterial=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.48,metalness:.12,transparent:true,opacity:0});materials.push(m);return m;};
  function makeGroup(chapter){const group=new THREE.Group();group.position.set(-2.05,FLOOR_Y,-1.45);group.rotation.y=.2;group.visible=false;scene.add(group);const entry={group,chapter,opacity:0,materials:[]};groups.push(entry);
    const shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,opacity:0});materials.push(shadowMaterial);entry.materials.push(shadowMaterial);
    const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.95),shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.003;group.add(shadow);
    return entry;}
  function box(entry,parent,size,position,color,r=.035){const m=makeMaterial(color);entry.materials.push(m);const mesh=new THREE.Mesh(new RoundedBoxGeometry(...size,2,r),m);mesh.position.set(...position);parent.add(mesh);return mesh;}
  const calendar=makeGroup(3);
  box(calendar,calendar.group,[.64,.09,.5],[0,.045,0],0x657067);
  box(calendar,calendar.group,[.09,.66,.09],[0,.4,0],0x87968b);
  box(calendar,calendar.group,[1.02,1.13,.09],[0,1.15,0],0xfff2d9,.065);
  box(calendar,calendar.group,[1.02,.24,.10],[0,1.58,.008],0xf47b32);
  for(const x of [-.30,.30])box(calendar,calendar.group,[.055,.19,.08],[x,1.7,.01],0x66766b,.025);
  for(let row=0;row<3;row++)for(let col=0;col<4;col++)box(calendar,calendar.group,[.115,.10,.015],[-.32+col*.21,1.30-row*.21,.055],row===1&&col===2?0xf47b32:0xb8c2b2,.025);
  const marker=box(calendar,calendar.group,[.17,.15,.012],[.10,1.09,.065],0xf5bc53,.025);
  const mail=makeGroup(4);
  box(mail,mail.group,[.60,.09,.50],[0,.045,0],0x657067);
  box(mail,mail.group,[.12,1.10,.12],[0,.60,0],0x87968b);
  box(mail,mail.group,[.83,.63,.67],[0,1.37,0],0xf47b32,.15);
  box(mail,mail.group,[.67,.46,.024],[0,1.34,.346],0x34433d,.075);
  const door=new THREE.Group();door.position.set(0,1.11,.37);mail.group.add(door);
  box(mail,door,[.73,.52,.045],[0,.26,0],0xf9a05b,.08);
  box(mail,door,[.18,.035,.04],[0,.42,.035],0xfff1d7,.01);
  const flag=new THREE.Group();flag.position.set(.45,1.30,0);mail.group.add(flag);
  box(mail,flag,[.045,.45,.035],[0,.20,0],0x647466,.01);
  box(mail,flag,[.19,.15,.04],[.075,.36,0],0xf5c55a,.018);
  const envelope=new THREE.Group();mail.group.add(envelope);
  box(mail,envelope,[.45,.29,.025],[0,0,0],0xfff4dc,.018);
  for(const sign of [-1,1]){const crease=box(mail,envelope,[.25,.013,.005],[sign*.10,.033,.016],0xc6a987,.003);crease.rotation.z=sign*.55;}
  box(mail,envelope,[.065,.055,.008],[.145,.077,.018],0xef8850,.006);
  let time=0;
  return {
    update(dt,chapter,paused){
      if(!paused)time+=dt;
      for(const entry of groups){
        const target=Math.max(0,Math.min(1,(chapter-entry.chapter+.45)/.28,(entry.chapter+.55-chapter)/.28));
        entry.opacity+=(target-entry.opacity)*(1-Math.exp(-dt*(target>entry.opacity?3:4.2)));
        entry.group.visible=entry.opacity>.002;
        for(const m of entry.materials)m.opacity=entry.opacity;
        entry.group.position.y=FLOOR_Y-(1-entry.opacity)*.10;
      }
      marker.scale.setScalar(1+Math.sin(time*2)*.04);
      const open=.5-.5*Math.cos(time*1.2);
      door.rotation.x=open*1.1;
      flag.rotation.z=-.08+open*.16;
      envelope.position.set(0,1.30+Math.sin(time*1.2)*.025,.28+open*.43);
      envelope.rotation.x=-open*.15;
    },
    dispose(){for(const {group} of groups){group.traverse(node=>node.geometry?.dispose());scene.remove(group);}for(const m of materials)m.dispose();}
  };
}
