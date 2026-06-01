// src/components/TopBar.tsx
'use client';

import { useDashboardStore } from '@/lib/store';
import { theme, getStatusColor } from '@/lib/colors';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function TopBar() {
  const { activeTab, connectionStatus, lastSync, sidebarOpen } = useDashboardStore();
  const connColor = getStatusColor(connectionStatus);

  const tabLabels: Record<string, string> = {
    overview: 'Overview',
    cron: 'Cron Jobs',
    schedule: 'Schedule',
    tasks: 'Tasks',
    agents: 'Agents',
    memory: 'Memory',
    costs: 'Costs',
    activity: 'Live Activity',
    config: 'Config',
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <header
      className={`fixed top-0 right-0 h-14 z-40 flex items-center justify-between px-5 ${theme.bg}`}
      style={{
        left: sidebarOpen ? '14rem' : '4rem',
        borderBottom: '1px solid #1e1e2a',
        transition: 'left 0.3s',
      }}
    >
      <div>
        <h1 className="text-sm font-semibold text-zinc-100">{tabLabels[activeTab] || activeTab}</h1>
        {lastSync && (
          <p className="text-[10px] text-zinc-600 mt-0.5">Synced {lastSync}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Time */}
        <div className="text-right">
          <p className="text-xs font-medium text-zinc-300">{timeStr}</p>
          <p className="text-[10px] text-zinc-600">{dateStr}</p>
        </div>

        {/* Connection */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${connColor.bg} ${connColor.text}`}>
          {connectionStatus === 'online' ? (
            <Wifi className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          <span className="capitalize">{connectionStatus}</span>
        </div>
      </div>
    </header>
  );
}
