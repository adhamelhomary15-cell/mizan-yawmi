# Feature Specification: Security Baseline

**Feature Branch**: `012-security-baseline`

**Created**: 2026-10-17

**Status**: Draft

**Input**: The security items from the 010 review (`specs/010-code-health/review.md`, group C). The owner chose the
order on 2026-10-16: finish 010, then security, before data versioning and the in-app editor. In scope:
- C1: a Content-Security-Policy;
- C2: branch protection on `main`;
- C3: GitHub Actions pinned to commit SHAs;
- C4: the shared-origin risk, recorded (the owner chose no custom domain for now).

## Background

The app is one static page on GitHub Pages, with all data in the browser. It has no server, so most classic risks
do not apply. Four gaps remain:

- **No CSP.** Every script and style is inline. If anything ever slipped untrusted markup into the page (a future
  feature, a library bug, a crafted settings or backup file), the browser would run it with full access to the
  user's data. A CSP is a second wall: the browser runs only the code we shipped and talks only to our own site.
- **`main` is open.** A push to `main` publishes the app at once, with no PR and no CI. One mistaken push, from a
  person or from an AI agent, goes straight to every phone.
- **Actions are pinned by tag.** `actions/checkout@v4` and the others follow a tag that the action's owner can
  move. A moved tag could run different code in CI. CI has read access only, but it is still the gate for what
  ships.
- **One origin for every Pages site of the account.** `adhamelhomary15-cell.github.io` is shared by every repo
  that has Pages. Any page there can read this app's localStorage. Today there is no other such page, so the risk
  is dormant. It must be closed before the app is opened to other people.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The page only runs what we shipped (Priority: P1)

The user opens the app, and everything works as today. Behind it, the browser has a policy:
- only the app's own scripts may run;
- the page may talk only to its own site;
- fonts and images come only from the page itself or its own site.

If something tries to run injected code or send data elsewhere, the browser refuses and nothing leaves the device.

**Why this priority**: It is the only item the user's data depends on directly. It also guards every later
feature, including the encrypted sync.

**Independent Test**:
- Open the built app at 375 px and use every tab. Nothing breaks, and the console shows no CSP violation.
- Then, in dev tools, try to inject a `<script>` element and to `fetch` another site. The browser blocks both.

**Acceptance Scenarios**:

1. **Given** the built app, **When** it loads, **Then** the page carries a CSP that allows only scripts listed by
   hash, and the console shows no violation in a full session:
   - all six tabs;
   - a workout with timers;
   - a backup save and a restore;
   - a settings import;
   - postponing;
   - the drawing download.
2. **Given** the CSP, **When** a script that is not in the page tries to run (an injected `<script>`, an inline
   event handler, `eval`), **Then** the browser blocks it.
3. **Given** the CSP, **When** code tries to contact another origin (`fetch`, an image, a form), **Then** the
   browser blocks it. The one allowed request is the drawing download from the app's own site.
4. **Given** a change to any inline script or style, **When** the app is built, **Then** the hashes in the CSP
   are recomputed, so the policy never needs editing by hand.
5. **Given** the installed app offline, **When** it opens, **Then** it works as before, with the service worker,
   the manifest and the icons allowed.

---

### User Story 2 - Nothing reaches the phones without a PR and green CI (Priority: P1)

The owner, or any AI agent, can no longer push to `main` directly. Every change goes through a PR, and the PR can
be merged only after the `checks` workflow passes.

**Why this priority**: Pushing to `main` publishes the app. This closes the one path where a mistake skips every
check.

**Independent Test**: Try `git push origin main` with a new commit. GitHub refuses it. Open a PR with a failing
check. The merge button stays blocked until the check passes.

**Acceptance Scenarios**:

1. **Given** branch protection, **When** anyone pushes directly to `main`, **Then** GitHub refuses the push.
2. **Given** a PR whose `checks` run failed or has not finished, **When** someone tries to merge, **Then** GitHub
   blocks the merge.
3. **Given** the owner is the only maintainer, **Then** no approving review is required, because GitHub does not
   let an author approve their own PR. The gate is PR plus green CI.
4. **Given** the rule, **Then** it applies to admins too, so the owner's own account cannot skip it by accident.
5. **Given** branch protection, **Then** force-pushes to `main` and deleting `main` are blocked.

---

### User Story 3 - CI runs exactly the code we reviewed (Priority: P2)

Every third-party action in `.github/workflows/` is pinned to a full commit SHA, with the version it stands for in
a comment. A dev check fails CI when an action is referenced by tag or branch.

**Why this priority**: The risk is low (CI only reads, and holds no secrets), but the fix is small and keeps the
check honest.

**Independent Test**: Change one `uses:` back to `@v4`. The new check fails.

**Acceptance Scenarios**:

