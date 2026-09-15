const story=document.querySelector('.home-journey');
if(story){
 const canvas=document.querySelector('#spark-field'),ctx=canvas.getContext('2d'),chapters=[...document.querySelectorAll('[data-chapter]')],dots=[...document.querySelectorAll('.story-progress span')],mascot=document.querySelector('.mascot-stage');
 let width=0,height=0,progress=0,target=0,last=0,pointerX=0,pointerY=0;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)'),clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
 const resize=()=>{const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,1.5);width=r.width;height=r.height;canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);};new ResizeObserver(resize).observe(canvas);
 function scroll(){target=clamp(story.scrollTop/Math.max(1,story.scrollHeight-story.clientHeight));}story.addEventListener('scroll',scroll,{passive:true});addEventListener('resize',scroll);scroll();
 mascot.addEventListener('wheel',e=>{story.scrollBy({top:e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?story.clientHeight:1),behavior:'instant'});e.preventDefault();},{passive:false});
 story.addEventListener('pointermove',e=>{pointerX=(e.clientX/innerWidth-.5)*14;pointerY=(e.clientY/innerHeight-.5)*10;},{passive:true});
 // Deterministic ember field: a loose cloud resolves into five gently orbiting streams.
 let seed=22310;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const particles=Array.from({length:innerWidth<700?480:950},(_,i)=>({u:rand(),v:rand(),depth:rand(),size:rand(),angle:rand()*Math.PI*2,arm:i%5,phase:rand()*6.28}));
 function frame(time){requestAnimationFrame(frame);if(document.hidden||time-last<30)return;last=time;const paused=reduced.matches||document.documentElement.classList.contains('pause-all');progress+=(target-progress)*.085;story.dataset.progress=String(progress);const p=paused?0:progress,seconds=paused?0:time*.00004;
  ctx.clearRect(0,0,width,height);ctx.fillStyle='#f8f7f3';ctx.fillRect(0,0,width,height);
  const cx=width*(.76+.035*Math.sin(p*6.28)),cy=height*(.51+.04*Math.sin(p*3)),radius=Math.max(width,height)*.65;
  const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,radius);glow.addColorStop(0,`rgba(239,147,66,${.12+p*.06})`);glow.addColorStop(.43,'rgba(243,200,159,.05)');glow.addColorStop(1,'rgba(248,247,243,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
  for(const pt of particles){const d=.25+pt.depth*.75,swirl=pt.angle+seconds*(.15+d*.1)+p*2.1;const ringR=(.12+pt.u*.85)*Math.min(width,height)*.78;const ringA=pt.arm*1.256+pt.u*5+seconds*.3+p*1.8;
   const cloudX=(pt.u-.5)*width*1.6,cloudY=(pt.v-.5)*height*1.7;
   const spiralX=Math.cos(ringA)*ringR,spiralY=Math.sin(ringA)*ringR*.6;
   const mix=clamp(p*1.6);let x=cx+cloudX*(1-mix)+spiralX*mix+Math.sin(swirl)*25*d+pointerX*d,y=cy+cloudY*(1-mix)+spiralY*mix+Math.cos(swirl)*20*d+pointerY*d;
   const zoom=1+p*.32;x=cx+(x-cx)*zoom;y=cy+(y-cy)*zoom;if(x<0||x>width||y<0||y>height)continue;
   const size=(.4+pt.size*1.55)*d*(1+p*.5),a=(.25+pt.depth*.5)*(0.8+.2*Math.sin(seconds*20+pt.phase));
   if(pt.size>.9){const g=ctx.createRadialGradient(x,y,0,x,y,size*9);g.addColorStop(0,`rgba(238,132,47,${a*.26})`);g.addColorStop(1,'rgba(244,153,77,0)');ctx.fillStyle=g;ctx.fillRect(x-size*9,y-size*9,size*18,size*18);}
   ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fillStyle=pt.arm===0?`rgba(118,130,115,${a*.5})`:`rgba(207,${90+Math.round(pt.depth*35)},${28+Math.round(pt.depth*25)},${a*.75})`;ctx.fill();
  }
 }
 resize();requestAnimationFrame(frame);
}
