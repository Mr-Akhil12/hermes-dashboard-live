import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Read from static data file (built into the app)
function getData() {
  try {
    const dataFile = path.join(process.cwd(), 'public', 'cron-data.json');
    if (fs.existsSync(dataFile)) {
      return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    }
  } catch { /* ignore */ }
  return null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const view = searchParams.get('view') || 'overview';
  const filter = searchParams.get('filter') || 'all';
  const jobId = searchParams.get('jobId') || null;

  const data = getData();

  if (!data || !data.runs?.length) {
    return NextResponse.json({
      jobs: [], runs: [], calendarDays: [],
      stats: { todayCount: 0, weekCount: 0, totalRuns: 0, lastSync: 'never' },
      waitingForData: true,
    });
  }

  const { jobs, runs, calendarDays, stats } = data;
  let filteredRuns = [...runs];

  if (filter === 'today') {
    const today = new Date().toISOString().split('T')[0];
    filteredRuns = filteredRuns.filter((r) => r.runTime.startsWith(today));
  } else if (filter === 'week') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    filteredRuns = filteredRuns.filter((r) => r.runTime.split(' ')[0] >= weekAgo);
  }
  if (jobId) {
    filteredRuns = filteredRuns.filter((r) => r.jobId === jobId);
  }

  switch (view) {
    case 'jobs':
      return NextResponse.json({ jobs, totalRuns: filteredRuns.length });
    case 'calendar':
      return NextResponse.json({ days: calendarDays });
    case 'runs':
      return NextResponse.json({ runs: filteredRuns, total: filteredRuns.length });
    case 'detail':
      const run = filteredRuns.find((r) => r.fileName === searchParams.get('file') && r.jobId === jobId);
      return NextResponse.json({ run: run || null });
    default:
      return NextResponse.json({
        jobs, runs: filteredRuns.slice(0, 10), calendarDays,
        stats: { ...stats, lastSync: data.lastUpdated },
      });
  }
}
