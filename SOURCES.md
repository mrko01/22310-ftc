# Assets and sources
- BIOBUZZ official FTC lockup: https://www.firstinspires.org/hubfs/web/brand/season/2027/downloads/first-biobuzz-logos.zip (Digital RGB/first_canopy_ftc_biobuzz_logo_vertical_rgb_fullcolor.png). Used unchanged, including sponsor and clear space.
- Season identity: https://www.firstinspires.org/programs/ftc/game-and-season
- Brand guidance: https://www.firstinspires.org/hubfs/web/brand/season/2027/downloads/ftc-biobuzz-styleguide.pdf
- DM Sans font: @fontsource/dm-sans, SIL Open Font License.
- Roster: user-provided orange EDIT Saffron team table (2026-09-15). Names and disciplines are retained from the supplied roster; no invented members or roles.
- Mascot: original procedural red comic robot character created for the website. It does not depict a built competition robot. Rendered using Three.js (MIT license).

- Number logo: original image generated with the built-in image generation tool. Final asset `dist/assets/22310-logo.png`; prompt: a solid saffron-orange square with precisely centered bold condensed charcoal “22310”, no extra symbols, text, texture or effects. Favicon and touch-icon derivatives are resized versions.
- Interactive scene: original standing mascot and rover companion, sharing a common floor; rover uses varied, bounded routes with eased starts and stops. Reduced motion and the pause control stop ambient animation. Scroll chapters blend greeting, design-board, open-arm, curious and farewell poses across the upper-body joints. The rover has limited head rotation and a shared ground height.

## Build and deployment
`npm ci && npm run build` bundles and minifies the editable `src/scene/mascot.js` source and local Three.js dependencies into `dist/assets/mascot.bundle.js`. Cloudflare Pages serves the checked-in `dist` folder. Both public and private sites remain separate deployments. Public calendar events must be explicitly marked “Show on 22310.ca” in the authenticated calendar.

## SEO
Each public page has a unique title/description, canonical, Open Graph and Twitter preview, structured Organization/WebSite/page data, and semantic headings. `sitemap.xml` contains the canonical public pages. A real 404 page prevents unknown routes being indexed as duplicate homepages. The team workspace is noindex. No ranking or indexing time is guaranteed.

- Final scene props: original schematic board held between the mascot’s hands, rear-mounted parts box on the rover, and a low ramp. Wheel contact uses the same height function as the ramp geometry. Joint transitions use critically damped, speed-limited motion, with active clocks that stop when hidden and cache-versioned atomic bundles.
- Validation: `npm test` checks fast section changes at 20/30/60/120 fps, transition overshoot, rover clearance, route continuity and ramp height. Public metadata, local assets and CSP hashes were also checked.

- Rover tricks: low ramp in the right lane and a controlled full turn in the left lane. Quintic acceleration/deceleration, opposing wheel speeds during turns, and individual wheel-height compensation keep motion grounded. Both maneuvers clear the mascot footprint; the props reuse existing materials.

## September 2026 public redesign
- Sponsorship source: [Lo-Ellen Robotics sponsorship package](https://docs.google.com/presentation/d/1oGsSP_7ACpBvWPNOVP26FnDXzV3fG_IkUBOh9UIbEUo/edit?usp=sharing), read directly through the connected Google Drive on 2026-09-29. Support pathways follow slide 14; recognition examples follow slides 15–19, with their dependence on sponsorship level retained. No pricing, new sponsor commitments, or Saffron-specific awards were inferred.
- Authentic program photographs extracted from that supplied package, slide 4: `src/assets/edit-lab-printers.jpg` (element `h11aafefe15dacd32_0_3`), `src/assets/edit-lab-machining.jpg` (`h11aafefe15dacd32_0_4`), and `src/assets/lo-ellen-robotics-lab.jpg` (`h11aafefe15dacd32_0_0`). Photos are from the broader Lo-Ellen EDIT program, not a claim about Saffron’s current robot or roster. The robot demonstration is captioned as FRC Team 4069. Source imagery is preserved; JPEG encoding is optimized for web delivery and viewport cropping is CSS only.
- Program and EDIT Lab description follows slides 2 and 4. The public copy distinguishes the wider Lo-Ellen program from FTC Team 22310. The current package remains the source for sponsorship levels and arrangements.
