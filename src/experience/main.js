import {clamp,chapters,chapterOpacity} from './timeline.mjs';

document.documentElement.classList.replace('no-js','js');
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
const panels=[...document.querySelectorAll('[data-chapter]')];
let progress=0,controller=null,raf=0,staticFallback=false,scenePromise=null,generation=0,pageActive=true;
window.__SAFFRON_QA__={state:'loading',progress:0,frames:0,fieldLoaded:false,robotLoaded:false,errors:[],source:'local prototype'};
document.body.dataset.renderState='loading';
const menu=document.querySelector('.menu-toggle');
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));document.querySelector('#site-navigation').classList.toggle('is-open',open);menu.textContent=open?'Close':'Menu';if(open)document.querySelector('#site-navigation a')?.focus()});
addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){menu.setAttribute('aria-expanded','false');document.querySelector('#site-navigation').classList.remove('is-open');menu.textContent='Menu';menu.focus()}});
function setReduced(){
  document.body.classList.toggle('reduced-motion',motionPreference.matches||staticFallback);
  if(motionPreference.matches||staticFallback){
    generation++;controller?.dispose();controller=null;
    if(!staticFallback){document.body.dataset.renderState='static';window.__SAFFRON_QA__.state='reduced-motion'}
  }else if(!controller){startScene()}
  schedule();
}
function update(){
  raf=0;const travel=document.querySelector('#experience').offsetHeight-innerHeight;
  progress=clamp(scrollY/Math.max(1,travel));
  if(!motionPreference.matches&&!staticFallback){
    panels.forEach((panel,i)=>{
      const alpha=chapterOpacity(chapters[i],progress),active=alpha>.025;
      panel.style.opacity=alpha.toFixed(4);panel.classList.toggle('is-active',active);
      panel.inert=!active;panel.setAttribute('aria-hidden',String(!active));
      panel.style.transform=`translateY(${(1-alpha)*12}px)`;
    });
  }else{panels.forEach(panel=>{panel.inert=false;panel.removeAttribute('aria-hidden')})}
  controller?.setProgress(progress);window.__SAFFRON_QA__.progress=progress;
}
function schedule(){if(!raf)raf=requestAnimationFrame(update)}
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);
for(const link of document.querySelectorAll('[data-progress]'))link.addEventListener('click',event=>{
  event.preventDefault();
  if(motionPreference.matches||staticFallback){document.querySelector(link.getAttribute('href'))?.scrollIntoView({behavior:'instant'});return}
  scrollTo({top:Number(link.dataset.progress)*(document.querySelector('#experience').offsetHeight-innerHeight),behavior:'smooth'});
});
function startScene(){
  if(controller||scenePromise||!pageActive||motionPreference.matches||staticFallback)return;
  const requestGeneration=generation;
  const current=()=>requestGeneration===generation&&pageActive&&!motionPreference.matches&&!staticFallback;
  document.body.dataset.renderState='loading';
  scenePromise=(async()=>{
    const {createScene}=await import('./scene.js');
    if(!current())return;
    const created=await createScene(document.querySelector('#scene'),{onFallback:()=>{if(current())enterFallback()},onReady:()=>{if(current())document.body.dataset.renderState='webgl'}});
    if(!current()){created.dispose();return;}
    controller=created;
    controller.setProgress(progress);
  })().catch(error=>{
    if(current()){window.__SAFFRON_QA__.errors.push(String(error));enterFallback();console.warn('Saffron scene fallback:',error)}
  }).finally(()=>{
    scenePromise=null;
    // A preference change can invalidate the pending load. Complete its cleanup
    // before starting again, so there is only one renderer and control set.
    if(!controller)startScene();
  });
}
function enterFallback(){staticFallback=true;document.body.dataset.renderState='fallback';window.__SAFFRON_QA__.state='fallback';setReduced()}
motionPreference.addEventListener('change',setReduced);setReduced();update();
addEventListener('pagehide',()=>{pageActive=false;generation++;controller?.dispose();controller=null;});
// A back/forward-cache restore keeps this document and its disposed canvas.
// Recreate the scene at the retained scroll position when the visitor returns.
addEventListener('pageshow',event=>{pageActive=true;if(event.persisted){setReduced();schedule();}});
