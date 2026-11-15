// Procedural art for Minex: rock textures, ore overlays and hand specimens.
// Everything is drawn once into small canvases and reused, so the game stays
// fast on phones and needs no image downloads.
import {rng} from './world.js';

const canvas=(w,h=w)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;};
const pickc=(R,list)=>list[Math.floor(R()*list.length)];
export function shade(hex,amt){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const f=amt<0?0:255,t=Math.abs(amt);r=Math.round(r+(f-r)*t);g=Math.round(g+(f-g)*t);b=Math.round(b+(f-b)*t);return'#'+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1);}
export function rgba(hex,a){const n=parseInt(hex.slice(1),16);return`rgba(${n>>16},${n>>8&255},${n&255},${a})`;}
function blob(ctx,R,cx,cy,r,pts=9,jag=.35){ctx.beginPath();const p=[];for(let i=0;i<pts;i++){const a=i/pts*Math.PI*2,rr=r*(1-jag/2+R()*jag);p.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]);}
  for(let i=0;i<pts;i++){const [x0,y0]=p[i],[x1,y1]=p[(i+1)%pts],mx=(x0+x1)/2,my=(y0+y1)/2;if(i===0)ctx.moveTo(mx,my);else ctx.quadraticCurveTo(x0,y0,mx,my);}
  const [x0,y0]=p[0],[x1,y1]=p[1];ctx.quadraticCurveTo(x0,y0,(x0+x1)/2,(y0+y1)/2);ctx.closePath();}
function poly(ctx,R,cx,cy,r,pts=5){ctx.beginPath();const off=R()*6;for(let i=0;i<pts;i++){const a=off+i/pts*Math.PI*2+R()*.5,rr=r*(.55+R()*.6);i?ctx.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr):ctx.moveTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);}ctx.closePath();}
function speckle(ctx,R,s,colors,count,min,max){for(let i=0;i<count;i++){ctx.fillStyle=pickc(R,colors);const r=min+R()*(max-min);ctx.beginPath();ctx.arc(R()*s,R()*s,r,0,Math.PI*2);ctx.fill();}}
function grain(ctx,R,s,alpha){const step=Math.max(1,Math.round(s/48));for(let y=0;y<s;y+=step)for(let x=0;x<s;x+=step){const v=R();if(v<.18){ctx.fillStyle=v<.09?`rgba(0,0,0,${alpha})`:`rgba(255,255,255,${alpha*.6})`;ctx.fillRect(x,y,step,step);}}}
function laths(ctx,R,s,colors,count,len,wid){for(let i=0;i<count;i++){ctx.save();ctx.translate(R()*s,R()*s);ctx.rotate(R()*Math.PI);ctx.fillStyle=pickc(R,colors);const l=len*(.5+R()),w=wid*(.6+R()*.8);ctx.fillRect(-l/2,-w/2,l,w);ctx.restore();}}

