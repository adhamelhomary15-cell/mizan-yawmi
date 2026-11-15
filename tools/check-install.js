#!/usr/bin/env node
/*
 * Dev-only check for the install hint rule (feature 034; not shipped with the app).
 *
 *   node tools/check-install.js              run the checks against the joined app source
 *   node tools/check-install.js --self-test  break the rule on purpose and check that this script notices
 *
 * It runs the app's own code: the block between "start of install hint" and "end of install hint", against a table
 * of typical user agents and what each must get. Output is check names only.
 *
 * Exit codes: 0 all checks pass, 1 a check failed, 2 usage or I/O error.
 */
const {readSource, ruleBlock} = require('./lib/source.js');
const html = readSource();
const load = source => new Function(ruleBlock(source, 'install hint') + '\nreturn {installHintFor};')();

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipadAsMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  chromeIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  instagramIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 357.0.0.25.101',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0',
  whatsappAndroid: 'Mozilla/5.0 (Linux; Android 13; SM-A536E Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36 WhatsApp/2.24.23',
  chromeDesktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'
};
// [name, device, expected]. touch is navigator.maxTouchPoints; offer is the browser's own install offer.
const CASES = [
  ['Safari on an iPhone gets the iPhone steps', {ua: UA.iphone, touch: 5}, {os: 'ios', inApp: false}],
  ['an iPad gets the iPhone steps', {ua: UA.ipad, touch: 5}, {os: 'ios', inApp: false}],
  ['an iPad presenting itself as a Mac gets the iPhone steps', {ua: UA.ipadAsMac, touch: 5}, {os: 'ios', inApp: false}],
  ['Chrome on an iPhone gets the iPhone steps', {ua: UA.chromeIos, touch: 5}, {os: 'ios', inApp: false}],
  ['Instagram\'s browser on an iPhone asks to open Safari first', {ua: UA.instagramIos, touch: 5}, {os: 'ios', inApp: true}],
  ['an iPhone opened from the home screen gets nothing', {ua: UA.iphone, touch: 5, standalone: true}, null],
  ['Safari on a Mac gets nothing', {ua: UA.safariMac, touch: 0}, null],
  ['Chrome on a computer gets nothing', {ua: UA.chromeDesktop, touch: 0}, null],
  ['Chrome on Android with no install offer gets the Android steps', {ua: UA.chromeAndroid, touch: 5}, {os: 'android', inApp: false}],
  ['Chrome on Android offering to install gets nothing (its button shows)', {ua: UA.chromeAndroid, touch: 5, offer: true}, null],
  ['Firefox on Android gets the Android steps', {ua: UA.firefoxAndroid, touch: 5}, {os: 'android', inApp: false}],
  ['the WhatsApp browser on Android asks to open the browser first', {ua: UA.whatsappAndroid, touch: 5}, {os: 'android', inApp: true}],
  ['Android opened from the home screen gets nothing', {ua: UA.chromeAndroid, touch: 5, standalone: true}, null]
];

let failed = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function run(source, quiet) {
  let rule;
  try { rule = load(source).installHintFor; } catch (e) { if (!quiet) console.log('FAIL  the rule loads: ' + e.message); return false; }
  let ok = true;
  CASES.forEach(([name, device, want]) => {
    const got = rule(Object.assign({standalone: false, offer: false}, device));
    const pass = eq(got, want);
    if (!quiet) console.log((pass ? 'ok    ' : 'FAIL  ') + name + (pass ? '' : ' (got ' + JSON.stringify(got) + ')'));
    if (!pass) ok = false;
  });
  return ok;
}

if (process.argv.includes('--self-test')) {
  const mutations = [
    ['an iPad presenting itself as a Mac is missed', s => s.replace("(/Macintosh/.test(ua) && touch > 1)", 'false')],
    ['the home screen is ignored', s => s.replace('if (standalone) return null;', '')],
    ['an in-app browser is not noticed', s => s.replace('const inApp = IN_APP.test(ua);', 'const inApp = false;')],
    ['a computer gets the steps', s => s.replace("(/Macintosh/.test(ua) && touch > 1)", "/Macintosh/.test(ua)")],
    ['Android shows the steps beside the install offer', s => s.replace('return offer && !inApp ? null :', 'return')],
    ['Android is missed', s => s.replace("if (/Android/.test(ua)) return", "if (false) return")]
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

failed = run(html, false) ? 0 : 1;
console.log('\n' + (failed ? 'some checks failed' : CASES.length + ' of ' + CASES.length + ' checks passed'));
process.exit(failed);
