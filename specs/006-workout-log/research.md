# Research: Workout Log (Strong-style)

Grounded in `src/planner.html` on `main` at `4092f72`. No NEEDS CLARIFICATION remained after the spec. The
Strong screenshots the owner will send are not in yet: decisions about the look of screens are provisional
(R14); decisions about data, rules and timers are not affected.

## R1. Where the data lives: its own key, never in the progress store

`useStore` (`src/planner.html:997`) keeps progress under `fall26-planner-v1`, runs `normalize()` on every
update (it drops unknown keys), and, when the app is hosted where `window.claude` offers a database, mirrors
the whole progress object to a cloud document. Putting workouts there would make them cloud-synced in that
host (Principle III: only on the device unless the owner chooses a copy) and `normalize()` would delete them.

Decision: workouts get their own storage key, `mizan-workouts-v1`, and their own small hook (`useWorkouts`,
read on load, written on every change, in `try/catch` like `saveLocal`). The settings import, reset and the
progress store never touch it, and it never touches them (Principle II: the log cannot reach `checks`).

Alternatives rejected: a new field in the progress object (synced, and `normalize()` must change); IndexedDB
(more code and async reads for a small amount of data).

Size: a finished workout is about 1 KB of JSON (10 exercises, 4 sets), so two years of near-daily workouts is
under 1 MB; the whole object is written on each change in well under a millisecond.

## R2. Shape of the stored object

```text
{ v: 1,
  custom:   [{id, name}],                         // the user's own exercises
  routines: [{id, name, exIds: [id]}],
  workouts: [{id, startedAt, endedAt, routineName?, exercises: [{exId, name, sets: [{w, r}]}]}],   // finished, oldest first
  current:  null | {id, startedAt, routineId?, exercises: [{exId, sets: [{w, r, done}]}], rest: null | {startedAt, seconds, alerted}},
  prefs:    {restSeconds: 90, sound: true} }
```

Finished workouts keep a snapshot of the exercise name so history reads correctly. Only done sets are kept at
finish. Times are epoch milliseconds. Details and validation are in [data-model.md](data-model.md).

## R3. Timers are stored timestamps, not counters

A running counter stops when the phone locks or the page is frozen. Decision: the workout stores `startedAt`,
the rest timer stores `startedAt` and `seconds`; the screen computes `elapsed = now - startedAt` and
`remaining = startedAt + seconds*1000 - now` on a 1-second tick and on becoming visible again. After a lock,
a reload, or a closed app the numbers are true (FR-009, SC-003). A negative remaining shows as overrun
(`+m:ss`). Durations never go below zero if the clock moves back (`Math.max(0, ...)`).

The tick lives inside the workout screen only (a `setInterval` in an effect, cleared on leave), so the rest of
the app does not re-render every second.

## R4. Rest-timer alert

When `remaining` first reaches zero while the page is visible, the app: vibrates (`navigator.vibrate`, where
supported), plays a short beep through the Web Audio API if `prefs.sound` is on, and shows "خلصت الراحة".
The `alerted` flag in the stored rest object makes the alert fire once, even after a re-mount. The audio
context is created and resumed on the tap that marks a set done (a user gesture), which is when browsers allow
sound. No notification permission, no server, no network (FR-008).

On phones that do not run timers or play sound while the screen is locked (notably iPhone), nothing can be
done in a web page; the user sees the true finished or overrun time on return, which is what the spec promises.

Optional, small, and easy to remove: while a workout is open and its screen is shown, ask the Screen Wake
Lock (`navigator.wakeLock.request('screen')`, feature-detected, no permission prompt) so the screen stays on
and the alert can be seen and heard; release it on finish, discard, tab change or hide. Alternative (no wake
lock) leaves the screen to time out between sets, which is the main reason alerts are missed in a gym.

## R5. Numbers and keyboards

Weight and repetitions use `inputmode="decimal"` and `inputmode="numeric"` on a text input (a number input
shows spinners and misbehaves in right-to-left). The parser accepts Latin and Arabic-Indic digits and `.`,
`,` or `٫` as the decimal mark, and rejects anything else. Weight: 0 to 999.9, at most one decimal place
shown (22.5), stored as typed numbers. Repetitions: whole numbers 1 to 999 (FR-004). Numbers display with
Latin digits in a `<bdi>` so they stay correct in right-to-left text.

