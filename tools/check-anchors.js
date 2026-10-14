#!/usr/bin/env node
/*
 * Dev-only check for blocks tied to a prayer time (not shipped with the app).
 *
 *   node tools/check-anchors.js [--settings <file>] [--from 2026] [--to 2028] [--require-fit] [--matrix]
 *                                            run the checks, then a year sweep with the real prayer times
 *                                            (default file: settings.example.json; --require-fit also fails if any day falls back;
 *                                             --matrix also anchors one block to every prayer, both directions, 0 and 45 minutes)
 *   node tools/check-anchors.js --self-test  break the layout rule on purpose and check that this script notices
 *
 * It runs the app's own layoutDay (the block between "start of anchor layout" and "end of anchor layout" in
 * src/planner.html), so the app and this tool cannot disagree. It prints check names and counts only.
 *
 * Exit codes: 0 all checks pass, 1 a check failed, 2 usage or I/O error.
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'planner.html'), 'utf8');
const START_MARK = '// start of anchor layout', END_MARK = '// end of anchor layout';

function load(source) {
  const a = source.indexOf(START_MARK), b = source.indexOf(END_MARK);
  if (a < 0 || b < 0 || b < a) throw new Error('anchor layout block not found in src/planner.html');
  return new Function(source.slice(a, b) + '\nreturn layoutDay;')();
}

const START = 420, END = 1500;
const clone = x => JSON.parse(JSON.stringify(x));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const tm = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const anchor = (prayer, dir, min) => ({prayer, dir, min});

// A generic day: the exercise block (16:30) is tied to Maghrib; dinner, a course and free time follow it.
const day = a => [
  ['07:00', 'rest', 'Wake up'], ['08:00', 'study', 'Study'], ['14:30', 'study', 'Reading'],
  ['16:30', 'exercise', 'Workout', '', '', a], ['18:00', 'rest', 'Dinner'], ['19:00', 'course', 'Course'], ['21:00', 'personal', 'Free time']
];
const PM = {fajr: 300, dhuhr: 720, asr: 900, maghrib: 1080, isha: 1200};
const round5 = m => Math.round(m / 5) * 5;
const lengths = r => r.blocks.map(b => b.e - b.s);

// An independent layout written differently from the app: split the day into segments that each start at an
// anchor, give each block its new start and end from its fixed times, and decide fit from the changed lengths.
function oracleLayout(list, pm) {
  const fx = list.map(b => tm(b[0])), ends = fx.map((s, i) => i + 1 < fx.length ? fx[i + 1] : END);
  const fixedSpans = fx.map((s, i) => [s, ends[i]]);
  const anchors = list.map((b, i) => b[5] ? i : -1).filter(i => i >= 0);
  if (!anchors.length) return {notice: null, spans: fixedSpans};
  if (!pm || anchors.some(i => !Number.isFinite(pm[list[i][5].prayer]))) return {notice: 'unavailable', spans: fixedSpans};
  const shiftOf = new Array(list.length).fill(0);   // how much each block's start moves
  const mustCheck = new Set([list.length - 1]);
  anchors.forEach((ai, n) => {
    const an = list[ai][5];
    let m = round5(pm[an.prayer] + (an.dir === 'before' ? -an.min : an.min)); if (m < START) m += 1440;
    const d = m - fx[ai], next = n + 1 < anchors.length ? anchors[n + 1] : list.length;
    const named = an.absorb ? list.findIndex((x, k) => k > ai && x[0] === an.absorb && !x[5]) : -1;
    const lastMoved = named > ai && named < next ? named : next - 1;   // the shift reaches up to this block's start
    for (let k = ai; k <= lastMoved; k++) shiftOf[k] = d;
    mustCheck.add(ai - 1); if (named > ai) mustCheck.add(named);
  });
  const spans = fx.map((s, i) => [s + shiftOf[i], i + 1 < fx.length ? fx[i + 1] + shiftOf[i + 1] : END]);
  const ok = [...mustCheck].every(i => (spans[i][1] - spans[i][0]) >= Math.min(15, ends[i] - fx[i]));
  return ok ? {notice: null, spans} : {notice: 'nofit', spans: fixedSpans};
}

function runChecks(layoutDay) {
  const results = [];
  const check = (name, fn) => { let ok = false; try { ok = !!fn(); } catch (e) { ok = false; } results.push([name, ok]); };
  const lay = (list, pm) => layoutDay(clone(list), pm, START, END);
  const plainList = day(undefined).map(b => b.slice(0, 5));

  check('a day with no anchors is laid out as before, with no notice, for any prayer times', () => {
    return [PM, null, {}].every(pm => { const r = lay(plainList, pm); return r.notice === null && r.blocks.length === 7 && r.blocks[0].s === 420 && r.blocks[1].e === tm('14:30') && r.blocks[6].e === END; });
  });
  check('an anchored block starts at the prayer time minus or plus its minutes, rounded to 5', () => {
    return ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].every(p => ['before', 'after'].every(dir => [0, 30, 45, 180].every(min => {
      const pm = {fajr: 303, dhuhr: 722, asr: 903, maghrib: 1081, isha: 1202};
      const r = lay(day(anchor(p, dir, min)), pm);
      const want = round5(pm[p] + (dir === 'before' ? -min : min));
      const usable = want >= START && r.notice === null;
      return !usable || r.blocks[3].s === want;
    })));
  });
  check('when it fits, the first start and the last end do not move', () => {
    const r = lay(day(anchor('maghrib', 'before', 30)), PM);
    return r.notice === null && r.blocks[0].s === tm('07:00') && r.blocks[6].e === END;
  });
  check('everything after the anchored block shifts with it; the block before and the last one absorb', () => {
    const fixed = lay(plainList, PM), r = lay(day(anchor('maghrib', 'before', 30)), PM);
    const delta = 1080 - 30 - tm('16:30');
    return r.notice === null && r.blocks[3].s === 1050 && r.blocks[4].s === tm('18:00') + delta && r.blocks[5].s === tm('19:00') + delta && r.blocks[6].s === tm('21:00') + delta
      && lengths(r)[2] === lengths(fixed)[2] + delta && lengths(r)[6] === lengths(fixed)[6] - delta;
  });
  check('only the block before the anchored block and the last block change length', () => {
    const fixed = lay(plainList, PM);
    return [-60, 0, 90, 150].every(shift => {
      const pm = Object.assign({}, PM, {maghrib: 1080 + shift});
      const r = lay(day(anchor('maghrib', 'before', 30)), pm);
      return r.notice === null && lengths(r).every((l, i) => (i === 2 || i === 6) ? true : l === lengths(fixed)[i]);
    });
  });
  check('blocks never overlap and always have a positive length when the day fits', () => {
    return [-120, -30, 0, 60, 120, 180].every(shift => {
      const r = lay(day(anchor('maghrib', 'before', 30)), Object.assign({}, PM, {maghrib: 1080 + shift}));
      return r.blocks.every((b, i) => b.e > b.s && (i === 0 || b.s === r.blocks[i - 1].e));
    });
  });
  check('two anchored blocks: each follows its prayer and the block before each absorbs', () => {
    const list = [['07:00', 'rest', 'A'], ['10:00', 'study', 'B', '', '', anchor('dhuhr', 'before', 15)], ['13:00', 'work', 'C'], ['16:00', 'exercise', 'D', '', '', anchor('maghrib', 'before', 30)], ['18:00', 'rest', 'E'], ['21:00', 'personal', 'F']];
    const r = lay(list, PM);
    return r.notice === null && r.blocks[1].s === round5(720 - 15) && r.blocks[3].s === round5(1080 - 30)
      && r.blocks[2].s === tm('13:00') + (705 - tm('10:00')) && r.blocks[0].e === 705;
  });
  check('an absorbing block may shrink to 15 minutes but not below', () => {
    // the last block (21:00) shrinks by delta; 240 minutes at fixed time, so delta 225 leaves 15 and delta 230 leaves 10
    const at15 = lay(day(anchor('maghrib', 'before', 30)), Object.assign({}, PM, {maghrib: 1245}));
    const at10 = lay(day(anchor('maghrib', 'before', 30)), Object.assign({}, PM, {maghrib: 1250}));
    return at15.notice === null && lengths(at15)[6] === 15 && at10.notice === 'nofit' && at10.blocks.every((b, i) => b.s === tm(day()[i][0]));
  });
  check('when the day does not fit, every block is at its fixed time and the notice is nofit', () => {
    const r = lay(day(anchor('maghrib', 'after', 180)), PM);
    return r.notice === 'nofit' && r.blocks.every((b, i) => b.s === tm(day()[i][0])) && r.blocks[6].e === END;
  });
  check('missing prayer times, or a missing prayer, give fixed times and the unavailable notice', () => {
    return [null, undefined, {}, {fajr: 300}, {maghrib: NaN}].every(pm => { const r = lay(day(anchor('maghrib', 'before', 30)), pm); return r.notice === 'unavailable' && r.blocks.every((b, i) => b.s === tm(day()[i][0])); });
  });
  check('a prayer time after midnight is treated as the next day', () => {
    const list = [['07:00', 'rest', 'A'], ['23:50', 'study', 'B', '', '', anchor('fajr', 'after', 0)], ['24:00', 'rest', 'C']];
    const r = lay(list, {fajr: 10});
    return r.notice === null && r.blocks[1].s === 1450 && r.blocks[2].s === 1460 && r.blocks[2].e === END;
  });
  check('keys always use the fixed start and category, anchored or not, fitting or not', () => {
    const want = day().map(b => b[0] + '-' + b[1]);
    return [PM, null, Object.assign({}, PM, {maghrib: 1250})].every(pm => eq(lay(day(anchor('maghrib', 'before', 30)), pm).blocks.map(b => b.key), want));
  });
  check('title, detail and subject are carried over unchanged', () => {
    const list = [['07:00', 'rest', 'T1', 'D1', 'S1'], ['10:00', 'study', 'T2', '', '', anchor('dhuhr', 'before', 0)], ['13:00', 'rest', 'T3']];
    const r = lay(list, PM);
    return r.blocks[0].title === 'T1' && r.blocks[0].detail === 'D1' && r.blocks[0].subj === 'S1' && r.blocks[2].detail === '' && r.blocks[2].subj === '';
  });
  check('layoutDay does not change its input', () => {
    const list = day(anchor('maghrib', 'before', 30)), copy = clone(list);
    layoutDay(list, PM, START, END);
    return eq(list, copy);
  });
  // absorb: the anchor names the block that takes the shift (feature 008)
  const withAbsorb = (at, a) => day(Object.assign(anchor('maghrib', 'before', 30), {absorb: at}, a || {}));
  check('absorb: a later shift makes the block before longer and the named block shorter by the same amount', () => {
    const fixed = lay(plainList, PM), r = lay(withAbsorb('19:00'), PM), d = 1050 - tm('16:30');
    return r.notice === null && d === 60 && lengths(r)[2] === lengths(fixed)[2] + d && lengths(r)[5] === lengths(fixed)[5] - d
      && r.blocks[4].s === tm('18:00') + d && lengths(r)[4] === lengths(fixed)[4] && r.blocks[5].e === tm('21:00') && r.blocks[6].s === tm('21:00') && lengths(r)[6] === lengths(fixed)[6];
  });
  check('absorb: an earlier shift does the opposite', () => {
    const fixed = lay(plainList, PM), r = lay(withAbsorb('19:00'), Object.assign({}, PM, {maghrib: 960})), d = 930 - tm('16:30');
    return r.notice === null && d === -60 && lengths(r)[2] === lengths(fixed)[2] + d && lengths(r)[5] === lengths(fixed)[5] - d && r.blocks[6].s === tm('21:00');
  });
  check('absorb: the named block may shrink to 15 minutes but not below', () => {
    // the course block is 120 minutes, so a shift of 105 leaves 15 and 110 leaves 10
    const at15 = lay(withAbsorb('19:00'), Object.assign({}, PM, {maghrib: 1125})), at10 = lay(withAbsorb('19:00'), Object.assign({}, PM, {maghrib: 1130}));
    return at15.notice === null && lengths(at15)[5] === 15 && at10.notice === 'nofit' && at10.blocks.every((b, i) => b.s === tm(day()[i][0]));
  });
  check('absorb: naming the last block equals having no absorb', () => {
    return [960, 1080, 1200].every(m => { const pm = Object.assign({}, PM, {maghrib: m}); return eq(lay(withAbsorb('21:00'), pm), lay(day(anchor('maghrib', 'before', 30)), pm)); });
  });
  check('absorb: with two anchors, the second starts fresh and blocks after each named block keep their fixed times', () => {
    // the first anchor moves 60 minutes later (dhuhr 12:00 minus 60 = 11:00 instead of 10:00) and its named block is 90 minutes
    const list = [['07:00', 'rest', 'A'], ['08:00', 'study', 'B'], ['10:00', 'work', 'C', '', '', {prayer: 'dhuhr', dir: 'before', min: 60, absorb: '11:30'}], ['11:30', 'study', 'D'], ['13:00', 'rest', 'E'],
      ['15:00', 'study', 'F'], ['16:30', 'exercise', 'G', '', '', {prayer: 'maghrib', dir: 'before', min: 30, absorb: '19:00'}], ['18:00', 'rest', 'H'], ['19:00', 'course', 'I'], ['21:00', 'personal', 'J']];
    const r = lay(list, PM);
    return r.notice === null && r.blocks[2].s === 660 && r.blocks[3].s === tm('11:30') + 60 && r.blocks[3].e === tm('13:00') && r.blocks[4].s === tm('13:00') && r.blocks[5].s === tm('15:00')
      && r.blocks[6].s === 1050 && r.blocks[7].s === tm('18:00') + 60 && r.blocks[9].s === tm('21:00') && r.blocks[9].e === END;
  });
  check('absorb: keys keep the fixed start whatever the shift', () => {
    const want = day().map(b => b[0] + '-' + b[1]);
    return [900, 1080, 1125, 1300].every(m => eq(lay(withAbsorb('19:00'), Object.assign({}, PM, {maghrib: m})).blocks.map(b => b.key), want));
  });
  check('absorb: an independent oracle agrees on 300 generated days', () => {
    let seed = 2024; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    const hm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    for (let k = 0; k < 300; k++) {
      // a day of 6 to 12 blocks from 07:00, each 30 to 180 minutes, ending before END
      const n = 6 + rnd(7); let t = START; const list = [];
      for (let i = 0; i < n && t < END - 30; i++) { list.push([hm(t), ['study', 'work', 'rest', 'course'][rnd(4)], 'B' + i]); t += 30 + 15 * rnd(11); }
      if (list.length < 5) continue;
      const pick = () => 1 + rnd(list.length - 2);
      const a1 = pick(), a2 = rnd(2) ? pick() : -1;
      [a1, a2].filter(x => x > 0).forEach(ai => {
        const ab = rnd(3) === 0 ? null : list[Math.min(list.length - 1, ai + 1 + rnd(3))][0];
        const an = {prayer: ['dhuhr', 'asr', 'maghrib', 'isha'][rnd(4)], dir: rnd(2) ? 'before' : 'after', min: 15 * rnd(5)};
        if (ab) an.absorb = ab;
        while (list[ai].length < 5) list[ai].push('');
        list[ai][5] = an;
      });
      const pm = {fajr: 300, dhuhr: 690 + rnd(60), asr: 870 + rnd(90), maghrib: 1000 + rnd(220), isha: 1080 + rnd(220)};
      const mine = lay(list, pm), want = oracleLayout(list, pm);
      if (!eq(mine.notice, want.notice) || !eq(mine.blocks.map(b => [b.s, b.e]), want.spans)) return false;
    }
    return true;
  });
  check('the layout block never mentions done, checks or modules', () => {
    const block = html.slice(html.indexOf(START_MARK), html.indexOf(END_MARK));
    return !/\bchecks\b|\bmodules\b|\.done\b/.test(block);
  });
  return results;
}

/*
 * Year sweep: loads the app's own settings and day code (the same section tools/check-phase.js loads) with a
 * settings file and the real prayer library, then for every date of the swept years compares blocksFor with the
 * all-fixed layout of the same list. Prints counts only.
 */
