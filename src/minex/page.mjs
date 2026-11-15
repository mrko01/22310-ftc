// Static markup for 22310.ca/minex. Rendered at build time from the same data the game uses,
// so every fact on the page is real, crawlable text.
import {MINERALS,ROCKS,ZONES,GROUPS,FACTS,SOURCES,rockIndex} from './data.js';

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=m=>Math.round(m).toLocaleString('en-CA').replace(/,/g,' ');
const arrow='<svg class="arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M8 5h11v11" stroke="currentColor" stroke-width="1.6"/></svg>';
const down='<svg class="arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v16m6-6-6 6-6-6" stroke="currentColor" stroke-width="1.6"/></svg>';
const minerals=MINERALS.slice(1);
const oreNames=z=>[...Object.keys(z.ores||{}),...Object.keys(z.rare||{})].map(k=>minerals.find(m=>m.key===k)).filter(Boolean);

const hero=`<section class="mx-hero" aria-labelledby="mx-title">
  <div class="mx-hero-top mx-inner"><span>Minex / Earth science lab</span><span>46.49° N, 80.99° W</span><span>Greater Sudbury, Ontario</span></div>
  <div class="mx-hero-main mx-inner">
    <p class="mx-hero-kicker">A mining simulator by EDIT Saffron · FTC 22310</p>
    <h1 class="mx-title" id="mx-title" aria-label="Minex"><span aria-hidden="true">M</span><span aria-hidden="true">I</span><span aria-hidden="true">N</span><span aria-hidden="true">E</span><span aria-hidden="true">X</span></h1>
    <div class="mx-hero-foot">
      <p class="mx-hero-lede">Dig three kilometres into the Sudbury Basin, a 1.85-billion-year-old impact crater, and learn the ores that built a city.</p>
      <div class="mx-hero-actions"><button class="button magnetic" data-play><span data-play-label="Start the descent">Start the descent</span> ${down}</button><a class="button button-line" href="#guide">Field guide ${arrow}</a></div>
    </div>
  </div>
  <dl class="mx-hero-stats mx-inner">
    <div><dt>Impact</dt><dd>1.85 Ga</dd></div><div><dt>Depth to dig</dt><dd>3,000 m</dd></div><div><dt>Minerals</dt><dd>${minerals.length}</dd></div><div><dt>Plays on</dt><dd>Phone &amp; laptop</dd></div>
  </dl>
  <a class="mx-scroll" href="#how"><span>Scroll to descend</span><i aria-hidden="true"></i></a>
</section>`;

const how=`<section class="mx-sec" id="how" aria-labelledby="how-title"><div class="mx-inner">
  <header class="mx-head reveal"><p class="mx-kicker">01 · How Minex works</p><h2 class="mx-h" id="how-title">Dig. Identify. Assay.</h2><p class="mx-head-lede">A real cross-section of Sudbury geology, simplified into one shaft. Every rock, mineral and fact is drawn from geological surveys and mineral databases.</p></header>
  <ol class="mx-steps">
    <li class="mx-step reveal"><span class="mx-step-num">01</span><h3>Dig through real layers</h3><p>Tap, click or hold to tunnel down through glacial till, crater-fill breccia, the impact melt sheet and the footwall. Hard rock is slow; soft sulfide ore is fast.</p><span class="mx-step-meta">Mohs hardness sets drill time</span></li>
    <li class="mx-step reveal"><span class="mx-step-num">02</span><h3>Identify like a geologist</h3><p>Every new mineral opens a specimen card. Run magnet, streak and hardness tests to tell pyrrhotite from pentlandite, or chalcopyrite from pyrite.</p><span class="mx-step-meta">${minerals.length} minerals · 3 field tests</span></li>
    <li class="mx-step reveal"><span class="mx-step-num">03</span><h3>Assay, upgrade, go deeper</h3><p>Ride the cage up, sell ore at the assay office, and answer the assayer’s question for a bonus. Then upgrade drills, haulage and ventilation for the heat at depth.</p><span class="mx-step-meta">Rock reaches ~40 °C at 2 km</span></li>
  </ol>
</div></section>`;

