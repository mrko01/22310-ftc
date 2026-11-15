// Minex world: a seeded, deterministic cross-section of the Sudbury Basin.
// Every cell is 20 m. The same seed always builds the same mine, so a save only
// has to remember which cells were dug or filled with rockburst rubble.
import {ZONES,ROCKS,MINERALS,rockIndex,mineralIndex,W,H,ROW_M,SPECIAL} from './data.js';

export function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function hash(x,y,s=0){let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(s|0,2246822519);h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;}
const smooth=t=>t*t*(3-2*t);
export function noise1(seed,x){const i=Math.floor(x),f=x-i;return hash(i,0,seed)+(hash(i+1,0,seed)-hash(i,0,seed))*smooth(f);}
export function noise2(seed,x,y){const i=Math.floor(x),j=Math.floor(y),fx=smooth(x-i),fy=smooth(y-j);const a=hash(i,j,seed),b=hash(i+1,j,seed),c=hash(i,j+1,seed),d=hash(i+1,j+1,seed);return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;}

export function generate(seed){
  const R=rng(seed),n=W*H;
  const rock=new Uint8Array(n),ore=new Uint8Array(n),zone=new Uint8Array(n),special=new Uint8Array(n);
  const id=(x,y)=>y*W+x,inside=(x,y)=>x>=0&&x<W&&y>=0&&y<H;
  // Wavy contacts between layers: real contacts are never perfectly flat.
  const top=ZONES.map((z,k)=>Array.from({length:W},(_,x)=>k===0?0:Math.max(1,Math.round(z.from/ROW_M+(noise1(seed+k*97,x*.16)-.5)*(k<2?1:3.4)))));
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){let k=0;for(let j=1;j<ZONES.length;j++)if(y>=top[j][x])k=j;zone[id(x,y)]=k;rock[id(x,y)]=rockIndex[ZONES[k].rock];}
  const zoneRows=k=>[Math.round(ZONES[k].from/ROW_M),Math.round(ZONES[k].to/ROW_M)];
  const walk=(x,y,len,fn,bias=[0,0])=>{for(let s=0;s<len;s++){if(inside(x,y))fn(x,y);const r=R();if(r<.25+bias[0])x++;else if(r<.5)x--;else if(r<.75+bias[1])y++;else y--;x=Math.max(0,Math.min(W-1,x));}};
  // Glacial erratics: boulders dropped by the last ice sheet sit in the till.
  for(let x=0;x<W;x++)if(R()<.22)rock[id(x,1)]=rockIndex.boulder;
  // Inclusions and veins that make each layer feel like real rock.
  for(const z of ZONES)for(const f of z.features||[]){
    const k=ZONES.indexOf(z),[y0,y1]=zoneRows(k);
    for(let c=0;c<f.count;c++){const sx=Math.floor(R()*W),sy=y0+Math.floor(R()*(y1-y0));walk(sx,sy,f.len,(x,y)=>{if(zone[id(x,y)]===k)rock[id(x,y)]=rockIndex[f.rock];},f.bias);}
  }
  // An offset dyke: a near-vertical sheet of quartz diorite with its own ore pods.
  const dykeZone=ZONES.findIndex(z=>z.id==='footwall');
  const dykeX=4+Math.floor(R()*5),dykeTop=Math.round(ZONES[dykeZone].from/ROW_M)-2,dykeBottom=Math.round(2650/ROW_M);
  for(let y=dykeTop;y<dykeBottom;y++){const cx=dykeX+Math.round((noise1(seed+5,y*.09)-.5)*4);for(let x=cx;x<cx+2;x++)if(inside(x,y))rock[id(x,y)]=rockIndex.diorite;}
  // Ore pods: random walks seeded per zone, each pod dominated by one mineral.
  const pick=weights=>{const e=Object.entries(weights),t=e.reduce((s,[,w])=>s+w,0);let r=R()*t;for(const[k,w]of e){if((r-=w)<0)return k;}return e[0][0];};
  const placePods=(k,weights,density,podSize,filter)=>{
    const [y0,y1]=zoneRows(k),area=W*(y1-y0),pods=Math.max(1,Math.round(area*density/podSize));
    for(let p=0;p<pods;p++){
      const main=pick(weights),sx=Math.floor(R()*W),sy=y0+Math.floor(R()*(y1-y0));
      walk(sx,sy,Math.round(podSize*(.6+R()*.8)),(x,y)=>{const i=id(x,y);if(!filter(i))return;ore[i]=mineralIndex[R()<.72?main:pick(weights)];},[0,.05]);
    }
  };
  ZONES.forEach((z,k)=>{if(z.ores)placePods(k,z.ores,z.density,z.pod||5,i=>zone[i]===k&&rock[i]!==rockIndex.diorite&&rock[i]!==rockIndex.quartz);});
  placePods(dykeZone,{pentlandite:4,chalcopyrite:3,pyrrhotite:4,sperrylite:.5},.25*(dykeBottom-dykeTop)*2/(W*(zoneRows(dykeZone)[1]-zoneRows(dykeZone)[0])),3,i=>rock[i]===rockIndex.diorite);
  // Rare minerals sit beside the copper- and nickel-rich veins they grow with.
  ZONES.forEach((z,k)=>{for(const[key,count]of Object.entries(z.rare||{})){const host=new Set((MINERALS[mineralIndex[key]].hosts||[]).map(h=>mineralIndex[h]));let placed=0,tries=0;
    while(placed<count&&tries++<4000){const x=Math.floor(R()*W),[y0,y1]=zoneRows(k),y=y0+Math.floor(R()*(y1-y0)),i=id(x,y);if(zone[i]!==k||ore[i])continue;
      const near=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>inside(x+dx,y+dy)&&host.has(ore[id(x+dx,y+dy)]));if(near||tries>2500){ore[i]=mineralIndex[key];placed++;}}}});
  // SNOLAB: a clean lab carved 2 km down, beside the working mine.
  const labY=Math.round(SPECIAL.snolab.depth/ROW_M)-2,labX=W-10;
  for(let y=labY;y<labY+3;y++)for(let x=labX;x<labX+8;x++){const i=id(x,y);rock[i]=0;ore[i]=0;special[i]=1;}
  for(let x=labX-1;x<labX+9;x++)for(const y of[labY-1,labY+3])if(inside(x,y)){rock[id(x,y)]=rockIndex.shotcrete;ore[id(x,y)]=0;}
  for(let y=labY-1;y<labY+4;y++)for(const x of[labX-1,labX+8])if(inside(x,y)){rock[id(x,y)]=rockIndex.shotcrete;ore[id(x,y)]=0;}
  // Shatter cones: the only rocks on Earth that form from an impact shock wave.
  const coneRows=[Math.round(SPECIAL.cone.depth/ROW_M),Math.round(SPECIAL.cone.depth/ROW_M)+6];
  for(let c=0;c<3;c++){const x=2+Math.floor(R()*(W-4)),y=coneRows[0]+Math.floor(R()*(coneRows[1]-coneRows[0])),i=id(x,y);if(!special[i]&&rock[i]){special[i]=2;ore[i]=0;}}
  return {seed,rock,ore,zone,special,top,labX,labY,dykeX};
}

// Bitsets keep a whole mine's dig history in a few hundred bytes of storage.
export function packBits(arr){let s='';for(let i=0;i<arr.length;i+=8){let b=0;for(let j=0;j<8;j++)if(arr[i+j])b|=1<<j;s+=String.fromCharCode(b);}return btoa(s);}
export function unpackBits(str,length){const out=new Uint8Array(length);if(!str)return out;try{const s=atob(str);for(let i=0;i<length;i++)out[i]=(s.charCodeAt(i>>3)>>(i&7))&1;}catch{}return out;}
