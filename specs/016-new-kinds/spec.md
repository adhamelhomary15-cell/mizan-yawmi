# Feature Specification: Add Your Own Kinds

**Feature Branch**: `016-new-kinds`

**Created**: 2026-10-20

**Status**: Draft

**Input**: What 014 left open: «New kinds come in a later feature». The owner's choices (2026-10-20):
- **Colour:** picked from a few ready colours that work in light and dark. There is no free colour picker.
- **Counting:** each new kind has a side in «ميزان اليوم»: the first side, the second side, or neither. A tracked
  new kind gets its own row in the week.
- **Deleting:** only kinds the user added, and only when no block in the week uses them. The 9 built-in kinds stay,
  and can only be renamed.

## Background

Since 014, a user can build and edit their whole week in the app. The kinds are still the same 9 (lectures, study,
course, work, sport, wird, your time, transport, rest), and they can only be renamed. A user whose life has
something else in it, such as a side job, a language, or caring for a family member, has to bend it into one of the
9 and lose its name in the week. That is the next barrier for a general user, after the JSON file.

The rules for a kind's options stay as they are: «بيتعلّم» (tracked), «ينفع يتأجل» (postpone, 009) and «وقت
فاضي» (free, 009).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a kind and use it in the week (Priority: P1)

The user teaches a language twice a week. In the schedule editor's kinds part they tap «ضيف نوع», write «تدريس»,
pick a colour, keep «بيتعلّم» on and choose the second side of the balance. They save the kind, put a block of it
on Sunday and Tuesday, and save the schedule. On Sunday the block shows in its colour and can be ticked, the
balance counts it on the second side, and the week shows a «تدريس» row with planned and done hours.

**Why this priority**: This is the feature. Without it the rest has nothing to act on.

**Independent Test**: Add a kind, use it in a block, save, and check:
- Today: the colour, the tick, and the balance side;
- Week: its own row;
- «ضيف حاجة لليوم ده»: it is in the list of kinds;
- export and import the settings file: the kind comes back the same.

**Acceptance Scenarios**:

1. **Given** the editor's kinds part, **When** the user taps «ضيف نوع», **Then** a form asks for the name (1 to 30
   characters), a colour from the ready ones, the three options, and the balance side, with sensible defaults
   (tracked, not postponable, not free, neither side).
2. **Given** a new kind saved in the draft, **When** the user edits a block, **Then** the kind is in the block's
   list of kinds, and saving the schedule keeps it.
3. **Given** a saved schedule with a tracked new kind, **When** Today shows a block of it, **Then** it has the
   kind's colour and name and can be ticked, and the balance counts it on the chosen side.
4. **Given** that schedule, **When** the user opens the Week, **Then** the kind has its own row of planned and done
   hours, after the built-in ones.
5. **Given** a name already used by another kind, **When** the user saves the kind, **Then** the app refuses with a
   line saying which kind has that name.

---

### User Story 2 - Change or delete a kind (Priority: P2)

The user stops teaching. They open the kind, change its colour once, then later delete it. The app says Sunday and
Tuesday still use it. They remove those blocks, then delete the kind.

**Why this priority**: Kinds change with life; a kind that can't go away clutters every list.

**Independent Test**: Change a new kind's name, colour, options and side, and check every screen follows after
saving. Try to delete it while used: refused, with the days named. Remove the blocks, delete it: gone from every
list; past ticks stay in the data.

**Acceptance Scenarios**:

1. **Given** a new kind, **When** the user changes its name, colour, options or side and saves, **Then** every
   screen shows the change.
2. **Given** a new kind used by blocks, **When** the user taps «امسح النوع», **Then** the app refuses and names the
   days that use it.
3. **Given** a new kind no block uses, **When** the user deletes it and saves, **Then** it is gone from every list,
   and ticks already made on past days stay in the stored progress.
4. **Given** a built-in kind, **When** the user opens it, **Then** there is no delete button; it can be renamed and
   its options changed, as in 014.

