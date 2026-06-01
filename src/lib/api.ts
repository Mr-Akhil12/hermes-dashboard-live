// src/lib/api.ts
// Control plane API client — talks to local-api-server via Tailscale

const CONTROL_URL = process.env.NEXT_PUBLIC_CONTROL_URL || '';
const SECRET = process.env.NEXT_PUBLIC_DASHBOARD_SECRET || '';

function headers() {
  return {
    'Content-Type': 'application/json',
    'x-dashboard-secret': SECRET,
  };
}

export async function fetchOverview() {
  const r = await fetch(`${CONTROL_URL}/api/overview`, { headers: headers() });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

export async function fetchCronJobs() {
  const r = await fetch(`${CONTROL_URL}/api/cron`, { headers: headers() });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

export async function fetchMemory() {
  const r = await fetch(`${CONTROL_URL}/api/memory`, { headers: headers() });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

export async function fetchHealth() {
  const r = await fetch(`${CONTROL_URL}/api/health`);
  return r.json();
}

export async function pauseCron(id: string) {
  const r = await fetch(`${CONTROL_URL}/api/cron/${id}/pause`, {
    method: 'POST',
    headers: headers(),
  });
  return r.json();
}

export async function resumeCron(id: string) {
  const r = await fetch(`${CONTROL_URL}/api/cron/${id}/resume`, {
    method: 'POST',
    headers: headers(),
  });
  return r.json();
}

export async function deleteCron(id: string) {
  const r = await fetch(`${CONTROL_URL}/api/cron/${id}/delete`, {
    method: 'POST',
    headers: headers(),
  });
  return r.json();
}

// Static fallback: read cron-data.json at build time (for when control plane is offline)
export async function fetchStaticCronData() {
  try {
    const r = await fetch('/cron-data.json', { cache: 'no-store' });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}
