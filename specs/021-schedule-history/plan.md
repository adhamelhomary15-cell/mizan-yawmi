# Implementation Plan: Past Days Keep the Schedule They Had

**Branch**: `021-schedule-history` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

## Summary

The settings gain an optional `history`: a list of earlier weeks, each with the last date it was in use, storing
only the days that changed. Every date is laid out from the week in use on it. Four parts change:
- **The point where days are laid out**: `listFor` in `04-prayers.js` now looks up the week for that date.
- **Every path that writes the settings** (editor save, import, back to the example) goes through one pure rule,
  `withHistory`, so they all keep the history the same way.
- **Validation**: kept days are checked like the current week, except that their kinds and subjects may since have
  been removed.
- **The save summary**: its wording now says what really happens.

As in 014 and 015, the decisions, data model and checks are kept in this file.

## Technical Context

- **Language**: JavaScript in one page (Preact and htm), built by `tools/build.py` from `src/app/*.js`.
- **Storage**: the settings store (013), with the same version 1. `history` is one more known field, and files
  without it read as before.
- **Tests**:
  - `tools/check-schedule.js`: rules, oracles and mutations;
  - `tools/check-settings.js`: validation;
  - `tools/check-parity.js`: 0 differences without a history;
  - Playwright E2E in `tests/e2e`.
- **Target**: phone browsers at 375 px, offline.
- **Constraints**: no new library, no network, no file over 600 lines, no unused code. The settings must stay within
  1 MB (the import limit).

Nothing is left as NEEDS CLARIFICATION.

## Constitution Check (v2.0.1)

| Principle | Status |
|---|---|
| I. Human review | The history changes only on a save, an import or a reset the user confirms. Nothing changes on open. |
| II. Checking off is human | No mark, postponement or extra block is touched (FR-011). Ticks only show again where they were. |
| III. Data stays on the device | The history lives in the settings store and its backup. No network. |
| IV. Honest, offline day | Past days show what they really held, so past weeks' planned and done hours stay honest. |
| V. Simple, single file | Two pure rules, one changed lookup, and no new part file. |
| VI. General repo | Tests use the generic example and generated weeks. The private file is used only by the local parity run. |

All gates pass, before and after the design.

## Decisions (research)

1. **Store only the days that changed.**
   - **Decision**: a kept entry is `{until: 'YYYY-MM-DD', days: {'<0-6>': day | null}}`. It lists only the days that
     differed from the week in use after it. A day it does not list is the same as in the next newer entry, or as
     in the current week. `null` means the day had no blocks.
   - **Why**: the owner's week is about 10 KB. Storing a full week per change would reach about 520 KB in a year of
     weekly changes, more than half the 1 MB limit (SC-004). Most changes touch one or two days, so a kept entry is
     usually 1 to 3 KB.
   - **Rejected**: a full week per entry, too large. A diff of single blocks, too complex to check and to read.
2. **Only the last date is stored.**
   - **Decision**: entries are in order and each holds only `until`. An entry covers the days after the previous
     entry's `until`, up to its own. The current week covers the days after the last `until`.
   - **Why**: with no `from` dates, there can be no gaps and no overlaps (Key Entities).
3. **One rule writes the history, whatever the path.**
   - **Decision**: `withHistory(stored, next, dates)` returns the settings to save:
     - `stored` is the raw stored settings, or `null`.
     - `next` is the new settings.
     - `dates` is `{today, yesterday, cutoff}`.
   - **What it does**:
     1. It works out the week in use yesterday from `stored`.
     2. If the last entry ends yesterday, the current week started today. It takes that entry out, so a second save
        today replaces the current week (FR-004).
     3. It adds one entry ending yesterday, with the days where the week in use yesterday differs from
        `next.week`. If no day differs, nothing is added (FR-005).
     4. It drops entries ending before `cutoff` (365 days back, FR-010). While the settings are still over 900 KB, it
        drops the oldest entry.
   - **Why it is correct**: an older entry's unlisted day resolves upward to the first newer entry that lists it.
     Taking out the last entry and adding one rebuilt against `next` keeps every older date resolving to the same
     day.
4. **Kept days are checked, but leniently.**
   - **Decision**: `validateSettings` checks each entry: `until` a real date, the dates in rising order, the day keys
     0 to 6, and each day with the same block rules as the current week. Two rules are looser, because the kind or
     subject may since have been removed: a block's kind needs only a valid id (a built-in one, or `k1` to `k12`),
     and its subject only 1 to 8 characters.
   - **A bad entry** is left out of the loaded settings, and its dates fall to the next newer week. The load gives a
     warning, and the Settings tab says so once. The stored copy keeps it unchanged: `withHistory` works on the raw
     stored settings, so the bad entry is carried on, never deleted (FR-009).
   - **How**: `checkBlocks` gets a flag for this looser mode, instead of a second copy of the block rules.
5. **Removed kinds and subjects.**
   - **Decision**: at load, every kind used by a kept day and missing from `CATS` is added as
     `{label: 'نوع اتمسح', long: 'نوع اتمسح', track: false}`. It is not added to `KIND_IDS`, so the editor and the
     Week rows do not list it. Not tracked means it cannot be postponed.
   - **Subjects**: a missing subject shows no subject. The places that read `SUBJ[id]` are checked for this in
     phase 2.
