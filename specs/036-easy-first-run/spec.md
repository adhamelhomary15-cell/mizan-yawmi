# Feature Specification: An Easier First Run

**Feature Branch**: `036-easy-first-run`

**Created**: 2026-11-21

**Status**: Draft

**Input**: The owner's pilot plan (`docs/pilot-plan.md`, section 2, item 3) asks for "an easier first 5 minutes: the
city, a ready template, and done". The owner asked (2026-11-20) to start this spec and stop at it.

## Background

- **What a new person sees today**: the generic example week, with a notice «ده جدول مثال عام» and «اعمل جدولك». The
  example is someone else's day, so the app only becomes theirs after the guide.
- **The guide today** (feature 014, `src/app/14a-guide-view.js`) has three steps, then the editor:
  1. **Place**: search for the city by typing its name, use the device location, or type coordinates.
  2. **Week**: a template (student, student who works, empty) and the day's start and end.
  3. **Subjects**: up to three names, optional.
  4. Then «كمّل وعدّل الأيام» opens the editor on the new week, where «احفظ الجدول», then «أيوه، احفظ», store it.
- **Counted**: from the example to a saved schedule, a new person makes about 8 taps and types a city name, and ends
  in the editor, the app's most detailed screen, before seeing their own day.
- **What the device already knows, offline**: its time zone. The bundled city list (GeoNames) gives each city its time
  zone, so the cities that share the device's zone can be offered without asking for the location and without the
  network.

## Clarifications

### Session 2026-11-21

- Q: In what order are the suggested cities shown, when the city list keeps no population? → A: Largest first. The
  owner approved downloading the same GeoNames files once more, by hand on the developer's machine, to add each city's
  size rank to the bundled list. The app itself still downloads nothing.

The other defaults (two steps, saving from the guide, the confirmation over an existing schedule) are in Assumptions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - From the example to my own day without the editor (Priority: P1)

A new person taps «اعمل جدولك», picks their city and the shape of their week, and taps «ابدأ». Their schedule is
stored and «اليوم» opens on their own day. The editor is still one tap away («عدّل الأيام الأول») for someone who
wants to change blocks before starting.

**Why this priority**: it removes the longest part (the editor and its two saves) for someone who just wants to start.

**Independent Test**: From the example, open the guide, choose a city and «طالب», tap «ابدأ»: «اليوم» shows that
week's blocks with that city's prayer times, the example notice is gone, and a reload keeps it.

**Acceptance Scenarios**:

1. **Given** the guide with a place and a week shape chosen, **When** «ابدأ» is tapped, **Then** the schedule is
   stored, «اليوم» opens on today with the new blocks, and a short message says the schedule is saved.
2. **Given** the same, **When** «عدّل الأيام الأول» is tapped, **Then** the editor opens on the new week, as today,
   and nothing is stored until its save.
3. **Given** the stored schedule, **When** the app opens again, **Then** it opens on that schedule, not the example.
4. **Given** storage is refused, **When** «ابدأ» is tapped, **Then** the guide stays, with the same message the editor
   gives when it cannot store the schedule.

---

### User Story 2 - My city without typing (Priority: P2)

On the place step, before any search, the guide shows a few cities in the device's time zone as one-tap choices
(«قريبة منك»). Search, device location and coordinates stay as they are, below them.

**Why this priority**: typing a city name in Arabic or English is the slowest and most error-prone part on a phone.

**Independent Test**: With the device's time zone set to Cairo, the place step shows Egyptian cities as buttons;
tapping one sets the place, its prayer times show, and «التالي» is enabled. With a time zone that matches no listed
city, no suggestions show and the search works as before.

**Acceptance Scenarios**:

1. **Given** a device time zone shared by listed cities, **When** the place step opens, **Then** up to 6 of those
   cities show as buttons, largest first.
2. **Given** a suggestion, **When** it is tapped, **Then** the place is set exactly as if it had been found by search.
3. **Given** a time zone that matches no listed city, **When** the place step opens, **Then** no suggestions show.
4. **Given** suggestions, **When** the person types in the search, **Then** the search results show as today.

---

### User Story 3 - Two steps instead of three (Priority: P3)

