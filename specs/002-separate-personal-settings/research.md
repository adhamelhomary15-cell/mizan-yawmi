# Research: Separate Personal Settings

No open unknowns in the spec. These are the design decisions, with what was checked in
`src/planner.html`.

## R1. What is personal data in the code today?

- **Decision**: Everything below becomes settings-driven; nothing stays in tracked code.
- **Evidence** (names of constants only; usage counts from the file):
  - `SCHED` (week schedule with optional two versions per day, plus the per-day note) and the
    shared day-head arrays and `GYM_NOTE` used to build it.
  - `SUBJ` (subject names), `COURSE` and `PLAN` (a built-in course and its weekly module plan),
    `RULES` (rule-of-thumb text), `TASK_TAGS`.
  - `CATS` (category labels) and several UI sentences that name categories directly
    (balance card, week view, empty states), so they must derive from the category labels.
  - Prayer location and method: `new adhan.Coordinates(...)` and `CalculationMethod.Egyptian()`
    near line 615; time zone: `cairoFmt` with a fixed time zone near line 588.
  - A hard-coded fallback range for the day-version rule (feature 001).
- **Also personal outside the app file**: the product notes, parts of the agent rules, the readme,
  the planning doc, the first feature's spec/plan/tasks, the phase check script (hard-coded
  coordinates), the design critiques under `.impeccable/`, and the built `index.html`.

## R2. Where do imported settings live on the device?

- **Decision**: `localStorage` under a **new key** (`mizan-settings-v1`), separate from progress.
- **Rationale**: `normalize()` (the progress loader) returns only known fields, so adding settings to
  the progress object would need changes there and would tie reset/import to progress. Separate keys
  make "import/replace/reset never touches progress" (FR-005) true by construction.
- **Alternatives considered**: Inside the progress object (rejected: risk to progress, synced copy
  would carry personal settings); IndexedDB (rejected: more code, no benefit at 20-60 KB);
  Cache storage (rejected: not meant for user data).

## R3. How does the app switch to imported settings?

- **Decision**: Validate the file, store it, then **reload the page**. Startup reads the stored
  settings (or the embedded example) once and derives the data constants before the UI renders.
- **Rationale**: The data constants are read at many places (`SCHED` 3 references, `CATS` 11, etc.),
  so making them reactive would be a large change. A reload after a one-time import is simple and
  safe, and import happens rarely.
- **Alternatives considered**: Making all data reactive state (rejected: large risk of regressions
  for no user benefit).

## R4. Single source for the example

- **Decision**: The example is one `<script type="application/json">` block inside `src/planner.html`.
  `tools/check-settings.js` extracts it, validates it, and can write `settings.example.json` for users.
- **Rationale**: One source stays consistent with the single-file design (Principle V); the sample
  file in the repo cannot drift from what the app shows.
- **Alternatives considered**: Separate example file fetched at runtime (rejected: needs network or a
  second cached file, and breaks the self-contained build).

## R5. Proving nothing changes for the owner

- **Decision**: A parity script, `tools/check-parity.js`, that loads two builds of the app logic (old
  from git history, new from the working tree), applies the owner's file to the new one, and compares
  the day plans (blocks, times, categories, titles) for every date over a full year, plus the course
  plan and the rules text. Must report 0 differences before any data is removed.
- **Rationale**: Removing data from code is the only destructive step; a date-by-date comparison is
  the strongest cheap guarantee, and the same approach was used for the day-version check in
  feature 001 (extract the functions from the HTML and run them in Node).
- **Alternatives considered**: Manual spot checks (rejected: cannot cover a year and 7 weekdays with
  two versions).

## R6. The privacy check

- **Decision**: `tools/check-private.js` reads the local settings file (default location in the ignored
  private folder, overridable by an argument), collects its string values of at least 4 characters
  (skipping values that also appear in the example and a small list of generic words), and searches
  the contents of every tracked file (`git ls-files`) and the built output for them. It also checks
  that the file is ignored (`git check-ignore`) and untracked (`git ls-files --error-unmatch`).
  Exit 1 on any hit.
- **Rationale**: Directly verifies SC-005/SC-007 without the check itself holding personal values,
  because it reads them from the ignored file at run time.
- **Limits**: It finds exact string matches only; a paraphrase of personal data is not detected.
  A negative control (plant a value, expect a failure) is part of the quickstart.

## R7. Language and category vocabulary

- **Decision**: The settings carry a `language` value that sets the document `lang`, and `dir` is
  `rtl` for right-to-left languages. The app's fixed UI strings stay Arabic in this feature (spec
  assumption). Category **ids** stay a fixed set; their **labels** come from settings so UI sentences
  that name a category use the label.
- **Rationale**: Keeps CSS classes and logic (`c-<category>` classes, `FAMILY` mapping) unchanged and
  avoids a translation system now.
- **Limit**: A user cannot add a new category in this feature; they relabel the existing ones.

## R8. Day-version fallback in settings

