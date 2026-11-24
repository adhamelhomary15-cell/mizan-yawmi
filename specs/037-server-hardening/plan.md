# Implementation Plan: Harden the Sync Server Before It Is Deployed

**Branch**: `037-server-hardening` | **Date**: 2026-11-24 | **Spec**: [spec.md](spec.md)

## Summary

One table, `attempts (who, kind, at)`, replaces `failures` and holds every count the limits need: `who` is
`a:<account id>` or `ip:<keyed hash>`, `kind` is `email`, `signin` or `password`. Two small helpers, `over` and `note`,
read and write it against one `LIMITS` table. Every email goes through one `mail` function that stops silently at the
account's limit. A `sweep` on sign-in and email requests deletes old sign-ins, expired links and old attempts. The
sign-in check refuses a token unused for 60 days. `/prelogin` gives an unconfirmed account the made-up salt.

## Technical Context

- **Language**: the Worker (`server/worker.js`, plain JS module), `server/schema.sql`, `server/test.js` (Node's
  built-in SQLite through `server/d1-local.js`). No new package.
- **IP**: `CF-Connecting-IP`, kept only as `HMAC-SHA256(PEPPER, 'ip:' + ip)`, base64url; absent in tests unless a test
  sets it, and then the per-IP limits are skipped (spec, Edge Cases).
- **Storage**: nothing deployed, so `schema.sql` changes in place; no migration.
- **Tests**: `server/test.js` (new checks and self-test mutations); every `tools/check-*.js`; the app is unchanged, so
  no build change and parity is trivially 0.

## Constitution Check (v3.1.0)

| Principle | Status |
|---|---|
| I. Human review | The owner approved the spec, Q1: B and Q2: A, and running to the PR (2026-11-24). |
| II. Checking off is human | The server never sees marks. |
| III. Data stays on the device, or leaves encrypted | Amended to 3.1.0 for the attempts (`e19fd0a`): IP only as a keyed hash, rows gone within an hour of their window, used for nothing else. Encryption, keys and stored account data unchanged. |
| IV. Honest, offline day | The app is not touched. |
| V. Simple, single file | One table, three helpers, a sweep. |
| VI. General repo | No secret or personal value; the PEPPER stays in Cloudflare. |

## Decisions (research)

1. **One table for every count** (`attempts`): the same two helpers serve emails, sign-ins and password checks per
   account and per IP, so each limit is one line of `LIMITS`. `failures` goes; `deleteAccount` deletes `a:<id>` rows.
2. **Limits** (`[max, window]`, the wait is the window): email per account 3 / 1 h, per IP 10 / 1 h; sign-in per
   account 10 / 5 min, per IP 20 / 15 min; password per account 5 / 15 min.
3. **Email per account is silent**: `mail` sends and notes only under the limit; above it the route answers as usual
   (spec, Decisions). The per-IP email limit counts every request to `/signup` and `/reset/start` and answers 429.
4. **Sign-in order**: IP limit, then the account (no account or unconfirmed: note the IP, 401), then the account
   limit, then the key. A wrong key notes the account and the IP; a right one clears the account's sign-in attempts.
5. **Re-signing up an unconfirmed account** updates its row in place and drops its old confirm links, so its email
   count stays (spec, Decisions).
6. **Expiry**: `signedIn` treats `last_seen_at` older than 60 days as no sign-in and deletes the row; use moves
   `last_seen_at` on, as today.
7. **Sweep** (on `/signin`, `/signup`, `/reset/start`): delete sign-ins unused for 60 days, expired email links, and
   attempts older than 1 hour (the longest window).
8. **README**: the PEPPER and its backup in the sync part, in Egyptian Arabic; the constitution reference to 3.1.0.

## Design

- **`server/schema.sql`**: `attempts` replaces `failures`; the header comment names the hashed IP.
- **`server/worker.js`**: `LIMITS`, `ipKey`, `over`, `note`, `mail`, `sweep`; the routes above; `fetch` passes the IP
  key to the routes.
- **`server/test.js`**: `call` takes an optional IP; `rows` reads `attempts`; the lockout check moves to the new
  numbers; new checks and mutations below.
- **`README.md`**: the PEPPER.

### Tests (each with a mutation the self-test must notice)

- Email per address: 5 resets on one account give 3 emails and five 200s; an hour later one more goes; 5 sign-ups
  of one unconfirmed address give 3 emails. (Mutation: no account cap.)
- Email per IP: the 11th request from one IP in an hour gets 429 with `retryAfter` and sends nothing; another IP
  works. (Mutation: IP cap ignored.)
- Lockout: 20 wrong sign-ins from one IP over several accounts stop that IP; the owner signs in from another IP. 10
  wrong on one account wait 5 minutes, then the right key works. (Mutations: IP limit ignored; the account waits 15.)
- `/password`: 5 wrong, then the right one gets 429; 15 minutes later it works. (Mutation: no limit.)
- Expiry: a token unused 61 days gets 401 and its row is gone; one used weekly still works after 90 days; old
  attempts and expired links are gone after a sign-in. (Mutations: no expiry; expiry from creation; no sweep.)
- Salt: an unconfirmed account gives the made-up salt, the same across sign-ups; a confirmed one its own.
  (Mutation: the real salt for an unconfirmed account.)
- The IP is never stored as given: after requests with an IP, no row holds it. (Mutation: the IP stored plainly.)

## Phases

| # | Phase | Points | Gate |
|---|---|---|---|
| 1 | Schema, helpers, email limits, lockout, `/password` | 1, 2, 4 | `node server/test.js` and `--self-test` |
| 2 | Expiry, sweep, salt | 3, 5 | Same |
| 3 | README, every rule checker, ticks | 6, 7 | Every `tools/check-*.js`; `check-private` clean |
