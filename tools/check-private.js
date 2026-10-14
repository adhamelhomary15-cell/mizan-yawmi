#!/usr/bin/env node
/*
 * Dev-only privacy check (not shipped with the app).
 *
 *   node tools/check-private.js [--settings <file>] [--repo <dir>]
 *   node tools/check-private.js --self-test
 *
 * Reads the user's local settings file (default: .private/settings.json) and checks that none of its personal
 * values appear in any tracked file, and that the file itself is ignored by git and not tracked.
 *
 * Checks:
 *   1. the settings file exists
 *   2. it is ignored by git (git check-ignore)
 *   3. it is not tracked (git ls-files)
 *   4. none of its string values (4+ characters) appear in the contents of any tracked file
 *      (values that also appear in settings.example.json, a short list of format words, and bare clock times
 *      or dates are skipped; third-party code under tools/vendor and binary files are not scanned)
 *
 * Output lists file paths, how many values matched, and which part of the settings file they came from
 * (for example "week" or "subjects"). It never prints a value, so it is safe to run on personal data.
 * Limit: it finds exact string matches only, so a paraphrase of personal data is not detected.
 *
 * Exit codes: 0 clean, 1 a problem was found, 2 usage error or settings file missing.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// Words of the settings format itself, never personal: they may appear in any settings file and in the docs.
const GENERIC = ['last-thursday-october', 'maghrib', 'Egyptian', 'mizan-settings', 'Africa/Cairo', 'Sample city',
  'fajr', 'dhuhr', 'asr', 'isha', 'before', 'after'];
const SKIP_DIRS = ['tools/vendor/'];
const BINARY = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.zip', '.pdf'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function git(repo, args, opts) {
  return execFileSync('git', args, Object.assign({ cwd: repo, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] }, opts || {}));
}
function gitOk(repo, args) {
  try { execFileSync('git', args, { cwd: repo, stdio: 'ignore' }); return true; } catch (e) { return false; }
}

// A bare clock time (08:00) or date (2026-10-12) says nothing on its own and appears everywhere; skip those.
const isClockOrDate = v => /^\d\d:\d\d$/.test(v) || /^\d\d\d\d-\d\d-\d\d$/.test(v);

// Collect string values (4+ chars) with the top-level settings section they came from.
function collectValues(cfg, exampleText) {
  const out = new Map(); // value -> section
  (function walk(v, section) {
    if (typeof v === 'string') {
      if (v.length >= 4 && !GENERIC.includes(v) && !isClockOrDate(v) && !exampleText.includes(v) && !out.has(v)) out.set(v, section);
    } else if (Array.isArray(v)) v.forEach(x => walk(x, section));
    else if (v && typeof v === 'object') Object.keys(v).forEach(k => walk(v[k], section || k));
  })(cfg, '');
  return out;
}

function check(repo, settingsPath, quiet) {
  const log = quiet ? () => {} : console.log;
  const abs = path.resolve(repo, settingsPath);
  if (!fs.existsSync(abs)) { log('settings file not found: ' + settingsPath); return 2; }
  const rel = path.relative(repo, abs).replace(/\\/g, '/');
  let problems = 0;

  if (rel.startsWith('..')) { log('NOTE  the settings file is outside the repository (so it cannot be tracked)'); }
  else {
    if (!gitOk(repo, ['check-ignore', '-q', '--', rel])) { log('FAIL  the settings file is not ignored by git'); problems++; }
    else log('ok    the settings file is ignored by git');
    if (gitOk(repo, ['ls-files', '--error-unmatch', '--', rel])) { log('FAIL  the settings file is tracked by git'); problems++; }
    else log('ok    the settings file is not tracked');
  }

  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(abs, 'utf8')); } catch (e) { log('settings file is not valid JSON'); return 2; }
  const exPath = path.join(repo, 'settings.example.json');
  const exampleText = fs.existsSync(exPath) ? fs.readFileSync(exPath, 'utf8') : '';
  const values = collectValues(cfg, exampleText);

  const files = git(repo, ['ls-files', '-z']).split('\0').filter(Boolean)
    .filter(f => !SKIP_DIRS.some(d => f.startsWith(d)) && !BINARY.includes(path.extname(f).toLowerCase()) && f !== rel);
  const hits = [];
  let scanned = 0;
  for (const f of files) {
    const fp = path.join(repo, f);
    let st; try { st = fs.statSync(fp); } catch (e) { continue; }
    if (!st.isFile() || st.size > MAX_FILE_BYTES) continue;
    const text = fs.readFileSync(fp, 'utf8');
    scanned++;
    const sections = {};
    let n = 0;
    values.forEach((section, v) => { if (text.includes(v)) { n++; sections[section || 'other'] = (sections[section || 'other'] || 0) + 1; } });
    if (n) hits.push({ file: f, n, sections });
  }
  log('checked ' + values.size + ' personal value(s) against ' + scanned + ' tracked file(s)');
  if (hits.length) {
    problems++;
    log('FAIL  personal values found in ' + hits.length + ' tracked file(s):');
    hits.sort((a, b) => b.n - a.n).forEach(h => log('  ' + String(h.n).padStart(3) + '  ' + h.file + '   (' + Object.keys(h.sections).map(k => k + ':' + h.sections[k]).join(', ') + ')'));
  } else log('ok    no personal value appears in any tracked file');
  log('\n' + (problems ? 'RESULT: not clean' : 'RESULT: clean'));
  return problems ? 1 : 0;
}

function selfTest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'check-private-'));
  const sh = (args) => execFileSync('git', args, { cwd: tmp, stdio: 'ignore' });
  const w = (f, t) => { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.writeFileSync(path.join(tmp, f), t); };
  const mk = () => {
    fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
    sh(['init', '-q']); sh(['config', 'user.email', 't@t']); sh(['config', 'user.name', 't']);
    w('.gitignore', '.private/\n');
    w('settings.example.json', '{"name":"Example"}\n');
    w('.private/settings.json', JSON.stringify({ name: 'Zebra Planner Quartz', week: { 0: { blocks: [['08:00', 'rest', 'Quartz-lab-session']] } }, subjects: { A: 'Obscure-subject-name' } }));
    w('README.md', 'A general planner.\n');
    sh(['add', '-A']); sh(['commit', '-q', '-m', 'init']);
  };
  let failed = 0;
  const expect = (label, got, want) => { const ok = got === want; console.log((ok ? 'ok    ' : 'FAIL  ') + label + ' (exit ' + got + ', expected ' + want + ')'); if (!ok) failed++; };
  const run = (extra) => check(tmp, '.private/settings.json', true);

  mk(); expect('clean repo passes', run(), 0);
  mk(); w('notes.md', 'about the Quartz-lab-session today\n'); sh(['add', '-A']); expect('planted value in a tracked file is caught', run(), 1);
  mk(); w('notes.md', 'nothing personal here\n'); sh(['add', '-A']); expect('unrelated tracked file stays clean', run(), 0);
  mk(); w('.gitignore', '\n'); expect('settings file that is not ignored is caught', run(), 1);
  mk(); sh(['add', '-f', '.private/settings.json']); expect('settings file that is tracked is caught', run(), 1);
  mk(); fs.rmSync(path.join(tmp, '.private'), { recursive: true }); expect('missing settings file gives exit 2', run(), 2);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('\n' + (failed ? failed + ' self-test case(s) failed' : 'all self-test cases passed'));
  process.exit(failed ? 1 : 0);
}

const argv = process.argv.slice(2);
if (argv.includes('--self-test')) selfTest();
const opt = n => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
const repo = path.resolve(opt('repo') || path.join(__dirname, '..'));
const code = check(repo, opt('settings') || '.private/settings.json', false);
process.exit(code);
