#!/usr/bin/env node
// Deigkalkulator Admin Server
// Kjør: node admin-server.js
// Åpne: http://localhost:9898

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const { execSync } = require('child_process');

const PORT       = 9898;
const INDEX_PATH = path.join(__dirname, 'index.html');
const ADMIN_PATH = path.join(__dirname, 'admin.html');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  // ── Serve admin.html ──
  if (url === '/' || url === '/admin.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(ADMIN_PATH));
    return;
  }

  // ── GET /api/content — les index.html ──
  if (url === '/api/content' && req.method === 'GET') {
    try {
      const content = fs.readFileSync(INDEX_PATH, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, content }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // ── POST /api/save-and-push — skriv + commit + push ──
  if (url === '/api/save-and-push' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const { content, message } = JSON.parse(body);
      if (typeof content !== 'string') throw new Error('Mangler content-felt');

      // Skriv fil
      fs.writeFileSync(INDEX_PATH, content, 'utf8');
      console.log(`[${new Date().toLocaleTimeString('no')}] Lagret index.html (${content.length} tegn)`);

      // Git commit + push
      const commitMsg = message || `Admin: oppdater innhold ${new Date().toLocaleDateString('no')}`;
      const gitLog = [];

      gitLog.push(execSync('git add index.html', { cwd: __dirname }).toString());
      gitLog.push(execSync(`git commit -m "${commitMsg.replace(/"/g, "'")}"`, { cwd: __dirname }).toString());
      gitLog.push(execSync('git push', { cwd: __dirname }).toString());

      const output = gitLog.join('\n').trim();
      console.log(output);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, output }));
    } catch (e) {
      const msg = e.stderr ? e.stderr.toString() : e.message;
      console.error('Feil:', msg);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: msg }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🍕 Deigkalkulator Admin`);
  console.log(`   Åpne: http://localhost:${PORT}\n`);
});
