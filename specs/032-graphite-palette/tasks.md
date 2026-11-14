---

description: "Task list for feature 032: graphite palette with one accent"
---

# Tasks: Graphite Palette with One Accent

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: `tools/check-schedule.js` with `--self-test` in CI, parity 0, plus E2E in `tests/e2e/look.spec.js` and
`tests/e2e/graphite.spec.js`.

## Binding rules

- One palette; the owner's values exactly, plus the plan's `--accent-dim` and `--quiet`.
- No mark is read or written. No network. No new library.
- Every contrast check passes; if one fails, the colour changes, never the check.
- Run `node tools/check-private.js` with the files staged, and commit only on `RESULT: clean`. No push, no PR.

---

## Phase 1: The palette and its check (US1, US2)

- [x] T001 `src/planner.html`: the light and dark tokens; rename `--shell*` to `--accent`, `--on-accent`,
  `--accent-dim` in tokens, `@property`, the fade list and every CSS use; remove the four palette blocks.
- [x] T002 `src/planner.html`: the look script keeps the theme only; the status bar takes the accent per theme.
- [x] T003 `src/planner.html`: `.btn.primary` on the accent.
- [x] T004 `src/app/15-settings-view.js`: `LookSection` with the theme buttons only.
- [x] T005 `tools/check-schedule.js`: one-palette contrast check (inks, ready inks, danger, fg, muted, accent text),
  the grain check with danger, mutations for a failing ink and failing accent text; remove the palette check.
- [x] T006 Build; every check and self-test; parity 0; a 375 px look at Today and Settings, light and dark.

## Phase 2: The late mark (US3)

- [x] T007 `src/app/08-ui-small.js`: the `Late` icon; `src/app/14-tasks-view.js`: the late date uses it, labelled once.
- [x] T008 Build and every check.

## Phase 3: Tests and docs (US4)

- [x] T009 `tests/e2e/look.spec.js` rewritten for one palette; `tests/e2e/paper-grain.spec.js` without the palette.
- [x] T010 `tests/e2e/graphite.spec.js`: accent on the button and day chip; the late mark; 375 px.
- [x] T011 [P] `DESIGN.md`, `PRODUCT.md`, `README.md`: the new look and North Star.
- [x] T012 Every check, parity, the full E2E with `--workers=2`, `check-private`. Tick the tasks.
