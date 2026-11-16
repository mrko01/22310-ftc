// Static markup for 22310.ca/minex: a scroll-stop descent, one scene per screen.
import {STORY,SOURCES} from './data.js';

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=m=>Math.round(m).toLocaleString('en-CA');
const down='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v16m6-6-6 6-6-6" stroke="currentColor" stroke-width="1.5"/></svg>';
const up='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20V4m-6 6 6-6 6 6" stroke="currentColor" stroke-width="1.5"/></svg>';
const arrow='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M8 5h11v11" stroke="currentColor" stroke-width="1.5"/></svg>';

// ---------- Greater Sudbury at dusk (hand-built SVG, deterministic) ----------
function rand(seed){let a=seed;return()=>{a=(a*1664525+1013904223)>>>0;return a/4294967296;};}
const r1=v=>Math.round(v*10)/10;
function ridge(seed,base,amp,step,w=1600){const R=rand(seed);let d=`M0 420V${base}`;for(let x=0;x<=w;x+=step){const y=base-amp*(.5+.5*Math.sin(x/w*7+seed))-R()*amp*.35;d+=`L${x} ${r1(y)}`;}return d+`V420Z`;}
function spruce(x,base,h,R){
  const w=h*.2,tiers=Math.max(5,Math.round(h/7));let l=`M${r1(x)} ${r1(base-h)}`,r=[];
  for(let i=1;i<=tiers;i++){const t=i/tiers,y=base-h+t*h*.94,half=w*(.18+.82*t)*(.75+R()*.5);l+=`L${r1(x-half)} ${r1(y)}L${r1(x-half*.35)} ${r1(y-h/tiers*.35)}`;r.push(`L${r1(x+half*.35)} ${r1(y-h/tiers*.35)}L${r1(x+half)} ${r1(y)}`);}
  return l+`L${r1(x-w*.06)} ${base}L${r1(x+w*.06)} ${base}`+r.reverse().join('')+'Z';
}
function treeline(seed,from,to,base,minH,maxH,gap){const R=rand(seed);let d='';for(let x=from;x<to;x+=gap*(.6+R()*.8))d+=spruce(x,base+R()*3,minH+R()*(maxH-minH),R);return d;}
function birches(seed,from,to,base){const R=rand(seed);let trunks='',crowns='';for(let x=from;x<to;x+=18+R()*26){const h=34+R()*30,lean=(R()-.5)*6;trunks+=`M${r1(x)} ${base}L${r1(x+lean)} ${r1(base-h)}`;crowns+=`M${r1(x+lean)} ${r1(base-h-9)}m-9 0a9 7 0 1 0 18 0a9 7 0 1 0-18 0`;}return`<path class="birch" d="${trunks}"/><path class="near" d="${crowns}"/>`;}
function headframe(x0,top,g){
  // A steel headframe: braced tower, back-leg to the hoist house, two turning sheave wheels.
  const x1=x0+40;let s=`<path class="hf-main" d="M${x0} ${g}V${top}M${x1} ${g}V${top}M${x0-4} ${top}H${x1+4}"/>`;
  for(let y=top;y<g-20;y+=32)s+=`<path d="M${x0} ${y}L${x1} ${y+32}M${x1} ${y}L${x0} ${y+32}M${x0} ${y+32}H${x1}"/>`;
  s+=`<path d="M${x1} ${top+8}L${x1+146} ${g-30}M${x1} ${top+38}L${x1+124} ${g-30}"/>`;
  for(let k=1;k<=5;k++){const t=k/6;s+=`<path d="M${r1(x1+146*t)} ${r1(top+8+(g-38-top)*t)}L${r1(x1+124*t)} ${r1(top+38+(g-68-top)*t)}"/>`;}
  const wheel=(cx,cy,r)=>`<g class="sheave"><circle cx="${cx}" cy="${cy}" r="${r}"/>${[0,1,2,3].map(i=>{const a=i*Math.PI/4;return`<path d="M${r1(cx-Math.cos(a)*r)} ${r1(cy-Math.sin(a)*r)}L${r1(cx+Math.cos(a)*r)} ${r1(cy+Math.sin(a)*r)}"/>`;}).join('')}</g>`;
  s+=wheel(x0+8,top-14,15)+wheel(x1-4,top-10,11);
  s+=`<path class="fill" d="M${x1+114} ${g}V${g-44}H${x1+200}V${g}ZM${x1+110} ${g-44}L${x1+157} ${g-62}L${x1+204} ${g-44}ZM${x0-20} ${g}V${g-26}H${x1+20}V${g}Z"/><rect class="win" x="${x1+128}" y="${g-30}" width="6" height="5"/><rect class="win" x="${x1+150}" y="${g-30}" width="6" height="5"/>`;
  return`<g class="mx-headframe">${s}</g>`;
}
const lights=(seed,n,from,to,y0,y1)=>{const R=rand(seed);let d='';for(let i=0;i<n;i++){d+=`<circle class="${R()<.25?'lamp tw':'lamp'}" cx="${r1(from+R()*(to-from))}" cy="${r1(y0+R()*(y1-y0))}" r="${r1(.8+R()*.9)}"/>`;}return d;};
const shimmer=(seed,n)=>{const R=rand(seed);let d='';for(let i=0;i<n;i++){const x=R()*1600,y=384+R()*24,l=8+R()*30;d+=`M${r1(x)} ${r1(y)}h${r1(l)}`;}return d;};
// Copper Cliff: the Superstack (shown part-way through its 2026 dismantling), the two
// stacks that replaced it, the smelter, and a slag pour glowing down the dump.
const copperCliff=`<g class="mx-smelter">
  <path class="fill" d="M928 372V318L950 308V318L972 308V318L994 308V318L1016 308V300H1060V318L1082 308V318L1104 308V318L1126 308V372Z"/>
  ${[940,958,978,1000,1030,1046,1090,1112].map((x,i)=>`<rect class="win${i%3?'':' tw'}" x="${x}" y="${330+(i%2)*14}" width="5" height="4"/>`).join('')}
  <path class="stack" d="M1029 318L1036 158H1052L1059 318Z"/><path class="rimlight" d="M1052 160L1059 318"/><path class="band" d="M1036.6 176H1051.4"/>
  <path class="rig" d="M1031 158V142H1057V158M1031 150H1057M1034 142L1040 158M1046 142L1052 158M1044 142V128H1078"/>
  <circle class="mx-beacon" cx="1044" cy="124" r="3"/>
  <path class="fill" d="M1074 318L1077 252H1085L1088 318ZM1094 318L1096 262H1103L1105 318Z"/>
  <g class="plume p1"><circle cx="1081" cy="246" r="7"/><circle cx="1084" cy="238" r="9"/><circle cx="1089" cy="228" r="11"/></g>
  <g class="plume p2"><circle cx="1099" cy="256" r="6"/><circle cx="1102" cy="248" r="8"/><circle cx="1106" cy="240" r="10"/></g>
  <path class="slag" d="M1136 374Q1180 330 1236 334Q1298 338 1336 374Z"/>
  <ellipse class="glow" cx="1258" cy="352" rx="70" ry="22"/>
  <path class="pour" d="M1240 336C1252 344 1262 352 1276 370"/>
</g>`;
// Science North: two snowflake-shaped buildings on a rock point in Ramsey Lake.
const scienceNorth=`<g class="mx-sciencenorth">
  <path class="fill" d="M672 392Q700 368 760 372Q812 366 846 392Z"/>
  <path class="fill" d="M702 378L710 356L744 343L778 356L786 378Z"/><path class="edge" d="M710 356L744 343L778 356M744 343V378"/>
  <path class="fill" d="M790 380L796 366L812 360L828 366L834 380Z"/><path class="edge" d="M796 366L812 360L828 366"/>
  <path class="win-line" d="M712 374H782M798 377H830"/>
</g>`;
const nickel=`<g class="mx-nickel"><path class="near" d="M1360 412Q1420 370 1490 412Z"/><circle class="coin" cx="1424" cy="346" r="36"/><circle class="rim" cx="1424" cy="346" r="30"/><circle class="rim faint" cx="1424" cy="346" r="33.5"/><path class="near" d="M1414 380H1434V394H1414Z"/></g>`;
const skyline=`<svg class="mx-skyline" viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="mx-lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2316"/><stop offset=".35" stop-color="#22151a"/><stop offset="1" stop-color="#0b0a0e"/></linearGradient>
    <radialGradient id="mx-glow"><stop offset="0" stop-color="#ff7a2f" stop-opacity=".55"/><stop offset="1" stop-color="#ff7a2f" stop-opacity="0"/></radialGradient>
    <linearGradient id="mx-pour" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd58a"/><stop offset="1" stop-color="#ff4d1a"/></linearGradient>
  </defs>
  <g class="lay-far"><path class="far" d="${ridge(3,322,40,40)}"/>${lights(5,70,0,1600,300,346)}</g>
  <g class="lay-mid">${copperCliff}<path class="mid" d="${ridge(7,362,24,32)}"/><path class="mid" d="${treeline(11,0,900,366,12,26,9)}${treeline(12,1340,1600,366,12,26,9)}"/>${lights(9,30,0,900,350,366)}</g>
  <g class="lay-lake"><rect x="0" y="378" width="1600" height="34" fill="url(#mx-lake)"/><path class="reflect" d="M1044 380V408M1081 380V396M1099 380V394"/><path class="shimmer" d="${shimmer(21,46)}"/>${scienceNorth}</g>
  <g class="lay-near">${headframe(436,140,412)}${nickel}<path class="near" d="${ridge(13,414,6,50)}"/><path class="near" d="${treeline(17,0,330,414,26,58,13)}${treeline(23,1500,1600,414,30,64,12)}"/>${birches(29,250,420,414)}${birches(31,1270,1360,414)}<rect class="near" x="0" y="414" width="1600" height="6"/></g>
</svg>`;