const guide=`<section class="mx-sec" id="guide" aria-labelledby="guide-title"><div class="mx-inner">
  <header class="mx-head reveal"><p class="mx-kicker">02 · Field guide</p><h2 class="mx-h" id="guide-title">The ores of Sudbury</h2><p class="mx-head-lede">From pyrrhotite, the most common sulfide in the ore, to froodite, named after the Frood mine. Open any specimen for its formula, properties and story.</p></header>
  <div class="mx-chips reveal" role="group" aria-label="Filter minerals"><button data-filter="all" aria-pressed="true">All</button>${Object.entries(GROUPS).map(([k,v])=>`<button data-filter="${k}" aria-pressed="false">${esc(v)}</button>`).join('')}<span class="sr-only" id="mx-guide-count" aria-live="polite"></span></div>
  <div class="mx-specs">${minerals.map((m,i)=>`<button class="mx-spec reveal" data-mineral="${m.key}" data-group="${m.group}" aria-label="${esc(m.name)}, ${esc(m.metal)}. Open details">
    <span class="mx-spec-art"><canvas class="mx-specimen" data-specimen="${m.key}" aria-hidden="true"></canvas><span class="mx-spec-no">${String(i+1).padStart(2,'0')}</span><span class="mx-spec-got">Collected</span></span>
    <span class="mx-spec-body"><span class="mx-spec-name">${esc(m.name)}</span><span class="mx-spec-formula">${m.formula}</span><span class="mx-spec-metal">${esc(m.metal)}</span>
    <span class="mx-spec-h" aria-hidden="true"><span>Mohs</span><span class="mx-spec-scale"><i></i></span><span>${m.h[0]===m.h[1]?m.h[0]:m.h[0]+'–'+m.h[1]}</span></span></span></button>`).join('')}</div>
</div></section>`;

const basin=`<section class="mx-sec mx-basin" id="basin" aria-labelledby="basin-title"><div class="mx-inner">
  <header class="mx-head reveal"><p class="mx-kicker">03 · Into the basin</p><h2 class="mx-h" id="basin-title">Eight layers, three kilometres</h2><p class="mx-head-lede">Keep scrolling: the background is the Minex mine itself, sinking with you. The real basin is a tilted bowl, so no single shaft passes every layer. Minex stacks them in their true order.</p></header>
  <div class="mx-basin-grid">
    <nav class="mx-column" aria-label="Layers">${ZONES.map((z,i)=>`<a href="#layer-${z.id}" data-layer-link><span>${z.num}</span><b>${esc(z.name)}</b><em>${fmt(z.from)} m</em></a>`).join('')}</nav>
    <div class="mx-layers">${ZONES.map(z=>{const r=ROCKS[rockIndex[z.rock]],ores=oreNames(z);return`<article class="mx-layer" id="layer-${z.id}" data-layer-from="${z.from}" data-layer-to="${z.to}">
      <div class="mx-layer-card reveal"><p class="mx-layer-depth"><span>${z.num}</span>${fmt(z.from)}–${fmt(z.to)} m</p><h3>${esc(z.name)}</h3><p class="mx-layer-rock"><b>${esc(r.name)}.</b> ${esc(r.desc)}</p>${z.toast?`<p>${esc(z.toast)}</p>`:''}
      ${ores.length?`<ul class="mx-layer-ores" aria-label="Minerals in this layer">${ores.map(m=>`<li><i class="mx-dot mx-dot-${m.group}"></i>${esc(m.name)}</li>`).join('')}</ul>`:'<p class="mx-layer-none">No ore here. Just keep digging.</p>'}</div></article>`;}).join('')}</div>
  </div>
</div></section>`;

const facts=`<section class="mx-sec" id="sudbury" aria-labelledby="facts-title"><div class="mx-inner">
  <header class="mx-head reveal"><p class="mx-kicker">04 · Sudbury, by the numbers</p><h2 class="mx-h" id="facts-title">A city built on an impact</h2></header>
  <div class="mx-bento">${FACTS.map((f,i)=>`<article class="mx-fact reveal ${i===0||i===3?'wide':''}"><p class="mx-fact-k">${esc(f.k)}</p><h3>${esc(f.t)}</h3><p>${esc(f.d)}</p></article>`).join('')}</div>
</div></section>`;

const final=`<section class="mx-final" aria-labelledby="final-title"><div class="mx-inner">
  <p class="mx-kicker reveal">3,000 m below</p><h2 class="mx-final-h reveal" id="final-title">Ready to go underground?</h2>
  <div class="mx-final-actions reveal"><button class="button magnetic" data-play><span data-play-label="Start the descent">Start the descent</span> ${down}</button><p>Saves automatically on this device. Sound is off until you turn it on.</p></div>
</div></section>`;

const sources=`<section class="mx-sources" aria-labelledby="sources-title"><div class="mx-inner"><h2 id="sources-title" class="mx-kicker">Sources</h2><ul>${SOURCES.map(([t,u])=>`<li><a href="${u}" target="_blank" rel="noreferrer">${esc(t)} ↗</a></li>`).join('')}</ul><p>Depths, grades and temperatures are rounded for gameplay. Mine and lab names belong to their owners; Minex is an independent educational project.</p></div></section>`;

export const minexBody=`<main tabindex="-1" id="main" class="mx-page"><canvas class="mx-strata" aria-hidden="true"></canvas>
<div class="mx-depthbar" aria-hidden="true"><span class="mx-label">Depth</span><strong data-page-depth>0 m</strong><span data-page-zone>Surface</span></div>
${hero}${how}${guide}${basin}${facts}${final}${sources}</main>
<section class="mx-game" id="minex-game" aria-label="Minex mining simulator" hidden></section>`;
