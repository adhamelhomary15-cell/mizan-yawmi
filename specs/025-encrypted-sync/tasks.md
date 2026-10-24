---

description: "Task list for feature 025: encrypted sync across devices"
---

# Tasks: Encrypted Sync Across Devices

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**:
- `server/test.js` (025a), in CI;
- `tools/check-sync.js` and `tools/check-crypto.js`, both with `--self-test`, in CI (025b);
- E2E in `tests/e2e/sync.spec.js` against `server/dev.js` (025b);
- parity 0 with sync off.

## Binding rules

- **Gates.** A task marked **[gate: X]** waits for the owner's explicit yes to X. The four gates of the plan are:
  - **Resend**, the email sender;
  - **Cloudflare**, the owner's own account, D1 database and secrets;
  - **wrangler**, the deploy tool, in `server/` only;
  - **CSP**, the Worker's address in `connect-src`.

  No account is made, no secret is set and nothing is deployed by the AI (Principle I).
- No secret, token, key or personal value in any tracked file. Tests use generated accounts only (Principle VI).
- The server never logs request bodies, and checks the account on every request.
- Sync never creates or clears a mark (Principle II). With sync off, the app sends nothing to the server.
- Work in the worktree `E:\Claude\mizan-025` only.
- Before each commit, show the diff, run `node tools/check-private.js --settings ../mizan-yawmi/.private/settings.json`
  with the files staged, and commit only on `RESULT: clean`.

---

## PR 025a: the server (changes nothing in the app)

- [ ] T001 `server/schema.sql`: the five tables of the plan's data model, with an index on `signins.account_id` and on
  `email_tokens.expires_at`.
- [ ] T002 `server/worker.js`, the account routes:
  - `/prelogin`: the salt, or HMAC(pepper, email) for an unknown email;
  - `/signup`: refuses a known email the same way as a new one, so the answer does not tell;
  - `/confirm`;
  - `/signin`: the verifier is SHA-256(sign-in key ‖ pepper); failures are slowed as in decision 8;
  - `/signout`.
  - Tokens are random 256-bit values, and the server stores their SHA-256 only.
- [ ] T003 `server/worker.js`, the data routes:
  - `/versions`;
  - `GET` and `PUT /store/<name>`: a `PUT` succeeds only with version + 1, and otherwise answers 409 with the current
    copy;
  - the size is capped at 2 MB per store;
  - every request is checked against the sign-in's account.
- [ ] T004 `server/worker.js`, the password routes:
  - `/password`: a new verifier and the data key rewrapped, given the old sign-in key;
  - `/reset/start`: an email with a single-use link valid for 1 hour;
  - `/reset/finish`: with the recovery code, the copy is kept; without it, the copy is deleted;
  - `DELETE /account`: every row of the account, in every table.
- [ ] T005 Email through a small sender interface: `resend` in the Worker, and `file` in `server/dev.js`, which writes
  the email to a local file for the tests. **[gate: Resend]** applies to the real key only, not to this code.
- [ ] T006 `server/test.js`, with Node's `node:sqlite` as D1 and no new package:
  - every route;
  - another account's token refused;
  - the version rule;
  - the slowing of failures;
  - a delete that leaves no row in any table;
  - a check that a sample payload's plain words appear nowhere in the database (SC-004);
  - an unknown email gets the same salt every time, and a different one from a known email.
- [ ] T007 `server/dev.js`: the Worker on a local port, with `node:sqlite` and the `file` sender, for the E2E tests.
  `server/wrangler.toml` holds the Worker's name and the D1 binding name, and no ids or secrets.
- [ ] T008 CI: a step that runs `node server/test.js`. README: a short `server/` part (what it holds, and that the app
  does not need it). Parity 0. **Commit, push, open PR 025a.**

## PR 025b: the app

### Phase 2: sync rules (pure)

- [ ] T009 `src/app/01c-sync-rules.js`, listed in `ORDER` after `01b-storage.js`:
  - `itemsOf(store, data)` and `fromItems(store, items)`, which round-trip every store;
  - `stampNow(last, now, device)` (hybrid time);
  - `mergeStore(store, local, remote)`, which returns `{data, stamps, lost}`;
  - the 60-day tombstone cleanup.
