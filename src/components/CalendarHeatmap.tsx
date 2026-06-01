// src/components/CalendarHeatmap.tsx
'use client';

import { useMemo } from 'react';

interface CalendarHeatmapProps {
  runs: Array<{ runTime: string }>;
}

export default function CalendarHeatmap({ runs }: CalendarHeatmapProps) {
  const days = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 89); // 90 days back
    start.setHours(0, 0, 0, 0);

    // Count runs per day
    const counts: Record<string, number> = {};
    for (const run of runs) {
      const d = new Date(run.runTime);
      if (d < start) continue;
      const key = d.toISOString().split('T')[0];
      counts[key] = (counts[key] || 0) + 1;
    }

    // Build 13 columns of 7 days each
    const cols: Array<Array<{ date: string; count: number }>> = [];
    const d = new Date(start);
    while (cols.length < 13) {
      const week: Array<{ date: string; count: number }> = [];
      while (week.length < 7) {
        const key = d.toISOString().split('T')[0];
        week.push({ date: key, count: counts[key] || 0 });
        d.setDate(d.getDate() + 1);
      }
      cols.push(week);
    }

    return cols;
  }, [runs]);

  function color(count: number) {
    if (count === 0) return '#16161f';
    if (count <= 2) return '#1a2a1a';
    if (count <= 5) return '#1a3a1a';
    if (count <= 10) return '#2a5a1a';
    if (count <= 20) return '#3a7a1a';
    return '#4a9a2a';
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex gap-[3px]">
      {days.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((day, di) => (
            <div
              key={di}
              className="w-[11px] h-[11px] rounded-[2px]"
              style={{ backgroundColor: color(day.count), outline: day.date === today ? '1px solid #f97316' : 'none' }}
              title={`${day.date}: ${day.count} runs`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
