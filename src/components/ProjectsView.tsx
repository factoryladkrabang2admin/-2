import React, { useState, useMemo } from 'react';
import { Project, ProjectStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Plus, 
  Filter, 
  ArrowUpDown, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  Search,
  Users
} from 'lucide-react';

interface ProjectsViewProps {
  projects: Project[];
  searchQuery: string;
  onCreateProject: () => void;
  onSelectProject: (project: Project) => void;
  onUpdateStatus: (projectId: string, newStatus: ProjectStatus) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  searchQuery,
  onCreateProject,
  onSelectProject,
  onUpdateStatus,
  onDeleteProject,
}) => {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('Newest');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'Newest') return b.id.localeCompare(a.id);
      if (sortBy === 'Oldest') return a.id.localeCompare(b.id);
      if (sortBy === 'Name (A-Z)') return a.name.localeCompare(b.name);
      if (sortBy === 'Progress') return b.progress - a.progress;
      return 0;
    });

    return result;
  }, [projects, searchQuery, statusFilter, sortBy]);

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'In Progress':
        return (
          <span className="px-2.5 py-1 bg-blue-100 text-[#0061a5] text-xs font-semibold rounded uppercase tracking-wider">
            {t.inProgress}
          </span>
        );
      case 'Review':
        return (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded uppercase tracking-wider">
            {t.inReview}
          </span>
        );
      case 'Completed':
        return (
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded uppercase tracking-wider">
            {t.completed}
          </span>
        );
      case 'Planning':
        return (
          <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded uppercase tracking-wider">
            {t.planning}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  const getProgressBarColor = (status: ProjectStatus) => {
    switch (status) {
      case 'In Progress':
        return 'bg-[#3182ce]';
      case 'Review':
        return 'bg-amber-500';
      case 'Completed':
        return 'bg-emerald-500';
      case 'Planning':
        return 'bg-purple-500';
      default:
        return 'bg-[#3182ce]';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1c] tracking-tight">
            {t.projectsTitle}
          </h2>
          <p className="text-sm text-[#43474e] mt-1">
            {t.projectsSubtitle}
          </p>
        </div>

        <button
          onClick={onCreateProject}
          className="bg-[#0061a5] hover:bg-[#004d84] text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4" />
          {t.createProject}
        </button>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter */}
        <div className="relative">
          <Filter className="w-4 h-4 text-[#74777f] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2 bg-white border border-[#c4c6cf] rounded-md text-sm text-[#1a1c1c] font-medium focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20 focus:outline-hidden appearance-none cursor-pointer card-shadow"
          >
            <option value="All">{t.allStatus}</option>
            <option value="In Progress">{t.inProgress}</option>
            <option value="Review">{t.inReview}</option>
            <option value="Completed">{t.completed}</option>
            <option value="Planning">{t.planning}</option>
          </select>
        </div>

        {/* Sort Filter */}
        <div className="relative">
          <ArrowUpDown className="w-4 h-4 text-[#74777f] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="pl-9 pr-8 py-2 bg-white border border-[#c4c6cf] rounded-md text-sm text-[#1a1c1c] font-medium focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20 focus:outline-hidden appearance-none cursor-pointer card-shadow"
          >
            <option value="Newest">{t.sortBy}: {t.newest}</option>
            <option value="Oldest">{t.sortBy}: {t.oldest}</option>
            <option value="Name (A-Z)">{t.sortBy}: {t.nameAZ}</option>
            <option value="Progress">{t.sortBy}: {t.progress}</option>
          </select>
        </div>

        {/* Count summary */}
        <div className="ml-auto text-xs font-medium text-[#74777f] hidden sm:block">
          {filteredProjects.length} / {projects.length}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center card-shadow">
          <div className="w-12 h-12 rounded-full bg-[#f3f3f4] flex items-center justify-center mx-auto text-[#74777f] mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#1a1c1c]">{t.noOrdersFound}</h3>
          <p className="text-sm text-[#74777f] mt-1 max-w-sm mx-auto">
            {t.noOrdersDesc}
          </p>
          <button
            onClick={() => {
              setStatusFilter('All');
            }}
            className="mt-4 text-xs font-semibold text-[#0061a5] hover:underline cursor-pointer"
          >
            {t.allStatus}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project)}
              className="bg-white rounded-xl border border-[#c4c6cf]/80 card-shadow p-6 flex flex-col hover:border-[#3182ce]/70 transition-all cursor-pointer group relative"
            >
              {/* Card Top: Badge and Actions */}
              <div className="flex justify-between items-start mb-4">
                {getStatusBadge(project.status)}

                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === project.id ? null : project.id);
                    }}
                    className="text-[#74777f] hover:text-[#1a1c1c] p-1 rounded-md hover:bg-[#f3f3f4] transition-all opacity-80 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Context Menu */}
                  {activeMenuId === project.id && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                        }}
                      />
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-6 w-44 bg-white rounded-lg shadow-xl border border-[#e2e8f0] py-1.5 z-40 text-xs"
                      >
                        <p className="px-3 py-1 text-[10px] font-bold text-[#74777f] uppercase">
                          {t.allStatus}
                        </p>
                        <button
                          onClick={() => {
                            onUpdateStatus(project.id, 'In Progress');
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-left text-[#1a1c1c] hover:bg-[#f3f3f4] flex items-center justify-between"
                        >
                          {t.inProgress}
                          {project.status === 'In Progress' && <Check className="w-3.5 h-3.5 text-[#0061a5]" />}
                        </button>
                        <button
                          onClick={() => {
                            onUpdateStatus(project.id, 'Review');
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-left text-[#1a1c1c] hover:bg-[#f3f3f4] flex items-center justify-between"
                        >
                          {t.inReview}
                          {project.status === 'Review' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                        </button>
                        <button
                          onClick={() => {
                            onUpdateStatus(project.id, 'Completed');
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-left text-[#1a1c1c] hover:bg-[#f3f3f4] flex items-center justify-between"
                        >
                          {t.completed}
                          {project.status === 'Completed' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </button>
                        <div className="border-t border-[#f3f3f4] my-1" />
                        <button
                          onClick={() => {
                            onDeleteProject(project.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-left text-[#ba1a1a] hover:bg-[#ffdad6]/40 flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t.delete}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-semibold text-[#1a1c1c] mb-2 group-hover:text-[#0061a5] transition-colors leading-snug">
                {project.name}
              </h3>
              <p className="text-xs text-[#43474e] line-clamp-2 mb-6 leading-relaxed flex-1">
                {project.description}
              </p>

              {/* Progress Bar */}
              <div className="mt-auto">
                <div className="flex justify-between text-xs font-medium text-[#43474e] mb-1.5">
                  <span>{t.progress}</span>
                  <span className="font-semibold text-[#1a1c1c]">{project.progress}%</span>
                </div>
                <div className="w-full bg-[#e2e2e2] rounded-full h-1.5 mb-4 overflow-hidden">
                  <div
                    className={`${getProgressBarColor(project.status)} h-1.5 rounded-full transition-all duration-500`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>

                {/* Footer: Avatars & Due Date */}
                <div className="flex justify-between items-center border-t border-[#c4c6cf]/40 pt-3.5">
                  {/* Team Avatars */}
                  <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
                    {project.members.map((member, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-8 rounded-full border-2 border-white bg-[#f3f3f4] overflow-hidden shrink-0 relative shadow-xs"
                        title={member.name}
                      >
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[#002045] bg-[#d2e4ff]">
                            {member.initials || member.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                    ))}
                    {(project.totalMembersCount || project.members.length) > project.members.length && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-[#e8e8e8] flex items-center justify-center text-[11px] font-bold text-[#43474e] shadow-xs">
                        +{(project.totalMembersCount || 0) - project.members.length}
                      </div>
                    )}
                  </div>

                  {/* Due Date Badge */}
                  {project.status === 'Completed' ? (
                    <span className="text-xs font-medium text-[#43474e] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {project.dueDate}
                    </span>
                  ) : project.isOverdue ? (
                    <span className="text-xs font-semibold text-[#ba1a1a] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {project.dueDate}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-[#43474e] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#74777f]" />
                      {project.dueDate}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
