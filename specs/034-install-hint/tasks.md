---

description: "Task list for feature 034: how to add the app to the home screen"
---

# Tasks: How to Add the App to the Home Screen

**Input**: [spec.md](spec.md), [plan.md](plan.md)

## Binding rules

- No network, no tracking, no stored data changes shape; the dismissal has its own local key.
- Run `node tools/check-private.js` with the files staged; commit only on `RESULT: clean`. No push, no PR.

## Phase 1: iPhone (US1, US3)

- [ ] T001 `src/app/13-rules.js`: the `install hint` rule block (iPhone, iPad, standalone, in-app).
- [ ] T002 [P] `tools/check-install.js` with `--self-test`; `.github/workflows/checks.yml`.
- [ ] T003 `src/app/14c-install-hint.js` and its `ORDER` line: device, steps, notice with «تمام».
- [ ] T004 `src/app/21-shell.js`, `src/app/15-settings-view.js`, `src/planner.html`: the notice, the Settings steps,
  the styles.
- [ ] T005 Build; every check; parity 0; a look as iPhone at 375 px.

## Phase 2: Android (US2)

- [ ] T006 The rule and the steps for Android, only without the browser's own offer.
- [ ] T007 Build and every check.

## Phase 3: Tests and docs

- [ ] T008 `tests/e2e/install-hint.spec.js`.
- [ ] T009 [P] README: the dismissal key in the privacy part.
- [ ] T010 Full E2E with `--workers=2`, `check-private`. Tick the tasks.
