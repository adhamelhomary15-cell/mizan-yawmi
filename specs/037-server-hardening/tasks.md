---

description: "Task list for feature 037: harden the sync server before it is deployed"
---

# Tasks: Harden the Sync Server Before It Is Deployed

**Input**: [spec.md](spec.md), [plan.md](plan.md)

## Binding rules

- The encryption, the keys and what is stored for an account do not change; no secret in any file.
- An IP is stored only as a keyed hash; attempts are deleted within an hour of their window (constitution 3.1.0).
- Run `node tools/check-private.js` with the files staged; commit only on `RESULT: clean`. No push, no PR, no deploy.

## Phase 1: Limits (points 1, 2, 4)

- [ ] T001 `server/schema.sql`: `attempts` replaces `failures`.
- [ ] T002 `server/worker.js`: `LIMITS`, `ipKey`, `over`, `note`, `mail`; email limits on `/signup` and
  `/reset/start`; re-signing up updates in place.
- [ ] T003 `/signin`: per-IP and per-account limits; `/password`: its limit.
- [ ] T004 `server/test.js`: the IP in `call`, `attempts` in `rows`, the lockout check updated, new checks and
  mutations for points 1, 2, 4 and the hashed IP.
- [ ] T005 `node server/test.js` and `--self-test`.

## Phase 2: Expiry and the salt (points 3, 5)

- [ ] T006 Sign-ins expire after 60 days unused; `sweep` on sign-in and email requests.
- [ ] T007 `/prelogin`: the made-up salt for an unconfirmed account.
- [ ] T008 Checks and mutations for points 3 and 5; `node server/test.js` and `--self-test`.

## Phase 3: Docs and checks (points 6, 7)

- [ ] T009 README: the PEPPER, its backup, and the constitution's version.
- [ ] T010 Every `tools/check-*.js` and its self-test; `check-private`. Tick the tasks.
