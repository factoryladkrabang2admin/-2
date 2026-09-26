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
  deduplicateParcelRecords,
  mergeParcelRecords,
  getLocalParcelRecords,
  formatCurrentThaiParcelTimestamp
} from '../services/googleSheetSyncService';

// Google Apps Script URL for Parcel & Document Form
export const PARCEL_FORM_APP_URL = 'https://script.google.com/macros/s/AKfycbwAFd2MCDiWydPz3ycfRuWC6Jv3IKtGpn-tnhm4mNbHkJn4W2AyJ9hlVydURxGdGhh9gw/exec';
import { ParcelDetailModal } from './ParcelDetailModal';
import { ParcelFilterModal, ParcelFilterState } from './ParcelFilterModal';
import { ParcelAnalyticsModal } from './ParcelAnalyticsModal';
import { ParcelCalendarView } from './ParcelCalendarView';
import { CreateParcelRecordModal } from './CreateParcelRecordModal';
import { 
  getReceivedTrackingCodesSet, 
  isParcelConfirmedReceived,
  consolidateParcelRecords,
  isParcelRecordToday
} from '../utils/parcelTrackingUtils';

interface ParcelDeliveryViewProps {
  currentUser?: AdminUserAccount | null;
  isAuthenticated?: boolean;
  initialTrackCode?: string | null;
}

type ViewMode = 'table' | 'cards' | 'board' | 'calendar';

