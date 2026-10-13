# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone who wants to plan one person's day across several commitments, such as classes, study, work, courses,
exercise, and a personal routine. Each person brings their own schedule as a settings file; the app ships only a
generic example week.

Nothing in the public repository describes a real person. A person's own schedule and details stay in their
local settings file, on their own device.

## Product Purpose

Keep one person's day balanced across their commitments, so nothing quietly eats the others. Success is the
planned blocks actually getting done, and deadlines (a course target, a term) being met without other
commitments falling behind.

## Positioning

A personal day planner with prayer times that move the schedule with them, Arabic and right-to-left by default,
Egyptian dialect copy, and a course tracker that sits next to the daily timetable instead of in a separate app.
The prayer location and method come from the user's settings, not from a fixed city.

## Operating Context

- Used mostly on a phone outdoors in daylight, many short opens through the day to tick off finished blocks, and
  at night to review how the day went.
- Also opened on a laptop.
- Installed to the home screen as a PWA from GitHub Pages and expected to work offline.
- The day runs until 1:00 at night; the app treats the day as ending at 1:00.

## Capabilities and Constraints

- Tabs: Today (timeline with check-offs, prayer times, main-course target card, day progress), Week (shape of the
  week, planned vs done hours, per-subject study), Course (main course modules by week, add new courses from a
  template, pick the main course), Tasks (one-off tasks with due dates, weekly fixed appointments; both can be edited in place, with undo), Settings
  (what is in use, import a settings file, reset to the example).
- The schedule, subjects, category labels, course plan, rules text, time zone, prayer location and method, the
  day-version rule, and language all come from a settings object: the stored settings file if there is one,
  otherwise the embedded example. A day can have two versions that switch by a prayer-time threshold.
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
