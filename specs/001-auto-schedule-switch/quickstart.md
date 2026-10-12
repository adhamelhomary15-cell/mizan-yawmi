# Quickstart: validating the schedule switch

Run these after implementation. Replace `<py>` with your Python (on this machine the `python`
shortcut is not on the PATH, so use the full path to `python.exe`).

## 1. Rule check (SC-001, FR-001, FR-008)

```bash
node tools/check-phase.js
```

Expected: for 2026-01-01 through 2035-12-31, the computed version and the fallback version agree on
every date except at most one day around 16 February each year; both change on the day after the
last Thursday of October (2026: A through 2026-10-29, B from 2026-10-30). Any other mismatch fails.

## 2. Build

```bash
<py> tools/build.py
```

Expected: `index.html`, `sw.js`, and the manifest regenerate with no error. Do not hand-edit them.

## 3. Switch in the browser (US1, US2)

Serve the repo root locally and open it at phone width. In the console:

1. Today, a Saturday/Monday/Thursday: note the gym and work times. Use the browser clock override or
   the Week view to compare 2026-10-29 with 2026-10-30; the times differ, and on 2026-10-30 the gym
   starts 0 to 60 minutes before that day's Maghrib (SC-003, early version).
2. Week view for the week of 2026-10-26: each day shows its own version; planned hours match.
3. Reload with a saved tick on 2026-10-26: the tick is still there after the date moves past the
   switch (SC-004).

## 4. Notice (US3, FR-010)

1. Clear site data, load the app: no notice (first run sets `phaseSeen` silently).
2. In the console set the stored `phaseSeen` to the opposite of today's version and reload: the
   notice appears on every tab.
3. Tap `تمام` and reload: it does not return.
4. Set `phaseSeen` to the opposite version again and reopen days later (simulate by leaving it set):
   the notice appears on that first open.

## 5. Safety checks (Principles II and III)

- Copy the `checks` object before and after steps 3-4; it must be byte-identical.
- Network panel: no request is made by showing or dismissing the notice.
- DevTools offline, reload: the app and the notice behave the same (SC-005).
- Fallback: in the console set `window.adhan = undefined` before load (or block the script) and
  repeat step 3 for 2026-10-29 and 2026-10-30; the same versions appear.

## 6. Done

All steps pass, the build regenerated cleanly, and the owner has approved the notice copy.
