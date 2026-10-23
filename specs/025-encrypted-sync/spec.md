# Feature Specification: Encrypted Sync Across Devices

**Feature Branch**: `025-encrypted-sync`

**Created**: 2026-10-24

**Status**: Draft

**Input**: The next foundation step after constitution 3.0.0 (Principle III, PR #49). The owner's choices (2026-10-24):
- the server runs on Cloudflare Workers;
- accounts use email and password, and the password is never sent: separate keys come from it for encryption and for
  sign-in, and a recovery code is shown once;
- sync comes first, and reminders (026) come later on the same server.

## Background

All of the owner's data lives in one browser on one device: ticks, postponed items, tasks, courses, workouts, the
schedule and its history. The device keeps several copies (013): the main one, a second copy, daily snapshots, and the
backup file the owner saves by hand. But if the phone is lost, or the browser clears the site's data (Safari can do so
on its own), everything since the last backup file is gone. And a second device, such as a laptop, starts empty.

Constitution 3.0.0 allows one way out: a **synced copy** that the owner turns on, encrypted on the device with a key
the server never sees. This feature builds it. Reminders, which will use the same server, are feature 026.

The app already has an older "synced copy" path that only works when the app runs inside another host's page. It never
runs in the installed app, and this feature replaces it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Turn sync on, and the data is safe off the phone (Priority: P1)

In Settings the owner opens «المزامنة», makes an account with their email and a password, and confirms the email. The
app shows a recovery code once and asks them to keep it. From then on, every change is sent, encrypted, within a short
time. If the phone is lost, the data can be brought back on a new device.

**Why this priority**: This is the protection the owner asked for. Without it, a lost or wiped phone loses everything
since the last backup file.

**Independent Test**: Make an account on one device and tick a block. Then, on a fresh browser with no data, sign in
with the same email and password: the tick, the tasks, the workouts and the schedule (with its history) are all there.
Read the server's stored copy directly: it holds no title, task text or schedule in readable form.

**Acceptance Scenarios**:

1. **Given** sync is off, **When** the owner opens Settings, **Then** «المزامنة» explains in one short paragraph what
   is sent (an encrypted copy), what the server can see (the email, sizes and times), and that it is optional.
2. **Given** the sign-up form, **When** the owner enters an email and a password of at least 10 characters and
   confirms, **Then** an email arrives to confirm the address, and sync starts only after it is confirmed.
3. **Given** a confirmed account, **When** sync starts, **Then** the app shows the recovery code once. The owner can
   copy or save it, and the app says plainly that without the password or this code the server copy cannot be opened.
4. **Given** sync is on, **When** the owner makes any change (a tick, a task, a workout set, a schedule save),
   **Then** the encrypted copy on the server is updated within 1 minute when the device is online.
5. **Given** sync is on, **When** the owner looks at Settings, **Then** it shows the account's email, when the last
   sync went through, and whether there are changes still waiting to be sent.

---

### User Story 2 - A second device joins, and nothing is lost on either (Priority: P1)

The owner already uses the app on the phone, and opens it on a laptop where they also ticked a few things. They sign in
on the laptop. The laptop's own ticks and the phone's ticks both end up on both devices. Neither device's data replaces
the other's.

**Why this priority**: A second device is the main reason to sync, and joining is where data is most likely to be lost.

**Independent Test**: Two browsers, each with different ticks, tasks and a workout. Sign both in to one account: both
end up with the union of the two, and nothing either one had is gone.

**Acceptance Scenarios**:

1. **Given** a device with its own data and an account with data, **When** the owner signs in on that device, **Then**
   ticks, postponed marks, extra blocks, tasks, appointments, added courses and workouts from both are kept.
2. **Given** both have a schedule, **When** they differ, **Then** the app asks once which one to keep («جدول الحساب» or
   «جدول الجهاز ده»), and shows the name and days of each. The schedule not chosen stays in a backup the app saves
   first. Nothing is chosen silently.
3. **Given** two devices signed in, **When** a change is made on one, **Then** the other shows it within 1 minute once
   both are online, with no reload.

---

### User Story 3 - Offline, and changes on two devices at once (Priority: P1)

The owner ticks blocks on the phone with no signal, and meanwhile adds a task on the laptop. When the phone comes back
online, both devices end up with the ticks and the task.

**Why this priority**: The app is used outdoors with poor signal (Principle IV). Sync must never make offline use worse
or lose an offline change.

