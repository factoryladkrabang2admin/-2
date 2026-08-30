import React from 'react';
import {
  CalendarDays,
  Sun,
  Plane,
  Moon,
  X
} from 'lucide-react';
import { DailyWorkSchedule, WorkScheduleStatus } from '../../types';
import { getScheduleEmployeeDepartment } from '../../services/googleSheetSyncService';

interface WorkScheduleDetailModalProps {
  schedule: DailyWorkSchedule | null;
  onClose: () => void;
  getDayBadge: (day: string) => string;
  getLeaveTag: (leaveType: WorkScheduleStatus) => string;
}

export const WorkScheduleDetailModal: React.FC<WorkScheduleDetailModalProps> = ({
  schedule,
  onClose,
  getDayBadge,
  getLeaveTag
}) => {
  if (!schedule) return null;

  const getDepartment = (name: string, fallbackDept?: string) => {
    return getScheduleEmployeeDepartment(name) || fallbackDept || 'ฝ่ายปฏิบัติการ';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center shadow-xs">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${getDayBadge(schedule.dayOfWeek)}`}>
                  {schedule.dayOfWeek}
                </span>
                <h2 className="text-xl font-bold text-slate-900">{schedule.formattedDate}</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">รายละเอียดกะการทำงานและสถานะพนักงานประจำวัน</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shift Breakdown */}
        <div className="space-y-4">
          {/* On-Duty Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-600" />
              พนักงานปฏิบัติงานตามกะ ({schedule.onDutyEmployees.length} คน)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {schedule.onDutyEmployees.map((emp, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">{emp.name}</div>
                    <div className="text-xs text-emerald-800/80 font-medium">{getDepartment(emp.name, emp.department)}</div>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 px-2.5 py-1 rounded-lg bg-emerald-100/90 border border-emerald-200">
                    {emp.shiftTime}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Leaves Section */}
          {schedule.leaveEmployees.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-sm font-bold text-rose-800 flex items-center gap-2">
                <Plane className="w-4 h-4 text-rose-600" />
                พนักงาน ลา / หยุด ({schedule.leaveEmployees.length} คน)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {schedule.leaveEmployees.map((emp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/60 border border-rose-200"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">{emp.name}</div>
                      <div className="text-xs text-rose-800/80 font-medium">{getDepartment(emp.name, emp.department)}</div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getLeaveTag(emp.leaveType)}`}>
                      {emp.leaveType}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Off Duty Section */}
          {schedule.offDutyEmployees.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Moon className="w-4 h-4 text-slate-500" />
                วันหยุดประจำสัปดาห์ / ไม่เข้ากะ ({schedule.offDutyEmployees.length} คน)
              </h4>
              <div className="flex flex-wrap gap-2">
                {schedule.offDutyEmployees.map((emp, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200"
                  >
                    {emp.name} ({getDepartment(emp.name, emp.department)})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
