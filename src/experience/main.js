// 22310.ca homepage choreography.
// Native scroll (smoothed by Lenis on wheel devices) drives GSAP ScrollTriggers
// for the DOM, and a keyframed "director" that tells the WebGL stage where to be.
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {initChrome, initMagnetic} from '../chrome.js';

gsap.registerPlugin(ScrollTrigger);
const root = document.documentElement;
root.classList.replace('no-js', 'js');
const qa = window.__SAFFRON_QA__ = {state: 'loading', errors: []};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = () => innerWidth < 800;

initChrome();
initMagnetic();

/* ---------- Text helpers ---------- */
function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute('aria-label', el.textContent.trim());
  el.innerHTML = words.map(w => `<span class="mw" aria-hidden="true">${w}</span>`).join(' ');
  return $$('.mw', el);
}

function countUp(el) {
  const end = Number(el.dataset.count), obj = {v: 0};
  gsap.to(obj, {v: end, duration: end > 100 ? 2.2 : 1.4, ease: 'expo.out', onUpdate: () => {el.textContent = String(Math.round(obj.v)).padStart(String(end).length, '0');}});
}

/* ---------- Reduced motion: a calm, complete, static page ---------- */
if (reduced) {
  root.classList.add('rm');
  $('.loader')?.remove();
  qa.state = 'reduced-motion';
} else {
  run().catch(error => {qa.errors.push(String(error)); console.warn(error);});
}

