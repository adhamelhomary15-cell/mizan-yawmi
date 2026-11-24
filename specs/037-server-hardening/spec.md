# Feature Specification: Harden the Sync Server Before It Is Deployed

**Feature Branch**: `037-server-hardening`

**Created**: 2026-11-24

**Status**: Draft

**Input**: The owner's request (2026-11-24): harden `server/worker.js` before it is deployed, in seven points: email
limits, lockout abuse, sign-in expiry and cleanup, a wrong-guess limit on a password change, the salt leak, a
Content-Security-Policy, and the PEPPER in the README. Each point gets a test in `server/test.js`; every existing test
still passes. Deployment and other features are out of scope.

## Background

- **The server** (feature 025, `server/worker.js`) is a Cloudflare Worker with a D1 database. It is tested by
  `server/test.js` (13 checks, with a self-test) on Node's built-in SQLite, and is not deployed. The same
  `worker.js` is on `main` and on `025b-sync-app` (the app's sync side, draft PR #54), so a change on `main` reaches
  the sync branch by merging `main` into it.
- **What it does today, against each point** (read in the code):
  1. `POST /signup` sends a confirm email, or an "you already have an account" note, on every call;
     `POST /reset/start` sends a reset link on every call for a confirmed account. No count anywhere.
  2. `POST /signin`: 5 wrong keys in 15 minutes and the account answers «wait» for 15 minutes, whoever is trying. A
     stranger who knows the address can keep it locked.
  3. A sign-in token (`signins`) never expires. `failures` rows are deleted only by a right sign-in or a reset.
     Expired email links are deleted only when a new link is made.
  4. `POST /password` checks the old sign-in key with no count, so a stolen device token can guess the password
     without limit.
  5. `POST /prelogin` returns the real salt for an account that was never confirmed, and a salt made from the PEPPER
     for an address with no account. An unconfirmed account cannot sign in, yet its salt changes each time it signs
     up again, which a made-up salt never does; so the two can be told apart.
  6. **The app already has a strict Content-Security-Policy.** `tools/build.py` adds it to the built page
     (`index.html`), with every inline script and style allowed by hash and `connect-src 'self'`; `src/planner.html`
     has none on purpose, because the hashes are of the built page. `tools/check-security.js` checks it, and the E2E
     tests fail on any CSP violation. On `025b-sync-app`, the build adds the sync server's address to `connect-src`.
  7. The README says nothing about the PEPPER. The deploy steps on `025b-sync-app` (`server/DEPLOY.md`) tell the owner
     to paste it into Cloudflare "without saving it anywhere", which point 7 contradicts.

## Clarifications

### Session 2026-11-24

- Q: Where do the per-IP counts live, when Principle III lists everything the server may hold? → A: In the server's
  own database, as a keyed hash of the IP (never the IP itself), each row deleted within an hour of its window. This
  needs an amendment to Principle III, made with `/speckit-constitution` before the code.
- Q: Does a sign-in expire 60 days after it was last used, or after it was made? → A: After it was last used; a device
  in use stays signed in.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A stranger cannot flood an inbox (Priority: P1)

Someone who knows an email address calls sign-up or "forgot password" for it in a loop. After 3 emails in an hour
the address gets nothing more; after 10 requests in an hour from one network, the server answers «wait» with how long.

**Why this priority**: every email costs the sender's quota (Resend's free tier) and annoys the owner of the address.

**Independent Test**: Call `/reset/start` for one account 5 times: 3 emails arrive, the answer stays 200; an hour
later a 4th email can go. From one IP, the 11th email request in an hour gets 429 and a wait time.

**Acceptance Scenarios**:

1. **Given** 3 emails sent to an address in the last hour, **When** a 4th is asked for, **Then** no email is sent and
   the answer is the usual 200 (a 429 here would tell a stranger the address has an account; see Decisions).
2. **Given** 10 email requests from one IP in the last hour, **When** another comes for any address, **Then** 429 and
   no email.
