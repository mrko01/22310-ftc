// The Minex stage: one WebGL canvas behind the page.
// A full-screen shader paints the rock you are sinking through; in front of it,
// one mineral specimen at a time, modelled on that mineral's real crystal habit.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {ConvexGeometry} from 'three/examples/jsm/geometries/ConvexGeometry.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {LAYERS} from './data.js';

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const hex=c=>new THREE.Color(c);

// ---------- background shader ----------
const frag=`
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;uniform float uDepth,uScale,uTime;uniform float uB[8];uniform vec3 uP[24];uniform vec2 uLight;uniform float uLamp;
float h21(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return s;}
vec3 vor(vec2 p){vec2 i=floor(p),f=fract(p);float d1=8.,d2=8.,id=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(x,y);vec2 o=vec2(h21(i+g),h21(i+g+3.7));float d=length(g+o-f);if(d<d1){d2=d1;d1=d;id=h21(i+g+9.1);}else if(d<d2)d2=d;}
  return vec3(d1,d2-d1,id);}
vec3 rock(int k,vec2 p,out float hg){
  vec3 a=uP[k*3],b=uP[k*3+1],c=uP[k*3+2];
  float n=fbm(p*.35);vec3 col=mix(a,b,smoothstep(.3,.75,n));hg=n;
  if(k==0){float g=vn(p*6.);col=mix(col,c,step(.8,g)*.7);vec3 v=vor(p*.55);float peb=smoothstep(.36,.3,v.x)*step(.72,v.z);col=mix(col,mix(b,c,vn(p*2.)),peb);hg+=peb*.5;}
  else if(k==1){vec3 v=vor(p*.45+fbm(p*.3));float sh=step(.76,v.z)*smoothstep(.04,.1,v.y);col=mix(col,c*(.55+.3*vn(p*3.)),sh*.55);hg+=sh*.35;}
  else if(k<5){float s=vn(p*5.+3.),s2=vn(p*9.1+11.);col=mix(col,c,smoothstep(.76,.86,s));col=mix(col,a*.55,smoothstep(.78,.9,s2));}
  else if(k==5){vec3 v=vor(p*.3);col=mix(col,mix(b*1.15,a*1.3,v.z),step(.62,v.z)*smoothstep(.02,.08,v.y));float sul=smoothstep(.6,.67,fbm(p*.2+7.));col=mix(col,c*(.5+.45*vn(p*4.)),sul*.85);hg+=sul*.45;}
  else if(k==6){vec3 v=vor(p*.26+fbm(p*.2)*.7);vec3 cl=mix(b,c,v.z)*(.8+.35*vn(p*3.));col=mix(a,cl,smoothstep(.03,.09,v.y));hg=v.x*.5+n*.5;}
  else{float band=sin(p.y*.85+fbm(p*.14)*7.);col=mix(a,b,smoothstep(-.35,.35,band));col=mix(col,c,smoothstep(.72,.95,band));}
  return col;}
void main(){
  vec2 uv=vUv;float asp=uRes.x/uRes.y;
  float wy=uDepth+(.5-uv.y)*uScale,wx=(uv.x-.5)*uScale*asp;
  vec3 col;float under=step(0.,wy);
  if(wy<0.){float t=clamp(-wy/(uScale*.55),0.,1.);
    col=mix(vec3(.62,.25,.12),vec3(.1,.08,.11),smoothstep(0.,.32,t));col=mix(col,vec3(.025,.03,.045),smoothstep(.32,1.,t));
    col+=step(.9975,h21(floor(uv*uRes*.5)))*smoothstep(.25,.7,t)*.55;}
  else{int k=0;for(int i=1;i<8;i++){float bnd=uB[i]+(vn(vec2(wx*.05,float(i)*7.))+.5*vn(vec2(wx*.2,float(i)*3.))-.75)*14.;if(wy>=bnd)k=i;}
    vec2 p=vec2(wx,wy-uB[k]);float hg;vec3 c=rock(k,p,hg);
    float hx=fbm((p+vec2(.18,0.))*.35),hy=fbm((p+vec2(0.,.18))*.35);
    vec3 nr=normalize(vec3((hg-hx)*5.,(hg-hy)*5.,1.));c*=.5+.65*clamp(dot(nr,normalize(vec3(-.45,.55,.75))),0.,1.);
    c=mix(c,vec3(.09,.075,.06),smoothstep(1.5,0.,wy)*.7);col=c;}
  vec2 d=(uv-uLight)*vec2(asp,1.);float lamp=exp(-dot(d,d)*2.6);
  float vig=smoothstep(1.3,.2,length((uv-vec2(.5,.48))*vec2(asp*.85,1.)));
  col*=mix(1.,.24+uLamp*.95*lamp,under)*mix(.5,1.,vig);
  col=mix(col,col*vec3(1.1,.94,.82),clamp(uDepth/3000.,0.,1.)*under);
  gl_FragColor=vec4(col,1.);}`;

