---

description: "Task list for feature 017: courses without one person's rules"
---

# Tasks: Courses Without One Person's Rules

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: `tools/check-code.js` with `--self-test` in CI, parity 0, plus E2E in `tests/e2e/course.spec.js`.

## Binding rules

- No tick is made or cleared, and opening the app writes nothing.
- Day plans do not change: parity 0 on the example and on the private file before its kinds change.
- The private file changes only after a backup, and only the 3 live lectures' kind.
- Show the diff before each commit. Run `node tools/check-private.js` with the files staged, and commit only on
  `RESULT: clean`.

---

## Phase 1: The swap by kind, the names, the check (US1)

- [x] T001 `showTitle(text, cat)` swaps only for kind `course`, with no title text treated specially. `Title` and
  `plainTitle` take the kind, and every caller passes it.
- [x] T002 Rename `BUILTIN_ID` to `SETTINGS_COURSE_ID` (still `'aa'`), `builtinCourse` to `settingsCourse`, and the
  flag `builtin` to `fromSettings`.
- [x] T003 [P] In `tools/check-code.js`, fail on a string search whose argument starts with an Arabic letter, and add a
  mutation for it.

## Phase 2: No settings course, the main course rule (US2)

- [x] T004 `COURSE` is `null` without `course` in the settings. `settingsCourse`, `allCourses`, `courseById` and
  `mainCourse` follow plan decisions 2 and 3, and `MAIN_NAME` follows.
- [x] T005 The Course tab gets its empty state, and the resolved main course in «isMain», deleting and the daily
  line. `TargetCard` shows nothing without a main course.

## Phase 3: The pace line (US3)

- [x] T006 Every course's pace line is «حوالي N في الأسبوع», from its plan.

## Phase 4: Tests, docs, PR

- [x] T007 `tests/e2e/course.spec.js`: US1, US2, US3, and stored progress unchanged by opening the app.
- [x] T008 [P] Docs: the README courses part, and B1 closed in `specs/010-code-health/review.md`.
- [x] T009 Run every check, parity on the example and the private file, the E2E tests, and a 375 px look. Tick the
  tasks.

## Phase 5: The private file

- [ ] T010 Back up `.private/settings.json`. Move the 3 live lectures from `course` to `uni`, and check the file.
  Parity against the backup must show only those blocks.
