import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  PieChart, 
  BarChart3, 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  Sparkles,
  TrendingUp,
  User,
  Sparkle,
  Shirt,
  Key,
  Layers,
  Award,
  Filter,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Tag
} from 'lucide-react';
import { EquipmentRecord, EquipmentSubCategory } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface EquipmentAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: EquipmentRecord[];
  activeSubCategory: EquipmentSubCategory;
}

export const EquipmentAnalyticsModal: React.FC<EquipmentAnalyticsModalProps> = ({
  isOpen,
  onClose,
  records,
  activeSubCategory,
}) => {
  const { language } = useLanguage();
  const [activeChartTab, setActiveChartTab] = useState<'status' | 'departments' | 'topRequesters'>('status');

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [timeScope, setTimeScope] = useState<'all' | 'today' | 'this_month' | 'specific_month' | 'custom'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<'all' | 'borrow' | 'return'>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');

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

  // Extract unique departments for filter
  const availableDepts = useMemo(() => {
    const list = Array.from(
      new Set(records.map((r) => (r.department || '').trim()).filter(Boolean))
    ).sort();
    return list;
  }, [records]);

  // Filter records
  const filteredRecords = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentYearMonth = todayStr.substring(0, 7);

    return records.filter((r) => {
      const recDate = (r.timestamp || r.requisitionDate || '').trim();

      // Time Scope
      if (timeScope === 'today') {
        if (recDate && !recDate.startsWith(todayStr)) return false;
      } else if (timeScope === 'this_month') {
        if (recDate && !recDate.startsWith(currentYearMonth)) return false;
      } else if (timeScope === 'specific_month') {
        if (recDate && !recDate.startsWith(selectedMonth)) return false;
      } else if (timeScope === 'custom') {
        if (startDate && recDate && recDate < startDate) return false;
        if (endDate && recDate && recDate > endDate) return false;
      }

      // SubCategory
      if (selectedSubCategory !== 'all') {
        if (r.subCategory !== selectedSubCategory) return false;
      }

      // Action / Status
      if (selectedAction === 'return') {
        if (r.actionType !== 'คืน' && !r.status.includes('คืน')) return false;
      } else if (selectedAction === 'borrow') {
        if (r.actionType === 'คืน' || r.status.includes('คืน')) return false;
      }

      // Department
      if (selectedDept !== 'all') {
        if ((r.department || '').trim() !== selectedDept) return false;
      }

      return true;
    });
  }, [records, timeScope, selectedMonth, startDate, endDate, selectedSubCategory, selectedAction, selectedDept]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (timeScope !== 'all') count++;
    if (selectedSubCategory !== 'all') count++;
    if (selectedAction !== 'all') count++;
    if (selectedDept !== 'all') count++;
    return count;
  }, [timeScope, selectedSubCategory, selectedAction, selectedDept]);

  const handleResetFilters = () => {
    setTimeScope('all');
    setStartDate('');
    setEndDate('');
    setSelectedSubCategory('all');
    setSelectedAction('all');
    setSelectedDept('all');
  };

  if (!isOpen) return null;

  const totalCount = filteredRecords.length;
  const totalQuantity = filteredRecords.reduce((sum, r) => sum + (r.totalQuantity || 1), 0);

  const returnCount = filteredRecords.filter((r) => r.actionType === 'คืน' || r.status.includes('คืน')).length;
  const requisitionCount = filteredRecords.filter((r) => r.actionType !== 'คืน' && !r.status.includes('คืน')).length;

  const returnPct = totalCount > 0 ? Math.round((returnCount / totalCount) * 100) : 0;
  const requisitionPct = totalCount > 0 ? Math.round((requisitionCount / totalCount) * 100) : 0;

  // Department distribution
  const deptCounts: Record<string, { count: number; qty: number }> = {};
  filteredRecords.forEach((r) => {
    const dept = r.department?.trim() || (language === 'th' ? 'ไม่ระบุแผนก' : 'Unspecified');
    if (!deptCounts[dept]) {
      deptCounts[dept] = { count: 0, qty: 0 };
    }
    deptCounts[dept].count += 1;
    deptCounts[dept].qty += (r.totalQuantity || 1);
  });

  const topDepartments = Object.entries(deptCounts)
    .map(([dept, data]) => ({ dept, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // Top Requesters
  const requesterCounts: Record<string, { count: number; dept: string; qty: number }> = {};
  filteredRecords.forEach((r) => {
    const name = r.requesterName?.trim() || (language === 'th' ? 'ไม่ระบุชื่อ' : 'Unknown');
    if (!requesterCounts[name]) {
      requesterCounts[name] = { count: 0, dept: r.department || '-', qty: 0 };
    }
    requesterCounts[name].count += 1;
    requesterCounts[name].qty += (r.totalQuantity || 1);
  });

  const topRequesters = Object.entries(requesterCounts)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  const getSubCategoryTitle = (sub: EquipmentSubCategory | string) => {
    switch (sub) {
      case 'cleaning':
        return language === 'th' ? 'อุปกรณ์ทำความสะอาด' : 'Cleaning Supplies';
      case 'softener':
        return language === 'th' ? 'น้ำยาปรับผ้านุ่ม' : 'Fabric Softener';
      case 'gown':
        return language === 'th' ? 'เสื้อกาวน์' : 'Gowns';
      case 'keys':
        return language === 'th' ? 'กุญแจ' : 'Keys';
      case 'ladder':
        return language === 'th' ? 'บันไดทรง A' : 'A-Frame Ladder';
      default:
        return language === 'th' ? 'เบิกอุปกรณ์' : 'Equipment';
    }
  };

  // Donut Calculation
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const returnStroke = (returnPct / 100) * circumference;
  const reqStroke = (requisitionPct / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-orange-200/80 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50 border-b border-orange-200/80 flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-600/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-[#7c2d12]">
                  {language === 'th' ? 'สถิติและภาพรวมการเบิกอุปกรณ์' : 'Equipment Analytics & Overview'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-200/80 text-orange-950 text-[11px] font-bold">
                  {getSubCategoryTitle(activeSubCategory)}
                </span>
              </div>
              <p className="text-xs text-orange-900/80 font-medium">
                {language === 'th' 
                  ? `วิเคราะห์จาก ${totalCount} รายการ (${totalQuantity} ชิ้น)${records.length !== totalCount ? ` จากทั้งหมด ${records.length} รายการ` : ''}` 
                  : `Analyzed from ${totalCount} records (${totalQuantity} items)${records.length !== totalCount ? ` of total ${records.length}` : ''}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Toggle Button (Icon Only) */}
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 ${
                isFilterOpen || activeFiltersCount > 0
                  ? 'bg-orange-600 hover:bg-orange-700 text-white font-black ring-2 ring-orange-400/40 shadow-sm'
                  : 'bg-white hover:bg-orange-100/80 text-orange-950 border border-orange-200'
              }`}
              title={language === 'th' ? `ตัวกรองข้อมูลสถิติ${activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}` : `Filter Analytics${activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}`}
              aria-label={language === 'th' ? 'ตัวกรองข้อมูล' : 'Filter'}
            >
              <Filter className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-white text-orange-900 text-[9px] font-black flex items-center justify-center border border-orange-300 shadow-xs">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expandable Filter Box */}
        {isFilterOpen && (
          <div className="bg-orange-50/50 border-b border-orange-200/80 p-4 sm:p-5 animate-in slide-in-from-top-2 duration-150 shrink-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-black text-orange-950 uppercase tracking-wider">
                  {language === 'th' ? 'ตั้งค่าตัวกรองข้อมูลสำหรับสถิติ' : 'Filter Analytics Data'}
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
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'th' ? 'ช่วงเวลา (Time Scope)' : 'Time Scope'}
                </label>
                <select
                  value={timeScope}
                  onChange={(e) => setTimeScope(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทั้งหมด (All Time)' : 'All Time'}</option>
                  <option value="today">{language === 'th' ? 'วันนี้ (Today)' : 'Today'}</option>
                  <option value="this_month">{language === 'th' ? 'เดือนปัจจุบัน (This Month)' : 'This Month'}</option>
                  <option value="specific_month">{language === 'th' ? 'เลือกเดือนระบุ' : 'Specific Month'}</option>
                  <option value="custom">{language === 'th' ? 'กำหนดช่วงวันที่เอง' : 'Custom Date Range'}</option>
                </select>
              </div>

              {/* 2. Subcategory */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'th' ? 'หมวดหมู่อุปกรณ์ (Subcategory)' : 'Category'}
                </label>
                <select
                  value={selectedSubCategory}
                  onChange={(e) => setSelectedSubCategory(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทุกหมวดหมู่ (All)' : 'All Categories'}</option>
                  <option value="cleaning">{language === 'th' ? 'อุปกรณ์ทำความสะอาด' : 'Cleaning'}</option>
                  <option value="softener">{language === 'th' ? 'น้ำยาปรับผ้านุ่ม' : 'Softener'}</option>
                  <option value="gown">{language === 'th' ? 'เสื้อกาวน์' : 'Gowns'}</option>
                  <option value="keys">{language === 'th' ? 'กุญแจ' : 'Keys'}</option>
                  <option value="ladder">{language === 'th' ? 'บันไดทรง A' : 'Ladder'}</option>
                </select>
              </div>

              {/* 3. Action Type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'th' ? 'ประเภทรายการ (Action)' : 'Action'}
                </label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทั้งหมด (All)' : 'All'}</option>
                  <option value="borrow">{language === 'th' ? 'เบิก / ยืม' : 'Requisitions'}</option>
                  <option value="return">{language === 'th' ? 'ส่งคืนแล้ว' : 'Returned'}</option>
                </select>
              </div>

              {/* 4. Department */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'th' ? 'แผนก (Department)' : 'Department'}
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทุกแผนก (All)' : 'All Depts'}</option>
                  {availableDepts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Extra Date Pickers */}
            {timeScope === 'specific_month' && (
              <div className="mt-3 pt-3 border-t border-orange-200/80 flex items-center gap-3">
                <label className="text-xs font-bold text-slate-700">{language === 'th' ? 'เลือกเดือน-ปี:' : 'Select Month:'}</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
                />
              </div>
            )}

            {timeScope === 'custom' && (
              <div className="mt-3 pt-3 border-t border-orange-200/80 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">{language === 'th' ? 'ตั้งแต่วันที่:' : 'From:'}</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">{language === 'th' ? 'ถึงวันที่:' : 'To:'}</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Active Filter Chips Bar */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-orange-50/80 rounded-2xl border border-orange-200/80 text-xs">
              <span className="font-bold text-orange-950 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-orange-600" />
                {language === 'th' ? 'เงื่อนไขที่เลือก:' : 'Active Filters:'}
              </span>

              {timeScope !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-orange-300 text-orange-950 font-semibold shadow-2xs">
                  📅 {timeScope === 'today' ? (language === 'th' ? 'วันนี้' : 'Today') : timeScope === 'this_month' ? (language === 'th' ? 'เดือนนี้' : 'This Month') : timeScope === 'specific_month' ? selectedMonth : `${startDate || '...'} ~ ${endDate || '...'}`}
                </span>
              )}

              {selectedSubCategory !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-orange-300 text-orange-950 font-semibold shadow-2xs">
                  📦 {getSubCategoryTitle(selectedSubCategory)}
                </span>
              )}

              {selectedAction !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-orange-300 text-orange-950 font-semibold shadow-2xs">
                  ⚡ {selectedAction === 'borrow' ? (language === 'th' ? 'เบิก / ยืม' : 'Requisitions') : (language === 'th' ? 'ส่งคืนแล้ว' : 'Returned')}
                </span>
              )}

              {selectedDept !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-orange-300 text-orange-950 font-semibold shadow-2xs">
                  🏢 {selectedDept}
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="ml-auto text-xs font-bold text-orange-900 hover:text-rose-600 transition-colors cursor-pointer px-2 py-0.5"
              >
                {language === 'th' ? 'ล้างทั้งหมด' : 'Clear'}
              </button>
            </div>
          )}

          {/* Top Quick Metric Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-orange-200 shadow-2xs text-center">
              <span className="text-[11px] font-bold text-orange-900">{language === 'th' ? 'รายการบันทึก' : 'Total Logs'}</span>
              <p className="text-2xl font-black text-[#7c2d12] mt-0.5">{totalCount}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-amber-200 shadow-2xs text-center">
              <span className="text-[11px] font-bold text-amber-900">{language === 'th' ? 'เบิก / ยืม' : 'Requisitions'}</span>
              <p className="text-2xl font-black text-amber-700 mt-0.5">{requisitionCount}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-emerald-200 shadow-2xs text-center">
              <span className="text-[11px] font-bold text-emerald-900">{language === 'th' ? 'ส่งคืนแล้ว' : 'Returned'}</span>
              <p className="text-2xl font-black text-emerald-700 mt-0.5">{returnCount}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-sky-200 shadow-2xs text-center">
              <span className="text-[11px] font-bold text-sky-900">{language === 'th' ? 'จำนวนชิ้นรวม' : 'Total Units'}</span>
              <p className="text-2xl font-black text-sky-700 mt-0.5">{totalQuantity}</p>
            </div>
          </div>

          {/* Sub Navigation Tabs inside Modal */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveChartTab('status')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeChartTab === 'status'
                  ? 'bg-white text-orange-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'th' ? 'สัดส่วนสถานะ' : 'Status Ratio'}
            </button>
            <button
              type="button"
              onClick={() => setActiveChartTab('departments')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeChartTab === 'departments'
                  ? 'bg-white text-orange-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'th' ? 'อันดับตามแผนก' : 'By Department'}
            </button>
            <button
              type="button"
              onClick={() => setActiveChartTab('topRequesters')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeChartTab === 'topRequesters'
                  ? 'bg-white text-orange-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'th' ? 'ผู้เบิกบ่อยที่สุด' : 'Top Requesters'}
            </button>
          </div>

          {/* Tab 1: Status Donut Chart */}
          {activeChartTab === 'status' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-around gap-6 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                {/* SVG Donut */}
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                    {/* Background Ring */}
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      className="stroke-slate-100"
                      strokeWidth="16"
                      fill="transparent"
                    />
                    {/* Requisition Ring (Amber) */}
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      className="stroke-amber-500 transition-all duration-700"
                      strokeWidth="16"
                      strokeDasharray={`${reqStroke} ${circumference}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      fill="transparent"
                    />
                    {/* Return Ring (Emerald) */}
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      className="stroke-emerald-500 transition-all duration-700"
                      strokeWidth="16"
                      strokeDasharray={`${returnStroke} ${circumference}`}
                      strokeDashoffset={`-${reqStroke}`}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-slate-500 font-bold">{language === 'th' ? 'อัตราคืน' : 'Return Rate'}</span>
                    <span className="text-2xl font-black text-emerald-700">{returnPct}%</span>
                  </div>
                </div>

                {/* Legend & Details */}
                <div className="space-y-3 flex-1 max-w-xs">
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold text-slate-700">{language === 'th' ? 'รายการเบิก / ยืม' : 'Requisitions'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-amber-700">{requisitionCount}</span>
                      <span className="text-[11px] text-slate-400 ml-1">({requisitionPct}%)</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-slate-700">{language === 'th' ? 'คืนอุปกรณ์เรียบร้อย' : 'Returned'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-700">{returnCount}</span>
                      <span className="text-[11px] text-slate-400 ml-1">({returnPct}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Top Departments */}
          {activeChartTab === 'departments' && (
            <div className="space-y-3">
              {topDepartments.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">{language === 'th' ? 'ไม่มีข้อมูลแผนก' : 'No department data'}</p>
              ) : (
                topDepartments.map((d, idx) => {
                  const pct = totalCount > 0 ? Math.round((d.count / totalCount) * 100) : 0;
                  return (
                    <div key={d.dept} className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span>{d.dept}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="text-orange-700 font-bold">{d.count} {language === 'th' ? 'ครั้ง' : 'times'}</span>
                          <span className="text-slate-400 font-normal">({d.qty} {language === 'th' ? 'ชิ้น' : 'items'})</span>
                          <span className="text-slate-500 text-[11px] font-mono">{pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 3: Top Requesters */}
          {activeChartTab === 'topRequesters' && (
            <div className="space-y-3">
              {topRequesters.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">{language === 'th' ? 'ไม่มีข้อมูลผู้เบิก' : 'No requester data'}</p>
              ) : (
                topRequesters.map((r, idx) => {
                  const pct = totalCount > 0 ? Math.round((r.count / totalCount) * 100) : 0;
                  return (
                    <div key={r.name} className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span>{r.name}</span>
                          <span className="text-[11px] text-slate-400 font-normal">({r.dept})</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="text-amber-800 font-bold">{r.count} {language === 'th' ? 'ครั้ง' : 'times'}</span>
                          <span className="text-slate-400 font-normal">({r.qty} {language === 'th' ? 'ชิ้น' : 'items'})</span>
                          <span className="text-slate-500 text-[11px] font-mono">{pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