The guide has two steps: the place, then the week. The day's start and end and the subjects move into the week step,
folded under «تفاصيل اختيارية» with the same defaults as today, so «ابدأ» is reachable with no typing at all.

**Why this priority**: fewer screens; the defaults already work for most people and can be changed later.

**Independent Test**: The guide shows «1 من 2» and «2 من 2»; on step 2, «ابدأ» works without opening
«تفاصيل اختيارية»; opened, it shows the day's hours and the subjects with today's checks.

**Acceptance Scenarios**:

1. **Given** the week step, **When** it opens, **Then** the templates show, the optional details are folded, and
   «ابدأ» and «عدّل الأيام الأول» are enabled.
2. **Given** day hours outside the allowed range in the details, **When** the step shows them, **Then** the same
   message as today shows and «ابدأ» and «عدّل الأيام الأول» are disabled.
3. **Given** subjects typed in the details, **When** «ابدأ» is tapped, **Then** they are in the stored schedule as
   they are today.

### Edge Cases

- **A schedule is already stored** («اعمل جدولك من الأول» in Settings): «ابدأ» first asks once
  «ده هيبدّل جدولك الحالي. علاماتك بتفضل زي ما هي.» with «أيوه، ابدأ» and «لأ»; the previous week stays in the
  schedule history as with any save.
- **Marks are untouched**: starting a schedule never sets, clears or moves any mark (Principle II).
- **A city in two zones' lists or a device zone of «UTC»**: only exact zone matches are suggested; «UTC» suggests
  nothing.
- **The location**: the suggestions read the time zone only; the device location is still asked for only on
  «استخدم موقعي».
- **Back**: «اللي قبله» on step 2 returns to step 1 with the place kept; «رجوع» leaves the guide and stores nothing.
- **Phone width**: both steps fit 375 px with no sideways scroll.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The guide MUST have two steps: the place, then the week.
- **FR-002**: The week step MUST offer «ابدأ», which stores the schedule built from the choices, through the same
  checks and the same storing as the editor's save, and opens «اليوم».
- **FR-003**: The week step MUST also offer «عدّل الأيام الأول», which opens the editor on the new week, storing nothing.
- **FR-004**: When a schedule is already stored, «ابدأ» MUST ask once before replacing it.
- **FR-005**: The day's start and end and the subjects MUST be on the week step, folded by default, with today's
  defaults and checks.
- **FR-006**: The place step MUST suggest up to 6 cities from the bundled list whose time zone is the device's, largest
  first, as one-tap choices, and none when no city matches.
- **FR-007**: Search, device location and coordinates MUST keep working as today.
- **FR-008**: Nothing MUST be stored before «ابدأ» or the editor's save; no network request; no mark changed
  (Principles II and III).
- **FR-009**: Which cities are suggested MUST be decided by one pure rule from the time zone and the city list, with a
  dev check over typical zones and self-test mutations that the check notices.

## Success Criteria *(mandatory)*

- **SC-001**: From the example notice to a stored schedule takes 4 taps or fewer with no typing, for a person whose
  time zone matches a listed city (today: about 8 taps and typing).
- **SC-002**: In the pilot, every tester has their own schedule (not the example) by day 2 (asked on day 2).
- **SC-003**: In the pilot, no tester reports the first setup as confusing or long (asked on day 2).
- **SC-004**: Parity 0 for stored schedules: a schedule made through the guide gives the same day plans as the same
  choices made through today's guide and saved in the editor.

## Key Entities

- **Suggested cities**: a short list from the bundled city list, by time zone; nothing new is stored.
- **The new schedule**: the same settings object the guide builds today; stored only on «ابدأ» or the editor's save.

## Assumptions

- **City size**: the city list keeps no population today, and the GeoNames files it was made from were not kept. The
  same files are downloaded once more, by hand, and the list gets a size rank per city (not the population itself);
  its notice records the new download date. The app never downloads anything.
- **6 suggestions**: enough for a country's main cities, short enough to fit above the search on a phone.
- **The example stays** as what a new person first sees, with its notice; the guide does not open by itself.
- **The templates** stay as they are (student, student who works, empty); new templates are out of scope.
- **Out of scope**: changing the editor, the templates' blocks, or the example week.
