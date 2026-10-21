# Feature Specification: Settings Changes Without Reopening the Page

**Feature Branch**: `020-live-settings`

**Created**: 2026-10-22

**Status**: Draft

**Input**: Item B3 of `specs/010-code-health/review.md`: the settings become constants when the page loads, so any
change needs a reload. The owner's choices (2026-10-22):
- **Which actions stop reloading**: «احفظ الجدول» in the editor, «استبدل» after picking a settings file, and «رجّع
  المثال». Restoring a backup, and settings brought back from the device copy, keep reloading the page: they are
  rare, and a restore changes progress and workouts too.
- **After «احفظ الجدول»**: the editor closes, the app goes to «اليوم» with the new schedule, and a message says
  «اتحفظ الجدول».

## Background

When the page opens, the app reads the settings once. About fifteen values are worked out from them and stay fixed:
- the schedule, the kinds and their colours, the subjects, the course and its plan, the task tags;
- the day's bounds, the time zone, the cached prayer times;
- the balance sides, the Week's hour labels.

So the editor's save, a settings import and a reset to the example all reopen the page. The user sees a white
flash, and the tab they were on is lost. On a phone with a slow connection, opening again can take a moment. It also
blocks later work that needs settings to change while the app runs, such as encrypted sync.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saving the schedule shows it at once (Priority: P1)

The user adds a block in the editor and taps «احفظ الجدول», then «أيوه، احفظ». The page does not reopen. The editor
closes, «اليوم» opens with the new block in the timeline, and a message says «اتحفظ الجدول».

**Why this priority**: The editor's save is the most common settings change.

**Independent Test**: Add a block and save. Check that:
- the page did not reload;
- «اليوم» shows the block;
- the Week, the review and postponing use the new schedule;
- a reload afterwards shows the same.

**Acceptance Scenarios**:

1. **Given** the editor with a change, **When** the user saves, **Then** the page does not reload, and every screen
   uses the new settings: the day's bounds, the kinds, the subjects, the place and its prayer times.
2. **Given** a saved change of place, **When** «اليوم» opens, **Then** the prayer times are the new place's, not the
   old cached ones.
3. **Given** the save, **When** it finishes, **Then** stored progress and workouts are exactly as before.

---

### User Story 2 - Importing a file, or going back to the example, applies at once (Priority: P2)

The user picks a settings file in الإعدادات and taps «استبدل», or taps «رجّع المثال». The new settings apply
without reopening the page. The notice «ده جدول مثال عام» shows or goes away to match.

**Why this priority**: These are the other two everyday settings changes.

**Independent Test**: Import a file and check «اليوم» uses it with no reload. Then go back to the example: the
example's notice appears, again with no reload.

**Acceptance Scenarios**:

1. **Given** a valid file, **When** the user taps «استبدل», **Then** the settings apply with no reload, and a message
   says so.
2. **Given** imported settings, **When** the user taps «رجّع المثال», **Then** the example applies with no reload,
   and «ده جدول مثال عام» shows.

---

### Edge Cases

- **Restoring a backup** keeps reloading, as now. So do settings brought back from the device copy, and «افتحها»
  for a new version of the app.
- **An unsaved draft in the editor** is dropped by an import or a reset, as a reload drops it now.
- **Another tab** keeps its settings until it reopens, as now.
- **Screens that keep their own state**, such as an open review or an open postpone panel, start fresh after the
  change, so none of them shows the old schedule.
- **Nothing in the progress changes**: ticks keep their keys, and blocks whose start or kind changed lose their past
  ticks from view, as with a reload today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: «احفظ الجدول», «استبدل» and «رجّع المثال» MUST store the settings and apply them without reloading the
  page.
- **FR-002**: After applying, every value worked out from the settings MUST match what a fresh page load would give,
  cached prayer times included.
- **FR-003**: After «احفظ الجدول», the app MUST go to «اليوم» and show «اتحفظ الجدول».
- **FR-004**: Stored progress and workouts MUST NOT change (Principle II).
- **FR-005**: Restoring a backup, settings brought back from the device copy, and a new app version MUST keep
  reloading.
- **FR-006**: Everything MUST work offline and send nothing off the device (Principle III).

## Success Criteria *(mandatory)*

- **SC-001**: Saving a schedule change shows it on «اليوم» with no page reload, in 100% of tested cases.
- **SC-002**: After applying, a reload changes nothing on screen.
- **SC-003**: Parity 0: day plans are the same as before this feature.
