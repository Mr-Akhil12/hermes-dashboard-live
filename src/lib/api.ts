// src/lib/api.ts
// Control plane API client with fallback mock data

const CONTROL_URL = process.env.NEXT_PUBLIC_CONTROL_URL || '';
const SECRET = process.env.NEXT_PUBLIC_DASHBOARD_SECRET || '';

function headers() {
  return { 'Content-Type': 'application/json', 'x-dashboard-secret': SECRET };
}

function get(path: string) {
  return fetch(`${CONTROL_URL}${path}`, { headers: headers(), signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : null);
}

function post(path: string, body?: object) {
  return fetch(`${CONTROL_URL}${path}`, { method: 'POST', headers: headers(), body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : null);
}

function patch(path: string, body: object) {
  return fetch(`${CONTROL_URL}${path}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(body), signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : null);
}

function del(path: string) {
  return fetch(`${CONTROL_URL}${path}`, { method: 'DELETE', headers: headers(), signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : null);
}

// ─── Sessions ───
export async function fetchSessions(limit = 30, source = '') {
  try { return await get(`/api/sessions?limit=${limit}&source=${source}`) || { sessions: [] }; }
  catch { return { sessions: [] }; }
}

export async function fetchSession(id: string) {
  try { return await get(`/api/sessions/${encodeURIComponent(id)}`) || null; }
  catch { return null; }
}

export async function searchSessions(q: string) {
  try { return await get(`/api/sessions/search?q=${encodeURIComponent(q)}`) || { sessions: [], messages: [] }; }
  catch { return { sessions: [], messages: [] }; }
}

// ─── Memory ───
export async function fetchMemory() {
  try { return await get('/api/memory') || { facts: [] }; }
  catch { return fallbackMemory(); }
}

export async function searchMemory(q: string) {
  try { return await get(`/api/memory/search?q=${encodeURIComponent(q)}`) || { facts: [] }; }
  catch { return { facts: [] }; }
}

export async function fetchEntities() {
  try { return await get('/api/memory/entities') || { entities: [] }; }
  catch { return { entities: [] }; }
}

// ─── Tasks ───
export async function fetchTasks() {
  try { return await get('/api/tasks') || { tasks: [] }; }
  catch { return { tasks: [] }; }
}

export async function createTask(title: string, status = 'pending') {
  try { return await post('/api/tasks', { title, status }); } catch { /* ok */ }
}

export async function updateTask(id: string, updates: { title?: string; status?: string; priority?: string }) {
  try { return await patch(`/api/tasks/${id}`, updates); } catch { /* ok */ }
}

export async function deleteTask(id: string) {
  try { return await del(`/api/tasks/${id}`); } catch { /* ok */ }
}

// ─── Cron ───
export async function fetchCronJobs() {
  try { return await get('/api/cron') || fallbackCron(); }
  catch { return fallbackCron(); }
}

export async function fetchCronJob(id: string) {
  try { return await get(`/api/cron/${id}`) || null; }
  catch { return null; }
}

export async function fetchCronRunOutput(jobId: string, timestamp: string) {
  try { return await get(`/api/cron/${jobId}/runs/${timestamp}`) || null; }
  catch { return null; }
}

export async function pauseCron(id: string) { try { return await post(`/api/cron/${id}/pause`); } catch { /* ok */ } }
export async function resumeCron(id: string) { try { return await post(`/api/cron/${id}/resume`); } catch { /* ok */ } }
export async function deleteCron(id: string) { try { return await post(`/api/cron/${id}/delete`); } catch { /* ok */ } }

// ─── Overview ───
export async function fetchOverview() {
  try { return await get('/api/overview') || fallbackOverview(); }
  catch { return fallbackOverview(); }
}

// ─── Costs ───
export async function fetchCosts() {
  try { return await get('/api/costs') || { tokens: {}, estimatedCost: 0 }; }
  catch { return { tokens: {}, estimatedCost: 0 }; }
}

// ─── Config ───
export async function fetchConfig() {
  try { return await get('/api/config') || {}; }
  catch { return {}; }
}

// ─── Health ───
export async function fetchHealth() {
  try { const r = await fetch(`${CONTROL_URL}/api/health`, { signal: AbortSignal.timeout(3000) }); return r.ok ? await r.json() : { status: 'offline' }; }
  catch { return { status: 'offline' }; }
}

// ─── Vault ───
export async function fetchVaultFiles(vault: string) {
  try { return await get(`/api/vault/${vault}`) || { files: [] }; }
  catch { return { files: [] }; }
}

export async function fetchVaultFile(vault: string, filePath: string) {
  try { return await get(`/api/vault/${vault}/file/${filePath}`) || null; }
  catch { return null; }
}

export async function searchVault(vault: string, q: string) {
  try { return await get(`/api/vault/${vault}/search?q=${encodeURIComponent(q)}`) || { results: [] }; }
  catch { return { results: [] }; }
}

// ─── Fallback data ───
const fallbackOverview = () => ({
  jobs: { total: 18, active: 16, paused: 1, errors: 1 },
  runs: { today: 273 },
  model: 'ollama-cloud/minimax-m3',
  provider: 'ollama-cloud',
  sessions: { total: 213 },
  memory: { facts: 44 },
  serverTime: new Date().toISOString(),
});

const fallbackCron = () => ({
  jobs: [
    { id: '1', name: 'OpenRouter Usage Check', schedule_display: '0 * * * *', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 3600000).toISOString(), next_run_at: new Date(Date.now() + 3600000).toISOString(), deliver: '#openrouter-usage', no_agent: true, script: 'openrouter_usage_check.sh' },
    { id: '2', name: 'Brain Synthesis', schedule_display: '0 8 * * *', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 72000000).toISOString(), deliver: '#second-brain', no_agent: false },
    { id: '3', name: 'Self-Improvement Engine', schedule_display: '0 4 * * *', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 108000000).toISOString(), deliver: 'local', no_agent: true },
    { id: '4', name: 'Dashboard Sync', schedule_display: '*/5 * * * *', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 300000).toISOString(), deliver: 'github', no_agent: true },
    { id: '5', name: 'Vault Healer', schedule_display: '0 2 * * 0', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 259200000).toISOString(), deliver: 'local', no_agent: true },
    { id: '6', name: 'Blog Content Pipeline', schedule_display: '0 6 * * 1', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 432000000).toISOString(), deliver: '#content-pipeline', no_agent: false },
    { id: '7', name: 'Wix Form Idle Check', schedule_display: '*/30 * * * *', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 1800000).toISOString(), deliver: '#wix-notifications', no_agent: false },
    { id: '8', name: 'Daily AI News Report', schedule_display: '0 8 * * *', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 72000000).toISOString(), deliver: '#ai-news', no_agent: false },
    { id: '9', name: 'AgenticBiz Content Sync', schedule_display: '0 10 * * 1-5', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 144000000).toISOString(), deliver: '#agentic-biz', no_agent: false },
    { id: '10', name: 'Database Cleanup', schedule_display: '0 0 1 * *', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 2592000000).toISOString(), deliver: 'local', no_agent: true },
    { id: '11', name: 'Hush PWA Monitor', schedule_display: '0 9 * * *', state: 'paused', enabled: false, last_status: 'ok', last_run_at: new Date(Date.now() - 86400000).toISOString(), deliver: '#hush-alerts', no_agent: false },
    { id: '12', name: 'Model Health Check', schedule_display: '0 */6 * * *', state: 'scheduled', enabled: true, last_status: 'ok', last_run_at: new Date(Date.now() - 21600000).toISOString(), deliver: 'local', no_agent: false },
  ],
  runs: [],
});

const fallbackMemory = () => ({
  facts: [
    { id: 1, content: 'User prefers short direct answers. Fix first, discuss second. No tables — bullet points only.', category: 'user_pref', trustScore: 0.95, entities: [{ name: 'user_pref', type: 'preference' }] },
    { id: 2, content: 'Akhil Pillay from Tongaat, KZN, South Africa. Building AI agent business while working full-time in marketing.', category: 'user', trustScore: 0.98, entities: [{ name: 'Akhil', type: 'person' }] },
    { id: 3, content: 'Comfort Shooting Marketing Agency — IT department. Wix Studio certified developer.', category: 'work', trustScore: 0.95, entities: [{ name: 'Comfort Shooting', type: 'business' }] },
    { id: 4, content: 'Hermes Agent setup: WSL on Windows, Discord gateway, OpenRouter free tier + Ollama Cloud.', category: 'env', trustScore: 0.9, entities: [{ name: 'Hermes', type: 'tool' }] },
    { id: 5, content: 'Dashboard: hermes-dashboard-live Vercel project, Tailscale Funnel control plane on port 9120.', category: 'project', trustScore: 0.92, entities: [{ name: 'dashboard', type: 'project' }] },
    { id: 6, content: 'Design rules: NO Inter font, NO purple gradients, NO glassmorphism. Dark + warm accents. Asymmetric/editorial.', category: 'design', trustScore: 0.95, entities: [{ name: 'design', type: 'standard' }] },
    { id: 7, content: 'Scope discipline: build only what is asked. No admin UIs, storage, or auth unless explicitly requested.', category: 'process', trustScore: 0.9, entities: [{ name: 'process', type: 'rule' }] },
    { id: 8, content: 'Two-vault Obsidian system: hermes vault + second-brain vault. Brain synthesis runs 3x daily via cron.', category: 'knowledge', trustScore: 0.88, entities: [{ name: 'Obsidian', type: 'tool' }] },
  ],
});
