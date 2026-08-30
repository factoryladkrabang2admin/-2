import React, { useState } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { DailyWorkSchedule } from '../../types';

interface WorkScheduleAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: DailyWorkSchedule[];
  allEmployees: string[];
}

export const WorkScheduleAnalyticsModal: React.FC<WorkScheduleAnalyticsModalProps> = ({
  isOpen,
  onClose,
  schedules,
  allEmployees
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Calculate overall counts
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

  // Per-employee attendance
  const empStats: Record<string, { onDuty: number; offDuty: number; leaves: number }> = {};
  allEmployees.forEach(emp => {
    empStats[emp] = { onDuty: 0, offDuty: 0, leaves: 0 };
  });

  schedules.forEach(s => {
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
  });

  const totalLeaves = totalVacation + totalSick + totalPersonal + totalAbsent + totalHoliday;
  const totalAllShifts = totalOnDuty + totalOffDuty + totalLeaves;

  // Pie Chart 1: Status Distribution
  const statusSlices = [
    { id: 'onduty', label: 'เข้างานปฏิบัติการ', count: totalOnDuty, color: '#10b981', hoverColor: '#059669' },
    { id: 'offduty', label: 'วันหยุดประจำสัปดาห์', count: totalOffDuty, color: '#64748b', hoverColor: '#475569' },
    { id: 'vacation', label: 'ลาพักร้อน', count: totalVacation, color: '#3b82f6', hoverColor: '#2563eb' },
    { id: 'sick', label: 'ลาป่วย', count: totalSick, color: '#f43f5e', hoverColor: '#e11d48' },
    { id: 'personal', label: 'ลากิจ', count: totalPersonal, color: '#f59e0b', hoverColor: '#d97706' },
    ...(totalHoliday > 0 ? [{ id: 'holiday', label: 'วันนักขัตฤกษ์', count: totalHoliday, color: '#8b5cf6', hoverColor: '#7c3aed' }] : []),
    ...(totalAbsent > 0 ? [{ id: 'absent', label: 'ขาดงาน', count: totalAbsent, color: '#ef4444', hoverColor: '#dc2626' }] : []),
  ].filter(s => s.count > 0);

  // Pie Chart 2: Shift Distribution
  const totalShiftTimes = shift8to17Count + shift6to14Count + otherShiftCount;
  const shiftSlices = [
    { id: 'shift8', label: 'กะ 08.00-17.00 น.', count: shift8to17Count, color: '#f97316', hoverColor: '#ea580c' },
    { id: 'shift6', label: 'กะ 06.00-14.30 น.', count: shift6to14Count, color: '#06b6d4', hoverColor: '#0891b2' },
    ...(otherShiftCount > 0 ? [{ id: 'other', label: 'กะอื่นๆ', count: otherShiftCount, color: '#a855f7', hoverColor: '#9333ea' }] : []),
  ].filter(s => s.count > 0);

  // Helper function to build SVG Donut Pie chart
  const renderDonutChart = (
    slices: { id: string; label: string; count: number; color: string; hoverColor: string }[],
    total: number,
    centerLabel: string,
    centerValue: string | number
  ) => {
    if (total === 0) {
      return (
        <div className="h-44 flex items-center justify-center text-slate-400 text-sm">
          ไม่มีข้อมูลสำหรับแสดงผล
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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 shadow-2xl p-5 sm:p-7 space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center shadow-xs">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">สรุปสถิติตารางทำงาน</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold text-xs">
                  {schedules.length} วัน
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                วิเคราะห์สัดส่วนการปฏิบัติงาน กะการทำงาน และการลาของพนักงาน
              </p>
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

        {/* 1. Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">เข้างานรวม</span>
              <Sun className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-950 mt-1">{totalOnDuty} <span className="text-xs font-normal text-emerald-700">กะ</span></div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {totalAllShifts > 0 ? ((totalOnDuty / totalAllShifts) * 100).toFixed(1) : 0}% ของทั้งหมด
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">วันหยุดประจำสัปดาห์</span>
              <Moon className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalOffDuty} <span className="text-xs font-normal text-slate-500">ครั้ง</span></div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              {totalAllShifts > 0 ? ((totalOffDuty / totalAllShifts) * 100).toFixed(1) : 0}% ของทั้งหมด
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800">การลา / หยุด</span>
              <Plane className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-950 mt-1">{totalLeaves} <span className="text-xs font-normal text-rose-700">ครั้ง</span></div>
            <div className="text-[11px] text-rose-600 font-medium mt-0.5">
              {totalAllShifts > 0 ? ((totalLeaves / totalAllShifts) * 100).toFixed(1) : 0}% ของทั้งหมด
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-800">พนักงานในระบบ</span>
              <Users className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl font-black text-orange-950 mt-1">{allEmployees.length} <span className="text-xs font-normal text-orange-700">คน</span></div>
            <div className="text-[11px] text-orange-600 font-medium mt-0.5">
              เฉลี่ย {schedules.length > 0 ? (totalOnDuty / schedules.length).toFixed(1) : 0} คน/วัน
            </div>
          </div>
        </div>

        {/* 2. PIE CHARTS SECTION (กราฟวงกลม) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart 1: สัดส่วนสถานะการปฏิบัติงานและการลา */}
          <div className="bg-slate-50/60 rounded-3xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <PieIcon className="w-4 h-4 text-orange-600" />
                กราฟวงกลม: สัดส่วนสถานะพนักงาน
              </div>
              <span className="text-xs font-semibold text-slate-500">รวม {totalAllShifts} รายการ</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              {renderDonutChart(statusSlices, totalAllShifts, 'รายการรวม', totalAllShifts)}

              {/* Chart Legend */}
              <div className="space-y-2 text-xs w-full sm:w-auto">
                {statusSlices.map((slice) => {
                  const pct = totalAllShifts > 0 ? ((slice.count / totalAllShifts) * 100).toFixed(1) : '0';
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

          {/* Chart 2: สัดส่วนกะเวลาทำงาน */}
          <div className="bg-slate-50/60 rounded-3xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <PieIcon className="w-4 h-4 text-cyan-600" />
                กราฟวงกลม: สัดส่วนกะเวลาเข้างาน
              </div>
              <span className="text-xs font-semibold text-slate-500">รวม {totalShiftTimes} กะ</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              {renderDonutChart(shiftSlices, totalShiftTimes, 'กะเข้างาน', totalShiftTimes)}

              {/* Chart Legend */}
              <div className="space-y-2 text-xs w-full sm:w-auto">
                {shiftSlices.map((slice) => {
                  const pct = totalShiftTimes > 0 ? ((slice.count / totalShiftTimes) * 100).toFixed(1) : '0';
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
        </div>

        {/* 3. Individual Staff Breakdown */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-600" />
              สถิติการปฏิบัติงานรายบุคคล ({allEmployees.length} ท่าน)
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allEmployees.map((emp, i) => {
              const data = empStats[emp] || { onDuty: 0, offDuty: 0, leaves: 0 };
              const totalDaysRecorded = data.onDuty + data.offDuty + data.leaves;
              const dutyPercent = totalDaysRecorded > 0 ? Math.round((data.onDuty / totalDaysRecorded) * 100) : 0;

              return (
                <div key={i} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-800 font-bold text-xs flex items-center justify-center">
                        {emp.slice(0, 2)}
                      </div>
                      <span className="font-bold text-slate-800 text-sm">{emp}</span>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {dutyPercent}% เข้างาน
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
                    <span className="text-emerald-700 font-bold">เข้างาน {data.onDuty} วัน</span>
                    <span className="text-rose-600 font-bold">ลา {data.leaves} วัน</span>
                    <span className="text-slate-600">หยุด {data.offDuty} วัน</span>
                  </div>
                </div>
              );
            })}
          </div>
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
