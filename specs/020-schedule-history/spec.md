# Feature Specification: Past Days Keep the Schedule They Had

**Feature Branch**: `020-schedule-history`

**Created**: 2026-10-21

**Status**: Draft

**Input**: Suggested after 014 and chosen by the owner on 2026-10-21 («سجل للجدول»): when the user changes their week,
the days that have passed keep the schedule they had, instead of being laid out again with the new week. The owner's
choice (2026-10-21): the new week applies **from today**, the day of the save.

## Background

The app keeps one week. Every day, past or future, is laid out from it. So when the user changes the week in the
editor (014), imports a settings file, or goes back to the example, every past day changes too:
- **Blocks disappear or change** on days already lived. A tick stays stored, but its block may no longer exist, so
  the tick no longer shows (014 says so in its save summary).
- **The Week tab and the balance rewrite history**: planned hours, done hours and per-subject study for past weeks
  are worked out from a schedule the user never had on those days.
- **Postponing from a past day** (009, 015, 019) lists the new week's blocks, not the ones that were really left
  open.

The schedule is the only part of the settings that defines what a day held. Kinds, subjects, place and language
describe how things are named and where prayer times come from, and they keep applying to every day.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Changing the week leaves past days as they were (Priority: P1)

The user had a study block on Mondays at 16:00 and ticked it last Monday. Today they move it to 18:00 in the
editor and save. Last Monday still shows the block at 16:00, ticked. Next Monday shows it at 18:00.

**Why this priority**: This is the feature. Without it, every change to the week rewrites days already lived.

**Independent Test**: Tick a block on a past day, change that block's time in the editor and save:
- the past day still shows the old block, ticked;
- today and the days after show the new week;
- the Week tab's numbers for past weeks are the same before and after the save.

**Acceptance Scenarios**:

1. **Given** a saved week and some past days, **When** the user saves a changed week, **Then** every day before the
   day it starts from is laid out exactly as before the save, ticks included.
2. **Given** the same save, **When** the user opens the day it starts from or a later day, **Then** it is laid out
   from the new week.
3. **Given** several saves over time, **When** the user opens any past day, **Then** it shows the week that was in
   use on that date.
4. **Given** a past week with prayer-tied blocks or two-version days, **When** a day from it opens, **Then** it is
   laid out with that week's ties and versions, for that date's prayer times.

---

### User Story 2 - The save summary says what happens (Priority: P1)

Before saving, the editor's summary says from which day the new week applies, and that the days before keep their
schedule. The line that says "the new week also applies to past days" goes away.

**Why this priority**: The user decides with this line in front of them; it has to tell the truth.

**Independent Test**: Change a block and press «احفظ الجدول»: the summary names the first day of the new week and
says that earlier days keep theirs.

**Acceptance Scenarios**:

1. **Given** a changed draft, **When** the user presses «احفظ الجدول», **Then** the summary says from which day the
   new week applies, by name and date, and that earlier days stay as they were.
2. **Given** a saved week that started today, **When** the user saves again today, **Then** the second save
   replaces today's week instead of adding another one, and earlier days are not affected.

---

### User Story 3 - Importing, the example and backups keep the history (Priority: P2)

The user imports a settings file, or goes back to the example: past days still keep their schedule. A backup holds
the history, and restoring it brings the history back. An exported schedule file holds the current week only.

**Why this priority**: Every way of replacing the week must behave the same, or the history breaks the first time
the user imports a file.

**Independent Test**:
- With a past ticked day, import another settings file: the past day is unchanged.
- Go back to the example: the past day is unchanged.
- Save a backup, change the week, restore the backup: the history and the week are both back as they were.

**Acceptance Scenarios**:

1. **Given** past days, **When** the user imports a settings file or goes back to the example, **Then** those days
   keep the week they had, and the new week applies from the same day as an editor save.
