import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  PieChart as PieChartIcon, 
  DoorOpen, 
  Users, 
  Building2, 
  Sparkles,
  CalendarCheck,
  TrendingUp,
  Clock
} from 'lucide-react';
import { MeetingRoomBooking } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface MeetingRoomAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: MeetingRoomBooking[];
}

export const MeetingRoomAnalyticsModal: React.FC<MeetingRoomAnalyticsModalProps> = ({
  isOpen,
  onClose,
  bookings,
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'rooms' | 'departments' | 'status'>('rooms');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  const totalBookings = bookings.length;
  const totalAttendees = useMemo(() => bookings.reduce((sum, b) => sum + (b.attendeesCount || 0), 0), [bookings]);
  const avgAttendees = totalBookings > 0 ? (totalAttendees / totalBookings).toFixed(1) : '0';

  // 1. Room Distribution Data (TPM 1 vs TPM 2 vs Other)
  const roomData = useMemo(() => {
    const tpm1 = bookings.filter((b) => b.room.toUpperCase().includes('TPM 1'));
    const tpm2 = bookings.filter((b) => b.room.toUpperCase().includes('TPM 2'));
    const other = bookings.filter((b) => !b.room.toUpperCase().includes('TPM 1') && !b.room.toUpperCase().includes('TPM 2'));

    const items = [
      {
        id: 'tpm1',
        name: 'ห้องประชุม TPM 1',
        count: tpm1.length,
        attendees: tpm1.reduce((sum, b) => sum + (b.attendeesCount || 0), 0),
        color: '#2563eb', // Blue
        bgColor: 'bg-blue-500',
        lightBg: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-700',
        percentage: totalBookings > 0 ? Math.round((tpm1.length / totalBookings) * 100) : 0,
      },
      {
        id: 'tpm2',
        name: 'ห้องประชุม TPM 2',
        count: tpm2.length,
        attendees: tpm2.reduce((sum, b) => sum + (b.attendeesCount || 0), 0),
        color: '#9333ea', // Purple
        bgColor: 'bg-purple-500',
        lightBg: 'bg-purple-50',
        borderColor: 'border-purple-200',
        textColor: 'text-purple-700',
        percentage: totalBookings > 0 ? Math.round((tpm2.length / totalBookings) * 100) : 0,
      },
    ];

    if (other.length > 0) {
      items.push({
        id: 'other',
        name: 'ห้องอื่นๆ',
        count: other.length,
        attendees: other.reduce((sum, b) => sum + (b.attendeesCount || 0), 0),
        color: '#64748b', // Slate
        bgColor: 'bg-slate-500',
        lightBg: 'bg-slate-50',
        borderColor: 'border-slate-200',
        textColor: 'text-slate-700',
        percentage: totalBookings > 0 ? Math.round((other.length / totalBookings) * 100) : 0,
      });
    }

    return items;
  }, [bookings, totalBookings]);

  // 2. Department Distribution Data
  const deptData = useMemo(() => {
    const deptMap: Record<string, { count: number; attendees: number }> = {};
    bookings.forEach((b) => {
      const dept = (b.department || 'ไม่ระบุ').trim();
      if (!deptMap[dept]) {
        deptMap[dept] = { count: 0, attendees: 0 };
      }
      deptMap[dept].count += 1;
      deptMap[dept].attendees += (b.attendeesCount || 0);
    });

    const palette = [
      '#0284c7', // Sky
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#06b6d4', // Cyan
      '#f97316', // Orange
      '#64748b', // Slate
    ];

    return Object.entries(deptMap)
      .map(([name, data], idx) => ({
        id: `dept-${idx}`,
        name,
        count: data.count,
        attendees: data.attendees,
        color: palette[idx % palette.length],
        percentage: totalBookings > 0 ? Math.round((data.count / totalBookings) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [bookings, totalBookings]);

  // 3. Status Distribution Data
  const statusData = useMemo(() => {
    const sMap: Record<string, number> = {
      'เสร็จสิ้นแล้ว': 0,
      'กำลังประชุม': 0,
      'รอเริ่มวันนี้': 0,
      'นัดหมายล่วงหน้า': 0,
    };
    bookings.forEach((b) => {
      const s = b.status || 'นัดหมายล่วงหน้า';
      sMap[s] = (sMap[s] || 0) + 1;
    });

    const colorConfigs: Record<string, { color: string; bg: string }> = {
      'เสร็จสิ้นแล้ว': { color: '#10b981', bg: 'bg-emerald-500' },
      'กำลังประชุม': { color: '#0284c7', bg: 'bg-sky-500' },
      'รอเริ่มวันนี้': { color: '#f59e0b', bg: 'bg-amber-500' },
      'นัดหมายล่วงหน้า': { color: '#6366f1', bg: 'bg-indigo-500' },
    };

    return Object.entries(sMap)
      .map(([name, count], idx) => ({
        id: `status-${idx}`,
        name,
        count,
        color: colorConfigs[name]?.color || '#64748b',
        percentage: totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0,
      }))
      .filter((item) => item.count > 0);
  }, [bookings, totalBookings]);

  // Select active dataset for circular donut chart
  const currentChartItems = useMemo(() => {
    if (activeTab === 'rooms') return roomData;
    if (activeTab === 'departments') return deptData;
    return statusData;
  }, [activeTab, roomData, deptData, statusData]);

  // Calculate circular SVG donut stroke geometry
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  const donutSegments = currentChartItems.map((item, index) => {
    const fraction = totalBookings > 0 ? item.count / totalBookings : 0;
    const strokeLength = fraction * circumference;
    const dashOffset = accumulatedOffset;
    accumulatedOffset += strokeLength;

    return {
      ...item,
      strokeLength,
      dashOffset,
      isHovered: hoveredIndex === index,
    };
  });

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#002045] via-[#0b3366] to-[#1e3a8a] text-white p-6 relative flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-md">
              <PieChartIcon className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  {language === 'th' ? 'สถิติและการใช้งานห้องประชุม' : 'Meeting Room Analytics & Statistics'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-[11px] font-bold text-blue-200">
                  {totalBookings} {language === 'th' ? 'รายการ' : 'bookings'}
                </span>
              </div>
              <p className="text-xs text-blue-200/90 mt-0.5">
                {language === 'th' 
                  ? 'กราฟวงกลมแสดงสัดส่วนการใช้ห้องประชุม แผนก และผู้เข้าร่วม' 
                  : 'Circular donut graphs showing room usage breakdown, departments & attendees'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-blue-900">{language === 'th' ? 'จองทั้งหมด' : 'Total'}</p>
                <p className="text-lg font-black text-blue-950">{totalBookings} <span className="text-xs font-normal text-blue-700">{language === 'th' ? 'ครั้ง' : ''}</span></p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <DoorOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-purple-900">TPM 1 / TPM 2</p>
                <p className="text-lg font-black text-purple-950">
                  {roomData.find(r => r.id === 'tpm1')?.count || 0} / {roomData.find(r => r.id === 'tpm2')?.count || 0}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-emerald-900">{language === 'th' ? 'ผู้เข้าร่วมรวม' : 'Attendees'}</p>
                <p className="text-lg font-black text-emerald-950">{totalAttendees} <span className="text-xs font-normal text-emerald-700">{language === 'th' ? 'คน' : ''}</span></p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-amber-900">{language === 'th' ? 'เฉลี่ยต่อครั้ง' : 'Avg / Meeting'}</p>
                <p className="text-lg font-black text-amber-950">{avgAttendees} <span className="text-xs font-normal text-amber-700">{language === 'th' ? 'คน' : ''}</span></p>
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => { setActiveTab('rooms'); setHoveredIndex(null); }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'rooms'
                  ? 'bg-white text-[#002045] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DoorOpen className="w-4 h-4 text-blue-600" />
              <span>{language === 'th' ? 'กราฟวงกลม: สัดส่วนห้องประชุม' : 'Donut: By Meeting Room'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('departments'); setHoveredIndex(null); }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'departments'
                  ? 'bg-white text-[#002045] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4 text-purple-600" />
              <span>{language === 'th' ? 'กราฟวงกลม: แยกตามแผนก/ฝ่าย' : 'Donut: By Department'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('status'); setHoveredIndex(null); }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'status'
                  ? 'bg-white text-[#002045] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>{language === 'th' ? 'กราฟวงกลม: แยกตามสถานะ' : 'Donut: By Status'}</span>
            </button>
          </div>

          {/* Circular Donut Graph Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-slate-50/70 p-6 rounded-3xl border border-slate-200">
            {/* SVG Circular Donut Chart */}
            <div className="md:col-span-6 flex flex-col items-center justify-center relative select-none">
              <div className="relative w-56 h-56 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  {/* Background Track Circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    className="stroke-slate-200"
                    strokeWidth="24"
                    fill="transparent"
                  />

                  {/* Circular Donut Segments */}
                  {totalBookings > 0 && donutSegments.map((seg, idx) => (
                    <circle
                      key={seg.id}
                      cx="100"
                      cy="100"
                      r={radius}
                      stroke={seg.color}
                      strokeWidth={seg.isHovered ? '28' : '24'}
                      strokeDasharray={`${seg.strokeLength} ${circumference}`}
                      strokeDashoffset={-seg.dashOffset}
                      fill="transparent"
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        filter: seg.isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))' : 'none',
                      }}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  ))}
                </svg>

                {/* Donut Center Core Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
                  {hoveredIndex !== null && donutSegments[hoveredIndex] ? (
                    <div className="animate-in zoom-in-75 duration-150">
                      <p className="text-2xl font-black text-slate-800">
                        {donutSegments[hoveredIndex].percentage}%
                      </p>
                      <p className="text-[11px] font-bold text-slate-600 truncate max-w-[120px]">
                        {donutSegments[hoveredIndex].name}
                      </p>
                      <p className="text-[10px] font-bold text-blue-700">
                        {donutSegments[hoveredIndex].count} {language === 'th' ? 'รายการ' : 'items'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-3xl font-black text-[#002045]">{totalBookings}</p>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {language === 'th' ? 'การจองทั้งหมด' : 'Total Bookings'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-400 text-xs mt-2">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{language === 'th' ? 'นำเมาส์ชี้ที่แถบวงกลมเพื่อดูสัดส่วน' : 'Hover over segments to inspect'}</span>
              </div>
            </div>

            {/* Breakdown Legend List */}
            <div className="md:col-span-6 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                {activeTab === 'rooms' && (language === 'th' ? 'สัดส่วนและจำนวนคนตามห้องประชุม' : 'Breakdown by Room')}
                {activeTab === 'departments' && (language === 'th' ? 'สัดส่วนการจองแยกตามแผนก/ฝ่าย' : 'Breakdown by Department')}
                {activeTab === 'status' && (language === 'th' ? 'สัดส่วนตามสถานะการประชุม' : 'Breakdown by Status')}
              </h4>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {currentChartItems.map((item, idx) => {
                  const isHov = hoveredIndex === idx;
                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isHov
                          ? 'bg-white border-blue-400 shadow-md ring-2 ring-blue-200'
                          : 'bg-white/80 hover:bg-white border-slate-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                          {'attendees' in item && (
                            <p className="text-[10px] text-slate-500">
                              {language === 'th' ? 'ผู้เข้าร่วม:' : 'Attendees:'} {(item as any).attendees} {language === 'th' ? 'คน' : 'people'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <p className="text-xs font-black text-slate-800">
                          {item.count} <span className="text-[10px] font-normal text-slate-500">{language === 'th' ? 'ครั้ง' : ''}</span>
                        </p>
                        <p className="text-[11px] font-bold text-blue-600 font-mono">
                          {item.percentage}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            {language === 'th' ? 'อัปเดตข้อมูลอัตโนมัติจาก Google Sheet' : 'Auto-synced with Google Sheet'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#002045] hover:bg-[#0b3366] text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
