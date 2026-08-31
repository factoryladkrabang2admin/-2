import React, { useState, useEffect, useMemo } from 'react';
import { 
  DoorOpen, 
  Search, 
  Filter, 
  List, 
  LayoutGrid, 
  Columns, 
  CalendarDays, 
  Users, 
  Clock, 
  Building2, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Calendar,
  Layers,
  Presentation,
  Check,
  FileSpreadsheet,
  PieChart,
  BarChart3,
  QrCode,
  ExternalLink,
  Copy,
  Download
} from 'lucide-react';
import { MeetingRoomBooking, MeetingStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  fetchGoogleSheetMeetingRoomBookings, 
  calculateMeetingStatus,
  MEETING_ROOM_SHEET_URL,
  MEETING_ROOM_FORM_URL
} from '../services/googleSheetSyncService';
import { AdminUserAccount, isUserAdminOrSupervisor } from '../data/mockData';
import { MeetingRoomDetailModal } from './MeetingRoomDetailModal';
import { MeetingRoomCalendarView } from './MeetingRoomCalendarView';
import { MeetingRoomAnalyticsModal } from './MeetingRoomAnalyticsModal';

const STORAGE_KEY = 'proworkflow_meeting_room_bookings_cache_v1';
const BACKGROUND_POLL_INTERVAL_MS = 20000; // Auto-update in background every 20s
const TABLE_ITEMS_PER_PAGE = 20; // 20 items per page in table view
const CARD_ITEMS_PER_PAGE = 6;   // 6 items per page in card view

