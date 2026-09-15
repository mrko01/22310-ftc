import {createSceneProps} from './scene-props.js';
import {FLOOR_Y} from './props-motion.js';
import {smoothDamp, poseAt, roverStops, rampHeight, roverMotion, roverDwell, smootherstep} from './motion.js';
import * as THREE from './vendor/three.module.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

export function startMascot(isPaused) {
  const canvas=document.querySelector('#robot');
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.93;
  renderer.shadowMap.enabled=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();
  const environment=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
  const environmentMap=pmrem.fromScene(environment,.03);scene.environment=environmentMap.texture;scene.environmentIntensity=.65;environment.dispose();pmrem.dispose();
  const camera=new THREE.PerspectiveCamera(31,1,.1,60);camera.position.set(0,1.25,10.6);camera.lookAt(0,.48,0);
  scene.add(new THREE.HemisphereLight(0xfff8ef,0xd4c7b4,1.0));
  const key=new THREE.DirectionalLight(0xfff7ed,2.7);key.position.set(-3,6,5);key.castShadow=false;key.shadow.mapSize.set(1024,1024);key.shadow.normalBias=.025;key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=5;key.shadow.camera.bottom=-4;key.shadow.camera.near=.1;key.shadow.camera.far=20;key.shadow.radius=5;scene.add(key);
  const fill=new THREE.DirectionalLight(0xe5efff,.85);fill.position.set(4,1,3);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffd1a0,2);rim.position.set(2,4,-4);scene.add(rim);
  const orange=new THREE.MeshPhysicalMaterial({color:0xf44a06,roughness:.32,metalness:.05,clearcoat:.55,clearcoatRoughness:.26});
  const orangeDark=new THREE.MeshStandardMaterial({color:0xcc430c,roughness:.42,metalness:.15});
  const graphite=new THREE.MeshPhysicalMaterial({color:0x293230,roughness:.28,metalness:.55,clearcoat:.4});
  const rubber=new THREE.MeshStandardMaterial({color:0x343b37,roughness:.85});
  const ivory=new THREE.MeshPhysicalMaterial({color:0xfff3d9,roughness:.38,metalness:.05,clearcoat:.25});
  const glass=new THREE.MeshPhysicalMaterial({color:0x071c1c,roughness:.17,metalness:.24,clearcoat:1,clearcoatRoughness:.11});
  const chrome=new THREE.MeshStandardMaterial({color:0x8e9e94,roughness:.3,metalness:.88});
  const eyeMaterial=new THREE.MeshStandardMaterial({color:0xfff7db,emissive:0xffdb88,emissiveIntensity:.18,roughness:.4});
  const character=new THREE.Group();scene.add(character);character.rotation.set(0,-.25,0);
  const upperBody=new THREE.Group();character.add(upperBody);
  function mesh(parent,geometry,material,position=[0,0,0]){const object=new THREE.Mesh(geometry,material);object.position.set(...position);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;}
  const geometryCache=new Map();
  const geometry=(key,create)=>{if(!geometryCache.has(key))geometryCache.set(key,create());return geometryCache.get(key);};
  const rounded=(parent,size,position,material,r=.13)=>mesh(parent,geometry('box'+size.join(',')+','+r,()=>new RoundedBoxGeometry(...size,3,r)),material,position);
  const ball=(parent,r,position,material,scale=[1,1,1])=>{const object=mesh(parent,geometry("sphere"+r,()=>new THREE.SphereGeometry(r,24,16)),material,position);object.scale.set(...scale);return object;};
  const cyl=(parent,r1,r2,length,position,material)=>mesh(parent,geometry("cyl"+[r1,r2,length],()=>new THREE.CylinderGeometry(r1,r2,length,24)),material,position);
  const ring=(parent,r,tube,position,material)=>mesh(parent,new THREE.TorusGeometry(r,tube,12,48),material,position);
  function bolt(parent,position,r=.04){const cap=cyl(parent,r,r,.017,position,chrome);cap.rotation.x=Math.PI/2;rounded(parent,[r*.8,.009,.006],[position[0],position[1],position[2]+.012],graphite,.002);}
  // The head is a layered enclosure, with a soft ivory gasket around its inset display.
  const head=new THREE.Group();head.position.set(0,1.62,.025);upperBody.add(head);
  rounded(head,[1.9,1.36,1.17],[0,0,0],orange,.27);
  rounded(head,[1.91,.7,.83],[0,-.035,-.095],orangeDark,.17);
  rounded(head,[1.76,1.2,.38],[0,.005,.427],orange,.23);
  rounded(head,[1.57,1.025,.11],[0,.005,.632],ivory,.20);
  rounded(head,[1.455,.915,.085],[0,.005,.704],glass,.17);
  // Small surface accents make the casing feel manufactured, without a noisy face.
  for(const x of [-.72,.72])for(const y of [-.5,.5])bolt(head,[x,y,.594],.031);
  for(const side of [-1,1]){
    const neck=cyl(head,.235,.235,.16,[side*.99,.015,-.06],graphite);neck.rotation.z=Math.PI/2;
    const shell=cyl(head,.205,.205,.12,[side*1.08,.015,-.06],ivory);shell.rotation.z=Math.PI/2;
    const disc=cyl(head,.134,.134,.13,[side*1.15,.015,-.06],orange);disc.rotation.z=Math.PI/2;
    const center=cyl(head,.045,.045,.135,[side*1.16,.015,-.06],chrome);center.rotation.z=Math.PI/2;
  }
  const face=new THREE.Group();face.position.z=.764;head.add(face);
  const eyes=[];
  for(const side of [-1,1]){
    const eye=new THREE.Group();eye.position.set(side*.32,.10,0);face.add(eye);
    rounded(eye,[.235,.325,.025],[0,0,0],eyeMaterial,.106);
    eyes.push(eye);
  }
  const smile=mesh(face,new THREE.TorusGeometry(.18,.024,12,40,Math.PI),eyeMaterial,[0,-.11,0]);smile.rotation.z=Math.PI;
  // Antenna: a little polished spring and an orange illuminated cap.
  cyl(head,.09,.105,.08,[.28,.7,-.06],graphite);
  const helix=[];for(let i=0;i<=80;i++){const t=i/80;helix.push(new THREE.Vector3(.28+Math.cos(t*Math.PI*10)*.04,.75+t*.21,-.06+Math.sin(t*Math.PI*10)*.04));}
  mesh(head,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix),80,.012,8,false),chrome);
  cyl(head,.027,.027,.19,[.28,1.025,-.06],chrome);
  ball(head,.125,[.28,1.16,-.06],orange);
  ball(head,.054,[.255,1.193,.027],ivory,[.8,.65,.22]);
  // Neck, compact torso and an inset number plate.
  cyl(upperBody,.21,.24,.31,[0,.76,0],chrome);
  for(const y of [.67,.76,.85])cyl(upperBody,.24,.24,.03,[0,y,0],graphite);
  rounded(upperBody,[1.29,1.16,.9],[0,.02,0],orange,.25);
  rounded(upperBody,[1.15,.17,.79],[0,-.52,-.01],orangeDark,.07);
  rounded(upperBody,[.87,.58,.055],[0,.15,.457],ivory,.10);
  const label=document.createElement('canvas');label.width=512;label.height=256;const lc=label.getContext('2d');lc.fillStyle='#fff3d9';lc.fillRect(0,0,512,256);lc.fillStyle='#354039';lc.font='bold 106px sans-serif';lc.textAlign='center';lc.textBaseline='middle';lc.fillText('22310',256,145);
  const texture=new THREE.CanvasTexture(label);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
  mesh(upperBody,new THREE.PlaneGeometry(.72,.36),new THREE.MeshStandardMaterial({map:texture,roughness:.65}),[0,.17,.491]);
  for(const x of [-.49,.49])bolt(upperBody,[x,.26,.429],.032);
  for(let i=0;i<3;i++)rounded(upperBody,[.12,.042,.03],[-.18+i*.18,-.28,.449],graphite,.018);
  const battery=rounded(upperBody,[.46,.65,.09],[0,.09,-.48],graphite,.08);
  for(let i=0;i<4;i++)rounded(battery,[.28,.03,.015],[0,-.15+i*.09,-.054],rubber,.01);
  // Legs have separate pivot joints, shell panels and layered, rounded soles.
  for(const side of [-1,1]){
    const x=side*.38;
    ball(character,.19,[x,-.66,-.025],graphite);
    cyl(character,.125,.145,.33,[x,-.81,-.025],chrome);
    rounded(character,[.3,.28,.36],[x,-.93,.015],orange,.085);
    rounded(character,[.59,.12,.89],[x,-1.23,.17],rubber,.055);
    rounded(character,[.575,.32,.85],[x,-1.07,.17],orange,.13);
    rounded(character,[.49,.09,.2],[x,-1.1,.542],ivory,.035);
    for(let i=0;i<3;i++)rounded(character,[.075,.027,.22],[x-.12+i*.12,-1.294,.29],graphite,.008);
  }
  // Each arm has independent shoulder, elbow and wrist pivots. The right arm lifts OUTWARD.
  const arms=[];
  for(const side of [-1,1]){
    const shoulder=new THREE.Group();shoulder.position.set(side*.775,.41,0);upperBody.add(shoulder);
    ball(shoulder,.195,[0,0,0],graphite);
    const pivot=cyl(shoulder,.135,.135,.06,[side*.15,0,0],chrome);pivot.rotation.z=Math.PI/2;
    rounded(shoulder,[.30,.38,.36],[0,-.265,0],orange,.115);
    const elbow=new THREE.Group();elbow.position.set(0,-.52,0);shoulder.add(elbow);ball(elbow,.125,[0,0,0],chrome);
    rounded(elbow,[.275,.29,.33],[0,-.19,0],orange,.09);
    const cuff=cyl(elbow,.152,.152,.08,[0,-.378,0],graphite);
    const wrist=new THREE.Group();wrist.position.set(0,-.445,0);elbow.add(wrist);
    rounded(wrist,[.285,.225,.15],[0,-.07,.02],ivory,.07);
    // Three tapered, curled comic fingers and a separate thumb, with knuckle seams.
    for(let f=0;f<3;f++){
      const finger=new THREE.Group();finger.position.set((f-1)*.087,-.175,.02);wrist.add(finger);
      rounded(finger,[.077,.15,.10],[0,-.045,0],ivory,.034);
      rounded(finger,[.075,.082,.10],[0,-.129,.026],ivory,.034);
      rounded(finger,[.063,.013,.012],[0,-.072,.055],orangeDark,.005);
    }
    const thumb=rounded(wrist,[.1,.175,.13],[side*.175,-.075,.055],ivory,.047);thumb.rotation.z=side*.65;
    shoulder.rotation.z=side*.10;
    arms.push({shoulder,elbow,wrist});
  }
  // Contact shadow anchors the character while preserving the site's light background.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=256;shadowCanvas.height=256;
  const sc=shadowCanvas.getContext('2d'),gradient=sc.createRadialGradient(128,128,10,128,128,128);gradient.addColorStop(0,'rgba(77,65,42,.2)');gradient.addColorStop(.45,'rgba(77,65,42,.09)');gradient.addColorStop(1,'rgba(77,65,42,0)');sc.fillStyle=gradient;sc.fillRect(0,0,256,256);
  const ground=mesh(scene,new THREE.PlaneGeometry(5.8,4.3),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),[0,FLOOR_Y,.1]);ground.rotation.x=-Math.PI/2;ground.castShadow=false;

  // A compact companion follows a bounded route, pausing between short drives.
  const rover=new THREE.Group();scene.add(rover);rover.rotation.order="YXZ";
  const chassis=rounded(rover,[.72,.22,.82],[0,.24,0],orange,.10);
  rounded(rover,[.59,.075,.56],[0,.08,0],graphite,.035);
  const roverHead=new THREE.Group();roverHead.position.set(0,.55,.10);rover.add(roverHead);
  rounded(roverHead,[.66,.43,.48],[0,0,0],orange,.12);
  rounded(roverHead,[.55,.33,.04],[0,0,.252],ivory,.09);
  rounded(roverHead,[.49,.28,.03],[0,0,.279],glass,.075);
  const roverEyes=[];
  for(const side of [-1,1]){const e=rounded(roverHead,[.095,.125,.018],[side*.117,.02,.306],eyeMaterial,.035);roverEyes.push(e);}
  const roverSmile=mesh(roverHead,new THREE.TorusGeometry(.054,.012,8,24,Math.PI),eyeMaterial,[0,-.065,.31]);roverSmile.rotation.z=Math.PI;
  cyl(roverHead,.014,.014,.15,[.17,.25,-.07],chrome);ball(roverHead,.044,[.17,.34,-.07],orange);
  const wheels=[];
  for(const side of [-1,1])for(const z of [-.22,.22]){const wheel=new THREE.Group();wheel.position.set(side*.4,.155,z);rover.add(wheel);wheel.userData.side=side;const tire=cyl(wheel,.155,.155,.105,[0,0,0],rubber);tire.rotation.z=Math.PI/2;const hub=cyl(wheel,.091,.091,.12,[0,0,0],ivory);hub.rotation.z=Math.PI/2;const center=cyl(wheel,.035,.035,.126,[0,0,0],orange);center.rotation.z=Math.PI/2;wheels.push(wheel);}
  const roverShadow=mesh(scene,new THREE.PlaneGeometry(1.3,1),ground.material,[1.05,(FLOOR_Y+.002),.65]);roverShadow.rotation.x=-Math.PI/2;roverShadow.castShadow=false;
  // Irregular but deterministic destinations keep motion calm and avoid the mascot's feet.
  const stops=roverStops;
  const dwell=roverDwell;rover.scale.setScalar(1.14);
  let roverAngle=0,lastRoverX=stops[0][0],lastRoverZ=stops[0][1],aliveTime=0,routeTime=0,lastTick=0,idleTime=0,waveClock=0,roverTempo=1,spinBase=0,previousSegment=-1,lastDriveSpeed=0;
  // The design board sits between the hands, with a schematic drawn for this mascot.
  const planCanvas=document.createElement('canvas');planCanvas.width=512;planCanvas.height=384;
  const pc=planCanvas.getContext('2d');pc.fillStyle='#fcf5df';pc.fillRect(0,0,512,384);
  pc.strokeStyle='#e6dbc0';pc.lineWidth=1;for(let x=24;x<512;x+=24){pc.beginPath();pc.moveTo(x,0);pc.lineTo(x,384);pc.stroke();}for(let y=24;y<384;y+=24){pc.beginPath();pc.moveTo(0,y);pc.lineTo(512,y);pc.stroke();}
  pc.strokeStyle='#c35b24';pc.lineWidth=7;pc.strokeRect(150,90,205,150);pc.strokeRect(115,115,35,100);pc.strokeRect(355,115,35,100);pc.beginPath();pc.arc(252,165,46,0,Math.PI*2);pc.stroke();
  pc.lineWidth=3;pc.beginPath();pc.moveTo(150,280);pc.lineTo(355,280);pc.moveTo(150,266);pc.lineTo(150,295);pc.moveTo(355,266);pc.lineTo(355,295);pc.stroke();
  pc.strokeStyle='#566754';pc.lineWidth=3;pc.beginPath();pc.moveTo(40,40);pc.lineTo(95,40);pc.moveTo(40,52);pc.lineTo(78,52);pc.stroke();
  const planTexture=new THREE.CanvasTexture(planCanvas);planTexture.colorSpace=THREE.SRGBColorSpace;
  const board=new THREE.Group();scene.add(board);
  const boardCase=rounded(board,[.96,.71,.045],[0,0,0],ivory.clone(),.018);
  mesh(board,new THREE.PlaneGeometry(.88,.65),new THREE.MeshStandardMaterial({map:planTexture,roughness:.9,side:THREE.DoubleSide}),[0,0,.025]);
  rounded(board,[.18,.045,.025],[0,.325,.038],chrome.clone(),.008);
  const boardMaterials=[];board.traverse(o=>{if(o.isMesh){o.material.transparent=true;o.material.opacity=0;boardMaterials.push(o.material);}});
  const leftGrip=new THREE.Vector3(),rightGrip=new THREE.Vector3(),boardRotation=new THREE.Quaternion();
  let boardAmount=0;
  // The rover carries a securely mounted parts box on its rear deck.
  const cargo=new THREE.Group();cargo.position.set(0,.475,-.30);rover.add(cargo);
  rounded(cargo,[.34,.23,.23],[0,0,0],ivory,.04);
  rounded(cargo,[.35,.03,.24],[0,.10,0],orangeDark,.01);
  rounded(cargo,[.045,.245,.24],[0,0,0],orange,.012);
  rounded(cargo,[.14,.055,.075],[0,.143,0],graphite,.018);
  // A low test ramp uses the same floor and height profile as the wheel contact solver.
  const rampShape=new THREE.Shape();rampShape.moveTo(-.75,0);rampShape.lineTo(-.22,.18);rampShape.lineTo(.22,.18);rampShape.lineTo(.75,0);rampShape.closePath();
  const ramp=new THREE.Group();ramp.position.set(2.12,FLOOR_Y,.30);ramp.rotation.y=-Math.PI/2;scene.add(ramp);
  mesh(ramp,new THREE.ExtrudeGeometry(rampShape,{depth:1.22,bevelEnabled:false,steps:1}),ivory,[0,0,-.61]);
  rounded(ramp,[.43,.006,1.17],[0,.183,0],rubber,.002);
  for(const z of [-.59,.59])rounded(ramp,[.43,.008,.025],[0,.186,z],orange,.003);
  // Reuse materials and the existing wheel geometry; no extra texture downloads.
  const sceneProps=createSceneProps(scene,camera,ground.material.map);
  const wheelContact=new THREE.Vector3(),wheelRotation=new THREE.Matrix4();

  let targetAngle=-.25,drag=false,lastX=0,waveStart=-10000,lastFrame=0,visible=true,lookX=0,lookY=0;
  const resize=()=>{const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.position.z=Math.max(10.6,3.25/(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));camera.lookAt(0,.48,0);camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;}).observe(canvas);
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){drag=true;lastX=e.clientX;canvas.setPointerCapture(e.pointerId);}});
  canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();lookX=(e.clientX-r.left)/r.width-.5;lookY=(e.clientY-r.top)/r.height-.5;if(drag){targetAngle+=(e.clientX-lastX)*.008;lastX=e.clientX;}});
  canvas.addEventListener('pointerleave',()=>{lookX=0;lookY=0;});for(const type of ['pointerup','pointercancel'])canvas.addEventListener(type,()=>drag=false);
  const wave=()=>{waveStart=waveClock;};document.querySelector('#explode-toggle')?.addEventListener('click',wave);
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','w','W'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')targetAngle-=.2;else if(e.key==='ArrowRight')targetAngle+=.2;else wave();}});
  const ease=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
  const velocities=new Map();
  renderer.setAnimationLoop(t=>{
    if(document.hidden||!visible){lastTick=t;return;}if(t-lastFrame<24)return;lastFrame=t;
    const dt=lastTick?Math.min(.05,Math.max(0,(t-lastTick)/1000)):1/30;lastTick=t;
    const paused=isPaused();waveClock+=dt;if(!paused)idleTime+=dt;
    const propFocus=sceneProps.update(dt,paused);
    const sec=idleTime,elapsed=waveClock-waveStart;
    const chapter=Number(document.querySelector('.home-journey')?.dataset.chapter||0);
    const index=Math.min(4,Math.max(0,Math.round(chapter)));
    const carry=Math.max(0,1-Math.abs(chapter-1));
    const pose=poseAt(chapter);
    const greeting=(index===0||index===4)&&!paused;
    const requestedWave=ease(elapsed/.45)*(1-ease((elapsed-1.9)/.55));
    const waveWeight=requestedWave*(1-carry);
    const waveOscillation=Math.sin(Math.max(0,elapsed-.4)*12)*.2*waveWeight;
    const blend=(key,current,target,speed=3)=>{const result=smoothDamp(current,target,velocities.get(key)||0,dt,.34,speed);velocities.set(key,result.velocity);return result.value;};
    character.rotation.y=blend('character.rotation.y',character.rotation.y,targetAngle+(paused?0:Math.sin(chapter*.7)*.14));
    character.position.y=0;
    head.position.y=1.62+(paused?0:Math.sin(sec*1.2)*.01);
    const lookAtRover=index===1||index===3;
    head.rotation.y=blend('head.rotation.y',head.rotation.y,lookX*.18+(!paused&&propFocus?Math.max(-.32,Math.min(.32,propFocus.x*.15)):(lookAtRover&&!paused?Math.max(-.30,Math.min(.30,lastRoverX*.14)):0)));
    head.rotation.x=blend('head.rotation.x',head.rotation.x,pose[4]+lookY*.1+requestedWave*carry*Math.sin(elapsed*7)*.07+(index===2&&!paused?Math.sin(sec*2)*.055:0));
    head.rotation.z=blend('head.rotation.z',head.rotation.z,pose[5]+(paused?0:Math.sin(sec*.8)*.015));
    upperBody.rotation.x=blend('upperBody.rotation.x',upperBody.rotation.x,pose[6]);
    upperBody.rotation.z=blend('upperBody.rotation.z',upperBody.rotation.z,index===1?-.045:0);
    for(let side=0;side<2;side++){arms[side].shoulder.rotation.x=blend('shoulderForward'+side,arms[side].shoulder.rotation.x,-.4*carry);arms[side].elbow.rotation.x=blend('elbowForward'+side,arms[side].elbow.rotation.x,carry);}
    arms[0].shoulder.rotation.z=blend('arms[0].shoulder.rotation.z',arms[0].shoulder.rotation.z,pose[0]);
    arms[0].elbow.rotation.z=blend('arms[0].elbow.rotation.z',arms[0].elbow.rotation.z,pose[1]);
    arms[0].wrist.rotation.z=blend('leftWrist',arms[0].wrist.rotation.z,0);
    arms[1].shoulder.rotation.z=blend('arms[1].shoulder.rotation.z',arms[1].shoulder.rotation.z,pose[2]*(1-waveWeight)+1.15*waveWeight);
    arms[1].elbow.rotation.z=blend('arms[1].elbow.rotation.z',arms[1].elbow.rotation.z,pose[3]*(1-waveWeight)+1.12*waveWeight);
    arms[1].wrist.rotation.z=blend('rightWrist',arms[1].wrist.rotation.z,waveOscillation+(greeting?Math.sin(sec*5)*.19:0));
    for(const eye of eyes)eye.scale.y=!paused&&sec%5.7<.18?1-.84*Math.sin(Math.PI*(sec%5.7)/.18):1;
    roverTempo+=( (index===1?.65:index===4?1.22:1)-roverTempo)*(1-Math.exp(-3*dt));
    const current=roverMotion(routeTime);
    const headingError=Math.abs(Math.atan2(Math.sin(current.aim-roverAngle),Math.cos(current.aim-roverAngle)));
    const waitingToSteer=current.phase>=dwell[current.segment]&&current.phase<dwell[current.segment]+.08&&headingError>.09;
    if(!paused){aliveTime+=dt;if(!waitingToSteer)routeTime+=dt*roverTempo;}
    const motion=roverMotion(routeTime),{segment,phase}=motion;
    if(segment!==previousSegment){if(segment===4)spinBase=roverAngle;previousSegment=segment;}
    const rx=motion.x,rz=motion.z;
    const dx=rx-lastRoverX,dz=rz-lastRoverZ,speed=Math.hypot(dx,dz);
    // A controlled full turn in the open left lane: smooth start/stop, opposing wheels.
    const spinning=segment===4&&phase<3.2;
    const nextAngle=spinning?spinBase+Math.PI*2*smootherstep(phase/3.2):roverAngle+Math.max(-2.8*dt,Math.min(2.8*dt,Math.atan2(Math.sin(motion.aim-roverAngle),Math.cos(motion.aim-roverAngle))*(1-Math.exp(-8*dt))));
    const turn=paused?0:nextAngle-roverAngle;
    roverAngle+=turn;
    const contacts=[];
    for(const side of [-1,1])for(const end of [-1,1]){const lx=side*.4*1.14,lz=end*.22*1.14;contacts.push({side,end,height:rampHeight(rx+lx*Math.cos(roverAngle)+lz*Math.sin(roverAngle),rz-lx*Math.sin(roverAngle)+lz*Math.cos(roverAngle))});}
    const avg=items=>items.reduce((sum,p)=>sum+p.height,0)/items.length;
    rover.position.set(rx,FLOOR_Y+avg(contacts),rz);rover.rotation.y=roverAngle;
    rover.rotation.x=-Math.atan2(avg(contacts.filter(p=>p.end===1))-avg(contacts.filter(p=>p.end===-1)),.44*1.14);
    rover.rotation.z=Math.atan2(avg(contacts.filter(p=>p.side===1))-avg(contacts.filter(p=>p.side===-1)),.8*1.14);
    const glance=paused?0:Math.sin(aliveTime*1.2)*(speed<.001?.40:.12);
    const headTarget=Math.max(-.43,Math.min(.43,glance));
    roverHead.rotation.y=blend('roverHead',roverHead.rotation.y,headTarget,1.2);
    roverHead.rotation.z=paused?0:Math.sin(aliveTime*2)*.035;
    const driveSpeed=dt?speed/dt:0,acceleration=dt?(driveSpeed-lastDriveSpeed)/dt:0;
    chassis.rotation.x=blend('chassisPitch',chassis.rotation.x,Math.max(-.055,Math.min(.055,-acceleration*.014)),.35);
    chassis.rotation.z=blend('chassisLean',chassis.rotation.z,Math.max(-.045,Math.min(.045,-turn/Math.max(dt,.001)*driveSpeed*.012)),.3);
    lastDriveSpeed=driveSpeed;
    roverHead.rotation.x=blend('roverHeadPitch',roverHead.rotation.x,spinning?-.065:Math.max(-.08,Math.min(.08,-acceleration*.012)),.5);
    for(const e of roverEyes)e.scale.y=!paused&&aliveTime%4.8<.16?1-.84*Math.sin(Math.PI*(aliveTime%4.8)/.16):1;
    wheelRotation.makeRotationFromEuler(rover.rotation);
    for(const wheel of wheels){
      // Suspension compensates for crest transitions while each tire stays planted.
      wheelContact.set(wheel.position.x*1.14,0,wheel.position.z*1.14).applyMatrix4(wheelRotation);
      const groundAtWheel=rampHeight(rx+wheelContact.x,rz+wheelContact.z);
      wheel.position.y=(groundAtWheel-avg(contacts)+.155*1.14-wheelContact.y)/(wheelRotation.elements[5]*1.14);
      wheel.rotation.x+=(speed+wheel.userData.side*turn*.4*1.14)/(.155*1.14);
    }
    roverShadow.position.set(rx,(FLOOR_Y+.002)+rampHeight(rx,rz),rz);lastRoverX=rx;lastRoverZ=rz;
    // Fade the board only after the hands settle, so it never floats between gestures.
    const handError=Math.abs(arms[0].elbow.rotation.z-2.3)+Math.abs(arms[1].elbow.rotation.z+2.3);
    const boardTarget=carry>.85&&handError<.5?1:0;
    boardAmount=blend('boardOpacity',boardAmount,boardTarget,4);
    board.visible=boardAmount>.005;
    if(board.visible){
      character.updateMatrixWorld(true);
      arms[0].wrist.localToWorld(leftGrip.set(0,-.17,.04));arms[1].wrist.localToWorld(rightGrip.set(0,-.17,.04));
      board.position.copy(leftGrip).add(rightGrip).multiplyScalar(.5);board.position.y+=.14;board.position.z+=.055;
      upperBody.getWorldQuaternion(boardRotation);board.quaternion.copy(boardRotation);
      for(const material of boardMaterials)material.opacity=boardAmount;
    }
    renderer.render(scene,camera);
  });
  resize();window.addEventListener('pagehide',()=>{renderer.setAnimationLoop(null);sceneProps.dispose();renderer.dispose();environmentMap.dispose();});
}
