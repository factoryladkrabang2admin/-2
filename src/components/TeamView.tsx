import React, { useState, useMemo } from 'react';
import { TeamMember } from '../types';
import { TEAM_RECENT_ACTIVITIES } from '../data/mockData';
import { 
  UserPlus, 
  LayoutGrid, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical,
  Mail,
  Shield,
  Activity,
  CheckCircle,
  Clock,
  MinusCircle,
  XCircle,
  ExternalLink
} from 'lucide-react';

interface TeamViewProps {
  teamMembers: TeamMember[];
  searchQuery: string;
  onInviteMember: () => void;
  onSelectMember?: (member: TeamMember) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({
  teamMembers,
  searchQuery,
  onInviteMember,
  onSelectMember,
}) => {
  const [departmentTab, setDepartmentTab] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [page, setPage] = useState<number>(1);
  const itemsPerPage = 6;

  // Filter members
  const filteredMembers = useMemo(() => {
    let result = [...teamMembers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          (m.name || '').toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q) ||
          (m.role || '').toLowerCase().includes(q) ||
          (m.department || '').toLowerCase().includes(q)
      );
    }

    if (departmentTab !== 'All') {
      result = result.filter((m) => m.department === departmentTab);
    }

    return result;
  }, [teamMembers, searchQuery, departmentTab]);

  // Online members list for the side widget
  const onlineMembers = teamMembers.filter((m) => m.isOnline || m.status === 'Online');

  // Pagination calculation
  const totalEntries = 24; // Aesthetic full enterprise total
  const startIndex = (page - 1) * itemsPerPage + 1;
  const endIndex = Math.min(startIndex + filteredMembers.length - 1, totalEntries);

  const getStatusDot = (status: string = '', statusType: string = '') => {
    const s = (status || '').toLowerCase();
    const st = (statusType || '').toLowerCase();
    if (s.includes('online')) {
      return (
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] inline-block" />
          <span className="text-xs text-[#43474e]">Online</span>
        </span>
      );
    }
    if (s.includes('disturb') || st === 'dnd') {
      return (
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a] inline-block" />
          <span className="text-xs text-[#43474e]">Do Not Disturb</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#74777f] inline-block" />
        <span className="text-xs text-[#43474e]">{status || 'Offline'}</span>
      </span>
    );
  };

  const getAvatarBadgeDot = (status: string = '', statusType: string = '') => {
    const s = (status || '').toLowerCase();
    const st = (statusType || '').toLowerCase();
    if (s.includes('online')) {
      return 'bg-[#0061a5]';
    }
    if (s.includes('disturb') || st === 'dnd') {
      return 'bg-[#ba1a1a]';
    }
    return 'bg-[#74777f]';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1c] tracking-tight">
            Team Directory
          </h2>
          <p className="text-sm text-[#43474e] mt-1">
            Manage roles, view status, and track recent activity.
          </p>
        </div>

        <button
          onClick={onInviteMember}
          className="bg-[#0061a5] hover:bg-[#002045] text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-98"
        >
          <UserPlus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {/* Main Grid: 8 Cols for Roster, 4 Cols for Side Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Roster Area (Spans 8 cols on LG) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Department Tabs & View Mode Switcher */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-2 flex items-center gap-2 overflow-x-auto card-shadow">
            <button
              onClick={() => setDepartmentTab('All')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                departmentTab === 'All'
                  ? 'bg-[#d2e4ff]/60 text-[#001d37]'
                  : 'text-[#43474e] hover:bg-[#f3f3f4]'
              }`}
            >
              All Members (24)
            </button>
            <button
              onClick={() => setDepartmentTab('Engineering')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                departmentTab === 'Engineering'
                  ? 'bg-[#d2e4ff]/60 text-[#001d37]'
                  : 'text-[#43474e] hover:bg-[#f3f3f4]'
              }`}
            >
              Engineering
            </button>
            <button
              onClick={() => setDepartmentTab('Design')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                departmentTab === 'Design'
                  ? 'bg-[#d2e4ff]/60 text-[#001d37]'
                  : 'text-[#43474e] hover:bg-[#f3f3f4]'
              }`}
            >
              Design
            </button>
            <button
              onClick={() => setDepartmentTab('Product')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                departmentTab === 'Product'
                  ? 'bg-[#d2e4ff]/60 text-[#001d37]'
                  : 'text-[#43474e] hover:bg-[#f3f3f4]'
              }`}
            >
              Product
            </button>

            {/* View Mode Toggle */}
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#f3f3f4] text-[#1a1c1c]'
                    : 'text-[#74777f] hover:bg-[#f3f3f4]'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#f3f3f4] text-[#1a1c1c]'
                    : 'text-[#74777f] hover:bg-[#f3f3f4]'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Roster List / Table */}
          {viewMode === 'list' ? (
            <div className="bg-white rounded-xl border border-[#e2e8f0] card-shadow overflow-hidden flex flex-col">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b border-[#e2e8f0] bg-[#f9f9f9] text-[11px] font-semibold text-[#43474e] uppercase tracking-wider">
                <div className="col-span-6 sm:col-span-5">Member</div>
                <div className="col-span-3 hidden sm:block">Role</div>
                <div className="col-span-3 hidden md:block">Status</div>
                <div className="col-span-6 sm:col-span-4 md:col-span-1 text-right">Actions</div>
              </div>

              {/* Member Rows */}
              <div className="divide-y divide-[#e2e8f0]/60">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-[#f9f9f9] transition-colors items-center group cursor-pointer"
                  >
                    {/* Member Name + Avatar */}
                    <div className="col-span-6 sm:col-span-5 flex items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-[#e8e8e8] border border-[#c4c6cf]/40 shadow-2xs">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#ffddba] text-[#2b1700] text-xs font-bold">
                              {member.initials || member.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        {/* Status dot pinned to avatar */}
                        <div
                          className={`absolute bottom-0 right-0 w-3 h-3 ${getAvatarBadgeDot(
                            member.status,
                            member.statusType
                          )} rounded-full border-2 border-white`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1a1c1c] truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-[#74777f] truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    {/* Role Pill */}
                    <div className="col-span-3 hidden sm:flex items-center">
                      <span className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider ${member.roleBadgeClass || 'bg-[#f3f3f4] text-[#43474e]'}`}>
                        {member.role}
                      </span>
                    </div>

                    {/* Status with dot */}
                    <div className="col-span-3 hidden md:flex items-center">
                      {getStatusDot(member.status, member.statusType)}
                    </div>

                    {/* Actions */}
                    <div className="col-span-6 sm:col-span-4 md:col-span-1 flex justify-end">
                      <button className="text-[#74777f] hover:text-[#002045] p-1.5 rounded hover:bg-[#f3f3f4] opacity-70 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table Pagination */}
              <div className="px-6 py-4 border-t border-[#e2e8f0] bg-[#f9f9f9] flex items-center justify-between">
                <span className="text-xs text-[#43474e]">
                  Showing 1 to {filteredMembers.length} of {totalEntries} entries
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded hover:bg-[#f3f3f4] text-[#74777f] disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 rounded hover:bg-[#f3f3f4] text-[#1a1c1c]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-white rounded-xl border border-[#e2e8f0] card-shadow p-5 flex flex-col justify-between hover:border-[#0061a5]/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-[#e8e8e8] border border-[#c4c6cf]/40">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#ffddba] text-[#2b1700] text-sm font-bold">
                            {member.initials || member.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${getAvatarBadgeDot(
                          member.status,
                          member.statusType
                        )} rounded-full border-2 border-white`}
                      />
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${member.roleBadgeClass || 'bg-[#f3f3f4] text-[#43474e]'}`}>
                      {member.department}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#1a1c1c]">{member.name}</h4>
                    <p className="text-xs text-[#0061a5] font-medium">{member.role}</p>
                    <p className="text-xs text-[#74777f] truncate mt-1">{member.email}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#f3f3f4] flex items-center justify-between">
                    {getStatusDot(member.status, member.statusType)}
                    <span className="text-[11px] text-[#74777f]">
                      {member.projectsAssigned || 3} projects
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side Widgets (Spans 4 cols on LG) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Online Now Widget */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] card-shadow p-6">
            <h3 className="text-base font-bold text-[#1a1c1c] mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
              Online Now
            </h3>

            <div className="flex flex-wrap gap-3 items-center">
              {/* Online Avatar 1 (A. Chen) */}
              <div className="relative group cursor-pointer">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white ring-2 ring-[#0061a5]/30">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCh_XeAFLbzqsEG3UWc-4xebzYI68BWctgrYs8YqZ8f0B3yxkc3t75OAaiDUn02y1KZ-Z3Kwe0LTA7R7ZvUHoI2yc8RqD62jeDsFxVTWlEgrBfLitKpQlIZCuCzeAAV1tVaQcD9qn9cvSv2Zdw7fEPZZqPulwhdygqNIF1GIAXxc_0xw0Vwt3sapbA1-jpNmJh--eVAnl1uOBUzZjC7x3VvQWBwZZhim0TWayYQrmmaDkco7_wLvc2-yg"
                    alt="Amanda Chen"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#2f3131] text-white px-2 py-1 rounded text-[11px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-md">
                  A. Chen
                </div>
              </div>

              {/* Online Avatar 2 (DevOps) */}
              <div className="relative group cursor-pointer">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white ring-2 ring-[#0061a5]/30">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHOD4574EUKmbXNqZH-p1Zjar5xm2qEC4P82hGRj2vRtmAxNlm6ABWeChfUEvm2AoLv0gcJb4UGG3kEkYSBDnpmELRXNrCxV9YOyQZROm5JI43DiGLqOc6W3mRJ5MS_zoAg7dVZIo72CBo6ZJcHpn81Dyl4RXvRGe7HZxC4NeHpomZZVDJMDrvsC1U4eqEQMq5AxxcJbe1dgWsQoYox5TxaZ9QCZgR-40akuseDK0-HEinMDEhxcO84w"
                    alt="DevOps Specialist"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#2f3131] text-white px-2 py-1 rounded text-[11px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-md">
                  DevOps Engineer
                </div>
              </div>

              {/* Online Avatar 3 (JD Initial) */}
              <div className="relative group cursor-pointer">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white ring-2 ring-[#0061a5]/30 bg-[#1a365d] text-[#86a0cd] flex items-center justify-center font-bold text-xs">
                  JD
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#2f3131] text-white px-2 py-1 rounded text-[11px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-md">
                  Jonathan Drake
                </div>
              </div>

              {/* Plus 4 counter */}
              <div className="w-10 h-10 rounded-full border border-dashed border-[#c4c6cf] flex items-center justify-center text-[#74777f] text-xs font-semibold hover:bg-[#f9f9f9] cursor-pointer transition-colors">
                +4
              </div>
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] card-shadow p-6 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#e2e8f0]/60 pb-3 mb-4">
              <h3 className="text-base font-bold text-[#1a1c1c]">
                Recent Activity
              </h3>
              <button className="text-xs font-semibold text-[#0061a5] hover:text-[#002045] transition-colors">
                View All
              </button>
            </div>

            <div className="relative pl-5 border-l-2 border-[#e2e8f0] space-y-6">
              {TEAM_RECENT_ACTIVITIES.map((act) => (
                <div key={act.id} className="relative">
                  {/* Circle Marker on the line */}
                  <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-[#0061a5] ring-4 ring-white" />
                  <p className="text-xs text-[#1a1c1c] leading-relaxed">
                    <span className="font-semibold">{act.user}</span> {act.action}{' '}
                    <span className={act.highlightClass}>{act.target}</span>
                  </p>
                  <p className="text-[11px] text-[#74777f] mt-0.5">{act.time}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[#f3f3f4] text-center">
              <span className="text-[11px] text-[#74777f] flex items-center justify-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#10b981]" />
                Live team telemetry synced
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
