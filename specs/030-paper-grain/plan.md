# Implementation Plan: Paper Grain on the Page Ground

**Branch**: `030-paper-grain` | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md)

## Summary

A few CSS lines in `src/planner.html`, and no JavaScript:
- a fixed layer behind the page content (`body::before`), filled with a small SVG noise tile written into the CSS as a
  `data:` image;
- its strength as one token, `--grain`: lighter on light paper, a little stronger on dark;
- it hides under more contrast, forced colours and print.

The cards, rows and the navigation band already have solid backgrounds, so they cover the layer: the grain shows on
the ground only, with no rule per component. As in earlier features, the decisions, data model and checks are kept in
this file.

## Technical Context

- **Language**: CSS in `src/planner.html`. The app's JavaScript does not change.
- **Storage**: none. There is no switch (the owner's choice), so nothing is stored.
- **Tests**:
  - `tools/check-schedule.js`: a new contrast check with the ground at the grain's darkest and lightest, with a
    self-test mutation;
  - `tools/check-security.js` (the policy is unchanged), `tools/check-code.js`, `tools/check-parity.js`,
    `tools/check-private.js`;
  - Playwright E2E in `tests/e2e/paper-grain.spec.js` (new).
- **Target**: phone browsers at 375 px, all four palettes, light and dark.
- **Constraints**: no new library, no network, no file over 600 lines, the page grows by under 2 KB (SC-005).

Nothing is left as NEEDS CLARIFICATION: the owner chose the ground only, with no switch.

## Constitution Check (v3.0.1)

| Principle | Status |
|---|---|
| I. Human review | A visual change only; nothing acts for the owner. |
| II. Checking off is human | No marks are read or written. |
| III. Data stays on the device | No network: the texture is inline in the page, and nothing is stored. |
| IV. Honest, offline day | Day plans are unchanged (parity 0). The texture is in the page, so it shows offline. |
| V. Simple, single file | About ten CSS lines and one token. No library, no build step, no JavaScript. |
| VI. General repo | No personal value. |

All gates pass, before and after the design.

## Decisions (research)

1. **A fixed pseudo-element behind the content, not a second background on `body`.**
   - **Decision**: `body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background-image:url("data:image/svg+xml,…");background-size:160px;opacity:var(--grain)}`.
   - **Why**:
     - `opacity` sets the strength from one token per theme, with one image. A background on `body` would need the
       strength baked into the SVG, so one image per theme.
     - `position:fixed` keeps the grain still while the content scrolls (FR-006), and the browser draws it once.
     - `z-index:-1` puts it above the page colour (the body's background is drawn on the canvas) and under every
       element, so the solid cards, rows and band cover it.
     - `pointer-events:none` means it never takes a tap (FR-004).
   - **Rejected**: an `<img>` or `<div>` in the page (markup and an extra node for a pure look); a PNG tile (a binary in
     the source, and larger).
2. **The noise.**
   - **Decision**: an SVG of 160 × 160 with `feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3"
     stitchTiles="stitch"`, then `feColorMatrix type="saturate" values="0"` to make it grey. `stitchTiles` makes the
     tile's edges meet, so there is no seam. The SVG is URL-encoded in the CSS (no base64, so it stays small and
     readable).
   - **Why**: fine grain with no motif or pattern (FR-007), drawn by the browser from about 400 bytes.
3. **The strength.**
   - **Decision**: `--grain:.045` in `:root` (light), `.06` in the dark block, `:root[data-theme="dark"]` (since 022, the page sets `data-theme` from the phone or the owner's choice, so there is one dark block). Palettes do not set it: the grain is
     the same in every palette.
   - **Why**: the values the studied site uses, and they read as paper without being seen as dots. The new contrast
     check (below) is the gate: if any colour falls under AA at these values, the value goes down until it passes.
4. **Where it steps aside.** `@media (prefers-contrast: more), (forced-colors: active), print { body::before{display:none} }`.
5. **Contrast, made checkable (FR-003).**
   - **Decision**: a new check in `tools/check-schedule.js`. For each palette, light and dark, it takes the ground at
     the grain's two extremes:
     - the darkest: black over `--bg` at `--grain`;
     - the lightest: white over `--bg` at `--grain`.

     Every kind ink and the text colour (`--fg`) must hold AA on both. The muted text is checked the same way if it
     holds AA on the plain ground today; if it does not, that is a finding apart from this feature, reported to the
     owner and not fixed here (Stay in scope).
   - **Mutation**: `--grain` raised to `.3`, which the check must refuse.
   - **Why**: the grain is never over 6%, but a check makes the "too faint to matter" claim true by test, not by eye.
6. **No transition.** The grain does not fade when the theme changes; only its opacity token changes, at once. The
   colours under it already fade (022).

## Design

- **`src/planner.html`**:
  - `--grain` in `:root` and in `:root[data-theme="dark"]`;
  - the `body::before` rule, after the `body` rule;
  - the `@media` that hides it.
- **`tools/check-schedule.js`**: the contrast check with the grain, and its mutation.
- **`DESIGN.md`**:
  - Elevation & Depth: the grain on the ground;
  - Do's and Don'ts: grain on the ground only, never on cards, never a motif.
- **README**: no line. It is a look, with nothing to use.

### Tests

**`tests/e2e/paper-grain.spec.js`** checks that:
- **The layer**: `body::before` has a `data:image/svg+xml` background, `position:fixed`, `pointer-events:none`, and
  the opacity of `--grain` in light (0.045) and dark (0.06).
- **Ground only**: the point under a card and the navigation band is the card or the band, not the layer, and a tap on
  a row's checkbox still ticks it.
- **Steps aside**: with `prefers-contrast: more`, with `forced-colors: active`, and with print media, the layer is not
  displayed.
- **Phone width**: at 375 px nothing scrolls sideways.

**Performance (SC-003)**: a one-off Playwright script, not in CI. It scrolls Today and the Week with the CPU slowed 4×
(Chrome DevTools Protocol), and counts frames, with and without the grain. The numbers go in the PR.

**Parity**: 0 on the example and on a private settings file.

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | `--grain`, the layer, the `@media`; the contrast check and its mutation | US1, US2 | Every check; parity 0; 375 px look in each palette, light and dark |
| 2 | E2E, the performance script, DESIGN.md, ticks, PR | all | All checks; full E2E; `check-private` clean |

## Risks

- **A phone that draws SVG filters slowly**: the tile is drawn once and then repeated, and a fixed layer does not
  redraw on scroll. The performance script measures it. If it costs frames, the fallback is a smaller tile (96 px).
- **The grain reads as dirt on a dim screen**: the strength is one token, easy to lower after the owner sees it on
  the phone.
- **iOS Safari and `position:fixed`** behind content: the layer covers the viewport, so the grain stays even when the
  address bar shows or hides. The E2E runs on WebKit too.
