// Shared site chrome: header behaviour and the full-screen menu.
export function initChrome() {
  const header = document.querySelector('.site-header');
  const menu = document.querySelector('.menu-button');
  const nav = document.querySelector('.site-nav');
  if (!header) return;
  const setOpen = open => {
    menu?.setAttribute('aria-expanded', String(open));
    menu?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav?.classList.toggle('open', open);
    document.documentElement.classList.toggle('menu-open', open);
  };
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    setOpen(open);
    if (open) nav.querySelector('a')?.focus();
  });
  document.addEventListener('keydown', e => {if (e.key === 'Escape' && nav?.classList.contains('open')) {setOpen(false); menu.focus();}});
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  matchMedia('(min-width:901px)').addEventListener('change', () => setOpen(false));
  header.addEventListener('focusout', () => requestAnimationFrame(() => {if (!header.contains(document.activeElement)) setOpen(false);}));

  // Hide on the way down, return on the way up.
  let lastY = scrollY, ticking = false;
  const sync = () => {
    ticking = false;
    const y = scrollY, down = y > lastY + 4, up = y < lastY - 4;
    header.classList.toggle('scrolled', y > 24);
    if (!document.documentElement.classList.contains('menu-open')) {
      if (down && y > 220) header.classList.add('tucked');
      else if (up || y < 220) header.classList.remove('tucked');
    }
    if (down || up) lastY = y;
  };
  addEventListener('scroll', () => {if (!ticking) {ticking = true; requestAnimationFrame(sync);}}, {passive: true});
  header.addEventListener('focusin', () => header.classList.remove('tucked'));
  sync();
}

/** Magnetic hover for primary calls to action (pointer devices only). */
export function initMagnetic(root = document) {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const el of root.querySelectorAll('.magnetic')) {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
    });
    el.addEventListener('pointerleave', () => {el.style.transform = '';});
  }
}
