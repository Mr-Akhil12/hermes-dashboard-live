// src/app/activity/page.tsx — LIVE ACTIVITY TAB (Real Session Data)
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDashboardStore } from '@/lib/store';
import { fetchSessions, fetchSession, searchSessions, fetchHealth } from '@/lib/api';
import { theme } from '@/lib/colors';
import { Search, MessageSquare, Clock, Cpu, ChevronRight } from 'lucide-react';

interface Session {
  id: string; source: string; model: string; messageCount: number;
  title: string; startedAt: number; inputTokens: number; outputTokens: number;
}

export default function ActivityPage() {
  const { setConnectionStatus, setLastSync } = useDashboardStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ sessions: Session[]; messages: any[] } | null>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [data, health] = await Promise.all([fetchSessions(50, sourceFilter), fetchHealth()]);
      setSessions(data?.sessions || []);
      setConnectionStatus(health?.status === 'ok' ? 'online' : 'offline');
      setLastSync(new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }));
    } catch { setConnectionStatus('offline'); }
    finally { setLoading(false); }
  }, [sourceFilter, setConnectionStatus, setLastSync]);

  useEffect(() => { loadData(); const i = setInterval(loadData, 30000); return () => clearInterval(i); }, [loadData]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    const results = await searchSessions(searchQuery);
    setSearchResults(results);
  };

  const handleSelectSession = async (session: Session) => {
    const detail = await fetchSession(session.id);
    setSelectedSession(detail);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ paddingTop: '4.5rem' }}>
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Session detail view
  if (selectedSession) {
    return (
      <div className="overflow-y-auto h-screen" style={{ paddingTop: '4.5rem', paddingBottom: '2rem' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #1e1e2a' }}>
          <button onClick={() => setSelectedSession(null)} className="text-xs text-orange-400 hover:text-orange-300 mb-2 flex items-center gap-1">
            ← Back to sessions
          </button>
          <h2 className="text-sm font-semibold text-zinc-100">{selectedSession.session?.title || 'Untitled Session'}</h2>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />{selectedSession.session?.model}</span>
            <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{selectedSession.session?.messageCount} msgs</span>
            <span>{selectedSession.session?.source}</span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {selectedSession.messages?.map((msg: any, i: number) => (
            <div key={i} className={`${msg.role === 'user' ? 'bg-[#111118]' : msg.role === 'assistant' ? 'bg-[#0d0d14]' : 'bg-[#16161f]'} rounded-xl p-3`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[10px] font-semibold uppercase ${msg.role === 'user' ? 'text-orange-400' : msg.role === 'assistant' ? 'text-emerald-400' : 'text-zinc-500'}`}>{msg.role}</span>
              </div>
              <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const displaySessions = searchResults?.sessions || sessions;
  const displayMessages = searchResults?.messages || [];

  return (
    <div className="p-4 md:p-6 overflow-y-auto h-screen" style={{ paddingTop: '4.5rem', paddingBottom: '2rem' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Search sessions and messages..." className="w-full bg-[#111118] border border-[#1e1e2a] rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/50" />
        </div>
        <button onClick={handleSearch} className="px-3 py-2 rounded-lg text-xs font-medium bg-orange-500/10 text-orange-400 hover:bg-orange-500/20">Search</button>
      </div>

      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto">
        {['', 'discord', 'cron', 'web', 'api'].map(s => (
          <button key={s} onClick={() => { setSourceFilter(s); setSearchResults(null); }} className="px-2.5 py-1 rounded-full text-[10px] font-medium flex-shrink-0 text-zinc-500 hover:text-zinc-300">
            {s || 'All'}
          </button>
        ))}
        <span className="text-[10px] text-zinc-600 ml-2">{sessions.length} sessions</span>
      </div>

      {searchResults && (
        <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg px-3 py-2 mb-3 text-xs text-orange-400">
          Results for "{searchQuery}" — {searchResults.sessions.length} sessions, {searchResults.messages.length} messages
          <button onClick={() => { setSearchResults(null); setSearchQuery(''); }} className="ml-2 text-zinc-500 hover:text-zinc-300">Clear</button>
        </div>
      )}

      {displayMessages.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Message Results</h3>
          <div className="space-y-2">
            {displayMessages.map((msg, i) => (
              <button key={i} onClick={() => handleSelectSession(msg)} className="w-full text-left bg-[#111118] rounded-xl p-3 hover:bg-zinc-800/50 transition-colors" style={{ border: '1px solid #1e1e2a' }}>
                <p className="text-xs text-zinc-300 line-clamp-2">{msg.content}</p>
                <p className="text-[9px] text-zinc-600 mt-1">{msg.sessionTitle} · {msg.role}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {displaySessions.map(session => (
          <button key={session.id} onClick={() => handleSelectSession(session)} className="w-full text-left bg-[#111118] rounded-xl p-3 hover:bg-zinc-800/50 transition-colors" style={{ border: '1px solid #1e1e2a' }}>
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-200 font-medium truncate">{session.title || session.id.slice(0, 20)}</p>
                <div className="flex items-center gap-2 mt-1 text-[9px] text-zinc-500">
                  <span className={`px-1.5 py-0.5 rounded ${session.source === 'cron' ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'}`}>{session.source}</span>
                  <span className="flex items-center gap-0.5"><MessageSquare className="w-2.5 h-2.5" />{session.messageCount}</span>
                  <span>{session.model?.split('/').pop()}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className="text-[9px] text-zinc-500">{new Date(session.startedAt * 1000).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </button>
        ))}
        {displaySessions.length === 0 && <p className="text-xs text-zinc-600 text-center py-8">No sessions found</p>}
      </div>
    </div>
  );
}
