// D1 on Node's built-in SQLite, for server/test.js and server/dev.js only (never deployed). It offers the part of the
// D1 interface the Worker uses: prepare(sql).bind(...).first() / all() / run(), and batch() in one transaction.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';

class Statement {
  constructor(db, sql){ this.db = db; this.sql = sql; this.args = []; }
  bind(...args){ this.args = args; return this; }
  async first(){ return this.runNow('get') || null; }
  async all(){ return {results: this.runNow('all')}; }
  async run(){ const r = this.runNow('run'); return {meta: {changes: Number(r.changes)}}; }
  runNow(how){ return this.db.prepare(this.sql)[how](...this.args); }
}

export function localD1(file){
  const db = new DatabaseSync(file || ':memory:');
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  return {
    sqlite: db,
    prepare: sql => new Statement(db, sql),
    async batch(statements){
      db.exec('BEGIN');
      try { statements.forEach(s => s.runNow('run')); db.exec('COMMIT'); }
      catch (e) { db.exec('ROLLBACK'); throw e; }
    }
  };
}
