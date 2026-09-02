import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Filter,
  FileSpreadsheet,
  BarChart3,
  List,
  LayoutGrid,
  Calendar as CalendarIcon,
  Columns3,
  CheckCircle2,
  Clock,
  User,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  CalendarCheck,
  CalendarClock,
  Plane,
  AlertTriangle,
  Briefcase
} from 'lucide-react';
import { DailyWorkSchedule, WorkScheduleStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import {
  fetchGoogleSheetWorkSchedule,
  WORK_SCHEDULE_SHEET_URL
} from '../services/googleSheetSyncService';
import { AdminUserAccount, isUserAdminOrSupervisor } from '../data/mockData';
import { WorkScheduleCalendarView } from './workSchedule/WorkScheduleCalendarView';
import { WorkScheduleBoardView } from './workSchedule/WorkScheduleBoardView';
import { WorkScheduleAnalyticsModal } from './workSchedule/WorkScheduleAnalyticsModal';
import { WorkScheduleFilterModal } from './workSchedule/WorkScheduleFilterModal';
import { WorkScheduleDetailModal } from './workSchedule/WorkScheduleDetailModal';
import { ActivityScheduleModal } from './activitySchedule/ActivityScheduleModal';

const STORAGE_KEY = 'proworkflow_work_schedule_cache_v1';
const BACKGROUND_POLL_INTERVAL_MS = 20000;
const TABLE_ITEMS_PER_PAGE = 15;
const CARD_ITEMS_PER_PAGE = 6;

interface WorkScheduleViewProps {
  currentUser?: AdminUserAccount | null;
  isAuthenticated?: boolean;
}

export const WorkScheduleView: React.FC<WorkScheduleViewProps> = ({
  currentUser,
  isAuthenticated = false,
}) => {
  const { language } = useLanguage();
  const [schedules, setSchedules] = useState<DailyWorkSchedule[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all'); // all, has_leave, weekend_only, weekday_only

  // View mode - Default to 'calendar' as requested
  const [viewMode, setViewMode] = useState<'calendar' | 'table' | 'grid' | 'board'>('calendar');
  const [selectedSchedule, setSelectedSchedule] = useState<DailyWorkSchedule | null>(null);

  // Pagination
  const [tableCurrentPage, setTableCurrentPage] = useState<number>(1);
  const [cardCurrentPage, setCardCurrentPage] = useState<number>(1);

  // Modals
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [showActivityScheduleModal, setShowActivityScheduleModal] = useState<boolean>(false);

  // Sorting
  const [sortBy, setSortBy] = useState<'date_asc' | 'date_desc'>('date_asc');

  const canAccessGoogleSheet = useMemo(() => {
    return isUserAdminOrSupervisor(currentUser, isAuthenticated);
  }, [currentUser, isAuthenticated]);

  // Load data silently
  const loadData = async () => {
    try {
      const result = await fetchGoogleSheetWorkSchedule();
      if (result.success && result.schedules.length > 0) {
        setSchedules(result.schedules);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(result.schedules));
        } catch {
          // ignore
        }
      }
    } catch {
      // Keep existing data quietly
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, BACKGROUND_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Distinct lists for dropdowns
  const dayOptions = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach(s => {
      if (s.dayOfWeek) set.add(s.dayOfWeek);
    });
    return Array.from(set);
  }, [schedules]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach(s => {
      const parts = s.dateStr.split('/');
      if (parts.length === 3) {
        const m = parts[1];
        const y = parts[2];
        set.add(`${m}/${y}`);
      }
    });
    return Array.from(set).sort();
  }, [schedules]);

  const allEmployeesList = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach(s => {
      s.onDutyEmployees.forEach(e => set.add(e.name));
      s.offDutyEmployees.forEach(e => set.add(e.name));
      s.leaveEmployees.forEach(e => set.add(e.name));
    });
    return Array.from(set).sort();
  }, [schedules]);

  // Filter schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(item => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDay = item.dayOfWeek.toLowerCase().includes(q);
        const matchesDate = item.dateStr.toLowerCase().includes(q);
        const matchesFormatted = item.formattedDate.toLowerCase().includes(q);
        const matchesOnDuty = item.onDutyEmployees.some(e => e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q));
        const matchesOffDuty = item.offDutyEmployees.some(e => e.name.toLowerCase().includes(q));
        const matchesLeave = item.leaveEmployees.some(e => e.name.toLowerCase().includes(q) || e.leaveType.toLowerCase().includes(q));

        if (!matchesDay && !matchesDate && !matchesFormatted && !matchesOnDuty && !matchesOffDuty && !matchesLeave) {
          return false;
        }
      }

      // Filter by Day
      if (selectedDay !== 'all' && item.dayOfWeek !== selectedDay) {
        return false;
      }

      // Filter by Month (e.g. 8/2026 or 9/2026)
      if (selectedMonth !== 'all') {
        const parts = item.dateStr.split('/');
        if (parts.length === 3) {
          const mY = `${parts[1]}/${parts[2]}`;
          if (mY !== selectedMonth) return false;
        }
      }

      // Filter by Employee
      if (selectedEmployee !== 'all') {
        const hasEmp = item.onDutyEmployees.some(e => e.name === selectedEmployee) ||
                       item.offDutyEmployees.some(e => e.name === selectedEmployee) ||
                       item.leaveEmployees.some(e => e.name === selectedEmployee);
        if (!hasEmp) return false;
      }

      // Filter by Status focus
      if (selectedStatus === 'has_leave' && item.totalLeaves === 0) {
        return false;
      }
      if (selectedStatus === 'weekend_only' && !['วันเสาร์', 'วันอาทิตย์'].includes(item.dayOfWeek)) {
        return false;
      }
      if (selectedStatus === 'weekday_only' && ['วันเสาร์', 'วันอาทิตย์'].includes(item.dayOfWeek)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') return b.seq - a.seq;
      return a.seq - b.seq;
    });
  }, [schedules, searchQuery, selectedDay, selectedMonth, selectedEmployee, selectedStatus, sortBy]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedDay !== 'all') count++;
    if (selectedMonth !== 'all') count++;
    if (selectedEmployee !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    return count;
  }, [searchQuery, selectedDay, selectedMonth, selectedEmployee, selectedStatus]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDay('all');
    setSelectedMonth('all');
    setSelectedEmployee('all');
    setSelectedStatus('all');
    setSortBy('date_asc');
    setTableCurrentPage(1);
    setCardCurrentPage(1);
  };

  useEffect(() => {
    setTableCurrentPage(1);
    setCardCurrentPage(1);
  }, [searchQuery, selectedDay, selectedMonth, selectedEmployee, selectedStatus, sortBy]);

  // Pagination for Table View
  const tableTotalPages = Math.max(1, Math.ceil(filteredSchedules.length / TABLE_ITEMS_PER_PAGE));
  const validTablePage = Math.min(Math.max(1, tableCurrentPage), tableTotalPages);
  const tableStartIndex = (validTablePage - 1) * TABLE_ITEMS_PER_PAGE;
  const paginatedTableSchedules = useMemo(() => {
    return filteredSchedules.slice(tableStartIndex, tableStartIndex + TABLE_ITEMS_PER_PAGE);
  }, [filteredSchedules, tableStartIndex]);

  // Pagination for Card View
  const cardTotalPages = Math.max(1, Math.ceil(filteredSchedules.length / CARD_ITEMS_PER_PAGE));
  const validCardPage = Math.min(Math.max(1, cardCurrentPage), cardTotalPages);
  const cardStartIndex = (validCardPage - 1) * CARD_ITEMS_PER_PAGE;
  const paginatedCardSchedules = useMemo(() => {
    return filteredSchedules.slice(cardStartIndex, cardStartIndex + CARD_ITEMS_PER_PAGE);
  }, [filteredSchedules, cardStartIndex]);

  // Find today's schedule
  const todaySchedule = useMemo(() => {
    if (schedules.length === 0) return null;
    const now = new Date();
    const d = now.getDate();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();

    const found = schedules.find(s => {
      const parts = s.dateStr.split(/[-/.]/);
      if (parts.length === 3) {
        const sD = parseInt(parts[0], 10);
        const sM = parseInt(parts[1], 10);
        let sY = parseInt(parts[2], 10);
        if (sY > 2500) sY -= 543;
        return sD === d && sM === m && sY === y;
      }
      return false;
    });

    return found || schedules[0] || null;
  }, [schedules]);

  // Today's metrics (คำนวณเป็นจำนวนคนสำหรับวันปัจจุบัน)
  const todayStats = useMemo(() => {
    const totalEmployees = allEmployeesList.length || 10;
    if (!todaySchedule) {
      return {
        todayOnDutyCount: 0,
        totalEmployees,
        todayLeavesAndOffCount: 0,
        todayFormattedDate: 'วันนี้',
      };
    }

    const todayOnDutyCount = todaySchedule.totalOnDuty;
    const todayLeavesAndOffCount = todaySchedule.totalLeaves + todaySchedule.totalOffDuty;

    return {
      todayOnDutyCount,
      totalEmployees,
      todayLeavesAndOffCount,
      todayFormattedDate: todaySchedule.formattedDate,
      dayOfWeek: todaySchedule.dayOfWeek,
    };
  }, [todaySchedule, allEmployeesList]);

  // Overall Stats
  const stats = useMemo(() => {
    let totalDays = schedules.length;
    let totalOnDutyShifts = 0;
    let totalLeavesCount = 0;
    let totalOffDutyCount = 0;

    schedules.forEach(s => {
      totalOnDutyShifts += s.totalOnDuty;
      totalLeavesCount += s.totalLeaves;
      totalOffDutyCount += s.totalOffDuty;
    });

    return {
      totalDays,
      totalOnDutyShifts,
      totalLeavesCount,
      totalOffDutyCount,
      totalEmployees: allEmployeesList.length
    };
  }, [schedules, allEmployeesList]);

  // Helper for Day Badge Color
  const getDayBadge = (day: string) => {
    switch (day) {
      case 'วันจันทร์':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'วันอังคาร':
        return 'bg-pink-100 text-pink-900 border-pink-300';
      case 'วันพุธ':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'วันพฤหัสบดี':
        return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'วันศุกร์':
        return 'bg-sky-100 text-sky-900 border-sky-300';
      case 'วันเสาร์':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'วันอาทิตย์':
        return 'bg-red-100 text-red-900 border-red-300';
      default:
        return 'bg-slate-100 text-slate-900 border-slate-300';
    }
  };

  // Helper for Leave Tag Color
  const getLeaveTag = (leaveType: WorkScheduleStatus) => {
    switch (leaveType) {
      case 'ลาพักร้อน':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ลาป่วย':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ลากิจ':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ขาดงาน':
        return 'bg-red-100 text-red-800 border-red-300 font-bold';
      case 'วันนักขัตฤกษ์':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Banner with Medium Green & White Moving Animated Gradient & Floating Schedule Icons */}
      <div className="animated-schedule-green-header rounded-3xl p-6 sm:p-7 text-[#064e3b] shadow-xl border border-emerald-200/80 relative overflow-hidden space-y-5">
        {/* Floating Ambient Glow Orbs */}
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-emerald-300/40 rounded-full blur-3xl pointer-events-none animate-orb-1" />
        <div className="absolute -bottom-12 -right-12 w-72 h-72 bg-teal-200/40 rounded-full blur-3xl pointer-events-none animate-orb-2" />

        {/* Animated Floating Calendar / Schedule Icons in Background */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none overflow-hidden select-none">
          <CalendarDays className="w-40 h-40 sm:w-52 sm:h-52 animate-custom-float text-emerald-700 opacity-20 absolute right-4 sm:right-12 top-1/2 -translate-y-1/2 stroke-[1.5]" />
          <Clock className="w-24 h-24 sm:w-28 sm:h-28 animate-tool-spin text-teal-700 opacity-20 absolute right-24 sm:right-40 bottom-1 stroke-[1.5]" />
          <CalendarCheck className="w-20 h-20 rotate-12 animate-custom-float-rev text-emerald-800 opacity-15 absolute right-36 sm:right-56 top-2 hidden md:block stroke-[1.5]" />
          <Sparkles className="w-6 h-6 text-amber-500 animate-pulse absolute left-12 top-6 opacity-60" />
          <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse absolute left-28 bottom-4 opacity-50" />
        </div>

        {/* Top Header Row */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-md border border-emerald-200 shadow-md flex items-center justify-center shrink-0">
              <CalendarDays className="w-6 h-6 text-emerald-700 animate-pulse" />
              <Sparkles className="w-3.5 h-3.5 text-amber-500 absolute -top-1 -right-1" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#064e3b] drop-shadow-xs">
                {language === 'th' ? 'ตารางทำงาน' : 'Work Schedule'}
              </h1>
            </div>
          </div>

          {/* Action Buttons Toolbar in Header */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
            {/* 1. ปุ่มสถิติและการวิเคราะห์ (กราฟวงกลม & ข้อมูลรวม) */}
            <button
              type="button"
              onClick={() => setShowAnalyticsModal(true)}
              className="p-2.5 rounded-xl bg-white/85 hover:bg-white text-emerald-950 border border-emerald-200/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs hover:border-emerald-300"
              title={language === 'th' ? 'สถิติและการวิเคราะห์' : 'Analytics & Statistics'}
              aria-label={language === 'th' ? 'สถิติและการวิเคราะห์' : 'Analytics & Statistics'}
            >
              <BarChart3 className="w-5 h-5 text-emerald-700 stroke-[2]" />
            </button>

            {/* 1.5 ไอคอน ตารางกิจกรรม (วางไว้หน้าไอคอน เปิดดู Google sheet - ปรับให้ฟรุ้งฟริ้งและโดดเด่น) */}
            <button
              type="button"
              onClick={() => setShowActivityScheduleModal(true)}
              className="relative p-2.5 rounded-xl bg-gradient-to-tr from-amber-400 via-emerald-500 to-teal-500 hover:from-amber-300 hover:via-emerald-400 hover:to-teal-400 text-white border-2 border-amber-200/90 shadow-md shadow-amber-400/30 hover:shadow-lg hover:shadow-emerald-400/40 backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center group"
              title={language === 'th' ? '✨ ตารางกิจกรรม (คลิกเพื่อดู)' : '✨ Activity Schedule'}
              aria-label={language === 'th' ? 'ตารางกิจกรรม' : 'Activity Schedule'}
            >
              {/* Twinkling sparkle top-right */}
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center pointer-events-none z-10">
                <Sparkles className="w-4 h-4 text-amber-200 fill-amber-300 animate-pulse drop-shadow-[0_2px_6px_rgba(245,158,11,0.6)]" />
              </span>

              {/* Glowing shimmer dot bottom-left */}
              <span className="absolute -bottom-0.5 -left-0.5 flex h-2.5 w-2.5 pointer-events-none z-10">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-200 shadow-xs"></span>
              </span>

              <CalendarClock className="w-5 h-5 text-white stroke-[2.2] group-hover:rotate-6 group-hover:scale-105 transition-transform drop-shadow-sm" />
            </button>

            {/* 2. ลิงก์ Google Sheet */}
            {canAccessGoogleSheet && (
              <a
                href={WORK_SCHEDULE_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-white/85 hover:bg-white text-emerald-800 border border-emerald-200/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
                title={language === 'th' ? 'เปิดดู Google Sheet ตารางทำงาน' : 'Open Google Sheet'}
                aria-label="Google Sheet"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
              </a>
            )}

            {/* 3. ไอคอนตัวกรองการค้นหา */}
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={`p-2.5 rounded-xl border backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center relative shadow-xs hover:border-emerald-300 ${
                activeFiltersCount > 0
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-300'
                  : 'bg-white/85 hover:bg-white text-emerald-950 border border-emerald-200/80'
              }`}
              title={language === 'th' ? (activeFiltersCount > 0 ? `ตัวกรองการค้นหา (${activeFiltersCount})` : 'ตัวกรองการค้นหา') : (activeFiltersCount > 0 ? `Filters (${activeFiltersCount})` : 'Filters')}
              aria-label={language === 'th' ? 'ตัวกรองการค้นหา' : 'Filters'}
            >
              <Filter className={`w-5 h-5 stroke-[2] ${activeFiltersCount > 0 ? 'text-white' : 'text-emerald-700'}`} />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white shadow-xs">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* 4. สลับมุมมอง: 1.รายการ -> 2.การ์ด -> 3.กระดาน -> 4.ปฏิทิน */}
            <div className="flex items-center bg-white/85 backdrop-blur-md rounded-xl p-1 border border-emerald-200/80 shadow-xs">
              {/* 1. มุมมองรายการ (List/Table View) */}
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-emerald-700 text-white shadow-xs font-bold'
                    : 'text-emerald-900 hover:text-emerald-950 hover:bg-emerald-100/50'
                }`}
                title={language === 'th' ? 'มุมมองรายการ' : 'Table/List View'}
              >
                <List className="w-4 h-4" />
              </button>

              {/* 2. มุมมองการ์ด (Grid/Card View) */}
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-emerald-700 text-white shadow-xs font-bold'
                    : 'text-emerald-900 hover:text-emerald-950 hover:bg-emerald-100/50'
                }`}
                title={language === 'th' ? 'มุมมองการ์ด' : 'Grid View'}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              {/* 3. มุมมองกระดาน (Board/Kanban View) */}
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'board'
                    ? 'bg-emerald-700 text-white shadow-xs font-bold'
                    : 'text-emerald-900 hover:text-emerald-950 hover:bg-emerald-100/50'
                }`}
                title={language === 'th' ? 'มุมมองกระดาน' : 'Kanban Board View'}
              >
                <Columns3 className="w-4 h-4" />
              </button>

              {/* 4. มุมมองปฏิทิน (Calendar View) */}
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-emerald-700 text-white shadow-xs font-bold'
                    : 'text-emerald-900 hover:text-emerald-950 hover:bg-emerald-100/50'
                }`}
                title={language === 'th' ? 'มุมมองปฏิทิน' : 'Calendar View'}
              >
                <CalendarIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Metric Pill Summary Bar - 3 Boxes for Current Day */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Box 1: จำนวนวันทำงาน (วันนี้) */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3.5 border border-emerald-200/80 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-emerald-900/70 font-semibold truncate">
                {language === 'th' ? `จำนวนวันทำงาน (${todayStats.dayOfWeek || 'วันนี้'})` : 'Working Staff (Today)'}
              </div>
              <div className="text-xl font-black text-emerald-950">
                {todayStats.todayOnDutyCount} คน
              </div>
            </div>
          </div>

          {/* Box 2: พนักงานในระบบ */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3.5 border border-emerald-200/80 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-emerald-900/70 font-semibold truncate">
                {language === 'th' ? 'พนักงานในระบบ' : 'Staff Count'}
              </div>
              <div className="text-xl font-black text-blue-950">
                {todayStats.totalEmployees} คน
              </div>
            </div>
          </div>

          {/* Box 3: ลา / หยุด (วันนี้) */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3.5 border border-emerald-200/80 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
              <Plane className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-emerald-900/70 font-semibold truncate">
                {language === 'th' ? `ลา / หยุด (${todayStats.dayOfWeek || 'วันนี้'})` : 'Leave / Off (Today)'}
              </div>
              <div className="text-xl font-black text-rose-950">
                {todayStats.todayLeavesAndOffCount} คน
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Filter Chips (if any filter is applied) */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs">
          <span className="font-bold text-amber-900 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            ตัวกรองที่ใช้งาน ({activeFiltersCount}):
          </span>
          {searchQuery && (
            <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 font-medium">
              คำค้น: "{searchQuery}"
            </span>
          )}
          {selectedDay !== 'all' && (
            <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 font-medium">
              วัน: {selectedDay}
            </span>
          )}
          {selectedMonth !== 'all' && (
            <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 font-medium">
              เดือน: {selectedMonth}
            </span>
          )}
          {selectedEmployee !== 'all' && (
            <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 font-medium">
              พนักงาน: {selectedEmployee}
            </span>
          )}
          {selectedStatus !== 'all' && (
            <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 font-medium">
              สถานะ: {selectedStatus === 'has_leave' ? 'เฉพาะวันที่มีคนลา' : selectedStatus === 'weekend_only' ? 'เสาร์-อาทิตย์' : 'จันทร์-ศุกร์'}
            </span>
          )}
          <button
            type="button"
            onClick={handleResetFilters}
            className="ml-auto text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
          >
            ล้างตัวกรอง
          </button>
        </div>
      )}

      {/* 2. Main Content Area according to viewMode */}
      {filteredSchedules.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 mx-auto flex items-center justify-center">
            <CalendarDays className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">
              {language === 'th' ? 'ไม่พบข้อมูลตารางทำงานตามเงื่อนไข' : 'No schedule records match your search'}
            </h3>
            <p className="text-sm text-slate-500">
              {language === 'th' ? 'ลองล้างตัวกรองหรือค้นหาด้วยคำอื่น' : 'Try clearing filters or search with another term'}
            </p>
          </div>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-orange-600 text-white font-medium text-sm hover:bg-orange-700 transition-all shadow-sm cursor-pointer"
            >
              {language === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Clear All Filters'}
            </button>
          )}
        </div>
      ) : viewMode === 'calendar' ? (
        /* 4. CALENDAR VIEW (Default) */
        <WorkScheduleCalendarView
          schedules={filteredSchedules}
          onSelectSchedule={(s) => setSelectedSchedule(s)}
        />
      ) : viewMode === 'board' ? (
        /* 3. KANBAN BOARD VIEW */
        <WorkScheduleBoardView
          schedules={filteredSchedules}
          onSelectSchedule={(s) => setSelectedSchedule(s)}
        />
      ) : viewMode === 'grid' ? (
        /* 2. GRID / CARD VIEW */
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedCardSchedules.map((schedule) => (
              <div
                key={schedule.id}
                onClick={() => setSelectedSchedule(schedule)}
                className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-orange-300 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                {/* Card Top */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-xs font-black border ${getDayBadge(schedule.dayOfWeek)}`}>
                      {schedule.dayOfWeek}
                    </span>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {schedule.formattedDate}
                    </span>
                  </div>

                  {/* Summary counts */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                      <Sun className="w-3.5 h-3.5 text-emerald-600" />
                      เข้างาน {schedule.totalOnDuty} คน
                    </span>
                    {schedule.totalLeaves > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200">
                        <Plane className="w-3.5 h-3.5 text-rose-600" />
                        ลา {schedule.totalLeaves} คน
                      </span>
                    )}
                    {schedule.totalOffDuty > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                        <Moon className="w-3.5 h-3.5 text-slate-500" />
                        หยุด {schedule.totalOffDuty} คน
                      </span>
                    )}
                  </div>

                  {/* On Duty Employees Badges */}
                  <div className="space-y-1.5 pt-2">
                    <div className="text-xs font-bold text-slate-600 flex items-center justify-between">
                      <span>รายชื่อพนักงานเข้ากะ:</span>
                      <span className="text-[11px] text-slate-400 font-normal">คลิกดูทั้งหมด</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-hidden">
                      {schedule.onDutyEmployees.slice(0, 6).map((emp, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 hover:bg-orange-50 border border-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
                        >
                          <User className="w-3 h-3 text-orange-600" />
                          {emp.name}
                          <span className="text-[9px] text-slate-400">({emp.shiftTime.includes('08.00') ? 'เช้า' : 'ปกติ'})</span>
                        </span>
                      ))}
                      {schedule.onDutyEmployees.length > 6 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 text-[11px] font-bold">
                          +{schedule.onDutyEmployees.length - 6} คน
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Leave preview if any */}
                  {schedule.leaveEmployees.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        รายการลา:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {schedule.leaveEmployees.map((l, idx) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border ${getLeaveTag(l.leaveType)}`}
                          >
                            {l.name} ({l.leaveType})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-orange-700 font-semibold group-hover:translate-x-1 transition-transform">
                  <span>ดูรายละเอียดตารางงานวัน</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>

          {/* Card View Pagination */}
          {cardTotalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">
                แสดง {cardStartIndex + 1}-{Math.min(cardStartIndex + CARD_ITEMS_PER_PAGE, filteredSchedules.length)} จาก {filteredSchedules.length} วัน
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={validCardPage <= 1}
                  onClick={() => setCardCurrentPage(p => Math.max(1, p - 1))}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800 px-2">
                  หน้า {validCardPage} / {cardTotalPages}
                </span>
                <button
                  type="button"
                  disabled={validCardPage >= cardTotalPages}
                  onClick={() => setCardCurrentPage(p => Math.min(cardTotalPages, p + 1))}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 1. TABLE / LIST VIEW */
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">วัน / วันที่</th>
                    <th className="py-3.5 px-4">จำนวนเข้างาน</th>
                    <th className="py-3.5 px-4">รายชื่อพนักงานเข้ากะทำงาน</th>
                    <th className="py-3.5 px-4">ลา / หยุด</th>
                    <th className="py-3.5 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedTableSchedules.map((schedule) => (
                    <tr
                      key={schedule.id}
                      onClick={() => setSelectedSchedule(schedule)}
                      className="hover:bg-orange-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${getDayBadge(schedule.dayOfWeek)}`}>
                            {schedule.dayOfWeek}
                          </span>
                          <span className="font-bold text-slate-800">{schedule.formattedDate}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          {schedule.totalOnDuty} คน
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xl">
                          {schedule.onDutyEmployees.map((emp, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200"
                            >
                              <User className="w-3 h-3 text-slate-500" />
                              {emp.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {schedule.leaveEmployees.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {schedule.leaveEmployees.map((l, i) => (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded text-xs border ${getLeaveTag(l.leaveType)}`}
                              >
                                {l.name} ({l.leaveType})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSchedule(schedule);
                          }}
                          className="px-3 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold text-xs border border-orange-200 transition-colors cursor-pointer"
                        >
                          ดูรายละเอียด
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table View Pagination */}
          {tableTotalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500">
                แสดง {tableStartIndex + 1}-{Math.min(tableStartIndex + TABLE_ITEMS_PER_PAGE, filteredSchedules.length)} จาก {filteredSchedules.length} วัน
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={validTablePage <= 1}
                  onClick={() => setTableCurrentPage(p => Math.max(1, p - 1))}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800 px-2">
                  หน้า {validTablePage} / {tableTotalPages}
                </span>
                <button
                  type="button"
                  disabled={validTablePage >= tableTotalPages}
                  onClick={() => setTableCurrentPage(p => Math.min(tableTotalPages, p + 1))}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL */}
      <WorkScheduleDetailModal
        schedule={selectedSchedule}
        onClose={() => setSelectedSchedule(null)}
        getDayBadge={getDayBadge}
        getLeaveTag={getLeaveTag}
      />

      {/* FILTER MODAL */}
      <WorkScheduleFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedDay={selectedDay}
        setSelectedDay={setSelectedDay}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedEmployee={selectedEmployee}
        setSelectedEmployee={setSelectedEmployee}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        dayOptions={dayOptions}
        monthOptions={monthOptions}
        allEmployees={allEmployeesList}
        onResetFilters={handleResetFilters}
      />

      {/* ANALYTICS MODAL WITH PIE CHART */}
      <WorkScheduleAnalyticsModal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        schedules={filteredSchedules}
        allEmployees={allEmployeesList}
      />

      {/* ACTIVITY SCHEDULE MODAL (ตารางกิจกรรม) */}
      <ActivityScheduleModal
        isOpen={showActivityScheduleModal}
        onClose={() => setShowActivityScheduleModal(false)}
        canAccessGoogleSheet={canAccessGoogleSheet}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
};
