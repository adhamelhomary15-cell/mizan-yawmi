# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone who wants to plan one person's day across several commitments, such as classes, study, work, courses,
exercise, and a personal routine. Each person makes their own schedule in the app (a short guide, then an editor) or
brings it as a settings file; the app ships only a generic example week.

Nothing in the public repository describes a real person. A person's own schedule and details stay in their
local settings file, on their own device.

## Product Purpose

Keep one person's day balanced across their commitments, so nothing quietly eats the others. Success is the
planned blocks actually getting done, and deadlines (a course target, a term) being met without other
commitments falling behind.

## Positioning

A personal day planner with prayer times that move the schedule with them, Arabic and right-to-left by default,
Egyptian dialect copy, and a course tracker that sits next to the daily timetable instead of in a separate app.
The prayer location and method come from the user's settings, not from a fixed city: a built-in, offline list of the
cities of the 57 OIC member states (GeoNames, CC BY 4.0), the device location on a tap, or typed coordinates.

## Operating Context

- Used mostly on a phone outdoors in daylight, many short opens through the day to tick off finished blocks, and
  at night to review how the day went.
- Also opened on a laptop.
- Installed to the home screen as a PWA from GitHub Pages and expected to work offline.
- The day runs until 1:00 at night; the app treats the day as ending at 1:00.

## Capabilities and Constraints

- Tabs: Today (timeline with check-offs, prayer times, main-course target card, day progress, and an end-of-day
  review where open blocks of kinds marked postponable, and tasks due that day, can be postponed into the next
  free time, with a proposal the user confirms or changes and one undo; after a day ends with open items, Today
  asks on its own, with the proposed places, and moves nothing until the user taps), Week (shape of the
  week, planned vs done hours, per-subject study), Course (main course modules by week, add new courses from a
  template, pick the main course), Tasks (one-off tasks with due dates, weekly fixed appointments; both can be edited in place, with undo; tasks can also be pasted in bulk from any AI's answer in a fixed line format, with a preview and one undo),
  Workouts (a gym log in kilograms: sets with last time's values, rest and workout timers, user-named splits
  with planned set counts, history by month with best set, volume and records, and fixing or deleting a finished
  workout with undo; kept under its own key, separate from progress and settings), Settings
  (what is in use; a first-run guide (place, a week template, subjects) and a schedule editor: blocks with a day
  preview, copying a day, ties to a prayer, renaming the 9 kinds, adding up to 12 kinds of the user's own (a name, one of six ready colours, its options and its half of the balance; deleted only when no block uses it), subjects and place, all on a draft that is checked
  and summarised before it is saved; export the schedule as a settings file; import a settings file, reset to the example, save a backup file of all the data to the
  device and restore it after a preview, all or nothing, and whether the browser agreed to keep the data; the look: light, dark or automatic (following the phone, the
  default), and one of four palettes (oxblood, the default, olive, navy, graphite) that change only the frame and
  the ground, with a soft fade; kept on the device under its own key, outside the settings, the progress and the
  backup). If the browser refuses to save a change to progress, a notice on every tab says so and offers a backup
  of what is on screen, until a later save succeeds. Every save also goes to a second copy on the device (IndexedDB), and the first
  save of each day keeps a snapshot of the last 7 days; a wiped or damaged copy comes back on its own, and a day can
  be restored from Settings with the same preview as a backup file. Stored data carries a version and is brought
  forward on update without loss; broken entries are set aside, never deleted.
- The schedule, subjects, category labels, course plan, rules text, time zone, prayer location and method, the
  day-version rule, and language all come from a settings object: the stored settings file if there is one,
  otherwise the embedded example. Settings are read once per page, so saving the schedule reloads it. The day's start
  and end are a setting (07:00 to 01:00 by default), and a two-version day is edited only in the file. Past days keep
  the week they had: saving, importing or going back to the example starts the new week today and keeps the earlier
  weeks, only the days that changed, for at least a year; names, kinds, place and day bounds are always the current ones. A day can have two versions that switch by a prayer-time threshold, and a block can be tied to a prayer
  (for example 30 minutes before Maghrib) so it follows the real prayer time all year; the anchor can name a later
  block that takes the shift, so the rest of the evening keeps its times and free time is not squeezed.
- Progress (ticks, tasks, added courses) lives on the device (localStorage) under its own key, separate from the
  settings. Importing, replacing, or resetting settings never touches progress.
- Single self-contained HTML file; `tools/build.py` inlines libraries and fonts. Libraries: Preact + htm, adhan
  (prayer times).
- A settings file is validated before use (format, version, sizes, ids); a bad file changes nothing.

## Brand Commitments

- Name: ميزان يومي (binding). Short name on the home screen: ميزان. Icon: the guilloche rosette on oxblood.
- Avoid: religious ornament as decoration, neon or glow, anything that reads as a corporate app.
- Language: Egyptian colloquial Arabic for UI copy by default; the language is a setting.

## Evidence on Hand

- A generic example week and the settings format (`settings.example.json`), checked by `tools/check-settings.js`.
- No usage data or testimonials; do not invent any.

## Product Principles

1. The day must fit honestly: every block has real time, and work, prayer and sleep are not squeezed to make the
   plan look complete.
2. Ticking a block off should take one tap, from the phone, in the middle of the day.
3. The main course stays visible as the target without crowding out the rest of the day.
4. A person's private progress and settings never leave the device unless they choose a synced copy.
5. The public app stays general: anyone can bring their own schedule, and no one's personal data is in the repo.
