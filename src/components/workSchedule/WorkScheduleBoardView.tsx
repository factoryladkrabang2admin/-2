import React, { useState } from 'react';
import {
  Calendar,
  Sun,
  Moon,
  Plane,
  User,
  Clock,
  ChevronRight,
  Filter,
  Layers
} from 'lucide-react';
import { DailyWorkSchedule, WorkScheduleStatus } from '../../types';

interface WorkScheduleBoardViewProps {
  schedules: DailyWorkSchedule[];
  onSelectSchedule: (schedule: DailyWorkSchedule) => void;
}

export const WorkScheduleBoardView: React.FC<WorkScheduleBoardViewProps> = ({
  schedules,
  onSelectSchedule
}) => {
  const [boardGrouping, setBoardGrouping] = useState<'dayOfWeek' | 'hasLeaves'>('dayOfWeek');

  // Days of week columns
  const dayColumns = [
    { key: 'วันจันทร์', label: 'วันจันทร์', color: 'border-amber-400 bg-amber-50/50 text-amber-900', badge: 'bg-amber-100 text-amber-900 border-amber-300' },
    { key: 'วันอังคาร', label: 'วันอังคาร', color: 'border-pink-400 bg-pink-50/50 text-pink-900', badge: 'bg-pink-100 text-pink-900 border-pink-300' },
    { key: 'วันพุธ', label: 'วันพุธ', color: 'border-emerald-400 bg-emerald-50/50 text-emerald-900', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    { key: 'วันพฤหัสบดี', label: 'วันพฤหัสบดี', color: 'border-orange-400 bg-orange-50/50 text-orange-900', badge: 'bg-orange-100 text-orange-900 border-orange-300' },
    { key: 'วันศุกร์', label: 'วันศุกร์', color: 'border-sky-400 bg-sky-50/50 text-sky-900', badge: 'bg-sky-100 text-sky-900 border-sky-300' },
    { key: 'วันเสาร์', label: 'วันเสาร์', color: 'border-purple-400 bg-purple-50/50 text-purple-900', badge: 'bg-purple-100 text-purple-900 border-purple-300' },
    { key: 'วันอาทิตย์', label: 'วันอาทิตย์', color: 'border-rose-400 bg-rose-50/50 text-rose-900', badge: 'bg-red-100 text-red-900 border-red-300' },
  ];

  const getLeaveTag = (leaveType: WorkScheduleStatus) => {
    switch (leaveType) {
      case 'ลาพักร้อน':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ลาป่วย':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ลากิจ':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ขาดงาน':
        return 'bg-red-100 text-red-800 border-red-300 font-bold';
      case 'วันนักขัตฤกษ์':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Board Controls */}
      <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <Layers className="w-4 h-4 text-orange-600" />
          <span>มุมมองกระดาน (Kanban Board)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBoardGrouping('dayOfWeek')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              boardGrouping === 'dayOfWeek'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            แยกตามวันในสัปดาห์ (จ.-อา.)
          </button>
          <button
            type="button"
            onClick={() => setBoardGrouping('hasLeaves')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              boardGrouping === 'hasLeaves'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            แยกตามสถานะการลา
          </button>
        </div>
      </div>

      {/* Board Columns */}
      {boardGrouping === 'dayOfWeek' ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1200px]">
            {dayColumns.map(col => {
              const colSchedules = schedules.filter(s => s.dayOfWeek === col.key);

              return (
                <div
                  key={col.key}
                  className="w-[280px] shrink-0 bg-slate-50/70 rounded-3xl p-3.5 border border-slate-200/90 flex flex-col space-y-3"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${col.badge}`}>
                        {col.label}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {colSchedules.length} วัน
                    </span>
                  </div>

                  {/* Column Cards */}
                  <div className="space-y-3 overflow-y-auto max-h-[620px] pr-0.5">
                    {colSchedules.map(schedule => (
                      <div
                        key={schedule.id}
                        onClick={() => onSelectSchedule(schedule)}
                        className="bg-white rounded-2xl p-3.5 border border-slate-200 hover:border-orange-400 hover:shadow-md transition-all cursor-pointer space-y-2.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            {schedule.formattedDate}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
                            <Sun className="w-3 h-3 text-emerald-600" />
                            {schedule.totalOnDuty} คน
                          </span>
                        </div>

                        {/* Leaves if any */}
                        {schedule.totalLeaves > 0 && (
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {schedule.leaveEmployees.map((l, i) => (
                                <span
                                  key={i}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${getLeaveTag(l.leaveType)}`}
                                >
                                  <Plane className="w-2.5 h-2.5" />
                                  {l.name} ({l.leaveType})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* On Duty Staff Snippet */}
                        <div className="space-y-1 pt-1 border-t border-slate-100">
                          <div className="text-[11px] text-slate-500 font-medium truncate">
                            {schedule.onDutyEmployees.map(e => e.name).join(', ')}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[10px] text-orange-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>คลิกดูรายละเอียด</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    ))}

                    {colSchedules.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-400">
                        ไม่มีตารางงาน
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Board grouped by leaves vs standard on-duty */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Normal On Duty */}
          <div className="bg-slate-50/70 rounded-3xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-800 text-sm">เข้างานปกติ ไม่มีพนักงานลา</span>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-0.5 rounded-lg border">
                {schedules.filter(s => s.totalLeaves === 0).length} วัน
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
              {schedules.filter(s => s.totalLeaves === 0).map(schedule => (
                <div
                  key={schedule.id}
                  onClick={() => onSelectSchedule(schedule)}
                  className="bg-white rounded-2xl p-3 border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{schedule.formattedDate}</span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {schedule.totalOnDuty} คน
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {schedule.onDutyEmployees.map(e => e.name).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Has Leaves */}
          <div className="bg-rose-50/40 rounded-3xl p-4 border border-rose-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-rose-200">
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-rose-600" />
                <span className="font-bold text-rose-900 text-sm">มีพนักงานลา / หยุดพิเศษ</span>
              </div>
              <span className="text-xs font-bold text-rose-800 bg-white px-2.5 py-0.5 rounded-lg border border-rose-200">
                {schedules.filter(s => s.totalLeaves > 0).length} วัน
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
              {schedules.filter(s => s.totalLeaves > 0).map(schedule => (
                <div
                  key={schedule.id}
                  onClick={() => onSelectSchedule(schedule)}
                  className="bg-white rounded-2xl p-3.5 border border-rose-200 hover:border-rose-400 hover:shadow-md transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{schedule.formattedDate}</span>
                    <span className="text-[11px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                      ลา {schedule.totalLeaves} คน
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {schedule.leaveEmployees.map((l, i) => (
                      <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] border ${getLeaveTag(l.leaveType)}`}>
                        {l.name} ({l.leaveType})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