- **Decision**: The day-version rule (late/early by prayer time) is generic code. The fallback used
  when prayer times are unavailable is a settings value, `versions.fallback`, either a date range
  (`MM-DD` to `MM-DD`) or the named token `last-thursday-october` for the end, with the example using
  "always late". The owner's file reproduces today's behavior.
- **Rationale**: The fallback depends on the user's country and clock rules, so it cannot be fixed in
  the public code.

## R9. Removing already-tracked personal documents

- **Decision**: In Phase 6, personal documents (the first feature's artifacts and the planning doc)
  are **moved out of tracked files** into the ignored private folder and deleted from the repo's
  tracked tree; product notes, readme and agent rules are rewritten generally. Git history is not
  rewritten (owner's decision, constitution transitional exception).
- **Needs the owner's approval** before executing (Principle I).
- **Alternatives considered**: Rewriting the history or recreating the repo (rejected by the owner);
  leaving documents in place (rejected: violates Principle VI).

## Parity baseline (T001)

The "before" build for the parity check is `src/planner.html` at commit `f989b91` (main after the constitution
v1.1.0 merge), saved locally as `.private/old.html` (untracked). The parity harness
(`tools/check-parity.js`) was checked old-against-old (0 differences) and against two deliberately
mutated copies (a changed block time, an added subject): each exits 1, so the harness can fail.

## Verification notes (Phases 1-2, 2026-10-13)

- `.gitignore` now ignores `.private/` and `*.settings.local.json`; verified with `git check-ignore`
  on sample paths and `git status` (nothing private listed).
- `node tools/check-settings.js` accepts the embedded example; `--self-test` runs 17 cases (empty,
  not JSON, wrong format, newer version, bad time zone, missing location, latitude out of range, unknown
  category, unknown subject, blocks out of order, bad time text, bad day key, bad prayer method, course
  week with from after to, over 1 MB, unknown top-level field as a warning only) and all pass.
- `settings.example.json` was generated from the embedded example and reviewed: generic values only.
- The owner's settings file was generated locally by a one-off script (kept in the private folder),
  validates with exit 0, and has not been printed or committed.

## Verification notes (Phase 3, 2026-10-13)

- **Parity (T016)**: `node tools/check-parity.js --old .private/old.html --new src/planner.html --settings .private/settings.json`
  gives 0 differences over 366 dates, and also over 800 dates from 2026-01-01 on both paths: with the prayer
  library, and with it switched off (`--no-adhan`, which exercises the day-version fallback). Negative control:
  the same run with no settings file (the example) reports differences and exits 1. The comparison ignores
  object key order.
- **How the app is wired**: the old hard-coded constants are renamed with an `OLD_` prefix and are unused
  (dead code until the removal phase). New constants (`CATS`, `SUBJ`, `SCHED`, `COURSE`, `PLAN`, `TASK_TAGS`,
  `RULES`) come from the loaded settings; the time zone, prayer location and method, the day-version rule, and
  `lang`/`dir` also come from settings.
- **Browser (T017)**: with empty storage the example shows with a visible "example" label, every tab renders,
  `lang`/`dir` are set. With the owner's file in storage the example label is gone and all four tabs render.
  With the smallest valid file (3 categories, one day, no course, no subjects, no rules) all four tabs render
  after one fix (a Today card assumed the course plan has a first week).
- **Wording drift for the owner (accepted)**: UI sentences that used fixed category words now use the category
  labels, so a few phrases read slightly differently (for example the balance card names are built from two
  labels, and the weekly legend uses labels instead of words with an article). The data (blocks, times,
  titles, notes, labels, course, rules) is identical per the parity check. A text override can be added to the
  settings later if exact wording matters.
- **Known limit**: a settings file without a `course` still shows a placeholder course card named "Course"
  with 0 modules on Today and the Course tab; users can add their own course and make it the main one.
- **Not done in this phase (by design)**: the old constants are still in the file; removing them is task T027
  and needs approval.

## Verification notes (Phase 4, 2026-10-13)

- **Where the settings area lives**: a fifth tab (Settings) in the same bottom/side navigation, reachable from
  every tab. While the example is in use, a small dot on that tab points to it; the dot goes away after an
  import.
- **Import (browser, file picker simulated with a real `File` object)**: empty file, non-JSON, wrong `format`,
  newer `version`, an invalid time zone plus out-of-range latitude, and a file over 1 MB are each rejected with a
  plain message (the newer-version one reads "made for a newer version of the app"; field problems list the
  path and the rule). After all of them the settings key stayed empty and the stored progress was byte-identical.
- **Valid file**: a summary appears (days, blocks, course name, location, language) with Replace and Cancel;
  Replace stores only the settings key and reloads. After it: example banner and dot gone, today's plan from the
  imported settings, stored progress byte-identical, 0 network calls during the import.
- **Reset**: asks for confirmation; Cancel keeps the settings; Confirm removes only the settings key, the example
  returns, and the stored progress is byte-identical.
- **Layout**: at phone width the Settings tab has no horizontal overflow (a missing flex-gap rule was added for
  the new view). The native file input is used on purpose for keyboard and screen-reader access.
- **Not covered here**: offline cold start of the built page (service workers are not available in the browser
  pane used for testing); the Arabic wording of the messages is a first pass, refined in the error-handling story.

## Privacy baseline (T023-T024, 2026-10-13, before any removal)

`node tools/check-private.js` against the owner's local settings file: the file is ignored and untracked, and
143 personal values (strings of 4+ characters; bare clock times and dates are skipped as too generic) were
checked against 136 tracked files. **17 tracked files contain at least one**, so the result is "not clean", as
expected before the removal phase. Counts (values matched per file; never the values):

| File | Matches |
|---|---|
| `index.html` (built app) | 142 |
| `src/planner.html` | 140 |
| `README.md`, `manifest.webmanifest`, `tools/build.py` | 4 each |
| `docs/PLAN.md`, `specs/001-*/research.md` | 3 each |
| `.impeccable/design.json`, `PRODUCT.md`, `specs/001-*/tasks.md`, `tools/check-phase.js` | 2 each |
| `AGENTS.md`, `.impeccable/critique/*` (2 files), `specs/001-*/{contracts/store-and-ui.md, data-model.md, spec.md}` | 1 each |

What the matches are, by kind (so remediation can be planned): the schedule and course data in the app source and
the built copy; the product's one-line description in the readme, the web manifest and the build script (it lists
the owner's routine categories); location in the product notes, agent rules, and the phase check script; and
mentions in the first feature's artifacts, the planning doc, and the design critique files.

Check design notes:
- The check passes a clean repo, catches a value planted in a tracked file, stays clean for unrelated tracked
  files, catches a settings file that is not ignored, catches one that is tracked, and exits 2 when the settings
  file is missing. All six cases are in `node tools/check-private.js --self-test` (negative control, T024).
- Bare clock times and dates are skipped because they match harmlessly everywhere (the first run flagged two clock
  times in a generic contract example).
- Limit: exact string matches only; a paraphrase of personal data is not detected.

## Removal and final privacy check (T025-T030, 2026-10-13)

The owner approved the removal after a local backup copy was made (a full copy of the working tree, outside git, on
the owner's device, plus a private archive of the removed documents).

- **T025**: the first feature's spec artifacts and the planning doc were copied into the ignored private archive
  and removed from the tracked tree. Git history is not rewritten.
- **T026**: the product notes, readme, and agent rules were rewritten as general documents; the web manifest text
  and the build script's manifest text no longer list a personal routine; two design-critique snapshots and one
  design sample row were reworded to generic text.
- **T027**: the old hard-coded data constants (schedule, day-head arrays, subjects, course and plan, rules text,
  task tags, a note string) were deleted from the app source; only the weekday names and the embedded example
  remain. Placeholders in two forms and the brand subtitle no longer name a subject or routine (the subtitle is
  built from the category labels). Parity with the previous build still gives 0 differences with the owner's file.
- **T028**: `tools/check-phase.js` no longer has a fixed city or fallback dates; it runs the app's own `phaseFor`
  with the location, time zone, method and fallback from a settings file (default: the example, which has no
  fallback, so nothing to compare). With the owner's file the fallback agrees with the computed rule in 2026-2035.
- **T029-T030**: after the rebuild `node tools/check-private.js` exits 0: the settings file is ignored and
  untracked, and none of 143 personal values appears in any of 128 tracked files or the built `index.html`. A
  separate scan for obvious markers found only a base64 font fragment and the generic automation-tool name in the
  constitution.
- **Built app**: with empty storage it shows only the example (no personal strings in the page); with the owner's
  file imported the owner's schedule shows and all five tabs render.
- **Known**: published git history and the currently published pages still contain the old data until the new
  build is deployed; history is not rewritten (owner's decision).

## Final verification (2026-10-14)

Run on `main` at fa4ad5d, a build served locally, in a 375 px browser, with generic data only.

- **T031**: Import refusals show in a polite live region, and focus moves to the notice. In plain Egyptian Arabic:
  not a settings file (empty, not JSON, wrong format), made for a newer version, and file over 1 MB. Field
  problems list the first 5 with the field's path, which names the day and block. Their detail is still the
  validator's English text, for example `week.0.blocks[2].category: category is not defined in categories`.
  That part of the task is open.
- **T032**: Unknown top-level fields are counted in the import preview as ignored. When the stored settings fail
  validation at startup, the app shows «الإعدادات المحفوظة مش صالحة، فبنعرض المثال». The stored value is kept,
  not deleted. The notice shows on every start while the settings stay invalid, not only once.
- **T033**: `check-settings.js --self-test` passes all 37 cases. In the browser, each of these was refused with
  its message, and the stored settings and the progress were byte-identical before and after:
  - a broken JSON file;
  - an empty file;
  - a newer-version file;
  - a file with an unknown category;
  - a file over 1 MB.

  A valid file was imported with progress unchanged. «رجّع المثال» brought back the example, and progress was
  kept.
- **T034**: The owner imported their own file on their phone on 2026-10-14 (FR-015). Not yet confirmed by the
  owner: the app on a real phone offline.