2. **Given** a backup, **When** it is restored, **Then** the week and its history are exactly the backup's.
3. **Given** «صدّر جدولي كملف», **When** the file is made, **Then** it holds the current week only, so it can be
   imported anywhere as a normal settings file.

---

### Edge Cases

- **First run of this feature**: there is no history yet. Every day is laid out from the current week, as today.
  The history starts with the first change after the update.
- **A saved week equal to the one before**: nothing is added to the history.
- **A kind removed later** (016): a past week can hold a block of a kind that no longer exists. That block shows on
  its day with the label «نوع اتمسح», counts as not tracked, and cannot be postponed.
- **A subject removed later**: a past block keeps its title and shows no subject.
- **Day bounds** (018) and place: they keep applying to every day, as today; only the blocks are kept per period.
- **Postponing from a past day** (009, 015, 019): it lists that day's blocks from its own week. Places are always
  proposed in future days, from the current week.
- **The day the new week starts**: it is today (FR-003). Blocks ticked earlier today under the old week are kept
  as ticks, and show only if the new week still holds the same block (as now); the save summary says so.
- **Size**: the history must never make the settings too large to save, back up or restore.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Saving a week that differs from the current one MUST keep the current week, with the dates it was in
  use, as part of the settings.
- **FR-002**: Every date MUST be laid out from the week that was in use on that date: a kept week for dates inside
  its period, and the current week from the day it started on.
- **FR-003**: The new week MUST apply from the day of the save, today included (owner's choice, 2026-10-21). The
  kept week ends the day before.
- **FR-004**: A second save on the day a week starts MUST replace that week; it MUST NOT add another period.
- **FR-005**: A saved week equal to the current one MUST NOT add anything to the history.
- **FR-006**: The editor's save summary MUST name the day the new week applies from, and say that earlier days keep
  their schedule.
- **FR-007**: Importing a settings file and going back to the example MUST keep the history in the same way as an
  editor save.
- **FR-008**: The history MUST travel with the settings in a backup (007) and come back exactly on restore. An
  exported schedule file (014) MUST hold the current week only.
- **FR-009**: Kept weeks MUST be validated like the current week when the settings are read. A kept week that fails
  MUST be set aside, not deleted, and its dates laid out from the current week, with the usual notice.
- **FR-010**: The history MUST keep at least the last 365 days. Older periods MAY be dropped, so the settings stay
  within the size the app can save and import (1 MB).
- **FR-011**: Ticks, postponed marks and extra blocks MUST NOT change when a week is saved (Principle II).
- **FR-012**: With no history, every day MUST be laid out exactly as before this feature (parity over two years
  shows 0 differences).
- **FR-013**: Works offline, sends nothing, Egyptian Arabic, right to left, 44 px controls (Principles III–V). The
  repository holds generic examples only (Principle VI).

### Key Entities

- **Week**: the 7 days of blocks, with their notes, ties to a prayer and two-version days, as the settings hold it
  today.
- **Kept week**: an earlier week, with the first and last date it was in use. Kept weeks never overlap and have no
  gaps between them and the current week.
- **Current week**: the week in use from its start date on, with no end.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After any number of saves, 100% of past days show the same blocks, times and ticks as before the
  saves.
- **SC-002**: The Week tab's planned and done hours for any past week are the same before and after a save.
- **SC-003**: With no history, parity over two years shows 0 differences in the day plans.
- **SC-004**: A year of weekly changes fits in the settings with room to spare (under half of 1 MB).
- **SC-005**: A backup round trip gives back the week and the history exactly.

## Assumptions

- Only the blocks are kept per period. Kinds, subjects, place, prayer method, language and day bounds are always
  the current ones, so a renamed kind shows its new name on past days too.
- Nothing lets the user edit a past week. To change what a past day held, the user postpones or ticks there, as
  today.
- The settings format gains one optional part for the history. Files without it are read as today, and files from
  this feature still import in an older app that ignores unknown parts (they lose the history there).
- Out of scope: editing past weeks, showing a list of the history, and keeping kinds or places per period.
