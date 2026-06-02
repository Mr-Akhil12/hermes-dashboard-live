// src/app/costs/page.tsx — COSTS TAB
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDashboardStore } from '@/lib/store';
import { fetchOverview, fetchCronJobs } from '@/lib/api';
import { theme } from '@/lib/colors';
import { DollarSign, TrendingUp, Cpu, AlertTriangle } from 'lucide-react';

interface CostData {
  provider: string;
  model: string;
  requests: number;
  tokensIn: number;
  tokensOut: number;
  cost: number;
}

export default function CostsPage() {
  useDashboardStore(); // keep store subscription
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<{
    jobs: { total: number; active: number; paused: number; errors: number };
    runs: { today: number; total: number };
    model: string;
    provider: string;
    serverTime: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [ov, cron] = await Promise.all([fetchOverview(), fetchCronJobs()]);
      setOverview(ov);
    } catch (e) { /* skip */ }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { loadData(); // eslint-disable-next-line react-hooks/set-state-in-effect
}, [loadData]);


  // Placeholder cost data — real data comes from OpenRouter API + local tracking
  const providers = [
    { name: 'OpenRouter', model: overview?.model || 'ollama-cloud/minimax-m3', requests: 0, tokens: 0, cost: 0, color: 'text-orange-400' },
    { name: 'Ollama Cloud', model: 'minimax-m3', requests: 0, tokens: 0, cost: 0, color: 'text-sky-400' },
    { name: 'Local Ollama', model: 'phi4:14b', requests: 0, tokens: 0, cost: 0, color: 'text-emerald-400' },
  ];

  return (
    <div className={`p-5 overflow-y-auto h-[calc(100vh-3.5rem)] ${theme.bg}`} style={{ marginLeft: 'var(--sidebar-w, 4rem)', transition: 'margin-left 0.3s' }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Costs & Usage</h2>
        </div>
        <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-medium">
          <TrendingUp className="w-3 h-3" />
          Free tier
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className={`${theme.bgCard} rounded-xl p-4`} style={{ border: '1px solid #1e1e2a' }}>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Today</p>
          <p className="text-xl font-bold text-zinc-100 mt-1">$0.00</p>
          <p className="text-[10px] text-emerald-400 mt-0.5">Free tier</p>
        </div>
        <div className={`${theme.bgCard} rounded-xl p-4`} style={{ border: '1px solid #1e1e2a' }}>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider">This Week</p>
          <p className="text-xl font-bold text-zinc-100 mt-1">$0.00</p>
          <p className="text-[10px] text-emerald-400 mt-0.5">Free tier</p>
        </div>
        <div className={`${theme.bgCard} rounded-xl p-4`} style={{ border: '1px solid #1e1e2a' }}>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Requests</p>
          <p className="text-xl font-bold text-zinc-100 mt-1">—</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">Connect OpenRouter</p>
        </div>
        <div className={`${theme.bgCard} rounded-xl p-4`} style={{ border: '1px solid #1e1e2a' }}>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Active Model</p>
          <p className="text-sm font-bold text-zinc-100 mt-1 font-mono">{overview?.model?.split('/').pop() || '—'}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">{overview?.provider || '—'}</p>
        </div>
      </div>

      {/* Provider breakdown */}
      <div className={`${theme.bgCard} rounded-xl overflow-hidden`} style={{ border: '1px solid #1e1e2a' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #1e1e2a' }}>
          <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Providers</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-zinc-500 uppercase tracking-wider" style={{ borderBottom: '1px solid #1e1e2a' }}>
              <th className="text-left px-4 py-2.5 font-medium">Provider</th>
              <th className="text-left px-4 py-2.5 font-medium">Model</th>
              <th className="text-right px-4 py-2.5 font-medium">Requests</th>
              <th className="text-right px-4 py-2.5 font-medium">Tokens</th>
              <th className="text-right px-4 py-2.5 font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {providers.map(p => (
              <tr key={p.name} style={{ borderBottom: '1px solid #16161f' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Cpu className={`w-3 h-3 ${p.color}`} />
                    <span className="text-zinc-200 font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-400 font-mono text-[11px]">{p.model}</td>
                <td className="px-4 py-3 text-right text-zinc-400">{p.requests || '—'}</td>
                <td className="px-4 py-3 text-right text-zinc-400">{p.tokens ? p.tokens.toLocaleString() : '—'}</td>
                <td className="px-4 py-3 text-right text-zinc-400">{p.cost ? `$${p.cost.toFixed(4)}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="mt-4 bg-orange-500/5 border border-orange-500/10 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-3 h-3 text-orange-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[11px] text-orange-400 font-medium">Cost tracking coming soon</p>
            <p className="text-[10px] text-zinc-500 mt-1">
              Real-time usage data will be pulled from the OpenRouter API and local Ollama logs.
              For now, all models are running on free tiers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
