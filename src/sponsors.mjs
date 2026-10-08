export const titleSponsor = {
  name: 'Agnico Eagle',
  url: 'https://agnicoeagle.com/English/home/default.aspx',
  logo: '/assets/agnico-eagle-logo.png',
  width: 1000,
  height: 480
};

const externalArrow = '<span class="sponsor-arrow" aria-hidden="true">↗</span>';
export function sponsorLogo(className = '', visitLabel = false) {
  return `<a class="sponsor-logo-link ${className}" href="${titleSponsor.url}" target="_blank" rel="noopener noreferrer" aria-label="Visit Agnico Eagle, our title sponsor (opens in a new tab)"><img src="${titleSponsor.logo}" width="${titleSponsor.width}" height="${titleSponsor.height}" alt="Agnico Eagle" decoding="async"/>${visitLabel ? `<span class="sponsor-visit">Visit Agnico Eagle ${externalArrow}</span>` : externalArrow}</a>`;
}

export function sponsorCredit(className) {
  return `<div class="sponsor-credit ${className}"><span class="sponsor-label">Title sponsor</span>${sponsorLogo()}</div>`;
}

export const sponsorFeature = `<header class="title-sponsor-feature" id="title-sponsor"><div class="section-inner title-sponsor-layout"><div class="title-sponsor-copy"><span class="sponsor-label">Title sponsor</span><h1>Agnico Eagle.</h1><p>Supporting FTC Team 22310<br>and Lo-Ellen Robotics.</p><p class="sponsor-thanks">Thank you for helping our students<br>build, learn, and compete.</p></div>${sponsorLogo('title-sponsor-logo', true)}</div></header>`;
