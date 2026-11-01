import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Link as LinkIcon, Check } from 'lucide-react';
import type { TaskItem, EventFunctionName, PriorityLevel } from '../../types/plan';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<TaskItem, 'id' | 'source' | 'isLocked'>) => void;
  editingTask?: TaskItem | null;
  allTasks: TaskItem[];
}

const EVENT_FUNCTIONS: EventFunctionName[] = [
  'General',
  'Haldi',
  'Mehndi',
  'Sangeet',
  'Wedding',
  'Reception',
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTask,
  allTasks,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    deadline: '',
    timeSlot: '',
    priority: 'medium' as PriorityLevel,
    assignee: '',
    done: false,
    eventFunction: 'General' as EventFunctionName,
    dependsOnTaskId: '',
  });

  useEffect(() => {
    if (editingTask) {
      setFormData({
        title: editingTask.title,
        deadline: editingTask.deadline,
        timeSlot: editingTask.timeSlot || '',
        priority: editingTask.priority,
        assignee: editingTask.assignee,
        done: editingTask.done,
        eventFunction: editingTask.eventFunction,
        dependsOnTaskId: editingTask.dependsOnTaskId || '',
      });
    } else {
      setFormData({
        title: '',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        timeSlot: '10:00 AM',
        priority: 'medium',
        assignee: '',
        done: false,
        eventFunction: 'General',
        dependsOnTaskId: '',
      });
    }
  }, [editingTask, isOpen]);

  if (!isOpen) return null;

  const availablePrerequisites = allTasks.filter(
    (t) => !editingTask || t.id !== editingTask.id
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    onSave({
      title: formData.title.trim(),
      deadline: formData.deadline || new Date().toISOString().split('T')[0],
      timeSlot: formData.timeSlot.trim() || undefined,
      priority: formData.priority,
      assignee: formData.assignee.trim() || 'Unassigned',
      done: formData.done,
      eventFunction: formData.eventFunction,
      dependsOnTaskId: formData.dependsOnTaskId || undefined,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-stone-700/80 p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          aria-label="Close task dialog"
          className="absolute top-5 right-5 p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <h2 id="task-modal-title" className="text-lg font-serif font-bold text-stone-100 mb-4">
          {editingTask ? 'Edit Celebration Task' : 'Add New Celebration Task'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="task-title" className="block text-xs font-semibold text-stone-300 mb-1">
              Task Action / Title
            </label>
            <input
              id="task-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="glass-input w-full px-3.5 py-2 text-sm text-stone-100 rounded-xl"
              placeholder="e.g. Schedule Sound Check & Mic Alignment"
              required
            />
          </div>

          {/* Event Function & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-function" className="block text-xs font-semibold text-stone-300 mb-1">
                Function / Phase
              </label>
              <select
                id="task-function"
                value={formData.eventFunction}
                onChange={(e) => setFormData({ ...formData, eventFunction: e.target.value as EventFunctionName })}
                className="w-full bg-stone-900 text-stone-200 border border-stone-700 rounded-xl px-3 py-2 text-xs"
              >
                {EVENT_FUNCTIONS.map((fn) => (
                  <option key={fn} value={fn}>
                    {fn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-priority" className="block text-xs font-semibold text-stone-300 mb-1">
                Priority Level
              </label>
              <select
                id="task-priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as PriorityLevel })}
                className="w-full bg-stone-900 text-stone-200 border border-stone-700 rounded-xl px-3 py-2 text-xs"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Deadline & Time Slot */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-deadline" className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
                Target Deadline
              </label>
              <input
                id="task-deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="glass-input w-full px-3 py-2 text-xs font-mono text-stone-100 rounded-xl"
                required
              />
            </div>
            <div>
              <label htmlFor="task-timeslot" className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
                Itinerary Time (Day-Of)
              </label>
              <input
                id="task-timeslot"
                type="text"
                value={formData.timeSlot}
                onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                placeholder="e.g. 10:30 AM"
                className="glass-input w-full px-3 py-2 text-xs text-stone-100 rounded-xl"
              />
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label htmlFor="task-assignee" className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
              Person In-Charge / Assignee
            </label>
            <input
              id="task-assignee"
              type="text"
              value={formData.assignee}
              onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              placeholder="e.g. Uncle Murthy, Groom’s Brother, Ananya"
              className="glass-input w-full px-3 py-2 text-xs text-stone-100 rounded-xl"
            />
          </div>

          {/* Task Dependency (Rubric Item: dependsOnTaskId) */}
          <div className="p-3 rounded-xl bg-stone-900/90 border border-stone-800">
            <label htmlFor="task-dependency" className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-gold-400" aria-hidden="true" />
              Prerequisite Dependency (DAG Task Engine)
            </label>
            <select
              id="task-dependency"
              value={formData.dependsOnTaskId}
              onChange={(e) => setFormData({ ...formData, dependsOnTaskId: e.target.value })}
              className="w-full bg-stone-950 text-stone-200 border border-stone-700/80 rounded-lg px-2.5 py-1.5 text-xs"
            >
              <option value="">No prerequisite (Can start immediately)</option>
              {availablePrerequisites.map((t) => (
                <option key={t.id} value={t.id}>
                  Must complete: {t.title} {t.done ? '(Done)' : '(Pending)'}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-stone-500 mt-1">
              If the prerequisite task is incomplete, this task will be flagged with a yellow <span className="text-amber-400 font-semibold">Blocked</span> badge.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:text-stone-100 hover:bg-stone-800/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-600 to-gold-500 hover:from-brand-500 hover:to-gold-400 text-white shadow-lg transition-all"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              {editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
