// Minex: scroll is depth. Each scene is one stop on the way down.
import {initChrome} from '../chrome.js';
import {LAYERS,layerAt} from './data.js';

const html=document.documentElement;html.classList.remove('no-js');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
initChrome();

const scenes=[...document.querySelectorAll('.mx-scene')];
const depths=scenes.map(s=>+s.dataset.depth);
const num=document.querySelector('[data-depth]'),sky=document.querySelector('.mx-sky'),rail=document.querySelector('.mx-rail'),marks=rail.querySelector('[data-marks]'),fill=rail.querySelector('.mx-rail-fill'),now=rail.querySelector('.mx-rail-now');
const MAX=3000,fmt=d=>Math.round(Math.max(0,d)).toLocaleString('en-CA').replace(/,/g,' ');

// Depth for the current scroll position, interpolated between the two nearest scenes.
function targetDepth(){
  const y=scrollY;let i=0;while(i<scenes.length-1&&scenes[i+1].offsetTop<=y)i++;
  if(i>=scenes.length-1)return depths[depths.length-1];
  const a=scenes[i].offsetTop,b=scenes[i+1].offsetTop,f=Math.max(0,Math.min(1,(y-a)/(b-a||1)));
  return depths[i]+(depths[i+1]-depths[i])*f;
}
const activeIndex=()=>{const mid=scrollY+innerHeight*.5;let i=0;scenes.forEach((s,k)=>{if(s.offsetTop<=mid)i=k;});return i;};

// Rail marks appear only for what you have already passed: no spoilers.
const passed=new Map();
function mark(id,depth,label,kind){
  if(passed.has(id))return;const m=document.createElement('span');m.className='mx-mark mx-mark-'+kind;m.style.top=(Math.max(0,depth)/MAX*100)+'%';m.innerHTML=`<i></i><b></b>`;m.querySelector('b').textContent=label;marks.append(m);passed.set(id,m);requestAnimationFrame(()=>m.classList.add('in'));
}
function syncMarks(d){
  LAYERS.forEach(l=>{if(d>=l.from+1)mark('l-'+l.id,l.from,l.name,'layer');});
  const active=d>=1?passed.get('l-'+layerAt(d).id):null;
  passed.forEach(m=>m.classList.toggle('on',m===active));
}

let stage=null,shown=-1,depth=depths[0],last=performance.now(),started=false;
const robotAt=scenes.findIndex(s=>s.dataset.specimen==='robot'),mines=document.querySelector('.mx-shafts');
mines?.pauseAnimations?.();
function show(i){
  if(i===shown)return;shown=i;
  scenes.forEach((s,k)=>s.classList.toggle('is-on',k===i));
  stage?.show(scenes[i].dataset.specimen||null);
  // Fetch the robot model a few stops early; animate the shafts only while they are on screen.
  if(robotAt>=0&&i>=robotAt-3)stage?.preload('robot');
  if(mines){const on=scenes[i].contains(mines)&&!reduced.matches;on?mines.unpauseAnimations():mines.pauseAnimations();}
  if(i>0&&!started){started=true;html.classList.add('mx-started');}
  html.classList.toggle('mx-below',i>0);
}
let drawn=NaN,skyH=sky.offsetHeight,vh=innerHeight;
addEventListener('resize',()=>{skyH=sky.offsetHeight;vh=innerHeight;drawn=NaN;});
function tick(t){
  requestAnimationFrame(tick);
  const dt=Math.min(.1,(t-last)/1000);last=t;
  const target=targetDepth();depth=reduced.matches||Math.abs(target-depth)<.02?target:depth+(target-depth)*(1-Math.exp(-dt*7));
  show(activeIndex());
  if(depth===drawn)return;drawn=depth;
  num.textContent=fmt(depth);
  const p=Math.max(0,Math.min(1,depth/MAX));fill.style.transform=`scaleY(${p})`;now.style.top=(p*100)+'%';
  syncMarks(depth);
  // Keep the skyline standing on the shader's ground line; its layers drift apart for depth.
  const ground=vh*(.5-depth/72),gone=ground<-40;sky.classList.toggle('gone',gone);
  if(!gone){sky.style.transform=`translate3d(0,${Math.round(ground-skyH)}px,0)`;sky.style.setProperty('--sh',Math.max(0,vh*(.5+16/72)-ground).toFixed(1));}
  stage?.setDepth(depth);
}
requestAnimationFrame(tick);

// WebGL loads after first paint; without it the page still reads top to bottom.
const canvas=document.querySelector('.mx-stage');
const load=()=>import('./stage.js').then(m=>{try{stage=m.createStage(canvas);stage.setDepth(depth);shown=-1;html.classList.add('mx-gl');}catch{html.classList.add('mx-nogl');}}).catch(()=>html.classList.add('mx-nogl'));
'requestIdleCallback' in window?requestIdleCallback(load,{timeout:600}):setTimeout(load,120);
requestAnimationFrame(()=>html.classList.add('mx-ready'));
