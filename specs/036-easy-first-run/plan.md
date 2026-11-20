# Implementation Plan: An Easier First Run

**Branch**: `036-easy-first-run` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

## Summary

The guide becomes two steps (place, week) and can store the schedule itself: «ابدأ» runs the editor's checks and
storing, then opens «اليوم»; «عدّل الأيام الأول» keeps today's path into the editor. The place step suggests the
largest listed cities in the device's time zone, from a size rank added once to the bundled city list. One pure rule,
`citiesInZone(cities, tz, max)`, picks them, inside the existing `schedule rules` block and its check.

## Technical Context

- **Language**: the app script (`src/app/*.js`); a few CSS lines in `src/planner.html`; the dev script
  `tools/make-cities.py` (Python, run by hand).
- **Data**: `tools/vendor/cities/cities.json` gains `rank` per city (1 = most people, over the whole list). Nothing
  new is stored on the device.
- **Network**: one download by hand, approved by the owner on 2026-11-21: GeoNames `cities15000.zip`, into a scratch
  folder outside the repo, read with `py -I`. The Arabic names in the list do not change, so `alternateNamesV2.zip` is
  not needed. The app downloads nothing.
- **Tests**: `tools/check-schedule.js` (new cases and mutations for `citiesInZone`, and `rank` in the city list
  check); E2E in `tests/e2e/schedule.spec.js` and `tests/e2e/day-bounds.spec.js` updated, new
  `tests/e2e/first-run.spec.js`; every other check and parity.
- **Constraints**: no library, no runtime network, no file over 600 lines; the city list stays under 100 KB.

## Constitution Check (v3.0.1)

| Principle | Status |
|---|---|
| I. Human review | The owner approved the spec, the download, and running to the PR (2026-11-21). |
| II. Checking off is human | No mark is read or written; starting a schedule keeps every mark. |
| III. Data stays on the device | No runtime network; the time zone is read on the device; location still only on tap. |
| IV. Honest, offline day | Same settings object as the guide makes today; parity 0. |
| V. Simple, single file | One small rule, one field in the city list, the guide's steps rearranged. |
| VI. General repo | No personal value; the city list is public GeoNames data. |

## Decisions (research)

1. **Rank, not population**: the list keeps a rank (1, 2, 3…) by population over all 724 cities, enough to order
   any zone's cities and smaller than the numbers. `make-cities.py` writes it from now on.
2. **Adding the rank without changing names**: a scratch script (not kept) reads `cities15000.txt` and matches each
   listed city by country, English name and rounded coordinates, the same fields `make-cities.py` wrote. Every city
   must match exactly once, or the script stops and nothing is written.
3. **The rule**: `citiesInZone(cities, tz, max)` returns the cities whose `tz` is exactly `tz`, by rank, at most `max`
   (6); `[]` for a missing zone or `UTC`. It sits in the `schedule rules` block beside `nearestCity`.
4. **The device zone** comes from `deviceZone()`, already in the guide.
5. **Saving from the guide** uses the editor's own pieces: `validateSettings`, `saveStore('settings',
   settingsToSave(...))`, then the Settings screen's `settingsChanged('اتحفظ الجدول', 'today')`. A refused save shows
   the editor's message. Over a stored schedule (`!LOADED.isExample`), «ابدأ» first shows a confirmation.
6. **The week step**: templates as radio lines, then a `<details>` «تفاصيل اختيارية» holding `DayFields` and the
   subjects, folded. Bad day hours disable both buttons, as `التالي` is disabled today.
7. **Copy**: steps «1 من 2: إنت فين؟» and «2 من 2: أسبوعك شكله إيه؟»; suggestions headed «قريبة منك»; buttons «ابدأ»
   (primary) and «عدّل الأيام الأول»; confirmation «ده هيبدّل جدولك الحالي. علاماتك بتفضل زي ما هي.» with
   «أيوه، ابدأ» and «لأ».

## Design

- **`tools/make-cities.py`**: writes `rank`; docstring updated.
- **`tools/vendor/cities/cities.json`** and **`NOTICE.md`**: `rank` added; the notice records the new download.
- **`src/app/13a-schedule-rules.js`**: `citiesInZone`.
- **`src/app/14a-guide-view.js`**: suggestions in `PlacePicker`; `Guide` in two steps with «ابدأ» and the
  confirmation.
- **`src/app/15-settings-view.js`**: passes `onStarted` to `Guide`.
- **`src/planner.html`**: spacing for the suggestions if the existing classes do not cover it.
- **`tools/check-schedule.js`**: cases and mutations; README's guide lines.

### Tests

- **`tools/check-schedule.js`**: a zone's cities in rank order, cut at 6; another zone excluded; `UTC` and an unknown
  zone give none; the real list: every city has a unique rank, and Africa/Cairo starts with Cairo. Mutations: the
  rank order dropped; the cut dropped; a near zone accepted.
- **`tests/e2e/first-run.spec.js`** (time zone Africa/Cairo): suggestions show and one tap sets the place; «ابدأ»
  with no typing stores the schedule and opens «اليوم»; a reload keeps it; «عدّل الأيام الأول» opens the editor and
  stores nothing; over a stored schedule the confirmation shows and «لأ» stores nothing; storage refused keeps the
  guide with the message; bad day hours disable both buttons; a zone with no city shows no suggestions; 375 px no
  sideways scroll.
- **`schedule.spec.js`, `day-bounds.spec.js`**: the guide flow updated to two steps.

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | Two steps and «ابدأ» | US1, US3 | Every check; parity 0; guide E2E |
| 2 | City rank, the rule, the suggestions | US2 | Every check; city list under 100 KB |
| 3 | E2E, README, ticks | all | Full E2E; a look at 375 px; `check-private` clean |
