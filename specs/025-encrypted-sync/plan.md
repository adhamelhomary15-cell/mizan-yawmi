# Implementation Plan: Encrypted Sync Across Devices

**Branch**: `025-encrypted-sync` | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)

## Summary

A small server on Cloudflare Workers holds one encrypted copy per account, with accounts, sign-ins and the wrapped data
key in a D1 database. The app encrypts each store on the device and sends it. On every sync it downloads the other
devices' copy, decrypts it, merges it item by item, and sends the result back, guarded by a version number. All merging
happens on the device, because the server never sees plain data.

As in 014 to 021, the decisions, data model and checks are kept in this file. The work is split into two PRs (see
Phases): the server, then the app.

## Technical Context

- **App**: JavaScript in one page (Preact and htm), built by `tools/build.py` from `src/app/*.js`. Its cryptography is
  the browser's own Web Crypto, with no library.
- **Server** (new, in `server/`): one Cloudflare Worker module in plain JavaScript, with no framework, and a D1
  (SQLite) database.
- **Tests**:
  - `tools/check-sync.js`: merge rules, with oracles and mutations;
  - `tools/check-crypto.js`: known-answer tests, run in Node's Web Crypto;
  - `server/test.js`: the Worker's handler on Node's built-in `node:sqlite` standing in for D1, with no new package;
  - Playwright E2E against a local copy of the server.
- **Target**: phone browsers at 375 px, offline first. With sync off, nothing changes.
- **Constraints**:
  - no file over 600 lines, and no unused code;
  - the server logs no request bodies;
  - secrets live only in the Worker's environment.

## Constitution Check (v3.0.1)

| Principle | Status |
|---|---|
| I. Human review | Every outside action waits for the owner: making the Cloudflare and email accounts, setting the secrets, deploying, and the CSP address. See "Approvals needed". |
| II. Checking off is human | Merging carries marks as they are, by item and time. It never creates or clears one. `check-sync` proves it with a mutation. |
| III. Encrypted, opt-in | Off by default. Encrypted on the device (AES-GCM, a 256-bit random data key). The password is never sent: two separate keys come from it. The server holds only what 3.0.1 lists. |
| IV. Offline | Changes wait in the device and go when it is online. With sync off, the app sends nothing to the server. |
| V. Simple, single file | The app stays one file. The server is one small module in `server/`, which is not part of the page. |
| VI. General repo | No secret, key or personal data in the repo. The tests use generated accounts only. |
| Constraints | The server's code lives here and is tested. It logs no bodies and checks the account on every request. The app is offered to no one else before C4. |

All gates pass, provided the approvals below are given.

## Approvals needed (Principle I and III)

1. **Email sender: Resend** (a free plan, 3,000 emails a month).
   - It is used only for confirming the address and for «نسيت الباسورد».
   - Without a domain of our own, Resend sends only to the account owner's own address, which is enough while the app is
     the owner's alone (C4). A domain will be needed when C4 is closed anyway.
   - **Rejected**: Postmark (100 emails a month), and MailChannels (no longer free).
2. **A Cloudflare account**, which the owner makes. With it:
   - a D1 database;
   - a Worker at `mizan-sync.<account>.workers.dev`;
   - the Worker's secrets, set by the owner: the Resend key and a server pepper.
3. **`wrangler`**, the Cloudflare tool used to deploy. It runs from `server/` with `npx`, pinned in
   `server/package-lock.json`, like Playwright in `tests/e2e`. It is never part of the app.
4. **The CSP address**: `connect-src` gains exactly the Worker's address, nothing else.

## Decisions (research)

1. **Keys (Web Crypto only).**
   - **The root**: PBKDF2-SHA-256 with 600,000 iterations, over the password and a random 16-byte salt per account.
   - **Two keys from the root** (HKDF-SHA-256, with different labels): the **wrapping key**, which never leaves the
     device, and the **sign-in key**, which is sent.
   - **The server** stores SHA-256(sign-in key ‖ pepper) as the verifier. The pepper is a Worker secret.
   - **The data key**: a random AES-GCM 256-bit key. The server stores it wrapped twice: by the wrapping key, and by a
     key from the recovery code (128 random bits, shown as 8 groups of 4 letters).
   - **Changing the password** rewraps the data key. No data is sent again.
   - **Rejected**: Argon2, because the browser has no built-in Argon2 and the app takes no library for it.
