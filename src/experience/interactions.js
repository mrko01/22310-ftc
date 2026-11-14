import * as THREE from 'three';

// Local visual interaction only. Ball motion and keep-outs are illustrative, not
// a competition physics model. Official field geometry is never replaced here.
export const MAX_BALLS = 24;
const FIELD_START = .58, FIELD_END = .87;
const BALL_RADIUS = .03556; // 2.8-inch BIOBUZZ POLLEN, nominal radius in metres.
const NECTAR_RADIUS = .04572;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smooth = (value) => { const x = clamp(value, 0, 1); return x*x*(3-2*x); };
const UP = new THREE.Vector3(0, 1, 0);
const PART_NAMES = {
  SOURCE_SHOOTER: 'Flywheel shooter', INFERRED_INTAKE: 'Intake',
  INFERRED_INDEXER: 'Indexer', INFERRED_CHASSIS: 'Chassis',
  INFERRED_DRIVETRAIN: 'Mecanum drive',
};

/** Slide along field boundaries and the central frame instead of teleporting. */
export function constrainDrive(previous, requested, limit = 1.58, keepOut = {minX:-.91,maxX:.91,minZ:-.77,maxZ:.77}) {
  let x = clamp(requested.x, -limit, limit), z = clamp(requested.z, -limit, limit);
  const inside = (a, b) => a > keepOut.minX && a < keepOut.maxX && b > keepOut.minZ && b < keepOut.maxZ;
  if (inside(x, z)) {
    if (!inside(previous.x, z)) x = previous.x;
    else if (!inside(x, previous.z)) z = previous.z;
    else {
      const exits = [
        {d:Math.abs(x-keepOut.minX),x:keepOut.minX,z}, {d:Math.abs(x-keepOut.maxX),x:keepOut.maxX,z},
        {d:Math.abs(z-keepOut.minZ),x,z:keepOut.minZ}, {d:Math.abs(z-keepOut.maxZ),x,z:keepOut.maxZ},
      ].sort((a,b) => a.d-b.d);
      ({x,z} = exits[0]);
    }
  }
  return {x, z};
}

/** Stable small-step spring; exported for deterministic behaviour checks. */
export function springStep(angle, velocity, target, dt, limit = .43) {
  velocity += ((target-angle)*34-velocity*10)*dt;
  angle += velocity*dt;
  if (Math.abs(angle) > limit) { angle = clamp(angle,-limit,limit); velocity *= -.14; }
  if (Math.abs(angle-target)<.00008 && Math.abs(velocity)<.0002) { angle=target;velocity=0; }
  return {angle,velocity};
}

/** Advance a free ball, including damped floor/wall bounce and resting friction. */
export function stepBall(ball, dt, floorY = 0, limit = 1.79) {
  const {position:p,velocity:v,radius:r} = ball;
  v.y -= 9.81*dt;
  p.x += v.x*dt; p.y += v.y*dt; p.z += v.z*dt;
  if (p.y < floorY+r) {
    p.y = floorY+r;
    if (v.y < 0) v.y = Math.abs(v.y)>.20 ? -v.y*.39 : 0;
    const friction=Math.exp(-4.6*dt);v.x*=friction;v.z*=friction;
  }
  for (const axis of ['x','z']) if (Math.abs(p[axis])>limit-r) {
    p[axis]=clamp(p[axis],-limit+r,limit-r);v[axis]*=-.54;
  }
  if (Math.abs(v.x)+Math.abs(v.z)<.009 && p.y<=floorY+r+.001 && v.y===0) v.x=v.z=0;
}

function localBounds(object) {
  object.updateWorldMatrix(true,true);
  const inverse=object.matrixWorld.clone().invert(),box=new THREE.Box3(),part=new THREE.Box3(),matrix=new THREE.Matrix4();
  object.traverse(mesh=>{
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    matrix.multiplyMatrices(inverse,mesh.matrixWorld);part.copy(mesh.geometry.boundingBox).applyMatrix4(matrix);box.union(part);
  });
  return box;
}

