  /* history, workout detail and exercise page: read-only views over the finished workouts */
  const monthFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {month: 'long', year: 'numeric', timeZone: 'UTC'});
  const wkWhen = w => { const c = zoneParts(new Date(w.startedAt)); return DAY_NAMES[weekday(c.iso)] + '، ' + dateLabel(c.iso) + ' · ' + fmtStr(c.min); };
  const wkDay = ts => dateLabel(zoneParts(new Date(ts)).iso);
  const wkTitle = w => w.routineName || 'تمرينة';
  const allSets = w => w.exercises.reduce((a, e) => a.concat(e.sets), []);
  const recWords = f => f.weight && f.reps ? 'وزن وتكرارات' : f.weight ? 'وزن' : 'تكرارات';
  const Kg = ({s}) => html`<bdi dir="ltr" class="num">${s.w} × ${s.r}</bdi>`;
  const byNewest = list => list.slice().sort((a, b) => b.startedAt - a.startedAt);

  function WkSwitch({cur, go}){
    return html`<div class="filters wk-switch" role="group" aria-label="أقسام التمارين">
      <button type="button" class="btn" aria-pressed=${cur === 'home' ? 'true' : 'false'} onClick=${() => go({n: 'home'})}>تمرين</button>
      <button type="button" class="btn" aria-pressed=${cur === 'history' ? 'true' : 'false'} onClick=${() => go({n: 'history'})}>السجل</button>
      <button type="button" class="btn" aria-pressed=${cur === 'exercises' ? 'true' : 'false'} onClick=${() => go({n: 'exercises'})}>التمارين</button>
    </div>`;
  }

  function HistoryScreen({workouts, rec, onOpen}){
    const groups = useMemo(() => {
      const g = [];
      byNewest(workouts).forEach(w => {
        const key = zoneParts(new Date(w.startedAt)).iso.slice(0, 7);
        let x = g[g.length - 1];
        if (!x || x.key !== key) { x = {key, items: []}; g.push(x); }
        x.items.push(w);
      });
      return g;
    }, [workouts]);
    if (!groups.length) return html`<p class="empty">لسه مفيش تمرينات محفوظة. خلّص تمرينة وهتظهر هنا.</p>`;
    return html`<div class="wk-hist">${groups.map(g => { const [y, m] = g.key.split('-').map(Number); return html`<section class="sec" key=${g.key}>
      <div class="sec-head"><h2>${monthFmt.format(new Date(Date.UTC(y, m - 1, 1)))}</h2><span class="small muted"><bdi>${g.items.length}</bdi> تمرينة</span></div>
      ${g.items.map(w => { const rc = recordCount(w, rec.flags); return html`<button type="button" class="panel wk-card" key=${w.id} onClick=${() => onOpen(w.id)}>
        <span class="wk-card-head"><b>${wkTitle(w)}</b><span class="small muted">${wkWhen(w)}</span></span>
        <span class="wk-card-row small muted"><span>أفضل مجموعة</span><span>المجموعات</span></span>
        ${w.exercises.map((e, i) => html`<span class="wk-card-row" key=${i}><${Kg} s=${bestSet(e.sets)} /><span class="wk-history-name"><${ExerciseIllustration} exId=${e.exId} name=${e.name} /><bdi>${e.sets.length} × ${e.name}</bdi></span></span>`)}
        <span class="wk-card-foot small">${rc ? html`<span><bdi>${rc}</bdi> رقم قياسي</span>` : null}<span><bdi class="num">${Math.round(volumeOf(allSets(w)))}</bdi> كجم</span><bdi dir="ltr" class="num">${formatClock(w.endedAt - w.startedAt)}</bdi></span>
      </button>`; })}
    </section>`; })}</div>`;
  }

  // A finished workout. One set at a time can be corrected; the workout can be deleted with the app's undo.
  function WorkoutDetail({w, rec, onExercise, onBack, onCorrect, onDelete}){
    const rc = recordCount(w, rec.flags);
    const [ed, setEd] = useState(null);   // {ei, si, w, r, err}
    const editKey = ed && ed.ei + ':' + ed.si;
    const lastKey = useRef(null);
    useEffect(() => {
      // closing the editor puts focus back on that set's «عدّل»
      if (!ed) { const b = lastKey.current && document.querySelector('[data-fix="' + lastKey.current + '"]'); if (b) b.focus(); lastKey.current = null; return; }
      lastKey.current = editKey;
    }, [editKey]);
    useEscape(() => setEd(null), !!ed);
    const save = () => { const r = onCorrect(ed.ei, ed.si, {w: ed.w, r: ed.r}); if (r.ok) setEd(null); else setEd(Object.assign({}, ed, {err: r})); };
    return html`<div class="wkv">
      <div class="wk-head"><button type="button" class="btn" onClick=${onBack}>رجوع</button><div class="wk-title"><h1>${wkTitle(w)}</h1><p class="wk-meta">${wkWhen(w)}</p></div></div>
      <p class="small muted">المدة <bdi dir="ltr" class="num">${formatClock(w.endedAt - w.startedAt)}</bdi> · <bdi class="num">${Math.round(volumeOf(allSets(w)))}</bdi> كجم${rc ? html` · <bdi>${rc}</bdi> رقم قياسي` : null}</p>
      ${w.exercises.map((e, ei) => html`<section class="panel wk-ex" key=${ei + ':' + e.exId}>
        <div class="wk-ex-visual"><${ExerciseIllustration} exId=${e.exId} name=${e.name} /><h2><button type="button" class="wk-link" onClick=${() => onExercise(e.exId)}><bdi>${e.name}</bdi></button></h2></div>
        ${e.sets.map((s, si) => {
          const f = rec.flags[w.id + ':' + ei + ':' + si];
          if (ed && ed.ei === ei && ed.si === si) {
            const err = ed.err;
            return html`<form class="wk-hedit" key=${si} onSubmit=${ev => { ev.preventDefault(); save(); }}>
              <span class="wk-no num">${si + 1}</span>
              <input class="wk-in" type="text" inputmode="decimal" dir="ltr" autocomplete="off" aria-label=${e.name + '، مجموعة ' + (si + 1) + '، الوزن بالكيلو'} aria-invalid=${err && err.field === 'w' ? 'true' : 'false'} value=${ed.w} onInput=${ev => setEd(Object.assign({}, ed, {w: ev.target.value, err: null}))} />
              <input class="wk-in" type="text" inputmode="numeric" dir="ltr" autocomplete="off" aria-label=${e.name + '، مجموعة ' + (si + 1) + '، التكرارات'} aria-invalid=${err && err.field === 'r' ? 'true' : 'false'} value=${ed.r} onInput=${ev => setEd(Object.assign({}, ed, {r: ev.target.value, err: null}))} />
              <span class="wk-hedit-act"><button type="submit" class="btn primary">احفظ</button><button type="button" class="btn" onClick=${() => setEd(null)}>لأ</button></span>
              ${err ? html`<p class="form-err" role="alert">${err.error}</p>` : null}
            </form>`;
          }
          return html`<div class="wk-hrow" key=${si}><span class="wk-no num">${si + 1}</span><${Kg} s=${s} />${f ? html`<span class="mk"><${Star} />رقم قياسي · ${recWords(f)}</span>` : null}<button type="button" class="btn ghost wk-hfix" data-fix=${ei + ':' + si} aria-label=${'عدّل مجموعة ' + (si + 1) + ' من ' + e.name} onClick=${() => setEd({ei, si, w: String(s.w), r: String(s.r), err: null})}>عدّل</button></div>`;
        })}
      </section>`)}
      <button type="button" class="btn danger" onClick=${onDelete}>امسح التمرينة</button>
    </div>`;
  }

  function ExerciseScreen({exId, name, rec, workouts, onOpen, onBack}){
    const pe = rec.perExercise[exId], list = byNewest(workouts.filter(w => w.exercises.some(e => e.exId === exId)));
    return html`<div class="wkv">
      <div class="wk-head"><button type="button" class="btn" onClick=${onBack}>رجوع</button><div class="wk-title"><h1><bdi>${name}</bdi></h1></div></div>
      <${ExerciseArt} exId=${exId} name=${name} />
      ${pe ? html`<div class="panel wk-best">
        <p>أعلى وزن: <b><bdi class="num">${pe.bestWeight.value}</bdi> كجم</b> <span class="small muted">· ${wkDay(pe.bestWeight.date)}</span></p>
        <p>أكتر تكرارات: <b><bdi class="num">${pe.bestReps.value}</bdi></b> <span class="small muted">· ${wkDay(pe.bestReps.date)}</span></p>
      </div>` : html`<p class="empty">لسه مفيش تمرينات متسجلة للتمرين ده.</p>`}
      ${list.map(w => html`<button type="button" class="panel wk-card" key=${w.id} onClick=${() => onOpen(w.id)}>
        <span class="wk-card-head"><b>${wkTitle(w)}</b><span class="small muted">${wkWhen(w)}</span></span>
        <span class="small">${w.exercises.filter(e => e.exId === exId).reduce((a, e) => a.concat(e.sets), []).map((x, i) => html`${i ? '، ' : ''}<${Kg} s=${x} />`)}</span>
      </button>`)}
    </div>`;
  }

  // Every exercise, searchable. Own exercises can be added; one with no history and in no routine can be deleted.
  function ExercisesScreen({all, workouts, routines, onOpen, onAdd, onDelete}){
    const [q, setQ] = useState('');
    const [nm, setNm] = useState('');
    const [err, setErr] = useState('');
    const [ask, setAsk] = useState(null);
    const nq = normName(q);
    const shown = nq ? all.filter(x => normName(x.name).indexOf(nq) >= 0) : all;
    return html`<div class="wk-exs">
      <label class="field"><span>دوّر على تمرين</span>
        <input type="text" value=${q} autocomplete="off" onInput=${e => setQ(e.target.value)} />
      </label>
      <div class="panel wk-picklist">
        ${shown.length ? shown.map(x => {
          const own = x.id.indexOf('s-') !== 0, d = own ? canDeleteExercise(x.id, workouts, routines) : null;
          return html`<div class="wk-exrow" key=${x.id}>
            <button type="button" class="wk-pick" onClick=${() => onOpen(x.id)}><${ExerciseIllustration} exId=${x.id} name=${x.name} /><bdi>${x.name}</bdi></button>
            ${d && d.ok && ask !== x.id ? html`<button type="button" class="btn danger" aria-label=${'امسح ' + x.name} onClick=${() => setAsk(x.id)}>امسح</button>` : null}
            ${d && d.ok && ask === x.id ? html`<span class="wk-ask">متأكد؟ <button type="button" class="btn danger" onClick=${() => { setAsk(null); onDelete(x.id); }}>أيوه، امسح</button> <button type="button" class="btn" onClick=${() => setAsk(null)}>لأ</button></span>` : null}
            ${d && !d.ok ? html`<span class="small muted">${d.reason === 'history' ? 'التمرين ده ليه سجل' : html`التمرين ده في سبليت: <bdi>${d.routineName}</bdi>`}</span>` : null}
          </div>`;
        }) : html`<p class="empty">مفيش تمرين بالاسم ده.</p>`}
      </div>
      <form class="panel wk-exadd" onSubmit=${e => { e.preventDefault(); const r = onAdd(nm); if (r) setErr(r); else { setNm(''); setErr(''); } }}>
        <label class="field"><span>ضيف تمرين</span>
          <input type="text" value=${nm} autocomplete="off" onInput=${e => { setNm(e.target.value); setErr(''); }} />
        </label>
        <button type="submit" class="btn primary"><${Plus} />ضيف تمرين</button>
        ${err ? html`<p class="form-err" role="alert">${err}</p>` : null}
      </form>
    </div>`;
  }