/** Fill a square with a rock's pattern. */
export function paintRock(ctx,rock,s,seed){
  const R=rng(seed),[c0,c1,c2,c3]=rock.pal;
  ctx.fillStyle=c0;ctx.fillRect(0,0,s,s);
  switch(rock.pattern){
    case'till':speckle(ctx,R,s,[c1,c2,shade(c0,-.25)],s*.9,s*.01,s*.03);for(let i=0;i<3;i++){ctx.fillStyle=pickc(R,[c2,c3]);blob(ctx,R,R()*s,R()*s,s*(.05+R()*.07),7);ctx.fill();}break;
    case'boulder':ctx.fillStyle=c1;blob(ctx,R,s*.5,s*.52,s*.46,10,.2);ctx.fill();speckle(ctx,R,s,[c2,c3,'#efe6dc','#2a2522'],s*1.6,s*.01,s*.035);break;
    case'onaping':speckle(ctx,R,s,[c1,shade(c0,.08)],s*.7,s*.01,s*.025);for(let i=0;i<9;i++){ctx.fillStyle=pickc(R,[c2,c3,shade(c2,.2)]);poly(ctx,R,R()*s,R()*s,s*(.04+R()*.1),3+Math.floor(R()*3));ctx.fill();}break;
    case'granophyre':speckle(ctx,R,s,[c1,c2],s*1.5,s*.012,s*.03);laths(ctx,R,s,[c3,shade(c3,.15)],s*.18,s*.08,s*.012);break;
    case'gabbro':speckle(ctx,R,s,[c1,shade(c0,-.2)],s*1.1,s*.012,s*.03);laths(ctx,R,s,[c2,c3],s*.28,s*.11,s*.026);break;
    case'norite':speckle(ctx,R,s,[c1,shade(c0,-.25)],s*1.2,s*.015,s*.035);laths(ctx,R,s,[c2],s*.2,s*.12,s*.03);speckle(ctx,R,s,[c3],s*.16,s*.012,s*.03);break;
    case'sublayer':speckle(ctx,R,s,[c1,shade(c0,-.2)],s*.9,s*.015,s*.035);for(let i=0;i<4;i++){ctx.fillStyle=pickc(R,[c2,c3]);poly(ctx,R,R()*s,R()*s,s*(.08+R()*.12),5);ctx.fill();}speckle(ctx,R,s,['#a98a52'],s*.12,s*.01,s*.025);break;
    case'breccia':for(let i=0;i<12;i++){ctx.fillStyle=pickc(R,[c1,c2,c3,shade(c1,.15)]);poly(ctx,R,R()*s,R()*s,s*(.05+R()*.16),3+Math.floor(R()*4));ctx.fill();}speckle(ctx,R,s,[shade(c0,-.25)],s*.4,s*.01,s*.02);break;
    case'gneiss':{const off=R()*s,amp=s*(.05+R()*.06);for(let b=-2;b<9;b++){ctx.fillStyle=[c1,c2,c3,c1][((b%4)+4)%4];ctx.beginPath();const y=b*s*.15+off*.2;ctx.moveTo(0,y);for(let x=0;x<=s;x+=s/8)ctx.lineTo(x,y+Math.sin(x/s*6.28+b+off)*amp);for(let x=s;x>=0;x-=s/8)ctx.lineTo(x,y+s*.06+Math.sin(x/s*6.28+b+off)*amp*1.1);ctx.closePath();ctx.fill();}speckle(ctx,R,s,['#1c1a1a','#efe6dc'],s*.5,s*.008,s*.02);break;}
    case'quartz':speckle(ctx,R,s,[c1,c2],s*.5,s*.03,s*.08);ctx.strokeStyle=rgba('#ffffff',.25);ctx.lineWidth=s*.012;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(R()*s,R()*s);ctx.lineTo(R()*s,R()*s);ctx.stroke();}break;
    case'diorite':speckle(ctx,R,s,[c1,c2,c3,'#e8e2d6'],s*1.8,s*.012,s*.03);break;
    case'rubble':for(let i=0;i<9;i++){ctx.fillStyle=pickc(R,[c1,c2,c3]);poly(ctx,R,R()*s,R()*s,s*(.1+R()*.14),4+Math.floor(R()*3));ctx.fill();ctx.strokeStyle='rgba(0,0,0,.45)';ctx.lineWidth=s*.015;ctx.stroke();}break;
    case'shotcrete':speckle(ctx,R,s,[c1,c2],s*1.2,s*.01,s*.02);ctx.strokeStyle=rgba(c3,.5);ctx.lineWidth=s*.02;ctx.strokeRect(s*.1,s*.1,s*.8,s*.8);ctx.fillStyle=c3;ctx.beginPath();ctx.arc(s*.5,s*.5,s*.05,0,7);ctx.fill();break;
    default:speckle(ctx,R,s,[c1,c2,c3],s,s*.01,s*.03);
  }
  grain(ctx,R,s,.12);
}