function makeControls() {
  const root=document.createElement('div');root.className='scene-controls';root.hidden=true;
  root.setAttribute('aria-label','Field interaction controls');
  root.innerHTML=`
    <div class="field-joystick" role="group" aria-label="Drive the robot with touch">
      <div class="field-joystick-ring" aria-hidden="true"><i></i></div><span>Drive</span>
    </div>
    <div class="field-tools">
      <span class="field-drive-keys" aria-label="Use W A S D to drive"><span class="field-key-cluster" aria-hidden="true"><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></span><span>Drive</span></span>
      <button class="field-drop" type="button" title="Drop a ball · Space"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6" r="3"/><path d="M12 12v8m-3-3 3 3 3-3"/></svg><span>Drop</span></button>
      <button class="field-reset" type="button" hidden aria-label="Reset the field and robot" title="Reset · R"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9a8 8 0 1 1 0 6M4 3v6h6"/></svg><span>Reset</span></button>
      <button class="field-help-toggle" type="button" aria-label="Show interaction controls" aria-expanded="false" aria-controls="field-help"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M9.8 8.8a2.3 2.3 0 0 1 4.4 1c0 1.7-2.2 1.8-2.2 3.2m0 3h.01"/></svg></button>
    </div>
    <div class="field-help" id="field-help" hidden><p><kbd>W A S D</kbd> Drive</p><p><kbd>Space</kbd> Drop a ball</p><p><kbd>Q / E</kbd> Tilt the hives</p><p><kbd>R</kbd> Reset</p><p class="field-pointer-help">Drag a hive to tip it. Hold over the field to drop.</p><p class="field-touch-help">Swipe the pad to drive. Drag a hive sideways to tip it.</p></div>
    <span class="interaction-announcement" aria-live="polite" aria-atomic="true"></span>`;
  document.body.append(root);
  const tooltip=document.createElement('div');tooltip.className='part-tooltip';tooltip.hidden=true;tooltip.setAttribute('aria-hidden','true');document.body.append(tooltip);
  return {root,tooltip,joystick:root.querySelector('.field-joystick'),stick:root.querySelector('.field-joystick-ring i'),drop:root.querySelector('.field-drop'),reset:root.querySelector('.field-reset'),help:root.querySelector('.field-help'),helpToggle:root.querySelector('.field-help-toggle'),announcement:root.querySelector('.interaction-announcement')};
}

