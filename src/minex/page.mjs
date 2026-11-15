// Static markup for 22310.ca/minex: a scroll-stop descent, one scene per screen.
import {STORY,SOURCES} from './data.js';

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=m=>Math.round(m).toLocaleString('en-CA');
const down='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v16m6-6-6 6-6-6" stroke="currentColor" stroke-width="1.5"/></svg>';
const up='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20V4m-6 6 6-6 6 6" stroke="currentColor" stroke-width="1.5"/></svg>';

// ---------- Sudbury skyline (hand-built SVG, deterministic) ----------
function rand(seed){let a=seed;return()=>{a=(a*1664525+1013904223)>>>0;return a/4294967296;};}
const r1=v=>Math.round(v*10)/10;
function ridge(seed,base,amp,step,w=1600){const R=rand(seed);let d=`M0 400V${base}`;for(let x=0;x<=w;x+=step){const y=base-amp*(.5+.5*Math.sin(x/w*7+seed))-R()*amp*.35;d+=`L${x} ${r1(y)}`;}return d+`V400Z`;}
function spruce(x,base,h,R){
  // A black spruce: narrow, ragged tiers, drooping crown.
  const w=h*.2,tiers=Math.max(5,Math.round(h/7));let l=`M${r1(x)} ${r1(base-h)}`,r=[];
  for(let i=1;i<=tiers;i++){const t=i/tiers,y=base-h+t*h*.94,half=w*(.18+.82*t)*(.75+R()*.5);l+=`L${r1(x-half)} ${r1(y)}L${r1(x-half*.35)} ${r1(y-h/tiers*.35)}`;r.push(`L${r1(x+half*.35)} ${r1(y-h/tiers*.35)}L${r1(x+half)} ${r1(y)}`);}
  return l+`L${r1(x-w*.06)} ${base}L${r1(x+w*.06)} ${base}`+r.reverse().join('')+'Z';
}
function treeline(seed,from,to,base,minH,maxH,gap){const R=rand(seed);let d='';for(let x=from;x<to;x+=gap*(.6+R()*.8)){d+=spruce(x,base+R()*3,minH+R()*(maxH-minH),R);}return d;}
const headframe=(()=>{
  // Steel headframe: braced tower, back-leg to the hoist house, two sheave wheels.
  const x0=468,x1=508,top=128,g=400;let s='';
  s+=`<path d="M${x0} ${g}V${top}M${x1} ${g}V${top}M${x0-4} ${top}H${x1+4}"/>`;
  for(let y=top;y<g-20;y+=34)s+=`<path d="M${x0} ${y}L${x1} ${y+34}M${x1} ${y}L${x0} ${y+34}M${x0} ${y+34}H${x1}"/>`;
  s+=`<path d="M${x1} ${top+8}L${x1+150} ${g-28}M${x1} ${top+40}L${x1+128} ${g-28}"/>`;
  for(let k=0;k<5;k++){const t=(k+1)/6,ax=x1+150*t,ay=top+8+(g-36-top)*t,bx=x1+128*t,by=top+40+(g-68-top)*t;s+=`<path d="M${r1(ax)} ${r1(ay)}L${r1(bx)} ${r1(by)}"/>`;}
  const wheel=(cx,cy,r)=>`<circle cx="${cx}" cy="${cy}" r="${r}"/>`+[0,1,2,3].map(i=>{const a=i*Math.PI/4;return`<path d="M${r1(cx-Math.cos(a)*r)} ${r1(cy-Math.sin(a)*r)}L${r1(cx+Math.cos(a)*r)} ${r1(cy+Math.sin(a)*r)}"/>`;}).join('');
  s+=wheel(x0+8,top-14,15)+wheel(x1-4,top-10,11);
  s+=`<path class="fill" d="M${x1+118} ${g}V${g-44}H${x1+204}V${g}Z"/><path class="fill" d="M${x1+114} ${g-44}L${x1+161} ${g-62}L${x1+208} ${g-44}Z"/><path class="fill" d="M${x0-20} ${g}V${g-26}H${x1+20}V${g}Z"/>`;
  return `<g class="mx-headframe">${s}</g>`;
})();
const stack=`<g class="mx-stack"><path class="fill" d="M1176 400L1186 74H1206L1216 400Z"/><path class="band" d="M1186.5 92H1205.5M1187.2 112H1204.8"/><rect class="fill" x="1182" y="70" width="28" height="6"/><circle class="mx-beacon" cx="1196" cy="64" r="3.2"/></g>`;
const nickel=`<g class="mx-nickel"><path class="fill" d="M120 400Q190 352 262 400Z"/><circle class="fill coin" cx="190" cy="318" r="48"/><circle class="rim" cx="190" cy="318" r="41"/><circle class="rim faint" cx="190" cy="318" r="45"/><path class="fill" d="M178 362H202V376H178Z"/></g>`;
const skyline=`<svg class="mx-skyline" viewBox="0 0 1600 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
  <path class="far" d="${ridge(3,330,46,40)}"/>
  ${stack}
  <path class="mid" d="${ridge(7,362,30,32)}"/>
  <path class="mid" d="${treeline(11,0,1600,366,14,30,9)}"/>
  ${nickel}${headframe}
  <path class="near" d="${ridge(13,388,10,50)}"/>
  <path class="near" d="${treeline(17,0,380,392,26,58,13)}${treeline(19,720,1100,394,22,48,15)}${treeline(23,1300,1600,392,30,64,12)}"/>
  <rect class="near" x="0" y="396" width="1600" height="4"/>
</svg>`;

// ---------- scenes ----------
// Letters are split at build time so titles can resolve letter by letter.
const letters=t=>`<span aria-hidden="true">${t.split(' ').map(w=>`<b class="w">${[...w].map(c=>`<i>${esc(c)}</i>`).join('')}</b>`).join(' ')}</span>`;
const scene=(s,i)=>{
  const id=`stop-${i+1}`,has=s.kind!=='layer';
  return `<section class="mx-scene mx-${s.kind}" id="${id}" data-depth="${s.depth}"${has?` data-specimen="${s.key}"`:''} aria-labelledby="${id}-t">
  <div class="mx-copy">
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
    <h2 class="mx-name" id="mx-end-t" aria-label="2,600 metres">${letters('2,600 metres')}</h2>
    <p class="mx-text">About as deep as Sudbury mines go today, where the rock is close to 50&nbsp;°C. On the way down you passed:</p>
    <ol class="mx-found">${finds.map(([s,i])=>`<li><a href="#stop-${i+1}"><span>${esc(s.title)}</span><em>${fmt(s.depth)} m</em></a></li>`).join('')}</ol>
    <a class="mx-go" href="#top">Back to the surface ${up}</a>
    <p class="mx-sources">Sources: ${SOURCES.map(([t,u])=>`<a href="${u}" target="_blank" rel="noreferrer">${esc(t)}</a>`).join(', ')}. Layers are stacked into one shaft for the story; the real basin is a tilted bowl.</p>
  </div>
</section>
</main>`;