3. **Given** an address with no account, **When** `/reset/start` is called any number of times, **Then** every answer
   is the same as for an account at or below its limit, so the limit reveals nothing.

---

### User Story 2 - A stranger cannot keep someone locked out (Priority: P1)

Wrong sign-ins from one IP stop that IP for a while. Wrong sign-ins on one account lock it for a shorter time than
today, so the owner can get back in soon even while someone is trying.

**Why this priority**: today one person who knows the address can lock the owner out for as long as they keep going.

**Independent Test**: 20 wrong sign-ins from one IP over several accounts: the IP gets 429; the owner, from another
IP, signs in. 10 wrong on one account: it waits 5 minutes, not 15.

**Acceptance Scenarios**:

1. **Given** 20 wrong sign-ins from one IP in 15 minutes, **When** that IP tries again, **Then** 429 for 15 minutes.
2. **Given** 10 wrong sign-ins on one account in 5 minutes, **When** anyone tries it, **Then** 429 for 5 minutes, then
   the right key works.
3. **Given** a right sign-in, **When** it succeeds, **Then** that account's failures are cleared, as today.

---

### User Story 3 - Old sign-ins and old rows do not stay forever (Priority: P2)

A device not used for 60 days is signed out; it signs in again with the password. Expired sign-ins, old failures,
old counts and expired email links are deleted as the server works, without a scheduled job.

**Why this priority**: a lost phone's token should stop working by itself, and the database should hold only what it
needs.

**Independent Test**: Move the clock 61 days: the old token gets 401, and its row, old failures and expired links are
gone after the next sign-in or sign-up.

**Acceptance Scenarios**:

1. **Given** a token unused for more than 60 days, **When** it is used, **Then** 401 and its row is deleted.
2. **Given** a token used every week, **When** 90 days pass, **Then** it still works.
3. **Given** failures and counts older than their window, and expired email links, **When** anyone signs in or asks
   for an email, **Then** they are deleted.

---

### User Story 4 - A password change cannot be used to guess (Priority: P2)

On `/password`, 5 wrong old keys in 15 minutes and the account's password change answers «wait».

**Why this priority**: a signed-in device (or a stolen token) should not be a free guessing machine.

**Independent Test**: 5 wrong `/password` calls: the 6th, even with the right key, gets 429; 15 minutes later the
right one works.

**Acceptance Scenarios**:

1. **Given** 5 wrong old keys in 15 minutes on `/password`, **When** a 6th call comes, **Then** 429.
2. **Given** a right change, **When** it succeeds, **Then** the count is cleared.

---

### User Story 5 - Nobody can tell whether an address signed up (Priority: P2)

`/prelogin` gives an unconfirmed account the same made-up salt as an address with no account.

**Why this priority**: who uses the app is private; the server already hides it on every other route.

**Independent Test**: Sign up without confirming, sign up again: the salt from `/prelogin` is the same both times and
equals the one for the same address before any sign-up; once confirmed, the real salt comes back.

**Acceptance Scenarios**:

1. **Given** an unconfirmed account, **When** `/prelogin` is called, **Then** it returns the made-up salt for that
   address, unchanged across sign-ups.
2. **Given** a confirmed account, **When** `/prelogin` is called, **Then** it returns the account's salt, as today.

---

### User Story 6 - The owner knows what the PEPPER is and keeps it safe (Priority: P3)

The README explains that the PEPPER is mixed into every sign-in check and every made-up salt; that losing or changing
it makes every account unable to sign in (the encrypted copies stay, but nobody can reach them, and each person must
delete the account and sync again from a device); and how to keep one copy safely: in a password manager, never in the
repo, the chat or a plain file.

**Acceptance Scenarios**:

1. **Given** the README, **When** the owner reads the sync server part, **Then** it says the above in Egyptian
   Arabic, and the deploy steps no longer say to throw the value away.

### Edge Cases

- **Many people behind one IP** (a university network): the IP limits are high enough for normal use (20 wrong
  sign-ins, 10 emails per hour); only the IP is slowed, never the accounts behind it.
