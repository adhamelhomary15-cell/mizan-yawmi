# UI Contract: Workout Log

The app has no external API. This contract is the visible behaviour of the new tab. It is **provisional** until
checked against the owner's Strong screenshots (research R14): the rules below are fixed, the arrangement of
controls may change. Copy is Egyptian Arabic, right-to-left, with Latin digits for numbers in `<bdi>`; the
starter exercise names are English. Existing design tokens only; no new colours.

## The tab

- New bottom-bar tab «تمارين», after «المهام» and before «الإعدادات». Switching tabs never closes an open
  workout. Entering the tab with an open workout shows that workout.

## Home (no open workout)

- «ابدأ تمرينة فاضية» and one button per routine («ابدأ <اسم الروتين>»).
- Links: «السجل», «التمارين», «الروتينات».
- If a workout is open instead: a banner «تمرينة شغّالة منذ m:ss» that opens it.

## Open workout

- Header: the workout timer (`m:ss`, `h:mm:ss` after an hour), «خلّص» and «إلغاء التمرينة».
- Each exercise card: its name, a row per set with: set number, previous values (`<kg> × <reps>` or a dash),
  weight input, reps input, a done button (check). Buttons under the card: «ضيف مجموعة» and «شيل التمرين».
- «ضيف تمرين» opens the exercise picker (search box, starter and own exercises, «ضيف تمرين جديد» for a name that
  is not in the list).
- Tapping the done button with a valid weight and repetitions saves the set as done and starts the rest
  timer; with a missing field it marks the field and does nothing else. Tapping a done set again makes it
  not done and does not start a timer.
- Weight input: `inputmode="decimal"`, repetitions input: `inputmode="numeric"`; Latin and Arabic-Indic digits
  accepted; each input at least 44 px tall.

## Rest timer

- A bar fixed above the bottom bar while a rest runs: «راحة m:ss» counting down, «+15 ث», «تخطّي».
- At zero: vibration where supported, a short beep if sound is on, and the bar says «خلصت الراحة» and then
  counts the overrun as `+m:ss` until dismissed or the next set is done.
- A small control in the workout header sets the default rest (10 to 600 seconds, steps of 15) and the sound
  switch; both are remembered.

## Finish

- «خلّص» opens a confirmation: «N مجموعة · M تمرين · المدة …»; if unfinished sets will be dropped it says how many.
  Disabled with a message if there is no done set. Confirming saves the workout and returns to Home.
- «إلغاء التمرينة» always asks «متأكد؟» and nothing is saved if confirmed.

## History

- Finished workouts newest first: date, duration, number of exercises and sets, routine name if any.
- A workout opens to all its exercises and sets; sets that are records carry a small mark («رقم قياسي» with
  wording for weight or repetitions). Each set can be corrected (weight, repetitions); «امسح التمرينة» deletes it
  with the app's existing 7-second undo toast.

## Exercises

- A searchable list of every exercise (starter first, then own). Tapping one shows its best weight and best
  repetitions with their dates, and its finished workouts.
- «ضيف تمرين» for a new name; own exercises with no history and in no routine show «امسح».
  Otherwise the reason is shown (history, or the routine's name).

## Routines

- A list with «روتين جديد». A routine has a name and an ordered list of exercises chosen from the list; rename,
  add, remove, move up and down, delete. «ابدأ» on a routine starts a workout from it.

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
