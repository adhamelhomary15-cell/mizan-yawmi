# Feature Specification: Workout Log (Strong-style)

**Feature Branch**: `006-workout-log`

**Created**: 2026-10-13

**Status**: Draft (clarified 2026-10-13)

**Input**: User description: "تتبّع التمارين الرياضية على نمط تطبيق Strong. المستخدم يبدأ تمرينة ويضيف تمارين (من قايمة تمارين عامة جاهزة أو من عنده)، ولكل تمرين يسجّل مجموعات (sets): الوزن بالكيلو وعدد التكرارات (reps)، ويشوف قيم آخر مرة لنفس التمرين وهو بيسجّل. فيه مؤقّت راحة بين المجموعات يبدأ بعد تسجيل كل مجموعة ومدته قابلة للتعديل، ومؤقّت تاني بيحسب مدة التمرينة كلها من أول ما المستخدم يبدأها. بعد ما يخلّص التمرينة تتحفظ في سجل يقدر يتصفحه، ويتعلّم أحسن وزن أو أحسن تكرار لكل تمرين (رقم قياسي). كل البيانات على الجهاز بس، والتطبيق يشتغل أوفلاين. الميزة عامة لأي مستخدم، والريبو ما فيهوش أي تمارين أو أوزان أو بيانات شخصية. الميزة دي بتتسجّل بإيد المستخدم بس ومفيش حاجة بتتعلّم أو بتتضاف أوتوماتيك."

## Clarifications

### Session 2026-10-13

- Q: Where does the workout page live in the app? → A: A new tab in the bottom bar, "تمارين".
- Q: Does the app ship a starter list of exercises? → A: The owner asked for what Strong does: see every exercise, and build your own split. A split such as push / pull / legs is a set of routines, and for each routine the user chooses which exercises it holds, whatever split they follow. So the app ships a starter list to pick from, and the user builds their own routines (a new user story below). The language of the starter names was not answered; it defaults to English names, as exercises are usually called in gyms, and the user can add Arabic names of their own.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log a workout set by set (Priority: P1)

A user is at the gym with a phone in one hand. They start a workout, add the exercises they are doing, and
for each exercise record its sets: the weight in kilograms and the number of repetitions. While recording,
each set row shows what they did last time for the same exercise and set number, so they know what to beat.
When they are done they finish the workout and it is saved.

**Why this priority**: This is the core of the feature. Without fast set logging nothing else matters, and a
gym session leaves no time for typing.

**Independent Test**: Start a workout, add two exercises, log three sets for the first and two for the
second, finish. The workout is saved with exactly those sets. Start a second workout with the same first
exercise: its set rows show the values from the first workout.

**Acceptance Scenarios**:

1. **Given** no workout in progress, **When** the user starts one, **Then** an empty workout opens and a
   workout timer starts at zero.
2. **Given** an open workout, **When** the user adds an exercise, **Then** it appears with one empty set row
   and the previous values from the last workout that had this exercise (if any).
3. **Given** a set row, **When** the user enters a weight and repetitions and marks the set done, **Then**
   the set is saved in the workout and a new empty set row is offered for that exercise.
4. **Given** the user has not entered both a weight and repetitions, **When** they try to mark the set done,
   **Then** it is not saved and the missing field is shown.
5. **Given** an open workout with at least one done set, **When** the user finishes it, **Then** it is saved
   to the history with its date, duration, exercises and sets.
6. **Given** an open workout, **When** the user closes the app or the phone locks and later reopens the app,
   **Then** the workout is still open with everything entered so far.

---

### User Story 2 - Timers: rest between sets and total workout time (Priority: P1)

After the user marks a set done, a rest timer starts counting down from a default duration the user can
change, and shows clearly how much rest is left; when it ends the phone vibrates (and may beep) if the app
is open. The user can skip it or add time. A second timer shows how long the whole workout has been going,
from the moment it was started.

**Why this priority**: The rest timer is what the owner asked for by name and is used between every set;
the workout timer shows how long the session took.

**Independent Test**: Mark a set done: a rest countdown starts and ends at zero with an alert. Lock the phone
for a minute, unlock: the rest timer shows the correct remaining or overrun time and the workout timer shows
the correct total, both within one second.

**Acceptance Scenarios**:

1. **Given** the user marks a set done, **When** it is saved, **Then** a rest timer starts at the default
   rest duration and counts down visibly.
2. **Given** a running rest timer, **When** the user taps skip, **Then** it stops; **When** they tap "add
   15 seconds", **Then** 15 seconds are added.
