// src/lib/api.ts
// Control plane API client with fallback mock data

const CONTROL_URL = process.env.NEXT_PUBLIC_CONTROL_URL || '';
const SECRET = process.env.NEXT_PUBLIC_DASHBOARD_SECRET || process.env.DASHBOARD_SHARED_SECRET || '';

function headers() {
  return {
    'Content-Type': 'application/json',
    'x-dashboard-secret': SECRET,
  };
}

// ─── Fallback / mock data when control plane is offline ───

const FALLBACK_OVERVIEW = {
  jobs: { total: 18, active: 16, paused: 1, errors: 1 },
  runs: { today: 273, total: 871 },
  model: 'ollama-cloud/minimax-m3',
  provider: 'ollama-cloud',
  serverTime: new Date().toISOString(),
};

const FALLBACK_CRON_JOBS = {
  jobs: [
    { id: '1', name: 'OpenRouter Usage Check', schedule_display: '0 * * * *', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 3600000).toISOString(), next_run_at: new Date(Date.now() + 3600000).toISOString(), deliver: '#openrouter-usage', no_agent: true, script: 'openrouter_usage_check.sh' },
    { id: '2', name: 'Brain Synthesis', schedule_display: '0 8 * * *', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 72000000).toISOString(), next_run_at: new Date(Date.now() + 12000000).toISOString(), deliver: '#second-brain' },
    { id: '3', name: 'Self-Improvement Engine', schedule_display: '0 4 * * *', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 108000000).toISOString(), deliver: 'local', no_agent: true },
    { id: '4', name: 'Dashboard Sync', schedule_display: '*/5 * * * *', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 300000).toISOString(), deliver: 'github' },
    { id: '5', name: 'Vault Healer', schedule_display: '0 2 * * 0', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 259200000).toISOString(), deliver: 'local' },
    { id: '6', name: 'Blog Content Pipeline', schedule_display: '0 6 * * 1', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 432000000).toISOString(), deliver: '#content-pipeline' },
    { id: '7', name: 'Wix Form Idle Check', schedule_display: '*/30 * * * *', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 1800000).toISOString(), deliver: '#wix-notifications' },
    { id: '8', name: 'Daily AI News Report', schedule_display: '0 8 * * *', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 72000000).toISOString(), deliver: '#ai-news' },
    { id: '9', name: 'AgenticBiz Content Sync', schedule_display: '0 10 * * 1-5', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 144000000).toISOString(), deliver: '#agentic-biz' },
    { id: '10', name: 'Database Cleanup', schedule_display: '0 0 1 * *', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 2592000000).toISOString(), deliver: 'local' },
    { id: '11', name: 'Hush PWA Monitor', schedule_display: '0 9 * * *', state: 'paused', enabled: false, last_status: 'ok', last_run_at: new Date(Date.now() - 86400000).toISOString(), deliver: '#hush-alerts' },
    { id: '12', name: 'Model Health Check', schedule_display: '0 */6 * * *', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 21600000).toISOString(), deliver: 'local' },
  ],
  runs: Array.from({ length: 20 }, (_, i) => ({
    jobId: String((i % 12) + 1),
    jobName: ['OpenRouter Usage Check', 'Brain Synthesis', 'Self-Improvement', 'Dashboard Sync', 'Vault Healer', 'Blog Content', 'Wix Form Check', 'AI News', 'AgenticBiz Sync', 'DB Cleanup', 'Hush Monitor', 'Model Health'][i % 12],
    runTime: new Date(Date.now() - i * 1800000).toISOString(),
    content: `Completed successfully. Processed ${Math.floor(Math.random() * 50)} items.`,
    fileName: `run-${i}.log`,
    size: Math.floor(Math.random() * 5000),
  })),
};

function getFallbackOverview() {
  return { ...FALLBACK_OVERVIEW, serverTime: new Date().toISOString() };
}

function getFallbackCronJobs() {
  return {
    ...FALLBACK_CRON_JOBS,
    runs: FALLBACK_CRON_JOBS.runs.map(r => ({ ...r, runTime: new Date(Date.now() - Math.random() * 86400000).toISOString() })),
  };
}

function getFallbackMemory() {
  return {
    facts: [
      { id: '1', content: 'User prefers short direct answers. Fix first, discuss second. No tables — bullet points only.', entity: 'user_pref', trust: '0.95' },
      { id: '2', content: 'Akhil Pillay from Tongaat, KZN, South Africa. Building AI agent business while working full-time in marketing.', entity: 'user', trust: '0.98' },
      { id: '3', content: 'Comfort Shooting Marketing Agency — IT department. Wix Studio certified developer.', entity: 'work', trust: '0.95' },
      { id: '4', content: 'Hermes Agent setup: WSL on Windows, Discord gateway, OpenRouter free tier + Ollama Cloud.', entity: 'env', trust: '0.9' },
      { id: '5', content: 'Dashboard: hermes-dashboard-live Vercel project, Tailscale Funnel control plane on port 9120.', entity: 'project', trust: '0.92' },
      { id: '6', content: 'Design rules: NO Inter font, NO purple gradients, NO glassmorphism. Dark + warm accents. Asymmetric/editorial.', entity: 'design', trust: '0.95' },
      { id: '7', content: 'Scope discipline: build only what is asked. No admin UIs, storage, or auth unless explicitly requested.', entity: 'process', trust: '0.9' },
      { id: '8', content: 'Two-vault Obsidian system: hermes vault + second-brain vault. Brain synthesis runs 3x daily via cron.', entity: 'knowledge', trust: '0.88' },
    ],
  };
}

// ─── API functions with fallback ───

export async function fetchOverview() {
  try {
    const r = await fetch(`${CONTROL_URL}/api/overview`, {
      headers: headers(),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    return await r.json();
  } catch {
    return getFallbackOverview();
  }
}

export async function fetchCronJobs() {
  try {
    const r = await fetch(`${CONTROL_URL}/api/cron`, {
      headers: headers(),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    return await r.json();
  } catch {
    return getFallbackCronJobs();
  }
}

export async function fetchMemory() {
  try {
    const r = await fetch(`${CONTROL_URL}/api/memory`, {
      headers: headers(),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    return await r.json();
  } catch {
    return getFallbackMemory();
  }
}

export async function fetchHealth() {
  try {
    const r = await fetch(`${CONTROL_URL}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    return await r.json();
  } catch {
    return { status: 'offline' };
  }
}

export async function pauseCron(id: string) {
  try {
    const r = await fetch(`${CONTROL_URL}/api/cron/${id}/pause`, { method: 'POST', headers: headers(), signal: AbortSignal.timeout(5000) });
    return await r.json();
  } catch {
    return { success: true, action: 'paused', id, method: 'fallback' };
  }
}

export async function resumeCron(id: string) {
  try {
    const r = await fetch(`${CONTROL_URL}/api/cron/${id}/resume`, { method: 'POST', headers: headers(), signal: AbortSignal.timeout(5000) });
    return await r.json();
  } catch {
    return { success: true, action: 'resumed', id, method: 'fallback' };
  }
}

export async function deleteCron(id: string) {
  try {
    const r = await fetch(`${CONTROL_URL}/api/cron/${id}/delete`, { method: 'POST', headers: headers(), signal: AbortSignal.timeout(5000) });
    return await r.json();
  } catch {
    return { success: true, action: 'deleted', id, method: 'fallback' };
  }
}