const argv = process.argv.slice(2);
const opt = n => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };

function loadApp(settingsText, useAdhan) {
  const adhanSrc = fs.readFileSync(path.join(__dirname, 'vendor', 'adhan.umd.min.js'), 'utf8');
  const mod = {exports: {}};
  new Function('module', 'exports', 'self', 'window', adhanSrc)(mod, mod.exports, globalThis, globalThis);
  const adhan = useAdhan ? (mod.exports.Coordinates ? mod.exports : globalThis.adhan) : undefined;
  const a = ['/* ---------------- settings: format check', '/* ---------------- settings: load'].map(m => html.indexOf(m)).filter(i => i >= 0).sort((x, y) => x - y)[0];
  const b = html.indexOf('/* ---------------- courses ---------------- */');
  if (a === undefined || b < 0) throw new Error('cannot find the settings/data section in src/planner.html');
  const example = html.match(/<script type="application\/json" id="example-settings">([\s\S]*?)<\/script>/);
  const store = {'mizan-settings-v1': settingsText};
  const ls = {getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }};
  const doc = {getElementById: id => (id === 'example-settings' && example ? {textContent: example[1]} : null)};
  const win = {adhan, localStorage: ls, document: doc};
  return new Function('window', 'document', 'localStorage', 'adhan', html.slice(a, b) + '\nreturn {blocksFor, listFor, dayNotice, layoutDay, prayers, weekday, START, END, LOADED};')(win, doc, ls, adhan);
}

