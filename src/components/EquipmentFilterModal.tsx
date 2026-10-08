import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Filter,
  RotateCcw,
  Check,
  Calendar,
  Package,
  DollarSign,
  Boxes,
  ArrowUpDown,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  Tag,
  AlertCircle
} from 'lucide-react';
import { InventoryProduct, InventoryCategory, InventoryTransaction } from '../types';
import { INVENTORY_CATEGORIES } from '../services/equipmentInventoryService';

export interface EquipmentFilterState {
  // 1. วันที่ (Date Filter)
  datePreset: 'all' | 'today' | 'this_week' | 'this_month' | 'custom';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD

  // 2. รายการ (Item Filter & Search)
  searchQuery: string;
  selectedProductIds: string[]; // Specific items selected (empty means all)

  // 3. หมวดหมู่ (Category)
  category: InventoryCategory;

  // 4. สถานะสต็อก (Stock Status)
  stockStatus: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'has_sales' | 'has_restock';

  // 5. ช่วงราคา (Price Range)
  minPrice: string;
  maxPrice: string;

  // 6. ช่วงจำนวนคงเหลือ (Stock Qty Range)
  minStock: string;
  maxStock: string;

  // 7. การเรียงลำดับ (Sorting)
  sortBy: 'default' | 'name_asc' | 'name_desc' | 'stock_asc' | 'stock_desc' | 'price_asc' | 'price_desc' | 'recent_date' | 'sold_desc';
}

export const DEFAULT_EQUIPMENT_FILTERS: EquipmentFilterState = {
  datePreset: 'all',
  startDate: '',
  endDate: '',
  searchQuery: '',
  selectedProductIds: [],
  category: 'all',
  stockStatus: 'all',
  minPrice: '',
  maxPrice: '',
  minStock: '',
  maxStock: '',
  sortBy: 'default',
};

/**
 * Robust date parser supporting DD/MM/YYYY, YYYY-MM-DD and Buddhist era years
 */
