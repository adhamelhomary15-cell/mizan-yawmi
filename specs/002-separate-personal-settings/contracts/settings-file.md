# Contract: the settings file

A UTF-8 JSON file the user keeps outside the repository (in the ignored private folder, or anywhere
on their device). The repo ships `settings.example.json` (generated from the example embedded in the
app) as the format reference. Field rules are in [data-model.md](../data-model.md).

## Minimal valid file

```json
{
  "format": "mizan-settings",
  "version": 1,
  "name": "My week",
  "timezone": "Africa/Cairo",
  "location": { "lat": 30.04, "lng": 31.24, "label": "Sample city" },
  "categories": {
    "study": { "label": "Study", "track": true },
    "work": { "label": "Work", "track": true },
    "rest": { "label": "Rest", "track": false }
  },
  "week": {
    "0": { "blocks": [["08:00", "study", "Reading"], ["12:00", "rest", "Lunch"]] }
  }
}
```

(The example values here are generic placeholders, not any real person's data.)

## Import rules

| Case | Result |
|---|---|
| Valid file | Stored; page reloads with the new settings; summary lists what was replaced |
| Not JSON, empty, or wrong `format` | Rejected: "this is not a settings file" |
| `version` greater than supported | Rejected: "made for a newer version of the app" |
| A required field missing or invalid | Rejected; message names the field and the problem (first 5 problems) |
| Unknown category/subject id in a block | Rejected; message names the day and block |
| Unknown top-level field | Warning only; the field is ignored |
| File over 1 MB | Rejected: "file too large" |

A rejected file never changes stored settings or progress.

## Safety properties

- The file is read in the browser only (file picker + reader); it is never uploaded.
- Values are treated as data: titles and notes are rendered as text, never as HTML.
- The importer writes only the settings key.
