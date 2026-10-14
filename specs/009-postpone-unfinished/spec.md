# Feature Specification: Postpone What Was Not Done

**Feature Branch**: `009-postpone-unfinished`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "لو في تاسكات متعملتش، تيجي آخر اليوم تتأجل لتاني يوم أو لوقت فاضي." The owner's
choices (2026-10-14):
- **How**: a «أجّلها» button in the day review, and «أجّل اللي فاضل كله»; nothing moves on its own.
- **Where**: the first free time that holds the whole item, from the next day on; the user can change the day and
  time before confirming.
- **What**: kinds that can be done at any time (in the owner's case study, course and Quran), plus one-off tasks
  due that day and not done.

## Background

Today, at the end of the day the user opens «راجع يومك», which lists each tracked block that was not ticked,
with two choices: «خلّصته» (done) and «اتلغى» (cancelled). A block that was simply not done yet has no third
choice. It is either cancelled, or it stays open and is forgotten, because the next day is laid out again from
the weekly schedule. One-off tasks with a due date show as late on the current day only, so they are not placed
anywhere either.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Postpone one block into the next free time (Priority: P1)

At night the user reviews the day. A study block of 60 minutes was not done. They tap «أجّلها». The app
proposes the first free time, from the next day on, that holds 60 minutes. The user sees the proposal, changes
nothing or picks another day and start time, and confirms.
- The block then shows on that day, at that time, as an extra block named after the original and marked as
  postponed from its first date.
- Today's block shows as postponed, not done and not cancelled.

**Why this priority**: This is the feature. Without it, unfinished work silently disappears from the plan.

**Independent Test**: With a study block left open today and free time tomorrow evening:
- postpone it and confirm the proposal;
- open tomorrow: the block is there, inside the free time, with the same length and title;
- today shows it as postponed;
- the day totals still count the planned time honestly (see FR-008).

**Acceptance Scenarios**:

1. **Given** an open block of a postponable kind today, **When** the user taps «أجّلها», **Then** the app shows
   a proposal: the first day from tomorrow with a free stretch at least as long as the block, and its start time,
   with the option to change the day and the time. Nothing changes until the user confirms.
2. **Given** the proposal, **When** the user confirms, **Then** the item appears on the chosen day at the chosen
   time with its original title, kind and length, and today's block shows «اتأجل لـ <اليوم>».
3. **Given** the proposal, **When** the user cancels, **Then** nothing changes.
4. **Given** a postponed item on its new day, **When** that day comes and it is still not done, **Then** it can
   be postponed again in the same way, and it still shows the date it was first planned for.
5. **Given** a postponement just made, **When** the user taps the app's usual undo within its usual time,
   **Then** the item is removed from the new day and today's block is open again, exactly as before.
6. **Given** no free stretch long enough in the next 7 days, **When** the user taps «أجّلها», **Then** the app
   says so and lets the user choose a day and a time themselves.

---

### User Story 2 - Postpone everything that is left in one go (Priority: P2)

The day went badly and four blocks are left. In the review the user taps «أجّل اللي فاضل كله». The app
proposes a place for each, one after another in free time without overlapping each other, and shows the list.
The user confirms once.

**Why this priority**: It saves taps on bad days, which are exactly the days the user is least patient.

**Independent Test**: Leave three postponable blocks and one non-postponable block (for example work) open. Tap
«أجّل اللي فاضل كله»: the list holds the three postponable ones only, each with a different non-overlapping
slot. Confirm, and all three appear on their new days. One undo restores all of them.

**Acceptance Scenarios**:

1. **Given** several open postponable blocks, **When** the user taps «أجّل اللي فاضل كله», **Then** a list shows
   each with its proposed day and time, placed in order without overlapping each other or existing extra blocks.
2. **Given** that list, **When** the user confirms, **Then** all are postponed together, and one undo reverses
   them all.
3. **Given** open blocks of kinds that cannot be postponed, **When** the list is built, **Then** they are not in
   it and keep their «خلّصته» and «اتلغى» choices.

---

### User Story 3 - Unfinished one-off tasks move to the next day (Priority: P2)

A task due today was not done. In the review it is listed under the blocks with «أجّلها», which moves its due
date to the next day (a task has no length, so it takes no time slot). It then shows on that day's list.

**Why this priority**: The owner named tasks together with blocks; a task due today is the same problem.

**Independent Test**: Make a task due today, leave it open, open the review, and postpone it. The task's due
date becomes tomorrow, today no longer shows it as late, and tomorrow's list shows it.

**Acceptance Scenarios**:

1. **Given** an open task due today, **When** the user opens the review, **Then** it is listed with «أجّلها».
2. **Given** that task, **When** the user postpones it, **Then** its due date becomes the next day, with an undo.
3. **Given** «أجّل اللي فاضل كله», **When** tasks due today are open, **Then** they are included and moved to the
   next day.

---

### Edge Cases

- **Free time**: only blocks of the free-time kind (in the example «وقتك») count as free. Rest, travel, prayer
  and every scheduled kind are never used.
- **Already used free time**: free time already holding an extra block, or an earlier postponed item, is
  not free. Two postponed items never overlap.
- **Prayer-tied days**: free time on such days is taken from the day as it is laid out on that date (features 004
  and 008), so a postponed item never lands where an anchored block moved.
- **A block longer than any free stretch**: see User Story 1, scenario 6. The block is never split.
- **Postponing from a past day** (reviewing yesterday): proposals start from the day after the reviewed day,
  and never on a day already past.
- **Ticks**: postponing never marks anything done (Principle II). The new item is open until the user ticks it.
- **The weekly schedule is not changed**: only that one date gets the extra item.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The day review MUST offer «أجّلها» on each open tracked block of a postponable kind, beside
  «خلّصته» and «اتلغى».
- **FR-002**: Which kinds can be postponed MUST be set in the settings, per kind. The example settings MUST mark
  study, course and Quran as postponable, and work, classes and exercise as not.
- **FR-003**: Which kind counts as free time MUST be set in the settings. The example marks «وقتك».
- **FR-004**: The proposal MUST be computed as follows:
  - Take the first day, from the day after the reviewed day, that has a free stretch at least as long as the
    item.
  - Within that day, take the earliest such stretch.
  - Look at most 7 days ahead.
  - The stretch excludes time already taken by extra blocks.
- **FR-005**: The user MUST be able to accept the proposal or choose another day and start time before
  confirming. A chosen time that overlaps a scheduled tracked block or another extra block MUST be refused with a
  short message.
- **FR-006**: Confirming MUST, at once:
  - add the item to the chosen day as an extra block with the original title, kind and length, and a note of
    the date it was first planned for;
  - mark today's block as postponed to that day;
  - offer the app's usual undo.
- **FR-007**: «أجّل اللي فاضل كله» MUST propose a non-overlapping place for every open postponable block and every
  open task due that day, show them as one list, and apply or undo them together.
- **FR-008**: A postponed block MUST count as neither done nor cancelled on its original day; the day progress
  MUST show it as postponed. The planned time MUST count once, on the day it was moved to.
- **FR-009**: Postponing a task MUST move its due date to the next day.
- **FR-010**: Nothing MUST be postponed without the user's tap. The feature MUST NOT mark anything done
  (Principle II), MUST work offline, and MUST send nothing off the device (Principle III).
- **FR-011**: Backups (feature 007) MUST carry postponed items and statuses unchanged.
- **FR-012**: All copy MUST be Egyptian Arabic, right to left, and every control MUST be at least 44 px. The
  repository MUST contain only generic examples (Principle VI).

### Key Entities

- **Postponable kind**: a block kind the settings mark as movable.
- **Free-time kind**: the block kind whose time can receive postponed items.
- **Postponed item**: an extra block on a date, carrying the original title, kind and length and the date it was
  first planned for.
- **Postponed status**: the state of the original block on its day, naming the date it went to.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Postponing one block takes at most 2 taps when the proposal is accepted.
- **SC-002**: On 100% of tested days, a proposal lies fully inside free time, is at least as long as the item, and
  overlaps no other extra block.
- **SC-003**: Postponing never changes any done mark (checked by the dev checks and a diff search).
- **SC-004**: One undo restores the exact state before a postponement or a batch postponement.
- **SC-005**: A postponed item's planned minutes count once in the week view, on its new day.
- **SC-006**: Files without the new settings keys behave exactly as before: no «أجّلها» button appears, and
  parity over two years shows 0 differences in the day plans.

## Assumptions

- At most 7 days ahead are searched. Beyond that the user chooses by hand.
- Items keep their length; they are never split or shortened.
- An item goes into the earliest fitting free stretch, starting at its beginning.
- The free-time block itself is not shortened in the schedule. The postponed item shows over it like any extra
  block, and the free time left is what remains outside it.
- Recurring blocks are never moved permanently; only the one date's occurrence is postponed.
- Out of scope: automatic postponing, splitting items, reminders, and moving work, classes or exercise.
