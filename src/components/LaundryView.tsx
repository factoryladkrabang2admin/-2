import React, { useState, useMemo, useEffect } from 'react';
import { LaundryOrder, LaundryStage } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { AdminUserAccount, isUserAdminOrSupervisor } from '../data/mockData';
import { RagsGlovesLogView } from './RagsGlovesLogView';
import { LaundryCalendarView } from './LaundryCalendarView';
import { LaundryAnalyticsModal } from './LaundryAnalyticsModal';
import { 
  Shirt, 
  Waves, 
  CheckCircle2, 
  Layers, 
  LayoutGrid, 
  List, 
  Columns,
  CalendarDays,
  Building2, 
  Package, 
  Plus,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  TrendingUp,
  PieChart,
  BarChart3,
  Filter,
  X,
  RotateCcw,
  Calendar,
  Sparkles,
  Droplets,
  Wind,
  RefreshCw,
  ExternalLink,
  Info,
  Check,
  Tag,
  Hand,
  QrCode,
  Copy,
  Download
} from 'lucide-react';
import { GOOGLE_SHEET_URL } from '../services/googleSheetSyncService';
import { getDepartmentColor, getGarmentColor } from '../utils/laundryColorHelper';

const LAUNDRY_GOOGLE_FORM_URL = 'https://forms.gle/gWJNKwbDcTjzibBf9';

interface LaundryAdvancedFilters {
  trackingCode: string;
  department: string;
  stage: 'all' | 'washing' | 'ready';
  dateScope: 'today' | 'current_month' | 'all' | 'custom';
  month: 'current' | 'all' | string;
  year: string;
  startDate: string;
  endDate: string;
}

const defaultFilters: LaundryAdvancedFilters = {
  trackingCode: '',
  department: 'all',
  stage: 'all',
  dateScope: 'today',
  month: 'current',
  year: 'all',
  startDate: '',
  endDate: '',
};

interface LaundryViewProps {
  orders: LaundryOrder[];
  searchQuery?: string;
  currentUser?: AdminUserAccount;
  isAuthenticated?: boolean;
  initialSubTab?: 'pipeline' | 'rags_gloves' | 'analytics';
  onOpenCreateOrder: () => void;
  onSelectOrder: (order: LaundryOrder) => void;
  onUpdateOrder: (updated: LaundryOrder) => void;
  onDeleteOrder?: (orderId: string) => void;
  onSyncGoogleSheet?: () => void;
  isSyncingSheet?: boolean;
  lastSheetSyncTime?: Date | null;
  sheetSyncError?: string | null;
  sheetRowsCount?: number;
}

