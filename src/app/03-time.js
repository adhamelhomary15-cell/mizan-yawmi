  /* ---------------- time helpers ---------------- */
  const START = 420, END = 1500, SPAN = END - START;
  const toMin = t => { const [a,b] = t.split(':').map(Number); return a*60 + b; };
  const pad = n => String(n).padStart(2,'0');
  function fmt(min){
    const hh = Math.floor(min/60) % 24, mm = min % 60;
    return {t:((hh % 12) || 12) + ':' + pad(mm), s: hh < 12 ? 'ص' : 'م'};
  }
  const fmtStr = min => { const f = fmt(min); return f.t + f.s; };
  // Wrapped in LTR isolates so "1½" never reorders to "½1" inside Arabic text.
  function hoursText(min){
    const hh = Math.floor(min/60), r = Math.round(min % 60);
    const fr = {0:'',15:'¼',30:'½',45:'¾'}[r];
    let n;
    if (fr === undefined) n = (min/60).toFixed(1);
    else if (hh === 0) n = fr || '0';
    else n = hh + fr;
    return '\u2066' + n + '\u2069';
  }
  const durText = min => min < 60 ? min + ' د' : hoursText(min) + ' س';
  function countdown(min){
    if (min < 60) return min + ' د';
    const hh = Math.floor(min/60), mm = min % 60;
    return mm ? hh + ' س و ' + mm + ' د' : hh + ' س';
  }

  const cairoFmt = new Intl.DateTimeFormat('en-CA',{timeZone:CFG.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  function cairoParts(d){
    const o = {}; cairoFmt.formatToParts(d).forEach(p => { o[p.type] = p.value; });
    return {iso: o.year + '-' + o.month + '-' + o.day, min: (Number(o.hour) % 24)*60 + Number(o.minute)};
  }
  function addDays(iso, n){
    const [y,m,d] = iso.split('-').map(Number);
    const t = new Date(Date.UTC(y, m-1, d + n));
    return t.getUTCFullYear() + '-' + pad(t.getUTCMonth()+1) + '-' + pad(t.getUTCDate());
  }
  function weekday(iso){ const [y,m,d] = iso.split('-').map(Number); return new Date(Date.UTC(y,m-1,d)).getUTCDay(); }
  function weekStart(iso){ return addDays(iso, -((weekday(iso) + 1) % 7)); }
  const dateFmt = new Intl.DateTimeFormat('ar-EG-u-nu-latn',{day:'numeric',month:'long',timeZone:'UTC'});
  function dateLabel(iso){ const [y,m,d] = iso.split('-').map(Number); return dateFmt.format(new Date(Date.UTC(y,m-1,d))); }
  function effectiveNow(){
    const p = cairoParts(new Date());
    // The schedule's day runs until 1:00am, so between midnight and 1:00 it still shows the previous day.
    if (p.min < 60) return {iso: addDays(p.iso, -1), min: p.min + 1440};
    return p;
  }

