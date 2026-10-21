---

description: "Task list for feature 020: past days keep the schedule they had"
---

# Tasks: Past Days Keep the Schedule They Had

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**:
- `tools/check-schedule.js` and `tools/check-settings.js`, both with `--self-test`, in CI;
- `tools/check-parity.js`;
- E2E in `tests/e2e/history.spec.js`.

## Binding rules

- No mark, postponement or extra block changes when a week is saved (FR-011). Opening the app writes nothing.
- Every path that writes the settings goes through `withHistory`. None of them writes `history` on its own.
- A kept entry that fails the checks is carried on unchanged, never deleted.
- Work in this worktree only (`E:\Claude\mizan-020-schedule-history`). The main folder is the 018 session's.
- Show the diff before each commit. Run `node tools/check-private.js --settings ../mizan-yawmi/.private/settings.json`
  with the files staged, and commit only on `RESULT: clean`.

---

## Phase 1: The rules and the checks (all stories)

- [x] T001 In the schedule rules block of `src/app/13a-schedule-rules.js`, add `dayOn(settings, iso, weekday)`.
- [x] T002 In the same block, add `withHistory(stored, next, {today, yesterday, cutoff})`. It:
  - takes out the entry ending yesterday;
  - adds the changed days, or nothing when the week is the same;
  - drops entries older than the cutoff, then the oldest while the settings are over 900 KB;
  - keeps bad entries as they are;
  - removes `fromExample` unless the reset passes it.
- [x] T003 In `src/app/01-settings-validate.js`:
  - add `history` and `fromExample` to `KNOWN`;
  - give `checkBlocks` a loose flag for kept days: any valid kind id, and any subject of 1 to 8 characters;
  - check each kept entry: a real `until`, rising dates, day keys 0 to 6, and a day or `null`;
  - leave bad entries out of the result, with one warning `history-entry`.
- [x] T004 [P] In `tools/check-schedule.js`:
  - `dayOn` against a full-week oracle, over 300 random sequences of saves across dates;
  - `withHistory`: a second save today, an equal week, a day added or removed, two-version days, the cutoff, the
    900 KB cap, a bad entry carried on, and `fromExample`;
  - four mutations: no taking out on a second save, the full week stored, an off-by-one `until`, and no cutoff.
- [x] T005 [P] In `tools/check-settings.js`: valid and bad entries; a kept block of a removed kind or subject passes;
  a bad time or an unknown id format fails. Add one mutation that drops the loose flag.

## Phase 2: Every screen follows the date (US1)

- [x] T006 In `src/app/04-prayers.js`, `listFor(iso)` reads `dayOn(CFG, iso, weekday)`, cached per date. In
  `src/app/10-postpone-ui.js`, the day note reads the same day.
- [x] T007 In `src/app/02-settings-load.js`:
  - `isExample` is also true for stored settings with `fromExample`;
  - each kind a kept day uses that is missing from `CATS` is added as «نوع اتمسح», not tracked, and is not added
    to `KIND_IDS`.
- [x] T008 Check every place that reads `SUBJ[id]` or `CATS[id]` with a removed subject or kind on a past day: no
  error, and no subject shown.
- [x] T009 Parity, with no history: 0 differences on the example, and 0 on the private file (local run with
  `--settings`). **Commit** phases 1 and 2 together if `check-code` refuses the rules before their first use.

## Phase 3: Saving, importing, the example and export (US2, US3)

- [ ] T010 In `src/app/14b-editor-view.js`, the save goes through `withHistory` with the raw stored settings. The
  summary's last line follows the plan's wording, naming today by day and date.
- [ ] T011 In `src/app/15-settings-view.js`:
  - the import goes through `withHistory`;
  - «رجّع المثال» stores the example with the history and `fromExample`, or removes the settings when there is no
    history;
  - `exportSettings` leaves out `history` and `fromExample`;
  - a `history-entry` warning shows one line in Settings.
- [ ] T012 Browser at 375 px:
  - tick a past day, change its block, save: the past day is unchanged;
  - a second save today;
  - import a file, go back to the example, export;
  - no sideways scroll. **Commit**.

## Phase 4: Tests, docs, PR

- [ ] T013 In `tests/e2e/history.spec.js`:
  - US1: a past ticked day survives a change, and last week's Week tab numbers are unchanged;
  - US2: the summary names today, and a second save today adds no entry;
  - US3: import, back to the example, a backup round trip, and an export with no `history`;
  - a removed kind shows «نوع اتمسح».
- [ ] T014 [P] Docs:
  - the README «تعديل الجدول» part: past days keep their schedule, and the new week starts today;
  - PRODUCT: the history;
  - the 014 spec line about past days, marked as replaced by 020.
- [ ] T015 Take `main` into this branch once 018 is merged, rebuild, and run every check, parity, the E2E tests and a
  375 px look. Tick the tasks, then push and open the PR. Merge when the owner asks.

## Summary

- Total: 15 tasks.
  - Rules and checks: 5.
  - Screens following the date: 4.
  - Saving paths: 3.
  - Tests, docs and the PR: 3.
- MVP: phases 1 to 3. Phases 1 and 2 read a history but change nothing on their own; past days stop changing once
  the saves go through `withHistory` in phase 3.
- Parallel: T004 and T005; T014 with T013.
