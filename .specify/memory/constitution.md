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
Rationale: progress is the app's truth; auto-checked blocks make the day look balanced when it
is not, which defeats the product.

### III. Private Progress Stays on the Device
Progress, tasks, notes, and added courses live in localStorage on the owner's device and MUST NOT
be sent anywhere unless the owner chooses a synced copy. No analytics, trackers, third-party
network calls with user data, or AI plugins that read stored progress are allowed. Any new
network dependency MUST be listed in the plan and approved under Principle I.
Rationale: matches Product Principle 4; the user never agreed to share their day.

### IV. Honest, Offline-Capable Day
Every block gets real time; work, prayer, and sleep are never squeezed to make the plan look
complete. The app MUST keep working offline as a PWA (self-contained HTML, inlined libraries
and fonts, no runtime CDN). Prayer times use the Egyptian General Authority of Survey method
for Giza.
Rationale: the product is used outdoors on a phone with unreliable connectivity.

### V. Simple, Single-File, Egyptian Arabic
The app stays one self-contained HTML file built by `tools/build.py` from `src/planner.html`;
no new build step or framework without a recorded justification. All UI copy is Egyptian
colloquial Arabic, right-to-left; course and subject names stay in English. Generated files
(`index.html`, `sw.js`, manifest, icons) MUST NOT be edited by hand.
Rationale: one person maintains this; simplicity keeps it shippable and reviewable.

## Constraints & Security Requirements

- Third-party code (Preact, htm, adhan, fonts) is vendored under `tools/vendor` with pinned
  versions; additions MUST be reviewed for network access and data access before merging.
- Plugins, skills, hooks, MCP servers, and automations used on this repo MUST NOT hold
  credentials or tokens in the repository, and MUST NOT be granted write or network access
  beyond the task at hand.
- The deployed app MUST contain no secrets, API keys, or personal data other than the owner's
  own schedule already encoded in `src/planner.html`.
- Brand commitments from `PRODUCT.md` are binding: name «ميزان يومي», no Islamic ornament as
  decoration, no neon or glow, nothing that reads as a corporate app.

## Development Workflow & Review Gates

- AI-assisted changes MUST be shown as a diff or plan and approved by the owner before they are
  written, committed, or pushed (Principle I). Pushing to `main` publishes the app, so it MUST
  only happen on explicit owner request.
- Any change touching done-state logic, storage, or network calls MUST be tested on a phone-sized
  viewport and offline before merge, and MUST confirm that no code path sets done state without a
  user tap (Principle II).
- Schedule changes follow `PRODUCT.md`: small ones in-app; larger ones through a reviewed change
  to `SCHED`.
- Each feature goes through the Spec Kit flow (specify → plan → tasks → implement), and the plan
  MUST include a "Constitution Check" against Principles I–V.

## Governance

This constitution supersedes other practices in this repository. Amendments require a written
change to this file, owner approval, and a version bump under semantic versioning: MAJOR for
removed or redefined principles, MINOR for added principles or materially expanded guidance,
PATCH for clarifications. Principles I and II are non-negotiable and can be relaxed only by a
MAJOR amendment. Every plan and review MUST verify compliance; any deviation MUST be justified
in writing in the plan. Runtime guidance lives in `PRODUCT.md`, `DESIGN.md`, and `README.md`.

**Version**: 1.0.0 | **Ratified**: 2026-10-13 | **Last Amended**: 2026-10-13
