import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  PieChart as PieIcon,
  BarChart3,
  Users,
  Sun,
  Moon,
  Plane,
  CalendarCheck,
  Percent,
  CheckCircle2,
  Filter,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Tag,
  CalendarDays,
  Printer,
  Sparkles,
  Layers,
  Clock,
  Briefcase,
  AlertTriangle
} from 'lucide-react';
import { DailyWorkSchedule } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface WorkScheduleAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: DailyWorkSchedule[];
  allEmployees: string[];
  allSchedules?: DailyWorkSchedule[];
}

export const WorkScheduleAnalyticsModal: React.FC<WorkScheduleAnalyticsModalProps> = ({
  isOpen,
  onClose,
  schedules,
  allEmployees,
  allSchedules
}) => {
  const { language } = useLanguage();
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<'all' | 'status' | 'shift' | 'staff'>('all');

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [timeScope, setTimeScope] = useState<'all' | 'today' | 'this_month' | 'specific_month' | 'custom'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Determine base dataset
  const baseSchedules = useMemo(() => {
    if (allSchedules && allSchedules.length > 0) return allSchedules;
    return schedules;
  }, [allSchedules, schedules]);

  // Extract unique day of week list
  const availableDays = useMemo(() => {
    const set = new Set<string>();
    baseSchedules.forEach(s => {
      if (s.dayOfWeek) set.add(s.dayOfWeek);
    });
    return Array.from(set);
  }, [baseSchedules]);

  // Filter schedules dynamically
  const filteredSchedules = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curDay = now.getDate();

    return baseSchedules.filter(s => {
      const parts = (s.dateStr || '').split(/[-/.]/);
      let sD = 0, sM = 0, sY = 0;
      if (parts.length === 3) {
        sD = parseInt(parts[0], 10);
        sM = parseInt(parts[1], 10);
        sY = parseInt(parts[2], 10);
        if (sY > 2500) sY -= 543;
      }

      // Time Scope
      if (timeScope === 'today') {
        if (sD !== curDay || sM !== curMonth || sY !== curYear) return false;
      } else if (timeScope === 'this_month') {
        if (sM !== curMonth || sY !== curYear) return false;
      } else if (timeScope === 'specific_month') {
        const [selY, selM] = selectedMonth.split('-').map(v => parseInt(v, 10));
        if (selY && selM) {
          if (sY !== selY || sM !== selM) return false;
        }
      } else if (timeScope === 'custom') {
        if (startDate) {
          const [stY, stM, stD] = startDate.split('-').map(v => parseInt(v, 10));
          const sDateObj = new Date(sY, sM - 1, sD);
          const stDateObj = new Date(stY, stM - 1, stD);
          if (sDateObj < stDateObj) return false;
        }
        if (endDate) {
          const [enY, enM, enD] = endDate.split('-').map(v => parseInt(v, 10));
          const sDateObj = new Date(sY, sM - 1, sD);
          const enDateObj = new Date(enY, enM - 1, enD);
          if (sDateObj > enDateObj) return false;
        }
      }

      // Day of Week
      if (selectedDayOfWeek !== 'all') {
        if (selectedDayOfWeek === 'weekday') {
          if (['วันเสาร์', 'วันอาทิตย์'].includes(s.dayOfWeek)) return false;
        } else if (selectedDayOfWeek === 'weekend') {
          if (!['วันเสาร์', 'วันอาทิตย์'].includes(s.dayOfWeek)) return false;
        } else {
          if (s.dayOfWeek !== selectedDayOfWeek) return false;
        }
      }

      // Employee Filter
      if (selectedEmployee !== 'all') {
        const matchOn = s.onDutyEmployees.some(e => e.name === selectedEmployee);
        const matchOff = s.offDutyEmployees.some(e => e.name === selectedEmployee);
        const matchLeave = s.leaveEmployees.some(e => e.name === selectedEmployee);
        if (!matchOn && !matchOff && !matchLeave) return false;
      }

      // Shift Time Filter
      if (selectedShift !== 'all') {
        if (selectedShift === 'shift8') {
          const has8 = s.onDutyEmployees.some(e => e.shiftTime.includes('08.00') || e.shiftTime.includes('08:00') || e.shiftTime.includes('8.00'));
          if (!has8) return false;
        } else if (selectedShift === 'shift6') {
          const has6 = s.onDutyEmployees.some(e => e.shiftTime.includes('06.00') || e.shiftTime.includes('06:00') || e.shiftTime.includes('6.00'));
          if (!has6) return false;
        } else if (selectedShift === 'other') {
          const hasOther = s.onDutyEmployees.some(e => !e.shiftTime.includes('08.') && !e.shiftTime.includes('08:') && !e.shiftTime.includes('06.') && !e.shiftTime.includes('06:'));
          if (!hasOther) return false;
        }
      }

      // Status Filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'onduty' && s.totalOnDuty === 0) return false;
        if (selectedStatus === 'offduty' && s.totalOffDuty === 0) return false;
        if (selectedStatus === 'leaves' && s.totalLeaves === 0) return false;
      }

      return true;
    });
  }, [baseSchedules, timeScope, selectedMonth, startDate, endDate, selectedDayOfWeek, selectedEmployee, selectedShift, selectedStatus]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (timeScope !== 'all') count++;
    if (selectedDayOfWeek !== 'all') count++;
    if (selectedEmployee !== 'all') count++;
    if (selectedShift !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    return count;
  }, [timeScope, selectedDayOfWeek, selectedEmployee, selectedShift, selectedStatus]);

  const handleResetFilters = () => {
    setTimeScope('all');
    setStartDate('');
    setEndDate('');
    setSelectedDayOfWeek('all');
    setSelectedEmployee('all');
    setSelectedShift('all');
    setSelectedStatus('all');
  };

  // Calculate overall counts based on filteredSchedules
  const stats = useMemo(() => {
    let totalOnDuty = 0;
    let totalOffDuty = 0;
    let totalVacation = 0;
    let totalSick = 0;
    let totalPersonal = 0;
    let totalAbsent = 0;
    let totalHoliday = 0;
    let shift8to17Count = 0;
    let shift6to14Count = 0;
    let otherShiftCount = 0;

    const empStats: Record<string, { onDuty: number; offDuty: number; leaves: number }> = {};
    allEmployees.forEach(emp => {
      empStats[emp] = { onDuty: 0, offDuty: 0, leaves: 0 };
    });

    filteredSchedules.forEach(s => {
      // If employee filter is active, only tally matching employee
      if (selectedEmployee !== 'all') {
        s.onDutyEmployees.forEach(e => {
          if (e.name === selectedEmployee) {
            totalOnDuty += 1;
            if (empStats[e.name]) empStats[e.name].onDuty += 1;
            if (e.shiftTime.includes('08.00') || e.shiftTime.includes('08:00') || e.shiftTime.includes('8.00')) {
              shift8to17Count += 1;
            } else if (e.shiftTime.includes('06.00') || e.shiftTime.includes('06:00') || e.shiftTime.includes('6.00')) {
              shift6to14Count += 1;
            } else {
              otherShiftCount += 1;
            }
          }
        });

        s.offDutyEmployees.forEach(e => {
          if (e.name === selectedEmployee) {
            totalOffDuty += 1;
            if (empStats[e.name]) empStats[e.name].offDuty += 1;
          }
        });

        s.leaveEmployees.forEach(e => {
          if (e.name === selectedEmployee) {
            if (empStats[e.name]) empStats[e.name].leaves += 1;
            switch (e.leaveType) {
              case 'ลาพักร้อน': totalVacation += 1; break;
              case 'ลาป่วย': totalSick += 1; break;
              case 'ลากิจ': totalPersonal += 1; break;
              case 'ขาดงาน': totalAbsent += 1; break;
              case 'วันนักขัตฤกษ์': totalHoliday += 1; break;
              default: break;
            }
          }
        });
      } else {
        totalOnDuty += s.totalOnDuty;
        totalOffDuty += s.totalOffDuty;

        s.onDutyEmployees.forEach(e => {
          if (empStats[e.name]) {
            empStats[e.name].onDuty += 1;
          }
          if (e.shiftTime.includes('08.00') || e.shiftTime.includes('08:00') || e.shiftTime.includes('8.00')) {
            shift8to17Count += 1;
          } else if (e.shiftTime.includes('06.00') || e.shiftTime.includes('06:00') || e.shiftTime.includes('6.00')) {
            shift6to14Count += 1;
          } else {
            otherShiftCount += 1;
          }
        });

        s.offDutyEmployees.forEach(e => {
          if (empStats[e.name]) {
            empStats[e.name].offDuty += 1;
          }
        });

        s.leaveEmployees.forEach(e => {
          if (empStats[e.name]) {
            empStats[e.name].leaves += 1;
          }
          switch (e.leaveType) {
            case 'ลาพักร้อน':
              totalVacation += 1;
              break;
            case 'ลาป่วย':
              totalSick += 1;
              break;
            case 'ลากิจ':
              totalPersonal += 1;
              break;
            case 'ขาดงาน':
              totalAbsent += 1;
              break;
            case 'วันนักขัตฤกษ์':
              totalHoliday += 1;
              break;
            default:
              break;
          }
        });
      }
    });

    const totalLeaves = totalVacation + totalSick + totalPersonal + totalAbsent + totalHoliday;
    const totalAllShifts = totalOnDuty + totalOffDuty + totalLeaves;

    // Status Slices
    const statusSlices = [
      { id: 'onduty', label: 'เข้างานปฏิบัติการ', count: totalOnDuty, color: '#10b981', hoverColor: '#059669' },
      { id: 'offduty', label: 'วันหยุดประจำสัปดาห์', count: totalOffDuty, color: '#64748b', hoverColor: '#475569' },
      { id: 'vacation', label: 'ลาพักร้อน', count: totalVacation, color: '#3b82f6', hoverColor: '#2563eb' },
      { id: 'sick', label: 'ลาป่วย', count: totalSick, color: '#f43f5e', hoverColor: '#e11d48' },
      { id: 'personal', label: 'ลากิจ', count: totalPersonal, color: '#f59e0b', hoverColor: '#d97706' },
      ...(totalHoliday > 0 ? [{ id: 'holiday', label: 'วันนักขัตฤกษ์', count: totalHoliday, color: '#8b5cf6', hoverColor: '#7c3aed' }] : []),
      ...(totalAbsent > 0 ? [{ id: 'absent', label: 'ขาดงาน', count: totalAbsent, color: '#ef4444', hoverColor: '#dc2626' }] : []),
    ].filter(s => s.count > 0);

    // Shift Slices
    const totalShiftTimes = shift8to17Count + shift6to14Count + otherShiftCount;
    const shiftSlices = [
      { id: 'shift8', label: 'กะ 08.00-17.00 น.', count: shift8to17Count, color: '#f97316', hoverColor: '#ea580c' },
      { id: 'shift6', label: 'กะ 06.00-14.30 น.', count: shift6to14Count, color: '#06b6d4', hoverColor: '#0891b2' },
      ...(otherShiftCount > 0 ? [{ id: 'other', label: 'กะอื่นๆ', count: otherShiftCount, color: '#a855f7', hoverColor: '#9333ea' }] : []),
    ].filter(s => s.count > 0);

    return {
      totalOnDuty,
      totalOffDuty,
      totalLeaves,
      totalAllShifts,
      totalVacation,
      totalSick,
      totalPersonal,
      totalAbsent,
      totalHoliday,
      shift8to17Count,
      shift6to14Count,
      otherShiftCount,
      totalShiftTimes,
      statusSlices,
      shiftSlices,
      empStats,
    };
  }, [filteredSchedules, allEmployees, selectedEmployee]);

  if (!isOpen) return null;

  // Helper function to build SVG Donut Pie chart
  const renderDonutChart = (
    slices: { id: string; label: string; count: number; color: string; hoverColor: string }[],
    total: number,
    centerLabel: string,
    centerValue: string | number
  ) => {
    if (total === 0) {
      return (
        <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
          <AlertTriangle className="w-6 h-6 text-slate-300 mb-1" />
          <span>ไม่มีข้อมูลตามเงื่อนไขที่เลือก</span>
        </div>
      );
    }

    let cumulativePercent = 0;
    const radius = 65;
    const strokeWidth = 28;
    const circumference = 2 * Math.PI * radius;

    return (
      <div className="relative flex items-center justify-center">
        <svg width="200" height="200" viewBox="0 0 200 200" className="rotate-[-90deg] drop-shadow-sm">
          {slices.map((slice) => {
            const percentage = slice.count / total;
            const strokeDasharray = `${percentage * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativePercent * circumference;
            cumulativePercent += percentage;
            const isHovered = hoveredSlice === slice.id;

            return (
              <circle
                key={slice.id}
                cx="100"
                cy="100"
                r={radius}
                fill="transparent"
                stroke={isHovered ? slice.hoverColor : slice.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredSlice(slice.id)}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            );
          })}
        </svg>

        {/* Center Donut Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-xl font-black text-slate-800 tracking-tight">{centerValue}</span>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{centerLabel}</span>
        </div>
      </div>
    );
  };

  const displayedEmployees = selectedEmployee !== 'all' 
    ? allEmployees.filter(e => e === selectedEmployee)
    : allEmployees;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 bg-gradient-to-r from-[#064e3b] to-[#047857] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 text-emerald-200 flex items-center justify-center shadow-xs shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  {language === 'th' ? 'สรุปสถิติตารางทำงาน' : 'Work Schedule Analytics'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/25 border border-emerald-300/40 text-emerald-100 font-bold text-xs">
                  {filteredSchedules.length} {language === 'th' ? 'วัน' : 'Days'}
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                {language === 'th'
                  ? `วิเคราะห์จาก ${filteredSchedules.length} วัน${baseSchedules.length !== filteredSchedules.length ? ` (จากทั้งหมด ${baseSchedules.length} วัน)` : ''} • สัดส่วนการปฏิบัติงาน กะการทำงาน และการลา`
                  : `Analyzed from ${filteredSchedules.length} days • Duty shifts, times, and leaves`}
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
                  ? 'bg-amber-400 text-emerald-950 font-black ring-2 ring-amber-200'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/25'
              }`}
              title={language === 'th' ? 'ตัวกรองข้อมูลสถิติ' : 'Filter Analytics'}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'th' ? 'ตัวกรอง' : 'Filter'}</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-amber-300 text-[10px] font-black flex items-center justify-center">
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
          <div className="bg-emerald-50/90 border-b border-emerald-200 p-4 sm:p-5 animate-in slide-in-from-top-2 duration-150 shrink-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-800" />
                <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                  {language === 'th' ? 'ตั้งค่าตัวกรองข้อมูลสถิติตารางทำงาน' : 'Filter Work Schedule Analytics'}
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
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทั้งหมด (All Days)' : 'All Days'}</option>
                  <option value="today">{language === 'th' ? 'วันนี้ (Today)' : 'Today'}</option>
                  <option value="this_month">{language === 'th' ? 'เดือนปัจจุบัน (This Month)' : 'This Month'}</option>
                  <option value="specific_month">{language === 'th' ? 'เลือกเดือนระบุ' : 'Specific Month'}</option>
                  <option value="custom">{language === 'th' ? 'กำหนดช่วงวันที่เอง' : 'Custom Date Range'}</option>
                </select>
              </div>

              {/* 2. Day of Week */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'th' ? 'วันในสัปดาห์ (Day)' : 'Day of Week'}
                </label>
                <select
                  value={selectedDayOfWeek}
                  onChange={(e) => setSelectedDayOfWeek(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทุกวัน (All Days)' : 'All Days'}</option>
                  <option value="weekday">{language === 'th' ? 'วันธรรมดา (จันทร์ - ศุกร์)' : 'Weekdays (Mon-Fri)'}</option>
                  <option value="weekend">{language === 'th' ? 'วันหยุดสุดสัปดาห์ (เสาร์ - อาทิตย์)' : 'Weekends (Sat-Sun)'}</option>
                  {availableDays.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* 3. Employee */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'th' ? 'พนักงาน (Staff)' : 'Employee'}
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'พนักงานทุกคน (All Staff)' : 'All Employees'}</option>
                  {allEmployees.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>

              {/* 4. Shift & Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {language === 'th' ? 'กะเวลาทำงาน (Shift Time)' : 'Shift Time'}
                </label>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="all">{language === 'th' ? 'ทุกกะเวลา (All Shifts)' : 'All Shifts'}</option>
                  <option value="shift8">{language === 'th' ? 'กะ 08.00-17.00 น.' : 'Shift 08:00 - 17:00'}</option>
                  <option value="shift6">{language === 'th' ? 'กะ 06.00-14.30 น.' : 'Shift 06:00 - 14:30'}</option>
                  <option value="other">{language === 'th' ? 'กะอื่นๆ' : 'Other Shifts'}</option>
                </select>
              </div>
            </div>

            {/* Extra Date Pickers */}
            {timeScope === 'specific_month' && (
              <div className="mt-3 pt-3 border-t border-emerald-200 flex items-center gap-3">
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
              <div className="mt-3 pt-3 border-t border-emerald-200 flex flex-wrap items-center gap-3">
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

        {/* View Mode Tabs */}
        <div className="bg-slate-100/80 px-5 py-2.5 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline mr-1">
            {language === 'th' ? 'มุมมองกราฟ:' : 'View:'}
          </span>
          <button
            type="button"
            onClick={() => setActiveChartTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeChartTab === 'all'
                ? 'bg-[#064e3b] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{language === 'th' ? 'กราฟวงกลมทั้งหมด' : 'All Donut Charts'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartTab('status')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeChartTab === 'status'
                ? 'bg-[#064e3b] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'th' ? 'สัดส่วนสถานะพนักงาน' : 'Status Distribution'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartTab('shift')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeChartTab === 'shift'
                ? 'bg-[#064e3b] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{language === 'th' ? 'สัดส่วนกะเวลาเข้างาน' : 'Shift Distribution'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartTab('staff')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeChartTab === 'staff'
                ? 'bg-[#064e3b] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'th' ? 'สถิติรายบุคคล' : 'Staff Breakdown'}</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1 text-[#1a1c1c]">
          {/* Active Filter Chips Bar */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs">
              <span className="font-bold text-emerald-950 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-emerald-700" />
                {language === 'th' ? 'เงื่อนไขที่เลือก:' : 'Active Filters:'}
              </span>

              {timeScope !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-950 font-semibold shadow-2xs">
                  📅 {timeScope === 'today' ? (language === 'th' ? 'วันนี้' : 'Today') : timeScope === 'this_month' ? (language === 'th' ? 'เดือนนี้' : 'This Month') : timeScope === 'specific_month' ? selectedMonth : `${startDate || '...'} ~ ${endDate || '...'}`}
                </span>
              )}

              {selectedDayOfWeek !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-950 font-semibold shadow-2xs">
                  ☀️ {selectedDayOfWeek === 'weekday' ? (language === 'th' ? 'วันธรรมดา' : 'Weekdays') : selectedDayOfWeek === 'weekend' ? (language === 'th' ? 'วันหยุด' : 'Weekends') : selectedDayOfWeek}
                </span>
              )}

              {selectedEmployee !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-950 font-semibold shadow-2xs">
                  👤 {selectedEmployee}
                </span>
              )}

              {selectedShift !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-950 font-semibold shadow-2xs">
                  ⏰ {selectedShift === 'shift8' ? 'กะ 08.00-17.00 น.' : selectedShift === 'shift6' ? 'กะ 06.00-14.30 น.' : 'กะอื่นๆ'}
                </span>
              )}

              {selectedStatus !== 'all' && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-950 font-semibold shadow-2xs">
                  ⚡ {selectedStatus === 'onduty' ? 'เฉพาะวันเข้างาน' : selectedStatus === 'offduty' ? 'เฉพาะวันหยุด' : 'เฉพาะการลา'}
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="ml-auto text-xs font-bold text-emerald-900 hover:text-rose-600 transition-colors cursor-pointer px-2 py-0.5"
              >
                {language === 'th' ? 'ล้างทั้งหมด' : 'Clear'}
              </button>
            </div>
          )}

          {/* 1. Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800">{language === 'th' ? 'เข้างานรวม' : 'Total On-Duty'}</span>
                <Sun className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-950 mt-1">
                {stats.totalOnDuty} <span className="text-xs font-normal text-emerald-700">{language === 'th' ? 'กะ' : 'shifts'}</span>
              </div>
              <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                {stats.totalAllShifts > 0 ? ((stats.totalOnDuty / stats.totalAllShifts) * 100).toFixed(1) : 0}% {language === 'th' ? 'ของทั้งหมด' : 'of total'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">{language === 'th' ? 'วันหยุดประจำสัปดาห์' : 'Off-Duty Days'}</span>
                <Moon className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {stats.totalOffDuty} <span className="text-xs font-normal text-slate-500">{language === 'th' ? 'ครั้ง' : 'times'}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                {stats.totalAllShifts > 0 ? ((stats.totalOffDuty / stats.totalAllShifts) * 100).toFixed(1) : 0}% {language === 'th' ? 'ของทั้งหมด' : 'of total'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800">{language === 'th' ? 'การลา / หยุด' : 'Total Leaves'}</span>
                <Plane className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-950 mt-1">
                {stats.totalLeaves} <span className="text-xs font-normal text-rose-700">{language === 'th' ? 'ครั้ง' : 'times'}</span>
              </div>
              <div className="text-[11px] text-rose-600 font-medium mt-0.5">
                {stats.totalAllShifts > 0 ? ((stats.totalLeaves / stats.totalAllShifts) * 100).toFixed(1) : 0}% {language === 'th' ? 'ของทั้งหมด' : 'of total'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800">{language === 'th' ? 'พนักงานในระบบ' : 'Staff Count'}</span>
                <Users className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-950 mt-1">
                {displayedEmployees.length} <span className="text-xs font-normal text-amber-700">{language === 'th' ? 'คน' : 'people'}</span>
              </div>
              <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                {language === 'th' ? 'เฉลี่ย' : 'Avg'} {filteredSchedules.length > 0 ? (stats.totalOnDuty / filteredSchedules.length).toFixed(1) : 0} {language === 'th' ? 'คน/วัน' : 'staff/day'}
              </div>
            </div>
          </div>

          {/* 2. PIE CHARTS SECTION (กราฟวงกลม) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 1: สัดส่วนสถานะการปฏิบัติงานและการลา */}
            {(activeChartTab === 'all' || activeChartTab === 'status') && (
              <div className={`bg-slate-50/70 rounded-3xl p-5 border border-slate-200 space-y-4 ${activeChartTab === 'status' ? 'md:col-span-2' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                    <PieIcon className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'th' ? 'กราฟวงกลม: สัดส่วนสถานะพนักงาน' : 'Staff Status Distribution'}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {language === 'th' ? `รวม ${stats.totalAllShifts} รายการ` : `Total ${stats.totalAllShifts}`}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                  {renderDonutChart(stats.statusSlices, stats.totalAllShifts, language === 'th' ? 'รายการรวม' : 'Total', stats.totalAllShifts)}

                  {/* Chart Legend */}
                  <div className="space-y-2 text-xs w-full sm:w-auto max-h-56 overflow-y-auto pr-1">
                    {stats.statusSlices.map((slice) => {
                      const pct = stats.totalAllShifts > 0 ? ((slice.count / stats.totalAllShifts) * 100).toFixed(1) : '0';
                      const isHovered = hoveredSlice === slice.id;
                      return (
                        <div
                          key={slice.id}
                          onMouseEnter={() => setHoveredSlice(slice.id)}
                          onMouseLeave={() => setHoveredSlice(null)}
                          className={`flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                            isHovered ? 'bg-white shadow-xs font-bold' : 'hover:bg-white/60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                            <span className="text-slate-700">{slice.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-bold text-slate-900">{slice.count}</span>
                            <span className="text-[11px] text-slate-400">({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Chart 2: สัดส่วนกะเวลาทำงาน */}
            {(activeChartTab === 'all' || activeChartTab === 'shift') && (
              <div className={`bg-slate-50/70 rounded-3xl p-5 border border-slate-200 space-y-4 ${activeChartTab === 'shift' ? 'md:col-span-2' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                    <Clock className="w-4 h-4 text-cyan-600" />
                    <span>{language === 'th' ? 'กราฟวงกลม: สัดส่วนกะเวลาเข้างาน' : 'Shift Time Distribution'}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {language === 'th' ? `รวม ${stats.totalShiftTimes} กะ` : `Total ${stats.totalShiftTimes} shifts`}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                  {renderDonutChart(stats.shiftSlices, stats.totalShiftTimes, language === 'th' ? 'กะเข้างาน' : 'Shifts', stats.totalShiftTimes)}

                  {/* Chart Legend */}
                  <div className="space-y-2 text-xs w-full sm:w-auto max-h-56 overflow-y-auto pr-1">
                    {stats.shiftSlices.map((slice) => {
                      const pct = stats.totalShiftTimes > 0 ? ((slice.count / stats.totalShiftTimes) * 100).toFixed(1) : '0';
                      const isHovered = hoveredSlice === slice.id;
                      return (
                        <div
                          key={slice.id}
                          onMouseEnter={() => setHoveredSlice(slice.id)}
                          onMouseLeave={() => setHoveredSlice(null)}
                          className={`flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                            isHovered ? 'bg-white shadow-xs font-bold' : 'hover:bg-white/60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                            <span className="text-slate-700">{slice.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-bold text-slate-900">{slice.count}</span>
                            <span className="text-[11px] text-slate-400">({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Individual Staff Breakdown */}
          {(activeChartTab === 'all' || activeChartTab === 'staff') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>
                    {language === 'th' 
                      ? `สถิติการปฏิบัติงานรายบุคคล (${displayedEmployees.length} ท่าน)` 
                      : `Individual Staff Statistics (${displayedEmployees.length} staff)`}
                  </span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayedEmployees.map((emp, i) => {
                  const data = stats.empStats[emp] || { onDuty: 0, offDuty: 0, leaves: 0 };
                  const totalDaysRecorded = data.onDuty + data.offDuty + data.leaves;
                  const dutyPercent = totalDaysRecorded > 0 ? Math.round((data.onDuty / totalDaysRecorded) * 100) : 0;

                  return (
                    <div key={i} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                            {emp.slice(0, 2)}
                          </div>
                          <span className="font-bold text-slate-800 text-sm">{emp}</span>
                        </div>
                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {dutyPercent}% {language === 'th' ? 'เข้างาน' : 'On-Duty'}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${totalDaysRecorded > 0 ? (data.onDuty / totalDaysRecorded) * 100 : 0}%` }}
                          className="bg-emerald-500 h-full"
                          title={`เข้างาน ${data.onDuty} วัน`}
                        />
                        <div
                          style={{ width: `${totalDaysRecorded > 0 ? (data.leaves / totalDaysRecorded) * 100 : 0}%` }}
                          className="bg-rose-400 h-full"
                          title={`ลา ${data.leaves} วัน`}
                        />
                        <div
                          style={{ width: `${totalDaysRecorded > 0 ? (data.offDuty / totalDaysRecorded) * 100 : 0}%` }}
                          className="bg-slate-300 h-full"
                          title={`หยุด ${data.offDuty} วัน`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span className="text-emerald-700 font-bold">
                          {language === 'th' ? `เข้างาน ${data.onDuty} วัน` : `Duty ${data.onDuty}d`}
                        </span>
                        <span className="text-rose-600 font-bold">
                          {language === 'th' ? `ลา ${data.leaves} วัน` : `Leave ${data.leaves}d`}
                        </span>
                        <span className="text-slate-600">
                          {language === 'th' ? `หยุด ${data.offDuty} วัน` : `Off ${data.offDuty}d`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
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
            className="px-6 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#047857] text-white font-bold text-sm shadow-md cursor-pointer transition-all"
          >
            {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
