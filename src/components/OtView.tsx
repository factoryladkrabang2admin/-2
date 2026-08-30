import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  BarChart3, 
  List, 
  LayoutGrid, 
  Columns, 
  CalendarDays,
  CheckCircle2, 
  AlertCircle, 
  User, 
  Building2, 
  Calendar, 
  X, 
  Layers, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileText,
  Timer,
  UserCheck,
  ShieldCheck,
  Lock,
  LogIn,
  KeyRound,
  Eye,
  BadgeAlert,
  ArrowRight
} from 'lucide-react';
import { OtRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  fetchGoogleSheetOtRecords, 
  getCachedOtRecords,
  OT_SHEET_URL,
  formatOtHoursDisplay
} from '../services/googleSheetSyncService';
import { 
  AdminUserAccount, 
  isUserAdminOrSupervisor, 
  getUserEmployeeId,
  isOtRecordMatchedToUser
} from '../data/mockData';
import { OtDetailModal } from './OtDetailModal';
import { OtAnalyticsModal } from './OtAnalyticsModal';
import { OtCalendarView } from './OtCalendarView';
import { OtFilterModal } from './OtFilterModal';

const STORAGE_KEY = 'proworkflow_ot_records_cache_v2';
const BACKGROUND_POLL_INTERVAL_MS = 20000;
const TABLE_ITEMS_PER_PAGE = 20;
const CARD_ITEMS_PER_PAGE = 6;

