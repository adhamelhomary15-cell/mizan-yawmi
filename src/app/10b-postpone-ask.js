  /* ---------------- asking about ended days that still have open items (feature 015) ---------------- */
  // Worked out on every open of Today and never stored: showing the notice writes nothing. Each button answers the
  // question by moving askedUpTo forward; where things go and how they are stored are 009's rules.
  function AskPostpone({now, store, update, actEdit, onReview}){
    const asked = daysToAsk(now.iso, store.askedUpTo, addDays);
    const days = asked.map(iso => ({
      iso,
      blocks: dayBlocks(iso, store).filter(b => CATS[b.cat].track && canPostpone(b) && statusOf(store, iso, b.key) === null),
      tasks: tasksDue(store, iso)
    })).filter(d => d.blocks.length || d.tasks.length);
    if (!days.length) return null;
    const all = days.flatMap(d => d.blocks);
    // one call for every day, so that items from different days never take the same time
    const places = proposePlaces(all.map(b => ({len: b.e - b.s})), postponeDays(now.iso, 7, store, now), isFreeCat);
    const placeOf = b => places[all.indexOf(b)];
    const last = asked[asked.length - 1], n = all.length + days.reduce((k, d) => k + d.tasks.length, 0);
    const answer = day => s => { s.askedUpTo = day; return s; };
    // The undo puts back the store as it was, but with the question still answered, so the notice stays away.
    const postponeAll = () => {
      const before = answer(last)(clone(store));
      actEdit('اتأجل ' + n + ' حاجة', s => {
        days.forEach(d => applyPostpone(d.iso, d.blocks.filter(placeOf).map(b => ({b, to: placeOf(b)})), d.tasks.map(t => t.id), now.iso)(s));
        return answer(last)(s);
      }, () => before);
    };
    const review = () => { update(answer(days[0].iso)); onReview(days[0].iso); };
    const from = days.length === 1 && days[0].iso === addDays(now.iso, -1) ? 'امبارح' : 'من يوم ' + DAY_NAMES[weekday(days[0].iso)];
    return html`<div class="notice postpone-batch" role="status" aria-label="حاجات ماتعملتش"><p>
        <b>${'فيه ' + n + (n === 1 ? ' حاجة' : ' حاجات') + ' ماتعملتش ' + from}</b>
        ${days.map(d => html`${days.length > 1 ? html`<span class="small"><b>${DAY_NAMES[weekday(d.iso)]}</b></span>` : null}
          ${d.blocks.map(b => html`<span class="small"><${Title} text=${b.title} cat=${b.cat} /> ← ${placeOf(b) ? html`<bdi>${dayName(placeOf(b).iso)}</bdi> <bdi>${fmtStr(placeOf(b).s)}</bdi>–<bdi>${fmtStr(placeOf(b).e)}</bdi>` : 'مفيش مكان، هيفضل زي ما هو'}</span>`)}
          ${d.tasks.map(t => html`<span class="small">${t.text} ← <bdi>${dayName(now.iso)}</bdi></span>`)}`)}
      </p>
      <span class="backup-act"><button type="button" class="btn primary" onClick=${postponeAll}>أجّل الكل</button><button type="button" class="btn" onClick=${review}>راجعها</button><button type="button" class="btn ghost" onClick=${() => update(answer(last))}>مش دلوقتي</button></span>
    </div>`;
  }

