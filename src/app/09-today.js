  /* ---------------- Today ---------------- */
  function WeekArrows({iso, setIso}){
    return html`<span class="arrows">
      <button type="button" class="icon-btn" aria-label="الأسبوع اللي فات" onClick=${() => setIso(addDays(iso, -7))}><${Chevron} dir="prev" /></button>
      <button type="button" class="icon-btn" aria-label="الأسبوع الجاي" onClick=${() => setIso(addDays(iso, 7))}><${Chevron} dir="next" /></button>
    </span>`;
  }
  function DayPicker({iso, setIso, now}){
    const ws = weekStart(iso);
    const days = WEEK_ORDER.map((_, i) => addDays(ws, i));
    return html`<div class="daypick">
      <div class="days">
        ${days.map(d => html`<button type="button" class=${'dp' + (d === now.iso ? ' is-today' : '')} aria-pressed=${d === iso ? 'true' : 'false'} aria-label=${DAY_NAMES[weekday(d)] + ' ' + dateLabel(d)} onClick=${() => setIso(d)}>
          <span class="dn">${DAY_SHORT[weekday(d)]}</span><span class="dd">${Number(d.slice(8))}</span></button>`)}
      </div>
    </div>`;
  }

  function PrayerCard({iso, now}){
    const p = prayers(iso);
    if (!p) return null;
    const isToday = iso === now.iso;
    const fri = weekday(iso) === 5;
    let nextKey = null;
    if (isToday){ const nx = PRAYERS.find(([k]) => p[k] > now.min); nextKey = nx ? nx[0] : null; }
    return html`<div class="panel tight" aria-label="مواعيد الصلاة">
      <div class="prayers">
        ${PRAYERS.map(([k, name]) => html`<div class=${'pr' + (k === nextKey ? ' next' : '') + (isToday && p[k] <= now.min ? ' past' : '')}>
          <span class="pn">${fri && k === 'dhuhr' ? 'الجمعة' : name}</span>
          <span class="pt">${fmt(p[k]).t}</span></div>`)}
      </div>
    </div>`;
  }

  function TargetCard({iso, store, goTab}){
    const c = mainCourse(store);
    const plan = planOf(c), dm = doneMap(store, c);
    const all = plan.reduce((a, w) => a.concat(w.items), []);
    const n = all.filter(it => dm[it[3]]).length;
    const wk = plan.find(w => iso >= w.from && iso <= w.to) || (plan.length && iso < plan[0].from ? plan[0] : null);
    const next = all.find(it => !dm[it[3]]);
    const behind = wk ? wk.items.filter(it => !dm[it[3]]).length : 0;
    return html`<button type="button" class="target c-course" onClick=${() => goTab('course')}>
      <span class="target-name"><bdi>${c.name}</bdi></span>
      <span class="small muted">التارجت الأساسي · خلّصت <bdi class="num">${n}</bdi> من <bdi class="num">${all.length}</bdi> موديول</span>
      <span class="track"><span class="fill" style=${{display:'block', width: (all.length ? n/all.length*100 : 0).toFixed(1) + '%'}}></span></span>
      ${next ? html`<span class="small">الجاي: <bdi dir="ltr">${next[0]} · ${next[1]}</bdi></span>
        ${wk && behind ? html`<span class="small muted">فاضل <bdi class="num">${behind}</bdi> في خطة الأسبوع ده</span>` : null}`
        : html`<span class="small">خلّصت الكورس كله.</span>`}
    </button>`;
  }

  function DayProgress({iso, store}){
    const k = dayCounts(iso, store);
    const pct = k.total ? Math.round(k.done / k.total * 100) : 0;
    return html`<div class="prog plain">
      <div class="prog-row"><span>خلّصت <bdi class="num">${k.done}</bdi> من <bdi class="num">${k.total}</bdi>${k.skip ? html`<span class="muted"> · اتلغى <bdi class="num">${k.skip}</bdi></span>` : null}${k.moved ? html`<span class="muted"> · اتأجل <bdi class="num">${k.moved}</bdi></span>` : null}</span><span class="muted small"><bdi class="num">${hoursText(k.doneMin)}</bdi> س متعلّمة</span></div>
      <div class="track"><div class="fill" style=${{width: pct + '%'}}></div></div>
    </div>`;
  }

  function NowCard({iso, now, store, update, skip, onReview}){
    const blocks = dayBlocks(iso, store).filter(b => CATS[b.cat].track);
    const live = blocks.filter(b => now.min >= b.s && now.min < b.e && !away(statusOf(store, iso, b.key)));
    const cur = live.length ? live[live.length - 1] : null;
    const upcoming = blocks.filter(b => b.s > now.min && statusOf(store, iso, b.key) === null);
    const main = cur || upcoming[0] || null;
    const after = main ? blocks.find(b => b.s >= main.e && b !== main && !away(statusOf(store, iso, b.key))) || upcoming.find(b => b !== main) : null;
    const p = prayers(iso);
    const nx = p ? PRAYERS.find(([k]) => p[k] > now.min) : null;
    const fri = weekday(iso) === 5;
    if (!main) return html`<section class="now c-quran" aria-label="دلوقتي">
      <p class="now-done">مفيش حاجة تانية في جدول النهارده.</p>
      ${(() => { const left = blocks.filter(b => statusOf(store, iso, b.key) === null).length; return left ? html`<p class="now-meta">فيه <bdi class="num">${left}</bdi> بلوك لسه معلّمتش عليهم.</p>
        <div class="now-actions"><button type="button" class="btn primary" onClick=${onReview}>راجع يومك</button></div>` : null; })()}
      <${DayProgress} iso=${iso} store=${store} />
    </section>`;
    const st = statusOf(store, iso, main.key);
    return html`<section class=${'now ' + kc(main.cat)} aria-label="دلوقتي">
      <div>
        <p class="now-title"><${Title} text=${main.title} cat=${main.cat} /></p>
        <p class="now-meta"><b>${CATS[main.cat].label}</b> · ${cur
          ? html`فاضل ${countdown(main.e - now.min)} · لحد ${fmtStr(main.e)}`
          : html`بيبدأ ${fmtStr(main.s)}، بعد ${countdown(main.s - now.min)}`}</p>
      </div>
      <div class="now-actions">
        <button type="button" class="btn primary" aria-pressed=${st === 'done' ? 'true' : 'false'} onClick=${() => setStatus(update, iso, main.key, st === 'done' ? null : 'done')}><${CheckSvg} />${st === 'done' ? 'اتعلّم، رجّعه' : 'خلّصته'}</button>
        <button type="button" class="btn" onClick=${() => skip(main)}>اتلغى النهارده</button>
      </div>
      <div class="now-next">
        ${after ? html`<p class="row-line"><span class="lbl">بعده</span><span><${Title} text=${after.title} cat=${after.cat} /> · ${fmtStr(after.s)}</span></p>` : null}
        ${nx ? html`<p class="row-line"><span class="lbl">${fri && nx[0] === 'dhuhr' ? 'الجمعة' : nx[1]}</span><span>${fmtStr(p[nx[0]])} · بعد ${countdown(p[nx[0]] - now.min)}</span></p>` : null}
      </div>
      <${DayProgress} iso=${iso} store=${store} />
    </section>`;
  }

  // Night review: everything not yet marked, one tap each. Opened from the header button.