---

### User Story 3 - Files carry new kinds (Priority: P3)

The user exports their schedule («صدّر جدولي كملف») and imports it on another phone. The new kinds come back with
their names, colours, options and sides. A file written by hand with a new kind is checked the same way.

**Why this priority**: The settings file stays an optional way in (014); it must not lose what the editor makes.

**Independent Test**: Export a schedule with two new kinds and import it into a fresh app: same kinds, same
screens. Import a file with a bad colour or a bad side: refused with a clear field error.

**Acceptance Scenarios**:

1. **Given** a schedule with new kinds, **When** it is exported and imported again, **Then** nothing about the
   kinds changes.
2. **Given** a file whose new kind has a colour or a side that is not allowed, **When** it is imported, **Then**
   it is refused with the field named, as for any other field error.
3. **Given** a file from before this feature, **When** it is imported, **Then** it works exactly as before.

---

### Edge Cases

- **How many**: at most 12 new kinds, so lists stay short. «ضيف نوع» says so when the limit is reached.
- **Two kinds, one colour**: allowed. The name always shows next to the colour, so colour is never the only sign.
- **Built-in kinds' sides**: they stay as they are (studies on the first side, work, sport and wird on the second).
  This feature does not change them.
- **Task tags**: a new kind is not a task tag. Tasks keep their current tags.
- **Ticks of a deleted kind**: they stay in the stored progress and in backups. They no longer show, like ticks of
  a block whose kind changed (014).
- **An untracked new kind**: it shows in the day but has no tick and no week row, like «راحة».
- **«وقت فاضي» on a new kind**: postponed items may be placed in it, as for «وقتك» (009).
- **Settings without new kinds**: everything behaves exactly as before (parity 0).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The editor MUST let the user add a kind with a name (1–30 characters, unique among all kinds), a
  colour from the ready colours, «بيتعلّم», «ينفع يتأجل», «وقت فاضي», and a balance side (first, second, none).
- **FR-002**: The ready colours MUST meet the same contrast in light and dark as the built-in kinds' colours.
- **FR-003**: A new kind MUST appear wherever the built-in kinds appear as choices: a block's kind in the editor,
  and «ضيف حاجة لليوم ده».
- **FR-004**: Blocks of a new kind MUST show its colour and name on Today and the Week, follow its options (tick,
  postpone, free time), and count on its balance side.
- **FR-005**: A tracked new kind MUST have its own row of planned and done hours in the Week.
- **FR-006**: A new kind MUST be deletable only when no block of any day uses it; otherwise the app MUST name the
  days that use it. Built-in kinds MUST NOT be deletable.
- **FR-007**: The settings file MUST carry new kinds; the settings check MUST accept them with their fields and
  refuse a bad id, colour or side with the field named.
- **FR-008**: Settings without new kinds MUST behave exactly as before.
- **FR-009**: Nothing about a kind change MUST tick, cancel or move anything (Principle II), and the change goes
  through the editor's save, with its summary, like any other schedule change (014).
- **FR-010**: Everything MUST work offline and send nothing off the device (Principle III).
- **FR-011**: All copy MUST be Egyptian Arabic, right to left, every control at least 44 px, with no sideways
  scrolling at 375 px.

### Key Entities

- **Kind**: a built-in or a new kind, with its name, long name, options, and, for a new kind, a colour and a
  balance side. Stored in the settings, under `categories`.
- **Ready colour**: one of a small fixed set of colours, each with a light and a dark value.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Adding a kind and using it in a block takes under one minute, with no file.
- **SC-002**: On 100% of tested schedules without new kinds, the app's output is unchanged (parity 0).
- **SC-003**: A schedule with new kinds survives an export and import with no difference.
- **SC-004**: No screen at 375 px scrolls sideways, and every new colour meets the built-in kinds' contrast.
- **SC-005**: A used kind can never be deleted, on 100% of tested cases.
