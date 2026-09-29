# 22310 FTC

The website for FTC Team 22310 at https://22310.ca.

Page templates, shared styles, calendar behavior, and brand assets live in `src/`. The interactive robot source is maintained in `src/scene/mascot.js` and bundled separately so it does not delay the page.

Run `npm ci`, `npm test`, and `npm run build` before publishing. The build produces the complete static site in `dist/`, including minified assets and security headers.

Cloudflare Pages deploys the committed `dist` directory from the `main` branch. Commit both source and build output, then push to `main`; no Cloudflare build command is required. The public calendar and contact form use the authenticated team worker's public API routes at `https://team.22310.ca`.

The public site includes Home, The team, Events, Sponsors, and Contact. The Sponsors page links to the Lo-Ellen Robotics sponsorship package on Google Slides. Page metadata, navigation, sitemap entries, and structured data are generated from `src/pages.mjs`; add content there rather than editing generated HTML.

The calendar validates API data before rendering, keeps only a public schedule cache for up to 24 hours, and labels cached results when the network is unavailable. Category/search filters also apply to the upcoming-events `.ics` export. All-day values are date-only UTC data but remain visible through the corresponding Toronto day. Live changes use the public WebSocket, with refresh on reconnect and page wake.

Contact links may preselect `?topic=sponsorship`, `outreach`, `joining`, or `visit`. Sponsorship links can add `support=funding`, `materials`, or `mentorship`. The form restores up to five separate unsent enquiries within a tab session for up to four hours, provides an explicit discard action and mail-app fallback, and never automatically retries a message after uncertain delivery. Drafts use sessionStorage only; names, addresses, and messages are never placed in localStorage or page URL parameters. Successful delivery removes the submitted draft. The public API allows production-origin requests; use a mocked route to exercise local contact states without sending team mail.

Visitors can share `/events/?event=<public-event-id>` links. Event dialogs copy a canonical link and offer an enquiry link that preserves the event ID; the contact page fetches the public event again and includes its verified title, time, location, and URL with the message. Missing or canceled events receive a clear fallback.

The old locally authored partnership brief and PDF were removed in favor of the Lo-Ellen package. Legacy brief URLs redirect to `/sponsors/`. `npm run check` rebuilds and validates generated internal routes, anchors, assets, unique page IDs, structured data, and the package link.

Without JavaScript, the site exposes mobile navigation, the mascot illustration, an email contact action, calendar guidance, and the sponsorship package link. It never submits contact fields with a GET request.

## Rendering and accessibility
The mascot retains Three.js/WebGL2: it is a small authored scene with no need for a game engine, physics runtime, or an additional model-viewer layer. Visual quality comes from studio environment lighting, softer contact shadows and bounded high-DPI rendering. WebGPU was considered; the official Three.js renderer guide still describes WebGL2 fallback. Migrating the renderer would not by itself improve this model. See https://threejs.org/manual/pages/webgpurenderer and https://threejs.org/manual/pages/responsive.html.

The canvas uses a pixel budget (1.1 MP for touch/data-saving devices; 2.4 MP for desktop), 30/60 fps targets, and suspends rendering offscreen, when the tab is hidden, and after paused poses settle. A static illustration remains available without JavaScript/WebGL or during context loss. The scene supports keyboard rotation, greeting, and Reset view. Random ambient throws were removed to keep the hero focused.
