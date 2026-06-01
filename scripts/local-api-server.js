/**
 * Hermes Dashboard — Local Control Plane API
 * 
 * Runs on port 9120, exposed via Tailscale Serve (HTTPS).
 * Auth: shared secret in x-dashboard-secret header.
 * 
 * Endpoints:
 *   GET  /api/health                    — health check
 *   GET  /api/cron                      — list all cron jobs + runs
 *   GET  /api/cron/:id                  — get specific job
 *   POST /api/cron/:id/pause            — pause a job
 *   POST /api/cron/:id/resume           — resume a paused job
 *   POST /api/cron/:id/delete           — delete a job (disabled, not removed from disk)
 *   GET  /api/overview                  — system overview (active jobs, runs today, errors)
 *   GET  /api/logs                      — SSE log stream
 *   GET  /api/memory                    — recent memory facts
 *   GET  /api/sessions                  — recent sessions
 */

const express = require('express');
const cors = require('cors');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 9120;

const SHARED_SECRET = process.env.DASHBOARD_SHARED_SECRET || 'cfc6263218fec657f43a2352726a8166536bb1d3ed57f394cc1f56c4fe91f4f5';
const CRON_JOBS_FILE = path.join(os.homedir(), '.hermes', 'cron', 'jobs.json');
const CRON_OUTPUT_DIR = path.join(os.homedir(), '.hermes', 'cron', 'output');
const CONFIG_FILE = path.join(os.homedir(), '.hermes', 'config.yaml');
const STATE_DB = path.join(os.homedir(), '.hermes', 'state.db');

app.use(cors());
app.use(express.json());

// ─── Auth middleware ───
function auth(req, res, next) {
  const header = req.headers['x-dashboard-secret'];
  if (header !== SHARED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ─── Helper: read cron jobs from disk ───
function readCronJobs() {
  try {
    const raw = fs.readFileSync(CRON_JOBS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { jobs: [], runs: [] };
  }
}

// ─── Helper: write cron jobs back to disk ───
function writeCronJobs(data) {
  fs.writeFileSync(CRON_JOBS_FILE, JSON.stringify(data, null, 2));
}

// ─── Helper: read cron output files ───
function readCronRuns() {
  const runs = [];
  try {
    const outputDir = CRON_OUTPUT_DIR;
    if (!fs.existsSync(outputDir)) return runs;
    const dirs = fs.readdirSync(outputDir);
    for (const dir of dirs) {
      const dirPath = path.join(outputDir, dir);
      if (!fs.statSync(dirPath).isDirectory()) continue;
      const files = fs.readdirSync(dirPath).sort().reverse().slice(0, 10);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        try {
          const stat = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, 'utf-8').slice(0, 500);
          runs.push({
            jobId: dir,
            fileName: file,
            runTime: stat.mtime.toISOString(),
            content: content,
            size: stat.size,
          });
        } catch (e) { /* skip */ }
      }
    }
  } catch (e) { /* skip */ }
  return runs.sort((a, b) => b.runTime.localeCompare(a.runTime));
}

// ─── Health check (no auth) ───
app.get('/api/health', (req, res) => {
  const data = readCronJobs();
  res.json({ status: 'ok', jobs: data.jobs?.length || 0, timestamp: new Date().toISOString() });
});

// ─── Cron jobs ───
app.get('/api/cron', auth, (req, res) => {
  const data = readCronJobs();
  const runs = readCronRuns();
  
  // Match runs to job names
  const jobMap = new Map();
  for (const job of (data.jobs || [])) {
    jobMap.set(job.id, job.name || job.id);
  }
  const runsWithNames = runs.map(r => ({
    ...r,
    jobName: jobMap.get(r.jobId) || r.jobId,
  }));

  res.json({ jobs: data.jobs || [], runs: runsWithNames });
});

app.get('/api/cron/:id', auth, (req, res) => {
  const data = readCronJobs();
  const job = (data.jobs || []).find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  
  const runs = readCronRuns().filter(r => r.jobId === req.params.id);
  res.json({ job, runs });
});

// Pause: uses hermes cron update <id> --pause
app.post('/api/cron/:id/pause', auth, (req, res) => {
  const { id } = req.params;
  try {
    execSync(`hermes cron update ${id} --pause`, { encoding: 'utf-8', timeout: 15000 });
    return res.json({ success: true, action: 'paused', id });
  } catch (e) {
    // Fallback: write directly to jobs.json (hermes cron CLI might not support --pause)
    try {
      const data = readCronJobs();
      const job = (data.jobs || []).find(j => j.id === id);
      if (job) {
        job.enabled = false;
        job.paused_at = new Date().toISOString();
        job.state = 'paused';
        writeCronJobs(data);
        return res.json({ success: true, action: 'paused', id, method: 'direct' });
      }
    } catch (e2) { /* fall through */ }
    return res.status(500).json({ error: e.message });
  }
});

// Resume: uses hermes cron update <id> --resume
app.post('/api/cron/:id/resume', auth, (req, res) => {
  const { id } = req.params;
  try {
    execSync(`hermes cron update ${id} --resume`, { encoding: 'utf-8', timeout: 15000 });
    return res.json({ success: true, action: 'resumed', id });
  } catch (e) {
    try {
      const data = readCronJobs();
      const job = (data.jobs || []).find(j => j.id === id);
      if (job) {
        job.enabled = true;
        job.paused_at = null;
        job.state = 'scheduled';
        writeCronJobs(data);
        return res.json({ success: true, action: 'resumed', id, method: 'direct' });
      }
    } catch (e2) { /* fall through */ }
    return res.status(500).json({ error: e.message });
  }
});

// Delete: uses hermes cron remove <id>
app.post('/api/cron/:id/delete', auth, (req, res) => {
  const { id } = req.params;
  try {
    execSync(`hermes cron remove ${id}`, { encoding: 'utf-8', timeout: 15000 });
    return res.json({ success: true, action: 'deleted', id });
  } catch (e) {
    // Fallback: remove from jobs.json directly
    try {
      const data = readCronJobs();
      data.jobs = (data.jobs || []).filter(j => j.id !== id);
      writeCronJobs(data);
      return res.json({ success: true, action: 'deleted', id, method: 'direct' });
    } catch (e2) {
      return res.status(500).json({ error: e2.message });
    }
  }
});

// ─── Overview ───
app.get('/api/overview', auth, (req, res) => {
  const data = readCronJobs();
  const jobs = data.jobs || [];
  const now = new Date();
  const today = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().split('T')[0]; // UTC+2

  const active = jobs.filter(j => j.enabled !== false).length;
  const paused = jobs.filter(j => j.enabled === false || j.state === 'paused').length;
  const errors = jobs.filter(j => j.last_status === 'error').length;
  
  const runs = readCronRuns();
  const runsToday = runs.filter(r => r.runTime.startsWith(today)).length;

  let model = 'unknown';
  let provider = 'unknown';
  try {
    const config = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const modelMatch = config.match(/default:\s*(.+)/);
    const providerMatch = config.match(/provider:\s*(.+)/);
    if (modelMatch) model = modelMatch[1].trim();
    if (providerMatch) provider = providerMatch[1].trim();
  } catch (e) { /* skip */ }

  res.json({
    jobs: { total: jobs.length, active, paused, errors },
    runs: { today: runsToday, total: runs.length },
    model, provider,
    serverTime: now.toISOString(),
  });
});

// ─── SSE Log Stream ───
app.get('/api/logs', auth, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Send initial data: recent cron runs
  const runs = readCronRuns().slice(0, 20);
  for (const run of runs) {
    res.write(`data: ${JSON.stringify({ type: 'run', ...run })}\n\n`);
  }

  // Poll for new runs every 5s
  const interval = setInterval(() => {
    try {
      const latest = readCronRuns().slice(0, 5);
      for (const run of latest) {
        res.write(`data: ${JSON.stringify({ type: 'run', ...run })}\n\n`);
      }
    } catch (e) { /* skip */ }
  }, 5000);

  // Heartbeat
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', time: new Date().toISOString() })}\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(interval);
    clearInterval(heartbeat);
  });
});

