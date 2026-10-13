# Contract: settings UI and check scripts

## Settings area (in the app)

| Element | Behavior |
|---|---|
| Entry | A button in the app header, reachable on every tab |
| Status | Shows which settings are in use: "Example" or the file's `name`, and the file's version |
| Import | A file picker (`.json`); on success shows a summary (days, blocks, courses, language, location label) and asks to confirm replacing; then reloads |
| Errors | Plain-language messages from the settings-file contract; focus moves to the message; stored settings and progress unchanged |
| Reset | Removes only the settings key (after confirmation); shows the example; progress kept |
| Example label | While the example is in use, a visible "Example" label on Today and in the settings area |
| First open hint | While the example is in use, the settings area is highlighted as the way to import |
| Accessibility | Buttons reachable by keyboard; messages in a polite live region; existing design tokens only |
| Must not | Make any network request, write progress, or mark anything done |

## `tools/check-settings.js`

```text
node tools/check-settings.js [file]            validate a settings file (default: the embedded example)
node tools/check-settings.js --write-example   write settings.example.json from the embedded example
```
Exit 0 valid, 1 invalid (prints the problems), 2 usage error. Uses the app's own validator extracted
from `src/planner.html`.

## `tools/check-parity.js`

```text
node tools/check-parity.js --old <html> --new <html> --settings <file> [--from YYYY-MM-DD --days N]
```
Compares, for every date, the day plan (start, end, category, title, detail, subject, key) from the
old build against the new build loaded with the settings file, plus the course plan and rules text.
Exit 0 when there are 0 differences, 1 otherwise (prints the first differences).

## `tools/check-private.js`

```text
node tools/check-private.js [--settings <file>]
```
Default settings file is in the ignored private folder. Checks: file exists, is ignored, is untracked;
none of its string values (4+ characters, minus values in the example and a generic-word list) appear
in any tracked file or in the built output. Exit 0 clean, 1 any hit (prints file and value category,
never the value itself), 2 file missing.
