const story=document.querySelector('.home-journey');
if(story){
 const mascot=document.querySelector('.mascot-stage');
 const clamp=(v)=>Math.min(1,Math.max(0,v));
 const panels=[...story.querySelectorAll(':scope > .journey-panel,:scope > .section,:scope > .cta')];
 function scroll(){
  let index=0;
  while(index<panels.length-1&&story.scrollTop>=panels[index+1].offsetTop)index++;
  const span=index<panels.length-1?panels[index+1].offsetTop-panels[index].offsetTop:panels[index].offsetHeight;
  story.dataset.chapter=String(index+clamp(((story.scrollTop-panels[index].offsetTop)/span-.5)/.5));
 }
 story.addEventListener('scroll',scroll,{passive:true});addEventListener('resize',scroll);scroll();
 // Treat a trackpad's momentum tail as part of the original gesture, so it
 // cannot advance again halfway through a smooth section transition.
 let lastWheel=-Infinity,lockedUntil=0,consumed=false,accumulated=0;
 function stops(){
  const max=story.scrollHeight-story.clientHeight;
  const padding=parseFloat(getComputedStyle(story).scrollPaddingTop)||0;
  const starts=[0,...panels.slice(1).map(p=>Math.max(0,p.offsetTop-padding)),...story.querySelectorAll(':scope > footer')].map(p=>typeof p==='number'?p:Math.max(0,p.offsetTop-padding));
  starts.push(max);
  const result=[];
  for(let i=0;i<starts.length;i++){
   const start=Math.min(max,starts[i]);
   if(!result.length||start>result.at(-1)+2)result.push(start);
   const end=Math.min(max,starts[i+1]??max);
   // Long sections remain readable: add overlapping viewport-sized steps.
   for(let y=start+story.clientHeight*.8;y<end-story.clientHeight*.35;y+=story.clientHeight*.8)result.push(y);
  }
  return result;
 }
 function advance(direction){
  const points=stops(),current=story.scrollTop;
  const target=direction>0?points.find(y=>y>current+8):points.findLast(y=>y<current-8);
  if(target!==undefined)story.scrollTo({top:target,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
 }
 function wheel(e){
  if(e.ctrlKey||e.metaKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
  e.preventDefault();
  const now=performance.now(),quiet=now-lastWheel>200;lastWheel=now;
  if(quiet&&now>=lockedUntil){consumed=false;accumulated=0;}
  if(consumed||now<lockedUntil)return;
  const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?story.clientHeight:1);
  if(Math.sign(delta)!==Math.sign(accumulated))accumulated=0;
  accumulated+=delta;
  if(Math.abs(accumulated)<32)return;
  advance(Math.sign(accumulated));consumed=true;lockedUntil=now+650;accumulated=0;
 }
 story.addEventListener('wheel',wheel,{passive:false});
 mascot.addEventListener('wheel',wheel,{passive:false});
 story.addEventListener('keydown',e=>{
  if(e.target.closest('input,textarea,select,button,[contenteditable="true"]'))return;
  if(e.key==='PageDown'||e.key==='PageUp'){e.preventDefault();advance(e.key==='PageDown'?1:-1);}
 });
}
