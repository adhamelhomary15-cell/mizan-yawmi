# Implementation Plan: The Balance Comes Alive When It Opens

**Branch**: `027-balance-in-motion` | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)

## Summary

Two small changes to the rosette (`Balance` in `src/app/08-ui-small.js`), with no library:
- **The petals draw in** with a CSS animation on each petal's stroke, staggered around each half. A CSS animation
  runs when its element is created, and a new rosette is created every time a tab opens, so no JavaScript decides when
  to play it.
- **The rosette's numbers count up** with a small hook that eases from 0 to the value over the same time, once per
  rosette, and shows the value at once under reduced motion. The final values are always in the page for screen
  readers.

A rosette gets a `key` from its day or week, so picking another one creates a new rosette that draws in, while ticking
a block keeps the same rosette (FR-006). As in earlier features, the decisions, data model and checks are kept in this
file.

## Technical Context

- **Language**: JavaScript in one page (Preact and htm), built by `tools/build.py` from `src/planner.html` and
  `src/app/*.js`.
- **Storage**: none.
- **Tests**:
  - `tools/check-code.js`, `tools/check-security.js`, `tools/check-parity.js`;
  - Playwright E2E in `tests/e2e/balance.spec.js` (new).
- **Target**: phone browsers at 375 px, every palette, light and dark.
- **Constraints**: no new library, no network, no file over 600 lines, no unused code. The first `@keyframes` in the
  app; the first JavaScript that reads reduced motion.

Nothing is left as NEEDS CLARIFICATION.

## Constitution Check (v2.0.1)

| Principle | Status |
|---|---|
| I. Human review | Nothing changes on its own: it is how the rosette appears. |
| II. Checking off is human | No mark is read or written beyond what the rosette already reads. |
| III. Data stays on the device | Nothing is stored or sent. |
| IV. Honest, offline day | The rosette ends exactly as today (FR-002, SC-002). Parity stays at 0. |
| V. Simple, single file | A few CSS lines, one hook, one `key`. No library or build step. |
| VI. General repo | No personal value. |

All gates pass, before and after the design.

## Decisions (research)

