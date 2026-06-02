// src/app/cron/page.tsx — CRON JOBS TAB
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useDashboardStore } from '@/lib/store';
import { fetchCronJobs, pauseCron, resumeCron, deleteCron } from '@/lib/api';
import { theme, getStatusColor } from '@/lib/colors';
import { Pause, Play, Trash2, X, AlertTriangle, LayoutGrid, List } from 'lucide-react';
import type { Node, Edge } from 'reactflow';
import { MarkerType } from 'reactflow';

// Dynamic import — React Flow uses browser APIs that break SSR
const ReactFlowPanel = dynamic(() => import('@/components/ReactFlowPanel'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-[#0a0a0f]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-zinc-500">Loading flow...</p>
      </div>
    </div>
  ),
});

interface CronJob {
  id: string;
  name: string;
  schedule_display?: string;
  state?: string;
  enabled?: boolean;
  last_status?: string;
  last_error?: string;
  last_run_at?: string;
  next_run_at?: string;
  deliver?: string;
  script?: string;
  no_agent?: boolean;
}
export default function CronPage() {
  useDashboardStore();
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [flowNodes, setFlowNodes] = useState<Node[]>([]);
  const [flowEdges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'graph' | 'table'>('graph');
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'error'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchCronJobs();
      setJobs(data.jobs || []);
      setError(null);
      const filtered = (data.jobs || []).filter((j: CronJob) => {
        if (filter === 'active') return j.enabled !== false && j.state !== 'paused';
        if (filter === 'paused') return j.enabled === false || j.state === 'paused';
        if (filter === 'error') return j.last_status === 'error';
        return true;
      });
      const nodes: Node[] = filtered.map((job: CronJob, i: number) => {
        const status = job.last_status === 'error' ? 'error' : job.state === 'paused' || job.enabled === false ? 'paused' : 'ok';
        return {
          id: job.id,
          position: { x: (i % 4) * 220, y: Math.floor(i / 4) * 120 },
          data: {
            label: (
              <div className="p-2 text-center">
                <p className="text-[11px] font-medium text-zinc-200 truncate max-w-[180px]">{job.name}</p>
                <p className="text-[9px] text-zinc-500 mt-0.5">{job.schedule_display || '—'}</p>
                <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-1 ${getStatusColor(status).dot}`} />
              </div>
            ),
          },
          sourcePosition: 'right' as const,
          targetPosition: 'left' as const,
          style: { background: '#111118', border: `1px solid ${status === 'error' ? '#ef444420' : status === 'paused' ? '#f59e0b20' : '#10b98120'}`, borderRadius: '12px', width: 200 },
        };
      });
      const bySchedule: Record<string, CronJob[]> = {};
      for (const job of filtered) {
        const key = job.schedule_display || 'other';
        if (!bySchedule[key]) bySchedule[key] = [];
        bySchedule[key].push(job);
      }
      const edges: Edge[] = [];
      let edgeIdx = 0;
      for (const group of Object.values(bySchedule)) {
        for (let i = 0; i < group.length - 1; i++) {
          edges.push({ id: `e${edgeIdx++}`, source: group[i].id, target: group[i + 1].id, style: { stroke: '#2a2a3a', strokeWidth: 1 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#2a2a3a' } });
        }
      }
      setFlowNodes(nodes);
      setEdges(edges);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handlePause = async (id: string) => {
    const job = jobs.find(j => j.id === id);
    if (job && (job.enabled === false || job.state === 'paused')) {
      await resumeCron(id);
    } else {
      await pauseCron(id);
    }
    loadData();
    if (selectedJob?.id === id) setSelectedJob({ ...job!, enabled: !job!.enabled });
  };

  const handleDelete = async (id: string) => {
    await deleteCron(id);
    setConfirmDelete(null);
    setSelectedJob(null);
    loadData();
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${theme.text}`} style={{ marginLeft: 'var(--sidebar-w, 4rem)', transition: 'margin-left 0.3s' }}>
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`flex h-[calc(100vh-3.5rem)] ${theme.bg}`} style={{ marginLeft: 'var(--sidebar-w, 4rem)', transition: 'margin-left 0.3s' }}>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex items-center justify-between px-3 md:px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #1e1e2a' }}>
          <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto min-w-0">
            {(['all', 'active', 'paused', 'error'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-medium transition-colors flex-shrink-0 ${filter === f ? 'bg-orange-500/10 text-orange-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="ml-1 text-[9px] md:text-[10px] text-zinc-600">
                  ({f === 'all' ? jobs.length : jobs.filter(j =>
                    f === 'active' ? j.enabled !== false && j.state !== 'paused' :
                    f === 'paused' ? j.enabled === false || j.state === 'paused' :
                    j.last_status === 'error'
                  ).length})
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 hidden md:flex">
            <button onClick={() => setView('graph')} className={`p-1.5 rounded-lg ${view === 'graph' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setView('table')} className={`p-1.5 rounded-lg ${view === 'table' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'}`}><List className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {error && (<div className="mx-3 md:mx-5 mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400">{error}</div>)}

          {view === 'graph' ? (
            <div className="h-full">
              <ReactFlowPanel
                nodes={flowNodes}
                edges={flowEdges}
                onNodeClick={(_, node) => {
                  const job = jobs.find(j => j.id === node.id);
                  if (job) setSelectedJob(job);
                }}
              />
            </div>
          ) : (
            <div className="p-3 md:p-5">
              <div className={`${theme.bgCard} rounded-xl overflow-x-auto`} style={{ border: '1px solid #1e1e2a' }}>
                <table className="w-full text-xs min-w-[600px]">
                  <thead>
                    <tr className="text-zinc-500 uppercase tracking-wider" style={{ borderBottom: '1px solid #1e1e2a' }}>
                      <th className="text-left px-3 md:px-4 py-3 font-medium">Job</th>
                      <th className="text-left px-3 md:px-4 py-3 font-medium">Schedule</th>
                      <th className="text-left px-3 md:px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-3 md:px-4 py-3 font-medium hidden sm:table-cell">Last Run</th>
                      <th className="text-left px-3 md:px-4 py-3 font-medium hidden md:table-cell">Delivery</th>
                      <th className="text-right px-3 md:px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.filter(j => {
                      if (filter === 'active') return j.enabled !== false && j.state !== 'paused';
                      if (filter === 'paused') return j.enabled === false || j.state === 'paused';
                      if (filter === 'error') return j.last_status === 'error';
                      return true;
                    }).map(job => {
                      const status = job.last_status === 'error' ? 'error' : job.state === 'paused' || job.enabled === false ? 'paused' : 'ok';
                      const sc = getStatusColor(status);
                      const lastRun = job.last_run_at ? new Date(job.last_run_at).toLocaleString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
                      return (
                        <tr key={job.id} className="hover:bg-zinc-800/30 cursor-pointer transition-colors" style={{ borderBottom: '1px solid #16161f' }} onClick={() => setSelectedJob(job)}>
                          <td className="px-3 md:px-4 py-2.5 md:py-3 text-zinc-200 font-medium text-[11px] md:text-xs">{job.name}</td>
                          <td className="px-3 md:px-4 py-2.5 md:py-3 text-zinc-400 text-[10px] md:text-xs">{job.schedule_display || '—'}</td>
                          <td className="px-3 md:px-4 py-2.5 md:py-3">
                            <span className={`inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-medium ${sc.bg} ${sc.text}`}>
                              <div className={`w-1 h-1 rounded-full ${sc.dot}`} />
                              <span className="hidden xs:inline">{status}</span>
                            </span>
                          </td>
                          <td className="px-3 md:px-4 py-2.5 md:py-3 text-zinc-500 text-[10px] md:text-xs hidden sm:table-cell">{lastRun}</td>
                          <td className="px-3 md:px-4 py-2.5 md:py-3 text-zinc-500 text-[10px] md:text-xs truncate max-w-[100px] hidden md:table-cell">{job.deliver || '—'}</td>
                          <td className="px-3 md:px-4 py-2.5 md:py-3 text-right">
                            <button onClick={(e) => { e.stopPropagation(); handlePause(job.id); }} className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300" title={job.enabled === false || job.state === 'paused' ? 'Resume' : 'Pause'}>
                              {(job.enabled === false || job.state === 'paused') ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(job.id); }} className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400 ml-1" title="Delete">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side panel — desktop */}
      {selectedJob && (
        <div className="w-80 bg-[#0d0d14] overflow-y-auto flex-shrink-0 hidden md:flex flex-col" style={{ borderLeft: '1px solid #1e1e2a' }}>
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #1e1e2a' }}>
            <h3 className="text-sm font-semibold text-zinc-200 truncate">{selectedJob.name}</h3>
            <button onClick={() => setSelectedJob(null)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            <div><p className="text-[10px] text-zinc-600 uppercase tracking-wider">Schedule</p><p className="text-sm text-zinc-200 mt-1">{selectedJob.schedule_display || '—'}</p></div>
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Status</p>
              {(() => {
                const s = selectedJob.last_status === 'error' ? 'error' : selectedJob.state === 'paused' || selectedJob.enabled === false ? 'paused' : 'ok';
                const sc = getStatusColor(s);
                return (<span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${sc.bg} ${sc.text}`}><div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{s}</span>);
              })()}
            </div>
            <div><p className="text-[10px] text-zinc-600 uppercase tracking-wider">Delivery</p><p className="text-sm text-zinc-200 mt-1 font-mono">{selectedJob.deliver || '—'}</p></div>
            <div><p className="text-[10px] text-zinc-600 uppercase tracking-wider">Last Run</p><p className="text-sm text-zinc-200 mt-1">{selectedJob.last_run_at ? new Date(selectedJob.last_run_at).toLocaleString('en-ZA') : '—'}</p></div>
            <div><p className="text-[10px] text-zinc-600 uppercase tracking-wider">Next Run</p><p className="text-sm text-zinc-200 mt-1">{selectedJob.next_run_at ? new Date(selectedJob.next_run_at).toLocaleString('en-ZA') : '—'}</p></div>
            {selectedJob.last_error && (<div><p className="text-[10px] text-zinc-600 uppercase tracking-wider">Last Error</p><p className="text-xs text-red-400 mt-1">{selectedJob.last_error}</p></div>)}
            <div><p className="text-[10px] text-zinc-600 uppercase tracking-wider">Type</p><p className="text-sm text-zinc-200 mt-1">{selectedJob.no_agent ? `Script: ${selectedJob.script || '—'}` : 'Agent prompt'}</p></div>
            <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-3">
              <p className="text-[11px] text-orange-400 font-medium mb-1">Editing</p>
              <p className="text-[10px] text-zinc-500">To edit, DM Hermes on Discord:<br /><span className="text-zinc-400 font-mono">{selectedJob.name} — [change]</span></p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handlePause(selectedJob.id)} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${(selectedJob.enabled === false || selectedJob.state === 'paused') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                {(selectedJob.enabled === false || selectedJob.state === 'paused') ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                {(selectedJob.enabled === false || selectedJob.state === 'paused') ? 'Resume' : 'Pause'}
              </button>
              <button onClick={() => setConfirmDelete(selectedJob.id)} className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-400">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom sheet */}
      {selectedJob && (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-[#0d0d14] rounded-t-2xl max-h-[70vh] overflow-y-auto md:hidden" style={{ borderTop: '1px solid #1e1e2a' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1e1e2a' }}>
            <h3 className="text-sm font-semibold text-zinc-200 truncate">{selectedJob.name}</h3>
            <button onClick={() => setSelectedJob(null)} className="p-1 text-zinc-500"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider">Schedule</p><p className="text-xs text-zinc-200 mt-0.5">{selectedJob.schedule_display || '—'}</p></div>
              <div>
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Status</p>
                {(() => { const s = selectedJob.last_status === 'error' ? 'error' : selectedJob.state === 'paused' || selectedJob.enabled === false ? 'paused' : 'ok'; const sc = getStatusColor(s); return (<span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium mt-0.5 ${sc.bg} ${sc.text}`}><div className={`w-1 h-1 rounded-full ${sc.dot}`} />{s}</span>); })()}
              </div>
              <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider">Last Run</p><p className="text-xs text-zinc-200 mt-0.5">{selectedJob.last_run_at ? new Date(selectedJob.last_run_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</p></div>
              <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider">Delivery</p><p className="text-xs text-zinc-200 mt-0.5 font-mono truncate">{selectedJob.deliver || '—'}</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handlePause(selectedJob.id)} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium ${(selectedJob.enabled === false || selectedJob.state === 'paused') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                {(selectedJob.enabled === false || selectedJob.state === 'paused') ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                {(selectedJob.enabled === false || selectedJob.state === 'paused') ? 'Resume' : 'Pause'}
              </button>
              <button onClick={() => setConfirmDelete(selectedJob.id)} className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div className={`${theme.bgCard} rounded-xl p-5 w-80`} style={{ border: '1px solid #2a2a3a' }}>
            <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-red-400" /><h3 className="text-sm font-semibold text-zinc-200">Delete Cron Job</h3></div>
            <p className="text-xs text-zinc-400 mb-4">Are you sure you want to delete <strong className="text-zinc-200">{jobs.find(j => j.id === confirmDelete)?.name}</strong>? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
