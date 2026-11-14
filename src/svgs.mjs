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



export const arrowIcon = '<svg class="arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M8 5h11v11" stroke="currentColor" stroke-width="1.6"/></svg>';