2. **A salt for any email.** Sign-in first asks for the account's salt. For an unknown email, the server returns
   HMAC(pepper, email), so nobody can tell whether an account exists.
3. **One encrypted copy per store, with a version.**
   - `PUT /store/<name>` sends `{version, iv, ciphertext}` and succeeds only if `version` is the stored one plus one.
   - Otherwise the server answers 409 with the current copy, and the device merges and tries again.
   - Each store is encrypted whole, after merging, with a new IV each time.
   - **Why**: the server cannot merge ciphertext, and the three stores are small (the owner's progress is under 100 KB).
4. **Merging by item (the sync rules, pure).**
   - **The items**: each store is seen as a map of items.
     - Progress: `checks.<day>.<key>`, `extras.<day>.<id>`, `tasks.<id>`, `appts.<id>`, `courses.<id>`,
       `modules.<key>`, and the single values (`mainCourse`, `phaseSeen`, `askedUpTo`).
     - Workouts: `workouts.<id>`, `custom.<id>`, `routines.<id>`, `current`, `prefs`.
     - Settings: one item.
   - **The stamps**: each item has a stamp `{t, d}` (time, device), kept in the encrypted payload beside the data. A
     removed item keeps a stamp with no value, a tombstone, for 60 days.
   - **The rule**: the higher stamp wins. Times are hybrid: never lower than the last stamp seen plus one, so a device
     with a wrong clock cannot go back in time.
   - **The loser**: when a device's item loses, the device first saves a snapshot named `before-sync` (013's snapshot
     store, beside the daily ones), so nothing is silently lost (FR-007).
5. **How changes reach other devices.**
   - While the page is visible, the app asks `GET /versions` every 30 seconds, and also on focus and when it is online
     again. When a version changed, it pulls.
   - A local change is sent 3 seconds after the last edit.
   - **Rejected**: WebSockets, more server and battery for no gain at this size.
6. **Sign-ins.**
   - A sign-in is a random 256-bit token. The server keeps only its SHA-256.
   - The device keeps the token and the unwrapped data key, in IndexedDB as non-extractable keys where the browser
     allows it.
   - «اخرج من الجهاز ده» deletes them on the device and its sign-in on the server.
7. **Email links.** The confirm and reset links open the app at `#sync-confirm=<token>` or `#sync-reset=<token>`. The
   tokens are single-use, valid for 1 hour, and stored hashed.
8. **Slowing failures.** Failed sign-ins are counted per account, in D1. After 5 failures in 15 minutes, there is a
   15-minute wait. No IP address is stored: Cloudflare sees it, and the Worker does not keep it.
9. **The old path.** The `window.claude` synced copy in `06-store.js` goes. The sync status line now tells the truth:
   «على الجهاز ده بس» or «متزامن، آخر مرة …».

## Data model

**Server (D1):**
- `accounts(id, email UNIQUE, salt, verifier, key_by_password, key_by_recovery, confirmed_at, created_at)`
- `signins(token_hash PRIMARY KEY, account_id, created_at, last_seen_at)`
- `stores(account_id, name, version, iv, ciphertext, size, saved_at, PRIMARY KEY(account_id, name))`
- `email_tokens(token_hash PRIMARY KEY, account_id, kind, expires_at)`
- `failures(account_id, at)`

Deleting an account deletes its rows in every table (FR-013).

**Device:**
- `mizan-sync`, a small local record: the email, the stamps, the versions last seen, and the waiting changes. It is not
  one of the three stores, and it is never synced as data.
- The token and the data key, in IndexedDB.
- The `before-sync` snapshot slot.

**Payload** (before encryption): `{format: 'mizan-sync', store, appVersion, data, stamps}`. The device refuses a payload
from a newer app version (FR-014).

## Design