**Independent Test**: Take one device offline and make changes on both. Bring it back online: both changes are on both
devices. Repeat with the same block ticked on one device and cancelled on the other: the later change wins, and the
earlier one is kept in the day's history.

**Acceptance Scenarios**:

1. **Given** sync is on and the device is offline, **When** the owner uses the app, **Then** everything works as with
   sync off, and Settings says there are changes waiting.
2. **Given** waiting changes, **When** the device is online again, **Then** they are sent within 1 minute, with no
   action from the owner.
3. **Given** different items changed on two devices (for example, ticks on different blocks, or two new tasks),
   **When** both sync, **Then** every change is kept.
4. **Given** the same item changed on two devices (the same block ticked on one and cancelled on the other, or one task
   edited on both), **When** both sync, **Then** the change made later wins on both devices, and the other is not
   silently lost: it stays in that day's snapshot (013).
5. **Given** the schedule saved on two devices, **When** both sync, **Then** the later save wins, and the other device
   shows «الجدول اتغيّر من جهاز تاني» once.

---

### User Story 4 - A forgotten password, a new password, and the recovery code (Priority: P2)

The owner changes the password from Settings: nothing has to be uploaded again, and other devices ask for the new
password. Later they forget it and use «نسيت الباسورد»: with the recovery code, the account and its copy are back. Without
the code, the app says plainly that the server copy will be deleted and filled again from this device.

**Why this priority**: Passwords get forgotten. The rules must be clear, and the device copy must never be at risk.

**Independent Test**:
- Change the password: the other device asks for it again and keeps working with it.
- Reset with the recovery code: everything is still there.
- Reset without it: the server copy is replaced by the current device's data, and the app said so before.

**Acceptance Scenarios**:

1. **Given** a signed-in device, **When** the owner changes the password (with the old one), **Then** the server copy
   opens with the new one, and every other device asks for it once.
2. **Given** «نسيت الباسورد», **When** the owner confirms from the email and enters the recovery code, **Then** they set
   a new password and the server copy is kept.
3. **Given** «نسيت الباسورد» without the recovery code, **When** the owner confirms from the email, **Then** the app
   first says that the server copy will be deleted, and that this device's data will be kept and sent again. Only after
   the owner agrees does it go ahead, and it shows a new recovery code.
4. **Given** any of these, **Then** no data on any device is deleted.

---

### User Story 5 - Sign out of one device, or turn sync off and delete the server copy (Priority: P2)

The owner gives away an old phone. They sign out there. On another day they decide to stop syncing altogether: they turn
sync off, and the server copy and the account are deleted.

**Why this priority**: The constitution requires that turning sync off deletes the server copy, and leaving one device
must not do that by mistake.

**Independent Test**:
- Sign out on one device: its local data stays, sync stops there, and the other device keeps syncing.
- Turn sync off: after confirming, the server holds nothing for that account, and each device keeps its own data.

**Acceptance Scenarios**:

1. **Given** a signed-in device, **When** the owner taps «اخرج من الجهاز ده», **Then** sync stops on it, the stored key
   is removed from it, its data stays, and the account and the other devices are not affected.
2. **Given** a signed-in device, **When** the owner taps «اقفل المزامنة وامسح نسختها», **Then** the app asks first and
   says what will be deleted. After confirming, the account, its copy and every device's sign-in on the server are
   deleted, and each device keeps its own data.
3. **Given** the owner asked to keep the data on this device only when signing out, **Then** the device's data is never
   cleared by signing out.

---

### Edge Cases

- **Sync off is the default**: nothing changes for anyone who never opens «المزامنة». With sync off, the app sends no
  request to the sync server.
- **No connection to the server** (down, blocked, or slow): the app keeps working; changes wait; Settings says when the
  last sync went through.
- **Data from a newer app version** on the server: it is not overwritten, and the device says to update the app (as
  with stored data in 013).
- **A damaged or unreadable server copy**: it is never merged into the device; the app says so and keeps the device
  data.
- **The wrong password on a second device**: sign-in fails with a short message; after several failures, tries are
  slowed down.
- **A restore from a backup file while sync is on**: it is a change like any other, so it is synced, after the restore's
  usual preview.
- **Marks**: sync carries only marks made by the owner, as they are; it never creates or clears one (Principle II).
- **Size**: a year of data stays well under the server's limits; one save sends only what changed, or the whole copy
  when it is small.
- **Two tabs on one device**: they sync as one device.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Settings MUST offer «المزامنة», off by default. With sync off, the app MUST behave and send exactly as
  today.
