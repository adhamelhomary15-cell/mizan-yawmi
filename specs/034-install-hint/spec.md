# Feature Specification: How to Add the App to the Home Screen

**Feature Branch**: `034-install-hint`

**Created**: 2026-11-15

**Status**: Draft

**Input**: The owner's pilot plan (`docs/pilot-plan.md`, section 2) names this as the one thing to do before the app is
sent to 10–20 people. The owner asked (2026-11-15) for the iPhone first, then Android.

## Background

- **Why it matters on an iPhone**: Safari may clear a website's stored data when the site is not used for a while.
  An app added to the home screen keeps its data. Every mark, task and setting of ميزان يومي lives only on the phone
  (Principle III), so on an iPhone, not adding it can lose everything.
- **Safari never offers to install**: there is no install button and no event the app can react to. The only way is
  by hand: the Share button, then «Add to Home Screen». Most people do not know it exists.
- **Android today**: Chrome on Android offers installing, and the app already shows «ثبّت ميزان يومي» with a «ثبّت»
  button when Chrome allows it (`src/app/21-shell.js:39`). Other Android browsers (Firefox, Samsung Internet in some
  versions) never fire that offer, so their users see nothing, and the button disappears once Chrome stops offering
  it.
- **Settings** already says whether the browser agreed to keep the data («المتصفح هيحتفظ ببياناتك…» or «… ممكن يمسح
  البيانات…», `src/app/15-settings-view.js:61`).

## Clarifications

None open. The defaults below (when the notice shows, how it is dismissed, where the steps stay) are in Assumptions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - iPhone: told how to add it, once (Priority: P1)

A person opens the app in Safari on an iPhone (or iPad), not from the home screen. Above the day, a notice explains in
one line why it matters and, in two short steps, how: tap Share, then «إضافة إلى الشاشة الرئيسية». A small drawing of
the Share icon sits beside the first step, so it can be found. «تمام» hides the notice on that phone for good. Once
the app is opened from the home screen, the notice never shows.

**Why this priority**: On an iPhone, not adding the app can lose all of a person's data; the pilot depends on it.

**Independent Test**: Open the app as Safari on iPhone: the notice shows with both steps; tap «تمام»: it hides and
stays hidden after a reload; open it as an installed app: no notice.

**Acceptance Scenarios**:

1. **Given** Safari on an iPhone or iPad, not opened from the home screen, **When** the app opens, **Then** the notice
   shows above the day with the reason, the two steps and the Share drawing.
2. **Given** the notice, **When** «تمام» is tapped, **Then** it hides, and stays hidden on later opens on that phone.
3. **Given** the app opened from the home screen, **When** it opens, **Then** no notice shows.
4. **Given** any other phone or a computer, **When** the app opens, **Then** the iPhone notice does not show.

---

### User Story 2 - Android: steps when there is no install button (Priority: P2)

A person opens the app on Android in a browser that does not offer installing (or after Chrome stopped offering it),
not from the home screen. The same kind of notice shows the Android steps: the browser's menu, then «تثبيت التطبيق»
or «إضافة إلى الشاشة الرئيسية». When Chrome does offer installing, the existing «ثبّت» button shows instead, and the
steps do not.

**Why this priority**: Android browsers keep data more reliably than Safari, so this is lighter; it still helps the
pilot's Android users find the app again.

**Independent Test**: As Android without the install offer: the steps show; with the offer: the «ثبّت» button shows
and the steps do not; «تمام» hides the steps for good.

**Acceptance Scenarios**:

1. **Given** an Android phone, no install offer from the browser, not opened from the home screen, **When** the app
   opens, **Then** the Android steps show.
2. **Given** the browser offers installing, **When** the app opens, **Then** only the «ثبّت» button shows.
3. **Given** the steps, **When** «تمام» is tapped, **Then** they hide for good on that phone.

---

### User Story 3 - The steps stay findable in Settings (Priority: P3)

After «تمام», a person may still want the steps. In Settings, next to whether the browser keeps the data, a short line
shows the steps for that phone while the app is not opened from the home screen.

**Why this priority**: «تمام» should not make the steps impossible to find again.

**Independent Test**: Dismiss the notice, open Settings: the line with the steps is there; open as installed: it is
not.

**Acceptance Scenarios**:

1. **Given** an iPhone or Android phone, not opened from the home screen, **When** Settings opens, **Then** it shows
   the steps for that phone, whether or not the notice was dismissed.

### Edge Cases

- **iPad with a desktop-style browser identity**: recognised as an iPad by its touch screen, so it gets the iPhone
  steps.
- **Browsers inside other apps** (WhatsApp, Instagram): they cannot add to the home screen. The notice says to open the
  link in Safari (iPhone) or the browser (Android) first.
- **Storage blocked** (private browsing): «تمام» hides the notice until the page closes; nothing breaks.
- **A computer**: no notice; Chrome on a computer keeps its existing «ثبّت» button.
- **Language**: the copy is in Egyptian Arabic like the rest of the app; the browser's own menu names may be in another
  language, so the steps describe the icon and the position as well as the words.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On an iPhone or iPad in a browser (not opened from the home screen), the app MUST show a notice with the
  reason and the two steps, with a drawing of the Share icon.
- **FR-002**: On Android in a browser, with no install offer from the browser, the app MUST show the Android steps.
- **FR-003**: When the browser offers installing, the existing «ثبّت» button MUST show, and the Android steps MUST NOT.
- **FR-004**: Opened from the home screen, no notice and no Settings line MUST show.
- **FR-005**: «تمام» MUST hide the notice for good on that device, kept on the device only, outside the progress, the
  settings and the backup.
- **FR-006**: Settings MUST show the steps for the device while the app is not opened from the home screen.
- **FR-007**: Inside another app's browser, the notice MUST say to open the link in Safari or the browser first.
- **FR-008**: No network, no tracking, no stored data changes shape (Principle III).

## Success Criteria *(mandatory)*

- **SC-001**: In the pilot, every iPhone tester adds the app to the home screen in the first day (asked on day 0).
- **SC-002**: The notice never shows on a computer or in an app opened from the home screen.
- **SC-003**: A tester can find the steps again from Settings after dismissing them.
- **SC-004**: Parity 0: day plans unchanged.

## Assumptions

- **Order**: phase 1 is the iPhone (US1 and its Settings line); phase 2 is Android (US2 and its Settings line). Each
  phase can ship on its own.
- **Placement**: the notice sits with the app's other notices above the day, in the same look.
- **Dismissal** is per device and for good; there is no "remind me later", to keep it calm.
- **The Share drawing** is a simple line icon in the app's style, not Apple's artwork.
- **Out of scope**: a backup reminder and an easier first run (the pilot plan's other two items, separate features).
