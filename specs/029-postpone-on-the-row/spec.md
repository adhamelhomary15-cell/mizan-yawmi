# Feature Specification: «أجّلها» on the Block's Row

**Feature Branch**: `029-postpone-on-the-row`

**Created**: 2026-10-31

**Status**: Draft

**Input**: The owner noticed (2026-10-31) that after 028 a task shows «أجّلها» on its row, but the day's schedule blocks
(the weekly template: مذاكرة, كورس, ورد…) do not: their «أجّلها» appears only after tapping the block. The owner wants
it on the row. The owner's choices:
- **Which items**: the day's schedule blocks in Today's timeline (not pasted tasks, not course modules).
- **Which blocks**: only those whose time has come: the block in progress and the ones before it that are still open.
  Later blocks keep postponing behind a tap, so the timeline stays calm.
- The kinds that can be postponed are already ticked on the owner's phone (feature 009's «ينفع يتأجل»).

## Background

A block is a stretch of the day from the schedule, with a kind (`مذاكرة`, `كورس`…). Postponing a block (feature 009)
is not a date change like a task's: the app looks for a free stretch that holds the whole block in the coming days and
proposes it («هتتحط <اليوم> من … لحد …»), and the owner confirms with «تمام», picks another time with «غيّر», or closes
it with «لأ». This proposal opens under the block's row.

Today, in Today's timeline, tapping a block opens its actions under it: «اتلغى النهارده» (or «رجّعه للجدول»), and
«أجّلها» for an open block of a kind that can be postponed. «أجّلها» then opens the proposal. So postponing a block takes
two taps, and nothing on the row shows that it can be postponed.

The day review («راجع يومك») already lists the open blocks with «أجّلها» on each; it stays as it is.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Postpone a block whose time has come, in one tap (Priority: P1)

On today, every open block of a kind that can be postponed, from the one in progress back to the start of the day,
shows «أجّلها» on its row. One tap opens the proposal under the row, as today.

**Why this priority**: These are the blocks the owner postpones: the one running late and the ones that passed without
being done. Seeing the button saves a tap and shows at a glance what can still be moved.

**Independent Test**: At 16:00, with a مذاكرة block at 14:30 left open: its row shows «أجّلها»; one tap opens
«هتتحط …»; «تمام» moves it as today.

**Acceptance Scenarios**:

1. **Given** today, an open block of a postponable kind that has started or ended, **When** the user looks at
   Today's timeline, **Then** its row shows «أجّلها» without tapping the block.
2. **Given** such a row, **When** the user taps «أجّلها», **Then** the proposal opens under the row, and «تمام», «غيّر»
   and «لأ» work as before.
3. **Given** an open postponable block that has not started yet, **When** the user looks, **Then** its row has no
   «أجّلها»; tapping the block still shows «أجّلها» among its actions, as today.
4. **Given** a block that is done, cancelled, already postponed, or of a kind that cannot be postponed, **When** the
   user looks, **Then** its row has no «أجّلها».
5. **Given** the clock passes a block's start while Today is open, **When** the timeline updates, **Then** that block's
   row gains «أجّلها».

---

### User Story 2 - The same on other days (Priority: P2)

On a past day picked in the day strip, every open postponable block shows «أجّلها» on its row (their time has come).
On a future day, none does; postponing stays behind a tap.

**Why this priority**: The owner reviews yesterday from the strip as well; the rule "its time has come" carries over
without a second rule to learn.

**Independent Test**: Pick yesterday with an open مذاكرة block: its row shows «أجّلها». Pick tomorrow: no row does.

**Acceptance Scenarios**:

1. **Given** a past day with open postponable blocks, **When** the user picks it, **Then** each of those rows shows
   «أجّلها», and postponing sends the block to a time from today on, as today (feature 009).
2. **Given** a future day, **When** the user picks it, **Then** no row shows «أجّلها»; tapping a block still offers it.

---

### Edge Cases

- **Tapping the row's body** still opens the block's actions (with «اتلغى النهارده»); «أجّلها» on the row and the one
  among the actions open the same proposal, and only one proposal is open at a time.
- **A block added for the day** (a postponed block that landed here, or an extra): same rule as any block of its kind.
- **The «الآن» line** (023) keeps its place on the row in progress; the button never covers it.
- **Phone width (375 px)**: the row keeps its time, title and duration readable; the button never pushes the row wider
  than the screen.
- **No free time in the coming week**: the proposal says so and asks the owner to pick, as today.
- **After «تمام»**: the row shows «اتأجل لـ <day>» and loses «أجّلها», as a postponed block does today.
- **Undo** («رجّعها») brings the block back open, and its «أجّلها» back on the row.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In Today's timeline, a block's row MUST show «أجّلها» when all of these hold: the block is tracked, open
  (not done, cancelled or postponed), of a kind that can be postponed, and its time has come: on today, it has started
  (its start is at or before now); on a past day, always; on a future day, never.
- **FR-002**: Tapping it MUST open the same proposal as postponing from the block's actions, under the row, with the
  same choices and results.
- **FR-003**: Every other block MUST look as it does today; postponing it stays available behind a tap where it is today.
- **FR-004**: On today, a block MUST gain the button when its start passes while the screen is open, with no reload.
- **FR-005**: At 375 px, a row with the button MUST keep its time, title and duration readable and MUST NOT cause a
  horizontal scroll; the button MUST be at least 44 px tall.
- **FR-006**: The button MUST be reachable by keyboard and named for screen readers with the block's name (for example
  «أجّلها: مذاكرة مادة 1»).
- **FR-007**: The day review, the ended-days question, and where a postponed block goes MUST NOT change.

## Success Criteria *(mandatory)*

- **SC-001**: A block whose time has come can be postponed with 2 taps («أجّلها», «تمام») instead of 3, in 100% of
  tested cases.
- **SC-002**: On a typical example day at 16:00, no more than the blocks from the one in progress back show the button,
  and none after it (0 buttons on later blocks).
- **SC-003**: No row at 375 px scrolls sideways or hides its time, title or duration (0 cases in tests).
- **SC-004**: Parity 0: day plans are the same as before this feature.

## Assumptions

- "Its time has come" uses the block's start, not its end: the block in progress counts, since postponing it is the
  usual case when a block is running late.
- The kinds that can be postponed are set in the schedule's kinds (feature 009); this feature does not change them.
- The button's exact place on the row (beside the title or on a line under it at phone width) is settled in the plan,
  as 028 did for the Tasks tab.
- Weekly appointments and quiet blocks (rest, transport) have no postponing and are out of scope.