export function createInteractions({canvas,camera,scene,robot,assemblies=[],invalidate=()=>{}}) {
  const controls=makeControls(),listeners=[];
  const listen=(target,type,fn,options)=>{target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options));};
  const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2(),rayPoint=new THREE.Vector3(),floorPlane=new THREE.Plane(UP,0);
  const pointer={x:0,y:0,inside:false,type:'mouse',down:false,id:null,lastDrop:-Infinity,moved:false,startX:0,startY:0};
  const keys=new Set(),driveInput=new THREE.Vector2(),velocity=new THREE.Vector2(),drivePosition=new THREE.Vector2(1.1,1.1);
  const driveForward=new THREE.Vector3(),driveRight=new THREE.Vector3(),travel=new THREE.Vector3();
  let time=0,progress=0,active=false,disposed=false,changed=false,field=null,floorY=0,driveYaw=0,driveStarted=false,hovered=null,pulsing=null,hoverAt=0,lastPick=0,lastTouch=0,feedTime=-1,tipDrag=null,joystickPointer=null,wasField=false;
  let boundsLimit=1.58,keepOut={minX:-.91,maxX:.91,minZ:-.77,maxZ:.77};
  let hives=[];
  const nativeBalls=[];
  const nativePlay=new THREE.Group();nativePlay.name='NATIVE_STARTING_PIECES_IN_PLAY';scene.add(nativePlay);
  const objects=(Array.isArray(assemblies)?assemblies:Object.values(assemblies)).map(item=>item.object||item).filter(item=>item?.isObject3D);
  const parts=objects.map(object=>({object,name:PART_NAMES[object.name]||object.name.replace(/^INFERRED_|SOURCE_/,'').replaceAll('_',' ').toLowerCase(),bounds:localBounds(object),worldBounds:new THREE.Box3(),origin:object.position.clone(),materialSwaps:null,highlights:[]}));
  const movingParts=[];
  robot.traverse(object=>{if (/INFERRED_WHEEL_|INTAKE_ROLLER/.test(object.name)) movingParts.push({object,quaternion:object.quaternion.clone(),axis:new THREE.Vector3(object.userData.spinAxis==='Y'||object.userData.spinAxis==='Z'?0:1,object.userData.spinAxis==='Y'?1:0,object.userData.spinAxis==='Z'?1:0),angle:0});});
  const ballGeometry=new THREE.SphereGeometry(1,20,14);
  const pollenMaterial=new THREE.MeshPhysicalMaterial({color:0xffef40,roughness:.57,metalness:0,clearcoat:.12,clearcoatRoughness:.48});
  const nectarMaterial=new THREE.MeshPhysicalMaterial({color:0xff0000,roughness:.45,metalness:0,clearcoat:.16,clearcoatRoughness:.38});
  const blueNectarMaterial=nectarMaterial.clone();blueNectarMaterial.color.setHex(0x0000ff);
  const play=new THREE.Group();play.name='INTERACTIVE_VISUAL_BALLS';scene.add(play);
  const ballPool=Array.from({length:MAX_BALLS},()=>{
    const mesh=new THREE.Mesh(ballGeometry,pollenMaterial);mesh.visible=false;mesh.castShadow=true;mesh.receiveShadow=true;play.add(mesh);
    return {mesh,position:mesh.position,velocity:new THREE.Vector3(),previous:new THREE.Vector3(),radius:BALL_RADIUS,active:false,sleeping:false,docked:null,age:0};
  });
  let poolIndex=0,spawnCount=0;
  const feedBall=new THREE.Mesh(ballGeometry,pollenMaterial);feedBall.name='ILLUSTRATIVE_FEED_BALL';feedBall.scale.setScalar(BALL_RADIUS);feedBall.visible=false;feedBall.castShadow=true;robot.add(feedBall);
  const feedRoute=[
    {part:'INFERRED_INTAKE',point:[.02,.102,.193]}, {part:'INFERRED_INTAKE',point:[.025,.145,.101]},
    {part:'INFERRED_INDEXER',point:[.04,.180,.046]}, {part:'INFERRED_INDEXER',point:[.047,.222,-.045]},
    {part:'SOURCE_SHOOTER',point:[.08246,.22769,-.09901]}, {part:'SOURCE_SHOOTER',point:[.18,.24,-.099]},
    {part:'SOURCE_SHOOTER',point:[.37,.25,-.099]},
  ];
  const feedPoints=feedRoute.map(item=>new THREE.Vector3(...item.point));
  const feedCurve=new THREE.CatmullRomCurve3(feedPoints,false,'centripetal');
  const emissiveTint=new THREE.Color(0xfb5745),tempVector=new THREE.Vector3(),tempVector2=new THREE.Vector3(),tempQuaternion=new THREE.Quaternion();

  function announce(text) { controls.announcement.textContent=text; }
  function dirty() { invalidate(); }
  function markChanged() { if(!changed){changed=true;controls.reset.hidden=false;} }
  function isUI(target) { return target?.closest?.('a,button,input,textarea,select,summary,[contenteditable],.scene-controls,.site-header,.chapter-copy,.closing-copy'); }
  function setRay(x,y) {const rect=canvas.getBoundingClientRect();ndc.set(((x-rect.left)/rect.width)*2-1,-((y-rect.top)/rect.height)*2+1);raycaster.setFromCamera(ndc,camera);}
  function fieldPoint() { setRay(pointer.x,pointer.y);return raycaster.ray.intersectPlane(floorPlane,rayPoint); }

  function swapHighlight(part,on) {
    if (!part) return;
    if (!part.materialSwaps) {
      part.materialSwaps=[];const clones=new Map();
      part.object.traverse(mesh=>{
        if (!mesh.isMesh||!mesh.material) return;
        const original=mesh.material;
        const cloneOne=mat=>{
          if(!mat.emissive)return mat;
          if(!clones.has(mat)){const copy=mat.clone();clones.set(mat,copy);part.highlights.push({material:copy,emissive:mat.emissive.clone(),intensity:mat.emissiveIntensity??1});}
          return clones.get(mat);
        };
        part.materialSwaps.push({mesh,original,highlight:Array.isArray(original)?original.map(cloneOne):cloneOne(original)});
      });
    }
    for(const item of part.materialSwaps)item.mesh.material=on?item.highlight:item.original;
  }
  function setHover(part) {
    if (hovered===part) return;
    if(hovered!==pulsing)swapHighlight(hovered,false);
    hovered=part;hoverAt=time;
    if(part)swapHighlight(part,true);
    controls.tooltip.hidden=!part;
    if(part)controls.tooltip.textContent=part.name;
    document.documentElement.classList.toggle('scene-part-hover',Boolean(part));dirty();
  }
  function hideTooltip(){controls.tooltip.hidden=true;document.documentElement.classList.remove('scene-part-hover','scene-hive-hover');}
  function pickParts() {
    if(!pointer.inside||active||pointer.type==='touch'||progress>.55||isUI(document.elementFromPoint(pointer.x,pointer.y))){setHover(null);return;}
    setRay(pointer.x,pointer.y);let nearest=null,near=Infinity;
    for(const part of parts){part.object.updateWorldMatrix(true,false);part.worldBounds.copy(part.bounds).applyMatrix4(part.object.matrixWorld);if(raycaster.ray.intersectBox(part.worldBounds,tempVector)){const d=raycaster.ray.origin.distanceToSquared(tempVector);if(d<near){near=d;nearest=part;}}}
    setHover(nearest);
    if(nearest){controls.tooltip.style.left=`${clamp(pointer.x+18,12,innerWidth-175)}px`;controls.tooltip.style.top=`${clamp(pointer.y-34,88,innerHeight-70)}px`;}
  }
  function pickHive() {
    setRay(pointer.x,pointer.y);let result=null,near=Infinity;
    for(const hive of hives){hive.object.updateWorldMatrix(true,false);hive.worldBounds.copy(hive.bounds).applyMatrix4(hive.object.matrixWorld).expandByScalar(.045);if(raycaster.ray.intersectBox(hive.worldBounds,tempVector)){const d=raycaster.ray.origin.distanceToSquared(tempVector);if(d<near){near=d;result=hive;}}}
    return result;
  }
  function animateFeed(part=parts.find(p=>p.object.name==='INFERRED_INTAKE')) {
    if(pulsing&&pulsing!==hovered)swapHighlight(pulsing,false);
    pulsing=part;swapHighlight(part,true);feedTime=0;feedBall.visible=true;dirty();
  }

  function spawnBall(point,{nectar=false,alliance='red',height=1.6,velocityX=0,velocityZ=0,mark=true}={}) {
    const ball=ballPool[poolIndex];poolIndex=(poolIndex+1)%MAX_BALLS;spawnCount++;
    ball.active=true;ball.sleeping=false;ball.docked=null;ball.age=0;ball.radius=nectar?NECTAR_RADIUS:BALL_RADIUS;
    ball.mesh.material=nectar?(alliance==='blue'?blueNectarMaterial:nectarMaterial):pollenMaterial;ball.mesh.scale.setScalar(ball.radius);ball.mesh.visible=true;
    ball.position.set(clamp(point.x,-1.68,1.68),Math.max(floorY+ball.radius,point.y??floorY)+height,clamp(point.z,-1.68,1.68));
    ball.velocity.set(velocityX,0,velocityZ);ball.mesh.rotation.set(0,0,0);
    if(mark)markChanged();dirty();return ball;
  }
  function dropAtPointer() {
    const point=fieldPoint();if(!point||Math.abs(point.x)>1.77||Math.abs(point.z)>1.77)return false;
    spawnBall(point,{nectar:spawnCount%4===3,alliance:Math.floor(spawnCount/4)%2?'blue':'red'});pointer.lastDrop=time;return true;
  }
  function dropFromControl() {
    if(!active)return;
    let target,alliance='red';
    if(hives.length){const hive=hives[spawnCount%hives.length];target=hive.object.localToWorld(hive.catchPoint.clone());target.y+=.14;alliance=hive.name.includes('BLUE')?'blue':'red';}
    else target=new THREE.Vector3(drivePosition.x,1,drivePosition.y-.42);
    spawnBall(target,{nectar:spawnCount%3!==0,alliance,height:.55});announce('Ball dropped');
  }
  function clearBalls(){for(const ball of ballPool){ball.active=false;ball.mesh.visible=false;ball.docked=null;}poolIndex=0;spawnCount=0;}

  function setField(object,metadata={}) {
    field=object;floorY=metadata.floorY??0;floorPlane.constant=-floorY;
    boundsLimit=metadata.driveLimit??1.58;keepOut=metadata.keepOut??keepOut;
    if(metadata.frameKeepout){const b=metadata.frameKeepout;keepOut={minX:b[0]-.28,maxX:b[3]+.28,minZ:b[2]-.28,maxZ:b[5]+.28};}
    // A metadata entry can identify a native pivot root and its LOCAL hinge axis.
    // No guessed replacement HIVE meshes are constructed if roots are absent.
    const entries=metadata.hives??[{name:'HIVE_RED',axis:[1,0,0]},{name:'HIVE_BLUE',axis:[1,0,0]}];
    hives=[];
    for(const entry of entries){
      const node=entry.object??field.getObjectByName(entry.name);if(!node)continue;
      const bounds=localBounds(node),size=bounds.getSize(new THREE.Vector3());
      if(bounds.isEmpty())continue;
      const axis=new THREE.Vector3(...(entry.axis??node.userData.hingeAxis??[1,0,0])).normalize();
      const catchPoint=entry.catchPoint?new THREE.Vector3(...entry.catchPoint):bounds.getCenter(new THREE.Vector3());
      if(!entry.catchPoint)catchPoint.y=bounds.max.y-Math.min(.075,size.y*.13);
      hives.push({object:node,name:entry.name,quaternion:node.quaternion.clone(),axis,bounds,worldBounds:new THREE.Box3(),inverse:new THREE.Matrix4(),angle:0,velocity:0,target:0,limit:entry.maxAngle??.43,catchPoint,catchRadius:entry.catchRadius??Math.max(.07,Math.min(size.x,size.z)*.39),lastWorld:new THREE.Vector3()});
    }
    // Preserve all 56 native starting pieces. Only the six upper-cell NECTAR
    // pieces become dynamic, using their original CAD meshes and placements.
    restoreNativePieces();
    const starting=field.getObjectByName(metadata.startingPiecesGroup??'STARTING_PIECES');
    for(const node of starting?.children??[]){const material=Array.isArray(node.material)?node.material[0]:node.material;if(!material?.color)continue;if(node.name.startsWith('POLLEN_'))pollenMaterial.color.copy(material.color);if(node.name.startsWith('NECTAR_'))(material.color.r>material.color.b?nectarMaterial:blueNectarMaterial).color.copy(material.color);}
    for(const node of [...(starting?.children??[])]){
      if(!node.name.startsWith('NECTAR_'))continue;
      const center=new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
      if(center.y<.9||!hives.length)continue;
      const hive=hives.reduce((best,item)=>Math.abs(center.x-item.object.getWorldPosition(tempVector).x)<Math.abs(center.x-best.object.getWorldPosition(tempVector2).x)?item:best,hives[0]);
      const parent=node.parent,position=node.position.clone(),quaternion=node.quaternion.clone(),scale=node.scale.clone();
      const wrapper=new THREE.Group();wrapper.name='DYNAMIC_'+node.name;wrapper.position.copy(center);nativePlay.add(wrapper);wrapper.updateWorldMatrix(true,false);wrapper.attach(node);
      hive.object.updateWorldMatrix(true,false);
      const hiveLocal=hive.object.worldToLocal(center.clone());
      nativeBalls.push({mesh:wrapper,position:wrapper.position,velocity:new THREE.Vector3(),previous:new THREE.Vector3(),radius:NECTAR_RADIUS,active:true,sleeping:false,docked:{hive,local:hiveLocal.clone()},age:0,initial:center.clone(),hive,hiveLocal,node,parent,original:{position,quaternion,scale}});
    }
    for(const hive of hives){const loaded=nativeBalls.filter(ball=>ball.hive===hive);if(!loaded.length)continue;hive.catchPoint.set(0,0,0);for(const ball of loaded)hive.catchPoint.add(ball.hiveLocal);hive.catchPoint.divideScalar(loaded.length);hive.catchPoint.y-=NECTAR_RADIUS;hive.catchRadius=.145;}
    dirty();
    return {hives:hives.map(item=>item.name)};
  }

  function restoreNativePieces(){
    for(const ball of nativeBalls){ball.parent.add(ball.node);ball.node.position.copy(ball.original.position);ball.node.quaternion.copy(ball.original.quaternion);ball.node.scale.copy(ball.original.scale);nativePlay.remove(ball.mesh);}
    nativeBalls.length=0;
  }

  function reset() {
    clearBalls();keys.clear();driveInput.set(0,0);velocity.set(0,0);drivePosition.set(1.1,1.1);driveStarted=false;driveYaw=0;
    tipDrag=null;pointer.down=false;
    for(const hive of hives){hive.angle=hive.velocity=hive.target=0;hive.object.quaternion.copy(hive.quaternion);}
    for(const part of movingParts){part.angle=0;part.object.quaternion.copy(part.quaternion);}
    for(const ball of nativeBalls){ball.position.copy(ball.initial);ball.mesh.quaternion.identity();ball.velocity.set(0,0,0);ball.sleeping=false;ball.docked={hive:ball.hive,local:ball.hiveLocal.clone()};}
    changed=false;controls.reset.hidden=true;announce('Field reset');dirty();
  }

  function pointerMove(event) {
    if(disposed||isUI(event.target))return;
    pointer.x=event.clientX;pointer.y=event.clientY;pointer.type=event.pointerType;pointer.inside=true;
    if(pointer.down&&Math.hypot(pointer.x-pointer.startX,pointer.y-pointer.startY)>7)pointer.moved=true;
    if(tipDrag&&event.pointerId===pointer.id){
      tipDrag.target=clamp(tipDrag.startAngle+(pointer.x-pointer.startX)*.0032,-tipDrag.limit,tipDrag.limit);markChanged();dirty();
      if(event.cancelable)event.preventDefault();return;
    }
    if(!active){if(time-lastPick>.045){lastPick=time;pickParts();}dirty();return;}
    if(pointer.type!=='touch'){
      const hive=pickHive();document.documentElement.classList.toggle('scene-hive-hover',Boolean(hive));
      // The actual native hinge responds to a gentle pointer nudge before drag.
      for(const item of hives)if(!tipDrag)item.target=item===hive?Math.sin(time*1.7)*.018:0;
    }
    if(pointer.down&&pointer.type!=='touch'&&time-pointer.lastDrop>.36)dropAtPointer();
    dirty();
  }
  function pointerDown(event) {
    if(disposed||event.button!==0||isUI(event.target))return;
    pointer.x=event.clientX;pointer.y=event.clientY;pointer.type=event.pointerType;pointer.inside=true;
    pointer.id=event.pointerId;pointer.startX=pointer.x;pointer.startY=pointer.y;pointer.moved=false;
    if(active){
      const hive=pickHive();
      if(hive){pointer.down=true;tipDrag=hive;tipDrag.startAngle=hive.angle;markChanged();dirty();if(event.cancelable)event.preventDefault();}
      else if(event.pointerType!=='touch'&&fieldPoint()){pointer.down=true;dropAtPointer();}
      else {pointer.down=true;lastTouch=performance.now();}
    }else if(progress<.55){
      setRay(pointer.x,pointer.y);let picked=null,near=Infinity;
      for(const part of parts){part.object.updateWorldMatrix(true,false);part.worldBounds.copy(part.bounds).applyMatrix4(part.object.matrixWorld);if(raycaster.ray.intersectBox(part.worldBounds,tempVector)){const d=tempVector.distanceToSquared(raycaster.ray.origin);if(d<near){near=d;picked=part;}}}
      if(picked){if(event.pointerType==='touch'){pointer.down=true;pulsing=picked;}else animateFeed(picked);}
    }
  }
  function pointerUp(event) {
    if(event.pointerId!==pointer.id)return;
    if(pointer.type==='touch'&&!pointer.moved&&performance.now()-lastTouch<500&&active&&!tipDrag&&!isUI(event.target))dropAtPointer();
    if(pointer.type==='touch'&&!pointer.moved&&!active&&pulsing)animateFeed(pulsing);
    if(tipDrag){tipDrag.target=0;tipDrag=null;}
    pointer.down=false;pointer.id=null;dirty();
  }
  const validKeys=new Set(['w','a','s','d','q','e','r',' ']);
  function keyDown(event) {
    const key=event.key.toLowerCase();if(!active||!validKeys.has(key)||event.altKey||event.ctrlKey||event.metaKey||event.target.closest?.('input,textarea,select,[contenteditable]'))return;
    if(key===' '&&event.target.closest?.('button,a'))return;
    event.preventDefault();
    if(key==='r'){if(!event.repeat)reset();return;}
    if(key===' '){if(!event.repeat)dropFromControl();return;}
    keys.add(key);markChanged();dirty();
  }
  function keyUp(event){keys.delete(event.key.toLowerCase());dirty();}
  function stopInput(){keys.clear();driveInput.set(0,0);pointer.down=false;tipDrag=null;joystickPointer=null;controls.stick.style.transform='translate(-50%,-50%)';for(const hive of hives)hive.target=0;setHover(null);dirty();}
  function joystickMove(event) {
    if(event.pointerId!==joystickPointer)return;
    const rect=controls.joystick.getBoundingClientRect(),x=event.clientX-(rect.left+rect.width/2),y=event.clientY-(rect.top+41),length=Math.hypot(x,y),scale=Math.min(1,29/Math.max(length,1));
    driveInput.set(x*scale/29,-y*scale/29);controls.stick.style.transform=`translate(calc(-50% + ${x*scale}px),calc(-50% + ${y*scale}px))`;markChanged();dirty();event.preventDefault();
  }
  listen(document,'pointermove',pointerMove,{passive:false});listen(document,'pointerdown',pointerDown,{passive:false});listen(document,'pointerup',pointerUp);listen(document,'pointercancel',stopInput);
  listen(document,'pointerleave',()=>{pointer.inside=false;setHover(null);});listen(window,'blur',stopInput);listen(document,'visibilitychange',()=>{if(document.hidden)stopInput();});listen(window,'keydown',keyDown);listen(window,'keyup',keyUp);
  listen(controls.drop,'click',dropFromControl);listen(controls.reset,'click',reset);
  listen(controls.helpToggle,'click',()=>{const open=controls.help.hidden;controls.help.hidden=!open;controls.helpToggle.setAttribute('aria-expanded',String(open));});
  listen(controls.joystick,'pointerdown',event=>{joystickPointer=event.pointerId;controls.joystick.setPointerCapture(event.pointerId);joystickMove(event);});
  listen(controls.joystick,'pointermove',joystickMove);
  listen(controls.joystick,'pointerup',event=>{if(event.pointerId===joystickPointer){joystickPointer=null;driveInput.set(0,0);controls.stick.style.transform='translate(-50%,-50%)';dirty();}});
  listen(controls.joystick,'lostpointercapture',()=>{joystickPointer=null;driveInput.set(0,0);dirty();});
  listen(document,'keydown',event=>{if(event.key==='Escape'){controls.help.hidden=true;controls.helpToggle.setAttribute('aria-expanded','false');stopInput();}});

  function updateHives(dt) {
    for(let i=0;i<hives.length;i++){
      const hive=hives[i];let target=hive.target;
      if(keys.has(i===0?'q':'e'))target=(i===0?1:-1)*hive.limit;
      const next=springStep(hive.angle,hive.velocity,target,dt,hive.limit);hive.angle=next.angle;hive.velocity=next.velocity;
      tempQuaternion.setFromAxisAngle(hive.axis,hive.angle);hive.object.quaternion.copy(hive.quaternion).multiply(tempQuaternion);hive.object.updateWorldMatrix(true,true);hive.inverse.copy(hive.object.matrixWorld).invert();
    }
  }
  function updateBalls(dt) {
    for(const ball of [...ballPool,...nativeBalls]){
      if(!ball.active)continue;ball.age+=dt;
      if(ball.docked){
        const hive=ball.docked.hive;
        if(Math.abs(hive.angle)>.22||Math.abs(hive.velocity)>.68){
          // A leaning upper cell releases along its transformed local downslope.
          // Downhill is gravity projected into the hinge's rotated cell plane.
          tempVector.set(0,-1,0).applyQuaternion(hive.object.getWorldQuaternion(tempQuaternion).invert());
          tempVector.y=0;tempVector.normalize().multiplyScalar(.24).applyQuaternion(hive.object.getWorldQuaternion(tempQuaternion));
          ball.velocity.set(tempVector.x,.04,tempVector.z);ball.docked=null;ball.sleeping=false;ball.releaseUntil=time+.35;
        }else {ball.position.copy(ball.docked.local).applyMatrix4(hive.object.matrixWorld);if(ball.hive)ball.mesh.quaternion.copy(hive.object.getWorldQuaternion(tempQuaternion));continue;}
      }
      if(ball.sleeping){
        if(driveStarted&&velocity.length()>.06&&Math.hypot(ball.position.x-drivePosition.x,ball.position.z-drivePosition.y)<.26+ball.radius)ball.sleeping=false;
        else continue;
      }
      ball.previous.copy(ball.position);stepBall(ball,dt,floorY);
      if(ball.velocity.y<0&&time>(ball.releaseUntil??0))for(const hive of hives){
        tempVector.copy(ball.position).applyMatrix4(hive.inverse);tempVector2.copy(ball.previous).applyMatrix4(hive.inverse);
        const planeY=hive.catchPoint.y+ball.radius;
        if(tempVector.y<=planeY&&tempVector2.y>=planeY&&Math.hypot(tempVector.x-hive.catchPoint.x,tempVector.z-hive.catchPoint.z)<hive.catchRadius-ball.radius*.5&&Math.abs(hive.angle)<.24){
          tempVector.y=planeY;ball.docked={hive,local:tempVector.clone()};ball.position.copy(tempVector).applyMatrix4(hive.object.matrixWorld);ball.velocity.set(0,0,0);hive.velocity+=(ball.radius===NECTAR_RADIUS?.05:.025);break;
        }
      }
      // A gentle robot/ball impulse makes driving through loose pollen tangible.
      const dx=ball.position.x-drivePosition.x,dz=ball.position.z-drivePosition.y,distance=Math.hypot(dx,dz);
      if(driveStarted&&ball.position.y<floorY+.2&&distance<.26+ball.radius&&velocity.length()>.06){const inverse=1/Math.max(distance,.001);ball.velocity.x=dx*inverse*.55+velocity.x*.6;ball.velocity.z=dz*inverse*.55+velocity.y*.6;ball.velocity.y=.24;ball.position.x=drivePosition.x+dx*inverse*(.26+ball.radius);ball.position.z=drivePosition.y+dz*inverse*(.26+ball.radius);}
      ball.mesh.rotation.x+=ball.velocity.z*dt/ball.radius;ball.mesh.rotation.z-=ball.velocity.x*dt/ball.radius;
      ball.sleeping=!ball.docked&&ball.velocity.lengthSq()<.000001&&ball.position.y<=floorY+ball.radius+.001;
    }
  }

  function updateDrive(dt) {
    const inputX=(keys.has('d')?1:0)-(keys.has('a')?1:0)+driveInput.x,inputY=(keys.has('w')?1:0)-(keys.has('s')?1:0)+driveInput.y;
    camera.getWorldDirection(driveForward);driveForward.y=0;driveForward.normalize();driveRight.crossVectors(driveForward,UP).normalize();
    travel.copy(driveRight).multiplyScalar(inputX).addScaledVector(driveForward,inputY);if(travel.lengthSq()>1)travel.normalize();
    const damping=1-Math.exp(-dt*10);velocity.x+=(travel.x*.69-velocity.x)*damping;velocity.y+=(travel.z*.69-velocity.y)*damping;
    if(travel.lengthSq()>.001&&!driveStarted){drivePosition.set(robot.position.x,robot.position.z);driveYaw=robot.rotation.y;driveStarted=true;}
    if(driveStarted){
      const next=constrainDrive({x:drivePosition.x,z:drivePosition.y},{x:drivePosition.x+velocity.x*dt,z:drivePosition.y+velocity.y*dt},boundsLimit,keepOut);drivePosition.set(next.x,next.z);
      if(velocity.lengthSq()>.0004){const target=Math.atan2(velocity.x,velocity.y),difference=Math.atan2(Math.sin(target-driveYaw),Math.cos(target-driveYaw));driveYaw+=difference*(1-Math.exp(-dt*12));}
      // Parent applies the authored scroll pose before every update. Blend toward
      // the driven pose without ever changing its stored timeline or origins.
      const blend=smooth((progress-FIELD_START)/.045)*smooth((FIELD_END-progress)/.045);
      robot.position.x=THREE.MathUtils.lerp(robot.position.x,drivePosition.x,blend);robot.position.z=THREE.MathUtils.lerp(robot.position.z,drivePosition.y,blend);
      robot.rotation.y+=Math.atan2(Math.sin(driveYaw-robot.rotation.y),Math.cos(driveYaw-robot.rotation.y))*blend;
      for(const part of movingParts){if(!part.object.name.includes('WHEEL'))continue;part.angle+=velocity.length()*dt/.049;part.object.quaternion.copy(part.quaternion).multiply(tempQuaternion.setFromAxisAngle(part.axis,part.angle));}
    }
    if(velocity.lengthSq()<.000002&&travel.lengthSq()===0)velocity.set(0,0);
  }

  function update(dt,{progress:nextProgress=0}={}) {
    if(disposed)return;
    dt=clamp(dt,0,.07);time+=dt;progress=nextProgress;
    active=Boolean(field)&&progress>=FIELD_START&&progress<=FIELD_END;
    nativePlay.visible=Boolean(field?.visible);
    if(active!==wasField){document.documentElement.classList.toggle('field-play-active',active);controls.root.hidden=!active;play.visible=active;wasField=active;if(active){setHover(null);hideTooltip();}else{stopInput();controls.help.hidden=true;controls.helpToggle.setAttribute('aria-expanded','false');}}
    if(active){
      updateDrive(dt);
      const steps=Math.max(1,Math.ceil(dt/(1/120))),step=dt/steps;
      for(let i=0;i<steps;i++){updateHives(step);updateBalls(step);}
      if(pointer.down&&!tipDrag&&pointer.type!=='touch'&&time-pointer.lastDrop>.36)dropAtPointer();
    }else if(pointer.inside&&time-lastPick>.06){lastPick=time;pickParts();}
    if(feedTime>=0){
      feedTime+=dt;const t=feedTime/2.2;
      for(let i=0;i<feedRoute.length;i++){const route=feedRoute[i],part=parts.find(p=>p.object.name===route.part);feedPoints[i].fromArray(route.point);if(part)feedPoints[i].add(tempVector.copy(part.object.position).sub(part.origin));}
      feedCurve.getPoint(clamp(t,0,1),feedBall.position);feedBall.visible=t<1&&!active;feedBall.scale.setScalar(BALL_RADIUS*(1-smooth((t-.86)/.14)));
      for(const part of movingParts){if(!part.object.name.includes('ROLLER'))continue;part.angle+=dt*8;part.object.quaternion.copy(part.quaternion).multiply(tempQuaternion.setFromAxisAngle(part.axis,part.angle));}
      if(t>=1){feedTime=-1;feedBall.visible=false;if(pulsing!==hovered)swapHighlight(pulsing,false);pulsing=null;}
    }
    for(const part of [hovered,pulsing])if(part)for(const mat of part.highlights){const pulse=part===pulsing?.06*(.5+.5*Math.sin(time*7)):.023;mat.material.emissive.copy(mat.emissive).lerp(emissiveTint,pulse);mat.material.emissiveIntensity=Math.max(mat.intensity,.6);}
    if(window.__SAFFRON_QA__){window.__SAFFRON_QA__.interactions={active,balls:ballPool.filter(b=>b.active).length,movingBalls:ballPool.filter(b=>b.active&&!b.sleeping&&!b.docked).length,nativePieces:nativeBalls.length,spilledNativePieces:nativeBalls.filter(b=>!b.docked).length,hives:hives.map(h=>{const p=h.object.localToWorld(h.bounds.getCenter(new THREE.Vector3())).project(camera);return {name:h.name,angle:h.angle,screen:[(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2]}}),robotPosition:robot.position.toArray(),driveStarted,feedActive:feedTime>=0,hoveredPart:hovered?.object.name??null};}
  }
  function isActive() { return active&&(pointer.down||keys.size>0||driveInput.lengthSq()>0||velocity.lengthSq()>.000002||hives.some(h=>Math.abs(h.angle-h.target)>.00008||Math.abs(h.velocity)>.0002)||[...ballPool,...nativeBalls].some(b=>b.active&&!b.sleeping&&!b.docked))||feedTime>=0||Boolean(hovered&&time-hoverAt<.15); }
  function dispose() {
    if(disposed)return;disposed=true;listeners.forEach(remove=>remove());
    for(const part of parts){swapHighlight(part,false);part.highlights.forEach(item=>item.material.dispose());}
    for(const hive of hives)hive.object.quaternion.copy(hive.quaternion);
    for(const part of movingParts)part.object.quaternion.copy(part.quaternion);
    controls.root.remove();controls.tooltip.remove();document.documentElement.classList.remove('scene-part-hover','scene-hive-hover','field-play-active');
    restoreNativePieces();robot.remove(feedBall);scene.remove(play,nativePlay);ballGeometry.dispose();pollenMaterial.dispose();nectarMaterial.dispose();blueNectarMaterial.dispose();
  }
  play.visible=false;
  return {setField,update,isActive,dispose,reset};
}
