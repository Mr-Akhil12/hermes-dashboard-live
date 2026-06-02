// src/components/Sidebar.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDashboardStore } from '@/lib/store';
import { getStatusColor, theme } from '@/lib/colors';
import {
  LayoutDashboard, Clock, CalendarDays, Kanban,
  Bot, Brain, DollarSign, Activity, Settings,
  ChevronLeft, ChevronRight, Zap, X,
} from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/' },
  { id: 'cron', label: 'Cron Jobs', icon: Clock, path: '/cron' },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays, path: '/schedule' },
  { id: 'tasks', label: 'Tasks', icon: Kanban, path: '/tasks' },
  { id: 'agents', label: 'Agents', icon: Bot, path: '/agents' },
  { id: 'memory', label: 'Memory', icon: Brain, path: '/memory' },
  { id: 'costs', label: 'Costs', icon: DollarSign, path: '/costs' },
  { id: 'activity', label: 'Activity', icon: Activity, path: '/activity' },
  { id: 'config', label: 'Config', icon: Settings, path: '/config' },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    sidebarOpen, setSidebarOpen, connectionStatus,
    isMobile, setIsMobile, mobileMenuOpen, setMobileMenuOpen,
  } = useDashboardStore();
  const connColor = getStatusColor(connectionStatus);

  // responsive detection
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      useDashboardStore.setState({
        isMobile: mobile,
        sidebarOpen: mobile ? false : sidebarOpen,
        mobileMenuOpen: mobile ? false : mobileMenuOpen,
      });
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarOpen, mobileMenuOpen]);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/' || pathname === '';
    return pathname.startsWith(path);
  };

  const handleNav = (path: string) => {
    router.push(path);
    if (isMobile) setMobileMenuOpen(false);
  };

  // Mobile: overlay sidebar
  if (isMobile) {
    return (
      <>
        {/* Mobile overlay menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
            <aside
              className={`w-[260px] h-full ${theme.sidebar} flex flex-col`}
              style={{ borderRight: '1px solid #1e1e2a' }}
            >
              <div className="flex items-center justify-between px-4 h-14 flex-shrink-0" style={{ borderBottom: '1px solid #1e1e2a' }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-black" />
                  </div>
                  <span className="text-sm font-semibold text-zinc-100 tracking-tight">Hermes OS</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = isActive(tab.path);
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleNav(tab.path)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                        active
                          ? `${theme.sidebarActive} ${theme.sidebarActiveText}`
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="px-3 pb-3 pt-2 flex-shrink-0" style={{ borderTop: '1px solid #1e1e2a' }}>
                <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${connColor.bg} ${connColor.text}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${connColor.dot} ${connectionStatus === 'online' ? 'animate-pulse' : ''}`} />
                  <span className="capitalize">{connectionStatus}</span>
                </div>
              </div>
            </aside>
            {/* Backdrop */}
            <div className="flex-1 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}
      </>
    );
  }

  // Desktop: collapsible sidebar
  return (
    <aside
      className={`fixed left-0 top-0 h-full z-50 flex flex-col transition-all duration-300 ${theme.sidebar} ${sidebarOpen ? 'w-56' : 'w-16'}`}
      style={{ borderRight: '1px solid #1e1e2a' }}
    >
      <div className="flex items-center gap-2 px-4 h-14 flex-shrink-0" style={{ borderBottom: '1px solid #1e1e2a' }}>
        <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-black" />
        </div>
        {sidebarOpen && (
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">Hermes OS</span>
        )}
      </div>

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
