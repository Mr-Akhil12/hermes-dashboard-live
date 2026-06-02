// src/app/tasks/page.tsx — TASKS TAB (Real Kanban from SQLite)
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDashboardStore } from '@/lib/store';
import { fetchTasks, createTask, updateTask, deleteTask } from '@/lib/api';
import { theme } from '@/lib/colors';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'done';
  priority: string;
  createdAt: string;
  updatedAt: string;
}

const COLUMNS = [
  { id: 'pending', label: 'Pending', color: 'text-zinc-400' },
  { id: 'in_progress', label: 'In Progress', color: 'text-amber-400' },
  { id: 'done', label: 'Done', color: 'text-emerald-400' },
] as const;

export default function TasksPage() {
  const { sidebarOpen } = useDashboardStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      const data = await fetchTasks();
      setTasks(data.tasks || []);
    } catch { /* ok */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const addTask = async (status: string) => {
    if (!newTask.trim()) return;
    await createTask(newTask.trim(), status);
    setNewTask('');
    setAddingTo(null);
    loadTasks();
  };

  const moveTask = async (taskId: string, newStatus: string) => {
    await updateTask(taskId, { status: newStatus });
    loadTasks();
  };

  const removeTask = async (taskId: string) => {
    await deleteTask(taskId);
    loadTasks();
  };

  const marginLeft = 'var(--sidebar-w, 4rem)';

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${theme.text}`} style={{ marginLeft, transition: 'margin-left 0.3s' }}>
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`p-3 md:p-5 overflow-y-auto h-[calc(100vh-3.5rem)] ${theme.bg}`} style={{ marginLeft, transition: 'margin-left 0.3s' }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-zinc-100">Tasks</h2>
        <p className="text-xs text-zinc-600">{tasks.length} total · {tasks.filter(t => t.status === 'done').length} done</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className={`${theme.bgCard} rounded-xl p-3`} style={{ border: '1px solid #1e1e2a' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${col.color}`}>{col.label}</span>
                  <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                <button onClick={() => setAddingTo(col.id)} className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"><Plus className="w-3 h-3" /></button>
              </div>

              {addingTo === col.id && (
                <div className="mb-3">
                  <input autoFocus value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addTask(col.id); if (e.key === 'Escape') { setAddingTo(null); setNewTask(''); } }} placeholder="Task title..." className={`w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/50`} />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => addTask(col.id)} className="px-2 py-1 rounded text-[10px] font-medium bg-orange-500/10 text-orange-400 hover:bg-orange-500/20">Add</button>
                    <button onClick={() => { setAddingTo(null); setNewTask(''); }} className="px-2 py-1 rounded text-[10px] font-medium text-zinc-500 hover:text-zinc-300">Cancel</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {colTasks.map(task => (
                  <div key={task.id} className="group bg-[#0d0d14] rounded-lg p-3 hover:bg-zinc-800/50 transition-colors cursor-pointer" style={{ border: '1px solid #1a1a2a' }} onClick={() => {
                    const next = col.id === 'pending' ? 'in_progress' : col.id === 'in_progress' ? 'done' : 'pending';
                    moveTask(task.id, next);
                  }}>
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-3 h-3 text-zinc-700 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <p className="text-xs text-zinc-200 flex-1">{task.title}</p>
                      <button onClick={(e) => { e.stopPropagation(); removeTask(task.id); }} className="p-0.5 rounded text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                    </div>
                    <p className="text-[9px] text-zinc-700 mt-1.5 ml-5">{new Date(task.updatedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</p>
                  </div>
                ))}
                {colTasks.length === 0 && !addingTo && (
                  <p className="text-[10px] text-zinc-700 text-center py-4">Drop tasks here</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
