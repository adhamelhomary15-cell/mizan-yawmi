# Implementation Plan: Workout Log (Strong-style)

**Branch**: `006-workout-log` | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-workout-log/spec.md`

## Summary

A new tab, «تمارين», lets the user log gym workouts the way the Strong app does: start a workout (empty or from
a routine they built), add exercises, record sets as weight in kilograms and repetitions with last time's values
beside each row, run a rest timer after every set and a workout timer from the start, finish into a history that
marks personal records, browse and extend the exercise list, and build routines (their own split such as push,
pull and legs). Everything stays on the device in its own storage key, works offline, and never touches the
schedule, tasks, modules, progress or settings.

Technical approach (details in [research.md](research.md)):

1. A separate storage key and a small hook, so the log is outside the progress store, outside its cloud mirror
   and outside `normalize()`.
2. Pure rules in one marked block (number parsing, set validation, previous values, records, finish and delete
   rules, timer maths, routine start), tested by a dev-only `tools/check-workout.js` against an independent
   oracle.
3. Timers from stored start times, so they stay true after a lock, a reload or a closed app; alerts by
   vibration and Web Audio while the page is visible; an optional screen wake lock while a workout is open.
4. One `WorkoutView` with internal screens inside a sixth bottom-bar tab.
5. Three mergeable cut points (A log and timers, B history and exercises, C routines and fixes), each its own
   branch and pull request from this one spec.

## Technical Context

**Language/Version**: JavaScript inline in one HTML file (`src/planner.html`); Node for dev-only checks; Python 3 only for `tools/build.py`

**Primary Dependencies**: Preact 10.26.4 + hooks, htm 3.1.1 (vendored). Browser built-ins only: Web Audio, Vibration, Screen Wake Lock (each feature-detected). No new dependencies

**Storage**: new key `mizan-workouts-v1` in `localStorage`, one JSON object (about 1 KB per finished workout); the progress key and the settings key are not touched

**Testing**: `tools/check-workout.js` (new, dev-only: unit cases, 300 generated histories against an independent oracle, a timing check, mutation self-test); existing `check-paste.js`, `check-edit.js`, `check-settings.js`, `check-anchors.js`, `check-private.js`; browser pass per [quickstart.md](quickstart.md) at 375 px and offline

**Target Platform**: Installed PWA on phone (main) and laptop browsers, offline-capable

**Project Type**: Single-file web app (PWA)

**Performance Goals**: Saving after each change in well under 1 ms of work; history and records over 700 workouts open in under 1 second (SC-006); one-second timer tick only inside the workout screen

**Constraints**: Offline; no network; no notification permission; nothing written to the progress store, `checks`, `modules`, tasks, schedule or settings; Egyptian Arabic RTL copy; Latin digits for numbers; existing design tokens; single HTML file; no new build step

**Scale/Scope**: One user per device; about 200 lines of pure rules, one hook, one view of about 500 lines with internal screens, one tab entry, a starter list of about 30 names, one new dev script. This is the largest feature so far, hence the cut points

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against the constitution v1.1.1.

| Principle | Status | How this plan satisfies it |
|---|---|---|
| I. Human review before any AI action | Pass | Plan only; each phase ends at a checkpoint needing the owner's go-ahead, and the screen phases wait for the owner's Strong screenshots (research R14) |
| II. Checking off is a human act | Pass | The log lives under its own key and hook and cannot reach `checks`, `modules`, tasks or the schedule; a set is done only by the user's tap with valid numbers; finishing a workout never ticks a gym block; `check-workout.js` asserts the rules block never mentions those stores |
| III. Private progress stays on device | Pass | Own localStorage key, outside the progress store and its cloud mirror (research R1); no network, no notification permission, no account; sound, vibration and wake lock are local browser features |
| IV. Honest, offline-capable day | Pass | Fully offline; timers show the true time after a lock instead of pretending to run; no change to the day's plan |
| V. Simple, single-file, Egyptian Arabic | Pass | Still one HTML file, no framework or build step; Arabic UI copy; one new tab; the one new script is dev-only |
| VI. General public repo, private settings | Pass | The starter list is generic common exercise names; no real workouts, weights or routines anywhere in the repo; `check-private.js` runs before each commit |

Post-design re-check: all pass. No Complexity Tracking entries.

## Phases

Eight small phases, each committable and reversible alone, each needing the owner's go-ahead (Principle I).
Cut points are marked: stop at a cut, open a pull request, and continue on a new branch from the same specs
folder only if the owner wants.

| # | Phase | Story | Touches | Gate |
|---|---|---|---|---|
| 1 | **Pure rules and their check**: number parsing, `validateSet`, `normName`, `previousSets`, `computeRecords`, `finishWorkout`, `startFromRoutine`, `canDeleteExercise`, timer maths, the starter list; `tools/check-workout.js` with an independent oracle and self-test | all | `src/planner.html` (new unused code), `tools/check-workout.js` | Checks pass on 300 generated histories; self-test catches every mutation; app unchanged |
| 2 | **Storage, tab and logging** (needs the screenshots): `mizan-workouts-v1` hook, the sixth tab, Home, start an empty workout, the exercise picker with search and "new exercise", sets with previous values, done button, discard | US1 | `src/planner.html` | Quickstart 2 (steps 1 to 3) and 8; the six-item bar fits at 375 px |
| 3 | **Timers and finishing** **(cut A)**: workout timer, rest timer with skip and +15, alert (vibration, beep, sound switch), default-rest setting, wake lock while a workout is open, finish with confirmation, resume after reload | US1, US2 | `src/planner.html` | Quickstart 2 and 3 pass at 375 px, including a real lock for one minute |
| 4 | **History and records**: history list, workout detail with record marks, exercise page with best values | US3 | `src/planner.html` | Quickstart 4 passes; records match the oracle |
| 5 | **Exercise list** **(cut B)**: browse all, own exercises, rules for deleting | US4 | `src/planner.html` | Quickstart 5 passes |
| 6 | **Routines**: list, create, edit, reorder, delete, start from a routine | US5 | `src/planner.html` | Quickstart 6 passes; the routine never changes by use |
| 7 | **Fixing mistakes** **(cut C)**: edit and remove sets, delete a finished workout with undo, correct a finished set | US6 | `src/planner.html` | Quickstart 7 passes; records recomputed |
| 8 | **Polish and ship**: layout, keyboard and screen-reader pass, README and `PRODUCT.md`, rebuild, full quickstart including offline, final diff scan for forbidden stores | all | generated files via build, `README.md`, `PRODUCT.md` | All quickstart steps pass; the owner approves the diff before any push |

Notes:
- Phase 1 changes nothing visible and does not need the screenshots, so it can start at once.
- Phases 2 to 7 each change only this tab. The only edit outside it is the tab entry, the route list and the
  nav grid (phase 2), and one `useWorkouts` hook.
- If the owner asks for fewer features, the cut points are the natural places to stop.

## Project Structure

### Documentation (this feature)

```text
specs/006-workout-log/
├── spec.md
├── plan.md              # this file
├── research.md          # decisions R1..R15
├── data-model.md        # the stored object, derived data, pure functions
├── quickstart.md        # validation guide
├── contracts/
│   └── ui-contract.md   # the tab's screens and messages (provisional until the screenshots)
├── checklists/
└── tasks.md             # created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/planner.html           # workout rules block, useWorkouts hook, WorkoutView, tab entry, styles (edited)
tools/check-workout.js     # dev-only check of the pure rules (new)
README.md, PRODUCT.md      # a short section each (phase 8)
index.html, sw.js, ...     # generated by tools/build.py, never edited by hand
```

**Structure Decision**: single-file app. All behaviour stays in `src/planner.html`; the only new file is a
dev-only script beside the existing check scripts.

## Complexity Tracking

No violations to justify.