async function run() {
  root.classList.add('is-loading');
  const lenis = new Lenis({lerp: .095, anchors: true, syncTouch: false});
  lenis.stop();
  qa.jump = (sel, f = 0) => {const el = $(sel), top = el.getBoundingClientRect().top + scrollY; lenis.scrollTo(top + f * Math.max(0, el.offsetHeight - innerHeight), {immediate: true, force: true}); return Math.round(scrollY);};
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  history.scrollRestoration = 'manual';
  scrollTo(0, 0);

  /* Loader */
  const count = $('.loader-count'), bar = $('.loader-bar i');
  const load = {target: .08, shown: 0};
  const tickLoader = () => {
    load.shown += (load.target - load.shown) * .14;
    const v = Math.min(1, load.shown + .002);
    count.textContent = String(Math.floor(v * 100)).padStart(3, '0');
    bar.style.transform = `scaleX(${v})`;
  };
  gsap.ticker.add(tickLoader);

  let stage = null;
  const stagePromise = import('./stage.js')
    .then(({createStage}) => createStage($('#scene'), {onProgress: p => {load.target = Math.max(load.target, .1 + p * .75);}}))
    .then(s => {qa.t_stage = performance.now() | 0; return (stage = s);})
    .catch(error => {qa.errors.push(String(error)); console.warn('Stage fallback', error); root.classList.add('no-webgl');});
  await Promise.race([stagePromise, new Promise(r => setTimeout(r, 9000))]);
  load.target = 1;
  if (!stage) root.classList.add('no-webgl');

  /* Build the scroll story while the loader still covers the page. */
  const director = buildDirector();
  if (stage) {
    director.refresh();
    stage.setTarget(director.sample(0), true);
    await stage.start();
    qa.t_started = performance.now() | 0;
    qa.state = 'webgl';
  }
  await Promise.race([new Promise(r => {const wait = () => (load.shown > .97 ? r() : requestAnimationFrame(wait)); wait();}), new Promise(r => setTimeout(r, 1200))]);
  gsap.ticker.remove(tickLoader);
  qa.t_reveal = performance.now() | 0;

  /* Exit the loader → hero intro */
  const intro = gsap.timeline({defaults: {ease: 'expo.out'}});
  intro
    .to('.loader-inner', {opacity: 0, y: -20, duration: .5, ease: 'power2.in'})
    .to('.loader', {clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut'}, '-=.1')
    .add(() => {root.classList.remove('is-loading'); lenis.start(); $('.loader')?.remove();})
    .from('.hero .ch', {yPercent: 115, rotate: 6, duration: 1.4, stagger: .045}, '-=.55')
    .from('.hud > span, .hero-lede, .hero-sponsor, .scroll-cue', {opacity: 0, y: 14, duration: 1, stagger: .06}, '-=1.1')
    .from('.site-header', {opacity: 0, y: -16, duration: 1}, '<')
    .add(heroScroll);
  setupScroll(lenis, director, stage);
}

/* ---------- Director: page scroll → stage state ---------- */
function buildDirector() {
  const shift = (s, amount) => {
    // Move camera and target together along the camera's right vector so the
    // subject slides sideways on screen without changing the view angle.
    const dx = s.cx - s.tx, dz = s.cz - s.tz, len = Math.hypot(dx, dz) || 1;
    const rx = dz / len, rz = -dx / len;
    return {...s, cx: s.cx + rx * amount, tx: s.tx + rx * amount, cz: s.cz + rz * amount, tz: s.tz + rz * amount};
  };
  const base = {cx: .5, cy: .3, cz: 1.0, tx: 0, ty: .18, tz: 0, yaw: -.55, spin: 1, explode: 0, holo: 0, field: 0, morph: 0, dust: 1, grid: 1, parallax: 1};
  const FIELD_C = [-1.1, .15, -1.1];
  // [selector, edge, viewport offset, state]; edge: 'top' = section top at viewport top,
  // 'end' = section bottom at viewport bottom, 'enter' = section top at viewport bottom.
  const plan = m => [
    ['.hero', 'top', 0, base],
    ['.manifesto', 'enter', .55, {...shift({cx: .2, cy: .55, cz: 1.62, tx: 0, ty: .18, tz: 0}, m ? 0 : -.36), spin: .45, yaw: .2, parallax: .6}],
    ['.machine', 'top', 0, {...shift({cx: .8, cy: .46, cz: 1.24, tx: 0, ty: .19, tz: 0}, m ? 0 : -.17), yaw: 0, spin: 0, parallax: .5}],
    ['.machine', 'f', .22, {yaw: 2.1, explode: 0}],
    ['.machine', 'f', .30, {yaw: 2.3, explode: 0}],
    ['.machine', 'f', .47, {...shift({cx: 1, cy: .74, cz: 1.55, tx: 0, ty: .26, tz: 0}, m ? 0 : -.22), yaw: 2.75, explode: 1, holo: 0}],
    ['.machine', 'f', .55, {yaw: 2.9, holo: 0}],
    ['.machine', 'f', .74, {...shift({cx: .72, cy: .6, cz: 1.3, tx: 0, ty: .22, tz: 0}, m ? 0 : -.18), yaw: 3.5, explode: .55, holo: 1}],
    ['.machine', 'f', .82, {explode: 0, holo: 1}],
    ['.machine', 'end', 0, {...shift({cx: .95, cy: .32, cz: 1.02, tx: 0, ty: .16, tz: 0}, m ? 0 : -.16), yaw: 2 * Math.PI + .2, holo: 0, explode: 0, parallax: 1}],
    ['.stats', 'enter', .5, {cx: .1, cy: .9, cz: 1.4, tx: 0, ty: .1, tz: 0, spin: .6}],
    ['.game', 'enter', 0, {cx: .9, cy: .45, cz: 1.25, tx: 0, ty: .17, tz: 0, yaw: -.6, spin: 0, field: 0, grid: 1, parallax: .4}],
    ['.game', 'top', 0, {cx: 1.2, cy: 1.1, cz: 1.7, tx: -.3, ty: .1, tz: -.3, field: .3, grid: .4}],
    ['.game', 'f', .38, {cx: 3.2, cy: 4.4, cz: 4.2, tx: FIELD_C[0], ty: FIELD_C[1], tz: FIELD_C[2], field: 1, grid: 0}],
    ['.game', 'f', .7, {cx: -1.1 + 6.2 * Math.sin(-.3), cy: 4.6, cz: -1.1 + 6.2 * Math.cos(-.3)}],
    ['.game', 'end', 0, {cx: -1.1 + 6.4 * Math.sin(-1.05), cy: 3.6, cz: -1.1 + 6.4 * Math.cos(-1.05)}],
    ['.lab', 'top', -.01, {}], // hold the field shot until the gallery fully covers it
    ['.lab', 'top', .3, {cx: 0, cy: 2.36, cz: 2.7, tx: 0, ty: 2.36, tz: 0, field: 0, grid: 0, morph: 0, dust: 1, spin: 0, parallax: .6}],
    ['.finale', 'top', 0, {cz: 2.6, morph: .05}],
    ['.finale', 'f', .6, {cz: 2.25, morph: 1}],
    ['.finale', 'end', 0, {cz: 2.15, morph: 1}]
  ];
  let keys = [];
  const posOf = (sel, edge, off) => {
    const el = $(sel); if (!el) return null;
    const top = el.getBoundingClientRect().top + scrollY, h = el.offsetHeight, vh = innerHeight;
    const at = edge === 'top' ? top : edge === 'end' ? top + h - vh : edge === 'enter' ? top - vh : top + off * Math.max(1, h - vh);
    return edge === 'f' ? at : at + off * vh;
  };
  const smooth = t => t * t * (3 - 2 * t);
  return {
    refresh() {
      let prev = {};
      keys = plan(mobile()).map(([sel, edge, off, state]) => {
        prev = {...prev, ...state};
        if (mobile()) prev = {...prev, cx: prev.cx * 1.15, cy: prev.cy * 1.08, cz: prev.cz * 1.15};
        const at = posOf(sel, edge, off);
        const full = {...prev};
        if (mobile()) prev = {...prev, cx: prev.cx / 1.15, cy: prev.cy / 1.08, cz: prev.cz / 1.15};
        return at == null ? null : {at, state: full};
      }).filter(Boolean).sort((a, b) => a.at - b.at);
    },
    sample(y) {
      if (!keys.length) return base;
      if (y <= keys[0].at) return keys[0].state;
      const last = keys[keys.length - 1]; if (y >= last.at) return last.state;
      const i = keys.findIndex(k => k.at >= y), a = keys[i - 1], b = keys[i];
      const t = smooth((y - a.at) / Math.max(1, b.at - a.at)), out = {};
      for (const k in a.state) out[k] = a.state[k] + (b.state[k] - a.state[k]) * t;
      return out;
    }
  };
}

/* Hero: letters drift apart as you leave. Built after the intro so the
   scrubbed tweens record the settled layout as their starting point. */
function heroScroll() {
  const out = {trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true};
  gsap.fromTo('.hero-row-1 .ch', {xPercent: 0, yPercent: 0, opacity: 1}, {xPercent: i => -40 - i * 30, yPercent: -30, opacity: 0, ease: 'none', scrollTrigger: out});
  gsap.fromTo('.hero-row-2 .ch', {xPercent: 0, yPercent: 0, opacity: 1}, {xPercent: i => 20 + i * 22, yPercent: 30, opacity: 0, ease: 'none', scrollTrigger: {...out}});
  gsap.fromTo('.hud, .hero-lede, .hero-sponsor, .scroll-cue', {opacity: 1, y: 0}, {opacity: 0, y: -40, ease: 'none', scrollTrigger: {trigger: '.hero', start: 'top top', end: '40% top', scrub: true}});
}

/* ---------- Scroll scenes ---------- */
function setupScroll(lenis, director, s) {


  /* Marquee: velocity-reactive */
  const track = $('.marquee-track');
  if (track) {
    let x = 0, dir = -1, skew = 0;
    gsap.ticker.add((_, dt) => {
      const v = lenis.velocity || 0;
      if (Math.abs(v) > .5) dir = v > 0 ? -1 : 1;
      x += dir * (40 + Math.min(Math.abs(v) * 30, 900)) * dt / 1000;
      const w = track.scrollWidth / 4;
      if (x < -w) x += w; if (x > 0) x -= w;
      skew += (Math.max(-12, Math.min(12, -v * .6)) - skew) * .1;
      track.style.transform = `translate3d(${x}px,0,0) skewX(${skew}deg)`;
    });
  }

  /* Manifesto: words light up in reading order */
  for (const el of $$('[data-words]')) {
    const words = splitWords(el);
    gsap.fromTo(words, {opacity: .13}, {opacity: 1, stagger: .08, ease: 'none', scrollTrigger: {trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: true}});
  }
  gsap.from('.manifesto-foot > *', {opacity: 0, y: 30, stagger: .1, duration: 1, ease: 'expo.out', scrollTrigger: {trigger: '.manifesto-foot', start: 'top 90%'}});

  /* Section labels draw in */
  for (const el of $$('.section-label')) ScrollTrigger.create({trigger: el, start: 'top 92%', once: true, onEnter: () => el.classList.add('is-in')});

  /* Machine: steps, readout, callouts */
  const steps = $$('.machine-steps li'), modes = ['Solid', 'Exploded', 'Blueprint', 'Solid'];
  const progressBar = $('.machine-progress i'), modeEl = $('[data-mode]');
  ScrollTrigger.create({
    trigger: '.machine', start: 'top top', end: 'bottom bottom',
    onUpdate: self => {
      const p = self.progress, i = p < .27 ? 0 : p < .52 ? 1 : p < .8 ? 2 : 3;
      steps.forEach((li, n) => li.classList.toggle('is-active', n === i));
      progressBar.style.transform = `scaleY(${p})`;
      if (modeEl.textContent !== modes[i]) modeEl.textContent = modes[i];
    }
  });
  const callouts = $('.callouts'), lines = $('.callout-lines');

  /* Stats */
  for (const el of $$('[data-count]')) ScrollTrigger.create({trigger: el, start: 'top 88%', once: true, onEnter: () => countUp(el)});
  gsap.from('.stat', {opacity: 0, y: 40, stagger: .08, duration: 1.1, ease: 'expo.out', scrollTrigger: {trigger: '.stats', start: 'top 85%'}});

  /* Crew: vertical scroll → horizontal track */
  const crew = $('.crew'), crewTrack = $('.crew-track');
  const crewDistance = () => Math.max(0, crewTrack.scrollWidth - innerWidth + parseFloat(getComputedStyle(crewTrack).paddingLeft));
  const sizeCrew = () => {crew.style.height = `${crewDistance() + innerHeight * 1.15}px`;};
  sizeCrew();
  ScrollTrigger.addEventListener('refreshInit', sizeCrew);
  const crewTween = gsap.to(crewTrack, {x: () => -crewDistance(), ease: 'none', scrollTrigger: {trigger: crew, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true, onUpdate: s => {$('.crew-progress i').style.transform = `scaleX(${s.progress})`;}}});
  for (const card of $$('.discipline', crew)) {
    ScrollTrigger.create({trigger: card, containerAnimation: crewTween, start: 'left 88%', once: true, onEnter: () => card.classList.add('is-in')});
  }
  gsap.from('.crew-title', {yPercent: 30, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: {trigger: crew, start: 'top 70%'}});

  /* Game */
  gsap.fromTo('.game-title span', {yPercent: 100}, {yPercent: 0, stagger: .12, duration: 1.4, ease: 'expo.out', scrollTrigger: {trigger: '.game', start: 'top 40%', toggleActions: 'play none none reverse'}});
  gsap.to('.game-title', {scale: .82, opacity: .18, ease: 'none', scrollTrigger: {trigger: '.game', start: '30% top', end: '70% top', scrub: true}});
  gsap.from('.game-copy', {opacity: 0, y: 30, duration: 1.2, ease: 'expo.out', scrollTrigger: {trigger: '.game', start: 'top 10%', toggleActions: 'play none none reverse'}});
  const cx = $('[data-coord-x]'), cz = $('[data-coord-z]');

  /* Lab */
  gsap.from('.lab-title .wi', {yPercent: 110, stagger: .06, duration: 1.3, ease: 'expo.out', scrollTrigger: {trigger: '.lab-title', start: 'top 85%'}});
  for (const fig of $$('.lab-photo')) {
    const frame = $('.lab-frame', fig), img = $('img', fig);
    gsap.fromTo(frame, {clipPath: 'inset(100% 0% 0% 0%)'}, {clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: {trigger: fig, start: 'top 88%'}});
    gsap.fromTo(img, {yPercent: -9, scale: 1.18}, {yPercent: 9, scale: 1.06, ease: 'none', scrollTrigger: {trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true}});
  }

  /* Partner: the panel opens to full bleed */
  gsap.fromTo('.partner-panel', {clipPath: 'inset(16% 12% 16% 12% round 10px)'}, {clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: {trigger: '.partner', start: 'top bottom', end: 'top top', scrub: true}});
  gsap.from('.partner-panel > *:not(.crop)', {opacity: 0, y: 40, stagger: .07, duration: 1.2, ease: 'expo.out', scrollTrigger: {trigger: '.partner', start: 'top 35%'}});

  /* Finale */
  gsap.from('.finale-title .wi', {yPercent: 110, stagger: .08, duration: 1.4, ease: 'expo.out', scrollTrigger: {trigger: '.finale', start: '35% bottom'}});
  gsap.from('.finale-actions > *', {opacity: 0, y: 30, stagger: .1, duration: 1.2, ease: 'expo.out', scrollTrigger: {trigger: '.finale', start: '45% bottom'}});

  /* Footer wordmark */
  gsap.fromTo('.footer-word span', {yPercent: 100}, {yPercent: 0, stagger: .04, duration: 1.2, ease: 'expo.out', scrollTrigger: {trigger: '.site-footer', start: 'top 80%'}});

  /* Stage sync */
  const covers = $$('[data-cover]');
  ScrollTrigger.addEventListener('refresh', () => director.refresh());
  director.refresh();
  if (s) {
    const PART_OFFSETS = {SOURCE_SHOOTER: [150, -70], INFERRED_INTAKE: [170, 50], INFERRED_INDEXER: [-190, -80], INFERRED_CHASSIS: [-200, 40], INFERRED_DRIVETRAIN: [160, 120]};
    const nodes = s.parts.map(p => {
      const el = document.createElement('div');
      el.className = 'callout';
      el.innerHTML = `<i></i><span><b>${p.label}</b>${p.note}</span>`;
      callouts.append(el);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      lines.append(line);
      return {p, el, line};
    });
    gsap.ticker.add(() => {
      const y = scrollY;
      s.setTarget(director.sample(y));
      s.setCovered(covers.some(el => {const r = el.getBoundingClientRect(); return r.top <= 0 && r.bottom >= innerHeight;}));
      // Callouts follow the exploded parts.
      const amount = Math.max(0, Math.min(1, (s.state.explode - .45) / .4)) * (1 - s.state.holo * .5);
      callouts.style.opacity = amount.toFixed(3);
      if (amount > .01) {
        const m = mobile();
        for (const {p, el, line} of nodes) {
          const [ox, oy] = PART_OFFSETS[p.name].map(v => v * (m ? .45 : 1));
          const lx = p.x + ox, ly = p.y + oy;
          el.style.transform = `translate(${lx}px, ${ly}px)`;
          el.classList.toggle('left', ox < 0);
          line.setAttribute('points', `${p.x},${p.y} ${p.x + ox * .55},${ly} ${lx},${ly}`);
        }
      }
      if (cx) {cx.textContent = `X ${s.state.cx.toFixed(3)}`; cz.textContent = `Z ${s.state.cz.toFixed(3)}`;}
    });
    const b = s.bounds, dims = $('[data-bounds]');
    if (dims) dims.textContent = `${b.x.toFixed(2)} × ${b.z.toFixed(2)} × ${b.y.toFixed(2)} m`;
  }
  // Fonts and images change layout; recompute after they settle.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
}
