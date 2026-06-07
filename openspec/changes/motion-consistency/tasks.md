## 1. Build the motion module

- [x] 1.1 Create `src/lib/motion.js` with `DURATION = { fast: 0.2, base: 0.5, slow: 0.8 }` and named loop constants for decorative speeds (e.g. `1.5`, `4`)
- [x] 1.2 Add `EASE = { out, inOut }` standardized easing values
- [x] 1.3 Add variant presets: `fade`, `fadeUp`, `scaleIn`, `pageEnter`, `pageExit`
- [x] 1.4 Add a `stagger(index)` / container-variant helper for sequenced reveals
- [x] 1.5 Add a reduced-motion-aware helper using Framer's `useReducedMotion` that swaps positional/scale variants for opacity-only or instant equivalents

## 2. Adopt in leaf / content components

- [x] 2.1 `hero.jsx`: replace the `delay` ladder with the stagger helper; use `fadeUp`/`scaleIn`/`fade` presets; keep FloatingHearts + countdown loops but source their timing from named loop constants
- [x] 2.2 `events.jsx` and `events-card.jsx`: replace inline reveal timing with `fadeUp`; keep `whileInView` + `viewport={{ once: true }}`
- [x] 2.3 `location.jsx`: replace inline reveal/scale timing with shared `fadeUp` / `scaleIn` presets; keep scroll-reveal behavior
- [x] 2.4 `gifts.jsx`: replace inline timing with shared presets
- [x] 2.5 `wishes.jsx`: replace inline timing with shared presets
- [x] 2.6 `landing-page.jsx`: replace inline `y:20`/delay timing with `fadeUp` + stagger; keep CTA arrow nudge sourced from a named loop constant

## 3. Adopt in layout / chrome

- [x] 3.1 `layout.jsx`: use shared `fade` for the container and the toast (currently `y:20`, `duration:0.3`); use `scaleIn` for the music button
- [x] 3.2 `bottom-bar.jsx`: replace inline timing with shared presets

## 4. Page-open transition

- [x] 4.1 Confirm the page-open style decision (A crossfade+lift / B envelope-curtain / C pure crossfade) — see design.md Open Questions
- [x] 4.2 Implement the chosen symmetric `pageEnter`/`pageExit` pair in `app.jsx` so the landing exit and main entrance share timing and direction under `AnimatePresence mode="wait"`

## 5. Reduced motion

- [x] 5.1 Ensure all positional/scale reveals collapse to opacity-only or instant under `prefers-reduced-motion`
- [x] 5.2 Ensure decorative loops (FloatingHearts, pulses, CTA nudge) are suppressed (not merely shortened) under reduced motion

## 6. Verify

- [x] 6.1 Confirm no remaining inline raw duration/delay/ease magic numbers in the 10 motion components (decorative loop constants excepted, sourced from the module)
- [ ] 6.2 Manual visual pass: landing → open → main → all sections (BLOCKED: needs human + browser; run `bun run dev` and review)
- [ ] 6.3 Manual reduced-motion pass with OS setting enabled (BLOCKED: needs human + browser)
- [x] 6.4 Run `bun run lint` and `bun run build`
- [x] 6.5 (Optional) Add a unit test asserting `src/lib/motion.js` exports the expected tokens and variants
