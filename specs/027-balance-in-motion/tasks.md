---

description: "Task list for feature 027: the balance comes alive when it opens"
---

# Tasks: The Balance Comes Alive When It Opens

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**:
- `tools/check-code.js`, `tools/check-security.js`, `tools/check-parity.js`;
- E2E in `tests/e2e/balance.spec.js` (new), on the real clock;
- by hand on the owner's phone.

## Binding rules

- When the drawing ends, the rosette is exactly as it is today (FR-002): same petals, inks, rings, centre and legend.
- Under reduced motion nothing moves (FR-005).
- Ticking a block never starts the drawing again (FR-006).
- No tap waits for the drawing (FR-007). No library, no network.
- Build with `py -3 tools/build.py` on this machine.
- Show the diff before each commit. Run `node tools/check-private.js` with the files staged, and commit only on
  `RESULT: clean`.

---

## Phase 1: The petals draw in (US1)

- [x] T001 [US1] In `src/app/08-ui-small.js`, in `Balance`'s `petals`, give each `<ellipse>` `pathLength="1"` and
  `style=${{'--i': i}}` (its place in its half, 0 to 35). Nothing else in the rosette changes.
- [x] T002 [P] [US1] In `src/planner.html`:
  - `.balance .petal` gains `animation:petal-draw .4s cubic-bezier(.16,1,.3,1) backwards;animation-delay:calc(var(--i) * 14ms)`;
  - `@keyframes petal-draw{from{stroke-dasharray:1;stroke-dashoffset:1}to{stroke-dasharray:1;stroke-dashoffset:0}}`, so the
    dash is gone when the drawing ends (plan, decision 1);
  - the existing `prefers-reduced-motion` rule gets `.balance .petal{animation:none}` (the petal is already in its
    `transition:none` list).
- [x] T003 [US1] Give each `<Balance>` a `key` from what it shows:
  - `src/app/10-postpone-ui.js`: the day's date (`iso`) on Today's «ميزان اليوم» and in the review;
  - `src/app/11-week.js`: the week's first day (`ws`).
- [x] T004 Build, run `check-code`, `check-security` and parity (0 differences). In the browser at 375 px:
  - opening Today, Week and the review, the petals draw in, within 1 second;
  - after the drawing, the petals have no dash, offset 0 and no running animation; the rosette is pixel for pixel
    main's on WebKit and with reduced motion, and the same to the eye on Chromium (SC-002);
  - another day or week draws again; a tick does not;
  - light and dark, on oxblood and one other palette.

  Show the owner a screen recording or frames. **Commit**.

## Phase 2: The numbers count up (US2)

- [x] T005 [US2] In `src/app/08-ui-small.js`, add `useCountUp(value)` (plan, decision 3):
  - on mount, unless `matchMedia('(prefers-reduced-motion: reduce)')` matches or the value is 0, eases from 0 to the
    value over 890 ms with `requestAnimationFrame`, easing out gently (`1 − (1 − t)²`, plan, decision 3);
  - after mount, a new value shows at once;
  - cancels its frame on unmount.
- [x] T006 [US2] In `Balance`:
  - the centre shows `hoursText(useCountUp(total))`;
  - each share shows the counting whole percentage, `aria-hidden`, beside a `.sr-only` span with the final one;
  - the hours under each share do not count.
- [x] T007 [P] [US2] In `src/planner.html`, add `.sr-only` (the usual clip pattern). If the legend shifts while a share
  counts, give the shares `font-variant-numeric: tabular-nums` (plan, Risks).
- [x] T008 Build, run `check-code` and parity. In the browser at 375 px: the numbers end on their final values with the
  last petal, the legend does not shift, and reduced motion shows the final numbers at once. **Commit**.

  Done on 2026-10-24: sampled every frame on Week, the centre went 0, 2¾, 5¼, 7¼, 8½, 9½, 10¼ and the shares to 16% and
  14%, reaching them at about 790 ms; the legend stayed in one place, so no tabular figures were needed. A tick changed
  the numbers within 50 ms; with reduced motion the final numbers were in the first frame.

## Phase 3: Tests, docs

- [ ] T009 In `tests/e2e/balance.spec.js`, opening the app on the real clock (as `look.spec.js` and `now-line.spec.js`
  do, since `openApp`'s clock replaces `requestAnimationFrame`), with ticked blocks so the rosette has ink:
  - **US1**:
    - on Week, Today and the review, every petal has a running `petal-draw` animation;
    - after 1 second none is running, every petal has no dash and offset 0, and on WebKit the screenshot equals one
      with reduced motion;
    - leaving the tab and coming back starts it again; another day or week does too;
    - opening the review draws its own rosette, and Today's «ميزان اليوم» does not draw again;
    - a check tapped during the drawing ticks the block;
  - **US2**:
    - soon after opening, the centre number is below its final value, and after 1 second it is exact;
    - the hidden final shares are there from the first frame; a value of 0 shows 0 at once;
  - **Ticking a block** with the rosette shown: no `petal-draw` animation starts, and the numbers change at once;
  - **Reduced motion**: no animation, and the final numbers in the first frame.
- [ ] T010 [P] DESIGN.md, «The rosette»: it draws in when it appears (each petal's line, around each half, under a
  second) and its centre and shares count up with it; whole at once under reduced motion.
- [ ] T011 Rebuild, then run every check, parity and the whole E2E suite. Tick the tasks. **Commit**.

## Phase 4: PR

- [ ] T012 Push and open the PR when the owner asks. Merge when the owner asks. After it is published, the owner looks
  at it on the phone: that it reads as line work, and that it is not tiring when the app is opened often (plan,
  Risks).

## Summary

- Total: 12 tasks.
  - The petals: 4.
  - The numbers: 4.
  - Tests and docs: 3.
  - The PR and the phone check: 1.
- MVP: phase 1 (the petals). Phase 2 adds the numbers on top, and nothing in phase 1 depends on it.
- Parallel: T002 with T001; T007 with T005 and T006; T010 with T009.
