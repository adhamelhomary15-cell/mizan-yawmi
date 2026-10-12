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