3. **Given** a rest timer reaching zero while the app is open, **When** it ends, **Then** the user is alerted
   (vibration where the device allows, and a short sound the user can turn off) and the timer shows it has
   finished.
4. **Given** the user changes the default rest duration, **When** the next set is marked done, **Then** the
   new duration is used, and it is remembered on this device.
5. **Given** the phone was locked or the app was closed while timers were running, **When** the app is
   reopened, **Then** the rest timer and the workout timer show the true time, not time frozen at the moment
   the app stopped.
6. **Given** a finished workout, **When** it is saved, **Then** its duration is the time from start to
   finish.

---

### User Story 3 - History and personal records (Priority: P2)

The user browses their finished workouts, newest first, opens one to see every exercise and set, and sees
which sets were a personal record for that exercise: the heaviest weight they have ever lifted, or the most
repetitions in one set, as of that workout.

**Why this priority**: History and records are why people log at all, but they are only useful once logging
works.

**Independent Test**: Log several workouts over different days with a rising weight on one exercise. The
history lists them newest first; the workout where the weight first went up marks that set as a weight
record; opening an exercise shows its current best weight and best repetitions.

**Acceptance Scenarios**:

1. **Given** finished workouts, **When** the user opens the history, **Then** they are listed newest first
   with date, duration, number of exercises and sets.
2. **Given** a finished workout, **When** the user opens it, **Then** every exercise and set (weight and
   repetitions) is shown.
3. **Given** a set whose weight is higher than every earlier set of the same exercise, **When** the workout
   is viewed, **Then** that set is marked as a weight record; likewise for repetitions in one set.
4. **Given** an exercise with history, **When** the user opens that exercise, **Then** its best weight and best
   repetitions are shown with the date each was reached.
5. **Given** the first time an exercise is ever logged, **When** the workout is finished, **Then** its sets
   are not marked as records (there is nothing to beat yet), but its best values are recorded.

---

### User Story 4 - The exercise list (Priority: P2)

The user picks exercises from a list and can browse the whole list at any time, outside a workout too. The
app offers a general starter list of common exercises (English names), and the user can add their own with
a name they choose, and delete their own that have no history and are in no routine.

**Why this priority**: Picking from a list is faster than typing in a gym, but the log works with only custom
exercises, so it comes after the core.

**Independent Test**: Open the exercise list, search a starter exercise, add a custom exercise, use both in
a workout; the custom one appears in the list next time.

**Acceptance Scenarios**:

1. **Given** the add-exercise screen, **When** the user types in the search box, **Then** the list narrows to
   matching exercises.
2. **Given** a name that is not in the list, **When** the user adds it, **Then** it is created as the user's
   own exercise and added to the workout.
3. **Given** an exercise the user created and never logged, **When** they delete it, **Then** it disappears
   from the list; **Given** an exercise with history, **Then** it cannot be deleted (its history stays).

---

### User Story 5 - Build your own split with routines (Priority: P2)

