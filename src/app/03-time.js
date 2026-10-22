  /* ---------------- time helpers ---------------- */
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

  function zoneParts(d){
    const o = {}; zoneFmt.formatToParts(d).forEach(p => { o[p.type] = p.value; });
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
    const p = zoneParts(new Date());
    return dayAt(p.iso, p.min, END, addDays);
  }

