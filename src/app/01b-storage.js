  /* ---------------- device storage: every store goes through here (feature 013) ---------------- */
  // A store (progress, workouts, settings) is kept as an envelope (see the data rules) in localStorage, the copy read
  // first, and in an IndexedDB mirror. The first save of each day also keeps a snapshot of all three stores, from just
  // before that save. Opening a store picks the newest valid copy and repairs the other. Small single values (the
  // backup date, one-time flags) use readRaw, readJSON and writeJSON directly.

  // The stored text, or null when the key is missing or the browser blocks storage.
  function readRaw(key){ try { return localStorage.getItem(key); } catch(e){ return null; } }
  // The stored value, or fallback when it is missing, blocked or not valid JSON.
  function readJSON(key, fallback = null){
    const raw = readRaw(key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch(e){ return fallback; }
  }
  // true when the write went through, false when the browser refused it (storage full, private mode, blocked).
  function writeJSON(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch(e){ return false; } }
  function removeKey(key){ try { localStorage.removeItem(key); } catch(e){} }

  const STORE_KEYS = {progress: 'mizan-progress', workouts: 'mizan-workouts', settings: 'mizan-settings'};
  // Where each store lived before 013: read once, moved to its new key, and removed after a read-back check.
  const OLD_KEYS = {progress: 'fall26-planner-v1', workouts: 'mizan-workouts-v1', settings: 'mizan-settings-v1'};

  // The local copy, brought to the current version: {state: 'ok', data, setAside} or {state} with state 'empty',
  // 'damaged', 'too-new' or 'failed'. A damaged copy is kept aside under <key>.damaged before anything can write over it.
  function loadStore(store){
    const raw = readRaw(STORE_KEYS[store]), copy = openEnvelope(raw, store);
    if (copy.ok) return migrated(store, copy.version, copy.data);
    if (copy.code !== 'missing') { keepDamaged(STORE_KEYS[store] + '.damaged', raw); return {state: 'damaged'}; }
    const old = readRaw(OLD_KEYS[store]);
    if (old === null) return {state: 'empty'};
    let data;
    try { data = JSON.parse(old); } catch(e){ return {state: 'damaged'}; }
    if (store === 'workouts' && isPlainObject(data) && typeof data.v === 'number' && data.v > 1) return {state: 'too-new'};
    const r = migrated(store, 1, data);
    if (r.state !== 'ok') return r;
    const env = sealStore(store, CURRENT_VERSION[store], r.data, Date.now());
    if (writeJSON(STORE_KEYS[store], env) && readRaw(STORE_KEYS[store]) === JSON.stringify(env)) removeKey(OLD_KEYS[store]);
    return r;
  }
  // The damaged text exactly as it was, once, so a later save cannot write over the only copy of it.
  function keepDamaged(key, raw){ if (readRaw(key) === null) { try { localStorage.setItem(key, raw); } catch(e){} } }
  function migrated(store, version, data){
    const m = migrate(store, version, data);
    return m.ok ? {state: 'ok', data: m.data, setAside: m.setAside} : {state: m.code};
  }
  // The local copy's data as stored, whatever its version (a backup keeps data written by a newer app as it is).
  function storedData(store){
    const copy = openEnvelope(readRaw(STORE_KEYS[store]), store);
    return copy.ok ? copy.data : readJSON(OLD_KEYS[store]);
  }

  // Saves to localStorage now and to the mirror once the store was opened against it. Returns whether the local
  // write went through. The mirror always gets the local copy as it is when its turn comes, never an older value.
  function saveStore(store, data){
    snapshotBeforeFirstSave();
    const ok = writeJSON(STORE_KEYS[store], sealStore(store, CURRENT_VERSION[store], data, Date.now()));
    reconcile(store).then(openMirror).then(db => db && copyToMirror(db, store));
    if (ok && syncHook) syncHook(store, data);
    return ok;
  }
  // Set by the sync part once it has started (feature 025), so every save is stamped there; null while sync is off.
  let syncHook = null;
  // Removes a store everywhere, so an older copy cannot come back after a reset.
  async function removeStore(store){
    removeKey(STORE_KEYS[store]);
    const db = await openMirror();
    if (db) await idb(db, 'copies', 'readwrite', s => s.delete(store));
  }

  // The IndexedDB mirror: null where IndexedDB is missing or blocked, and then the app works on localStorage alone.
  let mirrorDb, mirrorState = 'unknown';
  function openMirror(){
    if (!mirrorDb) mirrorDb = new Promise(done => {
      try {
        const rq = indexedDB.open('mizan', 1);
        rq.onupgradeneeded = () => { rq.result.createObjectStore('copies'); rq.result.createObjectStore('snapshots'); };
        rq.onsuccess = () => { mirrorState = 'on'; done(rq.result); };
        rq.onerror = rq.onblocked = () => { mirrorState = 'off'; done(null); };
      } catch(e){ mirrorState = 'off'; done(null); }
    });
    return mirrorDb;
  }
  // One request in its own transaction. Resolves its result when the transaction completes, or undefined on failure.
  function idb(db, name, mode, request){
    return new Promise(done => {
      try {
        const tx = db.transaction(name, mode), rq = request(tx.objectStore(name));
        tx.oncomplete = () => done(rq && 'result' in rq ? rq.result : true);
        tx.onerror = tx.onabort = () => { if (mode === 'readwrite') mirrorState = 'failed'; done(undefined); };
      } catch(e){ if (mode === 'readwrite') mirrorState = 'failed'; done(undefined); }
    });
  }
  // After a damaged start with nothing to bring back, the mirror waits until the store holds something real (see
  // reconcile), so the empty state the app goes on from never spreads to the mirror.
  const waitForContent = {};
  async function copyToMirror(db, store){
    const env = readJSON(STORE_KEYS[store]), copy = openEnvelope(env, store);
    if (!copy.ok) return;
    if (waitForContent[store]) { if (!waitForContent[store](copy.data)) return; delete waitForContent[store]; }
    if (await idb(db, 'copies', 'readwrite', s => s.put(env, store))) mirrorState = 'on';
  }

  // Once per store and session: compare the local copy with the mirror, use the newer valid one, repair the other.
  // startedEmpty: the session began with no usable local copy, so a valid mirror wins whatever its save time (a save
  // made in the first moments, before this ran, must not beat the real data). hasContent(data) says whether a store
  // holds anything real; it decides when the mirror may be written again after a damaged start. Resolves
  // {recovered: data}, {tooNew: true} or null.
  const reconciled = {};
  function reconcile(store, startedEmpty = false, hasContent = null){
    return reconciled[store] || (reconciled[store] = (async () => {
      const db = await openMirror();
      if (!db) return null;
      const stored = await idb(db, 'copies', 'readonly', s => s.get(store));
      const local = openEnvelope(readRaw(STORE_KEYS[store]), store), mirror = openEnvelope(stored, store);
      const pick = startedEmpty && mirror.ok ? {use: 'mirror', repair: 'local', tooNew: mirror.version > CURRENT_VERSION[store]} : pickCopy(store, local, mirror);
      if (pick.tooNew) return pick.use === 'mirror' ? {tooNew: true} : null;
      if (pick.use === 'mirror' && pick.repair === 'local') {
        const m = migrate(store, mirror.version, mirror.data);
        if (!m.ok) return null;
        writeJSON(STORE_KEYS[store], stored);
        return {recovered: m.data};
      }
      if (startedEmpty && hasContent) waitForContent[store] = hasContent;
      // a damaged mirror copy is kept aside, once, before anything can write over it
      if (mirror.code === 'damaged' && await idb(db, 'copies', 'readonly', s => s.get(store + '.damaged')) === undefined) await idb(db, 'copies', 'readwrite', s => s.put(stored, store + '.damaged'));
      if (pick.repair === 'mirror') await copyToMirror(db, store);
      return null;
    })());
  }
  // Another tab saved this store: hand over its data. The storage event only fires in the other tabs.
  function onOtherTab(store, take){
    const listen = e => {
      if (e.key !== STORE_KEYS[store]) return;
      const copy = openEnvelope(e.newValue, store);
      const m = copy.ok && migrate(store, copy.version, copy.data);
      if (m && m.ok) take(m.data);
    };
    addEventListener('storage', listen);
    return () => removeEventListener('storage', listen);
  }

  // The daily snapshots, newest first: [{day, stores: {progress, workouts, settings}}], each store as an envelope.
  async function listSnapshots(){
    const db = await openMirror();
    const all = db ? await idb(db, 'snapshots', 'readonly', s => s.getAll()) : null;
    return (all || []).filter(s => s && isDayText(s.day) && isPlainObject(s.stores)).sort((a, b) => (a.day < b.day ? 1 : -1));
  }
  // The first save of each day keeps all three stores as they were just before it; the 7 most recent days stay.
  // A snapshot that cannot be written marks the extra copy as failing (mirrorState), which the storage line shows.
  let snapshotDay = null;
  function snapshotBeforeFirstSave(){
    const day = zoneParts(new Date()).iso;
    if (snapshotDay === day) return;
    snapshotDay = day;
    const stores = {};
    STORE_NAMES.forEach(n => { const env = readJSON(STORE_KEYS[n]); if (openEnvelope(env, n).ok) stores[n] = env; });
    if (!Object.keys(stores).length) return;
    openMirror().then(async db => {
      if (!db) return;
      const days = await idb(db, 'snapshots', 'readonly', s => s.getAllKeys());
      if (!days || days.includes(day)) return;
      await idb(db, 'snapshots', 'readwrite', s => { keepSnapshots(days.concat(day)).forEach(d => s.delete(d)); return s.put({day, stores}, day); });
    });
  }