// ─── Memory facts ───
app.get('/api/memory', auth, (req, res) => {
  try {
    const dbFile = path.join(os.homedir(), '.hermes', 'memory_store.db');
    if (!fs.existsSync(dbFile)) return res.json({ facts: [] });
    
    // SQLite read via command line (simpler than adding better-sqlite3 dep)
    const result = execSync(
      `sqlite3 "${dbFile}" "SELECT * FROM facts ORDER BY rowid DESC LIMIT 50;" 2>/dev/null || echo ""`,
      { encoding: 'utf-8', timeout: 5000 }
    );
    
    const facts = result.trim().split('\n').filter(Boolean).map(line => {
      const parts = line.split('|');
      return { id: parts[0], content: parts[1] || '', entity: parts[2] || '', trust: parts[3] || '' };
    });
    
    res.json({ facts });
  } catch (e) {
    res.json({ facts: [], error: e.message });
  }
});

// ─── Sessions ───
app.get('/api/sessions', auth, (req, res) => {
  try {
    const dbFile = path.join(os.homedir(), '.hermes', 'state.db');
    if (!fs.existsSync(dbFile)) return res.json({ sessions: [] });
    
    const result = execSync(
      `sqlite3 "${dbFile}" "SELECT * FROM sessions ORDER BY created_at DESC LIMIT 20;" 2>/dev/null || echo ""`,
      { encoding: 'utf-8', timeout: 5000 }
    );
    
    res.json({ sessions: result.trim().split('\n').filter(Boolean) });
  } catch (e) {
    res.json({ sessions: [], error: e.message });
  }
});

// ─── Start ───
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Hermes Dashboard Control Plane running on port ${PORT}`);
  console.log(`Tailscale Serve: https://akhils-pc-1.tail6d629e.ts.net`);
  console.log(`Auth: x-dashboard-secret header required`);
});
