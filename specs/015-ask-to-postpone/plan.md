# Implementation Plan: Ask on Its Own to Postpone What Was Not Done

**Branch**: `015-ask-to-postpone` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

## Summary

When Today opens, the app finds the ended days (up to 7 back) since the last day it asked about that still have
open postponable blocks or open tasks due on them. If there are any, it shows one notice with 009's proposals and
three buttons. Nothing is new about where items go or how they are stored. The new parts are:
- one remembered date in the progress, `askedUpTo`;
- one pure rule, `daysToAsk`;
- one small screen part, the notice.

As in 014, the research, data model and checks are kept in this file instead of separate files.

## Technical Context

- **Language**: JavaScript in one page (Preact and htm), built by `tools/build.py` from `src/app/*.js`.
- **Storage**: the progress store (013). It gains one optional field and needs no new version.
- **Tests**: `tools/check-postpone.js` (rules, oracles, mutations) and Playwright E2E in `tests/e2e`.
- **Target**: phone browsers at 375 px, offline (PWA).
- **Constraints**: no new library, no network, no file over 600 lines, no unused code (`check-code.js`).

Nothing is left as NEEDS CLARIFICATION. The decisions are below.

## Constitution Check (v2.0.1)

| Principle | Status |
|---|---|
| I. Human review | The notice only proposes. Every change waits for a tap: «أجّل الكل», «راجعها» or «مش دلوقتي». |
| II. Checking off is human | The notice never ticks or cancels. «أجّل الكل» writes 009's `{moved: date}` marks only. |
| III. Data stays on the device | `askedUpTo` lives in the progress store, on the device and in its backup. No network. |
| IV. Honest, offline day | Places come from 009's rules, inside free time only. Works offline. |
| V. Simple, single file | One new part (about 70 lines), and one pure function in the existing rules block. |
| VI. General repo | Tests use generated data only. Nothing personal. |

All gates pass, before and after the design.

## Decisions (research)

1. **One remembered date, not a list of days.**
   - **Decision**: the progress stores `askedUpTo`, the latest ended day already answered. Days on or before it
     are never asked about again.
   - **Why**: days are always answered oldest first. «راجعها» answers only the oldest listed day, and the other
     buttons answer all of them, so one date is always enough.
   - **Rejected**: a list of dismissed days. It grows forever and needs cleaning.
2. **Showing the notice writes nothing (SC-002).**
   - **Decision**: a day with nothing open is skipped each time Today opens, not stored. This is cheap: at most 7
     days.
   - **Why**: a write on open would be a change without a tap, and would make the undo snapshot surprising.
3. **The proposals are 009's batch, extended over several days.**
   - **Decision**: put the items of all listed days in one list, oldest day first, and call `proposePlaces` once,
     over `postponeDays(now.iso, 7, …)`.
   - **Why**: for one ended day, `postponeStart(day, now)` is always today, so this equals 009's
     «أجّل اللي فاضل كله» exactly (SC-004). With one call, the items of different days never overlap.
4. **One undo that does not bring the question back.**
   - **Decision**: «أجّل الكل» takes a snapshot of the store with `askedUpTo` already set, applies 009's
     `applyPostpone` for each day plus the new `askedUpTo`, and its undo puts that snapshot back.
   - **How**: this uses `actEdit(text, fn, undoFn)` from the shell, which is passed to Today for this.
   - **Why**: `act` would restore the old `askedUpTo`, and the notice would come back after an undo, against the
     spec.
5. **«راجعها» uses the existing review.**
   - **Decision**: Today moves to the oldest listed day and opens its review (009), then sets `askedUpTo` to that
     day.
   - **Why**: the review already has «غيّر», «خلّصته» and «اتلغى». The other days come back in the notice when
     the user returns to today.
6. **First run.**
   - **Decision**: when `askedUpTo` is missing (older data, a new user, an old backup), only yesterday is asked
     about (FR-008).

## Data model

- **Progress** (`06-store.js`):
  - `askedUpTo`: a date `YYYY-MM-DD`, or `null`.
  - `EMPTY()` sets it to `null`.
  - `normalize` keeps it only if it is a date, otherwise `null`. That is the same shape as `phaseSeen`.
  - The progress version stays 1. Data without the field reads as `null`, which is the first-run case.
