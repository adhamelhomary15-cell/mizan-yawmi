---

description: "Task list for feature 030: paper grain on the page ground"
---

# Tasks: Paper Grain on the Page Ground

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: `tools/check-schedule.js` with `--self-test` in CI, parity 0, plus E2E in `tests/e2e/paper-grain.spec.js`.

## Binding rules

- CSS only: no JavaScript, no file, no network, no change to the security policy.
- The grain shows on the ground only; cards, rows and the navigation band stay flat.
- Every contrast check passes; if one fails, `--grain` goes down, never the check.
- Show the diff before each commit. Run `node tools/check-private.js` with the files staged, and commit only on
  `RESULT: clean`.

---

## Phase 1: The grain and its contrast check (US1, US2)

- [ ] T001 `src/planner.html`: `--grain:.045` in `:root` and `.06` in `:root[data-theme="dark"]`.
- [ ] T002 `src/planner.html`: the `body::before` layer after the `body` rule: fixed, behind the content, no taps, the
  160 px SVG noise tile (URL-encoded `data:` image), `opacity:var(--grain)`.
- [ ] T003 `src/planner.html`: hide the layer under `prefers-contrast: more`, `forced-colors: active` and print.
- [ ] T004 [P] `tools/check-schedule.js`: every kind ink and `--fg` (and `--muted`, if it holds AA on the plain ground
  today) hold AA on the ground at the grain's darkest and lightest, in every palette, light and dark. Mutation:
  `--grain` raised to `.3`. Report a muted-text finding to the owner instead of fixing it here.
- [ ] T005 Build; every check and self-test; parity 0; the page grows by under 2 KB; a 375 px look at Today in each
  palette, light and dark.

## Phase 2: Tests, docs, PR

- [ ] T006 `tests/e2e/paper-grain.spec.js`: the layer and its opacity in light and dark; a card and the band are on
  top, and a tap on a checkbox ticks it; hidden under more contrast, forced colours and print; nothing scrolls
  sideways at 375 px.
- [ ] T007 [P] A one-off performance script (scratchpad, not committed): scroll Today and the Week with the CPU slowed
  4×, with and without the grain; the frame counts go in the PR.
- [ ] T008 [P] `DESIGN.md`: the grain in Elevation & Depth, and in Do's and Don'ts (ground only, never a motif).
- [ ] T009 Every check, parity, the full E2E with `--workers=2`, `check-private`. Tick the tasks.
