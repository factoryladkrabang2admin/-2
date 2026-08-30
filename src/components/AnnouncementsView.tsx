import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AnnouncementItem } from '../types';
import { 
  Megaphone, 
  Search, 
  Calendar as CalendarIcon, 
  Building2, 
  Clock, 
  Sparkles, 
  LayoutGrid, 
  List, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Bell,
  Radio,
  Newspaper,
  Volume2,
  Pin,
  PinOff,
  ShieldCheck,
  Check,
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { AnnouncementDetailModal } from './AnnouncementDetailModal';
import { AdminUserAccount, isUserAdminOrSupervisor } from '../data/mockData';
import { realtimeHub } from '../services/realtimeService';
import { parseAnnouncementDate, sortAnnouncementsLatestFirst, ANNOUNCEMENTS_SHEET_URL } from '../services/googleSheetSyncService';

interface AnnouncementsViewProps {
  announcements: AnnouncementItem[];
  searchQuery?: string;
  onSelectAnnouncement?: (item: AnnouncementItem) => void;
  currentUser?: AdminUserAccount | null;
  isAuthenticated?: boolean;
}

// Helper to format department names according to selected language
export const formatDepartmentName = (dept: string, language: 'th' | 'en'): string => {
  if (!dept) return '';
  if (language === 'th') return dept;

  const mapping: Record<string, string> = {
    'ทรัพยากรบุคคล': 'Human Resources (HR)',
    'ฝ่ายทรัพยากรบุคคล': 'Human Resources Department',
    'ฝ่ายบุคคล': 'Human Resources (HR)',
    'HR': 'Human Resources (HR)',
    'ความปลอดภัยและสิ่งแวดล้อม': 'Safety & Environment (SHE)',
    'ฝ่ายความปลอดภัย': 'Safety Department (SHE)',
    'จป.': 'Safety & Health Office',
    'เทคโนโลยีสารสนเทศ': 'Information Technology (IT)',
    'ฝ่ายไอที': 'Information Technology (IT)',
    'IT': 'Information Technology (IT)',
    'ธุรการ': 'General Administration',
    'ฝ่ายธุรการ': 'General Administration Dept.',
    'ธุรการโรงงาน': 'Factory Administration',
    'ธุรการ ลาดกระบัง 2': 'Ladkrabang 2 Admin',
    'ฝ่ายผลิต': 'Production Department',
    'การผลิต': 'Production Department',
    'ฝ่ายซ่อมบำรุง': 'Maintenance & Engineering',
    'ซ่อมบำรุง': 'Maintenance & Engineering',
    'วิศวกรรม': 'Engineering Department',
    'บัญชีและการเงิน': 'Accounting & Finance',
    'ฝ่ายบัญชี': 'Accounting Department',
    'ฝ่ายการเงิน': 'Finance Department',
    'จัดซื้อ': 'Procurement / Purchasing',
    'ฝ่ายจัดซื้อ': 'Procurement Department',
    'ฝ่ายขาย': 'Sales Department',
    'การตลาด': 'Marketing Department',
    'คลังสินค้า': 'Warehouse & Logistics',
    'โลจิสติกส์': 'Logistics & Supply Chain',
    'บริหารงานคุณภาพ': 'Quality Assurance (QA/QC)',
    'ควบคุมคุณภาพ': 'Quality Control (QC)',
    'สวัสดิการ': 'Employee Welfare Committee',
    'สำนักงานใหญ่': 'Corporate Headquarters',
    'ผู้บริหาร': 'Executive Management Office',
    'คณะกรรมการความปลอดภัย': 'Safety Committee (JorPor)',
  };

  const trimmed = dept.trim();
  if (mapping[trimmed]) return mapping[trimmed];

  for (const [thaiKey, enVal] of Object.entries(mapping)) {
    if (trimmed.includes(thaiKey)) return enVal;
  }

  return dept;
};

const ITEMS_PER_PAGE = 6;

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
  announcements: rawAnnouncements = [],
  searchQuery: externalSearchQuery = '',
  onSelectAnnouncement,
  currentUser,
  isAuthenticated = false,
}) => {
  const { t, language } = useLanguage();
  const [internalSearch, setInternalSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeModalAnnouncement, setActiveModalAnnouncement] = useState<AnnouncementItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Realtime pin updates trigger
  const [pinRevision, setPinRevision] = useState(0);

  // Check admin/supervisor authority
  const isAdmin = useMemo(() => {
    return isUserAdminOrSupervisor(currentUser, isAuthenticated);
  }, [currentUser, isAuthenticated]);

  // Subscribe to real-time hub updates for pinned announcements
  useEffect(() => {
    const unsubscribe = realtimeHub.subscribe((msg) => {
      if (msg.type === 'SYNC_ALL' && msg.payload?.entity === 'pinned_announcements') {
        setPinRevision((prev) => prev + 1);
      }
    });
    return () => unsubscribe();
  }, []);

  // Combined search term
  const activeSearch = (externalSearchQuery || internalSearch).trim().toLowerCase();

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSearch, selectedDepartment, selectedStatus, viewMode]);

  // Merge announcements with live pin status and sort latest first
  const processedAnnouncements = useMemo(() => {
    const list = rawAnnouncements.map((item) => {
      const pinInfo = realtimeHub.getAnnouncementPinInfo(item);
      return {
        ...item,
        isPinned: pinInfo.isPinned,
        pinnedBy: pinInfo.pinnedBy || item.pinnedBy,
        pinnedAt: pinInfo.pinnedAt || item.pinnedAt,
      };
    });

    return sortAnnouncementsLatestFirst(list);
  }, [rawAnnouncements, pinRevision]);

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    processedAnnouncements.forEach((a) => {
      if (a.department) set.add(a.department);
    });
    return Array.from(set);
  }, [processedAnnouncements]);

  // Filter announcements
  const filteredAnnouncements = useMemo(() => {
    return processedAnnouncements.filter((item) => {
      // 1. Search Query
      if (activeSearch) {
        const matchTitle = item.title.toLowerCase().includes(activeSearch);
        const matchContent = item.content.toLowerCase().includes(activeSearch);
        const matchDept = item.department.toLowerCase().includes(activeSearch);
        const matchDeptEn = formatDepartmentName(item.department, 'en').toLowerCase().includes(activeSearch);
        if (!matchTitle && !matchContent && !matchDept && !matchDeptEn) {
          return false;
        }
      }

      // 2. Department Filter
      if (selectedDepartment !== 'all' && item.department !== selectedDepartment) {
        return false;
      }

      // 3. Status Filter
      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [processedAnnouncements, activeSearch, selectedDepartment, selectedStatus]);

  // Count pinned announcements
  const pinnedCount = useMemo(() => {
    return filteredAnnouncements.filter(a => a.isPinned).length;
  }, [filteredAnnouncements]);

  // Pagination calculation (6 items per page)
  const totalPages = Math.max(1, Math.ceil(filteredAnnouncements.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedAnnouncements = useMemo(() => {
    const startIdx = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredAnnouncements.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredAnnouncements, validCurrentPage]);

  // Pin toggle handler
  const handleTogglePin = useCallback((item: AnnouncementItem) => {
    if (!isAdmin) {
      setToastMessage(t.adminPinOnlyToast);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const adminDisplayName = currentUser?.name || currentUser?.username || (language === 'th' ? 'ผู้ดูแลระบบ' : 'Administrator');
    const result = realtimeHub.togglePinAnnouncement(item, adminDisplayName);
    setPinRevision((prev) => prev + 1);

    // Update active modal item if open
    if (activeModalAnnouncement && (activeModalAnnouncement.id === item.id || activeModalAnnouncement.title === item.title)) {
      setActiveModalAnnouncement({
        ...activeModalAnnouncement,
        isPinned: result.isPinned,
        pinnedBy: result.pinnedBy,
      });
    }

    const shortTitle = item.title.slice(0, 28) + (item.title.length > 28 ? '...' : '');
    if (result.isPinned) {
      setToastMessage(t.adminPinSuccessToast.replace('{title}', shortTitle));
    } else {
      setToastMessage(t.adminUnpinSuccessToast.replace('{title}', shortTitle));
    }
    setTimeout(() => setToastMessage(null), 3500);
  }, [isAdmin, currentUser, activeModalAnnouncement, t, language]);

  const handleOpenDetail = (item: AnnouncementItem) => {
    setActiveModalAnnouncement(item);
    if (onSelectAnnouncement) {
      onSelectAnnouncement(item);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-60 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
            <Pin className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-semibold max-w-sm">{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 ml-2 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Vibrant Animated Rainbow Header with Animated PR Icons */}
      <div className="relative overflow-hidden rounded-3xl animated-rainbow-header text-white p-7 sm:p-9 shadow-2xl border border-white/30">
        {/* Animated Atmospheric Glowing Highlights */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-white/25 rounded-full blur-2xl animate-pr-pulse pointer-events-none" />
        <div className="absolute left-1/3 -bottom-16 w-72 h-72 bg-white/20 rounded-full blur-3xl animate-pr-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

        {/* Floating Animated PR News Icons */}
        <div className="absolute top-4 right-10 pointer-events-none opacity-85 hidden sm:block animate-pr-icon-1">
          <div className="p-3 bg-white/25 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg text-white">
            <Megaphone className="w-7 h-7 text-white drop-shadow-md" />
          </div>
        </div>

        <div className="absolute bottom-4 right-28 pointer-events-none opacity-80 hidden md:block animate-pr-icon-2">
          <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl border border-white/35 shadow-md text-white">
            <Bell className="w-6 h-6 text-yellow-100 drop-shadow-md" />
          </div>
        </div>

        <div className="absolute top-6 right-44 pointer-events-none opacity-75 hidden lg:block animate-pr-icon-3">
          <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl border border-white/35 shadow-md text-white">
            <Radio className="w-5 h-5 text-white drop-shadow-md" />
          </div>
        </div>

        <div className="absolute bottom-5 right-64 pointer-events-none opacity-75 hidden xl:block animate-pr-icon-4">
          <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl border border-white/35 shadow-md text-white">
            <Newspaper className="w-5 h-5 text-white drop-shadow-md" />
          </div>
        </div>

        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none opacity-60 hidden lg:block animate-pr-icon-2" style={{ animationDelay: '1.5s' }}>
          <div className="p-2 bg-white/15 backdrop-blur-md rounded-xl border border-white/30 text-white">
            <Volume2 className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Clean Header Content */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/50 backdrop-blur-md border border-white/70 flex items-center justify-center shadow-xl shrink-0 animate-pr-icon-1">
              <Megaphone className="w-7 h-7 sm:w-8 sm:h-8 text-slate-900" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 drop-shadow-xs flex items-center gap-3">
                <span>{t.announcementsTitle}</span>
              </h1>
              {pinnedCount > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-amber-900 bg-amber-300/80 px-2.5 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-xs">
                    <Pin className="w-3 h-3 fill-amber-900" />
                    <span>{t.pinnedBadge} {pinnedCount} {t.items}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Google Sheets Link Button (เฉพาะผู้ดูแลและแอดมินเพจ - แสดงเฉพาะไอคอน) */}
          {isAdmin && (
            <div className="flex items-center gap-2 self-start sm:self-center">
              <a
                href={ANNOUNCEMENTS_SHEET_URL}
                target="_blank"
                rel="noreferrer"
                className="w-11 h-11 rounded-2xl bg-white/95 hover:bg-white text-emerald-700 hover:text-emerald-900 shadow-md hover:shadow-lg transition-all border border-emerald-300/80 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center group"
                title={language === 'th' ? 'เปิดดู Google Sheet ข่าวประชาสัมพันธ์ (เฉพาะผู้ดูแลและแอดมินเพจ)' : 'Open Announcements Google Sheet (Admin Only)'}
                aria-label="Open Announcements Google Sheet"
              >
                <FileSpreadsheet className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
              placeholder={t.searchAnnouncementsPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-sm text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-blue-500 rounded-xl outline-hidden transition-all focus:ring-2 focus:ring-blue-500/20"
            />
            {internalSearch && (
              <button
                onClick={() => setInternalSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Department & Status Filters & View Mode Toggles */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {/* Department Filter Dropdown */}
            <div className="relative min-w-[180px] flex-1 sm:flex-initial">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full py-2.5 pl-3 pr-8 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none"
              >
                <option value="all">{t.allDepartments} ({departments.length})</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {formatDepartmentName(dept, language)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                ▼
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedStatus === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.statusAll}
              </button>
              <button
                onClick={() => setSelectedStatus('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedStatus === 'active'
                    ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.statusActive}
              </button>
              <button
                onClick={() => setSelectedStatus('upcoming')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedStatus === 'upcoming'
                    ? 'bg-white text-amber-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.statusUpcoming}
              </button>
              <button
                onClick={() => setSelectedStatus('expired')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedStatus === 'expired'
                    ? 'bg-white text-slate-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.statusExpired}
              </button>
            </div>

            {/* View Mode Toggle: Icon only for Card & List */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title={t.viewCard}
                aria-label={t.viewCard}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title={t.viewList}
                aria-label={t.viewList}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Empty State */}
      {filteredAnnouncements.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
            <Megaphone className="w-8 h-8 opacity-60" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">{t.noAnnouncementsFound}</h3>
            <p className="text-xs text-slate-500">
              {t.noAnnouncementsDesc}
            </p>
          </div>
          <button
            onClick={() => {
              setInternalSearch('');
              setSelectedDepartment('all');
              setSelectedStatus('all');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            {t.clearAllFilters}
          </button>
        </div>
      )}

      {/* 4. Grid / Card View (6 items per page) */}
      {viewMode === 'grid' && paginatedAnnouncements.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
          {paginatedAnnouncements.map((item, idx) => {
            return (
              <AnnouncementCard
                key={item.id || idx}
                item={item}
                isAdmin={isAdmin}
                onOpenDetail={() => handleOpenDetail(item)}
                onTogglePin={() => handleTogglePin(item)}
              />
            );
          })}
        </div>
      )}

      {/* 5. List View (6 items per page) */}
      {viewMode === 'list' && paginatedAnnouncements.length > 0 && (
        <div className="space-y-4">
          {paginatedAnnouncements.map((item, idx) => {
            return (
              <AnnouncementListItem
                key={item.id || idx}
                item={item}
                isAdmin={isAdmin}
                onOpenDetail={() => handleOpenDetail(item)}
                onTogglePin={() => handleTogglePin(item)}
              />
            );
          })}
        </div>
      )}

      {/* 6. Pagination Controls (Shown when total items > 6) */}
      {filteredAnnouncements.length > ITEMS_PER_PAGE && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-medium text-slate-600">
            {t.showingPagination} <strong className="text-slate-900 font-bold">{(validCurrentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(validCurrentPage * ITEMS_PER_PAGE, filteredAnnouncements.length)}</strong> {t.fromTotal} <strong className="text-slate-900 font-bold">{filteredAnnouncements.length}</strong> {t.items} ({t.page} {validCurrentPage} {t.ofPage} {totalPages})
          </div>

          <div className="flex items-center gap-1.5">
            {/* First Page */}
            <button
              onClick={() => handlePageChange(1)}
              disabled={validCurrentPage === 1}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title={t.firstPage}
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Prev Page */}
            <button
              onClick={() => handlePageChange(validCurrentPage - 1)}
              disabled={validCurrentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{t.prevPage}</span>
            </button>

            {/* Page Number Buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const isCurrent = pageNum === validCurrentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next Page */}
            <button
              onClick={() => handlePageChange(validCurrentPage + 1)}
              disabled={validCurrentPage === totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>{t.nextPage}</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Page */}
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={validCurrentPage === totalPages}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title={t.lastPage}
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <AnnouncementDetailModal
        isOpen={!!activeModalAnnouncement}
        announcement={activeModalAnnouncement}
        onClose={() => setActiveModalAnnouncement(null)}
        isAdmin={isAdmin}
        onTogglePin={handleTogglePin}
      />
    </div>
  );
};

// ==========================================
// Subcomponent: Grid Card Item (Fits image completely & removes sequence number)
// ==========================================
interface AnnouncementCardProps {
  item: AnnouncementItem;
  isAdmin?: boolean;
  onOpenDetail: () => void;
  onTogglePin?: () => void;
}

const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  item,
  isAdmin = false,
  onOpenDetail,
  onTogglePin,
}) => {
  const { t, language } = useLanguage();
  const [imgError, setImgError] = useState(false);

  const getStatusBadge = () => {
    if (item.status === 'upcoming') {
      return {
        label: t.statusUpcoming,
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
      };
    }
    if (item.status === 'expired') {
      return {
        label: t.statusExpired,
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        dot: 'bg-gray-400',
      };
    }
    return {
      label: t.statusActive,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-500 animate-pulse',
    };
  };

  const status = getStatusBadge();
  const formattedDept = formatDepartmentName(item.department, language);

  return (
    <div 
      onClick={onOpenDetail}
      className={`bg-white rounded-3xl border transition-all duration-300 flex flex-col overflow-hidden group cursor-pointer h-full ${
        item.isPinned 
          ? 'border-amber-400 shadow-md ring-2 ring-amber-400/20 hover:border-amber-500 hover:shadow-xl' 
          : 'border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-300'
      }`}
    >
      {/* Top Image Preview Banner */}
      <div className="relative w-full min-h-[200px] sm:min-h-[220px] max-h-[320px] bg-slate-900/5 flex items-center justify-center overflow-hidden shrink-0 border-b border-slate-100/80">
        {item.imageUrl && !imgError ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            onError={() => setImgError(true)}
            className="w-full h-auto max-h-[320px] object-contain group-hover:scale-[1.015] transition-transform duration-300"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 flex flex-col items-center justify-center p-6 text-center text-white relative">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 transition-transform">
              <Megaphone className="w-7 h-7 text-amber-300" />
            </div>
            <span className="text-xs font-bold text-amber-300/90 tracking-wide uppercase">
              {formattedDept}
            </span>
          </div>
        )}

        {/* Top Badges & Pin Controls */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5">
            {/* Pinned Badge */}
            {item.isPinned && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 flex items-center gap-1.5 shadow-md border border-amber-300">
                <Pin className="w-3.5 h-3.5 fill-amber-950" />
                <span>{t.pinnedBadge}</span>
              </span>
            )}

            {/* Status Badge */}
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 shadow-xs backdrop-blur-xs ${status.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>

          {/* Admin Pin Toggle Button */}
          {isAdmin && onTogglePin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
              }}
              className={`p-2 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1 text-xs font-bold ${
                item.isPinned
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20'
              }`}
              title={item.isPinned ? t.unpinAnnouncementTitle : t.pinAnnouncementTitle}
            >
              <Pin className={`w-3.5 h-3.5 ${item.isPinned ? 'fill-white rotate-45' : ''}`} />
            </button>
          )}
        </div>

        {/* Bottom Department Tag on Image */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs pointer-events-none">
          <span className="inline-flex items-center gap-1.5 font-semibold drop-shadow-md bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-lg">
            <Building2 className="w-3.5 h-3.5 text-amber-300" />
            <span className="truncate max-w-[200px]">{formattedDept}</span>
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          {/* Date Indicator */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>
              {item.startDate}
              {item.endDate ? ` - ${item.endDate}` : ` (${t.onwards})`}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
            {item.title}
          </h3>

          {/* Description Excerpt */}
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
            {item.content}
          </p>
        </div>

        {/* Card Footer (Sequence number "ลำดับที่ #" completely removed as requested) */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium truncate max-w-[150px]">
            {formattedDept}
          </span>

          <div className="inline-flex items-center gap-1 font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
            <span>{t.readFullAnnouncement}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Subcomponent: List Item (Removes sequence number)
// ==========================================
interface AnnouncementListItemProps {
  item: AnnouncementItem;
  isAdmin?: boolean;
  onOpenDetail: () => void;
  onTogglePin?: () => void;
}

const AnnouncementListItem: React.FC<AnnouncementListItemProps> = ({
  item,
  isAdmin = false,
  onOpenDetail,
  onTogglePin,
}) => {
  const { t, language } = useLanguage();
  const [imgError, setImgError] = useState(false);

  const getStatusBadge = () => {
    if (item.status === 'upcoming') {
      return {
        label: t.statusUpcoming,
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
      };
    }
    if (item.status === 'expired') {
      return {
        label: t.statusExpired,
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        dot: 'bg-gray-400',
      };
    }
    return {
      label: t.statusActive,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-500 animate-pulse',
    };
  };

  const status = getStatusBadge();
  const formattedDept = formatDepartmentName(item.department, language);

  return (
    <div
      onClick={onOpenDetail}
      className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 group cursor-pointer ${
        item.isPinned
          ? 'border-amber-400 bg-amber-50/20 shadow-md ring-1 ring-amber-400/30'
          : 'border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300'
      }`}
    >
      {/* Thumbnail or Icon */}
      <div className="w-full sm:w-40 h-36 sm:h-28 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative">
        {item.imageUrl && !imgError ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900 to-indigo-950 flex flex-col items-center justify-center p-3 text-white text-center">
            <Megaphone className="w-6 h-6 text-amber-300 mb-1" />
            <span className="text-[10px] font-bold text-slate-200 truncate max-w-[120px]">
              {formattedDept}
            </span>
          </div>
        )}

        {item.isPinned && (
          <div className="absolute top-2 left-2 bg-amber-400 text-amber-950 p-1.5 rounded-lg shadow-md border border-amber-300">
            <Pin className="w-3.5 h-3.5 fill-amber-950" />
          </div>
        )}
      </div>

      {/* Main Details */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {item.isPinned && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 flex items-center gap-1 border border-amber-300 shadow-2xs">
              <Pin className="w-3 h-3 fill-amber-950" />
              <span>{t.pinnedBadge}</span>
            </span>
          )}
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${status.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 ml-auto">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
            {item.startDate}{item.endDate ? ` - ${item.endDate}` : ` (${t.onwards})`}
          </span>
        </div>

        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
          {item.title}
        </h3>

        <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">
          {item.content}
        </p>

        <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-700">{formattedDept}</span>
        </div>
      </div>

      {/* Right Action & Pin Button */}
      <div className="sm:border-l sm:border-slate-100 sm:pl-4 flex items-center justify-between sm:justify-end gap-2 shrink-0">
        {isAdmin && onTogglePin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
              item.isPinned
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title={item.isPinned ? t.unpinAction : t.pinAction}
          >
            <Pin className={`w-3.5 h-3.5 ${item.isPinned ? 'fill-amber-800 rotate-45' : ''}`} />
          </button>
        )}

        <div className="px-3 py-1.5 rounded-xl bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white font-bold text-xs flex items-center gap-1 transition-all">
          <span>{t.readFullAnnouncement}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
