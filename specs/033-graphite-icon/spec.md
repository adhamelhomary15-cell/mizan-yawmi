# Feature Specification: The App Icon in Graphite

**Feature Branch**: `033-graphite-icon`

**Created**: 2026-11-14

**Status**: Draft

**Input**: After feature 032 (one graphite palette), the app icon is still the guilloche rosette on oxblood, and the
installed app's frame colours still name oxblood. The owner saw a mock-up of four options and chose **B** on
2026-11-14: the same rosette on graphite, its two halves in the inks of the two halves of the balance.

## Background

- **The icon** (PRODUCT.md): the guilloche rosette, 48 fine loops around a centre ring. Today the ground is oxblood
  (`#6E1A28`); one half of the loops is paper (`#FAFBF6`) and the other ochre (`#E4C55C`); the ring is paper.
- **Where it shows**: the phone's home screen (a rounded square, and on Android often cut to a circle), the browser
  tab, the install prompt, the splash screen while the app opens, and the task switcher.
- **The other oxblood values left after 032**: the colour the phone uses for the installed app's title bar and splash
  screen, and the status bar colour set before the page's own script runs. The page's script already sets the status
  bar to the accent once it runs (032).
- **Option B** (approved): ground graphite `#1F1F22` (the light accent); one half of the loops navy `#9EBDFA` (the
  university half's dark ink), the other amber `#D9884B` (the work half's dark ink); the ring `#ECECEA`. The light
  inks of the dark theme are used because they read on the dark ground.

## Clarifications

None open. The owner chose the option from a mock-up; the remaining values follow from the 032 palette (see
Assumptions).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The new icon on the home screen (Priority: P1)

The user installs the app, or opens it after the update. The home screen shows the rosette on graphite, one half navy
and one half amber, in every place the icon appears.

**Why this priority**: It is the feature: the last oxblood the user sees every day.

**Independent Test**: Build the app and open each icon file; install the app on a phone (or emulate it) and look at
the home screen and the splash screen.

**Acceptance Scenarios**:

1. **Given** the built app, **When** each icon file is opened, **Then** it shows the rosette on `#1F1F22`, one half
   `#9EBDFA`, the other `#D9884B`, and the ring `#ECECEA`, at its size.
2. **Given** a phone that cuts icons to a circle, **When** the app is installed, **Then** the whole rosette shows
   inside the circle, with none of it cut off.
3. **Given** the browser tab, **When** the app is open, **Then** the tab shows the new icon.

---

### User Story 2 - No oxblood left in the frame (Priority: P2)

While the installed app opens, its splash screen and title bar use the 032 colours, not oxblood; the status bar shows
the accent from the first moment.

**Why this priority**: After 032 the screens are graphite; an oxblood flash on opening would undo it.

**Independent Test**: Read the built app's install description and its first status bar colour; open the installed
app and watch the first second.

**Acceptance Scenarios**:

1. **Given** the built app, **When** its install description is read, **Then** the title bar colour is the light
   accent `#1F1F22` and the splash ground is the light paper `#F2F2F0`.
2. **Given** the page before its own script runs, **When** the status bar colour is read, **Then** it is `#1F1F22`.

### Edge Cases

- **A phone with a dark home screen**: the icon's graphite ground is close to it; the rosette's navy and amber carry
  the icon (the owner saw this in the mock-up and chose B).
- **Small sizes** (the browser tab, 32 px and under): the loops blur together into a navy and amber ring; the ring
  and the two colours still read.
- **An installed app from before the update**: phones refresh an installed app's icon on their own schedule; some
  show the old one until the app is reinstalled. Nothing in the app can force it.
- **Offline**: the icons are cached with the app as now, so the new ones show offline after one online open.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every icon the app ships (the two standard sizes, the maskable one and the Apple touch icon) MUST show
  option B: the rosette on `#1F1F22`, halves `#9EBDFA` and `#D9884B`, ring `#ECECEA`.
- **FR-002**: The rosette's shape MUST stay as it is today (the same loops, the same ring); only its colours change.
- **FR-003**: The maskable icon MUST keep the whole rosette inside the safe circle.
- **FR-004**: The installed app's title bar colour MUST be `#1F1F22` and its splash ground `#F2F2F0`.
- **FR-005**: The status bar colour before the page's script runs MUST be `#1F1F22`.
- **FR-006**: PRODUCT.md's icon line MUST describe the new icon; DESIGN.md MUST name it where it describes the frame.
- **FR-007**: No screen of the app changes: day plans, colours on screen and behaviour stay as after 032.

## Success Criteria *(mandatory)*

- **SC-001**: All four icon files show the new colours, checked by reading their pixels, and none of them contains
  oxblood.
- **SC-002**: No oxblood value (`#6E1A28`, `#E7ECE3`) is left in what the build ships.
- **SC-003**: Parity 0: day plans unchanged.
- **SC-004**: On a phone, the installed icon and the splash screen show the new colours.

## Assumptions

- **The splash ground** is the light paper `#F2F2F0`, not graphite: the splash shows before the app knows the user's
  theme, and the light theme is primary (DESIGN.md). The graphite icon reads on it.
- **The title bar** takes the light accent `#1F1F22`; the page then sets the status bar per theme, as in 032.
- **The icons stay generated** by the build, as now; only the colours of the drawing change.
- **Out of scope**: any change to the app's screens, a second icon for dark mode, and an animated or monochrome icon.
