import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  Filter, 
  ExternalLink, 
  RefreshCw, 
  Calendar as CalendarIcon, 
  Building2, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Clock, 
  Layers, 
  LayoutGrid, 
  List, 
  Columns, 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  BarChart3, 
  Eye, 
  Image as ImageIcon,
  FlaskConical,
  Sparkles,
  Droplets,
  TestTubes,
  ShieldCheck,
  FileSpreadsheet,
  RotateCcw,
  Check,
  ChevronDown,
  CheckCircle,
  XCircle,
  X,
  Info,
  QrCode,
  Copy,
  Download
} from 'lucide-react';
import { ChlorineInspectionRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  CHLORINE_SHEET_URL, 
  CHLORINE_FORM_URL,
  fetchGoogleSheetChlorineRecords,
  formatGoogleDriveImageUrl
} from '../services/googleSheetSyncService';
import { ChlorineDetailModal } from './ChlorineDetailModal';
import { ChlorineAnalyticsModal } from './ChlorineAnalyticsModal';
import { ChlorineFilterModal, ChlorineFilters } from './ChlorineFilterModal';

interface ChlorineViewProps {
  currentUser?: { name: string; username?: string; role?: string } | null;
  isAuthenticated?: boolean;
}

type ViewMode = 'table' | 'grid' | 'board' | 'calendar';

export type ComplianceType = 'send_a' | 'send_b' | 'inspect_a' | 'inspect_b';

export interface ComplianceItemConfig {
  id: ComplianceType;
  title: string;
  categoryName: string;
  buildingName: string;
  targetCount: number; // 2 times per week
  theme: 'amber' | 'indigo';
}

const COMPLIANCE_ITEMS: ComplianceItemConfig[] = [
  {
    id: 'send_a',
    title: 'ส่งผลอาคาร A',
    categoryName: 'ส่งผล',
    buildingName: 'อาคาร A',
    targetCount: 2,
    theme: 'amber',
  },
  {
    id: 'send_b',
    title: 'ส่งผลอาคาร B',
    categoryName: 'ส่งผล',
    buildingName: 'อาคาร B',
    targetCount: 2,
    theme: 'indigo',
  },
  {
    id: 'inspect_a',
    title: 'ผลสุ่มตรวจอาคาร A',
    categoryName: 'สุ่มตรวจ',
    buildingName: 'อาคาร A',
    targetCount: 2,
    theme: 'amber',
  },
  {
    id: 'inspect_b',
    title: 'ผลสุ่มตรวจอาคาร B',
    categoryName: 'สุ่มตรวจ',
    buildingName: 'อาคาร B',
    targetCount: 2,
    theme: 'indigo',
  },
];

// Helper: categorize record into one of the 4 compliance types
export function getComplianceCategory(rec: ChlorineInspectionRecord): ComplianceType {
  const rawArea = (rec.rawArea || '').trim();
  const areaLower = rawArea.toLowerCase();
  const isInspect = areaLower.includes('สุ่มตรวจ') || areaLower.includes('สุ่ม') || rec.actionType === 'สุ่มตรวจ';
  const isBuildingB = areaLower.includes('อาคาร b') || areaLower.includes('อาคารb') || areaLower.includes('ตึก b') || areaLower.includes('b') || (rec.building && rec.building.includes('B'));

  if (isInspect) {
    return isBuildingB ? 'inspect_b' : 'inspect_a';
  } else {
    return isBuildingB ? 'send_b' : 'send_a';
  }
}

// Helper: parse date from record
export function parseDateFromRecord(rec: ChlorineInspectionRecord): Date | null {
  try {
    if (rec.inspectionDate && rec.inspectionDate !== 'ไม่ระบุวันที่') {
      const parts = rec.inspectionDate.split(/[\/\-]/);
      if (parts.length === 3) {
        let d = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10);
        let y = parseInt(parts[2], 10);
        if (parts[0].length === 4) {
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
          d = parseInt(parts[2], 10);
        }
        if (y > 2400) y -= 543;
        if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          return new Date(y, m - 1, d);
        }
      }
    }
    if (rec.timestamp && rec.timestamp !== 'ไม่ระบุเวลา') {
      const firstPart = rec.timestamp.split(/[\s,]+/)[0];
      const parts = firstPart.split(/[\/\-]/);
      if (parts.length === 3) {
        let d = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10);
        let y = parseInt(parts[2], 10);
        if (parts[0].length === 4) {
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
          d = parseInt(parts[2], 10);
        }
        if (y > 2400) y -= 543;
        if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          return new Date(y, m - 1, d);
        }
      }
    }
  } catch (e) {}
  return null;
}

