---

description: "Task list for feature 020: settings changes without reopening the page"
---

# Tasks: Settings Changes Without Reopening the Page

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: `tools/check-code.js` with `--self-test` in CI, parity 0, the `check-anchors` year sweep, plus E2E in
`tests/e2e/live-settings.spec.js`.

## Binding rules

- Applying settings never writes progress or workouts.
- After applying, the screens show what a fresh page load would show.
- Restoring a backup, recovered settings and a new app version keep reloading.
- Show the diff before each commit. Run `node tools/check-private.js` with the files staged, and commit only on
  `RESULT: clean`.

---

## Phase 1: One place for everything worked out from the settings (no behaviour change)

- [x] T001 In `02-settings-load.js`: `readSettings()`, one `let` per settings-derived value, and `applySettings(loaded)`,
  called once at load.
- [x] T002 Move into it `START`, `END`, `SPAN`, `zoneFmt` (03), `ptCache` (04), `FAMILY` (07) and `AXIS_HOURS` (11).
- [x] T003 [P] `tools/check-code.js`: refuse a top-level value worked out from `CFG` outside 02, with a mutation.

## Phase 2: Apply without reloading (US1, US2)

- [ ] T004 `21-shell.js`: `settingsEpoch`, `settingsChanged(after)`, the view keyed by the epoch, and a toast with no
  undo.
- [ ] T005 The editor's save calls `settingsChanged('today')`: «اليوم», then «اتحفظ الجدول».
- [ ] T006 «استبدل» and «رجّع المثال» call `settingsChanged('settings')`.

## Phase 3: Tests, docs, PR

- [ ] T007 `tests/e2e/live-settings.spec.js`: US1, US1 with a new place, and US2, with no reload, and the screen equal
  to the screen after a reload. Update the tests in `schedule.spec.js` and `day-bounds.spec.js` that wait for a
  reload.
- [ ] T008 [P] Docs: a README line, and B3 closed in `specs/010-code-health/review.md`.
- [ ] T009 Run every check, parity, the year sweep, the E2E tests, and a 375 px look. Tick the tasks.
