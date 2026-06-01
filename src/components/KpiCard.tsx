// src/components/KpiCard.tsx
'use client';

import { theme } from '@/lib/colors';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  accent?: string;
}

export default function KpiCard({ title, value, subtitle, icon: Icon, accent = 'text-orange-400' }: KpiCardProps) {
  return (
    <div className={`${theme.bgCard} rounded-xl p-3 md:p-4`} style={{ border: '1px solid #1e1e2a' }}>
      <div className="flex items-start justify-between mb-2 md:mb-3">
        <span className="text-[9px] md:text-[11px] uppercase tracking-wider text-zinc-500 font-medium truncate mr-1">{title}</span>
        <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 ${accent}`}>
          <Icon className="w-3 h-3 md:w-4 md:h-4" />
        </div>
      </div>
      <p className="text-lg md:text-2xl font-bold text-zinc-100">{value}</p>
      {subtitle && <p className="text-[10px] md:text-xs text-zinc-500 mt-0.5 md:mt-1 truncate">{subtitle}</p>}
    </div>
  );
}
