// src/app/memory/page.tsx — MEMORY TAB (Real Holographic Memory)
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDashboardStore } from '@/lib/store';
import { fetchMemory, searchMemory, fetchEntities, fetchHealth } from '@/lib/api';
import { theme } from '@/lib/colors';
import { Brain, Search, Tag } from 'lucide-react';

export default function MemoryPage() {
  const { setConnectionStatus, setLastSync } = useDashboardStore();
  const [facts, setFacts] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filteredFacts, setFilteredFacts] = useState<any[] | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [mem, ents, health] = await Promise.all([fetchMemory(), fetchEntities(), fetchHealth()]);
      setFacts(mem?.facts || []);
      setEntities(ents?.entities || []);
      setConnectionStatus(health?.status === 'ok' ? 'online' : 'offline');
      setLastSync(new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }));
    } catch { setConnectionStatus('offline'); }
    finally { setLoading(false); }
  }, [setConnectionStatus, setLastSync]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSearch = async () => {
    if (!search.trim()) { setFilteredFacts(null); return; }
    const results = await searchMemory(search);
    setFilteredFacts(results?.facts || []);
  };

  const displayFacts = filteredFacts || facts;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ paddingTop: '4.5rem' }}>
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 overflow-y-auto h-screen" style={{ paddingTop: '4.5rem', paddingBottom: '2rem' }}>
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Search facts and tags..." className="w-full bg-[#111118] border border-[#1e1e2a] rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/50" />
        </div>
        <button onClick={handleSearch} className="px-3 py-2 rounded-lg text-xs font-medium bg-orange-500/10 text-orange-400 hover:bg-orange-500/20">Search</button>
      </div>

      <div className="space-y-2">
        {displayFacts.map(fact => (
          <div key={fact.id} className="bg-[#111118] rounded-xl p-3" style={{ border: '1px solid #1e1e2a' }}>
            <p className="text-xs text-zinc-200">{fact.content}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0d0d14] text-zinc-400">{fact.category}</span>
              {fact.entities?.map((e: any, i: number) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400">{e.name}</span>
              ))}
              {fact.tags && fact.tags.split(',').filter(Boolean).map((tag: string, i: number) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 flex items-center gap-0.5"><Tag className="w-2 h-2" />{tag.trim()}</span>
              ))}
              <span className="text-[9px] text-zinc-600 ml-auto">{(fact.trustScore * 100).toFixed(0)}% trust</span>
            </div>
          </div>
        ))}
        {displayFacts.length === 0 && <p className="text-xs text-zinc-600 text-center py-8">No facts stored</p>}
      </div>
    </div>
  );
}
