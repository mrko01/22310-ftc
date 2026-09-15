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
  const camera=new THREE.PerspectiveCamera(31,1,.1,60);camera.position.set(0,1.25,10.6);camera.lookAt(0,.62,0);
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
  function mesh(parent,geometry,material,position=[0,0,0]){const object=new THREE.Mesh(geometry,material);object.position.set(...position);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;}
  const geometryCache=new Map();
  const geometry=(key,create)=>{if(!geometryCache.has(key))geometryCache.set(key,create());return geometryCache.get(key);};
  const rounded=(parent,size,position,material,r=.13)=>mesh(parent,geometry('box'+size.join(',')+','+r,()=>new RoundedBoxGeometry(...size,3,r)),material,position);
  const ball=(parent,r,position,material,scale=[1,1,1])=>{const object=mesh(parent,geometry("sphere"+r,()=>new THREE.SphereGeometry(r,24,16)),material,position);object.scale.set(...scale);return object;};
  const cyl=(parent,r1,r2,length,position,material)=>mesh(parent,geometry("cyl"+[r1,r2,length],()=>new THREE.CylinderGeometry(r1,r2,length,24)),material,position);
  const ring=(parent,r,tube,position,material)=>mesh(parent,new THREE.TorusGeometry(r,tube,12,48),material,position);
  function bolt(parent,position,r=.04){const cap=cyl(parent,r,r,.017,position,chrome);cap.rotation.x=Math.PI/2;rounded(parent,[r*.8,.009,.006],[position[0],position[1],position[2]+.012],graphite,.002);}
  // The head is a layered enclosure, with a soft ivory gasket around its inset display.
  const head=new THREE.Group();head.position.set(0,1.62,.025);character.add(head);
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
  cyl(character,.21,.24,.31,[0,.76,0],chrome);
  for(const y of [.67,.76,.85])cyl(character,.24,.24,.03,[0,y,0],graphite);
  rounded(character,[1.29,1.16,.9],[0,.02,0],orange,.25);
  rounded(character,[1.15,.17,.79],[0,-.52,-.01],orangeDark,.07);
  rounded(character,[.87,.58,.055],[0,.15,.457],ivory,.10);
  const label=document.createElement('canvas');label.width=512;label.height=256;const lc=label.getContext('2d');lc.fillStyle='#fff3d9';lc.fillRect(0,0,512,256);lc.fillStyle='#354039';lc.font='bold 106px sans-serif';lc.textAlign='center';lc.textBaseline='middle';lc.fillText('22310',256,145);
  const texture=new THREE.CanvasTexture(label);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
  mesh(character,new THREE.PlaneGeometry(.72,.36),new THREE.MeshStandardMaterial({map:texture,roughness:.65}),[0,.17,.491]);
  for(const x of [-.49,.49])bolt(character,[x,.26,.429],.032);
  for(let i=0;i<3;i++)rounded(character,[.12,.042,.03],[-.18+i*.18,-.28,.449],graphite,.018);
  const battery=rounded(character,[.46,.65,.09],[0,.09,-.48],graphite,.08);
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
    const shoulder=new THREE.Group();shoulder.position.set(side*.775,.41,0);character.add(shoulder);
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
  const ground=mesh(scene,new THREE.PlaneGeometry(4.6,3.3),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),[0,-1.305,.1]);ground.rotation.x=-Math.PI/2;ground.castShadow=false;

  // A compact companion follows a bounded route, pausing between short drives.
  const rover=new THREE.Group();scene.add(rover);
  const chassis=rounded(rover,[.72,.22,.60],[0,.24,0],orange,.10);
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
  for(const side of [-1,1])for(const z of [-.22,.22]){const wheel=new THREE.Group();wheel.position.set(side*.4,.155,z);rover.add(wheel);const tire=cyl(wheel,.155,.155,.105,[0,0,0],rubber);tire.rotation.z=Math.PI/2;const hub=cyl(wheel,.091,.091,.12,[0,0,0],ivory);hub.rotation.z=Math.PI/2;const center=cyl(wheel,.035,.035,.126,[0,0,0],orange);center.rotation.z=Math.PI/2;wheels.push(wheel);}
  const roverShadow=mesh(scene,new THREE.PlaneGeometry(1.3,1),ground.material,[1.05,-1.303,.65]);roverShadow.rotation.x=-Math.PI/2;roverShadow.castShadow=false;
  // Irregular but deterministic destinations keep motion calm and avoid the mascot's feet.
  const stops=[.3,1.25,2.4,3.7,4.65,5.8,6.583185307];rover.scale.setScalar(1.14);
  let roverAngle=0,lastRoverX=1.18,lastRoverZ=.9,aliveTime=0,lastTick=0;
  let targetAngle=-.25,drag=false,lastX=0,waveStart=-10000,lastFrame=0,visible=true,lookX=0,lookY=0;
  const resize=()=>{const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;}).observe(canvas);
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){drag=true;lastX=e.clientX;canvas.setPointerCapture(e.pointerId);}});
  canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();lookX=(e.clientX-r.left)/r.width-.5;lookY=(e.clientY-r.top)/r.height-.5;if(drag){targetAngle+=(e.clientX-lastX)*.008;lastX=e.clientX;}});
  canvas.addEventListener('pointerleave',()=>{lookX=0;lookY=0;});for(const type of ['pointerup','pointercancel'])canvas.addEventListener(type,()=>drag=false);
  const wave=()=>{waveStart=performance.now();};document.querySelector('#explode-toggle')?.addEventListener('click',wave);
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','w','W'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')targetAngle-=.2;else if(e.key==='ArrowRight')targetAngle+=.2;else wave();}});
  const ease=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
  renderer.setAnimationLoop(t=>{
    if(document.hidden||!visible||t-lastFrame<24)return;lastFrame=t;
    const sec=t/1000,paused=isPaused(),progress=Number(document.querySelector('.home-journey')?.dataset.progress||0),elapsed=(t-waveStart)/1000;
    const autoWave=(!paused&&progress>.91)?Math.max(0,Math.sin(sec*.75))*.5:0;
    const waveWeight=Math.max(autoWave,ease(elapsed/.45)*(1-ease((elapsed-1.9)/.55)));
    const waveOscillation=Math.sin(Math.max(0,elapsed-.4)*12)*.2*waveWeight;
    character.rotation.y+=(targetAngle+(paused?0:Math.sin(progress*Math.PI*3)*.48+Math.sin(sec*.43)*.065)-character.rotation.y)*.1;
    character.position.y=0;
    head.position.y=1.62+(paused?0:Math.sin(sec*1.2)*.01);
    head.rotation.y+=(lookX*.18+(paused?0:Math.sin(progress*12)*.16)-head.rotation.y)*.08;
    head.rotation.x+=(-lookY*.1-head.rotation.x)*.08;
    head.rotation.z=paused?0:Math.sin(sec*.8)*.02-waveWeight*.07;
    arms[1].shoulder.rotation.z=.10+waveWeight*1.05;
    arms[1].elbow.rotation.z=waveWeight*1.12;
    arms[1].wrist.rotation.z=waveWeight*.15+waveOscillation;
    arms[0].shoulder.rotation.z=-.12+(paused?0:Math.sin(sec*1.2)*.025);
    for(const eye of eyes)eye.scale.y=!paused&&sec%5.7<.11?.15:1;
    const dt=Math.min(.05,Math.max(0,(t-lastTick)/1000));lastTick=t;if(!paused)aliveTime+=dt;
    const segment=Math.floor(aliveTime/3.5)%6,phase=aliveTime%3.5;
    const from=stops[segment],to=stops[segment+1],drive=ease((phase-.6)/2.6);
    const orbit=from+(to-from)*drive+progress*.5;
    const rx=Math.cos(orbit)*1.65,rz=Math.sin(orbit)*1.15;
    const dx=rx-lastRoverX,dz=rz-lastRoverZ,speed=Math.hypot(dx,dz);
    if(speed>.00001){const aim=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(aim-roverAngle),Math.cos(aim-roverAngle));roverAngle+=delta*.18;}
    rover.position.set(rx,-1.305,rz);rover.rotation.y=roverAngle;
    const glance=paused?0:Math.sin(aliveTime*1.2)*.22;
    const headTarget=Math.max(-.43,Math.min(.43,glance));
    roverHead.rotation.y+=(headTarget-roverHead.rotation.y)*.09;
    roverHead.rotation.z=paused?0:Math.sin(aliveTime*2)*.035;
    chassis.rotation.z=paused?0:Math.sin(aliveTime*10)*Math.min(speed,.015);
    for(const e of roverEyes)e.scale.y=!paused&&aliveTime%4.8<.12?.15:1;
    for(const wheel of wheels)wheel.rotation.x+=speed/.155;
    roverShadow.position.set(rx,-1.303,rz);lastRoverX=rx;lastRoverZ=rz;
    renderer.render(scene,camera);
  });
  resize();window.addEventListener('pagehide',()=>{renderer.setAnimationLoop(null);renderer.dispose();environmentMap.dispose();});
}
