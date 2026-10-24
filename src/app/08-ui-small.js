  /* ---------------- small UI pieces ---------------- */
  const CheckSvg = () => html`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>`;
  const Check = ({on, cat, label, onToggle}) => html`
    <button type="button" class=${'chk ' + kc(cat)} role="checkbox" aria-checked=${on ? 'true' : 'false'} aria-label=${label} onClick=${onToggle}><i><${CheckSvg} /></i></button>`;
  const Moon = () => html`<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M10.6 2.2a6 6 0 1 0 3.2 9.9A5 5 0 0 1 10.6 2.2z"/></svg>`;
  const Plus = () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;
  const Pencil = () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M14.5 7.5l3 3"/></svg>`;
  const Star = () => html`<svg class="star" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z"/></svg>`;
  const Chevron = ({dir}) => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${dir === 'next' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}/></svg>`;
  // A notice box: a bold title, a quieter line under it, then any other text; children (buttons) go after the text.
  // focusRef makes the box focusable, so an error can be moved into view and read out.
  const Notice = ({title, line, text, role, focusRef, children}) => html`<div class="notice" role=${role} tabindex=${focusRef ? '-1' : null} ref=${focusRef}><p>${title ? html`<b>${title}</b>` : null}${line ? html`<span class="small muted">${line}</span>` : null}${text}</p>${children}</div>`;
  const Time = ({min}) => { const f = fmt(min); return html`<bdi class="t">${f.t}</bdi><span class="suf">${f.s}</span>`; };
  // Course blocks follow whichever course is main: in a block of kind course, the settings course's name ("Name" or
  // "Name|action") shows as the main course's name. Blocks of other kinds, such as lectures, keep their title.
  const showTitle = (text, cat, mainName) => {
    if (cat !== 'course' || !COURSE || !mainName) return text;
    if (text === COURSE.name) return mainName;
    return text.indexOf(COURSE.name + '|') === 0 ? mainName + '|' + text.slice(COURSE.name.length + 1) : text;
  };
  // The main course's name, which the shell gives every screen (mainCourseName of the store), for Title.
  const MainCourseName = createContext('');
  function Title({text, cat}){
    const t = showTitle(text, cat, useContext(MainCourseName));
    if (t.indexOf('|') > -1){ const [s, a] = t.split('|'); return html`<bdi class="subj">${s}</bdi> · ${a}`; }
    return t;
  }
  const plainTitle = (text, cat, mainName) => showTitle(text, cat, mainName).replace('|', ' · ');

  // The balance as a guilloche rosette: university and course on one half, work and life on the other.
  // Each half has 36 fine petals; a petal is inked in a category's colour for its share of the half's planned time that got done.
  function Balance({a, b, label}){
    const pa = a.plan ? a.done / a.plan : 0, pb = b.plan ? b.done / b.plan : 0;
    const N = 36, cx = 120, cy = 120;
    const inks = side => {
      const out = []; let used = 0;
      side.order.forEach(k => { const n = side.plan ? Math.round((side.by[k] || 0) / side.plan * N) : 0; for (let i = 0; i < n && used < N; i++, used++) out.push(k); });
      while (out.length < N) out.push(null);
      return out;
    };
    const petals = (side, from, cls) => inks(side).map((k, i) => {
      const ang = from + (i + 0.5) * 180 / N;
      // pathLength 1 and the petal's place let the CSS draw each outline in turn when the rosette appears (feature 027).
      return html`<ellipse cx=${cx + 52} cy=${cy} rx="52" ry="15" pathLength="1" style=${{'--i': i}} transform=${`rotate(${ang.toFixed(2)} ${cx} ${cy})`} class=${k ? 'petal ' + kc(k) : 'petal off'} />`;
    });
    let note;
    if (!a.done && !b.done) note = 'لسه مفيش حاجة متعلّمة ' + label + '.';
    else if (Math.abs(pa - pb) < 0.12) note = 'الميزان متوازن ' + label + '.';
    else if (pa > pb) note = BAL_A + ' واخدين أكتر من حقهم، و' + BAL_B + ' متأخرين.';
    else note = BAL_B + ' واخدين أكتر من حقهم، و' + BAL_A + ' متأخرين.';
    const pct = v => Math.round(v * 100) + '%';
    const total = a.done + b.done;
    return html`<div class="balance">
      <svg viewBox="0 0 240 240" role="img" aria-label=${note}>
        <circle class="ring" cx=${cx} cy=${cy} r="110" />
        <circle class="ring" cx=${cx} cy=${cy} r="106" />
        <g>${petals(a, -90, 'a')}</g>
        <g>${petals(b, 90, 'b')}</g>
        <line class="axis-line" x1=${cx} y1="6" x2=${cx} y2="234" />
        <circle class="core" cx=${cx} cy=${cy} r="34" />
        <text class="core-num" x=${cx} y=${cy + 6} text-anchor="middle">${hoursText(total)}</text>
        <text class="core-lbl" x=${cx} y=${cy + 22} text-anchor="middle">ساعة</text>
      </svg>
      <div class="balance-legend">
        <div class="a"><span>${BAL_A}</span><b>${pct(pa)}</b><span class="small muted"><bdi class="num">${hoursText(a.done)}</bdi> من <bdi class="num">${hoursText(a.plan)}</bdi> س</span></div>
        <div class="b"><span>${BAL_B}</span><b>${pct(pb)}</b><span class="small muted"><bdi class="num">${hoursText(b.done)}</bdi> من <bdi class="num">${hoursText(b.plan)}</bdi> س</span></div>
      </div>
      <p class="balance-note">${note}</p>
    </div>`;
  }
  function balanceOf(days, store){
    const side = (ids, s) => ids.concat(NEW_KINDS.filter(k => FAMILY[k] === s));
    const a = {done:0, plan:0, by:{}, order:side(['uni','study','course'], 'a')}, b = {done:0, plan:0, by:{}, order:side(['work','gym','quran'], 'b')};
    days.forEach(d => dayBlocks(d, store).forEach(bl => {
      const f = FAMILY[bl.cat]; if (!f) return;
      const st = statusOf(store, d, bl.key); if (away(st)) return;
      const m = bl.e - bl.s, side = f === 'a' ? a : b;
      side.plan += m; if (st === 'done'){ side.done += m; side.by[bl.cat] = (side.by[bl.cat] || 0) + m; }
    }));
    return {a, b};
  }

