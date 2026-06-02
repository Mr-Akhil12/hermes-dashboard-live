/**
 * Hermes Dashboard — Local Control Plane API
 * All data reads are local. No cloud dependencies.
 */

const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const app = express();
const PORT = 9120;
const SHARED_SECRET=process.env.DASHBOARD_SHARED_SECRET || 'cfc6263218fec657f43a2352726a8166536bb1d3ed57f394cc1f56c4fe91f4f5';

const HOME = os.homedir();
const CRON_JOBS_FILE = path.join(HOME, '.hermes', 'cron', 'jobs.json');
const CRON_OUTPUT_DIR = path.join(HOME, '.hermes', 'cron', 'output');
const CONFIG_FILE = path.join(HOME, '.hermes', 'config.yaml');
const STATE_DB = path.join(HOME, '.hermes', 'state.db');
const MEMORY_DB = path.join(HOME, '.hermes', 'memory_store.db');
const KANBAN_DB = path.join(HOME, '.hermes', 'kanban.db');
const OR_KEY=process.env.OPENROUTER_API_KEY || '';
const VAULT_HERMES = 'C:\\Users\\pilla\\Vault\\hermes x Akhil';
const VAULT_BRAIN = 'C:\\Users\\pilla\\Vault\\second-brain';

app.use(cors());
app.use(express.json());

function auth(req, res, next) {
  if (req.headers['x-dashboard-secret'] === SHARED_SECRET || req.query?.secret === SHARED_SECRET) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

function db(dbPath, sql) {
  try {
    if (!fs.existsSync(dbPath)) return [];
    const r = execSync(`sqlite3 "${dbPath}" "${sql.replace(/"/g, '\\"')}" 2>/dev/null || echo ""`, { encoding: 'utf-8', timeout: 10000 });
    return r.trim().split('\n').filter(Boolean);
  } catch { return []; }
}

function readFileOrNull(p) { try { return fs.readFileSync(p, 'utf-8'); } catch { return null; } }
function readJsonOrNull(p) { const r = readFileOrNull(p); try { return JSON.parse(r); } catch { return null; } }

// ─── HEALTH ───
app.get('/api/health', (req, res) => {
  const jobs = readJsonOrNull(CRON_JOBS_FILE);
  res.json({ status: 'ok', jobs: jobs?.jobs?.length || 0, timestamp: new Date().toISOString() });
});

// ─── SESSIONS ───
app.get('/api/sessions', auth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);
  const source = req.query.source || '';
  const where = source ? `WHERE source='${source}'` : '';
  const rows = db(STATE_DB, `SELECT id, source, model, message_count, title, started_at, input_tokens, output_tokens FROM sessions ${where} ORDER BY started_at DESC LIMIT ${limit}`);
  const sessions = rows.map(r => ({
    id: r[0], source: r[1], model: r[2], messageCount: parseInt(r[3]) || 0,
    title: r[4] || '', startedAt: parseFloat(r[5]) || 0,
    inputTokens: parseInt(r[6]) || 0, outputTokens: parseInt(r[7]) || 0,
  }));
  res.json({ sessions, total: sessions.length });
});

