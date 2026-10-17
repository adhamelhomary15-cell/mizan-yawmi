---

description: "Task list for feature 014: build and edit the schedule in the app"
---

# Tasks: Build and Edit the Schedule in the App

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: `tools/check-schedule.js` with `--self-test` in CI, plus E2E in `tests/e2e/schedule.spec.js`.

## Binding rules

- Nothing changes progress, tasks or workouts. No mark is made or cleared.
- Every save passes `validateSettings` and goes through the `settings` store.
- Fields and days the editor does not edit are saved back exactly as they were.
- The device location is asked for only on a tap, and never sent. The app downloads nothing.
- Show the diff before each commit. Run `node tools/check-private.js` with the files staged, and commit only on
  `RESULT: clean`.

---

## Phase 1: Rules and prayer times for any place (all stories)

- [x] T001 Create `src/app/13a-schedule-rules.js` (`// start of schedule rules` … `// end of schedule rules`), listed
  in `ORDER` after `13-rules.js`. It holds the draft operations from plan.md:
  - `draftOf`, `isTwoVersionDay`;
  - `setBlock`, `addBlock`, `removeBlock`, `copyDay`;
  - `setAnchor`;
  - `setKind`;
  - `addSubject`, `renameSubject`, `subjectUses`, `removeSubject`;
  - `placeOf` and `COUNTRY_METHOD`;
  - `WEEK_TEMPLATES` and `weekFromTemplate`;
  - `newSettings`;
  - `changesBetween`.
- [x] T002 [P] Create `tools/check-schedule.js` with the checks and mutations from plan.md. Add a «Schedule rules» step
  to CI.
- [x] T003 In `04-prayers.js`, add `prayerTimesFor(place, iso)`, which takes `location`, `prayerMethod` and
  `timezone`. Rewrite `prayers(iso)` on top of it, keeping its cache. Parity must be 0.

## Phase 2: City data (US1)

- [x] T004 Create `tools/make-cities.py`, a dev-only script that is run by hand and never by CI or the build. It:
  - downloads GeoNames `cities15000.zip`, `alternateNamesV2.zip` and `countryInfo.txt` once, into a scratch folder
    outside the repo;
  - keeps the 57 OIC member states, and in them every capital plus the bigger cities, with the size threshold chosen
    so the file stays under 100 KB;
  - uses Arabic names (`ar`, preferred names first), and falls back to the English name;
  - writes `tools/vendor/cities/cities.json` as `[{ar, en, cc, lat, lng, tz}]`, sorted, with coordinates rounded to
    4 places.
- [x] T005 Add `tools/vendor/cities/NOTICE.md` (source, download date, CC BY 4.0, what was changed). In
  `tools/build.py`, inline the file into `const CITIES = [];`. `check-schedule.js` checks that:
  - every city has a valid time zone and coordinates;
  - every country code is in `COUNTRY_METHOD` or gets the default;
  - the file is under 100 KB.

## Phase 3: The editor (US2, US3, US4)

- [x] T006 [US2] Create `src/app/14b-editor-view.js`:
  - a day picker, the day's blocks, and a block form (start, kind, title, detail, subject);
  - add, remove, and «انسخ اليوم ده» with target days;
  - a live preview with `layoutDay` and `prayerTimesFor`;
  - two-version days read-only, with the line from the spec.
- [x] T007 [US3] In the block form, add «اربطه بالصلاة» (prayer, before or after, minutes 0–180). Keep any `absorb`
  and show it. The preview shows the `nofit` notice.
- [x] T008 [US4] Add «الأنواع» (label, long, track, postpone, free for the 9 kinds) and «المواد» (add, rename, remove
  with the uses listed).
- [x] T009 [US2] Saving:
  - `validateSettings` errors are mapped to their lines, in Egyptian Arabic;
  - the summary from `changesBetween`, with the past-days line;
  - an `savedAt` changed by another tab is detected;
  - `saveStore('settings')`, then reload;
  - leaving with changes asks first.

  Add «عدّل الجدول» in Settings, with Settings keeping a `main | guide | editor` screen state. Browser at 375 px.
  **Commit** phases 1 to 3 together, because `check-code` refuses rules that nothing uses.
  - 2026-10-17: phases 1 to 4 are committed together. The guide is the only user of `placeOf`, `nearestCity` and
    `newSettings`, so `check-code` refused committing without it.
  - Bugs found in the browser and fixed:
    - the block form updated from a stale copy of its state, so quick changes undid each other. It now always
      starts from the latest state, and the draft takes a function too;
    - city search did not put exact names first.
  - Browser at 375 px:
    - edit, add after midnight (24:30), and copy a day;
    - a refused save names its line;
    - a prayer tie, and its nofit notice;
    - a kind renamed, and a subject in use refused;
    - save and reload;
    - the draft is kept across tabs;
    - the guide, from empty storage to a saved Cairo week with subjects;
    - search in Arabic and English, and leaving the guide stores nothing.
  - Device location is left for E2E, where Playwright can grant or refuse it.

## Phase 4: The guide (US1)

- [x] T010 [US1] Create `src/app/14a-guide-view.js`:
  - place: search over the cities in Arabic or English, «استخدم موقعي» (15-second timeout), manual coordinates, and
    the next prayers shown;
  - a week template;
  - subjects;
  - then the editor with the new draft.
- [x] T011 [US1] Add «اعمل جدولك» to the example notice in `21-shell.js`, opening Settings in the guide. Leaving the
  guide before saving stores nothing. Browser at 375 px. **Commit**.

## Phase 5: Export (US5)

- [x] T012 [US5] Take `downloadText(name, text)` out of `downloadBackup`, and have the backup use it. Add «صدّر جدولي
  كملف», which saves `mizan-settings-<date>.json`. **Commit**.

## Phase 6: Tests, docs and ship

- [x] T013 Write `tests/e2e/schedule.spec.js`:
  - the guide with a fixed city;
  - geolocation granted and refused;
  - edit, copy and save;
  - a refused save;
  - a prayer tie on a summer date and a winter date;
  - export, then import.

  Every E2E test stays green.
- [x] T014 [P] Update the README (making and editing the schedule, the city list and its license) and PRODUCT. In the
  review, note B1 as still open.
- [x] T015 Tick the tasks, push, and open the PR. Merge when the owner asks.

## Summary

- Total: 15 tasks.
  - Rules: 3.
  - Cities: 2.
  - Editor: 4.
  - Guide: 2.
  - Export: 1.
  - Ship: 3.
- MVP: Phases 1 to 3 (the editor), then the guide.
