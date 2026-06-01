// src/components/TopBar.tsx
'use client';

import { useDashboardStore } from '@/lib/store';
import { getStatusColor, theme } from '@/lib/colors';
import { Wifi, WifiOff, Menu } from 'lucide-react';

export default function TopBar() {
  const { connectionStatus, lastSync, sidebarOpen, isMobile, setMobileMenuOpen } = useDashboardStore();
  const connColor = getStatusColor(connectionStatus);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <header
      className={`fixed top-0 right-0 h-14 z-40 flex items-center justify-between px-3 md:px-5 ${theme.bg}`}
      style={{
        left: isMobile ? 0 : (sidebarOpen ? '14rem' : '4rem'),
        borderBottom: '1px solid #1e1e2a',
        transition: 'left 0.3s',
      }}
    >
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {/* Mobile hamburger */}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-zinc-100 truncate">Hermes OS</h1>
          {lastSync && !isMobile && (
            <p className="text-[10px] text-zinc-600 mt-0.5">Synced {lastSync}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        {/* Time — hide date on very small screens */}
        {!isMobile && (
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-zinc-300">{timeStr}</p>
            <p className="text-[10px] text-zinc-600">{dateStr}</p>
          </div>
        )}
        {/* Show time only on mobile */}
        {isMobile && (
          <p className="text-xs font-medium text-zinc-300">{timeStr}</p>
        )}

        {/* Connection */}
        <div className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-1 rounded-full text-[10px] md:text-[11px] font-medium ${connColor.bg} ${connColor.text}`}>
          {connectionStatus === 'online' ? (
            <Wifi className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          <span className="hidden xs:inline capitalize">{connectionStatus}</span>
        </div>
      </div>
    </header>
  );
}
