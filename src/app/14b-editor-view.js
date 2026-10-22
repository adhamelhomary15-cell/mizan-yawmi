  /* ---------------- schedule editor (the rules are in the "schedule rules" block) ---------------- */
  // Works on a draft; nothing is stored before «احفظ الجدول». The draft lives here, outside the screen, so moving to
  // another tab and back keeps it; a reload or a closed page asks first while there are unsaved changes.
  let editorSession = null;   // {original, draft, savedAt}
  const storedSavedAt = () => { const c = openEnvelope(readRaw(STORE_KEYS.settings), 'settings'); return c.ok ? c.savedAt : null; };
  // draft: what to start from (the guide's new week); without it, the current schedule. The summary compares with the
  // current schedule either way.
  function openEditor(draft){
    const original = draftOf(storedData('settings') || CFG);
    editorSession = {original, draft: draftOf(draft || original), savedAt: storedSavedAt()};
  }
  // What a save stores (feature 020): next, with the week in use until yesterday kept for the days before today.
  function settingsToSave(next, fromExample){
    const today = effectiveNow().iso;
    return withHistory(storedData('settings'), next, {today, yesterday: addDays(today, -1), cutoff: addDays(today, -365)}, fromExample);
  }
  const editorDirty = () => !!editorSession && JSON.stringify(editorSession.draft) !== JSON.stringify(editorSession.original);
  addEventListener('beforeunload', e => { if (editorDirty()) { e.preventDefault(); e.returnValue = ''; } });

  // The time field shows 00:00–23:59; a block after midnight is stored as 24:00–24:59, as the settings expect.
  const toField = t => (Number(t.slice(0, 2)) >= 24 ? pad(Number(t.slice(0, 2)) - 24) + t.slice(2) : t);
  // The draft's day, or the app's while the draft's is not valid yet (feature 018).
  const boundsOf = draft => dayBounds(draft.day) || {start: START, end: END};
  const fromField = (t, b) => (t && toMin(t) < b.start ? pad(Number(t.slice(0, 2)) + 24) + t.slice(2) : t);
  const kindOf = (draft, id) => Object.assign({}, DEFAULT_CATS[id], (draft.categories || {})[id]);
  // The built-in kinds, then the ones the user added, by number.
  const draftKinds = draft => Object.keys(DEFAULT_CATS).concat(Object.keys(draft.categories || {}).filter(k => /^k\d+$/.test(k)).sort((a, b) => a.slice(1) - b.slice(1)));
  const KIND_COLOR_NAMES = {teal: 'تركواز', blue: 'أزرق', green: 'أخضر', slate: 'رمادي', copper: 'نحاسي', olive: 'زيتوني'};
  // Days in the app's week order, as one phrase: «السبت والتلات».
  const daysPhrase = days => { const n = WEEK_ORDER.filter(d => days.includes(String(d))).map(d => DAY_NAMES[d]); return n.length > 1 ? n.slice(0, -1).join('، ') + ' و' + n[n.length - 1] : n.join(''); };
  // The next date (from today) that falls on a weekday, for the preview's prayer times.
  function nextDateOf(day){ const today = effectiveNow().iso; return addDays(today, (Number(day) - weekday(today) + 7) % 7); }
  const REFUSALS = {
    'same-start': 'فيه بلوك تاني بيبدأ في نفس الوقت.', 'last-block': 'اليوم لازم يفضل فيه بلوك واحد على الأقل.',
    'two-versions': 'اليوم ده ليه نسختين من ملف الإعدادات، عدّله من الملف.', 'no-block': 'البلوك ده مش موجود.'
  };
  // validateSettings speaks English for files; the editor says the same in Egyptian Arabic, on the line it is about.
  const SAY = [
    [/ascending time order/, 'الوقت لازم يبقى بعد البلوك اللي قبله، ومينفعش بلوكين في نفس الوقت'],
    [/start must be HH:MM from 03:00/, 'يومك لازم يبدأ من 3 الصبح لـ 12 الضهر'],
    [/end must be HH:MM from 20:00/, 'يومك لازم يخلص من 8 بالليل لحد 5 الصبح اليوم اللي بعده'],
    [/at most 24 hours/, 'يومك مينفعش يبقى أطول من 24 ساعة'],
    [/start must be HH:MM/, 'الوقت مش مظبوط'],
    [/title must be/, 'العنوان لازم يبقى من حرف لـ 120 حرف'],
    [/detail must be/, 'التفاصيل أطول من 300 حرف'],
    [/subject is not defined/, 'المادة دي مش موجودة في المواد'],
    [/category is not defined/, 'النوع ده مش موجود'],
    [/first and the last block/, 'أول وآخر بلوك في اليوم مينفعش يتربطوا بالصلاة'],
    [/absorb/, 'البلوك اللي بياخد فرق الصلاة اتشال أو بقى بعد صلاة تانية؛ صلّحه من الملف أو شيل الربط'],
    [/min must be/, 'الدقايق لازم تبقى من 0 لـ 180'],
    [/label must be/, 'اسم النوع لازم يبقى من حرف لـ 30 حرف'],
    [/long must be/, 'الاسم الطويل لازم يبقى من حرف لـ 60 حرف'],
    [/another category has this label/, 'فيه نوع تاني بنفس الاسم'],
    [/subject name must be/, 'اسم المادة لازم يبقى من حرف لـ 60 حرف']
  ];
  function explain(err, draft){
    const day = boundsOf(draft);
    const said = err.detail === 'start is outside the day' ? 'الوقت ده برّه يومك (من ' + fmtStr(day.start) + ' لحد ' + fmtStr(day.end) + ')'
      : (SAY.find(([re]) => re.test(err.detail)) || [null, err.detail])[1];
    const m = err.path.match(/^week\.(\d)\.blocks(?:\.([AB]))?\[(\d+)\]/);
    if (!m) return said;
    const blocks = (draft.week[m[1]] || {}).blocks || [], b = (m[2] ? blocks[m[2]] || [] : blocks)[Number(m[3])];
    return DAY_NAMES[m[1]] + '، البلوك ' + (Number(m[3]) + 1) + (Array.isArray(b) ? ' (' + toField(b[0]) + ' ' + b[2] + ')' : '') + ': ' + said;
  }

  function BlockForm({draft, day, index, onDone, onCancel}){
    const old = index === null ? null : draft.week[day].blocks[index];
    const bounds = boundsOf(draft), list = draft.week[day].blocks, lastStart = list.length ? list[list.length - 1][0] : minToHM(bounds.start);
    const [f, setF] = useState(() => old
      ? {start: toField(old[0]), kind: old[1], title: old[2], detail: old[3] || '', subject: old[4] || '', tie: !!old[5], anchor: Object.assign({prayer: 'maghrib', dir: 'before', min: 30}, old[5] || {})}
      : {start: toField(minToHM(Math.min(toMin(lastStart) + 60, bounds.end - 1))), kind: 'study', title: '', detail: '', subject: '', tie: false, anchor: {prayer: 'maghrib', dir: 'before', min: 30}});
    const [err, setErr] = useState('');
    // each change starts from the latest form, so quick changes (or autofill) never undo each other
    const set = k => e => { const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value; setF(p => Object.assign({}, p, {[k]: v})); };
    const setTie = k => e => { const v = k === 'min' ? Number(e.target.value) : e.target.value; setF(p => Object.assign({}, p, {anchor: Object.assign({}, p.anchor, {[k]: v})})); };
    const done = () => {
      if (!f.title.trim()) { setErr('اكتب عنوان للبلوك.'); return; }
      let d = draft.categories && draft.categories[f.kind] ? draft : setKind(draft, f.kind, kindOf(draft, f.kind));
      const fields = {start: fromField(f.start, bounds), kind: f.kind, title: f.title.trim(), detail: f.detail.trim(), subject: f.subject};
      let r = index === null ? addBlock(d, day, fields) : setBlock(d, day, index, fields);
      if (r.ok) {
        const i = r.draft.week[day].blocks.findIndex(b => b[0] === fields.start);
        r = setAnchor(r.draft, day, i, f.tie ? {prayer: f.anchor.prayer, dir: f.anchor.dir, min: f.anchor.min} : null);
      }
      if (!r.ok) { setErr(REFUSALS[r.code] || r.code); return; }
      onDone(r.draft);
    };
    const remove = () => { const r = removeBlock(draft, day, index); if (!r.ok) setErr(REFUSALS[r.code]); else onDone(r.draft); };
    const absorb = old && old[5] && old[5].absorb;
    return html`<div class="panel form ed-form" role="group" aria-label=${index === null ? 'بلوك جديد' : 'تعديل البلوك'}>
      <div class="form-row">
        <label class="field narrow" for="ed-start">الوقت<input id="ed-start" type="time" dir="ltr" value=${f.start} onInput=${set('start')} /></label>
        <label class="field" for="ed-kind">النوع<select id="ed-kind" value=${f.kind} onChange=${set('kind')}>${draftKinds(draft).map(k => html`<option value=${k}>${kindOf(draft, k).label}</option>`)}</select></label>
      </div>
      <label class="field wide" for="ed-title">العنوان<input id="ed-title" value=${f.title} maxlength="120" onInput=${set('title')} /></label>
      <div class="form-row">
        <label class="field" for="ed-detail">تفاصيل (اختياري)<input id="ed-detail" value=${f.detail} maxlength="300" onInput=${set('detail')} /></label>
        <label class="field" for="ed-subject">المادة<select id="ed-subject" value=${f.subject} onChange=${set('subject')}><option value="">من غير مادة</option>${Object.keys(draft.subjects || {}).map(id => html`<option value=${id}>${draft.subjects[id]}</option>`)}</select></label>
      </div>
      <label class="check-line"><input type="checkbox" checked=${f.tie} onChange=${set('tie')} /> اربطه بالصلاة</label>
      ${f.tie ? html`<div class="form-row">
        <label class="field" for="ed-dir">قبل ولا بعد<select id="ed-dir" value=${f.anchor.dir} onChange=${setTie('dir')}><option value="before">قبل</option><option value="after">بعد</option></select></label>
        <label class="field" for="ed-prayer">الصلاة<select id="ed-prayer" value=${f.anchor.prayer} onChange=${setTie('prayer')}>${PRAYERS.map(([k, n]) => html`<option value=${k}>${n}</option>`)}</select></label>
        <label class="field narrow" for="ed-min">بكام دقيقة<input id="ed-min" type="number" inputmode="numeric" min="0" max="180" dir="ltr" value=${f.anchor.min} onInput=${setTie('min')} /></label>
        <p class="small muted wide">البلوك هيمشي مع ميعاد الصلاة طول السنة.${absorb ? ' والبلوك اللي بيبدأ ' + toField(absorb) + ' هو اللي بياخد الفرق.' : ''}</p>
      </div>` : null}
      ${err ? html`<p class="form-err" role="alert">${err}</p>` : null}
      <span class="backup-act"><button type="button" class="btn primary" onClick=${done}>تمام</button>${index === null ? null : html`<button type="button" class="btn danger" onClick=${remove}>امسح البلوك</button>`}<button type="button" class="btn ghost" onClick=${onCancel}>لأ</button></span>
    </div>`;
  }

  function DayPreview({draft, day}){
    const list = draft.week[day].blocks, two = !Array.isArray(list);
    const bounds = boundsOf(draft), lay = layoutDay(two ? list.A : list, prayerTimesFor(draft, nextDateOf(day)), bounds.start, bounds.end);
    return html`<div class="ed-preview" aria-label="شكل اليوم">
      ${lay.notice ? html`<p class="small" role="status">${ANCHOR_NOTICES[lay.notice]}</p>` : null}
      ${lay.blocks.map(b => html`<p class="small" key=${b.key}><bdi class="num">${fmtStr(b.s)}</bdi> – <bdi class="num">${fmtStr(b.e)}</bdi> · ${kindOf(draft, b.cat).label} · <bdi>${b.title}</bdi></p>`)}
    </div>`;
  }

  function KindsPart({draft, onChange}){
    const [said, setSaid] = useState(null);   // {id, text}: a refused delete, under its kind
    const set = (id, k, v) => onChange(d => setKind(d, id, Object.assign(kindOf(d, id), {[k]: v})));
    const ids = draftKinds(draft), added = ids.filter(k => !DEFAULT_CATS[k]);
    const add = () => onChange(d => {
      const used = Object.values(d.categories || {}).map(c => c.color);
      const color = Object.keys(KIND_COLOR_NAMES).find(c => !used.includes(c)) || 'teal';
      let n = added.length + 1, r;
      do { r = addKind(d, {label: 'نوع جديد ' + n++, color, track: true}); } while (r.code === 'same-name');
      return r.ok ? r.draft : d;
    });
    const remove = id => {
      const r = removeKind(draft, id);
      if (r.ok) { setSaid(null); onChange(r.draft); } else setSaid({id, text: 'مستخدم يوم ' + daysPhrase(r.days) + '. شيل البلوكات دي أو غيّر نوعها الأول.'});
    };
    return html`<details class="panel ed-part"><summary>الأنواع</summary>
      ${ids.map(id => { const c = kindOf(draft, id), own = !DEFAULT_CATS[id]; return html`<div class="form ed-kind" key=${id}>
        <div class="form-row">
          <label class="field" for=${'kl-' + id}>الاسم<input id=${'kl-' + id} value=${c.label} maxlength="30" onInput=${e => set(id, 'label', e.target.value)} /></label>
          <label class="field" for=${'kn-' + id}>الاسم الطويل<input id=${'kn-' + id} value=${c.long || ''} maxlength="60" onInput=${e => set(id, 'long', e.target.value)} /></label>
        </div>
        <span class="ed-flags">
          <label class="check-line"><input type="checkbox" checked=${!!c.track} onChange=${e => set(id, 'track', e.target.checked)} /> بيتحسب</label>
          <label class="check-line"><input type="checkbox" checked=${!!c.postpone} onChange=${e => set(id, 'postpone', e.target.checked)} /> ينفع يتأجل</label>
          <label class="check-line"><input type="checkbox" checked=${!!c.free} onChange=${e => set(id, 'free', e.target.checked)} /> وقت فاضي</label>
        </span>
        ${own ? html`<div class="ed-colors" role="group" aria-label=${'لون ' + c.label}>${Object.keys(KIND_COLOR_NAMES).map(k => html`<button type="button" class=${'swatch c-k-' + k} aria-pressed=${c.color === k ? 'true' : 'false'} onClick=${() => set(id, 'color', k)}><i aria-hidden="true"></i>${KIND_COLOR_NAMES[k]}</button>`)}</div>
          <div class="form-row"><label class="field" for=${'ks-' + id}>بيتحسب في الميزان<select id=${'ks-' + id} value=${c.side || ''} onChange=${e => set(id, 'side', e.target.value || undefined)}><option value="">ولا كفة</option><option value="a">${'الكفة الأولى (' + BAL_A + ')'}</option><option value="b">${'الكفة التانية (' + BAL_B + ')'}</option></select></label></div>
          ${said && said.id === id ? html`<p class="form-err" role="alert">${said.text}</p>` : null}
          <span class="backup-act"><button type="button" class="btn danger" onClick=${() => remove(id)}>امسح النوع</button></span>` : null}
      </div>`; })}
      ${added.length < KIND_LIMIT ? html`<button type="button" class="btn" onClick=${add}>ضيف نوع</button>` : html`<p class="small muted">وصلت لآخر عدد من الأنواع (${KIND_LIMIT}).</p>`}
    </details>`;
  }

  function SubjectsPart({draft, onChange}){
    const [name, setName] = useState(''), [err, setErr] = useState('');
    const subs = draft.subjects || {};
    const add = () => { const n = name.trim(); if (!n) return; onChange(d => addSubject(d, n).draft); setName(''); };
    const remove = id => {
      const r = removeSubject(draft, id);
      if (r.ok) { setErr(''); onChange(r.draft); return; }
      const at = u => { const b = u.version ? draft.week[u.day].blocks[u.version][u.i] : draft.week[u.day].blocks[u.i]; return DAY_NAMES[u.day] + ' ' + toField(b[0]); };
      setErr('«' + subs[id] + '» مستخدمة في: ' + [...new Set(r.uses.map(at))].join('، ') + '. شيلها من البلوكات الأول.');
    };
    return html`<details class="panel ed-part"><summary>المواد</summary>
      ${Object.keys(subs).map(id => html`<div class="form-row" key=${id}>
        <label class="field" for=${'sub-' + id}>اسم المادة<input id=${'sub-' + id} value=${subs[id]} maxlength="60" onInput=${e => { const v = e.target.value; onChange(d => renameSubject(d, id, v)); }} /></label>
        <button type="button" class="btn ghost" onClick=${() => remove(id)}>امسح</button>
      </div>`)}
      <div class="form-row"><label class="field" for="sub-new">مادة جديدة<input id="sub-new" value=${name} maxlength="60" onInput=${e => setName(e.target.value)} /></label><button type="button" class="btn" onClick=${add}>ضيف</button></div>
      ${err ? html`<p class="form-err" role="alert">${err}</p>` : null}
    </details>`;
  }

  function ScheduleEditor({onClose}){
    const [draft, setDraftState] = useState(editorSession.draft);
    // next is a draft, or a function of the latest draft (editorSession.draft is always the latest)
    const setDraft = next => { const d = typeof next === 'function' ? next(editorSession.draft) : next; editorSession.draft = d; setDraftState(d); };
    const [day, setDay] = useState(String(weekday(effectiveNow().iso)));
    const [editing, setEditing] = useState(null);       // null, 'new' or a block index
    const [copyTo, setCopyTo] = useState(null);          // null or a list of days
    const [check, setCheck] = useState(null);            // {errors} | {changes, settings} | {moved}
    const [leaving, setLeaving] = useState(false);
    const two = isTwoVersionDay(draft, day), list = draft.week[day] ? draft.week[day].blocks : [];
    const pickDay = d => { setDay(d); setEditing(null); setCopyTo(null); };
    const doCopy = () => {
      const r = copyDay(draft, day, copyTo);
      setDraft(r.draft); setCopyTo(null);
      setCheck(r.skipped.length ? {note: 'ما اتنسخش على ' + r.skipped.map(d => DAY_NAMES[d]).join('، ') + ' عشان ليه نسختين من ملف الإعدادات.'} : null);
    };
    const trySave = () => {
      const res = validateSettings(JSON.parse(JSON.stringify(draft)));
      if (!res.ok) { setCheck({errors: res.errors.map(e => explain(e, draft))}); return; }
      setCheck({changes: changesBetween(editorSession.original, draft), settings: res.settings});
    };
    const save = () => {
      if (storedSavedAt() !== editorSession.savedAt) { setCheck({moved: true}); return; }
      if (!saveStore('settings', settingsToSave(check.settings))) { setCheck({errors: ['المتصفح ده مش بيسمح بالحفظ، فالجدول مش هيتخزن.']}); return; }
      editorSession = null;
      location.reload();
    };
    const close = () => { if (editorDirty() && !leaving) { setLeaving(true); return; } editorSession = null; onClose(); };
    const ch = check && check.changes;
    return html`<div class="settingsv editor">
      <div class="top a-head"><div class="top-meta"><h1>عدّل الجدول</h1><p class="sub">التعديلات مش بتتخزن غير لما تدوس «احفظ الجدول»</p></div>
        <button type="button" class="btn" onClick=${close}>رجوع</button></div>
      ${leaving ? html`<${Notice} role="alert" title="فيه تغييرات ماتحفظتش، تسيبها؟"><span class="backup-act"><button type="button" class="btn danger" onClick=${close}>أيوه، سيبها</button><button type="button" class="btn ghost" onClick=${() => setLeaving(false)}>لأ</button></span></${Notice}>` : null}
      <div class="daypick"><div class="days">${WEEK_ORDER.map(d => html`<button type="button" class="dp" key=${d} aria-pressed=${String(d) === day ? 'true' : 'false'} onClick=${() => pickDay(String(d))}><span class="dn">${DAY_SHORT[d]}</span></button>`)}</div></div>
      <div class="sec"><div class="sec-head"><h2>${DAY_NAMES[day]}</h2></div>
        ${two ? html`<p class="small muted">${REFUSALS['two-versions']}</p>` : html`<div class="panel tlist">
          ${list.map((b, i) => html`<button type="button" class="wk-pick ed-row" key=${b[0]} onClick=${() => setEditing(i)}><bdi class="num">${toField(b[0])}</bdi><span>${kindOf(draft, b[1]).label} · <bdi>${b[2]}</bdi>${b[5] ? ' · مربوط بالصلاة' : ''}</span></button>`)}
        </div>`}
        ${editing !== null && !two ? html`<${BlockForm} key=${day + ':' + editing} draft=${draft} day=${day} index=${editing === 'new' ? null : editing} onDone=${d => { setDraft(d); setEditing(null); }} onCancel=${() => setEditing(null)} />` : null}
        ${two ? null : html`<span class="backup-act"><button type="button" class="btn" onClick=${() => setEditing('new')}>ضيف بلوك</button><button type="button" class="btn ghost" onClick=${() => setCopyTo([])}>انسخ اليوم ده</button></span>`}
        ${copyTo ? html`<div class="panel form" role="group" aria-label="انسخ اليوم ده"><p class="small">انسخ بلوكات ${DAY_NAMES[day]} على:</p>
          <span class="ed-flags">${WEEK_ORDER.filter(d => String(d) !== day).map(d => html`<label class="check-line" key=${d}><input type="checkbox" checked=${copyTo.includes(String(d))} onChange=${e => setCopyTo(e.target.checked ? copyTo.concat(String(d)) : copyTo.filter(x => x !== String(d)))} /> ${DAY_NAMES[d]}</label>`)}</span>
          <span class="backup-act"><button type="button" class="btn primary" disabled=${!copyTo.length} onClick=${doCopy}>انسخ</button><button type="button" class="btn ghost" onClick=${() => setCopyTo(null)}>لأ</button></span></div>` : null}
        <${DayPreview} draft=${draft} day=${day} />
      </div>
      <details class="panel ed-part"><summary><span>يومك: من <bdi>${fmtStr(boundsOf(draft).start)}</bdi> لحد <bdi>${fmtStr(boundsOf(draft).end)}</bdi></span></summary>
        <div class="form"><${DayFields} start=${(draft.day || {}).start || '07:00'} end=${(draft.day || {}).end || '01:00'} onSet=${(start, end) => setDraft(d => setDayBounds(d, start, end))} /></div></details>
      <details class="panel ed-part"><summary>المكان: <bdi>${draft.location.label || '—'}</bdi></summary><${PlacePicker} place=${{location: draft.location, timezone: draft.timezone, prayerMethod: draft.prayerMethod}} onPlace=${p => setDraft(d => setPlace(d, p))} /></details>
      <${KindsPart} draft=${draft} onChange=${setDraft} />
      <${SubjectsPart} draft=${draft} onChange=${setDraft} />
      <div class="sec" aria-live="polite">
        ${check && check.note ? html`<p class="small" role="status">${check.note}</p>` : null}
        ${check && check.errors ? html`<${Notice} role="alert" title="الجدول ماتحفظش" text=${check.errors.map(e => html`<span class="small">${e}</span>`)} />` : null}
        ${check && check.moved ? html`<${Notice} role="alert" title="الجدول اتغيّر من مكان تاني من ساعة ما فتحت المحرر" line="افتح المحرر من الأول عشان تشوف آخر نسخة."><button type="button" class="btn" onClick=${() => { editorSession = null; location.reload(); }}>افتح من الأول</button></${Notice}>` : null}
        ${ch ? html`<${Notice} title="هتحفظ التغييرات دي؟" text=${[
            ...ch.days.map(c => html`<span class="small">${DAY_NAMES[c.day]}: ${c.added ? c.added + ' بلوك جديد أو متعدّل' : ''}${c.added && c.removed ? '، ' : ''}${c.removed ? c.removed + ' اتشال أو اتغيّر' : ''}</span>`),
            ch.kinds.length ? html`<span class="small">الأنواع: ${ch.kinds.map(k => kindOf(draft, k).label || kindOf(editorSession.original, k).label).join('، ')}</span>` : null,
            ch.subjects ? html`<span class="small">المواد اتغيّرت</span>` : null,
            ch.place ? html`<span class="small">المكان اتغيّر</span>` : null,
            ch.day ? html`<span class="small">يومك اتغيّر</span>` : null,
            html`<span class="small muted">الجدول الجديد بيبدأ من النهارده (<bdi>${DAY_NAMES[weekday(effectiveNow().iso)]} ${dateLabel(effectiveNow().iso)}</bdi>)، والأيام اللي قبله بتفضل بجدولها. علامة عملتها النهارده على بلوك وقته أو نوعه اتغيّر بتفضل محفوظة، بس مش هتبان النهارده.</span>`]}>
            <span class="backup-act"><button type="button" class="btn primary" onClick=${save}>أيوه، احفظ</button><button type="button" class="btn ghost" onClick=${() => setCheck(null)}>لأ</button></span></${Notice}>` : null}
        <button type="button" class="btn primary" onClick=${trySave}>احفظ الجدول</button>
      </div>
    </div>`;
  }
