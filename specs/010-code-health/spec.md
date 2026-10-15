# Feature Specification: Code Health — Visible Save Failures and a Modular Source

**Feature Branch**: `010-code-health`

**Created**: 2026-10-15

**Status**: Draft

**Input**: Owner's request after an architecture review (2026-10-15): fix the weak spots in the current
architecture without changing how the app works for the user. Two items were picked for this feature:
- Progress that fails to save is lost silently.
- The whole app is one ~3,700-line inline script, and the dev checks find code by cutting text between markers.

Out of scope here (other features): the exercise drawings size (already being handled separately), an in-app
schedule editor, moving hard-coded values (day start/end, kinds) into settings, data migrations, and sync.

## Background

**Saving.** Every tap writes the whole progress object to `localStorage` through `saveLocal`
(`src/planner.html`, storage section). Its `catch` is empty: if the browser refuses the write (storage full,
private mode, blocked site data), the tap shows as done on screen but is gone after the app closes. The workout
log already handles this: `useWorkouts` keeps `saveFailed` and the Workouts tab shows a notice. Progress
(ticks, tasks, appointments, courses, postponed blocks) has no such notice.

**Source.** `src/planner.html` holds the page shell, the CSS, the embedded example settings and one IIFE script
with every part of the app: settings validation, prayer layout, storage, the day model, pure rule blocks and all
the screens. Dev checks (`tools/check-*.js`) read the file and slice it between comment markers
(`// start of edit rules` …) or by finding `function name(`. This works, but:
- one file is hard to review and hard for an AI agent to read whole;
- every feature touches the same file, so branches conflict;
- the "module boundaries" exist only as comments.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The user is told when progress could not be saved (Priority: P1)

The user ticks a block. The browser refuses the write (for example, storage is full). The app shows, right away
and on every tab, a notice that the last change was not saved on this device, with a way to save a backup file
now. When a later write succeeds, the notice goes away.

**Why this priority**: It is the only item here the user can see, and it protects real data. Today the failure
is silent, which breaks the product promise that progress is the truth of the day.

**Independent Test**: In the browser, make `localStorage.setItem` throw (dev tools override, or fill storage),
then tick a block:
- the notice appears;
- «احفظ نسخة احتياطية» from the notice saves a backup that holds the tick;
- restore normal storage, tick again: the notice disappears.

**Acceptance Scenarios**:

1. **Given** storage that refuses writes, **When** the user makes any change to progress (tick, task, appointment,
   course, postpone, undo), **Then** a notice shows: «آخر تغيير ماتحفظش على الجهاز» with a short line that storage
   may be full or blocked, and a button to save a backup.
2. **Given** the notice, **When** the user saves a backup, **Then** the file holds the current on-screen progress,
   including the change that failed to save.
3. **Given** the notice, **When** a later write of progress succeeds, **Then** the notice disappears.
4. **Given** a browser where storage is not available at all from the start (`LOCAL_OK` false), **Then** the same
   notice shows from the first open, worded for that case, as the Workouts tab already does.
5. **Given** storage that works, **Then** nothing in the app looks or behaves differently from today.

---

### User Story 2 - The source is split into files by part (Priority: P2)

The owner (or an AI agent) opens the repo and finds the app's script as a set of small files, one per part
(settings, prayer layout, storage, day model, each rule block, each screen), in a fixed order. The build joins them
into the same single `index.html` as before. The dev checks load the same joined source, so they test exactly what
ships.

**Why this priority**: No user-visible change, but it makes every later feature cheaper and safer, and it is the
base for the bigger changes planned before the app is opened to other people.

**Independent Test**: On the branch:
- the joined source is byte-identical to `src/planner.html` on `main` before the split;
- `python3 tools/build.py` gives an `index.html` byte-identical to the one built from `main`;
- every check in CI passes, including `--self-test` runs.

**Acceptance Scenarios**:

1. **Given** the split, **When** the app is built, **Then** `index.html`, `sw.js` and the manifest are byte-identical
   to the build from `main` at the split commit.
2. **Given** the split, **When** any `tools/check-*.js` runs, **Then** it reads the joined source through one shared
   helper and passes, and its `--self-test` still catches its planted mistakes.
3. **Given** a part file, **When** someone reads it, **Then** it starts with a one-line comment saying what it holds,
   and it holds whole sections only (no section is cut in the middle).
4. **Given** a missing, extra or misordered part file, **When** the build or a check runs, **Then** it stops with a
   clear error naming the file, and writes nothing.

---

### Edge Cases

- The write fails for progress but works for workouts (or the other way round): each shows its own notice; neither
  hides the other.
- A synced copy is active (the app runs where the `claude` runtime exists) and the local write fails: the notice
  still shows, because this device's copy is not saved.
- The failed write happens during undo or during restore: restore already rolls back on failure and reports it; the
  notice must not show a second, conflicting message for the same restore.
- A part file ends without a newline, or has Windows line endings: the joined source must still be byte-identical
  (the build normalises to LF as it does today).
- A future feature adds a new part: adding it to the order list is the only step needed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Writing progress MUST report success or failure to the progress store instead of swallowing the
  error.
- **FR-002**: The progress store MUST expose a `saveFailed` state: true after a failed write, false after the next
  successful write.
- **FR-003**: While `saveFailed` is true, or storage is unavailable from the start, the app MUST show a notice on
  every tab with a button that saves a backup file of the current on-screen data.
- **FR-004**: The notice MUST NOT mark, clear or change any done state, and MUST NOT retry writes on its own in a
  way that could overwrite newer data.
- **FR-005**: Nothing else in the app's behaviour, look or stored data may change in this feature.
- **FR-006**: The app script MUST live in part files under `src/app/`, joined in an order given by one list file.
- **FR-007**: `tools/build.py` MUST join the parts into the page and produce byte-identical output to the
  pre-split build.
- **FR-008**: All dev checks MUST read the joined source through one shared helper, not each reading
  `src/planner.html` alone.
- **FR-009**: The comment markers that checks rely on (`// start of … rules` etc.) MUST stay in the parts,
  unchanged, so the checks keep working without edits to their logic.
- **FR-010**: The output MUST stay one self-contained HTML file that works offline (constitution Principle V).

### Key Entities

- **Progress store** (`useStore`): gains `saveFailed`; its stored shape does not change.
- **Part file**: a slice of the former inline script, whole sections only, under `src/app/`.
- **Part order list**: `src/app/ORDER`, one file name per line; the single source of truth for the join.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With writes forced to fail, 100% of progress-changing actions show the notice within the same render.
- **SC-002**: After the split, the built `index.html` has the same SHA-1 as the build from `main`.
- **SC-003**: No part file is longer than about 600 lines (the Workouts screen may be the exception until the
  drawings work lands).
- **SC-004**: Every CI step passes with no change to any check's test cases.

## Assumptions

- The drawings work (moving exercise art out of the page) is merged to `main` before User Story 2 starts, so the
  split does not conflict with it.
- Previewing the app during development is done from the built `index.html`, not by opening `src/planner.html`
  directly (after the split, the source page alone no longer holds the script).
