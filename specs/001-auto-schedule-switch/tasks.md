---

description: "Task list for 001 automatic schedule switch at Maghrib 5:45pm"
---

# Tasks: Automatic Schedule Switch at Maghrib 5:45pm

**Input**: Design documents from `/specs/001-auto-schedule-switch/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/store-and-ui.md, quickstart.md

**Tests**: The spec does not ask for a test suite and the repo has none. Verification is the date-by-date
script (T001) and the manual quickstart. No test framework is added (constitution Principle V).

**Organization**: Grouped by user story. The five phases in plan.md map as: plan phase 1 = Setup,
plan phase 2 = US1, plan phases 3 and 4 = US3, plan phase 5 = Polish. US2 is verification only.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task serves (US1, US2, US3)

## Rules for every task

- Stop and show the owner a diff or result before moving past each **Checkpoint** (Principle I).
- Edit `src/planner.html` only; never hand-edit `index.html`, `sw.js`, `manifest.webmanifest` or icons (Principle V).
- No task may write `checks`, `extras`, or any done state (Principle II). No task adds a network call (Principle III).
- Python is not on the PATH here; run it by its full path (`C:\Users\User\AppData\Local\Python\pythoncore-3.14-64\python.exe`).
- Commit after each phase, never to `main`, and push or open a PR only when the owner asks.

---

## Phase 1: Setup (plan phase 1, read-only for the app)

**Purpose**: Prove the plan's assumptions before changing anything.

- [x] T001 Create `tools/check-phase.js`: a Node script that loads `tools/vendor/adhan.umd.min.js`, computes Maghrib for Giza (30.0, 31.17, Egyptian method, Cairo time) for every date 2026-01-01 to 2035-12-31, derives the version with the primary rule (late `A` if Maghrib >= 17:45, else `B`) and with a copy of the fallback rule, and prints per year: the date the primary rule switches to late, the date it switches to early, and every date where the two rules disagree. Exit non-zero if any disagreement is more than one day per year around 16 Feb or occurs in October
- [x] T002 Run `node tools/check-phase.js` against the **current** fallback (`iso < '2026-10-30' ? 'A' : 'B'` from `src/planner.html:633-637`) and record the output in `specs/001-auto-schedule-switch/research.md` under a new "Baseline run" heading, confirming 2026-10-29 is `A` (Maghrib 18:11) and 2026-10-30 is `B` (17:10)

**Checkpoint**: Owner reviews the baseline output. Phases 2+ do not start until the owner approves.

---

## Phase 2: User Story 1 - Plan follows the sun automatically (Priority: P1) 🎯 MVP

**Goal**: The version for every date matches the 17:45 Maghrib rule, including when prayer times are unavailable, with no yearly manual update (FR-001, FR-002, FR-004, FR-005, FR-008).

**Independent Test**: `node tools/check-phase.js` exits 0, and the app on 2026-10-29 vs 2026-10-30 shows different gym/work times on a Saturday, Monday and Thursday.

### Implementation for User Story 1

- [x] T003 [US1] In `src/planner.html` `phaseFor(iso)` (around line 633), replace the fixed-date fallback `return iso < '2026-10-30' ? 'A' : 'B';` with the yearly rule: `'A'` from 16 February through the last Thursday of October inclusive, `'B'` otherwise. Compute the last Thursday with UTC date arithmetic on the ISO string (no local time zone). Keep the primary branch (`p.maghrib >= 17*60 + 45`) unchanged
- [x] T004 [US1] Update the comment above `phaseFor` in `src/planner.html` so it describes both the primary rule and the fallback rule
- [x] T005 [US1] Make the fallback in `tools/check-phase.js` import-or-copy exactly the function body written in T003 (same code, not a re-derivation), then run `node tools/check-phase.js`; it must exit 0 with at most one disagreeing day per year around 16 Feb and none in October. If it does not, adjust T003 and rerun, and show the owner the output
- [x] T006 [US1] Confirm FR-005 and FR-002 by reading `src/planner.html`: days whose `blocks` is an array (single version) never reach `phaseFor` (`blocksFor`, line 638-640), and `phaseFor` takes only an ISO date so it cannot change within a day. Record the two line references in `specs/001-auto-schedule-switch/research.md` under "Verification notes"

**Checkpoint**: US1 is complete and testable on its own. Owner reviews the `phaseFor` diff and the script output.

---

## Phase 3: User Story 2 - Past and future days show their own version (Priority: P2)

**Goal**: Today, Week, the day review and planned-vs-done hours all use the version for the date shown, and saved ticks stay attached to their date (FR-003, FR-006, FR-007). No code change is expected; this phase proves it or finds the gap.

**Independent Test**: With a tick saved on 2026-10-26, the Week view on 2026-11-02 shows that tick on the late version for 2026-10-26 and the early version for 2026-11-02.

### Verification for User Story 2

- [x] T007 [US2] Trace every consumer of schedule blocks in `src/planner.html` (`dayBlocks` at line 789, `balanceOf`, `WeekView` at line 1123, `Review` at line 976, `TodayView` at line 1029) and confirm each gets blocks through `blocksFor(iso)` for the date being shown, not for today's date. List any consumer that does not; if none, record "no gap" in `specs/001-auto-schedule-switch/research.md` under "Verification notes"
- [x] T008 [US2] Confirm FR-006 by reading how `store.checks[iso][block.key]` is keyed (`time + '-' + category`) and that a version change for a *different* date cannot rewrite another date's keys. Record the finding in `specs/001-auto-schedule-switch/research.md`
- [x] T009 [US2] If T007 or T008 finds a gap, stop and report it to the owner with a proposed fix before editing anything (Principle I); otherwise mark this phase complete

**Checkpoint**: Owner reviews the findings. A found gap becomes new tasks only after approval.

---

## Phase 4: User Story 3 - I can tell the plan changed (Priority: P3)

**Goal**: The first time the app is opened after a version switch, a short dismissible notice appears, however many days later, and never returns for that switch (FR-010).

**Independent Test**: Set the stored `phaseSeen` to the opposite of today's version and reload: the notice shows on every tab; tap `تمام` and reload: it is gone.

### Store field (plan phase 3)

- [x] T010 [US3] In `src/planner.html` add `phaseSeen:null` to `EMPTY()` (line 705) and to the object returned by `normalize()` (line 720): value is kept only if it is exactly `'A'` or `'B'`, otherwise `null`. Keep `v:1`. Without this the field is erased on the next `update()` (research R4)
- [x] T011 [US3] In `src/planner.html` add the first-run rule inside `App` (after `useStore()`, line 1434): when `store.phaseSeen` is `null`, call `update` once to set it to `phaseFor(now.iso)` silently, with no notice and no change to any other field
- [x] T012 [US3] Check in the browser console that saved data without `phaseSeen` loads, that `'A'` and `'B'` survive an `update()` round trip, that an invalid value becomes `null`, and that `checks` is byte-identical before and after (data-model.md "Compatibility")

### Notice banner (plan phase 4)

- [x] T013 [P] [US3] In `src/planner.html` add a small style block for the banner next to `.install` (line 268), reusing the `.install` pattern and existing DESIGN.md tokens only (no new colors, glow, or ornament)
- [x] T014 [US3] In `App` (`src/planner.html`, before `${view}` at line 1470) render the banner when `store.phaseSeen` is non-null and differs from `phaseFor(now.iso)`: a `role="status"` region with one sentence and one button `تمام`. Sentence when the current version is `A`: «المغرب بقى بعد 5:45، فمواعيد الشغل والجيم اتغيرت.» When it is `B`: «المغرب بقى قبل 5:45، فمواعيد الشغل والجيم اتغيرت.» (the `B` sentence is pending the owner's confirmation, see research.md R6)
- [x] T015 [US3] Wire `تمام` to `update(s => { s.phaseSeen = phaseFor(now.iso); return s; })` so it writes only `phaseSeen`. No timer, no auto-dismiss, no network call
- [x] T016 [US3] Run quickstart.md section 4 (all four steps) on each of the four tabs and at phone width; fix any layout problem inside the banner only

**Checkpoint**: US3 works on its own. Owner reviews the diff and the Arabic copy.

---

## Phase 5: Polish & Cross-Cutting Concerns (plan phase 5)

**Purpose**: Build, verify, and ship.

- [x] T017 Run `tools/build.py` with the full Python path from the repo root; confirm it regenerates `index.html`, `sw.js` and the manifest with no error
- [ ] T018 Run quickstart.md sections 3 and 5 against the built `index.html`: tick preservation across the switch, `checks` byte-identical, no network request from the notice, same behavior offline, and the fallback with `window.adhan` unavailable **Partly done**: items 1-4 and the fallback pass on the built page (research.md, Phase 5). The offline cold start (SC-005) could not run in the browser pane because it refuses service-worker registration; the owner must check it on a phone.
- [x] T019 [P] Update the `RULES` text at `src/planner.html:~660` ("آخر أكتوبر الساعة بترجع ساعة...") only if it no longer describes the behavior; otherwise leave it
- [x] T020 Commit the source change and the regenerated files together on branch `001-auto-schedule-switch`, tick every finished task in this file, and report results to the owner. Open or update a PR only when the owner asks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: none, read-only for the app.
- **Phase 2 (US1)**: needs T001-T002 approved.
- **Phase 3 (US2)**: independent of the others (reading only); best run after Phase 2 so the traced code is final.
- **Phase 4 (US3)**: needs `phaseFor` from Phase 2 (T003); T010 before T011-T015.
- **Phase 5 (Polish)**: needs Phases 2 and 4 complete.

### Within a story

- US1: T003 → T004 → T005 → T006.
- US3: T010 → T011 → T012, then T013 (parallel with T010-T012) → T014 → T015 → T016.

### Parallel Opportunities

- T013 (banner styles) can run in parallel with T010-T012 (store field); different parts of the same file, so commit them separately and expect a trivial merge.
- T007 and T008 (read-only) can run in parallel with each other.
- T019 can run in parallel with T017-T018.

## Implementation Strategy

### MVP first (US1 only)

1. Phase 1: write and run the baseline script.
2. Phase 2: replace the fallback and prove it with the script.
3. Stop and validate: the app already switches correctly on 2026-10-30 without the notice, so US1 alone is a safe release before the clock change.

### Incremental delivery

1. US1 → ship (fallback fixed for next year).
2. US2 → findings only; any fix is a new approved task.
3. US3 → ship the notice (target: before 2026-10-30, so the first switch is announced).

## Notes

- 20 tasks: Setup 2, US1 4, US2 3, US3 7, Polish 4.
- Target date: Phase 2 and Phase 4 should be done before 2026-10-30; the app already switches correctly without them, so the date is not blocking.
- The `B` notice sentence is mine and needs the owner's confirmation before T014.