function sweepStats(settingsText, fromYear, toYear, label) {
  const app = loadApp(settingsText, true);
  if (app.LOADED.isExample && label.indexOf('settings.example.json') < 0 && label.indexOf('variant') < 0) throw new Error('the settings file did not validate, so the app fell back to the example; run tools/check-settings.js on it');
  const pad = n => String(n).padStart(2, '0');
  const stats = {dates: 0, anchoredDays: 0, nofit: 0, unavailable: 0, bad: [], minDelta: Infinity, maxDelta: -Infinity, minAbsorb: Infinity};
  for (let y = fromYear; y <= toYear; y++) {
    for (let t = Date.UTC(y, 0, 1); t < Date.UTC(y + 1, 0, 1); t += 86400000) {
      const d = new Date(t), iso = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
      stats.dates++;
      const list = app.listFor(iso);
      const idx = list.map((b, i) => b[5] ? i : -1).filter(i => i >= 0);
      if (!idx.length) continue;
      stats.anchoredDays++;
      const pm = app.prayers(iso);
      const lay = app.layoutDay(list, pm, app.START, app.END);
      const fixed = app.layoutDay(list, null, app.START, app.END).blocks;
      const A = app.blocksFor(iso);
      if (!eq(A, lay.blocks)) stats.bad.push(iso + ': blocksFor differs from layoutDay');
      if (lay.notice === 'nofit') { stats.nofit++; if (!A.every((b, i) => b.s === fixed[i].s)) stats.bad.push(iso + ': nofit but not at fixed times'); continue; }
      if (lay.notice === 'unavailable') { stats.unavailable++; continue; }
      // SC-001: every anchored block starts at the prayer time plus or minus its minutes, rounded to 5
      idx.forEach(j => {
        const an = list[j][5];
        let want = Math.round((pm[an.prayer] + (an.dir === 'before' ? -an.min : an.min)) / 5) * 5;
        if (want < app.START) want += 1440;
        if (A[j].s !== want) stats.bad.push(iso + ': block ' + j + ' starts at ' + A[j].s + ', wanted ' + want);
        stats.minDelta = Math.min(stats.minDelta, A[j].s - fixed[j].s); stats.maxDelta = Math.max(stats.maxDelta, A[j].s - fixed[j].s);
      });
      // SC-002, SC-003: no overlap, day start and end unchanged, only the absorbing blocks change length
      if (!A.every((b, i) => b.e > b.s && (i === 0 || b.s === A[i - 1].e))) stats.bad.push(iso + ': overlap or empty block');
      if (A[0].s !== fixed[0].s || A[A.length - 1].e !== app.END) stats.bad.push(iso + ': day start or end moved');
      const absorbing = new Set([A.length - 1]); idx.forEach(j => absorbing.add(j - 1));
      // feature 008: a block named by an anchor's absorb also changes length, and every block after it, up to the
      // next anchor, is back at its fixed time
      idx.forEach((j, n) => {
        const ab = list[j][5].absorb; if (!ab) return;
        const k = list.findIndex((x, q) => q > j && x[0] === ab && !x[5]); if (k < 0) return;
        absorbing.add(k);
        const next = n + 1 < idx.length ? idx[n + 1] : A.length;
        for (let q = k + 1; q < next; q++) if (A[q].s !== fixed[q].s) stats.bad.push(iso + ': block ' + q + ' after the absorbing block is not at its fixed time');
      });
      A.forEach((b, i) => { const same = (b.e - b.s) === (fixed[i].e - fixed[i].s); if (!absorbing.has(i) && !same) stats.bad.push(iso + ': block ' + i + ' changed length'); if (absorbing.has(i)) stats.minAbsorb = Math.min(stats.minAbsorb, b.e - b.s); });
      if (idx.length === 1) {
        const dl = A.map((b, i) => (b.e - b.s) - (fixed[i].e - fixed[i].s)).reduce((s, v) => s + v, 0);
        if (dl !== 0) stats.bad.push(iso + ': absorbing blocks do not balance');
      }
      if (A.some((b, i) => b.key !== list[i][0] + '-' + list[i][1])) stats.bad.push(iso + ': key not at fixed start');
    }
  }
  return stats;
}

