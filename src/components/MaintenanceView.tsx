import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  BarChart3, 
  List, 
  LayoutGrid, 
  Columns, 
  CalendarDays,
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Building2, 
  Calendar, 
  X, 
  Layers, 
  CalendarRange,
  Hammer,
  Cog,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { MaintenanceTicket, MaintenanceStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  fetchGoogleSheetMaintenanceTickets, 
  MAINTENANCE_SHEET_URL 
} from '../services/googleSheetSyncService';
import { AdminUserAccount, isUserAdminOrSupervisor } from '../data/mockData';
import { MaintenanceDetailModal } from './MaintenanceDetailModal';
import { MaintenanceCalendarView } from './MaintenanceCalendarView';
import { MaintenanceAnalyticsModal } from './MaintenanceAnalyticsModal';

const STORAGE_KEY = 'proworkflow_maintenance_tickets_cache_v4';
const BACKGROUND_POLL_INTERVAL_MS = 20000; // Auto-update in background every 20s
const TABLE_ITEMS_PER_PAGE = 20; // 20 รายการต่อหน้าในมุมมองรายการ
const CARD_ITEMS_PER_PAGE = 6;   // 6 รายการต่อหน้าในมุมมองการ์ด

// Helper to parse dates formatted as DD-MM-YY, DD/MM/YYYY, or YYYY-MM-DD
function parseTicketDate(dateStr?: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const clean = dateStr.trim();
  const parts = clean.split(/[-/.]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) {
      year += 2000;
    } else if (year > 2500) {
      year -= 543;
    }
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

interface MaintenanceViewProps {
  currentUser?: AdminUserAccount;
  isAuthenticated?: boolean;
  externalTickets?: MaintenanceTicket[];
  highlightWorkOrderNo?: string | null;
  onClearHighlight?: () => void;
  onTicketsUpdated?: (tickets: MaintenanceTicket[]) => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  currentUser,
  isAuthenticated = true,
  externalTickets,
  highlightWorkOrderNo,
  onClearHighlight,
  onTicketsUpdated,
}) => {
  const { language } = useLanguage();

  // State
  const [tickets, setTickets] = useState<MaintenanceTicket[]>(() => {
    if (externalTickets && externalTickets.length > 0) return externalTickets;
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return [];
  });

  // Sync external tickets if provided
  useEffect(() => {
    if (externalTickets && externalTickets.length > 0) {
      setTickets(externalTickets);
    }
  }, [externalTickets]);

  // Open modal if highlightWorkOrderNo matches
  useEffect(() => {
    if (!highlightWorkOrderNo || tickets.length === 0) return;
    const norm = highlightWorkOrderNo.replace(/[\s\-_=]/g, '').toLowerCase();
    const matched = tickets.find(t => 
      (t.workOrderNo && t.workOrderNo.replace(/[\s\-_=]/g, '').toLowerCase() === norm) ||
      t.id.replace(/[\s\-_=]/g, '').toLowerCase() === norm ||
      String(t.seq) === norm
    );
    if (matched) {
      setSelectedTicket(matched);
    }
  }, [highlightWorkOrderNo, tickets]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<MaintenanceStatus | 'all'>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // View modes: grid (การ์ด - ค่าเริ่มต้น) -> table (รายการ) -> board (กระดาน) -> calendar (ปฏิทิน)
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'board' | 'calendar'>('grid');
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);

  // Pagination states
  const [tableCurrentPage, setTableCurrentPage] = useState<number>(1);
  const [cardCurrentPage, setCardCurrentPage] = useState<number>(1);

  // Modals
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  // Sorting
  const [sortBy, setSortBy] = useState<'seq_desc' | 'seq_asc' | 'status'>('seq_desc');

  const canAccessGoogleSheet = useMemo(() => {
    return isUserAdminOrSupervisor(currentUser, isAuthenticated);
  }, [currentUser, isAuthenticated]);

  // Silent background data sync without spinners or buttons
  const loadData = async () => {
    try {
      const result = await fetchGoogleSheetMaintenanceTickets();
      if (result.success && result.tickets.length > 0) {
        setTickets(result.tickets);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(result.tickets));
        } catch {
          // ignore
        }
      }
    } catch {
      // Keep existing data quietly
    }
  };

  // Continuous background polling
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, BACKGROUND_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Distinct Departments
  const availableDepartments = useMemo(() => {
    const depts = new Set<string>(tickets.map((t) => t.department.trim()).filter(Boolean));
    return Array.from(depts).sort((a, b) => a.localeCompare(b, 'th'));
  }, [tickets]);

  // Distinct Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    tickets.forEach((t) => {
      const d = parseTicketDate(t.reportedDate);
      if (d) {
        years.add(String(d.getFullYear()));
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [tickets]);

  // Base Filtered Tickets (incorporates search query, department, year, date range)
  const baseFilteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Department filter
      if (selectedDepartment !== 'all' && ticket.department !== selectedDepartment) {
        return false;
      }

      // Year filter
      const ticketDate = parseTicketDate(ticket.reportedDate);
      if (selectedYear !== 'all') {
        if (!ticketDate || String(ticketDate.getFullYear()) !== selectedYear) {
          return false;
        }
      }

      // Date Range (startDate - endDate)
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (!ticketDate || ticketDate < start) {
          return false;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (!ticketDate || ticketDate > end) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchNo = (ticket.workOrderNo || '').toLowerCase().includes(query);
        const matchDept = (ticket.department || '').toLowerCase().includes(query);
        const matchIssue = (ticket.issueDetail || '').toLowerCase().includes(query);
        const matchReq = (ticket.requester || '').toLowerCase().includes(query);
        const matchNote = (ticket.note || '').toLowerCase().includes(query);
        const matchDate = (ticket.reportedDate || '').toLowerCase().includes(query);
        const matchSeq = String(ticket.seq).includes(query);
        if (!matchNo && !matchDept && !matchIssue && !matchReq && !matchNote && !matchDate && !matchSeq) {
          return false;
        }
      }
      return true;
    });
  }, [tickets, selectedDepartment, selectedYear, startDate, endDate, searchQuery]);

  // Statistics calculation reflects the filtered data!
  const totalCount = baseFilteredTickets.length;
  const newCount = useMemo(() => baseFilteredTickets.filter((t) => t.status === 'แจ้งใหม่').length, [baseFilteredTickets]);
  const inProgressCount = useMemo(() => baseFilteredTickets.filter((t) => t.status === 'อยู่ระหว่างดำเนินการ').length, [baseFilteredTickets]);
  const completedCount = useMemo(() => baseFilteredTickets.filter((t) => t.status === 'เสร็จแล้ว').length, [baseFilteredTickets]);
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedStatus !== 'all') count++;
    if (selectedDepartment !== 'all') count++;
    if (selectedYear !== 'all') count++;
    if (startDate) count++;
    if (endDate) count++;
    return count;
  }, [searchQuery, selectedStatus, selectedDepartment, selectedYear, startDate, endDate]);

  // Filtered and Sorted Tickets based on Status and Sort By
  const filteredTickets = useMemo(() => {
    return baseFilteredTickets.filter((ticket) => {
      // Status filter
      if (selectedStatus !== 'all' && ticket.status !== selectedStatus) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'seq_desc') return b.seq - a.seq;
      if (sortBy === 'seq_asc') return a.seq - b.seq;
      if (sortBy === 'status') {
        const priorityOrder: Record<MaintenanceStatus, number> = {
          'แจ้งใหม่': 1,
          'อยู่ระหว่างดำเนินการ': 2,
          'เสร็จแล้ว': 3,
        };
        return (priorityOrder[a.status] || 9) - (priorityOrder[b.status] || 9);
      }
      return b.seq - a.seq;
    });
  }, [baseFilteredTickets, selectedStatus, sortBy]);

  // Reset pagination to page 1 when filtering criteria changes
  useEffect(() => {
    setTableCurrentPage(1);
    setCardCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedDepartment, selectedYear, startDate, endDate, sortBy]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedDepartment('all');
    setSelectedYear('all');
    setStartDate('');
    setEndDate('');
    setSortBy('seq_desc');
    setTableCurrentPage(1);
    setCardCurrentPage(1);
  };

  // Pagination calculation for Table View (20 items/page)
  const tableTotalPages = Math.max(1, Math.ceil(filteredTickets.length / TABLE_ITEMS_PER_PAGE));
  const validTablePage = Math.min(Math.max(1, tableCurrentPage), tableTotalPages);
  const tableStartIndex = (validTablePage - 1) * TABLE_ITEMS_PER_PAGE;
  const paginatedTableTickets = useMemo(() => {
    return filteredTickets.slice(tableStartIndex, tableStartIndex + TABLE_ITEMS_PER_PAGE);
  }, [filteredTickets, tableStartIndex]);

  // Pagination calculation for Grid / Card View (6 items/page)
  const cardTotalPages = Math.max(1, Math.ceil(filteredTickets.length / CARD_ITEMS_PER_PAGE));
  const validCardPage = Math.min(Math.max(1, cardCurrentPage), cardTotalPages);
  const cardStartIndex = (validCardPage - 1) * CARD_ITEMS_PER_PAGE;
  const paginatedCardTickets = useMemo(() => {
    return filteredTickets.slice(cardStartIndex, cardStartIndex + CARD_ITEMS_PER_PAGE);
  }, [filteredTickets, cardStartIndex]);

  // Status visual badge helper
  const getStatusPill = (status: MaintenanceStatus) => {
    switch (status) {
      case 'เสร็จแล้ว':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>{status}</span>
          </span>
        );
      case 'อยู่ระหว่างดำเนินการ':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-900 border border-sky-300">
            <Clock className="w-3.5 h-3.5 text-sky-700 animate-spin" />
            <span>{status}</span>
          </span>
        );
      case 'แจ้งใหม่':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
            <span>{status}</span>
          </span>
        );
    }
  };

  // Helper for generating page numbers with ellipsis
  const getPaginationPageNumbers = (currentPage: number, totalPages: number) => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Banner with Animated Orange-White Gradient and Floating Repair Tools */}
      <div className="animated-orange-header rounded-3xl p-6 sm:p-7 text-[#7c2d12] shadow-xl border border-orange-200/80 relative overflow-hidden space-y-5">
        {/* Floating Ambient Glow Orbs */}
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-orange-300/40 rounded-full blur-3xl pointer-events-none animate-orb-1" />
        <div className="absolute -bottom-12 -right-12 w-72 h-72 bg-amber-200/40 rounded-full blur-3xl pointer-events-none animate-orb-2" />

        {/* Animated Floating Repair Tool Icons in Background */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none overflow-hidden select-none">
          {/* 1. Main Large Floating Wrench */}
          <Wrench className="w-44 h-44 sm:w-56 sm:h-56 animate-tool-float text-orange-600 opacity-20 absolute right-4 sm:right-12 top-1/2 -translate-y-1/2" />
          {/* 2. Rotating Gear */}
          <Cog className="w-28 h-28 animate-tool-spin text-amber-700 opacity-20 absolute right-24 sm:right-40 bottom-1" />
          {/* 3. Floating Hammer */}
          <Hammer className="w-20 h-20 rotate-12 animate-tool-float-rev text-orange-700 opacity-15 absolute right-36 sm:right-56 top-2 hidden md:block" />
          {/* 4. Subtle Sparkle Accents */}
          <Sparkles className="w-5 h-5 text-amber-500 animate-pulse absolute left-12 top-6 opacity-60" />
          <Sparkles className="w-4 h-4 text-orange-400 animate-pulse absolute left-28 bottom-4 opacity-50" />
        </div>

        {/* Top Header Row */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-md border border-orange-200 shadow-md flex items-center justify-center shrink-0">
              <Wrench className="w-6 h-6 text-orange-600 animate-pulse" />
              <Sparkles className="w-3.5 h-3.5 text-amber-500 absolute -top-1 -right-1" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#7c2d12] drop-shadow-xs">
                {language === 'th' ? 'การแจ้งซ่อม' : 'Maintenance & Repairs'}
              </h1>
            </div>
          </div>

          {/* Action Buttons Toolbar in Header */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
            {/* 1. ปุ่มสถิติและการวิเคราะห์ (Statistics & Analytics) */}
            <button
              type="button"
              onClick={() => setShowAnalyticsModal(true)}
              className="p-2.5 rounded-xl bg-white/85 hover:bg-white text-orange-950 border border-orange-200/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs hover:border-orange-300"
              title={language === 'th' ? 'สถิติและการวิเคราะห์' : 'Analytics & Statistics'}
              aria-label={language === 'th' ? 'สถิติและการวิเคราะห์' : 'Analytics & Statistics'}
            >
              <BarChart3 className="w-5 h-5 text-orange-600 stroke-[2]" />
            </button>

            {/* 2. ลิงก์ Google Sheet */}
            {canAccessGoogleSheet && (
              <a
                href={MAINTENANCE_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-white/85 hover:bg-white text-emerald-800 border border-orange-200/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
                title={language === 'th' ? 'เปิดดู Google Sheet งานแจ้งซ่อม' : 'Open Google Sheet'}
                aria-label="Google Sheet"
              >
                <FileSpreadsheet className="w-5 h-5" />
              </a>
            )}

            {/* 3. ตัวกรองการค้นหา */}
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={`p-2.5 rounded-xl border backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center relative shadow-xs hover:border-orange-300 ${
                activeFiltersCount > 0
                  ? 'bg-orange-600 text-white border-orange-400 shadow-md ring-2 ring-orange-300'
                  : 'bg-white/85 hover:bg-white text-orange-950 border border-orange-200/80'
              }`}
              title={language === 'th' ? (activeFiltersCount > 0 ? `ตัวกรองการค้นหา (${activeFiltersCount})` : 'ตัวกรองการค้นหา') : (activeFiltersCount > 0 ? `Filters (${activeFiltersCount})` : 'Filters')}
              aria-label={language === 'th' ? 'ตัวกรองการค้นหา' : 'Filters'}
            >
              <Filter className={`w-5 h-5 stroke-[2] ${activeFiltersCount > 0 ? 'text-white' : 'text-orange-600'}`} />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white shadow-xs">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* 4. สลับมุมมอง (View Switcher: รายการ Table -> การ์ด Card/Grid -> กระดาน Board -> ปฏิทิน Calendar) */}
            <div className="flex items-center bg-white/85 p-1 rounded-xl backdrop-blur-md border border-orange-200/80 shadow-xs">
              {/* รายการ (Table / List) */}
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#002045] text-white font-bold shadow-xs'
                    : 'text-orange-900 hover:text-black hover:bg-orange-100/50'
                }`}
                title={language === 'th' ? 'มุมมองรายการ (List / Table)' : 'List / Table View'}
              >
                <List className="w-4 h-4" />
              </button>

              {/* การ์ด (Card / Grid) อยู่ด้านหลังมุมมองรายการ */}
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#002045] text-white font-bold shadow-xs'
                    : 'text-orange-900 hover:text-black hover:bg-orange-100/50'
                }`}
                title={language === 'th' ? 'มุมมองการ์ด (Grid / Card)' : 'Grid / Card View'}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              {/* กระดานขั้นตอน (Board / Pipeline) */}
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'board'
                    ? 'bg-[#002045] text-white font-bold shadow-xs'
                    : 'text-orange-900 hover:text-black hover:bg-orange-100/50'
                }`}
                title={language === 'th' ? 'มุมมองกระดานขั้นตอน (Pipeline / Board)' : 'Board View'}
              >
                <Columns className="w-4 h-4" />
              </button>

              {/* ปฏิทิน (Calendar View) เพิ่มต่อท้ายมุมมองกระดาน */}
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-[#002045] text-white font-bold shadow-xs'
                    : 'text-orange-900 hover:text-black hover:bg-orange-100/50'
                }`}
                title={language === 'th' ? 'มุมมองปฏิทิน (Calendar View)' : 'Calendar View'}
              >
                <CalendarDays className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Integrated Metric KPI Cards Row */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-orange-200/60">
          {/* Card 1: ทั้งหมด */}
          <div 
            onClick={() => setSelectedStatus('all')}
            className={`p-4 rounded-2xl backdrop-blur-md border transition-all cursor-pointer ${
              selectedStatus === 'all'
                ? 'bg-white/95 border-orange-400 shadow-md ring-2 ring-orange-300 scale-[1.02]'
                : 'bg-white/75 hover:bg-white/90 border-orange-200/80 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-orange-900 text-xs font-bold mb-1.5">
              <span>{language === 'th' ? 'ใบแจ้งงานทั้งหมด' : 'Total Work Orders'}</span>
              <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                <Layers className="w-4 h-4 text-orange-800" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-[#7c2d12]">{totalCount}</p>
            <span className="text-[11px] text-orange-800/80">{language === 'th' ? 'รายการสะสมทั้งหมด' : 'All recorded jobs'}</span>
          </div>

          {/* Card 2: แจ้งใหม่ */}
          <div 
            onClick={() => setSelectedStatus('แจ้งใหม่')}
            className={`p-4 rounded-2xl backdrop-blur-md border transition-all cursor-pointer ${
              selectedStatus === 'แจ้งใหม่'
                ? 'bg-amber-50/95 border-amber-400 shadow-md ring-2 ring-amber-300 scale-[1.02]'
                : 'bg-white/75 hover:bg-white/90 border-orange-200/80 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-amber-900 text-xs font-bold mb-1.5">
              <span>{language === 'th' ? 'แจ้งใหม่ / รอดำเนินการ' : 'New / Pending'}</span>
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-800">{newCount}</p>
            <span className="text-[11px] text-amber-700/90">{language === 'th' ? 'รอทีมช่างเข้าตรวจสอบ' : 'Awaiting action'}</span>
          </div>

          {/* Card 3: อยู่ระหว่างดำเนินการ */}
          <div 
            onClick={() => setSelectedStatus('อยู่ระหว่างดำเนินการ')}
            className={`p-4 rounded-2xl backdrop-blur-md border transition-all cursor-pointer ${
              selectedStatus === 'อยู่ระหว่างดำเนินการ'
                ? 'bg-sky-50/95 border-sky-400 shadow-md ring-2 ring-sky-300 scale-[1.02]'
                : 'bg-white/75 hover:bg-white/90 border-orange-200/80 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-sky-900 text-xs font-bold mb-1.5">
              <span>{language === 'th' ? 'อยู่ระหว่างดำเนินการ' : 'In Progress'}</span>
              <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-sky-600 animate-spin" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-sky-800">{inProgressCount}</p>
            <span className="text-[11px] text-sky-700/90">{language === 'th' ? 'กำลังซ่อมแซม' : 'Active work in progress'}</span>
          </div>

          {/* Card 4: เสร็จแล้ว */}
          <div 
            onClick={() => setSelectedStatus('เสร็จแล้ว')}
            className={`p-4 rounded-2xl backdrop-blur-md border transition-all cursor-pointer ${
              selectedStatus === 'เสร็จแล้ว'
                ? 'bg-emerald-50/95 border-emerald-400 shadow-md ring-2 ring-emerald-300 scale-[1.02]'
                : 'bg-white/75 hover:bg-white/90 border-orange-200/80 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-900 text-xs font-bold mb-1.5">
              <span>{language === 'th' ? 'เสร็จแล้ว / ปิดงาน' : 'Completed'}</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-emerald-800">{completedCount}</p>
              <span className="text-xs font-bold text-emerald-600">({completionRate}%)</span>
            </div>
            <span className="text-[11px] text-emerald-700/90">{language === 'th' ? 'ซ่อมแซมเสร็จสมบูรณ์' : 'Successfully resolved'}</span>
          </div>
        </div>
      </div>

      {/* Active Filter Chips (if any filter is applied) */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs animate-in fade-in duration-150">
          <span className="font-bold text-slate-500 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-amber-500" />
            <span>{language === 'th' ? 'ตัวกรองที่เลือก:' : 'Active Filters:'}</span>
          </span>

          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium">
              <span>{language === 'th' ? 'ค้นหา:' : 'Search:'} "{searchQuery}"</span>
              <button type="button" onClick={() => setSearchQuery('')} className="hover:text-red-500 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedYear !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium">
              <span>{language === 'th' ? 'ปี:' : 'Year:'} {selectedYear} ({parseInt(selectedYear, 10) + 543})</span>
              <button type="button" onClick={() => setSelectedYear('all')} className="hover:text-red-500 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {(startDate || endDate) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium">
              <span>{language === 'th' ? 'ช่วงวันที่:' : 'Date:'} {startDate || '...'} ถึง {endDate || '...'}</span>
              <button type="button" onClick={() => { setStartDate(''); setEndDate(''); }} className="hover:text-red-500 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedDepartment !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium truncate max-w-[200px]">
              <span className="truncate">{selectedDepartment}</span>
              <button type="button" onClick={() => setSelectedDepartment('all')} className="hover:text-red-500 p-0.5 shrink-0">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedStatus !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium">
              <span>{selectedStatus}</span>
              <button type="button" onClick={() => setSelectedStatus('all')} className="hover:text-red-500 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={handleResetFilters}
            className="ml-auto text-xs font-bold text-red-600 hover:text-red-800 underline cursor-pointer"
          >
            {language === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Clear All'}
          </button>
        </div>
      )}

      {/* 2. Main Data Presentation Views */}
      {filteredTickets.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Wrench className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {language === 'th' ? 'ไม่พบข้อมูลใบแจ้งงานตามเงื่อนไข' : 'No maintenance tickets found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {language === 'th'
              ? 'ลองปรับเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองเพื่อดูข้อมูลทั้งหมด'
              : 'Try clearing the search query or resetting filters.'}
          </p>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 bg-[#002045] text-white rounded-xl text-xs font-bold hover:bg-[#0b3366] transition-colors cursor-pointer"
            >
              {language === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Clear All Filters'}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* VIEW 1: TABLE VIEW (มุมมองรายการ / ตาราง) - แสดง 20 รายการต่อหน้า ไม่มีคอลัมน์ # */}
          {viewMode === 'table' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4">{language === 'th' ? 'เลขที่ใบแจ้งงาน' : 'Work Order'}</th>
                        <th className="py-3 px-3.5">{language === 'th' ? 'หน่วยงานรับแจ้ง' : 'Department'}</th>
                        <th className="py-3 px-4 min-w-[280px]">{language === 'th' ? 'ปัญหา / รายละเอียด' : 'Issue Detail'}</th>
                        <th className="py-3 px-3 text-center">{language === 'th' ? 'วันที่แจ้ง' : 'Reported'}</th>
                        <th className="py-3 px-3 text-center">{language === 'th' ? 'สถานะ' : 'Status'}</th>
                        <th className="py-3 px-3">{language === 'th' ? 'ผู้แจ้ง' : 'Requester'}</th>
                        <th className="py-3 px-3 text-center">{language === 'th' ? 'แล้วเสร็จ' : 'Completed'}</th>
                        <th className="py-3 px-3 text-center w-20">{language === 'th' ? 'ดูข้อมูล' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedTableTickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          onClick={() => setSelectedTicket(ticket)}
                          className="hover:bg-orange-50/40 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-[#002045] whitespace-nowrap">
                            {ticket.workOrderNo || '-'}
                          </td>
                          <td className="py-3 px-3.5 font-semibold text-blue-950 max-w-[180px] truncate">
                            {ticket.department}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800 max-w-md">
                            <p className="line-clamp-2 leading-relaxed">{ticket.issueDetail}</p>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600 whitespace-nowrap">
                            {ticket.reportedDate}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {getStatusPill(ticket.status)}
                          </td>
                          <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">
                            {ticket.requester}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600 whitespace-nowrap">
                            {ticket.completedDate || '-'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTicket(ticket);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#002045] text-slate-700 hover:text-white font-bold transition-all text-[11px] cursor-pointer"
                            >
                              {language === 'th' ? 'ดู' : 'View'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table Pagination Controls (20 items/page) */}
              {tableTotalPages > 1 && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="text-slate-500 font-medium">
                    {language === 'th' 
                      ? `แสดง ${tableStartIndex + 1} - ${Math.min(tableStartIndex + TABLE_ITEMS_PER_PAGE, filteredTickets.length)} จากทั้งหมด ${filteredTickets.length} รายการ (หน้า ${validTablePage} จาก ${tableTotalPages})`
                      : `Showing ${tableStartIndex + 1} - ${Math.min(tableStartIndex + TABLE_ITEMS_PER_PAGE, filteredTickets.length)} of ${filteredTickets.length} (Page ${validTablePage} of ${tableTotalPages})`}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setTableCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={validTablePage === 1}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold text-[#002045] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>{language === 'th' ? 'ก่อนหน้า' : 'Prev'}</span>
                    </button>

                    {getPaginationPageNumbers(validTablePage, tableTotalPages).map((p, idx) => {
                      if (p === '...') {
                        return (
                          <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400 font-bold">
                            ...
                          </span>
                        );
                      }
                      const pageNum = Number(p);
                      const isActive = pageNum === validTablePage;
                      return (
                        <button
                          key={`page-${pageNum}`}
                          type="button"
                          onClick={() => setTableCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-xl font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#002045] text-white shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setTableCurrentPage((p) => Math.min(tableTotalPages, p + 1))}
                      disabled={validTablePage === tableTotalPages}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold text-[#002045] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>{language === 'th' ? 'ถัดไป' : 'Next'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: GRID / CARD VIEW (มุมมองการ์ด - แสดง 6 รายการต่อหน้า) */}
          {viewMode === 'grid' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedCardTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-orange-400 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                  >
                    {/* Card Top Row */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-bold text-[#002045] group-hover:text-orange-600 transition-colors">
                            {ticket.workOrderNo || (language === 'th' ? `ลำดับ #${ticket.seq}` : `#${ticket.seq}`)}
                          </span>
                        </div>
                        {getStatusPill(ticket.status)}
                      </div>

                      {/* Department Tag */}
                      <div className="mb-2.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50/80 text-blue-900 border border-blue-200/60 text-[11px] font-semibold line-clamp-1">
                          <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                          <span className="truncate">{ticket.department}</span>
                        </span>
                      </div>

                      {/* Issue Description */}
                      <p className="text-slate-800 text-sm font-semibold line-clamp-3 leading-snug mb-3">
                        {ticket.issueDetail}
                      </p>
                    </div>

                    {/* Card Bottom Meta */}
                    <div className="pt-3 border-t border-slate-100 mt-2 space-y-2 text-xs text-slate-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="font-medium text-slate-700 truncate max-w-[120px]">
                            {ticket.requester || 'เจ้าหน้าที่'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ticket.reportedDate}</span>
                        </div>
                      </div>

                      {ticket.completedDate && (
                        <div className="flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                          <span className="font-semibold">{language === 'th' ? 'เสร็จเมื่อ:' : 'Done:'}</span>
                          <span>{ticket.completedDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Card Pagination Controls (6 items/page) */}
              {cardTotalPages > 1 && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="text-slate-500 font-medium">
                    {language === 'th' 
                      ? `แสดง ${cardStartIndex + 1} - ${Math.min(cardStartIndex + CARD_ITEMS_PER_PAGE, filteredTickets.length)} จากทั้งหมด ${filteredTickets.length} รายการ (หน้า ${validCardPage} จาก ${cardTotalPages})`
                      : `Showing ${cardStartIndex + 1} - ${Math.min(cardStartIndex + CARD_ITEMS_PER_PAGE, filteredTickets.length)} of ${filteredTickets.length} (Page ${validCardPage} of ${cardTotalPages})`}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setCardCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={validCardPage === 1}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold text-[#002045] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>{language === 'th' ? 'ก่อนหน้า' : 'Prev'}</span>
                    </button>

                    {getPaginationPageNumbers(validCardPage, cardTotalPages).map((p, idx) => {
                      if (p === '...') {
                        return (
                          <span key={`card-ellipsis-${idx}`} className="px-2 py-1 text-slate-400 font-bold">
                            ...
                          </span>
                        );
                      }
                      const pageNum = Number(p);
                      const isActive = pageNum === validCardPage;
                      return (
                        <button
                          key={`card-page-${pageNum}`}
                          type="button"
                          onClick={() => setCardCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-xl font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#002045] text-white shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setCardCurrentPage((p) => Math.min(cardTotalPages, p + 1))}
                      disabled={validCardPage === cardTotalPages}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold text-[#002045] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>{language === 'th' ? 'ถัดไป' : 'Next'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: PIPELINE / BOARD VIEW (กระดานขั้นตอน 3 คอลัมน์) */}
          {viewMode === 'board' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Column 1: แจ้งใหม่ (New) */}
              <div className="bg-amber-50/40 rounded-3xl p-4 border border-amber-200 flex flex-col max-h-[75vh]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-200 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-amber-950">
                      {language === 'th' ? 'แจ้งใหม่ / รอดำเนินการ' : 'New / Pending'}
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-mono text-xs font-bold">
                    {filteredTickets.filter((t) => t.status === 'แจ้งใหม่').length}
                  </span>
                </div>

                <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                  {filteredTickets
                    .filter((t) => t.status === 'แจ้งใหม่')
                    .map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className="bg-white p-4 rounded-2xl border border-amber-200/80 hover:shadow-md transition-all cursor-pointer space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-[#002045]">{ticket.workOrderNo || (language === 'th' ? `ลำดับ #${ticket.seq}` : `#${ticket.seq}`)}</span>
                          <span className="text-[11px] text-slate-500">{ticket.reportedDate}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 line-clamp-2">{ticket.issueDetail}</p>
                        <div className="text-[11px] text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md truncate">
                          {ticket.department}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Column 2: อยู่ระหว่างดำเนินการ (In Progress) */}
              <div className="bg-sky-50/40 rounded-3xl p-4 border border-sky-200 flex flex-col max-h-[75vh]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-sky-200 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-sky-500 animate-spin" />
                    <h3 className="text-sm font-bold text-sky-950">
                      {language === 'th' ? 'อยู่ระหว่างดำเนินการ' : 'In Progress'}
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-200 text-sky-950 font-mono text-xs font-bold">
                    {filteredTickets.filter((t) => t.status === 'อยู่ระหว่างดำเนินการ').length}
                  </span>
                </div>

                <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                  {filteredTickets
                    .filter((t) => t.status === 'อยู่ระหว่างดำเนินการ')
                    .map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className="bg-white p-4 rounded-2xl border border-sky-200/80 hover:shadow-md transition-all cursor-pointer space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-[#002045]">{ticket.workOrderNo || (language === 'th' ? `ลำดับ #${ticket.seq}` : `#${ticket.seq}`)}</span>
                          <span className="text-[11px] text-slate-500">{ticket.reportedDate}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 line-clamp-2">{ticket.issueDetail}</p>
                        <div className="text-[11px] text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md truncate">
                          {ticket.department}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Column 3: เสร็จแล้ว (Completed) */}
              <div className="bg-emerald-50/40 rounded-3xl p-4 border border-emerald-200 flex flex-col max-h-[75vh]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-200 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <h3 className="text-sm font-bold text-emerald-950">
                      {language === 'th' ? 'เสร็จแล้ว / ปิดงาน' : 'Completed'}
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-mono text-xs font-bold">
                    {filteredTickets.filter((t) => t.status === 'เสร็จแล้ว').length}
                  </span>
                </div>

                <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                  {filteredTickets
                    .filter((t) => t.status === 'เสร็จแล้ว')
                    .map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className="bg-white p-4 rounded-2xl border border-emerald-200/80 hover:shadow-md transition-all cursor-pointer space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-[#002045]">{ticket.workOrderNo || (language === 'th' ? `ลำดับ #${ticket.seq}` : `#${ticket.seq}`)}</span>
                          <span className="text-[11px] text-emerald-700 font-bold">{ticket.completedDate || 'เสร็จแล้ว'}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 line-clamp-2">{ticket.issueDetail}</p>
                        <div className="text-[11px] text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md truncate">
                          {ticket.department}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: CALENDAR VIEW (มุมมองปฏิทิน - เหมือนข้อมูลการซัก-อบผ้า) */}
          {viewMode === 'calendar' && (
            <MaintenanceCalendarView
              tickets={filteredTickets}
              onSelectTicket={setSelectedTicket}
            />
          )}
        </>
      )}

      {/* 3. Maintenance Detail Modal */}
      <MaintenanceDetailModal
        isOpen={!!selectedTicket}
        ticket={selectedTicket}
        onClose={() => {
          setSelectedTicket(null);
          onClearHighlight?.();
        }}
      />

      {/* 4. Modern Circular Charts Analytics Modal (เด้งแสดงที่หน้าจอ) */}
      <MaintenanceAnalyticsModal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        tickets={tickets}
      />

      {/* 5. Enhanced Filter & Search Modal (with Search text, Year, Date-Date range, Dept, Status) */}
      {showFilterModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowFilterModal(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-[#002045] to-[#083366] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
                  <Filter className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {language === 'th' ? 'ตัวกรองและการค้นหา' : 'Filter & Search Work Orders'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {language === 'th' ? 'กรองตามปี, ช่วงวันที่, หน่วยงาน, สถานะ หรือคำค้นหา' : 'Filter by year, date range, department, status, or keyword'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* 1. คำค้นหา (Search Query) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-blue-600" />
                  <span>{language === 'th' ? 'ค้นหาข้อความ' : 'Search Text'}</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'th' ? 'เลขที่ใบงาน, แผนก, ปัญหา/รายละเอียด, ผู้แจ้ง...' : 'Work order no, department, issue, requester...'}
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. ปี (Year) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{language === 'th' ? 'ค้นหาตามปี (Year)' : 'Filter by Year'}</span>
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="all">{language === 'th' ? '— ทุกปี (All Years) —' : '— All Years —'}</option>
                  {availableYears.map((year) => {
                    const buddhistYear = parseInt(year, 10) + 543;
                    return (
                      <option key={year} value={year}>
                        {language === 'th' ? `ปี ค.ศ. ${year} (พ.ศ. ${buddhistYear})` : `Year ${year}`}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 3. วันที่ - วันที่ (Date Range: Start Date to End Date) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <CalendarRange className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{language === 'th' ? 'ช่วงวันที่ (วันที่ - วันที่)' : 'Date Range (From - To)'}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1">{language === 'th' ? 'ตั้งแต่วันที่:' : 'From Date:'}</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1">{language === 'th' ? 'ถึงวันที่:' : 'To Date:'}</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* 4. หน่วยงานรับแจ้ง (Department) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>{language === 'th' ? 'หน่วยงานรับแจ้ง' : 'Department'}</span>
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="all">{language === 'th' ? '— ทุกหน่วยงานรับแจ้ง —' : '— All Departments —'}</option>
                  {availableDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. สถานะงาน (Status) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{language === 'th' ? 'สถานะใบงาน' : 'Status'}</span>
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e: any) => setSelectedStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="all">{language === 'th' ? '— ทุกสถานะ —' : '— All Statuses —'}</option>
                  <option value="แจ้งใหม่">{language === 'th' ? 'แจ้งใหม่ / รอดำเนินการ' : 'New / Pending'}</option>
                  <option value="อยู่ระหว่างดำเนินการ">{language === 'th' ? 'อยู่ระหว่างดำเนินการ' : 'In Progress'}</option>
                  <option value="เสร็จแล้ว">{language === 'th' ? 'เสร็จแล้ว / ปิดงาน' : 'Completed'}</option>
                </select>
              </div>

              {/* 6. การเรียงลำดับ (Sorting) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">{language === 'th' ? 'การจัดเรียง' : 'Sorting'}</label>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="seq_desc">{language === 'th' ? 'ลำดับใหม่สุดก่อน (Newest)' : 'Newest First'}</option>
                  <option value="seq_asc">{language === 'th' ? 'ลำดับแรกสุดก่อน (Oldest)' : 'Oldest First'}</option>
                  <option value="status">{language === 'th' ? 'ตามสถานะ (แจ้งใหม่ -> กำลังทำ -> เสร็จ)' : 'By Status'}</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                {language === 'th' ? 'รีเซ็ตทั้งหมด' : 'Reset All'}
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="px-6 py-2.5 rounded-xl bg-[#002045] hover:bg-[#0b3366] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                {language === 'th' ? `ดูผลลัพธ์ (${filteredTickets.length} รายการ)` : `Show Results (${filteredTickets.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

