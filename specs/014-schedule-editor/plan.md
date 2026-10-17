# Implementation Plan: Build and Edit the Schedule in the App

**Branch**: `014-schedule-editor` | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

## Summary

- The schedule editor and the first-run guide are new screens inside Settings.
- They work on a **draft**: a deep copy of the settings. Every change goes through small pure functions, which keep
  everything they do not touch exactly as it was.
- «احفظ الجدول» checks the draft with `validateSettings`, saves it through the storage path's `settings` store, and
  opens the app again, the same way an import does.
- The guide picks a place from a vendored city list, the device location, or coordinates, and a starting week from
  generic templates.
- «صدّر جدولي كملف» saves the settings as a file.
- The pure parts get a new rules block and a dev check. The screens get end-to-end tests.

## Technical Context

- Preact and htm, in the same single file, with no new runtime library. The parts are ordered by `src/app/ORDER`.
- Settings are read once when the page opens (B3 stays). Saving reloads the page, like an import.
- The preview lays a day out with the app's own `layoutDay`. It needs prayer times for the **draft's** place, which in
  the guide may differ from the current one. So `04-prayers.js` gets `prayerTimesFor(place, iso)`, and the current
  `prayers(iso)` becomes `prayerTimesFor(CFG, iso)` with its cache. Nothing else changes.
- The accepted prayer methods are the `METHODS` list in `validateSettings`.

## Constitution Check (v2.0.1)

| Principle | Status |
|---|---|
| I. Human review | The city data download, and adding it to the repo, wait for the owner's yes (see the decision below). |
| II. Checking off is human | The editor never touches progress. Ticks keep their keys, and the summary explains how past days look. |
| III. Data stays on the device | `navigator.geolocation` is asked only on a tap and used only on the device. Nothing is sent. |
| IV. Offline | The city list is inlined, so the guide works offline. |
| V. Simple, single file | Three new parts and one vendored data file. No new library. |
| VI. General repo | The templates and the city list are generic. The owner's settings never enter the repo. |

## Design

### Rules block: `src/app/13a-schedule-rules.js` (pure, tested by `tools/check-schedule.js`)

Each function takes a draft and returns a **new** draft. Its input is never changed, and every field it does not
touch is kept.

- `draftOf(settings)`: a deep copy.
- `isTwoVersionDay(draft, day)`: whether that day has `blocks` as `{A, B}`.
- Blocks (only on one-version days):
  - `setBlock(draft, day, i, fields)`: change a block; the list is then sorted by start time.
  - `addBlock(draft, day, block)`;
  - `removeBlock(draft, day, i)`;
  - `copyDay(draft, from, toDays)`.
- `setAnchor(draft, day, i, anchor | null)`: writes `{prayer, dir, min}`. An existing `absorb` is kept when the same
  block stays anchored, and dropped only if the anchor is removed.
- Kinds and subjects:
  - `setKind(draft, id, fields)`, for `label`, `long`, `track`, `postpone` and `free`. The id never changes.
  - `addSubject`, `renameSubject`, and `subjectUses(draft, id)`, which lists the `[day, i]` places that use a subject.
  - `removeSubject`, which refuses while `subjectUses` is not empty.
- `placeOf(city)`: returns `{location: {lat, lng, label}, timezone, prayerMethod}`. The method comes from the city's
  country through a small `COUNTRY_METHOD` table (for example EG → Egyptian, SA → UmmAlQura, AE → Dubai, KW → Kuwait,
  QA → Qatar, PK/IN/BD → Karachi, TR → Turkey, IR → Tehran, MY/SG/ID → Singapore, US/CA → NorthAmerica), with
  `MuslimWorldLeague` for every other country.
- `WEEK_TEMPLATES`: «طالب», «طالب وبيشتغل» and «فاضي». Generic titles, using the 9 kinds.
  `weekFromTemplate(id)` returns a `week`.
- `newSettings(place, templateId, subjects)`: a full settings object for the guide. It uses the format's defaults for
  the kinds, and `name` is «جدولي».
- `changesBetween(before, after)`: one line per changed day («الاتنين: 2 بلوك اتغيروا»), plus kinds, subjects and place.
  It feeds the save summary.

