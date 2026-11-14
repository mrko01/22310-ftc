// Original line illustrations for 22310.ca, generated at build time.
// Every drawable stroke carries pathLength="1" so CSS can draw it on with
// stroke-dashoffset (see .draw in base.css). Decorative: aria-hidden.

const f = n => Math.round(n * 100) / 100;

/** Almond petal from (0,0) pointing up, length l and half-width w. */
const petal = (l, w) => `M0 0C${f(w)} ${f(-l * .32)} ${f(w * .62)} ${f(-l * .8)} 0 ${f(-l)}C${f(-w * .62)} ${f(-l * .8)} ${f(-w)} ${f(-l * .32)} 0 0Z`;

/** Saffron flower mark: six petals, three stigmas, Lo-Ellen chevrons. */
export function flowerMark(className = 'flower-mark') {
  const petals = [[-62, 30, 9], [-36, 38, 11], [-12, 44, 11], [12, 44, 11], [36, 38, 11], [62, 30, 9]]
    .map(([a, l, w]) => `<path class="petal" pathLength="1" transform="translate(50 76) rotate(${a})" d="${petal(l, w)}"/>`).join('');
  const stigmas = [
    'M50 76C48.5 62 45 50 40 38', 'M50 76C50 60 50 46 50 30', 'M50 76C51.5 62 55 50 60 38'
  ].map(d => `<path class="stigma" pathLength="1" d="${d}"/>`).join('')
    + [[40, 38], [50, 30], [60, 38]].map(([x, y]) => `<circle class="pollen" cx="${x}" cy="${y}" r="2.2"/>`).join('');
  return `<svg class="${className}" viewBox="0 0 100 100" fill="none" aria-hidden="true">${petals}${stigmas}</svg>`;
}

export const chevrons = `<svg class="chevrons" viewBox="0 0 28 16" fill="none" aria-hidden="true"><path d="M2 2l7 6-7 6M13 2l7 6-7 6" stroke="currentColor" stroke-width="2.6" stroke-linejoin="miter"/></svg>`;

/** Spur gear outline as a single path. */
function gear(cx, cy, teeth, rRoot, rTip) {
  const pts = [], step = Math.PI * 2 / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    for (const [da, r] of [[0, rRoot], [step * .18, rTip], [step * .5, rTip], [step * .68, rRoot]])
      pts.push(`${f(cx + Math.cos(a + da) * r)} ${f(cy + Math.sin(a + da) * r)}`);
  }
  return `M${pts.join('L')}Z`;
}

const crosshair = (x, y, s = 6) => `<path class="tick" d="M${x - s} ${y}h${s * 2}M${x} ${y - s}v${s * 2}"/>`;

const art = {
  // Isometric part with dimension lines and hidden edges.
  design: `
    <g class="ink">
      <path pathLength="1" d="M120 46L186 84V160L120 198L54 160V84Z"/>
      <path pathLength="1" d="M54 84L120 122L186 84M120 122V198"/>
      <path class="hidden" d="M120 46V122"/>
      <circle pathLength="1" cx="153" cy="141" r="15" transform="rotate(-30 153 141) scale(1 1)"/>
      <path pathLength="1" d="M78 112L100 125V150L78 137Z"/>
    </g>
    <g class="dim">
      <path pathLength="1" d="M40 92L40 168M34 92H48M34 168H48"/>
      <path pathLength="1" d="M128 214L194 176"/>
      <text x="16" y="134">76</text><text x="170" y="214">R15</text>
    </g>${crosshair(120, 122)}`,
  // Step response of a tuned controller settling on its setpoint.
  automation: `
    <g class="dim"><path pathLength="1" d="M28 196H214M28 196V40"/><path class="hidden" d="M28 98H214"/><text x="180" y="90">SET</text><text x="30" y="214">t</text></g>
    <g class="ink">
      <path pathLength="1" class="accent" d="M28 196H52C70 196 76 58 98 62C118 66 120 116 138 108C152 102 156 92 170 97C182 101 190 99 214 98"/>
    </g>
    <g class="ink"><rect pathLength="1" x="58" y="24" width="38" height="20"/><rect pathLength="1" x="112" y="24" width="38" height="20"/><path pathLength="1" d="M96 34H112M150 34H170V62"/></g>
    ${crosshair(98, 62, 5)}`,
  // A signal leaving the workshop and reaching connected people.
  reach: `
    <g class="ink">
      <circle pathLength="1" cx="72" cy="150" r="10"/>
      <path pathLength="1" d="M92 130A28 28 0 0 1 92 170M106 116A48 48 0 0 1 106 184M120 102A68 68 0 0 1 120 198"/>
    </g>
    <g class="dim"><path pathLength="1" d="M150 64L196 48L206 104L168 132L150 64M196 48L168 132M150 64L206 104"/></g>
    <g class="ink">${[[150, 64], [196, 48], [206, 104], [168, 132]].map(([x, y]) => `<circle class="node" pathLength="1" cx="${x}" cy="${y}" r="6"/>`).join('')}</g>
    ${crosshair(72, 150)}`,
  // Gear, hex nut and a drilled plate.
  trades: `
    <g class="ink spin"><path pathLength="1" d="${gear(104, 112, 14, 48, 58)}"/><circle pathLength="1" cx="104" cy="112" r="16"/></g>
    <g class="ink"><path pathLength="1" d="M178 150L196 160V180L178 190L160 180V160Z"/><circle pathLength="1" cx="178" cy="170" r="8"/></g>
    <g class="dim"><path pathLength="1" d="M34 206H214"/>${[52, 86, 120, 154, 188].map(x => `<circle pathLength="1" cx="${x}" cy="218" r="4"/>`).join('')}</g>
    ${crosshair(104, 112)}`,
  // Top-down field, tiles and a planned autonomous route.
  strategy: `
    <g class="dim">${Array.from({length: 5}, (_, i) => `<path d="M${48 + i * 29} 34V214M34 ${48 + i * 29}H214"/>`).join('')}</g>
    <g class="ink"><rect pathLength="1" x="34" y="34" width="180" height="180"/></g>
    <g class="ink"><path pathLength="1" class="accent" d="M62 190C62 150 92 150 106 128S150 98 150 70S186 52 192 58"/></g>
    <g class="ink">${[[62, 190], [106, 128], [150, 70]].map(([x, y]) => `<circle class="node" pathLength="1" cx="${x}" cy="${y}" r="7"/>`).join('')}<path pathLength="1" d="M184 50l16 16M200 50l-16 16"/></g>`
};

export function disciplineArt(id) {
  return `<svg class="discipline-art" viewBox="0 0 240 240" fill="none" aria-hidden="true">${art[id]}</svg>`;
}

/** Corner registration marks for framed panels. */
export const cropMarks = `<span class="crop crop-tl" aria-hidden="true"></span><span class="crop crop-tr" aria-hidden="true"></span><span class="crop crop-bl" aria-hidden="true"></span><span class="crop crop-br" aria-hidden="true"></span>`;

export const arrowIcon = '<svg class="arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M8 5h11v11" stroke="currentColor" stroke-width="1.6"/></svg>';
