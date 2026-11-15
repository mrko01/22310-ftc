// Minex interface: HUD, sheets (discovery, field guide, workshop, assay, menu) and transitions.
import {MINERALS,ROCKS,ZONES,UPGRADES,SPECIAL,GROUPS,rockIndex,mineralIndex} from './data.js';
import {drawSpecimen} from './art.js';
import {sfx,sound} from './audio.js';
import {level,cargoValue,cargoCount,fmtDepth} from './game.js';

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const coarse=matchMedia('(pointer: coarse)');
const minerals=MINERALS.slice(1),rocks=ROCKS.slice(1).filter(r=>!['rubble','shotcrete'].includes(r.key));
export const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=n=>'$'+Math.round(n).toLocaleString('en-CA');
const plain=html=>html.replace(/<[^>]+>/g,'');
export const icon={
  guide:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5v-13Z"/></svg>',
  soundOn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/></svg>',
  soundOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 12h16"/></svg>',
  menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20V4m-6 6 6-6 6 6"/></svg>',
  down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v16m6-6-6 6-6-6"/></svg>',
  bolt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z"/></svg>',
  temp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0ZM12 10v7"/></svg>',
  cart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h18l-2 10H5L3 7Z"/><circle cx="8" cy="20" r="1.4"/><circle cx="16" cy="20" r="1.4"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6 9 12l6 6"/></svg>',
  magnet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4v8a3 3 0 0 0 6 0V4h4v8a7 7 0 0 1-14 0V4ZM5 8h4M15 8h4"/></svg>',
  streak:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><rect x="3" y="7" width="18" height="10" rx="1.5"/><path d="M7 12h7"/></svg>',
  scratch:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 4 6 6-9 9H5v-6l9-9ZM12 6l6 6"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="1.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
};

// ---------- shared sheet (a native <dialog>, so focus and Escape work everywhere) ----------
let sheet,onSheetClose=null;
export function ensureSheet(){
  if(sheet)return sheet;
  sheet=document.createElement('dialog');sheet.className='mx-sheet';sheet.setAttribute('aria-labelledby','mx-sheet-title');
  sheet.innerHTML='<div class="mx-sheet-panel"><button class="mx-sheet-close" data-close aria-label="Close">'+icon.close+'</button><div class="mx-sheet-body"></div></div>';
  document.body.append(sheet);
  sheet.addEventListener('click',e=>{if(e.target===sheet||e.target.closest('[data-close]'))closeSheet();});
  sheet.addEventListener('close',()=>{document.documentElement.classList.remove('mx-sheet-open');const f=onSheetClose;onSheetClose=null;f?.();});
  return sheet;
}
export function openSheet(html,{onClose,wide,kind}={}){
  ensureSheet();const body=sheet.querySelector('.mx-sheet-body');body.innerHTML=html;sheet.dataset.kind=kind||'';sheet.classList.toggle('wide',!!wide);
  if(!sheet.open){onSheetClose=onClose||null;sheet.showModal();document.documentElement.classList.add('mx-sheet-open');}else if(onClose)onSheetClose=onClose;
  body.scrollTop=0;const first=body.querySelector('[autofocus]');(first||sheet.querySelector('.mx-sheet-close')).focus({preventScroll:true});
  return body;
}
export function closeSheet(){if(sheet?.open)sheet.close();}