// ---------- a mine's deepest station, in cutaway ----------
// The shaft drops in from above and opens onto a lit drift. Each mine has its own scene:
// Nickel Rim South sits idle, Garson is drilling, Creighton is busy, Onaping Depth runs itself.
const anim=(attr,values,dur,extra='')=>`<animateTransform attributeName="transform" type="${attr}" values="${values}" dur="${dur}s" repeatCount="indefinite" ${extra}/>`;
const sway=(vals,dur,kt='0;.42;.5;.92;1')=>anim('translate',vals,dur,`keyTimes="${kt}" calcMode="spline" keySplines=".55 0 .45 1;0 0 1 1;.55 0 .45 1;0 0 1 1"`);
function miner(x,face=1,walk=0){
  const beam=`<path class="v-beam" d="M${4*face} -27L${46*face} -40V-8Z"/>`;
  const body=`<g class="v-miner" transform="translate(${x} 466)">${beam}<circle class="v-hat" cx="0" cy="-30" r="5"/><circle class="v-lamp" cx="${4*face}" cy="-31" r="1.6"/><path class="v-coverall" d="M-5 -24H5V-8H-5Z"/><path class="v-stripe" d="M-5 -15H5"/><path class="v-legs" d="M-3 -8V0M3 -8V0"/></g>`;
  return walk?`<g>${body}${sway(`0 0;${walk} 0;${walk} 0;0 0;0 0`,9)}</g>`:body;
}
function loaderSvg(x,dist,dur,auto=false){
  const g=`<g class="v-loader" transform="translate(${x} 466)"><path class="v-beam" d="M-44 -18L-110 -38V2Z"/><path class="v-bucket" d="M-44 -26L-30 -26L-26 -6H-48Z"/><path class="v-hull" d="M-28 -30H26V-10H-28Z"/><path class="v-batt" d="M2 -40H24V-30H2Z"/><path class="v-cab" d="M-14 -40H-2V-30H-14Z"/><circle class="v-wheel" cx="-16" cy="-6" r="7"/><circle class="v-wheel" cx="16" cy="-6" r="7"/>${auto?'<circle class="v-blink" cx="13" cy="-44" r="2.4"><animate attributeName="opacity" values="1;.15;1" dur="1.2s" repeatCount="indefinite"/></circle>':''}</g>`;
  return `<g>${g}${sway(`0 0;${dist} 0;${dist} 0;0 0;0 0`,dur)}</g>`;
}
function jumbo(x){
  return `<g class="v-jumbo" transform="translate(${x} 466)"><path class="v-hull" d="M0 -26H70V-8H0Z"/><path class="v-cab" d="M46 -44H66V-26H46Z"/><circle class="v-wheel" cx="14" cy="-6" r="7"/><circle class="v-wheel" cx="56" cy="-6" r="7"/>
    <path class="v-boom" d="M4 -22L-36 -40"/><g>${'<path class="v-steel" d="M-36 -40L-62 -46"/>'}${anim('translate','0 0;-4 1;0 0',.16)}</g>
    ${[0,1,2,3].map(i=>`<circle class="v-dust" cx="-62" cy="-46" r="${3+i}"><animate attributeName="opacity" values=".6;0" dur="${1.1+i*.3}s" begin="${i*.3}s" repeatCount="indefinite"/><animate attributeName="r" values="2;${10+i*4}" dur="${1.1+i*.3}s" begin="${i*.3}s" repeatCount="indefinite"/></circle>`).join('')}</g>`;
}
function vignette(kind){
  const idle=kind==='nrs';let s='';
  s+=`<defs><radialGradient id="vg-${kind}"><stop offset="0" stop-color="#ffb35c" stop-opacity=".42"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></radialGradient></defs>`;
  // Shaft: steel guides and buntons dropping in from above.
  s+=`<rect class="v-void" x="300" y="-120" width="40" height="508"/><path class="v-guide" d="M308 -120V386M332 -120V386"/>`;
  let b='';for(let y=-110;y<380;y+=34)b+=`M300 ${y}H340`;s+=`<path class="v-bunton" d="${b}"/>`;
  // The station: a long drift with rock bolts and lights.
  s+=`<rect class="v-drift" x="34" y="384" width="572" height="86" rx="22"/>`;
  let bolts='';for(let x=58;x<590;x+=22)if(x<296||x>344)bolts+=`M${x} 390v4`;s+=`<path class="v-bolt" d="${bolts}"/><path class="v-floor" d="M48 466H592"/>`;
  for(const x of[110,220,420,530])s+=`<g class="v-light${idle?' off':''}"><ellipse cx="${x}" cy="420" rx="70" ry="52" fill="url(#vg-${kind})"/><rect x="${x-9}" y="388" width="18" height="4" rx="1"/></g>`;
  // The cage: cycling up and down, or parked where it was left.
  const cage=`<g class="v-cage"><rect x="304" y="0" width="32" height="46" rx="2"/><path d="M304 16H336M320 0V46"/></g>`;
  s+=idle?`<g transform="translate(0 420)">${cage}</g>`:`<g>${cage}${sway('0 -140;0 420;0 420;0 -140;0 -140',kind==='creighton'?8:11,'0;.4;.55;.95;1')}</g>`;
  if(kind==='garson')s+=jumbo(130)+miner(240,-1)+miner(470,1,28);
  if(kind==='creighton')s+=miner(380,1,90)+miner(268,-1)+loaderSvg(540,-120,9);
  if(kind==='onaping')s+=loaderSvg(560,-210,11,true)+`<g class="v-cam"><path d="M150 392H166V400H150Z"/><circle cx="158" cy="403" r="2"><animate attributeName="opacity" values="1;.2;1" dur="2s" repeatCount="indefinite"/></circle></g>`;
  return `<svg class="mx-vig mx-vig-${kind}" viewBox="24 196 592 290" aria-hidden="true" focusable="false">${s}</svg>`;
}

