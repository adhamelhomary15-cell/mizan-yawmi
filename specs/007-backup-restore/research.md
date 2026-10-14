# Research: Backup and Restore

Decisions for feature 007. Each entry: decision, rationale, alternatives considered.

## R1. One plain JSON file with a marker, a version, a checksum and three parts

- **Decision**: The file is `{format: "mizan-backup", version: 1, createdAt, checksum, data: {progress, workouts, settings}}`.
  `settings` is `null` when no settings file was imported. `checksum` is an FNV-1a 32-bit hash (hex) of
  `JSON.stringify(data)`. Name: `mizan-backup-YYYY-MM-DD.json` (date in the app's time zone).
- **Rationale**: plain text matches the settings file the user already handles; the marker and version let the
  app refuse foreign or newer files (FR-009); the checksum turns a hand-edited or damaged file into a clean
  refusal instead of a partial restore (FR-008). FNV-1a is a few lines of pure code, synchronous and testable in
  Node; it is for integrity, not security.
- **Alternatives**: SHA-256 through the browser crypto API (async, not available in every context, and not
  needed for accidental damage); no checksum (a truncated file would fail to parse, but an edited one would be
  half-accepted); a zip (needs a library).

## R2. Saving: a local download, with the share sheet as a fallback

- **Decision**: Build the text, wrap it in an in-memory file and trigger a download link (`download` attribute,
  object URL revoked after use). Where the device can share files (`navigator.canShare({files})`), a second
  button opens the system share sheet so the user can choose "Save to Files" or a destination themselves. If
  neither works, show «مقدرتش أحفظ الملف. افتح التطبيق في المتصفح العادي وجرّب تاني».
- **Rationale**: both stay on the device and need no network (FR-004, SC-005); some installed iOS web apps do
  not handle downloads well, and the share sheet is the platform's own way to save a file there.
- **Alternatives**: copy to clipboard (large text, easy to lose); a server or cloud (forbidden by the spec).

## R3. Reading: pure rules with injected normalisers

- **Decision**: A marked block `// start of backup rules` … `// end of backup rules` in `src/planner.html` holds
  `fnv1a`, `makeBackup(parts, now, dateIso)` and `readBackup(text, deps)`. `deps` supplies the app's existing
  `normalize` (progress), `normalizeRoot` (workouts) and `validateSettings`, so the block stays pure and the
  dev script can test it with the real functions or simple stand-ins. `readBackup` returns either
  `{ok: false, code}` or `{ok: true, parts, preview}`.
- **Rationale**: same pattern as features 003 to 006 (marker block plus a Node check with a mutation
  self-test), so the rules are tested without a browser.
- **Alternatives**: logic inside the Settings component (untestable without a browser).

## R4. Applying a restore: write all keys with rollback, push to a synced copy, then reload

- **Decision**: (1) Read the raw current values of the three keys. (2) Write the progress and workout parts,
  and the settings part when it is present and valid; on any write error, put every key back to its raw value
  and report the failure. (3) If a synced copy is active, hand the restored progress to the store so it is
  queued there, and wait for that write (up to 5 seconds; if it does not finish, say the synced copy may still
  show the old data). (4) Reload the page so every view reads the restored data.
- **Rationale**: all or nothing on the device (FR-008); the store's synced copy loads first on start and would
  otherwise put the old progress back; a reload is the simplest way to refresh the settings-derived state,
  which is computed once at start (this is how settings import already works).
- **Alternatives**: update each hook in place without reloading (the settings-derived values are module
  constants, so a reload is needed anyway when settings change); merging (out of scope).

## R5. Done marks are restored verbatim (constitution v2.0.0, Principle II)

- **Decision**: The progress part is written exactly as normalised from the file; no code path adds, removes or
  changes a mark. A dev check asserts that the restored `checks` equal the file's.
- **Rationale**: Principle II now allows restoring the owner's own backup only after a confirmed preview, with
  the file's marks reproduced exactly and nothing added.

## R6. Persistent storage without an unrequested prompt

- **Decision**: At start, if `navigator.storage.persisted` exists, read the status (never prompts). If not yet
  persisted and the browser is not Firefox, call `navigator.storage.persist()` once (Chromium and Safari decide
  silently). On Firefox, Settings shows «اطلب من المتصفح يحتفظ بالبيانات», and only that tap calls `persist()`.
  Settings shows one of: kept, may be cleared (with a suggestion to save a backup), not supported.
- **Rationale**: Chromium grants or denies by its own heuristics without UI; Firefox shows a popup for this
  request (web.dev "Persistent storage"; MDN `StorageManager.persist()`); the owner approved this wording.
- **Alternatives**: always ask (would prompt on Firefox); never ask (loses the protection on Chromium).

## R7. Size limit and rejections

- **Decision**: Refuse files over 5 MB before reading them. Rejection codes and messages:
  `too-large`, `empty`, `not-json`, `settings-file` (the file is a settings file: point to the settings
  importer), `not-backup`, `too-new` (version above 1), `damaged` (missing parts, wrong types, or a checksum
  mismatch). The device's own workout data being from a newer app (`tooNew`) blocks the restore at apply time
  with its own message.
- **Rationale**: 700 workouts are about 0.7 MB and two years of ticks well under 1 MB, so 5 MB leaves years of
  room while refusing obviously wrong files fast (FR-009).

## R8. Settings inside a backup

- **Decision**: Save the stored settings only when they exist and pass `validateSettings`; otherwise `settings`
  is `null`, and the example schedule is never saved. On restore, settings that fail `validateSettings` are
  reported in the preview and skipped; the device keeps its current settings.
- **Rationale**: FR-010 and the assumption that the example is never written as settings.

## R9. Last backup date

- **Decision**: A small key `mizan-backup-meta-v1` holds `{lastBackupAt}`, written after a save is started.
  It is not part of a backup.
- **Rationale**: FR-005; keeping it apart from the progress store avoids changing that store's shape.

## R10. Testing

- **Decision**: `tools/check-backup.js`: round trip (make then read gives the same parts and preview counts),
  every rejection code, checksum catches a one-character edit, marks are reproduced exactly, settings
  `null` and invalid settings paths, a 700-workout timing check, and a mutation self-test. Added to
  `.github/workflows/checks.yml`. Browser pass per [quickstart.md](quickstart.md).