// ---------- procedural geometry helpers ----------
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function lump(r,detail,seed,amp=.22,freq=1.6,tint=null){
  let g=new THREE.IcosahedronGeometry(r,detail);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);const p=g.attributes.position,v=new THREE.Vector3(),R=rng(seed);
  const waves=Array.from({length:6},()=>[new THREE.Vector3(R()-.5,R()-.5,R()-.5).normalize(),R()*6,.5+R()]);
  const col=tint?new Float32Array(p.count*3):null,c=new THREE.Color(),base=tint&&new THREE.Color(tint),fleck=new THREE.Color('#d9d2c6');
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=v.clone().normalize();let s=0;for(const[dir,ph,w]of waves)s+=Math.sin(n.dot(dir)*freq*3*w+ph)/waves.length;
    const fine=Math.sin(n.x*23+n.y*17)*Math.sin(n.y*29-n.z*13)*Math.sin(n.z*19+n.x*11);v.multiplyScalar(1+s*amp+fine*amp*.12);p.setXYZ(i,v.x,v.y,v.z);
    if(col){c.copy(base).multiplyScalar(.72+.5*(fine*.5+.5)+(R()-.5)*.25);if(R()<.06)c.lerp(fleck,.5);col.set([c.r,c.g,c.b],i*3);}}
  if(col)g.setAttribute('color',new THREE.BufferAttribute(col,3));
  g.computeVertexNormals();return g;
}
const cuboctahedron=()=>{const pts=[];for(const[a,b]of[[1,1],[1,-1],[-1,1],[-1,-1]]){pts.push(new THREE.Vector3(a,b,0),new THREE.Vector3(a,0,b),new THREE.Vector3(0,a,b));}return new ConvexGeometry(pts.map(p=>p.multiplyScalar(.5)));};
const pyritohedron=()=>{const t=.62,pts=[];for(const x of[-1,1])for(const y of[-1,1])for(const z of[-1,1])pts.push(new THREE.Vector3(x,y,z));for(const s of[-1,1])for(const u of[-1,1]){pts.push(new THREE.Vector3(0,s*(1+t),u*(1-t*t)),new THREE.Vector3(s*(1+t),u*(1-t*t),0),new THREE.Vector3(u*(1-t*t),0,s*(1+t)));}return new ConvexGeometry(pts.map(p=>p.multiplyScalar(.36)));};

