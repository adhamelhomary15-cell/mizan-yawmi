---

description: "Task list for feature 009: postpone what was not done"
---

# Tasks: Postpone What Was Not Done

**Input**: Design documents from `specs/009-postpone-unfinished/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/postpone.md](contracts/postpone.md), [quickstart.md](quickstart.md)

**Tests**: Requested by the plan (R2): a dev-only `tools/check-postpone.js` with an oracle and a mutation
self-test, run in CI, plus `check-settings.js` cases.

**Cut point**: one PR after Phase 6. Phase 7 is outside the repo.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: US1 (one block), US2 (everything left), US3 (tasks)

## Binding rules

- Postponing never writes `true` into `checks` (Principle II).
- Nothing moves without a tap.
- Files without the flags behave as before: no «أجّلها», and parity 0.
- Run `node tools/check-private.js` with the files staged, and commit only on `RESULT: clean`.

---

## Phase 1: Setup

- [x] T001 Record the baseline checks (anchors, settings, workout, backup, paste, edit, private) in the Phase 2
  commit message. Save `git show main:src/planner.html` outside the repo for parity.

## Phase 2: Foundational (rules and checks; no visible change)

- [x] T002 In `validateSettings` (`src/planner.html`), accept optional `postpone` and `free` on a kind, refusing
  non-booleans with «postpone must be true or false» and «free must be true or false». Add the cases to
  `tools/check-settings.js`.
- [x] T003 Add the block `// start of postpone rules` … `// end of postpone rules` after the backup rules. It
  uses no storage, no page and no network.
  - `freeStretches(blocks, extras, isFree, from)`: merged ranges of non-extra blocks of a free kind, minus every
    extra's range, clipped to at least `from`.
  - `proposePlaces(items, days, isFree)`:
    - `items` are `[{len}]`; `days` are `[{iso, blocks, extras, from}]`.
    - It places each item, in order, at the start of the earliest fitting stretch on the first fitting day.
    - Placed items count as taken for the next ones.
    - It returns `{iso, s, e}` or `null` per item.
  - `checkManualPlace(blocks, extras, s, len, START, END, isTracked)`: returns `{ok: true, e}`, or
    `{ok: false, code}` where `code` is one of `'none'`, `'late'`, or `'clash'` (with `title`).
- [x] T004 [P] Create `tools/check-postpone.js`, which loads the block from `src/planner.html`. It checks:
  - stretches: merge, subtract, clip;
  - placement: earliest; never overlapping free gaps, extras or other placed items; `null` when nothing fits;
  - the order of a batch;
  - manual refusals;
  - an independent minute-grid oracle over 300 generated weeks;
  - that the block never mentions `checks`, `true` writes or the network.

  Add `--self-test` with mutations: no subtraction of extras; taken items ignored; latest stretch instead of
  earliest; clash check skipped; late check skipped. Add a «Postpone rules» step to
  `.github/workflows/checks.yml`.
- [x] T005 Rebuild and run every check. Parity against main with the same settings on both sides gives 0
  differences. **Commit**: `feat(postpone): postpone rules and their check (009)`.

## Phase 3: User Story 1 - Postpone one block (Priority: P1) 🎯 MVP

- [x] T006 [US1] Status: `statusOf` returns `'moved'` for `{moved: 'YYYY-MM-DD'}`. Then:
  - `dayCounts` returns `moved` and leaves it out of `total`;
  - `balanceOf` and the week view skip moved blocks without counting them as cancelled;
  - the week bar shows them faded;
  - the now card treats them like cancelled blocks.
- [x] T007 [US1] Today rows: a moved block shows «اتأجل لـ <اليوم>» with the faded style and no checkbox. Its
  actions offer «روح لليوم ده» (go to that day). `dayBlocks` reads an extra's `from` and `subj`:
  - the detail «اتأجلت من <التاريخ>»;
  - the subject is passed through.

  Day progress adds «· اتأجل K».
- [x] T008 [US1] Review: for each open tracked block of a postponable kind, add «أجّلها». It opens an inline
  proposal using `proposePlaces`:
  - the days run from the later of the next day and today, 7 of them, with `from` being now on today and the
    day start otherwise;
  - the actions are «تمام», «غيّر» and «لأ», with Escape the same as «لأ»;
  - «غيّر» offers a day select (14 days) and a time, checked with `checkManualPlace`, using the contract's
    messages.
- [x] T009 [US1] Apply through `act` (one undo):
  - `checks[iso][key] = {moved: target}`;
  - add an extra `{id, s, e, cat, title, from, subj}` on the target date, where `from` is the original's `from`
    or the reviewed date;
  - the toast reads «اتأجلت "<العنوان>" لـ <اليوم>».
- [x] T010 [US1] Verify quickstart section 2 in the browser at 375 px. **Commit**:
  `feat(postpone): postpone one block into free time (009, US1)`.

## Phase 4: User Stories 2 and 3 - Everything left, and tasks (Priority: P2)

- [x] T011 [US3] The review lists open tasks due on the reviewed day, with «خلّصتها» and «أجّلها». «أجّلها» sets
  the due date to the next day, through `act`.
- [x] T012 [US2] «أجّل اللي فاضل كله» appears when 2 or more postponable items are open. It shows a list from
  `proposePlaces`: one line per block, and «← بكره» for tasks. Items with no place are left as they are.
  «أجّلهم» applies them all in one `act`.
- [x] T013 Verify quickstart sections 3 and 4. **Commit**:
  `feat(postpone): postpone everything left, and tasks (009, US2, US3)`.

## Phase 5: Example and docs

- [x] T014 In the embedded example, set `postpone: true` on study, course and quran, and `free: true` on personal.
  Regenerate `settings.example.json`.
- [x] T015 [P] In `README.md`, add a short section «تأجيل اللي ماتعملش». In `PRODUCT.md`, add a clause about
  postponing in the review.
- [x] T016 Run the full quickstart at 375 px: totals, privacy, no network. Rebuild and run every check, then
  parity for a file without flags. Search the diff: no `true` written by postponing, and no network. **Commit**:
  `docs(postpone): example and docs (009)`.

## Phase 6: Ship

- [x] T017 Tick the tasks, push, open the PR, and merge when CI passes. The owner asked on 2026-10-14 to
  continue the whole process.

## Phase 7: The owner's file (outside the repo)

- [x] T018 Back up `.private/settings.json`. Set `postpone` on study, course and quran, and `free` on personal.
  Validate it. The owner re-imports.

## Summary

- Total: 18 tasks.
  - Setup and foundational: 5.
  - US1: 5.
  - US2 and US3: 3.
  - Example and docs: 3.
  - Ship: 1.
  - Owner's file: 1.
- MVP: Phase 3.
