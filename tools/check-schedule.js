#!/usr/bin/env node
/*
 * Dev-only check for the schedule rules (feature 014; not shipped with the app).
 *
 *   node tools/check-schedule.js              run the checks against the joined app source
 *   node tools/check-schedule.js --self-test  break the rules on purpose and check that this script notices
 *
 * It runs the app's own code: the "schedule rules" block and validateSettings. Drafts are the embedded example with
 * an unknown field, a day note and a two-version day added, then changed by random sequences of operations; whatever
 * an operation does not touch must come back byte for byte. Output is check names only.
 *
 * Exit codes: 0 all checks pass, 1 a check failed, 2 usage or I/O error.
 */
const html = require('./lib/source.js').readSource();

function block(source) {
  const a = source.indexOf('// start of schedule rules'), b = source.indexOf('// end of schedule rules');
  if (a < 0 || b < a) throw new Error('schedule rules block not found');
  return source.slice(a, b);
}
function grabFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  let depth = 0;
  for (let j = source.indexOf('{', start); j < source.length; j++) {
    if (source[j] === '{') depth++;
    else if (source[j] === '}' && --depth === 0) return source.slice(start, j + 1);
  }
  throw new Error(name + ' not found');
}
const NAMES = 'SCHEDULE_DAYS, setPlace, draftOf, isTwoVersionDay, setBlock, addBlock, removeBlock, copyDay, setAnchor, setKind, addKind, kindUses, removeKind, addSubject, renameSubject, subjectUses, removeSubject, methodFor, placeOf, nearestCity, WEEK_TEMPLATES, weekFromTemplate, newSettings, changesBetween, dayAt';
const load = source => new Function(grabFunction(source, 'dayBounds') + grabFunction(source, 'validateSettings') + block(source) + '\nreturn {dayBounds, validateSettings, ' + NAMES + '};')();

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const freeze = o => { if (o && typeof o === 'object') { Object.values(o).forEach(freeze); Object.freeze(o); } return o; };
const example = JSON.parse(html.match(/<script type="application\/json" id="example-settings">([\s\S]*?)<\/script>/)[1]);
const KINDS = {uni: {label: 'محاضرات'}, study: {label: 'مذاكرة'}, course: {label: 'كورس'}, work: {label: 'شغل'}, gym: {label: 'رياضة'},
  quran: {label: 'ورد'}, personal: {label: 'وقتك'}, move: {label: 'مواصلات'}, rest: {label: 'راحة'}};
// The example plus what the editor must never lose: an unknown field, a day note, and a second two-version day
// (the example's Monday already has two versions).
function base() {
  const s = JSON.parse(JSON.stringify(example));
  s.extraThing = {kept: [1, 2, 3]};
  s.week['2'].note = 'a note that stays';
  s.week['3'] = {blocks: {A: s.week['3'].blocks, B: s.week['3'].blocks.slice(0, 3)}};
  return s;
}
const ONE_VERSION = ['0', '2', '4', '5', '6'];
const hm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');

// WCAG contrast of two #RRGGBB colours, and a colour mixed over another (CSS color-mix in srgb).
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const over = (ink, paper, p) => ink.map((v, i) => Math.round(v * p + paper[i] * (1 - p)));
const tokens = (css, sel) => { const i = css.indexOf(sel + '{'), t = {}; if (i >= 0) css.slice(i, css.indexOf('}', i)).replace(/--([\w-]+):\s*([^;]+);/g, (_, k, v) => { t[k] = v.trim(); }); return t; };
const KIND_COLORS = ['teal', 'blue', 'green', 'slate', 'copper', 'olive'];

