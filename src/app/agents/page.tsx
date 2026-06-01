// src/app/agents/page.tsx — AGENTS TAB
'use client';

import { useDashboardStore } from '@/lib/store';
import { theme, getStatusColor } from '@/lib/colors';
import { Bot, MessageSquare, Cpu, Hash } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  role: string;
  channel: string;
  model: string;
  status: 'online' | 'idle' | 'offline';
  tasksToday: number;
}

const AGENTS: Agent[] = [
  { id: 'orchestrator', name: 'Hermes', role: 'Orchestrator', channel: '#agentic-sa', model: 'ollama-cloud/minimax-m3', status: 'online', tasksToday: 0 },
];

const SETUP_SUGGESTIONS = [
  { name: 'Researcher', role: 'Research & Intelligence', icon: '🔍' },
  { name: 'Scribe', role: 'Content Writer', icon: '✍️' },
  { name: 'Dev', role: 'Developer', icon: '💻' },
  { name: 'Marketer', role: 'Marketing & SEO', icon: '📣' },
];

export default function AgentsPage() {
  const { sidebarOpen, isMobile } = useDashboardStore();
  const sidebarW = sidebarOpen ? '14rem' : '4rem';

  return (
    <div className={`p-5 overflow-y-auto h-[calc(100vh-3.5rem)] ${theme.bg}`} style={{ marginLeft: isMobile ? 0 : (sidebarW), transition: 'margin-left 0.3s' }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-zinc-100">Agents</h2>
        <span className="text-xs text-zinc-600">{AGENTS.length} active</span>
      </div>

      {/* Current agents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {AGENTS.map(agent => {
          const sc = getStatusColor(agent.status);
          return (
            <div key={agent.id} className={`${theme.bgCard} rounded-xl p-4`} style={{ border: '1px solid #1e1e2a' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{agent.name}</p>
                    <p className="text-[10px] text-zinc-500">{agent.role}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.bg} ${sc.text}`}>
                  <div className={`w-1 h-1 rounded-full ${sc.dot}`} />
                  {agent.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Channel</p>
                  <p className="text-xs text-zinc-300 mt-0.5 flex items-center gap-1">
                    <Hash className="w-3 h-3 text-zinc-600" />
                    {agent.channel}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Model</p>
                  <p className="text-xs text-zinc-300 mt-0.5 truncate">{agent.model.split('/').pop()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Tasks Today</p>
                  <p className="text-xs text-zinc-300 mt-0.5">{agent.tasksToday}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Multi-agent setup prompt */}
      <div className={`${theme.bgCard} rounded-xl p-4`} style={{ border: '1px dashed #2a2a3a' }}>
        <h3 className="text-xs font-semibold text-zinc-300 mb-1">Multi-Agent Setup</h3>
        <p className="text-[11px] text-zinc-500 mb-4">
          Add specialized agents for research, content, development, and marketing. Each gets their own Discord channel.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {SETUP_SUGGESTIONS.map(s => (
            <div key={s.name} className="bg-[#0d0d14] rounded-lg p-3 text-center" style={{ border: '1px solid #1a1a2a' }}>
              <p className="text-lg mb-1">{s.icon}</p>
              <p className="text-[11px] font-medium text-zinc-300">{s.name}</p>
              <p className="text-[9px] text-zinc-600">{s.role}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-zinc-600 mt-3 text-center">
          DM Hermes on Discord to set up: &quot;Add a [researcher/scribe/dev/marketer] agent&quot;
        </p>
      </div>
    </div>
  );
}
