# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user today: the owner, a second-year Computer Science student at Cairo University who also works a 5-hour part-time job (Saturday to Thursday, Friday off), is taking an online course (Arab Automators, n8n and AI automation) as the main target for this period, goes to the gym, and memorizes Quran with a weekly recitation (تسميع) with a sheikh.

Later: other students, each with their own schedule. Nothing is built for that yet; the current schedule is hardcoded for the owner.

## Product Purpose

Keep one person's day balanced between university attendance, study, the course, work, gym, Quran and personal time, so nothing quietly eats the others. Success is the planned blocks actually getting done, with the course finished on its target date and university study not falling behind.

## Positioning

A personal day planner built around the Egyptian student's real day: Arabic and right-to-left, Egyptian dialect, prayer times computed for Giza that move the schedule with them (gym between Maghrib and Isha, recitation after Isha), and a course tracker that sits next to the university timetable instead of in a separate app.

## Operating Context

- Used mostly on the phone outdoors in daylight, many short opens through the day to tick off finished blocks, and at night to review how the day went.
- Also opened on a laptop.
- Installed to the home screen as a PWA from GitHub Pages and expected to work offline.
- The day runs roughly 7:00 to 1:00 at night; the app treats the day as ending at 1:00.

## Capabilities and Constraints

- Tabs: Today (timeline with check-offs, prayer times, main-course target card, day progress), Week (shape of the week, planned vs done hours, per-subject study), Course (main course modules by week, add new courses from a template, pick the main course), Tasks (one-off tasks with due dates, weekly fixed appointments).
- Schedule is defined in code (`src/planner.html`, `SCHED`), with two variants per day that switch when Maghrib moves across 5:45pm (the clocks change at the end of October).
- Progress lives on the device (localStorage); the claude.ai artifact copy syncs through the account instead. Copies do not share progress.
- Schedule changes: small ones happen inside the app (skip a block for a day, add a one-off block); bigger ones are made through Claude in the repo.
- Single self-contained HTML file, no build step beyond `tools/build.py` inlining libraries and fonts. Libraries: Preact + htm, adhan (Egyptian General Authority of Survey method).
- Midterm dates are unknown (expected late November or December).

## Brand Commitments

- Name: ميزان يومي (binding). Short name on the home screen: ميزان. Icon: the guilloche rosette on oxblood (changed in the October redesign; the owner kept only the name as binding).
- Avoid: Islamic ornament as decoration, neon or glow, anything that reads as a corporate app.
- Language: Egyptian colloquial Arabic for all UI copy; course and subject names stay in English as the university writes them.

## Evidence on Hand

- The real university timetable (Fall 2026), the Arab Automators table of contents (9 modules plus 2 bonus), the owner's work hours, gym days and recitation times, all already encoded in `src/planner.html`.
- No users other than the owner yet. No testimonials or usage data; do not invent any.

## Product Principles

1. The day must fit honestly: every block has real time, and work, prayer and sleep are not squeezed to make the plan look complete.
2. Ticking a block off should take one tap, from the phone, in the middle of the day.
3. The main course stays visible as the target without crowding out university study.
4. The owner's private progress never leaves the device unless they choose a synced copy.
5. Built for one person now, but nothing should make it impossible for another student to bring their own schedule later.
