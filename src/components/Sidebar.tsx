// src/components/Sidebar.tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useDashboardStore } from '@/lib/store';
import { getStatusColor, theme } from '@/lib/colors';
import {
  LayoutDashboard, Clock, CalendarDays, Kanban,
  Bot, Brain, DollarSign, Activity, Settings,
  ChevronLeft, ChevronRight, Zap,
} from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/' },
  { id: 'cron', label: 'Cron Jobs', icon: Clock, path: '/cron' },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays, path: '/schedule' },
  { id: 'tasks', label: 'Tasks', icon: Kanban, path: '/tasks' },
  { id: 'agents', label: 'Agents', icon: Bot, path: '/agents' },
  { id: 'memory', label: 'Memory', icon: Brain, path: '/memory' },
  { id: 'costs', label: 'Costs', icon: DollarSign, path: '/costs' },
  { id: 'activity', label: 'Live Activity', icon: Activity, path: '/activity' },
  { id: 'config', label: 'Config', icon: Settings, path: '/config' },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, connectionStatus } = useDashboardStore();
  const connColor = getStatusColor(connectionStatus);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/' || pathname === '';
    return pathname.startsWith(path);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-50 flex flex-col transition-all duration-300 ${theme.sidebar} ${sidebarOpen ? 'w-56' : 'w-16'}`}
      style={{ borderRight: '1px solid #1e1e2a' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 flex-shrink-0" style={{ borderBottom: '1px solid #1e1e2a' }}>
        <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-black" />
        </div>
        {sidebarOpen && (
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">Hermes OS</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.path)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                active
                  ? `${theme.sidebarActive} ${theme.sidebarActiveText}`
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
              title={!sidebarOpen ? tab.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span>{tab.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Connection status + collapse */}
      <div className="px-3 pb-3 space-y-2 flex-shrink-0" style={{ borderTop: '1px solid #1e1e2a' }}>
        <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${connColor.bg} ${connColor.text}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${connColor.dot} ${connectionStatus === 'online' ? 'animate-pulse' : ''}`} />
          {sidebarOpen && <span className="capitalize">{connectionStatus}</span>}
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center justify-center py-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
