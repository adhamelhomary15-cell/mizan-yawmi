# Quickstart: validate the Workout Log

Behaviour: [contracts/ui-contract.md](contracts/ui-contract.md). Data rules: [data-model.md](data-model.md).

## Prerequisites

- The branch built with `PYTHONUTF8=1 python tools/build.py` (then `git checkout` the icon files if Pillow
  re-rendered them), a local static server, and a 375 px wide viewport.
- The Strong screenshots looked at before the screen phases (research R14).

## 1. Script checks (no browser)

```bash
node tools/check-workout.js
node tools/check-workout.js --self-test
node tools/check-paste.js
node tools/check-edit.js
node tools/check-settings.js --self-test
node tools/check-anchors.js --require-fit
node tools/check-private.js
```

Expected: all pass. `check-workout.js` covers the number rules, previous values, records against an independent
oracle on 300 generated histories, finish and delete rules, and the timer maths (SC-002, SC-005, SC-006).

## 2. Log a workout (US1, SC-001, SC-004)

1. Open «تمارين», start an empty workout, add two exercises from the list and one new name.
2. Log 3 sets for the first (weight and repetitions, tap done), 2 for the second; try a set with no repetitions:
   it is refused and the field is marked.
3. Reload the page: the workout, the done sets and the timers are all still there.
4. Finish: the confirmation shows the counts and the duration; confirm; the workout is in the history.
5. Start another workout with the first exercise: each set row shows the first workout's values.

## 3. Timers (US2, SC-003)

1. Mark a set done: a rest countdown starts at the default; skip it; mark another and add 15 seconds.
2. Let one run to zero with the screen on: vibration (if the device has it), a beep (sound on), the bar says it
   finished and counts overrun. Switch sound off: no beep at the next one.
3. Change the default rest to 45 seconds: the next rest starts at 45. Reload: the default is remembered.
4. Lock the screen (or background the page) for one minute with a rest running: on return the rest and the
   workout timer show the true time, within one second of the clock.

## 4. History and records (US3)

1. Log the same exercise on three different days with a rising weight (use the browser console on a test copy
   to set `startedAt` back, or finish and then correct dates in the data of a scratch profile).
2. The history lists newest first; the first workout shows no record marks; the later workouts show weight
   record marks on the sets that beat everything before them; the exercise page shows the best weight and best
   repetitions with dates.

## 5. Exercise list (US4)

Search narrows the list; a new name is added to the workout and the list; adding "bench press" again with other
letter case or extra spaces is refused as a duplicate; an exercise with history shows why it cannot be deleted.

## 6. Routines (US5, SC-009)

Create "Push" and "Legs" with different exercises. Start from "Push": its exercises appear in order with last
time's values; add an exercise inside that workout; finish; the routine itself has not changed. Try to delete an
exercise that is in a routine: refused with the routine's name.

## 7. Mistakes (US6)

Edit and remove a set in the open workout; discard an open workout (asks first, saves nothing); delete a
finished workout and undo it; correct a weight in a finished workout and see the records change.

## 8. Layout, keyboard, offline, privacy (SC-007, SC-008)

- 375 px: the six-item bottom bar fits (labels readable, nothing clipped), the workout screen has no horizontal
  scroll, tap targets are at least 44 px.
- Numeric keypad appears for weight and repetitions; Arabic-Indic digits typed are accepted.
- Airplane mode and the network panel: everything above works; 0 requests.
- `git diff main` shows no use of the progress store or `checks`/`modules` from the workout code, and
  `node tools/check-private.js` is clean.
- Settings «رجّع المثال» and an import of a settings file leave the workout data untouched.
