# Quickstart: Backup and Restore

Validation guide. Build with `python3 tools/build.py`, serve the repo root locally, and open `index.html` at
375 px width. Use scratch data only.

## 1. Dev checks

```bash
node tools/check-backup.js
node tools/check-backup.js --self-test
```

All checks pass; the self-test catches every mutation. The CI workflow runs both.

## 2. Save (US1)

1. Add a few ticks, two tasks and one finished workout.
2. Settings → «احفظ نسخة احتياطية»: a file `mizan-backup-<today>.json` is saved; the line shows today as the
   last backup. Open the file as text: marker, version, date, checksum, and the three parts.
3. With no imported settings, `data.settings` is `null`. Offline (network off): saving still works.

## 3. Restore with preview (US2)

1. Change the data: untick a block, delete a task, finish another workout.
2. Settings → choose the saved file: the preview shows the file's date and counts; nothing has changed yet
   (check the Today and Tasks tabs).
3. «لأ»: nothing changes. Choose it again and «استرجع»: the app reloads with exactly the saved ticks, tasks and
   workouts; the extra workout is gone; no other mark exists.
4. Make a backup while a workout is open, finish it, restore: the open workout returns with its original start
   time.
5. Restore the same file twice: same result.

## 4. Bad files (US3)

Pick in turn: a photo, an empty file, a settings file, a backup with one character changed, a backup with
`version` set to 2, and a file over 5 MB. Each shows its message from the contract, and the stored data is
unchanged (compare the three keys before and after in the browser console).

## 5. Persistent storage (US4)

- Chromium: the line shows kept or may clear; no prompt appeared.
- Firefox: no prompt on load; the button appears; tapping it shows Firefox's own prompt and the line updates.

## 6. Performance and privacy

- With 700 generated workouts and two years of ticks: save and restore each finish in under 2 seconds.
- The browser's network panel shows no request during save, preview or restore.
- `node tools/check-private.js` is clean before each commit.
