# Implementation Plan: Separate Personal Settings from the Public App

**Branch**: `002-separate-personal-settings` | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-separate-personal-settings/spec.md`

## Summary

Today the app's data (week schedule, subjects, course plan, rules text, category words, prayer
location and time zone) is hard-coded in `src/planner.html`, so the public repo carries one
person's life. This plan moves all of it into a **settings object** that the app loads at start:

1. The app ships a generic **example settings** object (embedded in the single HTML file).
2. A user imports their own **settings file** once; it is validated, stored on the device under its
   own storage key, and used from then on (offline, no file needed again).
3. All owner-specific data is removed from tracked files, and a **privacy check** proves it.

The owner's own file is generated locally from the current code *before* anything is removed, and a
**parity check** proves the new app with that file produces the same day plans as today's app.
Progress (ticks, tasks) keeps its existing storage key and is never touched.

## Technical Context

**Language/Version**: JavaScript (browser, inline in one HTML file); Node (dev-only check scripts); Python 3 only for `tools/build.py`

**Primary Dependencies**: Preact 10.26.4 + hooks, htm 3.1.1, adhan 4.4.3 (vendored). No new dependencies

**Storage**: `localStorage` — progress stays under its current key (`fall26-planner-v1`, shape `{v:1,...}`); settings go under a **new** key (`mizan-settings-v1`). Separate keys because `normalize()` drops unknown fields from the progress object and because reset/import must never touch progress

**Testing**: Node scripts in `tools/` (no test framework added): `check-settings.js` (validator + example), `check-parity.js` (old vs new day plans), `check-private.js` (privacy). Browser checks at phone width and offline per quickstart.md

**Target Platform**: Installed PWA on phone (main) and laptop browsers, offline-capable

**Project Type**: Single-file web app (PWA)

**Performance Goals**: Settings load and validation add no visible delay; app opens in under 5 seconds on a mid-range phone (SC-001)

**Constraints**: Offline; no network calls; settings never leave the device; Egyptian Arabic RTL default UI (language value is stored and applied to `lang`/`dir`, new languages out of scope); single HTML file

**Scale/Scope**: One user per device; a settings file of about 20–60 KB (7 days × up to 2 versions × ~15 blocks, plus course plan and text); roughly 15 constants/areas in `src/planner.html` to turn into settings-driven values

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How this plan satisfies it |
|---|---|---|
| I. Human review before any AI action | Pass | Plan only; each phase ends at a checkpoint and nothing in `src/` changes without approval. Removing existing data from tracked files is listed as its own phase needing explicit go-ahead |
| II. Checking off is a human act | Pass | Import, replace and reset never write `checks`; parity and quickstart steps compare `checks` before and after |
| III. Private progress stays on device | Pass | Settings are read from a local file picked by the user and stored locally; no network; separate key from progress |
| IV. Honest, offline-capable day | Pass | Prayer method and location come from settings (default method kept); everything works offline after import; example is self-contained in the HTML |
| V. Simple, single-file, Arabic default | Pass | Still one HTML file; the example is an embedded JSON block; language is a setting (default Arabic RTL). New dev scripts are optional and not shipped |
| VI. General public repo, private settings | Pass (this feature implements it) | Example only in the repo; personal file kept in an ignored location; privacy check enforces; transitional exception ends when removal merges |

Post-design re-check: all pass. The one deliberate trade-off is that the app shows only the example
on a device until the file is imported (spec FR-015), instead of a transitional carry-over, because
a carry-over would embed personal data in tracked code.

## Phases

Seven small phases; each is committable and reversible alone, and ends with a gate. Each needs the
owner's go-ahead (Principle I).

| # | Phase | Touches | Gate |
|---|---|---|---|
| 1 | **Format, validator, example**: define the settings format, write `validateSettings`, embed the generic example, add `tools/check-settings.js` | `src/planner.html` (new, unused code), `tools/check-settings.js` | Example passes the validator; bad files are rejected with the messages in the contract; app behavior unchanged |
| 2 | **Owner's file and parity harness**: generate the owner's settings file locally from the current code into the ignored private folder; add `tools/check-parity.js` | `.private/` (local, untracked), `tools/check-parity.js` | The owner's file passes the validator; harness runs old-vs-old with 0 differences (harness sanity) |
| 3 | **Wire the app to settings**: load from storage or example, derive the data constants, replace hard-coded category words in UI text, take time zone, location and method from settings | `src/planner.html` | Parity check: new app + owner's file = old app for every date in a year (0 differences). New app + example shows the example |
| 4 | **Import UI**: settings area, file picker, error messages, replace summary, reset, "example" label | `src/planner.html` | Quickstart sections for US1, US2, US4 pass on a phone-width viewport |
| 5 | **Privacy check and ignore rules**: `tools/check-private.js`, `.gitignore` entries for the private folder and local settings file | `tools/check-private.js`, `.gitignore` | Check passes on clean tree; fails when a value is planted in a tracked file (negative control) |
| 6 | **Remove personal data from tracked files** (needs explicit approval): replace the in-code data with the example, make the product/agent/readme text general, move the first feature's spec and the planning doc out of tracked files, make the check script's location a setting | `src/planner.html`, docs and specs, `tools/check-phase.js`, rebuilt files | Privacy check reports 0 matches in tracked files and in the built output |
| 7 | **Build, verify, ship**: rebuild, full quickstart (offline, phone), owner imports their file on their devices before merging | generated files via build | All quickstart steps pass; transitional exception can be struck from the constitution |

Notes:
- Phases 1-5 add capability without removing anything, so any of them can be released safely.
- Phase 6 is the only destructive one; it comes after the parity check proves nothing is lost.
- The owner must import their file on each device right after the Phase 7 deploy (spec FR-015).

## Project Structure

### Documentation (this feature)

```text
specs/002-separate-personal-settings/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── settings-file.md     # the settings file format
│   └── tools-and-ui.md     # import UI + check scripts contract
└── tasks.md                 # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
src/planner.html          # edit: embedded example, validator, settings loading, import UI
tools/
├── build.py              # unchanged (rebuild after edits)
├── check-settings.js     # new: validate a settings file / the embedded example; write the sample file
├── check-parity.js       # new: compare day plans from two builds across dates
└── check-private.js      # new: privacy check
settings.example.json     # new, tracked: generic sample, generated from the embedded example
.gitignore                # edit: ignore the private folder and local settings files
.private/                 # local only, untracked: the owner's file and parked documents
index.html, sw.js, ...    # regenerated by build.py (never hand-edited)
```

**Structure Decision**: Keep the single-file app. The example lives inside `src/planner.html` as one
JSON block so there is a single source; `settings.example.json` is generated from it for users to copy.

## Complexity Tracking

No constitution violations to justify. Three dev-only Node scripts are added; none is shipped or
needed to run the app, and each backs a measurable success criterion (SC-005, SC-006, SC-007 and the
parity guarantee).
