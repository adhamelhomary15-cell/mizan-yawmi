# Implementation Plan: Courses Without One Person's Rules

**Branch**: `017-course-model` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

## Summary

There are four changes, all in the screens. The settings and progress formats do not change.
1. **The name swap** looks at the block's kind. The hard-coded title text goes.
2. **The settings course** exists only when the settings have a `course`.
3. **The main course** is chosen by one rule (FR-003), at read time, so opening the app writes nothing.
4. **The pace line** comes from the plan for every course.

Then the owner's private file moves its 3 live lectures to «محاضرات», with a backup first.

## Technical Context

- **Language**: JavaScript in one page (Preact and htm), built by `tools/build.py` from `src/app/*.js`.
- **Storage**: unchanged. The stored main course and module ticks stay as they are; `'aa'` stays the settings course's
  id.
- **Tests**:
  - `tools/check-code.js` gains a check that no Arabic text in a string search decides behaviour;
  - Playwright E2E in a new `tests/e2e/course.spec.js`;
  - `check-parity.js` must give 0 on the example and on the private file, run before the private file's kinds change.
- **Constraints**: no new library, no network, no file over 600 lines, no unused code.

Nothing is left as NEEDS CLARIFICATION.

## Constitution Check (v2.0.1)

| Principle | Status |
|---|---|
| I. Human review | The private file changes only after the owner's OK, with a backup. The owner re-imports it on the phone. |
| II. Checking off is human | No tick is made or cleared. The main course is resolved when read, so opening the app writes nothing. |
| III. Data stays on the device | No network. The private file stays git-ignored. |
| IV. Honest, offline day | Day plans do not change (parity 0). Only the shown title follows the main course. |
| V. Simple, single file | Code is removed (the special case, the fake course, the fixed line). No new part. |
| VI. General repo | This removes one person's rule from the general app. Tests use generated data. |

All gates pass, before and after the design.

## Decisions (research)

1. **The swap is by kind.**
   - `showTitle(text, cat)` swaps only when `cat === 'course'`, the settings have a course, and the title is its
     name or starts with «name|».
   - `Title` and `plainTitle` take the kind, and every caller passes `b.cat`.
   - A title with no kind, such as a clash message, is shown as written.
2. **No settings course without `course`.**
   - `COURSE` is `null` when the settings have no `course`.
   - `settingsCourse()` returns `null` then, and `allCourses` leaves it out.
   - Parity compares `COURSE`. It stays the same on settings that have a course, which covers the example and the
     private file.
3. **One rule for the main course, at read time.**
   - `mainCourse(store)` is the stored choice if that course exists, else the settings course, else the first added
     course, else `null`.
   - **Rejected**: fixing `store.mainCourse` on load. That writes on open, against SC-004.
4. **Names say what things are.**
   - `BUILTIN_ID` becomes `SETTINGS_COURSE_ID`, still `'aa'`.
   - `builtinCourse` becomes `settingsCourse`, and its flag `builtin` becomes `fromSettings`.
5. **The pace line** uses the same per-week count for every course: «حوالي N في الأسبوع».
6. **The check.**
   - `check-code.js` fails on a string search (`indexOf`, `includes`, `startsWith`, `endsWith`) whose argument
     starts with an Arabic letter.
   - **Why**: it is general. It catches the next rule of this kind, not only this one text.

## Design

- **`02-settings-load.js`**: `COURSE` is `null` without `CFG.course`.
- **`05-courses.js`**:
  - the renames from decision 4;
  - `allCourses`, `courseById` (returns `null` when not found) and `mainCourse` follow decisions 2 and 3;
  - `MAIN_NAME` starts empty.
- **`08-ui-small.js`**: `showTitle(text, cat)`, `Title({text, cat})` and `plainTitle(text, cat)`.
- **`09-today.js`, `10-postpone-ui.js`, `10b-postpone-ask.js`**: pass the kind to `Title` and `plainTitle`.
  `TargetCard` renders nothing without a main course, and Today leaves out its box.
- **`12-course-view.js`**:
  - with no course: the title «الكورسات», the line «لسه مفيش كورس», and «كورس جديد»;
  - «isMain» compares with the resolved main course;
  - deleting the main course hands the choice back to the rule;
  - the pace line comes from decision 5;
  - the line «وقت الكورس في الجدول اليومي بقى لـ …» shows when the main course is not the settings course and the
    settings have one.
- **`21-shell.js`**: `MAIN_NAME` is the main course's name, or `''`.
- **`06-store.js`**: the rename only.

### The private file (after the code, with the owner's OK given in this plan's approval)

1. Copy `.private/settings.json` to `.private/settings.<date-time>.json`.
2. In every day and version, change the kind of the blocks of kind `course` whose title contains the live-lecture
   words to `uni`. Nothing else changes.
3. Check the file with `validateSettings`, `check-anchors`, and `check-private`.
4. Run parity against the file before the change. It must differ only in those blocks' kind and key.
5. The owner re-imports it on the phone.

### Tests

- **`check-code.js`**: the new check, plus a mutation that adds `text.indexOf('مثال')` and must be caught.
- **`tests/e2e/course.spec.js`** (fixed clock, generated data):
  - **US1**: settings with a course «Course A», a «كورس» block «Course A|study» and a «محاضرات» block «Course
    A|lecture», plus an added course «Course B» set as main. Today shows «Course B» on the first block and «Course A»
    on the second.
  - **US2**: settings without `course`. The Course tab shows «لسه مفيش كورس», with no "Course", and Today has no
    target card. Adding a course makes it main, and the card appears.
  - **US3**: a settings course with 3 weeks of 3 modules says «حوالي 3 في الأسبوع».
  - The stored progress is the same before and after opening the app.
- **Parity**: 0 on the example, and 0 on the private file before step 2.

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | The swap by kind, the renames, and the check-code check | US1 | `check-code` with its mutation; parity 0 |
| 2 | No settings course, the main course rule, the empty state, the target card | US2 | Browser at 375 px |
| 3 | The pace line | US3 | — |
| 4 | E2E, docs (README courses part, review.md B1 closed), ticks, PR | all | All checks; `check-private` clean |
| 5 | The private file: backup, 3 kinds, checks | — | Parity shows only those blocks; the owner re-imports |

## Risks

- **A caller without the kind** shows the title as written, and loses the swap. `check-code` cannot see this, so the
  E2E checks the review and the timeline.
- **Course tab state**: `sel` may point to a deleted course. It falls back to the main course, or the empty state.
