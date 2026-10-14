# Quickstart: Download Exercise Art When Needed

Serve the repo with `py -m http.server 8765 --bind 127.0.0.1 --directory <repo>`. Open
`http://127.0.0.1:8765/index.html` at 375 px. Unregister the service worker and clear caches first.

1. **Size**: `index.html` is under 2 MB.
2. **Built-ins offline**: go offline. The library, a workout, history and a split show all built-in drawings.
3. **No tap, no request**: online, add a custom exercise "Cable Fly" and visit every tab. The network panel
   shows no request under `tools/vendor/workout-guide/`. The exercise shows the generic figure.
4. **Download**: open its page and tap «نزّل الرسمة». One request goes to `.../frames/cable-fly.json.gz`. The
   drawing shows on the page and in the library.
5. **Kept**: go offline and reload. The drawing still shows, and there are no requests.
6. **Offline tap**: add "Pec Deck" while offline and tap: the no-network message, and the generic figure.
7. **Unknown name**: add an Arabic-named exercise: generic figure, no button.
8. **Update**: rebuild with a one-character change and reload. The app cache is replaced, and «Cable Fly» still
   shows its drawing.
