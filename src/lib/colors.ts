// src/lib/colors.ts
// Status color system — no purple, no generic blue

export const statusColors = {
  ok: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  running: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  scheduled: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', dot: 'bg-sky-400' },
  paused: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  error: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-400' },
  disabled: { bg: 'bg-zinc-500/10', text: 'text-zinc-500', border: 'border-zinc-700', dot: 'bg-zinc-600' },
  idle: { bg: 'bg-zinc-500/10', text: 'text-zinc-500', border: 'border-zinc-700', dot: 'bg-zinc-600' },
  offline: { bg: 'bg-zinc-500/10', text: 'text-zinc-500', border: 'border-zinc-700', dot: 'bg-zinc-600' },
  checking: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
};

export function getStatusColor(status: string) {
  const s = status?.toLowerCase() || '';
  if (s === 'ok' || s === 'running' || s === 'active' || s === 'completed') return statusColors.ok;
  if (s === 'scheduled' || s === 'pending') return statusColors.scheduled;
  if (s === 'paused' || s === 'warning') return statusColors.paused;
  if (s === 'error' || s === 'failed') return statusColors.error;
  if (s === 'disabled' || s === 'offline') return statusColors.disabled;
  return statusColors.idle;
}

// Design system: dark + warm accents, no glassmorphism
export const theme = {
  bg: 'bg-[#0a0a0f]',
  bgCard: 'bg-[#111118]',
  bgCardHover: 'bg-[#16161f]',
  border: 'border-[#1e1e2a]',
  borderHover: 'border-[#2a2a3a]',
  text: 'text-zinc-100',
  textMuted: 'text-zinc-400',
  textDim: 'text-zinc-600',
  accent: 'text-orange-400',
  accentBg: 'bg-orange-500/10',
  warmAccent: '#f97316', // orange-500
  sidebar: 'bg-[#0d0d14]',
  sidebarActive: 'bg-orange-500/10',
  sidebarActiveText: 'text-orange-400',
};
