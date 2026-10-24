# Feature Specification: New Versions on Return, and the Version in Settings

**Feature Branch**: `026-update-on-return`

**Created**: 2026-10-24

**Status**: Draft

**Input**: The owner's report (2026-10-24): many features merged and published did not show on the phone. The
published site serves the newest build, so the phone keeps an older copy. The owner asked for two things: the app
looks for a new version when it comes back from the background, and the version shows in Settings.

## Background

The app works offline: a service worker keeps every file on the device and serves them first. A new build has a new
cache name (`mizan-<10 characters>`, made by `tools/build.py` from the built page), so a new version arrives as a
new service worker:
1. The browser checks for a new worker when the page **loads**: a full launch, or a reload.
2. The new worker installs in the background and takes over.
3. The page shows «فيه نسخة جديدة من التطبيق» with «افتحها» (`src/app/21-shell.js`). The next full launch shows the
   new version anyway.

What goes wrong:
- **An app installed on the home screen is mostly resumed, not launched.** Phones keep it in the background, and
  opening it from the icon brings back the same page, which never loads again. So the browser does not check for a
  new version, sometimes for days.
- **Nothing shows which version is running.** The owner can only guess by looking for the newest features.

The version cannot be written into the page itself, because it is computed from the finished page.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A new version is found when the app comes back (Priority: P1)

The user opens the app from the background (switching back to it, or tapping its icon while it is still in memory).
The app checks for a new version. If one is published, it downloads in the background, and the existing notice
«فيه نسخة جديدة من التطبيق» appears with «افتحها».

**Why this priority**: This is the reported problem. Without it, published features can take days to reach the phone.

**Independent Test**: Open the app, then publish a new build. Switch to another app and back: the notice appears
within a few seconds, and «افتحها» shows the new version.

**Acceptance Scenarios**:

1. **Given** a newer version is published, **When** the app comes back to the foreground with internet, **Then** the
   notice appears within 10 seconds, with no reload and no tap.
2. **Given** no newer version, **When** the app comes back, **Then** nothing changes on screen.
3. **Given** no internet, **When** the app comes back, **Then** nothing changes and no error shows; the app keeps
   working offline.
4. **Given** the app comes back several times within a minute, **When** it checks, **Then** it checks at most once in
   that minute.
5. **Given** the user is typing or has a dialog open, **When** a new version arrives, **Then** nothing reloads on its
   own; only the notice appears, as today.

---

### User Story 2 - Seeing the version in Settings (Priority: P2)

In Settings, a line shows the version running on this device: the same short code the published site carries, and
the date that version reached this device.

**Why this priority**: It lets the owner check at a glance whether the phone has the newest version, by comparing
with the site or with what was just merged.

**Independent Test**: Open Settings on the phone and on a computer browser opened at the published site: both show
the same code once the phone has updated.

**Acceptance Scenarios**:

1. **Given** the app is open, **When** the user opens Settings, **Then** a line shows the running version's code and
   date.
2. **Given** a new version has been downloaded but not opened yet, **When** the user opens Settings, **Then** the line
   still shows the running version, and says a newer one is ready.
3. **Given** the app runs without a service worker (an unsupported or private browser), **When** Settings opens,
   **Then** the line says the version is unknown, with no error.

---

### Edge Cases

- **The first install** is not an update: no notice, as today.
- **Two versions published while the app was away**: the newest one is fetched; the user never sees the one between.
- **A check that fails halfway** (the connection drops): the running version stays, and the next return tries again.
- **Several tabs of the app open on a computer**: each shows the notice; opening the new version in one does not
  lose data in the others, as today.
- **The user's data**: progress, settings, workouts and the look (022) are untouched by an update, as today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the app comes back to the foreground, it MUST check for a newer published version, at most once a
  minute.
- **FR-002**: A newer version found this way MUST show the existing notice «فيه نسخة جديدة من التطبيق» with «افتحها».
  Nothing MUST reload without the user's tap.
- **FR-003**: Without internet, a check MUST fail quietly: no error, no change, and the app keeps working offline.
- **FR-004**: Settings MUST show the running version's short code (the same one the published site carries) and its
  date it reached this device, and say when a newer version is ready.
- **FR-005**: An update MUST NOT change any stored data: progress, settings, workouts, backups or the look
  (Principles II and III).
- **FR-006**: Checking MUST contact only the app's own site (Principle III), and add no library.

### Key Entities

- **Version**: the short code of a build (today's cache name without `mizan-`) and the date it was built. Read from
  what is installed on the device, not stored by the app.

## Success Criteria *(mandatory)*

- **SC-001**: After a new version is published, switching back to the app with internet shows the notice within 10
  seconds, in 100% of tested cases, with no full close of the app.
- **SC-002**: The version in Settings matches the published site's code once the new version is opened.
- **SC-003**: Offline, coming back to the app shows no error, in 100% of tested cases.
- **SC-004**: Parity 0: day plans are the same as before this feature.

## Assumptions

- "Coming back" is the moment the app becomes visible again (from another app, the home screen or a locked phone).
- Once a minute is often enough; the app is opened many times a day, but versions are published a few times a week.
- The version shows as the code and the date it reached this device, for example «0179b61234 · وصلت 23 أكتوبر»: the
  date tells at a glance whether it is old, and the code allows an exact comparison. The owner had no preference; this
  is the default. It is the arrival date, not the build date, because the build must give the same files for the same
  source, so it cannot write a date (plan, decision 3).
- How a browser handles an installed app in the background differs between phones. The check runs on every return the
  browser reports. A phone that reports none still gets the new version on a full launch, as today.

## Clarifications

### Session 2026-10-24

- Q: Add a «دوّر على نسخة جديدة» button in Settings? → A: No. Only the two things asked: the check on return, and the
  version in Settings.
- Q: How does the version show? → A: No preference; the default is the code and a date. The plan makes the date the
  day the version reached the device (the build cannot write its own date).
