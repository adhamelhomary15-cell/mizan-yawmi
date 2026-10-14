# Data Model: Backup and Restore

Nothing new is stored in the existing keys. A backup is a file the user keeps; one small new key records when the
last backup was made.

## Backup file

| Field | Rule |
|---|---|
| `format` | exactly `"mizan-backup"` |
| `version` | `1`; a larger number means a newer app made it, and it is refused |
| `createdAt` | ISO date-time when the file was made |
| `checksum` | FNV-1a 32-bit hash, 8 lower-case hex digits, of `JSON.stringify(data)` |
| `data.progress` | the progress store as kept under `fall26-planner-v1` (checks, modules, tasks, appts, courses, mainCourse, extras, phaseSeen) |
| `data.workouts` | the workout root as kept under `mizan-workouts-v1` (custom, routines, workouts, current, prefs) |
| `data.settings` | the imported settings object, or `null` when none was imported or the stored one is invalid |

File name: `mizan-backup-YYYY-MM-DD.json`. Size limit when reading: 5 MB.

## Restore preview (derived, never stored)

| Field | Source |
|---|---|
| `createdAt` | the file |
| `tasks`, `appts`, `courses` | lengths of the progress lists |
| `tickDays` | number of dates in `checks` |
| `workouts` | number of finished workouts |
| `openWorkout` | whether `workouts.current` is set |
| `settings` | `none`, `valid`, or `invalid` |

## Last backup

Key `mizan-backup-meta-v1`: `{lastBackupAt: <ISO date-time>}`. Missing or unreadable means "never".

## Storage status (derived)

`kept` (persisted), `may-clear` (not persisted), `unsupported` (no Storage Manager), plus `canAsk` on browsers
where the request is made only by the user's tap.

## Pure functions (in the `backup rules` block, covered by `tools/check-backup.js`)

- `fnv1a(text)` returns 8 hex digits.
- `makeBackup({progress, workouts, settings}, now, dateIso)` returns `{text, name}`.
- `readBackup(text, {normalize, normalizeRoot, validateSettings})` returns `{ok: false, code}` or
  `{ok: true, parts: {progress, workouts, settings, settingsValid}, preview}`. Codes: `empty`, `not-json`,
  `settings-file`, `not-backup`, `too-new`, `damaged`.

## State transitions

```text
idle --pick file--> reading --rejected--> idle (message, nothing changed)
reading --ok--> preview --cancel--> idle (nothing changed)
preview --confirm--> applying --any write fails--> idle (all keys put back, message)
applying --written--> (synced copy updated if active) --> reload with restored data
```
