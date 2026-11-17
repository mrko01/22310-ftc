---
name: unslop
description: Premium, anti-"AI slop" design mode. Use when the user types /unslop or asks for something to look hand-crafted, award-level, non-generic, or "not AI-looking". Forces deep Awwwards research before designing, bans common AI UI tells, requires polished custom SVGs and motion, cuts filler text, and applies behavioral-psychology research so the product is rewarding and people want to come back.
---

# /unslop — award-level, zero-slop build mode

Apply everything below to whatever is being built in this request (the task in the conversation). These rules override default design habits. Do not skip the research phase. Do not guess at UI.

---

## Phase 1 — Research first (mandatory, before writing any UI code)

### 1a. Awwwards deep dive
Research **awwwards.com** in depth, as the primary source for every design decision: layout, type, color, components, motion, navigation, loaders, cursors, hover states, transitions, micro-interactions.

- Use a browser tool if one is available to actually open and look at pages; otherwise use web search and web fetch.
- Look at, at minimum:
  - Recent **Sites of the Day** and **Developer Award** winners (`awwwards.com/websites/sites_of_the_day/`)
  - The **category** closest to this project (e.g. `awwwards.com/websites/<category>/` — portfolio, e-commerce, app, games, technology, sports, education…)
  - Relevant **Collections / Inspiration** pages for the specific components needed (menus, hero sections, scroll animations, loaders, buttons, cards, footers, forms, dashboards, cursors)
  - Open **3–6 actual winning sites** that are closest to this project and study how they handle the exact components being built.
- Write a short **Reference Board** (in your reasoning or a scratch file, not dumped on the user) listing for each reference: site name + URL, what specifically to borrow (e.g. "split-letter hero reveal on scroll", "magnetic CTA with 0.3 ease-out", "mono numerals in nav"), and why it fits.
- Every major component in the build must trace back to a reference. If you can't point to one, research more instead of inventing a generic version.
- Borrow techniques and principles, not identity: never copy a site's logo, copy, brand, or exact layout wholesale.

### 1b. Engagement psychology research
Search the web for current behavioral-design research relevant to this kind of product. Pull from established, evidence-backed models and pick the ones that fit:

| Principle | What it means for the build |
|---|---|
| **Hook model** (trigger → action → variable reward → investment) | Every core loop ends with the user putting something in (progress, a choice, a customization) that makes the next visit more valuable. |
| **Variable rewards** | Some outcomes feel delightfully unpredictable: surprise animations, rare states, occasional bonus feedback. Not every click is identical. |
| **Goal-gradient effect** | Show progress visibly; motivation accelerates as people near a goal. Start progress bars partially filled when honest to do so (e.g. step 1 already done). |
| **Zeigarnik effect** | Unfinished tasks stick in memory — show "2 of 5 done", open loops, next-step teasers. |
| **Peak-end rule** | Design one standout peak moment and a satisfying ending (completion animation, summary, celebration). |
| **Fogg Behavior Model** (B = MAP) | Make the core action as easy as possible, with a clear prompt at the right moment. |
| **Immediate feedback / micro-rewards** | Every interaction gets instant, satisfying response (< 100 ms): press states, haptic-feeling motion, sound if appropriate. |
| **Streaks & loss aversion** | Daily streaks, saved progress, "don't lose your X" — where it serves the user. |
| **Endowed progress & IKEA effect** | People value what they built — let them personalize and see their own investment. |
| **Competence / mastery (Self-Determination Theory)** | Levels, unlocks, visible skill growth; difficulty that ramps. |

Write down which 3–5 principles you're applying and exactly where in the UI each one shows up.

**Ethical line:** make it rewarding and habit-forming through genuine value and delight. Do not use deceptive dark patterns: fake scarcity/countdowns, confirmshaming ("No thanks, I hate saving money"), hidden costs, roach-motel cancellation, fake notifications, or pre-checked consent. Those hurt trust and retention long-term.

---

## Phase 2 — Banned "AI slop" tells

None of these may appear unless an Awwwards reference specifically justifies it:

**Visual**
- Purple→blue / indigo→pink gradients, especially on hero text or buttons
- Gradient text on headlines as the main "design idea"
- Blurry background blobs / orbs / mesh-gradient blobs floating behind content
- Generic glassmorphism cards with `backdrop-blur` and thin white borders everywhere
- The default "three feature cards in a row, each with icon + title + two lines" grid
- Everything `rounded-2xl` with the same soft drop shadow
- Centered hero → three cards → testimonial carousel → CTA banner → footer (the template-site skeleton)
- Default Tailwind palette used as-is (slate/indigo/violet) with no custom color system
- Inter/Roboto/system font as the only typeface with no typographic character
- Emoji as icons (🚀 ✨ 💡 🔥), sparkle ✨ icons for "AI", stock Lucide/Heroicons dropped in unstyled
- Random decorative dot grids, glowing borders, "shine" sweeps on every card
- Pill badge above the hero ("✨ New: …") by default
- Fake dashboards / placeholder charts with meaningless data

