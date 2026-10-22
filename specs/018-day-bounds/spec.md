# Feature Specification: Choose When Your Day Starts and Ends

**Feature Branch**: `018-day-bounds`

**Created**: 2026-10-21

**Status**: Draft

**Input**: Item B4 of `specs/010-code-health/review.md`, left open by 014 (the owner's choice then): the day is fixed
from 07:00 to 01:00. The owner's choices (2026-10-21):
- **Scope:** one start and one end for the whole week.
- **Range:** the day starts between 03:00 and 12:00, and ends between 20:00 and 05:00 the next morning. It is
  never longer than 24 hours.
- **Blocks outside the new day:** saving is refused, and the message names each day and block that is outside.
  Nothing moves on its own.

## Background

The app's day runs from 07:00 to 01:00:
- the timeline and the Week strip are drawn over it;
- postponing looks for free time inside it;
- a block tied to a prayer stretches to its end;
- between midnight and 01:00 the app still shows the day before.

Someone who wakes at 05:00 for Fajr and starts studying, or who works until 03:00, cannot fit their day. Their
blocks before 07:00 or after 01:00 cannot be saved at all.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An early day (Priority: P1)

The user wakes at 04:30 and studies after Fajr. In the editor's «اليوم» part, they set «يومك بيبدأ الساعة» to 04:30
and leave the end at 01:00. They add a study block at 05:00 and save. Today shows the block at the top of the
timeline, the Week strip starts at 04:30, and postponing can use their free time from 04:30.

**Why this priority**: This is the feature.

**Independent Test**: Set the start to 04:30, add a 05:00 block, and save. Today, the Week strip and a postpone
proposal all use the new start. Reload the page: the day still starts at 04:30.

**Acceptance Scenarios**:

1. **Given** the editor, **When** the user sets the start to a time from 03:00 to 12:00 and saves, **Then** every
   screen draws the day from that time.
2. **Given** a start of 04:30, **When** the user adds a block at 05:00, **Then** it is saved and shown before the
   others.
3. **Given** a start of 04:30, **When** the user types a block at 04:00, **Then** the save is refused, naming the
   day and the block.

---

### User Story 2 - A late night (Priority: P1)

The user works until 03:00. They set «وبيخلص الساعة» to 03:00 and add a block at 01:30. Between midnight and 03:00
the app still shows the day that started that morning. At 03:00 the next day begins.

**Why this priority**: Night work is the other half of the problem, and it changes when the date turns.

**Independent Test**: Set the end to 03:00 and add a 01:30 block. At 02:30 the app shows the previous day's date
with the 01:30 block current. At 03:10 it shows the new date.

**Acceptance Scenarios**:

1. **Given** an end of 03:00, **When** the time is between midnight and 03:00, **Then** Today is the day that
   started before midnight.
2. **Given** an end of 23:00, **When** the time is 23:30, **Then** the day has ended, and Today shows the same date
   with every block over.
3. **Given** a block after midnight, **When** it is stored, **Then** it keeps the settings' way of writing such
   times (24:00 and later, up to the end).

---

### User Story 3 - Narrowing the day is checked (Priority: P2)

The user sets the end to 23:00 while Friday has a block at 23:30. Saving is refused: «الجمعة، البلوك 9 (23:30
…): الوقت ده برّه يومك (من 07:00 لحد 23:00)». They move the block and save.

**Why this priority**: A wrong save would hide blocks, so it must be refused.

**Independent Test**: With a 23:30 block, set the end to 23:00 and save. The save is refused with that block named.
Fix the block and save: it works.

**Acceptance Scenarios**:

1. **Given** blocks outside new bounds, **When** the user saves, **Then** nothing is stored, and each outside block
   is named with its day.
2. **Given** a settings file with blocks outside its `day`, **When** it is imported, **Then** it is refused with
   the same field errors.
3. **Given** a start of 03:00 and an end of 05:00, **When** the user saves, **Then** it is refused, because the day
   would be longer than 24 hours.

---

### User Story 4 - The guide asks too (Priority: P3)

The first-run guide asks when the day starts and ends, with 07:00 and 01:00 filled in.

---

### Edge Cases

- **Files without `day`**: the day is 07:00 to 01:00, exactly as now (parity 0).
- **Times between the end and the start** (for example 02:00 with a 07:00–01:00 day) belong to the new day, as now.
- **Prayer-tied blocks**: they move within the day. A tie that would push a block outside the day is handled the
  way it is now at the edges.
- **Stored ticks and extras**: block keys are their start and kind, so they don't change unless the user moves a
  block. Extra blocks keep their times.
- **The Week's hour labels** follow the chosen day instead of fixed positions.
- **015's notice** asks about a day after it has ended, by the new end.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The settings MUST accept an optional `day: {start, end}` as HH:MM. The start is from 03:00 to 12:00.
  The end is from 20:00 to 23:59, or 00:00 to 05:00 for the next morning. The day is at most 24 hours long.
- **FR-002**: Without `day`, the day MUST be 07:00 to 01:00.
- **FR-003**: Every block MUST start inside the day. Otherwise the settings check refuses it with the field named,
  and the editor names the day and block in Egyptian Arabic.
- **FR-004**: Times after midnight MUST be written as 24:00 and later, up to the end (at most 28:59).
- **FR-005**: The timeline, the Week strip and its hour labels, postponing, prayer ties, the now card and 015's
  notice MUST use the chosen day.
- **FR-006**: Between midnight and the end, Today MUST be the day that started before midnight.
- **FR-007**: The editor and the guide MUST let the user set the start and the end, with the current values filled
  in.
- **FR-008**: Nothing MUST tick, cancel or move anything (Principle II).
- **FR-009**: Copy MUST be Egyptian Arabic, right to left, controls at least 44 px, no sideways scrolling at 375 px.

### Key Entities

- **Day bounds**: the start and end of the user's day, in the settings as `day`.

## Success Criteria *(mandatory)*

- **SC-001**: A schedule with a 04:30 block, or with a block at 02:00 after midnight, can be built in the app with no
  file.
- **SC-002**: Parity is 0 on the example and on the private file, which have no `day`.
- **SC-003**: Any setting that would leave a block outside the day is refused, on 100% of tested cases, with the
  block named.
- **SC-004**: At any time of night, Today shows the right date for the chosen end, in tests over every end in the
  range.
