// src/app/memory/page.tsx — MEMORY TAB (Real Holographic Memory)
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDashboardStore } from '@/lib/store';
import { fetchMemory, searchMemory, fetchEntities, fetchHealth } from '@/lib/api';
import { theme } from '@/lib/colors';
import { Brain, Search, Tag } from 'lucide-react';

interface Fact {
  id: number;
  content: string;
  category: string;
  tags: string;
  trustScore: number;
  updatedAt: string;
  entities: { name: string; type: string }[];
}

export default function MemoryPage() {
  const { sidebarOpen, setConnectionStatus, setLastSync } = useDashboardStore();
  const [facts, setFacts] = useState<Fact[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filteredFacts, setFilteredFacts] = useState<Fact[] | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [mem, ents, health] = await Promise.all([
        fetchMemory(),
        fetchEntities(),
        fetchHealth(),
      ]);
      setFacts(mem.facts || []);
      setEntities(ents.entities || []);
      setConnectionStatus(health.status === 'ok' ? 'online' : 'offline');
      setLastSync(new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }));
    } catch { setConnectionStatus('offline'); }
    finally { setLoading(false); }
  }, [setConnectionStatus, setLastSync]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSearch = async () => {
    if (!search.trim()) { setFilteredFacts(null); return; }
    const results = await searchMemory(search);
    setFilteredFacts(results.facts || []);
  };

  const marginLeft = 'var(--sidebar-w, 4rem)';
  const displayFacts = filteredFacts || facts;

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${theme.text}`} style={{ marginLeft, transition: 'margin-left 0.3s' }}>
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`p-3 md:p-5 overflow-y-auto h-[calc(100vh-3.5rem)] pt-24 md:pt-14 pt-24 md:pt-14 ${theme.bg}`} style={{ marginLeft, transition: 'margin-left 0.3s' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Memory</h2>
        </div>
        <span className="text-xs text-zinc-600">{facts.length} facts · {entities.length} entities</span>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Search facts and tags..." className={`w-full ${theme.bgCard} border rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/50`} style={{ borderColor: '#1e1e2a' }} />
        </div>
        <button onClick={handleSearch} className="px-3 py-2 rounded-lg text-xs font-medium bg-orange-500/10 text-orange-400 hover:bg-orange-500/20">Search</button>
      </div>

      <div className="space-y-2">
        {displayFacts.map(fact => (
          <div key={fact.id} className={`${theme.bgCard} rounded-xl p-3`} style={{ border: '1px solid #1e1e2a' }}>
            <p className="text-xs text-zinc-200">{fact.content}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${theme.bg} ${theme.textMuted}`}>{fact.category}</span>
              {fact.entities.map((e, i) => (
                <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400`}>{e.name}</span>
              ))}
              {fact.tags && fact.tags.split(',').filter(Boolean).map((tag, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 flex items-center gap-0.5"><Tag className="w-2 h-2" />{tag.trim()}</span>
              ))}
              <span className="text-[9px] text-zinc-600 ml-auto">{(fact.trustScore * 100).toFixed(0)}% trust</span>
            </div>
          </div>
        ))}
        {displayFacts.length === 0 && (
          <p className="text-xs text-zinc-600 text-center py-8">{filteredFacts ? 'No results' : 'No facts stored'}</p>
        )}
      </div>
    </div>
  );
}
