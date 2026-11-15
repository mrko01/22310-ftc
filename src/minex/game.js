// Minex game engine: state, input, simulation and canvas rendering.
// The HUD and dialogs live in ui.js; this file talks to them through `ui`.
import {W,H,ROW_M,SEED,ROCKS,MINERALS,rockIndex,ZONES,UPGRADES,SPECIAL,rockTemp,SURFACE} from './data.js';
import {generate,packBits,unpackBits,hash} from './world.js';
import {tile,backwall,clearArtCache,paintOre,rgba} from './art.js';
import {sfx,setDrone,sound} from './audio.js';

const SAVE='minex-save-v1';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const coarse=matchMedia('(pointer: coarse)');
export const level=(S,track)=>UPGRADES[track].levels[S.up[track]];
export const depthOf=y=>Math.max(0,(y+1)*ROW_M);
export const fmtDepth=m=>Math.round(m).toLocaleString('en-CA').replace(/,/g,' ');
export function cargoValue(S){return Object.entries(S.cargo).reduce((s,[k,n])=>s+MINERALS[k].value*n,0);}
export function cargoCount(S){return Object.values(S.cargo).reduce((s,n)=>s+n,0);}

function fresh(){return {v:1,cash:0,x:SURFACE.spawn,y:-1,face:null,deepest:0,battery:UPGRADES.battery.levels[0].value,heat:0,cargo:{},up:{drill:0,battery:0,cargo:0,lamp:0,vent:0,support:0},
  found:{m:{},r:{},d:{},z:{}},tests:{},dug:'',rubble:'',seen:'',stats:{dug:0,earned:0,trips:0,quiz:[0,0],ore:0},intro:false,started:Date.now()};}
export function loadSave(){try{const s=JSON.parse(localStorage.getItem(SAVE));if(s&&s.v===1)return s;}catch{}return null;}
export function clearSave(){try{localStorage.removeItem(SAVE);}catch{}}

