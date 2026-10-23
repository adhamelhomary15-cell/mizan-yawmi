# ميزان يومي Constitution

## Core Principles

### I. Human Review Before Any AI Action (NON-NEGOTIABLE)
No AI agent (Claude, an n8n/automation flow, or any plugin or integration) may change code,
schedule data, tasks, blocks, settings, or repository state, or call an outside service, until
the owner has reviewed and approved that specific action. The AI proposes (a diff, a plan, a
list of changes); the human approves; only then does the action run. Approval covers the action
shown, not later ones.
Rationale: the app holds one person's private day; an unreviewed AI action is the main way it
could be corrupted or leaked.

### II. Checking Off Is a Human Act
A block, task, or course module is marked done only by the owner, through a deliberate tap in
the app. No AI, automation, import, or sync may set, bulk-set, or clear a done state. AI may
suggest ("this looks finished") but MUST NOT commit the check. "Mark all" in the day review MUST
remain an explicit user action with a visible result and undo.
Two exceptions carry only marks the owner already made, so they create no new done state:
- **Restoring the owner's own backup** MAY replace the device's marks with the file's, only after
  the owner confirms a preview of that file. It MUST reproduce the file's marks exactly, MUST NOT
  add a mark the file does not hold, and MUST be all or nothing.
- **The owner's chosen synced copy** of their progress (Principle III) MAY carry the owner's own
  marks between devices unchanged; it MUST NOT add or clear marks on its own.
Any other import, sync, AI, or automation that creates or clears a mark the owner did not make
remains forbidden.
Rationale: progress is the app's truth; auto-checked blocks make the day look balanced when it
is not, which defeats the product. Bringing back the owner's own record of done work keeps that
truth instead of faking it.

### III. Private Data Stays on the Device, or Leaves It Encrypted
Progress, tasks, notes, added courses, workouts and settings live on the owner's device. They MAY
leave it only as the owner's **synced copy**, and only under all of these rules:
- **Opt-in:** sync is off until the owner signs in and turns it on. Turning it off, or deleting
  the account, MUST delete the server's copy. The app MUST keep working, offline and in full,
  with sync off (Principle IV).
- **End-to-end encryption:** data is encrypted on the device before it is sent, with a key that
  never leaves the owner's devices. The key comes from the owner's password, and a recovery code
  shown once when the account is made also opens it. The password itself MUST NOT be sent: sign-in
  uses a separate value derived from it, so the server can never decrypt the data.
- **What the server may hold, and nothing else:** the account's email address; a sign-in
  verifier and the devices' sign-ins; the data key, encrypted by the password and by the recovery
  code; the encrypted copy with its size and save times; the devices' push subscriptions; and
  for reminders, the moments they are due, with no title, kind or text. Reminder text is written on
  the device from its own data.
- **Where requests go:** only to the app's own site and to the sync server. Each address MUST be
  listed in the page's Content-Security-Policy and approved under Principle I, and so MUST any
  service the server uses (for example, the one that sends sign-in emails).
- **Server secrets** (push signing keys, email service keys) live only in the server's own
  environment, never in the repository or the app.
No analytics, trackers, third-party network calls with user data, or AI plugins that read stored
data are allowed. Any other new network dependency MUST be listed in the plan and approved under
Principle I.
Rationale: matches Product Principle 4. The owner chose (2026-10-24) to keep their data safe across
devices and to get reminders while the app is closed; encryption on the device keeps the day theirs
even though a server holds a copy. A lost password and recovery code mean a lost server copy, never
a lost device copy.

### IV. Honest, Offline-Capable Day
Every block gets real time; work, prayer, and sleep are never squeezed to make the plan look
complete. The app MUST keep working offline as a PWA (self-contained HTML, inlined libraries
and fonts, no runtime CDN). Prayer times use the Egyptian General Authority of Survey method by
default; the method and the location come from the user's settings (Principle VI), not from a
city fixed in tracked code.
Rationale: the product is used outdoors on a phone with unreliable connectivity, and a general
app cannot assume one person's city.

