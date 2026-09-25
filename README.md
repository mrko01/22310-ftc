# 22310 FTC

The website for FTC Team 22310 at https://22310.ca.

Page templates, shared styles, calendar behavior, and brand assets live in `src/`. The existing interactive robot is maintained in `dist/assets/mascot.js` and bundled separately so it does not delay the page.

Run `npm ci`, `npm test`, and `npm run build` before publishing. The build produces the complete static site in `dist/`, including minified assets and security headers.

Cloudflare Pages deploys the committed `dist` directory from the `main` branch. Commit both source and build output, then push to `main`; no Cloudflare build command is required. The public calendar and contact form use the authenticated team worker's public API routes at `https://team.22310.ca`.

The public site includes Home, The team, Events, Sponsors, Contact, and a print-ready partnership brief at `/sponsors/brief/`. Page metadata, navigation, sitemap entries, and structured data are generated from `src/pages.mjs`; add content there rather than editing generated HTML.

The calendar validates API data before rendering, keeps only a public schedule cache for up to 24 hours, and labels cached results when the network is unavailable. Category/search filters also apply to the upcoming-events `.ics` export. All-day values are date-only UTC data but remain visible through the corresponding Toronto day. Live changes use the public WebSocket, with refresh on reconnect and page wake.

Contact links may preselect `?topic=sponsorship`, `outreach`, `joining`, or `visit`. Sponsorship links can add `support=funding`, `materials`, or `mentorship`. The form keeps failed submissions in memory, provides a mail-app fallback, and never automatically retries a message after uncertain delivery. The public API allows production-origin requests; use a mocked route to exercise local contact states without sending team mail.
