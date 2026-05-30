'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ───
interface CronRun {
  jobId: string;
  jobName: string;
  runTime: string;
  content: string;
  fileName: string;
}

interface JobSummary {
  jobId: string;
  jobName: string;
  totalRuns: number;
  lastRun: string;
  lastRunContent: string;
  runsByDate: Record<string, number>;
}

interface CalendarDay {
  date: string;
  totalRuns: number;
  jobs: Record<string, number>;
}

type ViewMode = 'overview' | 'jobs' | 'calendar' | 'runs';
type FilterMode = 'all' | 'today' | 'week';

// ─── Helpers ───
function parseRuns(data: any): CronRun[] {
  if (!data?.runs) return [];
  return data.runs;
}

function aggregateJobs(runs: CronRun[]): JobSummary[] {
  const map = new Map<string, JobSummary>();
  for (const run of runs) {
    const existing = map.get(run.jobId);
    const dateKey = run.runTime.split(' ')[0];
    if (!existing) {
      map.set(run.jobId, {
        jobId: run.jobId,
        jobName: run.jobName,
        totalRuns: 1,
        lastRun: run.runTime,
        lastRunContent: run.content,
        runsByDate: { [dateKey]: 1 },
      });
    } else {
      existing.totalRuns++;
      if (run.runTime > existing.lastRun) {
        existing.lastRun = run.runTime;
        existing.lastRunContent = run.content;
      }
      existing.runsByDate[dateKey] = (existing.runsByDate[dateKey] || 0) + 1;
    }
  }
  return Array.from(map.values()).sort((a, b) => a.jobName.localeCompare(b.jobName));
}

