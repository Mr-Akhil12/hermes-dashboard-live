import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

interface CronRun {
  jobId: string;
  jobName: string;
  runTime: string;
  content: string;
  fileName: string;
}

interface CronData {
  jobs: any[];
  runs: CronRun[];
  calendarDays: any[];
  stats: { todayCount: number; weekCount: number; totalRuns: number; lastSync: string };
  lastUpdated: string;
}

function getData(): CronData | null {
  try {
    const dataFile = path.join(process.cwd(), 'public', 'cron-data.json');
    if (fs.existsSync(dataFile)) {
      return JSON.parse(fs.readFileSync(dataFile, 'utf-8')) as CronData;
    }
  } catch { /* ignore */ }
  return null;
}

function getLocalDateStr(offsetHours: number): string {
  const now = new Date();
  const local = new Date(now.getTime() + offsetHours * 60 * 60 * 1000);
  return local.toISOString().split('T')[0];
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

  const { jobs, runs, calendarDays } = data;
  const today = getLocalDateStr(2);
  const weekAgoDate = new Date(Date.now() + 2 * 60 * 60 * 1000 - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgoDate.toISOString().split('T')[0];

  let filteredRuns = [...runs];
  if (filter === 'today') {
    filteredRuns = filteredRuns.filter((r: CronRun) => r.runTime.startsWith(today));
  } else if (filter === 'week') {
    filteredRuns = filteredRuns.filter((r: CronRun) => r.runTime.split(' ')[0] >= weekAgoStr);
  }
  if (jobId) {
    filteredRuns = filteredRuns.filter((r: CronRun) => r.jobId === jobId);
  }

  const todayCount = runs.filter((r: CronRun) => r.runTime.startsWith(today)).length;
  const weekCount = runs.filter((r: CronRun) => r.runTime.split(' ')[0] >= weekAgoStr).length;

  switch (view) {
    case 'jobs':
      return NextResponse.json({ jobs, totalRuns: filteredRuns.length });
    case 'calendar':
      return NextResponse.json({ days: calendarDays });
    case 'runs':
      return NextResponse.json({ runs: filteredRuns, total: filteredRuns.length });
    case 'detail': {
      const run = filteredRuns.find((r: CronRun) => r.fileName === searchParams.get('file') && r.jobId === jobId);
      return NextResponse.json({ run: run || null });
    }
    default:
      return NextResponse.json({
        jobs, runs: filteredRuns.slice(0, 10), calendarDays,
        stats: { todayCount, weekCount, totalRuns: runs.length, lastSync: data.lastUpdated },
      });
  }
}