1. **Given** the workflow, **Then** every `uses:` line is `owner/repo@<40-hex SHA> # vN`.
2. **Given** a `uses:` line with a tag or a branch, **When** CI runs, **Then** it fails and names the line.
3. **Given** a pinned SHA, **Then** it is the commit that the named tag pointed to on 2026-10-17.

---

### User Story 4 - The shared-origin risk is written down (Priority: P3)

`README.md` (the security part) and the 010 review state the risk, the owner's 2026-10-17 decision to keep the
current address for now, and the two ways to close it before the app opens to others:
- a custom domain;
- a separate GitHub organisation.

**Why this priority**: There is no code change. The goal is that the risk is not forgotten.

**Acceptance Scenarios**:

1. **Given** the docs, **Then** a reader learns the risk in one paragraph. They also learn that it is dormant
   while no other Pages site exists on the account, and what must happen before opening the app to others.
2. **Given** a plan for a later feature that opens the app to others, **Then** it must tick this item in its
   constitution check.

### Edge Cases

- **The prayer-times library, Preact and htm** are inlined scripts. Each gets its own hash. Neither uses `eval`
  or `new Function` (checked on 2026-10-17), so `'unsafe-eval'` is not needed.
- **The embedded example settings** is a `<script type="application/json">`. It is data, never run, so it needs no
  hash, and the CSP does not block reading its text.
- **Styles:** the page has 3 inline `<style>` blocks, and these get hashes. The `style=""` values that Preact sets
  from code go through the CSSOM, which CSP does not block. Any static `style="…"` attribute in the shipped HTML
  would need `'unsafe-hashes'`. The page has none outside of what Preact renders. The plan must confirm this in
  the browser.
- **Drawings** are shown as `data:image/svg+xml` images, so `img-src` allows `data:`. Fonts are `data:` URIs, so
  `font-src data:`.
- **The service worker** (`sw.js`, same origin) needs `worker-src 'self'`. The manifest needs `manifest-src 'self'`.
- **A CSP in a `<meta>` tag cannot set `frame-ancestors`.** GitHub Pages does not let us set headers, so another
  site could still frame the app. That is low risk here: the app has no buttons that do something harmful
  without a second step. Record it as a known limit.
- **The synced copy through the `claude` runtime** (`06-store.js`) only exists when the page runs inside an
  Artifact host, not on GitHub Pages. The plan must check whether the CSP blocks it there, and either allow what
  it needs or record that the synced copy is not supported under the CSP.
- **Branch protection is a repository setting, not a file.** It needs the owner's explicit approval to apply, and
  then a GitHub API call or the settings page. It is documented in the repo so it can be re-applied.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The built page MUST carry a CSP `<meta>` tag as the first element in `<head>`. It allows:
  - `default-src 'none'`;
  - `script-src` with only the SHA-256 hashes of the page's inline scripts;
  - `style-src` with only the hashes of its inline `<style>` blocks;
  - `img-src 'self' data:`;
  - `font-src data:`;
  - `connect-src 'self'`;
  - `worker-src 'self'`;
  - `manifest-src 'self'`;
  - `base-uri 'none'`;
  - `form-action 'none'`;
  - `object-src 'none'`.
- **FR-002**: `tools/build.py` MUST compute the hashes from the exact text it writes, so the policy always matches
  the page.
- **FR-003**: A dev check MUST fail the build when any of these are true:
  - the CSP is missing;
  - it allows `'unsafe-inline'`, `'unsafe-eval'`, `*` or another origin;
  - an inline script or style in the built page has no matching hash.
- **FR-004**: Nothing in the app's behaviour, look or stored data may change, apart from what the browser now
  blocks.
- **FR-005**: `main` MUST require a PR, the `checks` status to pass, and up-to-date branches. The rule MUST apply to
  admins, and it MUST block force-pushes and deletion. The exact settings MUST be recorded in the repo.
- **FR-006**: Every `uses:` in `.github/workflows/` MUST name a full commit SHA, and a dev check MUST enforce it.
- **FR-007**: The shared-origin risk and the frame-ancestors limit MUST be written in the docs, with what closes them.

### Key Entities

- **CSP**: one `<meta http-equiv="Content-Security-Policy">` in the built `index.html`.
- **Branch rule**: GitHub branch protection on `main`, recorded in `specs/012-security-baseline/`.

## Success Criteria *(mandatory)*

- **SC-001**: A full session at 375 px shows 0 CSP violations. An injected script and a request to another origin
  are both blocked.
- **SC-002**: A direct push to `main` is refused, and a PR with red CI cannot be merged.
- **SC-003**: 0 workflow actions are referenced by tag or branch.
- **SC-004**: Every existing check still passes, and parity is 0.

## Assumptions

- GitHub Pages serves the page without its own CSP header, so the `<meta>` policy is the only one.
- The owner has admin rights on the repo (checked: yes) and approves the branch rule before it is applied.
- No other GitHub Pages site exists on the account today.
