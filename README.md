# 22310 FTC

The website for FTC Team 22310 at https://22310.ca.

Page templates, shared styles, calendar behavior, and brand assets live in `src/`. The immersive robot homepage lives in `src/experience/` and loads its Three.js scene separately. The previous mascot source remains in `src/scene/` for future work; it is not loaded by the homepage.

Run `npm ci`, `npm test`, and `npm run build` before publishing. The build produces the complete static site in `dist/`, including minified assets and security headers.

Cloudflare Pages deploys the committed `dist` directory from the `main` branch. Commit both source and build output, then push to `main`; no Cloudflare build command is required. The public calendar and contact form use the authenticated team worker's public API routes at `https://team.22310.ca`.

The public site includes Home, The team, Events, Sponsors, and Contact. The Sponsors page links to the Lo-Ellen Robotics sponsorship package on Google Slides. Page metadata, navigation, sitemap entries, and structured data are generated from `src/pages.mjs`; add content there rather than editing generated HTML.

The calendar starts in Month view and validates API data before rendering, keeps only a public schedule cache for up to 24 hours, and labels cached results when the network is unavailable. Category/search filters also apply to the upcoming-events `.ics` export. All-day values are date-only UTC data but remain visible through the corresponding Toronto day. Live changes use the public WebSocket, with refresh on reconnect and page wake.

Contact links may preselect `?topic=sponsorship`, `outreach`, `joining`, or `visit`. Sponsorship links can add `support=funding`, `materials`, or `mentorship`. The form restores up to five separate unsent enquiries within a tab session for up to four hours, provides an explicit discard action and mail-app fallback, and never automatically retries a message after uncertain delivery. Drafts use sessionStorage only; names, addresses, and messages are never placed in localStorage or page URL parameters. Successful delivery removes the submitted draft. The public API allows production-origin requests; use a mocked route to exercise local contact states without sending team mail.

Visitors can share `/events/?event=<public-event-id>` links. Event dialogs copy a canonical link and offer an enquiry link that preserves the event ID; the contact page fetches the public event again and includes its verified title, time, location, and URL with the message. Missing or canceled events receive a clear fallback.

The old locally authored partnership brief and PDF were removed in favor of the Lo-Ellen package. Legacy brief URLs redirect to `/sponsors/`. `npm run check` rebuilds and validates generated internal routes, anchors, assets, unique page IDs, structured data, and the package link.

Without JavaScript, the site exposes mobile navigation, static robot and field illustrations, an email contact action, calendar guidance, and the sponsorship package link. It never submits contact fields with a GET request.

## Experience integration

`npm run sync:experience -- /absolute/path/to/prototype` refreshes only the reviewed homepage source, styles, compressed robot/field assets, and interaction tests from a local prototype. Its explicit allowlist excludes the prototype's contact outbox, snapshot calendar, server handlers, source CAD, and uncompressed field. The default source is `../prototype`. Run the sync only when the scene owner has finished changing those inputs, then run all checks again.

A checked-in `src/experience/manifest.json` records source hashes. Normal builds do not need the prototype directory: `npm run build` cleans `dist` and rebuilds from production source. The homepage includes its own header once; all other pages use `navigation()` and `src/site.js`. Production contact and calendar never load the prototype's subpage JavaScript.

The supplied shooter is original team geometry. The chassis, drivetrain, intake, indexer and added detail are visual concepts; inferred assemblies remain separately named. The field derives from official FIRST CAD and retains its coordinate system. CAD-derived visuals are not engineering validation or a guarantee of physical competition tolerances.

Neuropol Regular v3.100 is the original Typodermic CC0 release; Studio Small 09 is Poly Haven's CC0 HDRI. Their exact source bytes and official license links are recorded in `src/experience/asset-licenses.json`.

## Rendering and accessibility

The homepage uses Three.js/WebGL2, PBR materials, local environment lighting, bounded device pixel ratio, lazy scene loading and an idle/hidden-tab render policy. Its timeline coordinates the robot, field and particles through a continuous scroll. Part activation animates the robot's feed path; the field provides driving, ball drops, hive tipping and reset controls. Reduced motion and unavailable WebGL use a readable sequence with static illustrations instead.

The CSP keeps scripts self-hosted, allows WebAssembly compilation for the bundled Meshopt decoder, and restricts API connections to the established team endpoint. No extra analytics or third-party rendering service is introduced.

`npm run test:browser` starts a loopback-only temporary server and checks responsive pages, no-JavaScript/reduced-motion/fallback states, navigation, Month/List/calendar recovery, and the real contact workflow with intercepted API routes. It never sends team mail. Screenshots and the result summary go to ignored `review/production-browser/`. The animated WebGL experience requires its separate interactive browser pass by the scene owner after the final asset sync; fallback checks alone do not verify rendered 3D.

For that pass, run `node scripts/preview.mjs` (loopback port 22311), then `node scripts/check-experience.mjs`, `node scripts/check-experience-lifecycle.mjs`, and `node scripts/check-performance.mjs`. These use an owned headless browser and record its renderer. macOS uses ANGLE Metal; a mobile viewport does not certify physical phone performance. The preview retains production contact API behavior; automated subpage tests intercept contact requests and never send mail.

The final field display LOD retains 993 source instances and all source placements. Its 3,337,458 instantiated triangles are 50.2% fewer than the losslessly batched field. A bidirectional comparison of every vertex and triangle centroid tested 3,147,951 samples, with maximum measured deviation 0.09780 mm; four reference silhouettes were identical. This is a sampled display comparison against the tessellated source, not a continuous analytic CAD tolerance proof. The supplied shooter's 174 meshes and internal transforms remain unchanged within the completed robot.
