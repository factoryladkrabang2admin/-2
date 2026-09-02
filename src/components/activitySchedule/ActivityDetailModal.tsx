import React from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  Bus,
  Users,
  X,
  Sparkles,
  CalendarCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ActivityScheduleRecord } from '../../types';

interface ActivityDetailModalProps {
  activity: ActivityScheduleRecord | null;
  onClose: () => void;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activity,
  onClose,
}) => {
  if (!activity) return null;

  const getDayBadge = (day: string) => {
    if (day.includes('อาทิตย์')) return 'bg-rose-100 text-rose-800 border-rose-200';
    if (day.includes('จันทร์')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (day.includes('อังคาร')) return 'bg-pink-100 text-pink-800 border-pink-200';
    if (day.includes('พุธ')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (day.includes('พฤหัส')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (day.includes('ศุกร์')) return 'bg-sky-100 text-sky-800 border-sky-200';
    if (day.includes('เสาร์')) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const getStatusBadge = (status: ActivityScheduleRecord['status']) => {
    switch (status) {
      case 'today':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            วันนี้ (Today)
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
            กำลังจะมาถึง
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
            เสร็จสิ้นแล้ว
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-emerald-200 shadow-2xl p-6 sm:p-7 space-y-6 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shrink-0">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${getDayBadge(activity.dayOfWeek)}`}>
                  {activity.dayOfWeek || 'วันที่'}
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {activity.formattedDate}
                </span>
                {getStatusBadge(activity.status)}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 truncate">
                {activity.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Activity Details Grid */}
        <div className="space-y-4">
          {/* Time Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-emerald-900/70">กำหนดการเวลา</div>
              <div className="text-base font-black text-emerald-950 mt-0.5">
                {activity.timeRange}
              </div>
              <div className="text-xs text-emerald-800/80 mt-0.5">
                เริ่มต้น {activity.startTime || '-'} ถึง {activity.endTime || '-'}
              </div>
            </div>
          </div>

          {/* Location Card */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-blue-900/70">สถานที่จัดกิจกรรม</div>
              <div className="text-base font-black text-blue-950 mt-0.5">
                {activity.location}
              </div>
            </div>
          </div>

          {/* Vehicle Shuttle Card */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Bus className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-amber-900/70">ข้อมูลรถรับ-ส่ง</div>
              {activity.vehicleDepartureTime || activity.vehicleReturnTime ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  <div className="px-3 py-2 rounded-xl bg-white/90 border border-amber-200">
                    <span className="text-xs text-amber-800 font-medium">เวลารถออก:</span>
                    <div className="text-sm font-black text-amber-950">
                      {activity.vehicleDepartureTime || '-'}
                    </div>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-white/90 border border-amber-200">
                    <span className="text-xs text-amber-800 font-medium">เวลารถกลับ:</span>
                    <div className="text-sm font-black text-amber-950">
                      {activity.vehicleReturnTime || '-'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-medium text-amber-900/70 mt-0.5">
                  ไม่มีบริการรถรับ-ส่ง หรือเดินทางด้วยตนเอง
                </div>
              )}
            </div>
          </div>

          {/* Participants Card */}
          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-purple-900/70">
                ผู้เข้าร่วม / พนักงาน ({activity.participantList.length} คน/กลุ่ม)
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {activity.participantList.map((person, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white border border-purple-200 text-purple-950 text-xs font-bold shadow-2xs"
                  >
                    <Users className="w-3 h-3 text-purple-500" />
                    {person}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 pt-4">
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