### V. Simple, Single-File, Egyptian Arabic
The app stays one self-contained HTML file built by `tools/build.py` from `src/planner.html`
and the script parts it lists in `src/app/ORDER`, joined in that order with no bundler or module
system; no new build step or framework without a recorded justification. The default UI language is
Egyptian colloquial Arabic, right-to-left; the language is a setting, so a general user can switch
it, and adding a language MUST NOT break the single-file build or the right-to-left layout. Course
and subject names stay as the user writes them. Generated files (`index.html`, `sw.js`, manifest,
icons) MUST NOT be edited by hand.
Rationale: one person maintains this; simplicity keeps it shippable and reviewable, and a general
app cannot assume one language.

### VI. General Public Repo, Private Personal Settings
The public repository and the published app are a general planner that anyone can adapt. The
owner's personal schedule and life details (university, job, gym, Quran, courses, location,
personal facts in `PRODUCT.md`) MUST NOT be committed to any tracked file, specs and docs
included. They live in a local settings file that is git-ignored, that the owner imports once
into the app, and that is then stored on the device. The repository ships only a generic example
schedule. A private branch of the public repository is not private and MUST NOT be used to hold
personal data. Before adding an owner-specific value to any tracked file, the AI MUST ask the
owner (Principle I).
Rationale: the owner wants GitHub to carry the general app while their own copy carries their
private data; a public branch or file is visible to everyone, and published history cannot be
fully withdrawn.

## Constraints & Security Requirements

- Third-party code (Preact, htm, adhan, fonts) is vendored under `tools/vendor` with pinned
  versions; additions MUST be reviewed for network access and data access before merging.
- Plugins, skills, hooks, MCP servers, and automations used on this repo MUST NOT hold
  credentials or tokens in the repository, and MUST NOT be granted write or network access
  beyond the task at hand.
- The deployed app MUST contain no secrets, API keys, or personal data (Principle VI).
- The sync server's code lives in this repository, reviewed and tested like the app. It MUST NOT
  log request bodies, and it MUST check every request against the account it claims.
- Before sync or reminders are offered to anyone but the owner, the app MUST move off the shared
  GitHub Pages origin (review item C4), since a page on that origin could read the stored key.
- The local personal settings file MUST be listed in `.gitignore`, and a check MUST confirm it is
  untracked before any commit or push.
- Brand commitments from `PRODUCT.md` are binding: name «ميزان يومي», no Islamic ornament as
  decoration, no neon or glow, nothing that reads as a corporate app.

## Development Workflow & Review Gates

- AI-assisted changes MUST be shown as a diff or plan and approved by the owner before they are
  written, committed, or pushed (Principle I). Pushing to `main` publishes the app, so it MUST
  only happen on explicit owner request.
- Any change touching done-state logic, storage, or network calls MUST be tested on a phone-sized
  viewport and offline before merge, and MUST confirm that no code path sets done state without a
  user tap (Principle II).
- Personal schedule changes are made in the owner's local settings, not in tracked files.
  Changes to the generic example schedule go through a reviewed change.
- Each feature goes through the Spec Kit flow (specify → plan → tasks → implement), and the plan
  MUST include a "Constitution Check" against Principles I–VI. Specs MUST describe general
  behavior; an owner-specific example in a spec MUST be reworded or removed before commit.

## Governance

This constitution supersedes other practices in this repository. Amendments require a written
change to this file, owner approval, and a version bump under semantic versioning: MAJOR for
removed or redefined principles, MINOR for added principles or materially expanded guidance,
PATCH for clarifications. Principles I and II are non-negotiable and can be relaxed only by a
MAJOR amendment. Every plan and review MUST verify compliance; any deviation MUST be justified
in writing in the plan. Runtime guidance lives in `PRODUCT.md`, `DESIGN.md`, and `README.md`.

**Version**: 3.0.1 | **Ratified**: 2026-10-13 | **Last Amended**: 2026-10-24
