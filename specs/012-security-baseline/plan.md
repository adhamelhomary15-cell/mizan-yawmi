# Implementation Plan: Security Baseline

**Branch**: `012-security-baseline` | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

## Summary

- `tools/build.py` adds a hash-based CSP `<meta>` to the built page.
- The three GitHub Actions are pinned to commit SHAs.
- One new dev check, `tools/check-security.js`, guards both.
- Branch protection on `main` is applied through the GitHub API after the owner approves the exact settings, which
  are kept in the repo.
- The shared-origin risk and the frame-ancestors limit go into the README.

Nothing in the app's code changes.

## Technical Context

- Build: Python 3, `tools/build.py`. Checks: Node 22, no new dependencies. Repo settings: `gh api`.
- **The CSP is a `<meta>` tag**, because GitHub Pages cannot set response headers. A meta CSP does not support
  `frame-ancestors`, `report-uri` or `sandbox`.
- **Facts, checked 2026-10-17:**
  - the built page has 6 inline `<script>` blocks (4 libraries, the app, and the service-worker registration),
    1 JSON data block, and 3 `<style>` blocks;
  - there are no static `style=""` attributes and no inline event handlers;
  - the libraries use no `eval` and no `new Function`.

## Constitution Check (v2.0.1)

| Principle | Status |
|---|---|
| I. Human review | Branch protection is applied only after the owner approves the settings shown in `branch-protection.json`. |
| II. Checking off is human | Not touched. |
| III. Progress stays on the device | Strengthened: `connect-src 'self'` lets the browser block any request to another origin. |
| IV. Offline-capable | The service worker, manifest and icons are allowed (`worker-src`, `manifest-src`, `img-src 'self'`). |
| V. Single file | Still one file. The build adds one `<meta>` line. |
| VI. General public repo | No personal data. |

## Design

### CSP (US1): `tools/build.py`, step "Wrap in a full document"

1. Build `page` as today, without the CSP.
2. Find every `<script>` whose type is missing or JavaScript, and every `<style>`. Hash the exact text between
   the tags with SHA-256, encoded in base64. The JSON block (`type="application/json"`) is skipped, because the
   browser never runs it.
3. Insert this right after `<meta charset="utf-8">`:
   `<meta http-equiv="Content-Security-Policy" content="…">`, with:

   ```
   default-src 'none'; script-src 'sha256-…' …; style-src 'sha256-…' …; img-src 'self' data:; font-src data:;
   connect-src 'self'; worker-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none';
   object-src 'none'
   ```

   It goes right after the charset meta rather than as the very first element, because the charset has to stay
   in the first bytes. A meta CSP applies to everything after it, and every script and style comes later.
4. The cache name in `sw.js` already changes with the page, so phones get the new page.

### Pinned actions (US3): `.github/workflows/checks.yml`

`actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4`, and the same for setup-node (`49933ea…`) and
setup-python (`a26af69…`). These are the SHAs the tags pointed to on 2026-10-17.

### The check (US1 + US3): `tools/check-security.js`

It reads the built `index.html` and the workflow files, and it checks that:
- exactly one CSP meta exists, and it comes before the first `<script>` and `<style>`;
- the directives are exactly the set above, with no `'unsafe-inline'`, `'unsafe-eval'`, `'unsafe-hashes'`, `*`,
  `http:`, `https:` or any host;
- every inline script and style has its hash in the policy, and no hash is left over;
- every `uses:` in `.github/workflows/*.yml` is `owner/repo@<40-hex>`.

`--self-test` mutations:
- the CSP is removed;
- `'unsafe-inline'` is added;
- a script is changed after hashing;
- an extra origin goes into `connect-src`;
- a `uses:` goes back to a tag.

It is added to CI and the README.

### Branch protection (US2): `specs/012-security-baseline/branch-protection.json`

```json
{
  "required_status_checks": {"strict": true, "contexts": ["checks"]},
  "enforce_admins": true,
  "required_pull_request_reviews": {"required_approving_review_count": 0, "dismiss_stale_reviews": false},
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": false
}
```

- Applied with:
  `gh api -X PUT repos/adhamelhomary15-cell/mizan-yawmi/branches/main/protection --input specs/012-security-baseline/branch-protection.json`
- Run it only after the owner says yes to these exact settings.
- Verified by reading the settings back (`gh api …/protection`), and by the 012 PR showing "blocked" while its
  CI is still running.
- A direct push to `main` is **not** used as a test: if the rule were wrong, that push would publish the app.

### The synced copy under the CSP

`06-store.js` uses `window.claude` only when the page runs inside an Artifact host, which is not on GitHub Pages.
That host provides the runtime from outside the page, and the CSP covers only the page's own requests. Whether the
runtime still works under `connect-src 'self'` cannot be tested from the browser pane. It is recorded as a known
limit, to verify the next time the app runs in an Artifact host. GitHub Pages, where the owner uses the app, is
not affected.

### Docs (US4)

- `README.md`, under «الخصوصية»: what the CSP does, the shared origin and what closes it, the frame-ancestors
  limit, and that `main` is protected.
- `specs/010-code-health/review.md`: mark C1–C3 as done in 012, and C4 as recorded.

## Verification

- Every check and `--self-test`, including the new one. Parity is 0.
- Browser at 375 px:
  - a `securitypolicyviolation` listener stays empty through a full session: six tabs, a workout with timers, a
    backup save and restore, a settings import, postponing, and a drawing download;
  - an injected `<script>`, an inline `onclick`, `eval`, a `fetch` to another origin and an image from another
    origin are all blocked;
  - the app still works after a reload.
- After the deploy, on the phone: it opens, works offline, and updates.

## Phases

| # | Phase | Story | Commit |
|---|---|---|---|
| 1 | Pin the actions, plus the workflow part of the check | US3 | `ci: pin actions to commit SHAs (012, US3)` |
| 2 | The CSP in the build, plus the CSP part of the check, and the browser verification | US1 | `feat(security): hash-based CSP in the built page (012, US1)` |
| 3 | Docs | US4 | `docs(012): CSP, protected main and the shared-origin risk` |
| 4 | PR, then branch protection after the owner approves it, then verify, then merge | US2 | (repository setting) |
