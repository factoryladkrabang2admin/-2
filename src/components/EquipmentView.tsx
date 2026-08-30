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
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  Download,
  RotateCw,
  Tag,
  Key,
  Shirt,
  Sparkle,
  Package,
  Check,
  QrCode,
  Copy,
  ExternalLink
} from 'lucide-react';
import { EquipmentRecord, EquipmentSubCategory, EquipmentItemDetail } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  fetchEquipmentRecordsBySubCategory,
  CLEANING_EQUIPMENT_SHEET_URL,
  GOWN_EQUIPMENT_SHEET_URL,
  KEYS_EQUIPMENT_SHEET_URL,
  LADDER_EQUIPMENT_SHEET_URL,
  CLEANING_EQUIPMENT_FORM_URL,
  GOWN_EQUIPMENT_FORM_URL,
  KEYS_EQUIPMENT_FORM_URL,
  LADDER_EQUIPMENT_FORM_URL
} from '../services/googleSheetSyncService';
import { AdminUserAccount, isUserAdminOrSupervisor } from '../data/mockData';
import { EquipmentDetailModal } from './EquipmentDetailModal';
import { EquipmentAnalyticsModal } from './EquipmentAnalyticsModal';

const SUB_CATEGORY_STORAGE_PREFIX = 'proworkflow_equipment_cache_';
const TABLE_ITEMS_PER_PAGE = 20;
const CARD_ITEMS_PER_PAGE = 8;

