  /* ---------------- edit rules (pure; tools/check-edit.js runs this block) ---------------- */
  // start of edit rules
  const TASK_EDIT_KEYS = ['text', 'tag', 'due'];
  const APPT_EDIT_KEYS = ['label', 'day', 'time'];
  function validateTaskFields(f, tags){
    const text = String(f && f.text != null ? f.text : '').trim().slice(0, 140);
    if (!text) return {ok:false, error:'اكتب نص المهمة.'};
    const tag = f && f.tag;
    if (typeof tag !== 'string' || !Object.prototype.hasOwnProperty.call(tags, tag)) return {ok:false, error:'اختار النوع.'};
    const due = f && f.due ? String(f.due) : '';
    // A real calendar date: Date.parse alone accepts 2026-02-30 and rolls it over, so check that the parts round-trip.
    const realDate = s => { const [y, m, d] = s.split('-').map(Number), t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; };
    if (due && (!/^\d{4}-\d{2}-\d{2}$/.test(due) || !realDate(due))) return {ok:false, error:'التاريخ مش مظبوط.'};
    return {ok:true, value:{text, tag, due}};
  }
  function validateApptFields(f, days){
    const label = String(f && f.label != null ? f.label : '').trim().slice(0, 60);
    if (!label) return {ok:false, error:'اكتب اسم الميعاد.'};
    const time = f && f.time ? String(f.time) : '';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return {ok:false, error:'اختار الساعة.'};
    const day = Number(f && f.day);
    if (f == null || f.day === '' || f.day == null || !days.includes(day)) return {ok:false, error:'اختار اليوم.'};
    return {ok:true, value:{label, day, time}};
  }
  // Changes only the record with this id, and only the keys in allowedKeys. Returns a new list.
  function applyEdit(list, id, patch, allowedKeys){
    return list.map(r => {
      if (!r || r.id !== id) return r;
      const next = Object.assign({}, r);
      allowedKeys.forEach(k => { if (patch && Object.prototype.hasOwnProperty.call(patch, k)) next[k] = patch[k]; });
      return next;
    });
  }
  // Undo of one edit: puts the old values back into that record only; a record that is gone stays gone.
  function restoreFields(list, id, before, allowedKeys){
    return applyEdit(list, id, before, allowedKeys);
  }
  // end of edit rules

  /* ---------------- paste tasks from an AI (pure; tools/check-paste.js runs this block) ---------------- */
  // start of task paste
  // The fixed line format is  type | task text | due date  (due date optional). The AI is given buildAiPrompt's text;
  // the user pastes the answer; parseTaskLines turns it into proposed tasks and a list of lines it could not use.
  const PASTE_MAX_LINES = 50;
  function parseTaskLines(text, tags, existingTexts){
    const norm = s => String(s).trim().replace(/\s+/g, ' ').toLowerCase();
    const seen = new Set((existingTexts || []).map(norm));
    const ids = Object.keys(tags), probe = ids[0];
    const marker = /^(?:[-*•]|[0-9٠-٩]+[.)])\s*/;
    const items = [], rejected = [];
    let skipped = 0, candidates = 0, leftOut = 0;
    String(text == null ? '' : text).split(/\r\n|\r|\n/).forEach((raw, i) => {
      const n = i + 1;
      let line = raw.trim();
      if (!line || /^```[\w-]*$/.test(line)) { skipped++; return; }
      candidates++;
      if (candidates > PASTE_MAX_LINES) { leftOut++; return; }
      line = line.replace(marker, '');
      const parts = line.split('|');
      if (parts.length === 1) { rejected.push({n, raw, reason: 'no-separator'}); return; }
      if (parts.length > 3) { rejected.push({n, raw, reason: 'too-many-separators'}); return; }
      const typeRaw = parts[0].trim(), body = parts[1].trim(), due = (parts[2] || '').trim();
      if (!body) { rejected.push({n, raw, reason: 'empty-text'}); return; }
      if (body.length > 140) { rejected.push({n, raw, reason: 'too-long', length: body.length}); return; }
      // The text and a valid type are known to pass here, so only the date can fail the by-hand rules.
      if (due && probe !== undefined && !validateTaskFields({text: body, tag: probe, due}, tags).ok) { rejected.push({n, raw, reason: 'bad-date'}); return; }
      const want = norm(typeRaw);
      const tag = ids.find(k => k === want) || ids.find(k => norm(tags[k]) === want) || '';
      const key = norm(body), dupe = seen.has(key);
      seen.add(key);
      items.push({n, text: body, tag, due, dupe, include: !dupe && tag !== ''});
    });
    return {items, rejected, skipped, leftOut};
  }
  // The instruction text the user copies into any AI: the format, the user's own types, today's date, two examples.
  function buildAiPrompt(tags, todayIso){
    const ids = Object.keys(tags);
    const [y, m, d] = todayIso.split('-').map(Number), t = new Date(Date.UTC(y, m - 1, d + 7));
    const plus7 = t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0');
    const a = ids[0] || 'work', b = ids[1] || a;
    return [
      'قسّم المهمة الكبيرة اللي تحت لمهام فرعية صغيرة، وردّ بالمهام بس في كتلة كود واحدة، مهمة في كل سطر بالشكل ده بالظبط:',
      'النوع | نص المهمة | آخر ميعاد',
      '',
      '- النوع: واحد من دول بالظبط: ' + ids.map(k => k + ' (' + tags[k] + ')').join('، ') + '.',
      '- نص المهمة: جملة قصيرة، أقل من 140 حرف، من غير الرمز | جواها، وبنفس لغة المهمة الكبيرة.',
      '- آخر ميعاد: تاريخ بصيغة YYYY-MM-DD، أو سيبه فاضي لو مفيش. النهارده ' + todayIso + '.',
      '- من غير ترقيم، ومن غير عناوين، ومن غير أي شرح قبل الكتلة أو بعدها.',
      '',
      'مثال:',
      a + ' | حل شيت التمارين الأول | ' + plus7,
      b + ' | مراجعة المسودة |',
      '',
      'المهمة الكبيرة:',
      'اكتب مهمتك هنا'
    ].join('\n');
  }
  // Undo of one pasted batch: removes a batch task only while it is exactly as added (open, same text, type, date).
  // A task the user has ticked or edited since stays, and every other record is untouched. Returns a new list.
  function undoBatch(list, batch){
    const byId = new Map(batch.map(b => [b.id, b]));
    return list.filter(t => {
      const b = byId.get(t.id);
      return !(b && t.done === false && t.text === b.text && t.tag === b.tag && t.due === b.due);
    });
  }
  // end of task paste

  /* ---------------- workout log rules (pure; tools/check-workout.js runs this block) ---------------- */
  // start of workout rules
  // The workout log is its own record, kept under its own key. Nothing here knows about the progress store,
  // the schedule, tasks or settings, so nothing here can tick or change any of them.
  const STARTER_EXERCISES = [
    'Bench Press', 'Incline Bench Press', 'Dumbbell Bench Press', 'Chest Fly', 'Push-Up', 'Dips',
    'Overhead Press', 'Dumbbell Shoulder Press', 'Lateral Raise', 'Triceps Pushdown',
    'Barbell Row', 'Pull-Up', 'Lat Pulldown', 'Seated Cable Row', 'Face Pull',
    'Barbell Curl', 'Dumbbell Curl', 'Hammer Curl',
    'Squat', 'Front Squat', 'Leg Press', 'Lunge', 'Romanian Deadlift', 'Deadlift', 'Leg Extension', 'Leg Curl', 'Hip Thrust', 'Calf Raise',
    'Plank', 'Crunch'
  ].map(name => ({id: 's-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name}));
  const EMPTY_WORKOUTS = () => ({v: 1, custom: [], routines: [], workouts: [], current: null, prefs: {restSeconds: 90, sound: true}});
  // Digits typed on an Arabic keyboard are accepted; "." "," and the Arabic decimal mark are the decimal mark.
  function parseNumber(text){
    let s = String(text == null ? '' : text).trim();
    s = s.replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x06F0));
    s = s.replace(/[,٫]/g, '.');
    return /^(\d+\.?\d*|\.\d+)$/.test(s) ? Number(s) : NaN;
  }
  // A set: weight in kilograms 0 to 999.9, repetitions a whole number 1 to 999. w and r may be typed text or numbers.
  function validateSet(f){
    const blank = v => v == null || (typeof v === 'string' && !v.trim());
    if (!f || blank(f.w)) return {ok: false, field: 'w', error: 'اكتب الوزن'};
    if (blank(f.r)) return {ok: false, field: 'r', error: 'اكتب التكرارات'};
    const w = typeof f.w === 'number' ? f.w : parseNumber(f.w), r = typeof f.r === 'number' ? f.r : parseNumber(f.r);
    if (!(w >= 0 && w <= 999.9)) return {ok: false, field: 'w', error: 'الوزن من 0 لـ 999.9'};
    if (!Number.isInteger(r) || r < 1 || r > 999) return {ok: false, field: 'r', error: 'التكرارات من 1 لـ 999'};
    return {ok: true, value: {w: Math.round(w * 100) / 100, r}};
  }
  const normName = n => String(n == null ? '' : n).trim().replace(/\s+/g, ' ').toLowerCase();
  const isNameTaken = (name, list, exceptId) => list.some(x => x.id !== exceptId && normName(x.name) === normName(name));
  const elapsedMs = (startedAt, now) => Math.max(0, now - startedAt) || 0;
  // Milliseconds left in a rest (negative once it is over), or null when no rest is running.
  const restLeft = (rest, now) => rest ? rest.startedAt + rest.seconds * 1000 - now : null;
  function formatClock(ms){
    const t = Math.floor(Math.abs(ms) / 1000), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
    const body = h ? h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') : m + ':' + String(s).padStart(2, '0');
    return (ms < 0 ? '+' : '') + body;
  }
  // A countdown shows the whole second that is still left (0:01 until it ends); once over it counts up with a plus.
  const restLabel = left => left > 0 ? formatClock(Math.ceil(left / 1000) * 1000) : '+' + formatClock(-left);

  // The sets of this exercise in the most recent finished workout that started before beforeTs, in set order.
  function previousSets(workouts, exId, beforeTs){
    let best = null;
    workouts.forEach(w => { if (w.startedAt < beforeTs && w.exercises.some(e => e.exId === exId) && (!best || w.startedAt >= best.startedAt)) best = w; });
    if (!best) return [];
    const sets = [];
    best.exercises.forEach(e => { if (e.exId === exId) e.sets.forEach(s => sets.push(s)); });
    return sets.map(s => ({w: s.w, r: s.r}));
  }
  // Records over the whole history, never stored. A set is a record when it is strictly above every earlier set of
  // that exercise (earlier workouts, and earlier sets of the same workout); an exercise's first workout has none.
  // flags is keyed "workoutId:exerciseIndex:setIndex" and holds {weight, reps}.
  function computeRecords(workouts){
    const order = workouts.map((w, i) => ({w, i})).sort((a, b) => a.w.startedAt - b.w.startedAt || a.i - b.i).map(x => x.w);
    const state = {}, perExercise = {}, flags = {};
    order.forEach(wo => {
      const touched = new Set();
      wo.exercises.forEach((e, ei) => {
        const st = state[e.exId] || (state[e.exId] = {seen: false, maxW: -Infinity, maxR: -Infinity});
        const first = !st.seen, pe = perExercise[e.exId] || (perExercise[e.exId] = {bestWeight: null, bestReps: null});
        e.sets.forEach((s, si) => {
          if (!first) {
            const weight = s.w > st.maxW, reps = s.r > st.maxR;
            if (weight || reps) flags[wo.id + ':' + ei + ':' + si] = {weight, reps};
          }
          if (s.w > st.maxW) { st.maxW = s.w; pe.bestWeight = {value: s.w, date: wo.startedAt, workoutId: wo.id}; }
          if (s.r > st.maxR) { st.maxR = s.r; pe.bestReps = {value: s.r, date: wo.startedAt, workoutId: wo.id}; }
        });
        touched.add(e.exId);
      });
      touched.forEach(id => { state[id].seen = true; });
    });
    return {perExercise, flags};
  }
  // The best set of an exercise in one workout: the highest weight, and on a tie the higher repetitions.
  function bestSet(sets){
    let b = null;
    sets.forEach(s => { if (!b || s.w > b.w || (s.w === b.w && s.r > b.r)) b = s; });
    return b ? {w: b.w, r: b.r} : null;
  }
  // Total weight lifted: the sum of weight times repetitions (kept to two decimals).
  const volumeOf = sets => Math.round(sets.reduce((n, s) => n + s.w * s.r, 0) * 100) / 100;
  // How many sets of this workout are records (by weight, by repetitions, or both count once).
  function recordCount(workout, flags){
    let n = 0;
    workout.exercises.forEach((e, ei) => e.sets.forEach((s, si) => { const f = flags[workout.id + ':' + ei + ':' + si]; if (f && (f.weight || f.reps)) n++; }));
    return n;
  }
  // Finishing keeps only done sets, drops exercises left with none, and needs at least one done set.
  // names maps an exercise id to the name saved with the workout.
  function finishWorkout(current, now, names){
    let dropped = 0;
    const exercises = [];
    current.exercises.forEach(e => {
      const sets = [];
      e.sets.forEach(s => {
        const v = s.done ? validateSet(s) : {ok: false};
        if (v.ok) sets.push(v.value); else dropped++;
      });
      if (sets.length) exercises.push({exId: e.exId, name: (names && names[e.exId]) || e.exId, sets});
    });
    if (!exercises.length) return {ok: false, dropped, error: 'سجّل مجموعة واحدة على الأقل'};
    const workout = {id: current.id, startedAt: current.startedAt, endedAt: Math.max(now, current.startedAt), exercises};
    if (current.routineName) workout.routineName = current.routineName;
    return {ok: true, workout, dropped};
  }
  // A routine plans 1 to 20 sets per exercise; anything else counts as 1.
  const clampSets = n => Number.isInteger(n) && n >= 1 ? Math.min(20, n) : 1;
  // A routine's name: 1 to 40 characters after trimming, unique ignoring case.
  function validateRoutineName(name, routines, exceptId){
    const nm = String(name == null ? '' : name).trim().replace(/\s+/g, ' ');
    if (!nm) return {ok: false, error: 'اكتب اسم السبليت'};
    if (nm.length > 40) return {ok: false, error: 'الاسم لحد 40 حرف'};
    if (isNameTaken(nm, routines, exceptId)) return {ok: false, error: 'فيه سبليت بالاسم ده'};
    return {ok: true, value: nm};
  }
  // When a routine was last used: the latest finished workout saved with its name (a renamed routine starts afresh).
  function routineLastUsed(name, workouts){
    let t = null;
    workouts.forEach(w => { if (w.routineName === name && (t === null || w.startedAt > t)) t = w.startedAt; });
    return t;
  }
  // A new open workout holding the routine's exercises in order, each with its planned number of empty sets;
  // the routine is not changed.
  function startFromRoutine(routine, exercisesById, now, uid){
    return {id: uid(), startedAt: now, routineId: routine.id, routineName: routine.name, rest: null,
      exercises: routine.exIds.map((exId, i) => ({exId, n: clampSets(routine.sets ? routine.sets[i] : 1)})).filter(x => exercisesById[x.exId])
        .map(x => ({exId: x.exId, sets: Array.from({length: x.n}, () => ({w: '', r: '', done: false}))}))};
  }
  // An exercise with history, or one used by a routine, can not be deleted; starter exercises never.
  function canDeleteExercise(exId, workouts, routines){
    if (String(exId).indexOf('s-') === 0) return {ok: false, reason: 'starter'};
    if (workouts.some(w => w.exercises.some(e => e.exId === exId))) return {ok: false, reason: 'history'};
    const r = routines.find(x => x.exIds.indexOf(exId) >= 0);
    return r ? {ok: false, reason: 'routine', routineName: r.name} : {ok: true};
  }
  // Deleting a finished workout returns the new list, the removed workout and where it was, so an undo can put it back.
  function removeWorkout(workouts, id){
    const index = workouts.findIndex(w => w.id === id);
    if (index < 0) return {workouts: workouts.slice(), removed: null, index: -1};
    return {workouts: workouts.slice(0, index).concat(workouts.slice(index + 1)), removed: workouts[index], index};
  }
  // Puts a removed workout back in its place; a workout whose id is already there is not added twice.
  function putBackWorkout(workouts, w, index){
    if (!w || workouts.some(x => x.id === w.id)) return workouts.slice();
    const i = Math.max(0, Math.min(workouts.length, index | 0));
    return workouts.slice(0, i).concat([w], workouts.slice(i));
  }
  // Corrects one set of a finished workout with the same limits as logging; returns a copy, the input is not changed.
  function correctSet(workout, ei, si, fields){
    const e = workout && workout.exercises[ei];
    if (!e || !e.sets[si]) return {ok: false, field: 'w', error: 'المجموعة دي مش موجودة'};
    const v = validateSet(fields);
    if (!v.ok) return v;
    const copy = JSON.parse(JSON.stringify(workout));
    copy.exercises[ei].sets[si] = v.value;
    return {ok: true, workout: copy};
  }
  // Turns whatever was stored (text, parsed, missing, damaged) into a valid root; never throws.
  // tooNew is true when the data was written by a newer app: the caller must then not overwrite it.
  function normalizeRoot(raw){
    let v = raw;
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch(e){ v = null; } }
    const root = EMPTY_WORKOUTS();
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {root, tooNew: false};
    if (typeof v.v === 'number' && v.v > 1) return {root, tooNew: true};
    const str = (x, max) => typeof x === 'string' && x.trim().length >= 1 && x.trim().length <= max;
    const num = x => typeof x === 'number' && Number.isFinite(x);
    const sets = a => Array.isArray(a) ? a.filter(s => s && num(s.w) && num(s.r)).map(s => ({w: s.w, r: s.r})) : [];
    if (Array.isArray(v.custom)) root.custom = v.custom.filter(x => x && str(x.id, 60) && str(x.name, 60)).map(x => ({id: x.id, name: x.name.trim()}));
    if (Array.isArray(v.routines)) root.routines = v.routines.filter(x => x && str(x.id, 60) && str(x.name, 40) && Array.isArray(x.exIds)).map(x => {
      const exIds = [], counts = [];
      x.exIds.forEach((id, i) => { if (typeof id === 'string' && exIds.indexOf(id) < 0 && exIds.length < 40) { exIds.push(id); counts.push(clampSets(Array.isArray(x.sets) ? x.sets[i] : 1)); } });
      return {id: x.id, name: x.name.trim(), exIds, sets: counts};
    });
    if (Array.isArray(v.workouts)) root.workouts = v.workouts.filter(w => w && str(w.id, 60) && num(w.startedAt) && num(w.endedAt) && Array.isArray(w.exercises)).map(w => {
      const o = {id: w.id, startedAt: w.startedAt, endedAt: Math.max(w.endedAt, w.startedAt), exercises: w.exercises.filter(e => e && typeof e.exId === 'string').map(e => ({exId: e.exId, name: typeof e.name === 'string' ? e.name : e.exId, sets: sets(e.sets)})).filter(e => e.sets.length)};
      if (typeof w.routineName === 'string') o.routineName = w.routineName;
      return o;
    }).filter(w => w.exercises.length);
    const c = v.current;
    if (c && typeof c === 'object' && str(c.id, 60) && num(c.startedAt) && Array.isArray(c.exercises)) {
      root.current = {id: c.id, startedAt: c.startedAt, rest: null,
        exercises: c.exercises.filter(e => e && typeof e.exId === 'string' && Array.isArray(e.sets)).map(e => ({exId: e.exId, sets: e.sets.filter(s => s && typeof s === 'object').map(s => ({w: num(s.w) || typeof s.w === 'string' ? s.w : '', r: num(s.r) || typeof s.r === 'string' ? s.r : '', done: s.done === true}))}))};
      if (typeof c.routineId === 'string') root.current.routineId = c.routineId;
      if (typeof c.routineName === 'string') root.current.routineName = c.routineName;
      const r = c.rest;
      if (r && num(r.startedAt) && num(r.seconds) && r.seconds > 0) {
        root.current.rest = {startedAt: r.startedAt, seconds: r.seconds, alerted: r.alerted === true};
        // which set the rest row sits under
        if (Number.isInteger(r.ei) && Number.isInteger(r.si) && r.ei >= 0 && r.si >= 0) { root.current.rest.ei = r.ei; root.current.rest.si = r.si; }
      }
    }
    const p = v.prefs;
    if (p && typeof p === 'object') {
      if (num(p.restSeconds)) root.prefs.restSeconds = Math.min(600, Math.max(10, Math.round(p.restSeconds)));
      if (typeof p.sound === 'boolean') root.prefs.sound = p.sound;
    }
    return {root, tooNew: false};
  }
  // end of workout rules

  // start of backup rules
  // One plain file the owner keeps: a marker, a format version, when it was made, a checksum, and the three parts.
  // Nothing here touches storage, the page or the network; the caller passes the app's own normalisers in, so a
  // backup is read with the same rules as the data it replaces. Marks are carried exactly as they are, never made.
  const BACKUP_FORMAT = 'mizan-backup';
  const BACKUP_VERSION = 1;
  const BACKUP_MAX_BYTES = 5 * 1024 * 1024;
  // dateIso is today's date in the app's time zone (the caller knows it); the name holds nothing else.
  function makeBackup(parts, now, dateIso){
    const data = {progress: parts.progress, workouts: parts.workouts, settings: parts.settings || null};
    const file = {format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: new Date(now).toISOString(), checksum: fnv1a(JSON.stringify(data)), data};
    return {text: JSON.stringify(file), name: 'mizan-backup-' + dateIso + '.json'};
  }
  // Returns {ok: false, code} or {ok: true, parts, preview}; never throws. Codes: empty, not-json, settings-file,
  // not-backup, too-new, damaged.
  function readBackup(text, deps){
    try {
      if (typeof text !== 'string' || !text.trim()) return {ok: false, code: 'empty'};
      let f;
      // A half-downloaded or cut backup no longer parses but still carries the marker: that is damage, not a foreign file.
      try { f = JSON.parse(text); } catch(e){ return {ok: false, code: /"format"\s*:\s*"mizan-backup"/.test(text) ? 'damaged' : 'not-json'}; }
      const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
      if (!isObj(f)) return {ok: false, code: 'not-backup'};
      if (f.format === 'mizan-settings') return {ok: false, code: 'settings-file'};
      if (f.format !== BACKUP_FORMAT) return {ok: false, code: 'not-backup'};
      if (!Number.isInteger(f.version) || f.version < 1) return {ok: false, code: 'damaged'};
      if (f.version > BACKUP_VERSION) return {ok: false, code: 'too-new'};
      const d = f.data;
      if (typeof f.createdAt !== 'string' || Number.isNaN(Date.parse(f.createdAt))) return {ok: false, code: 'damaged'};
      if (!isObj(d) || !isObj(d.progress) || !isObj(d.workouts) || !(d.settings === null || isObj(d.settings))) return {ok: false, code: 'damaged'};
      if (typeof f.checksum !== 'string' || f.checksum !== fnv1a(JSON.stringify(d))) return {ok: false, code: 'damaged'};
      const w = deps.normalizeRoot(d.workouts);
      if (w.tooNew) return {ok: false, code: 'too-new'};
      const progress = deps.normalize(d.progress);
      let settings = null, settingsValid = 'none';
      if (d.settings !== null) {
        let r = null;
        try { r = deps.validateSettings(d.settings); } catch(e){ r = null; }
        if (r && r.ok) { settings = r.settings; settingsValid = 'valid'; } else settingsValid = 'invalid';
      }
      const workouts = w.root;
      const preview = {createdAt: f.createdAt, tasks: progress.tasks.length, appts: progress.appts.length, courses: progress.courses.length,
        tickDays: Object.keys(progress.checks).length, workouts: workouts.workouts.length, openWorkout: !!workouts.current, settings: settingsValid};
      return {ok: true, parts: {progress, workouts, settings, settingsValid}, preview};
    } catch(e){ return {ok: false, code: 'damaged'}; }
  }
  // end of backup rules

  // start of postpone rules
  // Finding a place for what was not done. A day is given as its blocks and its extra blocks, in minutes since
  // midnight ({s, e, cat, title}); free time is the blocks of a free kind, minus the time any extra block takes.
  // Nothing here touches storage, the page or the network, and nothing here can mark anything done.
  function freeStretches(blocks, extras, isFree, from){
    const merged = [];
    blocks.filter(b => !b.extra && isFree(b.cat)).map(b => [Math.max(b.s, from || 0), b.e]).filter(r => r[1] > r[0])
      .sort((p, q) => p[0] - q[0]).forEach(r => { const l = merged[merged.length - 1]; if (l && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else merged.push(r.slice()); });
    return extras.reduce((list, x) => list.reduce((out, r) => {
      if (x.e <= r[0] || x.s >= r[1]) out.push(r);
      else { if (x.s > r[0]) out.push([r[0], x.s]); if (x.e < r[1]) out.push([x.e, r[1]]); }
      return out;
    }, []), merged);
  }
  // items: [{len}] in order; days: [{iso, blocks, extras, from}] in order. Each item goes to the start of the earliest
  // stretch that holds it, on the first day that has one; placed items are taken for the ones after.
  function proposePlaces(items, days, isFree){
    const taken = {};
    return items.map(it => {
      for (const d of days) {
        const st = freeStretches(d.blocks, d.extras.concat(taken[d.iso] || []), isFree, d.from);
        const hit = st.find(r => r[1] - r[0] >= it.len);
        if (hit) { const p = {iso: d.iso, s: hit[0], e: hit[0] + it.len}; (taken[d.iso] = taken[d.iso] || []).push(p); return p; }
      }
      return null;
    });
  }
  // A place the user picked: it must start on the day, end by END, and not overlap a tracked block or an extra.
  function checkManualPlace(blocks, extras, s, len, START, END, isTracked){
    if (!Number.isFinite(s) || !(len > 0) || s < START) return {ok: false, code: 'none'};
    const e = s + len;
    if (e > END) return {ok: false, code: 'late'};
    const clash = blocks.filter(b => !b.extra && isTracked(b.cat)).concat(extras).find(b => s < b.e && e > b.s);
    return clash ? {ok: false, code: 'clash', title: clash.title} : {ok: true, e};
  }
  // The ended days to ask about, oldest first: from the day after the last one answered, at most 7 days back, up to
  // yesterday. With none answered yet, only yesterday. addDays comes in so that this block runs on its own.
  function daysToAsk(today, askedUpTo, addDays){
    const last = addDays(today, -1), first = addDays(today, -7);
    if (askedUpTo === null || askedUpTo === undefined) return [last];
    if (typeof askedUpTo !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(askedUpTo)) return [];
    const days = [];
    for (let d = askedUpTo < first ? first : addDays(askedUpTo, 1); d <= last; d = addDays(d, 1)) days.push(d);
    return days;
  }
  // end of postpone rules

  // start of guide rules
  // Pure checks for exercise drawings downloaded from the app's own site (feature 011). No storage, no page and
  // no network here; tools/check-guides.js runs this block.
  const GUIDE_PATH = 'tools/vendor/workout-guide/frames/';
  function guideUrl(slug){
    return typeof slug === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? GUIDE_PATH + slug + '.json.gz' : null;
  }
  // Three SVG images, each under 1 MB, with no scripts, no event handlers and no links outside the drawing.
  function checkGuideFrames(frames){
    if (!Array.isArray(frames) || frames.length !== 3) return {ok: false};
    for (const f of frames) {
      if (typeof f !== 'string' || f.length > 1048576 || !/^\s*<svg[\s>]/.test(f)) return {ok: false};
      if (/<script|<foreignObject|<iframe|<embed|<object|\son[a-z]+\s*=|javascript:/i.test(f)) return {ok: false};
      for (const m of f.matchAll(/\s(?:xlink:)?href\s*=\s*(["'])(.*?)\1/gi)) if (!/^#[\w.:-]+$/.test(m[2])) return {ok: false};
      if (/url\(\s*["']?(?!#)/i.test(f) || /@import/i.test(f)) return {ok: false};
    }
    return {ok: true};
  }
  // end of guide rules

