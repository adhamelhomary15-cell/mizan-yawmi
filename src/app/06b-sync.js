  /* ---------------- sync (feature 025): the device side of the encrypted synced copy ---------------- */
  // Off until the owner signs in (constitution 3.0.1, Principle III). Every save of a store goes through saveStore, which
  // tells this part (onStoreSave): it stamps what changed, and 3 seconds later sends the merged, sealed store. A pull
  // merges the server's copy item by item (the sync rules), keeps the device's stores aside first when one of its
  // items gives way, and hands the result to the screens (onSyncedIn), as a save from another tab is.
  const SYNC_URL = '';            // tools/build.py puts server/address.txt here; empty: sync is not offered yet
  const SYNC_RECORD = 'mizan-sync';  // localStorage: {email, device, versions, dirty, lastSync, keyByPassword}
  const PUSH_DELAY = 3000, POLL_EVERY = 30000;
  const sync = {started: false, on: false, token: null, key: null, record: null, stamps: {}, known: {}, timer: null, running: null,
    status: 'off', listeners: {progress: [], workouts: [], settings: []}, watchers: []};

  // The token, the data key (not extractable), and per store the stamps and the data last seen, in their own database.
  function syncDb(){
    return new Promise(done => {
      try {
        const rq = indexedDB.open('mizan-sync', 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
        rq.onsuccess = () => done(rq.result);
        rq.onerror = () => done(null);
      } catch(e){ done(null); }
    });
  }
  async function kv(mode, fn){
    const db = await syncDb();
    if (!db) return undefined;
    return new Promise(done => {
      const tx = db.transaction('kv', mode), rq = fn(tx.objectStore('kv'));
      tx.oncomplete = () => done(rq && 'result' in rq ? rq.result : true);
      tx.onerror = tx.onabort = () => done(undefined);
    });
  }
  const kvGet = key => kv('readonly', s => s.get(key));
  const kvPut = (key, value) => kv('readwrite', s => s.put(value, key));
  const saveRecord = () => writeJSON(SYNC_RECORD, sync.record);

  function setStatus(status){ sync.status = status; sync.watchers.forEach(w => w(status)); }
  // The screens' view of sync: {status, email, lastSync, waiting}; status is off, unavailable, syncing, ok, offline,
  // signin (sign in again), or too-new.
  function syncView(){
    const r = sync.record || {};
    return {status: SYNC_URL ? sync.status : 'unavailable', email: r.email || '', lastSync: r.lastSync || null, waiting: STORE_NAMES.some(n => r.dirty && r.dirty[n])};
  }
  function watchSync(fn){ sync.watchers.push(fn); return () => { sync.watchers = sync.watchers.filter(w => w !== fn); }; }
  // The sync view for a screen, kept fresh.
  function useSyncView(){
    const [view, setView] = useState(syncView);
    useEffect(() => watchSync(() => setView(syncView())), []);
    return view;
  }
  // The line at the foot of every screen.
  function syncLine(v){
    if (!LOCAL_OK) return 'المتصفح ده مش بيسمح بالحفظ، فالعلامات هتتمسح لما تقفل الصفحة';
    if (!v.email) return 'بياناتك محفوظة على الجهاز ده بس';
    if (v.status === 'signin') return 'المزامنة واقفة: ادخل تاني من الإعدادات';
    if (v.status === 'too-new') return 'المزامنة واقفة: حدّث التطبيق';
    if (v.waiting || v.status === 'offline') return 'متزامن، وفيه تغييرات مستنية النت';
    return 'متزامن' + (v.lastSync ? '، آخر مرة ' + fmtStr(zoneParts(new Date(v.lastSync)).min) : '');
  }
  function onSyncedIn(store, take){
    sync.listeners[store].push(take);
    return () => { sync.listeners[store] = sync.listeners[store].filter(t => t !== take); };
  }

  async function api(method, path, body){
    const headers = {'Content-Type': 'application/json'};
    if (sync.token) headers.Authorization = 'Bearer ' + sync.token;
    const r = await fetch(SYNC_URL + path, {method, headers, body: body === undefined ? undefined : JSON.stringify(body)});
    const out = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error('sync ' + r.status), {status: r.status, body: out});
    return out;
  }

  // Called by saveStore after every local save: stamps what changed since the data last seen.
  function onStoreSave(store, data){
    if (!sync.on) return;
    const before = sync.known[store];
    if (before !== undefined) sync.stamps[store] = stampChanges(store, before, data, sync.stamps[store] || {}, Date.now(), sync.record.device);
    sync.known[store] = JSON.parse(JSON.stringify(data));
    sync.record.dirty[store] = true; saveRecord();
    kvPut('stamps', sync.stamps); kvPut('known', sync.known);
    clearTimeout(sync.timer);
    sync.timer = setTimeout(syncAll, PUSH_DELAY);
    setStatus(sync.status === 'ok' ? 'ok' : sync.status);
  }

  // One store: pull, merge, keep the device's stores aside if something gives way, apply, and push with the next
  // version, again from the top when another device was faster.
  async function syncStore(name){
    for (let tries = 0; tries < 3; tries++) {
      const remote = await api('GET', '/store/' + name), r = sync.record;
      if (remote.version === r.versions[name] && !r.dirty[name]) return;
      const theirs = remote.version ? await open(sync.key, remote) : {version: CURRENT_VERSION[name], data: null, stamps: {}};
      if (theirs.version > CURRENT_VERSION[name]) { setStatus('too-new'); throw new Error('too-new'); }
      const local = storedData(name);
      const merged = theirs.data === null ? {data: local, stamps: sync.stamps[name] || {}, lost: []}
        : local === null ? {data: theirs.data, stamps: theirs.stamps, lost: []}
        : mergeStore(name, {data: local, stamps: sync.stamps[name] || {}}, theirs);
      if (merged.lost.length) await kvPut('before-sync', {at: Date.now(), stores: Object.fromEntries(STORE_NAMES.map(n => [n, storedData(n)]))});
      if (merged.data !== null && JSON.stringify(merged.data) !== JSON.stringify(local)) {
        sync.known[name] = JSON.parse(JSON.stringify(merged.data));      // so this save stamps nothing new
        saveStore(name, merged.data);
        sync.listeners[name].forEach(take => take(merged.data));
      }
      sync.stamps[name] = dropOldTombstones(merged.stamps, Date.now());
      let version = remote.version;
      if (merged.data !== null && (r.dirty[name] || JSON.stringify(merged.data) !== JSON.stringify(theirs.data))) {
        const sealed = await seal(sync.key, {format: 'mizan-sync', store: name, version: CURRENT_VERSION[name], data: merged.data, stamps: sync.stamps[name]});
        try { version = (await api('PUT', '/store/' + name, Object.assign({version: remote.version + 1}, sealed))).version; }
        catch (e) { if (e.status === 409) continue; throw e; }
      }
      r.versions[name] = version; r.dirty[name] = false;
      await kvPut('stamps', sync.stamps); await kvPut('known', sync.known);
      return;
    }
  }
  function syncAll(){
    if (!sync.on || !SYNC_URL) return Promise.resolve();
    if (sync.running) return sync.running;
    setStatus('syncing');
    sync.running = (async () => {
      try {
        for (const name of STORE_NAMES) await syncStore(name);
        sync.record.lastSync = Date.now(); setStatus('ok');
      } catch (e) {
        if (e.status === 401) setStatus('signin');
        else if (sync.status !== 'too-new') setStatus('offline');
      } finally { saveRecord(); sync.running = null; }
    })();
    return sync.running;
  }
  // Asks the server every 30 seconds while the page shows, and on coming back or online again.
  async function poll(){
    if (!sync.on || document.visibilityState !== 'visible') return;
    try {
      const v = await api('GET', '/versions'), r = sync.record;
      if (STORE_NAMES.some(n => v[n] !== r.versions[n] || r.dirty[n])) await syncAll();
    } catch (e) { setStatus(e.status === 401 ? 'signin' : 'offline'); }
  }

  // Starts sync on this device from what was kept: changes made while it was closed (a restore, say) are stamped now.
  async function startSync(){
    sync.record = readJSON(SYNC_RECORD);
    if (!SYNC_URL || !sync.record || !sync.record.email) return;
    const [token, key, stamps, known] = await Promise.all(['token', 'key', 'stamps', 'known'].map(kvGet));
    if (!token || !key) return;
    Object.assign(sync, {on: true, token, key, stamps: stamps || {}, known: known || {}});
    STORE_NAMES.forEach(n => {
      const now = storedData(n);
      if (sync.known[n] !== undefined && JSON.stringify(sync.known[n]) !== JSON.stringify(now)) {
        sync.stamps[n] = stampChanges(n, sync.known[n], now, sync.stamps[n] || {}, Date.now(), sync.record.device);
        sync.record.dirty[n] = true;
      }
      sync.known[n] = now;
    });
    syncHook = onStoreSave;
    setStatus('ok');
    if (!sync.started) {
      sync.started = true;
      setInterval(poll, POLL_EVERY);
      addEventListener('online', syncAll);
      addEventListener('visibilitychange', poll);
    }
    syncAll();
  }
  // After a sign-in: keep the token and the data key, and start. Items already on this device have no stamp yet, so
  // where the account has the same item changed, the account's wins; everything else from both sides is kept.
  // keepDeviceSettings: the owner chose this device's schedule over the account's (the first join), so it is stamped now
  // and wins.
  async function beginSync(email, token, key, keyByPassword, keepDeviceSettings){
    const old = readJSON(SYNC_RECORD) || {};
    sync.record = {email, device: old.device || crypto.randomUUID(), versions: {}, dirty: {progress: true, workouts: true, settings: true}, lastSync: null, keyByPassword};
    saveRecord();
    await kvPut('token', token); await kvPut('key', key);
    const stamps = keepDeviceSettings ? {settings: stampChanges('settings', null, storedData('settings'), {}, Date.now(), sync.record.device)} : {};
    await kvPut('stamps', stamps); await kvPut('known', Object.fromEntries(STORE_NAMES.map(n => [n, storedData(n)])));
    await startSync();
  }
  // Signing out or turning sync off on this device: the token, the key and what sync kept go; the stores stay.
  async function endSync(){
    syncHook = null;
    Object.assign(sync, {on: false, token: null, key: null, stamps: {}, known: {}});
    clearTimeout(sync.timer);
    removeKey(SYNC_RECORD); sync.record = null;
    await kv('readwrite', s => s.clear());
    setStatus('off');
  }
  startSync();