function buildCalendar(runs: CronRun[]): CalendarDay[] {
  const map = new Map<string, CalendarDay>();
  for (const run of runs) {
    const dateKey = run.runTime.split(' ')[0];
    const existing = map.get(dateKey);
    if (!existing) {
      map.set(dateKey, { date: dateKey, totalRuns: 1, jobs: { [run.jobName]: 1 } });
    } else {
      existing.totalRuns++;
      existing.jobs[run.jobName] = (existing.jobs[run.jobName] || 0) + 1;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function filterRuns(runs: CronRun[], filter: FilterMode): CronRun[] {
  if (filter === 'today') {
    const today = new Date().toISOString().split('T')[0];
    return runs.filter((r) => r.runTime.startsWith(today));
  }
  if (filter === 'week') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return runs.filter((r) => r.runTime.split(' ')[0] >= weekAgo);
  }
  return runs;
}

function formatTime(t: string): string {
  // "2026-05-30 23-57-13" → "May 30, 23:57"
  try {
    const [datePart, timePart] = t.split(' ');
    const [y, m, d] = datePart.split('-');
    const [hh, mm] = timePart.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${hh}:${mm}`;
  } catch { return t; }
}

function timeAgo(t: string): string {
  try {
    const [datePart, timePart] = t.split(' ');
    const [y, m, d] = datePart.split('-');
    const [hh, mm, ss] = timePart.split('-');
    const date = new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}`);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch { return t; }
}

// ─── Components ───

function JobCard({ job, onClick }: { job: JobSummary; onClick: () => void }) {
  const isRecent = Date.now() - new Date(job.lastRun.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1-$2-$3')).getTime() < 24 * 60 * 60 * 1000;
  const recentDates = Object.entries(job.runsByDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 sm:p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:border-cyan-500/40 hover:bg-zinc-800 transition-all group"
    >
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="font-medium text-zinc-100 group-hover:text-cyan-400 transition-colors truncate text-sm sm:text-base pr-2">
          {job.jobName}
        </h3>
        {isRecent && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />}
      </div>
      <div className="flex items-center justify-between text-[10px] sm:text-xs text-zinc-500">
        <span>{job.totalRuns} runs</span>
        <span className="truncate ml-2">{timeAgo(job.lastRun)}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {recentDates.map(([date, count]) => (
          <span key={date} className="px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono bg-zinc-700/50 text-zinc-400 rounded" title={date}>
            {count}
          </span>
        ))}
      </div>
    </button>
  );
}

function CalendarCell({ day, maxRuns }: { day: CalendarDay; maxRuns: number }) {
  const intensity = Math.min(day.totalRuns / Math.max(maxRuns, 1), 1);
  const bgOpacity = Math.max(intensity * 0.8, 0.04);
  const dayNum = new Date(day.date + 'T12:00:00').getDate();

  return (
    <div
      className="aspect-square rounded border border-zinc-700/30 p-0.5 sm:p-1 flex flex-col items-center justify-center hover:border-cyan-500/30 transition-colors cursor-default group relative"
      style={{ backgroundColor: `rgba(6, 182, 212, ${bgOpacity})` }}
      title={`${day.date}: ${day.totalRuns} runs`}
    >
      <span className="text-[8px] sm:text-[10px] font-mono text-zinc-400 group-hover:text-zinc-200 leading-none">
        {dayNum}
      </span>
      {day.totalRuns > 0 && (
        <span className="text-[7px] sm:text-[10px] font-bold text-zinc-300 leading-none mt-0.5">{day.totalRuns}</span>
      )}
      {/* Tooltip — hidden on very small screens */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-[10px] sm:text-xs whitespace-nowrap shadow-xl">
          <div className="font-medium text-zinc-200 mb-1">{day.date}</div>
          {Object.entries(day.jobs).map(([name, count]) => (
            <div key={name} className="text-zinc-400 truncate max-w-36 sm:max-w-48">
              {name}: {count}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RunOutput({ run, onClose }: { run: CronRun; onClose: () => void }) {
  const contentStart = run.content.indexOf('---\n\n');
  const output = contentStart >= 0 ? run.content.slice(contentStart + 4).trim() : run.content;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] bg-zinc-900 border-0 sm:border border-zinc-700 rounded-t-xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 sm:p-4 border-b border-zinc-700 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-medium text-zinc-100 text-sm sm:text-base truncate">{run.jobName}</h2>
            <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5">{formatTime(run.runTime)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex-shrink-0 ml-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 min-h-0">
          <pre className="text-xs sm:text-sm text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed break-words">{output}</pre>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4">
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <h3 className="text-zinc-400 font-medium mb-1 text-sm sm:text-base">Waiting for data</h3>
      <p className="text-zinc-600 text-xs sm:text-sm text-center max-w-xs">
        Run the dashboard sync script on your Hermes machine to push cron data to this dashboard.
      </p>
      <code className="mt-3 px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded text-[10px] sm:text-xs text-zinc-500 font-mono">
        bash ~/.hermes/scripts/dashboard-sync.sh
      </code>
    </div>
  );
}

// ─── Main Dashboard ───
export default function Dashboard() {
  const [view, setView] = useState<ViewMode>('overview');
  const [filter, setFilter] = useState<FilterMode>('today');
  const [allRuns, setAllRuns] = useState<CronRun[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<CronRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ view: 'overview', filter: 'all' });
      const res = await fetch(`/api/cron?${params}`);
      const data = await res.json();
      
      if (data.waitingForData) {
        setAllRuns([]);
        setLastSync(data.stats?.lastSync || '');
      } else {
        setAllRuns(parseRuns(data));
        setLastSync(data.stats?.lastSync || '');
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Derived data
  const jobs = aggregateJobs(allRuns);
  const calendarDays = buildCalendar(allRuns);
  const filteredRuns = filterRuns(allRuns, filter);
  const jobFilteredRuns = selectedJob ? filteredRuns.filter((r) => r.jobId === selectedJob) : filteredRuns;
  const todayCount = filterRuns(allRuns, 'today').length;
  const weekCount = filterRuns(allRuns, 'week').length;
  const maxCalendarRuns = Math.max(...calendarDays.map((d) => d.totalRuns), 1);
  const selectedJobName = selectedJob ? jobs.find((j) => j.jobId === selectedJob)?.jobName || selectedJob : null;

  const hasData = allRuns.length > 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0">
              H
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-zinc-100 text-sm sm:text-base truncate">Hermes Dashboard</h1>
              <p className="text-[10px] sm:text-xs text-zinc-500 truncate">
                {lastSync ? `Synced ${timeAgo(lastSync)}` : 'Waiting for sync...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-shrink-0">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400" />
              <span className="text-zinc-400 hidden xs:inline">Today:</span>
              <span className="font-mono font-medium text-zinc-200">{todayCount}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-400" />
              <span className="text-zinc-400 hidden xs:inline">Week:</span>
              <span className="font-mono font-medium text-zinc-200">{weekCount}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-zinc-800 bg-zinc-900/50 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center gap-0.5 sm:gap-1 min-w-max">
          {(['overview', 'jobs', 'calendar', 'runs'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                view === v
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 pl-2">
            {(['today', 'week', 'all'] as FilterMode[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full transition-colors ${
                  filter === f
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 border border-zinc-700/50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Back button */}
      {selectedJob && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-3 sm:pt-4">
          <button
            onClick={() => setSelectedJob(null)}
            className="text-xs sm:text-sm text-zinc-500 hover:text-cyan-400 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            All jobs
          </button>
          <h2 className="text-base sm:text-lg font-semibold text-zinc-100 mt-1 truncate">{selectedJobName}</h2>
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {loading && (
          <div className="flex items-center justify-center py-16 sm:py-20">
            <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        )}

        {!loading && !hasData && <EmptyState />}

        {!loading && hasData && error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {!loading && hasData && (
          <>
            {/* Overview */}
            {view === 'overview' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="p-3 sm:p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <div className="text-lg sm:text-2xl font-bold text-zinc-100">{todayCount}</div>
                    <div className="text-[10px] sm:text-sm text-zinc-500">Today</div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <div className="text-lg sm:text-2xl font-bold text-zinc-100">{weekCount}</div>
                    <div className="text-[10px] sm:text-sm text-zinc-500">This Week</div>
                  </div>
                  <div className="p-3 sm:p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <div className="text-lg sm:text-2xl font-bold text-zinc-100">{jobs.length}</div>
                    <div className="text-[10px] sm:text-sm text-zinc-500">Jobs</div>
                  </div>
                </div>

                <h2 className="text-base sm:text-lg font-semibold text-zinc-200">All Crown Jobs</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {jobs.map((job) => (
                    <JobCard key={job.jobId} job={job} onClick={() => { setSelectedJob(job.jobId); setView('runs'); }} />
                  ))}
                </div>
              </div>
            )}

            {/* Jobs Tab */}
            {view === 'jobs' && (
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-zinc-200 mb-3 sm:mb-4">
                  Cron Jobs {filter !== 'all' && <span className="text-zinc-500 font-normal text-xs sm:text-sm">({filter})</span>}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {(selectedJob ? jobs.filter((j) => j.jobId === selectedJob) : jobs).map((job) => (
                    <JobCard key={job.jobId} job={job} onClick={() => { setSelectedJob(job.jobId); setView('runs'); }} />
                  ))}
                </div>
              </div>
            )}

            {/* Calendar Tab */}
            {view === 'calendar' && (
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-zinc-200 mb-3 sm:mb-4">Calendar</h2>
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1 max-w-full sm:max-w-3xl">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="text-center text-[8px] sm:text-xs font-medium text-zinc-600 py-1 sm:py-2">{d}</div>
                  ))}
                  {calendarDays.map((day) => (
                    <CalendarCell key={day.date} day={day} maxRuns={maxCalendarRuns} />
                  ))}
                </div>
                <div className="mt-3 sm:mt-4 flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-xs text-zinc-500">
                  <span>Less</span>
                  {[0.04, 0.2, 0.4, 0.6, 0.8].map((opacity) => (
                    <div key={opacity} className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: `rgba(6, 182, 212, ${opacity})` }} />
                  ))}
                  <span>More</span>
                </div>
              </div>
            )}

            {/* Runs Tab */}
            {view === 'runs' && (
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-zinc-200 mb-3 sm:mb-4">
                  {selectedJobName || 'All Runs'}
                  <span className="text-zinc-500 font-normal text-xs sm:text-sm ml-1 sm:ml-2">({jobFilteredRuns.length})</span>
                </h2>
                <div className="space-y-1.5 sm:space-y-2">
                  {jobFilteredRuns.slice(0, 100).map((run, i) => {
                    const preview = run.content.split('---\n\n')[1]?.split('\n')[0]?.slice(0, 100) || 'No preview';
                    return (
                      <button
                        key={`${run.jobId}-${run.fileName}-${i}`}
                        onClick={() => setSelectedRun(run)}
                        className="w-full text-left p-2.5 sm:p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50 hover:border-cyan-500/30 hover:bg-zinc-800/50 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-zinc-300 text-xs sm:text-sm truncate">{run.jobName}</span>
                          <span className="text-[10px] sm:text-xs text-zinc-500 font-mono flex-shrink-0">{formatTime(run.runTime)}</span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-zinc-600 mt-1 truncate">{preview}</p>
                      </button>
                    );
                  })}
                </div>
                {jobFilteredRuns.length === 0 && (
                  <p className="text-zinc-500 text-center py-10 text-sm">No runs match this filter.</p>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Run Detail Modal */}
      {selectedRun && <RunOutput run={selectedRun} onClose={() => setSelectedRun(null)} />}
    </div>
  );
}
