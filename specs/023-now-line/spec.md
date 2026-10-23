# Feature Specification: A «الآن» Line in Today's Timeline

**Feature Branch**: `023-now-line`

**Created**: 2026-10-23

**Status**: Draft

**Input**: The owner's choice (2026-10-23), from a portfolio site's scroll-drawn timeline line, adapted: a «الآن» line
in Today's timeline that moves with the clock, not with scrolling. Low priority, taken first of the three parked
features (the other two: Week numbers that count up, and the rosette drawing in).

## Background

Today already shows where the user is in the day, at the level of a whole block:
- the block in progress has an outline and a «دلوقتي» pill (`.row.is-now`, `src/app/10-postpone-ui.js`);
- the now card above the timeline says how long is left in that block, and what comes next;
- the Week tab has a «الآن» mark on today's strip (`.nowmark`, `src/app/11-week.js`).

What it does not show:
- **where inside a block** the moment is: ten minutes into a three-hour study block looks the same as ten minutes
  before its end;
- **the moment before the day's first block**: no row is marked.

The schedule has no gaps: a block ends where the next starts, and the last ends where the day ends
(`src/app/04-prayers.js`). Free time is a block of its own (the «وقتك» kind), so it is covered by story 1.

The app's "now" is refreshed every 30 seconds. The timeline's rows have different heights for different lengths of
time, so the list is not drawn to a time scale.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Seeing the moment inside the current block (Priority: P1)

On Today, a thin line crosses the block in progress at the point that matches how much of it has passed: a third of
the way down when a third of the block has gone. A small «الآن» label with the time sits at the line's start. The
line moves down as time passes, without the user doing anything.

**Why this priority**: The app is opened many times a day for a quick look. The line answers "how far am I into
this?" at a glance, without reading times or doing sums.

**Independent Test**: With a block from 10:00 to 13:00 and the clock at 11:00, open Today: the line crosses that
block a third of the way down. Wait until 11:30 with the app open: the line has moved to half way.

**Acceptance Scenarios**:

1. **Given** the clock is inside a block, **When** Today shows, **Then** a line crosses that block at the share of the
   block's time that has passed, with «الآن» and the current time beside it.
2. **Given** the app stays open, **When** time passes, **Then** the line moves down within 30 seconds of the clock,
   with no tap and no reload.
3. **Given** the block ends, **When** the next one starts, **Then** the line moves to the top of the next block.
4. **Given** the line crosses a block, **When** the user taps the block's check or opens the block, **Then** the tap
   works as before; the line takes no taps.

---

### User Story 2 - Seeing the moment before the day's first block (Priority: P2)

When the day has started but its first block has not, the line sits above the first row, with «الآن» and the time.

**Why this priority**: Early in the day nothing on the timeline shows the moment, and the first block is what comes
next.

**Independent Test**: With the day starting at 07:00 and the first block at 07:30, and the clock at 07:10, open
Today: the line sits above the first row.

**Acceptance Scenarios**:

1. **Given** the clock is before the first block, **When** Today shows, **Then** the line sits above the first row.

*Corrected on 2026-10-23, in phase 3:* this story first also covered free time between two blocks and the time after
the last block. Neither can happen: the schedule has no gaps, and the last block ends where the day ends. The rule
still handles both, and `tools/check-now.js` tests them on generated days.

---

### Edge Cases

- **Another day shown**: the line shows on today only, never on another date picked in the day strip.
- **The day review open**: the line shows only on the timeline, not in the review.
- **The day's last hours** (after midnight, before the day ends at its end time): the line follows the same day, as
  the rest of Today does.
- **Blocks that overlap**, or a one-off block inside another: the line crosses the block in progress that started
  latest. Each overlapping block keeps its own outline.
- **A very short block** (under 15 minutes): the line still shows, inside its row.
- **A done, skipped or postponed block in progress**: the line still crosses it; the moment is the moment.
- **Reduced motion**: the line jumps to its new place instead of gliding.
- **Wide screens** (side column from 960px): the line spans only the timeline column.

## Clarifications

### Session 2026-10-23

- Q: With the line in place, does the current block keep its outline and «دلوقتي» pill? → A: Yes, both stay. They
  show the block from afar; the line adds the exact point.
- Q: Does Today scroll to the line when it opens? → A: No. The page starts at the top as now, where the now card
  already says what is happening.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On today's timeline, a line MUST mark the current moment: inside the block in progress at the share of
  its time that has passed, or above the first row before the first block starts.
- **FR-002**: The line MUST carry «الآن» and the current time, in the app's time format.
- **FR-003**: The line MUST follow the clock while the app is open, within 30 seconds, with no tap or reload.
- **FR-004**: The line MUST show only on today's date, and never in the day review.
- **FR-005**: The line MUST NOT take taps, cover the check, or change any row's height or layout.
- **FR-006**: The line MUST follow DESIGN.md: one-pixel ink line work, no glow, no gradient, no category ink (it is not a
  category). It MUST read in light and dark and on every palette (022).
- **FR-007**: Under reduced motion the line MUST move by jumps, with no gliding.
- **FR-008**: Nothing MUST be stored, sent or marked (Principles II and III), and no new library MUST be added.
- **FR-009**: The block in progress MUST keep its outline and «دلوقتي» pill as today.
- **FR-010**: Opening Today MUST NOT scroll the page; it starts where it does today.

### Key Entities

None stored. The line's place comes from the current time and the day's blocks, both already in the app.

## Success Criteria *(mandatory)*

- **SC-001**: For a block in progress, the line's place within the row matches the share of time passed to within 5%
  of the row's height.
- **SC-002**: With the app left open, the line's time and place are never more than 30 seconds behind the clock.
- **SC-003**: Every check and row tap works the same with the line shown, in 100% of tested cases.
- **SC-004**: Parity 0: day plans are the same as before this feature.

## Assumptions

- The 30-second refresh the app already has is enough; the line does not need its own timer.
- The line's place inside a row is by share of the block's time, not by the row's text: a row is a block, and its
  height is not to scale.
- The time label uses the app's existing format (12-hour, Arabic).
- The Week tab's «الآن» mark does not change.
