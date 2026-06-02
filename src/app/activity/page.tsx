// src/app/activity/page.tsx — LIVE ACTIVITY TAB (SSE stream)
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useDashboardStore } from '@/lib/store';
import { theme, getStatusColor } from '@/lib/colors';
import { Activity, Pause, Play, Filter } from 'lucide-react';

interface LogEntry {
  type: string;
  jobName?: string;
  runTime?: string;
  content?: string;
  time?: string;
}

export default function ActivityPage() {
  useDashboardStore(); // keep store subscription
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<'all' | 'run' | 'error' | 'heartbeat'>('all');
  const eventSourceRef = useRef<EventSource | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const controlUrl = process.env.NEXT_PUBLIC_CONTROL_URL || '';
  const secret = process.env.NEXT_PUBLIC_DASHBOARD_SECRET || '';

  const connect = useCallback(() => {
    if (eventSourceRef.current) eventSourceRef.current.close();

    // SSE doesn't support custom headers, so we use query param for auth
    const url = `${controlUrl}/api/logs?secret=${encodeURIComponent(secret)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => { setConnected(false); es.close(); };
    es.onmessage = (e) => {
      if (paused) return;
      try {
        const data = JSON.parse(e.data);
        setLogs(prev => [data, ...prev].slice(0, 200)); // keep last 200
      } catch { /* skip */ }
    };
  }, [controlUrl, secret, paused]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => {
    connect(); // eslint-disable-next-line react-hooks/set-state-in-effect
    return () => { eventSourceRef.current?.close(); };
  }, [connect]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [logs]);

  const filtered = logs.filter(l => {
    if (filter === 'all') return true;
    return l.type === filter;
  });


  return (
    <div className={`flex flex-col h-[calc(100vh-3.5rem)] ${theme.bg}`} style={{ marginLeft: 'var(--sidebar-w, 4rem)', transition: 'margin-left 0.3s' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #1e1e2a' }}>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-xs text-zinc-400">{connected ? 'Live' : 'Disconnected'}</span>
          <span className="text-[10px] text-zinc-600">{logs.length} events</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {(['all', 'run', 'error'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  filter === f ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPaused(!paused)}
            className={`p-1.5 rounded-lg ${paused ? 'bg-amber-500/10 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
          <button
            onClick={() => { setLogs([]); }}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 text-[10px]"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Log stream */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1 font-mono">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <Activity className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">Waiting for events...</p>
          </div>
        ) : (
          filtered.map((log, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 py-1.5 px-2 rounded hover:bg-zinc-800/30 ${
                log.type === 'error' ? 'bg-red-500/5' : ''
              }`}
              style={{ borderBottom: '1px solid #0d0d14' }}
            >
              <span className="text-[10px] text-zinc-700 flex-shrink-0 w-16">
                {log.runTime ? new Date(log.runTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) :
                 log.time ? new Date(log.time).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
              </span>
              <span className={`text-[10px] flex-shrink-0 w-12 uppercase font-medium ${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'run' ? 'text-emerald-400' :
                log.type === 'heartbeat' ? 'text-zinc-700' : 'text-zinc-500'
              }`}>
                {log.type}
              </span>
              <span className="text-[11px] text-zinc-300 flex-1 truncate">
                {log.jobName && <span className="text-zinc-400">{log.jobName}: </span>}
                {log.content || log.time || '—'}
              </span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
