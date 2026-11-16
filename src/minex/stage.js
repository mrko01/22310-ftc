// The Minex stage: one WebGL canvas behind the page.
// A full-screen shader paints the rock you are sinking through; in front of it,
// one mineral specimen at a time, modelled on that mineral's real crystal habit and
// given a procedural surface (striations, grain boundaries, tarnish, pits).
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {ConvexGeometry} from 'three/examples/jsm/geometries/ConvexGeometry.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {finishRobot} from '../experience/materials.js';
import {LAYERS,STORY} from './data.js';

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const hex=c=>new THREE.Color(c);
const SCALE=72; // metres of rock per screen height

// ---------- background: the rock face ----------
const bgFrag=`
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;uniform float uDepth,uScale;uniform float uB[8];uniform vec3 uP[24];uniform vec2 uLight;uniform float uLamp;
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
  else{int k=0;float top=0.;for(int i=1;i<8;i++){float bnd=uB[i]+(vn(vec2(wx*.05,float(i)*7.))+.5*vn(vec2(wx*.2,float(i)*3.))-.75)*14.;if(wy>=bnd){k=i;top=bnd;}}
    vec2 p=vec2(wx,wy-uB[k]);float hg;vec3 c=rock(k,p,hg);
    float hx=fbm((p+vec2(.18,0.))*.35),hy=fbm((p+vec2(0.,.18))*.35);
    vec3 nr=normalize(vec3((hg-hx)*5.,(hg-hy)*5.,1.));c*=.5+.65*clamp(dot(nr,normalize(vec3(-.45,.55,.75))),0.,1.);
    // A contact between layers: a dark seam with a thin lit lip.
    if(k>0){float d=wy-top;c*=mix(.35,1.,smoothstep(0.,.9,d));c+=vec3(.05,.04,.03)*smoothstep(.9,.4,d)*smoothstep(.1,.4,d);}
    c=mix(c,vec3(.09,.075,.06),smoothstep(1.5,0.,wy)*.7);col=c;}
  vec2 d=(uv-uLight)*vec2(asp,1.);float lamp=exp(-dot(d,d)*2.6);
  float vig=smoothstep(1.3,.2,length((uv-vec2(.5,.48))*vec2(asp*.85,1.)));
  col*=mix(1.,.24+uLamp*.95*lamp,under)*mix(.5,1.,vig);
  col=mix(col,col*vec3(1.1,.94,.82),clamp(uDepth/3000.,0.,1.)*under);
  gl_FragColor=vec4(col,1.);}`;
// The rock face is rendered once into a texture and only redrawn when the depth or lamp moves.
// Copying it is cheap, and while you travel it is smeared vertically for a sense of speed.
const blitFrag=`
precision highp float;varying vec2 vUv;uniform sampler2D tBg;uniform float uBlur;
void main(){vec3 c=texture2D(tBg,vUv).rgb;
  if(uBlur>.0005){c*=.28;for(int i=1;i<=6;i++){float o=uBlur*float(i)/6.;c+=(texture2D(tBg,vUv+vec2(0.,o)).rgb+texture2D(tBg,vUv-vec2(0.,o)).rgb)*.06;}}
  gl_FragColor=vec4(c,1.);}`;
const quadVert='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';

