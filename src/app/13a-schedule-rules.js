  // start of schedule rules
  /* ---------------- schedule rules (pure; tools/check-schedule.js runs this block) ---------------- */
  // The editor and the guide change a draft: a copy of the settings. Each function returns a new draft (or a refusal)
  // and keeps every field and day it does not touch exactly as it was. A block is the settings' array
  // [start, kind, title, detail, subject, anchor]. Days with two versions ({A, B}) are never changed here.
  // No storage, page or network.
  const SCHEDULE_DAYS = ['0', '1', '2', '3', '4', '5', '6'];
  const clone = v => JSON.parse(JSON.stringify(v));
  // Minutes of "HH:MM"; after midnight the day goes on as 24:00–24:59.
  const startMin = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const draftOf = settings => clone(settings);
  const isTwoVersionDay = (draft, day) => !!(draft.week[day] && draft.week[day].blocks && !Array.isArray(draft.week[day].blocks));

  const fieldsOf = b => ({start: b[0], kind: b[1], title: b[2], detail: b[3] || '', subject: b[4] || '', anchor: b[5] || null});
  function blockOf(f){
    const b = [f.start, f.kind, f.title];
    if (f.detail || f.subject || f.anchor) b.push(f.detail || '');
    if (f.subject || f.anchor) b.push(f.subject || '');
    if (f.anchor) b.push(f.anchor);
    return b;
  }
  // The day's one-version block list, or null for a missing or two-version day.
  const blocksOf = (draft, day) => (draft.week[day] && Array.isArray(draft.week[day].blocks) ? draft.week[day].blocks : null);
  function withBlocks(draft, day, blocks){
    if (new Set(blocks.map(b => b[0])).size !== blocks.length) return {ok: false, code: 'same-start'};
    const d = clone(draft);
    d.week[day] = Object.assign({}, d.week[day] || {}, {blocks: clone(blocks).sort((p, q) => startMin(p[0]) - startMin(q[0]))});
    return {ok: true, draft: d};
  }
  function setBlock(draft, day, i, fields){
    const list = blocksOf(draft, day);
    if (!list || !list[i]) return {ok: false, code: 'no-block'};
    const before = list[i][0], next = blockOf(Object.assign(fieldsOf(list[i]), fields));
    // an anchor elsewhere on the day that names this block to take its shift follows the new start
    const blocks = list.map((b, k) => k === i ? next : (b[5] && b[5].absorb === before ? b.slice(0, 5).concat(Object.assign({}, b[5], {absorb: next[0]})) : b));
    return withBlocks(draft, day, blocks);
  }
  function addBlock(draft, day, fields){
    if (isTwoVersionDay(draft, day)) return {ok: false, code: 'two-versions'};
    return withBlocks(draft, day, (blocksOf(draft, day) || []).concat([blockOf(fields)]));
  }
  // A day keeps at least one block, as the settings require.
  function removeBlock(draft, day, i){
    const list = blocksOf(draft, day);
    if (!list || !list[i]) return {ok: false, code: 'no-block'};
    if (list.length === 1) return {ok: false, code: 'last-block'};
    return withBlocks(draft, day, list.filter((_, k) => k !== i));
  }
  // The blocks of one day onto other days; two-version days are skipped and reported. Each day keeps its note.
  function copyDay(draft, from, toDays){
    const list = blocksOf(draft, from);
    if (!list) return {ok: false, code: 'two-versions'};
    const skipped = toDays.filter(t => isTwoVersionDay(draft, t));
    let d = draft;
    toDays.filter(t => t !== from && !skipped.includes(t)).forEach(t => { d = withBlocks(d, t, list).draft; });
    return {ok: true, draft: d === draft ? clone(draft) : d, skipped};
  }
  // anchor is {prayer, dir, min}, or null to untie. An absorb the block already had stays while it stays tied.
  function setAnchor(draft, day, i, anchor){
    const list = blocksOf(draft, day);
    if (!list || !list[i]) return {ok: false, code: 'no-block'};
    const old = fieldsOf(list[i]).anchor;
    const next = anchor ? Object.assign({prayer: anchor.prayer, dir: anchor.dir, min: anchor.min}, old && old.absorb ? {absorb: old.absorb} : {}) : null;
    return withBlocks(draft, day, list.map((b, k) => k === i ? blockOf(Object.assign(fieldsOf(b), {anchor: next})) : b));
  }

  // A kind keeps its id; only these fields change.
  const KIND_FIELDS = ['label', 'long', 'track', 'postpone', 'free', 'color', 'side'];
  function setKind(draft, id, fields){
    const d = clone(draft);
    d.categories = d.categories || {};
    const k = Object.assign({}, d.categories[id] || {});
    KIND_FIELDS.forEach(f => { if (f in fields) k[f] = fields[f]; });
    d.categories[id] = k;
    return d;
  }
  // Kinds the user adds (feature 016): ids k1 … k12, given in order. The built-in kinds are never removed.
  const KIND_LIMIT = 12;
  function addKind(draft, fields){
    const cats = draft.categories || {};
    const same = Object.keys(cats).find(k => cats[k] && cats[k].label === fields.label);
    if (same) return {ok: false, code: 'same-name', id: same};
    let n = 1; while (('k' + n) in cats) n++;
    if (n > KIND_LIMIT) return {ok: false, code: 'full'};
    return {ok: true, draft: setKind(draft, 'k' + n, fields), id: 'k' + n};
  }
  // The days whose blocks use a kind, in either version of a two-version day.
  function kindUses(draft, id){
    return SCHEDULE_DAYS.filter(day => {
      const blocks = draft.week[day] && draft.week[day].blocks;
      return !!blocks && (Array.isArray(blocks) ? [blocks] : Object.values(blocks)).some(list => list.some(b => b[1] === id));
    });
  }
  function removeKind(draft, id){
    if (!/^k\d+$/.test(id)) return {ok: false, code: 'built-in'};
    const days = kindUses(draft, id);
    if (days.length) return {ok: false, code: 'used', days};
    const d = clone(draft);
    delete d.categories[id];
    return {ok: true, draft: d};
  }
  // Subjects: ids S1, S2 … are given in order; a name is what the user sees.
  function addSubject(draft, name){
    const d = clone(draft), subs = d.subjects = d.subjects || {};
    let n = 1; while (('S' + n) in subs) n++;
    subs['S' + n] = name;
    return {draft: d, id: 'S' + n};
  }
  function renameSubject(draft, id, name){
    const d = clone(draft);
    if (d.subjects && id in d.subjects) d.subjects[id] = name;
    return d;
  }
  // Every block that uses a subject, on every day and version: [{day, version, i}].
  function subjectUses(draft, id){
    const uses = [];
    SCHEDULE_DAYS.forEach(day => {
      const blocks = draft.week[day] && draft.week[day].blocks;
      if (!blocks) return;
      const versions = Array.isArray(blocks) ? {'': blocks} : blocks;
      Object.keys(versions).forEach(v => versions[v].forEach((b, i) => { if (b[4] === id) uses.push({day, version: v, i}); }));
    });
    return uses;
  }
  function removeSubject(draft, id){
    const uses = subjectUses(draft, id);
    if (uses.length) return {ok: false, code: 'in-use', uses};
    const d = clone(draft);
    if (d.subjects) delete d.subjects[id];
    return {ok: true, draft: d};
  }

  // A new place for the whole schedule; nothing else changes.
  const setPlace = (draft, place) => Object.assign(clone(draft), {location: clone(place.location), timezone: place.timezone, prayerMethod: place.prayerMethod});
  // The usual prayer method of a city's country; everywhere else, the Muslim World League.
  const COUNTRY_METHOD = {EG: 'Egyptian', SD: 'Egyptian', LY: 'Egyptian', SA: 'UmmAlQura', YE: 'UmmAlQura', AE: 'Dubai', OM: 'Dubai',
    KW: 'Kuwait', QA: 'Qatar', BH: 'Qatar', PK: 'Karachi', BD: 'Karachi', AF: 'Karachi', TR: 'Turkey', IR: 'Tehran',
    MY: 'Singapore', ID: 'Singapore', BN: 'Singapore'};
  const methodFor = cc => COUNTRY_METHOD[cc] || 'MuslimWorldLeague';
  // A city from the list: {ar, en, cc, lat, lng, tz}.
  const placeOf = city => ({location: {lat: city.lat, lng: city.lng, label: city.ar || city.en}, timezone: city.tz, prayerMethod: methodFor(city.cc)});
  // The nearest listed city (for a device location): great-circle distance, in km.
  function nearestCity(cities, lat, lng){
    const rad = x => x * Math.PI / 180;
    let best = null, bestKm = Infinity;
    cities.forEach(c => {
      const a = Math.sin(rad(c.lat - lat) / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(c.lat)) * Math.sin(rad(c.lng - lng) / 2) ** 2;
      const km = 12742 * Math.asin(Math.min(1, Math.sqrt(a)));
      if (km < bestKm) { best = c; bestKm = km; }
    });
    return best ? {city: best, km: bestKm} : null;
  }

  // Generic starting weeks for the guide. Sunday to Thursday are workdays, Friday and Saturday the weekend.
  const WEEK_TEMPLATES = {
    student: {
      workday: [['07:30', 'rest', 'صحيان وفطار'], ['08:30', 'move', 'مواصلات'], ['09:00', 'uni', 'محاضرات'], ['13:00', 'rest', 'غدا وراحة'],
        ['14:00', 'study', 'مذاكرة'], ['16:00', 'personal', 'وقتك'], ['19:00', 'study', 'مراجعة'], ['21:00', 'personal', 'وقتك']],
      weekend: [['09:00', 'rest', 'صحيان وفطار'], ['10:00', 'study', 'مذاكرة'], ['12:00', 'personal', 'وقتك'], ['17:00', 'study', 'مراجعة الأسبوع'], ['19:00', 'personal', 'وقتك']]
    },
    'student-work': {
      workday: [['07:30', 'rest', 'صحيان وفطار'], ['08:30', 'uni', 'محاضرات'], ['12:30', 'rest', 'غدا'], ['13:30', 'work', 'شغل'],
        ['18:00', 'rest', 'راحة وعشا'], ['19:00', 'study', 'مذاكرة'], ['21:00', 'personal', 'وقتك']],
      weekend: [['09:00', 'rest', 'صحيان وفطار'], ['10:00', 'study', 'مذاكرة'], ['13:00', 'rest', 'غدا وراحة'], ['14:00', 'study', 'مراجعة الأسبوع'], ['17:00', 'personal', 'وقتك']]
    },
    empty: {workday: [['07:00', 'personal', 'وقتك']], weekend: [['07:00', 'personal', 'وقتك']]}
  };
  function weekFromTemplate(id){
    const t = WEEK_TEMPLATES[id] || WEEK_TEMPLATES.empty, week = {};
    SCHEDULE_DAYS.forEach(day => { week[day] = {blocks: clone(day === '5' || day === '6' ? t.weekend : t.workday)}; });
    return week;
  }
  // A whole settings object for the guide. categories are the app's default kinds.
  function newSettings(place, templateId, subjectNames, categories){
    const subjects = {};
    subjectNames.filter(Boolean).forEach((name, i) => { subjects['S' + (i + 1)] = name; });
    return {format: 'mizan-settings', version: 1, name: 'جدولي', language: 'ar', timezone: place.timezone, location: clone(place.location),
      prayerMethod: place.prayerMethod, categories: clone(categories), subjects, week: weekFromTemplate(templateId)};
  }

  // The day's start and end (feature 018). The app's default, 07:00 to 01:00, is stored as no `day`, so a file that
  // never changes it stays as it was. Blocks never move: the save's check names any block outside the day.
  function setDayBounds(draft, start, end){
    const d = clone(draft);
    if (start === '07:00' && end === '01:00') delete d.day; else d.day = {start, end};
    return d;
  }

  // What a save changes, for its summary: per day the blocks added and removed, the kinds changed, and whether the
  // subjects or the place changed.
  function changesBetween(before, after){
    const key = b => JSON.stringify(b);
    const days = SCHEDULE_DAYS.map(day => {
      const a = (before.week[day] || {}).blocks, b = (after.week[day] || {}).blocks;
      if (key(a) === key(b)) return null;
      const was = new Set((Array.isArray(a) ? a : []).map(key)), now = new Set((Array.isArray(b) ? b : []).map(key));
      return {day, added: [...now].filter(x => !was.has(x)).length, removed: [...was].filter(x => !now.has(x)).length};
    }).filter(Boolean);
    const kinds = Object.keys(Object.assign({}, before.categories, after.categories)).filter(k => key((before.categories || {})[k]) !== key((after.categories || {})[k]));
    return {days, kinds, subjects: key(before.subjects || {}) !== key(after.subjects || {}),
      place: key([before.location, before.timezone, before.prayerMethod]) !== key([after.location, after.timezone, after.prayerMethod]),
      day: key(before.day || null) !== key(after.day || null)};
  }
  // The day a clock moment belongs to (feature 018): until the end of a day that runs past midnight, it is still the
  // day before, at min + 1440.
  function dayAt(iso, min, end, addDays){
    return min < end - 1440 ? {iso: addDays(iso, -1), min: min + 1440} : {iso, min};
  }
  // end of schedule rules
