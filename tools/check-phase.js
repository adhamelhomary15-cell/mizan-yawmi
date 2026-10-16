#!/usr/bin/env node
/*
 * Dev-only check for the late/early day-version rule (not shipped with the app).
 *
 *   node tools/check-phase.js [--settings <file>] [--from 2026] [--to 2035]
 *
 * A day can have two versions chosen by a prayer-time threshold (settings: versions.prayer and
 * versions.thresholdMinutes). When prayer times can't be computed, versions.fallback gives dates instead.
 * This script runs the app's own phaseFor twice for every date, once with the prayer library (the computed rule)
 * and once without it (the fallback rule), using the location, time zone and method from the settings file, and
 * compares them. It reports, per year, the dates where the computed version switches and any dates where the
 * fallback disagrees.
 *
 * Pass condition: at most one disagreeing day per year. Default settings file: settings.example.json (which has
 * no fallback, so there is nothing to compare). Use your own file to check your fallback dates.
 *
 * Exit codes: 0 ok (or nothing to check), 1 fallback disagrees too much, 2 usage or load error.
 */
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const opt = n => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
const settingsFile = opt('settings') || path.join(__dirname, '..', 'settings.example.json');
const FROM = Number(opt('from') || 2026), TO = Number(opt('to') || 2035);

let settingsText;
try { settingsText = fs.readFileSync(settingsFile, 'utf8'); } catch (e) { console.error('cannot read ' + settingsFile); process.exit(2); }
let cfg;
try { cfg = JSON.parse(settingsText); } catch (e) { console.error('settings file is not valid JSON'); process.exit(2); }
if (!cfg.versions) { console.log('no versions rule in the settings: nothing to check'); process.exit(0); }
if (!cfg.versions.fallback) { console.log('no versions.fallback in the settings: days use version A when prayer times are unavailable; nothing to compare'); process.exit(0); }

const adhanSrc = fs.readFileSync(path.join(__dirname, 'vendor', 'adhan.umd.min.js'), 'utf8');
const mod = { exports: {} };
new Function('module', 'exports', 'self', 'window', adhanSrc)(mod, mod.exports, globalThis, globalThis);
const adhan = mod.exports.Coordinates ? mod.exports : globalThis.adhan;

const html = require('./lib/source.js').readSource();
const a = ['/* ---------------- settings: format check', '/* ---------------- settings: load'].map(m => html.indexOf(m)).filter(i => i >= 0).sort((x, y) => x - y)[0];
const b = html.indexOf('/* ---------------- courses ---------------- */');
if (a === undefined || b < 0) { console.error('cannot find the settings/data section in src/planner.html'); process.exit(2); }
const code = html.slice(a, b);
const example = html.match(/<script type="application\/json" id="example-settings">([\s\S]*?)<\/script>/);

function load(useAdhan) {
  const store = { 'mizan-settings-v1': settingsText };
  const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const doc = { getElementById: id => (id === 'example-settings' && example ? { textContent: example[1] } : null) };
  const ad = useAdhan ? adhan : undefined;
  const win = { adhan: ad, localStorage: ls, document: doc };
  return new Function('window', 'document', 'localStorage', 'adhan', code + '\nreturn {phaseFor, LOADED};')(win, doc, ls, ad);
}
const computed = load(true), fallback = load(false);
if (computed.LOADED.isExample) { console.error('the settings file did not validate, so the app fell back to the example; run tools/check-settings.js on it'); process.exit(2); }

const pad = n => String(n).padStart(2, '0');
let failed = false;
console.log('settings: ' + path.basename(settingsFile) + '\n');
for (let y = FROM; y <= TO; y++) {
  const switches = [], mismatches = [];
  let prev = null;
  for (let t = Date.UTC(y, 0, 1); t < Date.UTC(y + 1, 0, 1); t += 86400000) {
    const d = new Date(t), iso = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
    const p = computed.phaseFor(iso), f = fallback.phaseFor(iso);
    if (prev !== null && p !== prev) switches.push(iso + ' -> ' + p);
    if (p !== f) mismatches.push(iso);
    prev = p;
  }
  const ok = mismatches.length <= 1;
  if (!ok) failed = true;
  console.log(y + (ok ? '  ok' : '  FAIL'));
  console.log('  switches : ' + (switches.join('; ') || 'none'));
  console.log('  disagree : ' + (mismatches.length ? mismatches.length + ' day(s): ' + mismatches.slice(0, 4).join('; ') + (mismatches.length > 4 ? '; ...' : '') : 'none'));
}
console.log('\n' + (failed ? 'RESULT: the fallback rule disagrees with the computed rule on more than one day in some year' : 'RESULT: the fallback agrees with the computed rule (at most one day per year differs)'));
process.exit(failed ? 1 : 0);
