// src/app/page.tsx — OVERVIEW tab (default landing)
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDashboardStore } from '@/lib/store';
import { fetchOverview, fetchCronJobs, fetchHealth } from '@/lib/api';
import { theme, getStatusColor } from '@/lib/colors';
import KpiCard from '@/components/KpiCard';
import CalendarHeatmap from '@/components/CalendarHeatmap';
import { Clock, CheckCircle2, AlertTriangle, XCircle, Cpu, ArrowUpRight } from 'lucide-react';

interface OverviewData {
  jobs: { total: number; active: number; paused: number; errors: number };
  runs: { today: number; total: number };
  model: string;
  provider: string;
  serverTime: string;
}

export default function OverviewPage() {
  const { sidebarOpen, setConnectionStatus, setLastSync } = useDashboardStore();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [recentRuns, setRecentRuns] = useState<Array<{ jobName: string; runTime: string; content: string }>>([]);
  const [allRuns, setAllRuns] = useState<Array<{ runTime: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [overviewData, cronData, health] = await Promise.all([
        fetchOverview(),
        fetchCronJobs(),
        fetchHealth(),
      ]);
      setOverview(overviewData);
      setRecentRuns((cronData.runs || []).slice(0, 15));
      setAllRuns(cronData.runs || []);
      setConnectionStatus(health.status === 'ok' ? 'online' : 'offline');
      setLastSync(new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }));
      setError(null);
    } catch (e: any) {
      setError(e.message);
      setConnectionStatus('offline');
    } finally {
      setLoading(false);
    }
  }, [setConnectionStatus, setLastSync]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${theme.text}`} style={{ marginLeft: sidebarOpen ? '14rem' : '4rem' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Connecting to control plane...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-5 space-y-5 overflow-y-auto h-[calc(100vh-3.5rem)] ${theme.bg}`}
      style={{ marginLeft: sidebarOpen ? '14rem' : '4rem', transition: 'margin-left 0.3s' }}
    >
      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          Control plane offline — {error}. Showing cached data.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Active Jobs"
          value={overview?.jobs.active ?? '—'}
          subtitle={`${overview?.jobs.total ?? 0} total`}
          icon={Clock}
          accent="text-emerald-400"
        />
        <KpiCard
          title="Runs Today"
          value={overview?.runs.today ?? '—'}
          subtitle={`${overview?.runs.total ?? 0} all time`}
          icon={CheckCircle2}
          accent="text-sky-400"
        />
        <KpiCard
          title="Errors"
          value={overview?.jobs.errors ?? '—'}
          subtitle={overview?.jobs.paused ? `${overview.jobs.paused} paused` : 'All healthy'}
          icon={overview?.jobs.errors ? AlertTriangle : CheckCircle2}
          accent={overview?.jobs.errors ? 'text-red-400' : 'text-emerald-400'}
        />
        <KpiCard
          title="Model"
          value={overview?.model?.split('/').pop() ?? '—'}
          subtitle={overview?.provider ?? ''}
          icon={Cpu}
          accent="text-orange-400"
        />
      </div>

      {/* Middle row: heatmap + live feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Heatmap */}
        <div className={`lg:col-span-2 ${theme.bgCard} rounded-xl p-4`} style={{ border: '1px solid #1e1e2a' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-medium">90-Day Activity</h3>
            <span className="text-[10px] text-zinc-600">{allRuns.length} total runs</span>
          </div>
          <CalendarHeatmap runs={allRuns} />
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] text-zinc-600">Less</span>
            {['#16161f', '#1a2a1a', '#1a3a1a', '#2a5a1a', '#3a7a1a', '#4a9a2a'].map((c, i) => (
              <div key={i} className="w-[11px] h-[11px] rounded-[2px]" style={{ backgroundColor: c }} />
            ))}
            <span className="text-[10px] text-zinc-600">More</span>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className={`${theme.bgCard} rounded-xl p-4`} style={{ border: '1px solid #1e1e2a' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Recent Activity</h3>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {recentRuns.length === 0 ? (
              <p className="text-xs text-zinc-600">No recent runs</p>
            ) : (
              recentRuns.map((run, i) => {
                const time = new Date(run.runTime);
                const timeStr = time.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={i} className="flex items-start gap-2 py-1.5" style={{ borderBottom: '1px solid #16161f' }}>
                    <ArrowUpRight className="w-3 h-3 text-zinc-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-300 truncate">{run.jobName}</p>
                      <p className="text-[10px] text-zinc-600">{timeStr} · {run.content?.slice(0, 60) || '—'}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Model + Provider info */}
      <div className={`${theme.bgCard} rounded-xl p-4`} style={{ border: '1px solid #1e1e2a' }}>
        <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-3">System</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Active Model</p>
            <p className="text-sm text-zinc-200 mt-1 font-mono">{overview?.model || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Provider</p>
            <p className="text-sm text-zinc-200 mt-1">{overview?.provider || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Server Time</p>
            <p className="text-sm text-zinc-200 mt-1">{overview?.serverTime ? new Date(overview.serverTime).toLocaleString('en-ZA') : '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Dashboard</p>
            <p className="text-sm text-zinc-200 mt-1">Vercel + Tailscale</p>
          </div>
        </div>
      </div>
    </div>
  );
}