// ---------- specimen surfaces ----------
// Object-space procedural detail injected into MeshPhysicalMaterial: colour, roughness and
// a bump computed from screen-space derivatives, so no textures or UVs are needed.
const SURF=`
varying vec3 vObjPos;varying vec3 vObjN;
uniform vec3 uDA,uDB,uDC;uniform float uDScale,uDBump;
float mxH=.5,mxR=1.;
float mh(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float mn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(mh(i),mh(i+vec3(1,0,0)),f.x),mix(mh(i+vec3(0,1,0)),mh(i+vec3(1,1,0)),f.x),f.y),mix(mix(mh(i+vec3(0,0,1)),mh(i+vec3(1,0,1)),f.x),mix(mh(i+vec3(0,1,1)),mh(i+vec3(1,1,1)),f.x),f.y),f.z);}
float mf(vec3 p){return .5*mn(p)+.25*mn(p*2.03+1.7)+.125*mn(p*4.01+3.1)+.0625*mn(p*8.05+5.3);}
vec3 mv(vec3 p){vec3 i=floor(p),f=fract(p);float d1=8.,d2=8.,id=0.;
  for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec3 g=vec3(x,y,z);vec3 o=vec3(mh(i+g),mh(i+g+7.1),mh(i+g+13.7))*.9+.05;float d=length(g+o-f);if(d<d1){d2=d1;d1=d;id=mh(i+g+29.3);}else if(d<d2)d2=d;}
  return vec3(d1,d2-d1,id);}
vec3 mxPerturb(vec3 sp,vec3 sn,vec2 dh,float fd){vec3 sx=dFdx(sp),sy=dFdy(sp);vec3 r1=cross(sy,sn),r2=cross(sn,sx);float det=dot(sx,r1)*fd;vec3 g=sign(det)*(dh.x*r1+dh.y*r2);return normalize(abs(det)*sn-g);}
vec3 mxColor(vec3 base){
  vec3 p=vObjPos*uDScale,col=base;
#if MX_KIND==1
  // Pyrite: striations run across each cube face, turning 90° from face to face.
  vec3 an=abs(vObjN);float s=an.x>an.y&&an.x>an.z?vObjPos.y:(an.y>an.z?vObjPos.z:vObjPos.x);
  float st=sin(s*uDScale*6.2831);mxH=smoothstep(-.2,.9,st)*.7+mf(vObjPos*4.)*.3;
  float tn=smoothstep(.55,.8,mf(vObjPos*2.2+4.));col=mix(base,uDB,tn*.55)*(.9+.2*mf(vObjPos*5.));mxR=.75+.7*mf(vObjPos*6.)+tn*.6;
#elif MX_KIND==2
  // Massive ore: interlocking grains of two minerals, with darker grain boundaries.
  vec3 v=mv(p);float isA=step(.56,v.z);float edge=smoothstep(.0,.07,v.y);
  col=mix(uDB,uDA,isA)*(.86+.28*mn(p*6.))*mix(.55,1.,edge);
  mxH=edge*.6+mf(p*4.)*.25+isA*.15;mxR=mix(1.25,.7,isA)*(.85+.3*mn(p*9.));
#elif MX_KIND==3
  // Tarnish: patches of blue and purple film over a brassy or bronze surface.
  float t=smoothstep(.48,.72,mf(p+2.));vec3 film=mix(uDB,uDC,mn(p*2.6+9.));
  col=mix(base*(.88+.24*mf(p*3.)),film,t*.7);mxH=mf(p*3.5)*.7+t*.15;mxR=.8+.55*mf(p*4.)+t*.35;
#elif MX_KIND==4
  // Gold nugget: smoothed by water, peppered with small pits.
  vec3 v=mv(p);float pit=1.-smoothstep(.05,.32,v.x);mxH=mf(p*.6)*.7-pit*.45;
  col=base*(.78+.3*smoothstep(.15,.8,mxH+.3));mxR=.7+1.4*pit+.3*mf(p*2.);
#elif MX_KIND==5
  // Host rock: pale feldspar, dark pyroxene grains and a little rust.
  float n1=mn(p),n2=mn(p*1.7+5.),n3=mf(vObjPos*1.4+3.);
  col=uDA*(.78+.44*mf(p*.3));col=mix(col,uDB*.8,smoothstep(.74,.8,n1)*.5);col=mix(col,uDC,smoothstep(.7,.8,n2)*.8);
  col=mix(col,vec3(.36,.18,.08),smoothstep(.62,.72,n3)*.35);col*=base;
  mxH=mf(p*.5)*.6+smoothstep(.7,.78,n1)*.25-smoothstep(.72,.8,n2)*.15;mxR=.9+.2*n1;
#elif MX_KIND==6
  // Crystal faces: fine growth lines and smudged lustre.
  mxH=abs(sin(dot(vObjPos,normalize(vec3(1.,1.3,.7)))*uDScale*6.2831))*.35+mf(p*.8)*.65;
  col=base*(.92+.16*mf(p*.5));mxR=.6+.9*mf(vObjPos*4.+2.);
#else
  // Needles: lengthwise striations.
  mxH=sin(atan(vObjPos.z,vObjPos.x)*7.)*.5+.5;col=base*(.9+.2*mn(vObjPos*vec3(30.,2.,30.)));mxR=.8+.4*mn(vObjPos*20.);
#endif
  return col;}`;
function surface(material,kind,{a='#ffffff',b='#ffffff',c='#ffffff',scale=1,bump=.02}={}){
  material.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,{uDA:{value:hex(a)},uDB:{value:hex(b)},uDC:{value:hex(c)},uDScale:{value:scale},uDBump:{value:bump}});
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vObjPos;varying vec3 vObjN;').replace('#include <begin_vertex>','#include <begin_vertex>\nvObjPos=position;vObjN=normal;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>\n#define MX_KIND ${kind}\n${SURF}`)
      .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mxColor(diffuseColor.rgb);')
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor*mxR,.03,1.);')
      .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=mxPerturb(-vViewPosition,normal,vec2(dFdx(mxH),dFdy(mxH))*uDBump,faceDirection);');
  };
  material.customProgramCacheKey=()=>'mx'+kind;
  return material;
}
const KIND={striate:1,grains:2,tarnish:3,pitted:4,rock:5,faces:6,needle:7};

