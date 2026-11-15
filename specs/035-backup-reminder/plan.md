# Implementation Plan: A Quiet Backup Reminder

**Branch**: `035-backup-reminder` | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md)

## Summary

One pure rule decides whether a backup is due: `backupReminderDue({now, lastBackupAt, since, snoozedUntil, hasData})`
returns true or false, with every time in milliseconds (or `null`). A new part, `src/app/15a-backup-reminder.js`, reads
the dates, keeps the reminder's own key, and draws the notice with «احفظ نسخة دلوقتي» and «مش دلوقتي». The shell shows
it on «اليوم» with the other notices, and only when the install notice and the save-failure notice are not showing.
Saving goes through the existing `downloadBackup`, so the file and «آخر نسخة» are the same as in Settings.

## Technical Context

- **Language**: the app script (`src/app/*.js`); no new CSS (the notice is the existing `Notice`).
- **Storage**: `mizan-backup-reminder` in localStorage, `{since, snoozedUntil}` as ISO text; its own key, outside the
  progress, the settings and the backup, like `mizan-install-hint`. The last-backup time stays in the existing
  `mizan-backup-meta-v1`, read with `readBackupMeta` and written by `downloadBackup`. With storage refused, the dates
  live in the component until the page closes.
- **Tests**: `tools/check-reminder.js` (new, with `--self-test`) runs the rule against a table of cases; E2E in
  `tests/e2e/backup-reminder.spec.js`; every other check and parity.
- **Constraints**: no network, no library, no file over 600 lines.

## Constitution Check (v3.0.1)

| Principle | Status |
|---|---|
| I. Human review | The owner approved the spec and running to the PR (2026-11-15). |
| II. Checking off is human | No marks are read beyond counting them, none are written. |
| III. Data stays on the device | No network; one local key for the reminder's dates. The file is saved to the phone only on a tap. |
| IV. Honest, offline day | Day plans unchanged (parity 0). |
| V. Simple, single file | One rule, one small part, one shell line, a small change to the install notice. |
| VI. General repo | No personal value. |

## Decisions (research)

1. **The rule is pure and checked** (AGENTS.md: rules apart from screens). It sits in `13-rules.js` between
   `// start of backup reminder` and `// end of backup reminder`, run by `tools/check-reminder.js` like
   `check-install.js`.
2. **In the rule, in order**:
   - nothing to lose: not due;
   - put off, and the put-off time is in the future but at most 3 days away: not due (a later time comes from a wrong
     clock and is ignored);
   - a last backup in the past: due when it is 14 days old or more;
   - a last backup in the future: due (the time cannot be trusted; a new save writes the right one);
   - no backup: due when `since` is 14 days old or more.
3. **`since`** is written once, the first time this version runs on the device, and again whenever it is missing,
   unreadable or in the future. People already using the app start counting on the update.
4. **"Something to lose"**: any day in `checks` (done, skipped or moved), any module mark (`modules`, `courses[].done`),
   or any workout in the log. Tasks and appointments are not marks and do not count (spec FR-002).
5. **One notice at a time**: the install notice's "shown" state moves into a small hook, `useInstallHint(offer)`, that
   the shell calls; the shell shows the install notice when it is due, and the backup reminder otherwise. The
   reminder also waits while the save-failure notice or the "can't open your data" notice is up, since both already
   offer a backup.
6. **After saving**: the notice hides and the shell's toast says «اتحفظت النسخة: <file>», as Settings does. A failed
   save keeps the notice and adds the Settings failure line (`BACKUP_FAILED`); nothing is written.
7. **Copy** (Egyptian Arabic):
   - title, with a backup before: «بقالك أسبوعين من غير نسخة احتياطية»; without: «لسه ما عملتش نسخة احتياطية»;
   - line: «مفيش مزامنة، فبياناتك على التليفون ده بس. لو اتمسحت، النسخة هي اللي بترجّعها.»;
   - buttons: «احفظ نسخة دلوقتي» (primary), «مش دلوقتي» (ghost).

## Design

- **`src/app/13-rules.js`**: the `backup reminder` rule block, with `BACKUP_DUE_DAYS = 14` and
  `BACKUP_SNOOZE_DAYS = 3`.
- **`src/app/15a-backup-reminder.js`** (new, in `ORDER` after `15-settings-view.js`): `REMINDER_KEY`, `hasMarks`,
  `BackupReminder({store, wk, showToast})`.
- **`src/app/14c-install-hint.js`**: `useInstallHint(offer)` returns `{hint, dismiss}`; `InstallHint({hint, dismiss})`
  only draws.
- **`src/app/21-shell.js`**: on «اليوم», `<InstallHint>` when the install hint is up, else `<BackupReminder>` unless a
  save-failure or "failed" notice shows.
- **`tools/check-reminder.js`** (new) and **`.github/workflows/checks.yml`**: two lines to run it.
- **README**: the reminder in the backup part, and its key in the privacy part.

### Tests

- **`tools/check-reminder.js`**: due after 14 days and not at 13; never backed up with `since` 14 days old, and not
  without `since`; nothing to lose; put off for 2 more days; put off beyond 3 days ignored; put off but past;
  a last backup in the future; `since` in the future. Mutations: the 14 days made 13; nothing to lose ignored; the
  3-day cap dropped; a future backup trusted.
- **`tests/e2e/backup-reminder.spec.js`**: due with one mark shows on «اليوم» only; «احفظ نسخة دلوقتي» downloads the
  file, hides the notice, updates «آخر نسخة», and a reload shows nothing; «مش دلوقتي» hides it after a reload and it
  comes back 3 days later; no marks shows nothing; a recent backup shows nothing; never backed up shows nothing on the
  first open and shows 14 days later; on an iPhone the install notice shows first and the reminder after «تمام»;
  storage refused gives no error; 375 px no sideways scroll.

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | Rule, check, part, install hook, shell | US1, US3 | Every check; parity 0 |
| 2 | «مش دلوقتي» and the 3 days | US2 | Every check |
| 3 | E2E, README, ticks | all | Full E2E; `check-private` clean |
