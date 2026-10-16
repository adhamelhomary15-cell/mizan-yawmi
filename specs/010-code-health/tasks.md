---

description: "Task list for feature 010: code health (visible save failures, modular source)"
---

# Tasks: Code Health — Visible Save Failures and a Modular Source

**Input**: Design documents from `specs/010-code-health/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md)

**Tests**: No new test script is requested. Each phase is gated by every existing check (and its `--self-test`), parity
against `main`, and the manual quickstart in plan.md.

**Phase numbers follow plan.md**: Phase 1 is User Story 1; Phases 2a–2d are User Story 2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: US1 (save-failure notice), US2 (source split)

## Binding rules

- No code path may write or clear a mark in `checks` (Principle II). The notice only reads state and offers a backup.
- Nothing else in behaviour, look or stored data changes (FR-005).
- Every phase needs the owner's go-ahead. Show the diff before any commit.
- Run `node tools/check-private.js` with the files staged, and commit only on `RESULT: clean`.
- **Phase 2 does not start until the drawings work (`011-download-exercise-art`) is merged to `main`.**

---

## Phase 1: User Story 1 - The user is told when progress could not be saved (Priority: P1) 🎯 MVP

**Goal**: A failed progress write shows a notice on every tab, with a backup button, until a later write succeeds.

**Independent Test**: plan.md quickstart 1. With `Storage.prototype.setItem` throwing, tick a block: the notice shows
on every tab; «احفظ نسخة احتياطية» downloads a file that holds the tick; after a reload, a tick shows no notice.

- [x] T001 [US1] Record the baseline: run every check and `--self-test` (anchors `--require-fit`, settings, edit,
  paste, workout, backup, postpone, private) on `010-code-health`, and save `git show main:index.html` outside the
  repo for parity.
- [x] T002 [US1] In `src/planner.html` (storage section), make `saveLocal(s)` return `true` after
  `localStorage.setItem` succeeds and `false` when it throws. Nothing else in the function changes.
- [x] T003 [US1] In `useStore` (`src/planner.html`):
  - add `const [saveFailed, setSaveFailed] = useState(!LOCAL_OK);` and a helper `noteSave(ok)` that calls
    `setSaveFailed(!ok)` only when the value changes;
  - call it with the result of `saveLocal(next)` in `update`, `replaceAll` and the `onSnapshot` path;
  - return `[store, update, sync, replaceAll, saveFailed]` (the first four stay in place).
- [x] T004 [US1] Factor the backup download out of `BackupSection` (`src/planner.html`) into a function
  `downloadBackup(store, wk)` that builds with `makeBackup(backupParts(store, wk), …)`, triggers the download,
  writes `BACKUP_META_KEY`, and returns `{ok, name, now}`. `BackupSection.save` calls it and keeps its messages and
  `setLast` exactly as today. Share stays as it is.
- [x] T005 [US1] In `App` (`src/planner.html`), read `saveFailed` from `useStore()`. Above `${view}`, when it is true,
  render one `notice` with `role="alert"`:
  - title «آخر تغيير ماتحفظش على الجهاز»;
  - line «مساحة التخزين ممكن تكون مليانة أو المتصفح مانع الحفظ. احفظ نسخة احتياطية دلوقتي عشان ماتضيعش حاجة.»;
  - when `!LOCAL_OK`, the line «المتصفح ده مش بيسمح بالحفظ، فالتقدم هيضيع لما تقفل التطبيق.» instead;
  - a button «احفظ نسخة احتياطية» that calls `downloadBackup(store, wk)` and shows «اتحفظت النسخة: <name>», or
    «مقدرتش أحفظ الملف. افتح التطبيق في المتصفح العادي وجرّب تاني» when it fails.
  It never touches `checks` and never retries a write (FR-004). Restore errors stay in `RestorePart` only.
- [x] T006 [US1] Rebuild with `py tools/build.py` and run every check from T001. Run parity old vs new: 0 differences.
  Search the diff for any new write to `checks` or `done`: none.
  - Done 2026-10-15: 15/15 checks. Parity with the example: 0 differences. Parity with `--settings` is not
    usable on this branch: the old build compared with itself already differs, because the tool loads the
    settings on one side only (fixed in a separate session). The change is outside the compared code.
- [x] T007 [US1] Verify plan.md quickstart 1 in the browser at 375 px, including on every tab and with storage
  working (no visible change). Show the owner the diff. **Commit** (after the owner's OK):
  `feat(store): show a notice when progress could not be saved (010, US1)`.

**Checkpoint**: US1 is complete and shippable on its own.

---

## Phase 2a: User Story 2 - Governance wording (Priority: P2)

**Goal**: The constitution and docs allow the source to be the shell plus the part files it lists.

- [x] T008 [US2] Run `/speckit-constitution` for a PATCH bump of Principle V: the app is built from
  `src/planner.html` *and the part files it lists in `src/app/ORDER`*; the output stays one self-contained file.
  File: `.specify/memory/constitution.md`. Owner approves the wording.
- [x] T009 [US2] (Moved into T013 by the owner on 2026-10-15, so the docs never describe files that do not exist
  yet.) Update `AGENTS.md` ("Edit `src/planner.html` only" → the shell and `src/app/*`) and the file map
  in `README.md` to match T008.

## Phase 2b: User Story 2 - Shared source helper (Priority: P2)

**Goal**: Every check reads the source through one helper, while the source is still one file.

- [x] T010 [US2] Create `tools/lib/source.js` exporting `readSource()` (returns `src/planner.html` as text for now)
  and `joinParts(text)` (identity for now).
- [x] T011 [US2] Switch every `tools/check-*.js` that reads `src/planner.html` to `readSource()` (one-line change
  each; `check-settings.js --write-example` keeps reading and writing the example block in `src/planner.html`).
  Every check and `--self-test` passes with unchanged output. **Commit**:
  `refactor(tools): read the app source through one helper (010, US2)`.

## Phase 2c: User Story 2 - The split (Priority: P2)

**Goal**: The app script lives in ordered part files, and the built output is byte-identical.

**Independent Test**: plan.md quickstart 2. Both `cmp` commands print nothing, and parity reports 0 differences.

- [x] T012 [US2] Map the real section headers (`/* ---------------- … ---------------- */`) on the updated `main`
  to the part list in plan.md. Adjust the map so each part holds whole sections and is at most about 600 lines
  (SC-003).
- [x] T013 [US2] Create `src/app/ORDER` and the part files `src/app/NN-name.js`. Each part is a pure move of whole
  sections that starts with a one-line comment saying what it holds. Replace the script body in `src/planner.html`
  with the line `/* @app-parts */`.

  Note: the one-line comment adds bytes. Either keep it in the part and strip it in the join, or skip it where
  byte-identity needs that. Decide here and write the decision in plan.md.
- [x] T014 [US2] In `tools/build.py`, join the parts by the plan's join rule (ORDER, LF, no separator, replace the
  placeholder line). Stop with the file name on a missing, unlisted or repeated part, and write nothing. Apply
  the same rule in `joinParts` in `tools/lib/source.js`.
- [x] T015 [US2] Verify byte-identity with the `cmp` commands in plan.md, run every check and `--self-test`, then
  parity. **Commit**: `refactor(src): split the app script into ordered parts (010, US2)`.

## Phase 2d: User Story 2 - CI guard (Priority: P2)

- [x] T016 [US2] Add `--print-source-sha` to `tools/build.py`. Add a step to `.github/workflows/checks.yml` that
  checks `ORDER` lists every `src/app/*.js` exactly once, and that Node's `joinParts` and Python's join give the
  same SHA.
- [x] T017 [US2] CI green on the branch. **Commit**: `ci: guard the part order and the join (010, US2)`.

## Phase 2e: Review and clean-up (owner's request, 2026-10-16)

**Goal**: Go through every part in `src/app/` against the code standards in `AGENTS.md`: clean code, system
design and architecture. Remove junk code, and replace unclear code with clean code. Behaviour stays the same.

- [x] T019 Review every part file and write the findings in `specs/010-code-health/review.md`. One line each,
  with file, what is wrong, and the fix, grouped as:
  - dead code;
  - duplication;
  - needless complexity;
  - unclear names;
  - wrong layer (logic inside screens);
  - hidden coupling between parts;
  - data or security risks.

  Rank them by value against risk. Show the owner before any change.
- [x] T020 For each approved group, one commit: remove or replace the code. Each commit:
  - runs every check and `--self-test`;
  - has parity 0;
  - for user-visible screens, passes a browser check at 375 px.

  A fix that changes behaviour is not a clean-up. It gets its own spec instead.
  - 2026-10-16: A1, A2, A4, A7, A8, A9 and A10 done, one commit each. Every check passes, parity is 0, and the
    browser at 375 px was checked: icons, cancel and undo, tick, postpone, reload, backup date, workout save, and
    the save-failure notice.
  - 2026-10-17: A5, A6 and A3 done.
    - A6: computed styles are equal at 375 px.
    - A3: 11 notices use `Notice`. The notice HTML of the old and new builds is identical in 6 states: start, failed
      save, workouts, paste, bad settings file and bad backup file.
    - The three special panels (postpone, restore preview, ready to import) keep their own markup.
- [x] T021 Add a dev check `tools/check-code.js`, with no new libraries, to CI. It fails when:
  - a part file goes over 600 lines;
  - a top-level function or const in `src/app` is never used;
  - `ORDER` and `src/app` disagree.

  Add `--self-test` mutations.

---

## Phase 3: Polish & ship

- [ ] T018 Tick the tasks and update `README.md` if anything user-visible changed (US1 notice). Push and open the PR
  only when the owner asks.

## Dependencies

- Phase 1 (US1) depends on nothing and can ship alone.
- Phase 2a → 2b → 2c → 2d, in order. **2c needs the drawings work merged to `main` first**, then a rebase of this
  branch.
- US1 and US2 touch different code, but both edit `src/planner.html`. Commit US1 before the split, so the split
  moves the finished notice code.

## Parallel opportunities

- T009 can run beside T008 once the wording is agreed.
- Inside Phase 1 the tasks are sequential (same file).

## Implementation strategy

- MVP: Phase 1 only. Stop after T007, show the diff, and commit on the owner's OK.
- Then wait for the drawings merge, rebase, and do 2a–2d one commit at a time.

## Summary

- Total: 21 tasks.
  - US1: 7 (T001–T007).
  - US2: 10 (T008–T017).
  - Review and clean-up: 3 (T019–T021).
  - Polish: 1.
- MVP: Phase 1.
