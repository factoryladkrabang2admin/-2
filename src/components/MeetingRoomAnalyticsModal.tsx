import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  PieChart as PieChartIcon, 
  DoorOpen, 
  Users, 
  Building2, 
  Sparkles,
  CalendarCheck,
  TrendingUp,
  Clock,
  Filter,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Tag,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Phone,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { MeetingRoomBooking, MeetingStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface MeetingRoomAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: MeetingRoomBooking[];
}

// Helper to robustly parse booking dates (DD/MM/YYYY, D/M/YYYY, YYYY-MM-DD, Buddhist Era)
function parseBookingDate(dateStr?: string, timestampStr?: string): Date | null {
  if (dateStr && dateStr.trim()) {
    const clean = dateStr.trim();
    const parts = clean.split(/[-/.]/);
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      let p2 = parseInt(parts[2], 10);

      // Format: YYYY-MM-DD
      if (p0 > 1000) {
        let yr = p0;
        if (yr > 2500) yr -= 543;
        const d = new Date(yr, p1 - 1, p2);
        if (!isNaN(d.getTime())) return d;
      } else {
        // Format: DD/MM/YYYY or D/M/YYYY
        let yr = p2;
        if (yr < 100) yr += 2000;
        if (yr > 2500) yr -= 543;
        const d = new Date(yr, p1 - 1, p0);
        if (!isNaN(d.getTime())) return d;
      }
    }
    const directDate = new Date(clean);
    if (!isNaN(directDate.getTime())) return directDate;
  }

  // Fallback to timestamp e.g. "24/8/2026, 15:17:57"
  if (timestampStr && timestampStr.trim()) {
    const tClean = timestampStr.split(',')[0].split(' ')[0].trim();
    const parts = tClean.split(/[-/.]/);
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      let p2 = parseInt(parts[2], 10);
      if (p0 > 1000) {
        let yr = p0;
        if (yr > 2500) yr -= 543;
        const d = new Date(yr, p1 - 1, p2);
        if (!isNaN(d.getTime())) return d;
      } else {
        let yr = p2;
        if (yr < 100) yr += 2000;
        if (yr > 2500) yr -= 543;
        const d = new Date(yr, p1 - 1, p0);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }
  return null;
}