app.get('/api/sessions/search', auth, (req, res) => {
  const q = (req.query.q || '').replace(/'/g, "''");
  if (!q) return res.json({ sessions: [], messages: [] });
  // Search sessions by title
  const sessionRows = db(STATE_DB, `SELECT id, source, model, message_count, title, started_at FROM sessions WHERE title LIKE '%${q}%' ORDER BY started_at DESC LIMIT 20`);
  const sessions = sessionRows.map(r => ({ id: r[0], source: r[1], model: r[2], messageCount: parseInt(r[3]) || 0, title: r[4] || '', startedAt: parseFloat(r[5]) || 0 }));
  // Search messages via FTS
  const msgRows = db(STATE_DB, `SELECT m.session_id, m.role, SUBSTR(m.content, 1, 200), s.title, s.started_at FROM messages_fts fts JOIN messages m ON m.id = fts.rowid JOIN sessions s ON s.id = m.session_id WHERE messages_fts MATCH '${q}' ORDER BY s.started_at DESC LIMIT 20`);
  const messages = msgRows.map(r => ({ sessionId: r[0], role: r[1], content: r[2] || '', sessionTitle: r[3] || '', startedAt: parseFloat(r[4]) || 0 }));
  res.json({ sessions, messages, query: q });
});

app.get('/api/sessions/:id', auth, (req, res) => {
  const rows = db(STATE_DB, `SELECT id, source, model, message_count, title, started_at, input_tokens, output_tokens, system_prompt FROM sessions WHERE id='${req.params.id.replace(/'/g, "''")}' LIMIT 1`);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const s = rows[0];
  const msgRows = db(STATE_DB, `SELECT role, content, tool_call_id, tool_calls FROM messages WHERE session_id='${req.params.id.replace(/'/g, "''")}' ORDER BY id ASC`);
  const messages = msgRows.map(m => ({ role: m[0], content: (m[1] || '').slice(0, 2000), toolCallId: m[2] || null, toolCalls: m[3] || null }));
  res.json({
    session: { id: s[0], source: s[1], model: s[2], messageCount: parseInt(s[3]) || 0, title: s[4] || '', startedAt: parseFloat(s[5]) || 0, inputTokens: parseInt(s[6]) || 0, outputTokens: parseInt(s[7]) || 0, systemPrompt: (s[8] || '').slice(0, 500) },
    messages,
  });
});

// ─── MEMORY ───
app.get('/api/memory', auth, (req, res) => {
  const rows = db(MEMORY_DB, 'SELECT f.fact_id, f.content, f.category, f.tags, f.trust_score, f.updated_at FROM facts f ORDER BY f.trust_score DESC, f.updated_at DESC LIMIT 100');
  const facts = rows.map(r => ({ id: parseInt(r[0]), content: r[1] || '', category: r[2] || 'general', tags: r[3] || '', trustScore: parseFloat(r[4]) || 0.5, updatedAt: r[5] || '' }));
  // Get entity links
  const entityRows = db(MEMORY_DB, 'SELECT fe.fact_id, e.name, e.entity_type FROM fact_entities fe JOIN entities e ON e.entity_id = fe.entity_id');
  const entityMap = {};
  for (const er of entityRows) {
    const fid = er[0];
    if (!entityMap[fid]) entityMap[fid] = [];
    entityMap[fid].push({ name: er[1], type: er[2] });
  }
  const factsWithEntities = facts.map(f => ({ ...f, entities: entityMap[f.id] || [] }));
  res.json({ facts: factsWithEntities, total: facts.length });
});

app.get('/api/memory/search', auth, (req, res) => {
  const q = (req.query.q || '').replace(/'/g, "''");
  if (!q) return res.json({ facts: [] });
  const rows = db(MEMORY_DB, `SELECT f.fact_id, f.content, f.category, f.tags, f.trust_score FROM facts_fts fts JOIN facts f ON f.fact_id = fts.rowid WHERE facts_fts MATCH '${q}' ORDER BY f.trust_score DESC LIMIT 30`);
  const facts = rows.map(r => ({ id: parseInt(r[0]), content: r[1] || '', category: r[2] || 'general', tags: r[3] || '', trustScore: parseFloat(r[4]) || 0.5 }));
  res.json({ facts, query: q });
});

app.get('/api/memory/entities', auth, (req, res) => {
  const rows = db(MEMORY_DB, 'SELECT e.entity_id, e.name, e.entity_type, COUNT(fe.fact_id) as fact_count FROM entities e LEFT JOIN fact_entities fe ON fe.entity_id = e.entity_id GROUP BY e.entity_id ORDER BY fact_count DESC, e.name ASC');
  const entities = rows.map(r => ({ id: parseInt(r[0]), name: r[1] || '', type: r[2] || 'unknown', factCount: parseInt(r[3]) || 0 }));
  res.json({ entities, total: entities.length });
});

// ─── KANBAN TASKS ───
app.get('/api/tasks', auth, (req, res) => {
  // Check if kanban.db has tasks table
  const check = db(KANBAN_DB, "SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'");
  if (!check.length) return res.json({ tasks: [], columns: ['pending', 'in_progress', 'done'] });
  const rows = db(KANBAN_DB, 'SELECT id, title, status, priority, created_at, updated_at FROM tasks ORDER BY updated_at DESC, created_at DESC LIMIT 200');
  const tasks = rows.map(r => ({ id: r[0], title: r[1] || '', status: r[2] || 'pending', priority: r[3] || 'normal', createdAt: r[4] || '', updatedAt: r[5] || '' }));
  res.json({ tasks, columns: ['pending', 'in_progress', 'done'] });
});

app.post('/api/tasks', auth, (req, res) => {
  const { title, status, priority } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const s = (status || 'pending').replace(/'/g, "''");
  const p = (priority || 'normal').replace(/'/g, "''");
  const t = title.replace(/'/g, "''");
  execSync(`sqlite3 "${KANBAN_DB}" "INSERT INTO tasks (title, status, priority) VALUES ('${t}', '${s}', '${p}')"`, { encoding: 'utf-8', timeout: 5000 });
  res.json({ success: true });
});

app.patch('/api/tasks/:id', auth, (req, res) => {
  const id = req.params.id;
  const updates = [];
  if (req.body.title) updates.push(`title='${req.body.title.replace(/'/g, "''")}'`);
  if (req.body.status) updates.push(`status='${req.body.status.replace(/'/g, "''")}'`);
  if (req.body.priority) updates.push(`priority='${req.body.priority.replace(/'/g, "''")}'`);
  if (!updates.length) return res.json({ success: false, error: 'No updates' });
  updates.push(`updated_at=CURRENT_TIMESTAMP`);
  execSync(`sqlite3 "${KANBAN_DB}" "UPDATE tasks SET ${updates.join(', ')} WHERE id='${id}'"`, { encoding: 'utf-8', timeout: 5000 });
  res.json({ success: true });
});

app.delete('/api/tasks/:id', auth, (req, res) => {
  execSync(`sqlite3 "${KANBAN_DB}" "DELETE FROM tasks WHERE id='${req.params.id}'"`, { encoding: 'utf-8', timeout: 5000 });
  res.json({ success: true });
});

// ─── CRON ───
app.get('/api/cron', auth, (req, res) => {
  const data = readJsonOrNull(CRON_JOBS_FILE) || { jobs: [] };
  const runs = [];
  if (fs.existsSync(CRON_OUTPUT_DIR)) {
    for (const dir of fs.readdirSync(CRON_OUTPUT_DIR)) {
      const dp = path.join(CRON_OUTPUT_DIR, dir);
      if (!fs.statSync(dp).isDirectory()) continue;
      for (const f of fs.readdirSync(dp).sort().reverse().slice(0, 5)) {
        const fp = path.join(dp, f);
        try {
          const st = fs.statSync(fp);
          runs.push({ jobId: dir, fileName: f, runTime: st.mtime.toISOString(), content: fs.readFileSync(fp, 'utf-8').slice(0, 300), size: st.size });
        } catch { /* skip */ }
      }
    }
  }
  runs.sort((a, b) => b.runTime.localeCompare(a.runTime));
  const jobMap = new Map((data.jobs || []).map(j => [j.id, j.name || j.id]));
  res.json({ jobs: data.juns || [], runs: runs.map(r => ({ ...r, jobName: jobMap.get(r.jobId) || r.jobId })) });
});

app.get('/api/cron/:id', auth, (req, res) => {
  const data = readJsonOrNull(CRON_JOBS_FILE) || { jobs: [] };
  const job = (data.jobs || []).find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  const dirPath = path.join(CRON_OUTPUT_DIR, req.params.id);
  const runs = [];
  if (fs.existsSync(dirPath)) {
    for (const f of fs.readdirSync(dirPath).sort().reverse()) {
      try {
        const st = fs.statSync(path.join(dirPath, f));
        runs.push({ timestamp: f.replace('.md', ''), runTime: st.mtime.toISOString(), size: st.size });
      } catch { /* skip */ }
    }
  }
  res.json({ job, runs });
});

app.get('/api/cron/:id/runs/:timestamp', auth, (req, res) => {
  const filePath = path.join(CRON_OUTPUT_DIR, req.params.id, req.params.timestamp + '.md');
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  const content = fs.readFileSync(filePath, 'utf-8');
  res.json({ content, timestamp: req.params.timestamp, jobId: req.params.id });
});

app.post('/api/cron/:id/pause', auth, (req, res) => {
  const data = readJsonOrNull(CRON_JOBS_FILE) || { jobs: [] };
  const job = (data.jobs || []).find(j => j.id === req.params.id);
  if (job) { job.enabled = false; job.paused_at = new Date().toISOString(); job.state = 'paused'; fs.writeFileSync(CRON_JOBS_FILE, JSON.stringify(data, null, 2)); }
  res.json({ success: true });
});

app.post('/api/cron/:id/resume', auth, (req, res) => {
  const data = readJsonOrNull(CRON_JOBS_FILE) || { jobs: [] };
  const job = (data.jobs || []).find(j => j.id === req.params.id);
  if (job) { job.enabled = true; job.paused_at = null; job.state = 'scheduled'; fs.writeFileSync(CRON_JOBS_FILE, JSON.stringify(data, null, 2)); }
  res.json({ success: true });
});

app.post('/api/cron/:id/delete', auth, (req, res) => {
  const data = readJsonOrNull(CRON_JOBS_FILE) || { jobs: [] };
  data.jobs = (data.jobs || []).filter(j => j.id !== req.params.id);
  fs.writeFileSync(CRON_JOBS_FILE, JSON.stringify(data, null, 2));
  res.json({ success: true });
});

// ─── OVERVIEW ───
app.get('/api/overview', auth, (req, res) => {
  const data = readJsonOrNull(CRON_JOBS_FILE) || { jobs: [] };
  const jobs = data.jobs || [];
  const today = new Date(Date.now() + 2 * 3600000).toISOString().split('T')[0];
  const runsToday = fs.existsSync(CRON_OUTPUT_DIR) ? fs.readdirSync(CRON_OUTPUT_DIR).reduce((acc, dir) => {
    try { return acc + fs.readdirSync(path.join(CRON_OUTPUT_DIR, dir)).filter(f => f.startsWith(today)).length; } catch { return acc; }
  }, 0) : 0;
  let model = 'unknown', provider = 'unknown';
  const config = readFileOrNull(CONFIG_FILE);
  if (config) {
    const mm = config.match(/default:\s*(.+)/);
    const pm = config.match(/provider:\s*(.+)/);
    if (mm) model = mm[1].trim();
    if (pm) provider = pm[1].trim();
  }
  const sessionCount = db(STATE_DB, 'SELECT COUNT(*) FROM sessions');
  const memoryCount = db(MEMORY_DB, 'SELECT COUNT(*) FROM facts');
  res.json({
    jobs: { total: jobs.length, active: jobs.filter(j => j.enabled !== false).length, paused: jobs.filter(j => !j.enabled).length, errors: jobs.filter(j => j.last_status === 'error').length },
    runs: { today: runsToday },
    model, provider,
    sessions: { total: parseInt(sessionCount[0]?.split('|')[0]) || 0 },
    memory: { facts: parseInt(memoryCount[0]?.split('|')[0]) || 0 },
    serverTime: new Date().toISOString(),
  });
});

// ─── COSTS ───
app.get('/api/costs', auth, async (req, res) => {
  // Token usage from local session data
  const tokenRows = db(STATE_DB, 'SELECT SUM(input_tokens), SUM(output_tokens), SUM(estimated_cost_usd), COUNT(*) FROM sessions');
  const tokens = tokenRows[0] || [];
  // Cron script usage patterns
  const cronRuns = fs.existsSync(CRON_OUTPUT_DIR) ? fs.readdirSync(CRON_OUTPUT_DIR).reduce((acc, dir) => {
    try { return acc + fs.readdirSync(path.join(CRON_OUTPUT_DIR, dir)).length; } catch { return acc; }
  }, 0) : 0;
  res.json({
    tokens: { input: parseInt(tokens[0]) || 0, output: parseInt(tokens[1]) || 0 },
    estimatedCost: parseFloat(tokens[2]) || 0,
    sessionCount: parseInt(tokens[3]) || 0,
    cronRuns,
    provider: 'openrouter',
    model: 'mixed',
  });
});

// ─── CONFIG ───
app.get('/api/config', auth, (req, res) => {
  const config = readFileOrNull(CONFIG_FILE);
  if (!config) return res.json({ error: 'Config not found' });
  const parse = (regex) => { const m = config.match(regex); return m ? m[1].trim() : null; };
  res.json({
    model: { default: parse(/default:\s*(.+)/), provider: parse(/provider:\s*(.+)/), apiMode: parse(/api_mode:\s*(.+)/) },
    agent: { maxTurns: parse(/max_turns:\s*(\d+)/), timeout: parse(/gateway_timeout:\s*(\d+)/), reasoningEffort: parse(/reasoning_effort:\s*(.+)/) },
    sessions: { total: db(STATE_DB, 'SELECT COUNT(*) FROM sessions').length },
    lastUpdated: fs.statSync(CONFIG_FILE).mtime.toISOString(),
  });
});

// ─── VAULT ───
function listVaultFiles(vaultPath, subPath = '', depth = 2) {
  const fullPath = path.join(vaultPath, subPath);
  if (!fs.existsSync(fullPath)) return [];
  const entries = [];
  for (const item of fs.readdirSync(fullPath).slice(0, 50)) {
    if (item.startsWith('.') && item !== '_context') continue;
    const itemPath = path.join(subPath, item);
    const stat = fs.statSync(path.join(fullPath, item));
    if (stat.isDirectory() && depth > 0) {
      entries.push({ name: item, type: 'folder', path: itemPath, children: item === '_context' ? listVaultFiles(vaultPath, itemPath, 1) : [] });
    } else if (item.endsWith('.md')) {
      entries.push({ name: item.replace('.md', ''), type: 'file', path: itemPath, size: stat.size, modified: stat.mtime.toISOString() });
    }
  }
  return entries;
}

app.get('/api/vault/:vault', auth, (req, res) => {
  const vault = req.params.vault === 'second-brain' ? VAULT_BRAIN : VAULT_HERMES;
  const files = listVaultFiles(vault);
  res.json({ vault: req.params.vault, files });
});

app.get('/api/vault/:vault/file/*', auth, (req, res) => {
  const vault = req.params.vault === 'second-brain' ? VAULT_BRAIN : VAULT_HERMES;
  const filePath = path.join(vault, req.params[0]);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  const content = fs.readFileSync(filePath, 'utf-8');
  res.json({ path: req.params[0], content, size: content.length, modified: fs.statSync(filePath).mtime.toISOString() });
});

app.get('/api/vault/:vault/search', auth, (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  if (!q) return res.json({ results: [] });
  const vault = req.params.vault === 'second-brain' ? VAULT_BRAIN : VAULT_HERMES;
  const results = [];
  function searchDir(dir, basePath = '') {
    if (results.length >= 30) return;
    for (const item of fs.readdirSync(dir).slice(0, 100)) {
      if (results.length >= 30) return;
      if (item.startsWith('.')) continue;
      const fp = path.join(dir, item);
      const relPath = path.join(basePath, item);
      if (fs.statSync(fp).isDirectory()) {
        searchDir(fp, relPath);
      } else if (item.endsWith('.md')) {
        const content = fs.readFileSync(fp, 'utf-8');
        const idx = content.toLowerCase().indexOf(q);
        if (idx >= 0) {
          results.push({ name: item.replace('.md', ''), path: relPath, preview: content.slice(Math.max(0, idx - 50), idx + 150) });
        }
      }
    }
  }
  searchDir(vault);
  res.json({ results, query: q });
});

// ─── SSE LOG STREAM ───
app.get('/api/logs', auth, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
  if (fs.existsSync(CRON_OUTPUT_DIR)) {
    for (const dir of fs.readdirSync(CRON_OUTPUT_DIR).slice(-5)) {
      const dp = path.join(CRON_OUTPUT_DIR, dir);
      if (!fs.statSync(dp).isDirectory()) continue;
      for (const f of fs.readdirSync(dp).sort().reverse().slice(0, 3)) {
        try {
          const st = fs.statSync(path.join(dp, f));
          res.write(`data: ${JSON.stringify({ type: 'run', jobName: dir, runTime: st.mtime.toISOString(), content: fs.readFileSync(path.join(dp, f), 'utf-8').slice(0, 200) })}\n\n`);
        } catch { /* skip */ }
      }
    }
  }
  const hb = setInterval(() => res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`), 15000);
  req.on('close', () => clearInterval(hb));
});

// ─── START ───
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Hermes Dashboard Control Plane running on port ${PORT}`);
  console.log(`Tailscale Funnel: https://akhils-pc-1.tail6d629e.ts.net`);
});