// ---------- geometry ----------
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const indexed=g=>{g.deleteAttribute('normal');g.deleteAttribute('uv');return mergeVertices(g);};
// A rounded lump, optionally broken along a few flat fracture planes like a hand specimen.
function lump(r,detail,seed,{amp=.2,freq=1.6,cuts=0,cutDepth=.62}={}){
  const g=indexed(new THREE.IcosahedronGeometry(r,detail)),p=g.attributes.position,v=new THREE.Vector3(),R=rng(seed);
  const waves=Array.from({length:6},()=>[new THREE.Vector3(R()-.5,R()-.5,R()-.5).normalize(),R()*6,.5+R()]);
  const planes=Array.from({length:cuts},()=>[new THREE.Vector3(R()-.5,R()-.5,R()-.5).normalize(),r*(cutDepth+R()*.22)]);
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=v.clone().normalize();let s=0;for(const[dir,ph,w]of waves)s+=Math.sin(n.dot(dir)*freq*3*w+ph)/waves.length;
    const fine=Math.sin(n.x*23+n.y*17)*Math.sin(n.y*29-n.z*13)*Math.sin(n.z*19+n.x*11);v.multiplyScalar(1+s*amp+fine*amp*.1);
    for(const[pn,d]of planes){const k=v.dot(pn);if(k>d)v.addScaledVector(pn,-(k-d)*.94);}
    p.setXYZ(i,v.x,v.y,v.z);}
  g.computeVertexNormals();return g;
}
// Crystals with their sharp corners slightly worn back, the way real ones are.
function chamfered(verts,cut=.12){const pts=[];verts.forEach((a,i)=>verts.forEach((b,j)=>{if(i!==j&&a.distanceTo(b)<verts[0].length()*1.75)pts.push(a.clone().lerp(b,cut));}));return new ConvexGeometry(pts);}
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const OCTA=[V(1,0,0),V(-1,0,0),V(0,1,0),V(0,-1,0),V(0,0,1),V(0,0,-1)];
const TETRA=[V(1,1,1),V(1,-1,-1),V(-1,1,-1),V(-1,-1,1)].map(v=>v.multiplyScalar(.58));
const CUBO=(()=>{const p=[];for(const[a,b]of[[1,1],[1,-1],[-1,1],[-1,-1]])p.push(V(a,b,0),V(a,0,b),V(0,a,b));return p.map(v=>v.multiplyScalar(.5));})();
function hexPlate(r,h,bevel){const s=new THREE.Shape();for(let i=0;i<6;i++){const a=i/6*Math.PI*2;s[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,steps:1});g.translate(0,0,-h/2);g.rotateX(Math.PI/2);return g;}