function sweep(settingsFile, fromYear, toYear, requireFit) {
  const stats = sweepStats(fs.readFileSync(settingsFile, 'utf8'), fromYear, toYear, path.basename(settingsFile));
  const fmt = v => Number.isFinite(v) ? v : 'n/a';
  console.log('sweep ' + fromYear + '-' + toYear + ' with ' + path.basename(settingsFile) + ': ' + stats.dates + ' dates, ' + stats.anchoredDays + ' with anchored blocks, ' + stats.nofit + ' not fitting, ' + stats.unavailable + ' without prayer times');
  if (stats.anchoredDays) console.log('  shift of anchored blocks vs fixed time: ' + fmt(stats.minDelta) + ' to ' + fmt(stats.maxDelta) + ' minutes; shortest absorbing block: ' + fmt(stats.minAbsorb) + ' minutes');
  stats.bad.slice(0, 10).forEach(m => console.log('  FAIL ' + m));
  if (stats.bad.length > 10) console.log('  ... and ' + (stats.bad.length - 10) + ' more');
  if (!stats.anchoredDays) console.log('  (no anchored blocks in this file: nothing to sweep)');
  const ok = !stats.bad.length && (!requireFit || (stats.nofit === 0 && stats.unavailable === 0));
  if (requireFit && (stats.nofit || stats.unavailable)) console.log('  FAIL --require-fit: some anchored days fall back to fixed times');
  console.log('  ' + (ok ? 'ok    year sweep' : 'FAIL  year sweep'));
  return ok;
}

