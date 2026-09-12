import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Package, 
  Send, 
  Inbox, 
  Calendar, 
  Building2, 
  Clock, 
  Filter, 
  Search, 
  RefreshCw, 
  FileSpreadsheet, 
  BarChart3, 
  LayoutList, 
  LayoutGrid, 
  Kanban, 
  CalendarDays, 
  Sparkles, 
  ArrowRight, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  X,
  FileText,
  Boxes,
  Mail,
  RotateCcw,
  ExternalLink,
  QrCode,
  Copy,
  Check,
  Download
} from 'lucide-react';
import { ParcelDeliveryRecord } from '../types';
import { AdminUserAccount, isUserAdminOrSupervisor } from '../data/mockData';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  fetchGoogleSheetParcelRecords, 
  PARCEL_SHEET_URL,
  deduplicateParcelRecords
} from '../services/googleSheetSyncService';

// Google Apps Script URL for Parcel & Document Form
export const PARCEL_FORM_APP_URL = 'https://script.google.com/macros/s/AKfycbwAFd2MCDiWydPz3ycfRuWC6Jv3IKtGpn-tnhm4mNbHkJn4W2AyJ9hlVydURxGdGhh9gw/exec';
import { ParcelDetailModal } from './ParcelDetailModal';
import { ParcelFilterModal, ParcelFilterState } from './ParcelFilterModal';
import { ParcelAnalyticsModal } from './ParcelAnalyticsModal';
import { ParcelCalendarView } from './ParcelCalendarView';
import { ModernParcelQrModal } from './ModernParcelQrModal';
import { CreateParcelRecordModal } from './CreateParcelRecordModal';

interface ParcelDeliveryViewProps {
  currentUser?: AdminUserAccount | null;
  isAuthenticated?: boolean;
}

type ViewMode = 'table' | 'cards' | 'board' | 'calendar';