export function createStage(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'default'});
  renderer.setClearColor(0x050506);renderer.autoClear=false;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(new RoomEnvironment(),.04).texture;pmrem.dispose();

  // Background passes.
  const bgMat=new THREE.ShaderMaterial({vertexShader:quadVert,fragmentShader:bgFrag,depthTest:false,depthWrite:false,
    uniforms:{uRes:{value:new THREE.Vector2(1,1)},uDepth:{value:0},uScale:{value:SCALE},uB:{value:LAYERS.map(l=>l.from)},uP:{value:LAYERS.flatMap(l=>l.pal.map(hex))},uLight:{value:new THREE.Vector2(.5,.5)},uLamp:{value:1}}});
  const blitMat=new THREE.ShaderMaterial({vertexShader:quadVert,fragmentShader:blitFrag,depthTest:false,depthWrite:false,uniforms:{tBg:{value:null},uBlur:{value:0}}});
  const quad=new THREE.PlaneGeometry(2,2),bgScene=new THREE.Scene(),blitScene=new THREE.Scene(),flat=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  bgScene.add(new THREE.Mesh(quad,bgMat));blitScene.add(new THREE.Mesh(quad,blitMat));
  let target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false});blitMat.uniforms.tBg.value=target.texture;

  // Specimen scene: studio lighting plus a warm bounce from the rock below.
  const scene=new THREE.Scene();scene.environment=env;
  const camera=new THREE.PerspectiveCamera(28,1,.1,50);camera.position.set(0,0,7);
  const key=new THREE.DirectionalLight(0xfff0dc,1.6);key.position.set(-3,4,5);
  const rim=new THREE.DirectionalLight(0x9fb4ff,1.3);rim.position.set(4,-1,-3);
  const bounce=new THREE.DirectionalLight(0xff9a5a,.45);bounce.position.set(.5,-4,2);
  scene.add(key,rim,bounce,new THREE.AmbientLight(0xffffff,.12));
  const holder=new THREE.Group();scene.add(holder);

  const metal=(color,rough,kind,opts,extra={})=>surface(new THREE.MeshPhysicalMaterial({color,metalness:1,roughness:rough,envMapIntensity:1.2,...extra}),kind,opts);
  const rockMat=(a,opts={})=>surface(new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.9,metalness:0,envMapIntensity:.4,...opts.extra}),KIND.rock,{a,b:'#cfc8bc',c:'#151312',scale:24,bump:.006,...opts});
  const rock=(r,seed,a,o={})=>new THREE.Mesh(lump(r,5,seed,{amp:.16,cuts:4,...o}),rockMat(a));
  const builders={
    pyrite(){const g=new THREE.Group(),m=metal('#d8c278',.16,KIND.striate,{b:'#9c7a3c',scale:26,bump:.0035});
      const base=rock(.8,3,'#3c3833');base.scale.set(1.4,.48,1.05);base.position.y=-.78;g.add(base);
      for(const[s,x,y,z,rx,ry,rz]of[[.95,0,0,0,.18,.52,.05],[.6,.55,.36,.12,.72,.1,.3],[.46,-.52,.42,-.22,.3,.92,-.2],[.36,.22,-.52,.48,1.1,.42,.6],[.24,-.62,-.32,.3,.4,.2,.9]]){const c=new THREE.Mesh(new RoundedBoxGeometry(s,s,s,3,s*.04),m);c.position.set(x,y,z);c.rotation.set(rx,ry,rz);g.add(c);}
      return g;},
    magnetite(){const g=new THREE.Group(),m=metal('#2e2e33',.3,KIND.faces,{scale:9,bump:.008});
      const base=rock(.9,7,'#3a3631');base.scale.set(1.3,.55,1);base.position.y=-.58;g.add(base);
      const geo=chamfered(OCTA,.08);for(const[s,x,y,z,r]of[[.78,0,.22,0,.3],[.46,-.72,-.08,.2,.9],[.4,.66,-.12,.3,1.6],[.28,.26,-.2,.72,.4],[.2,-.36,-.22,-.6,1.1]]){const o=new THREE.Mesh(geo,m);o.scale.setScalar(s);o.position.set(x,y,z);o.rotation.set(r,r*.7,r*.3);g.add(o);}return g;},
    pyrrhotite(){const g=new THREE.Group(),m=metal('#a7834f',.36,KIND.tarnish,{b:'#4a5a8a',c:'#7a4a6a',scale:2.4,bump:.01});
      const base=rock(.8,13,'#3b3632');base.scale.set(1.35,.5,1);base.position.y=-.72;g.add(base);
      const R=rng(4);for(let i=0;i<7;i++){const r=.42+R()*.32,plate=new THREE.Mesh(hexPlate(r,.09+R()*.06,.025),m);const a=i/7*Math.PI*2+R()*.3;plate.position.set(Math.cos(a)*.18,-.15+R()*.35,Math.sin(a)*.18);plate.rotation.set(.5+R()*.6,a,(R()-.5)*.6);g.add(plate);}
      return g;},
    pentlandite(){const m=metal('#ffffff',.34,KIND.grains,{a:'#e3cd92',b:'#8c6a3e',scale:4.2,bump:.015});
      const ore=new THREE.Mesh(lump(1,5,11,{amp:.12,freq:1.2,cuts:6,cutDepth:.58}),m);ore.scale.set(1.15,.92,1);return new THREE.Group().add(ore);},
    chalcopyrite(){const g=new THREE.Group(),m=metal('#cba63e',.22,KIND.tarnish,{b:'#3d5aa8',c:'#8a3f8a',scale:2,bump:.008});
      const base=rock(.75,21,'#3e3934');base.scale.set(1.3,.5,1);base.position.y=-.64;g.add(base);
      const geo=chamfered(TETRA,.1);geo.scale(1,.82,1);
      for(const[s,x,y,z,a,b]of[[1.05,0,.1,0,.5,.3],[.66,-.64,-.18,.3,2.1,1],[.58,.68,-.14,.12,1.2,2.4],[.44,.18,-.22,.72,.9,1.7],[.38,-.3,-.25,-.56,2.6,.4]]){const t=new THREE.Mesh(geo,m);t.scale.setScalar(s);t.position.set(x,y,z);t.rotation.set(a,b,a*.5);g.add(t);}return g;},
    millerite(){const g=new THREE.Group();const base=rock(.75,31,'#3b3733',{cuts:3});base.scale.set(1.45,.55,1.1);base.position.y=-.72;g.add(base);
      const geo=new THREE.CylinderGeometry(.0025,.011,1,6,1);geo.translate(0,.5,0);const count=260,inst=new THREE.InstancedMesh(geo,metal('#d4bc60',.2,KIND.needle,{bump:.004}),count),R=rng(9),o=new THREE.Object3D(),up=V(0,1,0);
      const sprays=[[V(-.12,-.5,0),1],[V(.38,-.56,.18),.75],[V(-.5,-.6,-.15),.6]];
      for(let i=0;i<count;i++){const[c,len]=sprays[i%3];const th=R()*Math.PI*2,ph=Math.pow(R(),.8)*1.2;o.position.copy(c).add(V((R()-.5)*.1,0,(R()-.5)*.1));
        o.quaternion.setFromUnitVectors(up,V(Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th)));o.scale.set(.7+R()*.6,len*(.55+R()*.8),.7+R()*.6);o.updateMatrix();inst.setMatrixAt(i,o.matrix);}
      g.add(inst);return g;},
    sperrylite(){const g=new THREE.Group();const base=rock(.9,41,'#3a3530',{cuts:5});base.scale.set(1.3,.62,1.05);base.position.y=-.4;g.add(base);
      const geo=chamfered(CUBO,.06),m=metal('#e6e9ee',.06,KIND.faces,{scale:12,bump:.004}),R=rng(3);
      for(let i=0;i<14;i++){const c=new THREE.Mesh(geo,m),s=i<2?.55-i*.15:.12+R()*.22;c.scale.setScalar(s);const n=V(R()-.5,.55+R()*.6,R()-.5).normalize();c.position.copy(n.multiplyScalar(.82)).add(V(0,-.36,0));c.position.x*=1.25;c.rotation.set(R()*3,R()*3,R()*3);g.add(c);}return g;},
    froodite(){const g=new THREE.Group();const base=rock(1,51,'#2d2a27',{cuts:5,amp:.1});g.add(base);
      const R=rng(17),m=metal('#b8b8be',.16,KIND.faces,{scale:10,bump:.004}),geo=chamfered(OCTA,.2);
      for(let i=0;i<40;i++){const c=new THREE.Mesh(geo,m);c.scale.setScalar(.035+R()*.07);const n=V(R()-.5,R()-.2,R()-.5).normalize();c.position.copy(n.multiplyScalar(.9));c.rotation.set(R()*3,R()*3,0);g.add(c);}return g;},
    gold(){const g=new THREE.Group(),m=metal('#f0bf48',.14,KIND.pitted,{scale:5,bump:.02});
      const n=new THREE.Mesh(lump(.95,5,61,{amp:.26,freq:1.1}),m);n.scale.set(1.2,.78,.9);g.add(n);
      const R=rng(8);for(let i=0;i<4;i++){const f=new THREE.Mesh(lump(.2,3,70+i,{amp:.35}),m);f.position.set((R()-.5)*2.4,-.72+R()*.3,(R()-.5)*1.2);g.add(f);}return g;},
    cone(){const g=new THREE.Group();const geo=indexed(new THREE.ConeGeometry(.85,1.9,128,40));
      const p=geo.attributes.position,v=new THREE.Vector3(),col=new Float32Array(p.count*3),c=new THREE.Color(),base=hex('#8a8279');
      for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const a=Math.atan2(v.z,v.x),k=Math.max(0,(.95-v.y)/1.9),ridge=Math.abs(Math.sin(a*22+v.y*1.8+Math.sin(a*5)*.8));
        const s=1+ridge*.1*k-Math.sin(a*7+v.y*2.2)*.04*k;if(v.y>-.94){v.x*=s;v.z*=s;}p.setXYZ(i,v.x,v.y,v.z);c.copy(base).multiplyScalar(.45+.75*ridge);col.set([c.r,c.g,c.b],i*3);}
      geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.computeVertexNormals();
      const cone=new THREE.Mesh(geo,rockMat('#6a625a',{extra:{vertexColors:true},scale:11}));const back=rock(1.05,81,'#4a443e');back.position.set(0,-.65,-.45);back.scale.set(1.15,.7,.6);g.add(back,cone);g.rotation.z=-.22;return g;},
    loader(){
      // A battery-electric load-haul-dump loader: two articulated frames, bucket up front, battery pack behind.
      const g=new THREE.Group(),paint=surface(new THREE.MeshPhysicalMaterial({color:'#e2a31c',metalness:.3,roughness:.42,clearcoat:.35,clearcoatRoughness:.5,envMapIntensity:.9}),KIND.faces,{scale:3,bump:.002});
      const dark=new THREE.MeshStandardMaterial({color:'#2b2927',roughness:.62,metalness:.55,envMapIntensity:.8}),steel=metal('#8f8b85',.42,KIND.faces,{scale:5,bump:.003});
      const tire=surface(new THREE.MeshStandardMaterial({color:'#161514',roughness:.95}),KIND.needle,{bump:.004}),lamp=new THREE.MeshStandardMaterial({color:'#fff2d0',emissive:'#ffd58a',emissiveIntensity:2.2});
      const box=(w,h,d,m,x,y,z,r=.04)=>{const b=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,r),m);b.position.set(x,y,z);g.add(b);return b;};
      box(1.15,.42,.86,paint,.62,.34,0);box(.78,.2,.8,dark,.72,.65,0,.03);for(let i=0;i<4;i++)box(.04,.06,.82,steel,.4+i*.18,.78,0,.01);
      box(.8,.3,.8,paint,-.48,.34,0);const pin=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.5,20),steel);pin.position.set(.06,.36,0);g.add(pin);
      box(.34,.3,.3,dark,.12,.62,.27);box(.44,.04,.4,paint,.12,.82,.27,.015);for(const[x,z]of[[-.06,.1],[.3,.1],[-.06,.44],[.3,.44]]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.22,8),steel);p.position.set(x,.7,z);g.add(p);}
      for(const z of[-.33,.33]){const arm=box(.78,.1,.1,paint,-.92,.48,z,.02);arm.rotation.z=-.32;}
      const s=new THREE.Shape();s.moveTo(0,0);s.lineTo(.62,0);s.lineTo(.7,.08);s.lineTo(.6,.46);s.lineTo(.5,.5);s.lineTo(.46,.12);s.lineTo(.05,.08);s.closePath();
      const bucket=new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth:.96,bevelEnabled:true,bevelThickness:.015,bevelSize:.015,bevelSegments:1}),steel);bucket.position.set(-1.92,.12,-.48);g.add(bucket);
      const wheel=new THREE.CylinderGeometry(.24,.24,.2,32),rim=new THREE.CylinderGeometry(.13,.13,.21,20);
      for(const[x,z]of[[.78,.5],[.78,-.5],[-.56,.5],[-.56,-.5]]){const t=new THREE.Mesh(wheel,tire),r=new THREE.Mesh(rim,dark);for(const m of[t,r]){m.rotation.x=Math.PI/2;m.position.set(x,.24,z);g.add(m);}}
      for(const z of[.16,.4])box(.03,.05,.07,lamp,-.03,.72,z,.01);for(const z of[-.3,.3])box(.03,.05,.08,lamp,-.88,.5,z,.01);
      g.position.set(.42,-.4,0);const wrap=new THREE.Group().add(g);wrap.scale.setScalar(.98);wrap.rotation.set(.22,0,0);return wrap;},
    teleop(){
      // Remote control: the 1993 teleoperated loader beside our robot, which spends two minutes of every match driven the same way.
      const g=new THREE.Group(),l=builders.loader();l.position.x=-.78;g.add(l);
      const slot=new THREE.Group();g.add(slot);
      withRobot(r=>{r.scale.multiplyScalar(.34);r.rotation.set(0,.9,0);r.updateMatrixWorld(true);
        const box=new THREE.Box3().setFromObject(r);r.position.set(1.55-(box.min.x+box.max.x)/2,-.36-box.min.y,.45-(box.min.z+box.max.z)/2);slot.add(r);});
      g.userData.size=.72;g.userData.narrow=.78;return g;},
    auto(){
      // Autonomous: our robot drives its own figure-eight across foam field tiles, leaving a trail.
      const g=new THREE.Group(),N=4,T=.62,tiles=new THREE.InstancedMesh(new RoundedBoxGeometry(T-.012,.05,T-.012,2,.01),new THREE.MeshStandardMaterial({color:'#2c2c30',roughness:.95,envMapIntensity:.45}),N*N),o=new THREE.Object3D();
      for(let i=0;i<N*N;i++){o.position.set((i%N-(N-1)/2)*T,-.025,(Math.floor(i/N)-(N-1)/2)*T);o.updateMatrix();tiles.setMatrixAt(i,o.matrix);}g.add(tiles);
      const path=t=>new THREE.Vector3(Math.sin(t)*.82,0,Math.sin(2*t)*.5),plan=[];for(let i=0;i<=200;i++)plan.push(path(i/200*Math.PI*2).setY(.004));
      const planLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(plan),new THREE.LineDashedMaterial({color:'#f2ede6',transparent:true,opacity:.35,dashSize:.05,gapSize:.04}));planLine.computeLineDistances();g.add(planLine);
      const TRAIL=90,trail=new THREE.InstancedMesh(new THREE.CylinderGeometry(.022,.022,.004,12),new THREE.MeshBasicMaterial({color:'#ef3326',toneMapped:false}),TRAIL),mark=new THREE.Object3D();trail.frustumCulled=false;trail.count=0;g.add(trail);
      const bot=new THREE.Group();g.add(bot);withRobot(r=>{r.scale.multiplyScalar(.25);r.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(r);r.position.y-=box.min.y;bot.add(r);});
      let t=0;const hist=[];
      g.userData={baseX:.62,spinRate:.25,size:1.05,tick(dt){t+=dt*.42;const p=path(t),n=path(t+.01);bot.position.copy(p);bot.rotation.y=Math.atan2(n.x-p.x,n.z-p.z)+ROBOT_FORWARD;
        hist.unshift(p.clone().setY(.006));if(hist.length>TRAIL)hist.pop();trail.count=hist.length;hist.forEach((q,i)=>{mark.position.copy(q);mark.scale.setScalar(Math.max(.05,1-i/TRAIL));mark.updateMatrix();trail.setMatrixAt(i,mark.matrix);});trail.instanceMatrix.needsUpdate=true;}};
      return g;},
    snolab(){const g=new THREE.Group();const R=1.05;
      g.add(new THREE.Mesh(new THREE.SphereGeometry(R*.96,64,48),new THREE.MeshPhysicalMaterial({color:'#9cc7d8',roughness:.05,metalness:0,transparent:true,opacity:.18,envMapIntensity:1.6})));
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(R*1.12,2)),new THREE.LineBasicMaterial({color:'#c9b27a',transparent:true,opacity:.42})));
      const pts=new THREE.IcosahedronGeometry(R*1.1,4).attributes.position,seen=new Set(),pos=[];for(let i=0;i<pts.count;i++){const k=[pts.getX(i),pts.getY(i),pts.getZ(i)].map(n=>n.toFixed(3)).join();if(!seen.has(k)){seen.add(k);pos.push([pts.getX(i),pts.getY(i),pts.getZ(i)]);}}
      const inst=new THREE.InstancedMesh(new THREE.SphereGeometry(.028,10,8),new THREE.MeshStandardMaterial({color:'#e6a640',emissive:'#7a4510',emissiveIntensity:.5,roughness:.35,metalness:.5}),pos.length),o=new THREE.Object3D();
      pos.forEach(([x,y,z],i)=>{o.position.set(x,y,z);o.updateMatrix();inst.setMatrixAt(i,o.matrix);});g.add(inst);return g;},
  };

  // ---------- state ----------
  let current=null,leaving=null,want=null,depth=0,w=1,h=1,raf=0,running=true,last=performance.now(),spin=0,drag=null,velocity=0,tiltX=0,tiltY=0,ptr=[0,0];
  let bgDepth=NaN,bgDirty=true,blur=0,prevDepth=0,lampBase=[.5,.5],lamp=[.5,.5],lampPtr=[0,0],hovering=false;
  const cache={},build=key=>cache[key]||(cache[key]=builders[key]());
  let robotPromise=null;
  const ROBOT_FORWARD=0;
  const withRobot=fn=>loadRobot().then(r=>{if(r)fn(r.clone(true));bgDirty=true;});
  function loadRobot(){
    if(robotPromise)return robotPromise;
    robotPromise=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(__ROBOT__).then(gltf=>{
      const r=gltf.scene;finishRobot(r);const box=new THREE.Box3().setFromObject(r),size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
      r.position.sub(c);const wrap=new THREE.Group();wrap.add(r);wrap.scale.setScalar(2.05/Math.max(size.x,size.y,size.z));return wrap;
    }).catch(()=>null);
    return robotPromise;
  }
  function layout(){
    const aspect=w/h,wide=aspect>1.05,visH=2*camera.position.z*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),visW=visH*aspect;
    const nx=wide?Math.min(.16,Math.max(0,(1.9-aspect)*.3)):0,ny=wide?.02:.22,size=Math.min(visH*(wide?.25:.19),visW*(wide?.17:.3));
    holder.position.set(nx*visW/2,ny*visH/2,0);holder.scale.setScalar(size);lampBase=[.5+nx/2,.5+ny/2];
  }
  function resize(){
    w=canvas.clientWidth||innerWidth;h=canvas.clientHeight||innerHeight;const pr=Math.min(devicePixelRatio||1,w<700?1.5:1.25);
    renderer.setPixelRatio(pr);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    bgMat.uniforms.uRes.value.set(w,h);target.setSize(Math.round(w*pr),Math.round(h*pr));layout();bgDirty=true;
  }
  addEventListener('resize',resize);resize();
  function show(key){
    if(key===want)return;want=key;
    if(leaving){holder.remove(leaving.g);leaving.g.position.y=0;leaving=null;}
    if(current)leaving={g:current,t:0};
    current=null;
    if(key&&builders[key]){const g=build(key);if(leaving?.g===g)leaving=null;g.userData.t=0;g.scale.setScalar(.001);holder.add(g);current=g;}
    bgMat.uniforms.uLamp.value=key?1:.75;bgDirty=true;
  }
  const easeOut=t=>1-Math.pow(1-t,4);
  function loop(now){
    raf=running?requestAnimationFrame(loop):0;const dt=Math.min(.05,(now-last)/1000);last=now;
    // Lamp drifts toward the pointer on desktop, like a cap lamp following your gaze.
    const lx=lampBase[0]+lampPtr[0]*.12,ly=lampBase[1]-lampPtr[1]*.1;const lk=1-Math.exp(-dt*4);const nlx=lamp[0]+(lx-lamp[0])*lk,nly=lamp[1]+(ly-lamp[1])*lk;
    if(Math.abs(nlx-lamp[0])+Math.abs(nly-lamp[1])>.0004){lamp=[nlx,nly];bgDirty=true;}
    if(Math.abs(depth-bgDepth)>.004)bgDirty=true;
    const speed=Math.abs(depth-prevDepth)/Math.max(dt,.001);prevDepth=depth;const nb=reduced.matches?0:Math.min(.035,speed/SCALE*.02);const blurChanged=Math.abs(nb-blur)>.0002||(nb===0&&blur>0);blur+=(nb-blur)*.5;if(blur<.0004)blur=0;
    let animating=false;
    if(leaving){animating=true;leaving.t+=dt/(reduced.matches?.01:.45);const e=easeOut(Math.min(1,leaving.t));leaving.g.scale.setScalar(Math.max(.001,(1-e*.9)*(leaving.g.userData.size||1)));leaving.g.position.y=e*1.4;if(leaving.t>=1){holder.remove(leaving.g);leaving.g.position.y=0;leaving=null;}}
    if(current){animating=true;current.userData.t=Math.min(1,current.userData.t+dt/(reduced.matches?.01:.85));const t=Math.max(0,current.userData.t*1.2-.2),e=easeOut(t),cu=current.userData,fit=(cu.size||1)*(w/h<1.05?(cu.narrow||1):1);current.scale.setScalar(Math.max(.001,(.92*e+.08*e*e)*fit));
      if(!drag){velocity*=Math.pow(.92,dt*60);spin+=velocity*dt+(reduced.matches?0:dt*.15);}
      const u=current.userData;u.tick?.(dt);current.rotation.y=spin*(u.spinRate??1)-1.2*(1-easeOut(t));tiltX+=(ptr[1]*.18-tiltX)*.06;tiltY+=(ptr[0]*.25-tiltY)*.06;current.rotation.x=tiltX+(u.baseX||0);current.position.y=-(1-e)*1.1+(reduced.matches?0:Math.sin(now/1400)*.04);holder.rotation.y=tiltY;}
    // Skip the frame entirely when nothing on screen has changed.
    if(!bgDirty&&!animating&&!blurChanged&&!blur)return;
    if(bgDirty){bgMat.uniforms.uDepth.value=depth;bgMat.uniforms.uLight.value.set(lamp[0],lamp[1]);renderer.setRenderTarget(target);renderer.render(bgScene,flat);renderer.setRenderTarget(null);bgDepth=depth;bgDirty=false;}
    blitMat.uniforms.uBlur.value=blur;renderer.clear();renderer.render(blitScene,flat);
    if(current||leaving){renderer.clearDepth();renderer.render(scene,camera);}
  }
  raf=requestAnimationFrame(loop);
  // Mouse: the specimen leans toward the pointer and can be spun by dragging (sideways on touch).
  addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){ptr=[e.clientX/innerWidth*2-1,e.clientY/innerHeight*2-1];lampPtr=ptr;}if(drag&&drag.id===e.pointerId){const dx=e.clientX-drag.x;drag.x=e.clientX;spin+=dx*.01;velocity=dx*.6;}},{passive:true});
  addEventListener('pointerdown',e=>{if(e.button!==0||!current||e.target.closest('a,button,input,select,textarea,.site-header,.site-footer'))return;drag={x:e.clientX,id:e.pointerId};document.documentElement.classList.add('mx-dragging');});
  const end=()=>{drag=null;document.documentElement.classList.remove('mx-dragging');};addEventListener('pointerup',end);addEventListener('pointercancel',end);
  document.addEventListener('visibilitychange',()=>{running=!document.hidden;if(running&&!raf){last=performance.now();bgDirty=true;raf=requestAnimationFrame(loop);}});

  // Build every specimen and compile its shaders during idle time, in story order,
  // so arriving at a scene never stalls on geometry or shader compilation.
  const queue=STORY.filter(s=>s.key&&!['teleop','auto'].includes(s.key)).map(s=>s.key).concat(['loader']),idle=window.requestIdleCallback||(f=>setTimeout(()=>f({timeRemaining:()=>8}),60));
  const warm=new THREE.Scene();warm.environment=env;warm.add(key.clone(),rim.clone(),bounce.clone());
  function prewarm(deadline){
    while(queue.length&&deadline.timeRemaining()>6){const k=queue.shift();const g=build(k);if(g.parent)continue;warm.add(g);
      const done=()=>{warm.remove(g);};renderer.compileAsync?renderer.compileAsync(warm,camera).then(done,done):(renderer.compile(warm,camera),done());}
    if(queue.length)idle(prewarm,{timeout:1500});
  }
  idle(prewarm,{timeout:1500});
  return{setDepth(d){depth=d;},show,resize,preload(key){if(key==='robot')loadRobot();}};
}
