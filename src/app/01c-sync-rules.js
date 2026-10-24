  // start of sync rules
  /* ---------------- sync rules (feature 025; pure, tools/check-sync.js runs this block) ---------------- */
  // Two devices merge a store item by item, never store by store. A store is seen as a map from a path to an item; a
  // path is a JSON list such as ["c", day, key] for one mark. Each path has a stamp [time, device, gone]: the higher
  // stamp wins (time, then device), and gone marks an item removed (a tombstone, kept 60 days). Nothing here makes or
  // clears a mark on its own: a merged item is always one that a device had (Principle II). No storage, page or network.
  const SYNC_LISTS = {progress: {tasks: 't', appts: 'a', courses: 'k'}, workouts: {workouts: 'w', custom: 'u', routines: 'r'}};
  const SYNC_SINGLES = {progress: ['v', 'mainCourse', 'phaseSeen', 'askedUpTo', 'setAside'], workouts: ['v', 'current', 'prefs']};
  const TOMBSTONE_DAYS = 60;
  const pathOf = (...parts) => JSON.stringify(parts);
  const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // The items of a store. An added course's module marks are items of their own, so two devices ticking two modules
  // of one course both keep their tick.
  function itemsOf(store, data){
    const items = new Map();
    if (store === 'settings') { items.set(pathOf('s'), data); return items; }
    data = data || {};   // a store never saved yet
    Object.entries(SYNC_LISTS[store]).forEach(([field, kind]) => (data[field] || []).forEach(x => {
      if (kind !== 'k') { items.set(pathOf(kind, x.id), x); return; }
      const course = Object.assign({}, x);
      delete course.done;
      items.set(pathOf('k', x.id), course);
      Object.entries(x.done || {}).forEach(([key, on]) => items.set(pathOf('kd', x.id, key), on));
    }));
    SYNC_SINGLES[store].forEach(f => { if (data[f] !== undefined) items.set(pathOf('s', f), data[f]); });
    if (store === 'progress') {
      Object.entries(data.checks || {}).forEach(([day, marks]) => Object.entries(marks).forEach(([key, mark]) => items.set(pathOf('c', day, key), mark)));
      Object.entries(data.extras || {}).forEach(([day, list]) => list.forEach(x => items.set(pathOf('x', day, x.id), x)));
      Object.entries(data.modules || {}).forEach(([key, on]) => items.set(pathOf('m', key), on));
    }
    return items;
  }
  // Whether two versions of a store hold the same items, whatever the order of their keys.
  function sameStore(store, a, b){
    const x = itemsOf(store, a), y = itemsOf(store, b);
    return x.size === y.size && [...x].every(([p, v]) => y.has(p) && sameValue(v, y.get(p)));
  }
  // The store back from its items, in the items' order.
  function fromItems(store, items){
    if (store === 'settings') return items.get(pathOf('s'));
    const data = {};
    Object.keys(SYNC_LISTS[store]).forEach(f => { data[f] = []; });
    if (store === 'progress') Object.assign(data, {checks: {}, extras: {}, modules: {}});
    const fields = Object.fromEntries(Object.entries(SYNC_LISTS[store]).map(([f, k]) => [k, f]));
    const courses = {};
    items.forEach((value, path) => {
      const [kind, a, b] = JSON.parse(path);
      if (kind === 's') data[a] = value;
      else if (kind === 'c') (data.checks[a] = data.checks[a] || {})[b] = value;
      else if (kind === 'x') (data.extras[a] = data.extras[a] || []).push(value);
      else if (kind === 'm') data.modules[a] = value;
      else if (kind === 'kd') (courses[a] = courses[a] || {})[b] = value;
      else data[fields[kind]].push(kind === 'k' ? Object.assign({}, value, {done: {}}) : value);
    });
    (data.courses || []).forEach(c => { c.done = courses[c.id] || {}; });
    return data;
  }

  // The time for a new stamp: the clock, but never at or before a stamp already seen, so a device whose clock is
  // behind still writes after what it has read.
  const latestTime = stamps => Object.values(stamps).reduce((t, s) => Math.max(t, s[0]), 0);
  const stampTime = (stamps, now) => Math.max(now, latestTime(stamps) + 1);
  // Stamps for what changed between two versions of a store on this device.
  function stampChanges(store, before, after, stamps, now, device){
    const was = itemsOf(store, before), is = itemsOf(store, after), out = Object.assign({}, stamps), t = stampTime(stamps, now);
    new Set([...was.keys(), ...is.keys()]).forEach(p => {
      if (!sameValue(was.get(p), is.get(p))) out[p] = [t, device, is.has(p) ? 0 : 1];
    });
    return out;
  }
  // Which stamp wins: the later time, then the larger device id; an item with no stamp yet counts as time 0.
  const beats = (x, y) => !y || (!!x && (x[0] !== y[0] ? x[0] > y[0] : x[1] > y[1]));

  // Merges the remote copy into the local one: {data, stamps, lost}, where lost lists the paths whose local value gave
  // way to the remote one, for the device to keep in a snapshot first.
  function mergeStore(store, local, remote){
    const li = itemsOf(store, local.data), ri = itemsOf(store, remote.data);
    const stampOf = (side, items, p) => side.stamps[p] || (items.has(p) ? [0, '', 0] : null);
    const merged = new Map(), stamps = {}, lost = [];
    const paths = [...new Set([...li.keys(), ...Object.keys(local.stamps), ...ri.keys(), ...Object.keys(remote.stamps)])];
    paths.forEach(p => {
      const ls = stampOf(local, li, p), rs = stampOf(remote, ri, p), useRemote = beats(rs, ls) && !sameValue(rs, ls);
      const s = useRemote ? rs : ls, items = useRemote ? ri : li;
      stamps[p] = s;
      if (!s[2] && items.has(p)) merged.set(p, items.get(p));
      if (useRemote && li.has(p) && !sameValue(li.get(p), merged.get(p))) lost.push(p);
    });
    return {data: fromItems(store, merged), stamps, lost};
  }
  // Tombstones older than TOMBSTONE_DAYS go; every live item keeps its stamp.
  function dropOldTombstones(stamps, now){
    const out = {}, limit = now - TOMBSTONE_DAYS * 864e5;
    Object.entries(stamps).forEach(([p, s]) => { if (!s[2] || s[0] >= limit) out[p] = s; });
    return out;
  }
  // end of sync rules