// Helper to parse booking date string (D/M/YYYY, DD-MM-YYYY, or YYYY-MM-DD)
function parseBookingDate(dateStr?: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const clean = dateStr.trim();
  const parts = clean.split(/[-/.]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    let p2 = parseInt(parts[2], 10);

    // If format is YYYY-MM-DD
    if (p0 > 1000) {
      let yr = p0;
      if (yr > 2500) yr -= 543;
      const month = p1 - 1;
      const day = p2;
      const d = new Date(yr, month, day);
      if (!isNaN(d.getTime())) return d;
    } else {
      // Format is DD/MM/YYYY or D/M/YYYY
      const day = p0;
      const month = p1 - 1;
      let year = p2;
      if (year < 100) {
        year += 2000;
      } else if (year > 2500) {
        year -= 543;
      }
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

interface MeetingRoomViewProps {
  currentUser?: AdminUserAccount;
  isAuthenticated?: boolean;
}

export const MeetingRoomView: React.FC<MeetingRoomViewProps> = ({
  currentUser,
  isAuthenticated = true,
}) => {
  const { language } = useLanguage();

  // State
  const [bookings, setBookings] = useState<MeetingRoomBooking[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return [];
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<MeetingStatus | 'all'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // View modes: calendar (ปฏิทิน - ค่าเริ่มต้น) -> grid (การ์ด) -> table (รายการ) -> board (กระดาน)
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'board' | 'calendar'>('calendar');
  const [selectedBooking, setSelectedBooking] = useState<MeetingRoomBooking | null>(null);

  // Pagination states
  const [tableCurrentPage, setTableCurrentPage] = useState<number>(1);
  const [cardCurrentPage, setCardCurrentPage] = useState<number>(1);

  // Modals
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copiedQrLink, setCopiedQrLink] = useState<boolean>(false);

  // Sorting
  const [sortBy, setSortBy] = useState<'seq_desc' | 'seq_asc' | 'date_desc' | 'date_asc'>('seq_desc');

  const canAccessGoogleSheet = useMemo(() => {
    return isUserAdminOrSupervisor(currentUser, isAuthenticated);
  }, [currentUser, isAuthenticated]);

  // Silent background data sync
  const loadData = async () => {
    try {
      const result = await fetchGoogleSheetMeetingRoomBookings();
      if (result.success && result.bookings.length > 0) {
        setBookings(result.bookings);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(result.bookings));
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
    const depts = new Set<string>(bookings.map((b) => b.department.trim()).filter(Boolean));
    return Array.from(depts).sort((a, b) => a.localeCompare(b, 'th'));
  }, [bookings]);

  // Distinct Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    bookings.forEach((b) => {
      const d = parseBookingDate(b.bookingDate);
      if (d) {
        years.add(String(d.getFullYear()));
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [bookings]);

  // Base Filtered Bookings
  const baseFilteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      // Room filter
      if (selectedRoom !== 'all') {
        if (!booking.room.toUpperCase().includes(selectedRoom.toUpperCase())) {
          return false;
        }
      }

      // Department filter
      if (selectedDepartment !== 'all' && booking.department !== selectedDepartment) {
        return false;
      }

      // Year filter
      const bookingDate = parseBookingDate(booking.bookingDate);
      if (selectedYear !== 'all') {
        if (!bookingDate || String(bookingDate.getFullYear()) !== selectedYear) {
          return false;
        }
      }

      // Date Range (startDate - endDate)
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (!bookingDate || bookingDate < start) {
          return false;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (!bookingDate || bookingDate > end) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'all' && booking.status !== selectedStatus) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchSubject = (booking.subject || '').toLowerCase().includes(query);
        const matchDept = (booking.department || '').toLowerCase().includes(query);
        const matchRoom = (booking.room || '').toLowerCase().includes(query);
        const matchPhone = (booking.phoneNumber || '').toLowerCase().includes(query);
        const matchDate = (booking.bookingDate || '').toLowerCase().includes(query);
        const matchSeq = String(booking.seq).includes(query);
        if (!matchSubject && !matchDept && !matchRoom && !matchPhone && !matchDate && !matchSeq) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, selectedRoom, selectedDepartment, selectedYear, selectedStatus, startDate, endDate, searchQuery]);

  // Helper to check if date matches today
  const isBookingToday = (dateStr?: string) => {
    const d = parseBookingDate(dateStr);
    if (!d) return false;
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  // Filtered Bookings excluding room filter (so TPM 1 and TPM 2 breakdown counts reflect other active filters)
  const nonRoomFilteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      // Department filter
      if (selectedDepartment !== 'all' && booking.department !== selectedDepartment) {
        return false;
      }

      // Year filter
      const bookingDate = parseBookingDate(booking.bookingDate);
      if (selectedYear !== 'all') {
        if (!bookingDate || String(bookingDate.getFullYear()) !== selectedYear) {
          return false;
        }
      }

      // Date Range (startDate - endDate)
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (!bookingDate || bookingDate < start) {
          return false;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (!bookingDate || bookingDate > end) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'all' && booking.status !== selectedStatus) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchSubject = (booking.subject || '').toLowerCase().includes(query);
        const matchDept = (booking.department || '').toLowerCase().includes(query);
        const matchRoom = (booking.room || '').toLowerCase().includes(query);
        const matchPhone = (booking.phoneNumber || '').toLowerCase().includes(query);
        const matchDate = (booking.bookingDate || '').toLowerCase().includes(query);
        const matchSeq = String(booking.seq).includes(query);
        if (!matchSubject && !matchDept && !matchRoom && !matchPhone && !matchDate && !matchSeq) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, selectedDepartment, selectedYear, selectedStatus, startDate, endDate, searchQuery]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedRoom !== 'all') count++;
    if (selectedDepartment !== 'all') count++;
    if (selectedYear !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    if (startDate) count++;
    if (endDate) count++;
    return count;
  }, [searchQuery, selectedRoom, selectedDepartment, selectedYear, selectedStatus, startDate, endDate]);

  const hasActiveFilters = activeFiltersCount > 0;

  // Bookings specifically for today (วันปัจจุบัน)
  const todayBookings = useMemo(() => {
    return bookings.filter((b) => isBookingToday(b.bookingDate));
  }, [bookings]);

  const todayThaiDateStr = useMemo(() => {
    const now = new Date();
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    return `${now.getDate()} ${thaiMonths[now.getMonth()]} ${now.getFullYear() + 543}`;
  }, []);

  // Dynamic KPI calculations: Show today's data by default, or filtered data when filters are active
  const statsTotalCount = useMemo(() => {
    if (!hasActiveFilters) {
      return todayBookings.length;
    }
    return selectedRoom === 'all' ? nonRoomFilteredBookings.length : baseFilteredBookings.length;
  }, [hasActiveFilters, todayBookings.length, selectedRoom, nonRoomFilteredBookings.length, baseFilteredBookings.length]);

  const statsTpm1Count = useMemo(() => {
    if (!hasActiveFilters) {
      return todayBookings.filter((b) => b.room.toUpperCase().includes('TPM 1')).length;
    }
    return nonRoomFilteredBookings.filter((b) => b.room.toUpperCase().includes('TPM 1')).length;
  }, [hasActiveFilters, todayBookings, nonRoomFilteredBookings]);

  const statsTpm2Count = useMemo(() => {
    if (!hasActiveFilters) {
      return todayBookings.filter((b) => b.room.toUpperCase().includes('TPM 2')).length;
    }
    return nonRoomFilteredBookings.filter((b) => b.room.toUpperCase().includes('TPM 2')).length;
  }, [hasActiveFilters, todayBookings, nonRoomFilteredBookings]);

  const statsTotalAttendees = useMemo(() => {
    if (!hasActiveFilters) {
      return todayBookings.reduce((sum, b) => sum + (Number(b.attendeesCount) || 0), 0);
    }
    const list = selectedRoom === 'all' ? nonRoomFilteredBookings : baseFilteredBookings;
    return list.reduce((sum, b) => sum + (Number(b.attendeesCount) || 0), 0);
  }, [hasActiveFilters, todayBookings, selectedRoom, nonRoomFilteredBookings, baseFilteredBookings]);

  const statsDenominator = useMemo(() => {
    if (!hasActiveFilters) {
      return todayBookings.length;
    }
    return nonRoomFilteredBookings.length;
  }, [hasActiveFilters, todayBookings.length, nonRoomFilteredBookings.length]);

  // Helper to get sortable timestamp value for booking
  const getBookingTimestampValue = (b: MeetingRoomBooking): number => {
    const d = parseBookingDate(b.bookingDate);
    if (d) {
      if (b.startTime) {
        const parts = b.startTime.split(':');
        if (parts.length >= 2) {
          d.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
        }
      }
      return d.getTime();
    }
    return b.seq || 0;
  };

  // Filtered and Sorted Bookings - Defaults to latest data first
  const filteredBookings = useMemo(() => {
    return [...baseFilteredBookings].sort((a, b) => {
      if (sortBy === 'seq_asc') return a.seq - b.seq;
      if (sortBy === 'date_asc') {
        const da = getBookingTimestampValue(a);
        const db = getBookingTimestampValue(b);
        if (da !== db) return da - db;
        return a.seq - b.seq;
      }
      if (sortBy === 'date_desc') {
        const da = getBookingTimestampValue(a);
        const db = getBookingTimestampValue(b);
        if (db !== da) return db - da;
        return b.seq - a.seq;
      }
      // Default latest (seq_desc / latest submission & date)
      const da = getBookingTimestampValue(a);
      const db = getBookingTimestampValue(b);
      if (db !== da) return db - da;
      return b.seq - a.seq;
    });
  }, [baseFilteredBookings, sortBy]);

  // Reset pagination to page 1 when filtering criteria changes
  useEffect(() => {
    setTableCurrentPage(1);
    setCardCurrentPage(1);
  }, [searchQuery, selectedRoom, selectedDepartment, selectedYear, selectedStatus, startDate, endDate, sortBy]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRoom('all');
    setSelectedDepartment('all');
    setSelectedYear('all');
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
    setSortBy('seq_desc');
    setTableCurrentPage(1);
    setCardCurrentPage(1);
  };

  // Pagination calculation for Table View (20 items/page)
  const tableTotalPages = Math.max(1, Math.ceil(filteredBookings.length / TABLE_ITEMS_PER_PAGE));
  const validTablePage = Math.min(Math.max(1, tableCurrentPage), tableTotalPages);
  const tableStartIndex = (validTablePage - 1) * TABLE_ITEMS_PER_PAGE;
  const paginatedTableBookings = useMemo(() => {
    return filteredBookings.slice(tableStartIndex, tableStartIndex + TABLE_ITEMS_PER_PAGE);
  }, [filteredBookings, tableStartIndex]);

  // Pagination calculation for Grid / Card View (6 items/page)
  const cardTotalPages = Math.max(1, Math.ceil(filteredBookings.length / CARD_ITEMS_PER_PAGE));
  const validCardPage = Math.min(Math.max(1, cardCurrentPage), cardTotalPages);
  const cardStartIndex = (validCardPage - 1) * CARD_ITEMS_PER_PAGE;
  const paginatedCardBookings = useMemo(() => {
    return filteredBookings.slice(cardStartIndex, cardStartIndex + CARD_ITEMS_PER_PAGE);
  }, [filteredBookings, cardStartIndex]);

  // Status visual badge helper
  const getStatusPill = (status?: MeetingStatus) => {
    switch (status) {
      case 'กำลังประชุม':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <Clock className="w-3.5 h-3.5 text-emerald-700 animate-spin" />
            <span>{status}</span>
          </span>
        );
      case 'รอเริ่มวันนี้':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
            <span>{status}</span>
          </span>
        );
      case 'นัดหมายล่วงหน้า':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-900 border border-sky-300">
            <Calendar className="w-3.5 h-3.5 text-sky-700" />
            <span>{status}</span>
          </span>
        );
      case 'เสร็จสิ้นแล้ว':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
            <span>เสร็จสิ้นแล้ว</span>
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
      {/* 1. Header Banner with Animated Medium Purple-White Moving Gradient and Floating Meeting Icons */}
      <div className="animated-meeting-purple-header rounded-3xl p-6 sm:p-7 text-[#3b0764] shadow-xl border border-purple-200/80 relative overflow-hidden space-y-5">
        {/* Floating Ambient Glow Orbs */}
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-purple-300/40 rounded-full blur-3xl pointer-events-none animate-orb-1" />
        <div className="absolute -bottom-12 -right-12 w-72 h-72 bg-fuchsia-300/35 rounded-full blur-3xl pointer-events-none animate-orb-2" />

        {/* Animated Floating Meeting Icons in Background */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none overflow-hidden select-none">
          {/* 1. Main Large Floating Presentation Board */}
          <Presentation className="w-40 h-40 sm:w-52 sm:h-52 animate-custom-float text-purple-700 opacity-20 absolute right-4 sm:right-12 top-1/2 -translate-y-1/2 stroke-[1.5]" />
          {/* 2. Floating Users Conference Group */}
          <Users className="w-24 h-24 sm:w-28 sm:h-28 animate-custom-float-rev text-fuchsia-700 opacity-25 absolute right-24 sm:right-40 bottom-1 stroke-[1.5]" />
          {/* 3. Meeting Room Door Icon */}
          <DoorOpen className="w-20 h-20 rotate-6 animate-tool-float text-purple-800 opacity-15 absolute right-36 sm:right-56 top-2 hidden md:block" />
          {/* 4. Subtle Sparkle Accents */}
          <Sparkles className="w-6 h-6 text-amber-500 animate-pulse absolute left-12 top-6 opacity-60" />
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse absolute left-28 bottom-4 opacity-50" />
        </div>

        {/* Top Header Row */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-md border border-purple-200 shadow-md flex items-center justify-center shrink-0">
              <Presentation className="w-6 h-6 text-purple-700 animate-pulse" />
              <Sparkles className="w-3.5 h-3.5 text-amber-500 absolute -top-1 -right-1" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#3b0764] drop-shadow-xs">
                {language === 'th' ? 'ห้องประชุม' : 'Meeting Rooms'}
              </h1>
            </div>
          </div>

          {/* Action Buttons & View Switcher Toolbar */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
            {/* 1. ปุ่มสถิติและการวิเคราะห์ (Statistics / Analytics Modal) - Icon BarChart3 matching LaundryView */}
            <button
              type="button"
              onClick={() => setShowAnalyticsModal(true)}
              className="p-2.5 rounded-xl bg-white/85 hover:bg-white text-purple-950 border border-purple-200/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs hover:border-purple-300"
              title={language === 'th' ? 'สถิติและการวิเคราะห์' : 'Analytics & Statistics'}
              aria-label={language === 'th' ? 'สถิติและการวิเคราะห์' : 'Analytics & Statistics'}
            >
              <BarChart3 className="w-5 h-5 text-purple-700 stroke-[2]" />
            </button>

            {/* 2. ปุ่มเปิด Google Sheet การจองห้องประชุม (เฉพาะผู้ดูแลและแอดมินเท่านั้น) */}
            {canAccessGoogleSheet && (
              <a
                href={MEETING_ROOM_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-white/85 hover:bg-white text-emerald-800 border border-purple-200/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
                title={language === 'th' ? 'เปิดดู Google Sheet การจองห้องประชุม' : 'Open Google Sheet'}
                aria-label="Google Sheet"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
              </a>
            )}

            {/* 3. ตัวกรองการค้นหา */}
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={`p-2.5 rounded-xl border backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center relative shadow-xs hover:border-purple-300 ${
                activeFiltersCount > 0
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md ring-2 ring-purple-300'
                  : 'bg-white/85 hover:bg-white text-purple-950 border border-purple-200/80'
              }`}
              title={language === 'th' ? (activeFiltersCount > 0 ? `ตัวกรองการค้นหา (${activeFiltersCount})` : 'ตัวกรองการค้นหา') : (activeFiltersCount > 0 ? `Filters (${activeFiltersCount})` : 'Filters')}
              aria-label={language === 'th' ? 'ตัวกรองการค้นหา' : 'Filters'}
            >
              <Filter className={`w-5 h-5 stroke-[2] ${activeFiltersCount > 0 ? 'text-white' : 'text-purple-700'}`} />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white shadow-xs">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* 4. สลับมุมมอง (View Switcher: รายการ Table -> การ์ด Card/Grid -> กระดาน Board -> ปฏิทิน Calendar) */}
            <div className="flex items-center bg-white/85 p-1 rounded-xl backdrop-blur-md border border-purple-200/80 shadow-xs">
              {/* รายการ (Table / List) */}
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-purple-700 text-white font-bold shadow-xs'
                    : 'text-purple-900 hover:text-black hover:bg-purple-100/50'
                }`}
                title={language === 'th' ? 'มุมมองรายการ (List / Table)' : 'List / Table View'}
              >
                <List className="w-4 h-4" />
              </button>

              {/* การ์ด (Card / Grid) */}
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-purple-700 text-white font-bold shadow-xs'
                    : 'text-purple-900 hover:text-black hover:bg-purple-100/50'
                }`}
                title={language === 'th' ? 'มุมมองการ์ด (Grid / Card)' : 'Grid / Card View'}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              {/* กระดานแยกห้อง (Board / Rooms) */}
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'board'
                    ? 'bg-purple-700 text-white font-bold shadow-xs'
                    : 'text-purple-900 hover:text-black hover:bg-purple-100/50'
                }`}
                title={language === 'th' ? 'มุมมองกระดานแยกห้อง (Board View)' : 'Board View'}
              >
                <Columns className="w-4 h-4" />
              </button>

              {/* ปฏิทิน (Calendar View) */}
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-purple-700 text-white font-bold shadow-xs'
                    : 'text-purple-900 hover:text-black hover:bg-purple-100/50'
                }`}
                title={language === 'th' ? 'มุมมองปฏิทิน (Calendar View)' : 'Calendar View'}
              >
                <CalendarDays className="w-4 h-4" />
              </button>

              {/* เส้นคั่นและไอคอน QR Code หลังไอคอนมุมมองปฏิทิน (จำกัดสิทธิ์เฉพาะผู้ดูแลและแอดมินเท่านั้น) */}
              {canAccessGoogleSheet && (
                <>
                  <div className="w-[1px] h-4 bg-purple-200 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="p-2 rounded-lg transition-all cursor-pointer text-purple-900 hover:text-purple-950 hover:bg-purple-100/70 active:scale-95 group relative"
                    title={language === 'th' ? 'QR Code แบบฟอร์มจองห้องประชุม' : 'Meeting Room Google Form QR Code'}
                    aria-label={language === 'th' ? 'QR Code แบบฟอร์มจองห้องประชุม' : 'Meeting Room Google Form QR Code'}
                  >
                    <QrCode className="w-4 h-4 text-purple-700 transition-transform group-hover:scale-110" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Integrated Metric KPI Cards Row - Dynamic Filter-Aware Statistics */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-purple-200/60">
          {/* Card 1: จองทั้งหมด */}
          <div 
            onClick={() => setSelectedRoom('all')}
            className={`p-4 rounded-2xl backdrop-blur-md border transition-all cursor-pointer ${
              selectedRoom === 'all'
                ? 'bg-white/95 border-blue-400 shadow-md ring-2 ring-blue-300 scale-[1.02]'
                : 'bg-white/75 hover:bg-white/90 border-blue-200/80 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-blue-900 text-xs font-bold mb-1.5">
              <span>
                {!hasActiveFilters 
                  ? (language === 'th' ? 'จองทั้งหมด (วันนี้)' : 'Total Bookings (Today)') 
                  : (language === 'th' ? 'จองทั้งหมด (ตามตัวกรอง)' : 'Total Bookings (Filtered)')}
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                <Layers className="w-4 h-4 text-blue-800" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-[#002045]">{statsTotalCount}</p>
            <span className="text-[11px] text-blue-800/80">
              {!hasActiveFilters
                ? (language === 'th' ? `รายการจองวันนี้ (${todayThaiDateStr})` : `Bookings today (${todayThaiDateStr})`)
                : (language === 'th' ? `ตามตัวกรองที่เลือก (${activeFiltersCount} ตัวกรอง)` : `Filtered results (${activeFiltersCount} filters)`)}
            </span>
          </div>

          {/* Card 2: ห้องประชุม TPM 1 */}
          <div 
            onClick={() => setSelectedRoom(selectedRoom === 'TPM 1' ? 'all' : 'TPM 1')}
            className={`p-4 rounded-2xl backdrop-blur-md border transition-all cursor-pointer ${
              selectedRoom === 'TPM 1'
                ? 'bg-blue-50/95 border-blue-400 shadow-md ring-2 ring-blue-300 scale-[1.02]'
                : 'bg-white/75 hover:bg-white/90 border-blue-200/80 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-blue-900 text-xs font-bold mb-1.5">
              <span>
                {!hasActiveFilters 
                  ? (language === 'th' ? 'ห้องประชุม TPM 1 (วันนี้)' : 'Room TPM 1 (Today)') 
                  : (language === 'th' ? 'ห้องประชุม TPM 1' : 'Room TPM 1')}
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                <DoorOpen className="w-4 h-4 text-blue-700" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-blue-800">{statsTpm1Count}</p>
              {statsDenominator > 0 && (
                <span className="text-xs font-bold text-blue-600">
                  ({Math.round((statsTpm1Count / statsDenominator) * 100)}%)
                </span>
              )}
            </div>
            <span className="text-[11px] text-blue-700/90">
              {!hasActiveFilters
                ? (language === 'th' ? 'รายการจองห้อง 1 วันนี้' : 'Bookings in TPM 1 today')
                : (language === 'th' ? 'รายการจองห้อง TPM 1 ตามตัวกรอง' : 'Bookings in TPM 1 matching filters')}
            </span>
          </div>

          {/* Card 3: ห้องประชุม TPM 2 */}
          <div 
            onClick={() => setSelectedRoom(selectedRoom === 'TPM 2' ? 'all' : 'TPM 2')}
            className={`p-4 rounded-2xl backdrop-blur-md border transition-all cursor-pointer ${
              selectedRoom === 'TPM 2'
                ? 'bg-purple-50/95 border-purple-400 shadow-md ring-2 ring-purple-300 scale-[1.02]'
                : 'bg-white/75 hover:bg-white/90 border-blue-200/80 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-purple-900 text-xs font-bold mb-1.5">
              <span>
                {!hasActiveFilters 
                  ? (language === 'th' ? 'ห้องประชุม TPM 2 (วันนี้)' : 'Room TPM 2 (Today)') 
                  : (language === 'th' ? 'ห้องประชุม TPM 2' : 'Room TPM 2')}
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                <DoorOpen className="w-4 h-4 text-purple-700" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-purple-800">{statsTpm2Count}</p>
              {statsDenominator > 0 && (
                <span className="text-xs font-bold text-purple-600">
                  ({Math.round((statsTpm2Count / statsDenominator) * 100)}%)
                </span>
              )}
            </div>
            <span className="text-[11px] text-purple-700/90">
              {!hasActiveFilters
                ? (language === 'th' ? 'รายการจองห้อง 2 วันนี้' : 'Bookings in TPM 2 today')
                : (language === 'th' ? 'รายการจองห้อง TPM 2 ตามตัวกรอง' : 'Bookings in TPM 2 matching filters')}
            </span>
          </div>

          {/* Card 4: ผู้เข้าร่วมสะสมทั้งหมด */}
          <div 
            className="p-4 rounded-2xl backdrop-blur-md border bg-white/75 border-blue-200/80 shadow-xs"
          >
            <div className="flex items-center justify-between text-emerald-900 text-xs font-bold mb-1.5">
              <span>
                {!hasActiveFilters 
                  ? (language === 'th' ? 'ผู้เข้าร่วมสะสมทั้งหมด (วันนี้)' : 'Total Attendees (Today)') 
                  : (language === 'th' ? 'ผู้เข้าร่วมสะสมทั้งหมด' : 'Total Cumulative Attendees')}
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-700" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-800">{statsTotalAttendees}</p>
            <span className="text-[11px] text-emerald-700/90">
              {!hasActiveFilters
                ? (language === 'th' ? 'จำนวนคนรวมทุกการประชุมวันนี้' : 'Total participants today')
                : (language === 'th' ? 'จำนวนคนรวมทุกการประชุมตามตัวกรอง' : 'Total participants matching filters')}
            </span>
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

          {selectedRoom !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium">
              <span>{language === 'th' ? 'ห้อง:' : 'Room:'} {selectedRoom}</span>
              <button type="button" onClick={() => setSelectedRoom('all')} className="hover:text-red-500 p-0.5">
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
      {filteredBookings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <DoorOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {language === 'th' ? 'ไม่พบข้อมูลการจองห้องประชุมตามเงื่อนไข' : 'No meeting room bookings found'}
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
          {/* VIEW 1: TABLE VIEW (มุมมองรายการ / ตาราง) - แสดง 20 รายการต่อหน้า */}
          {viewMode === 'table' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-3.5">{language === 'th' ? 'ห้องประชุม' : 'Room'}</th>
                        <th className="py-3 px-3 text-center">{language === 'th' ? 'วันที่' : 'Date'}</th>
                        <th className="py-3 px-3 text-center">{language === 'th' ? 'เวลา' : 'Time'}</th>
                        <th className="py-3 px-4 min-w-[240px]">{language === 'th' ? 'เรื่องที่ประชุม / อบรม' : 'Subject / Topic'}</th>
                        <th className="py-3 px-3.5">{language === 'th' ? 'แผนก / ฝ่าย' : 'Department'}</th>
                        <th className="py-3 px-3 text-center">{language === 'th' ? 'จำนวน' : 'Attendees'}</th>
                        <th className="py-3 px-3">{language === 'th' ? 'เบอร์โทร' : 'Phone'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedTableBookings.map((booking) => {
                        const isT1 = booking.room.toUpperCase().includes('TPM 1');
                        return (
                          <tr
                            key={booking.id}
                            onClick={() => setSelectedBooking(booking)}
                            className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                          >
                            <td className="py-3 px-3.5">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] border ${
                                isT1
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-purple-50 text-purple-800 border-purple-200'
                              }`}>
                                <DoorOpen className="w-3.5 h-3.5" />
                                <span>{booking.room}</span>
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-medium text-slate-700 whitespace-nowrap">
                              {booking.bookingDate}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-semibold text-slate-800 whitespace-nowrap">
                              {booking.startTime} - {booking.endTime}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900 max-w-[320px]">
                              <p className="truncate">{booking.subject}</p>
                            </td>
                            <td className="py-3 px-3.5 font-medium text-slate-700 max-w-[160px]">
                              <span className="truncate block">{booking.department}</span>
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-800">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                                <Users className="w-3 h-3 text-slate-500" />
                                <span>{booking.attendeesCount}</span>
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                              {booking.phoneNumber ? `โทร. ${booking.phoneNumber}` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table Pagination */}
              {tableTotalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 text-xs text-slate-600 shadow-xs">
                  <div>
                    {language === 'th'
                      ? `แสดง ${tableStartIndex + 1} - ${Math.min(tableStartIndex + TABLE_ITEMS_PER_PAGE, filteredBookings.length)} จากทั้งหมด ${filteredBookings.length} รายการ`
                      : `Showing ${tableStartIndex + 1} - ${Math.min(tableStartIndex + TABLE_ITEMS_PER_PAGE, filteredBookings.length)} of ${filteredBookings.length} bookings`}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={validTablePage <= 1}
                      onClick={() => setTableCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {getPaginationPageNumbers(validTablePage, tableTotalPages).map((pageNum, idx) => (
                      <React.Fragment key={idx}>
                        {pageNum === '...' ? (
                          <span className="px-2 py-1 text-slate-400">...</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setTableCurrentPage(Number(pageNum))}
                            className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center cursor-pointer ${
                              validTablePage === pageNum
                                ? 'bg-[#002045] text-white'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )}
                      </React.Fragment>
                    ))}
                    <button
                      type="button"
                      disabled={validTablePage >= tableTotalPages}
                      onClick={() => setTableCurrentPage((p) => Math.min(tableTotalPages, p + 1))}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: GRID / CARD VIEW (มุมมองการ์ด) - ค่าเริ่มต้น 6 การ์ดต่อหน้า */}
          {viewMode === 'grid' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedCardBookings.map((booking) => {
                  const isT1 = booking.room.toUpperCase().includes('TPM 1');
                  return (
                    <div
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group relative overflow-hidden"
                    >
                      {/* Top Accent Strip */}
                      <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                        isT1 ? 'bg-blue-600' : 'bg-purple-600'
                      }`} />

                      <div className="space-y-3">
                        {/* Header Badge Row */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                            isT1 
                              ? 'bg-blue-50 text-blue-900 border-blue-200' 
                              : 'bg-purple-50 text-purple-900 border-purple-200'
                          }`}>
                            <DoorOpen className="w-3.5 h-3.5" />
                            <span>ห้อง {booking.room}</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-400">
                            #{booking.seq}
                          </span>
                        </div>

                        {/* Meeting Subject */}
                        <div>
                          <h3 className="text-sm font-black text-slate-900 line-clamp-2 group-hover:text-blue-700 transition-colors leading-snug">
                            {booking.subject}
                          </h3>
                        </div>

                        {/* Date and Time */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              <span className="font-semibold">{booking.bookingDate}</span>
                            </span>
                            <span className="font-mono font-bold text-slate-800 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{booking.startTime} - {booking.endTime}</span>
                            </span>
                          </div>
                        </div>

                        {/* Department & Participants */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-400 block">{language === 'th' ? 'แผนก/ฝ่าย' : 'Department'}</span>
                            <span className="font-bold text-slate-800 truncate block mt-0.5">{booking.department}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-400 block">{language === 'th' ? 'ผู้เข้าร่วม' : 'Attendees'}</span>
                            <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                              <Users className="w-3 h-3 text-indigo-500" />
                              <span>{booking.attendeesCount} คน</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Row */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-500 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{booking.phoneNumber ? `โทร. ${booking.phoneNumber}` : '-'}</span>
                        </span>
                        {getStatusPill(booking.status)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Card Pagination */}
              {cardTotalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 text-xs text-slate-600 shadow-xs">
                  <div>
                    {language === 'th'
                      ? `แสดง ${cardStartIndex + 1} - ${Math.min(cardStartIndex + CARD_ITEMS_PER_PAGE, filteredBookings.length)} จากทั้งหมด ${filteredBookings.length} รายการ`
                      : `Showing ${cardStartIndex + 1} - ${Math.min(cardStartIndex + CARD_ITEMS_PER_PAGE, filteredBookings.length)} of ${filteredBookings.length} bookings`}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={validCardPage <= 1}
                      onClick={() => setCardCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {getPaginationPageNumbers(validCardPage, cardTotalPages).map((pageNum, idx) => (
                      <React.Fragment key={idx}>
                        {pageNum === '...' ? (
                          <span className="px-2 py-1 text-slate-400">...</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCardCurrentPage(Number(pageNum))}
                            className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center cursor-pointer ${
                              validCardPage === pageNum
                                ? 'bg-[#002045] text-white'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )}
                      </React.Fragment>
                    ))}
                    <button
                      type="button"
                      disabled={validCardPage >= cardTotalPages}
                      onClick={() => setCardCurrentPage((p) => Math.min(cardTotalPages, p + 1))}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: BOARD VIEW (มุมมองกระดานแยกตามห้องประชุม TPM 1 vs TPM 2) */}
          {viewMode === 'board' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Column 1: TPM 1 */}
              <div className="bg-slate-50/80 rounded-3xl p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                      <DoorOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">ห้องประชุม TPM 1</h3>
                      <span className="text-[11px] text-slate-500">{language === 'th' ? 'รายการจองห้อง 1' : 'Bookings'}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-900 font-bold text-xs border border-blue-200">
                    {filteredBookings.filter(b => b.room.toUpperCase().includes('TPM 1')).length} รายการ
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[650px] pr-1">
                  {filteredBookings
                    .filter(b => b.room.toUpperCase().includes('TPM 1'))
                    .map((booking) => (
                      <div
                        key={booking.id}
                        onClick={() => setSelectedBooking(booking)}
                        className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {booking.bookingDate}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {booking.startTime} - {booking.endTime}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {booking.subject}
                        </h4>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="truncate max-w-[140px] font-medium">{booking.department}</span>
                          <span className="font-bold text-slate-700">{booking.attendeesCount} คน</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Column 2: TPM 2 */}
              <div className="bg-slate-50/80 rounded-3xl p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                      <DoorOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">ห้องประชุม TPM 2</h3>
                      <span className="text-[11px] text-slate-500">{language === 'th' ? 'รายการจองห้อง 2' : 'Bookings'}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-900 font-bold text-xs border border-purple-200">
                    {filteredBookings.filter(b => b.room.toUpperCase().includes('TPM 2')).length} รายการ
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[650px] pr-1">
                  {filteredBookings
                    .filter(b => b.room.toUpperCase().includes('TPM 2'))
                    .map((booking) => (
                      <div
                        key={booking.id}
                        onClick={() => setSelectedBooking(booking)}
                        className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            {booking.bookingDate}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {booking.startTime} - {booking.endTime}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {booking.subject}
                        </h4>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="truncate max-w-[140px] font-medium">{booking.department}</span>
                          <span className="font-bold text-slate-700">{booking.attendeesCount} คน</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: CALENDAR VIEW (มุมมองปฏิทิน) */}
          {viewMode === 'calendar' && (
            <MeetingRoomCalendarView
              bookings={filteredBookings}
              onSelectBooking={(b) => setSelectedBooking(b)}
            />
          )}
        </>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowFilterModal(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-gradient-to-r from-[#002045] to-[#0b3366] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Filter className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-black tracking-tight text-white">
                  {language === 'th' ? 'ตัวกรองและการค้นหา' : 'Filter & Search'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Search Query */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  {language === 'th' ? 'คำค้นหา (เรื่อง, แผนก, เบอร์โทร)' : 'Search keyword'}
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'th' ? 'พิมพ์คำค้นหา...' : 'Type search keyword...'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Room Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  {language === 'th' ? 'เลือกห้องประชุม' : 'Meeting Room'}
                </label>
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-slate-50/50"
                >
                  <option value="all">{language === 'th' ? 'ทุกห้องประชุม (TPM 1 & TPM 2)' : 'All Rooms'}</option>
                  <option value="TPM 1">ห้องประชุม TPM 1</option>
                  <option value="TPM 2">ห้องประชุม TPM 2</option>
                </select>
              </div>

              {/* Department Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  {language === 'th' ? 'เลือกแผนก / ฝ่าย' : 'Department'}
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-slate-50/50"
                >
                  <option value="all">{language === 'th' ? 'ทุกแผนก / ฝ่าย' : 'All Departments'}</option>
                  {availableDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  {language === 'th' ? 'เลือกปี' : 'Year'}
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-slate-50/50"
                >
                  <option value="all">{language === 'th' ? 'ทุกปี' : 'All Years'}</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr} ({parseInt(yr, 10) + 543})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    {language === 'th' ? 'ตั้งแต่วันที่' : 'From date'}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-slate-50/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    {language === 'th' ? 'ถึงวันที่' : 'To date'}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-slate-50/50"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-red-600 hover:text-red-800 underline cursor-pointer"
              >
                {language === 'th' ? 'ล้างตัวกรอง' : 'Reset'}
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#002045] hover:bg-[#0b3366] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {language === 'th' ? 'เสร็จสิ้น' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Room Detail Modal */}
      <MeetingRoomDetailModal
        isOpen={Boolean(selectedBooking)}
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />

      {/* Meeting Room Analytics & Statistics Donut Chart Modal */}
      <MeetingRoomAnalyticsModal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        bookings={bookings}
      />

      {/* Meeting Room Google Form QR Code Modal */}
      {showQrModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowQrModal(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-purple-100 w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-700 to-indigo-800 text-white flex items-center justify-center shadow-md">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {language === 'th' ? 'QR Code แบบฟอร์มจองห้องประชุม' : 'Meeting Room Form QR Code'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'th' ? 'สแกนเพื่อกรอกข้อมูลการจองผ่าน Google Form' : 'Scan to submit booking via Google Form'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                title={language === 'th' ? 'ปิด' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code Image Container */}
            <div className="py-5 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-gradient-to-b from-purple-50 to-white rounded-2xl border-2 border-purple-200/80 shadow-md">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(MEETING_ROOM_FORM_URL)}&margin=8`}
                  alt="Meeting Room QR Code"
                  className="w-52 h-52 sm:w-60 sm:h-60 rounded-xl bg-white shadow-inner"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="mt-4 px-3 py-1.5 rounded-full bg-purple-50 text-purple-900 border border-purple-200/80 text-[11px] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>{language === 'th' ? 'สแกนด้วยกล้องมือถือเพื่อเปิดแบบฟอร์มทันที' : 'Scan with mobile camera to open form instantly'}</span>
              </div>

              {/* URL Box */}
              <div className="mt-3.5 w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 text-left">
                <span className="text-xs font-mono text-slate-600 truncate flex-1 select-all">
                  {MEETING_ROOM_FORM_URL}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(MEETING_ROOM_FORM_URL);
                    setCopiedQrLink(true);
                    setTimeout(() => setCopiedQrLink(false), 2500);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                    copiedQrLink 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                  title={language === 'th' ? 'คัดลอกลิงก์' : 'Copy Link'}
                >
                  {copiedQrLink ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>{language === 'th' ? 'คัดลอกแล้ว' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{language === 'th' ? 'คัดลอก' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2.5">
              <a
                href={MEETING_ROOM_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-800/20 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{language === 'th' ? 'เปิดแบบฟอร์ม' : 'Open Form'}</span>
              </a>

              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(MEETING_ROOM_FORM_URL)}&margin=10`}
                download="meeting-room-form-qr-code.png"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{language === 'th' ? 'บันทึกรูป QR' : 'Save QR'}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