- [ ] T010 [P] `tools/check-sync.js`:
  - an oracle over 2 to 4 devices with random offline edits and random sync orders;
  - every pair of edits to the same item;
  - clock skew;
  - no mark ever created.
  - Mutations: whole-store last-writer-wins, a lost tombstone, a clock that goes back, and settings merged by field.

### Phase 3: crypto

- [ ] T011 `src/app/01d-crypto.js`:
  - `deriveKeys(password, salt)`: PBKDF2 with 600,000 iterations, then HKDF into the wrapping key and the sign-in key;
  - `newDataKey`, `wrapKey` and `unwrapKey`;
  - `seal` and `open` (AES-GCM, with a new IV every time);
  - `newRecoveryCode` and `recoveryKey`.
- [ ] T012 [P] `tools/check-crypto.js` in Node's Web Crypto:
  - known answers for PBKDF2, HKDF and AES-GCM;
  - wrap and unwrap round trips;
  - a wrong password, and one changed bit, both refused;
  - the recovery code's format.
  - Mutations: the same IV reused, and the sign-in key equal to the wrapping key.

### Phase 4: the sync loop and «المزامنة»

- [ ] T013 `src/app/06b-sync.js`: pull, merge, push, and retry on 409; changes wait while offline; a push 3 seconds after
  the last edit; a poll every 30 seconds while the page is visible, and on focus or when online again; the
  `before-sync` snapshot when something local loses; a newer app version refused.
- [ ] T014 Remove the `window.claude` path from `src/app/06-store.js`. The sync line tells the truth: «على الجهاز ده
  بس», or «متزامن، آخر مرة …» with any changes still waiting.
- [ ] T015 `src/app/15b-sync-view.js`: sign up, confirm, the recovery code shown once, and sign in.
- [ ] T016 The first join, choosing between «جدول الحساب» and «جدول الجهاز ده» after a backup is saved.
- [ ] T017 Change the password, and «نسيت الباسورد» with and without the recovery code, warning first.
- [ ] T018 «اخرج من الجهاز ده» and «اقفل المزامنة وامسح نسختها», which asks first.
- [ ] T019 **[gate: CSP]** `tools/build.py` reads the Worker's address from `server/address.txt`, a public URL only, into
  `connect-src`. `check-security.js` allows exactly that address, and nothing else.

### Phase 5: tests, docs, PR

- [ ] T020 `tests/e2e/sync.spec.js`, with two contexts against `server/dev.js`:
  - US1 to US5;
  - offline on one device;
  - no request to the server with sync off.
- [ ] T021 [P] Docs: the README «المزامنة» part (what is sent, what the server sees, the recovery code, signing out
  versus turning sync off); PRODUCT; and constitution compliance noted in the plan.
- [ ] T022 Every check, parity 0 with sync off, the E2E suite twice, and a look at 375 px. **Commit, push, open PR 025b.**

## The owner's deploy (after both PRs)

- [ ] T023 **[gate: Cloudflare, Resend]** The owner makes the Cloudflare account, the D1 database and the Resend account,
  and sets the Worker's secrets: the Resend key and the pepper. The AI writes the steps, and never handles a secret.
- [ ] T024 **[gate: wrangler]** Deploy the schema and the Worker with `npx wrangler`, from `server/`, with the owner
  present. Put the public address in `server/address.txt` (T019) and rebuild.
- [ ] T025 On the phone: sign up and confirm. On a second device: sign in, and the same data is there. Then a change on
  each, seen on the other within 1 minute.

## Summary

- Total: 25 tasks.
  - 025a, the server: 8.
  - 025b, the app: 14.
  - The owner's deploy: 3.
- Gates: Resend (T005, real key only; T023), Cloudflare (T023), wrangler (T024), CSP (T019).
- MVP: 025a and 025b phases 2 to 4, then T023 to T025.
