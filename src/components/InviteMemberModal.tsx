import React, { useState } from 'react';
import { X, UserPlus, Mail, Shield } from 'lucide-react';
import { TeamMember } from '../types';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (member: TeamMember) => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onAddMember,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Product Specialist');
  const [department, setDepartment] = useState<'Engineering' | 'Design' | 'Product' | 'Marketing' | 'Sales'>('Engineering');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const newMember: TeamMember = {
      id: `team-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role: role.trim(),
      department,
      status: 'Online',
      statusType: 'online',
      isOnline: true,
      initials,
      roleBadgeClass: 'bg-[#d2e4ff]/60 text-[#001d37]',
      projectsAssigned: 1,
      recentAction: 'Joined the workspace',
    };

    onAddMember(newMember);
    onClose();
    setName('');
    setEmail('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f9f9f9]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0061a5]/10 text-[#0061a5] flex items-center justify-center font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1a1c1c]">Invite Team Member</h3>
              <p className="text-xs text-[#74777f]">Send an enterprise hub invitation</p>
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
            <label className="block font-semibold text-[#1a1c1c] mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jessica Alba"
              className="w-full px-3 py-2 bg-white border border-[#c4c6cf] rounded-lg text-sm text-[#1a1c1c] focus:border-[#0061a5] focus:ring-2 focus:ring-[#66affe]/20 outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#1a1c1c] mb-1">Work Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@proworkflow.com"
              className="w-full px-3 py-2 bg-white border border-[#c4c6cf] rounded-lg text-sm text-[#1a1c1c] focus:border-[#0061a5] focus:ring-2 focus:ring-[#66affe]/20 outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#1a1c1c] mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-[#c4c6cf] rounded-lg text-xs font-medium text-[#1a1c1c] focus:border-[#0061a5] outline-hidden"
              >
                <option value="Engineering">Engineering</option>
                <option value="Design">Design</option>
                <option value="Product">Product</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#1a1c1c] mb-1">Role Title</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Frontend Dev"
                className="w-full px-3 py-2 bg-white border border-[#c4c6cf] rounded-lg text-xs text-[#1a1c1c] focus:border-[#0061a5] outline-hidden"
              />
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
              className="px-5 py-2 text-xs font-semibold bg-[#0061a5] hover:bg-[#002045] text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