| Part | What it holds |
|---|---|
| `src/app/01c-sync-rules.js` (new, pure) | `itemsOf`, `fromItems`, `mergeStore`, `stampNow`, and the tombstone cleanup. Tested by `check-sync.js`. |
| `src/app/01d-crypto.js` (new) | `deriveKeys`, `wrapKey`/`unwrapKey`, `seal`/`open` (AES-GCM), and the recovery code's format. Tested by `check-crypto.js` with known answers. |
| `src/app/06b-sync.js` (new) | The sync loop: pull, merge, push, retry on 409, wait offline, the `before-sync` snapshot, and the status for the shell. It replaces the `window.claude` path. |
| `src/app/15b-sync-view.js` (new) | «المزامنة» in Settings: sign up, confirm, show the recovery code, sign in, the first-join choice of schedule, change the password, «نسيت الباسورد», «اخرج من الجهاز ده», «اقفل المزامنة وامسح نسختها». |
| `server/worker.js` (new) | The routes: `/prelogin`, `/signup`, `/confirm`, `/signin`, `/signout`, `/versions`, `/store/<name>` (GET and PUT), `/password`, `/reset/start`, `/reset/finish`, `/account` (DELETE). It checks every request against the sign-in's account (FR-016). |
| `server/schema.sql`, `server/wrangler.toml`, `server/test.js`, `server/dev.js` | `dev.js` serves the Worker on Node for E2E, with `node:sqlite` and an email sender that writes to a file. |
| `tools/build.py` | The Worker's address goes into `connect-src`, from `server/address.txt`, which holds a public URL only. |

## Tests

- **`check-sync.js`**:
  - two to four devices doing random edits offline, then syncing in random orders, compared against an oracle that
    applies every edit in stamp order;
  - every pair of edits to the same item;
  - tombstones, clock skew, and marks never created;
  - mutations: whole-store last-writer-wins, a lost tombstone, a clock allowed to go back, and settings merged by field.
- **`check-crypto.js`**: known answers for PBKDF2, HKDF and AES-GCM; a round trip of wrap and unwrap; a wrong password
  refused; a ciphertext with one bit changed refused.
- **`server/test.js`**:
  - every route;
  - another account's token refused;
  - the version rule;
  - the slowing of failures;
  - a delete that leaves no row;
  - a check that no plain text from a sample payload appears anywhere in the database (SC-004).
- **E2E (`tests/e2e/sync.spec.js`)**, with two browser contexts against `server/dev.js`:
  - US1, sign up and confirm from the email file;
  - US2, two devices with their own data, joining;
  - US3, offline on one;
  - US4, the password changed, and a reset with and without the code;
  - US5, signing out and turning sync off;
  - with sync off, no request goes to the server.
- **Parity** stays 0 with sync off.

## Phases (two PRs, then the owner's deploy)

`check-code` refuses app code that nothing uses, so the sync rules and the crypto cannot land before the app uses them.
The server is outside the app, so it can land first and be tested alone.

| PR | Phases | Gate |
|---|---|---|
| **025a: the server** | 1. `server/worker.js`, `schema.sql`, `wrangler.toml`, `test.js` and `dev.js`; the CI runs `server/test.js` | Server tests green, the plain-text check included. Nothing in the app changes (parity 0) |
| **025b: the app** | 2. Sync rules and `check-sync`; 3. Crypto and `check-crypto`; 4. The sync loop and «المزامنة», the old path removed, the CSP address; 5. E2E and docs | All checks green, mutations caught; E2E against `server/dev.js`; browser at 375 px; parity 0 with sync off |
| **Owner** | 6. The Cloudflare account, D1, the secrets, deploy with `wrangler` | A real sign-up from the phone, and the same data on a second device |

## Risks

- **Merging is where data can be lost.** The oracle test over random edits on several devices is the main guard, with
  the `before-sync` snapshot as a second.
- **A lost password and recovery code** lose the server copy, never a device copy. The app says so three times: at
  sign-up, when the code is shown, and on reset.
- **The key on the device** can be read by any page on the same origin. This is C4: the rule of no other Pages site
  holds until the move, and the move comes before anyone else uses sync (Constraints).
- **Free-tier limits**: D1 offers 5 GB and 5 million reads a day; Workers 100,000 requests a day. Polling every 30
  seconds while open is about 3,000 requests a day per device, well under the limit.
- **Clock skew between devices**: the hybrid stamps keep the order monotonic, and the later wall-clock change can still
  lose when a device's clock runs far ahead. The losing version is in the `before-sync` snapshot.
- **The size of this feature**: 025b is large. Its phases are committed one by one, each with its own checks, so the
  review can follow them in order. 025a changes nothing in the app.
