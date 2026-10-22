#!/usr/bin/env node
/*
 * Dev-only parity check (not shipped with the app): proves a new build, loaded with a settings file,
 * produces the same plans as an old build.
 *
 *   node tools/check-parity.js --old <html> --new <html> [--settings <file>] [--from YYYY-MM-DD] [--days N] [--no-adhan]
 *
 * For every date it compares the day plan (start, end, category, title, detail, subject, key), and it also
 * compares the per-weekday notes, category labels, subjects, course, course plan, rules text and task tags.
 * Output is counts and positions only (date, block index, field name); it never prints values, so it can be
 * run on personal data. Defaults: 366 days starting 2026-10-01.
 *
 * The data and plan logic is pulled out of each HTML file (from the settings/data section down to the
 * courses section) and run with a fake storage that holds the settings file. Both builds get the same file, under the
 * pre-013 key: every build reads it there, and a newer build moves it into its envelope the way it does on a device.
 *
 * Exit codes: 0 no differences, 1 differences found, 2 usage or load error.
 */
const fs = require('fs');
const path = require('path');
const {dataSection} = require('./lib/source.js');

const argv = process.argv.slice(2);
const opt = n => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
const oldFile = opt('old'), newFile = opt('new'), settingsFile = opt('settings');
const from = opt('from') || '2026-10-01';
const days = Number(opt('days') || 366);
const NO_ADHAN = argv.includes('--no-adhan'); // run both builds without the prayer library, to exercise the fallback rule
if (!oldFile || !newFile) { console.error('usage: node tools/check-parity.js --old <html> --new <html> [--settings <file>] [--from YYYY-MM-DD] [--days N] [--no-adhan]'); process.exit(2); }

const adhanSrc = fs.readFileSync(path.join(__dirname, 'vendor', 'adhan.umd.min.js'), 'utf8');
const mod = { exports: {} };
new Function('module', 'exports', 'self', 'window', adhanSrc)(mod, mod.exports, globalThis, globalThis);
const adhan = mod.exports.Coordinates ? mod.exports : globalThis.adhan;

const START_MARKERS = ['/* ---------------- settings: format check', '/* ---------------- settings: load', '/* ---------------- schedule data ---------------- */'];
const END_MARKER = '/* ---------------- courses ---------------- */';

function load(file, settingsText) {
  const html = fs.readFileSync(file, 'utf8');
  let a = -1;
  for (const m of START_MARKERS) { const i = html.indexOf(m); if (i >= 0 && (a < 0 || i < a)) a = i; }
  const b = html.indexOf(END_MARKER);
  if (a < 0 || b < 0 || b < a) throw new Error('cannot find the data section in ' + path.basename(file));
  // Functions the section may rely on that live elsewhere in the file are not needed; keep only the section.
  let code = dataSection(html, a, b);
  const ex = html.match(/<script type="application\/json" id="example-settings">([\s\S]*?)<\/script>/);
  const store = {};
  if (settingsText) store['mizan-settings-v1'] = settingsText;
  const fakeStorage = {
    getItem: k => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  };
  const fakeDocument = { getElementById: id => id === 'example-settings' && ex ? { textContent: ex[1] } : null };
  const useAdhan = NO_ADHAN ? undefined : adhan;
  const win = { adhan: useAdhan, localStorage: fakeStorage, document: fakeDocument };
  const names = ['blocksFor', 'phaseFor', 'SCHED', 'dayOfDate', 'CATS', 'SUBJ', 'COURSE', 'PLAN', 'RULES', 'TASK_TAGS'];
  const present = names.filter(n => new RegExp('(?:function|const|let)\\s+' + n + '\\b').test(code));
  const fn = new Function('window', 'document', 'localStorage', 'adhan',
    code + '\nreturn {' + present.map(n => n + ':' + n).join(',') + '};');
  return fn(win, fakeDocument, fakeStorage, useAdhan);
}

const settingsText = settingsFile ? fs.readFileSync(settingsFile, 'utf8') : null;
let A, B;
try { A = load(oldFile, settingsText); B = load(newFile, settingsText); }
catch (e) { console.error('load error: ' + e.message); process.exit(2); }

const diffs = [];
let comparisons = 0;
const note = (what) => { if (diffs.length < 8) diffs.push(what); diffsCount++; };
let diffsCount = 0;
// Order of object keys does not matter, only content does.
const canon = v => Array.isArray(v) ? v.map(canon)
  : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => { o[k] = canon(v[k]); return o; }, {})
  : v;
const same = (x, y) => JSON.stringify(canon(x)) === JSON.stringify(canon(y));
const FIELDS = ['s', 'e', 'cat', 'title', 'detail', 'subj', 'key'];

// A day's note: from the day in use on the date where a build has dayOfDate (feature 021), else from its one week.
const noteOn = (M, iso) => {
  const d = M.dayOfDate ? M.dayOfDate(iso) : M.SCHED && M.SCHED[new Date(iso + 'T00:00:00Z').getUTCDay()];
  return d ? d.note : undefined;
};
const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); };
for (let i = 0; i < days; i++) {
  const iso = addDays(from, i);
  comparisons++;
  const x = A.blocksFor(iso), y = B.blocksFor(iso);
  if (x.length !== y.length) { note(iso + ': block count differs (' + x.length + ' vs ' + y.length + ')'); continue; }
  x.forEach((bx, j) => FIELDS.forEach(f => { if (!same(bx[f], y[j][f])) note(iso + ': block ' + j + ' field ' + f + ' differs'); }));
  if ((noteOn(A, iso) || '') !== (noteOn(B, iso) || '')) note(iso + ': note differs');
}
for (const name of ['CATS', 'SUBJ', 'COURSE', 'PLAN', 'RULES', 'TASK_TAGS']) {
  if (!(name in A) && !(name in B)) continue;
  comparisons++;
  const norm = v => name === 'COURSE' && v ? { name: v.name, sub: v.sub } : v;
  if (!same(norm(A[name]), norm(B[name]))) note(name + ' differs');
}

console.log('compared ' + comparisons + ' items (' + days + ' dates from ' + from + ', plus notes, labels, course, plan, rules, tags)');
if (diffsCount === 0) { console.log('RESULT: 0 differences'); process.exit(0); }
console.log('RESULT: ' + diffsCount + ' difference(s); first ' + diffs.length + ':');
diffs.forEach(d => console.log('  ' + d));
process.exit(1);
