import * as THREE from './vendor/three.module.js';
import {FLOOR_Y,seededRandom} from './props-motion.js';

// One draw call for the whole shower. Kept behind the characters, inside their stage.
export function createTeamConfetti(scene) {
  const random=seededRandom(223102),count=64;
  const geometry=new THREE.BoxGeometry(.065,.12,.009);
  const material=new THREE.MeshStandardMaterial({roughness:.55,metalness:.08,transparent:true,opacity:0,depthWrite:false});
  const pieces=new THREE.InstancedMesh(geometry,material,count);
  pieces.instanceMatrix.setUsage(THREE.DynamicDrawUsage);pieces.visible=false;pieces.frustumCulled=false;
  scene.add(pieces);
  const colors=[0xf47b32,0xf5c55a,0xffe4b8,0x93a888,0xbc9acd];
  const particles=Array.from({length:count},(_,i)=>{
    pieces.setColorAt(i,new THREE.Color(colors[i%colors.length]));
    return {x:(random()-.5)*5.5,z:-1.2-random()*.7,phase:random(),speed:.11+random()*.055,sway:.10+random()*.16,spin:random()*6.28,size:.65+random()*.65};
  });
  const transform=new THREE.Object3D();let clock=0,opacity=0;
  return {
    update(dt,chapter,paused){
      // A soft envelope tolerates fast section jumps without restarting particles.
      const target=Math.max(0,Math.min(1,(chapter-1.55)/.28,(2.55-chapter)/.28));
      opacity+=(target-opacity)*(1-Math.exp(-dt*(target>opacity?2.8:4.2)));
      material.opacity=opacity*.85;pieces.visible=opacity>.002;
      if(!pieces.visible)return;
      if(!paused)clock+=dt;
      particles.forEach((p,i)=>{
        const life=(p.phase+clock*p.speed)%1;
        const flutter=clock*2.1+p.spin;
        // Gravity with linear air drag: accelerate briefly, then approach a
        // terminal fall speed. Each strip has a different drag coefficient.
        const duration=1/p.speed,age=life*duration,dragTime=.3+p.size*.2;
        const travel=t=>t-dragTime*(1-Math.exp(-t/dragTime));
        const fall=travel(age)/travel(duration);
        transform.position.set(p.x+Math.sin(flutter*.7)*p.sway,3.5-fall*(3.5-FLOOR_Y),p.z+Math.cos(flutter)*.08);
        transform.rotation.set(flutter*1.3,Math.sin(flutter*.8)*1.1,flutter*.65);
        // Disappear gently near the floor; respawn is hidden above the shower.
        const fade=Math.min(1,life/.09,(1-life)/.14);
        transform.scale.setScalar(p.size*Math.max(0,fade));transform.updateMatrix();pieces.setMatrixAt(i,transform.matrix);
      });
      pieces.instanceMatrix.needsUpdate=true;
    },
    dispose(){scene.remove(pieces);geometry.dispose();material.dispose();}
  };
}
