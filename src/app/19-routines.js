  /* routines: the user's own split (Push, Pull, Legs, or anything else), each exercise with a planned set count */
  function RoutineCards({routines, workouts, names, onOpen, onNew, onEdit, onDelete}){
    const [menu, setMenu] = useState(null);
    const [ask, setAsk] = useState(null);
    return html`<section class="sec wk-routines">
      <div class="sec-head"><h2>سبليتاتي (<bdi>${routines.length}</bdi>)</h2><button type="button" class="btn" onClick=${onNew}><${Plus} />سبليت جديد</button></div>
      ${routines.length ? html`<div class="wk-rgrid">${routines.map(r => {
        const last = routineLastUsed(r.name, workouts);
        return html`<div class="panel wk-rcard" key=${r.id}>
          <div class="wk-rcard-head">
            <button type="button" class="wk-link" onClick=${() => onOpen(r.id)}><b><bdi>${r.name}</bdi></b></button>
            <button type="button" class="icon-btn" aria-label=${'خيارات ' + r.name} aria-expanded=${menu === r.id ? 'true' : 'false'} onClick=${() => { setAsk(null); setMenu(menu === r.id ? null : r.id); }}><${Dots} /></button>
          </div>
          ${menu === r.id ? html`<div class="wk-menu">${ask === r.id
            ? html`<span class="wk-ask">تمسح السبليت؟ التمرينات اللي خلصتها منه هتفضل. <button type="button" class="btn danger" onClick=${() => { setMenu(null); setAsk(null); onDelete(r.id); }}>أيوه، امسحه</button> <button type="button" class="btn" onClick=${() => setAsk(null)}>لأ</button></span>`
            : html`<button type="button" class="btn" onClick=${() => { setMenu(null); onEdit(r.id); }}>عدّل</button><button type="button" class="btn danger" onClick=${() => setAsk(r.id)}>امسح</button>`}</div>` : null}
          <button type="button" class="wk-rcard-body" onClick=${() => onOpen(r.id)}>
            <span class="wk-rsummary">${r.exIds.map((id, i) => html`<span class="wk-rsummary-item" key=${id}><${ExerciseIllustration} exId=${id} name=${names[id] || id} /><bdi>${r.sets[i] || 1} × ${names[id] || id}</bdi></span>`)}</span>
            <span class="small muted">${last === null ? 'لسه ما اتعملش' : html`آخر مرة: ${wkDay(last)}`}</span>
          </button>
        </div>`;
      })}</div>` : html`<p class="empty">اعمل سبليت لكل يوم في تقسيمتك (مثلاً Push و Pull و Legs) وابدأ منه بضغطة.</p>`}
    </section>`;
  }

  function RoutinePage({r, names, workouts, onStart, onEdit, onBack}){
    const last = routineLastUsed(r.name, workouts);
    return html`<div class="wkv">
      <div class="wk-head"><button type="button" class="btn" onClick=${onBack}>رجوع</button><div class="wk-title"><h1><bdi>${r.name}</bdi></h1>${last === null ? null : html`<p class="wk-meta">آخر مرة: ${wkDay(last)}</p>`}</div><button type="button" class="btn" onClick=${onEdit}>عدّل</button></div>
      <div class="panel wk-picklist">${r.exIds.map((id, i) => html`<p class="wk-rline" key=${id}><${ExerciseIllustration} exId=${id} name=${names[id] || id} /><bdi class="num">${r.sets[i] || 1}</bdi> × <bdi>${names[id] || id}</bdi></p>`)}</div>
      <button type="button" class="btn primary wk-wide" onClick=${onStart}>ابدأ التمرينة</button>
    </div>`;
  }

  // Create or edit a routine. Nothing is saved until «احفظ»; the exercise picker is the one used inside a workout.
  function RoutineEditor({r, all, routines, onSave, onCreateExercise, onCancel}){
    const [name, setName] = useState(r ? r.name : '');
    const [items, setItems] = useState(() => r ? r.exIds.map((exId, i) => ({exId, n: r.sets[i] || 1})) : []);
    const [err, setErr] = useState('');
    const [picking, setPicking] = useState(false);
    const nameOf = id => (all.find(x => x.id === id) || {}).name || id;
    const change = fn => { setItems(list => { const c = list.map(x => Object.assign({}, x)); fn(c); return c; }); setErr(''); };
    const move = (i, d) => change(c => { const j = i + d; if (j >= 0 && j < c.length) { const t = c[i]; c[i] = c[j]; c[j] = t; } });
    if (picking) return html`<${ExercisePicker} all=${all.filter(x => !items.some(it => it.exId === x.id))}
      onPick=${id => { change(c => { if (c.length < 40) c.push({exId: id, n: 1}); }); setPicking(false); }}
      onCreate=${q => { const res = onCreateExercise(q); if (res.error) return res.error; change(c => { if (c.length < 40) c.push({exId: res.id, n: 1}); }); setPicking(false); return null; }}
      onBack=${() => setPicking(false)} />`;
    const save = () => {
      const v = validateRoutineName(name, routines, r && r.id);
      if (!v.ok) { setErr(v.error); return; }
      if (!items.length) { setErr('ضيف تمرين واحد على الأقل'); return; }
      onSave({id: r ? r.id : uid36(), name: v.value, exIds: items.map(x => x.exId), sets: items.map(x => clampSets(x.n))});
    };
    return html`<div class="wkv">
      <div class="wk-head"><button type="button" class="btn" onClick=${onCancel}>لأ</button><h1 class="wk-title">${r ? 'عدّل السبليت' : 'سبليت جديد'}</h1><button type="button" class="btn primary" onClick=${save}>احفظ</button></div>
      <label class="field"><span>اسم السبليت</span>
        <input type="text" value=${name} maxlength="60" autocomplete="off" onInput=${e => { setName(e.target.value); setErr(''); }} />
      </label>
      ${err ? html`<p class="form-err" role="alert">${err}</p>` : null}
      <div class="panel wk-redit">
        ${items.length ? items.map((it, i) => { const nm = nameOf(it.exId); return html`<div class="wk-ritem" key=${it.exId}>
          <b class="wk-ritem-name"><${ExerciseIllustration} exId=${it.exId} name=${nm} /><bdi>${nm}</bdi></b>
          <span class="wk-ritem-act">
            <span class="wk-step"><button type="button" class="btn" aria-label=${'مجموعة أقل في ' + nm} disabled=${it.n <= 1} onClick=${() => change(c => { c[i].n = clampSets(c[i].n - 1); })}>−</button><bdi class="num wk-step-v" aria-label=${'عدد المجموعات ' + it.n}>${it.n} ×</bdi><button type="button" class="btn" aria-label=${'مجموعة زيادة في ' + nm} disabled=${it.n >= 20} onClick=${() => change(c => { c[i].n = clampSets(c[i].n + 1); })}>+</button></span>
            <button type="button" class="btn ghost" aria-label=${'طلّع ' + nm + ' لفوق'} disabled=${i === 0} onClick=${() => move(i, -1)}>↑</button>
            <button type="button" class="btn ghost" aria-label=${'نزّل ' + nm + ' لتحت'} disabled=${i === items.length - 1} onClick=${() => move(i, 1)}>↓</button>
            <button type="button" class="btn ghost" aria-label=${'شيل ' + nm} onClick=${() => change(c => { c.splice(i, 1); })}>شيل</button>
          </span>
        </div>`; }) : html`<p class="empty">لسه مفيش تمارين في السبليت.</p>`}
      </div>
      ${items.length < 40 ? html`<button type="button" class="btn" onClick=${() => setPicking(true)}><${Plus} />ضيف تمرين</button>` : null}
    </div>`;
  }

