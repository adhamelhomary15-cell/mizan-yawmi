# Feature Specification: Download Exercise Art When Needed

**Feature Branch**: `011-download-exercise-art`

**Created**: 2026-10-15

**Status**: Draft

**Input**: Review of PR #26. That PR embedded the art of 302 exercises in the app file, so the app grew from 233 KB
to 13.7 MB. Only 29 of those drawings belong to the built-in exercises (0.9 MB). The owner's choices
(2026-10-15):
- **Keep in the app**: the art of the built-in exercises only.
- **Everything else**: downloaded only when the user needs it.
- **From where**: the app's own site (the same origin that serves the app), never a third party.
- **When**: only when the user taps «نزّل الرسمة». Nothing is requested without a tap.

## Background

PR #26 added three-frame drawings (start, middle, finish) from the Workout Guide project. Built-in exercises
are matched by id. A custom exercise is matched by its English name against 309 known names. A name with no
match gets a generic figure. All 302 drawings ship inside `index.html`, which hurts in two ways:
- The first load on a phone is about 14 MB.
- Every later update of the app downloads the whole file again, because the app is one file.

The drawings sit as 135,000-character lines inside `src/planner.html`, outside `tools/vendor`. That breaks the
constitution's rule for third-party material, and the license text is not in the repo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Built-in exercises keep their art, and the app is light again (Priority: P1)

The user opens the app for the first time. It loads at about its old size. Every built-in exercise shows its
drawing everywhere it showed in PR #26, with no network.

**Why this priority**: This removes the 13 MB cost, and it is most of the value.

**Independent Test**: Build, then check the size of `index.html`. Open the exercise library offline: all 30
built-in exercises show their drawings.

**Acceptance Scenarios**:

1. **Given** a fresh build, **When** `index.html` is measured, **Then** it is under 2 MB.
2. **Given** the app offline, **When** the user opens the exercise library, a workout, history or a split,
   **Then** every built-in exercise shows its drawing exactly as in PR #26.

---

### User Story 2 - Download the art of an added exercise with one tap (Priority: P1)

The user adds a custom exercise named "Cable Fly". It has a known drawing that is not in the app. It shows the
generic figure, and its page shows «نزّل الرسمة» with a short note that it needs the network once. The user
taps it. The drawing downloads, is kept on the device, and shows everywhere that exercise appears, including
offline later.

**Why this priority**: This is the owner's choice for the other 272 drawings.

**Independent Test**: Add "Cable Fly", open its page, tap «نزّل الرسمة», then go offline and reload. The
drawing is still there.

**Acceptance Scenarios**:

1. **Given** a custom exercise with a known drawing not yet downloaded, **When** any screen shows it, **Then** it
   shows the generic figure and the app makes no network request.
2. **Given** its exercise page, **When** the user taps «نزّل الرسمة», **Then** the app requests that one
   drawing from its own site and nothing else, keeps it on the device, and shows it on every screen.
3. **Given** a downloaded drawing, **When** the app is opened offline or after an app update, **Then** the
   drawing still shows, with no request.
4. **Given** no network, **When** the user taps «نزّل الرسمة», **Then** the app says «مفيش نت دلوقتي. جرّب
   تاني لما يبقى فيه نت.» and keeps the generic figure.
5. **Given** the site answers with an error, **When** the user taps «نزّل الرسمة», **Then** the app says
   «ماقدرتش أنزّل الرسمة دلوقتي. جرّب تاني بعدين.» and keeps the generic figure.
6. **Given** a downloaded file that is not a valid drawing, **When** it arrives, **Then** it is not kept, and
   the app says «الرسمة اللي اتنزلت مش سليمة، ماتحفظتش.»
7. **Given** a browser that cannot keep files (for example a private window), **When** the download succeeds,
   **Then** the drawing shows for this visit, and the app says it will not be kept on this device.
8. **Given** a custom exercise with no known drawing (for example an Arabic name), **When** its page opens,
   **Then** it shows the generic figure and no download button.

### Edge Cases

- A drawing is downloading and the user taps again: no second request; the button reads «بتتنزّل…» and is
  disabled.
- The user renames the exercise to another known name: the button refers to the new name's drawing.
- The app updates: its own cache is replaced, and the downloaded drawings stay.
- A backup does not include downloaded drawings. They can be downloaded again.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app file MUST contain the drawings of the built-in exercises only. The others MUST live as
  separate files on the app's own site.
- **FR-002**: The app MUST NOT make a network request for a drawing unless the user tapped «نزّل الرسمة» for
  that exercise. One tap MUST request exactly one file.
- **FR-003**: The request MUST go to the app's own origin, at a fixed path built from a known drawing name. It
  MUST carry no user data besides that name.
- **FR-004**: A downloaded file MUST be checked before it is kept or shown: three drawings, each an SVG image,
  with no scripts, no event handlers and no outside links.
- **FR-005**: A kept drawing MUST survive an app update and work offline. It MUST be kept apart from progress,
  and it MUST NOT go into backups.
- **FR-006**: The drawings MUST be vendored with their license (CC BY-SA 4.0), attribution, and the upstream
  commit they came from.
- **FR-007**: Drawing code that nothing uses MUST be removed. The exercise page caption MUST describe what is
  actually shown.
- **FR-008**: A dev check MUST fail the build when the app gains any other network call, when a built-in drawing
  is missing, or when `index.html` grows past 2 MB.

### Key Entities

- **Drawing**: three SVG frames for one exercise, named by a slug such as `cable-fly`.
- **Kept drawing**: a downloaded drawing stored in the browser's cache for drawings, apart from the app cache.

## Success Criteria *(mandatory)*

- **SC-001**: `index.html` goes from 13.9 MB to under 2 MB.
- **SC-002**: With no tap, a full session (all tabs, the library, a workout) makes 0 requests for drawings.
- **SC-003**: After one tap and a reload offline, the downloaded drawing shows on every screen.
- **SC-004**: All existing checks still pass, and the new check passes and catches its mutations.

## Assumptions

- GitHub Pages serves every file in the repo, so the vendored files are reachable at a relative path.
- The browser's Cache API is available in a secure context (GitHub Pages and localhost).
- The 309-name list stays in the app; it is small.