// Helper to parse dates
function parseOtDate(dateStr?: string): Date | null {
  if (!dateStr || !dateStr.trim() || dateStr === '-') return null;
  const clean = dateStr.trim();
  const parts = clean.split(/[-/.]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    else if (year > 2500) year -= 543;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

interface OtViewProps {
  currentUser?: AdminUserAccount;
  isAuthenticated?: boolean;
  onOpenLogin?: () => void;
}

export const OtView: React.FC<OtViewProps> = ({
  currentUser,
  isAuthenticated = true,
  onOpenLogin,
}) => {
  const { language } = useLanguage();

  // State: Raw records from Google Sheet / in-memory cache
  const [allRecords, setAllRecords] = useState<OtRecord[]>(() => {
    const cached = getCachedOtRecords();
    if (cached && cached.length > 0) return cached;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedAdminEmployeeFilter, setSelectedAdminEmployeeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Unauthenticated employee verification input
  const [verifyEmpIdInput, setVerifyEmpIdInput] = useState<string>('');
  const [activeVerifiedEmpId, setActiveVerifiedEmpId] = useState<string>('');

  // View mode: 'grid' (การ์ด - ค่าเริ่มต้น) | 'table' (รายการ) | 'board' (กระดาน) | 'calendar' (ปฏิทิน)
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'board' | 'calendar'>('grid');
  const [selectedRecord, setSelectedRecord] = useState<OtRecord | null>(null);

  // Pagination
  const [tableCurrentPage, setTableCurrentPage] = useState<number>(1);
  const [cardCurrentPage, setCardCurrentPage] = useState<number>(1);

  // Modals
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  // Sorting
  const [sortBy, setSortBy] = useState<'seq_desc' | 'seq_asc' | 'hours_desc' | 'date_desc'>('seq_desc');

  // Role & Permissions Determination
  const isAdmin = useMemo(() => {
    return isUserAdminOrSupervisor(currentUser, isAuthenticated);
  }, [currentUser, isAuthenticated]);

  const loggedInEmployeeId = useMemo(() => {
    return isAuthenticated ? getUserEmployeeId(currentUser) : '';
  }, [currentUser, isAuthenticated]);

  // Effective employee ID to filter by when user is regular staff
  const currentEffectiveEmpId = useMemo(() => {
    if (isAdmin) return '';
    if (!isAuthenticated) return '';
    if (loggedInEmployeeId) return loggedInEmployeeId;
    if (activeVerifiedEmpId) return activeVerifiedEmpId.trim().toUpperCase();
    return '';
  }, [isAdmin, isAuthenticated, loggedInEmployeeId, activeVerifiedEmpId]);

  // Can access Google Sheet link
  const canAccessGoogleSheet = isAdmin;

  // Ultra-fast Google Sheet data fetcher
  const loadData = async (forceRefresh = false) => {
    if (forceRefresh || allRecords.length === 0) {
      setIsLoading(true);
    }
    try {
      const result = await fetchGoogleSheetOtRecords({ forceRefresh });
      if (result.success && result.records.length > 0) {
        setAllRecords(result.records);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(result.records));
        } catch {
          // ignore
        }
      }
    } catch {
      // Keep existing data quietly
    } finally {
      setIsLoading(false);
    }
  };

  // Immediate fast load on mount + continuous background polling
  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => loadData(false), BACKGROUND_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // 1. Permission-Scoped Records:
  // - Admin: gets all records (or filtered by admin employee selector)
  // - Regular Authenticated Employee: gets ONLY records where employeeId matches their registered ID
  // - Guest / Not Authenticated: gets empty array
  const permissionScopedRecords = useMemo(() => {
    if (isAdmin) {
      if (selectedAdminEmployeeFilter !== 'all') {
        return allRecords.filter(r => (r.employeeId || '').toUpperCase() === selectedAdminEmployeeFilter.toUpperCase());
      }
      return allRecords;
    }

    if (!isAuthenticated) {
      return [];
    }

    // Regular Employee: MUST match registered/active employee ID
    if (currentEffectiveEmpId) {
      return allRecords.filter(r => {
        return isOtRecordMatchedToUser(r, currentUser, currentEffectiveEmpId);
      });
    }

    // Unverified: no records shown until logged in and verified
    return [];
  }, [allRecords, isAdmin, isAuthenticated, selectedAdminEmployeeFilter, currentEffectiveEmpId, currentUser]);

  // Unique departments from permission-scoped records
  const availableDepartments = useMemo(() => {
    const depts = new Set<string>();
    permissionScopedRecords.forEach((r) => {
      if (r.department && r.department !== '-' && r.department !== 'ทั่วไป') {
        depts.add(r.department);
      }
    });
    return Array.from(depts);
  }, [permissionScopedRecords]);

  // Unique employees list for Admin filtering
  const allUniqueEmployees = useMemo(() => {
    if (!isAdmin) return [];
    const empMap = new Map<string, { id: string; name: string; dept: string }>();
    allRecords.forEach(r => {
      if (r.employeeId && r.employeeId !== '-') {
        const cleanId = r.employeeId.trim().toUpperCase();
        if (!empMap.has(cleanId)) {
          empMap.set(cleanId, {
            id: cleanId,
            name: r.employeeName || cleanId,
            dept: r.department || 'ทั่วไป'
          });
        }
      }
    });
    return Array.from(empMap.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [isAdmin, allRecords]);

  // 2. Base Filtered Records (based on search query, department, admin employee filter, date range)
  const baseFilteredRecords = useMemo(() => {
    let list = [...permissionScopedRecords];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((r) => {
        const name = (r.employeeName || '').toLowerCase();
        const empId = (r.employeeId || '').toLowerCase();
        const dept = (r.department || '').toLowerCase();
        const docNo = (r.docNo || '').toLowerCase();
        const otDate = (r.otDate || '').toLowerCase();
        const note = (r.note || '').toLowerCase();
        return (
          name.includes(q) ||
          empId.includes(q) ||
          dept.includes(q) ||
          docNo.includes(q) ||
          otDate.includes(q) ||
          note.includes(q)
        );
      });
    }

    // Department filter
    if (selectedDepartment !== 'all') {
      list = list.filter((r) => r.department === selectedDepartment);
    }

    // Date range filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      list = list.filter((r) => {
        const d = parseOtDate(r.otDate) || parseOtDate(r.recordedDate);
        return d && d >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter((r) => {
        const d = parseOtDate(r.otDate) || parseOtDate(r.recordedDate);
        return d && d <= end;
      });
    }

    return list;
  }, [permissionScopedRecords, searchQuery, selectedDepartment, startDate, endDate]);

  // Statistics KPI calculated from filtered records (reflects Department, Date range, Search)
  const { totalCount, totalHours, approvedCount, confirmCount } = useMemo(() => {
    const totalCount = baseFilteredRecords.length;
    let totalHours = 0;
    let approvedCount = 0;
    let confirmCount = 0;

    baseFilteredRecords.forEach((r) => {
      totalHours += r.totalHours || 0;
      if (r.status.toLowerCase().includes('approved') || r.status.includes('อนุมัติ')) {
        approvedCount++;
      } else if (r.status.toLowerCase().includes('confirm') || r.status.includes('ยืนยัน')) {
        confirmCount++;
      }
    });

    return {
      totalCount,
      totalHours: Math.round(totalHours * 10) / 10,
      approvedCount,
      confirmCount,
    };
  }, [baseFilteredRecords]);

  // 3. Filtered & Sorted Records based on Status and Sorting criteria
  const filteredRecords = useMemo(() => {
    let list = [...baseFilteredRecords];

    // Status filter
    if (selectedStatus !== 'all') {
      list = list.filter((r) => {
        if (selectedStatus === 'Approved') {
          return r.status.toLowerCase().includes('approved') || r.status.includes('อนุมัติ');
        }
        if (selectedStatus === 'Confirm') {
          return r.status.toLowerCase().includes('confirm') || r.status.includes('ยืนยัน');
        }
        return r.status === selectedStatus;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'seq_desc') return b.seq - a.seq;
      if (sortBy === 'seq_asc') return a.seq - b.seq;
      if (sortBy === 'hours_desc') return (b.totalHours || 0) - (a.totalHours || 0);
      if (sortBy === 'date_desc') {
        const da = parseOtDate(a.otDate) || new Date(0);
        const db = parseOtDate(b.otDate) || new Date(0);
        return db.getTime() - da.getTime();
      }
      return 0;
    });

    return list;
  }, [baseFilteredRecords, selectedStatus, sortBy]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedStatus !== 'all') count++;
    if (selectedDepartment !== 'all') count++;
    if (selectedAdminEmployeeFilter !== 'all') count++;
    if (startDate || endDate) count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [selectedStatus, selectedDepartment, selectedAdminEmployeeFilter, startDate, endDate, searchQuery]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedDepartment('all');
    setSelectedAdminEmployeeFilter('all');
    setStartDate('');
    setEndDate('');
    setTableCurrentPage(1);
    setCardCurrentPage(1);
  };

  const handleVerifyEmpIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      if (onOpenLogin) onOpenLogin();
      return;
    }
    if (!verifyEmpIdInput.trim()) return;
    setActiveVerifiedEmpId(verifyEmpIdInput.trim().toUpperCase());
  };

  // Pagination for Table View
  const tableTotalPages = Math.max(1, Math.ceil(filteredRecords.length / TABLE_ITEMS_PER_PAGE));
  const paginatedTableRecords = useMemo(() => {
    const start = (tableCurrentPage - 1) * TABLE_ITEMS_PER_PAGE;
    return filteredRecords.slice(start, start + TABLE_ITEMS_PER_PAGE);
  }, [filteredRecords, tableCurrentPage]);

  // Pagination for Card Grid View
  const cardTotalPages = Math.max(1, Math.ceil(filteredRecords.length / CARD_ITEMS_PER_PAGE));
  const paginatedCardRecords = useMemo(() => {
    const start = (cardCurrentPage - 1) * CARD_ITEMS_PER_PAGE;
    return filteredRecords.slice(start, start + CARD_ITEMS_PER_PAGE);
  }, [filteredRecords, cardCurrentPage]);

  // Reset pagination on filter change
  useEffect(() => {
    setTableCurrentPage(1);
    setCardCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedDepartment, selectedAdminEmployeeFilter, startDate, endDate, sortBy]);

  // Is user not logged in or not verified yet?
  const isUnverifiedGuest = !isAdmin && (!isAuthenticated || (!loggedInEmployeeId && !activeVerifiedEmpId));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Banner with Medium Yellow & White Moving Animated Gradient & Floating OT Icons */}
      <div className="animated-ot-yellow-header rounded-3xl p-6 sm:p-7 text-[#713f12] shadow-xl border border-yellow-200/80 relative overflow-hidden space-y-5">
        {/* Floating Ambient Glow Orbs */}
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-amber-300/40 rounded-full blur-3xl pointer-events-none animate-orb-1" />
        <div className="absolute -bottom-12 -right-12 w-72 h-72 bg-yellow-300/35 rounded-full blur-3xl pointer-events-none animate-orb-2" />

        {/* Animated Floating OT / Clock Icons in Background */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none overflow-hidden select-none">
          {/* 1. Main Large Floating Clock */}
          <Clock className="w-40 h-40 sm:w-52 sm:h-52 animate-custom-float text-amber-700 opacity-20 absolute right-4 sm:right-12 top-1/2 -translate-y-1/2 stroke-[1.5]" />
          {/* 2. Floating Timer */}
          <Timer className="w-24 h-24 sm:w-28 sm:h-28 animate-tool-spin text-yellow-700 opacity-20 absolute right-24 sm:right-40 bottom-1 stroke-[1.5]" />
          {/* 3. Floating User OT Approval */}
          <UserCheck className="w-20 h-20 rotate-12 animate-custom-float-rev text-amber-800 opacity-15 absolute right-36 sm:right-56 top-2 hidden md:block stroke-[1.5]" />
          {/* 4. Subtle Sparkle Accents */}
          <Sparkles className="w-6 h-6 text-amber-500 animate-pulse absolute left-12 top-6 opacity-60" />
          <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse absolute left-28 bottom-4 opacity-50" />
        </div>

        {/* Top Header Row */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-md border border-amber-200 shadow-md flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-amber-700 animate-pulse" />
              <Sparkles className="w-3.5 h-3.5 text-amber-500 absolute -top-1 -right-1" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#713f12] drop-shadow-xs">
                  {language === 'th' ? 'ตรวจสอบ OT' : 'OT Verification & Records'}
                </h1>
                {isAdmin ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{language === 'th' ? 'ผู้ดูแลระบบ (Admin)' : 'Admin Full Access'}</span>
                  </span>
                ) : currentEffectiveEmpId ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                    <User className="w-3.5 h-3.5 text-amber-700" />
                    <span>{language === 'th' ? `พนักงานรหัส ${currentEffectiveEmpId}` : `Staff ID: ${currentEffectiveEmpId}`}</span>
                  </span>
                ) : null}
              </div>
              <p className="text-xs sm:text-sm text-amber-900/80 mt-0.5">
                {isAdmin 
                  ? (language === 'th' ? 'สิทธิ์ผู้ดูแลระบบ: สามารถมองเห็นและจัดการข้อมูล OT ของพนักงานทุกคน' : 'Administrator mode: Full access to all staff overtime records')
                  : (language === 'th' ? 'สิทธิ์การมองเห็น: เฉพาะพนักงานที่ลงทะเบียนและตรงกับรหัสพนักงาน (มองเห็นเฉพาะของตนเอง)' : 'Personal access: Showing your own overtime records matching your registered employee ID')}
              </p>
            </div>
          </div>

          {/* Action Buttons Toolbar in Header */}
          <div className="relative z-20 flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
            {/* 1. ปุ่มสถิติและการวิเคราะห์ (Statistics & Analytics Donut Charts - แสดงแค่ไอคอน) */}
            <button
              id="ot-analytics-btn"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowAnalyticsModal(true);
              }}
              className="p-2.5 rounded-xl bg-white/85 hover:bg-white text-amber-950 border border-amber-200/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
              title={language === 'th' ? 'สถิติและการวิเคราะห์' : 'Analytics & Charts'}
              aria-label={language === 'th' ? 'สถิติและการวิเคราะห์' : 'Analytics & Charts'}
            >
              <BarChart3 className="w-5 h-5 text-amber-700 stroke-[2]" />
            </button>

            {/* 2. ลิงก์ Google Sheet (Admin Only) */}
            {canAccessGoogleSheet && (
              <a
                href={OT_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-white/85 hover:bg-white text-emerald-800 border border-amber-200/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
                title={language === 'th' ? 'เปิดดู Google Sheet บันทึก OT' : 'Open OT Google Sheet'}
                aria-label="Google Sheet"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
              </a>
            )}

            {/* 3. ตัวกรองการค้นหา (Filter Modal) */}
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={`p-2.5 rounded-xl border backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center relative shadow-xs ${
                activeFiltersCount > 0
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md ring-2 ring-amber-300'
                  : 'bg-white/85 hover:bg-white text-amber-950 border-amber-200/80'
              }`}
              title={language === 'th' ? `ตัวกรองและการค้นหา (${activeFiltersCount} ตัวกรอง)` : 'Filters & Search'}
              aria-label="Filters"
            >
              <Filter className="w-5 h-5" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* 5. สลับมุมมอง (View Switcher: รายการ Table -> การ์ด Grid -> กระดาน Board -> ปฏิทิน Calendar) */}
            <div className="flex items-center bg-white/85 p-1 rounded-xl backdrop-blur-md border border-amber-200/80 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'text-amber-900 hover:text-black hover:bg-amber-100/50'
                }`}
                title={language === 'th' ? 'มุมมองรายการ (List / Table)' : 'List / Table View'}
              >
                <List className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'text-amber-900 hover:text-black hover:bg-amber-100/50'
                }`}
                title={language === 'th' ? 'มุมมองการ์ด (Grid / Card)' : 'Grid / Card View'}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'board'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'text-amber-900 hover:text-black hover:bg-amber-100/50'
                }`}
                title={language === 'th' ? 'มุมมองกระดานสถานะ (Board View)' : 'Board View'}
              >
                <Columns className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'text-amber-900 hover:text-black hover:bg-amber-100/50'
                }`}
                title={language === 'th' ? 'มุมมองปฏิทิน (Calendar View)' : 'Calendar View'}
              >
                <CalendarDays className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Admin Quick Employee Switcher (Shown ONLY for Admins) */}
        {isAdmin && allUniqueEmployees.length > 0 && (
          <div className="relative z-10 pt-2 border-t border-amber-200/60 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-bold text-[#713f12]">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{language === 'th' ? 'โหมดผู้ดูแลระบบ: กรองดูข้อมูลพนักงาน' : 'Admin Filter by Staff:'}</span>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-md">
              <select
                value={selectedAdminEmployeeFilter}
                onChange={(e) => setSelectedAdminEmployeeFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white/95 border border-amber-300 text-xs font-semibold text-[#713f12] outline-hidden focus:ring-2 focus:ring-amber-400 shadow-2xs"
              >
                <option value="all">
                  {language === 'th' ? `พนักงานทุกคนในระบบ (${allRecords.length} รายการทั้งหมด)` : `All Employees (${allRecords.length} total records)`}
                </option>
                {allUniqueEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    รหัส {emp.id} - {emp.name} ({emp.dept})
                  </option>
                ))}
              </select>

              {selectedAdminEmployeeFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedAdminEmployeeFilter('all')}
                  className="px-2.5 py-1.5 rounded-xl bg-white text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-all shrink-0 cursor-pointer"
                >
                  {language === 'th' ? 'ดูทุกคน' : 'Show All'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Integrated Metric KPI Cards Row */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-3 border-t border-amber-200/60">
          {/* Card 1: ทั้งหมด */}
          <div 
            onClick={() => setSelectedStatus('all')}
            className={`p-4 rounded-2xl backdrop-blur-md border transition-all cursor-pointer ${
              selectedStatus === 'all'
                ? 'bg-white/95 border-sky-400 shadow-md ring-2 ring-sky-300 scale-[1.02]'
                : 'bg-white/75 hover:bg-white/90 border-sky-200/80 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-sky-900 text-xs font-bold mb-1.5">
              <span>{language === 'th' ? 'รายการ OT ที่แสดง' : 'OT Records'}</span>
              <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
                <Layers className="w-4 h-4 text-sky-800" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-[#002045]">{totalCount}</p>
            <span className="text-[11px] text-sky-800/80">
              {isAdmin 
                ? (language === 'th' ? 'รายการสะสมของระบบ' : 'Total system records') 
                : (language === 'th' ? 'รายการของคุณ' : 'Your personal records')}
            </span>
          </div>

          {/* Card 2: ชั่วโมง OT รวม -> Opens Donut Chart Modal */}
          <div 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowAnalyticsModal(true);
            }}
            className="p-4 rounded-2xl backdrop-blur-md border transition-all cursor-pointer bg-white/75 hover:bg-white/95 border-sky-200/80 shadow-xs hover:border-emerald-400 hover:shadow-md hover:scale-[1.02]"
            title={language === 'th' ? 'คลิกเพื่อดูสถิติและการวิเคราะห์กราฟวงกลม' : 'Click to view Donut Charts Analytics'}
          >
            <div className="flex items-center justify-between text-emerald-900 text-xs font-bold mb-1.5">
              <span>{language === 'th' ? 'ชั่วโมง OT รวม' : 'Total OT Hours'}</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-800">{totalHours}</p>
            <span className="text-[11px] text-emerald-700/90 flex items-center gap-1">
              <span>{language === 'th' ? 'คลิกดูกราฟวงกลม' : 'Click for Donut Chart'}</span>
              <Sparkles className="w-3 h-3 text-emerald-600" />
            </span>
          </div>

          {/* Card 3: Approved */}
          <div 
            onClick={() => setSelectedStatus('Approved')}
            className={`p-4 rounded-2xl backdrop-blur-md border transition-all cursor-pointer ${
              selectedStatus === 'Approved'
                ? 'bg-emerald-50/95 border-emerald-400 shadow-md ring-2 ring-emerald-300 scale-[1.02]'
                : 'bg-white/75 hover:bg-white/90 border-sky-200/80 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-900 text-xs font-bold mb-1.5">
              <span>{language === 'th' ? 'อนุมัติแล้ว (Approved)' : 'Approved'}</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-800">{approvedCount}</p>
            <span className="text-[11px] text-emerald-700/90">{language === 'th' ? 'อนุมัติเรียบร้อย' : 'Approved'}</span>
          </div>

          {/* Card 4: Confirm */}
          <div 
            onClick={() => setSelectedStatus('Confirm')}
            className={`p-4 rounded-2xl backdrop-blur-md border transition-all cursor-pointer ${
              selectedStatus === 'Confirm'
                ? 'bg-amber-50/95 border-amber-400 shadow-md ring-2 ring-amber-300 scale-[1.02]'
                : 'bg-white/75 hover:bg-white/90 border-sky-200/80 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-amber-900 text-xs font-bold mb-1.5">
              <span>{language === 'th' ? 'รอยืนยัน (Confirm)' : 'Confirm'}</span>
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-800">{confirmCount}</p>
            <span className="text-[11px] text-amber-700/90">{language === 'th' ? 'รอยืนยัน' : 'Pending confirmation'}</span>
          </div>
        </div>
      </div>

      {/* 2. Employee Verification Box for Unauthenticated / Guest Users */}
      {isUnverifiedGuest && (
        <div className="bg-gradient-to-r from-sky-50 via-white to-blue-50 rounded-3xl p-6 border-2 border-sky-200 shadow-md space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-[#002045]">
                  {language === 'th' ? 'ระบบรักษาความเป็นส่วนตัว: ตรวจสอบข้อมูล OT ของคุณ' : 'Privacy Protection: Verify your OT Records'}
                </h3>
                {!isAuthenticated && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
                    <Lock className="w-3 h-3 text-amber-700" />
                    <span>{language === 'th' ? 'ต้องเข้าสู่ระบบก่อน' : 'Sign In Required'}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'th'
                  ? 'ตามนโยบายความปลอดภัย การตรวจสอบโอทีจำเป็นต้องเข้าสู่ระบบก่อน จึงจะสามารถค้นหาด้วยรหัสพนักงานได้ โดยสามารถมองเห็นได้เฉพาะข้อมูลของตนเอง (ผู้ดูแลระบบสามารถเข้าถึงได้ทั้งหมด)'
                  : 'According to security policy, signing in is strictly required before you can search by Employee ID. Records are visible only to the verified employee.'}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-sky-100 flex flex-col sm:flex-row items-center gap-3">
            <form onSubmit={handleVerifyEmpIdSubmit} className="flex items-center gap-2 w-full sm:w-auto flex-1">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserCheck className="w-4 h-4 text-sky-700" />
                </div>
                <input
                  type="text"
                  value={verifyEmpIdInput}
                  onChange={(e) => setVerifyEmpIdInput(e.target.value)}
                  disabled={!isAuthenticated}
                  onClick={!isAuthenticated ? onOpenLogin : undefined}
                  placeholder={
                    !isAuthenticated
                      ? (language === 'th' ? '🔒 กรุณาเข้าสู่ระบบก่อนค้นหาด้วยรหัสพนักงาน' : '🔒 Sign in required to search by ID')
                      : (language === 'th' ? 'กรอกรหัสพนักงาน เช่น 102456 หรือ EMP01' : 'Enter Employee ID e.g. 102456')
                  }
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-mono font-bold transition-all shadow-2xs outline-hidden ${
                    !isAuthenticated
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-pointer'
                      : 'bg-white text-[#002045] border-sky-300 focus:ring-2 focus:ring-sky-400'
                  }`}
                />
              </div>
              <button
                type={isAuthenticated ? "submit" : "button"}
                onClick={!isAuthenticated ? onOpenLogin : undefined}
                disabled={!isAuthenticated && !onOpenLogin}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  !isAuthenticated
                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-600 border border-slate-300'
                    : 'bg-sky-700 hover:bg-sky-800 text-white'
                }`}
                title={!isAuthenticated ? (language === 'th' ? 'กรุณาเข้าสู่ระบบก่อนจึงจะสามารถกดค้นหาได้' : 'Please sign in first') : undefined}
              >
                {!isAuthenticated ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{language === 'th' ? 'เข้าสู่ระบบเพื่อค้นหา' : 'Login to Search'}</span>
                  </>
                ) : (
                  <span>{language === 'th' ? 'ตรวจสอบข้อมูล' : 'Verify ID'}</span>
                )}
              </button>
            </form>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-400 hidden sm:inline">{language === 'th' ? 'หรือ' : 'or'}</span>
              <button
                type="button"
                onClick={onOpenLogin}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#002045] hover:bg-[#003366] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{language === 'th' ? 'เข้าสู่ระบบ / ลงทะเบียน' : 'Sign In / Register'}</span>
              </button>
            </div>
          </div>

          {!isAuthenticated && (
            <div className="flex items-center gap-2 text-[11px] font-medium text-amber-800 bg-amber-50/90 px-3.5 py-2 rounded-xl border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {language === 'th'
                  ? 'ระบบรักษาความเป็นส่วนตัว: หากยังไม่ล็อกอิน จะไม่สามารถกดค้นหาข้อมูล OT ด้วยรหัสพนักงานได้ กรุณาเข้าสู่ระบบก่อนดำเนินการ'
                  : 'Privacy Protection: OT search by Employee ID is disabled until you sign in. Please sign in to continue.'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. Logged-in Staff Status Banner (When viewing own records) */}
      {!isAdmin && currentEffectiveEmpId && (
        <div className="bg-sky-50/90 rounded-2xl p-3.5 border border-sky-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#002045]">
                {language === 'th' ? 'กำลังแสดงข้อมูล OT ส่วนตัวของคุณ' : 'Showing your personal OT records'}
              </p>
              <p className="text-[11px] text-sky-800">
                {currentUser?.name ? `คุณ ${currentUser.name} • ` : ''}รหัสพนักงาน: <strong>{currentEffectiveEmpId}</strong> ({filteredRecords.length} รายการที่ตรงกัน)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeVerifiedEmpId && !loggedInEmployeeId && (
              <button
                type="button"
                onClick={() => {
                  setActiveVerifiedEmpId('');
                  setVerifyEmpIdInput('');
                }}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
              >
                {language === 'th' ? 'เปลี่ยนรหัสพนักงาน' : 'Change ID'}
              </button>
            )}
            {onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-3 py-1.5 rounded-xl bg-[#002045] hover:bg-[#003366] text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                {isAuthenticated ? (language === 'th' ? 'สลับบัญชี' : 'Switch Account') : (language === 'th' ? 'เข้าสู่ระบบ' : 'Sign In')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Active Filter Indicators */}
      {activeFiltersCount > 0 && (
        <div className="bg-sky-50/90 rounded-2xl p-3.5 border border-sky-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#002045] flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-sky-700" />
              {language === 'th' ? `ผลการกรอง (${filteredRecords.length} รายการ):` : `Filtered (${filteredRecords.length} records):`}
            </span>

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-sky-200 text-xs font-semibold text-sky-900 shadow-2xs">
                <span>{language === 'th' ? 'ค้นหา:' : 'Search:'} "{searchQuery}"</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-red-500 cursor-pointer ml-0.5 p-0.5"
                  title="Remove search"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-sky-200 text-xs font-semibold text-sky-900 shadow-2xs">
                <span>{language === 'th' ? 'สถานะ:' : 'Status:'} {selectedStatus}</span>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('all')}
                  className="hover:text-red-500 cursor-pointer ml-0.5 p-0.5"
                  title="Remove status filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedDepartment !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-sky-200 text-xs font-semibold text-sky-900 shadow-2xs">
                <span>{language === 'th' ? 'ฝ่าย:' : 'Dept:'} {selectedDepartment}</span>
                <button
                  type="button"
                  onClick={() => setSelectedDepartment('all')}
                  className="hover:text-red-500 cursor-pointer ml-0.5 p-0.5"
                  title="Remove department filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedAdminEmployeeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-sky-200 text-xs font-semibold text-sky-900 shadow-2xs">
                <span>{language === 'th' ? 'พนักงาน:' : 'Staff ID:'} {selectedAdminEmployeeFilter}</span>
                <button
                  type="button"
                  onClick={() => setSelectedAdminEmployeeFilter('all')}
                  className="hover:text-red-500 cursor-pointer ml-0.5 p-0.5"
                  title="Remove employee filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-sky-200 text-xs font-semibold text-sky-900 shadow-2xs">
                <span>{startDate || '...'} ถึง {endDate || '...'}</span>
                <button
                  type="button"
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="hover:text-red-500 cursor-pointer ml-0.5 p-0.5"
                  title="Remove date filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className="text-xs font-bold text-sky-800 hover:text-sky-950 underline cursor-pointer"
            >
              {language === 'th' ? 'แก้ไขตัวกรอง' : 'Edit Filters'}
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
            >
              {language === 'th' ? 'ล้างทั้งหมด' : 'Clear All'}
            </button>
          </div>
        </div>
      )}

      {/* 5. Main Views Rendering */}
      {isUnverifiedGuest ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-sky-100 text-sky-700 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-[#002045]">
            {language === 'th' ? 'กรุณาเข้าสู่ระบบเพื่อตรวจสอบข้อมูล OT' : 'Please Sign In to Access OT Records'}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
            {language === 'th'
              ? 'ตามนโยบายความปลอดภัยและความเป็นส่วนตัวของพนักงาน การตรวจสอบและค้นหาโอทีจำเป็นต้องเข้าสู่ระบบก่อน จึงจะสามารถค้นหาด้วยรหัสพนักงานและเข้าถึงข้อมูล OT ได้'
              : 'According to security and privacy policy, signing in is required to search by Employee ID and access your overtime records.'}
          </p>
          <button
            type="button"
            onClick={onOpenLogin}
            className="px-6 py-2.5 rounded-xl bg-[#002045] hover:bg-[#003366] text-white text-xs font-bold shadow-md cursor-pointer transition-all inline-flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{language === 'th' ? 'เข้าสู่ระบบด้วยชื่อผู้ใช้ / รหัสพนักงาน' : 'Sign In with Credentials'}</span>
          </button>
        </div>
      ) : (
        <>
          {viewMode === 'calendar' && (
            <OtCalendarView records={filteredRecords} onSelectRecord={(r) => setSelectedRecord(r)} />
          )}

          {viewMode === 'board' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Column 1: Approved */}
              <div className="bg-slate-50/80 rounded-3xl p-5 border border-slate-200 flex flex-col space-y-4 min-h-[500px]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <h2 className="font-bold text-[#002045] text-base">Approved (อนุมัติแล้ว)</h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    {filteredRecords.filter(r => r.status.toLowerCase().includes('approved') || r.status.includes('อนุมัติ')).length}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 max-h-[650px] pr-1">
                  {filteredRecords
                    .filter(r => r.status.toLowerCase().includes('approved') || r.status.includes('อนุมัติ'))
                    .map((r) => (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRecord(r)}
                        className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-sky-300 hover:shadow-md transition-all cursor-pointer space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-[#002045]">{r.employeeName}</h4>
                          <span className="px-2 py-0.5 rounded-lg bg-sky-100 text-sky-900 font-bold text-xs">
                            {formatOtHoursDisplay(r.startTime, r.endTime, r.totalHours)} ชม.
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{r.department}</span>
                          <span>• รหัส {r.employeeId}</span>
                        </p>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                          <span>{r.otDate}</span>
                          <span className="font-semibold text-sky-800">{r.startTime} - {r.endTime} น.</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Column 2: Confirm */}
              <div className="bg-slate-50/80 rounded-3xl p-5 border border-slate-200 flex flex-col space-y-4 min-h-[500px]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <h2 className="font-bold text-[#002045] text-base">Confirm (รอยืนยัน)</h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                    {filteredRecords.filter(r => r.status.toLowerCase().includes('confirm') || r.status.includes('ยืนยัน')).length}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 max-h-[650px] pr-1">
                  {filteredRecords
                    .filter(r => r.status.toLowerCase().includes('confirm') || r.status.includes('ยืนยัน'))
                    .map((r) => (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRecord(r)}
                        className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-[#002045]">{r.employeeName}</h4>
                          <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">
                            {formatOtHoursDisplay(r.startTime, r.endTime, r.totalHours)} ชม.
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{r.department}</span>
                          <span>• รหัส {r.employeeId}</span>
                        </p>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                          <span>{r.otDate}</span>
                          <span className="font-semibold text-amber-800">{r.startTime} - {r.endTime} น.</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'grid' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {paginatedCardRecords.map((r) => {
                  const isApproved = r.status.toLowerCase().includes('approved') || r.status.includes('อนุมัติ');
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRecord(r)}
                      className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-sky-300 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between space-y-4 group relative overflow-hidden"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-[#002045] text-xs font-mono font-bold">
                            รหัส {r.employeeId}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                            isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                            {r.status}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-bold text-base text-[#002045] group-hover:text-sky-700 transition-colors">
                            {r.employeeName}
                          </h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{r.department}</span>
                          </p>
                        </div>

                        <div className="bg-sky-50/80 rounded-2xl p-3 border border-sky-100 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-sky-900 font-medium">{language === 'th' ? 'วันที่ทำ OT:' : 'OT Date:'}</span>
                            <span className="font-bold text-[#002045]">{r.otDate}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-sky-900 font-medium">{language === 'th' ? 'เวลาทำงาน:' : 'Time:'}</span>
                            <span className="font-bold text-sky-800">{r.startTime} - {r.endTime} น.</span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-sky-200/60">
                            <span className="text-sky-900 font-medium">{language === 'th' ? 'รวมเวลา OT:' : 'Total Hours:'}</span>
                            <span className="font-black text-sky-950">{formatOtHoursDisplay(r.startTime, r.endTime, r.totalHours)} {language === 'th' ? 'ชม.' : 'hrs'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>{language === 'th' ? 'เลขที่เอกสาร:' : 'Doc No:'} <strong className="text-slate-700 font-mono">{r.docNo}</strong></span>
                        <span className="text-sky-700 font-semibold group-hover:underline">
                          {language === 'th' ? 'ดูรายละเอียด' : 'View details'} →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination for Card View */}
              {cardTotalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-500">
                    {language === 'th' 
                      ? `แสดงหน้า ${cardCurrentPage} จากทั้งหมด ${cardTotalPages} หน้า (${filteredRecords.length} รายการ)`
                      : `Page ${cardCurrentPage} of ${cardTotalPages} (${filteredRecords.length} records)`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={cardCurrentPage <= 1}
                      onClick={() => setCardCurrentPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={cardCurrentPage >= cardTotalPages}
                      onClick={() => setCardCurrentPage(p => Math.min(cardTotalPages, p + 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === 'table' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md overflow-hidden flex flex-col space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-[#002045] font-bold text-xs uppercase tracking-wider">
                      <th className="py-3.5 px-4">วันที่ทำ OT</th>
                      <th className="py-3.5 px-4">รหัสพนักงาน</th>
                      <th className="py-3.5 px-4">ชื่อ - นามสกุล</th>
                      <th className="py-3.5 px-4">ฝ่ายงาน</th>
                      <th className="py-3.5 px-4">เวลาปฏิบัติงาน</th>
                      <th className="py-3.5 px-4 text-center">ชั่วโมง</th>
                      <th className="py-3.5 px-4">เลขที่เอกสาร</th>
                      <th className="py-3.5 px-4 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedTableRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <div className="space-y-1">
                            <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                            <p className="font-semibold">{language === 'th' ? 'ไม่พบข้อมูล OT ที่ตรงกับเงื่อนไข' : 'No OT records found'}</p>
                            {!isAdmin && currentEffectiveEmpId && (
                              <p className="text-xs text-slate-400">
                                {language === 'th' 
                                  ? `ไม่พบข้อมูลสำหรับรหัสพนักงาน ${currentEffectiveEmpId}` 
                                  : `No records for employee ID ${currentEffectiveEmpId}`}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedTableRecords.map((r) => {
                        const isApproved = r.status.toLowerCase().includes('approved') || r.status.includes('อนุมัติ');
                        return (
                          <tr
                            key={r.id}
                            onClick={() => setSelectedRecord(r)}
                            className="hover:bg-sky-50/60 transition-colors cursor-pointer"
                          >
                            <td className="py-3 px-4 font-semibold text-[#002045] whitespace-nowrap">
                              {r.otDate}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                              {r.employeeId}
                            </td>
                            <td className="py-3 px-4 font-bold text-[#002045] whitespace-nowrap">
                              {r.employeeName}
                            </td>
                            <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold">
                                {r.department}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                              {r.startTime} - {r.endTime} น.
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 font-bold text-xs">
                                {formatOtHoursDisplay(r.startTime, r.endTime, r.totalHours)}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                              {r.docNo}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Controls */}
              {tableTotalPages > 1 && (
                <div className="p-4 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    {language === 'th'
                      ? `แสดง ${(tableCurrentPage - 1) * TABLE_ITEMS_PER_PAGE + 1} - ${Math.min(tableCurrentPage * TABLE_ITEMS_PER_PAGE, filteredRecords.length)} จากทั้งหมด ${filteredRecords.length} รายการ`
                      : `Showing ${(tableCurrentPage - 1) * TABLE_ITEMS_PER_PAGE + 1} - ${Math.min(tableCurrentPage * TABLE_ITEMS_PER_PAGE, filteredRecords.length)} of ${filteredRecords.length} records`}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={tableCurrentPage <= 1}
                      onClick={() => setTableCurrentPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
                    >
                      {language === 'th' ? 'ก่อนหน้า' : 'Previous'}
                    </button>

                    {Array.from({ length: Math.min(5, tableTotalPages) }, (_, idx) => {
                      let pageNum = idx + 1;
                      if (tableTotalPages > 5) {
                        if (tableCurrentPage > 3) {
                          pageNum = tableCurrentPage - 3 + idx;
                        }
                        if (pageNum > tableTotalPages) {
                          pageNum = tableTotalPages - 4 + idx;
                        }
                      }
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setTableCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            tableCurrentPage === pageNum
                              ? 'bg-[#002045] text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      disabled={tableCurrentPage >= tableTotalPages}
                      onClick={() => setTableCurrentPage(p => Math.min(tableTotalPages, p + 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
                    >
                      {language === 'th' ? 'ถัดไป' : 'Next'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 6. Modals */}
      <OtDetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />

      <OtAnalyticsModal
        isOpen={showAnalyticsModal}
        records={permissionScopedRecords}
        allRecords={allRecords}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        onClose={() => setShowAnalyticsModal(false)}
      />

      <OtFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        departments={availableDepartments}
        selectedDepartment={selectedDepartment}
        onSelectDepartment={setSelectedDepartment}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onResetFilters={handleResetFilters}
        activeFiltersCount={activeFiltersCount}
      />
    </div>
  );
};