- **Backup** (007): the progress is carried as it is stored, so `askedUpTo` goes with it.
  `tools/check-backup.js` builds its progress oracle field by field, so it gains `askedUpTo` the same way.
- **Not stored**: the question itself (days, items and proposals) is worked out on every open of Today.

## Design

### Rule, in the postpone rules block (`src/app/13-rules.js`, tested by `tools/check-postpone.js`)

`daysToAsk(today, askedUpTo, addDays)` returns the ended days to look at, oldest first:
- with no `askedUpTo`: only the day before `today`;
- otherwise: from the day after `askedUpTo`, but never more than 7 days back, up to the day before `today`;
- an `askedUpTo` on or after the day before `today` gives an empty list, and so does a date that is not valid.

`check-postpone.js` runs the block on its own, so the date helper comes in as a parameter, the way `isFree` does
for `proposePlaces`. The function uses nothing else.

### Screen part: `src/app/10b-postpone-ask.js` (new; listed after `10-postpone-ui.js` in `ORDER`)

`AskPostpone({now, store, update, actEdit, onReview})`:
- For each day from `daysToAsk(now.iso, store.askedUpTo, addDays)`, it collects:
  - the open tracked blocks of postponable kinds (`dayBlocks`, `statusOf`, `canPostpone`, as in `Review`);
  - the open tasks due that day.
- It skips days with nothing in them. If no day is left, it renders nothing.
- It proposes places with one `proposePlaces` call (decision 3). Tasks move to today, which is 009's
  `postponeStart` for a past day.
- It renders a `Notice`:
  - the title «فيه N حاجات ماتعملتش امبارح», or «… من يوم <اليوم>» when the listed days start before yesterday;
  - one line per item: its title, then its day and time, or «مفيش مكان، هيفضل زي ما هو»;
  - the buttons, in one row that wraps at 375 px.
- The buttons:
  - **«أجّل الكل»**: decision 4. The toast says «اتأجل N حاجة».
  - **«راجعها»**: `update` sets `askedUpTo` to the oldest listed day, then `onReview(thatDay)`.
  - **«مش دلوقتي»**: `update` sets `askedUpTo` to the latest listed day.

**Wiring**:
- `TodayView` (`10-postpone-ui.js`) renders `AskPostpone` at the top, only when it shows today and no review is
  open.
- `onReview(day)` sets the shown day and opens the review.
- `21-shell.js` passes `actEdit` to `TodayView`.

### Tests

- **`tools/check-postpone.js`** gets new checks for `daysToAsk`:
  - first run, a gap of 1 day, a gap of 3 days, the 7-day limit, already answered, a bad date;
  - an oracle over 400 random dates and gaps.

  And new mutations: no 7-day limit, today included, first run asking about more than yesterday.
- **`tests/e2e/postpone-ask.spec.js`** (fixed clocks, generated data only):
  - **US1**: open blocks on Thursday; opening on Friday shows the notice, and nothing is stored before a tap;
    «أجّل الكل» makes the same marks and extras as 009's batch; reload, and there is no notice; undo, and the
    store is back as before the tap, with no notice.
  - **US2**: «راجعها» opens Thursday's review; «مش دلوقتي» survives a reload.
  - **US3**: three missed days give one notice in order, and the places do not overlap.
  - **First run**: data without `askedUpTo` and open blocks on two past days lists yesterday only.
  - **No postponable kinds**: no notice.

## Phases

| # | Phase | Story | Gate |
|---|---|---|---|
| 1 | `askedUpTo` in the progress, `daysToAsk` in the rules, and their checks | all | `check-postpone` and `check-backup` green, with mutations caught; parity 0 |
| 2 | The notice, «أجّل الكل» and «مش دلوقتي» | US1, US3 | Browser at 375 px; E2E |
| 3 | «راجعها» | US2 | E2E |
| 4 | Docs (README «تأجيل اللي ماتعملش», PRODUCT), ticks, PR | — | All checks; `check-private` clean |

Phases 1–3 are one commit if `check-code` refuses the rule before its first use, as in 013 and 014.

## Risks

- **The notice and the review show the same day.** Today hides the notice while a review is open.
- **The clock passes 01:00 while the app is open.** The notice is worked out from `now`, which the shell already
  updates every 30 seconds, so it appears without a reload.
- **An undo after other changes.** Like 009's batch, the undo puts back the snapshot before «أجّل الكل». The toast
  lasts 7 seconds, which keeps that window short.
