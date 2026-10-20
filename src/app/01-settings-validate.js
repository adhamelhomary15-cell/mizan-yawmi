  /* ---------------- settings: format check (pure; used by the importer and tools/check-settings.js) ---------------- */
  // Returns {ok, errors, warnings, settings}. Each error is {code, path, detail}; codes:
  // not-settings, too-new, invalid, unknown-id. Rules follow specs/002-separate-personal-settings/data-model.md.
  function validateSettings(obj){
    const CATEGORY_IDS = ['uni','study','course','work','gym','quran','personal','move','rest'];
    // A kind the user added (feature 016): ids k1 to k12, with a ready colour and an optional balance side.
    const isNewKind = k => /^k([1-9]|1[0-2])$/.test(k);
    const KIND_COLORS = ['teal','blue','green','slate','copper','olive'];
    const METHODS = ['MuslimWorldLeague','Egyptian','Karachi','UmmAlQura','Dubai','MoonsightingCommittee','NorthAmerica','Kuwait','Qatar','Singapore','Tehran','Turkey','Other'];
    const LANGS = ['ar'];
    const PRAYER_IDS = ['fajr','dhuhr','asr','maghrib','isha'];
    const KNOWN = ['format','version','name','language','timezone','location','prayerMethod','versions','categories','subjects','week','rules','taskTags','course'];
    const errors = [], warnings = [];
    const bad = (code, path, detail) => { if (errors.length < 50) errors.push({code, path, detail}); };
    const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
    const isStr = (v, min, max) => typeof v === 'string' && v.length >= min && v.length <= max;
    const isNum = v => typeof v === 'number' && isFinite(v);
    const isInt = v => isNum(v) && Math.floor(v) === v;
    const digits = (t, n) => t.length === n && t.split('').every(c => c >= '0' && c <= '9');
    const isDate = v => {
      if (typeof v !== 'string' || v.length !== 10 || v[4] !== '-' || v[7] !== '-') return false;
      if (!digits(v.slice(0,4), 4) || !digits(v.slice(5,7), 2) || !digits(v.slice(8,10), 2)) return false;
      const y = Number(v.slice(0,4)), m = Number(v.slice(5,7)), d = Number(v.slice(8,10));
      const t = new Date(Date.UTC(y, m - 1, d));
      return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
    };
    const isMonthDay = v => typeof v === 'string' && v.length === 5 && v[2] === '-' && digits(v.slice(0,2), 2) && digits(v.slice(3,5), 2) && isDate('2024-' + v);
    const timeOk = v => {
      if (typeof v !== 'string' || v.length !== 5 || v[2] !== ':' || !digits(v.slice(0,2), 2) || !digits(v.slice(3,5), 2)) return null;
      const h = Number(v.slice(0,2)), m = Number(v.slice(3,5));
      return h <= 24 && m <= 59 ? h * 60 + m : null;
    };

    if (!isObj(obj)) { bad('not-settings', 'file', 'the file is not a settings object'); return {ok:false, errors, warnings, settings:null}; }
    if (obj.format !== 'mizan-settings') { bad('not-settings', 'format', 'format must be exactly "mizan-settings"'); return {ok:false, errors, warnings, settings:null}; }
    if (isInt(obj.version) && obj.version > 1) { bad('too-new', 'version', 'made for a newer version of the app'); return {ok:false, errors, warnings, settings:null}; }
    if (!isInt(obj.version) || obj.version < 1) bad('invalid', 'version', 'version must be the integer 1');

    if (obj.name !== undefined && !isStr(obj.name, 1, 60)) bad('invalid', 'name', 'name must be 1 to 60 characters');
    if (obj.language !== undefined && LANGS.indexOf(obj.language) < 0) bad('invalid', 'language', 'language must be one of: ' + LANGS.join(', '));
    if (obj.prayerMethod !== undefined && METHODS.indexOf(obj.prayerMethod) < 0) bad('invalid', 'prayerMethod', 'prayerMethod must be one of: ' + METHODS.join(', '));

    if (typeof obj.timezone !== 'string' || !obj.timezone) bad('invalid', 'timezone', 'timezone is required (an IANA name such as Africa/Cairo)');
    else { try { new Intl.DateTimeFormat('en', {timeZone: obj.timezone}); } catch (e) { bad('invalid', 'timezone', 'not a valid IANA time zone name'); } }

    const loc = obj.location;
    if (!isObj(loc)) bad('invalid', 'location', 'location is required: lat, lng, and an optional label');
    else {
      if (!isNum(loc.lat) || loc.lat < -90 || loc.lat > 90) bad('invalid', 'location.lat', 'lat must be a number from -90 to 90');
      if (!isNum(loc.lng) || loc.lng < -180 || loc.lng > 180) bad('invalid', 'location.lng', 'lng must be a number from -180 to 180');
      if (loc.label !== undefined && !isStr(loc.label, 1, 60)) bad('invalid', 'location.label', 'label must be 1 to 60 characters');
    }

    if (obj.versions !== undefined) {
      const v = obj.versions;
      if (!isObj(v)) bad('invalid', 'versions', 'versions must be an object');
      else {
        if (PRAYER_IDS.indexOf(v.prayer) < 0) bad('invalid', 'versions.prayer', 'prayer must be one of: ' + PRAYER_IDS.join(', '));
        if (!isInt(v.thresholdMinutes) || v.thresholdMinutes < 0 || v.thresholdMinutes > 1440) bad('invalid', 'versions.thresholdMinutes', 'thresholdMinutes must be a whole number from 0 to 1440');
        if (v.fallback !== undefined) {
          const f = v.fallback;
          if (!isObj(f) || !isMonthDay(f.lateFrom) || !(isMonthDay(f.lateUntil) || f.lateUntil === 'last-thursday-october')) bad('invalid', 'versions.fallback', 'fallback needs lateFrom as MM-DD and lateUntil as MM-DD or last-thursday-october');
        }
      }
    }

    const cats = isObj(obj.categories) ? obj.categories : null;
    if (!cats || !Object.keys(cats).length) bad('invalid', 'categories', 'categories is required with at least one category');
    else Object.keys(cats).forEach(k => {
      const c = cats[k];
      if (CATEGORY_IDS.indexOf(k) < 0 && !isNewKind(k)) bad('unknown-id', 'categories.' + k, 'unknown category id; allowed: ' + CATEGORY_IDS.join(', ') + ', or k1 to k12');
      else if (!isObj(c) || !isStr(c.label, 1, 30)) bad('invalid', 'categories.' + k + '.label', 'label must be 1 to 30 characters');
      else {
        if (c.long !== undefined && !isStr(c.long, 1, 60)) bad('invalid', 'categories.' + k + '.long', 'long must be 1 to 60 characters');
        if (c.track !== undefined && typeof c.track !== 'boolean') bad('invalid', 'categories.' + k + '.track', 'track must be true or false');
        // postpone: open blocks of this kind can be moved to free time; free: this kind's time can receive them
        if (c.postpone !== undefined && typeof c.postpone !== 'boolean') bad('invalid', 'categories.' + k + '.postpone', 'postpone must be true or false');
        if (c.free !== undefined && typeof c.free !== 'boolean') bad('invalid', 'categories.' + k + '.free', 'free must be true or false');
        if (!isNewKind(k)) {
          if (c.color !== undefined || c.side !== undefined) bad('invalid', 'categories.' + k + (c.color !== undefined ? '.color' : '.side'), 'a built-in category has no color or side');
        } else {
          if (KIND_COLORS.indexOf(c.color) < 0) bad('invalid', 'categories.' + k + '.color', 'color must be one of: ' + KIND_COLORS.join(', '));
          if (c.side !== undefined && c.side !== 'a' && c.side !== 'b') bad('invalid', 'categories.' + k + '.side', 'side must be a or b');
          if (Object.keys(cats).some(o => o !== k && isObj(cats[o]) && cats[o].label === c.label)) bad('invalid', 'categories.' + k + '.label', 'another category has this label');
        }
      }
    });

    let subs = null;
    if (obj.subjects !== undefined) {
      if (!isObj(obj.subjects)) bad('invalid', 'subjects', 'subjects must be an object');
      else {
        subs = obj.subjects;
        Object.keys(subs).forEach(k => {
          if (!isStr(k, 1, 8)) bad('invalid', 'subjects.' + k, 'subject id must be 1 to 8 characters');
          if (!isStr(subs[k], 1, 60)) bad('invalid', 'subjects.' + k, 'subject name must be 1 to 60 characters');
        });
      }
    }

    const checkBlocks = (list, path) => {
      if (!Array.isArray(list) || !list.length) { bad('invalid', path, 'blocks must be a non-empty list'); return; }
      let prev = -1;
      list.forEach((b, i) => {
        const at = path + '[' + i + ']';
        if (!Array.isArray(b) || b.length < 2 || b.length > 6) { bad('invalid', at, 'a block is [start, category, title, detail, subject, anchor] with 2 to 6 items'); return; }
        const t = timeOk(b[0]);
        if (t === null) bad('invalid', at + '.start', 'start must be HH:MM from 00:00 to 24:59');
        else { if (t <= prev) bad('invalid', at + '.start', 'blocks must be in ascending time order'); prev = t; }
        if (!cats || !Object.prototype.hasOwnProperty.call(cats, b[1])) bad('unknown-id', at + '.category', 'category is not defined in categories');
        if (!isStr(b[2], 1, 120)) bad('invalid', at + '.title', 'title must be 1 to 120 characters');
        if (b[3] !== undefined && !isStr(b[3], 0, 300)) bad('invalid', at + '.detail', 'detail must be at most 300 characters');
        if (b[4] !== undefined && b[4] !== '' && !(subs && Object.prototype.hasOwnProperty.call(subs, b[4]))) bad('unknown-id', at + '.subject', 'subject is not defined in subjects');
        if (b.length === 6) {
          // The sixth element ties the block to a prayer time: {prayer, dir, min}. The block's start stays as the fixed fallback time.
          const a = b[5], an = at + '.anchor';
          if (!isObj(a)) bad('invalid', an, 'anchor must be an object with prayer, dir and min');
          else {
            Object.keys(a).forEach(k => { if (k !== 'prayer' && k !== 'dir' && k !== 'min' && k !== 'absorb') bad('invalid', an + '.' + k, 'anchor has only prayer, dir, min and absorb'); });
            // absorb names, by its fixed start, the later block that takes this anchor's shift (before the next anchor)
            if (a.absorb !== undefined) {
              const ab = an + '.absorb';
              if (typeof a.absorb !== 'string' || !/^\d{2}:\d{2}$/.test(a.absorb) || timeOk(a.absorb) === null) bad('invalid', ab, 'absorb must be HH:MM');
              else {
                const j = list.findIndex(x => Array.isArray(x) && x[0] === a.absorb);
                const next = list.findIndex((x, q) => q > i && Array.isArray(x) && x.length === 6);
                if (j <= i) bad('invalid', ab, 'absorb must name the start of a later block on this day');
                else if (next >= 0 && j >= next) bad('invalid', ab, 'absorb must name a block before the next block tied to a prayer');
              }
            }
            if (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].indexOf(a.prayer) < 0) bad('invalid', an + '.prayer', 'prayer must be fajr, dhuhr, asr, maghrib or isha');
            if (a.dir !== 'before' && a.dir !== 'after') bad('invalid', an + '.dir', 'dir must be before or after');
            if (!Number.isInteger(a.min) || a.min < 0 || a.min > 180) bad('invalid', an + '.min', 'min must be a whole number from 0 to 180');
            if (i === 0 || i === list.length - 1) bad('invalid', an, 'the first and the last block of a day cannot be tied to a prayer');
          }
        }
      });
    };
    const week = isObj(obj.week) ? obj.week : null;
    if (!week || !Object.keys(week).length) bad('invalid', 'week', 'week is required with at least one day (keys 0 to 6)');
    else Object.keys(week).forEach(k => {
      const d = week[k], at = 'week.' + k;
      if (['0','1','2','3','4','5','6'].indexOf(k) < 0) { bad('invalid', at, 'day keys are 0 to 6'); return; }
      if (!isObj(d)) { bad('invalid', at, 'a day is an object with blocks'); return; }
      if (d.note !== undefined && !isStr(d.note, 0, 500)) bad('invalid', at + '.note', 'note must be at most 500 characters');
      if (Array.isArray(d.blocks)) checkBlocks(d.blocks, at + '.blocks');
      else if (isObj(d.blocks)) {
        Object.keys(d.blocks).forEach(v => { if (v !== 'A' && v !== 'B') bad('invalid', at + '.blocks.' + v, 'versions are named A and B'); else checkBlocks(d.blocks[v], at + '.blocks.' + v); });
        if (!d.blocks.A) bad('invalid', at + '.blocks.A', 'version A is required when using two versions');
      } else bad('invalid', at + '.blocks', 'blocks must be a list, or an object with A and B');
    });

    if (obj.rules !== undefined) {
      if (!Array.isArray(obj.rules) || obj.rules.length > 20) bad('invalid', 'rules', 'rules must be a list of at most 20 texts');
      else obj.rules.forEach((r, i) => { if (!isStr(r, 1, 300)) bad('invalid', 'rules[' + i + ']', 'each rule must be 1 to 300 characters'); });
    }
    if (obj.taskTags !== undefined) {
      if (!isObj(obj.taskTags)) bad('invalid', 'taskTags', 'taskTags must be an object');
      else Object.keys(obj.taskTags).forEach(k => {
        if (CATEGORY_IDS.indexOf(k) < 0) bad('unknown-id', 'taskTags.' + k, 'unknown category id');
        else if (!isStr(obj.taskTags[k], 1, 20)) bad('invalid', 'taskTags.' + k, 'tag must be 1 to 20 characters');
      });
    }
    if (obj.course !== undefined) {
      const c = obj.course;
      if (!isObj(c)) bad('invalid', 'course', 'course must be an object');
      else {
        if (!isStr(c.name, 1, 80)) bad('invalid', 'course.name', 'name must be 1 to 80 characters');
        if (c.sub !== undefined && !isStr(c.sub, 0, 160)) bad('invalid', 'course.sub', 'sub must be at most 160 characters');
        if (!Array.isArray(c.plan)) bad('invalid', 'course.plan', 'plan must be a list of weeks');
        else c.plan.forEach((w, i) => {
          const at = 'course.plan[' + i + ']';
          if (!isObj(w) || !isDate(w.from) || !isDate(w.to) || w.from > w.to) { bad('invalid', at, 'a week needs from and to as YYYY-MM-DD, with from not after to'); return; }
          if (!isStr(w.label, 1, 60)) bad('invalid', at + '.label', 'label must be 1 to 60 characters');
          if (w.note !== undefined && !isStr(w.note, 0, 300)) bad('invalid', at + '.note', 'note must be at most 300 characters');
          if (!Array.isArray(w.items) || !w.items.length) bad('invalid', at + '.items', 'items must be a non-empty list');
          else w.items.forEach((it, j) => {
            if (!Array.isArray(it) || it.length < 2 || it.length > 3 || !isStr(it[0], 1, 8) || !isStr(it[1], 1, 120) || (it[2] !== undefined && !isStr(it[2], 0, 60))) bad('invalid', at + '.items[' + j + ']', 'an item is [id, title, detail] with an id up to 8 characters');
          });
        });
      }
    }
    Object.keys(obj).forEach(k => { if (KNOWN.indexOf(k) < 0) warnings.push({code:'unknown-field', path:k, detail:'ignored'}); });

    if (errors.length) return {ok:false, errors, warnings, settings:null};
    const settings = JSON.parse(JSON.stringify(obj));
    if (settings.language === undefined) settings.language = 'ar';
    if (settings.prayerMethod === undefined) settings.prayerMethod = 'Egyptian';
    return {ok:true, errors, warnings, settings};
  }

