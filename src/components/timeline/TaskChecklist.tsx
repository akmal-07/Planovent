import React, { useState } from 'react';
import {
  CalendarCheck2,
  Plus,
  Lock,
  Unlock,
  AlertCircle,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  Filter,
} from 'lucide-react';
import type { TaskItem, EventFunctionName } from '../../types/plan';
import { isTaskBlocked } from '../../lib/calculations';
import { TaskModal } from './TaskModal';

interface TaskChecklistProps {
  tasks: TaskItem[];
  onToggleDone: (taskId: string) => void;
  onAddTask: (task: Omit<TaskItem, 'id' | 'source' | 'isLocked'>) => void;
  onUpdateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleLock: (taskId: string) => void;
}

type ViewMode = 'master' | 'schedule';

const EVENT_FUNCTIONS: EventFunctionName[] = [
  'Haldi',
  'Mehndi',
  'Sangeet',
  'Wedding',
  'Reception',
  'General',
];

export const TaskChecklist: React.FC<TaskChecklistProps> = ({
  tasks,
  onToggleDone,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onToggleLock,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('master');
  const [filterFunction, setFilterFunction] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const completedCount = tasks.filter((t) => t.done).length;
  const percentDone = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = tasks.filter((t) => {
    if (filterFunction !== 'all' && t.eventFunction !== filterFunction) return false;
    return true;
  });

  // Sort master list by deadline
  const sortedTasks = [...filteredTasks].sort((a, b) => a.deadline.localeCompare(b.deadline));

  const handleEdit = (task: TaskItem) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleSaveModal = (data: Omit<TaskItem, 'id' | 'source' | 'isLocked'>) => {
    if (editingTask) {
      onUpdateTask(editingTask.id, data);
    } else {
      onAddTask(data);
    }
  };

  return (
    <section aria-label="Timeline and Task Dependency Scheduler" className="space-y-6">
      {/* Control Header */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-gold-400" aria-hidden="true" />
            <h2 className="text-lg font-serif font-bold text-stone-100">
              Timeline & Task Dependency Scheduler
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Track milestones, prerequisite task blockers, and multi-day function day-of execution.
          </p>
        </div>

        {/* View Mode Switcher & Add Button */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Progress Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>
              {completedCount}/{tasks.length} Completed ({percentDone}%)
            </span>
          </div>

          {/* Master Checklist vs Multi-Day Schedule Toggle */}
          <div className="inline-flex rounded-xl bg-stone-900 p-0.5 border border-stone-800 text-xs" role="group" aria-label="Timeline view mode">
            <button
              onClick={() => setViewMode('master')}
              aria-pressed={viewMode === 'master'}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                viewMode === 'master'
                  ? 'bg-stone-800 text-gold-300 border border-gold-500/30 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Master Checklist
            </button>
            <button
              onClick={() => setViewMode('schedule')}
              aria-pressed={viewMode === 'schedule'}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                viewMode === 'schedule'
                  ? 'bg-stone-800 text-gold-300 border border-gold-500/30 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Multi-Day Itinerary
            </button>
          </div>

          {/* Add Task Button */}
          <button
            onClick={handleOpenAdd}
            aria-label="Add new celebration task"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-gold-500 hover:from-brand-500 hover:to-gold-400 text-white text-xs font-bold shadow-md hover:scale-[1.01] transition-all"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Function Filter Pills (when in Master view) */}
      {viewMode === 'master' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <Filter className="w-3.5 h-3.5 text-stone-500 mr-1" aria-hidden="true" />
          <button
            onClick={() => setFilterFunction('all')}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              filterFunction === 'all'
                ? 'bg-stone-800 text-gold-300 border border-gold-500/40'
                : 'bg-stone-900/80 text-stone-400 border border-stone-800 hover:text-stone-200'
            }`}
          >
            All Functions ({tasks.length})
          </button>
          {EVENT_FUNCTIONS.map((fn) => {
            const count = tasks.filter((t) => t.eventFunction === fn).length;
            if (count === 0) return null;
            return (
              <button
                key={fn}
                onClick={() => setFilterFunction(fn)}
                className={`px-3 py-1 rounded-full font-medium transition-colors ${
                  filterFunction === fn
                    ? 'bg-stone-800 text-gold-300 border border-gold-500/40'
                    : 'bg-stone-900/80 text-stone-400 border border-stone-800 hover:text-stone-200'
                }`}
              >
                {fn} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* View 1: Master Checklist (by deadline) */}
      {viewMode === 'master' && (
        <div className="glass-panel rounded-2xl border border-stone-800 divide-y divide-stone-800/60 overflow-hidden shadow-xl">
          {sortedTasks.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-sm">
              No tasks match this filter. Click &ldquo;Add Task&rdquo; to schedule milestones.
            </div>
          ) : (
            sortedTasks.map((task) => {
              const blocked = isTaskBlocked(task, tasks);
              const isOverdue = !task.done && task.deadline < todayStr;
              const prereqTask = task.dependsOnTaskId
                ? tasks.find((t) => t.id === task.dependsOnTaskId)
                : null;

              return (
                <div
                  key={task.id}
                  className={`p-4 sm:px-6 transition-colors flex items-start gap-3.5 ${
                    task.done ? 'bg-stone-950/40 opacity-70' : 'hover:bg-stone-900/30'
                  }`}
                >
                  {/* Complete Checkbox */}
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => onToggleDone(task.id)}
                    aria-label={`Mark "${task.title}" as ${task.done ? 'pending' : 'completed'}`}
                    className="mt-1 w-4 h-4 rounded border-stone-700 bg-stone-900 text-brand-500 focus:ring-brand-400 focus:ring-offset-stone-950 cursor-pointer"
                  />

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold text-stone-100 ${task.done ? 'line-through text-stone-400' : ''}`}>
                        {task.title}
                      </span>

                      {/* Event Function Badge */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-800 text-stone-300 border border-stone-700">
                        {task.eventFunction}
                      </span>

                      {/* Priority Badge */}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        task.priority === 'high'
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          : task.priority === 'medium'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-stone-800 text-stone-400 border-stone-700'
                      }`}>
                        {task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Med' : 'Low'}
                      </span>

                      {/* Rubric Blocked Badge (Yellow) */}
                      {blocked && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-amber-400" aria-hidden="true" />
                          Blocked by: {prereqTask ? prereqTask.title : 'Prerequisite task'}
                        </span>
                      )}

                      {/* Overdue Badge (Red) */}
                      {isOverdue && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          <AlertCircle className="w-3 h-3 text-rose-400" aria-hidden="true" />
                          Overdue
                        </span>
                      )}
                    </div>

                    {/* Metadata line */}
                    <div className="flex items-center gap-4 text-xs text-stone-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-500" aria-hidden="true" />
                        Due: {task.deadline}
                      </span>
                      {task.timeSlot && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-stone-500" aria-hidden="true" />
                          {task.timeSlot}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-stone-500" aria-hidden="true" />
                        Assignee: <strong className="text-stone-300 font-medium">{task.assignee}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions (Lock, Edit, Delete) */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => onToggleLock(task.id)}
                      aria-label={task.isLocked ? `Unlock task "${task.title}"` : `Lock task "${task.title}"`}
                      aria-pressed={task.isLocked}
                      className={`p-1.5 rounded-lg border transition-all ${
                        task.isLocked
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                          : 'bg-stone-800 text-stone-400 hover:text-stone-200 border-stone-700/60'
                      }`}
                      title={task.isLocked ? 'Locked by user' : 'Unlocked'}
                    >
                      {task.isLocked ? <Lock className="w-3.5 h-3.5" aria-hidden="true" /> : <Unlock className="w-3.5 h-3.5" aria-hidden="true" />}
                    </button>
                    <button
                      onClick={() => handleEdit(task)}
                      aria-label={`Edit task "${task.title}"`}
                      className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
                      title="Edit task"
                    >
                      <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      aria-label={`Delete task "${task.title}"`}
                      className="p-1.5 text-stone-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* View 2: Multi-Day Function Schedule (Grouped by Haldi/Mehndi/Sangeet/Wedding/Reception + timeSlot) */}
      {viewMode === 'schedule' && (
        <div className="space-y-6">
          {EVENT_FUNCTIONS.map((fn) => {
            const functionTasks = tasks
              .filter((t) => t.eventFunction === fn)
              .sort((a, b) => (a.timeSlot || '').localeCompare(b.timeSlot || ''));

            if (functionTasks.length === 0) return null;

            return (
              <div key={fn} className="glass-panel rounded-2xl border border-stone-800 overflow-hidden shadow-xl">
                <div className="px-6 py-3.5 bg-stone-900/90 border-b border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-gold-400" aria-hidden="true" />
                    <h3 className="text-base font-serif font-bold text-stone-100">{fn} Ceremony Schedule</h3>
                  </div>
                  <span className="text-xs text-stone-400 font-mono">
                    {functionTasks.filter((t) => t.done).length}/{functionTasks.length} Done
                  </span>
                </div>

                <div className="divide-y divide-stone-800/60 p-2">
                  {functionTasks.map((task) => {
                    const blocked = isTaskBlocked(task, tasks);
                    return (
                      <div
                        key={task.id}
                        className={`p-3 sm:px-4 rounded-xl transition-colors flex items-center justify-between gap-3 ${
                          task.done ? 'opacity-60 bg-stone-950/20' : 'hover:bg-stone-900/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Time badge */}
                          <div className="w-20 px-2 py-1 rounded bg-stone-950 border border-stone-800 text-[11px] font-mono font-semibold text-gold-300 text-center flex-shrink-0">
                            {task.timeSlot || 'Anytime'}
                          </div>
                          <div className="min-w-0">
                            <span className={`text-sm font-semibold text-stone-200 block truncate ${task.done ? 'line-through text-stone-500' : ''}`}>
                              {task.title}
                            </span>
                            <span className="text-[11px] text-stone-400">
                              Lead: {task.assignee}
                            </span>
                          </div>
                        </div>

                        {/* Status / Blocked badge */}
                        <div className="flex items-center gap-2">
                          {blocked && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Blocked
                            </span>
                          )}
                          <input
                            type="checkbox"
                            checked={task.done}
                            onChange={() => onToggleDone(task.id)}
                            aria-label={`Mark "${task.title}" as ${task.done ? 'pending' : 'completed'}`}
                            className="w-4 h-4 rounded border-stone-700 bg-stone-900 text-brand-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Add/Edit Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        editingTask={editingTask}
        allTasks={tasks}
      />
    </section>
  );
};