/** Paint a mineral's habit over whatever is already in ctx (scale = how big the grains are). */
export function paintOre(ctx,m,s,seed,scale=1){
  const R=rng(seed),{base,hi,lo,pat}=m.art;
  const metal=(cx,cy,r)=>{const g=ctx.createRadialGradient(cx-r*.35,cy-r*.4,r*.05,cx,cy,r*1.1);g.addColorStop(0,hi);g.addColorStop(.45,base);g.addColorStop(1,lo);return g;};
  const glint=(x,y,r)=>{ctx.fillStyle='rgba(255,255,255,.85)';ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r*.22,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r*.22,y);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x,y+r*.22);ctx.lineTo(x+r,y);ctx.lineTo(x,y-r*.22);ctx.closePath();ctx.fill();};
  const k=s*scale;
  switch(pat){
    case'massive':{for(let i=0;i<4;i++){const cx=s*(.2+R()*.6),cy=s*(.2+R()*.6),r=k*(.16+R()*.14);blob(ctx,R,cx,cy,r,10,.45);ctx.fillStyle=metal(cx,cy,r);ctx.fill();ctx.strokeStyle=rgba(lo,.7);ctx.lineWidth=s*.012;ctx.stroke();}
      speckle(ctx,R,s,[rgba(lo,.6)],s*.25,s*.006,s*.014);break;}
    case'tarnish':{for(let i=0;i<4;i++){const cx=s*(.2+R()*.6),cy=s*(.2+R()*.6),r=k*(.15+R()*.13);blob(ctx,R,cx,cy,r,10,.45);ctx.fillStyle=metal(cx,cy,r);ctx.fill();
        const t=ctx.createLinearGradient(cx-r,cy-r,cx+r,cy+r);t.addColorStop(0,'rgba(120,70,190,0)');t.addColorStop(.5,'rgba(90,120,230,.42)');t.addColorStop(.7,'rgba(210,80,170,.32)');t.addColorStop(1,'rgba(120,70,190,0)');ctx.fillStyle=t;blob(ctx,R,cx+r*.2,cy+r*.2,r*.55,8,.5);ctx.fill();}break;}
    case'grains':{for(let i=0;i<16;i++){const cx=R()*s,cy=R()*s,r=k*(.04+R()*.06);poly(ctx,R,cx,cy,r,5+Math.floor(R()*3));ctx.fillStyle=metal(cx,cy,r);ctx.fill();}break;}
    case'flames':{for(let i=0;i<3;i++){const cx=s*(.2+R()*.6),cy=s*(.2+R()*.6),r=k*(.17+R()*.1);blob(ctx,R,cx,cy,r,9,.4);ctx.fillStyle=metal(cx,cy,r);ctx.fill();ctx.strokeStyle=rgba(lo,.6);ctx.lineWidth=s*.008;for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(cx-r*.7,cy-r*.5+j*r*.45);ctx.lineTo(cx+r*.7,cy-r*.2+j*r*.45);ctx.stroke();}}break;}
    case'cubes':{for(let i=0;i<5;i++){const cx=s*(.15+R()*.7),cy=s*(.15+R()*.7),r=k*(.07+R()*.09),a=(R()-.5)*.5;ctx.save();ctx.translate(cx,cy);ctx.rotate(a);
        ctx.fillStyle=shade(base,-.18);ctx.beginPath();ctx.moveTo(-r,-r);ctx.lineTo(-r*.55,-r*1.45);ctx.lineTo(r*1.45,-r*1.45);ctx.lineTo(r,-r);ctx.closePath();ctx.fill();
        ctx.fillStyle=lo;ctx.beginPath();ctx.moveTo(r,-r);ctx.lineTo(r*1.45,-r*1.45);ctx.lineTo(r*1.45,r*.55);ctx.lineTo(r,r);ctx.closePath();ctx.fill();
        const g=ctx.createLinearGradient(-r,-r,r,r);g.addColorStop(0,hi);g.addColorStop(1,base);ctx.fillStyle=g;ctx.fillRect(-r,-r,r*2,r*2);
        ctx.strokeStyle=rgba(lo,.5);ctx.lineWidth=Math.max(.6,s*.006);for(let j=1;j<4;j++){ctx.beginPath();ctx.moveTo(-r,-r+j*r/2);ctx.lineTo(r,-r+j*r/2);ctx.stroke();}ctx.restore();}break;}
    case'octahedra':{for(let i=0;i<6;i++){const cx=s*(.15+R()*.7),cy=s*(.15+R()*.7),r=k*(.06+R()*.07);ctx.fillStyle=hi;ctx.beginPath();ctx.moveTo(cx,cy-r);ctx.lineTo(cx+r,cy);ctx.lineTo(cx,cy);ctx.closePath();ctx.fill();
        ctx.fillStyle=base;ctx.beginPath();ctx.moveTo(cx,cy-r);ctx.lineTo(cx-r,cy);ctx.lineTo(cx,cy);ctx.closePath();ctx.fill();ctx.fillStyle=lo;ctx.beginPath();ctx.moveTo(cx-r,cy);ctx.lineTo(cx,cy+r);ctx.lineTo(cx+r,cy);ctx.closePath();ctx.fill();}break;}
    case'needles':{for(let c=0;c<2;c++){const cx=s*(.25+R()*.5),cy=s*(.25+R()*.5);for(let i=0;i<22;i++){const a=R()*Math.PI*2,l=k*(.18+R()*.28);ctx.strokeStyle=R()<.3?hi:base;ctx.lineWidth=Math.max(.7,s*.01);ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*l,cy+Math.sin(a)*l);ctx.stroke();}}break;}
    case'blades':{for(let i=0;i<7;i++){ctx.save();ctx.translate(s*(.15+R()*.7),s*(.15+R()*.7));ctx.rotate(R()*Math.PI);const l=k*(.14+R()*.14),w=k*(.03+R()*.03),g=ctx.createLinearGradient(0,-w,0,w);g.addColorStop(0,hi);g.addColorStop(1,lo);ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-l,0);ctx.lineTo(-l*.6,-w);ctx.lineTo(l*.6,-w);ctx.lineTo(l,0);ctx.lineTo(l*.6,w);ctx.lineTo(-l*.6,w);ctx.closePath();ctx.fill();ctx.restore();}break;}
    case'nuggets':{for(let i=0;i<3;i++){const cx=s*(.25+R()*.5),cy=s*(.25+R()*.5),r=k*(.07+R()*.08);blob(ctx,R,cx,cy,r,8,.55);ctx.fillStyle=metal(cx,cy,r);ctx.fill();}break;}
    case'tiny':{for(let i=0;i<7;i++){const cx=s*(.12+R()*.76),cy=s*(.12+R()*.76),r=k*(.025+R()*.035);ctx.save();ctx.translate(cx,cy);ctx.rotate(R());const g=ctx.createLinearGradient(-r,-r,r,r);g.addColorStop(0,hi);g.addColorStop(.6,base);g.addColorStop(1,lo);ctx.fillStyle=g;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();}break;}
    case'cone':{ctx.strokeStyle=rgba('#f2ede6',.55);ctx.lineWidth=Math.max(.8,s*.012);const ax=s*.5,ay=s*.12;for(let i=0;i<9;i++){const t=(i-4)/4;ctx.beginPath();ctx.moveTo(ax,ay);ctx.quadraticCurveTo(ax+t*s*.2,s*.5,ax+t*s*.42,s*.92);ctx.stroke();}ctx.fillStyle=rgba('#f5b335',.9);ctx.beginPath();ctx.arc(ax,ay,s*.03,0,7);ctx.fill();break;}
  }
  // A couple of baked highlights make metallic lustre read at a glance.
  if(m.art.glint!==false)for(let i=0;i<(pat==='tiny'?3:2);i++)glint(s*(.2+R()*.6),s*(.2+R()*.6),s*.05*(.6+R()*.6));
}

