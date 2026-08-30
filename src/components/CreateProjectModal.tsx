import React, { useState } from 'react';
import { X, Plus, Users, Calendar, Sparkles } from 'lucide-react';
import { Project, ProjectStatus, ProjectCategory, TeamMember } from '../types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (project: Project) => void;
  availableMembers: TeamMember[];
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onAddProject,
  availableMembers,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('In Progress');
  const [category, setCategory] = useState<ProjectCategory>('Enterprise');
  const [dueDate, setDueDate] = useState('Nov 30');
  const [progress, setProgress] = useState(25);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(['team-1', 'team-6']);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const assignedMembers = availableMembers
      .filter((m) => selectedMemberIds.includes(m.id))
      .map((m) => ({
        id: m.id,
        name: m.name,
        avatarUrl: m.avatarUrl,
        initials: m.initials,
      }));

    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || 'No description provided.',
      status,
      category,
      dueDate,
      progress,
      members: assignedMembers.length > 0 ? assignedMembers : [{ id: 'user-default', name: 'Alex Vance' }],
      totalMembersCount: assignedMembers.length || 1,
      tasksCompleted: Math.round((progress / 100) * 20),
      tasksTotal: 20,
    };

    onAddProject(newProj);
    onClose();
    setName('');
    setDescription('');
    setProgress(25);
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f9f9f9]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0061a5]/10 text-[#0061a5] flex items-center justify-center font-bold">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1a1c1c]">Create New Project</h3>
              <p className="text-xs text-[#74777f]">Add a new initiative to your enterprise workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#74777f] hover:text-[#1a1c1c] p-1 rounded-md hover:bg-[#e8e8e8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#1a1c1c] mb-1">Project Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 Cloud Data Pipeline"
              className="w-full px-3 py-2 bg-white border border-[#c4c6cf] rounded-lg text-sm text-[#1a1c1c] focus:border-[#0061a5] focus:ring-2 focus:ring-[#66affe]/20 outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#1a1c1c] mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of project objectives and scope..."
              className="w-full px-3 py-2 bg-white border border-[#c4c6cf] rounded-lg text-sm text-[#1a1c1c] focus:border-[#0061a5] focus:ring-2 focus:ring-[#66affe]/20 outline-hidden resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#1a1c1c] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProjectCategory)}
                className="w-full px-3 py-2 bg-white border border-[#c4c6cf] rounded-lg text-xs font-medium text-[#1a1c1c] focus:border-[#0061a5] outline-hidden"
              >
                <option value="Enterprise">Enterprise</option>
                <option value="SMB">SMB</option>
                <option value="Startup">Startup</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#1a1c1c] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 bg-white border border-[#c4c6cf] rounded-lg text-xs font-medium text-[#1a1c1c] focus:border-[#0061a5] outline-hidden"
              >
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Completed">Completed</option>
                <option value="Planning">Planning</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#1a1c1c] mb-1">Due Date</label>
              <input
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="e.g. Dec 15"
                className="w-full px-3 py-2 bg-white border border-[#c4c6cf] rounded-lg text-xs text-[#1a1c1c] focus:border-[#0061a5] outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#1a1c1c] mb-1">Initial Progress: {progress}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-[#0061a5] mt-2"
              />
            </div>
          </div>

          {/* Member assignment */}
          <div>
            <label className="block font-semibold text-[#1a1c1c] mb-1.5">Assign Team Members</label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1">
              {availableMembers.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggleMember(m.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-[#0061a5] bg-[#d2e4ff]/30 text-[#002045]'
                        : 'border-[#e2e8f0] hover:bg-[#f9f9f9] text-[#43474e]'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-[#e2e2e2]">
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] font-bold flex items-center justify-center h-full">{m.initials || 'U'}</span>
                      )}
                    </div>
                    <span className="text-xs truncate font-medium">{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#43474e] hover:bg-[#f3f3f4] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-[#3182ce] hover:bg-[#0061a5] text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
