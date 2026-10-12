#!/usr/bin/env node
/*
 * Dev-only check for the late/early schedule version (not shipped with the app).
 *
 *   node tools/check-phase.js [--fallback=app|yearly|current] [--from=2026] [--to=2035]
 *
 * For every date it computes the version two ways and compares them:
 *   primary  = Maghrib (Giza 30.0, 31.17, Egyptian method, Cairo time) at or after 17:45 -> 'A' (late), else 'B' (early)
 *   fallback = the date-only rule the app uses when prayer times are unavailable
 *
 * --fallback=app      the code actually in src/planner.html (phaseFor with prayer times off) (default)
 * --fallback=yearly   a standalone copy of the yearly rule: late from 16 Feb through the last Thursday of October
 * --fallback=current  the old rule that used a fixed date (2026-10-30), kept for the baseline
 *
 * Exit code 0 when the chosen fallback agrees with the primary rule on every date, except at most
 * one day per year between 10 and 25 February. Otherwise 1.
 */
const fs = require('fs');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v === undefined ? true : v];
}));
const FALLBACK = args.fallback || 'app';
const FROM = Number(args.from || 2026), TO = Number(args.to || 2035);
if (!['current', 'yearly', 'app'].includes(FALLBACK)) { console.error('--fallback must be app, yearly or current'); process.exit(2); }

const src = fs.readFileSync(path.join(__dirname, 'vendor', 'adhan.umd.min.js'), 'utf8');
const mod = { exports: {} };
new Function('module', 'exports', 'self', 'window', src)(mod, mod.exports, globalThis, globalThis);
const adhan = mod.exports.Coordinates ? mod.exports : globalThis.adhan;
if (!adhan || !adhan.Coordinates) { console.error('could not load adhan'); process.exit(2); }

const coords = new adhan.Coordinates(30.0, 31.17);
const params = adhan.CalculationMethod.Egyptian();
const cairo = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: false });
const pad = n => String(n).padStart(2, '0');
const isoOf = (y, m, d) => y + '-' + pad(m) + '-' + pad(d);

function maghribMinutes(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new adhan.PrayerTimes(coords, new Date(y, m - 1, d), params);
  const [h, mi] = cairo.format(t.maghrib).split(':').map(Number);
  return (h % 24) * 60 + mi;
}
const primary = iso => maghribMinutes(iso) >= 17 * 60 + 45 ? 'A' : 'B';

// last Thursday of October, by UTC date arithmetic on the ISO year
function lastThursdayOfOctober(year) {
  const d = new Date(Date.UTC(year, 9, 31));
  while (d.getUTCDay() !== 4) d.setUTCDate(d.getUTCDate() - 1);
  return isoOf(year, 10, d.getUTCDate());
}
const fallbackCurrent = iso => iso < '2026-10-30' ? 'A' : 'B';
const fallbackYearly = iso => {
  const y = Number(iso.slice(0, 4));
  return iso >= y + '-02-16' && iso <= lastThursdayOfOctober(y) ? 'A' : 'B';
};
// The real thing: pull lastThursdayOfOctober and phaseFor out of src/planner.html and run them with
// prayer times switched off, so this checks the code the app ships, not a copy of it.
function fallbackFromApp() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'planner.html'), 'utf8');
  const grab = name => {
    const start = html.indexOf('function ' + name + '(');
    if (start < 0) throw new Error('function ' + name + ' not found in src/planner.html');
    let depth = 0, i = html.indexOf('{', start);
    for (let j = i; j < html.length; j++) {
      if (html[j] === '{') depth++;
      else if (html[j] === '}' && --depth === 0) return html.slice(start, j + 1);
    }
    throw new Error('unbalanced braces in ' + name);
  };
  const code = grab('lastThursdayOfOctober') + '\n' + grab('phaseFor') + '\nreturn phaseFor;';
  return new Function('pad', 'prayers', code)(pad, () => null);
}
const fallback = FALLBACK === 'current' ? fallbackCurrent : FALLBACK === 'app' ? fallbackFromApp() : fallbackYearly;

let failed = false;
console.log('fallback rule: ' + FALLBACK + '\n');
for (let y = FROM; y <= TO; y++) {
  const transitions = [], mismatches = [];
  let prev = null;
  for (let t = Date.UTC(y, 0, 1); t < Date.UTC(y + 1, 0, 1); t += 86400000) {
    const dt = new Date(t);
    const iso = isoOf(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    const p = primary(iso), f = fallback(iso);
    if (prev !== null && p !== prev) transitions.push(iso + ' -> ' + p + ' (Maghrib ' + pad(Math.floor(maghribMinutes(iso) / 60)) + ':' + pad(maghribMinutes(iso) % 60) + ')');
    if (p !== f) mismatches.push(iso + ' (computed ' + p + ', fallback ' + f + ')');
    prev = p;
  }
  const okMismatch = mismatches.length === 0 ||
    (mismatches.length === 1 && /-02-(1\d|2[0-5])/.test(mismatches[0]) && /-02-/.test(mismatches[0]));
  const octMismatch = mismatches.some(m => /-10-/.test(m));
  const ok = okMismatch && !octMismatch;
  if (!ok) failed = true;
  console.log(y + (ok ? '  ok' : '  FAIL'));
  console.log('  switches : ' + (transitions.join('; ') || 'none'));
  console.log('  disagree : ' + (mismatches.length ? mismatches.length + ' day(s): ' + mismatches.slice(0, 4).join('; ') + (mismatches.length > 4 ? '; ...' : '') : 'none'));
}
console.log('\n' + (failed ? 'RESULT: fallback disagrees with the computed rule beyond the allowed margin' : 'RESULT: fallback agrees with the computed rule within the allowed margin'));
process.exit(failed ? 1 : 0);
