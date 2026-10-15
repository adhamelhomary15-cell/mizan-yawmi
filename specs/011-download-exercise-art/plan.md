# Implementation Plan: Download Exercise Art When Needed

**Branch**: `011-download-exercise-art` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

## Summary

Move the 302 drawings out of `src/planner.html` into `tools/vendor/workout-guide/frames/<slug>.json.gz`. The
build inlines only the 29 built-in ones. Any other drawing is fetched from the same origin, only after a tap,
checked, and kept in its own Cache Storage bucket that survives app updates. A new dev check guards the
network surface, the built-ins and the size.

## Technical Context

- Single-file PWA, Preact and htm, built by `tools/build.py`. No new libraries.
- Storage: Cache Storage bucket `mizan-guides-v1` (new). localStorage is untouched.
- Testing: dev-only `tools/check-guides.js` with `--self-test`, run in CI; browser check at 375 px.

## Constitution Check

| Principle | Status |
|---|---|
| I. Human review | The download needs a tap. Nothing else changes. |
| II. Never auto-check done | Not touched. |
| III. Progress stays on the device | **New network dependency, listed here and approved by the owner on 2026-10-15.** One same-origin GET of a static file, after a tap. It carries only the drawing name in its path. No progress, settings or ids are sent. |
| VI. Public repo stays general | The art is generic and licensed. |
| Third-party material vendored | The drawings move to `tools/vendor/workout-guide/` with the license, attribution and upstream commit. |

## Design

### Files

- `tools/vendor/workout-guide/frames/<slug>.json.gz`: 302 files. Each is gzip of a JSON array of three SVG
  strings, byte-for-byte the payload PR #26 embedded.
- `tools/vendor/workout-guide/NOTICE.md`: source, upstream commit `aac5992`, authors, license, and what was
  changed (frames cut from the upstream art, recolored at display time).
- `tools/vendor/workout-guide/LICENSE-ASSETS.md` and `ATTRIBUTION.md`: copied from upstream at that commit.

### Build (`tools/build.py`)

The source keeps `const WORKOUT_GUIDE_ASSETS = {};`. The build reads the slugs in
`WORKOUT_GUIDE_BUILTIN_SLUGS`, base64-encodes those files, and writes them into that object. A missing file
stops the build.

### App (`src/planner.html`)

- New marked block `// start of guide rules` … `// end of guide rules`, with no storage, page or network:
  - `GUIDE_PATH = 'tools/vendor/workout-guide/frames/'`
  - `guideUrl(slug)`: refuses anything that is not `^[a-z0-9-]+$`.
  - `checkGuideFrames(frames)`: `{ok}` or `{ok: false}`. It accepts exactly three strings, each starting
    with `<svg`, under 1 MB, with no `<script`, `<foreignObject`, `on…=` attributes, `javascript:`, or
    `href` other than a local `#id`.
- `decodeGuide(bytes)`: gunzip with `DecompressionStream`, parse, check, and make data URIs.
- Loading order for a slug:
  1. built-in (inlined);
  2. the in-memory map;
  3. `caches.open('mizan-guides-v1')` then `match(url)`. This is a lookup only, no request.
  4. Nothing found: the generic figure, marked downloadable.
- `downloadGuide(slug)`: the only `fetch(` in the app. It checks `r.ok`, decodes, checks, puts the response
  bytes in the cache, and tells every illustration (a small subscriber set) to re-render.
- The exercise page (`large`) shows «نزّل الرسمة» when the slug is known and not available. The states are
  idle, «بتتنزّل…» and an error message, as in spec US2.
- Remove the unused `SquatInstructionalIllustration`, `InstructionalExerciseIllustration`,
  `interpolateExercisePose`, `EXERCISE_POSES`, `EXERCISE_EQUIPMENT`, `EXERCISE_ART` and their CSS. Merge the
  duplicate `.wk-illustration.large` and `.wk-pick` rules. The caption follows what is shown.

### Service worker (`sw.js`, from the build)

- The fetch handler ignores paths under `tools/vendor/workout-guide/`, so they never enter the versioned app
  cache.
- Activate keeps caches named `mizan-guides-*`.

### Check (`tools/check-guides.js`)

- The rules: `guideUrl` refuses bad slugs; `checkGuideFrames` accepts all 302 vendored files and refuses
  crafted bad ones.
- The vendor folder has a file for every slug named by the built-in map and the name map.
- Network surface: in `src/planner.html` there is exactly one `fetch(`, inside `downloadGuide`, and no
  `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource` or `import(`.
- `index.html` is under 2 MB and contains every built-in slug's data.
- `--self-test` mutations: a second fetch; a slug check removed; a script allowed; a built-in left out;
  frame count not checked.

## Rollout

One PR. The owner's phone gets a 1 MB update instead of 14 MB on the next open.
