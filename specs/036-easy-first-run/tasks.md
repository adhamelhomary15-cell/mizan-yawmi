---

description: "Task list for feature 036: an easier first run"
---

# Tasks: An Easier First Run

**Input**: [spec.md](spec.md), [plan.md](plan.md)

## Binding rules

- No runtime network; the one GeoNames download is by hand, into a scratch folder outside the repo.
- Nothing stored before «ابدأ» or the editor's save; no mark touched.
- Run `node tools/check-private.js` with the files staged; commit only on `RESULT: clean`. No push, no PR.

## Phase 1: Two steps and «ابدأ» (US1, US3)

- [x] T001 `src/app/14a-guide-view.js`: two steps; the day hours and subjects folded on the week step.
- [x] T002 «ابدأ» stores through the editor's checks and storing; the confirmation over a stored schedule;
  `src/app/15-settings-view.js` passes `onStarted`.
- [x] T003 `tests/e2e/schedule.spec.js`, `tests/e2e/day-bounds.spec.js`: the two-step flow.
- [x] T004 Build; every check; parity 0; the guide E2E.

## Phase 2: Cities near you (US2)

- [x] T005 `tools/make-cities.py` writes `rank`; add `rank` to `cities.json` from `cities15000.zip`; `NOTICE.md`.
- [x] T006 `src/app/13a-schedule-rules.js`: `citiesInZone`; `tools/check-schedule.js` cases and mutations.
- [x] T007 `PlacePicker`: «قريبة منك» suggestions.
- [x] T008 Build and every check.

## Phase 3: Tests and docs

- [x] T009 `tests/e2e/first-run.spec.js`.
- [x] T010 [P] README: the guide's lines.
- [x] T011 Full E2E with `--workers=2`, a look at 375 px, `check-private`. Tick the tasks.
