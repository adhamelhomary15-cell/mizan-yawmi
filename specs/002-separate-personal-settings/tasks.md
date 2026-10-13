---

description: "Task list for 002 separate personal settings from the public app"
---

# Tasks: Separate Personal Settings from the Public App

**Input**: Design documents from `/specs/002-separate-personal-settings/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/settings-file.md, contracts/tools-and-ui.md, quickstart.md

**Tests**: The spec asks for measurable checks, not a test framework, and the repo has none. Verification is three dev-only Node scripts (settings validator, parity, privacy) plus the manual quickstart. No test framework is added (constitution Principle V).

**Organization**: Grouped by user story. The seven phases in plan.md map as: plan phases 1-2 = Setup + Foundational, plan phase 3 = US1, plan phase 4 = US2, plan phases 5-6 = US3, US4 = error handling refinements, plan phase 7 = Polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (new person sees a working example), US2 (import my own settings), US3 (no personal data left in the repo), US4 (bad files are safe and clear)

## Rules for every task

- Stop and show the owner a diff or result at each **Checkpoint** (Principle I). Tasks marked **NEEDS APPROVAL** do not start without the owner's explicit go-ahead.
- Edit `src/planner.html` only for app code; never hand-edit `index.html`, `sw.js`, `manifest.webmanifest`, or icons (Principle V).
- No task writes `checks`, `extras`, or any done state (Principle II), makes a network call (Principle III), or adds a personal value to a tracked file (Principle VI). Personal values live only in the ignored private folder; never print them in output, logs, commits, or PR text.
- Python is not on the PATH here; run it by its full path (`C:\Users\User\AppData\Local\Python\pythoncore-3.14-64\python.exe`).
- Commit after each phase on branch `002-separate-personal-settings`; push or open a PR only when the owner asks.

---

## Phase 1: Setup (safety first)

**Purpose**: Make accidents impossible and keep a copy of "before".

- [x] T001 Save the current built logic for the parity check: write `git show f989b91:src/planner.html` to `.private/old.html` (local, untracked). Record the commit hash `f989b91` in `specs/002-separate-personal-settings/research.md` under "Parity baseline"
- [x] T002 Add ignore rules to `.gitignore`: the private folder (`.private/`) and local settings files (`*.settings.local.json`). Run `git check-ignore -v` on a sample path under each rule and `git status` to confirm nothing private is listed; the plan's constitution constraint requires the settings file to be listed in `.gitignore`

**Checkpoint**: `.private/` and local settings files are ignored by the tracked `.gitignore`.

---

## Phase 2: Foundational (blocks all user stories)

**Purpose**: Define the settings format, validator, example, and the tools that prove nothing is lost. Adds capability only; app behavior is unchanged.

- [x] T003 Add the generic example settings to `src/planner.html` as a `<script type="application/json" id="example-settings">` block: format `"mizan-settings"`, version `1`, `name` starting with "Example", a sample time zone and location (a generic public city), the default prayer method, `language: "ar"`, all nine category ids with generic labels, a few generic subjects, a generic week for weekdays 0-6 (one day may use the `{A, B}` two-version form), generic rules, and one generic course. No real person's data
- [x] T004 In `src/planner.html` add `validateSettings(obj)` returning `{ok, settings, errors, warnings}` and implementing data-model.md: `format` exactly "mizan-settings"; `version` 1 (a larger value rejected as "made for a newer version"); `name` 1-60 characters; `language` default "ar" (one of the supported values); `timezone` a valid IANA time zone name (checked with the platform's date formatter); `location` `{lat, lng, label?}` with `lat` in -90..90 and `lng` in -180..180; `prayerMethod` default "Egyptian" and one of the method names the bundled prayer library exposes; `categories` keys from the fixed set, labels 1-30 characters; `subjects` id 1-8 characters to name 1-60 characters; `week` keys "0".."6", each Day with optional `note` at most 500 characters and `blocks` as one array of Block or `{A, B}`; Block `[start, category, title, detail?, subject?]` where `start` is "HH:MM" 00:00-24:59 ascending, `category` a key of `categories`, `title` 1-120 characters, `detail` at most 300 characters, `subject` a key of `subjects`; `rules` each 1-300 characters, at most 20; Course `name` 1-80 and `sub` 0-160 characters, `plan` items with `from <= to` ISO dates; unknown top-level fields produce a warning, not an error. The function is pure (no storage, no DOM) so Node can extract it
- [x] T005 Create `tools/check-settings.js`: extracts `validateSettings` and the embedded example from `src/planner.html` (same extraction pattern as `tools/check-phase.js`), supports `node tools/check-settings.js [file]` (default: the embedded example), `--write-example` (writes `settings.example.json`), and `--self-test` (builds deliberately bad inputs in memory: empty, non-JSON, wrong `format`, `version: 99`, unknown category in a block, bad time zone, over 1 MB, and expects each to be rejected). Exit codes 0 valid, 1 invalid, 2 usage, per contracts/tools-and-ui.md
- [x] T006 Run `node tools/check-settings.js` and `node tools/check-settings.js --self-test`; both must exit 0. Then run `node tools/check-settings.js --write-example` and review `settings.example.json` for any personal value before it is committed
- [x] T007 Generate the owner's settings file locally, never tracked: write a one-off script `.private/make-settings.js` that reads the current data constants out of `.private/old.html` (the schedule, subjects, course plan, rules, category labels, task tags, time zone, location, method, and the day-version fallback rule) and writes `.private/settings.json` in the new format. Do not print its contents. Validate it with `node tools/check-settings.js .private/settings.json` (exit 0)
- [x] T008 Create `tools/check-parity.js` per contracts/tools-and-ui.md: `--old <html> --new <html> --settings <file> [--from YYYY-MM-DD --days N]` (defaults: today, 366 days). Load the day-plan logic from the old build, and from the new build with the settings applied; compare for every date the blocks (start, end, category, title, detail, subject, key), plus the course plan and the rules text. Print only counts and the first differences by date and index (never full personal text). Exit 0 when 0 differences, 1 otherwise
- [x] T009 Harness sanity: run `node tools/check-parity.js --old .private/old.html --new .private/old.html` (old against old); expect 0 differences. Then introduce one deliberate difference in a temporary copy and confirm the script exits 1 (negative control)

**Checkpoint**: Format, validator, example, owner's file, and parity harness exist and pass; the app is unchanged. Owner reviews `settings.example.json` and the validator diff.

---

## Phase 3: User Story 1 - A new person opens the public app and it just works (Priority: P1) 🎯 MVP

**Goal**: The app runs entirely from a settings object: the embedded example when nothing is stored, with no personal data needed (FR-001, FR-002, FR-014).

**Independent Test**: Open the app with empty site data: a full example week shows, labelled "Example", every tab works, ticks persist.

### Implementation for User Story 1

- [x] T010 [US1] In `src/planner.html` add the settings loader: read the key `mizan-settings-v1` from storage inside try/catch; if absent, use the embedded example; if present but failing `validateSettings` (corrupt or from a future format), use the example and flag a notice, and do not delete the stored value (data-model.md "State transitions"). Expose the active settings and whether it is the example
- [x] T011 [US1] In `src/planner.html` replace the hard-coded week data with the settings' `week`: derive the schedule lookup used by `blocksFor` (about line 647) from `settings.week`, supporting both the single-array and `{A, B}` forms exactly as today, and keep the block key format `time + '-' + category` unchanged
- [x] T012 [US1] In `src/planner.html` derive `CATS` labels, the subject list, `TASK_TAGS`, and `RULES` from settings (`categories`, `subjects`, `taskTags`, `rules`); replace the UI sentences that name a category or a subject directly (the balance card, week view labels, per-subject heading, the empty-state text near the end of the file) so they use the category labels from settings instead of fixed words
- [x] T013 [US1] In `src/planner.html` derive the built-in course (`COURSE`, `PLAN`, `builtinCourse`, `MAIN_NAME` usage in `showTitle`) from `settings.course`; if `course` is absent, the Course tab shows only user-added courses without error
- [x] T014 [US1] In `src/planner.html` take the time zone (the formatter near line 588), the prayer location and method (near line 615), the day-version rule (`phaseFor`: prayer, threshold minutes, and the `versions.fallback` range or the token `last-thursday-october`; absent means a day's first version), and `language` (document `lang`, `dir` right-to-left for right-to-left languages) from settings
- [x] T015 [US1] In `src/planner.html` show a visible "Example" label on Today and in the header area whenever the example is the active settings, using the existing `.install`/`.notice` banner pattern and existing design tokens only
- [x] T016 [US1] Run parity: `node tools/check-parity.js --old .private/old.html --new src/planner.html --settings .private/settings.json`; expect 0 differences over 366 days plus course and rules. Fix any difference in the wiring (never by editing the settings file by hand)
- [x] T017 [US1] Run quickstart.md section 3 (example for a new person) on a phone-width viewport; confirm no console errors, ticks persist after reload, and `checks` is unchanged by loading settings

**Checkpoint**: US1 works on its own and the parity check passes. Owner reviews the diff. Personal data is still in the file at this point; removal is Phase 5.

---

## Phase 4: User Story 2 - I import my own settings once and the app becomes mine (Priority: P1)

**Goal**: A user imports a settings file once; it is stored and used offline, progress untouched (FR-003, FR-004, FR-005, FR-007, FR-013).

**Independent Test**: Import a valid file on a device showing the example: the imported schedule shows after the reload, survives a reload and offline mode, and the stored progress is byte-identical.

### Implementation for User Story 2

- [ ] T018 [US2] In `src/planner.html` add a settings button reachable from every tab (header area) and a `SettingsView` showing the active settings: "Example" or the file's `name`, and its `version`, per contracts/tools-and-ui.md; use existing design tokens and Egyptian Arabic copy
- [ ] T019 [US2] In `src/planner.html` add import: a file picker (`.json`), reject files over 1 MB before reading, read with the browser file reader, run `validateSettings`, show a summary (number of days and blocks, course name if any, language, location label) and ask to confirm replacing; on confirm write only the key `mizan-settings-v1` and reload. Render all file text as text, never as HTML. No network call
- [ ] T020 [US2] In `src/planner.html` add reset: after confirmation remove only the key `mizan-settings-v1`, then reload to the example. It must not touch the progress key
- [ ] T021 [US2] In `src/planner.html` highlight the settings button with a short hint while the example is active (FR-015), and remove the hint once a file is imported
- [ ] T022 [US2] Run quickstart.md sections 4 and 7: import `.private/settings.json` in the browser, reload, switch the browser offline and reload; confirm the imported schedule persists, no file is asked for again, no network request is made, and the progress object is byte-identical before and after import, replace, and reset

**Checkpoint**: US2 works on its own. This is a safe release point: the app can run the example or the imported file, and nothing has been removed yet.

---

## Phase 5: User Story 3 - No personal data is left in the public repo (Priority: P2)

**Goal**: Tracked files and the built output contain no personal data, and a repeatable check proves it (FR-009, FR-010, SC-005, SC-007).

**Independent Test**: `node tools/check-private.js` exits 0: the file is ignored and untracked, and 0 of its values appear in tracked files and the built output.

### Implementation for User Story 3

- [ ] T023 [US3] Create `tools/check-private.js` per contracts/tools-and-ui.md and research.md R6: default settings file `.private/settings.json` (override with `--settings`); verify the file exists, `git check-ignore` reports it ignored, and `git ls-files --error-unmatch` reports it untracked; collect its string values of at least 4 characters, skipping values that also appear in the example and a short generic-word list; search the contents of every file from `git ls-files` (skipping `tools/vendor` binaries and fonts) and `index.html`; print only the file path and a count per file, never the value; exit 0 clean, 1 on any hit, 2 if the settings file is missing
- [ ] T024 [US3] Baseline and negative control: run `node tools/check-private.js` now (before removal); it is expected to exit 1 because tracked files still hold personal data, and the hit counts per tracked file (counts only, no values) go into `specs/002-separate-personal-settings/research.md` under "Privacy baseline". To prove the check can fail, also run it on a clean scratch copy of the repo that has no hits except one value planted in a scratch file, confirm exit 1 naming only that file, and delete the scratch copy
- [ ] T025 [US3] **NEEDS APPROVAL**: Remove personal documents from tracked files. Show the owner the list of tracked files with hits (from T024's baseline) and get a go-ahead per file group, then move the personal planning documents and the previous feature's spec artifacts into `.private/archive/` and `git rm` them from the repo. Git history is not rewritten
- [ ] T026 [US3] **NEEDS APPROVAL**: Rewrite the product notes, readme, and agent rules as general documents (describe the general planner, the settings file, the example, and the privacy rule; no personal routine, institution, employer, or location). Check `DESIGN.md` and the design critique files under `.impeccable/` against T024's hits and generalize or remove only what the privacy check flags
- [ ] T027 [US3] **NEEDS APPROVAL** and only after T016 (parity) passed and `.private/settings.json` is backed up: delete the old hard-coded personal data constants from `src/planner.html` (the schedule and its shared head arrays and notes, subject map, course and plan, rules text, task tags values, day-version fallback dates), leaving the app reading everything from settings, and the embedded example as the only data in the file
- [ ] T028 [P] [US3] In `tools/check-phase.js` read the location, time zone, and prayer method from a settings file argument (default: `settings.example.json`) instead of fixed values, and run it with `--settings .private/settings.json` for the owner's real values
- [ ] T029 [US3] Run `node tools/check-private.js` and fix each remaining hit in a tracked file (generalize the text, or move the file into `.private/`), repeating until it exits 0. Do not edit the private file to make the check pass
- [ ] T030 [US3] Run `tools/build.py` with the full Python path, revert unrelated regenerated icon files (`git checkout`), then run `node tools/check-private.js` again: it must report 0 hits in tracked files and in the built `index.html`, and confirm the built app with empty storage shows only the example (quickstart sections 3, 6, 8)

**Checkpoint**: Tracked files and the built app are free of personal data; privacy check passes. Owner reviews the removal diff before anything is pushed.

---

## Phase 6: User Story 4 - Mistakes in the settings file are safe and clear (Priority: P3)

**Goal**: A bad file changes nothing and the message says what is wrong (FR-006, SC-006).

**Independent Test**: Import a broken file, an empty file, and a newer-version file: each shows a clear message; settings in use and progress are unchanged.

### Implementation for User Story 4

- [ ] T031 [US4] In `src/planner.html` map validator results to plain Egyptian Arabic messages per contracts/settings-file.md "Import rules": not JSON/empty/wrong `format` ("this is not a settings file"), `version` too high ("made for a newer version of the app"), a required field missing or invalid (name the field, show the first 5 problems), unknown category or subject id in a block (name the day and block), file over 1 MB ("file too large"). Show messages in a polite live region and move focus to it
- [ ] T032 [US4] In `src/planner.html` show unknown top-level fields as a warning (ignored, never executed) and, when the stored settings fail validation at startup, show a one-time notice that the example is in use, without deleting the stored value
- [ ] T033 [US4] Run quickstart.md sections 1 and 5: the `--self-test` cases, then import a broken, an empty, and a newer-version file in the browser; confirm each shows a message and that stored settings and the progress object are unchanged; then reset and confirm the example returns with progress kept

**Checkpoint**: All four user stories pass independently.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and shipping.

- [ ] T034 Run the whole quickstart.md against the rebuilt `index.html` on a phone-width viewport and, by the owner, on a real phone offline: import the owner's file on each device right after the deploy (FR-015). Record results in `specs/002-separate-personal-settings/research.md` under "Final verification"
- [ ] T035 After this feature merges, run `/speckit-constitution` to strike the Transitional Exception from the constitution (a separate amendment; this task only reminds, it does not edit the constitution here)
- [ ] T036 Tick every finished task in this file, commit each phase with a clear message on branch `002-separate-personal-settings`, and report results to the owner. Open or update a PR only when the owner asks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: none; T002 before anything that creates `.private/` files.
- **Phase 2 (Foundational)**: needs Phase 1. Blocks all user stories. T004 before T005-T007; T007 before T008-T009.
- **Phase 3 (US1)**: needs Phase 2. T010 before T011-T014; T015 after T010; T016 after T011-T014.
- **Phase 4 (US2)**: needs Phase 3 (T010 and the derived constants). T018 before T019-T021.
- **Phase 5 (US3)**: T023-T024 can start after Phase 2; **T025-T027 need explicit approval and T016 passing**; T027 is the only step that removes in-code data and must come after T016 and the owner's backup of `.private/settings.json`; T029-T030 last.
- **Phase 6 (US4)**: needs Phase 4 (T019). Can run before or after Phase 5.
- **Phase 7 (Polish)**: needs all desired stories complete.

### Within a story

- US1: T010 → T011, T012, T013, T014 (same file, do in order) → T015 → T016 → T017.
- US2: T018 → T019 → T020 → T021 → T022.
- US3: T023 → T024 → T025 → T026 → T027 → T029 → T030; T028 in parallel after T023.
- US4: T031 → T032 → T033.

### Parallel Opportunities

- T028 (`tools/check-phase.js`) is independent of the `src/planner.html` edits.
- T023 (`tools/check-private.js`) and T005 (`tools/check-settings.js`) are different files and can be written in parallel.
- Phase 6 (US4) can run in parallel with Phase 5 if two people work, since it touches the importer, not the data removal.

## Implementation Strategy

### MVP first (Foundational + US1 + US2)

1. Phases 1-2: format, validator, example, owner's file, parity harness.
2. Phase 3: app runs from settings (parity = 0).
3. Phase 4: import UI.
4. **Stop and validate**: the app works with the example and with an imported file, and nothing was removed. This is a safe release point.

### Incremental delivery

1. MVP above → ship (the owner can import and everything works; personal data still in code).
2. US3 → remove personal data after approval; ship; the owner imports on each device right after.
3. US4 → polish error handling.
4. Strike the constitution's Transitional Exception (T035).

## Notes

- 36 tasks: Setup 2, Foundational 7 (T003-T009), US1 8 (T010-T017), US2 5 (T018-T022), US3 8 (T023-T030), US4 3 (T031-T033), Polish 3 (T034-T036).
- The three **NEEDS APPROVAL** tasks (T025-T027) are the only destructive ones; nothing is deleted before the parity check passes.
- After the removal deploys, a device shows only the example until the owner imports their file (spec FR-015); prepare the file and import on each device straight after the deploy.