// Helper: Get Monday 00:00:00 of the week for any date (Monday - Sunday cycle)
export function getMondayOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Helper: Get Sunday 23:59:59 of the week for any Monday
export function getSundayOfWeek(monday: Date): Date {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

// Helper: Format date for Thai label
export function formatThaiShortDate(d: Date): string {
  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export const ChlorineView: React.FC<ChlorineViewProps> = ({
  currentUser,
  isAuthenticated = false,
}) => {
  const { language } = useLanguage();

  // Records state
  const [records, setRecords] = useState<ChlorineInspectionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // View & Filter state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [buildingFilter, setBuildingFilter] = useState<'all' | 'อาคาร A' | 'อาคาร B'>('all');
  const [complianceTypeFilter, setComplianceTypeFilter] = useState<'all' | ComplianceType>('all');
  const [filters, setFilters] = useState<ChlorineFilters>({
    building: 'all',
    inspector: 'all',
    startDate: '',
    endDate: '',
  });

  // Selected week for weekly compliance tracking (keyed by Monday epoch timestamp)
  const [selectedWeekKey, setSelectedWeekKey] = useState<number | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = viewMode === 'grid' ? 6 : 20;

  // Modals state
  const [selectedRecord, setSelectedRecord] = useState<ChlorineInspectionRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState<boolean>(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copiedQrLink, setCopiedQrLink] = useState<boolean>(false);

  // Calendar selected date & modal for mobile/tablet
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);
  const [isCalendarDayModalOpen, setIsCalendarDayModalOpen] = useState<boolean>(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(2026, 2, 1)); // March 2026

  // Fetch data on mount and background real-time sync
  const loadData = async (showSyncIndicator = false) => {
    if (showSyncIndicator) setIsSyncing(true);
    else if (records.length === 0) setIsLoading(true);
    setSyncError(null);

    try {
      const result = await fetchGoogleSheetChlorineRecords();
      if (result.success && result.records.length > 0) {
        setRecords(result.records);
        setLastSyncTime(result.lastSyncedAt);
      } else {
        setSyncError(result.error || 'ไม่สามารถโหลดข้อมูลได้');
      }
    } catch (err: any) {
      setSyncError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Auto-update in background every 30 seconds for real-time synchronization
    const interval = setInterval(() => {
      loadData(false);
    }, 30000);

    const onFocus = () => {
      loadData(false);
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Sync calendar month to newest record date if available
  useEffect(() => {
    if (records.length > 0) {
      for (const r of records) {
        const d = parseDateFromRecord(r);
        if (d) {
          setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
          break;
        }
      }
    }
  }, [records]);

  // Distinct inspectors list for filter
  const inspectorsList = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.inspectorName && r.inspectorName !== 'ไม่ระบุชื่อ') {
        set.add(r.inspectorName);
      }
    });
    return Array.from(set).sort();
  }, [records]);

  // Available weeks grouped (Monday to Sunday)
  const availableWeeks = useMemo(() => {
    const weekMap = new Map<number, { monday: Date; sunday: Date; count: number }>();
    
    // Always include current week
    const nowMonday = getMondayOfWeek(new Date());
    const nowSunday = getSundayOfWeek(nowMonday);
    weekMap.set(nowMonday.getTime(), { monday: nowMonday, sunday: nowSunday, count: 0 });

    records.forEach((rec) => {
      const d = parseDateFromRecord(rec);
      if (d) {
        const mon = getMondayOfWeek(d);
        const sun = getSundayOfWeek(mon);
        const key = mon.getTime();
        const existing = weekMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          weekMap.set(key, { monday: mon, sunday: sun, count: 1 });
        }
      }
    });

    // Sort newest week first
    return Array.from(weekMap.entries())
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => b.key - a.key);
  }, [records]);

  // Set default selected week (latest week or current week)
  useEffect(() => {
    if (selectedWeekKey === null && availableWeeks.length > 0) {
      // Find week with data or newest
      const weekWithData = availableWeeks.find(w => w.count > 0) || availableWeeks[0];
      setSelectedWeekKey(weekWithData.key);
    }
  }, [availableWeeks, selectedWeekKey]);

  // Active selected week object
  const activeWeek = useMemo(() => {
    if (selectedWeekKey && availableWeeks.length > 0) {
      const found = availableWeeks.find(w => w.key === selectedWeekKey);
      if (found) return found;
    }
    if (availableWeeks.length > 0) return availableWeeks[0];
    const nowMon = getMondayOfWeek(new Date());
    return { key: nowMon.getTime(), monday: nowMon, sunday: getSundayOfWeek(nowMon), count: 0 };
  }, [availableWeeks, selectedWeekKey]);

  // Calculate Weekly Compliance Stats for Active Week
  const weeklyComplianceStats = useMemo(() => {
    const targetMonday = activeWeek.monday.getTime();
    const targetSunday = activeWeek.sunday.getTime();

    // Filter records belonging to this week
    const weekRecords = records.filter(rec => {
      const d = parseDateFromRecord(rec);
      if (!d) return false;
      const t = d.getTime();
      return t >= targetMonday && t <= targetSunday;
    });

    // Count for each of the 4 items
    const counts: Record<ComplianceType, number> = {
      send_a: 0,
      send_b: 0,
      inspect_a: 0,
      inspect_b: 0,
    };

    weekRecords.forEach(rec => {
      const cat = getComplianceCategory(rec);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const items = COMPLIANCE_ITEMS.map(item => {
      const count = counts[item.id] || 0;
      const target = item.targetCount; // 2
      const isComplete = count >= target;
      const missing = Math.max(0, target - count);
      const percentage = Math.min(100, Math.round((count / target) * 100));

      return {
        ...item,
        count,
        target,
        isComplete,
        missing,
        percentage,
      };
    });

    const totalTarget = items.reduce((acc, it) => acc + it.target, 0); // 8
    const totalSubmitted = items.reduce((acc, it) => acc + it.count, 0);
    const completedItemsCount = items.filter(it => it.isComplete).length; // out of 4
    const isAllCompliant = completedItemsCount === 4;
    const missingItems = items.filter(it => !it.isComplete);
    const totalMissingSubmissions = items.reduce((acc, it) => acc + it.missing, 0);

    return {
      weekRecords,
      items,
      totalTarget,
      totalSubmitted,
      completedItemsCount,
      isAllCompliant,
      missingItems,
      totalMissingSubmissions,
    };
  }, [records, activeWeek]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (rec.inspectorName || '').toLowerCase().includes(q);
        const matchArea = (rec.rawArea || '').toLowerCase().includes(q);
        const matchDate = (rec.inspectionDate || '').toLowerCase().includes(q);
        const matchBuilding = (rec.building || '').toLowerCase().includes(q);
        const matchSeq = String(rec.seq).includes(q);
        if (!matchName && !matchArea && !matchDate && !matchBuilding && !matchSeq) {
          return false;
        }
      }

      // Quick Building Filter
      if (buildingFilter !== 'all') {
        if (rec.building !== buildingFilter) return false;
      }

      // Compliance Type Filter
      if (complianceTypeFilter !== 'all') {
        const cat = getComplianceCategory(rec);
        if (cat !== complianceTypeFilter) return false;
      }

      // Modal Filters: Building
      if (filters.building !== 'all') {
        if (rec.building !== filters.building) return false;
      }

      // Modal Filters: Inspector
      if (filters.inspector !== 'all') {
        if (rec.inspectorName !== filters.inspector) return false;
      }

      // Modal Filters: Start & End Date
      if (filters.startDate || filters.endDate) {
        const parts = (rec.inspectionDate || '').split(/[\/\-]/);
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const y = parseInt(parts[2], 10);
          const recDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          
          if (filters.startDate && recDateStr < filters.startDate) return false;
          if (filters.endDate && recDateStr > filters.endDate) return false;
        }
      }

      // Calendar Selected Date Filter
      if (viewMode === 'calendar' && calendarSelectedDate) {
        if (rec.inspectionDate !== calendarSelectedDate) return false;
      }

      return true;
    });
  }, [records, searchQuery, buildingFilter, complianceTypeFilter, filters, viewMode, calendarSelectedDate]);

  // Counts for Quick filter pills
  const totalCount = records.length;
  const buildingACount = records.filter(r => r.building.includes('A')).length;
  const buildingBCount = records.filter(r => r.building.includes('B')).length;
  const uniqueInspectorsCount = inspectorsList.length;

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.building !== 'all') count++;
    if (filters.inspector !== 'all') count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    return count;
  }, [filters]);

  // Pagination slice
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const handleOpenDetail = (record: ChlorineInspectionRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  // Switch weeks helper
  const handlePrevWeek = () => {
    const currentIndex = availableWeeks.findIndex(w => w.key === activeWeek.key);
    if (currentIndex >= 0 && currentIndex < availableWeeks.length - 1) {
      setSelectedWeekKey(availableWeeks[currentIndex + 1].key);
    }
  };

  const handleNextWeek = () => {
    const currentIndex = availableWeeks.findIndex(w => w.key === activeWeek.key);
    if (currentIndex > 0) {
      setSelectedWeekKey(availableWeeks[currentIndex - 1].key);
    }
  };

  const isCurrentWeek = useMemo(() => {
    const nowMon = getMondayOfWeek(new Date());
    return activeWeek.monday.getTime() === nowMon.getTime();
  }, [activeWeek]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Dynamic Animated Header Banner (Medium Blue & White Gradient with Chlorine Icons) */}
      <div 
        id="chlorine-header-banner"
        className="bg-white rounded-3xl shadow-sm border border-blue-200/80 p-5 md:p-7 relative overflow-hidden animated-chlorine-header"
      >
        {/* Floating background ambient glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-400/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-sky-300/30 rounded-full blur-3xl pointer-events-none" />

        {/* Floating Chlorine Testing Equipment Icons */}
        <div className="absolute right-8 top-6 opacity-35 pointer-events-none hidden sm:block animate-chlorine-flask">
          <FlaskConical className="w-12 h-12 text-blue-600/70" />
        </div>
        <div className="absolute right-32 bottom-4 opacity-30 pointer-events-none hidden sm:block animate-chlorine-drop">
          <Droplets className="w-10 h-10 text-sky-600/70" />
        </div>
        <div className="absolute left-1/2 top-4 opacity-25 pointer-events-none hidden md:block animate-chlorine-tube">
          <TestTubes className="w-9 h-9 text-indigo-600/60" />
        </div>

        <div className="relative z-10 space-y-5">
          {/* Top Row: Title + Action Icon Buttons Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Header Title */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                <FlaskConical className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {language === 'th' ? 'สุ่มตรวจคลอรีน' : 'Chlorine Inspection'}
                </h1>
              </div>
            </div>

            {/* Action Buttons Toolbar: ICON ONLY */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Analytics Button (Icon only) */}
              <button
                type="button"
                onClick={() => setIsAnalyticsModalOpen(true)}
                className="p-2.5 rounded-xl bg-white/85 hover:bg-white text-blue-950 border border-blue-200/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs hover:border-blue-300"
                title={language === 'th' ? 'สถิติและการวิเคราะห์' : 'Analytics & Statistics'}
                aria-label={language === 'th' ? 'สถิติและการวิเคราะห์' : 'Analytics & Statistics'}
              >
                <BarChart3 className="w-5 h-5 text-blue-600 stroke-[2]" />
              </button>

              {/* Google Sheets Link Button (Icon only) */}
              <a
                href={CHLORINE_SHEET_URL}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-white/85 hover:bg-white text-emerald-800 border border-blue-200/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs hover:border-blue-300"
                title={language === 'th' ? 'เปิด Google Sheets ต้นฉบับ' : 'Open Google Sheets'}
                aria-label="Google Sheet"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-700 stroke-[2]" />
              </a>

              {/* Filter Button */}
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(true)}
                className={`p-2.5 rounded-xl border backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center relative shadow-xs hover:border-blue-300 ${
                  activeFiltersCount > 0
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-2 ring-blue-300'
                    : 'bg-white/85 hover:bg-white text-blue-950 border border-blue-200/80'
                }`}
                title={language === 'th' ? (activeFiltersCount > 0 ? `ตัวกรองการค้นหา (${activeFiltersCount})` : 'ตัวกรองการค้นหา') : (activeFiltersCount > 0 ? `Filters (${activeFiltersCount})` : 'Filters')}
                aria-label={language === 'th' ? 'ตัวกรองการค้นหา' : 'Filters'}
              >
                <Filter className={`w-5 h-5 stroke-[2] ${activeFiltersCount > 0 ? 'text-white' : 'text-blue-600'}`} />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white shadow-xs">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* View Mode Switcher */}
              <div className="flex items-center p-0.5 rounded-xl bg-white/80 border border-slate-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'table' ? 'bg-[#002045] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={language === 'th' ? 'มุมมองตาราง' : 'Table View'}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'grid' ? 'bg-[#002045] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={language === 'th' ? 'มุมมองการ์ด' : 'Card View'}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('board')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'board' ? 'bg-[#002045] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={language === 'th' ? 'มุมมองกระดานแยกอาคาร' : 'Board View'}
                >
                  <Columns className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'calendar' ? 'bg-[#002045] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={language === 'th' ? 'มุมมองปฏิทิน' : 'Calendar View'}
                >
                  <CalendarDays className="w-4 h-4" />
                </button>

                {/* เส้นคั่นและไอคอน QR Code หลังไอคอนมุมมองปฏิทิน */}
                <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="p-1.5 rounded-lg transition-colors cursor-pointer text-blue-700 hover:text-blue-900 hover:bg-blue-50 active:scale-95 group relative"
                  title={language === 'th' ? 'QR Code แบบฟอร์มสุ่มตรวจคลอรีน' : 'Chlorine Inspection Google Form QR Code'}
                  aria-label={language === 'th' ? 'QR Code แบบฟอร์มสุ่มตรวจคลอรีน' : 'Chlorine Inspection Google Form QR Code'}
                >
                  <QrCode className="w-4 h-4 transition-transform group-hover:scale-110" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row inside Header: 3 Stat Boxes (1. รายการตรวจทั้งหมด, 2. สุ่มตรวจอาคาร A & B รวมในกล่องเดียว, 3. เกณฑ์การส่งข้อมูลประจำสัปดาห์ (วันจันทร์ - อาทิตย์)) */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-blue-200/60">
            {/* Box 1: รายการตรวจทั้งหมด */}
            <div 
              onClick={() => {
                setBuildingFilter('all');
                setComplianceTypeFilter('all');
                setCurrentPage(1);
              }}
              className={`p-4 rounded-2xl backdrop-blur-md border transition-all cursor-pointer ${
                buildingFilter === 'all' && complianceTypeFilter === 'all'
                  ? 'bg-white/95 border-blue-400 shadow-md ring-2 ring-blue-300 scale-[1.02]'
                  : 'bg-white/75 hover:bg-white/90 border-blue-200/80 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-blue-900 text-xs font-bold mb-1.5">
                <span>{language === 'th' ? 'รายการตรวจทั้งหมด' : 'Total Records'}</span>
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FlaskConical className="w-4 h-4 text-blue-800" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-[#002045] font-mono">{totalCount}</p>
              <span className="text-[11px] text-blue-800/80 block mt-0.5">
                {language === 'th' ? 'บันทึกในระบบทั้งหมด' : 'All logged records'}
              </span>
            </div>

            {/* Box 2: สุ่มตรวจอาคาร A และ อาคาร B รวมในกล่องเดียวกัน */}
            <div 
              className="p-4 rounded-2xl backdrop-blur-md border bg-white/75 hover:bg-white/90 border-blue-200/80 shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-blue-900 text-xs font-bold mb-1.5">
                <span>{language === 'th' ? 'สุ่มตรวจอาคาร A และ อาคาร B' : 'Inspections (Building A & B)'}</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-indigo-700" />
                </div>
              </div>
              
              <div className="flex items-center gap-2 my-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBuildingFilter(buildingFilter === 'อาคาร A' ? 'all' : 'อาคาร A');
                    setComplianceTypeFilter('all');
                    setCurrentPage(1);
                  }}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-between ${
                    buildingFilter === 'อาคาร A'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                      : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  }`}
                  title={language === 'th' ? 'คลิกเพื่อกรองอาคาร A' : 'Filter Building A'}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>อาคาร A</span>
                  </span>
                  <span className="text-sm font-black font-mono">{buildingACount}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBuildingFilter(buildingFilter === 'อาคาร B' ? 'all' : 'อาคาร B');
                    setComplianceTypeFilter('all');
                    setCurrentPage(1);
                  }}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-between ${
                    buildingFilter === 'อาคาร B'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs ring-2 ring-indigo-300'
                      : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                  }`}
                  title={language === 'th' ? 'คลิกเพื่อกรองอาคาร B' : 'Filter Building B'}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span>อาคาร B</span>
                  </span>
                  <span className="text-sm font-black font-mono">{buildingBCount}</span>
                </button>
              </div>

              <span className="text-[11px] text-blue-700/90 block mt-0.5 truncate">
                {buildingFilter !== 'all' 
                  ? (language === 'th' ? `กำลังกรองเฉพาะ ${buildingFilter}` : `Filtered by ${buildingFilter}`)
                  : (language === 'th' ? `รวมทั้งสองอาคาร ${buildingACount + buildingBCount} รายการ` : `Total ${buildingACount + buildingBCount} records`)}
              </span>
            </div>

            {/* Box 3: เกณฑ์การส่งข้อมูลประจำสัปดาห์ (วันจันทร์ - อาทิตย์) */}
            <div 
              onClick={() => setIsWeeklyModalOpen(true)}
              className={`p-4 rounded-2xl backdrop-blur-md border transition-all cursor-pointer flex flex-col justify-between ${
                weeklyComplianceStats.isAllCompliant
                  ? 'bg-emerald-50/70 hover:bg-emerald-50/90 border-emerald-300 shadow-xs'
                  : 'bg-amber-50/70 hover:bg-amber-50/90 border-amber-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className={weeklyComplianceStats.isAllCompliant ? 'text-emerald-950' : 'text-amber-950'}>
                  {language === 'th' ? 'เกณฑ์การส่งข้อมูลประจำสัปดาห์ (วันจันทร์ - อาทิตย์)' : 'Weekly Submission Compliance (Mon - Sun)'}
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  weeklyComplianceStats.isAllCompliant ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {weeklyComplianceStats.isAllCompliant ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                </div>
              </div>

              <div className="flex items-baseline gap-2 my-0.5">
                <p className={`text-2xl sm:text-3xl font-black font-mono ${
                  weeklyComplianceStats.isAllCompliant ? 'text-emerald-800' : 'text-amber-800'
                }`}>
                  {weeklyComplianceStats.completedItemsCount} / 4
                </p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                  weeklyComplianceStats.isAllCompliant 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {weeklyComplianceStats.isAllCompliant ? 'ครบ 8/8 ครั้ง' : `ขาดอีก ${weeklyComplianceStats.totalMissingSubmissions} ครั้ง`}
                </span>
              </div>

              <span className={`text-[11px] block mt-0.5 truncate ${
                weeklyComplianceStats.isAllCompliant ? 'text-emerald-700/90' : 'text-amber-700/90'
              }`}>
                {formatThaiShortDate(activeWeek.monday)} - {formatThaiShortDate(activeWeek.sunday)} (คลิกดูรายละเอียด)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={language === 'th' ? 'ค้นหาชื่อผู้สุ่มตรวจ, อาคาร A/B, วันที่, หรือคำว่า "ส่งผล"...' : 'Search inspector, building, date...'}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: language === 'th' ? 'ทั้งหมด' : 'All', count: totalCount },
            { id: 'อาคาร A', label: 'อาคาร A', count: buildingACount },
            { id: 'อาคาร B', label: 'อาคาร B', count: buildingBCount },
          ].map((pill) => {
            const isSelected = buildingFilter === pill.id && complianceTypeFilter === 'all';
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => {
                  setBuildingFilter(pill.id as any);
                  setComplianceTypeFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#002045] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{pill.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-2xs font-mono font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {pill.count}
                </span>
              </button>
            );
          })}

          {(searchQuery || buildingFilter !== 'all' || complianceTypeFilter !== 'all' || activeFiltersCount > 0) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setBuildingFilter('all');
                setComplianceTypeFilter('all');
                setFilters({ building: 'all', inspector: 'all', startDate: '', endDate: '' });
                setCalendarSelectedDate(null);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
              title={language === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Clear all filters'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === 'th' ? 'ล้างค่า' : 'Clear'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      {isLoading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs">
          <FlaskConical className="w-10 h-10 text-blue-500 animate-bounce mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">
            {language === 'th' ? 'กำลังโหลดข้อมูลการสุ่มตรวจคลอรีนจาก Google Sheets...' : 'Loading chlorine inspection data...'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'th' ? 'กรุณารอสักครู่' : 'Please wait a moment'}
          </p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs">
          <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">
            {language === 'th' ? 'ไม่พบข้อมูลการสุ่มตรวจคลอรีนตามเงื่อนไข' : 'No inspection records found'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'th' ? 'ลองปรับคำค้นหาหรือล้างตัวกรองเพื่อดูข้อมูลทั้งหมด' : 'Try adjusting search or reset filters'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setBuildingFilter('all');
              setComplianceTypeFilter('all');
              setFilters({ building: 'all', inspector: 'all', startDate: '', endDate: '' });
              setCalendarSelectedDate(null);
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-[#002045] text-white text-xs font-bold hover:bg-[#003366] transition-colors cursor-pointer"
          >
            {language === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Clear All Filters'}
          </button>
        </div>
      ) : (
        <>
          {/* VIEW 1: TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-2xs uppercase tracking-wider text-slate-500 font-bold">
                      <th className="py-3.5 px-4">{language === 'th' ? 'วันที่ตรวจ' : 'Inspection Date'}</th>
                      <th className="py-3.5 px-4">{language === 'th' ? 'ผู้ผสมสาร - ผู้สุ่มตรวจ' : 'Inspector'}</th>
                      <th className="py-3.5 px-4">{language === 'th' ? 'พื้นที่ / อาคาร' : 'Area / Building'}</th>
                      <th className="py-3.5 px-4 text-center">{language === 'th' ? 'ภาพถ่ายหลักฐาน' : 'Evidence Photo'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {paginatedRecords.map((rec) => {
                      const isBuildingA = rec.building.includes('A');
                      return (
                        <tr 
                          key={rec.id}
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          onClick={() => handleOpenDetail(rec)}
                        >
                          {/* Inspection Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900">
                              <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                              <span>{rec.inspectionDate}</span>
                            </div>
                          </td>

                          {/* Inspector: Only name, no icon */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-800">
                            {rec.inspectorName}
                          </td>

                          {/* Area / Building */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-2xs font-bold border ${
                              isBuildingA 
                                ? 'bg-amber-50 text-amber-900 border-amber-200' 
                                : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                            }`}>
                              <Building2 className="w-3 h-3" />
                              <span>{rec.rawArea}</span>
                            </span>
                          </td>

                          {/* Photo Thumbnail */}
                          <td className="py-3.5 px-4 text-center">
                            {rec.photoUrl ? (
                              <div className="inline-block relative rounded-lg overflow-hidden border border-slate-200 w-12 h-12 bg-slate-100 group/thumb">
                                <img
                                  src={rec.photoUrl}
                                  alt={`#${rec.seq}`}
                                  className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-2xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: GRID / CARD VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedRecords.map((rec) => {
                const isBuildingA = rec.building.includes('A');
                return (
                  <div
                    key={rec.id}
                    onClick={() => handleOpenDetail(rec)}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer group"
                  >
                    {/* Image Header Box */}
                    <div className="relative h-48 bg-slate-100 border-b border-slate-200 overflow-hidden">
                      {rec.photoUrl ? (
                        <img
                          src={rec.photoUrl}
                          alt={rec.rawArea || 'Chlorine Inspection'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                          <ImageIcon className="w-10 h-10 mb-1 opacity-50" />
                          <span className="text-2xs">{language === 'th' ? 'ไม่มีรูปภาพ' : 'No photo'}</span>
                        </div>
                      )}

                      {/* Badges Over Image */}
                      <div className="absolute top-3 right-3 flex items-center justify-end pointer-events-none">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-xs ${
                          isBuildingA 
                            ? 'bg-amber-500/90 text-white' 
                            : 'bg-indigo-600/90 text-white'
                        }`}>
                          {rec.building}
                        </span>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span className="font-semibold">{rec.rawArea}</span>
                          <span className="font-mono text-2xs">{rec.inspectionDate}</span>
                        </div>

                        <h4 className="text-base font-black text-slate-900 mb-2">
                          {rec.rawArea || (language === 'th' ? 'สุ่มตรวจคลอรีน' : 'Chlorine Inspection')}
                        </h4>

                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <User className="w-4 h-4 text-blue-600" />
                          <span>{rec.inspectorName}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400">{rec.inspectionDate}</span>
                        <span className="text-blue-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>{language === 'th' ? 'ดูรายละเอียด' : 'Details'}</span>
                          <Eye className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 3: KANBAN BOARD BY BUILDING */}
          {viewMode === 'board' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Column 1: Building A */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2 font-black text-amber-950">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <Building2 className="w-4 h-4 text-amber-600" />
                    <span>{language === 'th' ? 'อาคาร A' : 'Building A'}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono font-bold text-xs">
                    {filteredRecords.filter(r => r.building.includes('A')).length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {filteredRecords
                    .filter(r => r.building.includes('A'))
                    .map(rec => (
                      <div
                        key={rec.id}
                        onClick={() => handleOpenDetail(rec)}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">{rec.inspectionDate}</span>
                          {rec.photoUrl && <span className="text-emerald-600 font-bold text-2xs">มีรูปภาพ</span>}
                        </div>
                        <p className="font-bold text-slate-900 text-xs">{rec.rawArea}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-2xs">
                          <span className="font-bold text-slate-600">{rec.inspectorName}</span>
                          <span className="text-blue-600 font-bold">ดูรายละเอียด</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Column 2: Building B */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2 font-black text-indigo-950">
                    <div className="w-3 h-3 rounded-full bg-indigo-600" />
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>{language === 'th' ? 'อาคาร B' : 'Building B'}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-mono font-bold text-xs">
                    {filteredRecords.filter(r => r.building.includes('B')).length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {filteredRecords
                    .filter(r => r.building.includes('B'))
                    .map(rec => (
                      <div
                        key={rec.id}
                        onClick={() => handleOpenDetail(rec)}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">{rec.inspectionDate}</span>
                          {rec.photoUrl && <span className="text-emerald-600 font-bold text-2xs">มีรูปภาพ</span>}
                        </div>
                        <p className="font-bold text-slate-900 text-xs">{rec.rawArea}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-2xs">
                          <span className="font-bold text-slate-600">{rec.inspectorName}</span>
                          <span className="text-blue-600 font-bold">ดูรายละเอียด</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: CALENDAR VIEW */}
          {viewMode === 'calendar' && (() => {
            const calYear = calendarMonth.getFullYear();
            const calMonth = calendarMonth.getMonth();
            const firstDayIndex = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun
            const totalDaysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();

            // Selected day's records
            const selectedDayRecords = calendarSelectedDate ? records.filter(r => {
              const d = parseDateFromRecord(r);
              if (!d) return false;
              const dateStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
              return dateStr === calendarSelectedDate;
            }) : [];

            return (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        {calendarMonth.toLocaleString('th-TH', { month: 'long', year: 'numeric' })}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {language === 'th' ? 'คลิกวันที่เพื่อดูรายการตรวจในวันนั้น' : 'Click a date to view logs'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const prev = new Date(calendarMonth);
                        prev.setMonth(prev.getMonth() - 1);
                        setCalendarMonth(prev);
                        setCalendarSelectedDate(null);
                      }}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                      title="เดือนก่อนหน้า"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Date(calendarMonth);
                        next.setMonth(next.getMonth() + 1);
                        setCalendarMonth(next);
                        setCalendarSelectedDate(null);
                      }}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                      title="เดือนถัดไป"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Day Grid */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs">
                  {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map((day) => (
                    <div key={day} className="font-bold text-slate-400 py-1 sm:py-2 text-2xs sm:text-xs">
                      {day}
                    </div>
                  ))}

                  {/* Empty cells before month start */}
                  {Array.from({ length: firstDayIndex }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="min-h-16 sm:min-h-20 p-1.5 sm:p-2 rounded-2xl bg-slate-50/40 border border-transparent opacity-30" />
                  ))}

                  {/* Days of month */}
                  {Array.from({ length: totalDaysInCurrentMonth }, (_, i) => i + 1).map((dayNum) => {
                    const dateStr = `${dayNum}/${calMonth + 1}/${calYear}`;
                    const dayRecords = records.filter(r => {
                      const d = parseDateFromRecord(r);
                      if (!d) return false;
                      return d.getDate() === dayNum && d.getMonth() === calMonth && d.getFullYear() === calYear;
                    });
                    const isSelected = calendarSelectedDate === dateStr;

                    return (
                      <div
                        key={dayNum}
                        onClick={() => {
                          setCalendarSelectedDate(dateStr);
                          if (dayRecords.length > 0) {
                            setIsCalendarDayModalOpen(true);
                          }
                        }}
                        className={`min-h-16 sm:min-h-20 p-1.5 sm:p-2 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400'
                            : dayRecords.length > 0
                              ? 'bg-slate-50/90 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                              : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <span className={`text-2xs sm:text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                          {dayNum}
                        </span>

                        {/* แสดงเฉพาะจำนวนตัวเลขที่มีรายการในวันเท่านั้น */}
                        {dayRecords.length > 0 ? (
                          <div className="flex justify-end">
                            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-blue-600 text-white font-mono font-black text-2xs sm:text-xs shadow-2xs">
                              {dayRecords.length}
                            </span>
                          </div>
                        ) : (
                          <div className="h-5" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Selected Date Details for Desktop View (Inline) */}
                {calendarSelectedDate && selectedDayRecords.length > 0 && (
                  <div className="hidden lg:block pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>รายการตรวจประจำวันที่ {calendarSelectedDate}</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-mono font-bold">
                          {selectedDayRecords.length} รายการ
                        </span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setCalendarSelectedDate(null)}
                        className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        ปิด
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedDayRecords.map(rec => (
                        <div
                          key={rec.id}
                          onClick={() => handleOpenDetail(rec)}
                          className="bg-slate-50 hover:bg-white p-3.5 rounded-2xl border border-slate-200 transition-all cursor-pointer space-y-2 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded-md text-2xs font-bold ${
                              rec.building.includes('A') ? 'bg-amber-100 text-amber-900' : 'bg-indigo-100 text-indigo-900'
                            }`}>
                              {rec.building}
                            </span>
                            <span className="text-2xs text-slate-400 font-mono">{rec.inspectionDate}</span>
                          </div>
                          <p className="font-bold text-slate-900 text-xs line-clamp-1">{rec.rawArea}</p>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-2xs">
                            <span className="text-slate-600 font-semibold">{rec.inspectorName}</span>
                            <span className="text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform">ดูข้อมูล</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Pagination Controls */}
          {totalPages > 1 && viewMode !== 'calendar' && viewMode !== 'board' && (
            <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-2xs text-xs font-bold text-slate-600">
              <span>
                {language === 'th'
                  ? `แสดง ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, filteredRecords.length)} จากทั้งหมด ${filteredRecords.length} รายการ`
                  : `Showing ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, filteredRecords.length)} of ${filteredRecords.length}`}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 rounded-xl bg-slate-100 font-mono">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Calendar Day Records Modal for Mobile & Tablet */}
      {isCalendarDayModalOpen && calendarSelectedDate && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsCalendarDayModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {language === 'th' ? `รายการตรวจวันที่ ${calendarSelectedDate}` : `Inspections for ${calendarSelectedDate}`}
                  </h3>
                  <span className="text-2xs text-slate-500 font-semibold">
                    {records.filter(r => {
                      const d = parseDateFromRecord(r);
                      if (!d) return false;
                      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` === calendarSelectedDate;
                    }).length} {language === 'th' ? 'รายการที่พบ' : 'records found'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCalendarDayModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: List of Records */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {(() => {
                const dayRecs = records.filter(r => {
                  const d = parseDateFromRecord(r);
                  if (!d) return false;
                  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` === calendarSelectedDate;
                });

                if (dayRecs.length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-400">
                      <p className="text-sm font-medium">{language === 'th' ? 'ไม่มีรายการสุ่มตรวจในวันนี้' : 'No records on this day'}</p>
                    </div>
                  );
                }

                return dayRecs.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => {
                      handleOpenDetail(rec);
                    }}
                    className="bg-slate-50 hover:bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-2xs font-bold ${
                        rec.building.includes('A') 
                          ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                          : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                      }`}>
                        {rec.building}
                      </span>
                      <span className="text-2xs text-slate-400 font-mono">{rec.inspectionDate}</span>
                    </div>

                    <div className="flex items-start gap-3">
                      {rec.photoUrl && (
                        <img 
                          src={rec.photoUrl} 
                          alt="Thumbnail" 
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" 
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2">
                          {rec.rawArea || (language === 'th' ? 'สุ่มตรวจคลอรีน' : 'Chlorine Inspection')}
                        </p>
                        <p className="text-2xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                          <User className="w-3 h-3 text-blue-600" />
                          <span>{rec.inspectorName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-2xs text-blue-600 font-bold">
                      <span>{language === 'th' ? 'คลิกเพื่อดูรูปและข้อมูลเต็ม' : 'Click for full details'}</span>
                      <Eye className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setIsCalendarDayModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Compliance Detail Modal */}
      {isWeeklyModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsWeeklyModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {language === 'th' ? 'เกณฑ์การส่งข้อมูลประจำสัปดาห์ (วันจันทร์ - อาทิตย์)' : 'Weekly Submission Compliance (Mon - Sun)'}
                  </h3>
                  <p className="text-2xs text-slate-500 font-medium mt-0.5">
                    {language === 'th' 
                      ? 'เกณฑ์: ต้องส่งข้อมูลครบ 4 รายการ (ส่งผล A, ส่งผล B, สุ่มตรวจ A, สุ่มตรวจ B) สัปดาห์ละ 2 ครั้ง (รวม 8 ครั้ง)'
                      : 'Target: 2 submissions/week for each of the 4 items (Total 8 submissions)'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsWeeklyModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* Week Selector Bar */}
              <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-2xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={handlePrevWeek}
                  disabled={availableWeeks.findIndex(w => w.key === activeWeek.key) >= availableWeeks.length - 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{language === 'th' ? 'สัปดาห์ก่อน' : 'Prev'}</span>
                </button>

                <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                  <CalendarIcon className="w-4 h-4 text-blue-600" />
                  <span>
                    {formatThaiShortDate(activeWeek.monday)} - {formatThaiShortDate(activeWeek.sunday)}
                  </span>
                  {isCurrentWeek && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-3xs font-bold">
                      {language === 'th' ? 'สัปดาห์ปัจจุบัน' : 'Current'}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNextWeek}
                  disabled={availableWeeks.findIndex(w => w.key === activeWeek.key) <= 0}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>{language === 'th' ? 'สัปดาห์ถัดไป' : 'Next'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Status Banner */}
              {!weeklyComplianceStats.isAllCompliant ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 shadow-xs">
                      <AlertTriangle className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-amber-950">
                        {language === 'th' 
                          ? `⚠️ สัปดาห์นี้ยังส่งไม่ครบตามเกณฑ์ (ขาดอีก ${weeklyComplianceStats.totalMissingSubmissions} ครั้ง)`
                          : `⚠️ Missing submissions (${weeklyComplianceStats.totalMissingSubmissions} left)`}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-2xs font-bold text-amber-800">
                          {language === 'th' ? 'ยังขาด:' : 'Missing:'}
                        </span>
                        {weeklyComplianceStats.missingItems.map(item => (
                          <span 
                            key={item.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-950 text-2xs font-bold border border-amber-300"
                          >
                            <span>{item.title}</span>
                            <span className="text-amber-800 font-mono">({item.count}/{item.target})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-xl bg-amber-500 text-white text-xs font-black shrink-0 self-end sm:self-auto">
                    {weeklyComplianceStats.completedItemsCount} / 4 {language === 'th' ? 'รายการครบ' : 'Done'}
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 shadow-xs">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-emerald-950">
                        {language === 'th' 
                          ? '✅ ส่งข้อมูลครบถ้วนตามเกณฑ์สัปดาห์นี้แล้ว (ครบทั้ง 4 รายการ)'
                          : '✅ All weekly quota requirements completed!'}
                      </h4>
                      <p className="text-xs text-emerald-800 font-medium mt-0.5">
                        {language === 'th'
                          ? `บันทึกข้อมูลแล้วทั้งหมด ${weeklyComplianceStats.totalSubmitted} ครั้งในสัปดาห์นี้`
                          : `Total ${weeklyComplianceStats.totalSubmitted} submissions in this week`}
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-black shrink-0 self-end sm:self-auto">
                    4 / 4 {language === 'th' ? 'ครบ 100%' : '100%'}
                  </span>
                </div>
              )}

              {/* 4 Compliance Item Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {weeklyComplianceStats.items.map((item) => {
                  const isA = item.buildingName.includes('A');
                  const isFilterActive = complianceTypeFilter === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setComplianceTypeFilter(isFilterActive ? 'all' : item.id);
                        setCurrentPage(1);
                        setIsWeeklyModalOpen(false);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs group ${
                        isFilterActive
                          ? isA
                            ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400'
                            : 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-400'
                          : item.isComplete
                            ? 'bg-white border-emerald-200/90 hover:border-emerald-300'
                            : item.count === 1
                              ? 'bg-white border-amber-200/90 hover:border-amber-300'
                              : 'bg-white border-rose-200/90 hover:border-rose-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-md text-2xs font-bold ${
                          isA ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {item.buildingName} • {item.categoryName}
                        </span>

                        {item.isComplete ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>{language === 'th' ? 'ครบแล้ว' : 'Done'}</span>
                          </span>
                        ) : item.count === 1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>{language === 'th' ? 'ขาดอีก 1' : '1 Left'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-rose-100 text-rose-800">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>{language === 'th' ? 'ยังไม่ส่ง' : '0/2'}</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-black text-slate-900 mb-2">
                        {item.title}
                      </h4>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-500">{language === 'th' ? 'ความคืบหน้า' : 'Progress'}</span>
                          <span className={`font-mono text-sm ${
                            item.isComplete ? 'text-emerald-600 font-black' : item.count === 1 ? 'text-amber-600 font-black' : 'text-rose-600 font-black'
                          }`}>
                            {item.count} / {item.target} ครั้ง
                          </span>
                        </div>

                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.isComplete 
                                ? 'bg-emerald-500' 
                                : item.count === 1 
                                  ? 'bg-amber-500' 
                                  : 'bg-rose-400'
                            }`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-blue-600 font-bold">
                        <span>{language === 'th' ? 'คลิกเพื่อกรองรายการนี้ในตาราง' : 'Click to filter records'}</span>
                        <Eye className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-2xs text-slate-500 font-medium px-2">
                {language === 'th' ? `ข้อมูลในสัปดาห์นี้ทั้งหมด ${weeklyComplianceStats.totalSubmitted} ครั้ง` : `Total ${weeklyComplianceStats.totalSubmitted} submissions`}
              </span>
              <button
                type="button"
                onClick={() => setIsWeeklyModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedRecord && (
        <ChlorineDetailModal
          isOpen={isDetailModalOpen}
          record={selectedRecord}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedRecord(null);
          }}
        />
      )}

      <ChlorineAnalyticsModal
        isOpen={isAnalyticsModalOpen}
        records={records}
        onClose={() => setIsAnalyticsModalOpen(false)}
      />

      <ChlorineFilterModal
        isOpen={isFilterModalOpen}
        filters={filters}
        inspectorsList={inspectorsList}
        onClose={() => setIsFilterModalOpen(false)}
        onApplyFilters={(newFilters) => {
          setFilters(newFilters);
          setCurrentPage(1);
        }}
        onResetFilters={() => {
          setFilters({
            building: 'all',
            inspector: 'all',
            startDate: '',
            endDate: '',
          });
          setCurrentPage(1);
        }}
      />

      {/* Chlorine Inspection Google Form QR Code Modal */}
      {showQrModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowQrModal(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-blue-100 w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {language === 'th' ? 'QR Code แบบฟอร์มสุ่มตรวจคลอรีน' : 'Chlorine Inspection Form QR Code'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'th' ? 'สแกนเพื่อบันทึกผลการตรวจผ่าน Google Form' : 'Scan to submit results via Google Form'}
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
              <div className="p-4 bg-gradient-to-b from-blue-50 to-white rounded-2xl border-2 border-blue-200/80 shadow-md">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(CHLORINE_FORM_URL)}&margin=8`}
                  alt="Chlorine Inspection QR Code"
                  className="w-52 h-52 sm:w-60 sm:h-60 rounded-xl bg-white shadow-inner"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="mt-4 px-3 py-1.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200/80 text-[11px] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>{language === 'th' ? 'สแกนด้วยกล้องมือถือเพื่อเปิดแบบฟอร์มทันที' : 'Scan with mobile camera to open form instantly'}</span>
              </div>

              {/* URL Box */}
              <div className="mt-3.5 w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 text-left">
                <span className="text-xs font-mono text-slate-600 truncate flex-1 select-all">
                  {CHLORINE_FORM_URL}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(CHLORINE_FORM_URL);
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
                href={CHLORINE_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-700/20 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{language === 'th' ? 'เปิดแบบฟอร์ม' : 'Open Form'}</span>
              </a>

              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(CHLORINE_FORM_URL)}&margin=10`}
                download="chlorine-inspection-qr-code.png"
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

