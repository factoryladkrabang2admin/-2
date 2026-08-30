import React, { useMemo, useState, useEffect } from 'react';
import { 
  X, 
  BarChart3, 
  Clock, 
  Users, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Award,
  Calendar,
  PieChart,
  ShieldCheck,
  User,
  Layers,
  Sparkles,
  Printer,
  Filter,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Tag,
  CalendarDays
} from 'lucide-react';
import { OtRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { formatOtHoursDisplay } from '../services/googleSheetSyncService';
import { OtDonutChart, DonutChartItem } from './OtDonutChart';
import { AdminUserAccount, isUserAdminOrSupervisor, getUserEmployeeId } from '../data/mockData';

interface OtAnalyticsModalProps {
  isOpen: boolean;
  records: OtRecord[];
  allRecords?: OtRecord[];
  currentUser?: AdminUserAccount;
  isAuthenticated?: boolean;
  onClose: () => void;
}

const PALETTE = [
  '#0284c7', // sky-600
  '#4f46e5', // indigo-600
  '#059669', // emerald-600
  '#d97706', // amber-600
  '#7c3aed', // violet-600
  '#e11d48', // rose-600
  '#0d9488', // teal-600
  '#ea580c', // orange-600
  '#475569', // slate-600
  '#2563eb', // blue-600
];

export const OtAnalyticsModal: React.FC<OtAnalyticsModalProps> = ({ 
  isOpen, 
  records = [], 
  allRecords = [],
  currentUser,
  isAuthenticated = true,
  onClose 
}) => {
  const { language } = useLanguage();
  const [activeChartTab, setActiveChartTab] = useState<'all' | 'dept' | 'status' | 'duration' | 'leaderboard'>('all');

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [timeScope, setTimeScope] = useState<'all' | 'today' | 'this_month' | 'specific_month' | 'custom'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  const isAdmin = useMemo(() => {
    return isUserAdminOrSupervisor(currentUser, isAuthenticated);
  }, [currentUser, isAuthenticated]);

  const userEmployeeId = useMemo(() => {
    return getUserEmployeeId(currentUser);
  }, [currentUser]);

  // Base record source
  const sourceRecords = useMemo(() => {
    return records && records.length > 0 ? records : allRecords;
  }, [records, allRecords]);

  // Extract unique departments & employees
  const availableDepts = useMemo(() => {
    const set = new Set<string>();
    sourceRecords.forEach((r) => {
      if (r.department && r.department.trim() && r.department !== '-') {
        set.add(r.department.trim());
      }
    });
    return Array.from(set).sort();
  }, [sourceRecords]);

  const availableEmployees = useMemo(() => {
    const map = new Map<string, string>();
    sourceRecords.forEach((r) => {
      const name = (r.employeeName || '').trim();
      const id = (r.employeeId || '').trim();
      if (name && name !== '-') {
        map.set(id || name, `${name}${id && id !== '-' ? ` (${id})` : ''}`);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [sourceRecords]);

  // Dynamic filtered records
  const filteredRecords = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentYearMonth = todayStr.substring(0, 7);

    return sourceRecords.filter((r) => {
      const recDate = (r.date || r.createdAt || '').trim();

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

      // Department
      if (selectedDept !== 'all') {
        if ((r.department || '').trim() !== selectedDept) return false;
      }

      // Status
      if (selectedStatus !== 'all') {
        const s = (r.status || '').toLowerCase();
        if (selectedStatus === 'approved' && !s.includes('approved') && !r.status.includes('อนุมัติ')) return false;
        if (selectedStatus === 'confirm' && !s.includes('confirm') && !r.status.includes('ยืนยัน')) return false;
      }

      // Employee
      if (selectedEmployee !== 'all') {
        const empKey = (r.employeeId && r.employeeId !== '-') ? r.employeeId : (r.employeeName || '');
        if (empKey !== selectedEmployee && (r.employeeName || '') !== selectedEmployee) return false;
      }

      return true;
    });
  }, [sourceRecords, timeScope, selectedMonth, startDate, endDate, selectedDept, selectedStatus, selectedEmployee]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (timeScope !== 'all') count++;
    if (selectedDept !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    if (selectedEmployee !== 'all') count++;
    return count;
  }, [timeScope, selectedDept, selectedStatus, selectedEmployee]);

  const handleResetFilters = () => {
    setTimeScope('all');
    setStartDate('');
    setEndDate('');
    setSelectedDept('all');
    setSelectedStatus('all');
    setSelectedEmployee('all');
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Comprehensive analytics calculation
  const stats = useMemo(() => {
    const totalRecords = filteredRecords?.length || 0;
    const totalHours = (filteredRecords || []).reduce((sum, r) => {
      const h = typeof r.totalHours === 'number' && !isNaN(r.totalHours) ? r.totalHours : 0;
      return sum + h;
    }, 0);
    const avgHoursPerSession = totalRecords > 0 ? (totalHours / totalRecords).toFixed(1) : '0';

    // 1. Unique employees map
    const empMap = new Map<string, { name: string; dept: string; hours: number; count: number }>();
    // 2. Department map
    const deptMap = new Map<string, { count: number; hours: number }>();
    // 3. Status map
    const statusMap = new Map<string, { count: number; hours: number }>();
    // 4. Duration bucket map
    const durationMap = {
      short: { label: '1.0 - 2.0 ชม. (กะสั้น)', hours: 0, count: 0 },
      medium: { label: '2.5 - 3.5 ชม. (กะมาตรฐาน)', hours: 0, count: 0 },
      long: { label: '4.0 - 5.5 ชม. (กะยาว)', hours: 0, count: 0 },
      over: { label: '6.0 ชม. ขึ้นไป (กะพิเศษ)', hours: 0, count: 0 },
    };

    (filteredRecords || []).forEach(r => {
      const recordHours = typeof r.totalHours === 'number' && !isNaN(r.totalHours) ? r.totalHours : 0;
      const empId = r.employeeId && r.employeeId !== '-' ? r.employeeId : '';
      const empName = r.employeeName && r.employeeName !== '-' ? r.employeeName : (empId || 'ไม่ระบุชื่อ');
      const empKey = empId || empName;
      const empDept = r.department || 'ทั่วไป';

      // Employee tracking
      const currentEmp = empMap.get(empKey) || { name: empName, dept: empDept, hours: 0, count: 0 };
      currentEmp.hours += recordHours;
      currentEmp.count += 1;
      empMap.set(empKey, currentEmp);

      // Department tracking
      const deptKey = r.department && r.department !== '-' ? r.department : 'ทั่วไป';
      const currentDept = deptMap.get(deptKey) || { count: 0, hours: 0 };
      currentDept.count += 1;
      currentDept.hours += recordHours;
      deptMap.set(deptKey, currentDept);

      // Status tracking
      let statKey = 'Approved (อนุมัติแล้ว)';
      if (r.status.toLowerCase().includes('approved') || r.status.includes('อนุมัติ')) {
        statKey = 'Approved (อนุมัติแล้ว)';
      } else if (r.status.toLowerCase().includes('confirm') || r.status.includes('ยืนยัน')) {
        statKey = 'Confirm (รอยืนยัน)';
      } else {
        statKey = r.status || 'อื่นๆ';
      }
      const currentStat = statusMap.get(statKey) || { count: 0, hours: 0 };
      currentStat.count += 1;
      currentStat.hours += recordHours;
      statusMap.set(statKey, currentStat);

      // Duration distribution
      if (recordHours <= 2.0) {
        durationMap.short.hours += recordHours;
        durationMap.short.count += 1;
      } else if (recordHours <= 3.5) {
        durationMap.medium.hours += recordHours;
        durationMap.medium.count += 1;
      } else if (recordHours <= 5.5) {
        durationMap.long.hours += recordHours;
        durationMap.long.count += 1;
      } else {
        durationMap.over.hours += recordHours;
        durationMap.over.count += 1;
      }
    });

    // Generate Department Donut Items
    const deptDonutData: DonutChartItem[] = Array.from(deptMap.entries())
      .sort((a, b) => b[1].hours - a[1].hours)
      .map(([dept, data], idx) => ({
        id: `dept-${dept}`,
        label: dept,
        value: Math.round(data.hours * 10) / 10,
        count: data.count,
        color: PALETTE[idx % PALETTE.length],
      }));

    // Generate Status Donut Items
    const statusDonutData: DonutChartItem[] = Array.from(statusMap.entries()).map(([stat, data]) => {
      let color = '#3b82f6';
      if (stat.includes('Approved') || stat.includes('อนุมัติ')) color = '#10b981';
      else if (stat.includes('Confirm') || stat.includes('ยืนยัน')) color = '#f59e0b';
      return {
        id: `status-${stat}`,
        label: stat,
        value: Math.round(data.hours * 10) / 10,
        count: data.count,
        color,
      };
    });

    // Generate Duration Donut Items
    const durationDonutData: DonutChartItem[] = [
      { id: 'dur-short', label: durationMap.short.label, value: Math.round(durationMap.short.hours * 10) / 10, count: durationMap.short.count, color: '#06b6d4' },
      { id: 'dur-med', label: durationMap.medium.label, value: Math.round(durationMap.medium.hours * 10) / 10, count: durationMap.medium.count, color: '#3b82f6' },
      { id: 'dur-long', label: durationMap.long.label, value: Math.round(durationMap.long.hours * 10) / 10, count: durationMap.long.count, color: '#8b5cf6' },
      { id: 'dur-over', label: durationMap.over.label, value: Math.round(durationMap.over.hours * 10) / 10, count: durationMap.over.count, color: '#ec4899' },
    ].filter(item => item.value > 0);

    const topEmployees = Array.from(empMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.hours - a.hours);

    const approvedTotal = (statusMap.get('Approved (อนุมัติแล้ว)')?.count || 0);
    const confirmTotal = (statusMap.get('Confirm (รอยืนยัน)')?.count || 0);

    return {
      totalRecords,
      totalHours: Math.round(totalHours * 10) / 10,
      avgHoursPerSession,
      uniqueEmployeesCount: empMap.size,
      topEmployees,
      deptDonutData,
      statusDonutData,
      durationDonutData,
      approvedTotal,
      confirmTotal,
    };
  }, [filteredRecords]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-sky-100 overflow-hidden flex flex-col max-h-[92vh] z-[110] relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with animated blue-navy theme */}
        <div className="bg-gradient-to-r from-[#002045] via-[#003366] to-[#0a4a82] text-white p-5 sm:p-6 relative flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3.5 pr-6">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <PieChart className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-400/20 text-sky-200 border border-sky-300/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-sky-300" />
                  {language === 'th' ? 'สถิติและการวิเคราะห์กราฟวงกลม' : 'Modern Circular Analytics'}
                </span>
                {isAdmin ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-300" />
                    {language === 'th' ? 'สิทธิ์ผู้ดูแลระบบ: ทุกพนักงาน' : 'Admin: Organization Wide'}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-300" />
                    {language === 'th' ? `ข้อมูลส่วนตัว (${userEmployeeId || currentUser?.name})` : `Personal View`}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-xs">
                {language === 'th' ? 'สถิติและการวิเคราะห์ OT (OT Analytics)' : 'OT Analytics & Visual Charts'}
              </h2>
              <p className="text-xs sm:text-sm text-sky-200 mt-0.5">
                {language === 'th' 
                  ? `วิเคราะห์จาก ${stats.totalRecords} รายการ${sourceRecords.length !== stats.totalRecords ? ` จากทั้งหมด ${sourceRecords.length} รายการ` : ''} • รวม ${stats.totalHours} ชั่วโมงปฏิบัติงาน`
                  : `Analyzed from ${stats.totalRecords} records${sourceRecords.length !== stats.totalRecords ? ` of total ${sourceRecords.length}` : ''} • ${stats.totalHours} total OT hours`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                isFilterOpen || activeFiltersCount > 0
                  ? 'bg-amber-400 text-blue-950 font-black ring-2 ring-amber-200'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/25'
              }`}
              title={language === 'th' ? 'ตัวกรองข้อมูลสถิติ' : 'Filter Analytics'}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'th' ? 'ตัวกรอง' : 'Filter'}</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-950 text-amber-300 text-[10px] font-black flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
              {isFilterOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expandable Filter Box */}
        {isFilterOpen && (
          <div className="bg-sky-50/80 border-b border-sky-200 p-4 sm:p-5 animate-in slide-in-from-top-2 duration-150 shrink-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-sky-700" />
                <span className="text-xs font-black text-sky-950 uppercase tracking-wider">
                  {language === 'th' ? 'ตั้งค่าตัวกรองข้อมูลสถิติ OT' : 'Filter OT Analytics'}
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
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทั้งหมด (All Time)' : 'All Time'}</option>
                  <option value="today">{language === 'th' ? 'วันนี้ (Today)' : 'Today'}</option>
                  <option value="this_month">{language === 'th' ? 'เดือนปัจจุบัน (This Month)' : 'This Month'}</option>
                  <option value="specific_month">{language === 'th' ? 'เลือกเดือนระบุ' : 'Specific Month'}</option>
                  <option value="custom">{language === 'th' ? 'กำหนดช่วงวันที่เอง' : 'Custom Date Range'}</option>
                </select>
              </div>

              {/* 2. Department */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'th' ? 'ฝ่ายงาน (Department)' : 'Department'}
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทุกฝ่าย (All Depts)' : 'All Departments'}</option>
                  {availableDepts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* 3. Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'th' ? 'สถานะการอนุมัติ (Status)' : 'Status'}
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทุกสถานะ (All)' : 'All Statuses'}</option>
                  <option value="approved">{language === 'th' ? 'อนุมัติแล้ว (Approved)' : 'Approved'}</option>
                  <option value="confirm">{language === 'th' ? 'รอยืนยัน (Confirm)' : 'Pending Confirmation'}</option>
                </select>
              </div>

              {/* 4. Employee (for Admins) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'th' ? 'พนักงาน (Employee)' : 'Employee'}
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทุกคน (All Employees)' : 'All Employees'}</option>
                  {availableEmployees.map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Extra Date Pickers */}
            {timeScope === 'specific_month' && (
              <div className="mt-3 pt-3 border-t border-sky-200 flex items-center gap-3">
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
              <div className="mt-3 pt-3 border-t border-sky-200 flex flex-wrap items-center gap-3">
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

        {/* Chart View Mode Tabs */}
        <div className="bg-slate-100/80 px-5 py-2.5 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline mr-1">
            {language === 'th' ? 'มุมมองกราฟ:' : 'View:'}
          </span>
          <button
            type="button"
            onClick={() => setActiveChartTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeChartTab === 'all'
                ? 'bg-[#002045] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{language === 'th' ? 'กราฟวงกลมทั้งหมด' : 'All Donut Charts'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartTab('dept')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeChartTab === 'dept'
                ? 'bg-[#002045] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{language === 'th' ? 'สัดส่วนฝ่ายงาน' : 'By Department'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartTab('status')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeChartTab === 'status'
                ? 'bg-[#002045] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{language === 'th' ? 'สถานะอนุมัติ' : 'By Status'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartTab('duration')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeChartTab === 'duration'
                ? 'bg-[#002045] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{language === 'th' ? 'ระยะเวลากะ OT' : 'By Duration'}</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveChartTab('leaderboard')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeChartTab === 'leaderboard'
                  ? 'bg-[#002045] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'อันดับพนักงาน' : 'Leaderboard'}</span>
            </button>
          )}
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-[#1a1c1c]">
          {/* Active Filter Chips Bar */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-sky-50 rounded-2xl border border-sky-200 text-xs">
              <span className="font-bold text-sky-950 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-sky-700" />
                {language === 'th' ? 'เงื่อนไขที่เลือก:' : 'Active Filters:'}
              </span>

              {timeScope !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-sky-300 text-sky-950 font-semibold shadow-2xs">
                  📅 {timeScope === 'today' ? (language === 'th' ? 'วันนี้' : 'Today') : timeScope === 'this_month' ? (language === 'th' ? 'เดือนนี้' : 'This Month') : timeScope === 'specific_month' ? selectedMonth : `${startDate || '...'} ~ ${endDate || '...'}`}
                </span>
              )}

              {selectedDept !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-sky-300 text-sky-950 font-semibold shadow-2xs">
                  🏢 {selectedDept}
                </span>
              )}

              {selectedStatus !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-sky-300 text-sky-950 font-semibold shadow-2xs">
                  ⚡ {selectedStatus === 'approved' ? (language === 'th' ? 'อนุมัติแล้ว' : 'Approved') : (language === 'th' ? 'รอยืนยัน' : 'Confirm')}
                </span>
              )}

              {selectedEmployee !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-sky-300 text-sky-950 font-semibold shadow-2xs">
                  👤 {availableEmployees.find(e => e[0] === selectedEmployee)?.[1] || selectedEmployee}
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="ml-auto text-xs font-bold text-sky-900 hover:text-rose-600 transition-colors cursor-pointer px-2 py-0.5"
              >
                {language === 'th' ? 'ล้างทั้งหมด' : 'Clear'}
              </button>
            </div>
          )}

          {/* Top 4 KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-sky-50/90 border border-sky-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-sky-900 mb-1">
                <span>{language === 'th' ? 'รายการ OT ทั้งหมด' : 'Total Records'}</span>
                <Clock className="w-4 h-4 text-sky-700" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-[#002045]">{stats.totalRecords}</p>
              <span className="text-[11px] text-sky-800 font-semibold">{language === 'th' ? 'ครั้งที่มีการบันทึก' : 'Sessions'}</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900 mb-1">
                <span>{language === 'th' ? 'ชั่วโมง OT รวม' : 'Total Hours'}</span>
                <TrendingUp className="w-4 h-4 text-emerald-700" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-800">{stats.totalHours}</p>
              <span className="text-[11px] text-emerald-800 font-semibold">{language === 'th' ? 'ชั่วโมงสะสม' : 'Total Hours'}</span>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900 mb-1">
                <span>{language === 'th' ? 'จำนวนพนักงาน' : 'Active Employees'}</span>
                <Users className="w-4 h-4 text-indigo-700" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-indigo-950">{stats.uniqueEmployeesCount}</p>
              <span className="text-[11px] text-indigo-800 font-semibold">{language === 'th' ? 'คนที่มีประวัติ OT' : 'People'}</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-1">
                <span>{language === 'th' ? 'เฉลี่ยต่อครั้ง' : 'Avg Hours/Session'}</span>
                <Clock className="w-4 h-4 text-amber-700" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-900">{stats.avgHoursPerSession}</p>
              <span className="text-[11px] text-amber-800 font-semibold">{language === 'th' ? 'ชม. ต่อกะปฏิบัติงาน' : 'hrs/session'}</span>
            </div>
          </div>

          {/* Section: DONUT CHARTS DISPLAY */}
          {(activeChartTab === 'all' || activeChartTab === 'dept') && (
            <div className="bg-slate-50/70 rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base text-[#002045] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-sky-700" />
                  <span>{language === 'th' ? 'กราฟวงกลม: สัดส่วนชั่วโมง OT ตามฝ่ายงาน' : 'OT Hours by Department (Donut Chart)'}</span>
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  {stats.deptDonutData.length} {language === 'th' ? 'ฝ่าย' : 'Departments'}
                </span>
              </div>
              
              <OtDonutChart
                data={stats.deptDonutData}
                title={language === 'th' ? 'จำแนกชั่วโมงตามแผนก' : 'Department Distribution'}
                unitLabel="ชม."
                totalLabel="ชั่วโมงรวม"
                size="md"
              />
            </div>
          )}

          {(activeChartTab === 'all' || activeChartTab === 'status') && (
            <div className="bg-slate-50/70 rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base text-[#002045] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>{language === 'th' ? 'กราฟวงกลม: สัดส่วนสถานะการอนุมัติ (Approved vs Confirm)' : 'Approval Status Breakdown (Donut Chart)'}</span>
                </h3>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="text-emerald-700">{stats.approvedTotal} อนุมัติ</span>
                  <span>•</span>
                  <span className="text-amber-700">{stats.confirmTotal} ยืนยัน</span>
                </div>
              </div>

              <OtDonutChart
                data={stats.statusDonutData}
                title={language === 'th' ? 'สถานะการดำเนินงาน' : 'Status Breakdown'}
                unitLabel="ชม."
                totalLabel="ชั่วโมงรวม"
                size="md"
              />
            </div>
          )}

          {(activeChartTab === 'all' || activeChartTab === 'duration') && (
            <div className="bg-slate-50/70 rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base text-[#002045] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <span>{language === 'th' ? 'กราฟวงกลม: การกระจายระยะเวลาชั่วโมง OT ต่อกะ' : 'Shift Duration Distribution (Donut Chart)'}</span>
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  {language === 'th' ? 'ระยะเวลากะทำงาน' : 'Shift lengths'}
                </span>
              </div>

              <OtDonutChart
                data={stats.durationDonutData}
                title={language === 'th' ? 'ช่วงระยะเวลาทำงาน' : 'Duration Buckets'}
                unitLabel="ชม."
                totalLabel="ชั่วโมงรวม"
                size="md"
              />
            </div>
          )}

          {/* Leaderboard Table (Available for Admins or in Leaderboard tab) */}
          {isAdmin && (activeChartTab === 'all' || activeChartTab === 'leaderboard') && (
            <div className="bg-slate-50/70 rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base text-[#002045] flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>{language === 'th' ? 'ตารางจัดอันดับพนักงานที่มีชั่วโมง OT สูงสุด' : 'Top Employees Leaderboard'}</span>
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  {stats.topEmployees.length} {language === 'th' ? 'คน' : 'Employees'}
                </span>
              </div>

              <div className="divide-y divide-slate-200/80 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                {stats.topEmployees.slice(0, 10).map((emp, index) => {
                  const percentOfTotal = stats.totalHours > 0 ? Math.round((emp.hours / stats.totalHours) * 100) : 0;
                  return (
                    <div key={emp.id} className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          index === 0 ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300' :
                          index === 1 ? 'bg-slate-200 text-slate-800' :
                          index === 2 ? 'bg-amber-50 text-amber-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-bold text-sm text-[#002045]">{emp.name}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold">{emp.dept}</span>
                            {emp.id !== emp.name && <span>• รหัส {emp.id}</span>}
                            <span>• {emp.count} {language === 'th' ? 'ครั้ง' : 'sessions'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-sm text-sky-950 block">
                          {formatOtHoursDisplay(undefined, undefined, emp.hours)} ชม.
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {percentOfTotal}% ของทั้งหมด
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>{language === 'th' ? 'พิมพ์รายงานสถิติ' : 'Print Analytics'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#002045] hover:bg-[#003366] text-white font-bold text-sm shadow-md cursor-pointer transition-all"
          >
            {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
