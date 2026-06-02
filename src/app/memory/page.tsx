// src/app/memory/page.tsx — MEMORY TAB
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDashboardStore } from '@/lib/store';
import { fetchMemory, fetchCronJobs } from '@/lib/api';
import { theme } from '@/lib/colors';
import { Brain, Search, Plus } from 'lucide-react';

interface MemoryFact {
  id: string;
  content: string;
  entity?: string;
  trust?: string;
}

export default function MemoryPage() {
  useDashboardStore(); // keep store subscription
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newFact, setNewFact] = useState('');

  const loadData = useCallback(async () => {
    try {
      const data = await fetchMemory();
      setFacts(data.facts || []);
    } catch (e) { /* skip */ }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { loadData(); // eslint-disable-next-line react-hooks/set-state-in-effect
}, [loadData]);

  const filtered = facts.filter(f =>
    !search || f.content?.toLowerCase().includes(search.toLowerCase()) ||
    f.entity?.toLowerCase().includes(search.toLowerCase())
  );


  return (
    <div className={`p-5 overflow-y-auto h-[calc(100vh-3.5rem)] ${theme.bg}`} style={{ marginLeft: 'var(--sidebar-w, 4rem)', transition: 'margin-left 0.3s' }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Memory</h2>
        </div>
        <span className="text-xs text-zinc-600">{facts.length} facts</span>
      </div>

      {/* Search + Add */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facts..."
            className={`w-full ${theme.bgCard} border rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/50`}
            style={{ borderColor: '#1e1e2a' }}
          />
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {/* Add fact */}
      {showAdd && (
        <div className={`${theme.bgCard} rounded-xl p-4 mb-4`} style={{ border: '1px solid #1e1e2a' }}>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">New Fact</p>
          <textarea
            value={newFact}
            onChange={(e) => setNewFact(e.target.value)}
            placeholder="Store a fact about the user, project, or workflow..."
            className={`w-full ${theme.bg} border rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 resize-none`}
            style={{ borderColor: '#1e1e2a' }}
            rows={3}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { setShowAdd(false); setNewFact(''); }}
              className="px-3 py-1.5 rounded text-[10px] font-medium bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
            >
              Save (Discord)
            </button>
            <button onClick={() => { setShowAdd(false); setNewFact(''); }} className="px-3 py-1.5 rounded text-[10px] font-medium text-zinc-500 hover:text-zinc-300">
              Cancel
            </button>
          </div>
          <p className="text-[9px] text-zinc-700 mt-2">DM Hermes &quot;remember: [fact]&quot; to store permanently.</p>
        </div>
      )}

      {/* Facts list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-zinc-600 text-center py-12">No facts stored yet</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(fact => (
            <div key={fact.id} className={`${theme.bgCard} rounded-xl p-3`} style={{ border: '1px solid #1e1e2a' }}>
              <p className="text-xs text-zinc-200">{fact.content || '—'}</p>
              <div className="flex items-center gap-3 mt-2">
                {fact.entity && (
                  <span className="text-[9px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">{fact.entity}</span>
                )}
                {fact.trust && (
                  <span className="text-[9px] text-zinc-700">trust: {fact.trust}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