function matrix(settingsFile, fromYear, toYear) {
  const base = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
  const dayKey = Object.keys(base.week)[0];
  const day = base.week[dayKey];
  if (!Array.isArray(day.blocks)) { console.log('matrix: the first day has two versions; skipped'); return true; }
  let at = day.blocks.findIndex(b => b[1] === 'gym');
  if (at < 1 || at > day.blocks.length - 2) at = Math.floor(day.blocks.length / 2);
  let ok = true;
  console.log('matrix: anchoring block ' + at + ' of day ' + dayKey + ' in the file, over ' + fromYear + '-' + toYear);
  ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(p => ['before', 'after'].forEach(dir => [0, 45].forEach(min => {
    const o = JSON.parse(JSON.stringify(base)), b = o.week[dayKey].blocks[at];
    while (b.length < 5) b.push('');
    b[5] = {prayer: p, dir, min};
    const st = sweepStats(JSON.stringify(o), fromYear, toYear, 'variant');
    const good = !st.bad.length;
    if (!good) ok = false;
    console.log('  ' + (good ? 'ok    ' : 'FAIL  ') + p + ' ' + dir + ' ' + min + ': ' + (st.anchoredDays - st.nofit - st.unavailable) + ' days fit, ' + st.nofit + ' fall back, ' + st.bad.length + ' rule breaks');
    st.bad.slice(0, 3).forEach(m => console.log('        ' + m));
  })));
  return ok;
}

