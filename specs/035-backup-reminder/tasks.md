---

description: "Task list for feature 035: a quiet backup reminder"
---

# Tasks: A Quiet Backup Reminder

**Input**: [spec.md](spec.md), [plan.md](plan.md)

## Binding rules

- No network, no tracking, no done state set; the reminder's dates have their own local key.
- Run `node tools/check-private.js` with the files staged; commit only on `RESULT: clean`. No push, no PR.

## Phase 1: Due, and saved in one tap (US1, US3)

- [x] T001 `src/app/13-rules.js`: the `backup reminder` rule block.
- [x] T002 [P] `tools/check-reminder.js` with `--self-test`; `.github/workflows/checks.yml`.
- [x] T003 `src/app/14c-install-hint.js`: `useInstallHint(offer)`; `InstallHint` draws only.
- [x] T004 `src/app/15a-backup-reminder.js` and its `ORDER` line: dates, «احفظ نسخة دلوقتي», the failure line.
- [x] T005 `src/app/21-shell.js`: one notice at a time on «اليوم».
- [x] T006 Build; every check; parity 0.

## Phase 2: «مش دلوقتي» (US2)

- [x] T007 «مش دلوقتي» puts the reminder off 3 days.
- [x] T008 Build and every check.

## Phase 3: Tests and docs

- [x] T009 `tests/e2e/backup-reminder.spec.js`.
- [x] T010 [P] README: the reminder and its key.
- [x] T011 Full E2E with `--workers=2`, a look at 375 px, `check-private`. Tick the tasks.