export const LaundryView: React.FC<LaundryViewProps> = ({
  orders,
  searchQuery = '',
  currentUser,
  isAuthenticated = true,
  initialSubTab = 'pipeline',
  onOpenCreateOrder,
  onSelectOrder,
  onUpdateOrder,
  onDeleteOrder,
  onSyncGoogleSheet,
  isSyncingSheet = false,
  lastSheetSyncTime,
  sheetSyncError,
  sheetRowsCount = 0,
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'pipeline' | 'rags_gloves'>(initialSubTab === 'rags_gloves' ? 'rags_gloves' : 'pipeline');

  useEffect(() => {
    if (initialSubTab === 'rags_gloves') {
      setActiveTab('rags_gloves');
    } else {
      setActiveTab('pipeline');
    }
  }, [initialSubTab]);
  const [selectedStageFilter, setSelectedStageFilter] = useState<LaundryStage | 'all'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'board' | 'calendar'>('grid');
  const [showRuleInfo, setShowRuleInfo] = useState<boolean>(false);

  // Check if current user is Supervisor or Admin (ผู้ดูแลและแอดมิน)
  const canAccessGoogleSheet = useMemo(() => {
    return isUserAdminOrSupervisor(currentUser, isAuthenticated);
  }, [currentUser, isAuthenticated]);

  // Advanced Filter state
  const [advancedFilters, setAdvancedFilters] = useState<LaundryAdvancedFilters>(defaultFilters);
  const [tempFilters, setTempFilters] = useState<LaundryAdvancedFilters>(defaultFilters);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Analytics Modal State
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);

  // QR Code Modal State for Google Form
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copiedQrLink, setCopiedQrLink] = useState<boolean>(false);

  const STAGES: { id: LaundryStage | 'all'; label: string; countColor: string }[] = [
    { id: 'all', label: language === 'th' ? 'ทั้งหมด' : 'All Orders', countColor: 'bg-slate-200 text-slate-800' },
    { id: 'washing', label: language === 'th' ? 'อยู่ระหว่างซัก' : 'In Washing', countColor: 'bg-amber-100 text-amber-900' },
    { id: 'ready', label: language === 'th' ? 'ซักเสร็จแล้ว' : 'Washed / Ready', countColor: 'bg-emerald-100 text-emerald-800' },
  ];

  // Distinct departments from orders sorted alphabetically
  const availableDepartments = useMemo(() => {
    return (
      Array.from(
        new Set(orders.map((o) => o.customerRoomOrDept?.trim()).filter(Boolean))
      ) as string[]
    ).sort((a, b) => a.localeCompare(b, 'th', { numeric: true, sensitivity: 'base' }));
  }, [orders]);

  // Helper to extract date YYYY-MM-DD from order
  const getOrderDateString = (order: LaundryOrder): string | null => {
    if (order.orderDate) {
      const match = order.orderDate.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    }
    if (order.receivedAt) {
      // Check Thai/Standard date pattern like 19/08/2026 or 19/8/2026 or 2026-08-19
      const slashMatch = order.receivedAt.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (slashMatch) {
        let yr = parseInt(slashMatch[3], 10);
        if (yr > 2400) yr -= 543;
        else if (yr < 100) yr += 2000;
        const mm = slashMatch[2].padStart(2, '0');
        const dd = slashMatch[1].padStart(2, '0');
        return `${yr}-${mm}-${dd}`;
      }
      const matchISO = order.receivedAt.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (matchISO) return `${matchISO[1]}-${matchISO[2]}-${matchISO[3]}`;
    }
    const matchCode = order.trackingCode.replace(/\s+/g, '').match(/LKB2-?(\d{2})(\d{2})(\d{2})/i);
    if (matchCode) {
      const yy = parseInt(matchCode[1], 10);
      const year = yy < 50 ? `20${matchCode[1]}` : (yy > 2400 ? `${yy - 543}` : `19${matchCode[1]}`);
      const month = matchCode[2];
      const day = matchCode[3];
      return `${year}-${month}-${day}`;
    }
    if (order.id) {
      const match = order.id.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    }
    if (order.receivedAt && order.receivedAt.toLowerCase().includes('today')) {
      return new Date().toISOString().split('T')[0];
    }
    return null;
  };

  const getOrderYear = (order: LaundryOrder): string => {
    const d = getOrderDateString(order);
    if (d) return d.substring(0, 4);
    return '2026';
  };

  // Current Date & Month calculation
  const currentNow = new Date();
  const currentYear = currentNow.getFullYear();
  const currentMonth = currentNow.getMonth() + 1;
  const currentDay = currentNow.getDate();
  const currentYearMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

  const thaiMonthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const englishMonthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const thaiShortMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const currentMonthDisplayName = language === 'th'
    ? `${thaiMonthNames[currentMonth - 1]} ${currentYear + 543}`
    : `${englishMonthNames[currentMonth - 1]} ${currentYear}`;
  const currentDayDisplayName = language === 'th'
    ? `${currentDay} ${thaiMonthNames[currentMonth - 1]} ${currentYear + 543}`
    : `${englishMonthNames[currentMonth - 1]} ${currentDay}, ${currentYear}`;

  // List of available months from orders
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentYearMonthStr);
    orders.forEach((o) => {
      const d = getOrderDateString(o);
      if (d) {
        monthsSet.add(d.substring(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [orders, currentYearMonthStr]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.trackingCode.trim()) count++;
    if (advancedFilters.department !== 'all') count++;
    if (advancedFilters.stage !== 'all') count++;
    if (selectedStageFilter !== 'all') count++;
    if (advancedFilters.dateScope !== 'today') count++;
    if (advancedFilters.month !== 'current') count++;
    if (advancedFilters.year !== 'all') count++;
    if (advancedFilters.startDate) count++;
    if (advancedFilters.endDate) count++;
    return count;
  }, [advancedFilters, selectedStageFilter]);

  const hasActiveFilters = activeFiltersCount > 0;

  // Scoped orders (Default to Current Day - วันปัจจุบัน, or Month, or custom date filter)
  const scopedOrders = useMemo(() => {
    return orders.filter((order) => {
      // If user specified custom start/end date range or year, prioritize that
      if (advancedFilters.startDate || advancedFilters.endDate || advancedFilters.year !== 'all') {
        let matches = true;
        const orderDateStr = getOrderDateString(order);
        if (orderDateStr) {
          if (advancedFilters.startDate && orderDateStr < advancedFilters.startDate) matches = false;
          if (advancedFilters.endDate && orderDateStr > advancedFilters.endDate) matches = false;
        }
        if (advancedFilters.year !== 'all' && getOrderYear(order) !== advancedFilters.year) {
          matches = false;
        }
        return matches;
      }

      const orderDateStr = getOrderDateString(order);

      // 1. Default: Today (วันปัจจุบัน)
      if (advancedFilters.dateScope === 'today') {
        if (!orderDateStr) return true; // If no date recorded, include in current batch
        return orderDateStr === currentDateStr;
      }

      // 2. Current Month
      if (advancedFilters.dateScope === 'current_month' || advancedFilters.month === 'current') {
        const orderYearMonth = orderDateStr ? orderDateStr.substring(0, 7) : currentYearMonthStr;
        return orderYearMonth === currentYearMonthStr;
      }

      // 3. All Records
      if (advancedFilters.dateScope === 'all' || advancedFilters.month === 'all') {
        return true;
      }

      // 4. Specific Month string
      if (advancedFilters.month && advancedFilters.month !== 'current' && advancedFilters.month !== 'all') {
        const orderYearMonth = orderDateStr ? orderDateStr.substring(0, 7) : currentYearMonthStr;
        return orderYearMonth === advancedFilters.month;
      }

      return true;
    });
  }, [orders, advancedFilters.dateScope, advancedFilters.month, advancedFilters.year, advancedFilters.startDate, advancedFilters.endDate, currentDateStr, currentYearMonthStr]);

  // Base filtered orders incorporating search query, tracking code, and department filter
  const baseFilteredOrders = useMemo(() => {
    return scopedOrders.filter((order) => {
      // 1. Search query
      const matchesSearch =
        !searchQuery ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customerRoomOrDept && order.customerRoomOrDept.toLowerCase().includes(searchQuery.toLowerCase())) ||
        order.serviceType.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Advanced Filter: Tracking Code
      let matchesAdvTracking = true;
      if (advancedFilters.trackingCode.trim()) {
        const q = advancedFilters.trackingCode.trim().toLowerCase().replace(/[\s\-_]/g, '');
        const t = order.trackingCode.toLowerCase().replace(/[\s\-_]/g, '');
        matchesAdvTracking = t.includes(q);
      }

      // 3. Advanced Filter: Department
      let matchesAdvDept = true;
      if (advancedFilters.department !== 'all') {
        matchesAdvDept = (order.customerRoomOrDept || '') === advancedFilters.department;
      }

      return matchesSearch && matchesAdvTracking && matchesAdvDept;
    });
  }, [scopedOrders, searchQuery, advancedFilters.trackingCode, advancedFilters.department]);

  // Quick statistics calculation reflects the filtered data!
  const totalOrders = baseFilteredOrders.length;
  const inWashingCount = baseFilteredOrders.filter((o) => o.stage !== 'ready' && o.stage !== 'delivered').length;
  const readyCount = baseFilteredOrders.filter((o) => o.stage === 'ready' || o.stage === 'delivered').length;
  const totalPieces = baseFilteredOrders.reduce((sum, o) => sum + o.items.reduce((isum, i) => isum + i.quantity, 0), 0);

  // Filter orders according to stage filter (Interactive from Top 3 Metric Cards or Advanced Filter)
  const filteredOrders = useMemo(() => {
    return baseFilteredOrders.filter((order) => {
      let matchesStage = true;
      const effectiveStage = advancedFilters.stage !== 'all' ? advancedFilters.stage : selectedStageFilter;
      if (effectiveStage === 'washing') {
        matchesStage = order.stage !== 'ready' && order.stage !== 'delivered';
      } else if (effectiveStage === 'ready') {
        matchesStage = order.stage === 'ready' || order.stage === 'delivered';
      }
      return matchesStage;
    });
  }, [baseFilteredOrders, advancedFilters.stage, selectedStageFilter]);

  // Orders provided to Calendar View (not limited to today's date so user can view all days & months)
  const calendarOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Search query
      const matchesSearch =
        !searchQuery ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customerRoomOrDept && order.customerRoomOrDept.toLowerCase().includes(searchQuery.toLowerCase())) ||
        order.serviceType.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Advanced Filter: Tracking Code
      let matchesAdvTracking = true;
      if (advancedFilters.trackingCode.trim()) {
        const q = advancedFilters.trackingCode.trim().toLowerCase().replace(/[\s\-_]/g, '');
        const t = order.trackingCode.toLowerCase().replace(/[\s\-_]/g, '');
        matchesAdvTracking = t.includes(q);
      }

      // 3. Advanced Filter: Department
      let matchesAdvDept = true;
      if (advancedFilters.department !== 'all') {
        matchesAdvDept = (order.customerRoomOrDept || '') === advancedFilters.department;
      }

      // 4. Stage Filter
      let matchesStage = true;
      const effectiveStage = advancedFilters.stage !== 'all' ? advancedFilters.stage : selectedStageFilter;
      if (effectiveStage === 'washing') {
        matchesStage = order.stage !== 'ready' && order.stage !== 'delivered';
      } else if (effectiveStage === 'ready') {
        matchesStage = order.stage === 'ready' || order.stage === 'delivered';
      }

      // 5. Custom Year or Date Range (if user explicitly set them in Advanced Filter)
      if (advancedFilters.year !== 'all' && getOrderYear(order) !== advancedFilters.year) {
        return false;
      }
      const orderDateStr = getOrderDateString(order);
      if (advancedFilters.startDate && orderDateStr && orderDateStr < advancedFilters.startDate) {
        return false;
      }
      if (advancedFilters.endDate && orderDateStr && orderDateStr > advancedFilters.endDate) {
        return false;
      }

      return matchesSearch && matchesAdvTracking && matchesAdvDept && matchesStage;
    });
  }, [orders, searchQuery, advancedFilters, selectedStageFilter]);

  // Helper to extract timestamp or date for sorting (latest first)
  const getOrderSortTimestamp = (order: LaundryOrder): number => {
    // 1. Try date extraction from receivedAt or ISO string
    if (order.receivedAt) {
      const matchISO = order.receivedAt.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (matchISO) {
        const y = parseInt(matchISO[1], 10);
        const m = parseInt(matchISO[2], 10) - 1;
        const d = parseInt(matchISO[3], 10);
        
        const matchTime = order.receivedAt.match(/(\d{1,2}):(\d{2})/);
        const hour = matchTime ? parseInt(matchTime[1], 10) : 0;
        const min = matchTime ? parseInt(matchTime[2], 10) : 0;
        return new Date(y, m, d, hour, min).getTime();
      }
    }

    // 2. Parse from tracking code: LKB2 - YYMMDDSS
    const matchCode = order.trackingCode.replace(/\s+/g, '').match(/LKB2-?(\d{2})(\d{2})(\d{2})(\d*)/i);
    if (matchCode) {
      const y = parseInt(`20${matchCode[1]}`, 10);
      const m = parseInt(matchCode[2], 10) - 1;
      const d = parseInt(matchCode[3], 10);
      const seq = matchCode[4] ? parseInt(matchCode[4], 10) : 0;
      return new Date(y, m, d, 0, 0, 0).getTime() + seq * 60000;
    }

    const orderDateStr = getOrderDateString(order);
    if (orderDateStr) {
      return new Date(orderDateStr).getTime();
    }

    return 0;
  };

  // Sort orders with latest/newest first
  const sortedFilteredOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const timeA = getOrderSortTimestamp(a);
      const timeB = getOrderSortTimestamp(b);
      if (timeA !== timeB) {
        return timeB - timeA; // Newest / latest first
      }
      return b.trackingCode.localeCompare(a.trackingCode, undefined, { numeric: true });
    });
  }, [filteredOrders]);

  // 6 Items Pagination for Table and Grid/Card views
  const PAGE_SIZE = 6;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page when filters, search query, or view mode change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStageFilter, advancedFilters, viewMode]);

  const totalPages = Math.max(1, Math.ceil(sortedFilteredOrders.length / PAGE_SIZE));
  const validatedPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validatedPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, sortedFilteredOrders.length);

  const paginatedOrders = useMemo(() => {
    return sortedFilteredOrders.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedFilteredOrders, startIndex]);

  const handleToggleStage = (e: React.MouseEvent, order: LaundryOrder) => {
    e.stopPropagation();
    const isCurrentlyReady = order.stage === 'ready' || order.stage === 'delivered';
    const nextStage: LaundryStage = isCurrentlyReady ? 'washing' : 'ready';
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const label = nextStage === 'ready'
      ? (language === 'th' ? 'เปลี่ยนสถานะเป็น: ซักเสร็จแล้ว' : 'Status: Washed / Ready')
      : (language === 'th' ? 'เปลี่ยนสถานะเป็น: อยู่ระหว่างซัก' : 'Status: In Washing');

    const updated: LaundryOrder = {
      ...order,
      stage: nextStage,
      completedAt: nextStage === 'ready' ? `Today, ${now}` : undefined,
      historyTimeline: [
        ...order.historyTimeline,
        {
          stage: nextStage,
          label,
          timestamp: `Today, ${now}`,
          note: language === 'th' ? 'อัปเดตสถานะการซัก' : 'Status updated.',
          operator: 'Elena Rostova',
        },
      ],
    };
    onUpdateOrder(updated);
  };

  const getStageBadge = (stage: LaundryStage) => {
    const isReady = stage === 'ready' || stage === 'delivered';
    if (isReady) {
      return (
        <span
          className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5 shadow-2xs select-none"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{language === 'th' ? 'ซักเสร็จแล้ว' : 'Washed / Ready'}</span>
        </span>
      );
    }
    return (
      <span
        className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1.5 shadow-2xs select-none"
      >
        <Waves className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>{language === 'th' ? 'อยู่ระหว่างซัก' : 'In Washing'}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* Medium Sky Blue - White Moving Gradient Header with Floating Gown & Glove Icons */}
      {/* ========================================================================= */}
      <div className="animated-laundry-header rounded-3xl p-6 sm:p-7 text-[#0369a1] shadow-xl border border-sky-200/80 relative overflow-hidden space-y-5">
        {/* Floating Ambient Glow Orbs */}
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-sky-300/40 rounded-full blur-3xl pointer-events-none animate-orb-1" />
        <div className="absolute -bottom-16 -right-12 w-72 h-72 bg-blue-300/35 rounded-full blur-3xl pointer-events-none animate-orb-2" />

        {/* Floating Animated Icons: Gowns (เสื้อกาวน์) and Gloves (ถุงมือ) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          {/* Main Large Floating Gown Icon */}
          <div className="absolute right-4 sm:right-16 top-1/2 -translate-y-1/2 opacity-20 text-sky-700 animate-gown-float">
            <Shirt className="w-40 h-40 sm:w-52 sm:h-52 stroke-[1.5]" />
          </div>
          
          {/* Floating Glove Icon 1 */}
          <div className="absolute right-36 sm:right-64 bottom-2 opacity-25 text-blue-600 animate-glove-float">
            <Hand className="w-20 h-20 sm:w-28 sm:h-28 stroke-[1.5]" />
          </div>

          {/* Secondary Floating Gown Icon (Upper Right) */}
          <div className="absolute right-64 sm:right-96 top-2 opacity-15 text-sky-600 animate-laundry-float-rev">
            <Shirt className="w-16 h-16 sm:w-20 sm:h-20 stroke-[1.5]" />
          </div>

          {/* Floating Glove Icon 2 (Left Ambient) */}
          <div className="absolute left-1/3 top-3 opacity-15 text-sky-500 animate-laundry-float">
            <Hand className="w-14 h-14 sm:w-16 sm:h-16 stroke-[1.5]" />
          </div>

          {/* Sparkles / Water Droplets */}
          <div className="absolute right-20 top-4 opacity-30 text-amber-500 animate-sparkle-glint">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="absolute right-48 bottom-8 opacity-25 text-sky-400 animate-bubble-1">
            <Droplets className="w-6 h-6" />
          </div>
        </div>

        {/* Title and Top Actions */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3">
              {/* Laundry Icon Badge */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/95 shadow-md border border-sky-200/90 flex items-center justify-center shrink-0">
                <Shirt className="w-7 h-7 text-sky-600 animate-pulse" />
                <div className="absolute -top-1 -right-1 text-amber-500">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="absolute -bottom-1 -left-1 text-sky-500">
                  <Hand className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0369a1] drop-shadow-xs">
                  {t.laundryTitle}
                </h1>
              </div>
            </div>

            {/* Current Date / Scope Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/95 text-sky-900 rounded-full text-xs font-bold border border-sky-300 shadow-2xs self-start sm:self-auto sm:ml-2">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>
                {advancedFilters.dateScope === 'today'
                  ? (language === 'th' ? `ข้อมูลประจำวัน: ${currentDayDisplayName}` : `Today: ${currentDayDisplayName}`)
                  : advancedFilters.dateScope === 'current_month' || advancedFilters.month === 'current'
                  ? (language === 'th' ? `ข้อมูลประจำเดือน: ${currentMonthDisplayName}` : `Month: ${currentMonthDisplayName}`)
                  : (language === 'th' ? 'ข้อมูลทั้งหมด' : 'All Time')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
            {/* 1. ไอคอน สถิติและการวิเคราะห์ (ย้ายมาไว้ข้างหน้า ข้อมูลเศษผ้า - ถุงมือ) */}
            <button
              type="button"
              onClick={() => setIsAnalyticsOpen(true)}
              className="p-2.5 rounded-xl bg-white/85 hover:bg-white text-sky-950 border border-sky-200/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs hover:border-sky-300"
              title={language === 'th' ? 'สถิติและการวิเคราะห์' : 'Analytics & Statistics'}
              aria-label={language === 'th' ? 'สถิติและการวิเคราะห์' : 'Analytics & Statistics'}
            >
              <BarChart3 className="w-5 h-5 text-sky-600 stroke-[2]" />
            </button>

            {/* 2. ไอคอน ข้อมูลเศษผ้า - ถุงมือ (Icon Only) */}
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'rags_gloves' ? 'pipeline' : 'rags_gloves')}
              className={`p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center ${
                activeTab === 'rags_gloves'
                  ? 'bg-sky-600 text-white shadow-md ring-2 ring-sky-400'
                  : 'bg-white/85 hover:bg-white text-sky-950 border border-sky-200 shadow-xs'
              }`}
              title={language === 'th' ? 'ข้อมูลเศษผ้า - ถุงมือ' : t.ragsGlovesTab}
              aria-label={language === 'th' ? 'ข้อมูลเศษผ้า - ถุงมือ' : t.ragsGlovesTab}
            >
              <Hand className="w-5 h-5 stroke-[2]" />
            </button>

            {/* 3. ไอคอน ตัวกรองการค้นหา */}
            <button
              type="button"
              onClick={() => {
                setTempFilters(advancedFilters);
                setIsFilterModalOpen(true);
              }}
              className={`p-2.5 rounded-xl border backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center relative shadow-xs hover:border-sky-300 ${
                activeFiltersCount > 0
                  ? 'bg-sky-600 text-white border-sky-400 shadow-md ring-2 ring-sky-300'
                  : 'bg-white/85 hover:bg-white text-sky-950 border border-sky-200/80'
              }`}
              title={language === 'th' ? (activeFiltersCount > 0 ? `ตัวกรองการค้นหา (${activeFiltersCount})` : 'ตัวกรองการค้นหา') : (activeFiltersCount > 0 ? `Filters (${activeFiltersCount})` : 'Filters')}
              aria-label={language === 'th' ? 'ตัวกรองการค้นหา' : 'Filters'}
            >
              <Filter className={`w-5 h-5 stroke-[2] ${activeFiltersCount > 0 ? 'text-white' : 'text-sky-600'}`} />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white shadow-xs">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* 4. กลุ่มไอคอน มุมมองรายการ (View Mode Toggle Buttons - List, Card, Paper/Sheet, Calendar) */}
            <div className="flex items-center bg-white/85 p-1 rounded-xl backdrop-blur-xs border border-sky-200/80 shadow-xs">
              {/* ตาราง */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('pipeline');
                  setViewMode('table');
                }}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'pipeline' && viewMode === 'table'
                    ? 'bg-sky-700 text-white shadow-xs'
                    : 'text-sky-900/80 hover:text-sky-950 hover:bg-sky-50'
                }`}
                title={language === 'th' ? 'มุมมองตาราง' : 'Table View'}
                aria-label={language === 'th' ? 'มุมมองตาราง' : 'Table View'}
              >
                <List className="w-4 h-4" />
              </button>

              {/* การ์ด */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('pipeline');
                  setViewMode('grid');
                }}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'pipeline' && viewMode === 'grid'
                    ? 'bg-sky-700 text-white shadow-xs'
                    : 'text-sky-900/80 hover:text-sky-950 hover:bg-sky-50'
                }`}
                title={language === 'th' ? 'มุมมองการ์ด' : 'Card View'}
                aria-label={language === 'th' ? 'มุมมองการ์ด' : 'Card View'}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              {/* กระดานขั้นตอน (Board / Pipeline) */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('pipeline');
                  setViewMode('board');
                }}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'pipeline' && viewMode === 'board'
                    ? 'bg-sky-700 text-white shadow-xs'
                    : 'text-sky-900/80 hover:text-sky-950 hover:bg-sky-50'
                }`}
                title={language === 'th' ? 'มุมมองกระดานขั้นตอน' : 'Board View'}
                aria-label={language === 'th' ? 'มุมมองกระดานขั้นตอน' : 'Board View'}
              >
                <Columns className="w-4 h-4" />
              </button>

              {/* ปฏิทิน */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('pipeline');
                  setViewMode('calendar');
                }}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'pipeline' && viewMode === 'calendar'
                    ? 'bg-sky-700 text-white shadow-xs'
                    : 'text-sky-900/80 hover:text-sky-950 hover:bg-sky-50'
                }`}
                title={language === 'th' ? 'มุมมองปฏิทิน' : 'Calendar View'}
                aria-label={language === 'th' ? 'มุมมองปฏิทิน' : 'Calendar View'}
              >
                <CalendarDays className="w-4 h-4" />
              </button>

              {/* เส้นคั่นบางๆ และไอคอน QR code (จำกัดสิทธิ์เฉพาะผู้ดูแลและแอดมินเพจเท่านั้น) */}
              {canAccessGoogleSheet && (
                <>
                  <div className="w-[1px] h-4 bg-sky-200 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="p-2 rounded-lg transition-all cursor-pointer text-sky-900 hover:text-sky-950 hover:bg-sky-100/70 active:scale-95 group relative"
                    title={language === 'th' ? 'QR Code แบบฟอร์มกรอกข้อมูลการซัก-อบผ้า (เฉพาะผู้ดูแล/แอดมิน)' : 'Laundry Google Form QR Code (Admin Only)'}
                    aria-label={language === 'th' ? 'QR Code แบบฟอร์มกรอกข้อมูลการซัก-อบผ้า' : 'Laundry Google Form QR Code'}
                  >
                    <QrCode className="w-4 h-4 text-sky-700 transition-transform group-hover:scale-110" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Integrated Metric Cards Row Inside Header (Interactive Filter Cards) */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5 pt-1">
          {/* Card 1: รายการผ้าทั้งหมด */}
          <button
            type="button"
            onClick={() => {
              setSelectedStageFilter('all');
              setAdvancedFilters((prev) => ({ ...prev, stage: 'all' }));
            }}
            className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer select-none group relative overflow-hidden backdrop-blur-md ${
              selectedStageFilter === 'all'
                ? 'bg-white text-sky-950 ring-2 ring-sky-600 shadow-md border-sky-400 scale-[1.01]'
                : 'bg-white/80 hover:bg-white text-sky-950 border-sky-200/80 hover:border-sky-300 shadow-xs hover:shadow-sm'
            }`}
          >
            {selectedStageFilter === 'all' && (
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-300">
                <Check className="w-3 h-3 text-sky-700" />
                <span>{language === 'th' ? 'กำลังแสดง' : 'Active'}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sky-900 text-xs font-bold mb-1.5 pr-14">
              <span>{language === 'th' ? 'รายการผ้าทั้งหมด' : t.totalActiveLoad}</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div>
                <p className="text-2xl sm:text-3xl font-black text-sky-900">{totalOrders}</p>
                <span className="text-[11px] text-sky-800/80 font-semibold">{totalPieces} {language === 'th' ? 'ชิ้นรวมทั้งหมด' : 'pcs total'}</span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                selectedStageFilter === 'all' ? 'bg-sky-600 text-white' : 'bg-sky-100 text-sky-700 group-hover:bg-sky-200'
              }`}>
                <Package className="w-5 h-5" />
              </div>
            </div>
          </button>

          {/* Card 2: อยู่ระหว่างซัก */}
          <button
            type="button"
            onClick={() => {
              setSelectedStageFilter('washing');
              setAdvancedFilters((prev) => ({ ...prev, stage: 'washing' }));
            }}
            className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer select-none group relative overflow-hidden backdrop-blur-md ${
              selectedStageFilter === 'washing'
                ? 'bg-amber-50/95 text-amber-950 ring-2 ring-amber-500 shadow-md border-amber-400 scale-[1.01]'
                : 'bg-white/80 hover:bg-white text-amber-900 border-amber-200/80 hover:border-amber-300 shadow-xs hover:shadow-sm'
            }`}
          >
            {selectedStageFilter === 'washing' && (
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                <Check className="w-3 h-3 text-amber-800" />
                <span>{language === 'th' ? 'กำลังแสดง' : 'Active'}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-amber-900 text-xs font-bold mb-1.5 pr-14">
              <span>{language === 'th' ? 'อยู่ระหว่างซัก' : 'In Washing'}</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div>
                <p className="text-2xl sm:text-3xl font-black text-amber-600">{inWashingCount}</p>
                <span className="text-[11px] text-amber-800 font-semibold">{language === 'th' ? 'กำลังดำเนินการซัก' : 'Active Cycle'}</span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                selectedStageFilter === 'washing' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700 group-hover:bg-amber-200'
              }`}>
                <Waves className="w-5 h-5" />
              </div>
            </div>
          </button>

          {/* Card 3: ซักเสร็จแล้ว */}
          <button
            type="button"
            onClick={() => {
              setSelectedStageFilter('ready');
              setAdvancedFilters((prev) => ({ ...prev, stage: 'ready' }));
            }}
            className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer select-none group relative overflow-hidden backdrop-blur-md ${
              selectedStageFilter === 'ready'
                ? 'bg-emerald-50/95 text-emerald-950 ring-2 ring-emerald-600 shadow-md border-emerald-400 scale-[1.01]'
                : 'bg-white/80 hover:bg-white text-emerald-900 border-emerald-200/80 hover:border-emerald-300 shadow-xs hover:shadow-sm'
            }`}
          >
            {selectedStageFilter === 'ready' && (
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-emerald-200 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                <Check className="w-3 h-3 text-emerald-800" />
                <span>{language === 'th' ? 'กำลังแสดง' : 'Active'}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-emerald-900 text-xs font-bold mb-1.5 pr-14">
              <span>{language === 'th' ? 'ซักเสร็จแล้ว' : 'Washed / Ready'}</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div>
                <p className="text-2xl sm:text-3xl font-black text-emerald-700">{readyCount}</p>
                <span className="text-[11px] text-emerald-800 font-semibold">{language === 'th' ? 'พร้อมส่งมอบงาน' : 'Completed'}</span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                selectedStageFilter === 'ready' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200'
              }`}>
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ORDERS PIPELINE */}
      {/* ========================================================================= */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          {/* Active Filter Chips Banner */}
          {hasActiveFilters && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 flex-wrap animate-in fade-in duration-200">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-bold text-[#064e3b] flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-emerald-600" />
                  {language === 'th' ? 'ตัวกรองที่ใช้งานอยู่:' : 'Active Filters:'}
                </span>

                {/* Stage Filter Chip */}
                {selectedStageFilter !== 'all' && (
                  <span className={`px-2 py-0.5 font-semibold rounded-md border flex items-center gap-1 ${
                    selectedStageFilter === 'washing' 
                      ? 'bg-amber-100 text-amber-900 border-amber-300' 
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}>
                    {language === 'th' ? 'สถานะ:' : 'Status:'} {selectedStageFilter === 'washing' ? (language === 'th' ? 'อยู่ระหว่างซัก' : 'In Washing') : (language === 'th' ? 'ซักเสร็จแล้ว' : 'Ready')}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStageFilter('all');
                        setAdvancedFilters((f) => ({ ...f, stage: 'all' }));
                      }}
                      className="text-amber-800 hover:text-amber-950 ml-0.5 cursor-pointer"
                      title={language === 'th' ? 'ยกเลิกตัวกรองสถานะ' : 'Clear status filter'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* Month Filter Chip */}
                {advancedFilters.month !== 'current' && (
                  <span className="px-2 py-0.5 bg-white text-emerald-900 font-semibold rounded-md border border-emerald-200 flex items-center gap-1">
                    {language === 'th' ? 'เดือน:' : 'Month:'} {advancedFilters.month === 'all' ? (language === 'th' ? 'ทุกเดือน' : 'All Months') : advancedFilters.month}
                    <button
                      type="button"
                      onClick={() => setAdvancedFilters((f) => ({ ...f, month: 'current' }))}
                      className="text-emerald-700 hover:text-emerald-950 ml-0.5 cursor-pointer"
                      title={language === 'th' ? 'กลับไปแสดงเดือนปัจจุบัน' : 'Back to current month'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {advancedFilters.trackingCode.trim() && (
                  <span className="px-2 py-0.5 bg-white text-emerald-900 font-semibold rounded-md border border-emerald-200 flex items-center gap-1">
                    {language === 'th' ? 'รหัส:' : 'Code:'} {advancedFilters.trackingCode}
                    <button
                      type="button"
                      onClick={() => setAdvancedFilters((f) => ({ ...f, trackingCode: '' }))}
                      className="text-emerald-700 hover:text-emerald-950 ml-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {advancedFilters.department !== 'all' && (
                  <span className="px-2 py-0.5 bg-white text-emerald-900 font-semibold rounded-md border border-emerald-200 flex items-center gap-1">
                    {language === 'th' ? 'แผนก:' : 'Dept:'} {advancedFilters.department}
                    <button
                      type="button"
                      onClick={() => setAdvancedFilters((f) => ({ ...f, department: 'all' }))}
                      className="text-emerald-700 hover:text-emerald-950 ml-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {advancedFilters.year !== 'all' && (
                  <span className="px-2 py-0.5 bg-white text-emerald-900 font-semibold rounded-md border border-emerald-200 flex items-center gap-1">
                    {language === 'th' ? 'ปี:' : 'Year:'} {advancedFilters.year}
                    <button
                      type="button"
                      onClick={() => setAdvancedFilters((f) => ({ ...f, year: 'all' }))}
                      className="text-emerald-700 hover:text-emerald-950 ml-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {(advancedFilters.startDate || advancedFilters.endDate) && (
                  <span className="px-2 py-0.5 bg-white text-emerald-900 font-semibold rounded-md border border-emerald-200 flex items-center gap-1">
                    {language === 'th' ? 'วันที่:' : 'Date:'} {advancedFilters.startDate || '...'} ถึง {advancedFilters.endDate || '...'}
                    <button
                      type="button"
                      onClick={() => setAdvancedFilters((f) => ({ ...f, startDate: '', endDate: '' }))}
                      className="text-emerald-700 hover:text-emerald-950 ml-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedStageFilter('all');
                  setAdvancedFilters(defaultFilters);
                }}
                className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-100 rounded-lg border border-emerald-300 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                {language === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Clear All'}
              </button>
            </div>
          )}

          {/* VIEW 4: CALENDAR VIEW (มุมมองปฏิทิน - แสดงข้อมูลทุกวันในเดือนและเลือกดูวันอื่นได้) */}
          {viewMode === 'calendar' ? (
            <LaundryCalendarView
              orders={calendarOrders}
              onSelectOrder={onSelectOrder}
              onOpenCreateOrder={onOpenCreateOrder}
              onToggleStage={handleToggleStage}
            />
          ) : sortedFilteredOrders.length === 0 ? (
            /* Empty State for other views */
            <div className="bg-white rounded-2xl p-12 text-center border border-[#e2e8f0]">
              <Shirt className="w-12 h-12 text-[#74777f]/40 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#002045]">{t.noOrdersFound}</h3>
              <p className="text-xs text-[#74777f] max-w-sm mx-auto mt-1">
                {t.noOrdersDesc}
              </p>
            </div>
          ) : viewMode === 'board' ? (
            /* ========================================================================= */
            /* VIEW: PIPELINE / BOARD VIEW (กระดานขั้นตอน 3 คอลัมน์ เหมือนหัวข้อการแจ้งซ่อม) */
            /* ========================================================================= */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Column 1: อยู่ระหว่างซัก / กำลังดำเนินการ (In Washing / In Progress) */}
              <div className="bg-amber-50/40 rounded-3xl p-4 border border-amber-200 flex flex-col max-h-[75vh]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-200 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-amber-950">
                      {language === 'th' ? 'อยู่ระหว่างซัก / กำลังดำเนินการ' : 'In Washing / In Progress'}
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-mono text-xs font-bold">
                    {sortedFilteredOrders.filter((o) => o.stage !== 'ready' && o.stage !== 'delivered').length}
                  </span>
                </div>

                <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                  {sortedFilteredOrders
                    .filter((o) => o.stage !== 'ready' && o.stage !== 'delivered')
                    .map((order) => {
                      const totalItemQty = order.items.reduce((s, i) => s + i.quantity, 0);
                      const garmentTypeName = order.notes?.match(/ประเภทผ้า:\s*([^|]+)/)?.[1]?.trim() || 
                                             order.items[0]?.name || (language === 'th' ? 'ผ้าทั่วไป' : 'General Linen');
                      const deptStyle = getDepartmentColor(order.customerRoomOrDept);
                      const garmentStyle = getGarmentColor(garmentTypeName);
                      const orderDateStr = getOrderDateString(order) || currentDateStr;
                      return (
                        <div
                          key={order.id}
                          onClick={() => onSelectOrder(order)}
                          className="bg-white p-4 rounded-2xl border border-amber-200/80 hover:shadow-md hover:border-amber-400 transition-all cursor-pointer space-y-2.5 group relative"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-[#002045] group-hover:text-emerald-700 transition-colors">
                              {order.trackingCode}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {orderDateStr}
                            </span>
                          </div>

                          {/* Garment Type Badge with distinct color */}
                          <div className="flex items-center justify-between gap-2">
                            <div className={`text-xs font-bold px-2 py-1 rounded-lg border flex items-center gap-1.5 line-clamp-1 max-w-[200px] ${garmentStyle.pill}`}>
                              <Shirt className={`w-3.5 h-3.5 shrink-0 ${garmentStyle.icon}`} />
                              <span className="truncate">{garmentTypeName}</span>
                            </div>
                            <span className="text-xs font-black font-mono text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md shrink-0">
                              {totalItemQty} <span className="text-[10px] font-normal">{language === 'th' ? 'ชิ้น' : 'pcs'}</span>
                            </span>
                          </div>

                          {/* Department with distinct color */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                            <div className={`px-2 py-0.5 rounded-md truncate font-bold border flex items-center gap-1 max-w-[150px] ${deptStyle.pill}`}>
                              <Building2 className={`w-3 h-3 shrink-0 ${deptStyle.icon}`} />
                              <span className="truncate">{order.customerRoomOrDept || (language === 'th' ? 'แผนกทั่วไป' : 'General')}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStage(e, order);
                              }}
                              className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                              title={language === 'th' ? 'บันทึกซักเสร็จ' : 'Mark Ready'}
                            >
                              <Check className="w-3 h-3" />
                              <span>{language === 'th' ? 'เสร็จ' : 'Done'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  {sortedFilteredOrders.filter((o) => o.stage !== 'ready' && o.stage !== 'delivered').length === 0 && (
                    <div className="py-8 text-center text-xs text-amber-800/60 font-medium">
                      {language === 'th' ? 'ไม่มีรายการอยู่ระหว่างซัก' : 'No orders in progress'}
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: ซักเสร็จแล้ว / พร้อมส่งมอบ (Washed / Ready) */}
              <div className="bg-sky-50/40 rounded-3xl p-4 border border-sky-200 flex flex-col max-h-[75vh]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-sky-200 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-sky-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-sky-950">
                      {language === 'th' ? 'ซักเสร็จแล้ว / พร้อมส่งมอบ' : 'Washed / Ready'}
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-200 text-sky-950 font-mono text-xs font-bold">
                    {sortedFilteredOrders.filter((o) => o.stage === 'ready').length}
                  </span>
                </div>

                <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                  {sortedFilteredOrders
                    .filter((o) => o.stage === 'ready')
                    .map((order) => {
                      const totalItemQty = order.items.reduce((s, i) => s + i.quantity, 0);
                      const garmentTypeName = order.notes?.match(/ประเภทผ้า:\s*([^|]+)/)?.[1]?.trim() || 
                                             order.items[0]?.name || (language === 'th' ? 'ผ้าทั่วไป' : 'General Linen');
                      const deptStyle = getDepartmentColor(order.customerRoomOrDept);
                      const garmentStyle = getGarmentColor(garmentTypeName);
                      const orderDateStr = getOrderDateString(order) || currentDateStr;
                      return (
                        <div
                          key={order.id}
                          onClick={() => onSelectOrder(order)}
                          className="bg-white p-4 rounded-2xl border border-sky-200/80 hover:shadow-md hover:border-sky-400 transition-all cursor-pointer space-y-2.5 group relative"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-[#002045] group-hover:text-emerald-700 transition-colors">
                              {order.trackingCode}
                            </span>
                            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {order.completedAt || order.estimatedCompletion || (language === 'th' ? 'พร้อมส่ง' : 'Ready')}
                            </span>
                          </div>

                          {/* Garment Type Badge with distinct color */}
                          <div className="flex items-center justify-between gap-2">
                            <div className={`text-xs font-bold px-2 py-1 rounded-lg border flex items-center gap-1.5 line-clamp-1 max-w-[200px] ${garmentStyle.pill}`}>
                              <Shirt className={`w-3.5 h-3.5 shrink-0 ${garmentStyle.icon}`} />
                              <span className="truncate">{garmentTypeName}</span>
                            </div>
                            <span className="text-xs font-black font-mono text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded-md shrink-0">
                              {totalItemQty} <span className="text-[10px] font-normal">{language === 'th' ? 'ชิ้น' : 'pcs'}</span>
                            </span>
                          </div>

                          {/* Department with distinct color */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                            <div className={`px-2 py-0.5 rounded-md truncate font-bold border flex items-center gap-1 max-w-[150px] ${deptStyle.pill}`}>
                              <Building2 className={`w-3 h-3 shrink-0 ${deptStyle.icon}`} />
                              <span className="truncate">{order.customerRoomOrDept || (language === 'th' ? 'แผนกทั่วไป' : 'General')}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStage(e, order);
                              }}
                              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                              title={language === 'th' ? 'ทำเครื่องหมายว่ายังไม่เสร็จ' : 'Mark In Washing'}
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{language === 'th' ? 'ย้อนกลับ' : 'Revert'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  {sortedFilteredOrders.filter((o) => o.stage === 'ready').length === 0 && (
                    <div className="py-8 text-center text-xs text-sky-800/60 font-medium">
                      {language === 'th' ? 'ไม่มีรายการซักเสร็จ' : 'No ready orders'}
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: ส่งมอบเรียบร้อย / ปิดงาน (Delivered / Completed) */}
              <div className="bg-emerald-50/40 rounded-3xl p-4 border border-emerald-200 flex flex-col max-h-[75vh]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-200 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <h3 className="text-sm font-bold text-emerald-950">
                      {language === 'th' ? 'ส่งมอบเรียบร้อย / ปิดงาน' : 'Delivered / Completed'}
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-mono text-xs font-bold">
                    {sortedFilteredOrders.filter((o) => o.stage === 'delivered').length}
                  </span>
                </div>

                <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                  {sortedFilteredOrders
                    .filter((o) => o.stage === 'delivered')
                    .map((order) => {
                      const totalItemQty = order.items.reduce((s, i) => s + i.quantity, 0);
                      const garmentTypeName = order.notes?.match(/ประเภทผ้า:\s*([^|]+)/)?.[1]?.trim() || 
                                             order.items[0]?.name || (language === 'th' ? 'ผ้าทั่วไป' : 'General Linen');
                      const deptStyle = getDepartmentColor(order.customerRoomOrDept);
                      const garmentStyle = getGarmentColor(garmentTypeName);
                      const orderDateStr = getOrderDateString(order) || currentDateStr;
                      return (
                        <div
                          key={order.id}
                          onClick={() => onSelectOrder(order)}
                          className="bg-white p-4 rounded-2xl border border-emerald-200/80 hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer space-y-2.5 group relative"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-[#002045] group-hover:text-emerald-700 transition-colors">
                              {order.trackingCode}
                            </span>
                            <span className="text-[11px] text-emerald-800 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {language === 'th' ? 'ส่งมอบแล้ว' : 'Delivered'}
                            </span>
                          </div>

                          {/* Garment Type Badge with distinct color */}
                          <div className="flex items-center justify-between gap-2">
                            <div className={`text-xs font-bold px-2 py-1 rounded-lg border flex items-center gap-1.5 line-clamp-1 max-w-[200px] ${garmentStyle.pill}`}>
                              <Shirt className={`w-3.5 h-3.5 shrink-0 ${garmentStyle.icon}`} />
                              <span className="truncate">{garmentTypeName}</span>
                            </div>
                            <span className="text-xs font-black font-mono text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded-md shrink-0">
                              {totalItemQty} <span className="text-[10px] font-normal">{language === 'th' ? 'ชิ้น' : 'pcs'}</span>
                            </span>
                          </div>

                          {/* Department with distinct color */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                            <div className={`px-2 py-0.5 rounded-md truncate font-bold border flex items-center gap-1 max-w-[150px] ${deptStyle.pill}`}>
                              <Building2 className={`w-3 h-3 shrink-0 ${deptStyle.icon}`} />
                              <span className="truncate">{order.customerRoomOrDept || (language === 'th' ? 'แผนกทั่วไป' : 'General')}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {orderDateStr}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  {sortedFilteredOrders.filter((o) => o.stage === 'delivered').length === 0 && (
                    <div className="py-8 text-center text-xs text-emerald-800/60 font-medium">
                      {language === 'th' ? 'ไม่มีรายการที่ปิดงานส่งมอบแล้ว' : 'No delivered orders'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedOrders.map((order) => {
                  const totalItemQty = order.items.reduce((s, i) => s + i.quantity, 0);
                  const isSheetOrder = order.id.startsWith('gsheet-');
                  const garmentTypeName = order.notes?.match(/ประเภทผ้า:\s*([^|]+)/)?.[1]?.trim() || 
                                         order.items[0]?.name || (language === 'th' ? 'ผ้าทั่วไป' : 'General Linen');
                  const deptStyle = getDepartmentColor(order.customerRoomOrDept);
                  const garmentStyle = getGarmentColor(garmentTypeName);
                  return (
                    <div
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className="bg-white rounded-2xl border border-[#e2e8f0] p-5 shadow-xs hover:shadow-md hover:border-[#66affe] transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                    >
                      {/* Top Row: Code and Status */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-[#002045] bg-[#f3f3f4] px-2.5 py-1 rounded border border-[#e2e8f0]">
                              {order.trackingCode}
                            </span>
                            {isSheetOrder && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <FileSpreadsheet className="w-3 h-3" />
                                Sheet
                              </span>
                            )}
                          </div>
                          {getStageBadge(order.stage)}
                        </div>

                        {/* Department (Prominent with distinct color pill) */}
                        <div className="flex items-center gap-1.5">
                          <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${deptStyle.pill}`}>
                            <Building2 className={`w-4 h-4 shrink-0 ${deptStyle.icon}`} />
                            <h3 className="text-base font-extrabold leading-tight">
                              {order.customerRoomOrDept || (language === 'th' ? 'แผนกทั่วไป' : 'General Intake')}
                            </h3>
                          </div>
                        </div>
                        
                        {/* Garment Type Badge with distinct color */}
                        <div className="mt-2.5 flex items-center gap-1.5">
                          <span className={`text-[11px] font-bold border px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 ${garmentStyle.pill}`}>
                            <Tag className={`w-3 h-3 ${garmentStyle.icon}`} />
                            <span>{garmentTypeName}</span>
                          </span>
                        </div>

                        <p className="text-xs text-[#595c62] mt-2.5 flex items-center gap-1">
                          <span className="text-[#74777f]">{language === 'th' ? 'ผู้ส่ง/ผู้บันทึก:' : 'Submitter:'}</span>
                          <span className="font-semibold text-[#1a1c1c]">{order.customerName}</span>
                        </p>

                        {/* Quantity pill */}
                        <div className="mt-3 pt-2.5 border-t border-[#f3f3f4] flex items-center justify-between text-xs">
                          <span className="text-[#74777f] font-medium">{language === 'th' ? 'จำนวนผ้าทั้งหมด' : 'Total Items'}</span>
                          <span className="text-[#002045] font-black text-base">{totalItemQty} <span className="text-xs font-semibold text-[#74777f]">{language === 'th' ? 'ชิ้น' : 'items'}</span></span>
                        </div>
                      </div>

                      {/* Footer Row: Est Time & View Details Indicator */}
                      <div className="mt-4 pt-3 border-t border-[#f3f3f4] flex items-center justify-between text-xs gap-2">
                        <div className="text-[#74777f]">
                          <span className="text-[10px] uppercase font-semibold block text-gray-400">
                            {order.stage === 'ready' || order.stage === 'delivered' ? (language === 'th' ? 'เวลาจัดส่ง' : 'Delivered At') : (language === 'th' ? 'กำหนดเสร็จ' : t.estReady)}
                          </span>
                          <span className="font-semibold text-[#002045] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#0061a5]" />
                            {order.estimatedCompletion}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-bold text-[#0061a5] group-hover:translate-x-0.5 transition-transform">
                          <span>{language === 'th' ? 'ดูรายละเอียด' : 'View Details'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid Pagination Controls */}
              {sortedFilteredOrders.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#e2e8f0] p-3.5 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                  <p className="text-xs text-[#74777f] font-medium">
                    {language === 'th'
                      ? `แสดง ${startIndex + 1} - ${endIndex} จากทั้งหมด ${sortedFilteredOrders.length} รายการ (หน้า ${validatedPage} จาก ${totalPages})`
                      : `Showing ${startIndex + 1} - ${endIndex} of ${sortedFilteredOrders.length} orders (Page ${validatedPage} of ${totalPages})`}
                  </p>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={validatedPage <= 1}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-[#002045] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>{language === 'th' ? 'ก่อนหน้า' : 'Prev'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }).map((_, idx) => {
                          const pageNum = idx + 1;
                          const isActive = pageNum === validatedPage;
                          if (
                            totalPages > 7 &&
                            Math.abs(pageNum - validatedPage) > 2 &&
                            pageNum !== 1 &&
                            pageNum !== totalPages
                          ) {
                            if (Math.abs(pageNum - validatedPage) === 3) {
                              return <span key={`ellipsis-g-${pageNum}`} className="text-xs text-slate-400 px-1">...</span>;
                            }
                            return null;
                          }
                          return (
                            <button
                              key={`grid-page-${pageNum}`}
                              type="button"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-[#0061a5] text-white shadow-2xs'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={validatedPage >= totalPages}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-[#002045] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>{language === 'th' ? 'ถัดไป' : 'Next'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Table View */
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#43474e]">
                      <tr>
                        <th className="py-3.5 px-4 font-semibold">{t.trackingCode}</th>
                        <th className="py-3.5 px-4 font-semibold">{t.customerLocation}</th>
                        <th className="py-3.5 px-4 font-semibold">{language === 'th' ? 'ประเภทผ้า' : 'Garment Type'}</th>
                        <th className="py-3.5 px-4 font-semibold">{language === 'th' ? 'จำนวน' : 'Quantity'}</th>
                        <th className="py-3.5 px-4 font-semibold">{language === 'th' ? 'สถานะ' : 'Status'}</th>
                        <th className="py-3.5 px-4 font-semibold">{language === 'th' ? 'เวลา / กำหนดเสร็จ' : t.estReady}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {paginatedOrders.map((order) => {
                        const isSheetOrder = order.id.startsWith('gsheet-');
                        const garmentTypeName = order.notes?.match(/ประเภทผ้า:\s*([^|]+)/)?.[1]?.trim() || 
                                               order.items[0]?.name || (language === 'th' ? 'ผ้าทั่วไป' : 'General Linen');
                        const totalItemQty = order.items.reduce((s, i) => s + i.quantity, 0);
                        const deptStyle = getDepartmentColor(order.customerRoomOrDept);
                        const garmentStyle = getGarmentColor(garmentTypeName);

                        return (
                          <tr
                            key={order.id}
                            onClick={() => onSelectOrder(order)}
                            className="hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <td className="py-3.5 px-4 font-mono font-bold text-[#002045]">
                              <div className="flex items-center gap-1.5">
                                <span>{order.trackingCode}</span>
                                {isSheetOrder && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    <FileSpreadsheet className="w-3 h-3" />
                                    Sheet
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className={`inline-flex items-center gap-1.5 font-bold text-xs px-2.5 py-1 rounded-lg border ${deptStyle.pill}`}>
                                <Building2 className={`w-3.5 h-3.5 shrink-0 ${deptStyle.icon}`} />
                                <span>{order.customerRoomOrDept || (language === 'th' ? 'แผนกทั่วไป' : 'General Intake')}</span>
                              </div>
                              <p className="text-[#74777f] text-[11px] mt-1 pl-1">
                                {language === 'th' ? 'ผู้บันทึก: ' : 'Submitter: '}<span className="text-[#43474e] font-medium">{order.customerName}</span>
                              </p>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`font-bold text-xs border px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 ${garmentStyle.pill}`}>
                                <Tag className={`w-3 h-3 ${garmentStyle.icon}`} />
                                {garmentTypeName}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[#1a1c1c] font-black text-sm">
                              {totalItemQty} <span className="text-xs font-normal text-[#74777f]">{language === 'th' ? 'ชิ้น' : 'items'}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              {getStageBadge(order.stage)}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#002045]">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#0061a5]" />
                                <span>{order.estimatedCompletion}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table Pagination Controls */}
              {sortedFilteredOrders.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#e2e8f0] p-3.5 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                  <p className="text-xs text-[#74777f] font-medium">
                    {language === 'th'
                      ? `แสดง ${startIndex + 1} - ${endIndex} จากทั้งหมด ${sortedFilteredOrders.length} รายการ (หน้า ${validatedPage} จาก ${totalPages})`
                      : `Showing ${startIndex + 1} - ${endIndex} of ${sortedFilteredOrders.length} orders (Page ${validatedPage} of ${totalPages})`}
                  </p>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={validatedPage <= 1}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-[#002045] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>{language === 'th' ? 'ก่อนหน้า' : 'Prev'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }).map((_, idx) => {
                          const pageNum = idx + 1;
                          const isActive = pageNum === validatedPage;
                          if (
                            totalPages > 7 &&
                            Math.abs(pageNum - validatedPage) > 2 &&
                            pageNum !== 1 &&
                            pageNum !== totalPages
                          ) {
                            if (Math.abs(pageNum - validatedPage) === 3) {
                              return <span key={`ellipsis-t-${pageNum}`} className="text-xs text-slate-400 px-1">...</span>;
                            }
                            return null;
                          }
                          return (
                            <button
                              key={`table-page-${pageNum}`}
                              type="button"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-[#0061a5] text-white shadow-2xs'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={validatedPage >= totalPages}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-[#002045] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>{language === 'th' ? 'ถัดไป' : 'Next'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RAGS & GLOVES LOG (ข้อมูลเศษผ้า - ถุงมือ) */}
      {/* ========================================================================= */}
      {activeTab === 'rags_gloves' && (
        <RagsGlovesLogView 
          currentUser={currentUser}
          isAuthenticated={isAuthenticated}
          onBackToPipeline={() => setActiveTab('pipeline')} 
        />
      )}

      {/* ========================================================================= */}
      {/* ADVANCED FILTER MODAL (ตัวกรองและค้นหาขั้นสูง) */}
      {/* ========================================================================= */}
      {isFilterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsFilterModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Filter className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#002045]">
                    {language === 'th' ? 'ตัวกรองค้นหารายการผ้า' : 'Filter Laundry Orders'}
                  </h3>
                  <p className="text-xs text-[#74777f]">
                    {language === 'th' ? 'ค้นหาตามรหัส, แผนก, สถานะ, ปี และช่วงวันที่' : 'Filter by tracking code, dept, status, year and date range'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Form Controls */}
            <div className="space-y-4 text-xs">
              {/* 1. รหัสติดตาม (Tracking Code) */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#002045] flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#0061a5]" />
                  {language === 'th' ? 'รหัสติดตาม (Tracking Code)' : 'Tracking Code'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={language === 'th' ? 'เช่น LKB2-26081901' : 'e.g. LKB2-26081901'}
                    value={tempFilters.trackingCode}
                    onChange={(e) => setTempFilters({ ...tempFilters, trackingCode: e.target.value })}
                    className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0061a5] font-mono text-xs bg-slate-50/50"
                  />
                  {tempFilters.trackingCode && (
                    <button
                      type="button"
                      onClick={() => setTempFilters({ ...tempFilters, trackingCode: '' })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. แผนก (Department) */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#002045] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#0061a5]" />
                  {language === 'th' ? 'แผนกที่ส่งผ้า (Department)' : 'Department'}
                </label>
                <select
                  value={tempFilters.department}
                  onChange={(e) => setTempFilters({ ...tempFilters, department: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0061a5] text-xs bg-slate-50/50 font-medium"
                >
                  <option value="all">{language === 'th' ? '— ทุกแผนก (All Departments) —' : '— All Departments —'}</option>
                  {availableDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. สถานะ (Status) */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#002045] flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-amber-500" />
                  {language === 'th' ? 'สถานะงานซัก (Status)' : 'Status'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTempFilters({ ...tempFilters, stage: 'all' })}
                    className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                      tempFilters.stage === 'all'
                        ? 'bg-[#002045] text-white shadow-xs'
                        : 'bg-slate-100 text-[#43474e] hover:bg-slate-200'
                    }`}
                  >
                    {language === 'th' ? 'ทั้งหมด' : 'All'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempFilters({ ...tempFilters, stage: 'washing' })}
                    className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      tempFilters.stage === 'washing'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <Waves className="w-3.5 h-3.5" />
                    {language === 'th' ? 'อยู่ระหว่างซัก' : 'In Washing'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempFilters({ ...tempFilters, stage: 'ready' })}
                    className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      tempFilters.stage === 'ready'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {language === 'th' ? 'ซักเสร็จแล้ว' : 'Ready'}
                  </button>
                </div>
              </div>

              {/* 4. ขอบเขตเวลาการแสดงผล (Date Scope) */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#002045] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0061a5]" />
                  {language === 'th' ? 'ช่วงเวลาข้อมูล (Time Scope)' : 'Time Scope'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTempFilters({ ...tempFilters, dateScope: 'today', month: 'current', startDate: '', endDate: '' })}
                    className={`py-2 px-2.5 rounded-xl font-bold transition-all text-center cursor-pointer ${
                      tempFilters.dateScope === 'today'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {language === 'th' ? 'วันนี้' : 'Today'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempFilters({ ...tempFilters, dateScope: 'current_month', month: 'current', startDate: '', endDate: '' })}
                    className={`py-2 px-2.5 rounded-xl font-bold transition-all text-center cursor-pointer ${
                      tempFilters.dateScope === 'current_month'
                        ? 'bg-[#002045] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {language === 'th' ? 'เดือนปัจจุบัน' : 'This Month'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempFilters({ ...tempFilters, dateScope: 'all', month: 'all', startDate: '', endDate: '' })}
                    className={`py-2 px-2.5 rounded-xl font-bold transition-all text-center cursor-pointer ${
                      tempFilters.dateScope === 'all'
                        ? 'bg-[#002045] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {language === 'th' ? 'ทุกช่วงเวลา' : 'All Time'}
                  </button>
                </div>
              </div>

              {/* 5. เดือน (Month) & ปี (Year) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Month */}
                <div className="space-y-1.5">
                  <label className="font-bold text-[#002045] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#0061a5]" />
                    {language === 'th' ? 'เลือกเดือนระบุ (Month)' : 'Specific Month'}
                  </label>
                  <select
                    value={tempFilters.month}
                    onChange={(e) => setTempFilters({ ...tempFilters, month: e.target.value, dateScope: e.target.value === 'current' ? 'current_month' : 'custom' })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0061a5] text-xs bg-slate-50/50 font-semibold"
                  >
                    <option value="current">
                      {language === 'th' ? `เดือนปัจจุบัน (${currentMonthDisplayName})` : `Current Month (${currentMonthDisplayName})`}
                    </option>
                    <option value="all">
                      {language === 'th' ? '— ทุกเดือน (All Months) —' : '— All Months —'}
                    </option>
                    {availableMonths
                      .filter((m) => m !== currentYearMonthStr)
                      .map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Year */}
                <div className="space-y-1.5">
                  <label className="font-bold text-[#002045] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#0061a5]" />
                    {language === 'th' ? 'ปี (Year)' : 'Year'}
                  </label>
                  <select
                    value={tempFilters.year}
                    onChange={(e) => setTempFilters({ ...tempFilters, year: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0061a5] text-xs bg-slate-50/50 font-semibold"
                  >
                    <option value="all">{language === 'th' ? 'ทุกปี' : 'All Years'}</option>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                </div>
              </div>

              {/* 6. ช่วงวันที่ (Date Range: วันที่ ถึง วันที่) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="font-bold text-[#002045]">
                    {language === 'th' ? 'จากวันที่ (Start Date)' : 'From Date'}
                  </label>
                  <input
                    type="date"
                    value={tempFilters.startDate}
                    onChange={(e) => setTempFilters({ ...tempFilters, startDate: e.target.value, dateScope: 'custom' })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0061a5] text-xs bg-slate-50/50"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1.5">
                  <label className="font-bold text-[#002045]">
                    {language === 'th' ? 'ถึงวันที่ (End Date)' : 'To Date'}
                  </label>
                  <input
                    type="date"
                    value={tempFilters.endDate}
                    onChange={(e) => setTempFilters({ ...tempFilters, endDate: e.target.value, dateScope: 'custom' })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0061a5] text-xs bg-slate-50/50"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setTempFilters(defaultFilters)}
                className="px-3.5 py-2 text-xs font-semibold text-[#74777f] hover:text-[#002045] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {language === 'th' ? 'ล้างตัวกรอง' : 'Reset'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#43474e] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdvancedFilters(tempFilters);
                    setIsFilterModalOpen(false);
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{language === 'th' ? 'ใช้งานตัวกรอง' : 'Apply Filters'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal for Google Form (Admin / Supervisor Only) */}
      {showQrModal && canAccessGoogleSheet && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowQrModal(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-emerald-100 w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#002045]">
                    {language === 'th' ? 'QR Code แบบฟอร์มซัก-อบผ้า' : 'Laundry Intake Form QR Code'}
                  </h3>
                  <p className="text-xs text-[#74777f]">
                    {language === 'th' ? 'สแกนเพื่อบันทึกข้อมูลผ่าน Google Form' : 'Scan to submit laundry orders via Google Form'}
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

            {/* QR Code Container */}
            <div className="py-5 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-gradient-to-b from-emerald-50 to-white rounded-2xl border-2 border-emerald-200/80 shadow-md">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(LAUNDRY_GOOGLE_FORM_URL)}&margin=8`}
                  alt="QR Code Google Form"
                  className="w-52 h-52 sm:w-60 sm:h-60 rounded-xl bg-white shadow-inner"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="mt-4 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{language === 'th' ? 'สแกนด้วยกล้องมือถือเพื่อเปิดแบบฟอร์มทันที' : 'Scan with mobile camera to open form instantly'}</span>
              </div>

              {/* URL Box */}
              <div className="mt-3.5 w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 text-left">
                <span className="text-xs font-mono text-slate-600 truncate flex-1 select-all">
                  {LAUNDRY_GOOGLE_FORM_URL}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(LAUNDRY_GOOGLE_FORM_URL);
                    setCopiedQrLink(true);
                    setTimeout(() => setCopiedQrLink(false), 2500);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    copiedQrLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {copiedQrLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{language === 'th' ? 'คัดลอกแล้ว' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{language === 'th' ? 'คัดลอก' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2.5">
              <a
                href={LAUNDRY_GOOGLE_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{language === 'th' ? 'เปิดแบบฟอร์ม' : 'Open Form'}</span>
              </a>

              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(LAUNDRY_GOOGLE_FORM_URL)}&margin=10`}
                download="laundry-form-qr-code.png"
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

      {/* Laundry Analytics & Statistics Modal */}
      <LaundryAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        orders={orders}
        initialDateScope={advancedFilters.dateScope}
        initialMonth={advancedFilters.month}
        initialDepartment={advancedFilters.department}
        initialStage={advancedFilters.stage}
      />
    </div>
  );
};
