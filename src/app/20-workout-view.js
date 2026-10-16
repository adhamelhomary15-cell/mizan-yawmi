  function WorkoutView({wk, showToast}){
    const {data, update, tooNew, saveFailed} = wk;
    const cur = data.current;
    const all = useMemo(() => STARTER_EXERCISES.concat(data.custom), [data.custom]);
    const names = useMemo(() => { const m = {}; all.forEach(x => { m[x.id] = x.name; }); return m; }, [all]);
    const [panel, setPanel] = useState(null);   // null | 'pick' | 'finish' | 'discard'
    const [menu, setMenu] = useState(null);     // null | 'w' | an exercise's index
    const [bad, setBad] = useState(null);       // {ei, si, field, msg}
    const [screen, setScreen] = useState({n: 'home'});   // outside a workout: home | history | detail | exercise
    const rec = useMemo(() => computeRecords(data.workouts), [data.workouts]);
    const top = () => { try { window.scrollTo(0, 0); } catch(e){} };

    if (tooNew) return html`<div class="wkv"><${Notice} title="بيانات التمارين دي اتحفظت بنسخة أحدث من التطبيق" line="مش هنفتحها ولا نعدّل عليها هنا عشان ما نبوّظهاش. حدّث التطبيق." /></div>`;

    const warn = (!LOCAL_OK || saveFailed) ? html`<${Notice} title="المتصفح ده مش بيسمح بالحفظ" line="التمرينات هتتمسح لما تقفل الصفحة." />` : null;
    const startEmpty = () => { setScreen({n: 'home'}); update(d => { if (!d.current) d.current = {id: uid36(), startedAt: Date.now(), exercises: [], rest: null}; return d; }); };
    const patch = fn => update(d => { if (d.current) fn(d.current); return d; });

    if (!cur) {
      const n = data.workouts.length;
      const go = sc => { setScreen(sc); top(); };
      const nameOf = id => names[id] || ((data.workouts.map(w => w.exercises.find(e => e.exId === id)).filter(Boolean)[0] || {}).name) || id;
      const found = screen.id && data.workouts.find(x => x.id === screen.id);
      // Records are never stored, so a correction or a delete shows its effect on the next render.
      const correct = (ei, si, fields) => {
        const r = correctSet(found, ei, si, fields);
        if (r.ok) update(d => { d.workouts = d.workouts.map(x => x.id === found.id ? r.workout : x); return d; });
        return r;
      };
      const del = () => {
        const r = removeWorkout(data.workouts, found.id);
        if (!r.removed) return;
        update(d => { d.workouts = removeWorkout(d.workouts, found.id).workouts; return d; });
        go({n: 'history'});
        showToast('اتمسحت التمرينة', () => update(d => { d.workouts = putBackWorkout(d.workouts, r.removed, r.index); return d; }));
      };
      if (screen.n === 'detail' && found) return html`<${WorkoutDetail} key=${found.id} w=${found} rec=${rec} onExercise=${id => go({n: 'exercise', id, back: screen})} onBack=${() => go({n: 'history'})} onCorrect=${correct} onDelete=${del} />`;
      if (screen.n === 'exercise') return html`<${ExerciseScreen} exId=${screen.id} name=${nameOf(screen.id)} rec=${rec} workouts=${data.workouts} onOpen=${id => go({n: 'detail', id})} onBack=${() => go(screen.back || {n: 'history'})} />`;
      const inHistory = screen.n === 'history', inExs = screen.n === 'exercises';
      const addOwnCheck = name => {
        const nm = String(name).trim().replace(/\s+/g, ' ');
        if (!nm) return 'اكتب اسم التمرين';
        if (nm.length > 60) return 'الاسم لحد 60 حرف';
        if (isNameTaken(nm, all)) return 'الاسم ده موجود';
        return null;
      };
      const addOwn = name => {
        const e = addOwnCheck(name);
        if (!e) update(d => { d.custom.push({id: uid36(), name: String(name).trim().replace(/\s+/g, ' ')}); return d; });
        return e;
      };
      const delOwn = id => update(d => { if (canDeleteExercise(id, d.workouts, d.routines).ok) d.custom = d.custom.filter(x => x.id !== id); return d; });
      // Routines. Starting copies the routine into a new open workout; changing that workout never changes the routine.
      const routine = screen.rid && data.routines.find(x => x.id === screen.rid);
      const startRoutine = r => { setScreen({n: 'home'}); update(d => { if (!d.current) d.current = startFromRoutine(r, names, Date.now(), uid36); return d; }); top(); };
      const saveRoutine = r => { update(d => { const i = d.routines.findIndex(x => x.id === r.id); if (i >= 0) d.routines[i] = r; else d.routines.push(r); return d; }); go({n: 'routine', rid: r.id}); };
      const delRoutine = id => update(d => { d.routines = d.routines.filter(x => x.id !== id); return d; });
      const newExercise = q => {
        const e = addOwnCheck(q);
        if (e) return {error: e};
        const ex = {id: uid36(), name: String(q).trim().replace(/\s+/g, ' ')};
        update(d => { d.custom.push(ex); return d; });
        return {id: ex.id};
      };
      if (screen.n === 'redit') return html`<${RoutineEditor} key=${screen.rid || 'new'} r=${routine || null} all=${all} routines=${data.routines} onSave=${saveRoutine} onCreateExercise=${newExercise} onCancel=${() => go(routine ? {n: 'routine', rid: routine.id} : {n: 'home'})} />`;
      if (screen.n === 'routine' && routine) return html`<${RoutinePage} r=${routine} names=${names} workouts=${data.workouts} onStart=${() => startRoutine(routine)} onEdit=${() => go({n: 'redit', rid: routine.id})} onBack=${() => go({n: 'home'})} />`;
      return html`<div class="wkv">
        <div class="top"><div class="top-meta"><h1>تمارين</h1><p class="sub">سجّل الأوزان والتكرارات، وكله على جهازك بس.</p></div></div>
        <${WkSwitch} cur=${inHistory ? 'history' : inExs ? 'exercises' : 'home'} go=${go} />
        ${warn}
        ${inHistory ? html`<${HistoryScreen} workouts=${data.workouts} rec=${rec} onOpen=${id => go({n: 'detail', id})} />` : inExs ? html`<${ExercisesScreen} all=${all} workouts=${data.workouts} routines=${data.routines} onOpen=${id => go({n: 'exercise', id, back: screen})} onAdd=${addOwn} onDelete=${delOwn} />` : html`<div class="panel wk-home">
          <button type="button" class="btn primary" id="wk-start" onClick=${startEmpty}>ابدأ تمرينة فاضية</button>
          <p class="small muted">${n ? html`تمرينات محفوظة: <bdi>${n}</bdi>` : 'لسه مفيش تمرينات محفوظة.'}</p>
        </div>
        <${RoutineCards} routines=${data.routines} workouts=${data.workouts} names=${names} onOpen=${rid => go({n: 'routine', rid})} onNew=${() => go({n: 'redit'})} onEdit=${rid => go({n: 'redit', rid})} onDelete=${delRoutine} />`}
      </div>`;
    }

    const addExercise = exId => { patch(c => { c.exercises.push({exId, sets: [BLANK_SET()]}); }); setPanel(null); };
    const createExercise = name => {
      const nm = String(name).trim().replace(/\s+/g, ' ');
      if (!nm) return 'اكتب اسم التمرين';
      if (nm.length > 60) return 'الاسم لحد 60 حرف';
      if (isNameTaken(nm, all)) return 'الاسم ده موجود';
      const ex = {id: uid36(), name: nm};
      update(d => { d.custom.push(ex); if (d.current) d.current.exercises.push({exId: ex.id, sets: [BLANK_SET()]}); return d; });
      setPanel(null);
      return null;
    };
    if (panel === 'pick') return html`<${ExercisePicker} all=${all} onPick=${addExercise} onCreate=${createExercise} onBack=${() => setPanel(null)} />`;

    const setField = (ei, si, f, v) => {
      patch(c => { const s = c.exercises[ei].sets[si]; s[f] = v; s.done = false; if (c.rest && c.rest.ei === ei && c.rest.si === si) c.rest = null; });
      if (bad && bad.ei === ei && bad.si === si) setBad(null);
    };
    // A set is done only by this tap, and only with valid numbers.
    const toggleDone = (ei, si) => {
      const s = cur.exercises[ei].sets[si];
      if (s.done) { patch(c => { c.exercises[ei].sets[si].done = false; if (c.rest && c.rest.ei === ei && c.rest.si === si) c.rest = null; }); return; }
      const v = validateSet(s);
      if (!v.ok) { setBad({ei, si, field: v.field, msg: v.error}); return; }
      setBad(null);
      primeAudio();
      patch(c => { c.exercises[ei].sets[si].done = true; c.rest = {startedAt: Date.now(), seconds: data.prefs.restSeconds, alerted: false, ei, si}; });
    };
    const addSet = ei => patch(c => { c.exercises[ei].sets.push(BLANK_SET()); });
    const dropSet = ei => { setBad(null); patch(c => { if (c.exercises[ei].sets.length > 1) { c.exercises[ei].sets.pop(); c.rest = null; } }); };
    const dropExercise = ei => { setMenu(null); setBad(null); patch(c => { c.exercises.splice(ei, 1); c.rest = null; }); };
    const rest = cur.rest;
    const addRest = () => patch(c => { if (c.rest) { c.rest.seconds += 15; if (restLeft(c.rest, Date.now()) > 0) c.rest.alerted = false; } });
    const skipRest = () => patch(c => { c.rest = null; });
    const onOver = fire => { patch(c => { if (c.rest) c.rest.alerted = true; }); if (fire) alertRestOver(data.prefs.sound); };
    const setPrefs = fn => update(d => { fn(d.prefs); return d; });
    const discard = () => { setPanel(null); setMenu(null); setBad(null); update(d => { d.current = null; return d; }); top(); };
    const saveFinish = () => {
      update(d => { if (!d.current) return d; const r = finishWorkout(d.current, Date.now(), names); if (r.ok) { d.workouts.push(r.workout); d.current = null; } return d; });
      setPanel(null); setMenu(null); setBad(null); top();
    };

    const fin = panel === 'finish' ? finishWorkout(cur, Date.now(), names) : null;
    return html`<div class="wkv">
      <div class="wk-head">
        <button type="button" class="btn primary" id="wk-finish" onClick=${() => { setMenu(null); setPanel('finish'); }}>خلّص</button>
        <div class="wk-title"><h1>${cur.routineName || 'تمرينة'}</h1><${WorkoutClock} cur=${cur} onOver=${onOver} /></div>
        <button type="button" class="icon-btn" id="wk-rest-btn" aria-label="إعداد وقت الراحة" onClick=${() => { setMenu(null); setPanel('rest'); }}><${Stopwatch} /></button>
        <button type="button" class="icon-btn" aria-label="خيارات التمرينة" aria-expanded=${menu === 'w' ? 'true' : 'false'} onClick=${() => setMenu(menu === 'w' ? null : 'w')}><${Dots} /></button>
      </div>
      ${warn}
      ${menu === 'w' ? html`<div class="panel wk-menu"><button type="button" class="btn danger" onClick=${() => { setMenu(null); setPanel('discard'); }}>إلغاء التمرينة</button></div>` : null}
      ${cur.exercises.length ? cur.exercises.map((e, ei) => {
        const prev = previousSets(data.workouts, e.exId, cur.startedAt);
        const nm = names[e.exId] || e.exId;
        return html`<section class="panel wk-ex" key=${ei + ':' + e.exId}>
          <div class="wk-ex-head">
            <div class="wk-ex-visual"><${ExerciseIllustration} exId=${e.exId} name=${nm} /><h2><bdi>${nm}</bdi></h2></div>
            <button type="button" class="icon-btn" aria-label=${'خيارات ' + nm} aria-expanded=${menu === ei ? 'true' : 'false'} onClick=${() => setMenu(menu === ei ? null : ei)}><${Dots} /></button>
          </div>
          ${menu === ei ? html`<div class="wk-menu"><button type="button" class="btn danger" onClick=${() => dropExercise(ei)}>شيل التمرين</button></div>` : null}
          <div class="wk-sets">
            <div class="wk-set wk-set-head" aria-hidden="true"><span>#</span><span>السابق</span><span>كجم</span><span>تكرار</span><span></span></div>
            ${e.sets.map((s, si) => {
              const p = prev[si], err = bad && bad.ei === ei && bad.si === si ? bad : null;
              return html`<div key=${si}>
                <div class=${'wk-set' + (s.done ? ' is-done' : '')}>
                  <span class="wk-no num">${si + 1}</span>
                  <span class="wk-prev">${p ? html`<bdi dir="ltr">${p.w} × ${p.r}</bdi>` : '—'}</span>
                  <input class="wk-in" type="text" inputmode="decimal" dir="ltr" autocomplete="off" aria-label=${nm + '، مجموعة ' + (si + 1) + '، الوزن بالكيلو'} aria-invalid=${err && err.field === 'w' ? 'true' : 'false'} value=${s.w} onInput=${ev => setField(ei, si, 'w', ev.target.value)} />
                  <input class="wk-in" type="text" inputmode="numeric" dir="ltr" autocomplete="off" aria-label=${nm + '، مجموعة ' + (si + 1) + '، التكرارات'} aria-invalid=${err && err.field === 'r' ? 'true' : 'false'} value=${s.r} onInput=${ev => setField(ei, si, 'r', ev.target.value)} />
                  <button type="button" class="wk-done" aria-pressed=${s.done ? 'true' : 'false'} aria-label=${(s.done ? 'رجّع مجموعة ' : 'خلّصت مجموعة ') + (si + 1)} onClick=${() => toggleDone(ei, si)}><${CheckSvg} /></button>
                </div>
                ${rest && rest.ei === ei && rest.si === si ? html`<${RestRow} rest=${rest} onAdd=${addRest} onSkip=${skipRest} />` : null}
                ${err ? html`<p class="form-err" role="alert">${err.msg}</p>` : null}
              </div>`;
            })}
          </div>
          <div class="wk-add">
            <button type="button" class="btn" onClick=${() => addSet(ei)}><${Plus} />ضيف مجموعة (<bdi dir="ltr">${formatClock(data.prefs.restSeconds * 1000)}</bdi>)</button>
            ${e.sets.length > 1 ? html`<button type="button" class="btn ghost" onClick=${() => dropSet(ei)}>شيل آخر مجموعة</button>` : null}
          </div>
        </section>`;
      }) : html`<p class="empty">ضيف أول تمرين وابدأ سجّل.</p>`}
      <button type="button" class="btn" id="wk-add-ex" onClick=${() => { setMenu(null); setPanel('pick'); top(); }}><${Plus} />ضيف تمرين</button>
      ${panel === 'finish' ? html`<${Sheet} label="إنهاء التمرينة" onClose=${() => setPanel(null)}>
        ${fin.ok ? html`<p><b>تخلّص التمرينة؟</b></p><p class="small"><bdi>${fin.workout.exercises.reduce((n, x) => n + x.sets.length, 0)}</bdi> مجموعة · <bdi>${fin.workout.exercises.length}</bdi> تمرين · المدة <bdi dir="ltr">${formatClock(elapsedMs(cur.startedAt, Date.now()))}</bdi>${fin.dropped ? html`<br /><bdi>${fin.dropped}</bdi> مجموعة مش معلّمة خلصانة، وهتتشال.` : null}</p>`
          : html`<p><b>${fin.error}</b></p><p class="small muted">علّم مجموعة بالأرقام وبعدين خلّص.</p>`}
        <div class="wk-sheet-actions"><button type="button" class="btn primary" disabled=${!fin.ok} onClick=${saveFinish}>احفظ التمرينة</button><button type="button" class="btn" data-first="1" onClick=${() => setPanel(null)}>كمّل</button></div>
      <//>` : null}
      <${WakeLock} />
      ${panel === 'rest' ? html`<${Sheet} label="وقت الراحة" onClose=${() => setPanel(null)}>
        <p><b>وقت الراحة بين المجموعات</b></p>
        <div class="wk-step"><button type="button" class="btn" aria-label="قلّل 15 ثانية" onClick=${() => setPrefs(p => { p.restSeconds = Math.max(10, p.restSeconds - 15); })}>−15</button><bdi dir="ltr" class="num wk-step-v" aria-live="polite">${formatClock(data.prefs.restSeconds * 1000)}</bdi><button type="button" class="btn" aria-label="زوّد 15 ثانية" onClick=${() => setPrefs(p => { p.restSeconds = Math.min(600, p.restSeconds + 15); })}>+15</button></div>
        <button type="button" class="btn" role="switch" aria-checked=${data.prefs.sound ? 'true' : 'false'} onClick=${() => setPrefs(p => { p.sound = !p.sound; })}>التنبيه الصوتي: ${data.prefs.sound ? 'شغّال' : 'مقفول'}</button>
        <div class="wk-sheet-actions"><button type="button" class="btn primary" data-first="1" onClick=${() => setPanel(null)}>تمام</button></div>
      <//>` : null}
      ${panel === 'discard' ? html`<${Sheet} label="إلغاء التمرينة" onClose=${() => setPanel(null)}>
        <p><b>متأكد؟</b></p><p class="small">التمرينة مش هتتحفظ والأرقام اللي كتبتها هتروح.</p>
        <div class="wk-sheet-actions"><button type="button" class="btn danger" onClick=${discard}>أيوه، الغيها</button><button type="button" class="btn" data-first="1" onClick=${() => setPanel(null)}>لأ</button></div>
      <//>` : null}
    </div>`;
  }