- **FR-002**: The owner MUST be able to make an account with an email and a password (10 characters or more), and the
  email MUST be confirmed before the first sync.
- **FR-003**: Data MUST be encrypted on the device before it is sent, with a key the server never receives. The password
  MUST NOT be sent; sign-in MUST use a separate value derived from it (Principle III).
- **FR-004**: A recovery code MUST be shown once when the account is made. Together with the email, it MUST let the
  owner set a new password and keep the server copy.
- **FR-005**: The server MUST hold only:
  - the email;
  - a sign-in verifier;
  - the encrypted copy, with its size and save times;
  - the devices' sign-ins.

  It MUST NOT log request bodies.
- **FR-006**: The synced data MUST be the three stores: progress, workouts, and settings with their history.
- **FR-007**: Changes MUST be merged per item:
  - marks per block and day;
  - tasks, appointments, added courses, extra blocks and workouts by their own id.

  When the same item changed on two devices, the later change MUST win, and the device that lost keeps its version in
  that day's snapshot. The settings MUST be merged as one item, the later save winning, with a one-time notice on the
  other device.
- **FR-008**: The first sign-in on a device that has data MUST keep both sides (FR-007). When the schedules differ, the
  app MUST ask which one to keep, after saving a backup of the device's data.
- **FR-009**: With the device online, a change MUST reach the server, and the other signed-in devices, within 1 minute.
  Offline changes MUST wait and be sent when the device is online again.
- **FR-010**: Changing the password MUST keep the server copy and MUST NOT require uploading again. Other devices MUST
  ask for the new password.
- **FR-011**: «نسيت الباسورد» MUST work by email. With the recovery code it keeps the server copy. Without it, it MUST
  first warn, then replace the server copy with this device's data and show a new recovery code.
- **FR-012**: «اخرج من الجهاز ده» MUST stop sync on that device and remove its stored key, without touching the account
  or any device's data.
- **FR-013**: «اقفل المزامنة وامسح نسختها» MUST ask first, then delete the account, its copy and every sign-in on the
  server. No device's data is deleted (Principle III).
- **FR-014**: Sync MUST NOT create or clear a mark (Principle II), and MUST never overwrite data from a newer app
  version.
- **FR-015**: The only new address the app may reach MUST be the sync server, listed in the page's security policy.
  Every outside service the server uses (the email sender) MUST be named and approved in the plan (Principle III).
- **FR-016**: Sign-in MUST slow down repeated failures. Every request to the server MUST be checked against the account
  it claims.
- **FR-017**: The older synced-copy path that runs only inside another host's page MUST be removed.
- **FR-018**: Copy in Egyptian Arabic, right to left, 44 px controls, no sideways scroll at 375 px (Principle V). The
  repository holds no secret, key or personal data (Principle VI).

### Key Entities

- **Account**: an email, a sign-in verifier, and the encrypted key that opens the data, wrapped twice: by the password
  and by the recovery code.
- **Synced copy**: the encrypted stores of one account, with their sizes and save times.
- **Device sign-in**: one device's access to the account, which can be removed alone.
- **Change**: one item added, changed or removed on a device, with the moment it happened, merged into the copy.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Making an account and seeing the first sync go through takes under 3 minutes, email confirmation
  included.
- **SC-002**: A change on one online device shows on another online device within 1 minute, in 95% of tries.
- **SC-003**: In every tested scenario of two devices changing data at once or offline, 0 marks, tasks or workouts are
  lost.
- **SC-004**: A direct read of everything the server stores for an account contains no title, task text, subject,
  course name, schedule, place or note in readable form.
- **SC-005**: With sync off, the app's day plans and behaviour are identical to today's (parity 0, and no request to the
  sync server).
- **SC-006**: Turning sync off leaves nothing stored for that account on the server.
- **SC-007**: A lost phone costs at most the changes of its last minute online.

## Assumptions

- One account is used by one person on their own devices. Sharing with other people is out of scope.
- The app is offered to no one but the owner until review item C4 is closed (constitution 3.0.0, Constraints).
- An email sender is needed to confirm addresses and to reset passwords. It will be named and approved in the plan.
- The owner keeps saving backup files as before. Sync adds a copy; it does not replace the backup file.
- The free tiers of the server and the email sender are enough for one person.
- Out of scope:
  - reminders (026);
  - signing in with Google or another provider;
  - sharing;
  - showing past versions from the server;
  - opening the app to others before C4.
