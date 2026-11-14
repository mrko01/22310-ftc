// The 22310.ca homepage: one continuous, scroll-driven story over a single
// WebGL stage. All copy is real HTML; the canvas is decorative.
import {flowerMark, disciplineArt, cropMarks, arrowIcon} from './svgs.mjs';
import {titleSponsor} from './sponsors.mjs';

const roster = disciplines => disciplines.reduce((n, d) => n + d.people.length, 0);
const label = (index, text) => `<p class="section-label"><span class="idx">[${index}]</span><span>${text}</span></p>`;
/** Words wrapped for masked line reveals; the heading keeps its plain text for assistive tech. */
const split = text => text.split(' ').map(w => `<span class="w"><span class="wi">${w}</span></span>`).join(' ');

export function homeBody({disciplines, sponsorCredit}) {
  const students = roster(disciplines);
  const marquee = disciplines.map(d => `<span>${d.name}</span>${flowerMark('marquee-flower')}`).join('');
  return `
<div class="loader" aria-hidden="true">
  <div class="loader-inner">
    ${flowerMark('loader-flower')}
    <div class="loader-row"><span>EDIT Saffron</span><span class="loader-count">000</span></div>
    <div class="loader-bar"><i></i></div>
    <div class="loader-row loader-sub"><span>FTC 22310</span><span>Loading the machine</span></div>
  </div>
</div>

<div class="stage" aria-hidden="true">
  <canvas id="scene"></canvas>
  <div class="stage-grain"></div>
</div>
<div class="callouts" aria-hidden="true"><svg class="callout-lines"></svg></div>

<main id="main" tabindex="-1" class="home">

  <section class="hero" id="top" aria-labelledby="hero-title">
    <div class="hud" aria-hidden="true">
      <span class="hud-tl">FTC Team 22310<br><b>Lo-Ellen Park S.S.</b></span>
      <span class="hud-tr">46.49° N<br>80.99° W</span>
      <span class="hud-bl">Season 2026–27<br><b>BIOBUZZ</b></span>
    </div>
    <h1 id="hero-title" class="hero-title" aria-label="EDIT Saffron">
      <span class="hero-row hero-row-1" aria-hidden="true"><span class="char-wrap">${[...'EDIT'].map(c => `<span class="ch">${c}</span>`).join('')}</span></span>
      <span class="hero-row hero-row-2" aria-hidden="true"><span class="char-wrap">${[...'SAFFRON'].map(c => `<span class="ch">${c}</span>`).join('')}</span></span>
    </h1>
    <p class="hero-lede">Student-built competition robots from <br>Greater Sudbury, Ontario.</p>
    ${sponsorCredit('hero-sponsor')}
    <a class="scroll-cue" href="#about"><span>Scroll</span><i aria-hidden="true"></i></a>
    <img class="rm-only hero-poster" src="/assets/robot-poster-v2.webp" width="1400" height="1400" alt="The EDIT Saffron robot, rendered from CAD">
  </section>

  <div class="marquee" aria-hidden="true"><div class="marquee-track">${marquee}${marquee}${marquee}${marquee}</div></div>

  <section class="manifesto" id="about" aria-labelledby="about-title">
    ${label('01', 'Who we are')}
    <h2 id="about-title" class="manifesto-text" data-words>We are EDIT Saffron: ${students} students at Lo‑Ellen Park who design, program, machine and wire a competition robot for the FIRST Tech Challenge.</h2>
    <div class="manifesto-foot">
      <p>One of Lo‑Ellen Robotics’ FTC teams, working out of the school’s EDIT Lab with CAD, 3D printing and CNC machining.</p>
      <a class="link-arrow" href="/team/">Meet the team ${arrowIcon}</a>
    </div>
  </section>

  <section class="machine" id="robot" aria-labelledby="robot-title" data-sticky>
    <div class="sticky">
      ${label('02', 'The machine')}
      <h2 id="robot-title" class="sr-only">The machine</h2>
      <ol class="machine-steps">
        <li class="is-active"><span class="step-n">A</span><h3>Built to move.</h3><p>A compact robot designed around the BIOBUZZ game.</p></li>
        <li><span class="step-n">B</span><h3>Taken apart.</h3><p>Shooter, intake, indexer, chassis and drive: five systems that have to work as one.</p></li>
        <li><span class="step-n">C</span><h3>Drawn in lines.</h3><p>Parts start in CAD before they are cut, printed or machined in the EDIT Lab.</p></li>
        <li><span class="step-n">D</span><h3>Ready to compete.</h3><p>Back together, wired and tuned for the field.</p></li>
      </ol>
      <div class="machine-progress" aria-hidden="true"><i></i></div>
      <dl class="readout" aria-label="Model readout">
        <div><dt>Bounds</dt><dd data-bounds>— × — × — m</dd></div>
        <div><dt>Systems</dt><dd>05</dd></div>
        <div><dt>Mode</dt><dd data-mode>Solid</dd></div>
      </dl>
      <p class="machine-note">Shooter shown from the team’s CAD. Chassis, intake, indexer and drive are visual stand‑ins.</p>
      <img class="rm-only machine-poster" src="/assets/shooter-poster.webp" width="1400" height="1400" alt="The EDIT Saffron shooter assembly, rendered from the team’s CAD" loading="lazy">
    </div>
  </section>

  <section class="stats" aria-label="The team in numbers">
    <div class="stat"><span class="stat-n" data-count="${students}">${students}</span><span class="stat-l">Students</span></div>
    <div class="stat"><span class="stat-n" data-count="${disciplines.length}">${disciplines.length}</span><span class="stat-l">Disciplines</span></div>
    <div class="stat"><span class="stat-n" data-count="1">1</span><span class="stat-l">Robot, built in-house</span></div>
    <div class="stat"><span class="stat-n stat-team" data-count="22310">22310</span><span class="stat-l">Team number</span></div>
  </section>

  <section class="crew" id="crew" aria-labelledby="crew-title" data-sticky data-cover>
    <div class="sticky">
      <header class="crew-head">
        ${label('03', 'The crew')}
        <h2 id="crew-title" class="crew-title">Five disciplines.<br><em>One robot.</em></h2>
        <div class="crew-progress" aria-hidden="true"><i></i></div>
      </header>
      <div class="crew-track">
        ${disciplines.map((d, i) => `
        <article class="discipline" id="${d.id}">
          ${cropMarks}
          <div class="discipline-top"><span class="discipline-n">0${i + 1}</span><span class="discipline-skills">${d.skills}</span></div>
          ${disciplineArt(d.id)}
          <h3>${d.name}</h3>
          <p class="discipline-line">${d.line}</p>
          <p class="discipline-desc">${d.description}</p>
          <ul class="discipline-people" aria-label="${d.name} members">${d.people.map(p => `<li>${p}</li>`).join('')}</ul>
        </article>`).join('')}
        <a class="discipline discipline-join" href="/contact/?topic=joining">
          <span class="discipline-n">06</span>
          <span class="join-title">Your name<br>here?</span>
          <span class="link-arrow">Get involved ${arrowIcon}</span>
        </a>
      </div>
    </div>
  </section>

  <section class="game" id="biobuzz" aria-labelledby="game-title" data-sticky>
    <div class="sticky">
      ${label('04', 'The game')}
      <h2 id="game-title" class="game-title"><span>BIO</span><span>BUZZ</span></h2>
      <div class="game-copy">
        <p>The 2026–27 FIRST® Tech Challenge season. Every match is played on a 3.66 m square field.</p>
        <p class="mono-note">Field modelled from official FIRST CAD</p>
      </div>
      <div class="game-coords" aria-hidden="true"><span data-coord-x>X 0.000</span><span data-coord-z>Z 0.000</span></div>
      <img class="rm-only game-poster" src="/assets/field-poster.webp" width="1400" height="1400" alt="The BIOBUZZ competition field rendered from official FIRST CAD" loading="lazy">
    </div>
  </section>

  <section class="lab" id="lab" aria-labelledby="lab-title" data-cover>
    <div class="lab-head">
      ${label('05', 'The program')}
      <h2 id="lab-title" class="lab-title">${split('Inside Lo‑Ellen Robotics.')}</h2>
      <p>Saffron is one of Lo‑Ellen’s FIRST Tech Challenge teams. The program works to expand STEM education and develop skilled trades in Northern Ontario.</p>
    </div>
    <div class="lab-grid">
      ${[
        ['pit-work', 1600, 1067, 'Students working on a robot in the competition pit', 'In the pit'],
        ['practice', 1600, 900, 'Students around an FTC practice field in the workshop', 'Practice field'],
        ['robot-detail', 1600, 1067, 'Close-up of robot mechanisms and sponsor panels', 'Mechanisms'],
        ['team-at-competition', 1600, 1067, 'The Lo-Ellen team gathered around its robot at competition', 'At competition']
      ].map(([name, w, h, alt, cap], i) => `
      <figure class="lab-photo lab-photo-${i + 1}">
        <div class="lab-frame"><img src="/assets/lo-ellen-${name}-1600.webp" srcset="/assets/lo-ellen-${name}-800.webp 800w, /assets/lo-ellen-${name}-1600.webp 1600w" sizes="(max-width:800px) 92vw, 46vw" width="${w}" height="${h}" alt="${alt}" loading="lazy" decoding="async"></div>
        <figcaption><span>0${i + 1}</span>${cap}</figcaption>
      </figure>`).join('')}
    </div>
    <p class="lab-credit">Photos: the wider <a href="https://loellenrobotics.ca/loellenrobotics/#gallery">Lo‑Ellen Robotics program</a>, including FRC 4069.</p>
  </section>

  <section class="partner" id="partner" aria-labelledby="partner-title" data-cover>
    <div class="partner-panel">
      ${cropMarks}
      ${label('06', 'Title sponsor')}
      <a class="partner-logo" href="${titleSponsor.url}" target="_blank" rel="noopener noreferrer" aria-label="Visit Agnico Eagle, our title sponsor (opens in a new tab)"><img src="${titleSponsor.logo}" width="${titleSponsor.width}" height="${titleSponsor.height}" alt="Agnico Eagle" loading="lazy" decoding="async"></a>
      <h2 id="partner-title" class="partner-title">Powered by<br>Agnico Eagle.</h2>
      <p>Title sponsor of FTC Team 22310 and Lo‑Ellen Robotics. Thank you for helping our students build, learn and compete.</p>
      <div class="partner-actions"><a class="button button-ink" href="/sponsors/">Become a partner ${arrowIcon}</a><a class="link-arrow" href="/sponsors/#support">Ways to help ${arrowIcon}</a></div>
    </div>
  </section>

  <section class="finale" id="join" aria-labelledby="finale-title" data-sticky>
    <div class="sticky">
      ${label('07', 'Next')}
      <div class="finale-row">
        <h2 id="finale-title" class="finale-title">${split('Build with us.')}</h2>
        <div class="finale-actions">
          <a class="button button-saffron magnetic" href="/contact/">Get in touch ${arrowIcon}</a>
          <a class="button button-line magnetic" href="/events/">See events ${arrowIcon}</a>
        </div>
      </div>
    </div>
  </section>
</main>`;
}
