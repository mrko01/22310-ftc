import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {clamp,lerp,between,sampleFrames,desktopFrames} from './timeline.mjs';
import {finishRobot,finishField} from './materials.js';
import {createInteractions} from './interactions.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';



function seededRandom(seed){let n=seed;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296}}
function createParticles(mobile){
  const count=mobile?850:1800,random=seededRandom(22310),positions=new Float32Array(count*3),scatter=new Float32Array(count*3),sizes=new Float32Array(count),phase=new Float32Array(count);
  for(let i=0;i<count;i++){
    const angle=random()*Math.PI*2,radius=.48+Math.pow(random(),.5)*5.3;
    positions[i*3]=Math.cos(angle)*radius;positions[i*3+1]=(random()-.5)*6;positions[i*3+2]=-1.9-random()*6;
    scatter[i*3]=Math.cos(angle)*radius*1.5;scatter[i*3+1]=Math.sin(angle)*radius*.40-.75;scatter[i*3+2]=-2.3+Math.sin(angle*2)*1.2;
    sizes[i]=random()*1.45+.4;phase[i]=random()*Math.PI*2;
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aScatter',new THREE.BufferAttribute(scatter,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));geometry.setAttribute('aPhase',new THREE.BufferAttribute(phase,1));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uProgress:{value:0},uPixelRatio:{value:1}},vertexShader:`attribute vec3 aScatter;attribute float aSize;attribute float aPhase;uniform float uTime;uniform float uProgress;uniform float uPixelRatio;varying float vAlpha;varying float vRed;
    void main(){float flow=smoothstep(.05,.8,uProgress);vec3 p=mix(position,aScatter,flow);p.x+=sin(uTime*.07+aPhase+p.z)*.035;p.y+=cos(uTime*.08+aPhase)*.04;p.x+=sin(uProgress*4.+p.y)*flow*.6;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=min(3.7,aSize*uPixelRatio*(2.2/-mv.z));vAlpha=(.17+.18*(sin(uTime*.2+aPhase)*.5+.5))*(1.-smoothstep(.90,1.,uProgress)*.45);vRed=step(5.85,aPhase);}`,
    fragmentShader:`varying float vAlpha;varying float vRed;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.06,d)*vAlpha;gl_FragColor=vec4(mix(vec3(.70,.72,.80),vec3(.88,.16,.19),vRed),a);}`});
  const points=new THREE.Points(geometry,material);points.frustumCulled=false;return points;
}

export async function createScene(canvas,{onReady,onFallback}){
  const mobile=innerWidth<701;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setClearColor(0x070708,1);renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:1.75));
  renderer.setSize(innerWidth,innerHeight,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  const gl=renderer.getContext();if(gl.isContextLost())throw new Error('WebGL context unavailable');
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(31,innerWidth/innerHeight,.02,80);
  const pmrem=new THREE.PMREMGenerator(renderer);let environment;
  try{const hdr=await new RGBELoader().loadAsync('/assets/studio.hdr');environment=pmrem.fromEquirectangular(hdr);hdr.dispose()}
  catch{const room=new RoomEnvironment();environment=pmrem.fromScene(room,.05);room.dispose()}
  scene.environment=environment.texture;scene.environmentRotation.y=.65;scene.environmentIntensity=.8;pmrem.dispose();
  scene.add(new THREE.AmbientLight(0xb3b7c8,.12));
  const key=new THREE.DirectionalLight(0xf1f3ff,3.8);key.position.set(-1.2,2.4,1.1);key.castShadow=true;key.shadow.mapSize.set(mobile?768:1536,mobile?768:1536);key.shadow.camera.near=.1;key.shadow.camera.far=8;key.shadow.camera.left=-.65;key.shadow.camera.right=.65;key.shadow.camera.top=.65;key.shadow.camera.bottom=-.65;key.shadow.bias=-.0002;key.shadow.normalBias=.0006;key.shadow.radius=3;scene.add(key,key.target);
  const fill=new THREE.DirectionalLight(0xc2c8dc,.35);fill.position.set(3,1,1);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xff283a,2.8);rim.position.set(-2,1.3,-2);scene.add(rim);
  const accent=new THREE.PointLight(0xff1c27,.6,5,2);accent.position.set(.5,.6,-.7);scene.add(accent);
  const particles=createParticles(mobile);scene.add(particles);
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  let robotAsset;
  try{robotAsset=await loader.loadAsync('/assets/robot.glb')}
  catch(error){renderer.dispose();environment.dispose();throw error}
  const robot=new THREE.Group();robot.name='PRESENTATION_ROBOT_ROOT';robot.add(robotAsset.scene);scene.add(robot);
  const finishes=finishRobot(robot);
  const field=new THREE.Group();field.name='OFFICIAL_FIRST_BIOBUZZ_FIELD';scene.add(field);
  const fieldMaterials=new Map();
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(3,3),new THREE.ShadowMaterial({opacity:.3}));ground.rotation.x=-Math.PI/2;ground.position.y=-.003;ground.receiveShadow=true;scene.add(ground);
  const assemblies=[];
  robot.traverse(object=>{if(['SOURCE_SHOOTER','INFERRED_CHASSIS','INFERRED_INTAKE','INFERRED_INDEXER','INFERRED_DRIVETRAIN'].includes(object.name))assemblies.push({object,origin:object.position.clone()})});
  const robotBounds=new THREE.Box3().setFromObject(robot);
  window.__SAFFRON_QA__.robotLoaded=true;window.__SAFFRON_QA__.assemblies=assemblies.map(a=>a.object.name);window.__SAFFRON_QA__.robotBounds=robotBounds.getSize(new THREE.Vector3()).toArray();window.__SAFFRON_QA__.materialCount=finishes.materials.length;
  let targetProgress=0,progress=0,paused=false,disposed=false,animation=0,last=performance.now(),time=0,ready=false,visible=!document.hidden,dirty=true,motionUntil=performance.now()+4000;
  const interactions=createInteractions({canvas,camera,scene,robot,assemblies,invalidate(){dirty=true}});
  let framing={x:0,y:0},framingDirty=true;
  async function loadField(){try{
    const [asset,metadata]=await Promise.all([loader.loadAsync('/assets/field-compressed.glb'),fetch('/assets/field-metadata.json').then(response=>response.json())]);if(disposed)return;field.add(asset.scene);
    finishes.textures.push(...finishField(field).textures);
    field.traverse(object=>{if(object.isMesh){object.receiveShadow=true;object.castShadow=!/FOAM|CLEAR|GLASS/i.test(object.material?.name||'');for(const mat of Array.isArray(object.material)?object.material:[object.material]){if(!fieldMaterials.has(mat)){fieldMaterials.set(mat,{opacity:mat.opacity,transparent:mat.transparent,depthWrite:mat.depthWrite});mat.forceSinglePass=true;mat.transparent=true}}}});
    interactions.setField(field,metadata);
    window.__SAFFRON_QA__.fieldBounds=new THREE.Box3().setFromObject(field).getSize(new THREE.Vector3()).toArray();window.__SAFFRON_QA__.fieldLoaded=true;dirty=true;
  }catch(error){if(disposed)return;window.__SAFFRON_QA__.errors.push('Field: '+String(error));console.warn('Field unavailable',error);onFallback()}}
  const position=new THREE.Vector3(),target=new THREE.Vector3();
  function applyFrame(){
    const frame=sampleFrames(desktopFrames,progress);position.fromArray(frame.camera);target.fromArray(frame.target);
    const isMobile=innerWidth<701;
    if(isMobile){
      const fieldAmount=between(progress,.49,.62)*(1-between(progress,.87,1));
      // Keep the complete driving area visible in a narrow portrait viewport.
      // Robot close-ups retain their own tighter framing.
      position.sub(target).multiplyScalar(lerp(1.37,2.4,fieldAmount)).add(target);
      target.y+=lerp(.10,.75,fieldAmount);
      target.x=0;frame.robot[0]*=fieldAmount;
    }
    camera.position.copy(position);camera.lookAt(target);camera.clearViewOffset();robot.position.fromArray(frame.robot);
    const ambientSweep=Math.sin(time*.18)*.055*(1-frame.field);
    robot.rotation.y=frame.rotation+ambientSweep;
    assemblies.forEach(({object,origin})=>{
      object.position.copy(origin);
      if(object.name==='SOURCE_SHOOTER')object.position.y+=frame.explode*.17;
      if(object.name==='INFERRED_INTAKE'){object.position.y+=frame.explode*.075;object.position.z+=frame.explode*.085}
      if(object.name==='INFERRED_CHASSIS')object.position.y+=frame.explode*.035;
      if(object.name==='INFERRED_INDEXER'){object.position.y+=frame.explode*.095;object.position.z-=frame.explode*.04}
    });
    if(framingDirty&&progress<.001){
      robot.updateWorldMatrix(true,true);camera.updateMatrixWorld();
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;const point=new THREE.Vector3();
      robot.traverse(object=>{if(!object.isMesh)return;if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();const b=object.geometry.boundingBox;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){point.set(x,y,z).applyMatrix4(object.matrixWorld).project(camera);minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y)}});
      const desiredY=isMobile?-.08:.09;framing={x:(minX+maxX)*innerWidth/4,y:(desiredY-(minY+maxY)/2)*innerHeight/2};framingDirty=false;
    }
    const framingWeight=1-between(progress,.12,.24);if(framingWeight>0)camera.setViewOffset(innerWidth,innerHeight,framing.x*framingWeight,framing.y*framingWeight,innerWidth,innerHeight);
    const alpha=frame.field;field.visible=alpha>.002;
    // Preserve the transparent crossfade, then restore opaque depth sorting.
    // Leaving every CAD surface transparent defeats early depth rejection.
    for(const [material,original]of fieldMaterials){material.opacity=original.opacity*alpha;material.transparent=original.transparent||alpha<.999;material.depthWrite=alpha>.96?original.depthWrite:false;}
    particles.material.uniforms.uProgress.value=progress;particles.material.uniforms.uTime.value=time+progress*12;particles.material.uniforms.uPixelRatio.value=renderer.getPixelRatio();
    particles.rotation.y=progress*.11;
    accent.intensity=.6*(1-alpha*.85);rim.intensity=lerp(2.8,.5,alpha);key.intensity=lerp(3.0,1.8,alpha);scene.environmentIntensity=lerp(.8,.9,alpha);
    const extent=lerp(.65,3,alpha);key.shadow.camera.left=-extent;key.shadow.camera.right=extent;key.shadow.camera.top=extent;key.shadow.camera.bottom=-extent;key.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;
  }
  function render(now){
    if(disposed)return;animation=requestAnimationFrame(render);
    const elapsed=Math.min((now-last)/1000,.25),delta=Math.min(elapsed,.07);last=now;if(!visible)return;
    const moving=!paused&&now<motionUntil;
    if(!moving&&!dirty&&progress===targetProgress&&!interactions.isActive())return;
    if(moving)time+=delta;dirty=false;
    // Camera smoothing follows elapsed wall time even on slower GPUs. Physics
    // retains its smaller stable timestep instead of slowing the entire page.
    progress=lerp(progress,targetProgress,1-Math.exp(-elapsed*10));if(Math.abs(targetProgress-progress)<.00005)progress=targetProgress;
    applyFrame();interactions.update(delta,{progress});renderer.render(scene,camera);
    const qa=window.__SAFFRON_QA__;qa.frames++;qa.state='webgl';qa.triangles=renderer.info.render.triangles;qa.drawCalls=renderer.info.render.calls;qa.camera=camera.position.toArray();qa.robotPosition=robot.position.toArray();qa.sceneProgress=progress;qa.ambientTime=time;qa.pixelRatio=renderer.getPixelRatio();qa.webglVersion=gl.getParameter(gl.VERSION);qa.heroFraming=framing;
    if(!ready&&renderer.info.render.triangles>0){ready=true;onReady();loadField()}
  }
  function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<701?1.5:1.75));renderer.setSize(innerWidth,innerHeight,false);dirty=true;framingDirty=true}
  function visibility(){visible=!document.hidden;last=performance.now()}
  function contextLost(event){event.preventDefault();cancelAnimationFrame(animation);onFallback()}
  function contextRestored(){if(!disposed){document.body.dataset.renderState='webgl';last=performance.now();animation=requestAnimationFrame(render)}}
  addEventListener('resize',resize);document.addEventListener('visibilitychange',visibility);canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',contextRestored);
  applyFrame();await renderer.compileAsync(scene,camera);animation=requestAnimationFrame(render);
  return {setProgress(value){value=clamp(value);if(value!==targetProgress){targetProgress=value;motionUntil=performance.now()+750;dirty=true}},setPaused(value){paused=value},dispose(){disposed=true;cancelAnimationFrame(animation);interactions.dispose();removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('webglcontextrestored',contextRestored);scene.traverse(object=>{object.geometry?.dispose();if(object.material)for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose()});finishes.textures.forEach(texture=>texture.dispose());environment.dispose();renderer.dispose()}};
}
