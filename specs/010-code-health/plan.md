# Implementation Plan: Code Health — Visible Save Failures and a Modular Source

**Branch**: `010-code-health` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-code-health/spec.md`

## Summary

Two independent changes, each its own phase and commit series:

1. **Save failures become visible.** `saveLocal` returns `true`/`false`; `useStore` keeps `saveFailed` and returns
   it; `App` shows one notice on every tab while it is true, with a backup button. This mirrors what `useWorkouts`
   already does for the workout log.
2. **The inline script is split into part files.** `src/planner.html` keeps the shell, CSS and embedded example,
   and its app `<script>` holds a single placeholder line. `src/app/*.js` hold the code, cut only at the existing
   `/* ---------------- … ---------------- */` section headers. `tools/build.py` and a new `tools/lib/source.js`
   join them the same way. The joined text is byte-identical to today's `src/planner.html`, so the built app does
   not change by a single byte.

## Technical Context

**Language/Version**: JavaScript (browser, inside one IIFE); Node 22 for dev checks; Python 3 for `tools/build.py`

**Primary Dependencies**: unchanged (Preact + htm, adhan, vendored). No new dependency, no bundler

**Storage**: unchanged shape. `saveLocal` gains a return value only

**Testing**: existing `tools/check-*.js` (all, plus `--self-test`), `check-parity.js` old vs new build, a new CI
step that compares the joined source with the build's, and the browser at 375 px with writes forced to fail

**Target Platform**: installed PWA, phone and laptop, offline

**Project Type**: single-file web app (PWA)

**Constraints**:
- Built output byte-identical after the split (Phase 2).
- No behaviour change except the new notice (Phase 1).
- Markers used by checks stay as they are.

**Scale/Scope**: Phase 1 about 30 lines; Phase 2 moves ~3,700 lines without editing them, adds ~40 lines to
`build.py`, a ~30-line helper, and a one-line change in each check that reads the source

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against the constitution v2.0.0.

| Principle | Status | How this plan satisfies it |
|---|---|---|
| I. Human review before any AI action | Pass | Plan only; each phase needs the owner's go-ahead |
| II. Checking off is a human act | Pass | The notice only reads state and offers a backup; no code path writes or clears a mark. Confirm with a diff search for `checks` and `done` writes |
| III. Private progress stays on device | Pass | No network; the backup is the existing local file download |
| IV. Honest, offline-capable day | Pass | Phase 1 makes a lost write honest instead of hidden; output stays one offline file |
| V. Simple, single file, Egyptian Arabic | **Needs amendment (PATCH)** | The output stays one self-contained file, but the source is no longer one file, and the principle names `src/planner.html` as where the app is built from. See Complexity Tracking |
| VI. General public repo, private settings | Pass | No personal data touched |

Post-design re-check: all pass once the PATCH amendment in Phase 2a is approved.

## Phases

Each phase can be committed on its own and needs the owner's go-ahead.

| # | Phase | Story | Touches | Gate |
|---|---|---|---|---|
| 1 | **Save-failure notice** | US1 | `src/planner.html` (storage section, `App`) | Quickstart 1; all CI checks pass; parity 0 differences |
| 2a | **Governance wording** via `/speckit-constitution`: Principle V says the app is built from `src/planner.html` *and the part files it lists*; update AGENTS.md "Edit `src/planner.html` only" and the README file map | US2 | `.specify/memory/constitution.md` (PATCH bump), `AGENTS.md`, `README.md` | Owner approves the wording |
| 2b | **Shared source helper**: add `tools/lib/source.js` (`readSource()`); switch every check to it while the source is still one file (the helper simply returns the file) | US2 | `tools/lib/source.js`, `tools/check-*.js` | All checks and self-tests pass, no output change |
| 2c | **The split**: create `src/app/ORDER` and the part files; replace the script body with the placeholder; teach `build.py` and the helper to join | US2 | `src/planner.html`, `src/app/*`, `tools/build.py`, `tools/lib/source.js` | Quickstart 2: joined source and `index.html` byte-identical to `main` |
| 2d | **CI guard**: a step that checks `ORDER` lists every file in `src/app/` exactly once and that Node's join equals Python's join | US2 | `.github/workflows/checks.yml`, `tools/build.py` (`--print-source-sha`) | CI green |

### Phase 1 details

- `saveLocal(s)` → `try { localStorage.setItem(...); return true; } catch(e){ return false; }`.
- In `useStore`: `const [saveFailed, setSaveFailed] = useState(!LOCAL_OK);` In `update` and `replaceAll`, after
  `saveLocal(next)`: `setSaveFailed(!ok)` (only call the setter when the value changes). In the cloud
  `onSnapshot` path that also calls `saveLocal`, do the same.
- Return `saveFailed` from `useStore` as a fifth item (keep the first four in place so no caller breaks).
- In `App`, above `${view}`: when `saveFailed`, render a `notice` like the Workouts one:
  - title «آخر تغيير ماتحفظش على الجهاز»;
  - line «مساحة التخزين ممكن تكون مليانة أو المتصفح مانع الحفظ. احفظ نسخة احتياطية دلوقتي عشان ماتضيعش حاجة.»;
  - when `!LOCAL_OK` from the start, use «المتصفح ده مش بيسمح بالحفظ، فالتقدم هيضيع لما تقفل التطبيق.» instead;
  - a button «احفظ نسخة احتياطية» that calls the same build-and-download path `BackupSection` uses (factor its
    `build`/`save` into a small function both can call; no new file format).
- Restore: `RestorePart` already writes and rolls back on its own. Do not route its failure into this notice.
- Copy is Egyptian Arabic and goes through the same notice styles as today (DESIGN.md).

### Phase 2c details

**Placeholder.** Inside the app `<script>` of `src/planner.html`, the whole body (from `(function(){` through
`})();`) is replaced by one line: `/* @app-parts */`. The CDN `<script src>` tags, the example JSON block, the CSS
and the shell stay in `src/planner.html` exactly where they are.

**Join rule** (the same in Python and Node):
1. Read `src/app/ORDER`; ignore blank lines and lines starting with `#`.
2. Read each listed file as UTF-8, convert CRLF to LF.
3. Join the contents with nothing between them (each part ends with its own final newline, kept from the cut).
4. Replace the placeholder line, including its newline, with the joined text.
5. Fail with the file name if a listed file is missing, a file in `src/app/*.js` is not listed, or a name repeats.