Like Strong, the user decides how their training is split. They create routines with names they choose (for
example "Push", "Pull", "Legs", or "Upper" and "Lower", or anything else), and for each routine they pick the
exercises it holds, in order, with how many sets each one gets (like Strong's `4 ×`). When they start a workout they
can start an empty one or start from a routine: all the routine's exercises are added at once, each with that many
empty set rows and the values from last time.

**Why this priority**: The owner named this by description: choosing which exercises belong to push, pull
and legs (or any split) is how they train, and it saves re-adding the same exercises every session.

**Independent Test**: Create the routines "Push" and "Legs" with different exercises. Start a workout from
"Push": exactly its exercises appear in order with last time's values. Log it and finish; the routine is
unchanged.

**Acceptance Scenarios**:

1. **Given** the routines screen, **When** the user creates a routine with a name and picks exercises from the
   list, **Then** it is saved with those exercises in the order picked, each with 1 set unless the user changes
   the count (1 to 20).
2. **Given** a routine, **When** the user renames it, adds, removes or reorders its exercises, or deletes it,
   **Then** the change is saved; deleting a routine never deletes workouts already finished from it.
3. **Given** the start screen, **When** the user starts a workout from a routine, **Then** an open workout
   appears with the routine's exercises in order, each with as many empty set rows as the routine plans and the
   previous values.
4. **Given** a workout started from a routine, **When** the user adds, removes or changes exercises in this
   workout, **Then** the routine itself does not change.
5. **Given** an exercise used by a routine, **When** the user tries to delete it, **Then** it is refused with
   the name of the routine, until it is removed from the routine.

---

### User Story 6 - Mistakes are fixable (Priority: P3)

Fingers slip. The user can change or remove a set in the open workout, discard a workout they started by
mistake after confirming, delete a finished workout from the history with an undo, and correct a weight or
repetitions in a finished workout.

**Why this priority**: Protects the log from typos without slowing the main flow.

**Independent Test**: Log a set with a wrong weight, change it; discard an open workout after confirming;
delete a finished workout and undo within a few seconds.

**Acceptance Scenarios**:

1. **Given** a set in the open workout, **When** the user edits or removes it, **Then** the workout reflects it
   and records are recomputed.
2. **Given** an open workout, **When** the user chooses to discard it, **Then** a confirmation is required and
   nothing is saved if they confirm.
3. **Given** a finished workout, **When** the user deletes it, **Then** it disappears and a short undo brings
   it back exactly.
4. **Given** a finished workout, **When** the user corrects a set's weight or repetitions, **Then** the change
   is saved and the records are recomputed from the whole history.

---

### Edge Cases

- A workout left open for hours or days: it stays open, its timer keeps counting from the real start, and the
  user can finish or discard it; the app never ends it on its own.
- A weight of zero (bodyweight exercises) is allowed; a decimal weight such as 22.5 is allowed; repetitions
  are whole numbers of at least 1.
- Two exercises with the same name: the app treats names as the same exercise ignoring case and extra spaces.
- Only one workout can be open at a time; starting a second asks the user to finish or discard the first.
- The device clock changes while a workout is open: durations never go negative and the app shows what it can.
- No storage available, or storage full: the app tells the user that the workout will not be kept, exactly as
  it does for other data.
- Very long history (two years of near-daily workouts): opening the history and finding records stays fast.
- Offline: everything works; there is nothing to sync and nothing is sent anywhere.
- Device storage cleared by the user or the browser: the history is lost; the app says clearly that this data
  lives only on this device.
- Screen readers and one-handed use: every control has a name and large tap targets; text and numbers stay
  correct in right-to-left layout with Latin digits for weights and repetitions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The workout page MUST be a tab of its own, named "تمارين", in the app's bottom bar, reachable at
  any time and without leaving an open workout (switching tabs MUST NOT close it).
- **FR-002**: The user MUST be able to start a workout; only one MAY be open at a time; an open workout MUST
  survive closing the app, a locked screen and a reload, with everything entered so far.
- **FR-003**: The user MUST be able to add exercises to the open workout, from the exercise list or by naming
  a new one.
- **FR-004**: For each exercise the user MUST be able to add, change and remove sets, each with a weight in
  kilograms (0 up to 999.9, decimals allowed) and whole repetitions (1 up to 999).
- **FR-005**: A set MUST be saved as done only when the user marks it done by tapping, and only with both a
  weight and repetitions; marking a set done MUST NOT change anything else in the app.
- **FR-006**: Each set row MUST show the values from the most recent earlier workout that had the same
  exercise, matched by set number, when they exist.
- **FR-007**: Marking a set done MUST start a rest timer from a default duration the user can change and the
  app remembers on the device; the user MUST be able to skip it and add time.
- **FR-008**: When a rest timer ends while the app is open, the app MUST alert the user (vibration where
  available, and a sound the user can turn off) and show that it ended; the app MUST NOT need notification
  permission, a network, or a server.
- **FR-009**: A workout timer MUST show the time since the workout was started; both timers MUST show the
  true time after the screen locks or the app is reopened, because they are based on stored start times and
  not on a running counter.
- **FR-010**: Finishing a workout MUST save it to the history with its date, duration, exercises and sets; a
  workout with no done set MUST NOT be saved as finished (the user can discard it).
- **FR-011**: The history MUST list finished workouts newest first and let the user open each to see all its
  exercises and sets, delete it with a short undo, and correct a set's weight or repetitions.
- **FR-012**: For each exercise the app MUST compute the best weight (heaviest set) and the best repetitions
  (most repetitions in one set) over the whole history, show them with their dates, and mark a set as a record
  when it beats every earlier set of that exercise; records MUST be recomputed after any edit or delete.
- **FR-013**: The exercise list MUST offer a generic starter list of about 30 common exercises with English
  names, a search box, the user's own exercises, and a way to browse the whole list at any time; an exercise
  with history, or one used by a routine, MUST NOT be deletable.
- **FR-019**: The user MUST be able to create routines with a name of their choice (no fixed split is imposed)
  and an ordered list of exercises, each with a planned number of sets (1 to 20), and rename, edit, reorder, and
  delete them.
- **FR-020**: Starting a workout MUST offer an empty workout and each routine; starting from a routine MUST
  add all its exercises in order, each with its planned number of empty set rows and the previous values (FR-006),
  and MUST NOT
  change the routine afterwards.
- **FR-021**: Routines MUST be stored only on the device with the rest of the workout data and MUST NOT affect
  the schedule, tasks or settings (Principles II and III).
- **FR-014**: All workout data MUST be stored only on the device and MUST work offline; nothing MUST be sent
  anywhere (constitution Principle III).
- **FR-015**: The feature MUST NOT mark any schedule block, task, or course module as done, and MUST NOT
  create or change any schedule block, task or setting on its own, in any case (Principle II); the workout log
  is a separate record the user keeps by hand.
- **FR-016**: The repository MUST contain no real person's exercises, weights, or workouts: the starter list
  and all examples are generic (Principle VI).
- **FR-017**: The page MUST be usable one-handed on a phone-width screen: tap targets of at least 44 pixels,
  numbers entered with a numeric keypad, and no horizontal scroll, using the app's existing look and design
  tokens.
- **FR-018**: Weights MUST always be shown in kilograms.

### Key Entities

- **Routine**: a name chosen by the user and an ordered list of exercises with a planned number of sets each; a
  template for starting a workout.
- **Exercise**: a name (from the starter list or the user's own); has history if any workout used it.
- **Set**: a weight in kilograms and repetitions, belonging to one exercise in one workout, done or not yet.
- **Workout**: a start time, an end time once finished, an ordered list of exercises each with its sets; open or
  finished.
- **Rest timer**: a default duration (a setting kept on the device) and the running state of the current rest.
- **Record**: for one exercise, the best weight and the best repetitions with the date each was reached.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can log a repeated set (same exercise, same weight and repetitions as the previous set)
  in at most 3 taps and under 5 seconds.
- **SC-002**: In 100% of tested cases, the previous values shown for a set row equal the values of the same
  exercise and set number in the most recent earlier workout that had it.
- **SC-003**: After locking the phone for 1 minute, the rest timer and the workout timer are correct to within
  1 second when the app is reopened, in 100% of tested cases.
- **SC-004**: An open workout is never lost: after closing and reopening the app, 100% of its entered sets are
  still there.
- **SC-005**: Records (best weight and best repetitions per exercise, and the sets marked as records) match an
  independent calculation in 100% of 300 generated histories.
- **SC-006**: With two years of near-daily workouts, the history and an exercise's records open in under 1
  second on a mid-range phone.
- **SC-007**: The feature makes 0 network requests, works in airplane mode, and changes no schedule block,
  task, module or setting in 100% of tested cases.
- **SC-008**: The workout page fits a 375-pixel-wide screen with no horizontal scroll.
- **SC-009**: Starting a workout from a routine adds all of its exercises, in order, with last time's values, in
  one tap, in 100% of tested routines; and the routine is unchanged afterwards in 100% of cases.

## Assumptions

- The look and the flow follow the owner's reference screenshots of the Strong app, to be supplied; this spec
  describes behavior only and is re-checked against the screenshots at planning, which may adjust screens but
  not the rules above.
- Weights are in kilograms only; there is no pound mode. Weight steps follow common plates (the field
  accepts any value in 0.5 steps and decimals).
- The default rest duration is 90 seconds and the add-time button adds 15 seconds.
- Records are per exercise and based on the whole history; they are recomputed from the history, not stored
  as separate truth.
- Charts and graphs, exporting data, and syncing between devices are out of scope for this feature; they can
  follow as separate features. Routines are in scope (US5) but stay simple: a name and an ordered list of
  exercises with a number of sets each (changed 2026-10-14 with the owner, after the Strong screenshots), with no
  planned weights or rest times per routine.
- The starter list names are in English. The language of an exercise name is the user's choice for their own
  exercises; this can be revisited if the owner prefers Arabic names.
- The app cannot make a sound or vibrate while the browser is in the background or the screen is locked on
  some phones (notably iPhone); in that case the user sees the finished or overrun rest time when they come
  back, which is the accurate behavior this spec promises.
- Independent of the schedule, tasks, settings and prayer features; it needs only a place to keep its own
  data on the device, separate from the existing progress and settings.
