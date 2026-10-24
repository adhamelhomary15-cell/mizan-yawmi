// The sync server on this computer, for the end-to-end tests of 025b (never deployed): the Worker's own handler on
// Node, with Node's built-in SQLite in memory, and emails written to a file instead of sent.
//   node server/dev.js <port> <app url> <emails file>
import {createServer} from 'node:http';
import {appendFileSync, writeFileSync} from 'node:fs';
import worker from './worker.js';
import {localD1} from './d1-local.js';

const [port, appUrl, emailsFile] = process.argv.slice(2);
if (!port || !appUrl || !emailsFile) { console.error('usage: node server/dev.js <port> <app url> <emails file>'); process.exit(2); }
writeFileSync(emailsFile, '');
const env = {
  DB: localD1(),
  PEPPER: 'dev-pepper-' + crypto.randomUUID(),
  APP_URL: appUrl,
  sendEmail: async m => appendFileSync(emailsFile, JSON.stringify(m) + '\n')
};

createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const r = await worker.fetch(new Request('http://127.0.0.1:' + port + req.url, {method: req.method, headers: req.headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body}), env);
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(Number(port), '127.0.0.1', () => console.log('sync server on http://127.0.0.1:' + port));