const cache=new Map();
/** Cached tile texture for a rock (and optional ore) at a pixel size. */
export function tile(rock,m,size,variant,key){
  const k=key+'|'+size+'|'+variant;let c=cache.get(k);if(c)return c;
  c=canvas(size);const ctx=c.getContext('2d');paintRock(ctx,rock,size,variant*7919+rock.pal[0].length*31+key.length*97);
  if(m)paintOre(ctx,m,size,variant*104729+key.length*13);
  // Light from the top-left, a hairline seam bottom-right: each cell reads as a block.
  const g=ctx.createLinearGradient(0,0,size,size);g.addColorStop(0,'rgba(255,255,255,.07)');g.addColorStop(1,'rgba(0,0,0,.2)');ctx.fillStyle=g;ctx.fillRect(0,0,size,size);
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(0,size-1,size,1);ctx.fillRect(size-1,0,1,size);
  cache.set(k,c);if(cache.size>900)cache.delete(cache.keys().next().value);return c;
}
/** The dim back-wall of a dug tunnel: the same rock, in shadow. */
export function backwall(rock,size,variant,key){
  const k='bw|'+key+'|'+size+'|'+variant;let c=cache.get(k);if(c)return c;
  c=canvas(size);const ctx=c.getContext('2d');paintRock(ctx,rock,size,variant*31337+7);ctx.fillStyle='rgba(8,8,10,.72)';ctx.fillRect(0,0,size,size);
  cache.set(k,c);return c;
}
export function clearArtCache(){cache.clear();}

