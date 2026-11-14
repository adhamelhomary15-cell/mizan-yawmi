  /* ---------------- one form for adding and editing a task or an appointment ---------------- */
  // initial: task {text, tag, due} or appt {label, day, time}. onSubmit gets the validated, trimmed value.
  function ItemForm({kind, initial, idPrefix, textLabel, submitLabel, focusFirst, onSubmit, onCancel}){
    const isTask = kind === 'task';
    const [draft, setDraft] = useState(() => isTask
      ? {text: initial.text, tag: Object.prototype.hasOwnProperty.call(TASK_TAGS, initial.tag) ? initial.tag : '', due: initial.due || ''}
      : {label: initial.label, day: String(initial.day), time: initial.time || ''});
    const [err, setErr] = useState('');
    const first = useRef(null);
    useEffect(() => { if (focusFirst && first.current) first.current.focus(); }, []);
    const set = k => e => setDraft(d => Object.assign({}, d, {[k]: e.target.value}));
    const submit = e => {
      e.preventDefault();
      const r = isTask ? validateTaskFields(draft, TASK_TAGS) : validateApptFields(draft, WEEK_ORDER);
      if (!r.ok){ setErr(r.error); return; }
      setErr('');
      onSubmit(r.value);
    };
    const onKey = e => { if (e.key === 'Escape'){ e.preventDefault(); onCancel(); } };
    return html`<form class="form" onSubmit=${submit} onKeyDown=${onKey}>
      <div class="form-row">
        ${isTask ? html`
          <label class="field wide" for=${idPrefix + '-text'}>${textLabel}<input id=${idPrefix + '-text'} ref=${first} value=${draft.text} onInput=${set('text')} placeholder="مثلاً: حل شيت 3" maxlength="140" /></label>
          <label class="field" for=${idPrefix + '-tag'}>النوع<select id=${idPrefix + '-tag'} value=${draft.tag} onChange=${set('tag')}>
            ${draft.tag === '' ? html`<option value="">اختار النوع</option>` : null}
            ${Object.keys(TASK_TAGS).map(k => html`<option value=${k}>${TASK_TAGS[k]}</option>`)}</select></label>
          <label class="field" for=${idPrefix + '-due'}>آخر ميعاد (اختياري)<input id=${idPrefix + '-due'} type="date" value=${draft.due} onInput=${set('due')} /></label>`
        : html`
          <label class="field wide" for=${idPrefix + '-label'}>${textLabel}<input id=${idPrefix + '-label'} ref=${first} value=${draft.label} onInput=${set('label')} placeholder="مثلاً: ميتنج الفريق" maxlength="60" /></label>
          <label class="field" for=${idPrefix + '-day'}>اليوم<select id=${idPrefix + '-day'} value=${draft.day} onChange=${set('day')}>
            ${WEEK_ORDER.map(d => html`<option value=${String(d)}>${DAY_NAMES[d]}</option>`)}</select></label>
          <label class="field" for=${idPrefix + '-time'}>الساعة<input id=${idPrefix + '-time'} type="time" value=${draft.time} onInput=${set('time')} /></label>`}
      </div>
      ${err ? html`<p class="form-err" role="alert">${err}</p>` : null}
      <div class="form-row"><button type="submit" class="btn primary">${submitLabel}</button><button type="button" class="btn ghost" onClick=${onCancel}>إلغاء</button></div>
    </form>`;
  }

  /* ---------------- paste tasks from an AI ---------------- */
  // The pasted text is kept in memory only: it survives switching tabs in one session and is gone when the app closes.
  let PASTE_DRAFT = '';
  const PASTE_MAX_CHARS = 20000;
  const PASTE_REASONS = {
    'no-separator': () => 'مفيش | في السطر ده',
    'too-many-separators': () => 'فيه | أكتر من اللازم',
    'empty-text': () => 'نص المهمة فاضي',
    'too-long': x => 'النص أطول من 140 حرف (' + x.length + ')',
    'bad-date': () => 'التاريخ مش مظبوط'
  };
  function PasteTasks({now, store, update, actEdit, onClose}){
    const [text, setText] = useState(PASTE_DRAFT);
    const [result, setResult] = useState(null);
    const [sel, setSel] = useState({});
    const [picked, setPicked] = useState({});
    const [copied, setCopied] = useState('');
    const promptRef = useRef(null), pasteRef = useRef(null);
    const prompt = buildAiPrompt(TASK_TAGS, now.iso);
    useEffect(() => { if (pasteRef.current) pasteRef.current.focus(); }, []);
    const copy = async () => {
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('no clipboard');
        await navigator.clipboard.writeText(prompt);
        setCopied('ok');
      } catch(e){
        if (promptRef.current) { promptRef.current.focus(); promptRef.current.select(); }
        setCopied('manual');
      }
    };
    const onText = e => { PASTE_DRAFT = e.target.value; setText(e.target.value); setResult(null); };
    const check = () => {
      const r = parseTaskLines(text, TASK_TAGS, store.tasks.map(t => t.text));
      const s = {}; r.items.forEach(i => { s[i.n] = i.include; });
      setResult(r); setSel(s); setPicked({});
    };
    // A line with no valid type stays out until the user picks one; the app never chooses a type for them.
    const tagOf = i => i.tag || picked[i.n] || '';
    const pickType = (i, tag) => { setPicked(p => Object.assign({}, p, {[i.n]: tag})); setSel(p => Object.assign({}, p, {[i.n]: !!tag})); };
    const ready = result ? result.items.filter(i => sel[i.n] && tagOf(i)) : [];
    const confirm = () => {
      if (!ready.length) return;
      const made = ready.map(i => ({id: uid36(), text: i.text, tag: tagOf(i), due: i.due, done: false, created: now.iso}));
      // One undo for the whole batch: it removes only the tasks that are still exactly as added (undoBatch).
      const batch = made.map(t => ({id: t.id, text: t.text, tag: t.tag, due: t.due}));
      actEdit('اتضافت ' + made.length + ' مهمة',
        s => { made.forEach(t => s.tasks.push(t)); return s; },
        s => { s.tasks = undoBatch(s.tasks, batch); return s; });
      PASTE_DRAFT = '';
      onClose();
    };
    const onKey = e => { if (e.key === 'Escape'){ e.preventDefault(); onClose(); } };
    return html`<div class="paste" onKeyDown=${onKey}>
      <p class="small"><b>١. انسخ التعليمات وادّيها لأي AI</b> مع المهمة الكبيرة. هو اللي هيقسّمها بالشكل اللي التطبيق فاهمه.</p>
      <label class="field wide" for="paste-prompt">التعليمات<textarea id="paste-prompt" aria-label="التعليمات" dir="auto" readonly rows="9" ref=${promptRef} value=${prompt}></textarea></label>
      <div class="form-row"><button type="button" class="btn" onClick=${copy}>انسخ التعليمات</button></div>
      <p class="small muted" aria-live="polite">${copied === 'ok' ? 'اتنسخت. الصقها في الـ AI.' : copied === 'manual' ? 'المتصفح مش سامح بالنسخ. النص اتحدّد، انسخه بإيدك.' : ''}</p>
      <p class="small"><b>٢. الصق رد الـ AI هنا</b> وبعدين دوس "افحص".</p>
      <label class="field wide" for="paste-input">رد الـ AI<textarea id="paste-input" aria-label="رد الـ AI" dir="auto" rows="7" maxlength=${PASTE_MAX_CHARS} ref=${pasteRef} value=${text} onInput=${onText} placeholder=${'uni | Read chapter one | 2026-10-20\nwork | Review the draft'}></textarea></label>
      ${text.length >= PASTE_MAX_CHARS ? html`<p class="small">النص وصل للحد (${PASTE_MAX_CHARS} حرف)، والباقي ما اتقراش.</p>` : null}
      <div class="form-row"><button type="button" class="btn primary" disabled=${!text.trim()} onClick=${check}>افحص</button><button type="button" class="btn ghost" onClick=${onClose}>إلغاء</button></div>
      ${result ? html`<div class="paste-preview">
        <p class="small" role="status"><b>${result.items.length} مهمة في المعاينة، ${result.rejected.length} سطر مش مفهوم</b></p>
        ${result.leftOut ? html`<p class="small">${'سيبت ' + result.leftOut + ' سطر زيادة عن الحد (' + PASTE_MAX_LINES + ')'}</p>` : null}
        ${!result.items.length ? html`<${Notice} title="مفيش سطر اتفهم." text=${html`<span class="small">التطبيق فاهم الصيغة دي بس، سطر لكل مهمة: <bdi>النوع | نص المهمة | آخر ميعاد</bdi></span>`} />` : null}
        ${result.items.map(i => html`<div class="paste-row" key=${i.n}>
          <input type="checkbox" id=${'paste-i-' + i.n} checked=${!!sel[i.n]} disabled=${!tagOf(i)} onChange=${e => { const on = e.target.checked; setSel(p => Object.assign({}, p, {[i.n]: on})); }} />
          <span class="paste-main"><label for=${'paste-i-' + i.n} class="paste-text"><bdi>${i.text}</bdi></label>
            <span class="small muted">${tagOf(i) ? TASK_TAGS[tagOf(i)] : 'محتاج نوع'} · ${i.due ? dateLabel(i.due) : 'من غير ميعاد'}${i.dupe ? ' · ممكن يكون مكرر' : ''}</span>
            ${!i.tag ? html`<select class="paste-type" aria-label=${'اختار نوع: ' + i.text} value=${picked[i.n] || ''} onChange=${e => pickType(i, e.target.value)}><option value="">اختار النوع</option>${Object.keys(TASK_TAGS).map(k => html`<option value=${k}>${TASK_TAGS[k]}</option>`)}</select>` : null}
          </span>
        </div>`)}
        ${result.rejected.length ? html`<div class="paste-rejected"><p class="small"><b>سطور مش مفهومة (مش هتتضاف)</b></p>
          <ul>${result.rejected.map(x => html`<li key=${x.n}><span class="small muted">سطر ${x.n}: ${PASTE_REASONS[x.reason](x)}</span><bdi class="paste-raw">${x.raw.trim()}</bdi></li>`)}</ul></div>` : null}
        <div class="form-row"><button type="button" class="btn primary" disabled=${!ready.length} onClick=${confirm}>${'ضيف ' + ready.length + ' مهمة'}</button></div>
      </div>` : null}
    </div>`;
  }

  /* ---------------- Tasks & appointments ---------------- */
  // The one open edit form: an id, or null. Only one at a time; opening another drops the first unsaved. Closing returns
  // focus to the form's edit button, when it is still on the screen.
  function useEditSlot(){
    const [editing, setEditing] = useState(null);
    const lastEdited = useRef(null);
    useEffect(() => {
      if (editing !== null || !lastEdited.current) return;
      const el = document.getElementById('edit-btn-' + lastEdited.current);
      lastEdited.current = null;
      if (el) el.focus();
    }, [editing]);
    const openEdit = id => { lastEdited.current = null; setEditing(id); };
    const closeEdit = id => { lastEdited.current = id; setEditing(null); };
    return {editing, setEditing, openEdit, closeEdit};
  }

  function TaskRow({t, now, update, remove, actEdit, onEdit}){
    const late = !t.done && t.due && t.due < now.iso;
    return html`<div class=${'titem c-' + t.tag + (t.done ? ' done' : !t.due ? '' : ' wrap-act')}>
      <${Check} on=${!!t.done} cat=${t.tag} label=${(t.done ? 'رجّع: ' : 'خلّص: ') + t.text} onToggle=${() => update(s => { const x = s.tasks.find(y => y.id === t.id); if (x) x.done = !x.done; return s; })} />
      <div class="shrink"><p class="ttext">${t.text}</p>
        <p class="small"><span class="ttag">${TASK_TAGS[t.tag]}</span>${t.due ? html` · <span class=${'tdue' + (late ? ' late' : '')}>${late ? html`<${Late} /><span aria-hidden="true">متأخرة</span> · ` : ''}${dateLabel(t.due)}</span>` : null}</p></div>
      <div class="tact">
        ${!t.done && t.due ? html`<button type="button" class="btn" aria-label=${'أجّلها: ' + t.text} onClick=${() => postponeTask(actEdit, t, taskNextDay(t.due, now.iso, addDays))}>أجّلها</button>` : null}
        <button type="button" class="edit" id=${'edit-btn-' + t.id} aria-label=${'عدّل ' + t.text} title="عدّل" onClick=${onEdit}><${Pencil} /></button>
        <button type="button" class="del" aria-label=${'امسح ' + t.text} onClick=${() => remove('اتمسحت المهمة', s => { s.tasks = s.tasks.filter(x => x.id !== t.id); return s; })}>امسح</button>
      </div>
    </div>`;
  }

  // Today's tasks section. Every open task is in exactly one list, on every day (FR-010).
  function DayTasks({iso, now, store, update, remove, actEdit}){
    const [taskForm, setTaskForm] = useState(false);
    const [pasteOpen, setPasteOpen] = useState(false);
    const {editing, setEditing, openEdit, closeEdit} = useEditSlot();
    const openPaste = () => { setEditing(null); setTaskForm(false); setPasteOpen(true); };
    const closePaste = () => { setPasteOpen(false); setTimeout(() => { const b = document.getElementById('paste-open-btn'); if (b) b.focus(); }, 0); };
    const saveTask = (t, value) => {
      const before = {text: t.text, tag: t.tag, due: t.due || ''};
      actEdit('اتعدّلت المهمة',
        s => { s.tasks = applyEdit(s.tasks, t.id, value, TASK_EDIT_KEYS); return s; },
        s => { s.tasks = restoreFields(s.tasks, t.id, before, TASK_EDIT_KEYS); return s; });
      closeEdit(t.id);
    };
    // value comes validated and trimmed from ItemForm (text up to 140 characters, a known type, an optional date).
    const addTask = value => {
      update(s => { s.tasks.push({id: uid36(), text: value.text, tag: value.tag, due: value.due, done: false, created: now.iso}); return s; });
      setTaskForm(false);
    };
    const isToday = iso === now.iso;
    const inDay = t => t.due === iso || (isToday && t.due < iso);
    const open = store.tasks.filter(t => !t.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
    const dated = open.filter(t => t.due);
    const dayList = dated.filter(inDay);
    const others = dated.filter(t => !inDay(t));
    const undated = open.filter(t => !t.due);
    const finished = store.tasks.filter(t => t.done).slice(-20).reverse();
    const row = t => editing === t.id
      ? html`<div class="titem-edit" key=${t.id}><${ItemForm} kind="task" initial=${{text: t.text, tag: t.tag, due: t.due || ''}} idPrefix="edit-task" textLabel="نص المهمة" submitLabel="احفظ التعديل" focusFirst=${true} onSubmit=${v => saveTask(t, v)} onCancel=${() => closeEdit(t.id)} /></div>`
      : html`<${TaskRow} key=${t.id} t=${t} now=${now} update=${update} remove=${remove} actEdit=${actEdit} onEdit=${() => { setTaskForm(false); setPasteOpen(false); openEdit(t.id); }} />`;
    return html`<div class="sec o-tasks">
      <div class="sec-head"><h2>مهام ${isToday ? 'النهارده' : 'اليوم ده'}</h2>
        ${!taskForm && !pasteOpen ? html`<span class="task-add">
          <button type="button" class="btn small" onClick=${() => { setEditing(null); setTaskForm(true); }}><${Plus} />مهمة</button>
          <button type="button" id="paste-open-btn" class="btn small" onClick=${openPaste}>الصق مهام من AI</button>
        </span>` : null}
      </div>
      <div class="panel">
        ${taskForm ? html`<div class="form-above"><${ItemForm} kind="task" initial=${{text: '', tag: 'uni', due: iso < now.iso ? '' : iso}} idPrefix="task" textLabel="مهمة جديدة" submitLabel="ضيف المهمة" focusFirst=${false} onSubmit=${addTask} onCancel=${() => setTaskForm(false)} /></div>` : null}
        ${pasteOpen ? html`<div class="form-above"><${PasteTasks} now=${now} store=${store} update=${update} actEdit=${actEdit} onClose=${closePaste} /></div>` : null}
        ${dayList.length ? html`<div class="tlist day-list">${dayList.map(row)}</div>` : html`<p class="empty">مفيش مهام لليوم ده.</p>`}
        ${undated.length ? html`<div class="task-part"><h3>من غير ميعاد</h3><div class="tlist">${undated.map(row)}</div></div>` : null}
        ${others.length ? html`<details class="task-part others"><summary>باقي المهام (<bdi class="num">${others.length}</bdi>)</summary><div class="tlist">${others.map(row)}</div></details>` : null}
        ${finished.length ? html`<details class="task-part finished"><summary>خلصت</summary><div class="tlist">${finished.map(row)}</div></details>` : null}
      </div>
    </div>`;
  }

  // Settings' weekly appointments.
  function WeeklyAppts({now, store, update, remove, actEdit, goDay}){
    const [apptForm, setApptForm] = useState(false);
    const {editing, setEditing, openEdit, closeEdit} = useEditSlot();
    // value comes validated and trimmed from ItemForm (name up to 60 characters, a day number, a time).
    const addAppt = value => {
      update(s => { s.appts.push({id: uid36(), label: value.label, day: value.day, time: value.time}); return s; });
      setApptForm(false);
    };
    const saveAppt = (a, value) => {
      const before = {label: a.label, day: a.day, time: a.time};
      actEdit('اتعدّل الميعاد',
        s => { s.appts = applyEdit(s.appts, a.id, value, APPT_EDIT_KEYS); return s; },
        s => { s.appts = restoreFields(s.appts, a.id, before, APPT_EDIT_KEYS); return s; });
      closeEdit(a.id);
    };
    const appts = store.appts.slice().sort((a, b) => WEEK_ORDER.indexOf(Number(a.day)) - WEEK_ORDER.indexOf(Number(b.day)) || a.time.localeCompare(b.time));
    return html`<div class="sec">
      <div class="sec-head"><h2>مواعيد كل أسبوع</h2>${!apptForm ? html`<button type="button" class="btn small" onClick=${() => { setEditing(null); setApptForm(true); }}><${Plus} />ميعاد</button>` : null}</div>
      <div class="panel">
        ${appts.length ? html`<div>${appts.map(a => editing === a.id
          ? html`<div class="appt-edit" key=${a.id}><${ItemForm} kind="appt" initial=${{label: a.label, day: a.day, time: a.time}} idPrefix="edit-appt" textLabel="الميعاد" submitLabel="احفظ التعديل" focusFirst=${true} onSubmit=${v => saveAppt(a, v)} onCancel=${() => closeEdit(a.id)} /></div>`
          : html`<div class="appt" key=${a.id}>
            <div><p>${a.label}</p><p class="when">${DAY_NAMES[a.day]} · ${fmtStr(toMin(a.time))}</p></div>
            <div class="aact">
              <button type="button" class="btn ghost small" onClick=${() => goDay(addDays(weekStart(now.iso), WEEK_ORDER.indexOf(Number(a.day))))}>افتح اليوم</button>
              <button type="button" class="edit" id=${'edit-btn-' + a.id} aria-label=${'عدّل ' + a.label} title="عدّل" onClick=${() => { setApptForm(false); openEdit(a.id); }}><${Pencil} /></button>
              <button type="button" class="del" aria-label=${'امسح ' + a.label} onClick=${() => remove('اتمسح ميعاد "' + a.label + '"', s => { s.appts = s.appts.filter(x => x.id !== a.id); return s; })}>امسح</button>
            </div>
          </div>`)}</div>`
          : html`<p class="empty">المواعيد الأساسية متحطة في الجدول خلاص. أي ميعاد ثابت تاني، زي ميتنج شغل أسبوعي، ضيفه من "+ ميعاد" وهيظهر جوه يومه.</p>`}
        ${apptForm ? html`<div class="form-below"><${ItemForm} kind="appt" initial=${{label: '', day: 5, time: ''}} idPrefix="appt" textLabel="الميعاد" submitLabel="ضيف الميعاد" focusFirst=${false} onSubmit=${addAppt} onCancel=${() => setApptForm(false)} /></div>` : null}
      </div>
    </div>`;
  }