// Every block list of a draft: one per one-version day, and A and B of a two-version day.
const SCHEDULE_ALL = d => Object.values(d.week).flatMap(w => !w.blocks ? [] : Array.isArray(w.blocks) ? [w.blocks] : Object.values(w.blocks));
function runChecks(h, source) {
  const results = [];
  const check = (name, fn) => { let ok = false; try { ok = !!fn(); } catch (e) { ok = false; } results.push([name, ok]); };
  const valid = d => h.validateSettings(JSON.parse(JSON.stringify(d))).ok;

  check('300 random edit sequences keep unknown fields, notes and two-version days, and days stay sorted and non-empty', () => {
    let seed = 1401; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    for (let k = 0; k < 300; k++) {
      const start = freeze(base());
      let d = h.draftOf(start);
      for (let s = 0; s < 1 + rnd(6); s++) {
        const day = ONE_VERSION[rnd(ONE_VERSION.length)], list = d.week[day].blocks, i = rnd(list.length), op = rnd(5);
        let r;
        if (op === 0) r = h.setBlock(d, day, i, {title: 'edited ' + s});
        else if (op === 1) r = h.addBlock(d, day, {start: hm(420 + 5 * rnd(200)), kind: 'study', title: 'new ' + s});
        else if (op === 2) r = h.removeBlock(d, day, i);
        else if (op === 3) r = h.copyDay(d, day, ['0', '3', '6']);
        else r = h.setBlock(d, day, i, {start: hm(420 + 5 * rnd(200))});
        if (r.ok) d = r.draft;
      }
      if (!eq(d.extraThing, start.extraThing) || !eq(d.week['1'], start.week['1']) || !eq(d.week['3'], start.week['3'])) return false;
      if (d.week['2'].note !== start.week['2'].note || d.week['0'].note !== start.week['0'].note) return false;
      if (!eq(d.course, start.course) || !eq(d.rules, start.rules) || !eq(d.taskTags, start.taskTags) || !eq(d.location, start.location)) return false;
      for (const day of ONE_VERSION) {
        const mins = d.week[day].blocks.map(b => Number(b[0].slice(0, 2)) * 60 + Number(b[0].slice(3)));
        if (mins.some((m, j) => j && m <= mins[j - 1]) || !d.week[day].blocks.length) return false;
      }
    }
    return true;
  });
  check('copying a day changes only the days it was copied to, and skips two-version days', () => {
    const s = freeze(base()), r = h.copyDay(s, '0', ['2', '3']);
    return r.ok && eq(r.skipped, ['3']) && eq(r.draft.week['2'].blocks, s.week['0'].blocks) && eq(r.draft.week['3'], s.week['3'])
      && ['1', '4', '5', '6'].every(d => eq(r.draft.week[d], s.week[d])) && h.copyDay(s, '3', ['0']).code === 'two-versions';
  });
  check('a second block at the same start, an empty day and a two-version day are refused', () => {
    const s = freeze(base()), first = s.week['0'].blocks[0];
    const one = h.weekFromTemplate('empty');
    return h.addBlock(s, '0', {start: first[0], kind: 'rest', title: 'x'}).code === 'same-start'
      && h.removeBlock(Object.assign({}, s, {week: one}), '0', 0).code === 'last-block'
      && h.addBlock(s, '3', {start: '23:00', kind: 'rest', title: 'x'}).code === 'two-versions';
  });
  check('a prayer tie keeps its absorb, follows a moved block, and goes away cleanly', () => {
    const s = base();
    s.week['0'].blocks = [['07:30', 'rest', 'a'], ['18:00', 'gym', 'b', '', '', {prayer: 'maghrib', dir: 'before', min: 30, absorb: '20:00'}], ['20:00', 'work', 'c'], ['22:00', 'personal', 'd']];
    freeze(s);
    const tied = h.setAnchor(s, '0', 1, {prayer: 'isha', dir: 'after', min: 10}).draft;
    const moved = h.setBlock(s, '0', 2, {start: '20:30'}).draft;
    const untied = h.setAnchor(s, '0', 1, null).draft;
    return eq(tied.week['0'].blocks[1][5], {prayer: 'isha', dir: 'after', min: 10, absorb: '20:00'})
      && moved.week['0'].blocks[1][5].absorb === '20:30' && valid(moved)
      && untied.week['0'].blocks[1].length === 3 && valid(untied);
  });
  check('a kind keeps its id when renamed, and other kinds stay', () => {
    const s = freeze(base()), d = h.setKind(s, 'study', {label: 'مذاكرة جامدة', postpone: false});
    return eq(Object.keys(d.categories).sort(), Object.keys(s.categories).sort()) && d.categories.study.label === 'مذاكرة جامدة'
      && d.categories.study.postpone === false && Object.keys(s.categories).filter(k => k !== 'study').every(k => eq(d.categories[k], s.categories[k])) && valid(d);
  });
  check('a subject in use cannot be removed; a new one gets the next id and can be renamed and removed', () => {
    const s = freeze(base());
    const used = Object.keys(s.subjects).find(id => h.subjectUses(s, id).length);
    const added = h.addSubject(s, 'فيزيا'), renamed = h.renameSubject(added.draft, added.id, 'فيزيا 2');
    return used && h.removeSubject(s, used).code === 'in-use' && !(added.id in s.subjects) && renamed.subjects[added.id] === 'فيزيا 2'
      && h.removeSubject(renamed, added.id).ok && !(added.id in h.removeSubject(renamed, added.id).draft.subjects);
  });
  check('every template, with or without subjects, makes valid settings', () => {
    const place = h.placeOf({ar: 'القاهرة', en: 'Cairo', cc: 'EG', lat: 30.0444, lng: 31.2357, tz: 'Africa/Cairo'});
    return place.prayerMethod === 'Egyptian' && Object.keys(h.WEEK_TEMPLATES).every(t =>
      valid(h.newSettings(place, t, [], KINDS)) && valid(h.newSettings(place, t, ['رياضة 1', 'فيزيا'], KINDS)));
  });
  check('a schedule written out and read back gives the same week', () => {
    let d = h.draftOf(base());
    d = h.setAnchor(d, '2', 2, {prayer: 'asr', dir: 'after', min: 15}).draft;
    const once = h.validateSettings(JSON.parse(JSON.stringify(d))), twice = h.validateSettings(JSON.parse(JSON.stringify(once.settings)));
    return once.ok && twice.ok && eq(once.settings.week, d.week) && eq(twice.settings, once.settings);
  });
  check('a new place changes only the place', () => {
    const s = freeze(base()), place = {location: {lat: 21.4, lng: 39.8, label: 'x'}, timezone: 'Asia/Riyadh', prayerMethod: 'UmmAlQura'};
    const d = h.setPlace(s, place), c = h.changesBetween(s, d);
    return c.place && !c.days.length && !c.kinds.length && !c.subjects && eq(Object.assign({}, d, {location: s.location, timezone: s.timezone, prayerMethod: s.prayerMethod}), s);
  });
  check('places and nearest cities', () => {
    const cities = [{ar: 'أ', en: 'A', cc: 'SA', lat: 21.4, lng: 39.8, tz: 'Asia/Riyadh'}, {ar: 'ب', en: 'B', cc: 'XX', lat: 33.5, lng: 36.3, tz: 'Asia/Damascus'}];
    const n = h.nearestCity(cities, 33.4, 36.2);
    return h.methodFor('XX') === 'MuslimWorldLeague' && h.placeOf(cities[0]).prayerMethod === 'UmmAlQura' && n.city.en === 'B' && n.km < 20;
  });
  check('the change summary counts added and removed blocks, kinds, subjects and place', () => {
    const s = base();
    const d1 = h.addBlock(s, '0', {start: '24:30', kind: 'rest', title: 'نوم'}).draft;
    const c = h.changesBetween(s, h.addSubject(h.setKind(d1, 'gym', {label: 'جيم'}), 'x').draft);
    return eq(c.days, [{day: '0', added: 1, removed: 0}]) && eq(c.kinds, ['gym']) && c.subjects && !c.place
      && eq(h.changesBetween(s, s), {days: [], kinds: [], subjects: false, place: false});
  });
  check('the city list: under 100 KB, all 57 OIC states, valid coordinates and time zones', () => {
    const file = require('path').join(__dirname, 'vendor', 'cities', 'cities.json');
    const text = require('fs').readFileSync(file, 'utf8'), cities = JSON.parse(text);
    const zoneOk = tz => { try { new Intl.DateTimeFormat('en', {timeZone: tz}); return true; } catch (e) { return false; } };
    return Buffer.byteLength(text) < 100 * 1024 && new Set(cities.map(c => c.cc)).size === 57 && cities.length > 100
      && cities.every(c => typeof c.ar === 'string' && c.ar && typeof c.en === 'string' && c.en && /^[A-Z]{2}$/.test(c.cc)
        && Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180 && zoneOk(c.tz));
  });
  check('added kinds: ids in order up to k12, a taken name refused, colour and side kept', () => {
    let d = h.draftOf(base()), ids = [];
    for (let n = 1; n <= 12; n++) { const r = h.addKind(d, {label: 'Kind ' + n, color: 'teal', track: true}); if (!r.ok) return false; d = r.draft; ids.push(r.id); }
    const gap = h.removeKind(d, 'k3').draft, again = h.addKind(gap, {label: 'Again', color: 'blue', side: 'a'});
    const named = h.addKind(h.draftOf(base()), {label: base().categories.work.label, color: 'teal'});
    const side = h.setKind(d, 'k2', {color: 'olive', side: 'b'}).categories.k2;
    return ids.join() === 'k1,k2,k3,k4,k5,k6,k7,k8,k9,k10,k11,k12' && h.addKind(d, {label: 'Thirteen', color: 'teal'}).code === 'full'
      && again.id === 'k3' && eq(again.draft.categories.k3, {label: 'Again', color: 'blue', side: 'a'})
      && named.code === 'same-name' && named.id === 'work' && side.color === 'olive' && side.side === 'b' && valid(d);
  });
  check('removing kinds: a built-in never, a used one names its days (both versions), an unused one goes', () => {
    let d = h.addKind(h.draftOf(base()), {label: 'Teaching', color: 'teal'}).draft;
    const b3 = d.week['3'].blocks.B; b3[1] = ['22:00', 'k1', 'Only on B'];
    const used = h.removeKind(d, 'k1');
    d.week['3'].blocks.B = b3.filter(b => b[1] !== 'k1');
    const gone = h.removeKind(d, 'k1');
    return h.removeKind(d, 'work').code === 'built-in' && used.code === 'used' && eq(used.days, ['3'])
      && gone.ok && !('k1' in gone.draft.categories) && valid(gone.draft);
  });
  check('a kind can be removed exactly when no block of any day or version uses it, on 300 random drafts', () => {
    let seed = 1601; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    for (let k = 0; k < 300; k++) {
      let d = h.draftOf(base());
      const n = 1 + rnd(4);
      for (let i = 1; i <= n; i++) d = h.addKind(d, {label: 'K' + i + '-' + k, color: 'slate'}).draft;
      SCHEDULE_ALL(d).forEach(list => list.forEach(b => { if (rnd(5) === 0) b[1] = 'k' + (1 + rnd(n)); }));
      for (let i = 1; i <= n; i++) {
        const id = 'k' + i, usedBy = Object.keys(d.week).filter(day => SCHEDULE_ALL({week: {[day]: d.week[day]}}).some(list => list.some(b => b[1] === id)));
        const r = h.removeKind(d, id);
        if (r.ok !== !usedBy.length || (!r.ok && !eq(r.days, usedBy.sort()))) return false;
      }
    }
    return true;
  });
  check('day bounds: the default, every edge, just past every edge, and the 24-hour limit', () => {
    const b = (start, end) => h.dayBounds({start, end});
    return eq(h.dayBounds(undefined), {start: 420, end: 1500}) && b('07:00', '01:00') && eq(b('07:00', '01:00'), {start: 420, end: 1500})
      && eq(b('03:00', '20:00'), {start: 180, end: 1200}) && eq(b('12:00', '05:00'), {start: 720, end: 1740})
      && eq(b('04:30', '23:59'), {start: 270, end: 1439}) && eq(b('04:30', '00:00'), {start: 270, end: 1440})
      && eq(b('05:00', '05:00'), {start: 300, end: 1740}) && b('03:00', '03:00') !== null
      && [['02:59', '01:00'], ['12:01', '01:00'], ['07:00', '05:01'], ['07:00', '19:59'], ['03:00', '05:00'], ['04:59', '05:00'],
        ['7:00', '01:00'], ['07:00', '24:00'], ['07:00', ''], [7, 1]].every(([s, e]) => b(s, e) === null)
      && [null, 'x', {}, {start: '07:00'}].every(d => h.dayBounds(d) === null);
  });
  check('day bounds equal an independent count over every start and end on a 15-minute grid', () => {
    const hm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    for (let s = 0; s < 1440; s += 15) for (let e = 0; e < 1440; e += 15) {
      const end = e <= 300 ? e + 1440 : e;
      const want = s >= 180 && s <= 720 && (e <= 300 || e >= 1200) && end - s <= 1440 ? {start: s, end} : null;
      if (!eq(h.dayBounds({start: hm(s), end: hm(e)}), want)) return false;
    }
    return true;
  });
  check('blocks outside the day are refused, at their start, in either version; a bad day names its field', () => {
    const withDay = (day, edit) => { const d = base(); if (day) d.day = day; edit(d.week); return h.validateSettings(d).errors; };
    const at = (errs, path) => errs.some(e => e.path === path && (!/^week\./.test(path) || e.detail === 'start is outside the day'));
    const first = w => w['4'].blocks;
    return withDay(null, () => {}).length === 0
      && at(withDay({start: '07:00', end: '01:00'}, w => { first(w)[0][0] = '06:30'; }), 'week.4.blocks[0].start')
      && at(withDay(null, w => { first(w)[0][0] = '06:30'; }), 'week.4.blocks[0].start')
      && at(withDay({start: '07:00', end: '23:00'}, w => { first(w).push(['23:00', 'rest', 'Late']); }), 'week.4.blocks[' + first(base().week).length + '].start')
      && at(withDay({start: '07:00', end: '23:00'}, w => { w['3'].blocks.B.push(['24:30', 'rest', 'Late']); }), 'week.3.blocks.B[' + base().week['3'].blocks.B.length + '].start')
      && withDay({start: '07:00', end: '03:00'}, w => { first(w).push(['26:30', 'rest', 'Late']); }).length === 0
      && withDay({start: '04:30', end: '01:00'}, w => { first(w).unshift(['04:30', 'study', 'Early']); }).length === 0
      && at(withDay({start: '02:00', end: '01:00'}, () => {}), 'day.start') && at(withDay({start: '07:00', end: '06:00'}, () => {}), 'day.end')
      && at(withDay({start: '03:00', end: '05:00'}, () => {}), 'day') && at(withDay('soon', () => {}), 'day');
  });
  check('the date at night: every minute from 00:00 to 06:00, for every end from 20:00 to 05:00, as a clock reads it', () => {
    const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
    for (let e = 1200; e <= 1740; e += 15) for (let m = 0; m <= 360; m++) {
      // the oracle: the day that started before midnight lasts until its end, read on the clock of the next morning
      const stillYesterday = e > 1440 && m < e - 1440;
      const want = stillYesterday ? {iso: '2027-03-09', min: m + 1440} : {iso: '2027-03-10', min: m};
      if (!eq(h.dayAt('2027-03-10', m, e, addDays), want)) return false;
    }
    return eq(h.dayAt('2027-03-01', 30, 1500, addDays), {iso: '2027-02-28', min: 1470}) && eq(h.dayAt('2027-03-10', 60, 1500, addDays), {iso: '2027-03-10', min: 60});
  });
  check('added kinds: a valid file passes; a bad id, colour or side, a colour on a built-in, or a taken name is refused', () => {
    const withKinds = extra => { const d = base(); Object.assign(d.categories, extra); return d; };
    const field = (extra, path) => h.validateSettings(withKinds(extra)).errors.some(e => e.path === path);
    return valid(withKinds({k1: {label: 'Teaching', color: 'teal', side: 'b', track: true}, k12: {label: 'Family', color: 'olive'}}))
      && field({k13: {label: 'X', color: 'teal'}}, 'categories.k13') && field({x1: {label: 'X', color: 'teal'}}, 'categories.x1')
      && field({k1: {label: 'X'}}, 'categories.k1.color') && field({k1: {label: 'X', color: 'pink'}}, 'categories.k1.color')
      && field({k1: {label: 'X', color: 'teal', side: 'c'}}, 'categories.k1.side')
      && field({work: Object.assign({}, base().categories.work, {color: 'teal'})}, 'categories.work.color')
      && field({rest: Object.assign({}, base().categories.rest, {side: 'a'})}, 'categories.rest.side')
      && field({k1: {label: 'X', color: 'teal'}, k2: {label: 'X', color: 'blue'}}, 'categories.k2.label')
      && field({k1: {label: base().categories.study.label, color: 'teal'}}, 'categories.k1.label');
  });
  check('the ready colours hold AA contrast on paper and on their tint, in light and dark', () => {
    const light = tokens(source, ':root'), dark = tokens(source, ':root[data-theme="dark"]');
    return KIND_COLORS.every(c => [[light, '--surface', 0.09], [dark, '--surface', 0.15]].every(([t, paper, tint]) => {
      const ink = rgb(t['k-' + c]), bg = rgb(t[paper.slice(2)]);
      return contrast(ink, bg) >= 4.5 && contrast(ink, over(ink, bg, tint)) >= 4.5;
    }) && source.includes('.c-k-' + c + '{--c:var(--k-' + c + ')}'));
  });
  check('every colour class of a kind goes through kc', () => !/c-' \+ (b\.cat|main\.cat|cat|k)\b/.test(source));
  check('the schedule rules block never mentions storage, the page or the network', () => {
    const b = block(source).split('\n').map(l => l.replace(/\/\/[^\r\n]*/, '')).join('\n');
    return !/localStorage|indexedDB|document\.|window\.|fetch\(|navigator\./.test(b);
  });
  return results;
}

function report(results) {
  results.forEach(([n, ok]) => console.log((ok ? 'ok    ' : 'FAIL  ') + n));
  const failed = results.filter(r => !r[1]).length;
  console.log('\n' + (results.length - failed) + ' of ' + results.length + ' checks passed');
  return failed;
}

if (process.argv.includes('--self-test')) {
  const mutations = [
    ['copying a day writes every day', s => s.replace("toDays.filter(t => t !== from && !skipped.includes(t))", "SCHEDULE_DAYS.filter(t => t !== from && !skipped.includes(t))")],
    ['a renamed kind gets a new id', s => s.replace('    d.categories[id] = k;\n', "    d.categories[id + '2'] = k;\n")],
    ['a subject in use is removed', s => s.replace("if (uses.length) return {ok: false, code: 'in-use', uses};", '')],
    ['a day note is dropped', s => s.replace("d.week[day] = Object.assign({}, d.week[day] || {}, {blocks:", "d.week[day] = Object.assign({}, {blocks:")],
    ['a two-version day is rewritten', s => s.replace("const isTwoVersionDay = (draft, day) => !!(", "const isTwoVersionDay = (draft, day) => false && !!(")],
    ['an absorb is lost when the tie changes', s => s.replace("old && old.absorb ? {absorb: old.absorb} : {}", "{}")],
    ['an added kind needs no ready colour', s => s.replace("if (KIND_COLORS.indexOf(c.color) < 0) bad(", "if (false) bad(")],
    ['added kinds have no limit', s => s.replace("if (n > KIND_LIMIT) return {ok: false, code: 'full'};", '')],
    ['a used kind is removed', s => s.replace("if (days.length) return {ok: false, code: 'used', days};", '')],
    ['version B is not searched for a kind', s => s.replace("(Array.isArray(blocks) ? [blocks] : Object.values(blocks))", "(Array.isArray(blocks) ? [blocks] : [blocks.A])")],
    ['a built-in kind is removable', s => s.replace("if (!/^k\\d+$/.test(id)) return {ok: false, code: 'built-in'};", '')],
    ['a built-in kind takes a colour', s => s.replace("if (c.color !== undefined || c.side !== undefined) bad(", "if (false) bad(")],
    ['the day has no 24-hour limit', s => s.replace('return end - start <= 1440 ? {start, end} : null;', 'return end >= 0 ? {start, end} : null;')],
    ['a block outside the day is accepted', s => s.replace("else if (bounds && (t < bounds.start || t >= bounds.end)) bad(", "else if (false) bad(")],
    ['times stop at 24:59', s => s.replace('return h <= 28 && m <= 59 ? h * 60 + m : null;', 'return h <= 24 && m <= 59 ? h * 60 + m : null;')],
    ['the date turns at 01:00 whatever the end', s => s.replace('return min < end - 1440 ? {iso: addDays(iso, -1)', 'return min < 60 ? {iso: addDays(iso, -1)')]
  ];
  let missed = 0;
  mutations.forEach(([name, mutate]) => {
    const mutated = mutate(html);
    if (mutated === html) { console.log('FAIL  mutation did not apply: ' + name); missed++; return; }
    let results;
    try { results = runChecks(load(mutated), mutated); } catch (e) { results = [['load', false]]; }
    const noticed = results.some(r => !r[1]);
    console.log((noticed ? 'ok    ' : 'FAIL  ') + 'noticed: ' + name);
    if (!noticed) missed++;
  });
  const clean = runChecks(load(html), html).every(r => r[1]);
  console.log((clean ? 'ok    ' : 'FAIL  ') + 'the unmodified source passes');
  if (!clean) missed++;
  console.log('\n' + (missed ? missed + ' self-test case(s) failed' : 'all ' + (mutations.length + 1) + ' self-test cases passed'));
  process.exit(missed ? 1 : 0);
}

let results;
try { results = runChecks(load(html), html); } catch (e) { console.error(e.message); process.exit(2); }
process.exit(report(results) ? 1 : 0);
