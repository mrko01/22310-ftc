// The 22310.ca homepage: one continuous, scroll-driven story over a single
// WebGL stage. All copy is real HTML; the canvas is decorative.
import {flowerMark, arrowIcon} from './svgs.mjs';
import {titleSponsor} from './sponsors.mjs';

/** Words wrapped for masked line reveals. */
const split = text => text.split(' ').map(w => `<span class="w"><span class="wi">${w}</span></span>`).join(' ');

export function homeBody({disciplines, sponsorCredit}) {
  const students = disciplines.reduce((n, d) => n + d.people.length, 0);
  const marquee = disciplines.map(d => `<span>${d.name}</span>${flowerMark('marquee-flower')}`).join('');
  return `
<div class="loader" aria-hidden="true">
  <div class="loader-inner">${flowerMark('loader-flower')}<div class="loader-bar"><i></i></div></div>
</div>

<div class="stage" aria-hidden="true"><canvas id="scene"></canvas></div>
<div class="callouts" aria-hidden="true"><svg class="callout-lines"></svg></div>

<main id="main" tabindex="-1" class="home">

  <section class="hero" id="top" aria-labelledby="hero-title">
    <h1 id="hero-title" class="hero-title" aria-label="EDIT Saffron">
      <span class="hero-row hero-row-1" aria-hidden="true"><span class="char-wrap">${[...'EDIT'].map(c => `<span class="ch">${c}</span>`).join('')}</span></span>
      <span class="hero-row hero-row-2" aria-hidden="true"><span class="char-wrap">${[...'SAFFRON'].map(c => `<span class="ch">${c}</span>`).join('')}</span></span>
    </h1>
    ${sponsorCredit('hero-sponsor')}
    <img class="rm-only hero-poster" src="/assets/robot-poster-v2.webp" width="1400" height="1400" alt="The EDIT Saffron robot">
  </section>

  <div class="marquee" aria-hidden="true"><div class="marquee-track">${marquee}${marquee}${marquee}${marquee}</div></div>

  <section class="manifesto" id="about" aria-label="About the team">
    <h2 class="manifesto-text" data-words>We’re EDIT Saffron: ${students} students at Lo‑Ellen Park who design, program, machine and wire a robot for the FIRST Tech Challenge.</h2>
    <a class="link-arrow manifesto-link" href="/team/">Meet the team ${arrowIcon}</a>
  </section>

  <section class="machine" id="robot" aria-labelledby="robot-title" data-sticky>
    <div class="sticky">
      <h2 id="robot-title" class="sr-only">Our robot</h2>
      <ol class="machine-steps">
        <li class="is-active"><h3>This season’s robot</h3><p>Designed in Fusion and built by the team.</p></li>
        <li><h3>Five assemblies</h3><p>Drivebase, intake, indexer, shooter and sensors.</p></li>
        <li><h3>Every part, modelled</h3><p>Parts are drawn in CAD before they’re cut, printed or machined in the EDIT Lab.</p></li>
        <li><h3>Ready for BIOBUZZ</h3></li>
      </ol>
      <img class="rm-only machine-poster" src="/assets/robot-poster-v2.webp" width="1400" height="1400" alt="The EDIT Saffron robot" loading="lazy">
    </div>
  </section>

  <section class="crew" id="crew" aria-labelledby="crew-title" data-cover>
    <h2 id="crew-title" class="crew-title">${split('The team')}</h2>
    <div class="crew-grid">
      <div class="crew-art" aria-hidden="true"></div>
      <div class="crew-list">
        ${disciplines.map(d => `
        <article class="crew-row" id="${d.id}" data-discipline="${d.id}">
          <h3>${d.name}</h3>
          <p class="crew-desc">${d.description}</p>
          <p class="crew-skills">${d.skills}</p>
          <p class="crew-people">${d.people.join(', ')}</p>
        </article>`).join('')}
        <a class="crew-join" href="/contact/?topic=joining"><span>Want in?</span> <span class="link-arrow">Get involved ${arrowIcon}</span></a>
      </div>
    </div>
  </section>

  <section class="game" id="biobuzz" aria-labelledby="game-title" data-sticky>
    <div class="sticky">
      <h2 id="game-title" class="game-title" aria-label="BIOBUZZ"><span aria-hidden="true">BIO</span><span aria-hidden="true">BUZZ</span></h2>
      <img class="rm-only game-poster" src="/assets/field-poster.webp" width="1400" height="1400" alt="The BIOBUZZ competition field" loading="lazy">
    </div>
  </section>

  <section class="lab" id="lab" aria-labelledby="lab-title" data-cover>
    <h2 id="lab-title" class="lab-title">${split('Inside Lo‑Ellen Robotics')}</h2>
    <div class="lab-grid">
      ${[
        ['pit-work', 1600, 1067, 'Students working on a robot in the competition pit'],
        ['practice', 1600, 900, 'Students around an FTC practice field in the workshop'],
        ['robot-detail', 1600, 1067, 'Close-up of robot mechanisms and sponsor panels'],
        ['team-at-competition', 1600, 1067, 'The Lo-Ellen team gathered around its robot at competition']
      ].map(([name, w, h, alt], i) => `
      <figure class="lab-photo lab-photo-${i + 1}">
        <div class="lab-frame"><img src="/assets/lo-ellen-${name}-1600.webp" srcset="/assets/lo-ellen-${name}-800.webp 800w, /assets/lo-ellen-${name}-1600.webp 1600w" sizes="(max-width:800px) 92vw, 46vw" width="${w}" height="${h}" alt="${alt}" loading="lazy" decoding="async"></div>
      </figure>`).join('')}
    </div>
    <p class="lab-credit">Photos from the wider <a href="https://loellenrobotics.ca/loellenrobotics/#gallery">Lo‑Ellen Robotics program</a>, including FRC 4069.</p>
  </section>

  <section class="partner" id="partner" aria-labelledby="partner-title" data-cover>
    <div class="partner-panel">
      <a class="partner-logo" href="${titleSponsor.url}" target="_blank" rel="noopener noreferrer" aria-label="Visit Agnico Eagle, our title sponsor (opens in a new tab)"><img src="${titleSponsor.logo}" width="${titleSponsor.width}" height="${titleSponsor.height}" alt="Agnico Eagle" loading="lazy" decoding="async"></a>
      <h2 id="partner-title" class="partner-title">Powered by Agnico Eagle</h2>
      <p>Title sponsor of FTC Team 22310 and Lo‑Ellen Robotics. Thank you for helping our students build, learn and compete.</p>
      <div class="partner-actions"><a class="button button-ink" href="/sponsors/">Become a partner ${arrowIcon}</a><a class="link-arrow" href="/sponsors/#support">Ways to help ${arrowIcon}</a></div>
    </div>
  </section>

  <section class="finale" id="join" aria-labelledby="finale-title" data-sticky>
    <div class="sticky">
      <div class="finale-row">
        <h2 id="finale-title" class="finale-title">${split('Build with us')}</h2>
        <div class="finale-actions">
          <a class="button button-saffron magnetic" href="/contact/">Get in touch ${arrowIcon}</a>
          <a class="button button-line magnetic" href="/events/">See events ${arrowIcon}</a>
        </div>
      </div>
    </div>
  </section>
</main>`;
}
