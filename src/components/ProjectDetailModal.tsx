import React, { useState } from 'react';
import { X, Calendar, CheckCircle2, Clock, AlertTriangle, Users, BarChart3, CheckSquare, Plus } from 'lucide-react';
import { Project, ProjectStatus } from '../types';

interface ProjectDetailModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (updated: Project) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  isOpen,
  onClose,
  onUpdateProject,
}) => {
  if (!isOpen || !project) return null;

  const [progress, setProgress] = useState(project.progress);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Initial scoping and technical architecture', done: true },
    { id: 2, text: 'Design token integration & Figma spec reviews', done: true },
    { id: 3, text: 'Core implementation & automated tests', done: progress >= 60 },
    { id: 4, text: 'Final security audit and stakeholder sign-off', done: progress >= 90 },
  ]);
  const [newTaskText, setNewTaskText] = useState('');

  const handleSave = () => {
    onUpdateProject({
      ...project,
      progress,
      status,
      tasksCompleted: tasks.filter(t => t.done).length,
      tasksTotal: tasks.length,
    });
    onClose();
  };

  const toggleTask = (id: number) => {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated);
    const completedCount = updated.filter(t => t.done).length;
    const newProgress = Math.round((completedCount / updated.length) * 100);
    setProgress(newProgress);
    if (newProgress === 100) setStatus('Completed');
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: newTaskText.trim(), done: false }]);
    setNewTaskText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#e2e8f0] flex items-start justify-between bg-[#f9f9f9]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-[#d2e4ff]/60 text-[#001d37]">
                {project.category}
              </span>
              <span className="text-xs text-[#74777f]">Due: {project.dueDate}</span>
            </div>
            <h3 className="text-xl font-bold text-[#1a1c1c] leading-snug">{project.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#74777f] hover:text-[#1a1c1c] p-1.5 rounded-md hover:bg-[#e8e8e8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-xs max-h-[70vh] overflow-y-auto">
          {/* Description */}
          <div>
            <h4 className="font-semibold text-[#1a1c1c] mb-1 text-xs uppercase tracking-wider text-[#74777f]">
              Initiative Scope
            </h4>
            <p className="text-sm text-[#43474e] leading-relaxed bg-[#f9f9f9] p-3.5 rounded-xl border border-[#e2e8f0]">
              {project.description}
            </p>
          </div>

          {/* Status & Progress Slider */}
          <div className="grid grid-cols-2 gap-4 bg-[#f3f3f4]/50 p-4 rounded-xl border border-[#e2e8f0]">
            <div>
              <label className="block font-semibold text-[#1a1c1c] mb-1.5">Project Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 bg-white border border-[#c4c6cf] rounded-lg text-xs font-semibold text-[#1a1c1c] focus:border-[#0061a5] outline-hidden cursor-pointer"
              >
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Completed">Completed</option>
                <option value="Planning">Planning</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 font-semibold text-[#1a1c1c]">
                <span>Progress</span>
                <span className="text-[#0061a5] font-bold">{progress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-[#0061a5] mt-2 cursor-pointer"
              />
            </div>
          </div>

          {/* Assigned Members */}
          <div>
            <h4 className="font-semibold text-[#1a1c1c] mb-2 text-xs uppercase tracking-wider text-[#74777f]">
              Assigned Team Members ({project.members.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {project.members.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#c4c6cf] rounded-lg text-xs"
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-[#e8e8e8]">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] font-bold flex items-center justify-center h-full">
                        {m.initials || 'U'}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-[#1a1c1c]">{m.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Milestone Checklist */}
          <div>
            <h4 className="font-semibold text-[#1a1c1c] mb-2 text-xs uppercase tracking-wider text-[#74777f] flex items-center justify-between">
              <span>Milestones & Key Tasks</span>
              <span>{tasks.filter(t => t.done).length}/{tasks.length} Completed</span>
            </h4>
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    task.done
                      ? 'bg-emerald-50/50 border-emerald-200 text-[#1a1c1c]'
                      : 'bg-white border-[#e2e8f0] hover:bg-[#f9f9f9] text-[#43474e]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => {}}
                    className="rounded text-[#0061a5] focus:ring-0 cursor-pointer w-4 h-4"
                  />
                  <span className={`text-xs ${task.done ? 'line-through text-[#74777f]' : 'font-medium'}`}>
                    {task.text}
                  </span>
                </div>
              ))}

              {/* Add task mini form */}
              <form onSubmit={handleAddTask} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Add a new milestone..."
                  className="flex-1 px-3 py-1.5 bg-white border border-[#c4c6cf] rounded-lg text-xs outline-hidden focus:border-[#0061a5]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#f3f3f4] hover:bg-[#e2e8f0] text-[#1a1c1c] font-semibold text-xs rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e2e8f0] bg-[#f9f9f9] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#43474e] hover:bg-[#e8e8e8] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold bg-[#3182ce] hover:bg-[#0061a5] text-white rounded-lg shadow-sm transition-all cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