- **No IP header** (local tests, a misconfigured proxy): the per-IP limits are skipped and the per-account and
  per-address limits still hold.
- **The limits answer before the work**: a refused request sends no email, writes no account and does not check a key.
- **Point 6 (CSP)**: no change to the app's CSP on `main` (see FR-010).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `/signup` and `/reset/start` MUST send at most 3 emails per address per hour, counting every email the
  server sends to it. Beyond that they send nothing and give the usual answer (200), not 429.
- **FR-002**: The same routes MUST accept at most 10 email requests per IP per hour, and answer 429
  `{error: 'wait', retryAfter}` beyond that, sending nothing.
- **FR-003**: `/signin` MUST lock an account after 10 wrong keys in 5 minutes, for 5 minutes (today: 5 in 15, for 15).
- **FR-004**: `/signin` MUST stop an IP after 20 wrong keys in 15 minutes, for 15 minutes, whatever the accounts.
- **FR-005**: `/password` MUST answer 429 after 5 wrong old keys on the account in 15 minutes, and clear the count on
  a right change.
- **FR-006**: `/prelogin` MUST return the made-up salt for an account that is not confirmed.
- **FR-007**: A sign-in MUST stop working, and its row be deleted, 60 days after it was last used.
- **FR-008**: Expired sign-ins, failures and counts older than their window, and expired email links MUST be deleted
  while the server answers requests (on sign-in and on email requests), with no scheduled job.
- **FR-009**: The README MUST explain the PEPPER as in User Story 6.
- **FR-010**: The app's Content-Security-Policy MUST stay as strict as it is: no change on `main`. The sync server's
  address in `connect-src` is part of `025b-sync-app` and is checked there.
- **FR-011**: Every point MUST have a check in `server/test.js`, with self-test mutations it notices; every existing
  check MUST still pass; the encryption, the key handling and what is stored for an account MUST NOT change.

## Success Criteria *(mandatory)*

- **SC-001**: No address gets more than 3 emails from the server in any hour.
- **SC-002**: An account under attack from one IP is reachable by its owner from another IP at once, and from the same
  IP within 15 minutes.
- **SC-003**: No sign-in older than 60 days unused works.
- **SC-004**: `/prelogin` answers are the same for "no account" and "not confirmed", over any number of sign-ups.
- **SC-005**: All server checks, their self-test, and every rule checker pass.

## Decisions that differ from the request

- **Point 1, the 429 per address**: a «wait» answer for one address only happens when that address has an account
  (an address with no account is never sent anything, so it never reaches the limit). Answering 429 would let anyone
  find out who uses the app, which the server hides everywhere else (the same answer for a new and a known address).
  So the per-address limit stops the emails silently; the per-IP limit answers 429, which says nothing about any
  address.
- **Point 6, the CSP**: the app already has a strict one, made by the build (see Background); adding one to
  `src/planner.html` would give the page two, and `tools/check-security.js` refuses that. Nothing changes on `main`.
- **Point 7, the PEPPER**: the README asks the owner to keep one safe copy, which reverses the deploy steps' "do not
  save it anywhere"; those steps live on `025b-sync-app` and are fixed there.
- **Counts per address** are kept per account (every email the server sends goes to an account), so no row is made
  for an address without one. Signing up again on an unconfirmed account updates it in place instead of deleting and
  recreating it, so the count survives.

## Assumptions

- **The numbers** (3 per address and 10 per IP per hour; 10 wrong in 5 minutes per account; 20 in 15 minutes per IP;
  5 in 15 minutes on `/password`) are defaults for a small app, easy to change in one place.
- **The IP** comes from Cloudflare's `CF-Connecting-IP` header.
- **The schema** (`server/schema.sql`) can change freely: nothing is deployed, so there is no migration.
- **Out of scope**: deployment, the app's sync screens, `server/DEPLOY.md` on `025b-sync-app` beyond pointing to the
  README (that file belongs to the branch; it is changed there after this merges).