// ---------- scenes ----------
const letters=t=>`<span aria-hidden="true">${t.split(' ').map(w=>`<b class="w">${[...w].map(c=>`<i>${esc(c)}</i>`).join('')}</b>`).join(' ')}</span>`;
const scene=(s,i)=>{
  const id=`stop-${i+1}`,has=s.key;
  const extra=s.kind==='mine'?vignette(s.mine):'';
  return `<section class="mx-scene mx-${s.kind}" id="${id}" data-depth="${s.depth}"${has?` data-specimen="${s.key}"`:''} aria-labelledby="${id}-t">
  ${extra}<div class="mx-copy">
    <h2 class="mx-name" id="${id}-t" aria-label="${esc(s.title)}">${letters(s.title)}</h2>
    ${s.formula?`<p class="mx-formula">${s.formula}</p>`:''}
    <p class="mx-text">${esc(s.text)}</p>
    ${s.note?`<p class="mx-note">${esc(s.note)}</p>`:''}
  </div>
</section>`;};
const finds=STORY.map((s,i)=>[s,i]).filter(([s])=>s.kind!=='layer');

export const minexBody=`<main tabindex="-1" id="main" class="mx">
<canvas class="mx-stage" aria-hidden="true"></canvas>
<div class="mx-sky" aria-hidden="true">${skyline}</div>
<div class="mx-gauge" aria-hidden="true"><p class="mx-gauge-num"><span data-depth>0</span><small>m</small></p></div>
<div class="mx-rail" aria-hidden="true"><i class="mx-rail-fill"></i><div data-marks></div><i class="mx-rail-now"></i></div>
<section class="mx-scene mx-hero" id="top" data-depth="-16" aria-labelledby="mx-title">
  <div class="mx-copy">
    <h1 class="mx-name mx-title" id="mx-title" aria-label="Minex">${letters('Minex')}</h1>
    <p class="mx-lede">A descent into the Sudbury Basin, where something ten kilometres wide struck the Earth 1.85 billion years ago.</p>
  </div>
  <a class="mx-hint" href="#stop-1">Scroll to descend ${down}</a>
</section>
${STORY.map(scene).join('\n')}
<section class="mx-scene mx-end" id="bottom" data-depth="2600" aria-labelledby="mx-end-t">
  <div class="mx-copy">
    <h2 class="mx-name" id="mx-end-t" aria-label="What you found">${letters('What you found')}</h2>
    <ol class="mx-found">${finds.map(([s,i])=>`<li><a href="#stop-${i+1}"><span>${esc(s.title)}</span><em>${fmt(s.depth)} m</em></a></li>`).join('')}</ol>
    <p class="mx-links"><a class="mx-go" href="#top">Back to the surface ${up}</a><a class="mx-go" href="/team/">Meet the team ${arrow}</a><a class="mx-go" href="/sponsors/">Back our season ${arrow}</a></p>
    <p class="mx-credit">Minex is made by EDIT Saffron, FTC Team 22310, at Lo-Ellen Park Secondary School in Greater Sudbury.</p>
    <p class="mx-sources">Sources: ${SOURCES.map(([t,u])=>`<a href="${u}" target="_blank" rel="noreferrer">${esc(t)}</a>`).join(', ')}. Layers are stacked into one shaft for the story; the real basin is a tilted bowl.</p>
  </div>
</section>
</main>`;