interface EquipmentViewProps {
  currentUser?: AdminUserAccount;
  isAuthenticated?: boolean;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({
  currentUser,
  isAuthenticated = true,
}) => {
  const { language } = useLanguage();

  // Active Sub-category Tab
  const [activeSubCategory, setActiveSubCategory] = useState<EquipmentSubCategory>('cleaning');

  // View mode: 'table' | 'grid' | 'board' (Default to 'grid' on mobile and tablet < 1024px, 'table' on desktop)
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'board'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return 'grid';
    }
    return 'table';
  });

  // Equipment records state
  const [records, setRecords] = useState<EquipmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Selected Record for Detail Modal
  const [selectedRecord, setSelectedRecord] = useState<EquipmentRecord | null>(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<boolean>(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Google Sheet Link lookup
  const currentSheetUrl = useMemo(() => {
    switch (activeSubCategory) {
      case 'cleaning':
        return CLEANING_EQUIPMENT_SHEET_URL;
      case 'gown':
        return GOWN_EQUIPMENT_SHEET_URL;
      case 'keys':
        return KEYS_EQUIPMENT_SHEET_URL;
      case 'ladder':
        return LADDER_EQUIPMENT_SHEET_URL;
      default:
        return CLEANING_EQUIPMENT_SHEET_URL;
    }
  }, [activeSubCategory]);

  // Google Form Link lookup for QR Code
  const currentFormUrl = useMemo(() => {
    switch (activeSubCategory) {
      case 'cleaning':
        return CLEANING_EQUIPMENT_FORM_URL;
      case 'gown':
        return GOWN_EQUIPMENT_FORM_URL;
      case 'keys':
        return KEYS_EQUIPMENT_FORM_URL;
      case 'ladder':
        return LADDER_EQUIPMENT_FORM_URL;
      default:
        return CLEANING_EQUIPMENT_FORM_URL;
    }
  }, [activeSubCategory]);

  const currentSubCategoryName = useMemo(() => {
    switch (activeSubCategory) {
      case 'cleaning':
        return language === 'th' ? 'อุปกรณ์ทำความสะอาด' : 'Cleaning Supplies';
      case 'gown':
        return language === 'th' ? 'เสื้อกาวน์' : 'Gowns';
      case 'keys':
        return language === 'th' ? 'กุญแจ' : 'Keys';
      case 'ladder':
        return language === 'th' ? 'บันไดทรง A' : 'A-Frame Ladder';
      default:
        return '';
    }
  }, [activeSubCategory, language]);

  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrCopied, setQrCopied] = useState<boolean>(false);

  const canAccessGoogleSheet = isUserAdminOrSupervisor(currentUser);

  // Load Data for active subcategory
  const loadData = async (sub: EquipmentSubCategory, force = false) => {
    setIsLoading(true);
    // 1. Try local storage cache first
    if (!force) {
      try {
        const cached = localStorage.getItem(`${SUB_CATEGORY_STORAGE_PREFIX}${sub}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecords(parsed);
            setIsLoading(false);
          }
        }
      } catch {
        // ignore
      }
    }

    try {
      const res = await fetchEquipmentRecordsBySubCategory(sub);
      if (res.success && res.records) {
        setRecords(res.records);
        setLastSyncedAt(res.lastSyncedAt);
        try {
          localStorage.setItem(`${SUB_CATEGORY_STORAGE_PREFIX}${sub}`, JSON.stringify(res.records));
        } catch {
          // ignore
        }
      }
    } catch {
      // error handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadData(activeSubCategory);
  }, [activeSubCategory]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.department) set.add(r.department);
    });
    return Array.from(set).sort();
  }, [records]);

  // Unique years for filter
  const years = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.date) {
        const match = r.date.match(/\d{4}/);
        if (match) set.add(match[0]);
      }
    });
    return Array.from(set).sort().reverse();
  }, [records]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchText = (
          (r.requesterName || '') +
          ' ' +
          (r.itemSummary || '') +
          ' ' +
          (r.department || '') +
          ' ' +
          (r.keyNumbers || '') +
          ' ' +
          (r.ladderType || '') +
          ' ' +
          (r.shortCode || '') +
          ' ' +
          (r.fullCode || '') +
          ' ' +
          (r.note || '')
        ).toLowerCase();
        if (!matchText.includes(q)) return false;
      }

      // 2. Action Type / Status
      if (selectedActionType !== 'all') {
        if (r.actionType !== selectedActionType && r.status !== selectedActionType) {
          return false;
        }
      }

      // 3. Department
      if (selectedDepartment !== 'all' && r.department !== selectedDepartment) {
        return false;
      }

      // 4. Year
      if (selectedYear !== 'all' && r.date && !r.date.includes(selectedYear)) {
        return false;
      }

      // 5. Date Range (if given)
      if (startDate || endDate) {
        // Simple string or date check
        if (startDate && r.date && r.date < startDate) return false;
        if (endDate && r.date && r.date > endDate) return false;
      }

      return true;
    });
  }, [records, searchQuery, selectedActionType, selectedDepartment, selectedYear, startDate, endDate]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedActionType !== 'all') count++;
    if (selectedDepartment !== 'all') count++;
    if (selectedYear !== 'all') count++;
    if (startDate) count++;
    if (endDate) count++;
    return count;
  }, [searchQuery, selectedActionType, selectedDepartment, selectedYear, startDate, endDate]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedActionType('all');
    setSelectedDepartment('all');
    setSelectedYear('all');
    setStartDate('');
    setEndDate('');
    setShowFilterModal(false);
  };

  // KPIs
  const totalCount = records.length;
  const filteredCount = filteredRecords.length;
  const totalItemsCount = useMemo(() => {
    return filteredRecords.reduce((acc, r) => acc + (r.totalQuantity || 1), 0);
  }, [filteredRecords]);

  const returnCount = useMemo(() => {
    return records.filter((r) => r.actionType === 'คืน' || r.status.includes('คืน')).length;
  }, [records]);

  const requisitionCount = useMemo(() => {
    return records.filter((r) => r.actionType !== 'คืน' && !r.status.includes('คืน')).length;
  }, [records]);

  // Pagination logic
  const itemsPerPage = viewMode === 'grid' ? CARD_ITEMS_PER_PAGE : TABLE_ITEMS_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  // Sub-category tabs definition
  const subCategoryTabs: { id: EquipmentSubCategory; label: string; icon: React.ReactNode }[] = [
    { 
      id: 'cleaning', 
      label: language === 'th' ? 'อุปกรณ์ทำความสะอาด' : 'Cleaning Supplies',
      icon: <Sparkle className="w-4 h-4" />
    },
    { 
      id: 'gown', 
      label: language === 'th' ? 'เสื้อกาวน์' : 'Gowns',
      icon: <Shirt className="w-4 h-4" />
    },
    { 
      id: 'keys', 
      label: language === 'th' ? 'กุญแจ' : 'Keys',
      icon: <Key className="w-4 h-4" />
    },
    { 
      id: 'ladder', 
      label: language === 'th' ? 'บันไดทรง A' : 'A-Frame Ladder',
      icon: <Layers className="w-4 h-4" />
    },
  ];

  // Export CSV (นำคอลัมน์ แผนก, สถานะ ออก และแยกรายการอุปกรณ์และจำนวนเป็นแถวๆ เพื่อง่ายต่อการค้นหา)
  const handleExportCsv = () => {
    if (filteredRecords.length === 0) return;
    const header = ['ลำดับ', 'วันที่', 'ผู้เบิก/ยืม', 'การกระทำ', 'รายการอุปกรณ์', 'จำนวน', 'หมายเหตุ'];
    const csvRows = [header.join(',')];
    let rowSeq = 1;

    filteredRecords.forEach((r) => {
      // ตรวจสอบรายการย่อยใน itemsList เพื่อแยกเป็นแถวๆ
      const itemsToExport: EquipmentItemDetail[] = (r.itemsList && r.itemsList.length > 0)
        ? r.itemsList
        : [{ name: r.itemSummary || 'อุปกรณ์', quantity: r.totalQuantity || 1 }];

      itemsToExport.forEach((item) => {
        const noteText = (item.note || r.note || '').replace(/"/g, '""');
        const row = [
          rowSeq++,
          `"${r.date || ''}"`,
          `"${(r.requesterName || '').replace(/"/g, '""')}"`,
          `"${(r.actionType || '').replace(/"/g, '""')}"`,
          `"${(item.name || '').replace(/"/g, '""')}"`,
          item.quantity || 1,
          `"${noteText}"`
        ];
        csvRows.push(row.join(','));
      });
    });

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Equipment_${activeSubCategory}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner with Animated Medium Red-White Gradient and Floating Equipment/Cleaning/Key/Gown/Ladder Icons */}
      <div className="animated-equipment-red-header rounded-3xl p-6 sm:p-7 text-[#881337] shadow-xl border border-rose-200/80 relative overflow-hidden space-y-5">
        {/* Floating Ambient Glow Orbs */}
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-rose-300/40 rounded-full blur-3xl pointer-events-none animate-orb-1" />
        <div className="absolute -bottom-12 -right-12 w-72 h-72 bg-red-300/35 rounded-full blur-3xl pointer-events-none animate-orb-2" />

        {/* Animated Floating Equipment Icons in Background (Cleaning, Key, Gown, Ladder) */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none overflow-hidden select-none">
          {/* 1. Cleaning Supplies Sparkles */}
          <Sparkles className="w-36 h-36 sm:w-48 sm:h-48 animate-custom-float text-rose-700 opacity-20 absolute right-4 sm:right-12 top-1/2 -translate-y-1/2 stroke-[1.5]" />
          {/* 2. Key Icon */}
          <Key className="w-24 h-24 sm:w-28 sm:h-28 animate-tool-spin text-red-700 opacity-20 absolute right-24 sm:right-40 bottom-1 stroke-[1.5]" />
          {/* 3. Gown Shirt Icon */}
          <Shirt className="w-20 h-20 -rotate-12 animate-custom-float-rev text-rose-800 opacity-20 absolute right-40 sm:right-64 top-2 hidden md:block stroke-[1.5]" />
          {/* 4. A-Frame Ladder / Layers Icon */}
          <Layers className="w-16 h-16 rotate-12 animate-tool-float text-red-900 opacity-15 absolute right-20 top-4 hidden lg:block stroke-[1.5]" />
          {/* 5. Subtle Sparkle Accents */}
          <Sparkles className="w-6 h-6 text-amber-500 animate-pulse absolute left-12 top-6 opacity-60" />
          <Sparkles className="w-4 h-4 text-rose-400 animate-pulse absolute left-28 bottom-4 opacity-50" />
        </div>

        {/* Top Header Row */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-md border border-rose-200 shadow-md flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-rose-600 animate-pulse" />
              <Sparkles className="w-3.5 h-3.5 text-amber-500 absolute -top-1 -right-1" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#881337] drop-shadow-xs">
                {language === 'th' ? 'เบิกอุปกรณ์' : 'Equipment Requisition'}
              </h1>
            </div>
          </div>

          {/* Action Buttons Toolbar in Header */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
            {/* Statistics / Analytics Modal Button (Placed before Google Sheet) */}
            <button
              type="button"
              onClick={() => setShowAnalyticsModal(true)}
              className="p-2.5 rounded-xl bg-white/85 hover:bg-white text-rose-950 border border-rose-200/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs hover:border-rose-300"
              title={language === 'th' ? 'สถิติและการวิเคราะห์' : 'Analytics & Statistics'}
              aria-label={language === 'th' ? 'สถิติและการวิเคราะห์' : 'Analytics & Statistics'}
            >
              <BarChart3 className="w-5 h-5 text-rose-600 stroke-[2]" />
            </button>

            {/* Google Sheet Link - Restricted to Admin & Supervisor */}
            {canAccessGoogleSheet && (
              <a
                href={currentSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-white/85 hover:bg-white text-emerald-800 border border-rose-200/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
                title={language === 'th' ? 'เปิดดู Google Sheet' : 'Open Google Sheet'}
                aria-label="Google Sheet"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
              </a>
            )}

            {/* Export CSV - Restricted to Admin & Supervisor */}
            {canAccessGoogleSheet && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="p-2.5 rounded-xl bg-white/85 hover:bg-white text-rose-950 border border-rose-200/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs"
                title={language === 'th' ? 'ส่งออกไฟล์ CSV / Excel' : 'Export CSV'}
                aria-label="Export"
              >
                <Download className="w-5 h-5" />
              </button>
            )}

            {/* Filter Button */}
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={`p-2.5 rounded-xl border backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center relative shadow-xs hover:border-rose-300 ${
                activeFiltersCount > 0
                  ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-2 ring-rose-300'
                  : 'bg-white/85 hover:bg-white text-rose-950 border border-rose-200/80'
              }`}
              title={language === 'th' ? (activeFiltersCount > 0 ? `ตัวกรองการค้นหา (${activeFiltersCount})` : 'ตัวกรองการค้นหา') : (activeFiltersCount > 0 ? `Filters (${activeFiltersCount})` : 'Filters')}
              aria-label={language === 'th' ? 'ตัวกรองการค้นหา' : 'Filters'}
            >
              <Filter className={`w-5 h-5 stroke-[2] ${activeFiltersCount > 0 ? 'text-white' : 'text-rose-600'}`} />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white shadow-xs">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* View Switcher with integrated QR Code Button */}
            <div className="flex items-center bg-white/85 p-1 rounded-xl backdrop-blur-md border border-rose-200/80 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-rose-700 text-white font-bold shadow-xs'
                    : 'text-rose-900 hover:text-black hover:bg-rose-100/50'
                }`}
                title={language === 'th' ? 'มุมมองรายการ (Table)' : 'Table View'}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-rose-700 text-white font-bold shadow-xs'
                    : 'text-rose-900 hover:text-black hover:bg-rose-100/50'
                }`}
                title={language === 'th' ? 'มุมมองการ์ด (Cards)' : 'Cards View'}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'board'
                    ? 'bg-rose-700 text-white font-bold shadow-xs'
                    : 'text-rose-900 hover:text-black hover:bg-rose-100/50'
                }`}
                title={language === 'th' ? 'มุมมองกระดานขั้นตอน (Board)' : 'Board View'}
              >
                <Columns className="w-4 h-4" />
              </button>

              {/* เส้นคั่นและไอคอน QR Code อยู่ในกล่องเดียวกับมุมมอง */}
              <div className="w-[1px] h-4 bg-rose-200 mx-0.5" />
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="p-2 rounded-lg transition-all cursor-pointer text-rose-900 hover:text-rose-950 hover:bg-rose-100/70 active:scale-95 group relative"
                title={language === 'th' ? `QR Code แบบฟอร์ม (${currentSubCategoryName})` : `Form QR Code (${currentSubCategoryName})`}
                aria-label={language === 'th' ? `QR Code แบบฟอร์ม (${currentSubCategoryName})` : `Form QR Code (${currentSubCategoryName})`}
              >
                <QrCode className="w-4 h-4 text-rose-700 transition-transform group-hover:scale-110" />
              </button>
            </div>
          </div>
        </div>

        {/* Subcategory Switcher Tabs inside Header */}
        <div className="relative z-10 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
          {subCategoryTabs.map((tab) => {
            const isActive = activeSubCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubCategory(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer shadow-xs ${
                  isActive
                    ? 'bg-rose-700 text-white shadow-md ring-2 ring-rose-300 scale-[1.02]'
                    : 'bg-white/80 hover:bg-white text-rose-950 border border-rose-200/80 hover:scale-[1.01]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Integrated Metric KPI Cards Row */}
        <div className={`relative z-10 grid gap-3 sm:gap-4 pt-4 border-t border-rose-200/60 ${
          activeSubCategory === 'cleaning' ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'
        }`}>
          {/* Card 1: ทั้งหมด */}
          <div 
            onClick={() => setSelectedActionType('all')}
            className={`p-4 rounded-2xl backdrop-blur-md border transition-all cursor-pointer ${
              selectedActionType === 'all'
                ? 'bg-white/95 border-rose-400 shadow-md ring-2 ring-rose-300 scale-[1.02]'
                : 'bg-white/75 hover:bg-white/90 border-rose-200/80 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-rose-900 text-xs font-bold mb-1.5">
              <span>{language === 'th' ? 'รายการทั้งหมด' : 'Total Records'}</span>
              <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
                <Layers className="w-4 h-4 text-rose-800" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-[#881337]">{totalCount}</p>
            <span className="text-[11px] text-rose-800/80">{language === 'th' ? 'บันทึกสะสมทั้งหมด' : 'All recorded logs'}</span>
          </div>

          {/* Cards 2 & 3: เบิก / ยืม and คืนแล้ว (ซ่อนเฉพาะหัวข้อย่อย อุปกรณ์ทำความสะอาด) */}
          {activeSubCategory !== 'cleaning' && (
            <>
              {/* Card 2: รายการเบิก / ยืม */}
              <div 
                onClick={() => setSelectedActionType('เบิก')}
                className={`p-4 rounded-2xl backdrop-blur-md border transition-all cursor-pointer ${
                  selectedActionType === 'เบิก'
                    ? 'bg-amber-50/95 border-amber-400 shadow-md ring-2 ring-amber-300 scale-[1.02]'
                    : 'bg-white/75 hover:bg-white/90 border-rose-200/80 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between text-amber-900 text-xs font-bold mb-1.5">
                  <span>{language === 'th' ? 'เบิก / ยืม' : 'Requisitions'}</span>
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-amber-800">{requisitionCount}</p>
                <span className="text-[11px] text-amber-700/90">{language === 'th' ? 'เบิกใช้งาน' : 'Active issues'}</span>
              </div>

              {/* Card 3: คืนแล้ว */}
              <div 
                onClick={() => setSelectedActionType('คืน')}
                className={`p-4 rounded-2xl backdrop-blur-md border transition-all cursor-pointer ${
                  selectedActionType === 'คืน'
                    ? 'bg-emerald-50/95 border-emerald-400 shadow-md ring-2 ring-emerald-300 scale-[1.02]'
                    : 'bg-white/75 hover:bg-white/90 border-rose-200/80 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between text-emerald-900 text-xs font-bold mb-1.5">
                  <span>{language === 'th' ? 'คืนแล้ว' : 'Returned'}</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-emerald-800">{returnCount}</p>
                <span className="text-[11px] text-emerald-700/90">{language === 'th' ? 'ส่งคืนอุปกรณ์เรียบร้อย' : 'Returned items'}</span>
              </div>
            </>
          )}

          {/* Card 4: จำนวนชิ้นรวม */}
          <div className="p-4 rounded-2xl backdrop-blur-md border border-rose-200/80 bg-white/75 shadow-xs">
            <div className="flex items-center justify-between text-rose-900 text-xs font-bold mb-1.5">
              <span>{language === 'th' ? 'จำนวนชิ้น / รายการ' : 'Total Items / Pieces'}</span>
              <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-rose-600" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-800">{totalItemsCount}</p>
            <span className="text-[11px] text-rose-700/90">{language === 'th' ? 'ยอดอุปกรณ์รวม' : 'Total units requested'}</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-orange-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-900/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={
              language === 'th'
                ? 'ค้นหาชื่อผู้เบิก, รายการอุปกรณ์, รหัสพัสดุ, หมายเหตุ...'
                : 'Search requester, item, code, department...'
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-all text-slate-800 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Type Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => {
              setSelectedActionType('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedActionType === 'all'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {language === 'th' ? 'ทั้งหมด' : 'All'} ({filteredRecords.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedActionType('เบิก');
              setCurrentPage(1);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedActionType === 'เบิก'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {language === 'th' ? 'เบิก' : 'Requisition'}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedActionType('คืน');
              setCurrentPage(1);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedActionType === 'คืน'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {language === 'th' ? 'คืน' : 'Return'}
          </button>
        </div>
      </div>

      {/* 4. Active Filters Tag Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap bg-amber-50/60 p-3 rounded-2xl border border-amber-200/80 text-xs">
          <span className="font-bold text-amber-900">{language === 'th' ? 'ตัวกรองที่เลือก:' : 'Active Filters:'}</span>
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-950 font-medium shadow-2xs">
              ค้นหา: "{searchQuery}"
              <X className="w-3 h-3 cursor-pointer text-amber-700 hover:text-red-600" onClick={() => setSearchQuery('')} />
            </span>
          )}
          {selectedActionType !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-950 font-medium shadow-2xs">
              การกระทำ: {selectedActionType}
              <X className="w-3 h-3 cursor-pointer text-amber-700 hover:text-red-600" onClick={() => setSelectedActionType('all')} />
            </span>
          )}
          {selectedDepartment !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-950 font-medium shadow-2xs">
              แผนก: {selectedDepartment}
              <X className="w-3 h-3 cursor-pointer text-amber-700 hover:text-red-600" onClick={() => setSelectedDepartment('all')} />
            </span>
          )}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-bold text-orange-700 hover:text-orange-900 underline ml-auto cursor-pointer"
          >
            {language === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Clear all'}
          </button>
        </div>
      )}

      {/* 5. Main Content View Area */}
      {isLoading && records.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-orange-200/80 shadow-xs space-y-3">
          <RotateCw className="w-8 h-8 text-orange-600 animate-spin mx-auto" />
          <p className="font-bold text-slate-700">{language === 'th' ? 'กำลังโหลดข้อมูลเบิกอุปกรณ์...' : 'Loading equipment records...'}</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-orange-200/80 shadow-xs space-y-3">
          <Package className="w-12 h-12 text-orange-400 mx-auto opacity-60" />
          <h3 className="text-base font-black text-slate-800">{language === 'th' ? 'ไม่พบรายการที่ค้นหา' : 'No records found'}</h3>
          <p className="text-xs text-slate-500">{language === 'th' ? 'ลองปรับคำค้นหาหรือเปลี่ยนตัวกรอง' : 'Try adjusting your filters or search keywords'}</p>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              {language === 'th' ? 'ล้างตัวกรอง' : 'Reset filters'}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* A. TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-3xl shadow-sm border border-orange-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead className="bg-gradient-to-r from-amber-50/80 via-orange-50/60 to-amber-50/80 text-orange-950 font-bold border-b border-orange-200/80">
                    <tr>
                      <th className="py-3.5 px-4">{language === 'th' ? 'วันที่' : 'Date'}</th>
                      <th className="py-3.5 px-4">{language === 'th' ? 'ผู้เบิก / ยืม' : 'Requester'}</th>
                      {activeSubCategory !== 'cleaning' && (
                        <th className="py-3.5 px-4">{language === 'th' ? 'แผนก' : 'Department'}</th>
                      )}
                      <th className="py-3.5 px-4">{language === 'th' ? 'รายการอุปกรณ์' : 'Equipment Items'}</th>
                      <th className="py-3.5 px-4 text-center">{language === 'th' ? 'จำนวน' : 'Qty'}</th>
                      <th className="py-3.5 px-4 text-center">{language === 'th' ? 'สถานะ' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {paginatedRecords.map((r, idx) => {
                      const isReturn = r.actionType === 'คืน' || r.status.includes('คืน');
                      return (
                        <tr 
                          key={r.id || idx}
                          onClick={() => setSelectedRecord(r)}
                          className="hover:bg-amber-50/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                            {r.date}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {r.requesterName}
                          </td>
                          {activeSubCategory !== 'cleaning' && (
                            <td className="py-3.5 px-4 text-slate-600">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs">
                                {r.department || '-'}
                              </span>
                            </td>
                          )}
                          <td className="py-3.5 px-4 max-w-xs truncate">
                            <span className="font-semibold text-slate-800 group-hover:text-orange-700 transition-colors">
                              {r.itemSummary}
                            </span>
                            {r.note && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                หมายเหตุ: {r.note}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-black text-orange-600">
                            {r.totalQuantity || 1}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              isReturn 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}>
                              {isReturn ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {r.actionType || r.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* B. GRID / CARD VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {paginatedRecords.map((r, idx) => {
                const isReturn = r.actionType === 'คืน' || r.status.includes('คืน');
                return (
                  <div
                    key={r.id || idx}
                    onClick={() => setSelectedRecord(r)}
                    className="bg-white rounded-2xl p-4 border border-orange-200/80 shadow-xs hover:shadow-md hover:border-orange-300 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold text-slate-500 font-mono">
                          {r.date}
                        </span>
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                          isReturn ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {r.actionType || r.status}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-800 text-sm group-hover:text-orange-700 transition-colors line-clamp-2">
                        {r.itemSummary}
                      </h3>

                      <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <User className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          <span className="truncate">{r.requesterName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Building2 className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          <span className="truncate">{r.department || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500">
                        {language === 'th' ? 'จำนวน:' : 'Qty:'} <strong className="text-orange-600 font-black">{r.totalQuantity || 1}</strong>
                      </span>
                      <button
                        type="button"
                        className="text-orange-700 font-bold text-xs hover:underline group-hover:text-orange-900"
                      >
                        {language === 'th' ? 'รายละเอียด →' : 'View →'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* C. BOARD / PIPELINE VIEW */}
          {viewMode === 'board' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Column 1: Requisitions (เบิก / ยืม) */}
              <div className="bg-amber-50/40 rounded-3xl p-4 border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <h3 className="font-black text-amber-950 text-sm">{language === 'th' ? 'รายการเบิก / ยืมใช้งาน' : 'Requisitions'}</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-950 font-black text-xs">
                    {filteredRecords.filter((r) => r.actionType !== 'คืน' && !r.status.includes('คืน')).length}
                  </span>
                </div>
                <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
                  {filteredRecords
                    .filter((r) => r.actionType !== 'คืน' && !r.status.includes('คืน'))
                    .map((r, idx) => (
                      <div
                        key={r.id || idx}
                        onClick={() => setSelectedRecord(r)}
                        className="bg-white rounded-2xl p-3.5 border border-amber-200 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-2"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-500">{r.date}</span>
                          <span className="font-bold text-orange-600">{r.totalQuantity || 1} ชิ้น</span>
                        </div>
                        <p className="font-bold text-slate-800 text-xs sm:text-sm line-clamp-2">{r.itemSummary}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                          <span className="font-medium">{r.requesterName}</span>
                          <span className="text-slate-400">{r.department}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Column 2: Returns (คืนแล้ว) */}
              <div className="bg-emerald-50/40 rounded-3xl p-4 border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-black text-emerald-950 text-sm">{language === 'th' ? 'คืนอุปกรณ์เรียบร้อย' : 'Returned'}</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-950 font-black text-xs">
                    {filteredRecords.filter((r) => r.actionType === 'คืน' || r.status.includes('คืน')).length}
                  </span>
                </div>
                <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
                  {filteredRecords
                    .filter((r) => r.actionType === 'คืน' || r.status.includes('คืน'))
                    .map((r, idx) => (
                      <div
                        key={r.id || idx}
                        onClick={() => setSelectedRecord(r)}
                        className="bg-white rounded-2xl p-3.5 border border-emerald-200 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-2"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-500">{r.date}</span>
                          <span className="font-bold text-emerald-600">{r.totalQuantity || 1} ชิ้น</span>
                        </div>
                        <p className="font-bold text-slate-800 text-xs sm:text-sm line-clamp-2">{r.itemSummary}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                          <span className="font-medium">{r.requesterName}</span>
                          <span className="text-slate-400">{r.department}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. Pagination Bar */}
          {totalPages > 1 && viewMode !== 'board' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-orange-200/80 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">
                {language === 'th'
                  ? `แสดง ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, filteredRecords.length)} จากทั้งหมด ${filteredRecords.length} รายการ`
                  : `Showing ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, filteredRecords.length)} of ${filteredRecords.length} records`}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-xs font-black text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <EquipmentDetailModal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
      />

      {/* Analytics Modal */}
      <EquipmentAnalyticsModal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        records={records}
        activeSubCategory={activeSubCategory}
      />

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-orange-200/80 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-orange-600" />
                <h2 className="text-base font-black text-slate-800">
                  {language === 'th' ? 'ตัวกรองการค้นหา' : 'Filter & Search'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Department Filter */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'แผนก / สังกัด' : 'Department'}
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800"
                >
                  <option value="all">{language === 'th' ? 'ทุกแผนก' : 'All Departments'}</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Action Type */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'การกระทำ / สถานะ' : 'Action Type'}
                </label>
                <select
                  value={selectedActionType}
                  onChange={(e) => setSelectedActionType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800"
                >
                  <option value="all">{language === 'th' ? 'ทั้งหมด' : 'All'}</option>
                  <option value="เบิก">{language === 'th' ? 'เบิก / ยืม' : 'Requisition'}</option>
                  <option value="คืน">{language === 'th' ? 'คืนแล้ว' : 'Returned'}</option>
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'ปีที่บันทึก' : 'Year'}
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800"
                >
                  <option value="all">{language === 'th' ? 'ทุกปี' : 'All Years'}</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                {language === 'th' ? 'ล้างตัวกรอง' : 'Reset'}
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                {language === 'th' ? 'ปรับใช้ตัวกรอง' : 'Apply Filters'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Google Form Modal */}
      {showQrModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowQrModal(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-rose-100 w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-center shadow-md">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {language === 'th' ? `QR Code แบบฟอร์ม${currentSubCategoryName}` : `${currentSubCategoryName} Form QR Code`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'th' ? 'สแกนเพื่อบันทึกข้อมูลผ่าน Google Form' : 'Scan to submit via Google Form'}
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
              <div className="p-4 bg-gradient-to-b from-rose-50 to-white rounded-2xl border-2 border-rose-200/80 shadow-md">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(currentFormUrl)}&margin=8`}
                  alt={`QR Code ${currentSubCategoryName}`}
                  className="w-52 h-52 sm:w-60 sm:h-60 rounded-xl bg-white shadow-inner"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="mt-4 px-3 py-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200/80 text-[11px] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                <span>{language === 'th' ? 'สแกนด้วยกล้องมือถือเพื่อเปิดแบบฟอร์มทันที' : 'Scan with mobile camera to open form instantly'}</span>
              </div>

              {/* URL Box */}
              <div className="mt-3.5 w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 text-left">
                <span className="text-xs font-mono text-slate-600 truncate flex-1 select-all">
                  {currentFormUrl}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(currentFormUrl);
                    setQrCopied(true);
                    setTimeout(() => setQrCopied(false), 2500);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                    qrCopied 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                  title={language === 'th' ? 'คัดลอกลิงก์' : 'Copy Link'}
                >
                  {qrCopied ? (
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
                href={currentFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-700/20 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{language === 'th' ? 'เปิดแบบฟอร์ม' : 'Open Form'}</span>
              </a>

              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(currentFormUrl)}&margin=10`}
                download={`equipment-${activeSubCategory}-form-qr-code.png`}
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
