# Data Model: Workout Log (Strong-style)

All data lives in one object under its own `localStorage` key, `mizan-workouts-v1` (research R1). Nothing here
is added to the progress store or the settings. Times are epoch milliseconds.

## Root

| Field | Type | Rule |
|---|---|---|
| `v` | number | `1`; a larger value on load means the data is from a newer app and is left untouched |
| `custom` | `Exercise[]` | the user's own exercises |
| `routines` | `Routine[]` | the user's routines |
| `workouts` | `Workout[]` | finished workouts, oldest first |
| `current` | `OpenWorkout \| null` | at most one open workout |
| `prefs` | `{restSeconds, sound}` | `restSeconds` whole 10 to 600, default 90; `sound` boolean, default true |

A missing, unparsable or wrong-shape stored value loads as the empty root; it never throws.

## Exercise (starter or custom)

| Field | Rule |
|---|---|
| `id` | string; starter ids are fixed in the source and start with `s-`; custom ids come from `uid36` |
| `name` | 1 to 60 characters after trimming; unique ignoring case and repeated spaces across starter and custom |

## Set

| Field | Rule |
|---|---|
| `w` | weight in kilograms, 0 to 999.9 (decimals allowed) |
| `r` | repetitions, whole number 1 to 999 |
| `done` | boolean, only in an open workout; set only by the user's tap, and only when `w` and `r` are valid |

In an open workout `w` and `r` hold what the inputs show (text, empty until typed); marking a set done checks them with `validateSet`, and finishing stores numbers.

## OpenWorkout (`current`)

| Field | Rule |
|---|---|
| `id` | string |
| `startedAt` | start time; the workout timer is `now - startedAt`, never below 0 |
| `routineId` | optional; the routine it was started from |
| `exercises` | ordered list of `{exId, sets: Set[]}` |
| `rest` | `null` or `{startedAt, seconds, alerted}`; remaining = `startedAt + seconds*1000 - now`; `alerted` makes the alert fire once |

## Workout (finished)

| Field | Rule |
|---|---|
| `id`, `startedAt`, `endedAt` | `endedAt >= startedAt`; duration = `endedAt - startedAt` |
| `routineName` | optional snapshot of the routine's name |
| `exercises` | ordered list of `{exId, name, sets: [{w, r}]}`; every exercise has at least one set; only done sets are kept |

At least one set overall, or the workout is not finished (it can be discarded).

## Routine

| Field | Rule |
|---|---|
| `id` | string |
| `name` | 1 to 40 characters after trimming, unique ignoring case |
| `exIds` | ordered list of exercise ids, no repeats, at most 40 |

A routine has no planned weights, sets or rest times (out of scope).

## Derived data (never stored)

- **Previous sets** for `(exId, beforeTs)`: the sets of that exercise in the most recent finished workout that
  started before `beforeTs` and contains it, by set number.
- **Records**: per exercise, `bestWeight` and `bestReps` with the date reached, and per set the flags
  `weightRecord` and `repsRecord`, computed from `workouts` in order (research R7). An exercise's first
  workout carries no flags.
- **Clock**: `formatClock(ms)` for `m:ss` or `h:mm:ss`.

## Pure functions (in `src/planner.html`, covered by `tools/check-workout.js`)

- `parseNumber(text)`: Latin and Arabic-Indic digits, `.` `,` `٫` as the decimal mark; returns a number or `NaN`.
- `validateSet({w, r})` returns `{ok, error?, value?}`; errors name the field.
- `normName(name)`: trimmed, spaces collapsed, lower-cased, for comparison.
- `previousSets(workouts, exId, beforeTs)`.
- `computeRecords(workouts)` returns `{perExercise, flags}`.
- `finishWorkout(current, now, names)` returns `{ok, workout?, dropped, error?}`: keeps done valid sets, drops empty
  exercises, needs at least one done set; `names` maps exercise ids to the names saved with the workout.
- `startFromRoutine(routine, exercisesById, now, uid)` returns a new open workout.
- `canDeleteExercise(exId, workouts, routines)` returns `{ok, reason?, routineName?}`.
- `restLeft(rest, now)`, `elapsedMs(startedAt, now)`, `formatClock(ms)` and `restLabel(left)` (a countdown shows the whole
  second still left, and counts up with a plus once over).
- `isNameTaken(name, list, exceptId)`.
- `normalizeRoot(raw)` returns `{root, tooNew}`: never throws; damaged parts are dropped; `tooNew` is true when the
  data was written by a newer app, and the app must then not overwrite it.

## State transitions

```text
no workout --start (empty or from a routine)--> open
open --add exercise / add, edit, remove set / mark set done--> open (rest timer starts on a done set)
open --finish (>= 1 done set)--> saved to workouts, current = null
open --discard (confirmed)--> current = null, nothing saved
finished --edit a set / delete (undo 7 s)--> workouts changed, records recomputed
```

Nothing in these transitions touches the schedule, tasks, modules, progress or settings.
