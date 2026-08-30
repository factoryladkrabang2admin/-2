import React from 'react';
import { Filter, X, Search, RotateCcw } from 'lucide-react';

interface WorkScheduleFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedDay: string;
  setSelectedDay: (val: string) => void;
  selectedMonth: string;
  setSelectedMonth: (val: string) => void;
  selectedEmployee: string;
  setSelectedEmployee: (val: string) => void;
  selectedStatus: string;
  setSelectedStatus: (val: string) => void;
  dayOptions: string[];
  monthOptions: string[];
  allEmployees: string[];
  onResetFilters: () => void;
}

export const WorkScheduleFilterModal: React.FC<WorkScheduleFilterModalProps> = ({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  selectedDay,
  setSelectedDay,
  selectedMonth,
  setSelectedMonth,
  selectedEmployee,
  setSelectedEmployee,
  selectedStatus,
  setSelectedStatus,
  dayOptions,
  monthOptions,
  allEmployees,
  onResetFilters
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-black text-slate-900 text-lg">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shadow-xs">
              <Filter className="w-5 h-5" />
            </div>
            ตัวกรองตารางทำงาน
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="space-y-4">
          {/* Search Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ค้นหาคำสำคัญ</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ชื่อพนักงาน, วันที่, ประเภทการลา..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Day of Week */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">เลือกวันในสัปดาห์</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="all">ทุกวันในสัปดาห์</option>
              {dayOptions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">เลือกเดือน</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="all">ทุกเดือน</option>
              {monthOptions.map(m => (
                <option key={m} value={m}>เดือน {m}</option>
              ))}
            </select>
          </div>

          {/* Employee */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">เลือกพนักงาน</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="all">พนักงานทุกคน</option>
              {allEmployees.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Status Focus */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทสถานะ</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="all">ทั้งหมด</option>
              <option value="has_leave">เฉพาะวันที่มีพนักงานลา</option>
              <option value="weekend_only">เฉพาะวันเสาร์-อาทิตย์</option>
              <option value="weekday_only">เฉพาะวันจันทร์-ศุกร์</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            ล้างค่าตัวกรอง
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-sm transition-all"
          >
            นำไปใช้
          </button>
        </div>
      </div>
    </div>
  );
};
