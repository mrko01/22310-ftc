// Minex page entry: site chrome, the landing page and launching the game.
import {initChrome,initMagnetic} from '../chrome.js';
import {MINERALS,ZONES,mineralIndex} from './data.js';
import {createGame,loadSave,fmtDepth} from './game.js';
import {createUI,openSheet,mineralDetailHTML,paintSpecimens,paintSwatches,closeSheet} from './ui.js';
import {createStrata} from './strata.js';
import {sound} from './audio.js';

const html=document.documentElement;html.classList.remove('no-js');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
initChrome();initMagnetic();

// ---------- reveal on scroll ----------
if(!reduced.matches&&'IntersectionObserver' in window){
  html.classList.add('motion-ready');
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target);}}),{threshold:.12,rootMargin:'0px 0px -6% 0px'});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
}
requestAnimationFrame(()=>html.classList.add('mx-loaded'));

// ---------- strata background + depth readout ----------
const depthBar=document.querySelector('.mx-depthbar'),depthText=depthBar?.querySelector('[data-page-depth]'),zoneText=depthBar?.querySelector('[data-page-zone]');
const layerLinks=[...document.querySelectorAll('[data-layer-link]')];
let lastZone=-2;
const strata=createStrata(document.querySelector('.mx-strata'),{onDepth(d){
  if(!depthBar)return;depthText.textContent=fmtDepth(d)+' m';depthBar.classList.toggle('on',scrollY>innerHeight*.6);
  let k=-1;ZONES.forEach((z,i)=>{if(d>=z.from&&d>0)k=i;});
  if(k!==lastZone){lastZone=k;zoneText.textContent=k<0?'Surface':`${ZONES[k].num} · ${ZONES[k].name}`;layerLinks.forEach((a,i)=>a.classList.toggle('active',i===k));}
}});

// ---------- field guide on the page ----------
const cards=[...document.querySelectorAll('[data-mineral]')];
cards.forEach(c=>{const m=MINERALS[mineralIndex[c.dataset.mineral]];const bar=c.querySelector('.mx-spec-h i');if(bar){bar.style.left=((m.h[0]-1)/9*100)+'%';bar.style.width=Math.max(3,(m.h[1]-m.h[0])/9*100)+'%';}});
const paintIO='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){paintSpecimens(e.target);paintIO.unobserve(e.target);}}),{rootMargin:'200px'}):null;
cards.forEach(c=>paintIO?paintIO.observe(c):paintSpecimens(c));
function syncCollected(){const s=loadSave();cards.forEach(c=>c.classList.toggle('collected',!!s?.found?.m?.[c.dataset.mineral]));}
syncCollected();
cards.forEach(c=>c.addEventListener('click',()=>{const m=MINERALS[mineralIndex[c.dataset.mineral]];const s=loadSave();const body=openSheet(mineralDetailHTML(m,{count:s?.found?.m?.[m.key]||0}),{wide:true,kind:'entry'});paintSpecimens(body);paintSwatches(body);}));
const chips=[...document.querySelectorAll('[data-filter]')];
chips.forEach(ch=>ch.addEventListener('click',()=>{const f=ch.dataset.filter;chips.forEach(c=>c.setAttribute('aria-pressed',String(c===ch)));
  cards.forEach(c=>{const show=f==='all'||c.dataset.group===f;c.hidden=!show;});
  const live=document.querySelector('#mx-guide-count');if(live)live.textContent=`${cards.filter(c=>!c.hidden).length} minerals shown`;}));

// ---------- the game ----------
const root=document.querySelector('#minex-game');
let game=null,ui=null,opener=null,pushed=false;
function playLabel(){const s=loadSave();document.querySelectorAll('[data-play-label]').forEach(el=>{el.textContent=s&&s.stats?.dug?`Continue · ${fmtDepth(s.deepest)} m`:el.dataset.playLabel;});}
playLabel();
function openGame(fromHistory){
  if(!root||!root.hidden)return;
  opener=document.activeElement;sound.unlock();strata.pause();
  root.hidden=false;html.classList.add('mx-playing');
  if(!ui){ui=createUI(root,{game:()=>game,exit:()=>closeGame()});game=createGame(root,ui);}
  game.start();
  if(!fromHistory){history.pushState({minex:'play'},'',location.pathname+location.search+'#play');pushed=true;}
  if(!game.state.intro)setTimeout(()=>ui.openIntro(),reduced.matches?0:350);
  root.querySelector('.mx-canvas').focus?.({preventScroll:true});
}
function closeGame(fromHistory){
  if(!root||root.hidden)return;
  closeSheet();game.stop();root.hidden=true;html.classList.remove('mx-playing');strata.resume();playLabel();syncCollected();
  if(!fromHistory&&pushed&&location.hash==='#play'){pushed=false;history.back();}
  else if(!fromHistory&&location.hash==='#play')history.replaceState(null,'',location.pathname+location.search);
  opener?.focus?.({preventScroll:true});
}
document.querySelectorAll('[data-play]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();openGame();}));
addEventListener('popstate',()=>{if(location.hash==='#play')openGame(true);else closeGame(true);});
if(location.hash==='#play')openGame(true);
