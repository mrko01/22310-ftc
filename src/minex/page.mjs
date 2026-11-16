// Static markup for 22310.ca/minex: a scroll-stop descent, one scene per screen.
import {STORY,SOURCES,MINES} from './data.js';

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

// ---------- the mines, to scale ----------
function minesChart(){
  const top=70,k=.22,dx=140,x0=95;let s='';
  s+=`<path class="mc-ground" d="M24 ${top}H736"/>`;
  MINES.forEach((m,i)=>{
    const x=x0+i*dx,yb=top+m.depth*k,deepest=i===MINES.length-1;
    s+=`<g class="mc-mine${deepest?' deepest':''}">`;
    s+=`<path class="mc-frame" d="M${x-11} ${top}L${x} ${top-28}L${x+11} ${top}M${x} ${top-28}V${top}"/><circle class="mc-wheel" cx="${x}" cy="${top-30}" r="4"/>`;
    s+=`<line class="mc-shaft" x1="${x}" y1="${top}" x2="${x}" y2="${r1(yb)}" pathLength="1"/>`;
    for(let d=300;d<m.depth-80;d+=300){const y=r1(top+d*k),side=(i+d/300)%2?-1:1;s+=`<line class="mc-level" x1="${x}" y1="${y}" x2="${x+side*16}" y2="${y}" pathLength="1"/><circle class="mc-light" cx="${x+side*18}" cy="${y}" r="1.6"/>`;}
    const travel=r1(m.depth*k-14),dur=(5.5+m.depth/700).toFixed(1);
    s+=`<rect class="mc-cage" x="${x-5}" y="${top}" width="10" height="13" rx="1.5"><animateTransform attributeName="transform" type="translate" values="0 0;0 ${travel};0 ${travel};0 0;0 0" keyTimes="0;.42;.5;.92;1" calcMode="spline" keySplines=".65 0 .35 1;0 0 1 1;.65 0 .35 1;0 0 1 1" dur="${dur}s" begin="${(i*.9).toFixed(1)}s" repeatCount="indefinite"/></rect>`;
    const ly=yb+30;s+=`<text class="mc-name" x="${x}" y="${r1(ly)}" text-anchor="middle">${m.lines.map((l,j)=>`<tspan x="${x}" dy="${j?24:0}">${esc(l)}</tspan>`).join('')}</text>`;
    s+=`<text class="mc-depth" x="${x}" y="${r1(ly+24*m.lines.length)}" text-anchor="middle">${m.approx?'~':''}${fmt(m.depth)} m</text></g>`;
  });
  // SNOLAB inside Creighton, a miner drilling at Creighton's deepest face,
  // and a battery-electric loader running the bottom drift at Onaping Depth.
  const cx=x0+3*dx,cy=top+2380*k,sy=top+2070*k,ox=x0+4*dx,oy=top+2600*k;
  s+=`<g class="mc-snolab"><circle cx="${cx}" cy="${r1(sy)}" r="7"/><text x="${cx-14}" y="${r1(sy+5)}" text-anchor="end">SNOLAB</text></g>`;
  s+=`<g class="mc-drift"><path d="M${cx} ${r1(cy)}H${cx+52}"/></g>
    <g class="mc-miner" transform="translate(${cx+40} ${r1(cy)})"><circle class="hat" cx="0" cy="-15" r="3.2"/><path class="body" d="M-2.5 -12H2.5V-3H-2.5Z"/><path class="legs" d="M-2 -3V0M2 -3V0"/>
      <g class="drill"><path d="M2 -9H11"/><animateTransform attributeName="transform" type="translate" values="0 0;.8 .2;0 0" dur=".12s" repeatCount="indefinite"/></g>
      <circle class="beam" cx="3" cy="-15" r="1.2"/>
      ${[0,1,2].map(i=>`<circle class="spark" cx="12" cy="-9" r=".9"><animate attributeName="cx" values="12;${15+i*2}" dur="${(.35+i*.12).toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="cy" values="-9;${-13+i*3}" dur="${(.35+i*.12).toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="${(.35+i*.12).toFixed(2)}s" repeatCount="indefinite"/></circle>`).join('')}
    </g>`;
  s+=`<g class="mc-drift"><path d="M${ox} ${r1(oy)}H${ox-80}"/></g>
    <g class="mc-loader"><g><path class="beam" d="M${ox-74} ${r1(oy-6)}L${ox-96} ${r1(oy-13)}V${r1(oy+1)}Z"/><path class="bucket" d="M${ox-74} ${r1(oy-9)}L${ox-68} ${r1(oy-9)}L${ox-66} ${r1(oy-2)}H${ox-76}Z"/><rect class="hull" x="${ox-66}" y="${r1(oy-11)}" width="24" height="8" rx="1.5"/><rect class="cab" x="${ox-52}" y="${r1(oy-15)}" width="7" height="4"/><circle class="wheel" cx="${ox-61}" cy="${r1(oy-2)}" r="2.6"/><circle class="wheel" cx="${ox-47}" cy="${r1(oy-2)}" r="2.6"/>
      <animateTransform attributeName="transform" type="translate" values="0 0;48 0;48 0;0 0;0 0" keyTimes="0;.4;.5;.9;1" calcMode="spline" keySplines=".5 0 .5 1;0 0 1 1;.5 0 .5 1;0 0 1 1" dur="7s" repeatCount="indefinite"/></g></g>`;
  return`<svg class="mx-shafts" viewBox="0 0 760 720" role="img" aria-label="Deepest workings of five Sudbury mines, to scale: ${MINES.map(m=>`${m.name} ${m.approx?'about ':''}${fmt(m.depth)} metres`).join(', ')}.">${s}</svg>`;
}

// ---------- scenes ----------
const letters=t=>`<span aria-hidden="true">${t.split(' ').map(w=>`<b class="w">${[...w].map(c=>`<i>${esc(c)}</i>`).join('')}</b>`).join(' ')}</span>`;
const scene=(s,i)=>{
  const id=`stop-${i+1}`,has=s.key;
  const extra=s.kind==='mines'?minesChart():'';
  const links=s.kind==='robot'?`<p class="mx-links"><a class="mx-go" href="/team/">Meet the team ${arrow}</a><a class="mx-go" href="/sponsors/">Back our season ${arrow}</a></p>`:'';
  return `<section class="mx-scene mx-${s.kind}" id="${id}" data-depth="${s.depth}"${has?` data-specimen="${s.key}"`:''} aria-labelledby="${id}-t">
  ${extra}<div class="mx-copy">
    <h2 class="mx-name" id="${id}-t" aria-label="${esc(s.title)}">${letters(s.title)}</h2>
    ${s.formula?`<p class="mx-formula">${s.formula}</p>`:''}
    <p class="mx-text">${esc(s.text)}</p>
    ${s.note?`<p class="mx-note">${esc(s.note)}</p>`:''}${links}
  </div>
</section>`;};
const finds=STORY.map((s,i)=>[s,i]).filter(([s])=>s.kind==='mineral'||s.kind==='find');

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
    <a class="mx-go" href="#top">Back to the surface ${up}</a>
    <p class="mx-sources">Sources: ${SOURCES.map(([t,u])=>`<a href="${u}" target="_blank" rel="noreferrer">${esc(t)}</a>`).join(', ')}. Layers are stacked into one shaft for the story; the real basin is a tilted bowl.</p>
  </div>
</section>
</main>`;
