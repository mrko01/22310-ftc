# 22310 FTC

The website for FTC Team 22310 at https://22310.ca.

Page templates, shared styles, calendar behavior, and brand assets live in `src/`. The existing interactive robot is maintained in `dist/assets/mascot.js` and bundled separately so it does not delay the page.

Run `npm ci`, `npm test`, and `npm run build` before publishing. The build produces the complete static site in `dist/`, including minified assets and security headers.

Cloudflare Pages deploys the committed `dist` directory from the `main` branch. Commit both source and build output, then push to `main`; no Cloudflare build command is required. The public calendar and contact form use the authenticated team worker's public API routes at `https://team.22310.ca`.