**How to cut.** Cut only at the existing section headers, so each part holds whole sections. The first part also
holds the IIFE opening and library check; the last holds `App`, the render call and `})();`. Proposed map (adjust
to the real line positions after the drawings work lands, keeping whole sections):

| File | Holds (existing section headers) |
|---|---|
| `00-boot.js` | `(function(){`, library check, Preact/htm bindings |
| `01-settings-validate.js` | settings: format check |
| `02-settings-load.js` | settings: load; fixed names; data derived from settings |
| `03-time.js` | time helpers |
| `04-prayers.js` | prayer times, phase, anchor layout block |
| `05-courses.js` | courses |
| `06-store.js` | storage (`useStore`) |
| `07-day-model.js` | day model |
| `08-ui-small.js` | small UI pieces |
| `09-today.js` | Today, postponing UI |
| `10-week.js` | Week |
| `11-course-view.js` | Course |
| `12-rules.js` | edit rules, task paste, workout rules, backup rules, postpone rules blocks (markers unchanged) |
| `13-tasks-view.js` | item form, paste tasks UI, Tasks & appointments |
| `14-settings-view.js` | Settings (import, status, reset, backup) |
| `15-workouts.js` | Workouts |
| `16-shell.js` | shell (`TABS`, `App`), render, `})();` |

The cut is a pure move: no reformatting, no renamed identifiers, no added `export`/`import`. All parts share the
one IIFE scope exactly as today. Turning parts into real ES modules is a possible later feature, not this one.

**Checks.** `tools/lib/source.js` exports `readSource()` (the joined `src/planner.html`) and `joinParts(text)`.
Every `tools/check-*.js` that today does `fs.readFileSync(... 'src', 'planner.html')` uses `readSource()` instead.
Self-tests keep mutating the returned string, so they need no other change. `check-settings.js --write-example`
still reads and writes the example block in `src/planner.html` itself (it is not in a part).

**Verify byte-identity before committing:**

```
git show main:src/planner.html > /tmp/old-source.html
node -e "require('./tools/lib/source.js').readSource()" > /tmp/new-source.html   # or a --print flag
cmp /tmp/old-source.html /tmp/new-source.html
git show main:index.html > /tmp/old-index.html && python3 tools/build.py && cmp /tmp/old-index.html index.html
```

## Quickstart (manual checks)

1. **Save failure** (Phase 1), at 375 px:
   - in dev tools run `Storage.prototype.setItem = () => { throw new Error('full'); }`, then tick a block: the
     notice shows on Today; switch tabs: it is still there;
   - tap «احفظ نسخة احتياطية»: the file downloads and holds the tick;
   - reload the page (restores the real `setItem`), tick: no notice;
   - with storage working, nothing looks different from `main`.
2. **Split** (Phase 2c): both `cmp` commands above print nothing; `node tools/check-parity.js --old /tmp/old-index.html
   --new index.html` reports 0 differences; every CI command passes; the installed app updates and works offline.

## Project Structure

```text
specs/010-code-health/
├── spec.md, plan.md
└── tasks.md            # from /speckit-tasks

src/planner.html        # shell, CSS, example settings, placeholder line
src/app/ORDER           # part order, one file per line
src/app/*.js            # the app script, cut at section headers
tools/build.py          # joins parts before inlining libraries
tools/lib/source.js     # readSource() for every check
tools/check-*.js        # one-line switch to readSource()
.github/workflows/checks.yml
.specify/memory/constitution.md, AGENTS.md, README.md   # Phase 2a wording
```

**Structure Decision**: same single-file output; the source becomes a shell page plus ordered part files joined at
build time by the existing build step.

## Complexity Tracking

| Violation | Why needed | Simpler alternative rejected because |
|---|---|---|
| Source no longer one file (Principle V names `src/planner.html`) | One 3,700-line script is hard to review, conflicts on every branch, and is too large for an AI agent to read whole; checks depend on text slicing | Keeping one file: every problem above stays. ES modules with a bundler: adds a framework/build tool, which Principle V forbids without need. Plain concatenation in the existing `build.py` keeps the output and the build step the same |