export function createStage(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setClearColor(0x050506);renderer.autoClear=false;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const env=new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(),.04).texture;

  // Background.
  const bounds=LAYERS.map(l=>l.from),pal=LAYERS.flatMap(l=>l.pal.map(hex));
  const bgMat=new THREE.ShaderMaterial({vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:frag,depthTest:false,depthWrite:false,
    uniforms:{uRes:{value:new THREE.Vector2(1,1)},uDepth:{value:0},uScale:{value:72},uTime:{value:0},uB:{value:bounds},uP:{value:pal},uLight:{value:new THREE.Vector2(.55,.5)},uLamp:{value:1}}});
  const bgScene=new THREE.Scene(),bgCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),bgMat));

  // Specimen scene.
  const scene=new THREE.Scene();scene.environment=env;
  const camera=new THREE.PerspectiveCamera(28,1,.1,50);camera.position.set(0,0,7);
  const key=new THREE.DirectionalLight(0xfff0dc,1.5);key.position.set(-3,4,5);scene.add(key);
  const rim=new THREE.DirectionalLight(0x9fb4ff,1.4);rim.position.set(4,-1,-3);scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff,.15));
  const holder=new THREE.Group();scene.add(holder);

  const metal=(color,rough=.25,extra={})=>new THREE.MeshPhysicalMaterial({color,metalness:1,roughness:rough,envMapIntensity:1.25,...extra});
  const stone=()=>new THREE.MeshStandardMaterial({color:'#9a948c',vertexColors:true,roughness:.92,metalness:0,envMapIntensity:.45});
  const rock=(r,d,seed,color,amp=.2,freq=1.6)=>new THREE.Mesh(lump(r,d,seed,amp,freq,color),stone());
  const builders={
    pyrite(){const g=new THREE.Group(),m=metal('#d6bf72',.2);
      for(const[s,x,y,z,rx,ry]of[[.95,0,0,0,.2,.5],[.62,.55,.38,.1,.7,.1],[.48,-.5,.45,-.2,.3,.9],[.38,.2,-.55,.45,1.1,.4]]){const c=new THREE.Mesh(new RoundedBoxGeometry(s,s,s,2,s*.03),m);c.position.set(x,y,z);c.rotation.set(rx,ry,0);g.add(c);}
      return g;},
    magnetite(){const g=new THREE.Group(),m=metal('#2c2c31',.32);const base=rock(.9,4,7,'#3a3631',.18);base.scale.set(1.3,.55,1);base.position.y=-.55;g.add(base);
      for(const[s,x,y,z,r]of[[.75,0,.25,0,.3],[.45,-.7,-.05,.2,.9],[.38,.65,-.1,.3,1.6],[.28,.25,-.15,.7,.4]]){const o=new THREE.Mesh(new THREE.OctahedronGeometry(s),m);o.position.set(x,y,z);o.rotation.set(r,r*.7,r*.3);g.add(o);}return g;},
    pyrrhotite(){const g=new THREE.Group(),m=metal('#a8834e',.38);
      for(let i=0;i<5;i++){const r=.95-i*.09,p=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.17,6),m);p.position.set(Math.sin(i*1.7)*.08,-.4+i*.19,Math.cos(i*1.3)*.06);p.rotation.y=i*.08;g.add(p);}
      g.rotation.x=.35;return g;},
    pentlandite(){const g=new THREE.Group();g.add(new THREE.Mesh(lump(1,5,11,.14,1.3),metal('#7a5a34',.48)));
      const R=rng(5),m=metal('#e2cd94',.3);for(let i=0;i<26;i++){const gr=new THREE.Mesh(lump(.1+R()*.13,2,200+i,.35,2),m);const n=new THREE.Vector3(R()-.5,R()-.5,R()-.5).normalize();gr.position.copy(n.clone().multiplyScalar(.93));gr.lookAt(n.multiplyScalar(3));gr.scale.set(1,1,.55);g.add(gr);}return g;},
    chalcopyrite(){const g=new THREE.Group(),m=metal('#cfa83a',.24,{iridescence:.42,iridescenceIOR:1.6,iridescenceThicknessRange:[160,360]});
      const base=rock(.75,4,21,'#3e3934');base.scale.set(1.3,.5,1);base.position.y=-.62;g.add(base);
      for(const[s,x,y,z,a,b]of[[.95,0,.12,0,.5,.3],[.6,-.62,-.18,.3,2.1,1],[.55,.66,-.14,.12,1.2,2.4],[.42,.18,-.2,.7,.9,1.7],[.36,-.3,-.25,-.55,2.6,.4]]){const t=new THREE.Mesh(new THREE.TetrahedronGeometry(s),m);t.position.set(x,y,z);t.rotation.set(a,b,a*.5);g.add(t);}return g;},
    millerite(){const g=new THREE.Group();const base=rock(.7,4,31,'#3b3733',.2);base.scale.set(1.4,.5,1.1);base.position.y=-.7;g.add(base);
      const count=140,geo=new THREE.CylinderGeometry(.008,.014,1,5);geo.translate(0,.5,0);const inst=new THREE.InstancedMesh(geo,metal('#d1b95c',.22),count),R=rng(9),o=new THREE.Object3D();
      for(let i=0;i<count;i++){const th=R()*Math.PI*2,ph=R()*1.15;const dir=new THREE.Vector3(Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th));o.position.set((R()-.5)*.25,-.55,(R()-.5)*.25);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);o.scale.set(1,.8+R()*1.1,1);o.updateMatrix();inst.setMatrixAt(i,o.matrix);}
      g.add(inst);return g;},
    sperrylite(){const g=new THREE.Group();const base=rock(.75,4,41,'#4a443d',.18);base.scale.set(1.25,.55,1);base.position.y=-.55;g.add(base);
      const m=metal('#e6e9ee',.07),R=rng(3);for(const[s,x,y,z]of[[1,0,.12,0],[.6,-.6,-.12,.3],[.5,.62,-.14,.3],[.36,.18,-.22,.74],[.3,-.32,-.2,-.6],[.24,.5,-.25,-.5]]){const c=new THREE.Mesh(cuboctahedron(),m);c.scale.setScalar(s);c.position.set(x,y,z);c.rotation.set(R()*3,R()*3,R()*3);g.add(c);}return g;},
    froodite(){const g=new THREE.Group();const base=rock(1,5,51,'#2d2a27',.12,1.2);g.add(base);
      const R=rng(17),m=metal('#b5b5bb',.18);for(let i=0;i<34;i++){const c=new THREE.Mesh(i%3?new THREE.IcosahedronGeometry(.05+R()*.07,0):pyritohedron(),m);if(!(i%3))c.scale.setScalar(.15+R()*.12);const n=new THREE.Vector3(R()-.5,(R()-.2),R()-.5).normalize();c.position.copy(n.multiplyScalar(.98));c.rotation.set(R()*3,R()*3,0);g.add(c);}return g;},
    gold(){const g=new THREE.Group();const n=new THREE.Mesh(lump(.95,5,61,.26,1.1),metal('#f2c14a',.16));n.scale.set(1.2,.78,.9);g.add(n);
      const R=rng(8);for(let i=0;i<4;i++){const f=new THREE.Mesh(lump(.22,3,70+i,.35),metal('#f2c14a',.2));f.position.set((R()-.5)*2.4,-.7+R()*.3,(R()-.5)*1.2);g.add(f);}return g;},
    cone(){const g=new THREE.Group();let geo=new THREE.ConeGeometry(.85,1.9,128,40);geo.deleteAttribute('normal');geo.deleteAttribute('uv');geo=mergeVertices(geo);
      const p=geo.attributes.position,v=new THREE.Vector3(),col=new Float32Array(p.count*3),c=new THREE.Color(),base=new THREE.Color('#6a625a');
      for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const a=Math.atan2(v.z,v.x),k=Math.max(0,(.95-v.y)/1.9),ridge=Math.abs(Math.sin(a*22+v.y*1.8+Math.sin(a*5)*.8));
        const s=1+ridge*.1*k-Math.sin(a*7+v.y*2.2)*.04*k;if(v.y>-.94){v.x*=s;v.z*=s;}p.setXYZ(i,v.x,v.y,v.z);c.copy(base).multiplyScalar(.45+.75*ridge);col.set([c.r,c.g,c.b],i*3);}
      geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.computeVertexNormals();
      const cone=new THREE.Mesh(geo,stone());const back=rock(1.05,4,81,'#4a443e',.15);back.position.set(0,-.65,-.45);back.scale.set(1.15,.7,.6);g.add(back,cone);g.rotation.z=-.22;return g;},
    snolab(){const g=new THREE.Group();const R=1.05;
      g.add(new THREE.Mesh(new THREE.SphereGeometry(R*.96,64,48),new THREE.MeshPhysicalMaterial({color:'#9cc7d8',roughness:.05,metalness:0,transparent:true,opacity:.18,envMapIntensity:1.6})));
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(R*1.12,2)),new THREE.LineBasicMaterial({color:'#c9b27a',transparent:true,opacity:.42})));
      const pts=new THREE.IcosahedronGeometry(R*1.1,4).attributes.position,seen=new Set(),pos=[];for(let i=0;i<pts.count;i++){const k=[pts.getX(i),pts.getY(i),pts.getZ(i)].map(n=>n.toFixed(3)).join();if(!seen.has(k)){seen.add(k);pos.push([pts.getX(i),pts.getY(i),pts.getZ(i)]);}}
      const inst=new THREE.InstancedMesh(new THREE.SphereGeometry(.028,10,8),new THREE.MeshStandardMaterial({color:'#e6a640',emissive:'#7a4510',emissiveIntensity:.5,roughness:.35,metalness:.5}),pos.length),o=new THREE.Object3D();
      pos.forEach(([x,y,z],i)=>{o.position.set(x,y,z);o.updateMatrix();inst.setMatrixAt(i,o.matrix);});g.add(inst);return g;},
  };

  // ---------- state ----------
  let current=null,leaving=null,target=null,depth=0,w=1,h=1,raf=0,running=true,last=performance.now(),spin=0,drag=null,velocity=0,tiltX=0,tiltY=0,ptr=[0,0];
  const cache={};
  function frame(){
    const aspect=w/h,wide=aspect>1.05,visH=2*camera.position.z*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),visW=visH*aspect;
    const nx=wide?Math.min(.16,Math.max(0,(1.9-aspect)*.3)):0,ny=wide?.02:.22,size=Math.min(visH*(wide?.25:.19),visW*(wide?.17:.3));
    holder.position.set(nx*visW/2,ny*visH/2,0);holder.scale.setScalar(size);
    bgMat.uniforms.uLight.value.set(.5+nx/2,.5+ny/2);
  }
  function resize(){w=canvas.clientWidth||innerWidth;h=canvas.clientHeight||innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio||1,w<700?1.5:1.25));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();bgMat.uniforms.uRes.value.set(w,h);frame();}
  addEventListener('resize',resize);resize();
  function show(key){
    if(key===target)return;target=key;
    if(leaving){holder.remove(leaving.g);leaving.g.position.y=0;leaving=null;}
    if(current){leaving={g:current,t:0};}
    current=null;
    if(key&&builders[key]){const g=cache[key]||(cache[key]=builders[key]());if(leaving?.g===g){leaving=null;}g.userData.t=0;g.scale.setScalar(0.001);g.rotation.y=-1.2;holder.add(g);current=g;}
    bgMat.uniforms.uLamp.value=key?1:.75;
  }
  const easeOut=t=>1-Math.pow(1-t,4),easeBack=t=>{const c=1.4;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);};
  function loop(now){
    raf=running?requestAnimationFrame(loop):0;const dt=Math.min(.05,(now-last)/1000);last=now;
    bgMat.uniforms.uDepth.value=depth;bgMat.uniforms.uTime.value=now/1000;
    if(leaving){leaving.t+=dt/(reduced.matches?.01:.45);const e=easeOut(Math.min(1,leaving.t));leaving.g.scale.setScalar(Math.max(.001,1-e*.9));leaving.g.position.y=e*1.4;if(leaving.t>=1){holder.remove(leaving.g);leaving.g.position.y=0;leaving=null;}}
    if(current){current.userData.t=Math.min(1,current.userData.t+dt/(reduced.matches?.01:.85));const t=Math.max(0,current.userData.t*1.2-.2),e=easeOut(t);current.scale.setScalar(Math.max(.001,.92*e+.08*e*e));
      if(!drag){velocity*=Math.pow(.92,dt*60);spin+=velocity*dt+(reduced.matches?0:dt*.15);}
      current.rotation.y=spin-1.2*(1-easeOut(t));tiltX+=(ptr[1]*.18-tiltX)*.06;tiltY+=(ptr[0]*.25-tiltY)*.06;current.rotation.x=tiltX+(current.userData.baseX||0);current.position.y=-(1-e)*1.1+Math.sin(now/1400)*.04;holder.rotation.y=tiltY;}
    renderer.clear();renderer.render(bgScene,bgCam);renderer.clearDepth();renderer.render(scene,camera);
  }
  raf=requestAnimationFrame(loop);
  // Mouse: the specimen leans toward the pointer and can be spun by dragging.
  addEventListener('pointermove',e=>{if(e.pointerType==='mouse')ptr=[e.clientX/innerWidth*2-1,e.clientY/innerHeight*2-1];if(drag&&drag.id===e.pointerId){const dx=e.clientX-drag.x;drag.x=e.clientX;spin+=dx*.01;velocity=dx*.6;}},{passive:true});
  addEventListener('pointerdown',e=>{if(e.button!==0||!current||e.target.closest('a,button,input,select,textarea,.site-header,.site-footer'))return;drag={x:e.clientX,id:e.pointerId};document.documentElement.classList.add('mx-dragging');});
  const end=()=>{drag=null;document.documentElement.classList.remove('mx-dragging');};addEventListener('pointerup',end);addEventListener('pointercancel',end);
  document.addEventListener('visibilitychange',()=>{running=!document.hidden;if(running&&!raf){last=performance.now();raf=requestAnimationFrame(loop);}});
  return{setDepth(d){depth=d;},show,resize};
}
