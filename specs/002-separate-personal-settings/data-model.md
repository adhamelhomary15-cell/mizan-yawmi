# Data Model: Separate Personal Settings

## Entities

### Settings (new)

One versioned bundle, stored on the device under its own storage key and replaced as a whole.

| Field | Type | Required | Validation |
|---|---|---|---|
| `format` | string | yes | exactly `"mizan-settings"` |
| `version` | integer | yes | `1`; a larger value is rejected as "made for a newer version" |
| `name` | string | no | 1-60 characters; shown in the settings area |
| `language` | string | no (default `"ar"`) | one of the supported values (`"ar"` in this feature) |
| `timezone` | string | yes | a valid IANA time zone name (checked with the platform's date formatter) |
| `location` | object | yes | `{lat, lng, label?}`; `lat` in -90..90, `lng` in -180..180 |
| `prayerMethod` | string | no (default `"Egyptian"`) | one of the method names the bundled prayer library exposes |
| `versions` | object | no | `{prayer, thresholdMinutes, fallback}`; when absent, days use their first version |
| `categories` | object | yes | keys are the fixed category ids; each value `{label, long?, track?}`, labels 1-30 characters |
| `subjects` | object | no | id (1-8 chars) to display name (1-60 characters) |
| `week` | object | yes | keys `"0"`..`"6"` (weekday numbers); each a Day (below) |
| `rules` | array of string | no | each 1-300 characters, at most 20 |
| `taskTags` | object | no | category id to short label |
| `course` | object | no | Course (below) |

Unknown top-level fields are ignored with a warning (forward tolerance), never silently executed.

### Day

| Field | Type | Validation |
|---|---|---|
| `note` | string | optional, at most 500 characters |
| `blocks` | array or object | either one array of Block, or `{A: [Block...], B: [Block...]}` (late/early versions) |

### Block

A 2-5 item array: `[start, category, title, detail?, subject?]`

| Position | Meaning | Validation |
|---|---|---|
| 0 `start` | start time | `"HH:MM"`, 00:00-24:59 (hours past 24 mean after midnight, as today); blocks sorted ascending |
| 1 `category` | category id | must be a key of `categories` |
| 2 `title` | title | 1-120 chars; `"Subject|action"` splits as today |
| 3 `detail` | extra line | optional, at most 300 chars |
| 4 `subject` | subject id | optional; must be a key of `subjects` |

A block ends where the next one starts; the last ends at the end of the day (unchanged rule).

### Course (optional)

| Field | Validation |
|---|---|
| `name`, `sub` | strings, 1-80 / 0-160 chars |
| `plan` | array of `{from, to, label, note?, items}`; `from`/`to` are `YYYY-MM-DD`, `from <= to`; `items` are `[id, title, detail?]` |

### Example settings (new, shipped)

The same shape as Settings, embedded in the app, containing only generic sample values and marked as
an example (`name` starts with "Example"). Used whenever no valid settings are stored.

### Progress (unchanged)

The existing object `{v:1, checks, modules, tasks, appts, courses, mainCourse, extras, phaseSeen}`
under its existing key. Settings never write to it, and it never contains settings.

## Stored keys

| Key | Holds | Written by |
|---|---|---|
| `fall26-planner-v1` (existing) | Progress | normal use, unchanged |
| `mizan-settings-v1` (new) | the validated Settings object (JSON) | import and reset only |

## State transitions

```text
no settings stored ──(open app)────────────────► example shown
example ──(import valid file)──────────────────► stored settings used   [page reloads]
stored ──(import valid file)───────────────────► replaced, summary shown [page reloads]
stored ──(reset)───────────────────────────────► key removed -> example
any ──(import invalid/empty/newer file)────────► no change, message shown
```

Rules:
- Validation runs before anything is stored; a failed import changes nothing.
- Reset and replace never touch the progress key.
- If the stored value fails validation on load (corrupt or from a future format), the app shows the
  example and tells the user, and does not delete the stored value.

## Compatibility

Progress saved before this change stays valid: its keys are `date -> "time-category"`, and a settings
file that reproduces the same blocks matches them again. Importing a file whose times differ from the
ones a tick was saved against leaves those ticks on their date but unmatched to a block (they remain
stored). The parity check proves the owner's generated file reproduces today's blocks exactly.
