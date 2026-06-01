// src/lib/store.ts
import { create } from 'zustand';

interface DashboardState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  connectionStatus: 'online' | 'offline' | 'checking';
  setConnectionStatus: (s: 'online' | 'offline' | 'checking') => void;
  lastSync: string | null;
  setLastSync: (s: string) => void;
  isMobile: boolean;
  setIsMobile: (m: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (o: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeTab: 'overview',
  setActiveTab: (tab) => set({ activeTab: tab }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  connectionStatus: 'checking',
  setConnectionStatus: (s) => set({ connectionStatus: s }),
  lastSync: null,
  setLastSync: (s) => set({ lastSync: s }),
  isMobile: false,
  setIsMobile: (m) => set({ isMobile: m }),
  mobileMenuOpen: false,
  setMobileMenuOpen: (o) => set({ mobileMenuOpen: o }),
}));
