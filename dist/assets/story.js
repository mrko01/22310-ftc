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
 mascot.addEventListener('wheel',e=>{story.scrollBy({top:e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?story.clientHeight:1),behavior:'instant'});e.preventDefault();},{passive:false});
}
