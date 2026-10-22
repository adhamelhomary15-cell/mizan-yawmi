  /* ---------------- day model: schedule + one-off blocks + status ---------------- */
  // The colour class of a kind: its own for a built-in, its ready colour's for an added one.
  const kc = cat => 'c-' + (CATS[cat] && CATS[cat].color ? 'k-' + CATS[cat].color : cat);
  function hmToMin(t){ let m = toMin(t); if (m < START) m += 1440; return m; }
  function dayBlocks(iso, store){
    const base = blocksFor(iso);
    const extra = ((store.extras || {})[iso] || []).map(x => ({s: hmToMin(x.s), e: hmToMin(x.e), cat: x.cat, title: x.title,
      detail: isISO(x.from) ? 'اتأجلت من ' + dateLabel(x.from) : 'حاجة زيادة لليوم ده', subj: typeof x.subj === 'string' ? x.subj : '', key: 'x-' + x.id, extra: x.id, from: isISO(x.from) ? x.from : null}));
    return base.concat(extra).sort((p, q) => p.s - q.s || (p.extra ? 1 : 0) - (q.extra ? 1 : 0));
  }
  // A block's state on a day: done (true), cancelled ('skip'), postponed ({moved: date}), or open.
  const checkOf = (store, iso, key) => (store.checks[iso] || {})[key];
  const movedDate = v => v && typeof v === 'object' && isISO(v.moved) ? v.moved : null;
  const statusOf = (store, iso, key) => { const v = checkOf(store, iso, key); return v === true ? 'done' : v === 'skip' ? 'skip' : movedDate(v) ? 'moved' : null; };
  const movedTo = (store, iso, key) => movedDate(checkOf(store, iso, key));
  // cancelled or postponed: not part of that day's plan any more
  const away = st => st === 'skip' || st === 'moved';
  const dayName = iso => DAY_NAMES[weekday(iso)] + '، ' + dateLabel(iso);
  function setStatus(update, iso, key, val){
    update(s => {
      const c = s.checks[iso] || {};
      if (val) c[key] = val === 'done' ? true : 'skip'; else delete c[key];
      if (Object.keys(c).length) s.checks[iso] = c; else delete s.checks[iso];
      return s;
    });
  }
  function dayCounts(iso, store){
    const tracked = dayBlocks(iso, store).filter(b => CATS[b.cat].track);
    let done = 0, skip = 0, moved = 0, doneMin = 0;
    tracked.forEach(b => { const st = statusOf(store, iso, b.key); if (st === 'done'){ done++; doneMin += b.e - b.s; } else if (st === 'skip') skip++; else if (st === 'moved') moved++; });
    return {total: tracked.length - skip - moved, done, skip, moved, doneMin};
  }