export const ParcelDeliveryView: React.FC<ParcelDeliveryViewProps> = ({
  currentUser,
  isAuthenticated,
  initialTrackCode,
}) => {
  const { language } = useLanguage();

  // Access control: Restrict Admin actions (Google Sheet, Send/Receive Form button) to Admins and Supervisors
  const isAdmin = isUserAdminOrSupervisor(currentUser, isAuthenticated);
  const canAccessGoogleSheet = isAdmin;

  // Core records state
  const [records, setRecords] = useState<ParcelDeliveryRecord[]>([]);
  const [rawRecords, setRawRecords] = useState<ParcelDeliveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // View Mode: Default to 'cards' view
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Search and quick filters - Default to 'all_today' (วันปัจจุบัน)
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'ส่ง' | 'รับ' | 'today' | 'all_today' | 'ส่ง_today' | 'รับ_today'>('all_today');

  // Modal states
  const [selectedRecord, setSelectedRecord] = useState<ParcelDeliveryRecord | null>(null);
  const [recordToReceive, setRecordToReceive] = useState<ParcelDeliveryRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [localReceivedVer, setLocalReceivedVer] = useState(0);

  useEffect(() => {
    const handleReceivedUpdate = () => {
      setLocalReceivedVer((v) => v + 1);
    };
    window.addEventListener('parcel_received_updated', handleReceivedUpdate);
    return () => window.removeEventListener('parcel_received_updated', handleReceivedUpdate);
  }, []);

  // Consolidate parcel records so received tracking codes replace/supersede send records
  // "เมื่อรายการส่งถูกขึ้นรับเอกสารแล้วให้แสดงเป็นข้อมูลล่าสุดเฉพาะข้อมูลรับแล้ว เหมือน ข้อมูลการซักผ้า - อบผ้า"
  const consolidatedRecords = useMemo(() => {
    return consolidateParcelRecords(rawRecords.length > 0 ? rawRecords : records);
  }, [rawRecords, records, localReceivedVer]);

  const receivedTrackingCodesSet = useMemo(() => {
    return getReceivedTrackingCodesSet(consolidatedRecords);
  }, [consolidatedRecords, localReceivedVer]);

  const handleQuickReceive = useCallback((record: ParcelDeliveryRecord) => {
    setRecordToReceive(record);
    setIsCreateModalOpen(true);
  }, []);

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
        setRecords(res.records);
        setRawRecords(res.rawRecords || res.records);
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

  // Function to search and match a parcel by tracking code or ID strictly from Google Sheet records
  const findParcelByTrackCode = useCallback((code: string, candidateRecords: ParcelDeliveryRecord[]) => {
    if (!code) return null;
    const cleanTrack = code.replace(/[\s\-_]+/g, '').toLowerCase();

    const isMatch = (r: ParcelDeliveryRecord) => {
      const rCode = (r.trackingCode || '').replace(/[\s\-_]+/g, '').toLowerCase();
      const rId = (r.id || '').replace(/[\s\-_]+/g, '').toLowerCase();
      return Boolean(
        (rCode && (rCode === cleanTrack || rCode.includes(cleanTrack) || cleanTrack.includes(rCode))) ||
        (rId && (rId === cleanTrack || rId.includes(cleanTrack)))
      );
    };

    // 1. Check in candidate records
    let matched = candidateRecords.find(isMatch);

    // 2. Fallback: match by sequence number at the end of tracking code (e.g. 01 in LKB2-26091201)
    if (!matched && cleanTrack.length >= 2) {
      const lastDigits = parseInt(cleanTrack.slice(-2), 10);
      if (!isNaN(lastDigits) && lastDigits > 0) {
        matched = candidateRecords.find(r => r.seq === lastDigits);
      }
    }

    return matched || null;
  }, []);

  // Helper to extract tracking code from URL or prop
  const getActiveTrackCode = useCallback(() => {
    if (initialTrackCode) return initialTrackCode;
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    let code = urlParams.get('track') || urlParams.get('tracking');
    if (!code && window.location.hash) {
      const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.hash.replace(/^#\/?/, '');
      const hashParams = new URLSearchParams(hashQuery);
      code = hashParams.get('track') || hashParams.get('tracking');
    }
    return code;
  }, [initialTrackCode]);

  // Immediate check on mount
  // Send the tracking code directly to the search input so the user sees it and filters records immediately
  useEffect(() => {
    const code = getActiveTrackCode();
    if (code) {
      setSearchQuery(code);
      setQuickFilter('all');
    }
  }, [getActiveTrackCode]);

  // Auto-open modal when records are loaded or updated if URL has ?track=...
  useEffect(() => {
    const code = getActiveTrackCode();
    if (!code) return;

    // Run tracking code into search input to highlight and filter the record
    setSearchQuery(code);
    setQuickFilter('all');

    if (consolidatedRecords.length > 0) {
      const matched = findParcelByTrackCode(code, consolidatedRecords);
      if (matched) {
        setSelectedRecord(matched);
        setIsDetailOpen(true);
      }
    }
  }, [consolidatedRecords, getActiveTrackCode, findParcelByTrackCode]);

  // Handler to close detail and cleanly remove ?track from URL
  const handleCloseDetailModal = () => {
    setIsDetailOpen(false);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('track');
      url.searchParams.delete('tracking');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Base records for filter:
  // Shows consolidated records: when an item is received, it reflects only the latest received record (like laundry)
  const baseRecordsForFilter = useMemo(() => {
    const list = consolidatedRecords.length > 0 ? consolidatedRecords : records;
    if (quickFilter === 'today' || quickFilter === 'all_today') {
      return list.filter(r => isParcelRecordToday(r));
    }
    if (quickFilter === 'ส่ง_today') {
      return list.filter(r => r.actionType === 'ส่ง' && isParcelRecordToday(r));
    }
    if (quickFilter === 'รับ_today') {
      return list.filter(r => r.actionType === 'รับ' && isParcelRecordToday(r));
    }
    if (quickFilter === 'ส่ง' || filters.actionType === 'ส่ง') {
      return list.filter(r => r.actionType === 'ส่ง');
    }
    if (quickFilter === 'รับ' || filters.actionType === 'รับ') {
      return list.filter(r => r.actionType === 'รับ');
    }
    return list;
  }, [quickFilter, filters.actionType, consolidatedRecords, records]);

  // Filtered records based on selected quick filter and advanced filters
  const filteredRecords = useMemo(() => {
    return baseRecordsForFilter.filter(record => {
      // General Search query or keyword filter
      const query = (searchQuery || filters.keyword).toLowerCase().trim();
      const cleanQuery = query.replace(/[\s\-_]/g, '');
      const cleanTracking = (record.trackingCode || '').toLowerCase().replace(/[\s\-_]/g, '');
      const isDirectTrackingMatch = Boolean(cleanQuery && cleanTracking && (cleanTracking.includes(cleanQuery) || cleanQuery.includes(cleanTracking)));

      // Quick filter - strictly by Google Sheet action type
      if (quickFilter === 'ส่ง') {
        if (record.actionType !== 'ส่ง') return false;
      } else if (quickFilter === 'รับ') {
        if (record.actionType !== 'รับ') return false;
      } else if (quickFilter === 'today' || quickFilter === 'all_today') {
        if (!filters.startDate && !filters.endDate && !isDirectTrackingMatch && !isParcelRecordToday(record)) {
          return false;
        }
      } else if (quickFilter === 'ส่ง_today') {
        if (record.actionType !== 'ส่ง') return false;
        if (!filters.startDate && !filters.endDate && !isDirectTrackingMatch && !isParcelRecordToday(record)) {
          return false;
        }
      } else if (quickFilter === 'รับ_today') {
        if (record.actionType !== 'รับ') return false;
        if (!filters.startDate && !filters.endDate && !isDirectTrackingMatch && !isParcelRecordToday(record)) {
          return false;
        }
      }

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

      // Keyword match across all key fields (Document Title, Sender, Recipient, Operator, Tracking Code)
      if (query) {
        const matchTitle = record.itemTitle?.toLowerCase().includes(query);
        const matchSender = record.senderName?.toLowerCase().includes(query) || record.senderDepartment?.toLowerCase().includes(query);
        const matchRecipient = record.recipientName?.toLowerCase().includes(query) || record.recipientDepartment?.toLowerCase().includes(query);
        const matchOperator = record.operatorName?.toLowerCase().includes(query) || record.operatorDepartment?.toLowerCase().includes(query);
        const matchType = record.actionType?.toLowerCase().includes(query);
        const matchTimestamp = record.timestamp?.toLowerCase().includes(query);
        const matchTracking = isDirectTrackingMatch || record.trackingCode?.toLowerCase().includes(query);

        if (!matchTitle && !matchSender && !matchRecipient && !matchOperator && !matchType && !matchTimestamp && !matchTracking) {
          return false;
        }
      }

      return true;
    });
  }, [baseRecordsForFilter, quickFilter, filters, searchQuery]);

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

  // KPI Metrics Calculation: Exactly and truthfully from Google Sheet raw data for the 3 specified boxes
  // (เฉพาะกล่องรายการทั้งหมด, รายการส่ง, รายการรับ ให้แสดงข้อมูลจาก Google Sheet โดยแสดงข้อมูลตามจริง แต่รายละเอียดที่แสดงให้ตามเดิม)
  const metrics = useMemo(() => {
    const rawList = rawRecords.length > 0 ? rawRecords : records;

    const sheetSentRecords = rawList.filter(r => r.actionType === 'ส่ง');
    const sheetReceivedRecords = rawList.filter(r => r.actionType === 'รับ');

    const sheetSentCount = sheetSentRecords.length;
    const sheetReceivedCount = sheetReceivedRecords.length;
    const sheetTotalCount = rawList.length;

    const sentPct = sheetTotalCount > 0 ? Math.round((sheetSentCount / sheetTotalCount) * 100) : 0;
    const receivedPct = sheetTotalCount > 0 ? Math.round((sheetReceivedCount / sheetTotalCount) * 100) : 0;

    // Today counts strictly from Google Sheet for current day (วันปัจจุบัน)
    const todayRawSentRecords = rawList.filter(r => r.actionType === 'ส่ง' && isParcelRecordToday(r));
    const todayRawReceivedRecords = rawList.filter(r => r.actionType === 'รับ' && isParcelRecordToday(r));
    const todayAllRawRecords = rawList.filter(r => isParcelRecordToday(r));

    const todaySentCount = todayRawSentRecords.length;
    const todayReceivedCount = todayRawReceivedRecords.length;
    const todayTotalCount = todayAllRawRecords.length;

    const todaySentPct = todayTotalCount > 0 ? Math.round((todaySentCount / todayTotalCount) * 100) : 0;
    const todayReceivedPct = todayTotalCount > 0 ? Math.round((todayReceivedCount / todayTotalCount) * 100) : 0;

    // Latest active department & update details (from consolidated list / latest updates)
    const activeList = consolidatedRecords.length > 0 ? consolidatedRecords : records;
    const targetRecords = isFiltered ? filteredRecords : (todayAllRawRecords.length > 0 ? todayAllRawRecords : activeList);
    const latestRecord = targetRecords.length > 0 ? targetRecords[0] : (consolidatedRecords.length > 0 ? consolidatedRecords[0] : null);
    let latestDept = '-';
    let latestActivityText = isFiltered 
      ? (language === 'th' ? 'ไม่มีข้อมูลตามตัวกรองที่เลือก' : 'No records match filter') 
      : (language === 'th' ? 'ยังไม่มีข้อมูลเคลื่อนไหว' : 'No recent activity');

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
      const actionType = latestRecord.actionType === 'ส่ง'
        ? (language === 'th' ? 'ส่ง' : 'Send')
        : (language === 'th' ? 'รับ' : 'Receive');
      const itemTitle = latestRecord.itemTitle || (language === 'th' ? 'ไม่มีชื่อรายการ' : 'Untitled');
      latestActivityText = `${actionType}: ${itemTitle} (${timeOrDate})`;
    }

    return {
      isFiltered,
      total: isFiltered ? filteredRecords.length : todayTotalCount,
      sheetTotalCount,
      sheetSentCount,
      sheetReceivedCount,
      todayTotalCount,
      todaySentCount,
      todayReceivedCount,
      todaySentPct,
      todayReceivedPct,
      sentPct,
      receivedPct,
      latestDept,
      latestActivityText,
      allTimeTotal: sheetTotalCount,
      allTimeSent: sheetSentCount,
      allTimeReceived: sheetReceivedCount,
      rawRowsCount: rawRecords.length,
    };
  }, [consolidatedRecords, filteredRecords, isFiltered, language, rawRecords, records, quickFilter]);

  // Formatted date string for current day (วันปัจจุบัน)
  const todayThaiDisplayDate = useMemo(() => {
    try {
      const now = new Date();
      return now.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
        day: 'numeric',
        month: language === 'th' ? 'short' : 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }, [language]);

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

  // Records specifically for Board View's Outgoing (กล่อง รายการส่ง) column:
  // Shows outgoing records that are pending receipt (รอรับ)
  // When an item has been received, it moves to 'รายการรับ' showing the latest received info (like laundry)
  const boardSentRecords = useMemo(() => {
    const list = consolidatedRecords.length > 0 ? consolidatedRecords : records;
    return list.filter(r => {
      // Must be an outgoing 'ส่ง' record
      if (r.actionType !== 'ส่ง') {
        return false;
      }

      // If today filter is active
      if (quickFilter === 'today' || quickFilter === 'all_today' || quickFilter === 'ส่ง_today') {
        if (!isParcelRecordToday(r)) return false;
      }

      // DO NOT reference whether it has been received ("โดยไม่ต้องอ้างอิงว่ารับแล้ว ให้เป็นข้อมูลดิบในส่วนที่เป็นรายการส่งเลย")

      const query = (searchQuery || filters.keyword).toLowerCase().trim();
      const cleanQuery = query.replace(/[\s\-_]/g, '');
      const cleanTracking = (r.trackingCode || '').toLowerCase().replace(/[\s\-_]/g, '');
      const isDirectTrackingMatch = Boolean(cleanQuery && cleanTracking && (cleanTracking.includes(cleanQuery) || cleanQuery.includes(cleanTracking)));

      // Department filters
      if (filters.senderDepartment !== 'all' && r.senderDepartment !== filters.senderDepartment) {
        return false;
      }
      if (filters.recipientDepartment !== 'all' && r.recipientDepartment !== filters.recipientDepartment) {
        return false;
      }

      // Keyword match across all key fields (Document Title, Sender, Recipient, Operator, Tracking Code)
      if (query && !isDirectTrackingMatch) {
        const matchTitle = r.itemTitle?.toLowerCase().includes(query);
        const matchSender = r.senderName?.toLowerCase().includes(query) || r.senderDepartment?.toLowerCase().includes(query);
        const matchRecipient = r.recipientName?.toLowerCase().includes(query) || r.recipientDepartment?.toLowerCase().includes(query);
        const matchOperator = r.operatorName?.toLowerCase().includes(query) || r.operatorDepartment?.toLowerCase().includes(query);
        const matchTracking = r.trackingCode?.toLowerCase().includes(query);

        if (!matchTitle && !matchSender && !matchRecipient && !matchOperator && !matchTracking) {
          return false;
        }
      }

      // If user explicitly chose a date range in filters, or searched for direct tracking code, show it
      if (filters.startDate || filters.endDate || isDirectTrackingMatch) {
        if (filters.startDate || filters.endDate) {
          const raw = r.dateStr || r.timestamp;
          const clean = raw.split(/[\s,]+/)[0];
          const parts = clean.split(/[-/.]/);
          if (parts.length === 3) {
            let pd = parseInt(parts[0], 10);
            let pm = parseInt(parts[1], 10);
            let py = parseInt(parts[2], 10);
            if (pd > 1000) { py = pd; pd = parseInt(parts[2], 10); }
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
        return true;
      }

      // Otherwise, show items sent from Google Sheet
      return true;
    });
  }, [consolidatedRecords, records, filters, searchQuery, quickFilter]);

  // Records specifically for Board View's Received (กล่อง รายการรับ) column:
  // Shows incoming records displaying only the latest received information (like laundry)
  const boardReceivedRecords = useMemo(() => {
    const list = consolidatedRecords.length > 0 ? consolidatedRecords : records;
    return list.filter(r => {
      // Must be an incoming 'รับ' record
      if (r.actionType !== 'รับ') {
        return false;
      }

      // If today filter is active
      if (quickFilter === 'today' || quickFilter === 'all_today' || quickFilter === 'รับ_today') {
        if (!isParcelRecordToday(r)) return false;
      }

      const query = (searchQuery || filters.keyword).toLowerCase().trim();
      const cleanQuery = query.replace(/[\s\-_]/g, '');
      const cleanTracking = (r.trackingCode || '').toLowerCase().replace(/[\s\-_]/g, '');
      const isDirectTrackingMatch = Boolean(cleanQuery && cleanTracking && (cleanTracking.includes(cleanQuery) || cleanQuery.includes(cleanTracking)));

      // Department filters
      if (filters.senderDepartment !== 'all' && r.senderDepartment !== filters.senderDepartment) {
        return false;
      }
      if (filters.recipientDepartment !== 'all' && r.recipientDepartment !== filters.recipientDepartment) {
        return false;
      }

      // Keyword match across all key fields (Document Title, Sender, Recipient, Operator, Tracking Code)
      if (query && !isDirectTrackingMatch) {
        const matchTitle = r.itemTitle?.toLowerCase().includes(query);
        const matchSender = r.senderName?.toLowerCase().includes(query) || r.senderDepartment?.toLowerCase().includes(query);
        const matchRecipient = r.recipientName?.toLowerCase().includes(query) || r.recipientDepartment?.toLowerCase().includes(query);
        const matchOperator = r.operatorName?.toLowerCase().includes(query) || r.operatorDepartment?.toLowerCase().includes(query);
        const matchTracking = r.trackingCode?.toLowerCase().includes(query);

        if (!matchTitle && !matchSender && !matchRecipient && !matchOperator && !matchTracking) {
          return false;
        }
      }

      // If user explicitly chose a date range in filters, or searched for direct tracking code, show it
      if (filters.startDate || filters.endDate || isDirectTrackingMatch) {
        if (filters.startDate || filters.endDate) {
          const raw = r.dateStr || r.timestamp;
          const clean = raw.split(/[\s,]+/)[0];
          const parts = clean.split(/[-/.]/);
          if (parts.length === 3) {
            let pd = parseInt(parts[0], 10);
            let pm = parseInt(parts[1], 10);
            let py = parseInt(parts[2], 10);
            if (pd > 1000) { py = pd; pd = parseInt(parts[2], 10); }
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
        return true;
      }

      // Otherwise, show items received from Google Sheet
      return true;
    });
  }, [consolidatedRecords, records, filters, searchQuery, quickFilter]);

  // Click on a KPI Box toggles that filter and displays the corresponding records from Google Sheet
  const handleBoxClick = (targetFilter: 'all_today' | 'ส่ง_today' | 'รับ_today' | 'all' | 'ส่ง' | 'รับ') => {
    if (targetFilter === 'all') {
      setQuickFilter('all');
    } else {
      setQuickFilter(prev => prev === targetFilter ? 'all' : targetFilter);
    }
    const anchor = document.getElementById('parcel-records-view-anchor');
    if (anchor && typeof window !== 'undefined' && window.innerWidth < 768) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

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
                  {language === 'th' ? 'รับ-ส่ง เอกสาร / พัสดุ' : 'Document / Parcel'}
                </h1>

                {/* Sparkling Prominent Action Button for Form Submission (Opens Create Modal) */}
                <button
                  type="button"
                  onClick={() => {
                    setRecordToReceive(null);
                    setIsCreateModalOpen(true);
                  }}
                  className="relative group inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl font-black text-white text-xs sm:text-sm bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:via-rose-600 hover:to-amber-600 shadow-md hover:shadow-xl hover:shadow-pink-500/40 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/40 dark:border-white/20 cursor-pointer overflow-hidden"
                  title={language === 'th' ? 'คลิกเพื่อสร้างรายการ รับ-ส่ง เอกสาร / พัสดุ ใหม่ (บันทึกลง Google Sheet)' : 'Click to create a new Document / Parcel record'}
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
                    {language === 'th' ? 'เพิ่มรายการรับ-ส่ง เอกสาร / พัสดุ' : 'New Document / Parcel'}
                  </span>
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
              title={lastSyncedAt ? (language === 'th' ? `รีเฟรชข้อมูล (อัปเดตล่าสุด: ${lastSyncedAt.toLocaleTimeString('th-TH')})` : `Refresh data (Last updated: ${lastSyncedAt.toLocaleTimeString('en-US')})`) : (language === 'th' ? 'รีเฟรชข้อมูลจาก Google Sheet' : 'Refresh from Google Sheet')}
            >
              <RefreshCw className={`w-4 h-4 text-pink-600 dark:text-pink-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Analytics Button (Icon-only, Restricted to Admins & Supervisors) */}
            {isAdmin && (
              <button
                onClick={() => setIsAnalyticsOpen(true)}
                className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-pink-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs transition-all cursor-pointer flex items-center justify-center"
                title={language === 'th' ? 'ดูสถิติและภาพรวม (เฉพาะผู้ดูแลและแอดมิน)' : 'Analytics & Overview (Admin & Supervisor)'}
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
                title={language === 'th' ? 'เปิด Google Sheet ต้นทาง (เฉพาะผู้ดูแลและแอดมิน)' : 'Open Google Sheet (Admin & Supervisor)'}
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
              title={language === 'th' ? 'ตัวกรองข้อมูล' : 'Filters'}
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
                title={language === 'th' ? 'มุมมองรายการ (ตาราง)' : 'Table View'}
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
                title={language === 'th' ? 'มุมมองการ์ด (ตารางย่อย)' : 'Cards View'}
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
                title={language === 'th' ? 'มุมมองกระดานแยกประเภท (ส่ง/รับ)' : 'Board View (Send / Receive)'}
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
                title={language === 'th' ? 'มุมมองปฏิทิน (ตามวัน)' : 'Calendar View'}
              >
                <CalendarDays className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Toggle between All Records in Google Sheet vs Today's Records */}
        <div className="flex flex-wrap items-center justify-between gap-2 relative z-10">
          <div className="inline-flex items-center gap-1 p-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl border border-pink-200/80 dark:border-slate-800 text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setQuickFilter('all');
                setCurrentPageTable(1);
                setCurrentPageCards(1);
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                quickFilter === 'all' || quickFilter === 'ส่ง' || quickFilter === 'รับ'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>{language === 'th' ? `ข้อมูลทั้งหมด (${metrics.sheetTotalCount})` : `All Data (${metrics.sheetTotalCount})`}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickFilter('all_today');
                setCurrentPageTable(1);
                setCurrentPageCards(1);
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{language === 'th' ? `วันปัจจุบัน (${metrics.todayTotalCount})` : `Today (${metrics.todayTotalCount})`}</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 font-medium bg-white/60 dark:bg-slate-900/60 px-2.5 py-1 rounded-lg border border-pink-100 dark:border-slate-800">
            <FileSpreadsheet className="w-3.5 h-3.5 text-pink-500 shrink-0" />
            <span>{language === 'th' ? `ข้อมูลจาก Google Sheet: ทั้งหมด ${metrics.sheetTotalCount} | วันนี้ (${todayThaiDisplayDate}) ${metrics.todayTotalCount} รายการ` : `Google Sheet: ${metrics.sheetTotalCount} total | ${metrics.todayTotalCount} today (${todayThaiDisplayDate})`}</span>
          </span>
        </div>

        {/* Metric Cards Row (4 Cards) - All 3 boxes are interactive and clickable */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
          {/* Card 1: Total Records (ข้อมูลจาก Google Sheet) */}
          <button
            type="button"
            onClick={() => handleBoxClick(quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today' ? 'all_today' : 'all')}
            className={`text-left backdrop-blur-md rounded-2xl p-4 border transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
              quickFilter === 'all' || quickFilter === 'all_today' || quickFilter === 'today'
                ? 'bg-pink-100/90 dark:bg-pink-950/60 border-pink-500 shadow-md ring-2 ring-pink-500/50 scale-[1.01]'
                : 'bg-white/80 dark:bg-slate-900/80 border-pink-200/80 dark:border-slate-800 shadow-xs hover:border-pink-300 hover:shadow-md hover:scale-[1.01]'
            }`}
            title={language === 'th' ? 'คลิกที่กล่องเพื่อแสดงรายการทั้งหมดตามโหมดที่เลือก' : 'Click to view all records in selected mode'}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
                  {language === 'th' 
                    ? (quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today' ? 'รายการทั้งหมด (วันนี้)' : 'รายการทั้งหมด')
                    : (quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today' ? 'Total Records (Today)' : 'Total Records')}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today'
                    ? 'text-white bg-pink-600 shadow-2xs'
                    : 'text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-950/60 group-hover:bg-pink-200'
                }`}>
                  {quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today' ? (
                    <>
                      <Calendar className="w-2.5 h-2.5" />
                      {language === 'th' ? 'วันนี้' : 'Today'}
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-2.5 h-2.5" />
                      {language === 'th' ? 'ทั้งหมด' : 'All'}
                    </>
                  )}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1.5 flex items-baseline gap-2">
                <span>
                  {(quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today' 
                    ? metrics.todayTotalCount 
                    : metrics.sheetTotalCount).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {language === 'th' ? 'รายการ' : 'items'}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-pink-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 font-medium">
                {quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today' ? (
                  <span>{language === 'th' ? `สะสมใน Sheet ${metrics.sheetTotalCount} รายการ` : `Total in Sheet ${metrics.sheetTotalCount}`}</span>
                ) : (
                  <span>{language === 'th' ? `วันนี้ ${metrics.todayTotalCount} รายการ` : `Today ${metrics.todayTotalCount} items`}</span>
                )}
              </span>
              <span className="font-bold text-pink-600 dark:text-pink-400 text-[10px] shrink-0 ml-1">
                {quickFilter === 'all' || quickFilter === 'all_today' || quickFilter === 'today'
                  ? (language === 'th' ? 'กำลังแสดง ✓' : 'Active ✓')
                  : (language === 'th' ? 'กดเพื่อดู' : 'View')}
              </span>
            </div>
          </button>

          {/* Card 2: Sent (ข้อมูลส่ง จาก Google Sheet) */}
          <button
            type="button"
            onClick={() => handleBoxClick(quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today' ? 'ส่ง_today' : 'ส่ง')}
            className={`text-left backdrop-blur-md rounded-2xl p-4 border transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
              quickFilter === 'ส่ง' || quickFilter === 'ส่ง_today'
                ? 'bg-rose-100/90 dark:bg-rose-950/60 border-rose-500 shadow-md ring-2 ring-rose-500/50 scale-[1.01]'
                : 'bg-white/80 dark:bg-slate-900/80 border-rose-200/80 dark:border-slate-800 shadow-xs hover:border-rose-300 hover:shadow-md hover:scale-[1.01]'
            }`}
            title={language === 'th' ? 'คลิกที่กล่องเพื่อแสดงรายการส่ง' : 'Click to view outgoing records'}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  {language === 'th' 
                    ? (quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today' ? 'รายการส่ง (วันนี้)' : 'รายการส่ง')
                    : (quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today' ? 'Outgoing (Today)' : 'Outgoing')}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  quickFilter === 'ส่ง' || quickFilter === 'ส่ง_today'
                    ? 'text-white bg-rose-600 shadow-2xs'
                    : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 group-hover:bg-rose-100'
                }`}>
                  {quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today' 
                    ? `${metrics.todaySentPct}%` 
                    : `${metrics.sentPct}%`}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-700 dark:text-rose-300 mt-1.5 flex items-baseline gap-2">
                <span>
                  {(quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today'
                    ? metrics.todaySentCount
                    : metrics.sheetSentCount).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-rose-500/80 dark:text-rose-400/80">
                  {language === 'th' ? 'รายการ' : 'items'}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-rose-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 truncate font-medium">
                {quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today' ? (
                  <span>{language === 'th' ? `สะสมใน Sheet ${metrics.sheetSentCount} รายการ` : `Total in Sheet ${metrics.sheetSentCount}`}</span>
                ) : (
                  <span>{language === 'th' ? `วันนี้ ${metrics.todaySentCount} รายการ` : `Today ${metrics.todaySentCount} items`}</span>
                )}
              </span>
              <span className="font-bold text-rose-600 dark:text-rose-400 text-[10px] shrink-0 ml-1">
                {quickFilter === 'ส่ง' || quickFilter === 'ส่ง_today'
                  ? (language === 'th' ? 'กำลังแสดง ✓' : 'Active ✓') 
                  : (language === 'th' ? 'กดเพื่อดู' : 'View')}
              </span>
            </div>
          </button>

          {/* Card 3: Received (ข้อมูลรับ จาก Google Sheet) */}
          <button
            type="button"
            onClick={() => handleBoxClick(quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today' ? 'รับ_today' : 'รับ')}
            className={`text-left backdrop-blur-md rounded-2xl p-4 border transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
              quickFilter === 'รับ' || quickFilter === 'รับ_today'
                ? 'bg-emerald-100/90 dark:bg-emerald-950/60 border-emerald-500 shadow-md ring-2 ring-emerald-500/50 scale-[1.01]'
                : 'bg-white/80 dark:bg-slate-900/80 border-emerald-200/80 dark:border-slate-800 shadow-xs hover:border-emerald-300 hover:shadow-md hover:scale-[1.01]'
            }`}
            title={language === 'th' ? 'คลิกที่กล่องเพื่อแสดงรายการรับ' : 'Click to view incoming records'}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Inbox className="w-3.5 h-3.5" />
                  {language === 'th' 
                    ? (quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today' ? 'รายการรับ (วันนี้)' : 'รายการรับ')
                    : (quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today' ? 'Incoming (Today)' : 'Incoming')}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  quickFilter === 'รับ' || quickFilter === 'รับ_today'
                    ? 'text-white bg-emerald-600 shadow-2xs'
                    : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 group-hover:bg-emerald-100'
                }`}>
                  {quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today'
                    ? `${metrics.todayReceivedPct}%`
                    : `${metrics.receivedPct}%`}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-1.5 flex items-baseline gap-2">
                <span>
                  {(quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today'
                    ? metrics.todayReceivedCount
                    : metrics.sheetReceivedCount).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-500/80 dark:text-emerald-400/80">
                  {language === 'th' ? 'รายการ' : 'items'}
                </span>
              </div>
            </div>
            {/* Clean bottom strip: Do not show 'ข้อมูลรับจาก Google Sheet' */}
            <div className="mt-2 pt-2 border-t border-emerald-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 truncate font-medium">
                {quickFilter === 'all_today' || quickFilter === 'today' || quickFilter === 'ส่ง_today' || quickFilter === 'รับ_today' ? (
                  <span>{language === 'th' ? `สะสมใน Sheet ${metrics.sheetReceivedCount} รายการ` : `Total in Sheet ${metrics.sheetReceivedCount}`}</span>
                ) : (
                  <span>{language === 'th' ? `วันนี้ ${metrics.todayReceivedCount} รายการ` : `Today ${metrics.todayReceivedCount} items`}</span>
                )}
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[10px] shrink-0 ml-1">
                {quickFilter === 'รับ' || quickFilter === 'รับ_today'
                  ? (language === 'th' ? 'กำลังแสดง ✓' : 'Active ✓') 
                  : (language === 'th' ? 'กดเพื่อดู' : 'View')}
              </span>
            </div>
          </button>

          {/* Card 4: Latest Active Department */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-pink-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {metrics.isFiltered 
                    ? (language === 'th' ? 'แผนกล่าสุดในตัวกรอง' : 'Latest Dept in Filter') 
                    : (language === 'th' ? 'แผนกเคลื่อนไหวล่าสุด' : 'Latest Active Dept')}
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
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={language === 'th' ? 'ค้นหาชื่อเอกสาร, ผู้ส่ง, ผู้รับ, แผนก, รหัสติดตาม...' : 'Search title, sender, recipient, department, tracking code...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white/90 dark:bg-slate-800/90 border border-pink-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
            />
            {searchQuery && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title={language === 'th' ? 'ล้างคำค้นหา' : 'Clear search'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setQuickFilter(prev => prev === 'all_today' ? 'all' : 'all_today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                quickFilter === 'all_today' || quickFilter === 'today'
                  ? 'bg-pink-600 text-white shadow-xs ring-2 ring-pink-400/40'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-pink-200 dark:border-slate-700 hover:bg-white'
              }`}
            >
              <Calendar className="w-3 h-3" />
              {language === 'th' ? `วันนี้ (${metrics.todayTotalCount})` : `Today (${metrics.todayTotalCount})`}
            </button>
            <button
              onClick={() => setQuickFilter(prev => prev === 'ส่ง_today' ? 'all' : 'ส่ง_today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                quickFilter === 'ส่ง_today'
                  ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400/40'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-rose-200 dark:border-slate-700 hover:bg-white'
              }`}
            >
              <Send className="w-3 h-3" />
              {language === 'th' ? `ส่งวันนี้ (${metrics.todaySentCount})` : `Sent Today (${metrics.todaySentCount})`}
            </button>
            <button
              onClick={() => setQuickFilter(prev => prev === 'รับ_today' ? 'all' : 'รับ_today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                quickFilter === 'รับ_today'
                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/40'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-emerald-200 dark:border-slate-700 hover:bg-white'
              }`}
            >
              <Inbox className="w-3 h-3" />
              {language === 'th' ? `รับวันนี้ (${metrics.todayReceivedCount})` : `Received Today (${metrics.todayReceivedCount})`}
            </button>
            <button
              onClick={() => setQuickFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                quickFilter === 'all'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-pink-200 dark:border-slate-700 hover:bg-white'
              }`}
            >
              {language === 'th' ? `ทั้งหมดสะสม (${metrics.sheetTotalCount})` : `All (${metrics.sheetTotalCount})`}
            </button>
            <button
              onClick={() => setQuickFilter(prev => prev === 'ส่ง' ? 'all' : 'ส่ง')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                quickFilter === 'ส่ง'
                  ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400/40'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-rose-200 dark:border-slate-700 hover:bg-white'
              }`}
            >
              <Send className="w-3 h-3" />
              {language === 'th' ? `ส่งสะสม (${metrics.sheetSentCount})` : `All Sent (${metrics.sheetSentCount})`}
            </button>
            <button
              onClick={() => setQuickFilter(prev => prev === 'รับ' ? 'all' : 'รับ')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                quickFilter === 'รับ'
                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/40'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-emerald-200 dark:border-slate-700 hover:bg-white'
              }`}
            >
              <Inbox className="w-3 h-3" />
              {language === 'th' ? `รับสะสม (${metrics.sheetReceivedCount})` : `All Received (${metrics.sheetReceivedCount})`}
            </button>
          </div>
        </div>

        {/* Active Filters Display bar */}
        {(activeFiltersCount > 0 || searchQuery || quickFilter !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-pink-200/60 dark:border-slate-700/60 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">{language === 'th' ? 'ตัวกรองที่เลือก:' : 'Active filters:'}</span>
            {quickFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 font-medium flex items-center gap-1">
                {language === 'th' ? 'ด่วน:' : 'Quick:'}{' '}
                {quickFilter === 'all_today' || quickFilter === 'today'
                  ? (language === 'th' ? 'รายการทั้งหมดวันปัจจุบัน' : 'Today All')
                  : quickFilter === 'ส่ง_today'
                  ? (language === 'th' ? 'รายการส่งวันปัจจุบัน' : 'Today Outgoing')
                  : quickFilter === 'รับ_today'
                  ? (language === 'th' ? 'รายการรับวันปัจจุบัน' : 'Today Incoming')
                  : quickFilter === 'ส่ง' 
                  ? (language === 'th' ? 'รายการส่ง' : 'All Outgoing') 
                  : (language === 'th' ? 'รายการรับ' : 'All Incoming')}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setQuickFilter('all')} />
              </span>
            )}
            {searchQuery && (
              <span className="px-2 py-0.5 rounded-md bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 font-medium flex items-center gap-1">
                {language === 'th' ? 'ค้นหา:' : 'Search:'} "{searchQuery}"
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
              </span>
            )}
            {filters.actionType !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 font-medium flex items-center gap-1">
                {language === 'th' ? 'ประเภท:' : 'Type:'} {filters.actionType === 'ส่ง' ? (language === 'th' ? 'ส่ง' : 'Send') : (language === 'th' ? 'รับ' : 'Receive')}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, actionType: 'all' })} />
              </span>
            )}
            {filters.senderDepartment !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 font-medium flex items-center gap-1">
                {language === 'th' ? 'ผู้ส่ง:' : 'Sender:'} {filters.senderDepartment}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, senderDepartment: 'all' })} />
              </span>
            )}
            {filters.recipientDepartment !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 font-medium flex items-center gap-1">
                {language === 'th' ? 'ผู้รับ:' : 'Recipient:'} {filters.recipientDepartment}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, recipientDepartment: 'all' })} />
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-pink-700 dark:text-pink-300 hover:underline font-bold ml-auto flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              {language === 'th' ? 'ล้างทั้งหมด' : 'Clear All'}
            </button>
          </div>
        )}
      </div>

      {/* 2. Main Content View Area */}
      <div id="parcel-records-view-anchor" className="scroll-mt-6" />
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-pink-100 dark:border-slate-800 space-y-3">
          <RefreshCw className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {language === 'th' ? 'กำลังโหลดข้อมูลรับ-ส่ง เอกสาร / พัสดุ จาก Google Sheet...' : 'Loading Document / Parcel records from Google Sheet...'}
          </p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-pink-100 dark:border-slate-800 text-center p-6 space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-pink-50 dark:bg-pink-950/50 flex items-center justify-center text-pink-500">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            {language === 'th' ? 'ไม่พบข้อมูลเอกสารหรือพัสดุ' : 'No document or parcel records found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            {language === 'th' ? 'ลองปรับเปลี่ยนคำค้นหา หรือกดล้างตัวกรองเพื่อดูข้อมูลทั้งหมด' : 'Try adjusting your search terms or clear filters to view all records.'}
          </p>
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            {language === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Clear All Filters'}
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* View 1: Table View */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-pink-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-pink-50/80 dark:bg-slate-800/80 border-b border-pink-100 dark:border-slate-700 text-[11px] font-bold text-pink-900 dark:text-pink-200 uppercase tracking-wider">
                  <th className="py-3.5 px-4">{language === 'th' ? 'วันที่เวลา' : 'Date / Time'}</th>
                  <th className="py-3.5 px-4 text-center">{language === 'th' ? 'ประเภท' : 'Type'}</th>
                  <th className="py-3.5 px-4">{language === 'th' ? 'ชื่อเอกสาร / พัสดุ' : 'Document / Parcel'}</th>
                  <th className="py-3.5 px-4">{language === 'th' ? 'ผู้ส่งตามหน้าซอง' : 'Sender'}</th>
                  <th className="py-3.5 px-4">{language === 'th' ? 'ผู้รับตามหน้าซอง' : 'Recipient'}</th>
                  <th className="py-3.5 px-4">{language === 'th' ? 'รหัสติดตาม' : 'Tracking Code'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                {paginatedRecordsTable.map((record, index) => {
                  const isSent = record.actionType === 'ส่ง';
                  const isConfirmedReceived = isParcelConfirmedReceived(record, records, receivedTrackingCodesSet);
                  return (
                    <tr 
                      key={`${record.id}-${record.seq || index}`}
                      onClick={() => handleOpenDetail(record)}
                      title={language === 'th' ? 'คลิกเพื่อดูรายละเอียด' : 'Click to view details'}
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
                          isConfirmedReceived || !isSent
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                        }`}>
                          {isConfirmedReceived || !isSent ? <Inbox className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                          {isConfirmedReceived || !isSent
                            ? (language === 'th' ? 'รับแล้ว' : 'Received')
                            : (language === 'th' ? 'ส่ง (รอรับ)' : 'Sent (Pending)')}
                        </span>
                      </td>

                      {/* Item Title */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-2 max-w-xs">
                          {record.itemTitle}
                        </div>
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

                      {/* Tracking Code (หลังคอลัมน์ ผู้รับตามหน้าซอง) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {record.trackingCode ? (
                          isConfirmedReceived ? (
                            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 rounded-lg border bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 shadow-2xs">
                              <span className="text-emerald-700 dark:text-emerald-300 font-black">
                                {record.trackingCode}
                              </span>
                              <span className="font-sans font-bold text-[11px] text-emerald-800 dark:text-emerald-200 bg-emerald-200/80 dark:bg-emerald-900/90 px-1.5 py-0.5 rounded-md">
                                {language === 'th' ? 'รับแล้ว' : 'Received'}
                              </span>
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              <span className="inline-flex items-center font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                {record.trackingCode}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickReceive(record);
                                }}
                                className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title={language === 'th' ? 'กดรับเอกสารหรือพัสดุนี้' : 'Receive this document or parcel'}
                              >
                                <Inbox className="w-3 h-3" />
                                <span>{language === 'th' ? 'กดรับ' : 'Receive'}</span>
                              </button>
                            </div>
                          )
                        ) : (
                          isConfirmedReceived ? (
                            <span className="inline-flex items-center gap-1 font-sans text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {language === 'th' ? 'รับแล้ว' : 'Received'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickReceive(record);
                              }}
                              className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                              title={language === 'th' ? 'กดรับเอกสารหรือพัสดุนี้' : 'Receive this document or parcel'}
                            >
                              <Inbox className="w-3 h-3" />
                              <span>{language === 'th' ? 'กดรับ' : 'Receive'}</span>
                            </button>
                          )
                        )}
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
              {language === 'th' 
                ? `แสดง ${(currentPageTable - 1) * itemsPerPageTable + 1} - ${Math.min(currentPageTable * itemsPerPageTable, filteredRecords.length)} จากทั้งหมด ${filteredRecords.length} รายการ`
                : `Showing ${(currentPageTable - 1) * itemsPerPageTable + 1} - ${Math.min(currentPageTable * itemsPerPageTable, filteredRecords.length)} of ${filteredRecords.length} records`}
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
              const isConfirmedReceived = isParcelConfirmedReceived(record, records, receivedTrackingCodesSet);
              return (
                <div
                  key={`${record.id}-${record.seq || index}`}
                  onClick={() => handleOpenDetail(record)}
                  className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border ${
                    isSent && isConfirmedReceived 
                      ? 'border-emerald-200/90 dark:border-emerald-800/80 ring-1 ring-emerald-400/20' 
                      : 'border-pink-100/80 dark:border-slate-800'
                  } shadow-sm hover:shadow-md hover:border-pink-300 dark:hover:border-pink-800 transition-all cursor-pointer flex flex-col justify-between gap-4 group`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                        isConfirmedReceived || !isSent 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300' 
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300'
                      }`}>
                        {isConfirmedReceived || !isSent ? <Inbox className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                        {isConfirmedReceived || !isSent 
                          ? (language === 'th' ? 'รับแล้ว (ข้อมูลล่าสุด)' : 'Received (Latest)') 
                          : (language === 'th' ? 'รายการส่ง (รอรับ)' : 'Outgoing (Pending)')}
                      </span>

                      {record.trackingCode && (
                        isConfirmedReceived ? (
                          <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 shadow-2xs flex items-center gap-1.5">
                            <span className="font-black text-emerald-700 dark:text-emerald-300">{record.trackingCode}</span>
                            <span className="font-sans font-bold text-[10px] text-emerald-800 dark:text-emerald-200 bg-emerald-200/80 dark:bg-emerald-900 px-1.5 py-0.5 rounded-md">
                              {language === 'th' ? 'รับแล้ว' : 'Received'}
                            </span>
                          </span>
                        ) : (
                          <span className="font-mono text-xs font-bold text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/60 px-2 py-0.5 rounded-lg border border-pink-200 dark:border-pink-800/60 shadow-2xs">
                            {record.trackingCode}
                          </span>
                        )
                      )}
                    </div>

                    <h4 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                      {record.itemTitle}
                    </h4>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{record.timestamp}</span>
                    </div>
                  </div>

                  {/* Flow Box */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/80 space-y-2 text-xs">
                    {/* Sender */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{language === 'th' ? 'ผู้ส่ง:' : 'Sender:'}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate">
                        {record.senderName} ({record.senderDepartment})
                      </span>
                    </div>

                    {/* Recipient */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{language === 'th' ? 'ผู้รับ:' : 'Recipient:'}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate">
                        {record.recipientName} ({record.recipientDepartment})
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    {isConfirmedReceived ? (
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {record.trackingCode ? (
                          <span className="font-mono font-black">{record.trackingCode}</span>
                        ) : null}
                        <span>{language === 'th' ? 'รับแล้ว' : 'Received'}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickReceive(record);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title={language === 'th' ? 'กดรับเอกสาร / พัสดุนี้' : 'Receive Document / Parcel'}
                      >
                        <Inbox className="w-3.5 h-3.5" />
                        <span>{language === 'th' ? 'กดรับเอกสาร / พัสดุนี้' : 'Receive Document / Parcel'}</span>
                      </button>
                    )}
                    <span className="text-pink-600 dark:text-pink-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      {language === 'th' ? 'รายละเอียด' : 'Details'} <ArrowRight className="w-3 h-3" />
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
                {language === 'th' 
                  ? `หน้า ${currentPageCards} จาก ${totalPagesCards} (ทั้งหมด ${filteredRecords.length} รายการ)`
                  : `Page ${currentPageCards} of ${totalPagesCards} (${filteredRecords.length} items)`}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPageCards(prev => Math.max(prev - 1, 1))}
                  disabled={currentPageCards === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  {language === 'th' ? 'ก่อนหน้า' : 'Previous'}
                </button>
                <button
                  onClick={() => setCurrentPageCards(prev => Math.min(prev + 1, totalPagesCards))}
                  disabled={currentPageCards === totalPagesCards}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  {language === 'th' ? 'ถัดไป' : 'Next'}
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
                    {language === 'th' ? 'รายการส่ง (รอรับ)' : 'Outgoing (Pending)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {language === 'th' ? 'รายการส่งที่รอรับเอกสาร (ย้ายไปรายการรับเมื่อขึ้นรับแล้ว)' : 'Pending outgoing items'}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs">
                {language === 'th' 
                  ? `${boardSentRecords.length} รายการ`
                  : `${boardSentRecords.length} items`}
              </span>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {boardSentRecords.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 space-y-2">
                  <Package className="w-10 h-10 opacity-30 stroke-1" />
                  <p className="text-xs font-semibold">
                    {language === 'th' ? 'ไม่มีรายการส่งค้างรอรับ' : 'No pending outgoing items'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {language === 'th' ? 'รายการส่งทั้งหมดถูกขึ้นรับเอกสารเรียบร้อยแล้ว' : 'All outgoing items have been received'}
                  </p>
                </div>
              ) : (
                boardSentRecords.map((record, index) => {
                  const isReceived = isParcelConfirmedReceived(record, records, receivedTrackingCodesSet);
                  return (
                    <div
                      key={`${record.id}-${record.seq || index}`}
                      onClick={() => handleOpenDetail(record)}
                      className={`bg-white dark:bg-slate-800/90 rounded-2xl p-4 border ${
                        isReceived ? 'border-emerald-300/90 dark:border-emerald-700/80 ring-1 ring-emerald-400/20' : 'border-rose-100 dark:border-slate-700'
                      } shadow-xs hover:border-pink-300 transition-all cursor-pointer space-y-2.5`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {record.trackingCode ? (
                          isReceived ? (
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg border bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 shadow-2xs">
                              <span className="text-emerald-700 dark:text-emerald-300 font-black">
                                {record.trackingCode}
                              </span>
                              <span className="font-sans text-[10px] text-emerald-800 dark:text-emerald-200 bg-emerald-200/80 dark:bg-emerald-900 px-1.5 py-0.2 rounded font-bold">
                                {language === 'th' ? 'รับแล้ว' : 'Received'}
                              </span>
                            </span>
                          ) : (
                            <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                              {record.trackingCode}
                            </span>
                          )
                        ) : <span />}
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
                        <span>{language === 'th' ? 'แผนก:' : 'Dept:'} {record.recipientDepartment}</span>
                        {isReceived ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {language === 'th' ? 'รับแล้ว' : 'Received'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickReceive(record);
                            }}
                            className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title={language === 'th' ? 'กดรับเอกสารหรือพัสดุนี้' : 'Receive this document or parcel'}
                          >
                            <Inbox className="w-3 h-3" />
                            <span>{language === 'th' ? 'กดรับ' : 'Receive'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
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
                    {language === 'th' ? 'รายการรับ (รับแล้ว)' : 'Incoming / Received'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {language === 'th' ? 'ข้อมูลล่าสุดเฉพาะรายการที่รับแล้ว' : 'Latest received items'}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                {language === 'th' 
                  ? `${boardReceivedRecords.length} รายการ`
                  : `${boardReceivedRecords.length} items`}
              </span>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {boardReceivedRecords.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 space-y-2">
                  <Package className="w-10 h-10 opacity-30 stroke-1" />
                  <p className="text-xs font-semibold">
                    {language === 'th' ? 'ไม่มีรายการรับ' : 'No incoming items'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {language === 'th' ? 'ดึงตามข้อมูลใน Google Sheet' : 'Retrieved from Google Sheet data'}
                  </p>
                </div>
              ) : (
                boardReceivedRecords.map((record, index) => (
                  <div
                    key={`${record.id}-${record.seq || index}`}
                    onClick={() => handleOpenDetail(record)}
                    className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-emerald-100 dark:border-slate-700 shadow-xs hover:border-emerald-300 transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {record.trackingCode ? (
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg border bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 shadow-2xs">
                          <span className="text-emerald-700 dark:text-emerald-300 font-black">
                            {record.trackingCode}
                          </span>
                          <span className="font-sans text-[10px] text-emerald-800 dark:text-emerald-200 bg-emerald-200/80 dark:bg-emerald-900 px-1.5 py-0.2 rounded font-bold">
                            {language === 'th' ? 'รับแล้ว' : 'Received'}
                          </span>
                        </span>
                      ) : (
                        <span className="font-sans text-[11px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300">
                          {language === 'th' ? 'รับแล้ว' : 'Received'}
                        </span>
                      )}
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
                      <span>{language === 'th' ? 'แผนก:' : 'Dept:'} {record.recipientDepartment}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {language === 'th' ? 'รับแล้ว' : 'Received'}
                      </span>
                    </div>
                  </div>
                ))
              )}
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
        allRecords={consolidatedRecords}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        onClose={handleCloseDetailModal}
        onQuickReceive={handleQuickReceive}
      />

      {/* Filter Modal */}
      <ParcelFilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
        records={consolidatedRecords}
      />

      {/* Analytics Modal */}
      <ParcelAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        records={consolidatedRecords}
      />

      {/* Create Record Modal (Both Receive & Send, strictly matching Google Sheet columns) */}
      <CreateParcelRecordModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setRecordToReceive(null);
        }}
        initialRecordToReceive={recordToReceive}
        onRecordCreated={(newRecord) => {
          if (newRecord) {
            setRecords((prev) => consolidateParcelRecords([newRecord, ...prev]));
            setRawRecords((prev) => [newRecord, ...prev]);
          }
          // Immediately reload from Google Sheet, and reload again after short delay for Sheet synchronization
          loadData(true, false);
          setTimeout(() => {
            loadData(false, true);
          }, 1500);
        }}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        existingRecords={consolidatedRecords}
      />
    </div>
  );
};
