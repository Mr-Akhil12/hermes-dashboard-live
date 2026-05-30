import { NextRequest, NextResponse } from 'next/server';

// Shared in-memory store (resets on cold start — webhook repopulates)
let cronDataStore: {
  jobs: any[];
  runs: any[];
  calendarDays: any[];
  stats: { todayCount: number; weekCount: number; totalRuns: number; lastSync: string };
  lastUpdated: string;
} = {
  jobs: [],
  runs: [],
  calendarDays: [],
  stats: { todayCount: 0, weekCount: 0, totalRuns: 0, lastSync: '' },
  lastUpdated: '',
};

// ─── Webhook Receiver (POST) ───
// Your local machine pushes cron data here
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the payload has expected structure
    if (!body.runs || !Array.isArray(body.runs)) {
      return NextResponse.json({ error: 'Invalid payload: expected { runs: [...] }' }, { status: 400 });
    }

    // Update the shared store
    cronDataStore = {
      jobs: body.jobs || [],
      runs: body.runs || [],
      calendarDays: body.calendarDays || [],
      stats: body.stats || { todayCount: 0, weekCount: 0, totalRuns: 0, lastSync: new Date().toISOString() },
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({ ok: true, runsReceived: body.runs.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}

// ─── Data Reader (GET) ───
// Dashboard fetches from here
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const view = searchParams.get('view') || 'overview';
  const filter = searchParams.get('filter') || 'all';
  const jobId = searchParams.get('jobId') || null;

  const { jobs, runs, calendarDays, stats } = cronDataStore;

  // If no data yet, return empty state with helpful message
  if (!runs.length) {
    return NextResponse.json({
      jobs: [],
      runs: [],
      calendarDays: [],
      stats: { ...stats, lastSync: stats.lastSync || 'never' },
      waitingForData: true,
    });
  }

  let filteredRuns = [...runs];

  // Apply time filter
  if (filter === 'today') {
    const today = new Date().toISOString().split('T')[0];
    filteredRuns = filteredRuns.filter((r) => r.runTime.startsWith(today));
  } else if (filter === 'week') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    filteredRuns = filteredRuns.filter((r) => r.runTime.split(' ')[0] >= weekAgo);
  }

  // Filter by job
  if (jobId) {
    filteredRuns = filteredRuns.filter((r) => r.jobId === jobId);
  }

  switch (view) {
    case 'jobs':
      return NextResponse.json({ jobs, totalRuns: filteredRuns.length });
    case 'calendar':
      return NextResponse.json({ days: calendarDays });
    case 'runs':
      return NextResponse.json({ runs: filteredRuns.slice(0, 200), total: filteredRuns.length });
    case 'detail':
      const run = filteredRuns.find(
        (r) => r.fileName === searchParams.get('file') && r.jobId === jobId
      );
      return NextResponse.json({ run: run || null });
    default:
      return NextResponse.json({
        jobs,
        runs: filteredRuns.slice(0, 10),
        calendarDays,
        stats: { ...stats, lastSync: cronDataStore.lastUpdated },
      });
  }
}
