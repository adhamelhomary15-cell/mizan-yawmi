# Implementation Plan: Settings Changes Without Reopening the Page

**Branch**: `020-live-settings` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

## Summary

Everything the app works out from the settings moves into one function, `applySettings(loaded)`, in
`02-settings-load.js`. It runs once when the page opens, and again after «احفظ الجدول», «استبدل» and «رجّع المثال».

After a save, an import or a reset, the shell:
1. stores the settings;
2. reads them back exactly as a page load would (`readSettings()`) and applies them;
3. bumps a counter that keys the screens, so every screen starts fresh with the new values.

The three `location.reload()` calls go. The other reloads stay: restoring a backup, settings brought back from the
device copy, and «افتحها» for a new version.

As in 014–019, the research, data model and checks are kept in this file instead of separate files.

## Technical Context

- **Language**: JavaScript in one page (Preact and htm), built by `tools/build.py` from `src/app/*.js`.
- **Storage**: unchanged. The settings store's save path (013) is used as it is.
- **Tests**:
  - Playwright E2E in a new `tests/e2e/live-settings.spec.js`. The existing tests that wait for a reload after these
    three actions are updated.
  - `check-parity.js` must give 0.
  - `check-anchors` and `check-parity` pull code out of the settings section, and must keep working.
- **Constraints**: no new library, no network, no file over 600 lines, no unused code.

Nothing is left as NEEDS CLARIFICATION.

## Constitution Check (v2.0.1)

| Principle | Status |
|---|---|
| I. Human review | The same confirmations as now: the editor's summary, the import preview, «أيوه، ارجع للمثال». |
| II. Checking off is human | Progress and workouts are never written by applying settings. |
| III. Data stays on the device | No network. |
| IV. Honest, offline day | The screens use exactly what a fresh load would give (FR-002). |
| V. Simple, single file | It removes code paths (three reloads). One function lists every value worked out from the settings. |
| VI. General repo | Tests use generated data only. |

All gates pass, before and after the design.

## Decisions (research)

1. **One `applySettings(loaded)`, and every settings-derived value as a `let` beside it, in `02-settings-load.js`.**
   - **The values**: `LOADED`, `CFG`, `CATS`, `NEW_KINDS`, `KIND_IDS`, `SUBJ`, `SCHED`, `COURSE`, `PLAN`,
     `TASK_TAGS`, `RULES`, `BAL_A`, `BAL_B`.
   - **Moved in from other files**:
     - `START`, `END`, `SPAN` and `zoneFmt` (from `03-time.js`);
     - the prayer-time cache `ptCache` (from `04-prayers.js`);
     - `FAMILY` (from `07-day-model.js`);
     - `AXIS_HOURS` (from `11-week.js`).
   - **Why**: one place shows everything that has to change with the settings, so nothing can stay stale by being
     forgotten. Values that are computed on each call (`phaseFor`, `prayers`, `kc`, `canPostpone`) already read the
     current values, and need nothing.
   - **Rejected**: passing settings to every screen as a prop or context. That would rewrite most screens, for the
     same result.
2. **`readSettings()` is the page-load read, kept as a function.** It reads the stored settings, or falls back to the
   example, as `LOADED` is built now. After a save, an import or a reset, the shell calls it again, so the values
   applied are the ones a fresh load would give (FR-002).
3. **The screens restart by key.**
   - `App` keeps `settingsEpoch` and keys the view with it. Every screen's own state (an open review, an open panel,
     the editor's form) starts fresh.
   - The chosen date and the tab stay in `App`, outside the key.
4. **One shell function, `settingsChanged(after)`.**
   - It calls `applySettings(readSettings())`, bumps the epoch, sets `MAIN_NAME`, and clears `editorSession`.
   - Then it does what `after` asks: for the editor, go to «اليوم» and show «اتحفظ الجدول»; for an import or a
     reset, stay in الإعدادات with a line.
   - It is passed to `SettingsView`, which passes it to the editor.
5. **A toast without undo.** «اتحفظ الجدول» has nothing to undo, so the toast shows «رجّعها» only when there is an
   undo. The other toasts are unchanged.
6. **The recovered-settings path keeps its reload** (spec): it runs before the first render, and is rare.

## Design

- **`02-settings-load.js`**: `readSettings()`; the `let` values; `applySettings(loaded)`, which fills them all and
  clears `ptCache`; one call at load; the recovered-settings reload, unchanged.
- **`03-time.js`, `04-prayers.js`, `07-day-model.js`, `11-week.js`**: their settings-derived constants go, and now live
  in 02. The functions that use them don't change.
- **`21-shell.js`**: `settingsEpoch`, `settingsChanged`, the keyed view, and the toast without undo.
- **`14b-editor-view.js`**: `save` calls `settingsChanged('today')` in place of the reload.
- **`15-settings-view.js`**: «استبدل» and «رجّع المثال» call `settingsChanged('settings')` in place of the reload.
- **The tools**: `check-anchors` and `check-parity` read the joined source between markers. They are checked to
  still find what they need, with 0 differences.

### Tests

- **`tests/e2e/live-settings.spec.js`**, which marks the page (`window.__same = 1`) and checks the mark survives:
  - **US1**: add a block and save. «اليوم» shows it, «اتحفظ الجدول» shows, and there was no reload. A reload after
    that shows the same timeline, Week strip and prayer times (SC-002).
  - **US1, place**: change the place and save. The prayer times on «اليوم» are the new place's, the same as after a
    reload.
  - **US2**: import a file and then go back to the example, each with no reload. The example notice comes and goes.
  - Stored progress and workouts are the same before and after each change.
- **Existing tests** in `schedule.spec.js` and `day-bounds.spec.js` stop waiting for a load event after these three
  actions.
- **Parity**: 0 on the example and the private file.

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | `readSettings`, the `let` values and `applySettings` in 02, with the moved values; no behaviour change yet | — | Every check; parity 0; `check-anchors` year sweep |
| 2 | `settingsChanged`, the keyed view, the toast; the editor, import and reset stop reloading | US1, US2 | Browser at 375 px |
| 3 | E2E (new and updated), README line, B3 closed in review.md, ticks, PR | all | All checks; `check-private` clean |

## Risks

- **A value forgotten outside `applySettings`** would stay stale. The E2E compares the screen after applying with
  the screen after a reload, and a grep check in `check-code.js` refuses a new top-level `const` that reads `CFG`
  outside 02.
- **`check-parity` and `check-anchors` read sections of the source**: moving `START`/`END` into 02 must not break
  them. Phase 1's gate runs both before anything changes behaviour.
- **The Settings screen shows the stored file's status** from `LOADED`. That value becomes a `let` set by
  `applySettings`, so it follows too.
