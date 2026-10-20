# Feature Specification: Courses Without One Person's Rules

**Feature Branch**: `017-course-model`

**Created**: 2026-10-20

**Status**: Draft

**Input**: Item B1 of `specs/010-code-health/review.md`, left open after 014: owner-specific logic in a general app.
The owner's choice (2026-10-20): a block keeps the settings course's name **by its kind**. Only «كورس» blocks follow
the main course. The owner's 3 live lectures move to the «محاضرات» kind in the private settings file, with a backup
first.

## Background

The Course tab and Today's target card show a "settings course": the `course` part of the settings, stored with the
fixed id `'aa'`. A user can add more courses from a template and make one of them the main course.

Three things in this model were written for one person:
- **A name swap with a hard-coded exception.** A block whose title is the settings course's name, or starts with
  «name|», shows the main course's name instead, unless the title contains «محاضرة لايف». Only the owner's live
  lectures need that exception.
- **A course that doesn't exist.** A schedule made by the first-run guide (014) has no `course`. The app still
  shows a course named "Course", in English, with no plan, in the Course tab and on Today's target card.
- **A fixed pace line.** The settings course always says «موديولين كل أسبوع تقريباً», whatever its plan says.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Study slots follow the main course; lectures keep their name (Priority: P1)

The user has a settings course and adds a second course from a template, then makes it the main course. Their
«كورس» study blocks titled with the settings course's name now show the new course's name. Their lectures of the
settings course, kind «محاضرات», keep the settings course's name.

**Why this priority**: This is the swap without the exception, which is the core of B1.

**Independent Test**: With a settings course, a «كورس» block titled «<course>|مذاكرة» and a «محاضرات» block titled
«<course>|محاضرة», make an added course the main one. The first shows the added course's name, and the second
keeps its title. Make the settings course main again: both show their titles as written.

**Acceptance Scenarios**:

1. **Given** an added course as the main course, **When** Today shows a «كورس» block whose title is the settings
   course's name or starts with «name|», **Then** the name shows as the main course's name.
2. **Given** the same, **When** Today shows a block of any other kind with that title, **Then** the title shows as
   written.
3. **Given** a title with «محاضرة لايف» on a «كورس» block, **When** an added course is main, **Then** it follows
   the main course like any other «كورس» block. No text in a title is treated specially.

---

### User Story 2 - No settings course, no fake course (Priority: P2)

A new user makes their week with the guide. Their schedule has no course. The Course tab says there is no course yet
and offers «كورس جديد». Today shows no target card. Once they add a course, it is the main course and the card
appears.

**Why this priority**: Every new user meets this.

**Independent Test**: Import settings without `course`. Check:
- the Course tab shows an empty state with «كورس جديد», and no "Course";
- Today has no target card;
- after adding a course, it is marked main, and Today shows its card.

**Acceptance Scenarios**:

1. **Given** settings without `course` and no added course, **When** the Course tab opens, **Then** it shows
   «لسه مفيش كورس» and «كورس جديد», and nothing named "Course".
2. **Given** the same, **When** Today opens, **Then** there is no target card.
3. **Given** the same, **When** the user adds a course, **Then** it becomes the main course.
4. **Given** settings without `course` and stored progress whose main course is the settings course (from older
   settings), **When** the app opens, **Then** the first added course is main, or none if there is none. Stored
   module ticks of the settings course stay in the data.

---

### User Story 3 - The pace line comes from the plan (Priority: P3)

The settings course's progress line says how many modules a week its own plan has, like added courses do, instead of
a fixed «موديولين».

**Independent Test**: A settings course with 9 modules over 3 weeks says «حوالي 3 في الأسبوع».

---

### Edge Cases

- **The owner's live lectures**: they become «محاضرات» in the private file. Ticks already made on them on past days
  stay stored but no longer show, like any block whose kind changed (014). The Week counts them under «حضور
  المحاضرات» from then on. The owner re-imports the private file on the phone.
- **The id `'aa'`**: it stays, because stored module ticks and the main course choice use it. Only the code's name
  for it changes.
- **Deleting the main added course** with no settings course: the next added course becomes main, or none.
- **Parity**: day plans do not change. Titles are changed only on screen, and the plans keep them as written.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A block's shown title MUST follow the main course only when its kind is `course` and its title is the
  settings course's name or starts with «name|». No title text MUST be treated specially.
- **FR-002**: Without `course` in the settings, the app MUST NOT show a settings course anywhere.
- **FR-003**: The main course MUST be the stored choice if that course exists. Otherwise it MUST be the settings
  course if there is one, else the first added course, else none.
- **FR-004**: With no course at all, the Course tab MUST show an empty state with «كورس جديد», and Today MUST show no
  target card.
- **FR-005**: The settings course's pace line MUST be worked out from its plan.
- **FR-006**: Stored progress MUST NOT lose anything: module ticks and the stored main course stay as they are.
- **FR-007**: Nothing MUST tick, cancel or move anything (Principle II).
- **FR-008**: Copy MUST be Egyptian Arabic, right to left, controls at least 44 px, no sideways scrolling at 375 px.

### Key Entities

- **Settings course**: the `course` part of the settings, when present, with the stored id `'aa'`.
- **Added course**: a course the user made from a template, stored in the progress.
- **Main course**: the course Today's card and the study slots follow (FR-003).

## Success Criteria *(mandatory)*

- **SC-001**: No Arabic text in the app's code decides behaviour. A check fails on «محاضرة لايف» in the source.
- **SC-002**: A schedule from the guide shows no course until the user adds one.
- **SC-003**: Parity is 0 on the example and on the private file, before the private file's kinds change.
- **SC-004**: Stored progress before and after opening the app is equal, on 100% of tested cases.
