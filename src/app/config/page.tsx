// src/app/config/page.tsx — CONFIG TAB (read-only)
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDashboardStore } from '@/lib/store';
import { fetchOverview } from '@/lib/api';
import { theme } from '@/lib/colors';
import { Settings, Cpu, Shield, Clock, ExternalLink } from 'lucide-react';

export default function ConfigPage() {
  useDashboardStore(); // keep store subscription
  const [overview, setOverview] = useState<{
    jobs: { total: number; active: number; paused: number; errors: number };
    runs: { today: number; total: number };
    model: string;
    provider: string;
    serverTime: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchOverview();
      setOverview(data);
    } catch (e) { /* skip */ }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { loadData(); // eslint-disable-next-line react-hooks/set-state-in-effect
}, [loadData]);


  const configSections = [
    {
      title: 'Model',
      icon: Cpu,
      items: [
        { label: 'Active Model', value: overview?.model || '—' },
        { label: 'Provider', value: overview?.provider || '—' },
        { label: 'API Mode', value: 'chat_completions' },
      ],
    },
    {
      title: 'Fallback Chain',
      icon: Shield,
      items: [
        { label: 'Fallback 1', value: 'openrouter/owl-alpha' },
        { label: 'Fallback 2', value: 'nvidia/nemotron-3-super-120b-a12b:free' },
        { label: 'Fallback 3', value: 'openrouter/free' },
      ],
    },
    {
      title: 'Agent',
      icon: Settings,
      items: [
        { label: 'Max Turns', value: '100' },
        { label: 'Gateway Timeout', value: '1800s' },
        { label: 'Reasoning Effort', value: 'medium' },
        { label: 'Tool Use Enforcement', value: 'auto' },
      ],
    },
    {
      title: 'Cron',
      icon: Clock,
      items: [
        { label: 'Active Jobs', value: String(overview?.jobs.active || '—') },
        { label: 'Total Jobs', value: String(overview?.jobs.total || '—') },
        { label: 'Runs Today', value: String(overview?.runs.today || '—') },
      ],
    },
  ];

  return (
    <div className={`p-5 overflow-y-auto h-[calc(100vh-3.5rem)] ${theme.bg}`} style={{ marginLeft: 'var(--sidebar-w, 4rem)', transition: 'margin-left 0.3s' }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-zinc-100">Config</h2>
        <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">Read-only</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configSections.map(section => {
          const Icon = section.icon;
          return (
            <div key={section.title} className={`${theme.bgCard} rounded-xl p-4`} style={{ border: '1px solid #1e1e2a' }}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-3 h-3 text-orange-400" />
                <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-medium">{section.title}</h3>
              </div>
              <div className="space-y-2">
                {section.items.map(item => (
                  <div key={item.label} className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid #16161f' }}>
                    <span className="text-[11px] text-zinc-500">{item.label}</span>
                    <span className="text-[11px] text-zinc-200 font-mono truncate max-w-[200px]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit info */}
      <div className="mt-4 bg-orange-500/5 border border-orange-500/10 rounded-xl p-4">
        <p className="text-[11px] text-orange-400 font-medium mb-1">Editing Config</p>
        <p className="text-[10px] text-zinc-500">
          To change config, DM Hermes on Discord or run <code className="text-zinc-400">hermes config</code> in terminal.
          Changes take effect after <code className="text-zinc-400">hermes gateway restart</code>.
        </p>
      </div>
    </div>
  );
}