export const ParcelDeliveryView: React.FC<ParcelDeliveryViewProps> = ({
  currentUser,
  isAuthenticated,
}) => {
  const { language } = useLanguage();

  // Access control: Restrict Admin actions (Google Sheet, Send/Receive Form button) to Admins and Supervisors
  const isAdmin = isUserAdminOrSupervisor(currentUser, isAuthenticated);
  const canAccessGoogleSheet = isAdmin;

  // Core records state
  const [records, setRecords] = useState<ParcelDeliveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Search and quick filters
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'ส่ง' | 'รับ' | 'today'>('all');

  // Modal states
  const [selectedRecord, setSelectedRecord] = useState<ParcelDeliveryRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedQrParcel, setSelectedQrParcel] = useState<ParcelDeliveryRecord | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Current Window URL for QR Code & Sharing
  const parcelWindowUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?tab=document_delivery`
    : '';

  // Advanced Filters
  const [filters, setFilters] = useState<ParcelFilterState>({
    actionType: 'all',
    senderDepartment: 'all',
    recipientDepartment: 'all',
    startDate: '',
    endDate: '',
    keyword: '',
  });

  // Pagination states
  const [currentPageTable, setCurrentPageTable] = useState(1);
  const itemsPerPageTable = 20;

  const [currentPageCards, setCurrentPageCards] = useState(1);
  const itemsPerPageCards = 6;

  // Initial fetch and real-time sync
  const loadData = useCallback(async (isManualRefresh = false, isSilent = false) => {
    if (isManualRefresh) setRefreshing(true);
    else if (!isSilent) setLoading(true);

    try {
      const res = await fetchGoogleSheetParcelRecords();
      if (res && res.records) {
        setRecords(deduplicateParcelRecords(res.records));
        setLastSyncedAt(res.lastSyncedAt);
      }
    } catch (err) {
      console.error('Error fetching parcel records:', err);
    } finally {
      if (isManualRefresh) setRefreshing(false);
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem('proworkflow_created_parcels_v1');
      localStorage.removeItem('proworkflow_parcel_delivery_csv_v2');
      localStorage.removeItem('proworkflow_parcel_delivery_csv_v1');
    } catch {}
    loadData();

    // Periodic auto-refresh every 3 seconds for real-time tracking
    const interval = setInterval(() => {
      loadData(false, true);
    }, 3000);

    return () => clearInterval(interval);
  }, [loadData]);

  // Auto-open modal if URL has ?track=... (e.g. scanned from QR code)
  useEffect(() => {
    if (typeof window === 'undefined' || records.length === 0) return;
    const urlParams = new URLSearchParams(window.location.search);
    const trackCode = urlParams.get('track');
    if (trackCode) {
      const cleanTrack = trackCode.replace(/[\s-]+/g, '').toLowerCase();
      const matched = records.find(r => r.trackingCode && r.trackingCode.replace(/[\s-]+/g, '').toLowerCase() === cleanTrack);
      if (matched) {
        setSelectedRecord(matched);
        setIsDetailOpen(true);
      }
    }
  }, [records]);

  // Check if a record is from today
  const isRecordToday = (record: ParcelDeliveryRecord) => {
    if (!record.dateStr && !record.timestamp) return false;
    const target = record.dateStr || record.timestamp;
    const today = new Date();
    const d = today.getDate();
    const m = today.getMonth() + 1;
    const y = today.getFullYear();

    const clean = target.split(/[\s,]+/)[0];
    const parts = clean.split(/[-/.]/);
    if (parts.length === 3) {
      let pd = parseInt(parts[0], 10);
      let pm = parseInt(parts[1], 10);
      let py = parseInt(parts[2], 10);
      if (pd > 1000) {
        py = pd;
        pd = parseInt(parts[2], 10);
      }
      if (py > 2400) py -= 543;
      if (py < 100) py += 2000;
      return pd === d && pm === m && py === y;
    }
    return false;
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Quick filter
      if (quickFilter === 'ส่ง' && record.actionType !== 'ส่ง') return false;
      if (quickFilter === 'รับ' && record.actionType !== 'รับ') return false;
      if (quickFilter === 'today' && !isRecordToday(record)) return false;

      // Advanced Action type filter
      if (filters.actionType !== 'all' && record.actionType !== filters.actionType) {
        return false;
      }

      // Sender Department filter
      if (filters.senderDepartment !== 'all' && record.senderDepartment !== filters.senderDepartment) {
        return false;
      }

      // Recipient Department filter
      if (filters.recipientDepartment !== 'all' && record.recipientDepartment !== filters.recipientDepartment) {
        return false;
      }

      // Date Range filter
      if (filters.startDate || filters.endDate) {
        const raw = record.dateStr || record.timestamp;
        const clean = raw.split(/[\s,]+/)[0];
        const parts = clean.split(/[-/.]/);
        if (parts.length === 3) {
          let pd = parseInt(parts[0], 10);
          let pm = parseInt(parts[1], 10);
          let py = parseInt(parts[2], 10);
          if (pd > 1000) {
            py = pd;
            pd = parseInt(parts[2], 10);
          }
          if (py > 2400) py -= 543;
          if (py < 100) py += 2000;

          const recTime = new Date(py, pm - 1, pd).getTime();
          if (filters.startDate) {
            const startParts = filters.startDate.split('-');
            const startTime = new Date(parseInt(startParts[0], 10), parseInt(startParts[1], 10) - 1, parseInt(startParts[2], 10)).getTime();
            if (recTime < startTime) return false;
          }
          if (filters.endDate) {
            const endParts = filters.endDate.split('-');
            const endTime = new Date(parseInt(endParts[0], 10), parseInt(endParts[1], 10) - 1, parseInt(endParts[2], 10), 23, 59, 59).getTime();
            if (recTime > endTime) return false;
          }
        }
      }

      // General Search query or keyword filter
      const query = (searchQuery || filters.keyword).toLowerCase().trim();
      if (query) {
        const matchTitle = record.itemTitle?.toLowerCase().includes(query);
        const matchSender = record.senderName?.toLowerCase().includes(query) || record.senderDepartment?.toLowerCase().includes(query);
        const matchRecipient = record.recipientName?.toLowerCase().includes(query) || record.recipientDepartment?.toLowerCase().includes(query);
        const matchOperator = record.operatorName?.toLowerCase().includes(query) || record.operatorDepartment?.toLowerCase().includes(query);
        const matchType = record.actionType?.toLowerCase().includes(query);
        const matchTimestamp = record.timestamp?.toLowerCase().includes(query);
        const matchTracking = record.trackingCode?.toLowerCase().includes(query);

        if (!matchTitle && !matchSender && !matchRecipient && !matchOperator && !matchType && !matchTimestamp && !matchTracking) {
          return false;
        }
      }

      return true;
    });
  }, [records, quickFilter, filters, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPageTable(1);
    setCurrentPageCards(1);
  }, [searchQuery, quickFilter, filters]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.actionType !== 'all') count++;
    if (filters.senderDepartment !== 'all') count++;
    if (filters.recipientDepartment !== 'all') count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.keyword) count++;
    return count;
  }, [filters]);

  // Determine if any filter/search is actively applied
  const isFiltered = useMemo(() => {
    return activeFiltersCount > 0 || quickFilter !== 'all' || searchQuery.trim().length > 0;
  }, [activeFiltersCount, quickFilter, searchQuery]);

  // KPI Metrics Calculation (Dynamically adapts to active filters when filtering is used)
  const metrics = useMemo(() => {
    const todayRecords = records.filter(r => isRecordToday(r));
    
    // When filtering is used, use filteredRecords; otherwise default to today's records
    const targetRecords = isFiltered ? filteredRecords : todayRecords;
    const totalCount = targetRecords.length;
    const sentCount = targetRecords.filter(r => r.actionType === 'ส่ง').length;
    const receivedCount = targetRecords.filter(r => r.actionType === 'รับ').length;

    const sentPct = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;
    const receivedPct = totalCount > 0 ? Math.round((receivedCount / totalCount) * 100) : 0;

    // Latest active department & update details (newest record first)
    const latestRecord = targetRecords.length > 0 ? targetRecords[0] : (isFiltered ? null : (records.length > 0 ? records[0] : null));
    let latestDept = '-';
    let latestActivityText = isFiltered ? 'ไม่มีข้อมูลตามตัวกรองที่เลือก' : 'ยังไม่มีข้อมูลเคลื่อนไหว';

    if (latestRecord) {
      if (latestRecord.actionType === 'ส่ง') {
        latestDept = (latestRecord.senderDepartment && latestRecord.senderDepartment !== '-')
          ? latestRecord.senderDepartment
          : (latestRecord.operatorDepartment && latestRecord.operatorDepartment !== '-')
            ? latestRecord.operatorDepartment
            : latestRecord.recipientDepartment || '-';
      } else {
        latestDept = (latestRecord.recipientDepartment && latestRecord.recipientDepartment !== '-')
          ? latestRecord.recipientDepartment
          : (latestRecord.operatorDepartment && latestRecord.operatorDepartment !== '-')
            ? latestRecord.operatorDepartment
            : latestRecord.senderDepartment || '-';
      }

      const timeOrDate = latestRecord.timeStr || latestRecord.dateStr || (latestRecord.timestamp ? latestRecord.timestamp.split(/[\s,]+/)[0] : '');
      const actionType = latestRecord.actionType || 'รายการ';
      const itemTitle = latestRecord.itemTitle || 'ไม่มีชื่อรายการ';
      latestActivityText = `${actionType}: ${itemTitle} (${timeOrDate})`;
    }

    return {
      isFiltered,
      total: totalCount,
      sent: sentCount,
      received: receivedCount,
      sentPct,
      receivedPct,
      latestDept,
      latestActivityText,
      allTimeTotal: records.length,
      allTimeSent: records.filter(r => r.actionType === 'ส่ง').length,
      allTimeReceived: records.filter(r => r.actionType === 'รับ').length,
    };
  }, [records, filteredRecords, isFiltered]);

  // Table pagination
  const totalPagesTable = Math.ceil(filteredRecords.length / itemsPerPageTable) || 1;
  const paginatedRecordsTable = useMemo(() => {
    const start = (currentPageTable - 1) * itemsPerPageTable;
    return filteredRecords.slice(start, start + itemsPerPageTable);
  }, [filteredRecords, currentPageTable]);

  // Cards pagination
  const totalPagesCards = Math.ceil(filteredRecords.length / itemsPerPageCards) || 1;
  const paginatedRecordsCards = useMemo(() => {
    const start = (currentPageCards - 1) * itemsPerPageCards;
    return filteredRecords.slice(start, start + itemsPerPageCards);
  }, [filteredRecords, currentPageCards]);

  const clearAllFilters = () => {
    setQuickFilter('all');
    setSearchQuery('');
    setFilters({
      actionType: 'all',
      senderDepartment: 'all',
      recipientDepartment: 'all',
      startDate: '',
      endDate: '',
      keyword: '',
    });
  };

  const handleOpenDetail = (record: ParcelDeliveryRecord) => {
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header (Animated Pink Gradient) */}
      <div className="animated-parcel-pink-header rounded-3xl p-6 sm:p-7 text-[#831843] dark:text-pink-100 shadow-xl border border-pink-200/80 dark:border-pink-900/40 relative overflow-hidden space-y-5">
        {/* Floating Decorative Icons in Background */}
        <div className="absolute -right-6 -bottom-8 pointer-events-none opacity-10 dark:opacity-5 transform rotate-12">
          <Package className="w-56 h-56 text-pink-700" />
        </div>
        <div className="absolute right-1/4 -top-8 pointer-events-none opacity-10 dark:opacity-5 transform -rotate-12">
          <Send className="w-36 h-36 text-rose-600" />
        </div>
        <div className="absolute left-1/3 -bottom-6 pointer-events-none opacity-10 dark:opacity-5">
          <Boxes className="w-32 h-32 text-pink-600" />
        </div>
        <div className="absolute right-12 top-6 pointer-events-none opacity-15 dark:opacity-10 hidden sm:block animate-pulse">
          <Mail className="w-16 h-16 text-pink-500" />
        </div>

        {/* Top Bar: Title, Badges & Action Buttons */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-white/80 dark:bg-slate-800/90 border border-pink-300/80 dark:border-pink-800/80 flex items-center justify-center shadow-md shrink-0">
              <Package className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              <Sparkles className="w-3.5 h-3.5 text-amber-500 absolute -top-1 -right-1" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  รับ-ส่ง เอกสาร / พัสดุ
                </h1>

                {/* Sparkling Prominent Action Button for Form Submission (Opens Create Modal) */}
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="relative group inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl font-black text-white text-xs sm:text-sm bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:via-rose-600 hover:to-amber-600 shadow-md hover:shadow-xl hover:shadow-pink-500/40 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/40 dark:border-white/20 cursor-pointer overflow-hidden"
                  title="คลิกเพื่อสร้างรายการ รับ - ส่งเอกสาร / พัสดุ ใหม่ (บันทึกลง Google Sheet)"
                >
                  {/* Shimmer sweep animation */}
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                  {/* Pulsing beacon */}
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-100"></span>
                  </span>

                  <Sparkles className="w-4 h-4 text-amber-200 animate-pulse shrink-0" />
                  <span className="tracking-tight whitespace-nowrap drop-shadow-xs">
                    รับ - ส่งเอกสาร / พัสดุ
                  </span>
                </button>

                {/* QR Code Button placed right after the button, styled like Meeting Room */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedQrParcel(null);
                    setShowQrModal(true);
                  }}
                  className="p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer text-pink-700 dark:text-pink-300 hover:text-pink-900 dark:hover:text-pink-100 bg-white/80 dark:bg-slate-800/80 hover:bg-pink-100/70 dark:hover:bg-slate-700 border border-pink-200/80 dark:border-slate-700 shadow-xs active:scale-95 group relative flex items-center justify-center"
                  title={language === 'th' ? 'QR Code หน้าต่าง รับ-ส่ง เอกสาร / พัสดุ' : 'Parcel Delivery Window QR Code'}
                  aria-label={language === 'th' ? 'QR Code หน้าต่าง รับ-ส่ง เอกสาร / พัสดุ' : 'Parcel Delivery Window QR Code'}
                >
                  <QrCode className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-pink-600 dark:text-pink-400 transition-transform group-hover:scale-110" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Refresh Button (Icon-only) */}
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-pink-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs transition-all cursor-pointer flex items-center justify-center"
              title={lastSyncedAt ? `รีเฟรชข้อมูล (อัปเดตล่าสุด: ${lastSyncedAt.toLocaleTimeString('th-TH')})` : "รีเฟรชข้อมูลจาก Google Sheet"}
            >
              <RefreshCw className={`w-4 h-4 text-pink-600 dark:text-pink-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Analytics Button (Icon-only, Restricted to Admins & Supervisors) */}
            {isAdmin && (
              <button
                onClick={() => setIsAnalyticsOpen(true)}
                className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-pink-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs transition-all cursor-pointer flex items-center justify-center"
                title="ดูสถิติและภาพรวม (เฉพาะผู้ดูแลและแอดมิน)"
              >
                <BarChart3 className="w-4 h-4 text-pink-600 dark:text-pink-400" />
              </button>
            )}

            {/* Google Sheet Link Button (Icon-only, Restricted to Admins & Page Admins) */}
            {canAccessGoogleSheet && (
              <a
                href={PARCEL_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer flex items-center justify-center"
                title="เปิด Google Sheet ต้นทาง (เฉพาะผู้ดูแลและแอดมิน)"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </a>
            )}

            {/* Filter Button (Icon-only with notification count badge) */}
            <button
              onClick={() => setIsFilterOpen(true)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center relative ${
                activeFiltersCount > 0
                  ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800/80 border-pink-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white'
              }`}
              title="ตัวกรองข้อมูล"
            >
              <Filter className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-pink-600 text-white border-2 border-white dark:border-slate-900 text-[9px] font-black flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-white/80 dark:bg-slate-800/90 p-1 rounded-xl border border-pink-200 dark:border-slate-700 shadow-xs">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="มุมมองรายการ (ตาราง)"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="มุมมองการ์ด (ตารางย่อย)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'board'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="มุมมองกระดานแยกประเภท (ส่ง/รับ)"
              >
                <Kanban className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="มุมมองปฏิทิน (ตามวัน)"
              >
                <CalendarDays className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Metric Cards Row (4 Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
          {/* Card 1: Total */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-pink-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                รายการทั้งหมด
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                metrics.isFiltered
                  ? 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800'
                  : 'text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-950/60'
              }`}>
                {metrics.isFiltered ? 'ตามตัวกรอง' : 'วันนี้'}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1.5">
              {metrics.total.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {metrics.isFiltered ? 'ตามเงื่อนไขที่เลือกกรอง' : 'พัสดุและเอกสารประจำวันนี้'}
            </div>
          </div>

          {/* Card 2: Sent */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-rose-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <Send className="w-3.5 h-3.5" /> รายการส่ง
              </span>
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full">
                {metrics.sentPct}%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-700 dark:text-rose-300 mt-1.5">
              {metrics.sent.toLocaleString()}
            </div>
            <div className="text-[11px] text-rose-500 dark:text-rose-400 mt-0.5 truncate">
              {metrics.isFiltered ? 'เอกสาร/พัสดุขาออกตามตัวกรอง' : 'เอกสาร/พัสดุขาออกวันนี้'}
            </div>
          </div>

          {/* Card 3: Received */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-emerald-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Inbox className="w-3.5 h-3.5" /> รายการรับ
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                {metrics.receivedPct}%
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-1.5">
              {metrics.received.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-500 dark:text-emerald-400 mt-0.5 truncate">
              {metrics.isFiltered ? 'เอกสาร/พัสดุขาเข้าตามตัวกรอง' : 'เอกสาร/พัสดุขาเข้าวันนี้'}
            </div>
          </div>

          {/* Card 4: Latest Active Department */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-pink-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {metrics.isFiltered ? 'แผนกล่าสุดในตัวกรอง' : 'แผนกเคลื่อนไหวล่าสุด'}
                </span>
                <Building2 className="w-4 h-4 text-pink-600 dark:text-pink-400 shrink-0" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1.5 truncate" title={metrics.latestDept}>
                {metrics.latestDept}
              </div>
            </div>
            <div className="text-[11px] font-medium text-pink-600 dark:text-pink-400 mt-1 truncate" title={metrics.latestActivityText}>
              {metrics.latestActivityText}
            </div>
          </div>
        </div>

        {/* Search & Quick Filters Bar inside Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อเอกสาร, ผู้ส่ง, ผู้รับ, แผนก..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-white/90 dark:bg-slate-800/90 border border-pink-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setQuickFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                quickFilter === 'all'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-pink-200 dark:border-slate-700 hover:bg-white'
              }`}
            >
              ทั้งหมด ({records.length})
            </button>
            <button
              onClick={() => setQuickFilter('ส่ง')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                quickFilter === 'ส่ง'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-rose-200 dark:border-slate-700 hover:bg-white'
              }`}
            >
              <Send className="w-3 h-3" />
              รายการส่ง ({metrics.allTimeSent})
            </button>
            <button
              onClick={() => setQuickFilter('รับ')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                quickFilter === 'รับ'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-emerald-200 dark:border-slate-700 hover:bg-white'
              }`}
            >
              <Inbox className="w-3 h-3" />
              รายการรับ ({metrics.allTimeReceived})
            </button>
            <button
              onClick={() => setQuickFilter('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                quickFilter === 'today'
                  ? 'bg-pink-700 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-pink-200 dark:border-slate-700 hover:bg-white'
              }`}
            >
              <Calendar className="w-3 h-3" />
              วันนี้
            </button>
          </div>
        </div>

        {/* Active Filters Display bar */}
        {(activeFiltersCount > 0 || searchQuery || quickFilter !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-pink-200/60 dark:border-slate-700/60 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">ตัวกรองที่เลือก:</span>
            {quickFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 font-medium flex items-center gap-1">
                ด่วน: {quickFilter === 'today' ? 'วันนี้' : quickFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setQuickFilter('all')} />
              </span>
            )}
            {searchQuery && (
              <span className="px-2 py-0.5 rounded-md bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 font-medium flex items-center gap-1">
                ค้นหา: "{searchQuery}"
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
              </span>
            )}
            {filters.actionType !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 font-medium flex items-center gap-1">
                ประเภท: {filters.actionType}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, actionType: 'all' })} />
              </span>
            )}
            {filters.senderDepartment !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 font-medium flex items-center gap-1">
                ผู้ส่ง: {filters.senderDepartment}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, senderDepartment: 'all' })} />
              </span>
            )}
            {filters.recipientDepartment !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 font-medium flex items-center gap-1">
                ผู้รับ: {filters.recipientDepartment}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, recipientDepartment: 'all' })} />
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-pink-700 dark:text-pink-300 hover:underline font-bold ml-auto flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              ล้างทั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* 2. Main Content View Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-pink-100 dark:border-slate-800 space-y-3">
          <RefreshCw className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            กำลังโหลดข้อมูลรับ-ส่ง เอกสาร / พัสดุ จาก Google Sheet...
          </p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-pink-100 dark:border-slate-800 text-center p-6 space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-pink-50 dark:bg-pink-950/50 flex items-center justify-center text-pink-500">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            ไม่พบข้อมูลเอกสารหรือพัสดุ
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            ลองปรับเปลี่ยนคำค้นหา หรือกดล้างตัวกรองเพื่อดูข้อมูลทั้งหมด
          </p>
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* View 1: Table View */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-pink-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-pink-50/80 dark:bg-slate-800/80 border-b border-pink-100 dark:border-slate-700 text-[11px] font-bold text-pink-900 dark:text-pink-200 uppercase tracking-wider">
                  <th className="py-3.5 px-4">วันที่เวลา</th>
                  <th className="py-3.5 px-4 text-center">ประเภท</th>
                  <th className="py-3.5 px-4">ชื่อเอกสาร / พัสดุ</th>
                  <th className="py-3.5 px-4">ผู้ส่งตามหน้าซอง</th>
                  <th className="py-3.5 px-4">ผู้รับตามหน้าซอง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                {paginatedRecordsTable.map((record, index) => {
                  const isSent = record.actionType === 'ส่ง';
                  return (
                    <tr 
                      key={`${record.id}-${record.seq || index}`}
                      onClick={() => handleOpenDetail(record)}
                      title="คลิกเพื่อดูรายละเอียด"
                      className="hover:bg-pink-50/40 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {record.dateStr || record.timestamp}
                        </div>
                        {record.timeStr && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {record.timeStr}
                          </div>
                        )}
                      </td>

                      {/* Action Type */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isSent 
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300 dark:border-rose-800' 
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                        }`}>
                          {isSent ? <Send className="w-3 h-3" /> : <Inbox className="w-3 h-3" />}
                          {isSent ? 'ส่ง' : 'รับ'}
                        </span>
                      </td>

                      {/* Item Title & Tracking Code */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-2 max-w-xs">
                          {record.itemTitle}
                        </div>
                        {isAdmin && record.trackingCode && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedQrParcel(record);
                                setShowQrModal(true);
                              }}
                              className="inline-flex items-center gap-1 font-mono text-[10px] font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800/60 transition-colors cursor-pointer"
                              title="คลิกเพื่อเปิด QR Code ติดตามสถานะ"
                            >
                              <QrCode className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                              <span>{record.trackingCode}</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Sender */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {record.senderName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {record.senderDepartment}
                        </div>
                      </td>

                      {/* Recipient */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {record.recipientName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {record.recipientDepartment}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Controls */}
          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div>
              แสดง {(currentPageTable - 1) * itemsPerPageTable + 1} - {Math.min(currentPageTable * itemsPerPageTable, filteredRecords.length)} จากทั้งหมด {filteredRecords.length} รายการ
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPageTable(prev => Math.max(prev - 1, 1))}
                disabled={currentPageTable === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPagesTable }).map((_, idx) => {
                const page = idx + 1;
                if (
                  page === 1 || 
                  page === totalPagesTable || 
                  (page >= currentPageTable - 1 && page <= currentPageTable + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPageTable(page)}
                      className={`w-8 h-8 rounded-lg font-bold transition-all cursor-pointer ${
                        currentPageTable === page
                          ? 'bg-pink-600 text-white shadow-xs'
                          : 'border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPageTable - 2 || page === currentPageTable + 2) {
                  return <span key={page} className="px-1 text-slate-400">...</span>;
                }
                return null;
              })}

              <button
                onClick={() => setCurrentPageTable(prev => Math.min(prev + 1, totalPagesTable))}
                disabled={currentPageTable === totalPagesTable}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* View 2: Cards View (6 items per page) */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedRecordsCards.map((record, index) => {
              const isSent = record.actionType === 'ส่ง';
              return (
                <div
                  key={`${record.id}-${record.seq || index}`}
                  onClick={() => handleOpenDetail(record)}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-pink-100/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-pink-300 dark:hover:border-pink-800 transition-all cursor-pointer flex flex-col justify-between gap-4 group"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                        isSent 
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300' 
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300'
                      }`}>
                        {isSent ? <Send className="w-3 h-3" /> : <Inbox className="w-3 h-3" />}
                        {isSent ? 'รายการส่ง' : 'รายการรับ'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        #{record.seq}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                      {record.itemTitle}
                    </h4>

                    {isAdmin && record.trackingCode && (
                      <div className="mt-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQrParcel(record);
                            setShowQrModal(true);
                          }}
                          className="inline-flex items-center gap-1 font-mono text-[11px] font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800/60 transition-colors cursor-pointer"
                          title="คลิกเพื่อเปิด QR Code ติดตามสถานะ"
                        >
                          <QrCode className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          <span>{record.trackingCode}</span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{record.timestamp}</span>
                    </div>
                  </div>

                  {/* Flow Box */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/80 space-y-2 text-xs">
                    {/* Sender */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">ผู้ส่ง:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate">
                        {record.senderName} ({record.senderDepartment})
                      </span>
                    </div>

                    {/* Recipient */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">ผู้รับ:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate">
                        {record.recipientName} ({record.recipientDepartment})
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> บันทึกแล้ว
                    </span>
                    <span className="text-pink-600 dark:text-pink-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      รายละเอียด <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cards Pagination Controls */}
          {totalPagesCards > 1 && (
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-pink-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                หน้า {currentPageCards} จาก {totalPagesCards} (ทั้งหมด {filteredRecords.length} รายการ)
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPageCards(prev => Math.max(prev - 1, 1))}
                  disabled={currentPageCards === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  ก่อนหน้า
                </button>
                <button
                  onClick={() => setCurrentPageCards(prev => Math.min(prev + 1, totalPagesCards))}
                  disabled={currentPageCards === totalPagesCards}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'board' ? (
        /* View 3: Board / Kanban View (2 columns: ส่ง vs รับ) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Column 1: Outgoing / ส่ง */}
          <div className="bg-rose-50/40 dark:bg-slate-900/60 rounded-3xl p-4 sm:p-5 border border-rose-200/80 dark:border-slate-800 flex flex-col max-h-[750px]">
            <div className="flex items-center justify-between pb-3 border-b border-rose-200/60 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    รายการส่ง (Outgoing)
                  </h3>
                  <p className="text-[11px] text-slate-500">เอกสารและพัสดุขาออก</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs">
                {filteredRecords.filter(r => r.actionType === 'ส่ง').length} รายการ
              </span>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {filteredRecords
                .filter(r => r.actionType === 'ส่ง')
                .map((record, index) => (
                  <div
                    key={`${record.id}-${record.seq || index}`}
                    onClick={() => handleOpenDetail(record)}
                    className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-rose-100 dark:border-slate-700 shadow-xs hover:border-rose-300 transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-mono text-slate-400">#{record.seq}</span>
                      <span className="text-xs text-slate-400">{record.timeStr || record.timestamp}</span>
                    </div>

                    <div className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                      {record.itemTitle}
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 pt-1">
                      <span className="truncate font-medium">{record.senderName}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{record.recipientName}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      <span>แผนก: {record.recipientDepartment}</span>
                      <span>ผู้บันทึก: {record.operatorName}</span>
                    </div>

                    {isAdmin && record.trackingCode && (
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQrParcel(record);
                            setShowQrModal(true);
                          }}
                          className="inline-flex items-center gap-1 font-mono text-[10px] font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800/60 transition-colors cursor-pointer"
                        >
                          <QrCode className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          <span>{record.trackingCode}</span>
                        </button>
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline">
                          เปิด QR ติดตาม
                        </span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Column 2: Incoming / รับ */}
          <div className="bg-emerald-50/40 dark:bg-slate-900/60 rounded-3xl p-4 sm:p-5 border border-emerald-200/80 dark:border-slate-800 flex flex-col max-h-[750px]">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-200/60 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Inbox className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    รายการรับ (Incoming)
                  </h3>
                  <p className="text-[11px] text-slate-500">เอกสารและพัสดุขาเข้า</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                {filteredRecords.filter(r => r.actionType === 'รับ').length} รายการ
              </span>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {filteredRecords
                .filter(r => r.actionType === 'รับ')
                .map((record, index) => (
                  <div
                    key={`${record.id}-${record.seq || index}`}
                    onClick={() => handleOpenDetail(record)}
                    className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-emerald-100 dark:border-slate-700 shadow-xs hover:border-emerald-300 transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-mono text-slate-400">#{record.seq}</span>
                      <span className="text-xs text-slate-400">{record.timeStr || record.timestamp}</span>
                    </div>

                    <div className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                      {record.itemTitle}
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 pt-1">
                      <span className="truncate font-medium">{record.senderName}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{record.recipientName}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      <span>แผนก: {record.recipientDepartment}</span>
                      <span>ผู้บันทึก: {record.operatorName}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        /* View 4: Calendar View */
        <ParcelCalendarView
          records={filteredRecords}
          onSelectRecord={handleOpenDetail}
        />
      )}

      {/* 3. Modals */}
      {/* Detail Modal */}
      <ParcelDetailModal
        isOpen={isDetailOpen}
        parcel={selectedRecord}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        onClose={() => setIsDetailOpen(false)}
      />

      {/* Filter Modal */}
      <ParcelFilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
        records={records}
      />

      {/* Analytics Modal */}
      <ParcelAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        records={records}
      />

      {/* Modern Parcel Delivery QR Code Modal with Cute Cartoon Mascot in Center */}
      <ModernParcelQrModal
        isOpen={showQrModal}
        onClose={() => {
          setShowQrModal(false);
          setSelectedQrParcel(null);
        }}
        parcel={selectedQrParcel}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        url={parcelWindowUrl}
      />

      {/* Create Record Modal (Both Receive & Send, strictly matching Google Sheet columns) */}
      <CreateParcelRecordModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRecordCreated={() => {
          // Immediately reload from Google Sheet, and reload again after short delay for Sheet synchronization
          loadData(true, false);
          setTimeout(() => {
            loadData(false, true);
          }, 1500);
        }}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        existingRecords={records}
      />
    </div>
  );
};
