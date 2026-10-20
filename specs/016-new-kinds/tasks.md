---

description: "Task list for feature 016: add your own kinds"
---

# Tasks: Add Your Own Kinds

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: `tools/check-schedule.js` and `tools/check-backup.js` with `--self-test` in CI, parity 0, plus E2E in
`tests/e2e/schedule.spec.js`.

## Binding rules

- A kind change ticks, cancels and moves nothing. Ticks of a deleted kind stay stored.
- Settings without new kinds behave exactly as before: parity 0 on the example and the private file.
- Show the diff before each commit. Run `node tools/check-private.js` with the files staged, and commit only on
  `RESULT: clean`.

---

## Phase 1: Settings, load, colours, and the screens following them (all stories)

- [x] T001 In `01-settings-validate.js`:
  - accept the ids `k1` to `k12`;
  - a new kind needs a `color` from the six, and may have a `side` (`a` or `b`);
  - refuse `color` and `side` on a built-in kind;
  - refuse two new kinds with one label.
- [x] T002 In `02-settings-load.js`, add the new kinds to `CATS` and build `KIND_IDS`. In `07-day-model.js`, build
  `FAMILY` from the kinds and add `kc(cat)`.
- [x] T003 In `src/planner.html`, add the six colour pairs (light and dark) and the `.c-k-*` classes.
- [x] T004 Use `kc` in place of every hand-made `'c-' + cat`, in Today, the review, the now card, the check button,
  the petals and the Week. Read `KIND_IDS` in «ضيف حاجة لليوم ده», the Week rows and the balance order.
- [x] T005 [P] In `tools/check-schedule.js`, add the contrast of the six pairs, and a check that no hand-made
  `'c-' +` is left outside `kc`.
- [x] T006 [P] In `tools/check-schedule.js` (which runs the real `validateSettings`), add the settings cases: a valid file with new kinds; refusals for a bad
  id, a bad colour, a bad side, a colour on a built-in, and one name used twice.

## Phase 2: The kind rules (US1, US2)

- [x] T007 In `13a-schedule-rules.js`, add `addKind`, `kindUses` and `removeKind`. Add `color` and `side` to
  `KIND_FIELDS`.
- [x] T008 [P] In `tools/check-schedule.js`, add their checks, the 300-draft oracle and four mutations.

## Phase 3: The editor's kinds part (US1, US2)

- [x] T009 The block kind list reads the draft's kinds.
- [x] T010 `KindsPart` gets:
  - «ضيف نوع», with the limit line at 12;
  - for a new kind: the colour buttons, the side select, and «امسح النوع», which names the days when it is
    refused.

## Phase 4: The Week and the balance (US1)

- [x] T011 Add a Week row per tracked new kind, after the built-in rows, and new kinds on their side's petals.

## Phase 5: Files, tests, docs (US3)

- [ ] T012 E2E in `tests/e2e/schedule.spec.js`: US1, US2, and US3 (export, then import into a fresh page).
- [ ] T013 [P] Docs: the README kinds part, the six colours in DESIGN.md, and a line in PRODUCT.
- [ ] T014 Run every check, parity on the example and the private file, the E2E tests, and a 375 px look in light
  and dark. Then tick the tasks.