export function createGame(root,ui){
  const cvs=root.querySelector('.mx-canvas'),ctx=cvs.getContext('2d',{alpha:false});
  const light=document.createElement('canvas'),lctx=light.getContext('2d');
  const world=generate(SEED),N=W*H;
  let S=loadSave()||fresh();
  const seen=new Uint8Array(N);
  function applySave(){
    const dug=unpackBits(S.dug,N),rub=unpackBits(S.rubble,N),sn=unpackBits(S.seen,N);
    const base=generate(SEED);world.rock.set(base.rock);world.ore.set(base.ore);world.special.set(base.special);
    for(let i=0;i<N;i++){if(dug[i]){world.rock[i]=0;world.ore[i]=0;if(world.special[i]===2)world.special[i]=0;}if(rub[i])world.rock[i]=rockIndex.rubble;seen[i]=sn[i]||(i<W*2?1:0);}
  }
  applySave();
  const P={x:S.x,y:S.y,rx:S.x,ry:S.y,face:1,dig:null,walk:0,lastStep:0};
  const cam={x:P.x,y:P.y+2};
  let tilePx=40,vw=0,vh=0,dpr=1,running=false,paused=false,raf=0,last=0,time=0,hitstop=0,shake=0,keyDir=null,target=null,press=null,burstClock=0,saveClock=0,dirtySave=false,lastZone=-1,lastSeenKey='';
  const particles=[],floats=[];
  const idx=(x,y)=>y*W+x;
  const open=(x,y)=>x>=0&&x<W&&(y===-1||(y>=0&&y<H&&world.rock[idx(x,y)]===0));
  const solid=(x,y)=>x>=0&&x<W&&y>=0&&y<H&&world.rock[idx(x,y)]!==0;
  const zoneAt=(x,y)=>y<0?-1:world.zone[idx(Math.max(0,Math.min(W-1,x)),Math.min(H-1,y))];

  // ---------- sizing ----------
  function resize(){
    const r=root.getBoundingClientRect();vw=r.width;vh=r.height;dpr=Math.min(2,window.devicePixelRatio||1);
    cvs.width=Math.round(vw*dpr);cvs.height=Math.round(vh*dpr);
    const t=Math.round(Math.max(32,Math.min(60,Math.min(vw/11,vh/13))));if(t!==tilePx){tilePx=t;clearArtCache();}
    light.width=Math.ceil(vw/2);light.height=Math.ceil(vh/2);
  }
  const ro=new ResizeObserver(()=>{resize();if(!running)render();});ro.observe(root);

  // ---------- persistence ----------
  function save(){
    const dug=new Uint8Array(N),rub=new Uint8Array(N),base=baseWorld();
    for(let i=0;i<N;i++){if(base.rock[i]&&world.rock[i]===0)dug[i]=1;if(world.rock[i]===rockIndex.rubble&&base.rock[i]!==rockIndex.rubble)rub[i]=1;}
    S.dug=packBits(dug);S.rubble=packBits(rub);S.seen=packBits(seen);S.x=P.x;S.y=P.y;
    try{localStorage.setItem(SAVE,JSON.stringify(S));}catch{}dirtySave=false;
  }
  let baseCache=null;const baseWorld=()=>baseCache||(baseCache=generate(SEED));

  // ---------- helpers ----------
  const lampCells=()=>level(S,'lamp').value;
  function reveal(){
    const r=lampCells(),r2=r*r;for(let y=Math.floor(P.y-r);y<=P.y+r;y++)for(let x=Math.floor(P.x-r);x<=P.x+r;x++)if(x>=0&&x<W&&y>=0&&y<H&&(x-P.x)**2+(y-P.y)**2<=r2)seen[idx(x,y)]=1;
    if(world.special[idx(Math.max(0,P.x),Math.max(0,P.y))]===1)for(let y=world.labY-1;y<world.labY+4;y++)for(let x=world.labX-1;x<world.labX+9;x++)seen[idx(x,y)]=1;
  }
  function toast(msg,kind){ui.toast(msg,kind);}
  function burst(x,y,color,count,speed=5){if(reduced.matches)count=Math.ceil(count/3);if(coarse.matches)count=Math.ceil(count*.6);for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=speed*(.3+Math.random());particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2,life:0,max:.4+Math.random()*.5,color,size:.04+Math.random()*.07});}}
  function float(x,y,text,color='#f5b335'){floats.push({x,y,text,color,life:0});}
  function vibrate(ms){if(navigator.vibrate&&!reduced.matches)try{navigator.vibrate(ms);}catch{}}
  const hardnessAt=i=>{const o=world.ore[i];if(o){const h=MINERALS[o].h;return(h[0]+h[1])/2;}return ROCKS[world.rock[i]]?.h||1;};
  const digTime=i=>(.06+.012*hardnessAt(i)**2)/level(S,'drill').value;

  // ---------- movement & digging ----------
  function bfs(tx,ty){
    // Shortest walk through open tunnels to the target, or to a cell beside it.
    const goalSolid=solid(tx,ty),key=(x,y)=>(y+1)*W+x,prev=new Int32Array(W*(H+1)).fill(-2),q=[key(P.x,P.y)];prev[q[0]]=-1;
    while(q.length){const k=q.shift(),x=k%W,y=Math.floor(k/W)-1;
      const done=goalSolid?Math.abs(x-tx)+Math.abs(y-ty)===1:(x===tx&&y===ty);
      if(done){let c=k,steps=[];while(prev[c]!==-1){steps.push(c);c=prev[c];}steps.reverse();if(goalSolid)steps.push(key(tx,ty));return steps.map(s=>[s%W,Math.floor(s/W)-1]);}
      for(const[dx,dy]of[[0,1],[1,0],[-1,0],[0,-1]]){const nx=x+dx,ny=y+dy;if(!open(nx,ny))continue;const nk=key(nx,ny);if(prev[nk]!==-2)continue;prev[nk]=k;q.push(nk);}}
    return null;
  }
  function nextStep(){
    if(keyDir)return keyDir;
    if(!target)return null;
    const {x:tx,y:ty}=target;
    if(tx===P.x&&ty===P.y){target=null;return null;}
    const path=bfs(tx,ty);
    if(path&&path.length){const[nx,ny]=path[0];return[nx-P.x,ny-P.y];}
    const dx=Math.sign(tx-P.x),dy=Math.sign(ty-P.y);
    if(Math.abs(ty-P.y)>=Math.abs(tx-P.x)){if(dy&&!(dy<0&&P.y<=-1))return open(P.x+dx,P.y)&&dx&&!open(P.x,P.y+dy)?[dx,0]:[0,dy];return dx?[dx,0]:null;}
    return open(P.x,P.y+dy)&&dy&&!open(P.x+dx,P.y)?[0,dy]:[dx,0];
  }
  function tryStep([dx,dy]){
    const nx=P.x+dx,ny=P.y+dy;
    if(dx)P.face=dx;
    if(nx<0||nx>=W||ny<-1||ny>=H){if(ny>=H)toast('You have reached the bottom of the simulation, 3 km down.');target=null;return;}
    if(open(nx,ny)){moveTo(nx,ny);return;}
    if(S.battery<=0){if(!P.flatWarned){toast('Battery flat. Ride the cage up to recharge.','warn');sfx.error();P.flatWarned=true;}target=null;keyDir=null;return;}
    const i=idx(nx,ny);P.dig={x:nx,y:ny,i,t:0,dur:digTime(i),tick:0};
  }
  function moveTo(nx,ny){
    P.x=nx;P.y=ny;P.walk+=1;reveal();
    if(P.y===-1)arriveSurface();
    const d=depthOf(P.y);if(P.y>=0&&d>S.deepest){S.deepest=d;}
    const k=zoneAt(P.x,P.y);if(k!==lastZone){if(k>=0)enterZone(k);lastZone=k;}
    if(P.y>=0&&world.special[idx(P.x,P.y)]===1&&!S.found.d.snolab){S.found.d.snolab=true;sfx.discover();ui.discover({kind:'special',id:'snolab'});dirtySave=true;}
  }
  function enterZone(k){
    const z=ZONES[k];ui.zoneTitle(z,k);
    if(!S.found.z[z.id]){S.found.z[z.id]=true;if(z.toast)setTimeout(()=>toast(z.toast,'learn'),900);dirtySave=true;}
  }
  function arriveSurface(){
    const cap=level(S,'battery').value;if(S.battery<cap||S.heat>0){S.battery=cap;S.heat=0;}P.flatWarned=false;
  }
  function finishDig(){
    const {x,y,i}=P.dig;P.dig=null;
    const rockId=world.rock[i],oreId=world.ore[i],sp=world.special[i],rock=ROCKS[rockId],hard=hardnessAt(i);
    if(!rock){moveTo(x,y);return;}
    world.rock[i]=0;world.ore[i]=0;if(sp===2)world.special[i]=0;
    S.battery=Math.max(0,S.battery-1);S.stats.dug++;dirtySave=true;
    hitstop=reduced.matches?0:.055;shake=Math.min(1,shake+.35);vibrate(8);
    burst(x+.5,y+.5,rock.pal[1],12);sfx.break(hard);
    if(!S.found.r[rock.key]&&rock.key!=='rubble'){S.found.r[rock.key]=true;toast(`Rock logged: ${rock.name}`,'rock');}
    if(oreId){const m=MINERALS[oreId];
      if(cargoCount(S)<level(S,'cargo').value){S.cargo[oreId]=(S.cargo[oreId]||0)+1;S.stats.ore++;float(x+.5,y+.2,`+1 ${m.name}`);burst(x+.5,y+.5,m.art.hi,10,4);sfx.ore(m.value);ui.pulse('cargo');
        if(!S.found.m[m.key]){S.found.m[m.key]=1;setTimeout(()=>{sfx.discover();ui.discover({kind:'mineral',id:m.key});},260);}else S.found.m[m.key]++;}
      else{float(x+.5,y+.2,'Cargo full','#ef3326');toast('Cargo full: that ore was left behind. Ride the cage up to sell.','warn');ui.pulse('cargo',true);sfx.error();}}
    if(sp===2&&!S.found.d.cone){S.found.d.cone=true;setTimeout(()=>{sfx.discover();ui.discover({kind:'special',id:'cone'});},260);}
    moveTo(x,y);
  }

  // ---------- hazards ----------
  function rockburst(){
    const sup=level(S,'support').value,r=4+Math.round(4*sup),cells=[];
    for(let y=P.y-r;y<=P.y+r;y++)for(let x=P.x-r;x<=P.x+r;x++){if(y<1||y>=H||x<0||x>=W)continue;const d=Math.abs(x-P.x)+Math.abs(y-P.y);if(d<2||world.special[idx(x,y)])continue;if(world.rock[idx(x,y)]===0)cells.push([x,y]);}
    cells.sort(()=>Math.random()-.5);const n=Math.round(cells.length*.35*sup);
    for(let k=0;k<n;k++){const[x,y]=cells[k];world.rock[idx(x,y)]=rockIndex.rubble;burst(x+.5,y+.5,'#8a837a',6,3);}
    shake=reduced.matches?0:2.4;vibrate(120);sfx.burst();dirtySave=true;
    if(!S.found.d.burst){S.found.d.burst=true;ui.discover({kind:'special',id:'burst'});}else toast(n?`Rockburst! ${n} tunnel cell${n===1?'':'s'} filled with loose rock.`:'Rockburst! Your ground support held.','warn');
  }
  function evacuate(reason){
    let lost=0;for(const k of Object.keys(S.cargo)){const l=Math.ceil(S.cargo[k]*.3);S.cargo[k]-=l;lost+=l;if(!S.cargo[k])delete S.cargo[k];}
    S.face={x:P.x,y:P.y};target=null;keyDir=null;P.dig=null;
    ui.cage(depthOf(P.y),0,()=>{toSurface();ui.notice(reason,lost);});
  }

  // ---------- cage ----------
  function toSurface(){P.x=SURFACE.shaft;P.y=-1;P.rx=P.x;P.ry=P.y;cam.x=P.x;cam.y=P.y+2;arriveSurface();S.stats.trips++;lastZone=-1;save();}
  const api={
    get state(){return S;},
    get atSurface(){return P.y===-1;},
    get depth(){return depthOf(P.y);},
    get busy(){return paused;},
    cageUp(){if(P.y<0)return;S.face={x:P.x,y:P.y};target=null;keyDir=null;P.dig=null;sfx.cage(true);ui.cage(depthOf(P.y),0,toSurface);},
    cageDown(){if(!S.face||P.y>=0)return;const f=S.face;const i=idx(f.x,f.y);if(world.rock[i]){world.rock[i]=0;world.ore[i]=0;}sfx.cage(false);
      ui.cage(0,depthOf(f.y),()=>{P.x=f.x;P.y=f.y;P.rx=f.x;P.ry=f.y;cam.x=f.x;cam.y=f.y+1.5;reveal();lastZone=-1;moveTo(f.x,f.y);save();});},
    sell(bonus=0){const v=cargoValue(S),total=Math.round(v*(1+bonus));S.cash+=total;S.stats.earned+=total;S.cargo={};sfx.cash();save();return total;},
    buy(track){const t=UPGRADES[track],next=t.levels[S.up[track]+1];if(!next||S.cash<next.cost)return false;S.cash-=next.cost;S.up[track]++;if(track==='battery'&&P.y===-1)S.battery=next.value;sfx.cash();save();return true;},
    test(key,kind){S.tests[key]=S.tests[key]||{};if(!S.tests[key][kind]){S.tests[key][kind]=true;S.cash+=5;dirtySave=true;return true;}return false;},
    quiz(right){S.stats.quiz[1]++;if(right)S.stats.quiz[0]++;dirtySave=true;},
    pause(){paused=true;keyDir=null;press=null;},
    resume(){paused=false;last=performance.now();},
    start(){if(running)return;running=true;resize();reveal();last=performance.now();lastZone=-1;raf=requestAnimationFrame(frame);},
    stop(){running=false;cancelAnimationFrame(raf);save();setDrone(0,false);},
    save,
    reset(){clearSave();S=fresh();applySave();P.x=S.x;P.y=S.y;P.rx=P.x;P.ry=P.y;P.dig=null;target=null;for(let i=0;i<W*2;i++)seen[i]=1;lastZone=-1;save();},
    finishIntro(){S.intro=true;save();},
    worldData:world,seen,
  };

  // ---------- input ----------
  function cellAt(clientX,clientY){const r=cvs.getBoundingClientRect();const sx=clientX-r.left,sy=clientY-r.top;return{x:Math.floor((sx-vw/2)/tilePx+cam.x+.5),y:Math.floor((sy-vh/2)/tilePx+cam.y+.5)};}
  cvs.addEventListener('pointerdown',e=>{if(paused)return;sound.unlock();cvs.setPointerCapture?.(e.pointerId);const c=cellAt(e.clientX,e.clientY);
    if(P.y===-1&&c.y<-1){const b=SURFACE.buildings.find(b=>c.x>=b.x&&c.x<b.x+b.w&&c.y>=-1-b.h);if(b){ui.openBuilding(b.id);return;}}
    target={x:Math.max(0,Math.min(W-1,c.x)),y:Math.max(-1,Math.min(H-1,c.y))};press={id:e.pointerId,t:performance.now()};});
  cvs.addEventListener('pointermove',e=>{if(!press||press.id!==e.pointerId)return;const c=cellAt(e.clientX,e.clientY);target={x:Math.max(0,Math.min(W-1,c.x)),y:Math.max(-1,Math.min(H-1,c.y))};});
  const release=e=>{if(!press||press.id!==e.pointerId)return;if(performance.now()-press.t>280)target=null;press=null;};
  cvs.addEventListener('pointerup',release);cvs.addEventListener('pointercancel',release);
  const dirs={ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1],ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0]};
  function onKey(e){if(!running||paused||e.metaKey||e.ctrlKey||e.altKey)return;if(e.target.closest?.('input,textarea,select'))return;
    if(dirs[e.code]){e.preventDefault();keyDir=dirs[e.code];target=null;sound.unlock();}
    else if(e.code==='KeyC'){e.preventDefault();P.y>=0?api.cageUp():api.cageDown();}}
  function onKeyUp(e){if(dirs[e.code]&&keyDir===dirs[e.code])keyDir=null;}
  addEventListener('keydown',onKey);addEventListener('keyup',onKeyUp);
  addEventListener('blur',()=>{keyDir=null;press=null;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){keyDir=null;if(running)save();}else last=performance.now();});

  // ---------- simulation ----------
  function update(dt){
    time+=dt;
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life+=dt;if(p.life>p.max){particles.splice(i,1);continue;}p.vy+=18*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
    for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.life+=dt;f.y-=dt*.9;if(f.life>1.3)floats.splice(i,1);}
    shake=Math.max(0,shake-dt*4);
    if(hitstop>0){hitstop-=dt;return;}
    // Render position eases toward the cell the miner occupies.
    const sp=Math.min(1,dt*16);P.rx+=(P.x-P.rx)*sp;P.ry+=(P.y-P.ry)*sp;
    const settled=Math.abs(P.x-P.rx)<.12&&Math.abs(P.y-P.ry)<.12;
    if(P.dig){P.dig.t+=dt;P.dig.tick+=dt;if(P.dig.tick>.075){P.dig.tick=0;const h=hardnessAt(P.dig.i);sfx.drill(h);const r=ROCKS[world.rock[P.dig.i]];if(r)burst(P.dig.x+.5-(P.dig.x-P.x)*.45,P.dig.y+.5-(P.dig.y-P.y)*.45,r.pal[1],2,3);}
      if(P.dig.t>=P.dig.dur)finishDig();
      else if(!keyDir&&!target){P.dig=null;}}
    else if(settled){const s=nextStep();if(s)tryStep(s);}
    // Heat: below what the ventilation can cool, the miner heats up.
    const d=depthOf(P.y),safe=level(S,'vent').value;
    if(P.y>=0&&d>safe){S.heat=Math.min(1,S.heat+dt*(.035+(d-safe)/420*.09));if(S.heat>=1&&!paused){S.heat=.999;evacuate('heat');}}
    else S.heat=Math.max(0,S.heat-dt*.12);
    // Rockbursts become possible as stress builds below 1,400 m.
    if(P.y>=0&&d>1400&&!paused){burstClock+=dt;const chance=(.004+(d-1400)/1600*.012)*level(S,'support').value*(S.found.d.burst?1:1.6);if(burstClock>25&&Math.random()<chance*dt*60){burstClock=0;rockburst();}}
    saveClock+=dt;if(dirtySave&&saveClock>2){saveClock=0;save();}
    setDrone(Math.min(1,d/3000),P.y>=0);
    // Camera follows with a little look-ahead downward.
    const cols=vw/tilePx,rows=vh/tilePx;let tx=P.rx,ty=P.ry+(P.y<0?2.2:1.2);
    tx=W>cols?Math.max(cols/2-.5,Math.min(W-cols/2-.5,tx)):W/2-.5;ty=Math.max(-rows*.62,Math.min(H-rows/2+.5,ty));
    const cs=1-Math.exp(-dt*7);cam.x+=(tx-cam.x)*cs;cam.y+=(ty-cam.y)*cs;
  }

  // ---------- rendering ----------
  function drawSky(top){
    const t=tilePx,horizon=(0-(cam.y-.5))*t+vh/2;if(horizon<=0)return;
    const g=ctx.createLinearGradient(0,horizon-vh*.9,0,horizon);g.addColorStop(0,'#07080d');g.addColorStop(.55,'#161521');g.addColorStop(.86,'#3a1d18');g.addColorStop(1,'#8a3a1f');ctx.fillStyle=g;ctx.fillRect(0,0,vw,horizon);
    const sx=cam.x*t;
    for(let i=0;i<70;i++){const x=((hash(i,1,9)*vw*2-sx*.05)%vw+vw)%vw,y=hash(i,2,9)*(horizon-t*4);if(y<0)continue;ctx.fillStyle=`rgba(242,237,230,${.15+.5*hash(i,3,9)*(.6+.4*Math.sin(time*1.5+i))})`;ctx.fillRect(x,y,1.2,1.2);}
    const glow=ctx.createRadialGradient(vw*.62-sx*.1,horizon,0,vw*.62-sx*.1,horizon,vw*.7);glow.addColorStop(0,'rgba(255,122,47,.32)');glow.addColorStop(1,'rgba(255,122,47,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,vw,horizon);
    // Far ridge of the Canadian Shield.
    ctx.fillStyle='#120f14';ctx.beginPath();ctx.moveTo(0,horizon);for(let x=0;x<=vw+20;x+=20){const wx=(x+sx*.3)/t;ctx.lineTo(x,horizon-t*(1.6+Math.sin(wx*.35)*.6+Math.sin(wx*.9+2)*.35));}ctx.lineTo(vw,horizon);ctx.closePath();ctx.fill();
    const px=(wx,par)=>(wx-cam.x)*t*par+vw/2;
    // The Superstack, with its aircraft-warning light.
    const ssx=px(SURFACE.stack,.55);ctx.fillStyle='#17131a';ctx.beginPath();ctx.moveTo(ssx-t*.32,horizon-t*1.2);ctx.lineTo(ssx-t*.17,horizon-t*9.4);ctx.lineTo(ssx+t*.17,horizon-t*9.4);ctx.lineTo(ssx+t*.32,horizon-t*1.2);ctx.closePath();ctx.fill();
    ctx.fillStyle=`rgba(239,51,38,${.4+.6*Math.max(0,Math.sin(time*2.2))})`;ctx.beginPath();ctx.arc(ssx,horizon-t*9.5,t*.07,0,7);ctx.fill();
    // The Big Nickel on its hill.
    const bnx=px(SURFACE.nickel,.55),bny=horizon-t*2.15;ctx.fillStyle='#120f14';ctx.beginPath();ctx.ellipse(bnx,horizon-t*1.3,t*1.3,t*.55,0,Math.PI,0);ctx.fill();
    const ng=ctx.createLinearGradient(bnx-t,bny-t,bnx+t,bny+t);ng.addColorStop(0,'#5c5f63');ng.addColorStop(1,'#1d1c21');ctx.fillStyle=ng;ctx.beginPath();ctx.arc(bnx,bny,t*.5,0,7);ctx.fill();ctx.strokeStyle='rgba(242,237,230,.22)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(bnx,bny,t*.42,0,7);ctx.stroke();
    // Black spruce along the near ridge.
    ctx.fillStyle='#0b0a0d';for(let i=-4;i<W+8;i+=.7){const x=px(i,.85),h=t*(.8+hash(Math.round(i*10),5,3)*1.1);if(x<-t||x>vw+t)continue;ctx.beginPath();ctx.moveTo(x,horizon-h);ctx.lineTo(x+t*.18,horizon);ctx.lineTo(x-t*.18,horizon);ctx.closePath();ctx.fill();}
    // Surface buildings sit on the ground row.
    for(const b of SURFACE.buildings)drawBuilding(b,horizon);
  }
  function drawBuilding(b,horizon){
    const t=tilePx,x=(b.x-cam.x-.5)*t+vw/2,w=b.w*t,h=b.h*t,y=horizon-h;
    ctx.save();
    if(b.id==='shaft'){ctx.strokeStyle='#2c2a2e';ctx.lineWidth=Math.max(2,t*.09);ctx.beginPath();ctx.moveTo(x+w*.12,horizon);ctx.lineTo(x+w*.5,y);ctx.lineTo(x+w*.88,horizon);ctx.moveTo(x+w*.2,horizon-h*.3);ctx.lineTo(x+w*.8,horizon-h*.3);ctx.moveTo(x+w*.3,horizon-h*.6);ctx.lineTo(x+w*.7,horizon-h*.6);ctx.stroke();
      ctx.strokeStyle='#ef3326';ctx.lineWidth=Math.max(1.5,t*.06);ctx.beginPath();ctx.arc(x+w*.5,y+t*.25,t*.28,0,7);ctx.stroke();ctx.beginPath();ctx.moveTo(x+w*.5,y+t*.25);ctx.lineTo(x+w*.5,horizon);ctx.stroke();}
    else{ctx.fillStyle='#1d1b20';ctx.fillRect(x+t*.08,y+h*.25,w-t*.16,h*.75);ctx.fillStyle='#2a272c';ctx.beginPath();ctx.moveTo(x,y+h*.28);ctx.lineTo(x+w/2,y);ctx.lineTo(x+w,y+h*.28);ctx.closePath();ctx.fill();
      ctx.fillStyle=b.id==='assay'?'rgba(245,179,53,.85)':'rgba(255,122,47,.8)';for(let i=0;i<b.w;i++)ctx.fillRect(x+t*(i+.3),y+h*.5,t*.4,t*.35);}
    ctx.fillStyle='rgba(242,237,230,.86)';ctx.font=`500 ${Math.max(9,t*.24)}px "JetBrains Mono",monospace`;ctx.textAlign='center';ctx.fillText(b.label,x+w/2,y-t*.18);
    ctx.restore();
  }
  function drawLab(){
    const t=tilePx,x=(world.labX-cam.x-.5)*t+vw/2,y=(world.labY-cam.y-.5)*t+vh/2,w=8*t,h=3*t;
    if(x>vw||x+w<0||y>vh||y+h<0)return;if(!seen[idx(world.labX,world.labY)])return;
    const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'#cfd8dc');g.addColorStop(1,'#9fb0b8');ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='rgba(20,40,50,.18)';ctx.lineWidth=1;for(let i=1;i<8;i++){ctx.beginPath();ctx.moveTo(x+i*t,y+h-t*.25);ctx.lineTo(x+i*t,y+h);ctx.stroke();}
    const cx=x+w*.62,cy=y+h*.5,r=h*.42;ctx.fillStyle='#e9eef0';ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.fill();ctx.strokeStyle='rgba(30,60,80,.4)';ctx.stroke();
    for(let a=0;a<20;a++)for(let b=0;b<6;b++){const th=a/20*Math.PI*2,ph=(b+.5)/6*Math.PI;const px=cx+Math.cos(th)*Math.sin(ph)*r*.92,py=cy+Math.cos(ph)*r*.92;if(Math.sin(th)<0)continue;ctx.fillStyle='rgba(245,179,53,.85)';ctx.beginPath();ctx.arc(px,py,Math.max(1,t*.035),0,7);ctx.fill();}
    ctx.fillStyle='#2a3a44';ctx.font=`600 ${Math.max(9,t*.26)}px "JetBrains Mono",monospace`;ctx.textAlign='left';ctx.fillText('SNOLAB',x+t*.3,y+t*.5);
    ctx.font=`400 ${Math.max(8,t*.18)}px "JetBrains Mono",monospace`;ctx.fillText('2 km underground',x+t*.3,y+t*.82);
  }
  const crackCache={};
  function drawMiner(){
    const t=tilePx;let x=(P.rx-cam.x)*t+vw/2,y=(P.ry-cam.y)*t+vh/2;
    const dig=P.dig,jit=dig&&!reduced.matches?(Math.random()-.5)*t*.04:0;x+=jit;
    const f=P.face,s=t/40,bob=dig?Math.sin(time*60)*s:Math.sin(P.walk*Math.PI)*s*.8;
    ctx.save();ctx.translate(x,y+bob);
    // Drill steel points at the face being drilled.
    if(dig){const dx=dig.x-P.x,dy=dig.y-P.y;ctx.save();ctx.rotate(Math.atan2(dy,dx));ctx.fillStyle='#5b5650';ctx.fillRect(t*.05,-s*3,t*.32,s*6);ctx.fillStyle='#c9c2b8';ctx.fillRect(t*.3,-s*1.2,t*.24+Math.random()*s*2,s*2.4);ctx.restore();}
    ctx.scale(f,1);
    ctx.fillStyle='#1b1a1e';ctx.fillRect(-s*7,s*8,s*5,s*10);ctx.fillRect(s*2,s*8,s*5,s*10);
    ctx.fillStyle='#ff7a2f';ctx.beginPath();ctx.roundRect(-s*9,-s*5,s*18,s*16,s*4);ctx.fill();
    ctx.fillStyle='rgba(242,237,230,.92)';ctx.fillRect(-s*9,s*3,s*18,s*2.2);ctx.fillRect(-s*2,-s*5,s*2.2,s*16);
    ctx.fillStyle='#d9b48f';ctx.beginPath();ctx.arc(0,-s*10,s*6,0,7);ctx.fill();
    ctx.fillStyle='#f2ede6';ctx.beginPath();ctx.arc(0,-s*12,s*7.4,Math.PI,0);ctx.fill();ctx.fillRect(-s*8.6,-s*12.6,s*17.2,s*2.4);
    ctx.fillStyle='#f5b335';ctx.beginPath();ctx.arc(s*5.6,-s*14.5,s*2.2,0,7);ctx.fill();
    ctx.restore();
    if(P.y>=0){const lx=x+f*s*5.6,ly=y-s*14.5+bob,g=ctx.createRadialGradient(lx,ly,0,lx,ly,s*10);g.addColorStop(0,'rgba(255,220,150,.75)');g.addColorStop(1,'rgba(255,220,150,0)');ctx.fillStyle=g;ctx.fillRect(lx-s*10,ly-s*10,s*20,s*20);}
  }
  function render(){
    const t=tilePx,sh=shake*t*.06;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#040405';ctx.fillRect(0,0,vw,vh);
    ctx.save();if(sh)ctx.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh);
    const cols=vw/t/2+1,rows=vh/t/2+1,x0=Math.max(0,Math.floor(cam.x-cols)),x1=Math.min(W-1,Math.ceil(cam.x+cols)),y0=Math.floor(cam.y-rows),y1=Math.min(H-1,Math.ceil(cam.y+rows));
    if(y0<0)drawSky();
    const T=Math.ceil(t*dpr)/dpr,px=Math.round(t*dpr);
    for(let y=Math.max(0,y0);y<=y1;y++)for(let x=x0;x<=x1;x++){
      const i=idx(x,y),sx=(x-cam.x-.5)*t+vw/2,sy=(y-cam.y-.5)*t+vh/2,r=world.rock[i];
      if(!seen[i]){ctx.fillStyle='#060607';ctx.fillRect(sx,sy,T,T);continue;}
      if(r){const rock=ROCKS[r],o=world.ore[i],m=o?MINERALS[o]:null,v=(hash(x,y,3)*4)|0;ctx.drawImage(tile(rock,m,px,v,rock.key+(m?'+'+m.key:'')),sx,sy,T,T);
        if(world.special[i]===2){ctx.save();ctx.translate(sx,sy);ctx.scale(t/px,t/px);paintOre(ctx,{art:{pat:'cone',glint:false}},px,1);ctx.restore();}
        if(m&&!reduced.matches){const ph=hash(x,y,11)*20,a=Math.max(0,Math.sin(time*(1.4+m.value/200)+ph))**10;if(a>.05){const gx=sx+t*(.2+hash(x,y,12)*.6),gy=sy+t*(.2+hash(x,y,13)*.6),gr=t*.16*a;ctx.fillStyle=`rgba(255,250,235,${a})`;ctx.fillRect(gx-gr,gy-.6,gr*2,1.2);ctx.fillRect(gx-.6,gy-gr,1.2,gr*2);}}}
      else if(world.special[i]!==1){const zr=ROCKS[rockIndex[ZONES[world.zone[i]].rock]];ctx.drawImage(backwall(zr,px,(hash(x,y,4)*3)|0,zr.key),sx,sy,T,T);
        if(solid(x,y-1)){const g=ctx.createLinearGradient(0,sy,0,sy+t*.4);g.addColorStop(0,'rgba(0,0,0,.6)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(sx,sy,T,t*.4);}
        if(solid(x,y+1)){ctx.fillStyle='rgba(242,237,230,.07)';ctx.fillRect(sx,sy+t-2,T,2);}
        if(open(x,y-1)&&open(x,y+1)||open(x,y-1)&&y>0&&!solid(x,y+1)){ctx.fillStyle='rgba(120,100,80,.35)';for(let k=1;k<4;k++)ctx.fillRect(sx+t*.3,sy+k*t/4,t*.4,Math.max(1,t*.04));ctx.fillRect(sx+t*.28,sy,Math.max(1,t*.04),T);ctx.fillRect(sx+t*.68,sy,Math.max(1,t*.04),T);}}
    }
    drawLab();
    // Drill progress: cracks spread and a ring fills while the bit works.
    if(P.dig){const d=P.dig,sx=(d.x-cam.x-.5)*t+vw/2,sy=(d.y-cam.y-.5)*t+vh/2,p=Math.min(1,d.t/d.dur);
      const segs=crackCache[d.i]||(crackCache[d.i]=Array.from({length:7},(_,k)=>[hash(d.i,k,1),hash(d.i,k,2),hash(d.i,k,3)]));
      ctx.strokeStyle=`rgba(5,5,6,${.4+p*.5})`;ctx.lineWidth=Math.max(1,t*.035);ctx.beginPath();segs.slice(0,1+Math.floor(p*6)).forEach(([a,b,c])=>{ctx.moveTo(sx+t*.5,sy+t*.5);ctx.lineTo(sx+t*(.5+(a-.5)*.9),sy+t*(.5+(b-.5)*.9));ctx.lineTo(sx+t*(.5+(c-.5)*1),sy+t*(.5+(a-.5)*1));});ctx.stroke();
      ctx.strokeStyle='rgba(242,237,230,.18)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(sx+t/2,sy+t/2,t*.36,0,7);ctx.stroke();ctx.strokeStyle='#f5b335';ctx.beginPath();ctx.arc(sx+t/2,sy+t/2,t*.36,-Math.PI/2,-Math.PI/2+p*Math.PI*2);ctx.stroke();}
    // Target marker for taps.
    if(target&&!keyDir){const sx=(target.x-cam.x-.5)*t+vw/2,sy=(target.y-cam.y-.5)*t+vh/2,k=t*.22;ctx.strokeStyle='rgba(245,179,53,.7)';ctx.lineWidth=1.5;ctx.beginPath();
      for(const[cx,cy,dx,dy]of[[sx,sy,1,1],[sx+t,sy,-1,1],[sx,sy+t,1,-1],[sx+t,sy+t,-1,-1]]){ctx.moveTo(cx+dx*k,cy);ctx.lineTo(cx,cy);ctx.lineTo(cx,cy+dy*k);}ctx.stroke();}
    for(const p of particles){ctx.globalAlpha=1-p.life/p.max;ctx.fillStyle=p.color;const s=p.size*t;ctx.fillRect((p.x-cam.x-.5)*t+vw/2-s/2,(p.y-cam.y-.5)*t+vh/2-s/2,s,s);}ctx.globalAlpha=1;
    drawMiner();
    // Darkness: the cap lamp is the only light underground.
    const surfY=(0-cam.y-.5)*t+vh/2;
    if(surfY<vh){const L=light,lw=L.width,lh=L.height,k=lw/vw;lctx.setTransform(1,0,0,1,0,0);lctx.globalCompositeOperation='source-over';lctx.clearRect(0,0,lw,lh);
      const dark=Math.min(.93,.25+Math.max(0,P.ry+1)*.22);lctx.fillStyle=`rgba(3,3,5,${dark})`;lctx.fillRect(0,Math.max(0,(surfY+t*.15)*k),lw,lh);
      const fade=lctx.createLinearGradient(0,(surfY-t*.2)*k,0,(surfY+t*1.4)*k);fade.addColorStop(0,'rgba(3,3,5,0)');fade.addColorStop(1,`rgba(3,3,5,${dark})`);lctx.fillStyle=fade;lctx.fillRect(0,Math.max(0,(surfY-t*.2)*k),lw,t*1.6*k);
      lctx.globalCompositeOperation='destination-out';
      const lamp=(cx,cy,r,a=1)=>{const g=lctx.createRadialGradient(cx*k,cy*k,0,cx*k,cy*k,r*k);g.addColorStop(0,`rgba(0,0,0,${a})`);g.addColorStop(.55,`rgba(0,0,0,${a*.75})`);g.addColorStop(1,'rgba(0,0,0,0)');lctx.fillStyle=g;lctx.fillRect((cx-r)*k,(cy-r)*k,r*2*k,r*2*k);};
      const mx=(P.rx-cam.x)*t+vw/2,my=(P.ry-cam.y)*t+vh/2;lamp(mx,my,lampCells()*t*1.15+Math.sin(time*7)*t*.03);
      lamp(mx+P.face*t*1.4,my,lampCells()*t*.8,.5);
      if(seen[idx(world.labX,world.labY)])lamp((world.labX+3.5-cam.x)*t+vw/2,(world.labY+1-cam.y)*t+vh/2,t*5.5,.9);
      ctx.drawImage(L,0,0,vw,vh);
      const heat=S.heat;if(heat>.05){ctx.fillStyle=`rgba(255,90,30,${heat*.18})`;ctx.fillRect(0,0,vw,vh);}}
    for(const f of floats){ctx.globalAlpha=Math.min(1,(1.3-f.life)*2);ctx.fillStyle=f.color;ctx.font=`600 ${Math.max(11,t*.3)}px "JetBrains Mono",monospace`;ctx.textAlign='center';ctx.fillText(f.text,(f.x-cam.x-.5)*t+vw/2,(f.y-cam.y-.5)*t+vh/2);}ctx.globalAlpha=1;
    ctx.restore();
  }
  function frame(now){
    if(!running)return;raf=requestAnimationFrame(frame);
    const dt=Math.min(.05,(now-last)/1000);last=now;
    if(!paused)update(dt);else{time+=dt;}
    render();ui.hud(S,api,{depth:depthOf(P.y),temp:rockTemp(depthOf(P.y)),zone:zoneAt(P.x,P.y),surface:P.y===-1});
  }
  resize();
  return api;
}
