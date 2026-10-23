---

description: "Task list for feature 023: a «الآن» line in Today's timeline"
---

# Tasks: A «الآن» Line in Today's Timeline

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**:
- `tools/check-now.js` (new), with `--self-test`, in CI;
- `tools/check-code.js`, `tools/check-parity.js`;
- E2E in `tests/e2e/now-line.spec.js` (new).

## Binding rules

- The line reads no marks and sets none (Principle II). Nothing is stored or sent (Principle III).
- No row moves or changes height because of the line (FR-005). The line takes no taps.
- The current block keeps its outline and «دلوقتي» pill (FR-009). Opening Today does not scroll (FR-010).
- No new timer: the line follows the app's 30-second `now` (plan, decision 4). No library.
- Build with `py -3 tools/build.py` on this machine.
- Show the diff before each commit. Run `node tools/check-private.js` with the files staged, and commit only on
  `RESULT: clean`.

---

## Phase 1: The rule and its check (all stories)

- [x] T001 At the end of `src/app/13-rules.js`, add the block `// start of now line` … `// end of now line` with
  `nowPlace(blocks, min)` (plan, decision 1):
  - `blocks` in display order, each `{s, e}` in the day's minutes;
  - returns `{row, at: 'in', share}` for the **last** block with `s <= min < e`, where `share = (min − s) / (e − s)`;
  - else `{row, at: 'top'}` for the first block with `s > min` (free time before it, or before the first block);
  - else `{row: last, at: 'bottom'}` when `min` is at or after every block's end;
  - `null` when there are no blocks;
  - pure: no `CFG`, no storage, no page.
- [x] T002 [P] Add `tools/check-now.js`, in the style of `tools/check-postpone.js`:
  - loads the `now line` block from the joined source;
  - generated days (gaps, overlaps, one-minute blocks, back-to-back blocks, an empty day): for every minute from the
    day's start to its end, the rule matches a minute-grid oracle (row and kind);
  - `share` equals `(min − s) / (e − s)`, from 0 up to but not including 1;
  - with overlapping blocks, the chosen row is the last one in progress;
  - `--self-test` with four mutations, each caught: the first block in progress chosen instead of the last; a gap
    placed at the bottom of the previous row; the end minute counted as inside; no `null` for an empty day.
- [x] T003 [P] In `.github/workflows/checks.yml`, run `node tools/check-now.js` and `node tools/check-now.js
  --self-test` beside the other rule checks.
- [x] T004 Run `check-now` (and its self-test) and `check-code`. If `check-code` refuses `nowPlace` as unused before
  phase 2 uses it, commit phases 1 and 2 together, as in 013 and 014. Otherwise **commit**.

## Phase 2: The line on the timeline (US1, US2)

- [x] T005 [US1] [US2] In `src/app/10-postpone-ui.js`, in the timeline:
  - when `isToday`, work out `nowPlace(blocks, now.min)` once per render;
  - on the row it names, add `<span class="nowline" aria-hidden="true">` with its place: `top: share × 100%` for
    `in`, `-3px` for `top`, `calc(100% + 3px)` for `bottom`;
  - inside the span, the label «الآن» and `fmtStr(now.min)` in an LTR isolate.
- [x] T006 [P] [US1] [US2] In `src/planner.html`:
  - `.row{position:relative}`;
  - `.nowline`: absolute, one-pixel `--fg` line from after the check column to the row's inline end,
    `pointer-events:none`, `transition: top .45s cubic-bezier(.16,1,.3,1)`;
  - its label: a small pill at the inline end, centred on the line, `--surface` ground, one-pixel `--line` border,
    12px text, clamped inside the row;
  - `.nowline` added to the existing `prefers-reduced-motion` rule.
- [x] T007 Build, run every check and parity (0 differences). Then, in the browser at 375 px, light and dark, on
  oxblood and one other palette:
  - a time inside a long block, a short block and a quiet row: the line at the right share;
  - a time in free time, before the first block and after the last;
  - the outline and «دلوقتي» still there; the check under the line still ticks; an opened row still right;
  - the label over the hour amount near a row's top (plan, Risks): readable, or moved to the line's other end;
  - no row moved, no sideways scroll, no scroll on open;
  - at 1024 px wide (the side column): the line spans the timeline column only.

  Show the owner a screenshot. **Commit**.

  Done on 2026-10-23 with Playwright at fixed times on the example Thursday: the line's place matched the share of
  time to three decimals in 7 cases (mid-block, near a row's top and bottom, a quiet row, before the first block,
  dark with «كحلي», 1024 px with «رمادي»); no row box changed, no scroll on open, no sideways scroll, and the line
  never crossed the check. The example week has no free time between blocks, so that case is left to T009. The
  label stays at the inline end, over the hour amount near a block's top (the owner's choice; plan, Risks).
  `check-code` refused `nowPlace` as unused until phase 2, so phases 1 and 2 are one commit.

## Phase 3: Tests, docs

- [x] T008 Find which Playwright clock call advances both `Date` and the app's 30-second interval with `openApp`'s
  fixed time (plan, Risks), before writing the moving test.

  Found: `page.clock.setFixedTime(<new time>)` then `page.clock.runFor(30000)` runs the app's refresh, and the line
  and its time move.
- [x] T009 In `tests/e2e/now-line.spec.js`, with generated data and the example week:
  - **US1**: inside a block, the line's offset in the row matches the share of time passed within 5% of the row's
    height; the outline, «دلوقتي» and the time label are there;
  - **US1, moving**: advance the clock 30 minutes; within the next refresh the line is lower and its time is new;
  - **US2**: before the first block, above it. (Free time between rows cannot happen: the schedule has no gaps,
    `src/app/04-prayers.js`. The spec's story 2 is corrected to match.)
  - **US1, a block ending**: at the next block's start, the line moves to its top;
  - **Taps**: the check under the line ticks the block, and the row opens;
  - **Where it shows**: not on another day; with the review open, not inside the review panel and still on the
    timeline;
  - **Layout**: every row's box is the same with and without the line; the page is at the top after opening.
  - **Reduced motion**: the line's `transition-duration` is 0 (FR-007).
- [x] T010 [P] Docs:
  - README: the line in the Today part;
  - PRODUCT: the line in the Today capabilities;
  - DESIGN: the «الآن» line under Components (one-pixel `--fg`, the label, the glide, reduced motion).
- [x] T011 Rebuild, then run every check, parity and the whole E2E suite. Tick the tasks. **Commit**.

  Result: `now-line.spec.js` 18 passed on Chromium and WebKit, stable over 6 runs and 5 repeats of each test (90 of
  90). The whole suite: 133 passed, 3 skipped (offline on WebKit). Every dev check passes; parity 0 on the example
  and on a private settings file.

## Phase 4: PR

- [x] T012 Push and open the PR when the owner asks. Merge when the owner asks.

## Summary

- Total: 12 tasks.
  - The rule and its check: 4.
  - The line on the timeline: 3.
  - Tests and docs: 4.
  - The PR: 1.
- MVP: phases 1 and 2 (US1 and US2). Phase 3 proves it and documents it.
- Parallel: T002 and T003 with T001; T006 with T005; T010 with T009.
