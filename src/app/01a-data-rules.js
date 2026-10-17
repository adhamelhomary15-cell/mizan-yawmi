  // start of data rules
  /* ---------------- data rules (pure; tools/check-data.js runs this block) ---------------- */
  // How each store is saved (an envelope with its version, save time and checksum), how old data is brought forward,
  // how a damaged entry is set aside instead of lost, which of two copies to trust, and which daily snapshots to keep.
  // No storage, page or network here. The backup rules use fnv1a too.
  const STORE_FORMAT = 'mizan-store';
  const STORE_NAMES = ['progress', 'workouts', 'settings'];
  const CURRENT_VERSION = {progress: 2, workouts: 2, settings: 2};
  const isDayText = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const isPlainObject = v => !!v && typeof v === 'object' && !Array.isArray(v);

  // FNV-1a, 32 bits, over the UTF-16 code units: catches a damaged or hand-edited file; not a security measure.
  function fnv1a(text){
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function sealStore(store, version, data, now){
    return {format: STORE_FORMAT, store, version, savedAt: new Date(now).toISOString(), sum: fnv1a(JSON.stringify(data)), data};
  }
  // value is the stored text (localStorage) or the stored object (IndexedDB).
  function openEnvelope(value, store){
    if (value === null || value === undefined || value === '') return {ok: false, code: 'missing'};
    let e = value;
    if (typeof value === 'string') { try { e = JSON.parse(value); } catch(err){ return {ok: false, code: 'damaged'}; } }
    if (!isPlainObject(e) || e.format !== STORE_FORMAT || !('data' in e)) return {ok: false, code: 'damaged'};
    if (e.store !== store) return {ok: false, code: 'wrong-store'};
    if (!Number.isInteger(e.version) || e.version < 1 || typeof e.savedAt !== 'string' || Number.isNaN(Date.parse(e.savedAt))) return {ok: false, code: 'damaged'};
    if (fnv1a(JSON.stringify(e.data)) !== e.sum) return {ok: false, code: 'damaged'};
    return {ok: true, version: e.version, savedAt: e.savedAt, data: e.data};
  }

  // A mark is done (true), cancelled ('skip') or postponed ({moved: date}). Anything else is set aside.
  const goodMark = v => v === true || v === 'skip' || (isPlainObject(v) && isDayText(v.moved));
  const goodTask = t => isPlainObject(t) && typeof t.id === 'string' && typeof t.text === 'string';
  const goodAppt = a => isPlainObject(a) && typeof a.id === 'string' && typeof a.label === 'string'
    && /^[0-6]$/.test(String(a.day)) && (a.time === undefined || a.time === '' || /^\d{2}:\d{2}$/.test(a.time));
  // Progress with every entry that would break a screen moved into setAside, unchanged; everything else as it was.
  function checkProgress(input){
    const d = JSON.parse(JSON.stringify(isPlainObject(input) ? input : {}));
    const aside = Array.isArray(d.setAside) ? d.setAside : [], before = aside.length;
    const put = (where, key, value) => aside.push({where, key, value});
    if (isPlainObject(d.checks)) Object.keys(d.checks).forEach(day => {
      const marks = d.checks[day];
      if (!isDayText(day) || !isPlainObject(marks)) { put('checks', day, marks); delete d.checks[day]; return; }
      const bad = Object.keys(marks).filter(k => !goodMark(marks[k]));
      bad.forEach(k => { put('checks', day + ' ' + k, marks[k]); delete marks[k]; });
      if (bad.length && !Object.keys(marks).length) delete d.checks[day];
    });
    if (Array.isArray(d.tasks)) d.tasks = d.tasks.filter(t => goodTask(t) || (put('tasks', String(t && t.id), t), false));
    if (Array.isArray(d.appts)) d.appts = d.appts.filter(a => goodAppt(a) || (put('appts', String(a && a.id), a), false));
    d.setAside = aside;
    return {data: d, setAside: aside.length - before};
  }

  // MIGRATIONS[store][n] brings data from version n to n + 1 and returns {data, setAside}.
  const keepAsIs = d => ({data: d, setAside: 0});
  const MIGRATIONS = {
    progress: {1: checkProgress},
    workouts: {1: keepAsIs},
    settings: {1: keepAsIs}
  };
  // From the stored version to the current one, on a copy: the input is never changed. A newer version is never
  // brought down; a step that fails leaves the caller with the data as it was.
  function migrate(store, version, data){
    const target = CURRENT_VERSION[store];
    if (!target || !Number.isInteger(version) || version < 1) return {ok: false, code: 'failed', at: version};
    if (version > target) return {ok: false, code: 'too-new'};
    let d = JSON.parse(JSON.stringify(data === undefined ? null : data)), aside = 0;
    for (let v = version; v < target; v++) {
      const step = (MIGRATIONS[store] || {})[v];
      if (!step) return {ok: false, code: 'failed', at: v};
      try { const r = step(d); d = r.data; aside += r.setAside; } catch(e){ return {ok: false, code: 'failed', at: v}; }
    }
    return {ok: true, version: target, data: d, setAside: aside};
  }

  // Which of two opened copies to use, and which one to write back. A copy from a newer app wins and nothing is
  // written over it.
  function pickCopy(store, local, mirror){
    const valid = [['local', local], ['mirror', mirror]].filter(([, c]) => c && c.ok);
    if (!valid.length) return {use: null, repair: null, tooNew: false};
    const newer = valid.find(([, c]) => c.version > CURRENT_VERSION[store]);
    if (newer) return {use: newer[0], repair: null, tooNew: true};
    const [name, copy] = valid.length === 2 && Date.parse(valid[1][1].savedAt) > Date.parse(valid[0][1].savedAt) ? valid[1] : valid[0];
    const other = name === 'local' ? mirror : local;
    const same = other && other.ok && other.savedAt === copy.savedAt;
    return {use: name, repair: same ? null : (name === 'local' ? 'mirror' : 'local'), tooNew: false};
  }

  // The snapshot dates to delete so that only the `keep` most recent days stay. Keys that are not dates go too.
  function keepSnapshots(dates, keep = 7){
    const days = [...new Set(dates.filter(isDayText))].sort().reverse();
    return dates.filter(d => !isDayText(d)).concat(days.slice(keep));
  }
  // end of data rules