6. **Going back to the example keeps the history.**
   - **Decision**: «رجّع المثال» now stores the example with the history (`withHistory`) and `fromExample: true`,
     instead of removing the settings.
   - **What follows**:
     - `LOADED.isExample` becomes true for stored settings with `fromExample`, so the example notice still shows.
     - `withHistory` removes `fromExample` unless the reset itself passes it.
     - When there is no history at all, it keeps removing the settings, as today.
7. **Export holds the current week only.**
   - **Decision**: `exportSettings` writes `CFG` without `history` and `fromExample`, so the file imports anywhere as
     a normal settings file (FR-008).
   - **Backups** (007) carry the settings as stored, so the history goes with them.

## Data model

- **`history`** (optional, in the settings): a list, in rising order of `until`:
  `[{until: 'YYYY-MM-DD', days: {'<0-6>': {note?, blocks} | null}}]`.
- **`fromExample`** (optional): `true` only after «رجّع المثال».
- **Current week**: `week`, unchanged. It applies after the last `until`, or to every date when there is no history.
- **Settings version**: stays 1. `KNOWN` in `validateSettings` gains `history` and `fromExample`.

## Design

### Rules, in the schedule rules block (`src/app/13a-schedule-rules.js`, tested by `tools/check-schedule.js`)

- `dayOn(settings, iso, weekday)`: the day object in use on `iso`, following decisions 1 and 2. `weekday` is passed
  in, because the block runs on its own in the checks.
- `withHistory(stored, next, dates)`: decision 3.

### Changes in the app

| File | Change |
|---|---|
| `01-settings-validate.js` | `history` and `fromExample` are known fields. Kept entries are checked with the loose flag on `checkBlocks`, and bad entries are left out with a warning. |
| `02-settings-load.js` | `isExample` also covers `fromExample`, and removed kinds are added to `CATS` (decision 5). |
| `04-prayers.js` | `listFor(iso)` reads `dayOn(CFG, iso, weekday)`, cached per date. |
| `10-postpone-ui.js` | The day note reads the dated day, not `SCHED[wd]`. |
| `14b-editor-view.js` | The save goes through `withHistory`, and the summary line follows US2. |
| `15-settings-view.js` | Import and «رجّع المثال» go through `withHistory`, the export leaves the history out, and a bad entry gets a one-time line. |

### Summary wording (US2)

The line «الجدول الجديد بيسري على كل الأيام، واللي فاتت كمان…» becomes:

> «الجدول الجديد بيبدأ من النهارده (<اليوم والتاريخ>)، والأيام اللي قبله بتفضل بجدولها. علامة عملتها النهارده على
> بلوك وقته أو نوعه اتغيّر بتفضل محفوظة، بس مش هتبان النهارده.»

### Tests

- **`tools/check-schedule.js`**:
  - `dayOn` against a full-week oracle, over random sequences of saves: every past date resolves to the week that
    was in use on it;
  - `withHistory`:
    - a second save on the same day;
    - an equal week;
    - a day added or removed;
    - two-version days;
    - the cutoff, and the 900 KB cap;
    - a bad entry carried on unchanged;
  - mutations: no taking out on a second save, a full week stored instead of the changed days, an off-by-one
    `until`, and no cutoff.
- **`tools/check-settings.js`**: valid and bad `history` entries; a kept block of a removed kind or subject passes,
  and a bad time fails.
- **Parity**:
  - `check-parity.js` on the example: 0 differences without a history (SC-003);
  - a local run on the private file with `--settings`: also 0.
- **`tests/e2e/history.spec.js`**:
  - **US1**: tick last Monday, move that block in the editor, save: last Monday is unchanged and ticked, and next
    Monday shows the new time; the Week tab's numbers for last week are unchanged.
  - **US2**: the summary names today; a second save today adds no entry.
  - **US3**: import a file, go back to the example, restore a backup; the export has no `history`.
  - **Removed kind**: a past block shows «نوع اتمسح».

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | `dayOn`, `withHistory` and validation, with their checks | all | `check-schedule` and `check-settings` green, mutations caught |
| 2 | `listFor` and the day note on `dayOn`, and removed kinds | US1 | Parity 0 (example and private); browser at 375 px |
| 3 | Editor save and summary; import, reset and export | US2, US3 | E2E |
| 4 | Docs (README «تعديل الجدول», PRODUCT), ticks, PR | — | All checks; `check-private` clean |

Phases 1 and 2 are one commit if `check-code` refuses the rules before their first use, as in 013 and 014.

## Risks

- **Merging with 018** (day bounds, in progress in the other folder): 018 changes `02-settings-load.js`,
  `14b-editor-view.js` and the validation too. 021 is merged after 018, by taking `main` into this branch and
  rebuilding. The generated `index.html` and `sw.js` always conflict and are rebuilt, never merged by hand.
- **Speed**: `listFor` runs for every day of the Week tab and of parity. `dayOn` walks at most about 60 entries, and
  is cached per date.
- **The example as history**: a new user who replaces the example keeps the example's week for the days before. That
  is what those days showed, and it is a few KB.
