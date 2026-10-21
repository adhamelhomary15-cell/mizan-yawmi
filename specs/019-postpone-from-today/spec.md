# Feature Specification: Postpone From the Day's Timeline

**Feature Branch**: `019-postpone-from-today`

**Created**: 2026-10-21

**Status**: Draft

**Input**: The owner (2026-10-21): «عايز زرار أجّلها، الفيتشر دي تكون في الصفحة الرئيسية جنب زرار اتلغى النهارده»,
and the postponed item should go to another day, into free time. The owner's choices:
- **Which blocks**: only kinds marked «ينفع يتأجل», the same rule as 009.
- **Late tasks** in «مهام النهارده»: a «أجّلها» that moves the task's date to tomorrow.
- **Order**: this comes before the rest of 018.

## Background

Postponing exists in two places: the day review (009) and the notice after a day ends (015). Neither is where the
owner looks. On the main screen, tapping a block on the timeline opens its actions, «اتلغى النهارده» or «رجّعه للجدول»,
and nothing there postpones it. A late task in «مهام النهارده» shows «متأخرة» with only a tick. So the owner reads the
feature as missing.

This feature adds the same postpone action where the owner looks. Where items go, and how they are stored, stay 009's
rules: the first free time that holds the block, from the next day, within 7 days, and one undo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Postpone a block from the timeline (Priority: P1)

The user won't make it to a study block this afternoon. On «اليوم» they tap the block. Next to «اتلغى النهارده» is
«أجّلها». They tap it, and the same panel as in the review opens: «هتتحط <اليوم> من … لحد …», with «تمام», «غيّر» and
«لأ». They tap «تمام». The block shows «اتأجل لـ <اليوم>», and it appears on that day in free time.

**Why this priority**: This is the request.

**Independent Test**: On a day with an open study block and free time tomorrow, tap the block, then «أجّلها», then
«تمام». Check that:
- the block shows «اتأجل لـ …»;
- it appears on that day as an extra block;
- «رجّعها» puts everything back;
- nothing is marked done.

**Acceptance Scenarios**:

1. **Given** an open block of a kind marked «ينفع يتأجل», **When** the user taps it on the timeline, **Then**
   «أجّلها» shows next to «اتلغى النهارده».
2. **Given** that, **When** the user taps «أجّلها», **Then** 009's panel opens under the block, with the first free
   time from the next day.
3. **Given** the panel, **When** the user taps «تمام» or picks a time with «غيّر», **Then** the block is postponed
   exactly as from the review, with one undo.
4. **Given** a block of a kind that is not «ينفع يتأجل», or a block already done, cancelled or postponed, **When**
   the user taps it, **Then** there is no «أجّلها».
5. **Given** a future day shown on «اليوم», **When** the user postpones a block there, **Then** it goes to a day
   after that one, never to a day already past.

---

### User Story 2 - Postpone a late task to tomorrow (Priority: P2)

A task that was due two days ago shows «متأخرة» in «مهام النهارده». Next to it is «أجّلها». One tap moves its date to
tomorrow, and «رجّعها» undoes it.

**Why this priority**: It is the other half of the request. Tasks have no length, so they take a date, not a place.

**Independent Test**: With a task due two days ago, tap «أجّلها» on «اليوم». Its date is tomorrow, it leaves the list,
and «رجّعها» brings it back. It is still not done.

**Acceptance Scenarios**:

1. **Given** a late task on today's «مهام النهارده», **When** the user taps «أجّلها», **Then** its date becomes
   tomorrow, and the toast offers «رجّعها».
2. **Given** a task due today (not late), **When** «مهام النهارده» shows it, **Then** there is no «أجّلها» on it
   there. The review still offers it, as in 009.

---

### Edge Cases

- **The owner's phone settings**: if no kind is «ينفع يتأجل» or no kind is «وقت فاضي», blocks show no «أجّلها», as
  in 009. README says where to set them.
- **No free time in the next 7 days**: the panel asks for a day and a time, as in 009.
- **Today's blocks that haven't started yet** can be postponed too. They go to another day, never later today.
- **015's notice**: a block postponed from the timeline is no longer open, so the notice does not list it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On the timeline, an open block of a kind marked «ينفع يتأجل» MUST show «أجّلها» next to
  «اتلغى النهارده».
- **FR-002**: «أجّلها» MUST open 009's postpone panel for that block, with the same proposals, choices, storage and
  undo.
- **FR-003**: A late task in today's «مهام النهارده» MUST show «أجّلها», which moves its date to tomorrow with one
  undo.
- **FR-004**: Nothing MUST be marked done or cancelled by postponing (Principle II).
- **FR-005**: Copy MUST be Egyptian Arabic, right to left, controls at least 44 px, no sideways scrolling at 375 px.

## Success Criteria *(mandatory)*

- **SC-001**: Postponing a block from the main screen takes 3 taps: the block, «أجّلها», «تمام».
- **SC-002**: A block postponed from the timeline and one postponed from the review give the same stored result.
- **SC-003**: One undo restores the stored progress exactly.
