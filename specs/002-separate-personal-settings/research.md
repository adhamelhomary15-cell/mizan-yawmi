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