// ---------- reference content (shared by the game and the landing page) ----------
export const hostFor=m=>{let best=null,w=-1;for(const z of ZONES){const v=z.ores?.[m.key]??(z.rare?.[m.key]?.5:0);if(v>w){w=v;best=z;}}return ROCKS[rockIndex[best.rock]];};
export const zonesFor=m=>ZONES.filter(z=>z.ores?.[m.key]||z.rare?.[m.key]);
export const rangeFor=m=>{const z=zonesFor(m);return z.length?`${fmtDepth(Math.min(...z.map(z=>z.from)))}–${fmtDepth(Math.max(...z.map(z=>z.to)))} m`:'';};
const magText={strong:'Strongly magnetic',weak:'Weakly magnetic',none:'Not magnetic'};
export function hardnessText(m){const[a,b]=m.h;if(b<3.5)return'A copper coin scratches it.';if(b<5.5)return'A steel knife scratches it; a copper coin does not.';if(a>=6)return'It scratches glass.';return'About as hard as a steel knife or window glass.';}
const hRange=m=>m.h[0]===m.h[1]?m.h[0]:`${m.h[0]}–${m.h[1]}`;
export function propsHTML(m,known={magnet:true,streak:true,scratch:true}){
  const q='<span class="mx-unknown">Run the test</span>';
  return`<dl class="mx-props">
    <div><dt>Mined for</dt><dd>${esc(m.metal)}</dd></div>
    <div><dt>Hardness (Mohs)</dt><dd>${known.scratch?hRange(m):q}</dd></div>
    <div><dt>Streak</dt><dd>${known.streak?`<i class="mx-swatch" data-hex="${m.streakHex}"></i>${esc(m.streak)}`:q}</dd></div>
    <div><dt>Magnetism</dt><dd>${known.magnet?magText[m.magnetic]:q}</dd></div>
    <div><dt>Specific gravity</dt><dd>${esc(m.sg)}</dd></div>
    <div><dt>Colour · lustre</dt><dd>${esc(m.color)} · ${esc(m.luster)}</dd></div>
    <div><dt>Crystal system</dt><dd>${esc(m.system)}</dd></div>
    <div><dt>Habit</dt><dd>${esc(m.habit)}</dd></div>
  </dl>`;
}
export function paintSwatches(root){root.querySelectorAll('.mx-swatch[data-hex]').forEach(el=>{el.style.background=el.dataset.hex;});}
export function mineralDetailHTML(m,{found=true,count=0}={}){
  return`<article class="mx-detail">
    <div class="mx-detail-art"><canvas class="mx-specimen" data-specimen="${m.key}"></canvas><span class="mx-detail-tag">${esc(GROUPS[m.group])}</span></div>
    <div class="mx-detail-body">
      <p class="mx-kicker">${esc(rangeFor(m))}${count?` · ${count} collected`:''}</p>
      <h2 id="mx-sheet-title" class="mx-h2">${esc(m.name)}</h2>
      <p class="mx-formula">${m.formula}</p>
      <p class="mx-lede">${esc(m.where)}</p>
      ${propsHTML(m)}
      <div class="mx-uses"><span class="mx-label">Used for</span><p>${esc(m.uses)}</p></div>
      <ul class="mx-facts">${m.facts.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>
    </div></article>`;
}
export function paintSpecimens(root){
  requestAnimationFrame(()=>root.querySelectorAll('canvas[data-specimen]').forEach(c=>{
    const k=c.dataset.specimen;
    if(mineralIndex[k]){const m=MINERALS[mineralIndex[k]];drawSpecimen(c,m,hostFor(m),{seed:mineralIndex[k]*131});}
    else if(rockIndex[k]){const r=ROCKS[rockIndex[k]];drawSpecimen(c,{name:r.name},r,{seed:rockIndex[k]*71});}
    else if(k==='cone')drawSpecimen(c,{name:'cone',art:{pat:'cone',glint:false}},ROCKS[rockIndex.breccia],{seed:9});
    else if(k==='burst')drawSpecimen(c,{name:'burst'},ROCKS[rockIndex.rubble],{seed:3});
    else if(k==='snolab')drawSphere(c);
  }));
}
function drawSphere(c){
  const dpr=Math.min(2,devicePixelRatio||1),w=c.clientWidth,h=c.clientHeight;c.width=w*dpr;c.height=h*dpr;const x=c.getContext('2d');x.scale(dpr,dpr);
  const cx=w/2,cy=h/2,r=Math.min(w,h)*.34,g=x.createRadialGradient(cx-r*.4,cy-r*.4,r*.1,cx,cy,r);g.addColorStop(0,'#3a4a52');g.addColorStop(1,'#101518');x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,7);x.fill();
  for(let a=0;a<28;a++)for(let b=0;b<12;b++){const th=a/28*Math.PI*2,ph=(b+.5)/12*Math.PI,z=Math.sin(th)*Math.sin(ph);if(z<0)continue;x.fillStyle=`rgba(245,179,53,${.25+z*.7})`;x.beginPath();x.arc(cx+Math.cos(th)*Math.sin(ph)*r*.94,cy+Math.cos(ph)*r*.94,1+z*1.6,0,7);x.fill();}
  x.strokeStyle='rgba(242,237,230,.18)';x.beginPath();x.arc(cx,cy,r,0,7);x.stroke();
}