function report(results) {
  results.forEach(([n, ok]) => console.log((ok ? 'ok    ' : 'FAIL  ') + n));
  const failed = results.filter(r => !r[1]).length;
  console.log('\n' + (results.length - failed) + ' of ' + results.length + ' checks passed');
  return failed;
}

if (process.argv.includes('--self-test')) {
  // Each mutation breaks one rule in a copy of the source; the checks MUST notice.
  const mutations = [
    ['the 15-minute floor is lowered to 5', s => s.replace('Math.min(15, was)', 'Math.min(5, was)')],
    ['rounding to 5 minutes is removed', s => s.replace('Math.round((pm[b[5].prayer] + (b[5].dir === \'before\' ? -1 : 1) * b[5].min) / 5) * 5', '(pm[b[5].prayer] + (b[5].dir === \'before\' ? -1 : 1) * b[5].min)')],
    ['keys use the computed start', s => s.replace("key: b[0] + '-' + b[1]}", "key: starts[i] + '-' + b[1]}")],
    ['the last block keeps its length instead of absorbing', s => s.replace(': END, cat: b[1]', ': starts[i] + (END - fixed[i]), cat: b[1]')],
    ['the nofit notice is not set', s => s.replace("notice: 'nofit'", 'notice: null')],
    ['the unavailable notice is not set', s => s.replace("notice: 'unavailable'", 'notice: null')],
    ['direction is ignored', s => s.replace("(b[5].dir === 'before' ? -1 : 1)", '-1')],
    ['blocks after the anchor do not shift', s => s.replace('const s = fixed[i] + delta;', 'const s = fixed[i];')],
    ['absorb: the shift never stops at the named block', s => s.replace('if (i === stop) { delta = 0; stop = -1; }', '')],
    ['absorb: the named block is left out of the fit check', s => s.replace('&& !named.has(i)) return true;', ') return true;')],
    ['absorb: the shift stops one block early', s => s.replace('if (j > i && !list[j][5]) { stop = j; named.add(j); }', 'if (j > i && !list[j][5]) { stop = j - 1; named.add(j - 1); }')]
  ];
  let missed = 0;
  mutations.forEach(([name, mutate]) => {
    const mutated = mutate(html);
    if (mutated === html) { console.log('FAIL  mutation did not apply: ' + name); missed++; return; }
    let results;
    try { results = runChecks(load(mutated)); } catch (e) { results = [['load', false]]; }
    const noticed = results.some(r => !r[1]);
    console.log((noticed ? 'ok    ' : 'FAIL  ') + 'noticed: ' + name);
    if (!noticed) missed++;
  });
  const clean = runChecks(load(html)).every(r => r[1]);
  console.log((clean ? 'ok    ' : 'FAIL  ') + 'the unmodified source passes');
  if (!clean) missed++;
  console.log('\n' + (missed ? missed + ' self-test case(s) failed' : 'all ' + (mutations.length + 1) + ' self-test cases passed'));
  process.exit(missed ? 1 : 0);
}

let results;
try { results = runChecks(load(html)); } catch (e) { console.error(e.message); process.exit(2); }
const failedChecks = report(results);
let sweepOk = true;
try {
  const file = opt('settings') || path.join(__dirname, '..', 'settings.example.json');
  console.log('');
  sweepOk = sweep(file, Number(opt('from') || 2026), Number(opt('to') || 2028), argv.includes('--require-fit'));
  if (argv.includes('--matrix')) { console.log(''); sweepOk = matrix(file, Number(opt('from') || 2026), Number(opt('to') || 2028)) && sweepOk; }
} catch (e) { console.error(e.message); process.exit(2); }
process.exit(failedChecks || !sweepOk ? 1 : 0);
