# Implementation Plan: Postpone From the Day's Timeline

**Branch**: `019-postpone-from-today` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

## Summary

This adds two buttons to `TodayView` (`src/app/10-postpone-ui.js`), both built on what 009 already has:
- **«أجّلها» in a block's actions on the timeline.** It opens 009's `PostponePanel` under the block.
- **«أجّلها» on a late task in «مهام النهارده».** It uses 009's `applyPostpone` with the task's id and tomorrow's
  date.

There are no new rules, no storage change, and no new part. The work is one screen file, a few lines of CSS, a
README line and the tests.

## Technical Context

- **Language**: JavaScript in one page (Preact and htm), built by `tools/build.py` from `src/app/*.js`.
- **Storage**: unchanged. 009's `{moved: date}` marks, extras, and task `due`.
- **Tests**:
  - Playwright E2E in `tests/e2e/day.spec.js`, next to 009's review test;
  - parity 0, since day plans don't change;
  - every check script.
- **Constraints**: no new library, no network, no file over 600 lines (`10-postpone-ui.js` is at 240), no unused code.

Nothing is left as NEEDS CLARIFICATION.

## Constitution Check (v2.0.1)

| Principle | Status |
|---|---|
| I. Human review | The panel only proposes. The block moves on «تمام» or a picked time, and the task on its own tap. Both can be undone. |
| II. Checking off is human | Postponing writes 009's `moved` mark and a date. Nothing is marked done or cancelled. |
| III. Data stays on the device | No network. |
| IV. Honest, offline day | Places come from 009's rules, inside free time only. |
| V. Simple, single file | It reuses `PostponePanel`, `canPostpone` and `applyPostpone`. No new rule or part. |
| VI. General repo | Tests use the generic example. |

All gates pass, before and after the design.

## Decisions (research)

1. **The timeline reuses `PostponePanel` as it is.**
   - It already takes a block and its day, proposes from `postponeStart(iso, now)` (the next day, never a past
     one), and offers «تمام», «غيّر» and «لأ» with one undo.
   - **Why**: SC-002 asks for the same stored result as the review, and the same code gives it.
2. **`TodayView` keeps one more piece of state, `postponing`** (a block key), next to `open`.
   - «أجّلها» sets it, and the panel's `onClose` clears both.
   - The panel renders inside the row, under `row-actions`. `.postpone` already spans the row's grid.
3. **When «أجّلها» shows**: the block is tracked, its kind is `canPostpone`, and its status is open. «اتلغى النهارده»
   stays as it is beside it.
4. **Late tasks go to tomorrow from today.**
   - The date is `addDays(now.iso, 1)`, through `applyPostpone(iso, [], [t.id], tomorrow)` and `act`, so the toast
     offers «رجّعها».
   - It shows only on today's view, and only for late tasks (the owner's choice). Tasks due today keep the review's
     «أجّلها».
5. **The hint under the timeline** becomes «دوس على أي بلوك عشان تلغيه أو تأجّله.».

## Design

- **`src/app/10-postpone-ui.js`**, in `TodayView`:
  - `const [postponing, setPostponing] = useState(null)`, reset with `open` when the day changes;
  - the «أجّلها» button in `row-actions` (decision 3);
  - `PostponePanel` under the actions when `postponing === b.key`;
  - «أجّلها» on late tasks (decision 4);
  - the hint (decision 5).
- **`src/planner.html`**: `.titem.has-act` gets a fourth grid column for the button.
- **README**: one line in «تأجيل اللي ماتعملش»: «أو من الصفحة الرئيسية: دوس على البلوك، وبعدين أجّلها.»

### Tests (`tests/e2e/day.spec.js`; the example's Thursday at 23:30)

- **US1**:
  - tap «مثال: مذاكرة مادة 2», then «أجّلها», then «تمام»;
  - the stored marks and extras equal what 009's review gives for the same block;
  - «رجّعها» restores the progress exactly.
- **US1, no button**: a «شغل» block (not «ينفع يتأجل») has «اتلغى النهارده» and no «أجّلها».
- **US2**: a task due two days ago shows «أجّلها». Tapping it sets its date to tomorrow, and «رجّعها» restores it,
  still not done.

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | «أجّلها» on the timeline, with the panel | US1 | Browser at 375 px |
| 2 | «أجّلها» on late tasks, and the hint | US2 | Browser at 375 px |
| 3 | E2E, README, ticks, PR | all | All checks; parity 0; `check-private` clean |

Small enough for one commit per phase.

## Risks

- **Two panels on one screen**: the review is not shown while the timeline is open on the same block, because the
  review replaces the now card, not the timeline. Each panel closes itself, and the stored result is the same.
- **The phone's settings**: without «ينفع يتأجل» kinds, no block shows the button. That is by design (009), and
  README explains where to set it.
