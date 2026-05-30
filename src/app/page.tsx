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

// ─── API ───
async function fetchData(view: ViewMode, filter: FilterMode, jobId?: string) {
  const params = new URLSearchParams({ view, filter });
  if (jobId) params.set('jobId', jobId);
  const res = await fetch(`/api/cron?${params}`);
  return res.json();
}

// ─── Components ───

function StatusBadge({ count }: { count: number }) {
  const color = count > 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-700/50 text-zinc-500 border-zinc-600/30';
  return (
    <span className={`px-2 py-0.5 text-xs font-mono rounded border ${color}`}>
      {count} runs
    </span>
  );
}

function JobCard({ job, onClick }: { job: JobSummary; onClick: () => void }) {
  const lastRunDate = new Date(job.lastRun.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1-$2-$3'));
  const isRecent = Date.now() - lastRunDate.getTime() < 24 * 60 * 60 * 1000;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:border-cyan-500/40 hover:bg-zinc-800 transition-all group"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-zinc-100 group-hover:text-cyan-400 transition-colors truncate">
          {job.jobName}
        </h3>
        {isRecent && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0 ml-2" />
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{job.totalRuns} total runs</span>
        <span className="truncate ml-2">{job.lastRun}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {Object.entries(job.runsByDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5).map(([date, count]) => (
          <span key={date} className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-700/50 text-zinc-400 rounded" title={date}>
            {count}
          </span>
        ))}
      </div>
    </button>
  );
}

function CalendarCell({ day, maxRuns }: { day: CalendarDay; maxRuns: number }) {
  const intensity = Math.min(day.totalRuns / Math.max(maxRuns, 1), 1);
  const bgOpacity = Math.max(intensity * 0.8, 0.05);
  
  return (
    <div
      className="aspect-square rounded border border-zinc-700/30 p-1 flex flex-col items-center justify-center hover:border-cyan-500/30 transition-colors cursor-default group relative"
      style={{ backgroundColor: `rgba(6, 182, 212, ${bgOpacity})` }}
      title={`${day.date}: ${day.totalRuns} runs`}
    >
      <span className="text-[10px] font-mono text-zinc-400 group-hover:text-zinc-200">
        {new Date(day.date + 'T12:00:00').getDate()}
      </span>
      {day.totalRuns > 0 && (
        <span className="text-[10px] font-bold text-zinc-300">{day.totalRuns}</span>
      )}
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs whitespace-nowrap shadow-xl">
          <div className="font-medium text-zinc-200 mb-1">{day.date}</div>
          {Object.entries(day.jobs).map(([name, count]) => (
            <div key={name} className="text-zinc-400 truncate max-w-48">
              {name}: {count}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RunOutput({ run, onClose }: { run: CronRun; onClose: () => void }) {
  // Extract the actual output content (after the header)
  const contentStart = run.content.indexOf('---\n\n') + 4;
  const output = run.content.slice(contentStart).trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[80vh] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
          <div>
            <h2 className="font-medium text-zinc-100">{run.jobName}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{run.runTime}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200">
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          <pre className="text-sm text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">{output}</pre>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───
export default function Dashboard() {
  const [view, setView] = useState<ViewMode>('overview');
  const [filter, setFilter] = useState<FilterMode>('today');
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<CronRun | null>(null);
  const [stats, setStats] = useState({ todayCount: 0, weekCount: 0, totalRuns: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (view === 'calendar') {
        const calData = await fetchData('calendar', filter);
        setCalendarDays(calData.days || []);
      }
      
      const overviewData = await fetchData('overview', filter);
      setJobs(overviewData.jobs || []);
      setStats({
        todayCount: overviewData.todayCount || 0,
        weekCount: overviewData.weekCount || 0,
        totalRuns: overviewData.totalRuns || 0,
      });
      
      const runsData = await fetchData('runs', filter, selectedJob || undefined);
      setRuns(runsData.runs || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
    setLoading(false);
  }, [view, filter, selectedJob]);

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const maxCalendarRuns = Math.max(...calendarDays.map(d => d.totalRuns), 1);

  // Filter jobs for selected tab
  const filteredJobs = selectedJob ? jobs.filter(j => j.jobId === selectedJob) : jobs;
  const selectedJobName = selectedJob ? jobs.find(j => j.jobId === selectedJob)?.jobName || selectedJob : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-bold">
              H
            </div>
            <div>
              <h1 className="font-semibold text-zinc-100">Hermes Dashboard</h1>
              <p className="text-xs text-zinc-500">Production monitoring</p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-zinc-400">Today:</span>
              <span className="font-mono font-medium text-zinc-200">{stats.todayCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-zinc-400">Week:</span>
              <span className="font-mono font-medium text-zinc-200">{stats.weekCount}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1">
          {(['overview', 'jobs', 'calendar', 'runs'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                view === v
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
          
          <div className="ml-auto flex items-center gap-2 py-2">
            {(['today', 'week', 'all'] as FilterMode[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
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

      {/* Back button for job detail */}
      {selectedJob && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <button
            onClick={() => setSelectedJob(null)}
            className="text-sm text-zinc-500 hover:text-cyan-400 transition-colors flex items-center gap-1"
          >
            ← Back to all jobs
          </button>
          <h2 className="text-lg font-semibold text-zinc-100 mt-1">{selectedJobName}</h2>
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        )}

        {!loading && (
          <>
            {/* Overview */}
            {view === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <div className="text-2xl font-bold text-zinc-100">{stats.todayCount}</div>
                    <div className="text-sm text-zinc-500">Runs Today</div>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <div className="text-2xl font-bold text-zinc-100">{stats.weekCount}</div>
                    <div className="text-sm text-zinc-500">Runs This Week</div>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <div className="text-2xl font-bold text-zinc-100">{jobs.length}</div>
                    <div className="text-sm text-zinc-500">Active Jobs</div>
                  </div>
                </div>

                <h2 className="text-lg font-semibold text-zinc-200">All Crown Jobs</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {jobs.map(job => (
                    <JobCard key={job.jobId} job={job} onClick={() => { setSelectedJob(job.jobId); setView('runs'); }} />
                  ))}
                </div>
              </div>
            )}

            {/* Jobs Tab */}
            {view === 'jobs' && (
              <div>
                <h2 className="text-lg font-semibold text-zinc-200 mb-4">
                  Cron Jobs {filter !== 'all' && <span className="text-zinc-500 font-normal">({filter})</span>}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredJobs.map(job => (
                    <JobCard key={job.jobId} job={job} onClick={() => { setSelectedJob(job.jobId); setView('runs'); }} />
                  ))}
                </div>
                {filteredJobs.length === 0 && (
                  <p className="text-zinc-500 text-center py-10">No jobs match this filter.</p>
                )}
              </div>
            )}

            {/* Calendar Tab */}
            {view === 'calendar' && (
              <div>
                <h2 className="text-lg font-semibold text-zinc-200 mb-4">Calendar</h2>
                <div className="grid grid-cols-7 gap-1 max-w-3xl">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-center text-xs font-medium text-zinc-600 py-2">{d}</div>
                  ))}
                  {calendarDays.map(day => (
                    <CalendarCell key={day.date} day={day} maxRuns={maxCalendarRuns} />
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                  <span>Less</span>
                  {[0.05, 0.2, 0.4, 0.6, 0.8].map(opacity => (
                    <div key={opacity} className="w-4 h-4 rounded" style={{ backgroundColor: `rgba(6, 182, 212, ${opacity})` }} />
                  ))}
                  <span>More</span>
                </div>
              </div>
            )}

            {/* Runs Tab */}
            {view === 'runs' && (
              <div>
                <h2 className="text-lg font-semibold text-zinc-200 mb-4">
                  {selectedJobName || 'All Runs'} <span className="text-zinc-500 font-normal text-sm">({runs.length})</span>
                </h2>
                <div className="space-y-2">
                  {runs.map((run, i) => (
                    <button
                      key={`${run.jobId}-${run.fileName}-${i}`}
                      onClick={() => setSelectedRun(run)}
                      className="w-full text-left p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50 hover:border-cyan-500/30 hover:bg-zinc-800/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-zinc-300 text-sm">{run.jobName}</span>
                        <span className="text-xs text-zinc-500 font-mono">{run.runTime}</span>
                      </div>
                      <p className="text-xs text-zinc-600 mt-1 truncate">
                        {run.content.split('---\n\n')[1]?.split('\n')[0]?.slice(0, 120) || 'No preview'}
                      </p>
                    </button>
                  ))}
                </div>
                {runs.length === 0 && (
                  <p className="text-zinc-500 text-center py-10">No runs match this filter.</p>
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