1. **The petals draw with CSS, not JavaScript.**
   - **Decision**: each petal `<ellipse>` gets `pathLength="1"`, so its outline is 1 unit long whatever its size, and a
     `--i` custom property with its place in its half (0 to 35). The CSS:
     - `.balance .petal{animation:petal-draw .4s cubic-bezier(.16,1,.3,1) backwards;animation-delay:calc(var(--i) * 14ms)}`;
     - `@keyframes petal-draw{from{stroke-dasharray:1;stroke-dashoffset:1}to{stroke-dasharray:1;stroke-dashoffset:0}}`.
   - **The dash lives only inside the animation** (found in phase 1): with `stroke-dasharray:1` on the petal itself and
     `both`, the finished rosette kept the dash, and Chromium drew its outlines with small gaps (12,341 pixels different
     from main's rosette, 5,904 with reduced motion). With the dash in the keyframes and `backwards`, it holds the start
     during the delay and is gone at the end: with reduced motion the rosette is pixel for pixel main's, and on WebKit
     the drawn end is too.
   - **Chromium and any SVG animation**: after any animation of the petals ends, even a plain `opacity` one in a page
     with nothing else, Chromium draws them with slightly different edge smoothing. In the app the drawn end differs
     from main's in 6,080 edge pixels, only 3 by more than 40 of 255; it looks the same. So the check for FR-002 is the
     petals' computed state (no dash, offset 0, no running animation) on both browsers, and pixel equality on WebKit
     and with reduced motion.
     The last petal starts at 35 × 14 = 490 ms and ends by 890 ms (FR-001: within 1 second). Both halves draw at the
     same time, each from its start, so each category's inked petals arrive together.
   - **Why**: a CSS animation runs on its own when the element is created, costs no JavaScript per frame, and never
     blocks a tap (FR-007). `stroke-dashoffset` draws the outline as a line, which matches the rosette's line work
     (FR-008).
   - **When it plays**: the Today and Week tabs are separate components, so opening a tab creates a new rosette and the
     animation runs (`src/app/21-shell.js`). The day review's rosette is created when the review opens.
   - **Reduced motion**: `.balance .petal` joins the existing `prefers-reduced-motion` rule with `animation:none`, so
     the petals are whole from the first frame (FR-005, SC-003).
   - **The existing colour fade** (`transition: stroke .45s`) stays, so a ticked block's petal still fades its ink
     without drawing again (FR-006).
2. **A new rosette for a new day or week, the same one for a tick.**
   - **Decision**: each `<Balance>` gets `key` from what it shows: the day's date on Today and in the review, the week's
     first day on Week. Picking another day or week creates a new rosette, which draws in; ticking a block re-renders
     the same one, which does not.
3. **The numbers count with one small hook.**
   - **Decision**: `useCountUp(value)` in `src/app/08-ui-small.js`:
     - on mount, unless reduced motion is set, it eases from 0 to `value` over 890 ms with `requestAnimationFrame`,
       on the petals' curve, so it ends with the last petal (FR-003);
     - after mount, a new `value` shows at once (FR-006), and the frame loop is cancelled on unmount;
     - with reduced motion, or a value of 0, it returns the value at once (FR-005, spec Edge Cases).
     The centre uses it on the done minutes (shown through `hoursText`), and the legend on the two shares (0 to 100).
   - **Rounding**: the numbers on the way are rounded like the final ones (`hoursText`, whole percentages), so the text
     never shows extra digits.
   - **Why a hook, not a rules block**: the only calculation is an eased fraction of the value, `value × ease(t)`; there
     is no rule to check apart from its start, its end and its shape, which the E2E covers. AGENTS.md's rules block is
     for decisions the screens depend on, and this is how a number appears.
4. **Screen readers read the final values only.**
   - **Decision**: the rosette's `<svg>` already has `role="img"` and an `aria-label`, so its centre number is not read
     on its own. In the legend, each counting share is `aria-hidden`, beside a visually hidden copy of the final value
     in a new `.sr-only` class (the usual clip pattern) (FR-004).

## Data model

None stored.

## Design

### Changes

| File | Change |
|---|---|
| `src/app/08-ui-small.js` | Each petal gets `pathLength="1"` and `--i`; `useCountUp`; the centre and the two shares count; the shares get a hidden final copy. The file stays well under 600 lines. |
| `src/app/10-postpone-ui.js` | `key` on the two `<Balance>` uses (Today and the review): the day's date. |
| `src/app/11-week.js` | `key` on `<Balance>`: the week's first day. |
| `src/planner.html` | `stroke-dasharray`, the animation and its `@keyframes` on `.balance .petal`; `animation:none` under reduced motion; `.sr-only`. |
| `DESIGN.md` | The rosette: it draws in when it appears, and its numbers count up, in under a second. |

### Tests

- **`tests/e2e/balance.spec.js`** (Chromium and WebKit, generated data, on the real clock, as 022 and 023 found that
  `openApp`'s clock replaces `requestAnimationFrame`):
  - **US1**:
    - opening Week, Today and the review, every petal has a running `petal-draw` animation;
    - after 1 second none is running, and the rosette's screenshot equals one taken with reduced motion (SC-002);
    - leaving the tab and coming back starts it again; picking another day or week does too;
    - a tap on a check during the drawing ticks the block (FR-007).
  - **US2**:
    - shortly after opening, the centre number is below its final value, and after 1 second it is exact;
    - the hidden final values are there from the first frame (FR-004);
    - a value of 0 shows 0 at once.
  - **Ticking a block** with the rosette shown: no `petal-draw` animation starts again, and the numbers change at once
    (FR-006).
  - **Reduced motion**: no animation, and the final numbers in the first frame (FR-005, SC-003).
- **`tools/check-code.js`** (no unused code, files under 600 lines), **`tools/check-security.js`**, and **parity** 0.
- **By hand**: a phone at 375 px, light and dark on two palettes, to judge that the drawing reads as line work and is
  not tiring when the app is opened often.

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | The petals draw in: CSS, `pathLength`, `--i`, the `key`s | US1 | Browser at 375 px; screenshot after equals before; parity 0 |
| 2 | The numbers count up, and the hidden final values | US2 | Browser at 375 px; check-code |
| 3 | E2E, DESIGN.md, ticks | — | All checks and the E2E suite |
| 4 | PR | — | When the owner asks |

## Risks

- **Every time the tab opens** (the owner's choice) means the drawing plays often. It is kept under a second and does
  not block taps; if it feels tiring on the phone, playing it once per launch is a one-line change (a flag set on the
  first draw).
- **`pathLength` on `<ellipse>`**: supported by current Chromium, WebKit and Firefox. A browser without it would show
  the petals dashed at a wrong length; phase 1 checks both test browsers, and the owner's phone in phase 4.
- **The legend's layout**: a counting number changes width as it counts («5%» to «45%»). Phase 2 checks that the
  legend does not shift; if it does, the numbers get tabular figures (`font-variant-numeric: tabular-nums`).
