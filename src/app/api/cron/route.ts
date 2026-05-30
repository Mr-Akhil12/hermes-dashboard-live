import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CRON_OUTPUT_DIR = process.env.CRON_OUTPUT_DIR || '/home/akhil/.hermes/cron/output';
const STATE_DB = process.env.STATE_DB || '/home/akhil/.hermes/state.db';

// ─── Cron Output File Parser ───
interface CronRun {
  jobId: string;
  jobName: string;
  runTime: string;
  content: string;
  fileName: string;
}

function getCronRuns(): CronRun[] {
  const runs: CronRun[] = [];
  
  if (!fs.existsSync(CRON_OUTPUT_DIR)) return runs;
  
  const jobDirs = fs.readdirSync(CRON_OUTPUT_DIR);
  
  for (const jobId of jobDirs) {
    const jobDir = path.join(CRON_OUTPUT_DIR, jobId);
    if (!fs.statSync(jobDir).isDirectory()) continue;
    
    const files = fs.readdirSync(jobDir).filter(f => f.endsWith('.md')).sort().reverse();
    
    for (const file of files) {
      const filePath = path.join(jobDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Parse the header
      const nameMatch = content.match(/^# Cron Job: (.+)$/m);
      const timeMatch = content.match(/\*\*Run Time:\*\* (.+)/m);
      
      runs.push({
        jobId,
        jobName: nameMatch?.[1] || jobId,
        runTime: file.replace('.md', '').replace(/_/g, ' '),
        content,
        fileName: file,
      });
    }
  }
  
  return runs.sort((a, b) => b.runTime.localeCompare(a.runTime));
}

// ─── Aggregate by Job ───
interface CronJobSummary {
  jobId: string;
  jobName: string;
  totalRuns: number;
  lastRun: string;
  lastRunContent: string;
  runsByDate: Record<string, number>;
}

function getJobSummaries(runs: CronRun[]): CronJobSummary[] {
  const jobMap = new Map<string, CronJobSummary>();
  
  for (const run of runs) {
    const existing = jobMap.get(run.jobId);
    const dateKey = run.runTime.split(' ')[0];
    
    if (!existing) {
      jobMap.set(run.jobId, {
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
  
  return Array.from(jobMap.values()).sort((a, b) => a.jobName.localeCompare(b.jobName));
}

// ─── Calendar Data ───
interface CalendarDay {
  date: string;
  totalRuns: number;
  jobs: Record<string, number>;
}

function getCalendarData(runs: CronRun[]): CalendarDay[] {
  const dayMap = new Map<string, CalendarDay>();
  
  for (const run of runs) {
    const dateKey = run.runTime.split(' ')[0];
    const existing = dayMap.get(dateKey);
    
    if (!existing) {
      dayMap.set(dateKey, {
        date: dateKey,
        totalRuns: 1,
        jobs: { [run.jobName]: 1 },
      });
    } else {
      existing.totalRuns++;
      existing.jobs[run.jobName] = (existing.jobs[run.jobName] || 0) + 1;
    }
  }
  
  return Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Filters ───
function filterByDate(runs: CronRun[], startDate: string, endDate: string): CronRun[] {
  return runs.filter(r => {
    const d = r.runTime.split(' ')[0];
    return d >= startDate && d <= endDate;
  });
}

function filterToday(runs: CronRun[]): CronRun[] {
  const today = new Date().toISOString().split('T')[0];
  return runs.filter(r => r.runTime.startsWith(today));
}

function filterThisWeek(runs: CronRun[]): CronRun[] {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];
  return runs.filter(r => r.runTime.split(' ')[0] >= weekAgoStr);
}

// ─── API Routes ───
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const view = searchParams.get('view') || 'overview';
  const jobId = searchParams.get('jobId') || null;
  const filter = searchParams.get('filter') || 'all'; // all, today, week
  const startDate = searchParams.get('startDate') || null;
  const endDate = searchParams.get('endDate') || null;
  
  try {
    let runs = getCronRuns();
    
    // Apply filters
    if (filter === 'today') runs = filterToday(runs);
    else if (filter === 'week') runs = filterThisWeek(runs);
    else if (startDate && endDate) runs = filterByDate(runs, startDate, endDate);
    
    // Filter by job
    if (jobId) {
      runs = runs.filter(r => r.jobId === jobId);
    }
    
    switch (view) {
      case 'jobs':
        return NextResponse.json({ jobs: getJobSummaries(runs), totalRuns: runs.length });
      case 'calendar':
        return NextResponse.json({ days: getCalendarData(runs) });
      case 'runs':
        return NextResponse.json({ runs: runs.slice(0, 100), total: runs.length });
      case 'detail':
        const run = runs.find(r => r.fileName === searchParams.get('file') && r.jobId === jobId);
        return NextResponse.json({ run: run || null });
      default:
        return NextResponse.json({
          jobs: getJobSummaries(runs),
          todayCount: filterToday(getCronRuns()).length,
          weekCount: filterThisWeek(getCronRuns()).length,
          totalRuns: getCronRuns().length,
          recentRuns: runs.slice(0, 10),
        });
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
