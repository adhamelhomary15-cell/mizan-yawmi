  /* ---------------- prayer times (location and method come from the settings) ---------------- */
  const PRAYERS = [['fajr','الفجر'],['dhuhr','الضهر'],['asr','العصر'],['maghrib','المغرب'],['isha','العشا']];
  const ptCache = {};
  let adhanCoords = null, adhanParams = null;
  try {
    if (window.adhan){
      adhanCoords = new adhan.Coordinates(CFG.location.lat, CFG.location.lng);
      adhanParams = adhan.CalculationMethod[CFG.prayerMethod]();
    }
  } catch(e){ adhanCoords = null; }
  function prayers(iso){
    if (ptCache[iso] !== undefined) return ptCache[iso];
    let r = null;
    if (adhanCoords){
      try {
        const [y,m,d] = iso.split('-').map(Number);
        const t = new adhan.PrayerTimes(adhanCoords, new Date(y, m-1, d), adhanParams);
        r = {};
        PRAYERS.forEach(([k]) => { r[k] = cairoParts(t[k]).min; });
      } catch(e){ r = null; }
    }
    ptCache[iso] = r;
    return r;
  }
  // Last Thursday of October (the last day before the clocks go back), as an ISO date. UTC arithmetic, no local zone.
  function lastThursdayOfOctober(year){
    const d = new Date(Date.UTC(year, 9, 31));
    while (d.getUTCDay() !== 4) d.setUTCDate(d.getUTCDate() - 1);
    return year + '-10-' + pad(d.getUTCDate());
  }
  // Which of a day's two versions applies: "late" (A) when the chosen prayer time is at or after the threshold
  // from the settings (versions.prayer, versions.thresholdMinutes), otherwise "early" (B). Without a versions
  // setting every day uses A. If prayer times can't be computed, versions.fallback gives the dates for A:
  // from lateFrom (MM-DD) through lateUntil (MM-DD, or the last Thursday of October).
  function phaseFor(iso){
    const v = CFG.versions;
    if (!v) return 'A';
    const p = prayers(iso);
    if (p) return p[v.prayer] >= v.thresholdMinutes ? 'A' : 'B';
    const f = v.fallback;
    if (!f) return 'A';
    const y = Number(iso.slice(0, 4));
    const until = f.lateUntil === 'last-thursday-october' ? lastThursdayOfOctober(y) : y + '-' + f.lateUntil;
    return iso >= y + '-' + f.lateFrom && iso <= until ? 'A' : 'B';
  }
  // start of anchor layout
  // Lays out one day's block list. A block may carry a sixth element {prayer, dir, min}: it then starts at that
  // day's prayer time (pm: minutes since midnight per prayer, or null) minus or plus min, rounded to 5 minutes.
  // The schedule has no gaps (a block ends where the next starts, the last ends at END), so everything after an
  // anchored block shifts with it, the block just before it ends where it starts, and the last block takes the
  // rest. The anchor may name, with absorb ("HH:MM", a later block's fixed start), the block that takes the shift
  // instead: that block ends at its fixed end, so every block after it keeps its fixed time. If prayer times are
  // missing, or an absorbing block would get shorter than 15 minutes (or than it already was at its fixed time,
  // when that was less), every block keeps its fixed time and a notice says why.
  // Keys always use the fixed start, so ticks never move.
  function layoutDay(list, pm, START, END){
    const tm = t => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };
    const make = starts => list.map((b, i) => ({s: starts[i], e: i + 1 < list.length ? starts[i + 1] : END, cat: b[1], title: b[2], detail: b[3] || '', subj: b[4] || '', key: b[0] + '-' + b[1]}));
    const fixed = list.map(b => tm(b[0]));
    if (!list.some(b => b[5])) return {blocks: make(fixed), notice: null};
    if (!pm || list.some(b => b[5] && !Number.isFinite(pm[b[5].prayer]))) return {blocks: make(fixed), notice: 'unavailable'};
    let delta = 0, stop = -1;
    const named = new Set();   // blocks named by an anchor's absorb
    const starts = list.map((b, i) => {
      if (!b[5]) {
        const s = fixed[i] + delta;
        if (i === stop) { delta = 0; stop = -1; }
        return s;
      }
      let m = Math.round((pm[b[5].prayer] + (b[5].dir === 'before' ? -1 : 1) * b[5].min) / 5) * 5;
      if (m < START) m += 1440;
      delta = m - fixed[i];
      stop = -1;
      if (b[5].absorb) { const j = list.findIndex((x, k) => k > i && x[0] === b[5].absorb); if (j > i && !list[j][5]) { stop = j; named.add(j); } }
      return m;
    });
    const fits = list.every((b, i) => {
      const last = i === list.length - 1;
      if (!last && !list[i + 1][5] && !named.has(i)) return true;
      const len = (last ? END : starts[i + 1]) - starts[i];
      const was = (last ? END : fixed[i + 1]) - fixed[i];
      return len >= Math.min(15, was);
    });
    return fits ? {blocks: make(starts), notice: null} : {blocks: make(fixed), notice: 'nofit'};
  }
  // end of anchor layout
  // The day's block list from the settings (version A or B by phaseFor), laid out for that date's prayer times.
  function listFor(iso){
    const day = SCHED[weekday(iso)] || {blocks: []};
    return Array.isArray(day.blocks) ? day.blocks : (day.blocks[phaseFor(iso)] || day.blocks.A);
  }
  function dayLayout(iso){ return layoutDay(listFor(iso), prayers(iso), START, END); }
  function blocksFor(iso){ return dayLayout(iso).blocks; }
  // null, 'unavailable' (no prayer times for this date) or 'nofit' (the day cannot hold the anchors): blocks are at their fixed times.
  function dayNotice(iso){ return dayLayout(iso).notice; }
  const ANCHOR_NOTICES = {
    unavailable: 'أوقات الصلاة مش متاحة، فالبلوكات المربوطة بالصلاة على مواعيدها الثابتة.',
    nofit: 'اليوم ده مش بيسع ربط البلوكات بالصلاة، فهي على مواعيدها الثابتة.'
  };
  function apptsFor(iso, store){
    const wd = weekday(iso);
    return (store.appts || []).filter(a => Number(a.day) === wd && a.time).map(a => {
      let m = toMin(a.time); if (m < START) m += 1440;
      return {min:m, label:a.label};
    });
  }

