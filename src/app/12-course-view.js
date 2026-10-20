  /* ---------------- Course ---------------- */
  function CourseForm({now, onSave, onCancel}){
    const [name, setName] = useState('');
    const [sub, setSub] = useState('');
    const [from, setFrom] = useState(now.iso);
    const [to, setTo] = useState(addDays(now.iso, 27));
    const [count, setCount] = useState('8');
    const [mods, setMods] = useState('');
    const [err, setErr] = useState('');
    const fillNumbers = () => {
      const n = Math.max(1, Math.min(60, parseInt(count, 10) || 0));
      setMods(Array.from({length: n}, (_, i) => 'موديول ' + (i + 1)).join('\n'));
    };
    const submit = e => {
      e.preventDefault();
      const lines = mods.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 60);
      if (!name.trim()) return setErr('اكتب اسم الكورس.');
      if (!isISO(from) || !isISO(to)) return setErr('اختار تاريخ البداية وتاريخ الهدف.');
      if (to < from) return setErr('تاريخ الهدف لازم يكون بعد البداية.');
      if (!lines.length) return setErr('اكتب الموديولات، كل موديول في سطر، أو دوس "اعمل قايمة بالأرقام".');
      setErr('');
      onSave({id: 'c' + uid36(), name: name.trim().slice(0, 60), sub: sub.trim().slice(0, 120), from, to, modules: lines.map((t, i) => ({id: 'm' + (i + 1) + '-' + uid36(), title: t.slice(0, 120)})), done: {}});
    };
    return html`<form class="panel form course-form" onSubmit=${submit}>
      <div class="sec-head"><h2>كورس جديد</h2><button type="button" class="btn ghost small" onClick=${onCancel}>إلغاء</button></div>
      <div class="form-row">
        <label class="field wide" for="cf-name">اسم الكورس<input id="cf-name" value=${name} onInput=${e => setName(e.target.value)} placeholder="مثلاً: Python for Cybersecurity" maxlength="60" /></label>
        <label class="field wide" for="cf-sub">وصف قصير (اختياري)<input id="cf-sub" value=${sub} onInput=${e => setSub(e.target.value)} placeholder="المنصة أو المدرّس أو الهدف منه" maxlength="120" /></label>
        <label class="field" for="cf-from">هبدأ يوم<input id="cf-from" type="date" value=${from} onInput=${e => setFrom(e.target.value)} /></label>
        <label class="field" for="cf-to">عايز أخلّصه يوم<input id="cf-to" type="date" value=${to} onInput=${e => setTo(e.target.value)} /></label>
      </div>
      <label class="field wide" for="cf-mods">الموديولات أو الدروس، كل واحد في سطر
        <textarea id="cf-mods" value=${mods} onInput=${e => setMods(e.target.value)} placeholder=${'Intro & Setup\nCore Concepts\nFirst Project'}></textarea>
      </label>
      <div class="form-row to-end">
        <label class="field narrow" for="cf-count">عدد الموديولات<input id="cf-count" type="number" min="1" max="60" value=${count} onInput=${e => setCount(e.target.value)} /></label>
        <button type="button" class="btn" onClick=${fillNumbers}>اعمل قايمة بالأرقام</button>
      </div>
      <p class="small muted">التطبيق بيوزّع الموديولات على الأسابيع من البداية لحد الهدف لوحده.</p>
      ${err ? html`<p class="form-err" role="alert">${err}</p>` : null}
      <div><button type="submit" class="btn primary">ضيف الكورس</button></div>
    </form>`;
  }

  function CourseView({now, store, update, remove}){
    const [sel, setSel] = useState(store.mainCourse);
    const [adding, setAdding] = useState(false);
    const courses = allCourses(store);
    const c = courses.find(x => x.id === sel) || mainCourse(store);
    const isMain = c.id === store.mainCourse;
    const plan = planOf(c), dm = doneMap(store, c);
    const all = plan.reduce((a, w) => a.concat(w.items), []);
    const n = all.filter(it => dm[it[3]]).length;
    const today = now.iso;
    const perWeek = Math.max(1, Math.round(all.length / Math.max(1, plan.length)));

    const save = course => { update(s => { s.courses.push(course); return s; }); setAdding(false); setSel(course.id); };
    const makeMain = () => update(s => { s.mainCourse = c.id; return s; });
    const del = () => { setSel(SETTINGS_COURSE_ID); remove('اتمسح كورس "' + c.name + '"', s => { s.courses = s.courses.filter(x => x.id !== c.id); if (s.mainCourse === c.id) s.mainCourse = SETTINGS_COURSE_ID; return s; }); };

    return html`<div class="coursev">
      <div class="top">
        <div class="top-meta">
          <h1><bdi>${c.name}</bdi></h1>
          <p class="sub">${isMain ? 'الكورس الأساسي، التارجت الأول للفترة دي' : 'كورس إضافي'}</p>
          <p class="small muted">${c.sub ? html`<bdi dir="rtl">${c.sub}</bdi> · ` : null}من ${dateLabel(c.from)} لحد ${dateLabel(c.to)}</p>
        </div>
        <button type="button" class="btn primary" aria-expanded=${adding ? 'true' : 'false'} onClick=${() => setAdding(!adding)}><${Plus} /><span>كورس جديد</span></button>
      </div>

      ${adding ? html`<${CourseForm} now=${now} onSave=${save} onCancel=${() => setAdding(false)} />` : null}

      ${courses.length > 1 ? html`<div class="chips" aria-label="الكورسات">
        ${courses.map(x => html`<button type="button" class="btn small" aria-pressed=${x.id === c.id ? 'true' : 'false'} onClick=${() => setSel(x.id)}>
          ${x.id === store.mainCourse ? html`<${Star} />` : null}<bdi>${x.name}</bdi></button>`)}
      </div>` : null}

      <div class="prog c-course">
        <div class="prog-row"><span>خلّصت <bdi class="num">${n}</bdi> من <bdi class="num">${all.length}</bdi> موديول</span><span class="muted small">${c.fromSettings ? 'موديولين كل أسبوع تقريباً' : 'حوالي ' + perWeek + ' في الأسبوع'}</span></div>
        <div class="track"><div class="fill" style=${{width: (all.length ? n/all.length*100 : 0).toFixed(1) + '%'}}></div></div>
      </div>

      ${!c.fromSettings || !isMain ? html`<div class="form-row">
        ${!isMain ? html`<button type="button" class="btn" onClick=${makeMain}>خليه الكورس الأساسي</button>` : null}
        ${!c.fromSettings ? html`<button type="button" class="btn ghost" onClick=${del}>امسح الكورس</button>` : null}
      </div>` : null}
      ${isMain && !c.fromSettings ? html`<p class="small muted">وقت الكورس في الجدول اليومي بقى لـ <bdi>${c.name}</bdi>.</p>` : null}

      <h2>الخطة أسبوع بأسبوع</h2>
      <div class="weeks">
        ${plan.map((w, wi) => {
          const cur = today >= w.from && today <= w.to;
          return html`<div class=${'week' + (cur ? ' is-current' : '')}>
            <div class="week-head"><h3>الأسبوع ${wi + 1}</h3><span class="week-dates">${w.label}${cur ? html` · <span class="cur-pill">الأسبوع ده</span>` : null}</span></div>
            ${w.note ? html`<p class="week-note">${w.note}</p>` : null}
            ${w.items.map(it => {
              const on = !!dm[it[3]];
              return html`<div class=${'mod' + (on ? ' done' : '')}>
                <${Check} on=${on} cat="course" label=${'خلّصت: ' + it[1]} onToggle=${() => toggleModule(update, c, it[3])} />
                <span class="mnum" dir="ltr">${it[0]}</span>
                <span class="mtitle"><bdi>${it[1]}</bdi>${it[2] ? html` <span class="mextra">· ${it[2]}</span>` : null}</span>
              </div>`;
            })}
          </div>`;
        })}
      </div>
    </div>`;
  }

