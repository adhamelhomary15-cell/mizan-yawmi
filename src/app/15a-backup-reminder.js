  /* ---------------- backup reminder (feature 035) ---------------- */
  // With no sync the data is on this device only. Above the day, a calm notice asks for a backup when the rule says
  // one is due (the "backup reminder" block). Saving goes through the same path as Settings, so the file and «آخر نسخة»
  // are the same.
  // Its own key, like the install hint: outside the progress, the settings and the backup.
  const REMINDER_KEY = 'mizan-backup-reminder';
  const timeOf = iso => { const t = typeof iso === 'string' ? Date.parse(iso) : NaN; return Number.isNaN(t) ? null : t; };
  // The reminder's dates. since (when the app first ran here) is written once, and again when it is missing or lies in
  // the future, so a wrong clock cannot keep the count from starting.
  function readReminder(now){
    const r = readJSON(REMINDER_KEY) || {}, since = timeOf(r.since), dates = {since, snoozedUntil: timeOf(r.snoozedUntil)};
    if (since !== null && since <= now) return dates;
    dates.since = now;
    writeReminder(dates);
    return dates;
  }
  function writeReminder({since, snoozedUntil}){
    writeJSON(REMINDER_KEY, {since: new Date(since).toISOString(), snoozedUntil: snoozedUntil === null ? null : new Date(snoozedUntil).toISOString()});
  }
  // Something to lose: a day with marks (done, skipped or moved), a course module mark, or a logged workout.
  function hasMarks(store, wk){
    const workouts = wk.data && Array.isArray(wk.data.workouts) ? wk.data.workouts : [];
    return Object.keys(store.checks).length > 0 || Object.keys(store.modules).length > 0
      || store.courses.some(c => Object.keys(c.done).length > 0) || workouts.length > 0;
  }

  function BackupReminder({store, wk, showToast}){
    const [dates, setDates] = useState(() => readReminder(Date.now()));
    const [last, setLast] = useState(readBackupMeta);
    const [failed, setFailed] = useState(false);
    const lastAt = timeOf(last);
    const due = backupReminderDue({now: Date.now(), lastBackupAt: lastAt, since: dates.since, snoozedUntil: dates.snoozedUntil, hasData: hasMarks(store, wk)});
    if (!due) return null;
    const save = () => {
      const r = downloadBackup(store, wk);
      if (!r.ok) { setFailed(true); return; }
      setLast(r.at);
      showToast(html`اتحفظت النسخة: <bdi dir="ltr">${r.name}</bdi>`);
    };
    const later = () => {
      const next = {since: dates.since, snoozedUntil: Date.now() + BACKUP_SNOOZE_DAYS * DAY_MS};
      writeReminder(next);
      setDates(next);
    };
    // Its own markup, stacked: the two buttons do not fit beside the title at phone width.
    return html`<div class="notice backup-due" role="status"><p>
        <b>${lastAt === null ? 'لسه ما عملتش نسخة احتياطية' : 'بقالك أسبوعين أو أكتر من غير نسخة احتياطية'}</b>
        <span class="small muted">مفيش مزامنة، فبياناتك على التليفون ده بس. لو اتمسحت، النسخة هي اللي بترجّعها.</span>
        ${failed ? html`<span class="small">${BACKUP_FAILED}</span>` : null}
      </p>
      <span class="backup-act"><button type="button" class="btn primary" onClick=${save}>احفظ نسخة دلوقتي</button><button type="button" class="btn ghost" onClick=${later}>مش دلوقتي</button></span>
    </div>`;
  }