// ---------- game UI ----------
export function createUI(root,hooks){
  const $=s=>root.querySelector(s);
  root.innerHTML=`
    <canvas class="mx-canvas" role="img" aria-label="Cross-section of the mine around your miner"></canvas>
    <div class="mx-vignette" aria-hidden="true"></div><div class="mx-grain" aria-hidden="true"></div>
    <div class="mx-crop" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <header class="mx-top">
      <div class="mx-readout" aria-live="off"><span class="mx-label">Depth</span><strong class="mx-depth"><span data-depth>0</span><small>m</small></strong><span class="mx-zone"><i data-zone-chip></i><span data-zone>Surface</span></span></div>
      <div class="mx-top-end">
        <div class="mx-cash"><span class="mx-label">Funds</span><strong data-cash>$0</strong></div>
        <button class="mx-icon" data-act="guide" aria-label="Field guide" title="Field guide (G)">${icon.guide}<b data-guide-count></b></button>
        <button class="mx-icon" data-act="sound" aria-label="Sound" aria-pressed="false" title="Sound (M)"></button>
        <button class="mx-icon" data-act="menu" aria-label="Pause menu" title="Pause (Esc)">${icon.menu}</button>
      </div>
    </header>
    <div class="mx-rail" aria-hidden="true"><div class="mx-rail-track">${ZONES.map(z=>`<span class="mx-rail-zone" data-from="${z.from}" data-to="${z.to}"><em>${z.num}</em></span>`).join('')}${[0,500,1000,1500,2000,2500,3000].map(d=>`<span class="mx-rail-tick" data-d="${d}"><b>${d?d/1000+' km':'0'}</b></span>`).join('')}<span class="mx-rail-deep"></span><span class="mx-rail-you"></span></div></div>
    <div class="mx-zone-title" aria-hidden="true"></div>
    <div class="mx-toasts" role="status" aria-live="polite"></div>
    <footer class="mx-bottom">
      <div class="mx-meters">
        <div class="mx-meter" data-meter="battery"><span class="mx-meter-icon">${icon.bolt}</span><span class="mx-meter-label">Battery</span><span class="mx-meter-value" data-v></span><span class="mx-bar"><i></i></span></div>
        <div class="mx-meter" data-meter="heat"><span class="mx-meter-icon">${icon.temp}</span><span class="mx-meter-label">Rock</span><span class="mx-meter-value" data-v></span><span class="mx-bar"><i></i></span></div>
        <div class="mx-meter" data-meter="cargo"><span class="mx-meter-icon">${icon.cart}</span><span class="mx-meter-label">Cargo</span><span class="mx-meter-value" data-v></span><span class="mx-bar"><i></i></span></div>
      </div>
      <div class="mx-actions">
        <button class="mx-btn mx-btn-primary" data-act="up" data-under>${icon.up}<span>Cage up</span><kbd>C</kbd></button>
        <button class="mx-btn" data-act="assay" data-surface><span>Assay office</span><b data-cargo-value></b></button>
        <button class="mx-btn" data-act="shop" data-surface><span>Workshop</span></button>
        <button class="mx-btn mx-btn-primary" data-act="down" data-surface>${icon.down}<span data-down-label>Start digging</span></button>
      </div>
    </footer>
    <p class="mx-hint" aria-hidden="true">${coarse.matches?'Tap or hold where you want to dig':'Click or hold to dig · or use arrow keys / WASD'}</p>
    <div class="mx-cage" aria-hidden="true"><div class="mx-cage-lines"></div><div class="mx-cage-read"><span class="mx-label">Cage</span><strong data-cage></strong></div></div>`;
  const game=()=>hooks.game();
  // Depth rail geometry.
  const pct=d=>Math.min(100,d/3000*100);
  root.querySelectorAll('.mx-rail-zone').forEach(el=>{el.style.top=pct(+el.dataset.from)+'%';el.style.height=pct(+el.dataset.to-+el.dataset.from)+'%';el.classList.toggle('thin',+el.dataset.to-+el.dataset.from<150);});
  root.querySelectorAll('.mx-rail-tick').forEach(el=>{el.style.top=pct(+el.dataset.d)+'%';});
  const soundBtn=$('[data-act="sound"]');
  const syncSound=()=>{soundBtn.innerHTML=sound.on?icon.soundOn:icon.soundOff;soundBtn.setAttribute('aria-pressed',String(sound.on));soundBtn.classList.toggle('on',sound.on);};syncSound();
  root.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;sfx.ui();
    if(a==='sound'){sound.set(!sound.on);syncSound();}
    else if(a==='guide')openGuide();else if(a==='menu')openMenu();
    else if(a==='up')game().cageUp();else if(a==='down'){game().state.face?game().cageDown():startDig();}
    else if(a==='assay')openAssay();else if(a==='shop')openShop();});
  addEventListener('keydown',e=>{if(root.hidden||sheet?.open||e.metaKey||e.ctrlKey)return;if(e.code==='KeyG'){openGuide();}else if(e.code==='KeyM'){sound.set(!sound.on);syncSound();}else if(e.code==='Escape'){openMenu();}});
  function startDig(){toast(coarse.matches?'Tap the ground below your miner to start digging.':'Click the ground below your miner, or press ↓.','learn');}

  // ---------- HUD ----------
  const prev={};
  const set=(k,v,fn)=>{if(prev[k]!==v){prev[k]=v;fn(v);}};
  const el={depth:$('[data-depth]'),zone:$('[data-zone]'),chip:$('[data-zone-chip]'),cash:$('[data-cash]'),you:$('.mx-rail-you'),deep:$('.mx-rail-deep'),readout:$('.mx-readout'),guideCount:$('[data-guide-count]'),cargoValue:$('[data-cargo-value]'),down:$('[data-down-label]')};
  const meters=Object.fromEntries(['battery','heat','cargo'].map(k=>{const m=$(`[data-meter="${k}"]`);return[k,{m,v:m.querySelector('[data-v]'),bar:m.querySelector('.mx-bar i')}];}));
  let tickTimer=0;
  function hud(S,api,info){
    set('depth',Math.round(info.depth),d=>{el.depth.textContent=fmtDepth(d);el.readout.classList.add('tick');clearTimeout(tickTimer);tickTimer=setTimeout(()=>el.readout.classList.remove('tick'),600);el.you.style.top=pct(d)+'%';});
    set('deep',S.deepest,d=>{el.deep.style.top=pct(d)+'%';});
    set('zone',info.zone,k=>{const z=ZONES[k];el.zone.textContent=z?`${z.num} · ${z.name}`:'Surface · Greater Sudbury';el.chip.style.background=z?z.color:'#f5b335';});
    set('cash',S.cash,c=>{el.cash.textContent=money(c);});
    set('surface',info.surface,s=>{root.dataset.surface=s?'1':'0';});
    const bcap=level(S,'battery').value,ccap=level(S,'cargo').value,cc=cargoCount(S);
    set('bat',S.battery+'/'+bcap,()=>{meters.battery.v.textContent=`${S.battery}/${bcap}`;meters.battery.bar.style.transform=`scaleX(${S.battery/bcap})`;meters.battery.m.classList.toggle('low',S.battery/bcap<.2);});
    set('heat',Math.round(S.heat*100)+'|'+info.temp,()=>{meters.heat.v.textContent=`${info.temp} °C`;meters.heat.bar.style.transform=`scaleX(${S.heat})`;meters.heat.m.classList.toggle('low',S.heat>.5);meters.heat.m.classList.toggle('hot',info.depth>level(S,'vent').value);});
    set('cargo',cc+'/'+ccap,()=>{meters.cargo.v.textContent=`${cc}/${ccap} t`;meters.cargo.bar.style.transform=`scaleX(${cc/ccap})`;meters.cargo.m.classList.toggle('low',cc>=ccap);});
    set('cv',cargoValue(S),v=>{el.cargoValue.textContent=v?money(v):'';});
    set('face',S.face?S.face.y:'-',()=>{el.down.textContent=S.face?`Cage down · ${fmtDepth((S.face.y+1)*20)} m`:'Start digging';});
    const n=Object.keys(S.found.m).length;set('gc',n,v=>{el.guideCount.textContent=v?v:'';});
  }
  function pulse(k,bad){const m=meters[k]?.m;if(!m)return;m.classList.remove('pulse','bad');void m.offsetWidth;m.classList.add('pulse');if(bad)m.classList.add('bad');}

  // ---------- toasts & titles ----------
  const toasts=$('.mx-toasts');
  function toast(msg,kind=''){
    const t=document.createElement('p');t.className='mx-toast '+(kind?'is-'+kind:'');t.innerHTML=`<span>${esc(msg)}</span>`;toasts.prepend(t);
    while(toasts.children.length>3)toasts.lastChild.remove();
    requestAnimationFrame(()=>t.classList.add('in'));setTimeout(()=>{t.classList.remove('in');t.classList.add('out');setTimeout(()=>t.remove(),400);},kind==='learn'?7000:3600);
  }
  const zt=$('.mx-zone-title');let ztTimer=0;
  function zoneTitle(z){
    zt.innerHTML=`<span class="mx-zone-num">${z.num} / 08</span><span class="mx-zone-name">${[...z.name.toUpperCase()].map(c=>`<span>${c===' '?'&nbsp;':esc(c)}</span>`).join('')}</span><span class="mx-zone-depth">${fmtDepth(z.from)}–${fmtDepth(z.to)} m</span>`;
    zt.querySelectorAll('.mx-zone-name span').forEach((s,i)=>{s.style.animationDelay=(i*25)+'ms';});
    zt.classList.remove('show');void zt.offsetWidth;zt.classList.add('show');clearTimeout(ztTimer);ztTimer=setTimeout(()=>zt.classList.remove('show'),2300);
  }

  // ---------- cage transition ----------
  const cageEl=$('.mx-cage'),cageRead=$('[data-cage]');
  function cage(from,to,done){
    const dur=reduced.matches?250:1100,t0=performance.now();cageEl.classList.toggle('down',to>from);cageEl.classList.add('on');game().pause();
    const step=now=>{const p=Math.min(1,(now-t0)/dur),e=p<.5?4*p*p*p:1-(-2*p+2)**3/2;cageRead.textContent=fmtDepth(from+(to-from)*e)+' m';
      if(p<1)requestAnimationFrame(step);else{done();setTimeout(()=>{cageEl.classList.remove('on');if(!sheet?.open)game().resume();},120);}};
    requestAnimationFrame(step);
  }

  // ---------- sheets ----------
  function modal(html,opts={}){game().pause();const body=openSheet(html,{...opts,onClose:()=>{opts.onClose?.();game().resume();}});paintSpecimens(body);paintSwatches(body);return body;}
  function scramble(el){if(reduced.matches)return;const final=el.textContent,chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';let f=0;el.classList.add('scrambling');const id=setInterval(()=>{f++;el.textContent=[...final].map((c,i)=>c===' '||i<f/2?c:chars[Math.floor(Math.random()*chars.length)]).join('');if(f/2>=final.length){clearInterval(id);el.textContent=final;el.classList.remove('scrambling');}},28);}
  function discover({kind,id}){
    const S=game().state;
    if(kind==='special'){const d=SPECIAL[id];
      const body=modal(`<article class="mx-disc mx-disc-special"><div class="mx-disc-art"><canvas class="mx-specimen" data-specimen="${id}"></canvas></div><div class="mx-disc-body"><p class="mx-kicker">${esc(d.kicker)}</p><h2 id="mx-sheet-title" class="mx-h2" data-scramble>${esc(d.name)}</h2><p class="mx-lede">${esc(d.body)}</p><ul class="mx-facts">${d.facts.map(f=>`<li>${esc(f)}</li>`).join('')}</ul><button class="button mx-cta" data-close autofocus>${id==='burst'?'Understood':'Log it & keep digging'}</button></div></article>`,{kind:'discovery'});
      scramble(body.querySelector('[data-scramble]'));return;}
    const m=MINERALS[mineralIndex[id]],n=Object.keys(S.found.m).length,known={...(S.tests[id]||{})};
    const body=modal(`<article class="mx-disc"><div class="mx-disc-art"><canvas class="mx-specimen" data-specimen="${m.key}"></canvas><span class="mx-magnet-tool">${icon.magnet}</span><span class="mx-plate"><i></i></span><span class="mx-mohs">${Array.from({length:10},(_,i)=>`<i>${i+1}</i>`).join('')}<b></b></span></div>
      <div class="mx-disc-body"><p class="mx-kicker">New mineral · ${n} of ${minerals.length}</p><h2 id="mx-sheet-title" class="mx-h2" data-scramble>${esc(m.name)}</h2><p class="mx-formula">${m.formula} <span>· ${esc(m.metal)}</span></p>
      <p class="mx-lede">${esc(m.where)}</p>
      <div class="mx-tests" role="group" aria-label="Field tests"><p class="mx-label">Field tests · +$5 each</p>
        <button class="mx-test" data-test="magnet">${icon.magnet}<span>Magnet</span></button><button class="mx-test" data-test="streak">${icon.streak}<span>Streak</span></button><button class="mx-test" data-test="scratch">${icon.scratch}<span>Hardness</span></button></div>
      <p class="mx-test-result" aria-live="polite">Try a test, the way a geologist identifies a mineral in the field.</p>
      <div data-props>${propsHTML(m,known)}</div>
      <ul class="mx-facts">${m.facts.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>
      <button class="button mx-cta" data-close>Log it &amp; keep digging</button></div></article>`,{kind:'discovery'});
    scramble(body.querySelector('[data-scramble]'));
    const art=body.querySelector('.mx-disc-art'),result=body.querySelector('.mx-test-result');
    body.querySelectorAll('[data-test]').forEach(b=>{if(known[b.dataset.test])b.classList.add('done');b.addEventListener('click',()=>{
      const t=b.dataset.test;art.dataset.test=t;art.classList.remove('run');void art.offsetWidth;art.classList.add('run');
      if(t==='magnet'){sfx.magnet();art.dataset.mag=m.magnetic;result.textContent=m.magnetic==='strong'?`The magnet snaps to it. ${m.name} is strongly magnetic.`:`Nothing happens. ${m.name} is not magnetic.`;}
      if(t==='streak'){sfx.streak();art.querySelector('.mx-plate i').style.background=m.streakHex;result.textContent=`Rubbed on unglazed porcelain, it leaves a ${m.streak.toLowerCase()} streak. Streak colour is more reliable than surface colour.`;}
      if(t==='scratch'){sfx.ui();const bar=art.querySelector('.mx-mohs b');bar.style.left=((m.h[0]-1)/9*100)+'%';bar.style.width=Math.max(2,(m.h[1]-m.h[0])/9*100)+'%';result.textContent=`Mohs ${hRange(m)}. ${hardnessText(m)}`;}
      known[t]=true;b.classList.add('done');if(game().test(m.key,t)){toast('+$5 field notes','cash');}
      body.querySelector('[data-props]').innerHTML=propsHTML(m,known);paintSwatches(body);
    });});
  }
  function guideCard(kind,item,found,hint){
    const key=item.key||item.id;
    return`<button class="mx-card ${found?'':'locked'}" data-open="${kind}:${key}" ${found?'':'aria-disabled="true"'}><span class="mx-card-art">${found?`<canvas class="mx-specimen" data-specimen="${key}"></canvas>`:`<span class="mx-card-lock">${icon.lock}</span>`}</span><span class="mx-card-name">${found?esc(item.name):'Unknown'}</span><span class="mx-card-meta">${found?(item.formula||esc(item.metal||item.kicker||'')):esc(hint)}</span></button>`;
  }
  function openGuide(tab='minerals'){
    const S=game().state,fm=S.found.m,fr=S.found.r,fd=S.found.d;
    const specials=Object.entries(SPECIAL).map(([id,d])=>({id,...d}));
    const counts={minerals:minerals.filter(m=>fm[m.key]).length,rocks:rocks.filter(r=>fr[r.key]).length,discoveries:specials.filter(d=>fd[d.id]).length};
    const tabs=[['minerals','Minerals',minerals.length],['rocks','Rocks',rocks.length],['discoveries','Discoveries',specials.length]];
    const grid=tab==='minerals'?minerals.map(m=>guideCard('m',m,fm[m.key],rangeFor(m))).join(''):tab==='rocks'?rocks.map(r=>guideCard('r',r,fr[r.key],ZONES.find(z=>z.rock===r.key)?`${fmtDepth(ZONES.find(z=>z.rock===r.key).from)} m and below`:'In veins and dykes')).join(''):specials.map(d=>guideCard('d',d,fd[d.id],d.depth?`Somewhere near ${fmtDepth(d.depth)} m`:'Deep underground')).join('');
    const total=minerals.length+rocks.length+specials.length,have=counts.minerals+counts.rocks+counts.discoveries;
    const body=modal(`<div class="mx-guide"><header class="mx-guide-head"><p class="mx-kicker">Field guide</p><h2 id="mx-sheet-title" class="mx-h2">Specimens</h2><p class="mx-progress"><span><i data-progress></i></span><b>${have} / ${total}</b></p>
      <div class="mx-tabs" role="tablist">${tabs.map(([k,l,n])=>`<button role="tab" aria-selected="${k===tab}" data-tab="${k}">${l} <small>${counts[k]}/${n}</small></button>`).join('')}</div></header>
      <div class="mx-grid">${grid}</div></div>`,{wide:true,kind:'guide'});
    body.querySelector('[data-progress]').style.transform=`scaleX(${have/total})`;
    body.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{sfx.ui();openGuide(b.dataset.tab);}));
    body.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>{if(b.classList.contains('locked')){sfx.error();return;}sfx.ui();const[k,id]=b.dataset.open.split(':');openEntry(k,id,tab);}));
  }
  function openEntry(k,id,tab){
    const S=game().state;let html;
    if(k==='m')html=mineralDetailHTML(MINERALS[mineralIndex[id]],{count:S.found.m[id]});
    else if(k==='r'){const r=ROCKS[rockIndex[id]],z=ZONES.find(z=>z.rock===r.key);html=`<article class="mx-detail"><div class="mx-detail-art"><canvas class="mx-specimen" data-specimen="${r.key}"></canvas><span class="mx-detail-tag">Rock · Mohs ~${r.h}</span></div><div class="mx-detail-body"><p class="mx-kicker">${z?`${z.num} · ${fmtDepth(z.from)}–${fmtDepth(z.to)} m`:'Veins & dykes'}</p><h2 id="mx-sheet-title" class="mx-h2">${esc(r.name)}</h2><p class="mx-lede">${esc(r.desc)}</p>${z?.toast?`<ul class="mx-facts"><li>${esc(z.toast)}</li></ul>`:''}</div></article>`;}
    else{const d=SPECIAL[id];html=`<article class="mx-detail"><div class="mx-detail-art"><canvas class="mx-specimen" data-specimen="${id}"></canvas></div><div class="mx-detail-body"><p class="mx-kicker">${esc(d.kicker)}</p><h2 id="mx-sheet-title" class="mx-h2">${esc(d.name)}</h2><p class="mx-lede">${esc(d.body)}</p><ul class="mx-facts">${d.facts.map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div></article>`;}
    const body=modal(`<button class="mx-back" data-back>${icon.back}<span>Field guide</span></button>${html}`,{wide:true,kind:'entry'});
    body.querySelector('[data-back]').addEventListener('click',()=>{sfx.ui();openGuide(tab);});
  }
  function openShop(){
    const S=game().state;
    const rows=Object.entries(UPGRADES).map(([k,t])=>{const lv=S.up[k],cur=t.levels[lv],next=t.levels[lv+1];
      const fmt=v=>k==='vent'?`safe to ${fmtDepth(v)} m`:k==='support'?`${Math.round((1-v)*100)}% less damage`:k==='drill'?`${v}× speed`:`${v} ${t.unit}`;
      return`<li class="mx-up"><div class="mx-up-head"><span class="mx-label">${esc(t.name)}</span><span class="mx-pips">${t.levels.map((_,i)=>`<i class="${i<=lv?'on':''}"></i>`).join('')}</span></div>
        <h3>${esc(next?next.name:cur.name)}</h3><p>${esc(next?next.note:cur.note)}</p>
        <div class="mx-up-foot"><span class="mx-up-stat">${fmt(cur.value)}${next?` <b>→ ${fmt(next.value)}</b>`:''}</span>${next?`<button class="mx-btn ${S.cash>=next.cost?'mx-btn-primary':''}" data-buy="${k}" ${S.cash>=next.cost?'':'disabled'}>${money(next.cost)}</button>`:'<span class="mx-maxed">Maxed</span>'}</div></li>`;}).join('');
    const body=modal(`<div class="mx-shop"><header><p class="mx-kicker">Workshop · ${money(S.cash)} available</p><h2 id="mx-sheet-title" class="mx-h2">Upgrade the mine</h2><p class="mx-sub">Real equipment from Sudbury’s past and present. Go deeper, safer and faster.</p></header><ul class="mx-ups">${rows}</ul></div>`,{wide:true,kind:'shop'});
    body.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',()=>{if(game().buy(b.dataset.buy)){toast(`Installed: ${UPGRADES[b.dataset.buy].levels[game().state.up[b.dataset.buy]].name}`,'cash');openShop();}}));
  }
  function quizFor(S){
    const pool=minerals.filter(m=>S.found.m[m.key]);const from=pool.length>=2?pool:minerals.slice(0,4);
    const pick=a=>a[Math.floor(Math.random()*a.length)],shuffle=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(v=>v[1]);
    const m=pick(from),others=n=>shuffle(minerals.filter(o=>o!==m)).slice(0,n);
    const types=[
      ()=>{const opts=[...new Set([m.metal,...shuffle(minerals.map(o=>o.metal))])].filter((v,i,a)=>a.indexOf(v)===i).slice(0,4);if(!opts.includes(m.metal))opts[0]=m.metal;return{q:`What is ${m.name} mined for?`,a:m.metal,opts:shuffle(opts)};},
      ()=>({q:`Which formula belongs to ${m.name}?`,a:plain(m.formula),opts:shuffle([plain(m.formula),...others(3).map(o=>plain(o.formula))])}),
      ()=>{const mag=minerals.filter(o=>o.magnetic==='strong'),non=minerals.filter(o=>o.magnetic==='none');const a=pick(mag);return{q:'A magnet snaps to one of these. Which?',a:a.name,opts:shuffle([a.name,...shuffle(non).slice(0,3).map(o=>o.name)])};},
      ()=>({q:'Which mineral is named after a Sudbury mine?',a:'Froodite',opts:shuffle(['Froodite','Cubanite','Pyrite','Magnetite'])}),
      ()=>({q:'Where did Sudbury’s contact ore pool?',a:'At the base of the melt sheet',opts:shuffle(['At the base of the melt sheet','In the glacial till','At the top of the granophyre','Inside the Big Nickel'])}),
      ()=>({q:'Roughly how old is the Sudbury impact?',a:'1.85 billion years',opts:shuffle(['1.85 billion years','65 million years','10,000 years','4.5 billion years'])}),
      ()=>{const a=pick(minerals.filter(o=>o.group==='pgm'&&o.key!=='gold'));return{q:'Which of these carries platinum-group metals?',a:a.name,opts:shuffle([a.name,'Pyrrhotite','Pyrite','Magnetite'])};},
    ];
    return pick(types)();
  }
  function openAssay(){
    const S=game().state,v=cargoValue(S),items=Object.entries(S.cargo).map(([k,n])=>[MINERALS[k],n]).sort((a,b)=>b[0].value*b[1]-a[0].value*a[1]);
    if(!items.length){modal(`<div class="mx-assay"><p class="mx-kicker">Assay office</p><h2 id="mx-sheet-title" class="mx-h2">Nothing to assay</h2><p class="mx-sub">Ride the cage down, dig out ore, and bring it back. The assayer measures how much metal is in it.</p><button class="button mx-cta" data-close>Back to the headframe</button></div>`,{kind:'assay'});return;}
    const quiz=quizFor(S);let bonus=0,answered=false;
    const metals={};items.forEach(([m,n])=>{metals[m.metal]=(metals[m.metal]||0)+n;});
    const body=modal(`<div class="mx-assay"><p class="mx-kicker">Assay office · ${cargoCount(S)} t of ore</p><h2 id="mx-sheet-title" class="mx-h2">Assay report</h2>
      <table class="mx-table"><thead><tr><th>Mineral</th><th>t</th><th>Value</th></tr></thead><tbody>${items.map(([m,n])=>`<tr><td><i class="mx-swatch" data-hex="${m.art.base}"></i>${esc(m.name)}<small>${esc(m.metal)}</small></td><td>${n}</td><td>${money(m.value*n)}</td></tr>`).join('')}</tbody></table>
      <div class="mx-quiz"><p class="mx-label">Assayer’s question · +20% if you’re right</p><p class="mx-quiz-q">${esc(quiz.q)}</p><div class="mx-quiz-opts">${quiz.opts.map(o=>`<button class="mx-opt" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}</div><p class="mx-quiz-r" aria-live="polite"></p></div>
      <div class="mx-assay-total"><span><span class="mx-label">Payout</span><strong data-total>${money(v)}</strong></span><button class="button mx-cta" data-sell>Sell ore</button></div></div>`,{kind:'assay'});
    paintSwatches(body);
    body.querySelectorAll('[data-opt]').forEach(b=>b.addEventListener('click',()=>{if(answered)return;answered=true;const right=b.dataset.opt===quiz.a;game().quiz(right);
      body.querySelectorAll('[data-opt]').forEach(o=>{o.disabled=true;if(o.dataset.opt===quiz.a)o.classList.add('right');});if(!right)b.classList.add('wrong');
      if(right){bonus=.2;sfx.cash();}else sfx.error();body.querySelector('.mx-quiz-r').textContent=right?'Correct! +20% on this load.':`Not quite: the answer is ${quiz.a}.`;body.querySelector('[data-total]').textContent=money(v*(1+bonus));}));
    body.querySelector('[data-sell]').addEventListener('click',()=>{const t=game().sell(bonus);toast(`Sold for ${money(t)}`,'cash');closeSheet();});
  }
  function openBuilding(id){if(id==='assay')openAssay();else if(id==='shop')openShop();else if(id==='shaft'){const S=game().state;S.face?game().cageDown():startDig();}}
  function howTo(){return`<ol class="mx-how"><li><b>01</b><div><h3>Dig</h3><p>${coarse.matches?'Tap a spot to tunnel toward it. Hold your finger down to keep drilling.':'Click a spot to tunnel there, hold to keep drilling, or use the arrow keys / WASD.'} Softer rock is faster: sulfide ores are much softer than norite.</p></div></li><li><b>02</b><div><h3>Discover</h3><p>Each new mineral opens a specimen card. Run the magnet, streak and hardness tests to identify it like a geologist.</p></div></li><li><b>03</b><div><h3>Assay &amp; upgrade</h3><p>Ride the cage up${coarse.matches?'':' (C)'} to sell ore and recharge. Upgrade ventilation to survive the heat at depth.</p></div></li></ol>`;}
  function openIntro(){modal(`<div class="mx-intro"><p class="mx-kicker">Briefing · Headframe, Greater Sudbury</p><h2 id="mx-sheet-title" class="mx-h2">Three kilometres of history under your boots.</h2>${howTo()}<button class="button mx-cta" data-close autofocus>Start the shift</button></div>`,{kind:'intro',onClose:()=>game().finishIntro()});}
  function openMenu(){
    const S=game().state;
    const body=modal(`<div class="mx-menu"><p class="mx-kicker">Paused</p><h2 id="mx-sheet-title" class="mx-h2">Shift log</h2>
      <dl class="mx-stats"><div><dt>Deepest</dt><dd>${fmtDepth(S.deepest)} m</dd></div><div><dt>Cells dug</dt><dd>${S.stats.dug.toLocaleString('en-CA')}</dd></div><div><dt>Earned</dt><dd>${money(S.stats.earned)}</dd></div><div><dt>Quiz</dt><dd>${S.stats.quiz[0]}/${S.stats.quiz[1]}</dd></div></dl>
      ${howTo()}<div class="mx-menu-actions"><button class="button mx-cta" data-close autofocus>Resume</button><button class="mx-btn" data-exit>Leave Minex</button><button class="mx-btn mx-btn-quiet" data-reset>Restart the mine</button></div></div>`,{kind:'menu'});
    body.querySelector('[data-exit]').addEventListener('click',()=>{closeSheet();hooks.exit();});
    const r=body.querySelector('[data-reset]');r.addEventListener('click',()=>{if(r.dataset.armed){game().reset();closeSheet();toast('A fresh mine. Good luck down there.');}else{r.dataset.armed='1';r.textContent='Tap again to erase your progress';}});
  }
  function notice(reason,lost){modal(`<div class="mx-notice"><p class="mx-kicker">Evacuated</p><h2 id="mx-sheet-title" class="mx-h2">${reason==='heat'?'Heat stress: the crew brought you up.':'The crew brought you up.'}</h2><p class="mx-sub">${lost?`${lost} t of ore was left behind. `:''}Rock gets hotter with depth, about 40&nbsp;°C at 2 km. Upgrade ventilation in the workshop to work deeper.</p><button class="button mx-cta" data-close autofocus>Back to the surface</button></div>`,{kind:'notice'});}
  return {hud,toast,pulse,zoneTitle,cage,discover,openGuide,openShop,openAssay,openBuilding,openIntro,openMenu,notice};
}