## R6. Previous values

For a set row, "previous" is the set with the same number (1st, 2nd, ...) from the most recent earlier
finished workout that contains the exercise, or nothing. Matching by set number is what Strong shows and is
simple to explain; if the earlier workout had fewer sets the extra rows show nothing. Pure
`previousSets(workouts, exId, beforeTs)` returns the array (FR-006, SC-002).

## R7. Records

A set is a **weight record** when its weight is strictly greater than every earlier set of that exercise, and
a **repetitions record** when its repetitions are strictly greater than every earlier set of that exercise.
"Earlier" is by workout order, then by set order inside the workout, and includes earlier sets of the same
workout. An exercise's first workout never flags records (nothing to beat yet, US3 scenario 5), but its
values count as the starting best. Best weight and best repetitions per exercise, with their dates, come
from the same pass. Records are recomputed from the history on every view, never stored, so edits and
deletes can never leave a stale record (FR-012). The verification oracle is a deliberately different,
quadratic algorithm (R12).

Alternatives: estimated one-rep max or total volume (more rules than the spec asks for); storing records
(stale after edits).

## R8. Finishing a workout

Finishing keeps only done sets and drops exercises left with none; it needs at least one done set (FR-010).
If any not-done sets would be dropped, the finish confirmation says how many. Discarding an open workout
always asks for confirmation (US6).

## R9. The tab

`TABS` (`:2025`) gets a sixth entry, `['workout', 'تمارين', icon]` placed after "المهام" and before
"الإعدادات"; the route list that reads the hash (`:2040`) gains `workout`; the nav grid (`.nav-in`, `:307`)
goes from five columns to six. At 375 px each column is about 58 px wide; the labels are one short word each
and the existing text size fits, and this must be checked (the design pass may shorten a label or lower the
size by one step). The desktop sidebar needs no change. Leaving the tab never closes an open workout: the
workout lives in the stored object, not in the screen's state.

## R10. Screens inside the tab

One component, `WorkoutView`, with an internal screen state: `home` (open workout banner or start choices,
routines, links), `workout` (the open workout), `history`, `detail` (a finished workout), `exercises`
(browse), `exercise` (one exercise: records and history), `routines`, `routine` (create or edit).
Entering the tab with a workout open goes straight to `workout`. There is no router and no new hash route per
screen; a back button on each screen returns to `home`.

## R11. The starter list

A fixed array of about 30 common exercises with English names and stable ids in the source (generic content,
nothing personal). The user's own exercises live in `custom`. Names are compared ignoring case and extra
spaces, so "bench press" cannot be added twice. Rename of starter exercises is not offered (out of scope).
An exercise cannot be deleted if it has history or is in a routine (FR-013, US5 scenario 5).

## R12. Testing without a framework

The rules (validation and parsing of numbers, previous sets, records, finish rules, timer math, routine start,
delete rules, name normalisation) are pure functions in one marked block of `src/planner.html`; a dev-only
`tools/check-workout.js` extracts it and checks it like `check-paste.js` and `check-anchors.js`:

- unit cases for every rule and edge case in the spec;
- 300 generated histories where records and previous values are compared with an independent quadratic
  oracle (SC-002, SC-005);
- a year-scale timing check of the records pass on 700 workouts (SC-006);
- a self-test that breaks rules on purpose and must be caught.

Browser checks (quickstart) cover what scripts cannot: layout, tap targets, timers across a real lock or
reload, the alert, and the tab.

## R13. Cutting the feature into pull requests

The spec is big. The plan keeps one feature and one task list but marks three cut points, each a mergeable,
useful state: **A** = log and timers (phases 1 to 3), **B** = history, records and the exercise list
(phases 4 and 5), **C** = routines and fixing mistakes (phases 6 and 7). Each cut is its own branch and PR
from the same specs folder. The owner decides at each cut.

## R14. Look and flow follow the owner's Strong screenshots

The screenshots are not available yet. Phase 1 (pure rules) does not depend on them, so it can start now. The
phase that builds screens (phase 2) starts only after the screenshots are looked at and the screen contract is
checked against them; where Strong's layout differs from the contract, the contract is updated first.

## R15. Independence

No change to settings, the progress store, the schedule, tasks or prayer code. New code is one pure block,
one hook, one view, one tab entry, and styles. `tools/build.py` needs no change.
