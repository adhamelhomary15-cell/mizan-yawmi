#!/usr/bin/env node
/*
 * Dev-only check for the backup reminder rule (feature 035; not shipped with the app).
 *
 *   node tools/check-reminder.js              run the checks against the joined app source
 *   node tools/check-reminder.js --self-test  break the rule on purpose and check that this script notices
 *
 * It runs the app's own code: the block between "start of backup reminder" and "end of backup reminder", against a
 * table of dates and what each must give. Output is check names only.
 *
 * Exit codes: 0 all checks pass, 1 a check failed, 2 usage or I/O error.
 */
const {readSource, ruleBlock} = require('./lib/source.js');
const html = readSource();
const load = source => new Function(ruleBlock(source, 'backup reminder') + '\nreturn {backupReminderDue};')();

const DAY = 86400000, NOW = Date.UTC(2026, 10, 15, 9, 0);
const ago = days => NOW - days * DAY;
// [name, state, expected]. Missing fields are null; hasData is true unless given.
const CASES = [
  ['a backup 14 days old is due', {lastBackupAt: ago(14)}, true],
  ['a backup 13 days old is not due', {lastBackupAt: ago(13)}, false],
  ['a backup 13 days old is not due even with an old start', {lastBackupAt: ago(13), since: ago(60)}, false],
  ['no backup, first run 14 days ago, is due', {since: ago(14)}, true],
  ['no backup, first run 13 days ago, is not due', {since: ago(13)}, false],
  ['no backup and no start yet is not due', {}, false],
  ['nothing to lose is never due', {lastBackupAt: ago(30), since: ago(30), hasData: false}, false],
  ['put off for 2 more days is not due', {lastBackupAt: ago(20), snoozedUntil: NOW + 2 * DAY}, false],
  ['put off for exactly 3 days is not due', {lastBackupAt: ago(20), snoozedUntil: NOW + 3 * DAY}, false],
  ['put off beyond 3 days is not trusted', {lastBackupAt: ago(20), snoozedUntil: NOW + 40 * DAY}, true],
  ['put off but the time has passed is due', {lastBackupAt: ago(20), snoozedUntil: ago(1)}, true],
  ['a last backup in the future is due', {lastBackupAt: NOW + 30 * DAY}, true],
  ['a start in the future is not due', {since: NOW + 30 * DAY}, false]
];

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function run(source, quiet) {
  let rule;
  try { rule = load(source).backupReminderDue; } catch (e) { if (!quiet) console.log('FAIL  the rule loads: ' + e.message); return false; }
  let ok = true;
  CASES.forEach(([name, state, want]) => {
    const got = rule(Object.assign({now: NOW, lastBackupAt: null, since: null, snoozedUntil: null, hasData: true}, state));
    const pass = eq(got, want);
    if (!quiet) console.log((pass ? 'ok    ' : 'FAIL  ') + name + (pass ? '' : ' (got ' + JSON.stringify(got) + ')'));
    if (!pass) ok = false;
  });
  return ok;
}

if (process.argv.includes('--self-test')) {
  const mutations = [
    ['13 days count as due', s => s.replace('BACKUP_DUE_DAYS = 14', 'BACKUP_DUE_DAYS = 13')],
    ['nothing to lose is ignored', s => s.replace('if (!hasData) return false;', '')],
    ['a put-off time beyond 3 days is trusted', s => s.replace(' && snoozedUntil - now <= BACKUP_SNOOZE_DAYS * DAY_MS', '')],
    ['a last backup in the future is trusted', s => s.replace('return lastBackupAt > now || ', 'return ')],
    ['the put-off time is ignored', s => s.replace('snoozedUntil !== null && snoozedUntil > now', 'false')]
  ];
  let missed = 0;
  mutations.forEach(([name, mutate]) => {
    const mutated = mutate(html);
    if (mutated === html) { console.log('FAIL  mutation did not apply: ' + name); missed++; return; }
    const caught = !run(mutated, true);
    console.log((caught ? 'ok    noticed: ' : 'FAIL  not noticed: ') + name);
    if (!caught) missed++;
  });
  const clean = run(html, true);
  console.log((clean ? 'ok    ' : 'FAIL  ') + 'the unmodified source passes');
  if (!clean) missed++;
  console.log('\n' + (missed ? missed + ' self-test case(s) failed' : 'all ' + (mutations.length + 1) + ' self-test cases passed'));
  process.exit(missed ? 1 : 0);
}

const failed = run(html, false) ? 0 : 1;
console.log('\n' + (failed ? 'some checks failed' : CASES.length + ' of ' + CASES.length + ' checks passed'));
process.exit(failed);
