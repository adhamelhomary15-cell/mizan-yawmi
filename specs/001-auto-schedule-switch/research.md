# Research: Automatic Schedule Switch

No open unknowns remained in the spec. These are the design decisions, with what was checked.

## Baseline run (T002, 2026-10-13)

`node tools/check-phase.js --fallback=current` (the fallback in `src/planner.html` today) and
`--fallback=yearly` (the proposed rule), over 2026-2035. Computed with the vendored adhan library
(Giza 30.0, 31.17, Egyptian method, Cairo time); the primary rule is the one the app uses when
prayer times are available.

- **Primary rule, 2026**: switches to late `A` on 2026-02-16 (Maghrib 17:45) and to early `B` on
  2026-10-30 (Maghrib 17:10). Confirms 2026-10-29 is `A` (18:11) and 2026-10-30 is `B` (17:10).
  Across years the October switch is the day after the last Thursday of October (2027-10-29,
  2028-10-27, 2030-11-01, 2031-10-31, ...).
- **Current fallback (fixed date 2026-10-30)**: FAIL in every year. In 2026 it is already wrong from
  1 Jan to 15 Feb (46 days: it says `A`, computed is `B`); from 2027 on it says `B` all year after
  2026-10-30, so about 250 days a year disagree. It only matters when prayer times are unavailable,
  but there it is wrong for most of next year.
- **Proposed yearly fallback** (late 16 Feb to the last Thursday of October): passes in all ten years.
  It agrees on every date except 16 Feb in 2027, 2028 and 2032, where the computed switch lands on
  17 Feb (one day, inside the allowed margin). It agrees on every October switch in all ten years.
- **Conclusion**: the plan's assumptions hold. T003 can use the yearly rule as written.

## Verification notes (Phase 2)

- **T005**: `node tools/check-phase.js` now loads `lastThursdayOfOctober` and `phaseFor` straight out of
  `src/planner.html` (prayer times switched off) and compares them with the computed rule for
  2026-2035. Result: exit 0, every year ok; the only disagreements are 16 Feb 2027, 2028 and 2032.
  Negative control: `--fallback=current` still exits 1.
- **T006, FR-005**: `blocksFor` (`src/planner.html:647-649`) calls `phaseFor` only when
  `day.blocks` is an object with versions; days whose `blocks` is an array never reach it.
- **T006, FR-002**: `phaseFor(iso)` takes only an ISO date and `blocksFor` is its only caller
  (the file has just the definition and that one call), so the version cannot change within a day.
- Syntax check of the edited inline script: parses.

## Verification notes (Phase 3, read-only)

- **T007, no code gap**: every consumer gets blocks through `dayBlocks(iso, store)` -> `blocksFor(iso)`
  (`src/planner.html:797-798`) for the date it is showing, never for today's date:
  `dayCounts` (812, by `iso`), `balanceOf(days)` (876-878, per `d`), `NowCard` (949, `iso` prop),
  `Review` (987, `iso` prop), `TodayView` (1040, `iso` prop), `WeekView` (1139 and 1183, per week day `d`;
  `balanceOf(days)` at 1163). The per-weekday `note` text (`SCHED[wd].note`, line 1108) does not depend
  on the version.
- **T008, no code gap**: ticks live at `store.checks[iso][time + '-' + category]`
  (`statusOf`/`setStatus`, lines 805-815). `phaseFor` depends only on its own date, so a switch on one
  date cannot rewrite another date's keys. One narrow edge: if prayer times are computed on one load and
  unavailable on another, the 16 Feb dates in 2027, 2028 and 2032 (and only those) could resolve to a
  different version and orphan that day's ticks. It needs a failing prayer library on exactly those
  dates, so it is recorded, not fixed.
- **T009, gap found in the spec, not the code**: SC-003 says every gym block falls between that date's
  Maghrib and Isha. The schedule has only two fixed gym times (late version 18:00-19:45, early version
  16:45-18:30), so it cannot hold. Checked over 2026-10-01 to 2027-09-30 with the vendored library, as if
  every day were a gym day:
  - late version: the block starts before Maghrib on 233 of 255 days, by up to 121 minutes (Maghrib
    20:01 on 2027-06-29), and lies fully outside the Maghrib-Isha window on 76 days (summer);
  - early version: the block starts 10 to 59 minutes before Maghrib on all 110 days (by design: the
    note says pray Maghrib, then go), and never lies fully outside the window.
  The switch itself is correct; the late version is simply too coarse for summer.

## R1. Is the switch already implemented?