/** A hand specimen: a lump of host rock carrying the mineral, lit like a studio photo. */
export function drawSpecimen(c,item,host,opts={}){
  const dpr=Math.min(2,window.devicePixelRatio||1),w=c.clientWidth||c.width,h=c.clientHeight||c.height;
  c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const s=Math.min(w,h),cx=w/2,cy=h*.5,r=s*.36,R=rng(opts.seed||item.name.length*977);
  // Contact shadow.
  const sh=ctx.createRadialGradient(cx,cy+r*.95,0,cx,cy+r*.95,r*1.1);sh.addColorStop(0,'rgba(0,0,0,.55)');sh.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=sh;ctx.save();ctx.scale(1,.28);ctx.beginPath();ctx.arc(cx,(cy+r*.95)/.28,r*1.1,0,7);ctx.fill();ctx.restore();
  ctx.save();blob(ctx,R,cx,cy,r,13,.28);ctx.clip();
  const tex=canvas(s*dpr);const tctx=tex.getContext('2d');tctx.scale(dpr,dpr);paintRock(tctx,host,s,opts.seed||11);
  if(item.art){const scale=item.art.pat==='massive'||item.art.pat==='tarnish'||item.art.pat==='flames'?1.5:1.35;paintOre(tctx,item,s,(opts.seed||5)+3,scale);}
  ctx.drawImage(tex,cx-s/2,cy-s/2,s,s);
  const light=ctx.createRadialGradient(cx-r*.45,cy-r*.55,r*.1,cx,cy,r*1.15);light.addColorStop(0,'rgba(255,240,220,.22)');light.addColorStop(.55,'rgba(0,0,0,0)');light.addColorStop(1,'rgba(0,0,0,.62)');ctx.fillStyle=light;ctx.fillRect(0,0,w,h);
  ctx.restore();
  ctx.save();blob(ctx,rng(opts.seed||item.name.length*977),cx,cy,r,13,.28);ctx.strokeStyle='rgba(242,237,230,.12)';ctx.lineWidth=1;ctx.stroke();ctx.restore();
}