**Copy**
- Filler phrases: "Unlock the power of", "Elevate your", "Seamless", "Revolutionize", "Supercharge", "Next-level", "Harness", "Empower", "In today's fast-paced world", "Effortlessly"
- Paragraph blobs. Max ~2 short lines per text block on marketing surfaces; cut anything that doesn't help the user act or feel something
- Lorem ipsum, generic testimonials ("This changed my life! — Sarah K."), made-up stats
- Headline + subheadline that say the same thing twice
- Em-dash-heavy, triple-adjective, "not just X, it's Y" sentence patterns

**Structure**
- Sections or components that exist only to fill space — every element must earn its place
- Irrelevant features, settings, or pages nobody asked for

---

## Phase 3 — What to do instead

### Typography
- Pick a deliberate type pairing (e.g. a characterful display face + a clean text face, or a mono for data/labels) from Google Fonts or a self-hosted source. Justify it from the references.
- Large, confident type scale with tight display tracking; real hierarchy through size and weight, not color alone.
- Use tabular numerals for any numbers that change.

### Color & layout
- Custom palette: one dominant neutral, one strong accent, used with restraint. Define tokens (CSS variables), including dark mode.
- Asymmetric, editorial, grid-breaking layouts where it fits; intentional whitespace; overlap and layering; scale contrast.
- Responsive and polished at phone width — not an afterthought.

### SVGs (must be premium)
- Hand-authored or carefully constructed SVGs: consistent stroke weights, optical alignment, pixel-snapped on a defined grid (e.g. 24 or 32 px), `currentColor` for theming, `stroke-linecap/linejoin="round"` where appropriate.
- Custom illustrations/iconography with a single coherent style — not a mix of icon libraries.
- Animate SVGs meaningfully: path drawing (`stroke-dasharray`/`dashoffset`), morphs, masks, staggered reveals.
- No clip-art, no generic blobs, no decorative shapes that mean nothing.

### Motion (polished, purposeful)
- Every animation has a job: guide attention, show cause → effect, reward an action, or give spatial continuity.
- Use real easing curves (e.g. `cubic-bezier(0.22, 1, 0.36, 1)`, spring physics), never linear defaults. Typical durations: 150–250 ms for micro-interactions, 400–900 ms for reveals/transitions.
- Techniques to draw from (per references): staggered text/letter reveals, scroll-linked animation, smooth scroll, magnetic buttons, custom cursors, page transitions, hover distortion, parallax layering, loader → content handoff, number count-ups, satisfying press/release states.
- Recommended tools when the stack allows: GSAP (+ ScrollTrigger), Framer Motion / Motion, Lenis, CSS `＠property` and view transitions, Lottie/Rive for complex reward animations.
- Animate only `transform` and `opacity` where possible; hit 60 fps. Respect `prefers-reduced-motion` with a calmer fallback.

### Reward moments (where psychology meets polish)
- Design at least: one **delight peak** (signature animation), one **completion/celebration** state, visible **progress**, and a **reason to return** (streak, saved state, next unlock, teaser).
- Empty states, loading states, success and error states are all designed — never default browser/framework ones.

---

## Phase 4 — Self-audit before showing anything

Before presenting the result, go through this checklist and fix every miss:

1. Could this be mistaken for a template or a default AI output at a glance? If yes, redo the weakest section.
2. Does every major component trace to a named Awwwards reference?
3. Zero items from the Phase 2 ban list?
4. Is there any text blob, filler sentence, or element that could be deleted without loss? Delete it.
5. Are all icons/SVGs one consistent, custom-quality style?
6. Does every interaction have immediate, satisfying feedback? Is there a peak moment and a good ending?
7. Which psychology principles are live in the UI, and where?
8. Smooth at 60 fps, responsive at phone width, reduced-motion respected, accessible contrast and focus states?
9. If a browser or preview is available, open it and look at it (desktop + mobile) before calling it done.

## Reporting back
Keep the report short: what was built, the 3–6 Awwwards references used (name + link + what was borrowed), and which engagement principles were applied where. No long essays.
