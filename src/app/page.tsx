// src/app/page.tsx — OVERVIEW tab (default landing)
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDashboardStore } from '@/lib/store';
import { fetchOverview, fetchCronJobs, fetchHealth } from '@/lib/api';
import { theme } from '@/lib/colors';
import KpiCard from '@/components/KpiCard';
import CalendarHeatmap from '@/components/CalendarHeatmap';
import { Clock, CheckCircle2, AlertTriangle, Cpu, ArrowUpRight, Wifi, WifiOff } from 'lucide-react';

interface OverviewData {
  jobs: { total: number; active: number; paused: number; errors: number };
  runs: { today: number; total: number };
  model: string;
  provider: string;
  serverTime: string;
}

export default function OverviewPage() {
  const { setConnectionStatus, setLastSync, sidebarOpen, isMobile, connectionStatus } = useDashboardStore();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [recentRuns, setRecentRuns] = useState<Array<{ jobName: string; runTime: string; content: string }>>([]);
  const [allRuns, setAllRuns] = useState<Array<{ runTime: string }>>([]);
  const [loading, setLoading] = useState(true);

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
      useDashboardStore.setState({
        connectionStatus: health.status === 'ok' ? 'online' : 'offline',
        lastSync: new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
      });
    } catch { /* fallback data handles this */ }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // responsive margin
  const marginLeft = isMobile ? 0 : (sidebarOpen ? '14rem' : '4rem');

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-[calc(100vh-3.5rem)] ${theme.text}`} style={{ marginLeft, transition: 'margin-left 0.3s' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-5 space-y-4 md:space-y-5 overflow-y-auto h-[calc(100vh-3.5rem)]" style={{ marginLeft, transition: 'margin-left 0.3s' }}>
      {/* Connection banner */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${
        connectionStatus === 'online'
          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
      }`}>
        {connectionStatus === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        <span>{connectionStatus === 'online' ? 'Control plane connected' : 'Showing demo data — control plane offline'}</span>
      </div>

      {/* KPI Cards — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        <KpiCard title="Active Jobs" value={overview?.jobs.active ?? 0} subtitle={`${overview?.jobs.total ?? 0} total`} icon={Clock} accent="text-emerald-400" />
        <KpiCard title="Runs Today" value={overview?.runs.today ?? 0} subtitle={`${overview?.runs.total ?? 0} all time`} icon={CheckCircle2} accent="text-sky-400" />
        <KpiCard title="Errors" value={overview?.jobs.errors ?? 0} subtitle={overview?.jobs.paused ? `${overview.jobs.paused} paused` : 'All healthy'} icon={(overview?.jobs.errors ?? 0) > 0 ? AlertTriangle : CheckCircle2} accent={(overview?.jobs.errors ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'} />
        <KpiCard title="Model" value={(overview?.model || '—').split('/').pop() ?? '—'} subtitle={overview?.provider || '—'} icon={Cpu} accent="text-orange-400" />
      </div>

      {/* Middle row — stack on mobile, side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        <div className={`lg:col-span-2 ${theme.bgCard} rounded-xl p-3 md:p-4`} style={{ border: '1px solid #1e1e2a' }}>
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h3 className="text-[10px] md:text-xs uppercase tracking-wider text-zinc-500 font-medium">90-Day Activity</h3>
            <span className="text-[9px] md:text-[10px] text-zinc-600">{allRuns.length} total runs</span>
          </div>
          <div className="overflow-x-auto">
            <CalendarHeatmap runs={allRuns} />
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 mt-3">
            <span className="text-[9px] md:text-[10px] text-zinc-600">Less</span>
            {['#16161f', '#1a2a1a', '#1a3a1a', '#2a5a1a', '#3a7a1a', '#4a9a2a'].map((c, i) => (
              <div key={i} className="w-[9px] h-[9px] md:w-[11px] md:h-[11px] rounded-[2px] flex-shrink-0" style={{ backgroundColor: c }} />
            ))}
            <span className="text-[9px] md:text-[10px] text-zinc-600">More</span>
          </div>
        </div>

        <div className={`${theme.bgCard} rounded-xl p-3 md:p-4`} style={{ border: '1px solid #1e1e2a' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] md:text-xs uppercase tracking-wider text-zinc-500 font-medium">Recent</h3>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="space-y-1.5 md:space-y-2 max-h-[200px] md:max-h-[280px] overflow-y-auto">
            {recentRuns.length === 0 ? (
              <p className="text-xs text-zinc-600">No recent runs</p>
            ) : (
              recentRuns.slice(0, 10).map((run, i) => {
                const time = new Date(run.runTime);
                const timeStr = time.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={i} className="flex items-start gap-2 py-1.5" style={{ borderBottom: '1px solid #16161f' }}>
                    <ArrowUpRight className="w-3 h-3 text-zinc-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] md:text-xs text-zinc-300 truncate">{run.jobName}</p>
                      <p className="text-[9px] md:text-[10px] text-zinc-600 truncate">{timeStr} · {(run.content || '—').slice(0, 50)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* System info */}
      <div className={`${theme.bgCard} rounded-xl p-3 md:p-4`} style={{ border: '1px solid #1e1e2a' }}>
        <h3 className="text-[10px] md:text-xs uppercase tracking-wider text-zinc-500 font-medium mb-3">System</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div>
            <p className="text-[9px] md:text-[10px] text-zinc-600 uppercase tracking-wider">Model</p>
            <p className="text-xs md:text-sm text-zinc-200 mt-1 font-mono truncate">{overview?.model || '—'}</p>
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] text-zinc-600 uppercase tracking-wider">Provider</p>
            <p className="text-xs md:text-sm text-zinc-200 mt-1 truncate">{overview?.provider || '—'}</p>
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] text-zinc-600 uppercase tracking-wider">Server</p>
            <p className="text-xs md:text-sm text-zinc-200 mt-1 truncate">{overview?.serverTime ? new Date(overview.serverTime).toLocaleString('en-ZA') : '—'}</p>
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] text-zinc-600 uppercase tracking-wider">Source</p>
            <p className="text-xs md:text-sm text-zinc-200 mt-1 truncate">Vercel + Tailscale</p>
          </div>
        </div>
      </div>
    </div>
  );
}
