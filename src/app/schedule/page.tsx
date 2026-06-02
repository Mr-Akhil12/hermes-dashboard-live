// src/app/schedule/page.tsx — SCHEDULE TAB (calendar view)
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDashboardStore } from '@/lib/store';
import { fetchCronJobs } from '@/lib/api';
import { theme, getStatusColor } from '@/lib/colors';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CronJob {
  id: string;
  name: string;
  schedule_display?: string;
  state?: string;
  enabled?: boolean;
  last_status?: string;
  next_run_at?: string;
}

export default function SchedulePage() {
  useDashboardStore(); // keep store subscription
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchCronJobs();
      setJobs(data.jobs || []);
    } catch (e) { /* skip */ }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { loadData(); // eslint-disable-next-line react-hooks/set-state-in-effect
}, [loadData]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentMonth.toLocaleString('en-ZA', { month: 'long', year: 'numeric' });

  // Build schedule map: date -> jobs running that day
  const schedMap: Record<string, CronJob[]> = {};
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Parse cron expressions to determine which days jobs run
  for (const job of jobs) {
    if (job.enabled === false || job.state === 'paused') continue;
    const display = job.schedule_display || '';

    // For daily jobs
    if (display.includes('daily') || display === '0 9 * * *' || display === '0 8 * * *') {
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (!schedMap[key]) schedMap[key] = [];
        schedMap[key].push(job);
      }
    }
    // For hourly jobs
    else if (display.includes('hour') || display.match(/^0 \* \* \* \*$/)) {
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (!schedMap[key]) schedMap[key] = [];
        schedMap[key].push(job);
      }
    }
    // For weekly jobs
    else if (display.includes('weekly') || display.includes('0 0 * * 0')) {
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        if (date.getDay() === 0) { // Sunday
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          if (!schedMap[key]) schedMap[key] = [];
          schedMap[key].push(job);
        }
      }
    }
    // For monthly jobs
    else if (display.includes('monthly') || display.includes('0 0 1 * *')) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      if (!schedMap[key]) schedMap[key] = [];
      schedMap[key].push(job);
    }
    // For specific day-of-week patterns (e.g., "0 9 * * 1-5" = weekdays)
    else if (display.includes('1-5') || display.includes('weekday')) {
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        if (date.getDay() >= 1 && date.getDay() <= 5) {
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          if (!schedMap[key]) schedMap[key] = [];
          schedMap[key].push(job);
        }
      }
    }
    // Default: show on all days (conservative)
    else {
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (!schedMap[key]) schedMap[key] = [];
        schedMap[key].push(job);
      }
    }
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const days: Array<{ date: number; key: string; isCurrentMonth: boolean; jobs: CronJob[] }> = [];
  // Pad start
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 12 : month;
    const y = month === 0 ? year - 1 : year;
    const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ date: d, key, isCurrentMonth: false, jobs: schedMap[key] || [] });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ date: d, key, isCurrentMonth: true, jobs: schedMap[key] || [] });
  }
  // Pad end
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month + 2 > 12 ? 1 : month + 2;
    const y = month + 2 > 12 ? year + 1 : year;
    const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ date: d, key, isCurrentMonth: false, jobs: schedMap[key] || [] });
  }


  return (
    <div className={`p-5 overflow-y-auto h-[calc(100vh-3.5rem)] ${theme.bg}`} style={{ marginLeft: 'var(--sidebar-w, 4rem)', transition: 'margin-left 0.3s' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-zinc-100">{monthName}</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
            Today
          </button>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[10px] text-zinc-600 uppercase tracking-wider py-2 font-medium">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const isToday = day.key === todayKey;
          const isSelected = day.key === selectedDate;
          const hasJobs = day.jobs.length > 0;
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(day.key)}
              className={`relative p-2 rounded-lg text-left min-h-[80px] transition-colors ${
                !day.isCurrentMonth ? 'opacity-30' : ''
              } ${isToday ? 'ring-1 ring-orange-500/50' : ''} ${
                isSelected ? 'bg-zinc-800' : hasJobs ? 'bg-[#111118] hover:bg-zinc-800/50' : 'bg-[#0d0d14] hover:bg-zinc-800/30'
              }`}
              style={{ border: '1px solid #16161f' }}
            >
              <span className={`text-xs ${isToday ? 'text-orange-400 font-bold' : day.isCurrentMonth ? 'text-zinc-400' : 'text-zinc-700'}`}>
                {day.date}
              </span>
              {hasJobs && (
                <div className="mt-1 space-y-0.5">
                  {day.jobs.slice(0, 3).map((job, ji) => (
                    <div key={ji} className={`text-[9px] truncate px-1 py-0.5 rounded ${getStatusColor(job.last_status === 'error' ? 'error' : 'ok').bg} ${getStatusColor(job.last_status === 'error' ? 'error' : 'ok').text}`}>
                      {job.name}
                    </div>
                  ))}
                  {day.jobs.length > 3 && (
                    <p className="text-[9px] text-zinc-600">+{day.jobs.length - 3} more</p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date detail */}
      {selectedDate && (() => {
        const dayJobs = schedMap[selectedDate] || [];
        return (
          <div className={`mt-4 ${theme.bgCard} rounded-xl p-4`} style={{ border: '1px solid #1e1e2a' }}>
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-3">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
              <span className="ml-2 text-zinc-600">({dayJobs.length} jobs)</span>
            </h3>
            {dayJobs.length === 0 ? (
              <p className="text-xs text-zinc-600">No jobs scheduled</p>
            ) : (
              <div className="space-y-2">
                {dayJobs.map(job => (
                  <div key={job.id} className="flex items-center gap-3 py-1.5" style={{ borderBottom: '1px solid #16161f' }}>
                    <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(job.last_status === 'error' ? 'error' : 'ok').dot}`} />
                    <span className="text-xs text-zinc-200 flex-1">{job.name}</span>
                    <span className="text-[10px] text-zinc-500">{job.schedule_display}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