- **Decision**: Keep the existing per-date choice; do not rewrite it.
- **Evidence**: `phaseFor(iso)` at `src/planner.html:633` returns `'A'` (late) when that date's
  Maghrib is at or after 17:45 and `'B'` otherwise; `blocksFor(iso)` at line 638 uses it. A
  date-by-date run of the vendored adhan library (Egyptian method, Giza 30.0, 31.17) gave A through
  2026-10-29 (18:11) and B from 2026-10-30 (17:10).
- **Alternatives considered**: Re-implementing from Cairo clock offsets (rejected: Maghrib already
  captures the clock change and keeps FR-001 true by construction).

## R2. Fallback rule when prayer times are unavailable

- **Decision**: In `phaseFor`, replace `iso < '2026-10-30'` with: late (`'A'`) from 16 February
  through the last Thursday of October inclusive, early (`'B'`) otherwise, computed from the ISO
  date with UTC date arithmetic (no local time zone).
- **Rationale**: Matches the clarified spec (FR-008). The only hand-maintained fact is "last
  Thursday of October", derived by code each year, so no yearly edit.
- **Evidence**: 2027 library run: Maghrib 17:44 on 15 Feb and 17:54 on 1 Mar, so the 5:45pm line is
  crossed around 16 Feb. The earlier idea (start at the last Friday of April) disagreed with the
  computed result for about 10 weeks, which is why it was replaced.
- **Risk**: Egypt could change its clock rule or the date it moves clocks. Mitigation: the fallback
  is only used when the library fails; the check script (R5) flags any disagreement above one day.
- **Alternatives considered**: Keeping a fixed 2026 date (rejected, breaks next year); a stored
  table of years (rejected, needs yearly editing).

## R3. Where to remember "the owner saw the switch"

- **Decision**: One new optional store field, `phaseSeen` (`'A'` or `'B'`), meaning the last version
  the owner has acknowledged. The notice shows when the version for today's Cairo date differs from
  `phaseSeen`. Dismissing sets `phaseSeen` to the current version.
- **First run**: When `phaseSeen` is missing (every existing install, and fresh installs), set it to
  the current version silently with no notice, so the notice never fires for a switch that happened
  before this feature shipped.
- **Rationale**: Handles "opened several days later" (FR-010) and "dismissed once, never again" with
  one value. Stored in the same local object, so it works offline and travels with the claude.ai copy.
- **Alternatives considered**: A separate localStorage key (rejected, bypasses `normalize()` and the
  undo/snapshot logic, and the synced copy would not carry it); storing the switch date (rejected,
  needs the date logic twice); a timed toast (rejected, the existing toast auto-hides after 7s and
  is for undo, so a missed switch would never be seen).

## R4. Persistence trap: `normalize()` drops unknown keys

- **Finding**: `normalize()` (`src/planner.html:708`) returns only known fields. A new key not added
  there would be erased on the next `update()`.
- **Decision**: Add `phaseSeen` to `EMPTY()` (as `null`) and to `normalize()` with validation
  (`'A'`, `'B'`, else `null`). Keep `v:1`; the field is additive and optional, so old data loads
  unchanged.

## R5. How to verify the rule

- **Decision**: A Node script, `tools/check-phase.js`, that loads the vendored adhan library and
  `phaseFor`'s logic and compares the computed version against the fallback for every date from
  2026-01-01 to 2035-12-31, printing mismatches and the transition dates per year. Pass condition:
  at most one mismatching day per year around 16 February, none at the October change.
- **Rationale**: SC-001 is a date-by-date claim; a script is faster and more reliable than clicking
  through dates. The repo has no test framework and adding one would break Principle V.
- **Alternatives considered**: A browser test runner (rejected, heavy for one pure function);
  manual spot checks only (rejected, cannot cover ten years).

## R6. Notice placement and look

- **Decision**: A dismissible banner at the top of the main column in `App`, above the tab view, so it
  shows on whichever tab the owner opens first. It reuses the existing `.install` banner pattern
  (`src/planner.html:268`) and DESIGN.md tokens; no new colors, no glow, no ornament.
- **Copy (Egyptian Arabic)**:
  - to late (owner's wording, approved): `المغرب بقى بعد 5:45، فمواعيد الشغل والجيم اتغيرت.`
  - to early (same wording with the direction flipped, **owner to confirm**, because the approved
    sentence says "after 5:45", which is false when Maghrib moves earlier at the October change):
    `المغرب بقى قبل 5:45، فمواعيد الشغل والجيم اتغيرت.`
  - button: `تمام`
- **Alternatives considered**: Putting it only in Today (rejected, the owner may open Week first);
  reusing the undo toast (rejected, see R3).