export function parseProductDate(dStr?: string): Date | null {
  if (!dStr) return null;
  const parts = dStr.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  for (const part of parts) {
    // DD/MM/YYYY
    const ddmmyyyy = part.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      let year = parseInt(ddmmyyyy[3], 10);
      if (year > 2400) year -= 543;
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    // YYYY-MM-DD
    const yyyymmdd = part.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (yyyymmdd) {
      let year = parseInt(yyyymmdd[1], 10);
      const month = parseInt(yyyymmdd[2], 10) - 1;
      const day = parseInt(yyyymmdd[3], 10);
      if (year > 2400) year -= 543;
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

/**
 * Filter and sort helper function used by both the modal preview and the main view
 */
export function applyEquipmentFilters(
  products: InventoryProduct[],
  filters: EquipmentFilterState,
  transactions: InventoryTransaction[] = []
): InventoryProduct[] {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Helper for checking if date falls in range
  const matchesDate = (p: InventoryProduct): boolean => {
    if (filters.datePreset === 'all') return true;

    // Check product's lastUpdatedDate
    const pDate = parseProductDate(p.lastUpdatedDate);

    // Also collect transaction dates for this product to be exhaustive
    const prodTxDates = transactions
      .filter((t) => t.productId === p.id)
      .map((t) => parseProductDate(t.dateStr || t.timestamp))
      .filter((d): d is Date => d !== null);

    const allDates = pDate ? [pDate, ...prodTxDates] : prodTxDates;
    if (allDates.length === 0) {
      // If product has no date recorded, only keep if filter is 'all'
      return false;
    }

    if (filters.datePreset === 'today') {
      return allDates.some((d) => d.toDateString() === now.toDateString());
    }

    if (filters.datePreset === 'this_week') {
      const startOfWeek = new Date(now);
      const day = now.getDay() || 7; // Monday = 1
      startOfWeek.setDate(now.getDate() - day + 1);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return allDates.some((d) => d >= startOfWeek && d <= endOfWeek);
    }

    if (filters.datePreset === 'this_month') {
      return allDates.some(
        (d) => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    }

    if (filters.datePreset === 'custom') {
      let start: Date | null = null;
      let end: Date | null = null;

      if (filters.startDate) {
        start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
      }
      if (filters.endDate) {
        end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
      }

      if (start && end) {
        return allDates.some((d) => d >= start! && d <= end!);
      }
      if (start) {
        return allDates.some((d) => d >= start!);
      }
      if (end) {
        return allDates.some((d) => d <= end!);
      }
      return true;
    }

    return true;
  };

  // 1. Filtering
  const filtered = products.filter((p) => {
    // 1. Date
    if (!matchesDate(p)) return false;

    // 2. Specific Items selection
    if (filters.selectedProductIds.length > 0) {
      if (!filters.selectedProductIds.includes(p.id)) {
        return false;
      }
    }

    // 3. Category
    if (filters.category !== 'all' && p.category !== filters.category) {
      return false;
    }

    // 4. Search query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchCat = p.categoryName?.toLowerCase().includes(q) || false;
      const matchUnit = p.unit?.toLowerCase().includes(q) || false;
      const matchDesc = p.description?.toLowerCase().includes(q) || false;
      const matchId = p.id.toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchUnit && !matchDesc && !matchId) {
        return false;
      }
    }

    // 5. Stock Status
    if (filters.stockStatus === 'in_stock') {
      if (p.currentStock <= 0) return false;
    } else if (filters.stockStatus === 'low_stock') {
      if (p.currentStock > 15 || p.currentStock <= 0) return false;
    } else if (filters.stockStatus === 'out_of_stock') {
      if (p.currentStock > 0) return false;
    } else if (filters.stockStatus === 'has_sales') {
      if (p.soldCount <= 0) return false;
    } else if (filters.stockStatus === 'has_restock') {
      if (p.stockIn <= 0) return false;
    }

    // 6. Price Range
    const minP = filters.minPrice !== '' ? parseFloat(filters.minPrice) : null;
    const maxP = filters.maxPrice !== '' ? parseFloat(filters.maxPrice) : null;
    if (minP !== null && !isNaN(minP) && p.price < minP) return false;
    if (maxP !== null && !isNaN(maxP) && p.price > maxP) return false;

    // 7. Stock Range
    const minS = filters.minStock !== '' ? parseFloat(filters.minStock) : null;
    const maxS = filters.maxStock !== '' ? parseFloat(filters.maxStock) : null;
    if (minS !== null && !isNaN(minS) && p.currentStock < minS) return false;
    if (maxS !== null && !isNaN(maxS) && p.currentStock > maxS) return false;

    return true;
  });

  // 2. Sorting
  const sorted = [...filtered];
  switch (filters.sortBy) {
    case 'name_asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'th'));
      break;
    case 'name_desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name, 'th'));
      break;
    case 'stock_asc':
      sorted.sort((a, b) => a.currentStock - b.currentStock);
      break;
    case 'stock_desc':
      sorted.sort((a, b) => b.currentStock - a.currentStock);
      break;
    case 'price_asc':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      sorted.sort((a, b) => b.price - a.price);
      break;
    case 'sold_desc':
      sorted.sort((a, b) => b.soldCount - a.soldCount);
      break;
    case 'recent_date':
      sorted.sort((a, b) => {
        const da = parseProductDate(a.lastUpdatedDate)?.getTime() || 0;
        const db = parseProductDate(b.lastUpdatedDate)?.getTime() || 0;
        return db - da;
      });
      break;
    case 'default':
    default:
      // keep natural order
      break;
  }

  return sorted;
}

export function countActiveFilters(filters: EquipmentFilterState): number {
  let count = 0;
  if (filters.datePreset !== 'all' || filters.startDate || filters.endDate) count++;
  if (filters.searchQuery.trim().length > 0) count++;
  if (filters.selectedProductIds.length > 0) count++;
  if (filters.category !== 'all') count++;
  if (filters.stockStatus !== 'all') count++;
  if (filters.minPrice !== '' || filters.maxPrice !== '') count++;
  if (filters.minStock !== '' || filters.maxStock !== '') count++;
  if (filters.sortBy !== 'default') count++;
  return count;
}

interface EquipmentFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: EquipmentFilterState;
  onApply: (newFilters: EquipmentFilterState) => void;
  products: InventoryProduct[];
  transactions?: InventoryTransaction[];
  isEn?: boolean;
}

export const EquipmentFilterModal: React.FC<EquipmentFilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  onApply,
  products,
  transactions = [],
  isEn = false,
}) => {
  const [localFilters, setLocalFilters] = useState<EquipmentFilterState>(filters);
  const [itemSearchText, setItemSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'date' | 'items' | 'stock' | 'price' | 'sort'>('all');

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  // Real-time matched items count preview
  const previewProducts = useMemo(() => {
    return applyEquipmentFilters(products, localFilters, transactions);
  }, [products, localFilters, transactions]);

  if (!isOpen) return null;

  // Filtered list of products for the item checklist section
  const selectableItems = products.filter((p) => {
    if (!itemSearchText.trim()) return true;
    const q = itemSearchText.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.categoryName?.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  });

  const handleToggleItem = (id: string) => {
    setLocalFilters((prev) => {
      const exists = prev.selectedProductIds.includes(id);
      const updated = exists
        ? prev.selectedProductIds.filter((itemId) => itemId !== id)
        : [...prev.selectedProductIds, id];
      return { ...prev, selectedProductIds: updated };
    });
  };

  const handleSelectAllItems = () => {
    setLocalFilters((prev) => ({
      ...prev,
      selectedProductIds: selectableItems.map((p) => p.id),
    }));
  };

  const handleClearItemSelection = () => {
    setLocalFilters((prev) => ({
      ...prev,
      selectedProductIds: [],
    }));
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_EQUIPMENT_FILTERS);
  };

  const handleSaveAndApply = () => {
    onApply(localFilters);
    onClose();
  };

  const activeCount = countActiveFilters(localFilters);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-amber-900/15 dark:border-white/10 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-900 via-stone-900 to-amber-950 text-white flex items-center justify-between shrink-0 shadow-sm border-b border-amber-800/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shadow-inner">
              <Filter className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  {isEn ? 'Equipment Inventory Filter' : 'หน้าต่างตัวกรองคลังอุปกรณ์'}
                </h3>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 font-black text-xs">
                    {activeCount} {isEn ? 'active' : 'เงื่อนไข'}
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5">
                {isEn
                  ? 'Filter by date, items, category, stock levels, and price range'
                  : 'เลือกเงื่อนไขเพื่อกรองข้อมูลวันที่ รายการสินค้า หมวดหมู่ สต็อก และราคา'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title={isEn ? 'Close' : 'ปิดหน้าต่าง'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Section Tabs */}
        <div className="px-5 pt-3 pb-2 bg-stone-50 dark:bg-stone-950/50 border-b border-stone-200 dark:border-stone-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'all', labelTh: 'ทั้งหมด', labelEn: 'All Fields' },
            { id: 'date', labelTh: '📅 วันที่', labelEn: '📅 Date' },
            { id: 'items', labelTh: '📦 รายการสินค้า', labelEn: '📦 Items' },
            { id: 'stock', labelTh: '📊 สต็อก & หมวดหมู่', labelEn: '📊 Stock & Cat' },
            { id: 'price', labelTh: '💰 ช่วงราคา', labelEn: '💰 Price' },
            { id: 'sort', labelTh: '↕️ จัดเรียง', labelEn: '↕️ Sorting' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-amber-900 text-white dark:bg-amber-500 dark:text-stone-950 shadow-xs'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200/60 dark:border-stone-700/60'
              }`}
            >
              {isEn ? tab.labelEn : tab.labelTh}
            </button>
          ))}
        </div>

        {/* Modal Body - Scrollable content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-stone-800 dark:text-stone-200 text-sm">
          {/* SECTION 1: วันที่ (Date Filter) */}
          {(activeTab === 'all' || activeTab === 'date') && (
            <div className="space-y-3 bg-amber-50/50 dark:bg-stone-800/40 p-4 rounded-2xl border border-amber-900/10 dark:border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span className="font-black text-xs text-amber-950 dark:text-amber-300 uppercase tracking-wider">
                    {isEn ? 'Date Filter' : 'วันที่บันทึก / อัปเดตข้อมูล'}
                  </span>
                </div>
                {localFilters.datePreset !== 'all' && (
                  <button
                    type="button"
                    onClick={() =>
                      setLocalFilters((p) => ({
                        ...p,
                        datePreset: 'all',
                        startDate: '',
                        endDate: '',
                      }))
                    }
                    className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    {isEn ? 'Reset Date' : 'ล้างวันที่'}
                  </button>
                )}
              </div>

              {/* Date Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'all', labelTh: 'วันที่ทั้งหมด', labelEn: 'All Dates' },
                  { id: 'today', labelTh: 'วันนี้', labelEn: 'Today' },
                  { id: 'this_week', labelTh: 'สัปดาห์นี้', labelEn: 'This Week' },
                  { id: 'this_month', labelTh: 'เดือนนี้', labelEn: 'This Month' },
                  { id: 'custom', labelTh: 'กำหนดเอง', labelEn: 'Custom' },
                ].map((preset) => {
                  const isSel = localFilters.datePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        setLocalFilters((prev) => ({
                          ...prev,
                          datePreset: preset.id as any,
                        }))
                      }
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer border ${
                        isSel
                          ? 'bg-amber-900 text-white dark:bg-amber-500 dark:text-stone-950 border-amber-900 dark:border-amber-500 shadow-xs'
                          : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-750'
                      }`}
                    >
                      {isEn ? preset.labelEn : preset.labelTh}
                    </button>
                  );
                })}
              </div>

              {/* Custom Date Pickers */}
              {localFilters.datePreset === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400">
                      {isEn ? 'Start Date' : 'ตั้งแต่วันที่'}
                    </label>
                    <input
                      type="date"
                      value={localFilters.startDate}
                      onChange={(e) =>
                        setLocalFilters((p) => ({ ...p, startDate: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium text-stone-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400">
                      {isEn ? 'End Date' : 'ถึงวันที่'}
                    </label>
                    <input
                      type="date"
                      value={localFilters.endDate}
                      onChange={(e) =>
                        setLocalFilters((p) => ({ ...p, endDate: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium text-stone-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: รายการสินค้า (Items Selection & Search) */}
          {(activeTab === 'all' || activeTab === 'items') && (
            <div className="space-y-3 bg-stone-50 dark:bg-stone-800/40 p-4 rounded-2xl border border-stone-200 dark:border-stone-700/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span className="font-black text-xs text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                    {isEn ? 'Item Selection (รายการอุปกรณ์)' : 'เลือกเฉพาะรายการที่ต้องการ'}
                  </span>
                  {localFilters.selectedProductIds.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 font-black">
                      {localFilters.selectedProductIds.length} {isEn ? 'selected' : 'รายการ'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllItems}
                    className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    {isEn ? 'Select All' : 'เลือกทั้งหมด'}
                  </button>
                  <span className="text-stone-300 dark:text-stone-600">|</span>
                  <button
                    type="button"
                    onClick={handleClearItemSelection}
                    className="text-[11px] font-bold text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 cursor-pointer"
                  >
                    {isEn ? 'Clear' : 'ล้างเลือก'}
                  </button>
                </div>
              </div>

              {/* Item Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={itemSearchText}
                  onChange={(e) => setItemSearchText(e.target.value)}
                  placeholder={
                    isEn
                      ? 'Type to search item name, code...'
                      : 'พิมพ์ค้นหาชื่ออุปกรณ์หรือรหัสเพื่อเลือกรายการ...'
                  }
                  className="w-full pl-8 pr-7 py-2 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-stone-900 dark:text-white font-medium"
                />
                {itemSearchText && (
                  <button
                    type="button"
                    onClick={() => setItemSearchText('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Item Checklist (Scrollable) */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-stone-200 dark:border-stone-700 rounded-xl p-2 bg-white dark:bg-stone-900/60">
                {selectableItems.length === 0 ? (
                  <p className="text-xs text-stone-400 text-center py-4">
                    {isEn ? 'No items match your search' : 'ไม่พบรายการที่ตรงกับคำค้นหา'}
                  </p>
                ) : (
                  selectableItems.map((p) => {
                    const isChecked = localFilters.selectedProductIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleToggleItem(p.id)}
                        className={`p-2 rounded-xl text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-amber-100/70 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800/60'
                            : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="shrink-0 text-amber-700 dark:text-amber-400">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                            ) : (
                              <Square className="w-4 h-4 text-stone-400" />
                            )}
                          </div>
                          <span className="truncate font-semibold text-xs">{p.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-200/60 dark:bg-stone-800 text-stone-600 dark:text-stone-400 shrink-0">
                            {p.categoryName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-[11px] font-mono">
                          <span className="text-stone-500">คงเหลือ:</span>
                          <span
                            className={`font-bold ${
                              p.currentStock <= 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : p.currentStock <= 15
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {p.currentStock} {p.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* SECTION 3: หมวดหมู่ & สถานะสต็อก */}
          {(activeTab === 'all' || activeTab === 'stock') && (
            <div className="space-y-4 bg-stone-50 dark:bg-stone-800/40 p-4 rounded-2xl border border-stone-200 dark:border-stone-700/60">
              {/* Category */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    <span className="font-black text-xs text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                      {isEn ? 'Category' : 'หมวดหมู่อุปกรณ์'}
                    </span>
                  </div>
                  {localFilters.category !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setLocalFilters((p) => ({ ...p, category: 'all' }))}
                      className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      {isEn ? 'All Categories' : 'ทุกหมวด'}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {INVENTORY_CATEGORIES.map((cat) => {
                    const isSel = localFilters.category === cat.id;
                    const count =
                      cat.id === 'all'
                        ? products.length
                        : products.filter((p) => p.category === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          setLocalFilters((p) => ({ ...p, category: cat.id as any }))
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                          isSel
                            ? 'bg-amber-900 text-white dark:bg-amber-500 dark:text-stone-950 border-amber-900 dark:border-amber-500 shadow-xs'
                            : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-750'
                        }`}
                      >
                        <span>{isEn ? cat.nameEn : cat.nameTh}</span>
                        <span className="text-[10px] opacity-75">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stock Status */}
              <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-700/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    <span className="font-black text-xs text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                      {isEn ? 'Stock Status' : 'สถานะสต็อกสินค้า'}
                    </span>
                  </div>
                  {localFilters.stockStatus !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setLocalFilters((p) => ({ ...p, stockStatus: 'all' }))}
                      className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      {isEn ? 'Reset Status' : 'ทั้งหมด'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'all', labelTh: 'ทั้งหมด', labelEn: 'All Stock' },
                    { id: 'in_stock', labelTh: 'พร้อมขาย (>0)', labelEn: 'In Stock (>0)' },
                    { id: 'low_stock', labelTh: 'สต็อกต่ำ (≤15)', labelEn: 'Low Stock (≤15)' },
                    { id: 'out_of_stock', labelTh: 'หมดสต็อก (0)', labelEn: 'Out of Stock (0)' },
                    { id: 'has_sales', labelTh: 'มีการขาย/เบิก', labelEn: 'Sold items' },
                    { id: 'has_restock', labelTh: 'มีการเติมสต็อก', labelEn: 'Restocked' },
                  ].map((item) => {
                    const isSel = localFilters.stockStatus === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setLocalFilters((p) => ({ ...p, stockStatus: item.id as any }))
                        }
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer border ${
                          isSel
                            ? 'bg-amber-900 text-white dark:bg-amber-500 dark:text-stone-950 border-amber-900 dark:border-amber-500 shadow-xs'
                            : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-750'
                        }`}
                      >
                        <span className="truncate">{isEn ? item.labelEn : item.labelTh}</span>
                        {isSel && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: ช่วงราคา และ จำนวนคงเหลือ */}
          {(activeTab === 'all' || activeTab === 'price') && (
            <div className="space-y-4 bg-stone-50 dark:bg-stone-800/40 p-4 rounded-2xl border border-stone-200 dark:border-stone-700/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Price Range */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-black text-xs text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                      {isEn ? 'Price Range (฿)' : 'ช่วงราคาขาย (บาท)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      placeholder={isEn ? 'Min ฿' : 'ต่ำสุด ฿'}
                      value={localFilters.minPrice}
                      onChange={(e) =>
                        setLocalFilters((p) => ({ ...p, minPrice: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium text-stone-900 dark:text-white"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder={isEn ? 'Max ฿' : 'สูงสุด ฿'}
                      value={localFilters.maxPrice}
                      onChange={(e) =>
                        setLocalFilters((p) => ({ ...p, maxPrice: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium text-stone-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Stock Quantity Range */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-black text-xs text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                      {isEn ? 'Stock Quantity' : 'ช่วงสต็อกคงเหลือ (ชิ้น)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      placeholder={isEn ? 'Min Qty' : 'ต่ำสุด'}
                      value={localFilters.minStock}
                      onChange={(e) =>
                        setLocalFilters((p) => ({ ...p, minStock: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium text-stone-900 dark:text-white"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder={isEn ? 'Max Qty' : 'สูงสุด'}
                      value={localFilters.maxStock}
                      onChange={(e) =>
                        setLocalFilters((p) => ({ ...p, maxStock: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium text-stone-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: การเรียงลำดับ (Sorting) */}
          {(activeTab === 'all' || activeTab === 'sort') && (
            <div className="space-y-3 bg-stone-50 dark:bg-stone-800/40 p-4 rounded-2xl border border-stone-200 dark:border-stone-700/60">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span className="font-black text-xs text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                  {isEn ? 'Sort By' : 'การจัดเรียงข้อมูล'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'default', labelTh: 'ตามลำดับเริ่มต้น', labelEn: 'Default Order' },
                  { id: 'recent_date', labelTh: 'วันที่อัปเดตล่าสุด', labelEn: 'Recently Updated' },
                  { id: 'name_asc', labelTh: 'ชื่อสินค้า (ก-ฮ)', labelEn: 'Name (A-Z)' },
                  { id: 'name_desc', labelTh: 'ชื่อสินค้า (ฮ-ก)', labelEn: 'Name (Z-A)' },
                  { id: 'stock_asc', labelTh: 'คงเหลือน้อย -> มาก', labelEn: 'Stock (Low to High)' },
                  { id: 'stock_desc', labelTh: 'คงเหลือมาก -> น้อย', labelEn: 'Stock (High to Low)' },
                  { id: 'price_asc', labelTh: 'ราคาต่ำ -> สูง', labelEn: 'Price (Low to High)' },
                  { id: 'price_desc', labelTh: 'ราคาสูง -> ต่ำ', labelEn: 'Price (High to Low)' },
                  { id: 'sold_desc', labelTh: 'ยอดขาย/เบิกสูงสุด', labelEn: 'Top Selling' },
                ].map((sortItem) => {
                  const isSel = localFilters.sortBy === sortItem.id;
                  return (
                    <button
                      key={sortItem.id}
                      type="button"
                      onClick={() =>
                        setLocalFilters((p) => ({ ...p, sortBy: sortItem.id as any }))
                      }
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer border ${
                        isSel
                          ? 'bg-amber-900 text-white dark:bg-amber-500 dark:text-stone-950 border-amber-900 dark:border-amber-500 shadow-xs'
                          : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-750'
                      }`}
                    >
                      <span className="truncate">{isEn ? sortItem.labelEn : sortItem.labelTh}</span>
                      {isSel && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Result Counter & Action Buttons */}
        <div className="p-4 sm:p-5 bg-stone-50 dark:bg-stone-950/80 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-600 dark:text-stone-400">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {isEn ? (
                <>
                  Matching <span className="text-amber-700 dark:text-amber-400 font-black">{previewProducts.length}</span> of {products.length} items
                </>
              ) : (
                <>
                  ผลลัพธ์ที่จะแสดง <span className="text-amber-700 dark:text-amber-400 font-black">{previewProducts.length}</span> จากทั้งหมด {products.length} รายการ
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isEn ? 'Reset All' : 'ล้างตัวกรอง'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-stone-200/80 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold transition-colors cursor-pointer"
            >
              {isEn ? 'Cancel' : 'ยกเลิก'}
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="px-5 py-2 rounded-xl bg-amber-900 hover:bg-amber-950 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-stone-950 text-xs font-black shadow-md shadow-amber-950/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>
                {isEn ? `Apply (${previewProducts.length})` : `นำไปใช้ (${previewProducts.length} รายการ)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
