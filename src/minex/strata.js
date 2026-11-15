// The landing page's fixed background: the real Minex world, lit by a lamp
// that follows the pointer, scrolling deeper as the reader scrolls the page.
import {W,H,ROW_M,SEED,ROCKS,MINERALS,ZONES,rockIndex} from './data.js';
import {generate,unpackBits,hash} from './world.js';
import {tile,backwall} from './art.js';

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
export function createStrata(cvs,{onDepth}={}){
  const ctx=cvs.getContext('2d',{alpha:false});
  let world=generate(SEED),vw=0,vh=0,dpr=1,t=24,depth=0,target=0,raf=0,lamp={x:0,y:0,tx:0,ty:0},pointer=false,visible=true,time=0;
  function applyTunnels(){try{const s=JSON.parse(localStorage.getItem('minex-save-v1'));if(!s)return;const d=unpackBits(s.dug,W*H);for(let i=0;i<W*H;i++)if(d[i]){world.rock[i]=0;world.ore[i]=0;}}catch{}}
  applyTunnels();
  function resize(){vw=innerWidth;vh=innerHeight;dpr=Math.min(2,devicePixelRatio||1);cvs.width=Math.round(vw*dpr);cvs.height=Math.round(vh*dpr);t=Math.max(18,Math.ceil(vw/W));if(!pointer){lamp.tx=vw*.72;lamp.ty=vh*.42;lamp.x=lamp.tx;lamp.y=lamp.ty;}kick();}
  // Depth follows the layer blocks: each block maps its scroll range onto its layer's depths.
  const anchors=()=>[...document.querySelectorAll('[data-layer-from]')];
  function depthForScroll(){
    const mid=scrollY+vh*.5,blocks=anchors();if(!blocks.length)return 0;
    const first=blocks[0].getBoundingClientRect().top+scrollY;
    if(mid<first)return 40*Math.max(0,Math.min(1,(mid-vh)/Math.max(1,first-vh)));
    for(const b of blocks){const r=b.getBoundingClientRect(),top=r.top+scrollY,bot=top+r.height;if(mid<=bot){const p=Math.max(0,Math.min(1,(mid-top)/(bot-top)));return +b.dataset.layerFrom+p*(+b.dataset.layerTo-+b.dataset.layerFrom);}}
    return 3000;
  }
  function draw(){
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#050506';ctx.fillRect(0,0,vw,vh);
    const camY=depth/ROW_M-1-(vh/t)*.5+(depth<60?(1-depth/60)*(vh/t)*.12:0),px=Math.round(t*dpr),T=Math.ceil(t*dpr)/dpr;
    const offX=(vw-W*t)/2,y0=Math.floor(camY),y1=Math.ceil(camY+vh/t);
    const horizon=(0-camY)*t;
    if(horizon>0){const g=ctx.createLinearGradient(0,0,0,horizon);g.addColorStop(0,'#07080d');g.addColorStop(.6,'#17141d');g.addColorStop(.92,'#3c1c16');g.addColorStop(1,'#7a321b');ctx.fillStyle=g;ctx.fillRect(0,0,vw,horizon);
      for(let i=0;i<90;i++){const x=hash(i,1,4)*vw,y=hash(i,2,4)*horizon*.85;ctx.fillStyle=`rgba(242,237,230,${.12+.4*hash(i,3,4)})`;ctx.fillRect(x,y,1.2,1.2);}
      const glow=ctx.createRadialGradient(vw*.66,horizon,0,vw*.66,horizon,vw*.6);glow.addColorStop(0,'rgba(255,122,47,.35)');glow.addColorStop(1,'rgba(255,122,47,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,vw,horizon);
      ctx.fillStyle='#110e13';ctx.beginPath();ctx.moveTo(0,horizon);for(let x=0;x<=vw+16;x+=16)ctx.lineTo(x,horizon-t*(1.4+Math.sin(x/vw*9)*.5+Math.sin(x/vw*23)*.25));ctx.lineTo(vw,horizon);ctx.fill();
      // Superstack, headframe and the Big Nickel on the skyline.
      const sx=vw*.8,u=Math.min(t,34);ctx.fillStyle='#17131a';ctx.beginPath();ctx.moveTo(sx-u*.34,horizon);ctx.lineTo(sx-u*.17,horizon-u*10);ctx.lineTo(sx+u*.17,horizon-u*10);ctx.lineTo(sx+u*.34,horizon);ctx.fill();
      ctx.fillStyle=`rgba(239,51,38,${.5+.5*Math.sin(time*2.2)})`;ctx.beginPath();ctx.arc(sx,horizon-u*10.1,2.4,0,7);ctx.fill();
      const hx=vw*.3;ctx.strokeStyle='#26232a';ctx.lineWidth=Math.max(2,u*.1);ctx.beginPath();ctx.moveTo(hx-u*1.4,horizon);ctx.lineTo(hx,horizon-u*4.6);ctx.lineTo(hx+u*1.4,horizon);ctx.moveTo(hx-u*.9,horizon-u*1.5);ctx.lineTo(hx+u*.9,horizon-u*1.5);ctx.moveTo(hx-u*.5,horizon-u*3);ctx.lineTo(hx+u*.5,horizon-u*3);ctx.stroke();
      ctx.strokeStyle='#ef3326';ctx.lineWidth=Math.max(1.5,u*.07);ctx.beginPath();ctx.arc(hx,horizon-u*4.3,u*.36,0,7);ctx.stroke();
      const nx=vw*.12;ctx.fillStyle='#2a292e';ctx.beginPath();ctx.arc(nx,horizon-u*1.6,u*1.1,0,7);ctx.fill();ctx.strokeStyle='rgba(242,237,230,.18)';ctx.beginPath();ctx.arc(nx,horizon-u*1.6,u*.92,0,7);ctx.stroke();
      ctx.fillStyle='#0a090c';for(let x=0;x<vw;x+=u*.55){const h=u*(.7+hash(Math.round(x),7,2)*1.1);ctx.beginPath();ctx.moveTo(x,horizon-h);ctx.lineTo(x+u*.2,horizon);ctx.lineTo(x-u*.2,horizon);ctx.fill();}
    }
    for(let y=Math.max(0,y0);y<=Math.min(H-1,y1);y++){const sy=(y-camY)*t;
      for(let sx=offX-Math.ceil(offX/t)*t,c=-Math.ceil(offX/t);sx<vw;sx+=t,c++){const x=((c%W)+W)%W,i=y*W+x,r=world.rock[i];
        if(r){const rock=ROCKS[r],o=world.ore[i],m=o?MINERALS[o]:null;ctx.drawImage(tile(rock,m,px,(hash(x,y,3)*4)|0,rock.key+(m?'+'+m.key:'')),sx,sy,T,T);}
        else{const zr=ROCKS[rockIndex[ZONES[world.zone[i]].rock]];ctx.drawImage(backwall(zr,px,(hash(x,y,4)*3)|0,zr.key),sx,sy,T,T);}}}
    // Darkness with a lamp: what you see is what your cap lamp reaches.
    const top=Math.max(0,horizon);
    if(top<vh){ctx.fillStyle='rgba(4,4,6,.8)';ctx.fillRect(0,top,vw,vh-top);}
    // Re-draw the lit circle at full brightness over the darkness.
    if(top<vh){const R=Math.min(vw,vh)*.3;ctx.save();ctx.beginPath();ctx.arc(lamp.x,lamp.y,R,0,7);ctx.clip();ctx.beginPath();ctx.rect(0,top,vw,vh-top);ctx.clip();
      for(let y=Math.max(0,Math.floor(camY+(lamp.y-R)/t));y<=Math.min(H-1,Math.ceil(camY+(lamp.y+R)/t));y++){const sy=(y-camY)*t;for(let sx=offX-Math.ceil(offX/t)*t,c=-Math.ceil(offX/t);sx<vw;sx+=t,c++){if(sx+t<lamp.x-R||sx>lamp.x+R)continue;const x=((c%W)+W)%W,i=y*W+x,r=world.rock[i];
        if(r){const rock=ROCKS[r],o=world.ore[i],m=o?MINERALS[o]:null;ctx.drawImage(tile(rock,m,px,(hash(x,y,3)*4)|0,rock.key+(m?'+'+m.key:'')),sx,sy,T,T);}else{const zr=ROCKS[rockIndex[ZONES[world.zone[i]].rock]];ctx.drawImage(backwall(zr,px,(hash(x,y,4)*3)|0,zr.key),sx,sy,T,T);}}}
      const g=ctx.createRadialGradient(lamp.x,lamp.y,R*.35,lamp.x,lamp.y,R);g.addColorStop(0,'rgba(4,4,6,0)');g.addColorStop(1,'rgba(4,4,6,.8)');ctx.fillStyle=g;ctx.fillRect(lamp.x-R,lamp.y-R,R*2,R*2);ctx.restore();}
    // Scrim on the left keeps copy readable.
    const s=ctx.createLinearGradient(0,0,vw,0);s.addColorStop(0,'rgba(5,5,6,.55)');s.addColorStop(.55,'rgba(5,5,6,.1)');s.addColorStop(1,'rgba(5,5,6,0)');ctx.fillStyle=s;ctx.fillRect(0,0,vw,vh);
  }
  function frame(now){
    raf=0;time=now/1000;
    const k=reduced.matches?1:.14;depth+=(target-depth)*k;lamp.x+=(lamp.tx-lamp.x)*.12;lamp.y+=(lamp.ty-lamp.y)*.12;
    if(!pointer&&!reduced.matches){lamp.tx=vw*(.7+Math.sin(time*.35)*.08);lamp.ty=vh*(.45+Math.cos(time*.27)*.08);}
    draw();onDepth?.(depth);
    const moving=Math.abs(target-depth)>.5||Math.abs(lamp.tx-lamp.x)>.5||Math.abs(lamp.ty-lamp.y)>.5;
    if(visible&&(moving||(!pointer&&!reduced.matches)))raf=requestAnimationFrame(frame);
  }
  function kick(){target=depthForScroll();if(!raf&&visible)raf=requestAnimationFrame(frame);}
  addEventListener('scroll',kick,{passive:true});addEventListener('resize',resize);
  addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;pointer=true;lamp.tx=e.clientX;lamp.ty=e.clientY;kick();},{passive:true});
  document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(visible)kick();});
  resize();
  return{pause(){visible=false;cancelAnimationFrame(raf);raf=0;},resume(){world=generate(SEED);applyTunnels();visible=true;kick();},get depth(){return depth;}};
}