// Format Thai date
function formatDisplayDate(dateObj: Date | null, rawDateStr?: string, language: 'th' | 'en' = 'th'): string {
  if (!dateObj) return rawDateStr || '-';
  if (language === 'th') {
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    return `${dateObj.getDate()} ${thaiMonths[dateObj.getMonth()]} ${dateObj.getFullYear() + 543}`;
  }
  const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dateObj.getDate()} ${enMonths[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
}

const ITEMS_PER_PAGE = 10;

export const MeetingRoomAnalyticsModal: React.FC<MeetingRoomAnalyticsModalProps> = ({
  isOpen,
  onClose,
  bookings,
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'rooms' | 'departments' | 'status'>('rooms');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [timeScope, setTimeScope] = useState<'all' | 'today' | 'this_month' | 'specific_month' | 'custom'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Pagination for Filtered Bookings Table
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [timeScope, selectedMonth, startDate, endDate, selectedRoom, selectedDept, selectedStatus, searchKeyword]);

  // Extract unique departments
  const availableDepts = useMemo(() => {
    const list = Array.from(
      new Set<string>(bookings.map((b) => (b.department || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'th'));
    return list;
  }, [bookings]);

  // Filter Bookings with accurate date parsing
  const filteredBookings = useMemo(() => {
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    const nowDate = now.getDate();

    let sYr = 0;
    let sMo = 0;
    if (timeScope === 'specific_month' && selectedMonth) {
      const parts = selectedMonth.split('-');
      if (parts.length === 2) {
        sYr = parseInt(parts[0], 10);
        sMo = parseInt(parts[1], 10) - 1;
      }
    }

    let startObj: Date | null = null;
    let endObj: Date | null = null;
    if (timeScope === 'custom') {
      if (startDate) {
        startObj = new Date(startDate);
        startObj.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        endObj = new Date(endDate);
        endObj.setHours(23, 59, 59, 999);
      }
    }

    return bookings.filter((b) => {
      const bDate = parseBookingDate(b.bookingDate, b.timestamp);

      // 1. Time Scope Filter
      if (timeScope === 'today') {
        if (!bDate) return false;
        if (bDate.getFullYear() !== nowYear || bDate.getMonth() !== nowMonth || bDate.getDate() !== nowDate) {
          return false;
        }
      } else if (timeScope === 'this_month') {
        if (!bDate) return false;
        if (bDate.getFullYear() !== nowYear || bDate.getMonth() !== nowMonth) {
          return false;
        }
      } else if (timeScope === 'specific_month') {
        if (!bDate) return false;
        if (bDate.getFullYear() !== sYr || bDate.getMonth() !== sMo) {
          return false;
        }
      } else if (timeScope === 'custom') {
        if (startObj && (!bDate || bDate < startObj)) return false;
        if (endObj && (!bDate || bDate > endObj)) return false;
      }

      // 2. Room Filter
      if (selectedRoom !== 'all') {
        const rName = (b.room || '').toUpperCase();
        if (selectedRoom === 'tpm1' && !rName.includes('TPM 1')) return false;
        if (selectedRoom === 'tpm2' && !rName.includes('TPM 2')) return false;
        if (selectedRoom === 'other' && (rName.includes('TPM 1') || rName.includes('TPM 2'))) return false;
      }

      // 3. Department Filter
      if (selectedDept !== 'all') {
        if ((b.department || '').trim() !== selectedDept.trim()) return false;
      }

      // 4. Status Filter
      if (selectedStatus !== 'all') {
        const bStatus = b.status || 'นัดหมายล่วงหน้า';
        if (bStatus !== selectedStatus) return false;
      }

      // 5. Search Keyword
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase().trim();
        const matchSub = (b.subject || '').toLowerCase().includes(kw);
        const matchDept = (b.department || '').toLowerCase().includes(kw);
        const matchRoom = (b.room || '').toLowerCase().includes(kw);
        const matchPhone = (b.phoneNumber || '').toLowerCase().includes(kw);
        const matchDate = (b.bookingDate || '').toLowerCase().includes(kw);
        if (!matchSub && !matchDept && !matchRoom && !matchPhone && !matchDate) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, timeScope, selectedMonth, startDate, endDate, selectedRoom, selectedDept, selectedStatus, searchKeyword]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (timeScope !== 'all') count++;
    if (selectedRoom !== 'all') count++;
    if (selectedDept !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    if (searchKeyword.trim()) count++;
    return count;
  }, [timeScope, selectedRoom, selectedDept, selectedStatus, searchKeyword]);

  const handleResetFilters = () => {
    setTimeScope('all');
    setStartDate('');
    setEndDate('');
    setSelectedRoom('all');
    setSelectedDept('all');
    setSelectedStatus('all');
    setSearchKeyword('');
  };

  const totalBookings = filteredBookings.length;
  const totalAttendees = useMemo(() => filteredBookings.reduce((sum, b) => sum + (b.attendeesCount || 0), 0), [filteredBookings]);
  const avgAttendees = totalBookings > 0 ? (totalAttendees / totalBookings).toFixed(1) : '0';

  // 1. Room Distribution Data (TPM 1 vs TPM 2 vs Other)
  const roomData = useMemo(() => {
    const tpm1 = filteredBookings.filter((b) => (b.room || '').toUpperCase().includes('TPM 1'));
    const tpm2 = filteredBookings.filter((b) => (b.room || '').toUpperCase().includes('TPM 2'));
    const other = filteredBookings.filter((b) => !(b.room || '').toUpperCase().includes('TPM 1') && !(b.room || '').toUpperCase().includes('TPM 2'));

    const items = [
      {
        id: 'tpm1',
        name: 'ห้องประชุม TPM 1',
        count: tpm1.length,
        attendees: tpm1.reduce((sum, b) => sum + (b.attendeesCount || 0), 0),
        color: '#2563eb', // Blue
        bgColor: 'bg-blue-500',
        lightBg: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-700',
        percentage: totalBookings > 0 ? Math.round((tpm1.length / totalBookings) * 100) : 0,
      },
      {
        id: 'tpm2',
        name: 'ห้องประชุม TPM 2',
        count: tpm2.length,
        attendees: tpm2.reduce((sum, b) => sum + (b.attendeesCount || 0), 0),
        color: '#9333ea', // Purple
        bgColor: 'bg-purple-500',
        lightBg: 'bg-purple-50',
        borderColor: 'border-purple-200',
        textColor: 'text-purple-700',
        percentage: totalBookings > 0 ? Math.round((tpm2.length / totalBookings) * 100) : 0,
      },
    ];

    if (other.length > 0) {
      items.push({
        id: 'other',
        name: 'ห้องอื่นๆ',
        count: other.length,
        attendees: other.reduce((sum, b) => sum + (b.attendeesCount || 0), 0),
        color: '#64748b', // Slate
        bgColor: 'bg-slate-500',
        lightBg: 'bg-slate-50',
        borderColor: 'border-slate-200',
        textColor: 'text-slate-700',
        percentage: totalBookings > 0 ? Math.round((other.length / totalBookings) * 100) : 0,
      });
    }

    return items;
  }, [filteredBookings, totalBookings]);

  // 2. Department Distribution Data
  const deptData = useMemo(() => {
    const deptMap: Record<string, { count: number; attendees: number }> = {};
    filteredBookings.forEach((b) => {
      const dept = (b.department || 'ไม่ระบุ').trim();
      if (!deptMap[dept]) {
        deptMap[dept] = { count: 0, attendees: 0 };
      }
      deptMap[dept].count += 1;
      deptMap[dept].attendees += (b.attendeesCount || 0);
    });

    const palette = [
      '#0284c7', // Sky
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#06b6d4', // Cyan
      '#f97316', // Orange
      '#64748b', // Slate
      '#14b8a6', // Teal
      '#e11d48', // Rose
    ];

    return Object.entries(deptMap)
      .map(([name, data], idx) => ({
        id: `dept-${idx}`,
        name,
        count: data.count,
        attendees: data.attendees,
        color: palette[idx % palette.length],
        percentage: totalBookings > 0 ? Math.round((data.count / totalBookings) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredBookings, totalBookings]);

  // 3. Status Distribution Data
  const statusData = useMemo(() => {
    const sMap: Record<string, number> = {
      'เสร็จสิ้นแล้ว': 0,
      'กำลังประชุม': 0,
      'รอเริ่มวันนี้': 0,
      'นัดหมายล่วงหน้า': 0,
    };
    filteredBookings.forEach((b) => {
      const s = b.status || 'นัดหมายล่วงหน้า';
      sMap[s] = (sMap[s] || 0) + 1;
    });

    const colorConfigs: Record<string, { color: string; bg: string }> = {
      'เสร็จสิ้นแล้ว': { color: '#10b981', bg: 'bg-emerald-500' },
      'กำลังประชุม': { color: '#0284c7', bg: 'bg-sky-500' },
      'รอเริ่มวันนี้': { color: '#f59e0b', bg: 'bg-amber-500' },
      'นัดหมายล่วงหน้า': { color: '#6366f1', bg: 'bg-indigo-500' },
    };

    return Object.entries(sMap)
      .map(([name, count], idx) => ({
        id: `status-${idx}`,
        name,
        count,
        color: colorConfigs[name]?.color || '#64748b',
        percentage: totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0,
      }))
      .filter((item) => item.count > 0);
  }, [filteredBookings, totalBookings]);

  // Select active dataset for circular donut chart
  const currentChartItems = useMemo(() => {
    if (activeTab === 'rooms') return roomData;
    if (activeTab === 'departments') return deptData;
    return statusData;
  }, [activeTab, roomData, deptData, statusData]);

  // Calculate circular SVG donut stroke geometry
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  const donutSegments = currentChartItems.map((item, index) => {
    const fraction = totalBookings > 0 ? item.count / totalBookings : 0;
    const strokeLength = fraction * circumference;
    const dashOffset = accumulatedOffset;
    accumulatedOffset += strokeLength;

    return {
      ...item,
      strokeLength,
      dashOffset,
      isHovered: hoveredIndex === index,
    };
  });

  // Pagination for Filtered Bookings Table
  const totalPages = Math.max(1, Math.ceil(totalBookings / ITEMS_PER_PAGE));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
  const paginatedBookings = useMemo(() => {
    return filteredBookings.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBookings, startIndex]);

  // Status visual badge helper
  const getStatusBadge = (status?: MeetingStatus) => {
    switch (status) {
      case 'กำลังประชุม':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <Clock className="w-3 h-3 text-emerald-700 animate-spin" />
            <span>{status}</span>
          </span>
        );
      case 'รอเริ่มวันนี้':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300">
            <AlertCircle className="w-3 h-3 text-amber-700 animate-pulse" />
            <span>{status}</span>
          </span>
        );
      case 'นัดหมายล่วงหน้า':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-900 border border-sky-300">
            <Calendar className="w-3 h-3 text-sky-700" />
            <span>{status}</span>
          </span>
        );
      case 'เสร็จสิ้นแล้ว':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <CheckCircle2 className="w-3 h-3 text-slate-600" />
            <span>เสร็จสิ้นแล้ว</span>
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#002045] via-[#0b3366] to-[#1e3a8a] text-white p-5 sm:p-6 relative flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-md shrink-0">
              <PieChartIcon className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-black tracking-tight">
                  {language === 'th' ? 'สถิติและการใช้งานห้องประชุม' : 'Meeting Room Analytics & Statistics'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-[11px] font-bold text-blue-200">
                  {totalBookings} {language === 'th' ? 'รายการ' : 'bookings'}
                </span>
              </div>
              <p className="text-xs text-blue-200/90 mt-0.5">
                {language === 'th' 
                  ? `วิเคราะห์และแสดงผลจาก ${totalBookings} รายการ${bookings.length !== totalBookings ? ` (จากทั้งหมด ${bookings.length} รายการ)` : ''}` 
                  : `Analyzed from ${totalBookings} bookings${bookings.length !== totalBookings ? ` of total ${bookings.length}` : ''}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`relative h-10 px-3.5 rounded-2xl border backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 shadow-xs text-xs font-bold ${
                isFilterOpen || activeFiltersCount > 0
                  ? 'bg-amber-400 text-blue-950 border-amber-300 font-black ring-2 ring-amber-200'
                  : 'bg-white/15 hover:bg-white/25 text-white border-white/30'
              }`}
              title={language === 'th' ? 'ตัวกรองข้อมูล' : 'Filter Analytics'}
              aria-label={language === 'th' ? 'ตัวกรองข้อมูล' : 'Filters'}
            >
              <Filter className={`w-4 h-4 stroke-[2.2] ${isFilterOpen || activeFiltersCount > 0 ? 'text-blue-950' : 'text-white'}`} />
              <span className="hidden sm:inline">{language === 'th' ? 'ตัวกรอง' : 'Filters'}</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-950 text-amber-300 font-black text-[10px] flex items-center justify-center shadow-xs">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer flex items-center justify-center border border-white/20 active:scale-95 shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expandable Filter Box */}
        {isFilterOpen && (
          <div className="bg-blue-50/80 border-b border-blue-200 p-4 sm:p-5 animate-in slide-in-from-top-2 duration-150 shrink-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-blue-950 uppercase tracking-wider">
                  {language === 'th' ? 'ตัวกรองข้อมูลสถิติห้องประชุม (แสดงผลตามที่เลือก)' : 'Filter Meeting Room Analytics'}
                </span>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{language === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Reset Filters'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Time Scope */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'ช่วงเวลา (Time Scope)' : 'Time Scope'}
                </label>
                <select
                  value={timeScope}
                  onChange={(e) => setTimeScope(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                >
                  <option value="all">{language === 'th' ? 'ทั้งหมด (All Time)' : 'All Time'}</option>
                  <option value="today">{language === 'th' ? 'วันนี้ (Today)' : 'Today'}</option>
                  <option value="this_month">{language === 'th' ? 'เดือนปัจจุบัน (This Month)' : 'This Month'}</option>
                  <option value="specific_month">{language === 'th' ? 'เลือกเดือนระบุ' : 'Specific Month'}</option>
                  <option value="custom">{language === 'th' ? 'กำหนดช่วงวันที่เอง' : 'Custom Date Range'}</option>
                </select>
              </div>

              {/* 2. Room */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'ห้องประชุม (Meeting Room)' : 'Room'}
                </label>
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                >
                  <option value="all">{language === 'th' ? 'ทุกห้องประชุม (All Rooms)' : 'All Rooms'}</option>
                  <option value="tpm1">ห้องประชุม TPM 1</option>
                  <option value="tpm2">ห้องประชุม TPM 2</option>
                  <option value="other">ห้องอื่นๆ</option>
                </select>
              </div>

              {/* 3. Department */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'แผนก/ฝ่าย (Department)' : 'Department'}
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                >
                  <option value="all">{language === 'th' ? 'ทุกแผนก/ฝ่าย (All Departments)' : 'All Departments'}</option>
                  {availableDepts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* 4. Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'สถานะการประชุม (Status)' : 'Status'}
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                >
                  <option value="all">{language === 'th' ? 'ทุกสถานะ (All Statuses)' : 'All Statuses'}</option>
                  <option value="เสร็จสิ้นแล้ว">{language === 'th' ? 'เสร็จสิ้นแล้ว' : 'Completed'}</option>
                  <option value="กำลังประชุม">{language === 'th' ? 'กำลังประชุม' : 'In Meeting'}</option>
                  <option value="รอเริ่มวันนี้">{language === 'th' ? 'รอเริ่มวันนี้' : 'Starts Today'}</option>
                  <option value="นัดหมายล่วงหน้า">{language === 'th' ? 'นัดหมายล่วงหน้า' : 'Upcoming'}</option>
                </select>
              </div>
            </div>

            {/* Keyword Search & Date Range Pickers */}
            <div className="mt-3 pt-3 border-t border-blue-200 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px] relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder={language === 'th' ? 'ค้นหาหัวข้อ, แผนก, เบอร์โทร...' : 'Search subject, department, phone...'}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                />
              </div>

              {timeScope === 'specific_month' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">{language === 'th' ? 'เลือกเดือน-ปี:' : 'Month:'}</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs"
                  />
                </div>
              )}

              {timeScope === 'custom' && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600">{language === 'th' ? 'จาก:' : 'From:'}</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600">{language === 'th' ? 'ถึง:' : 'To:'}</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Body with Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Active Filter Chips Bar */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-blue-50 rounded-2xl border border-blue-200 text-xs">
              <span className="font-bold text-blue-950 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                {language === 'th' ? 'เงื่อนไขตัวกรองที่เลือก:' : 'Active Filters:'}
              </span>

              {timeScope !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-300 text-blue-950 font-semibold shadow-2xs">
                  📅 {timeScope === 'today' ? (language === 'th' ? 'วันนี้' : 'Today') : timeScope === 'this_month' ? (language === 'th' ? 'เดือนปัจจุบัน' : 'This Month') : timeScope === 'specific_month' ? selectedMonth : `${startDate || '...'} ~ ${endDate || '...'}`}
                </span>
              )}

              {selectedRoom !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-300 text-blue-950 font-semibold shadow-2xs">
                  🚪 {selectedRoom === 'tpm1' ? 'ห้อง TPM 1' : selectedRoom === 'tpm2' ? 'ห้อง TPM 2' : 'ห้องอื่นๆ'}
                </span>
              )}

              {selectedDept !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-300 text-blue-950 font-semibold shadow-2xs">
                  🏢 {selectedDept}
                </span>
              )}

              {selectedStatus !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-300 text-blue-950 font-semibold shadow-2xs">
                  ⚡ {selectedStatus}
                </span>
              )}

              {searchKeyword.trim() && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-300 text-blue-950 font-semibold shadow-2xs">
                  🔍 "{searchKeyword}"
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="ml-auto text-xs font-bold text-blue-900 hover:text-rose-600 transition-colors cursor-pointer px-2 py-0.5"
              >
                {language === 'th' ? 'ล้างทั้งหมด' : 'Clear All'}
              </button>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-blue-100 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-500 truncate">{language === 'th' ? 'การจองตามตัวกรอง' : 'Filtered Bookings'}</p>
                <p className="text-lg font-black text-blue-950">{totalBookings} <span className="text-xs font-normal text-slate-500">{language === 'th' ? 'ครั้ง' : ''}</span></p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <DoorOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-500 truncate">TPM 1 / TPM 2</p>
                <p className="text-lg font-black text-purple-950">
                  {roomData.find(r => r.id === 'tpm1')?.count || 0} / {roomData.find(r => r.id === 'tpm2')?.count || 0}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-emerald-100 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-500 truncate">{language === 'th' ? 'ผู้เข้าร่วมรวม' : 'Total Attendees'}</p>
                <p className="text-lg font-black text-emerald-950">{totalAttendees} <span className="text-xs font-normal text-slate-500">{language === 'th' ? 'คน' : ''}</span></p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-amber-100 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-500 truncate">{language === 'th' ? 'เฉลี่ยต่อการประชุม' : 'Avg / Meeting'}</p>
                <p className="text-lg font-black text-amber-950">{avgAttendees} <span className="text-xs font-normal text-slate-500">{language === 'th' ? 'คน' : ''}</span></p>
              </div>
            </div>
          </div>

          {/* If No Records Match */}
          {totalBookings === 0 ? (
            <div className="p-10 rounded-3xl bg-white border border-slate-200 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#002045]">
                {language === 'th' ? 'ไม่พบข้อมูลการจองห้องประชุมตามตัวกรองที่เลือก' : 'No meeting room bookings match the current filter'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md">
                {language === 'th' 
                  ? 'ลองปรับเปลี่ยนช่วงเวลา ห้องประชุม แผนก หรือคำค้นหา หรือกดล้างตัวกรองเพื่อดูสถิติทั้งหมด' 
                  : 'Try adjusting the date range, room, department, or keyword, or reset all filters'}
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-[#002045] hover:bg-[#0b3366] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'th' ? 'ล้างตัวกรองและดูข้อมูลทั้งหมด' : 'Reset to All Bookings'}</span>
              </button>
            </div>
          ) : (
            <>
              {/* Tab Selector */}
              <div className="flex items-center gap-2 p-1 bg-slate-200/80 rounded-2xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => { setActiveTab('rooms'); setHoveredIndex(null); }}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'rooms'
                      ? 'bg-white text-[#002045] shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <DoorOpen className="w-4 h-4 text-blue-600" />
                  <span>{language === 'th' ? 'กราฟสัดส่วนห้องประชุม' : 'By Meeting Room'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('departments'); setHoveredIndex(null); }}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'departments'
                      ? 'bg-white text-[#002045] shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <span>{language === 'th' ? 'กราฟแยกตามแผนก/ฝ่าย' : 'By Department'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('status'); setHoveredIndex(null); }}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'status'
                      ? 'bg-white text-[#002045] shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>{language === 'th' ? 'กราฟแยกตามสถานะ' : 'By Status'}</span>
                </button>
              </div>

              {/* Circular Donut Graph Section */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                {/* SVG Circular Donut Chart */}
                <div className="md:col-span-5 flex flex-col items-center justify-center relative select-none">
                  <div className="relative w-52 h-52 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                      {/* Background Track Circle */}
                      <circle
                        cx="100"
                        cy="100"
                        r={radius}
                        className="stroke-slate-100"
                        strokeWidth="24"
                        fill="transparent"
                      />

                      {/* Circular Donut Segments */}
                      {totalBookings > 0 && donutSegments.map((seg, idx) => (
                        <circle
                          key={seg.id}
                          cx="100"
                          cy="100"
                          r={radius}
                          stroke={seg.color}
                          strokeWidth={seg.isHovered ? '28' : '24'}
                          strokeDasharray={`${seg.strokeLength} ${circumference}`}
                          strokeDashoffset={-seg.dashOffset}
                          fill="transparent"
                          className="transition-all duration-300 cursor-pointer"
                          style={{
                            filter: seg.isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))' : 'none',
                          }}
                          onMouseEnter={() => setHoveredIndex(idx)}
                          onMouseLeave={() => setHoveredIndex(null)}
                        />
                      ))}
                    </svg>

                    {/* Donut Center Core Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
                      {hoveredIndex !== null && donutSegments[hoveredIndex] ? (
                        <div className="animate-in zoom-in-75 duration-150">
                          <p className="text-2xl font-black text-slate-800">
                            {donutSegments[hoveredIndex].percentage}%
                          </p>
                          <p className="text-[11px] font-bold text-slate-600 truncate max-w-[120px]">
                            {donutSegments[hoveredIndex].name}
                          </p>
                          <p className="text-[10px] font-bold text-blue-700">
                            {donutSegments[hoveredIndex].count} {language === 'th' ? 'รายการ' : 'items'}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-3xl font-black text-[#002045]">{totalBookings}</p>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            {language === 'th' ? 'การจองที่เลือก' : 'Bookings'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 text-xs mt-2">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>{language === 'th' ? 'ชี้ที่แถบวงกลมเพื่อดูสัดส่วน' : 'Hover segments to inspect'}</span>
                  </div>
                </div>

                {/* Breakdown Legend List */}
                <div className="md:col-span-7 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                    <span>
                      {activeTab === 'rooms' && (language === 'th' ? 'สัดส่วนและจำนวนคนตามห้องประชุม' : 'Breakdown by Room')}
                      {activeTab === 'departments' && (language === 'th' ? 'สัดส่วนการจองแยกตามแผนก/ฝ่าย' : 'Breakdown by Department')}
                      {activeTab === 'status' && (language === 'th' ? 'สัดส่วนตามสถานะการประชุม' : 'Breakdown by Status')}
                    </span>
                    <span className="text-[11px] font-normal text-slate-400">
                      {currentChartItems.length} {language === 'th' ? 'กลุ่ม' : 'categories'}
                    </span>
                  </h4>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {currentChartItems.map((item, idx) => {
                      const isHov = hoveredIndex === idx;
                      return (
                        <div
                          key={item.id}
                          onMouseEnter={() => setHoveredIndex(idx)}
                          onMouseLeave={() => setHoveredIndex(null)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isHov
                              ? 'bg-blue-50/80 border-blue-400 shadow-md ring-2 ring-blue-200'
                              : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                              style={{ backgroundColor: item.color }}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                              {'attendees' in item && (
                                <p className="text-[10px] text-slate-500">
                                  {language === 'th' ? 'ผู้เข้าร่วม:' : 'Attendees:'} {(item as any).attendees} {language === 'th' ? 'คน' : 'people'}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0 pl-2">
                            <p className="text-xs font-black text-slate-800">
                              {item.count} <span className="text-[10px] font-normal text-slate-500">{language === 'th' ? 'ครั้ง' : ''}</span>
                            </p>
                            <p className="text-[11px] font-bold text-blue-600 font-mono">
                              {item.percentage}%
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 📋 Section: Filtered Bookings Table (แสดงข้อมูลรายการที่ตรงตามตัวกรอง) */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-3">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/80">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-black text-slate-900">
                      {language === 'th' ? 'รายการข้อมูลการจองห้องประชุมตามตัวกรอง' : 'Filtered Meeting Room Bookings'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-[11px]">
                      {totalBookings} {language === 'th' ? 'รายการ' : 'items'}
                    </span>
                  </div>

                  <span className="text-xs text-slate-500 font-medium">
                    {language === 'th' 
                      ? `หน้า ${validPage} จาก ${totalPages} (แสดง ${startIndex + 1}-${Math.min(startIndex + ITEMS_PER_PAGE, totalBookings)})` 
                      : `Page ${validPage} of ${totalPages}`}
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold text-[11px]">
                        <th className="py-2.5 px-3 text-center w-12">#</th>
                        <th className="py-2.5 px-3">{language === 'th' ? 'วันที่' : 'Date'}</th>
                        <th className="py-2.5 px-3">{language === 'th' ? 'ห้องประชุม' : 'Room'}</th>
                        <th className="py-2.5 px-3">{language === 'th' ? 'เวลา' : 'Time'}</th>
                        <th className="py-2.5 px-3">{language === 'th' ? 'เรื่องที่ประชุม / อบรม' : 'Subject'}</th>
                        <th className="py-2.5 px-3">{language === 'th' ? 'แผนก/ฝ่าย' : 'Department'}</th>
                        <th className="py-2.5 px-3 text-center">{language === 'th' ? 'จำนวน' : 'Attendees'}</th>
                        <th className="py-2.5 px-3">{language === 'th' ? 'เบอร์โทร' : 'Phone'}</th>
                        <th className="py-2.5 px-3 text-center">{language === 'th' ? 'สถานะ' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {paginatedBookings.map((b, idx) => {
                        const bDate = parseBookingDate(b.bookingDate, b.timestamp);
                        const isTpm1 = (b.room || '').toUpperCase().includes('TPM 1');
                        return (
                          <tr key={b.id || idx} className="hover:bg-blue-50/40 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {startIndex + idx + 1}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-900">
                              {formatDisplayDate(bDate, b.bookingDate, language)}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                                isTpm1
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-purple-50 text-purple-800 border-purple-200'
                              }`}>
                                {b.room}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                              {b.startTime} - {b.endTime}
                            </td>
                            <td className="py-2.5 px-3 max-w-[200px] truncate font-semibold text-slate-900" title={b.subject}>
                              {b.subject}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                                {b.department}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap font-bold text-slate-800">
                              {b.attendeesCount} <span className="text-[10px] font-normal text-slate-500">{language === 'th' ? 'คน' : ''}</span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                              {b.phoneNumber || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {getStatusBadge(b.status)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="p-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={validPage <= 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>{language === 'th' ? 'ก่อนหน้า' : 'Prev'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = i + 1;
                        if (totalPages > 5) {
                          if (validPage > 3) {
                            pageNum = validPage - 2 + i;
                            if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                          }
                        }
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                              validPage === pageNum
                                ? 'bg-[#002045] text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={validPage >= totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                    >
                      <span>{language === 'th' ? 'ถัดไป' : 'Next'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            {language === 'th' ? 'อัปเดตข้อมูลอัตโนมัติจาก Google Sheet' : 'Auto-synced with Google Sheet'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#002045] hover:bg-[#0b3366] text-white text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
          >
            {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
