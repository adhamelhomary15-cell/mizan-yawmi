  /* ---------------- postponing (the rules are in the "postpone rules" block) ---------------- */
  const minToHM = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const canPostpone = b => !!(CATS[b.cat] && CATS[b.cat].postpone);
  const isFreeCat = c => !!(CATS[c] && CATS[c].free);
  // The first day a postponed item may go to: the day after the reviewed one, and never a day already past.
  const postponeStart = (iso, now) => { const n = addDays(iso, 1); return n > now.iso ? n : now.iso; };
  const postponeDays = (start, n, store, now) => Array.from({length: n}, (_, i) => addDays(start, i)).map(d => {
    const bl = dayBlocks(d, store);
    return {iso: d, blocks: bl, extras: bl.filter(b => b.extra), from: d === now.iso ? now.min : START};
  });
  // One store change for any number of moves; act() snapshots the store, so one undo puts everything back.
  const applyPostpone = (iso, moves, taskIds, taskTo) => s => {
    moves.forEach(({b, to}) => {
      const c = s.checks[iso] || {}; c[b.key] = {moved: to.iso}; s.checks[iso] = c;
      const list = (s.extras[to.iso] || []).slice();
      // stored like the app's other times: after midnight as 00:00-06:59, which hmToMin reads as the same night
      const x = {id: uid36(), s: minToHM(to.s % 1440), e: minToHM(to.e % 1440), cat: b.cat, title: String(b.title).slice(0, 120), from: b.from || iso};
      if (b.subj) x.subj = b.subj;
      list.push(x); s.extras[to.iso] = list;
    });
    (taskIds || []).forEach(id => { const t = s.tasks.find(x => x.id === id); if (t) t.due = taskTo; });
    return s;
  };
  // The open tasks due on a day.
  const tasksDue = (store, iso) => store.tasks.filter(t => !t.done && t.due === iso);
  // One task moved to another day. Its undo puts back that task's date only, so a block ticked in the meantime stays.
  const postponeTask = (actEdit, t, to) => {
    const setDue = due => s => { const x = s.tasks.find(y => y.id === t.id); if (x) x.due = due; return s; };
    actEdit('اتأجلت المهمة لـ ' + dayName(to), setDue(to), setDue(t.due));
  };
  const finishTask = id => s => { const x = s.tasks.find(y => y.id === id); if (x) x.done = true; return s; };
  const PLACE_ERR = {none: 'اختار ميعاد.', late: 'الميعاد ده بيعدّي آخر اليوم.'};

  // The inline proposal under one review row: «تمام» takes it, «غيّر» opens a day and time picker, «لأ» closes.
  function PostponePanel({b, iso, now, store, act, onClose}){
    const start = postponeStart(iso, now), len = b.e - b.s;
    const prop = useMemo(() => proposePlaces([{len}], postponeDays(start, 7, store, now), isFreeCat)[0], []);
    const [manual, setManual] = useState(!prop);
    const days14 = useMemo(() => Array.from({length: 14}, (_, i) => addDays(start, i)), []);
    const [day, setDay] = useState(prop ? prop.iso : start);
    const [time, setTime] = useState(prop ? minToHM(prop.s % 1440) : '');
    const [err, setErr] = useState('');
    const ref = useRef(null);
    useEffect(() => { const f = ref.current && ref.current.querySelector('[data-first]'); if (f) f.focus(); }, []);
    useEscape(onClose);
    const go = to => { act('اتأجلت "' + blockName(b, store) + '" لـ ' + dayName(to.iso), applyPostpone(iso, [{b, to}])); onClose(); };
    const pick = () => {
      const bl = dayBlocks(day, store), s = time ? hmToMin(time) : NaN;
      const r = checkManualPlace(bl, bl.filter(x => x.extra), s, len, START, END, c => !!CATS[c].track);
      if (!r.ok) { setErr(r.code === 'clash' ? 'الميعاد ده بيتداخل مع ' + plainTitle(r.title) + '.' : PLACE_ERR[r.code]); return; }
      go({iso: day, s, e: r.e});
    };
    return html`<div class="postpone" ref=${ref} role="group" aria-label=${'تأجيل ' + blockName(b, store)}>
      ${!manual ? html`<p class="small">هتتحط <bdi>${dayName(prop.iso)}</bdi> من <bdi>${fmtStr(prop.s)}</bdi> لحد <bdi>${fmtStr(prop.e)}</bdi></p>
        <span class="backup-act"><button type="button" class="btn primary" data-first="1" onClick=${() => go(prop)}>تمام</button><button type="button" class="btn" onClick=${() => setManual(true)}>غيّر</button><button type="button" class="btn ghost" onClick=${onClose}>لأ</button></span>`
      : html`${prop ? null : html`<p class="small">مفيش وقت فاضي يسعها في الأسبوع الجاي، اختار يوم وميعاد.</p>`}
        <div class="form-row">
          <label class="field">اليوم<select value=${day} onChange=${e => { setDay(e.target.value); setErr(''); }}>${days14.map(d => html`<option value=${d}>${dayName(d)}</option>`)}</select></label>
          <label class="field">من<input type="time" value=${time} onInput=${e => { setTime(e.target.value); setErr(''); }} /></label>
        </div>
        ${err ? html`<p class="form-err" role="alert">${err}</p>` : null}
        <span class="backup-act"><button type="button" class="btn primary" data-first="1" onClick=${pick}>أجّلها هنا</button><button type="button" class="btn ghost" onClick=${onClose}>لأ</button></span>`}
    </div>`;
  }

  function Review({iso, now, store, update, skip, act, actEdit, onClose}){
    const isToday = iso === now.iso;
    const tracked = dayBlocks(iso, store).filter(b => CATS[b.cat].track);
    const open = tracked.filter(b => statusOf(store, iso, b.key) === null && (!isToday || b.s <= now.min));
    const later = isToday ? tracked.filter(b => statusOf(store, iso, b.key) === null && b.s > now.min).length : 0;
    const ab = balanceOf([iso], store);
    const [pp, setPp] = useState(null);        // the key of the row whose proposal is open
    const [batch, setBatch] = useState(null);  // the list of proposals for «أجّل اللي فاضل كله»
    const dueTasks = tasksDue(store, iso);
    const movable = open.filter(canPostpone);
    const taskTo = postponeStart(iso, now);
    const openBatch = () => {
      const places = proposePlaces(movable.map(b => ({len: b.e - b.s})), postponeDays(taskTo, 7, store, now), isFreeCat);
      setPp(null); setBatch(movable.map((b, i) => ({b, to: places[i]})));
    };
    const applyBatch = () => {
      const moves = batch.filter(x => x.to), n = moves.length + dueTasks.length;
      act('اتأجل ' + n + ' حاجة', applyPostpone(iso, moves, dueTasks.map(t => t.id), taskTo));
      setBatch(null);
    };
    return html`<section class="review" aria-label="مراجعة اليوم">
      <div class="sec-head"><h2>${isToday ? 'راجع يومك' : 'مراجعة ' + DAY_NAMES[weekday(iso)]}</h2><button type="button" class="btn ghost small" onClick=${onClose}>اقفل</button></div>
      ${open.length ? html`<ul class="review-list">
        ${open.map(b => html`<li class=${kc(b.cat)}>
          <div class="review-text"><span class="title"><${Title} text=${b.title} cat=${b.cat} /></span><span class="meta"><b>${CATS[b.cat].label}</b> · ${fmtStr(b.s)} لحد ${fmtStr(b.e)}</span></div>
          <div class="review-actions">
            <button type="button" class="btn primary" onClick=${() => setStatus(update, iso, b.key, 'done')}><${CheckSvg} />خلّصته</button>
            ${canPostpone(b) ? html`<button type="button" class="btn" aria-expanded=${pp === b.key ? 'true' : 'false'} onClick=${() => { setBatch(null); setPp(pp === b.key ? null : b.key); }}>أجّلها</button>` : null}
            <button type="button" class="btn" onClick=${() => skip(b)}>اتلغى</button>
          </div>
          ${pp === b.key ? html`<${PostponePanel} key=${b.key} b=${b} iso=${iso} now=${now} store=${store} act=${act} onClose=${() => setPp(null)} />` : null}
        </li>`)}
      </ul>` : html`<p class="review-empty">${later ? 'كل اللي فات متعلّم.' : 'كل بلوكات اليوم متعلّمة.'}</p>`}
      ${dueTasks.length ? html`<ul class="review-list review-tasks" aria-label="مهام ميعادها اليوم ده">
        ${dueTasks.map(t => html`<li class=${'c-' + (t.tag === 'quran' ? 'quran' : t.tag === 'work' ? 'work' : 'study')}>
          <div class="review-text"><span class="title">${t.text}</span><span class="meta"><b>مهمة</b> · ميعادها اليوم ده</span></div>
          <div class="review-actions">
            <button type="button" class="btn primary" onClick=${() => update(finishTask(t.id))}><${CheckSvg} />خلّصتها</button>
            <button type="button" class="btn" onClick=${() => postponeTask(actEdit, t, taskTo)}>أجّلها</button>
          </div>
        </li>`)}
      </ul>` : null}
      ${movable.length + dueTasks.length > 1 && !batch ? html`<button type="button" class="btn review-all" onClick=${openBatch}>أجّل اللي فاضل كله</button>` : null}
      ${batch ? html`<div class="notice postpone-batch" role="group" aria-label="تأجيل اللي فاضل"><p>
          ${batch.map(x => html`<span class="small"><${Title} text=${x.b.title} cat=${x.b.cat} /> ← ${x.to ? html`<bdi>${dayName(x.to.iso)}</bdi> <bdi>${fmtStr(x.to.s)}</bdi>–<bdi>${fmtStr(x.to.e)}</bdi>` : 'مفيش مكان، هيفضل زي ما هو'}</span>`)}
          ${dueTasks.map(t => html`<span class="small">${t.text} ← <bdi>${dayName(taskTo)}</bdi></span>`)}
        </p>
        <span class="backup-act"><button type="button" class="btn primary" onClick=${applyBatch}>أجّلهم</button><button type="button" class="btn ghost" onClick=${() => setBatch(null)}>لأ</button></span></div>` : null}
      ${open.length > 1 ? html`<button type="button" class="btn review-all" onClick=${() => act('اتعلّم ' + open.length + ' بلوك إنهم خلصوا', s => { const c = s.checks[iso] || {}; open.forEach(b => { c[b.key] = true; }); s.checks[iso] = c; return s; })}><${CheckSvg} />علّمهم كلهم خلصوا</button>` : null}
      ${later ? html`<p class="small muted">فاضل <bdi class="num">${later}</bdi> بلوك لسه ميعادهم مجاش.</p>` : null}
      <${DayProgress} iso=${iso} store=${store} />
      <${Balance} key=${iso} a=${ab.a} b=${ab.b} label=${isToday ? 'النهارده' : 'اليوم ده'} />
    </section>`;
  }

  function AddBlock({iso, update, onDone}){
    const [title, setTitle] = useState('');
    const [s, setS] = useState('');
    const [e, setE] = useState('');
    const [cat, setCat] = useState('study');
    const [err, setErr] = useState('');
    const submit = ev => {
      ev.preventDefault();
      if (!title.trim()) return setErr('اكتب اسم الحاجة.');
      if (!s || !e) return setErr('اختار هتبدأ إمتى وهتخلص إمتى.');
      if (hmToMin(e) <= hmToMin(s)) return setErr('ميعاد الخلصان لازم يكون بعد البداية.');
      setErr('');
      update(st => { const list = (st.extras[iso] || []).slice(); list.push({id: uid36(), s, e, cat, title: title.trim().slice(0, 80)}); st.extras[iso] = list; return st; });
      onDone();
    };
    return html`<form class="panel add-form" onSubmit=${submit}>
      <div class="sec-head"><h2>حاجة زيادة لليوم ده</h2><button type="button" class="btn ghost small" onClick=${onDone}>إلغاء</button></div>
      <div class="form-row">
        <label class="field wide" for="ab-title">إيه هي<input id="ab-title" value=${title} onInput=${x => setTitle(x.target.value)} placeholder="مثلاً: محاضرة تعويضية" maxlength="80" /></label>
        <label class="field" for="ab-s">من<input id="ab-s" type="time" value=${s} onInput=${x => setS(x.target.value)} /></label>
        <label class="field" for="ab-e">لحد<input id="ab-e" type="time" value=${e} onInput=${x => setE(x.target.value)} /></label>
        <label class="field" for="ab-cat">النوع<select id="ab-cat" value=${cat} onChange=${x => setCat(x.target.value)}>
          ${KIND_IDS.filter(k => k !== 'move' && k !== 'rest').map(k => html`<option value=${k}>${CATS[k].label}</option>`)}</select></label>
      </div>
      ${err ? html`<p class="form-err" role="alert">${err}</p>` : null}
      <div><button type="submit" class="btn primary">ضيفها</button></div>
    </form>`;
  }

  function TodayView({iso, setIso, now, store, update, goTab, remove, act, actEdit}){
    const skip = b => act('اتلغى "' + blockName(b, store) + '" النهارده', s => { const c = s.checks[iso] || {}; c[b.key] = 'skip'; s.checks[iso] = c; return s; });
    const blocks = dayBlocks(iso, store);
    const p = prayers(iso);
    const appts = apptsFor(iso, store);
    const isToday = iso === now.iso;
    const [open, setOpen] = useState(null);
    const [adding, setAdding] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    const [postponing, setPostponing] = useState(null);   // the key of the block whose postpone panel is open
    useEffect(() => { setOpen(null); setAdding(false); setPostponing(null); }, [iso]);
    const dayTasks = store.tasks.filter(t => !t.done && t.due && (t.due === iso || (isToday && t.due < iso)));
    const wd = weekday(iso);
    const ab = balanceOf([iso], store);
    // The «الآن» line (feature 023): today only, on top of the row nowPlace names, so no row moves.
    const place = isToday ? nowPlace(blocks, now.min) : null;
    const nowTop = place && (place.at === 'in' ? (place.share * 100).toFixed(2) + '%' : place.at === 'top' ? '-3px' : 'calc(100% + 3px)');
    // Near a row's edge the label sits on the row's side of the line, so it never spills into the next row.
    const nowSide = place && place.at === 'in' ? (place.share < .25 ? ' lo' : place.share > .75 ? ' hi' : '') : '';

    return html`<div class="today-view">
      <div class="sec o-head">
        <div class="top">
          <div class="top-meta">
            <h1>${DAY_NAMES[wd]}</h1>
            <p class="sub">${dateLabel(iso)}${isToday ? ' · النهارده' : ''}</p>
          </div>
          <div class="head-actions">
            ${!isToday ? html`<button type="button" class="btn" onClick=${() => setIso(now.iso)}>النهارده</button>` : null}
            <button type="button" class="btn" aria-expanded=${reviewing ? 'true' : 'false'} onClick=${() => setReviewing(!reviewing)}>${reviewing ? 'اقفل المراجعة' : 'راجع يومك'}</button>
            <${WeekArrows} iso=${iso} setIso=${setIso} />
          </div>
        </div>
        <${DayPicker} iso=${iso} setIso=${setIso} now=${now} />
      </div>

      <div class="today-main">
        <div class="o-now">${reviewing ? html`<${Review} iso=${iso} now=${now} store=${store} update=${update} skip=${skip} act=${act} actEdit=${actEdit} onClose=${() => setReviewing(false)} />`
          : isToday ? html`<${AskPostpone} now=${now} store=${store} update=${update} actEdit=${actEdit} onReview=${d => { setIso(d); setReviewing(true); }} /><${NowCard} iso=${iso} now=${now} store=${store} update=${update} skip=${skip} onReview=${() => setReviewing(true)} />` : html`<${DayProgress} iso=${iso} store=${store} />`}</div>

        <div class="sec o-timeline">
          <ol class="timeline">
            ${blocks.map((b, i) => {
              const quiet = b.cat === 'rest' || b.cat === 'move';
              const tracked = CATS[b.cat].track;
              const cur = isToday && now.min >= b.s && now.min < b.e;
              const st = statusOf(store, iso, b.key);
              const isOpen = open === b.key;
              // The proposal shows only while the block has no mark: one ticked or cancelled meanwhile keeps it (Principle II)
              const proposing = postponing === b.key && st === null;
              // «أجّلها» on the row itself once the block's time has come (feature 029); an opened row has it among its actions
              const onRow = tracked && st === null && canPostpone(b) && timeHasCome(iso, b.s, now.iso, now.min) && !isOpen;
              const marks = [];
              if (p) PRAYERS.forEach(([k, name]) => { if (k !== 'fajr' && p[k] >= b.s && p[k] < b.e) marks.push({kind:'pr', text:(wd === 5 && k === 'dhuhr' ? 'الجمعة' : name) + ' ' + fmtStr(p[k]), at:p[k]}); });
              appts.forEach(a => { if (a.min >= b.s && a.min < b.e) marks.push({kind:'appt', text:a.label + ' ' + fmtStr(a.min), at:a.min}); });
              marks.sort((x, y) => x.at - y.at);
              const markEls = marks.length ? html`<span class="marks">${marks.map(m => html`<span class=${'mk' + (m.kind === 'appt' ? ' appt' : '')}>${m.kind === 'pr' ? html`<${Moon} />` : null}${m.text}</span>`)}</span>` : null;
              const body = html`
                <span class="title"><${Title} text=${b.title} cat=${b.cat} />${quiet ? html`<span class="muted small"> · ${durText(b.e - b.s)}</span>` : null}${cur ? html`<span class="now-pill">دلوقتي</span>` : null}</span>
                ${quiet ? (b.detail ? html`<span class="meta">${b.detail}</span>` : null)
                  : html`<span class="meta"><b>${CATS[b.cat].label}</b>${st === 'skip' ? ' · اتلغى' : ''}${st === 'moved' ? html` · اتأجل لـ <bdi>${dayName(movedTo(store, iso, b.key))}</bdi>` : null}${b.detail ? ' · ' + b.detail : ''}</span>`}
                ${markEls}`;
              return html`<li class=${'row ' + (quiet ? 'quiet' : 'main') + ' ' + kc(b.cat) + (cur ? ' is-now' : '') + (st === 'done' ? ' done' : '') + (st === 'skip' ? ' skipped' : '') + (st === 'moved' ? ' skipped moved' : '') + (onRow ? ' has-pp' : '')}>
                <div>${tracked && st !== 'moved' ? html`<${Check} on=${st === 'done'} cat=${b.cat} label=${'خلّصت: ' + blockName(b, store)} onToggle=${() => setStatus(update, iso, b.key, st === 'done' ? null : 'done')} />` : null}</div>
                <div class="time"><span><${Time} min=${b.s} /></span>${quiet ? null : html`<span class="end">لحد <${Time} min=${b.e} /></span>`}</div>
                ${quiet && !b.extra
                  ? html`<div class="row-body">${body}</div>`
                  : html`<button type="button" class="row-body" aria-expanded=${isOpen ? 'true' : 'false'} onClick=${() => { setOpen(isOpen ? null : b.key); setPostponing(null); }}>${body}</button>`}
                ${quiet ? null : html`<span class="denom" aria-hidden="true">${(b.e - b.s) < 60 ? (b.e - b.s) : hoursText(b.e - b.s)}<small>${(b.e - b.s) < 60 ? 'د' : 'س'}</small></span>`}
                ${onRow ? html`<div class="row-pp"><button type="button" class="btn" aria-label=${'أجّلها: ' + blockName(b, store)} aria-expanded=${postponing === b.key ? 'true' : 'false'} onClick=${() => { setOpen(null); setPostponing(postponing === b.key ? null : b.key); }}>أجّلها</button></div>` : null}
                ${isOpen ? html`<div class="row-actions">
                  ${tracked && st === 'moved' ? html`<button type="button" class="btn" onClick=${() => { setOpen(null); setIso(movedTo(store, iso, b.key)); }}>روح لليوم ده</button>`
                    : tracked ? (st === 'skip'
                    ? html`<button type="button" class="btn" onClick=${() => { setStatus(update, iso, b.key, null); setOpen(null); }}>رجّعه للجدول</button>`
                    : html`<button type="button" class="btn" onClick=${() => { setOpen(null); skip(b); }}>اتلغى النهارده</button>`) : null}
                  ${tracked && st === null && canPostpone(b) ? html`<button type="button" class="btn" aria-expanded=${postponing === b.key ? 'true' : 'false'} onClick=${() => setPostponing(postponing === b.key ? null : b.key)}>أجّلها</button>` : null}
                  ${b.extra ? html`<button type="button" class="btn ghost" onClick=${() => { setOpen(null); remove('اتمسحت "' + b.title + '"', s => { s.extras[iso] = (s.extras[iso] || []).filter(x => x.id !== b.extra); return s; }); }}>امسحها</button>` : null}
                </div>` : null}
                ${proposing ? html`<${PostponePanel} key=${b.key} b=${b} iso=${iso} now=${now} store=${store} act=${act} onClose=${() => { setPostponing(null); setOpen(null); }} />` : null}
                ${place && place.row === i ? html`<span class=${'nowline at-' + place.at + nowSide} style=${{top: onRow && place.at === 'in' ? 'calc(' + place.share.toFixed(4) + ' * (100% - var(--pp)))' : nowTop}} aria-hidden="true"><span class="nowline-t">الآن <${Time} min=${now.min} /></span></span>` : null}
              </li>`;
            })}
          </ol>
          ${adding ? html`<${AddBlock} iso=${iso} update=${update} onDone=${() => setAdding(false)} />`
            : html`<button type="button" class="btn add-block" onClick=${() => setAdding(true)}><${Plus} />ضيف حاجة لليوم ده</button>`}
          ${(dayOfDate(iso) || {}).note ? html`<p class="note">${dayOfDate(iso).note}</p>` : null}
          ${ANCHOR_NOTICES[dayNotice(iso)] ? html`<p class="note">${ANCHOR_NOTICES[dayNotice(iso)]}</p>` : null}
          <p class="small muted">دوس على أي بلوك عشان تلغيه أو تأجّله.${p ? 'الفجر ' + fmtStr(p.fajr) + '، والمواعيد محسوبة لـ ' + (CFG.location.label || 'موقعك') + ' بطريقة ' + CFG.prayerMethod + '.' : ''}</p>
        </div>
      </div>

      <aside class="today-side">
        ${mainCourse(store) ? html`<div class="o-target"><${TargetCard} iso=${iso} store=${store} goTab=${goTab} /></div>` : null}
        ${dayTasks.length ? html`<div class="sec o-tasks">
          <div class="sec-head"><h2>مهام ${isToday ? 'النهارده' : 'اليوم ده'}</h2><button type="button" class="btn ghost small" onClick=${() => goTab('tasks')}>كل المهام</button></div>
          <div class="panel tlist">
            ${dayTasks.map(t => { const late = t.due < iso; return html`<div class=${'titem has-act c-' + t.tag}>
              <${Check} on=${false} cat=${t.tag} label=${'خلّص: ' + t.text} onToggle=${() => update(finishTask(t.id))} />
              <span class="ttext">${t.text}</span>
              <span class=${'tdue' + (late ? ' late' : '')}>${late ? 'متأخرة' : TASK_TAGS[t.tag]}</span>
              <button type="button" class="btn" aria-label=${'أجّلها: ' + t.text} onClick=${() => postponeTask(actEdit, t, taskNextDay(t.due, now.iso, addDays))}>أجّلها</button>
            </div>`; })}
          </div>
        </div>` : null}
        <div class="sec o-prayers"><h2>مواعيد الصلاة</h2><${PrayerCard} iso=${iso} now=${now} /></div>
        <div class="sec o-balance"><h2>ميزان اليوم</h2><div class="panel"><${Balance} key=${iso} a=${ab.a} b=${ab.b} label="النهارده" /></div></div>
      </aside>
    </div>`;
  }

