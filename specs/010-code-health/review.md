# Code review: `src/app` after the split (T019)

**Date**: 2026-10-16 | **Scope**: all 22 parts in `src/app/`, plus the CSS in `src/planner.html`

**Against**: the Code standards in `AGENTS.md` (clean code), system design and architecture.

**Method**:
- an automated scan: unused top-level names, unused CSS classes, long lines, repeated patterns;
- then a read of the parts.

**Scan results**:
- no unused top-level function or const;
- 1 unused CSS rule;
- 116 lines over 200 characters, one of them 11,411;
- 14 hand-built notices;
- 3 copies of the toast logic;
- 7 hand-written `localStorage` try blocks;
- 22 inline `style=` attributes.

Findings are in three groups:
- **A**: clean-ups with no behaviour change. They are done in T020, one commit each, after the owner's OK.
- **B**: design problems. Fixing them changes data or behaviour, so each goes into the spec of the phase it belongs
  to, not into a clean-up.
- **C**: security, for the security phase.

## A. Clean-ups (no behaviour change)

Ranked by value against risk.

| # | Where | Problem | Fix | Risk |
|---|---|---|---|---|
| A1 | `21-shell.js` (`act`, `actEdit`, `showToast`) | The toast and its 7-second timer are written three times. | `act` and `actEdit` call the one `showToast(text, undo)`. | Low |
| A2 | 7 places across 06, 15, 16, 02 | Each store hand-writes `try { localStorage… } catch(e){}` and its own JSON parsing. | Two helpers: `readJSON(key)` and `writeJSON(key, value)`, which returns ok. This is also the base for the multi-store layer. | Low |
| A3 | 14 notices across the screens | The same `<div class="notice"><p><b>…</b><span class="small muted">…</span></p>…` markup is written by hand each time. | One `Notice({title, line, role, children})` component, with the same DOM output. | Medium (visual): check that the DOM is identical |
| A4 | `03-time.js` and 4 parts | `cairoFmt` and `cairoParts` are named after one city, but they use the time zone from the settings. | Rename to `zoneFmt` and `zoneParts`. | Low (rename only) |
| A5 | `17-exercise-art.js:33` | The name-to-drawing table is one 11,411-character line of data inside the code. | Move it to `tools/vendor/workout-guide/names.json` and inline it at build time, like the drawings. | Low: `check-guides` covers it |
| A6 | 22 `style=` attributes | Layout values are mixed into the markup. | Named CSS classes. | Medium (visual): check at 375 px |
| A7 | `07-day-model.js` (`statusOf`, `movedTo`) | Both parse the same check value separately. | One reader for the check value; both use it. | Low |
| A8 | `21-shell.js` (`Icon`) | `dangerouslySetInnerHTML` with constant paths is the app's only raw-HTML sink. | Render `<path>` elements. | Low |
| A9 | `src/planner.html` CSS | `.mono` is never used. | Delete it. | None |
| A10 | `02-settings-load.js` | The comment on the block format sits under the weekday names. | Move it to the derived-data section it describes. | None |

## B. Design problems (each needs its own spec)

| # | Where | Problem | Why it matters for "any user, never leave the app" | Phase |
|---|---|---|---|---|
| B1 | `08-ui-small.js` (`showTitle`), `05-courses.js` | Owner-specific logic in a general app: a hard-coded Arabic lecture title, a "built-in course" with id `'aa'`, and a name swap during render. | Another user's course titles could be changed by rules that were written for one person. | Course model, with the editor |
| B2 | `02`, `07`, `08` (`DEFAULT_CATS`, `FAMILY`, `balanceOf` order) | Kinds are 9 fixed ids, and the two sides of the balance are hard-coded. | A user cannot add their own kinds (for example "تدريب" or "شغل حر"). | Editor |
| B3 | `02-settings-load.js` (`CFG`, `CATS`, `SCHED`, …) | Settings become constants when the page loads, so any change needs a reload. | An in-app editor needs settings as state that the screens follow. | Editor (first) |
| B4 | `03-time.js` (`START`, `END`) | The day is fixed from 07:00 to 01:00. | Night-shift workers and early risers cannot fit their days. | Editor / settings |
| B5 | `05-courses.js` (`MAIN_NAME`), `21-shell.js` | A global variable is changed during render. | Hidden coupling between parts, and a source of render-order bugs. | Course model |
| B6 | `06-store.js` | The key is named after a term (`fall26-planner-v1`), and stored data has no versions or migrations. `normalize` keeps `tasks`, `appts` and check values without checking their shape. | Any change to the data shape risks the data of existing users. | Data versioning |
| B7 | `06`, `16`, `02`, `15` | Three stores (progress, workouts, settings), each with its own load, save and failure logic, and two separate save-failure notices. | This is the multi-store layer the owner chose: one save path, several copies. | Storage layer |
| B8 | `04-prayers.js` (`lastThursdayOfOctober`) | The fallback for missing prayer times assumes one country's clock change. | It is wrong in other countries. | Settings |

## C. Security (security phase)

| # | Problem | Fix |
|---|---|---|
| C1 | No Content-Security-Policy. | A CSP `<meta>` in the build: scripts only inline, and `connect-src 'self'`. |
| C2 | `main` is not protected; a push publishes the app. | Branch protection: PR required, and CI must pass. |
| C3 | GitHub Actions are pinned by tag (`@v4`). | Pin them to commit SHAs. |
| C4 | Every Pages site of the account shares one origin. | A known risk until the app opens to others (owner's choice, 2026-10-16): a custom domain or an organisation. |

## Recommendation

- Do **A1, A2, A4, A7, A8, A9 and A10** first. They are low risk and remove most of the repetition.
- Then do **A3 and A6** with a browser check, and **A5** with `check-guides`.
- Leave group B for the phases named above. Changing data or behaviour inside a clean-up would break the
  "no behaviour change" promise of this feature.
