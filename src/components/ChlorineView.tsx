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
  Info
} from 'lucide-react';
import { ChlorineInspectionRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  CHLORINE_SHEET_URL, 
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
  const [viewMode, setViewMode] = useState<ViewMode>('table');
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
            <div className="flex flex-wrap items-center gap-2">
              {/* Analytics Button (Icon only) */}
              <button
                type="button"
                onClick={() => setIsAnalyticsModalOpen(true)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/90 hover:bg-white text-blue-700 border border-blue-200/90 shadow-2xs hover:shadow-xs flex items-center justify-center transition-all cursor-pointer"
                title={language === 'th' ? 'สถิติการตรวจและกราฟ' : 'Analytics & Charts'}
              >
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </button>

              {/* Google Sheets Link Button (Icon only) */}
              <a
                href={CHLORINE_SHEET_URL}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/90 hover:bg-white text-emerald-800 border border-emerald-200/90 shadow-2xs hover:shadow-xs flex items-center justify-center transition-all"
                title={language === 'th' ? 'เปิด Google Sheets ต้นฉบับ' : 'Open Google Sheets'}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              </a>

              {/* Filter Button (Icon only with Badge) */}
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(true)}
                className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl border shadow-2xs hover:shadow-xs flex items-center justify-center transition-all cursor-pointer ${
                  activeFiltersCount > 0
                    ? 'bg-[#002045] text-white border-[#002045]'
                    : 'bg-white/90 hover:bg-white text-slate-700 border-slate-200/90'
                }`}
                title={language === 'th' ? 'ตัวกรองข้อมูล' : 'Filters'}
              >
                <Filter className={`w-4 h-4 ${activeFiltersCount > 0 ? 'text-amber-400' : 'text-slate-600'}`} />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-amber-950 font-black text-2xs flex items-center justify-center shadow-xs">
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
              </div>
            </div>
          </div>

          {/* Bottom Row inside Header: 2 Stat Boxes (1. รายการตรวจทั้งหมด, 2. สุ่มตรวจอาคาร A & B รวมในกล่องเดียว) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Box 1: รายการตรวจทั้งหมด */}
            <div 
              onClick={() => {
                setBuildingFilter('all');
                setComplianceTypeFilter('all');
                setCurrentPage(1);
              }}
              className="bg-white/90 hover:bg-white backdrop-blur-xs border border-blue-200/90 rounded-2xl p-3.5 sm:px-4 sm:py-3 shadow-2xs transition-all flex items-center justify-between cursor-pointer group"
            >
              <div>
                <span className="text-2xs sm:text-xs font-bold text-slate-500 block">
                  {language === 'th' ? 'รายการตรวจทั้งหมด' : 'Total Records'}
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {totalCount}
                </span>
                <span className="text-2xs text-slate-400 block mt-0.5">
                  {language === 'th' ? 'บันทึกในระบบทั้งหมด' : 'All logged records'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FlaskConical className="w-5 h-5" />
              </div>
            </div>

            {/* Box 2: สุ่มตรวจอาคาร A และ อาคาร B รวมในกล่องเดียวกัน */}
            <div 
              className="bg-white/90 hover:bg-white backdrop-blur-xs border border-slate-200/90 hover:border-slate-300 rounded-2xl p-3.5 sm:px-4 sm:py-3 shadow-2xs transition-all flex items-center justify-between group"
            >
              <div className="space-y-1.5 flex-1 pr-2">
                <span className="text-2xs sm:text-xs font-bold text-slate-600 block">
                  {language === 'th' ? 'สุ่มตรวจอาคาร A และ อาคาร B' : 'Inspections (Building A & B)'}
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBuildingFilter(buildingFilter === 'อาคาร A' ? 'all' : 'อาคาร A');
                      setComplianceTypeFilter('all');
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer flex items-center gap-1.5 ${
                      buildingFilter === 'อาคาร A'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                    }`}
                    title={language === 'th' ? 'คลิกเพื่อกรองอาคาร A' : 'Filter Building A'}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>อาคาร A: {buildingACount}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBuildingFilter(buildingFilter === 'อาคาร B' ? 'all' : 'อาคาร B');
                      setComplianceTypeFilter('all');
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer flex items-center gap-1.5 ${
                      buildingFilter === 'อาคาร B'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                        : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                    }`}
                    title={language === 'th' ? 'คลิกเพื่อกรองอาคาร B' : 'Filter Building B'}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    <span>อาคาร B: {buildingBCount}</span>
                  </button>
                </div>

                <span className="text-2xs text-slate-400 block">
                  {buildingFilter !== 'all' 
                    ? (language === 'th' ? `กำลังกรองเฉพาะ${buildingFilter}` : `Filtered by ${buildingFilter}`)
                    : (language === 'th' ? `รวมทั้งสองอาคาร ${buildingACount + buildingBCount} รายการ` : `Total ${buildingACount + buildingBCount} records`)}
                </span>
              </div>

              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
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
    </div>
  );
};

