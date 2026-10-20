  /* ---------------- Week ---------------- */
  function WeekView({iso, setIso, now, store, goDay}){
    const ws = weekStart(iso);
    const days = WEEK_ORDER.map((_, i) => addDays(ws, i));
    const plan = {}, got = {}, skipped = {}, subjPlan = {}, subjGot = {};
    let gym = 0, gymPlan = 0, quranDays = 0;
    days.forEach(d => {
      let q = false;
      dayBlocks(d, store).forEach(b => {
        const m = b.e - b.s;
        if (!CATS[b.cat].track) return;
        const st = statusOf(store, d, b.key);
        if (st === 'skip'){ skipped[b.cat] = (skipped[b.cat] || 0) + m; return; }
        if (st === 'moved') return;   // counted on the day it was moved to
        plan[b.cat] = (plan[b.cat] || 0) + m;
        if (b.cat === 'gym') gymPlan++;
        if (b.subj) subjPlan[b.subj] = (subjPlan[b.subj] || 0) + m;
        if (st === 'done'){
          got[b.cat] = (got[b.cat] || 0) + m;
          if (b.subj) subjGot[b.subj] = (subjGot[b.subj] || 0) + m;
          if (b.cat === 'gym') gym++;
          if (b.cat === 'quran') q = true;
        }
      });
      if (q) quranDays++;
    });
    const statRow = (cat, label, pl, gt, extra) => html`<div class=${'stat ' + kc(cat)}>
      <span>${label}</span>
      <div class="track"><div class="fill" style=${{width: (pl ? Math.min(100, gt/pl*100) : 0) + '%'}}></div></div>
      <span class="val"><b>${hoursText(gt)}</b> من ${hoursText(pl)} س</span>
      ${extra ? html`<span class="extra">${extra}</span>` : null}</div>`;
    const skipNote = k => skipped[k] ? 'اتلغى ' + durText(skipped[k]) : '';
    const join = (...xs) => xs.filter(Boolean).join(' · ');
    const bal = balanceOf(days, store);

    return html`<div class="weekv">
      <div class="top a-head">
        <div class="top-meta"><h1>الأسبوع</h1><p class="sub">${dateLabel(days[0])} – ${dateLabel(days[6])}</p></div>
        <${WeekArrows} iso=${iso} setIso=${setIso} />
      </div>

      <div class="sec a-balance"><h2>ميزان الأسبوع</h2><div class="panel"><${Balance} a=${bal.a} b=${bal.b} label="الأسبوع ده" /></div></div>

      <div class="sec a-strips">
        <div class="sec-head"><h2>شكل الأسبوع</h2><p class="small muted">دوس على يوم تفتحه</p></div>
        <div class="panel tight">
          <div class="strips">
            ${days.map(d => {
              const p = prayers(d);
              const isToday = d === now.iso;
              return html`<button type="button" class="strip" onClick=${() => goDay(d)} aria-label=${DAY_NAMES[weekday(d)] + ' ' + dateLabel(d)}>
                <span class="strip-name">${DAY_SHORT[weekday(d)]}${isToday ? html`<i class="today-dot"></i>` : null}</span>
                <span class="bar">
                  ${dayBlocks(d, store).map(b => html`<span class=${'seg ' + kc(b.cat) + (away(statusOf(store, d, b.key)) ? ' skipped' : '')} style=${{insetInlineStart: ((b.s - START)/SPAN*100).toFixed(3) + '%', width: ((b.e - b.s)/SPAN*100).toFixed(3) + '%'}}></span>`)}
                  ${p ? ['dhuhr','asr','maghrib','isha'].map(k => html`<span class="tick" style=${{insetInlineStart: ((p[k] - START)/SPAN*100).toFixed(3) + '%'}}></span>`) : null}
                  ${isToday ? html`<span class="nowmark" style=${{insetInlineStart: ((Math.min(Math.max(now.min, START), END) - START)/SPAN*100).toFixed(3) + '%'}}></span>` : null}
                </span>
              </button>`;
            })}
          </div>
          <div class="axis" aria-hidden="true"><span></span>
            <div class="axis-track">
              <span class="first" style="inset-inline-start:0%">7ص</span>
              <span style="inset-inline-start:27.78%">12م</span>
              <span style="inset-inline-start:55.56%">5م</span>
              <span style="inset-inline-start:83.33%">10م</span>
            </div>
          </div>
          <div class="legend">
            <span class="c-uni"><i></i>${CATS.uni.label}</span>
            <span class="c-course"><i></i>${CATS.course.label}</span>
            <span class="c-work"><i></i>${CATS.work.label}</span>
            <span class="c-life"><i></i>${CATS.gym.label + ' و' + CATS.quran.label + ' و' + CATS.personal.label}</span>
            <span class="c-rest"><i></i>${CATS.rest.label + ' و' + CATS.move.label}</span>
            <span><i class="tk"></i>صلاة</span>
          </div>
        </div>
      </div>

      <div class="sec a-stats">
        <h2>اللي اتعمل من الجدول</h2>
        <div class="panel stats">
          ${statRow('uni', CATS.uni.long, plan.uni || 0, got.uni || 0, skipNote('uni'))}
          ${statRow('study', CATS.study.long, plan.study || 0, got.study || 0, skipNote('study'))}
          ${statRow('course', CATS.course.long, plan.course || 0, got.course || 0, skipNote('course'))}
          ${statRow('work', CATS.work.long, plan.work || 0, got.work || 0, skipNote('work'))}
          ${statRow('gym', CATS.gym.long, plan.gym || 0, got.gym || 0, join('رحت ' + gym + ' من ' + gymPlan + ' مرات', skipNote('gym')))}
          ${statRow('quran', CATS.quran.long, plan.quran || 0, got.quran || 0, join(CATS.quran.label + ' في ' + quranDays + ' من 7 أيام', skipNote('quran')))}
          ${NEW_KINDS.filter(k => CATS[k].track).map(k => statRow(k, CATS[k].long, plan[k] || 0, got[k] || 0, skipNote(k)))}
        </div>
      </div>

      <div class="sec a-subjects">
        <h2>${CATS.study.long} بالمادة</h2>
        <div class="panel stats">
          ${Object.keys(SUBJ).sort((a, b) => (subjPlan[b] || 0) - (subjPlan[a] || 0)).map(k => statRow('study', html`<bdi class="subj" title=${SUBJ[k]}>${k}</bdi>`, subjPlan[k] || 0, subjGot[k] || 0))}
        </div>
      </div>

      <details class="a-rules rules-box">
        <summary>إزاي الجدول متظبط</summary>
        <ul class="rules">${RULES.map(r => html`<li>${r}</li>`)}</ul>
      </details>
    </div>`;
  }

