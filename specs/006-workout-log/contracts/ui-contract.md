# UI Contract: Workout Log

The app has no external API. This contract is the visible behaviour of the new tab. It was checked against the
owner's six Strong screenshots (research R14, task T009): the rules below did not change, the arrangement of
screens did. Copy is Egyptian Arabic, right-to-left, with Latin digits for numbers in `<bdi>`; the starter
exercise names are English. Existing design tokens only; no new colours. The screenshots show Strong in the
phone's Arabic-Indic digits; this app keeps Latin digits (as everywhere else in it).

## What the screenshots changed

| # | Strong screenshot shows | This contract |
|---|---|---|
| 1 | Separate bottom tabs: Workout, History, Exercises | One bottom tab «تمارين» with a three-part switch at its top: «تمرين» · «السجل» · «التمارين» (the tab bar already has six items) |
| 2 | Workout screen: quick start button, then "My Templates" as cards (name, first exercises, last date) | Home: «ابدأ تمرينة فاضية», then «روتيناتي» as cards: name, first exercises, date of last use |
| 3 | Tapping a template opens a page: "Last performed", the exercises with set counts, a wide START button | Routine page: «آخر مرة: <تاريخ>», the exercises in order by name (no set counts: a routine plans no sets, per the spec), wide «ابدأ التمرينة» |
| 4 | Open workout is full screen, top bar: FINISH, workout timer, rest-timer button | Same header: «خلّص», the workout timer, a stopwatch button for the rest setting; the three-part switch is hidden while a workout is open (the app's own bottom bar stays) |
| 5 | Set row order: check, reps, kg, previous, set number | Right to left in our layout: set number, previous, weight, reps, done (the same order, mirrored) |
| 6 | Rest shown as a separator row under the set just done (`2:00`), and on the add button "ADD SET (2:00)" | Same: a thin row under the set just done holds the countdown, «+15 ث» and «تخطّي»; the add button shows the current rest «ضيف مجموعة (1:30)» |
| 7 | History grouped by month with the workout count; each card: name, date and time, a two-column table (best set, exercises with set count), and a footer with record count, total volume and duration | History as in the screenshot (see below). Needs two small derived values, `bestSet` and `volumeOf` |
| 8 | A `⋯` menu on the workout and on each exercise | `⋯` menus: on the workout «إلغاء التمرينة»; on an exercise «شيل التمرين» |

## The tab

- New bottom-bar tab «تمارين», after «المهام» and before «الإعدادات». Switching tabs never closes an open
  workout. Entering the tab with an open workout shows that workout.
- A three-part switch at the top of the tab: «تمرين» (Home), «السجل» (History), «التمارين» (Exercises). It is
  hidden while a workout is open. Routines live on «تمرين», as in the screenshot.

## Home (no open workout)

- «ابدأ تمرينة فاضية», a primary button.
- «روتيناتي (N)»: a card per routine with its name, its first exercises as text (cut with an ellipsis), the date
  it was last used, and a `⋯` menu (rename, edit, delete). A «+ روتين جديد» button. Tapping a card opens the
  routine page.
- If a workout is open instead: a banner «تمرينة شغّالة منذ m:ss» that opens it.

## Routine page

- Name, «آخر مرة: <تاريخ>» (or nothing if never used), the exercises in order by name, and a wide
  «ابدأ التمرينة». Editing: rename, add, remove, move up and down, delete. It plans nothing (no planned sets,
  weights or times, as in the spec).

## Open workout

- Header: «خلّص», the workout timer (`m:ss`, `h:mm:ss` after an hour), and a stopwatch button that opens the rest
  setting. The title is the routine's name or «تمرينة», with a `⋯` menu: «إلغاء التمرينة».
- Each exercise: its name as a heading with a `⋯` menu («شيل التمرين»), a column header row, a row per set:
  set number, previous values (`<kg> × <reps>` or a dash), weight input, reps input, a done button (check).
  Under the rows: «ضيف مجموعة (m:ss)».
- «ضيف تمرين» at the end opens the exercise picker (search box, starter and own exercises, «ضيف تمرين جديد»
  for a name that is not in the list).
- Tapping the done button with a valid weight and repetitions saves the set as done and starts the rest
  timer; with a missing field it marks the field and does nothing else. Tapping a done set again makes it
  not done and does not start a timer.
- Weight input: `inputmode="decimal"`, repetitions input: `inputmode="numeric"`; Latin and Arabic-Indic digits
  accepted; each input at least 44 px tall.

## Rest timer

- A thin row under the set just done: «راحة m:ss» counting down, «+15 ث», «تخطّي». The same remaining time shows
  small beside the workout timer in the header, so it stays visible when the set has scrolled away.
- At zero, only while the page is visible and only if the rest ended less than 10 seconds ago (so reopening
  the app long after never beeps): vibration where supported, a short beep if sound is on, and the row says «خلصت الراحة» and then
  counts the overrun as `+m:ss` until dismissed or the next set is done.
- The stopwatch button in the header sets the default rest (10 to 600 seconds, steps of 15) and the sound
  switch; both are remembered.

## Finish

- «خلّص» opens a confirmation: «N مجموعة · M تمرين · المدة …»; if unfinished sets will be dropped it says how many.
  Disabled with a message if there is no done set. Confirming saves the workout and returns to Home.
- «إلغاء التمرينة» always asks «متأكد؟» and nothing is saved if confirmed.
- Every confirmation closes with Escape, which is the same as the safe choice.

## History

- Finished workouts newest first, grouped by month: a month heading with «N تمرينة».
- A card per workout: name (routine name or «تمرينة»), date and time, then two columns: «أفضل مجموعة» as
  `<kg> × <reps>` and «المجموعات» as `<عدد> × <اسم التمرين>`, one row per exercise. Footer: the record count
  («N رقم قياسي»), the total volume in kg, and the duration.
- **Best set** of an exercise in a workout: the highest weight; on a tie, the higher repetitions. **Volume**:
  the sum of weight × repetitions over the done sets, shown as a whole number of kg.
- Tapping a card opens the workout: all its exercises and sets; sets that are records carry a small mark
  («رقم قياسي» with wording for weight or repetitions). Each set can be corrected (weight, repetitions);
  «امسح التمرينة» deletes it with the app's existing 7-second undo toast.

## Exercises

- A searchable list of every exercise (starter first, then own). Tapping one shows its best weight and best
  repetitions with their dates, and its finished workouts.
- «ضيف تمرين» for a new name; own exercises with no history and in no routine show «امسح».
  Otherwise the reason is shown (history, or the routine's name).

## Seen in the screenshots and not part of this feature

Each of these appears in Strong and is not in the spec; none is built unless the owner asks for it as a change
to the spec first.

- A drop-set mark (`D`) on a set and a set type column.
- A muscle-group label under each exercise, and a picture per exercise (a picture needs files in the repo).
- A rest time per exercise (here one default rest for the whole app).
- Weighted or bodyweight exercises shown as «+60 kg».
- Example routines shipped with the app (the starter list is names only), the Measure tab, the Profile tab.

## Messages (short, Egyptian Arabic)

| Case | Text |
|---|---|
| Missing weight or repetitions | «اكتب الوزن» / «اكتب التكرارات» |
| Weight out of range | «الوزن من 0 لـ 999.9» |
| Repetitions out of range | «التكرارات من 1 لـ 999» |
| A workout is already open | «فيه تمرينة شغّالة. خلّصها أو الغيها الأول» |
| Finish with no done set | «سجّل مجموعة واحدة على الأقل» |
| Name already used | «الاسم ده موجود» |
| Exercise cannot be deleted | «التمرين ده ليه سجل» / «التمرين ده في روتين: <اسم>» |
| Storage unavailable | the app's existing warning that changes are not kept |

## Guarantees (testable)

1. Nothing in this tab reads or writes the progress store, the schedule, tasks, modules or settings.
2. A set is done only after the user's tap with valid numbers.
3. Both timers are computed from stored start times, so they are true after a lock, a reload or a closed app.
4. An open workout is restored exactly after a reload.
5. Records shown always equal a fresh calculation over the whole history.
6. No network request, no notification permission; the wake lock, vibration and sound are feature-detected and
   optional.
