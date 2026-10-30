/*
 * The app source as the dev checks see it: src/planner.html with the script parts from src/app joined in
 * (feature 010). tools/build.py joins them by the same rule, so the checks test exactly what ships.
 *
 * Join rule:
 *   1. Read src/app/ORDER; skip blank lines and lines starting with '#'.
 *   2. Read each listed file as UTF-8 and turn CRLF into LF.
 *   3. Put the contents one after another, with nothing between them.
 *   4. Replace the placeholder line (with its newline) with the result.
 *   5. Stop, naming the file, when a listed file is missing, a .js file in src/app is not listed, or a name
 *      repeats.
 * Without the placeholder (the source still in one file), the text comes back unchanged.
 *
 *   node tools/lib/source.js --print-sha   SHA-1 of the joined source; CI compares it with tools/build.py's
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const APP = path.join(ROOT, 'src', 'app');
const PLACEHOLDER = '/* @app-parts */\n';

function partNames() {
  const order = path.join(APP, 'ORDER');
  if (!fs.existsSync(order)) throw new Error('src/app/ORDER is missing');
  const names = fs.readFileSync(order, 'utf8').replace(/\r\n/g, '\n').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const seen = new Set();
  names.forEach(n => {
    if (seen.has(n)) throw new Error('src/app/ORDER lists ' + n + ' twice');
    seen.add(n);
    if (!fs.existsSync(path.join(APP, n))) throw new Error('src/app/ORDER lists ' + n + ', which does not exist');
  });
  fs.readdirSync(APP).filter(f => f.endsWith('.js')).forEach(f => {
    if (!seen.has(f)) throw new Error('src/app/' + f + ' is not listed in src/app/ORDER');
  });
  return names;
}

function joinParts(text) {
  const at = text.indexOf(PLACEHOLDER);
  if (at < 0) return text;
  if (text.indexOf(PLACEHOLDER, at + 1) >= 0) throw new Error('src/planner.html has the parts placeholder twice');
  const body = partNames().map(n => fs.readFileSync(path.join(APP, n), 'utf8').replace(/\r\n/g, '\n')).join('');
  return text.slice(0, at) + body + text.slice(at + PLACEHOLDER.length);
}

function readSource() {
  return joinParts(fs.readFileSync(path.join(ROOT, 'src', 'planner.html'), 'utf8').replace(/\r\n/g, '\n'));
}

// The app's data section, from a to b, for the checks that run the day plans outside the page (check-anchors,
// check-parity). The schedule rules block follows it where the source has one, since the day in use on a date comes
// from there (feature 021). A source without the block, such as an older build, is returned as it was.
function dataSection(html, a, b) {
  const r0 = html.indexOf('// start of schedule rules'), r1 = html.indexOf('// end of schedule rules');
  return html.slice(a, b) + (r0 >= 0 && r1 > r0 && (r0 < a || r0 >= b) ? '\n' + html.slice(r0, r1) : '');
}

// A rules block of the app: the text from "// start of <name>" up to "// end of <name>". The checks run these
// blocks on their own, outside the page.
function ruleBlock(source, name) {
  const a = source.indexOf('// start of ' + name), b = source.indexOf('// end of ' + name);
  if (a < 0 || b < a) throw new Error(name + ' block not found in the app source');
  return source.slice(a, b);
}
// One `function name(...) {...}` of the app, found by matching braces, for the checks that run it outside the page.
function grabFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('function ' + name + ' not found in the app source');
  let depth = 0;
  for (let j = source.indexOf('{', start); j < source.length; j++) {
    if (source[j] === '{') depth++;
    else if (source[j] === '}' && --depth === 0) return source.slice(start, j + 1);
  }
  throw new Error('unbalanced braces in ' + name);
}

module.exports = {readSource, joinParts, partNames, dataSection, ruleBlock, grabFunction, PLACEHOLDER};

if (require.main === module && process.argv.includes('--print-sha')) {
  try { console.log(require('crypto').createHash('sha1').update(readSource()).digest('hex')); }
  catch (e) { console.error(e.message); process.exit(1); }
}