**The check**, `tools/check-schedule.js`, works on generated settings and the example. It checks that:
- every function keeps every field it does not touch, unknown fields included;
- two-version days come back byte for byte;
- `copyDay` changes only the target days;
- the order stays sorted, and duplicate starts are refused;
- kind ids never change;
- a subject in use cannot be removed;
- each template and `newSettings` pass `validateSettings`;
- an export imported again gives the same week (`JSON.stringify` equal after `validateSettings`).

`--self-test` mutations:
- `copyDay` writes every day;
- `setKind` renames the id;
- `removeSubject` ignores uses;
- an unknown field is dropped;
- a two-version day is rewritten.

### City data: **decision for the owner**

The source is **GeoNames**, licensed **CC BY 4.0** (attribution required). It is the standard open source of city
coordinates and time zones, and it has Arabic names.

A dev-only script, `tools/make-cities.py`, downloads `cities15000.zip` and the Arabic names (`alternateNamesV2`,
language `ar`) **once**. It keeps:
- every country capital;
- every city above 500,000 people;
- every city above 100,000 in Arab countries.

That is about 400 cities. For each it writes `{ar, en, country, lat, lng, tz}` to
`tools/vendor/cities/cities.json`, about 40 KB, with a `NOTICE.md` that gives the source, the date and the license.
`tools/build.py` inlines it the same way it inlines the drawings names. The app never downloads anything.

The download is a few hundred MB, needed only to make the file, and it runs on this machine. **It needs the owner's
yes.** The alternative is a short hand-made list (about 60 cities) with coordinates typed in. That needs no
download and no license, but it is less accurate and has far fewer cities.

### Screens

- **`14a-guide-view.js`** (US1): three steps (place, week, subjects), then it hands the draft to the editor.
  - The place step has:
    - a search box over the city list, matching Arabic or English;
    - «استخدم موقعي», which calls `navigator.geolocation.getCurrentPosition` with a 15-second timeout, low accuracy,
      and the device time zone from `Intl`;
    - two manual fields for coordinates.
  - The next prayer times show for the chosen place.
- **`14b-editor-view.js`** (US2–US4): a day picker, the day's blocks, a block form, «انسخ اليوم ده», «الأنواع»,
  «المواد», and a preview using `layoutDay` with `prayerTimesFor(draft, nextDateOf(day))`.
  - Errors from `validateSettings` are mapped to the line they name and written in Egyptian Arabic.
  - Leaving with changes asks first.
  - Saving shows `changesBetween` and the past-days line, then saves and reloads.
  - If the stored settings' `savedAt` changed since the editor opened, saving says so and offers to reload.
- **Entry points:**
  - the example notice in the shell gets «اعمل جدولك»;
  - Settings gets «عدّل الجدول» and «صدّر جدولي كملف».

  Settings keeps a small screen state (`main | guide | editor`).
- **Export (US5):** a `downloadText(name, text)` helper is taken out of `downloadBackup`, which now uses it. The export
  saves `mizan-settings-<date>.json`.

### Tests

- `tools/check-schedule.js` in CI.
- E2E, in `tests/e2e/schedule.spec.js`:
  - the guide, from no settings to a saved week, with a fixed city and no network;
  - a block edited, a day copied, and the save;
  - a refused save that names its line;
  - a prayer tie that follows Maghrib on a summer date and a winter date;
  - export, then import;
  - geolocation granted and refused, through Playwright's `geolocation` and `permissions`.

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | Rules block, `check-schedule.js`, and `prayerTimesFor` | all | All checks green; mutations caught |
| 2 | City data (after the owner's choice above) | US1 | `cities.json` with its license; the build inlines it; size under 100 KB |
| 3 | The editor: blocks, preview, save, refusals, two-version days, kinds, subjects, prayer tie | US2–US4 | Browser at 375 px; E2E |
| 4 | The guide, and its entry from the example notice | US1 | E2E from no settings |
| 5 | Export, and `downloadText` | US5 | Round-trip E2E |
| 6 | Docs (README, PRODUCT), and the review: B1 noted as still open | — | — |

`check-code` refuses code that nothing uses. So phases 1 and 2 are committed together with phase 3, which uses the
rules, as in 013.

## Risks

- **Past days change** when the week changes. That is today's behaviour after an import, and the save summary says
  it. Keeping old weeks is a separate feature (owner informed, 2026-10-17).
- **Accuracy of the city coordinates:** GeoNames gives a city's centre. Prayer times vary by about a minute across a
  big city, which is acceptable, and a user can still type their own coordinates.
