import React, { useState } from 'react';
import { 
  X, 
  DoorOpen, 
  Calendar, 
  Building2, 
  Users, 
  Clock, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Copy, 
  Check, 
  Sparkles,
  Layers,
  History,
  Timer
} from 'lucide-react';
import { MeetingRoomBooking, MeetingStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface MeetingRoomDetailModalProps {
  isOpen: boolean;
  booking: MeetingRoomBooking | null;
  onClose: () => void;
}

export const MeetingRoomDetailModal: React.FC<MeetingRoomDetailModalProps> = ({
  isOpen,
  booking,
  onClose,
}) => {
  const { language } = useLanguage();
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen || !booking) return null;

  const handleCopy = () => {
    const textToCopy = `${booking.room} | ${booking.bookingDate} (${booking.startTime}-${booking.endTime}) | ${booking.subject} | แผนก ${booking.department} (${booking.attendeesCount} คน) | โทร ${booking.phoneNumber}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Status visual mapping
  const getStatusBadge = (status?: MeetingStatus) => {
    switch (status) {
      case 'กำลังประชุม':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: <Clock className="w-4 h-4 text-emerald-600 animate-spin" />,
          label: language === 'th' ? 'กำลังประชุมอยู่ขณะนี้' : 'In Progress',
        };
      case 'รอเริ่มวันนี้':
        return {
          bg: 'bg-amber-50 text-amber-900 border-amber-300',
          icon: <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />,
          label: language === 'th' ? 'รอเริ่มประชุมวันนี้' : 'Today (Upcoming)',
        };
      case 'นัดหมายล่วงหน้า':
        return {
          bg: 'bg-sky-50 text-sky-800 border-sky-300',
          icon: <Calendar className="w-4 h-4 text-sky-600" />,
          label: language === 'th' ? 'นัดหมายล่วงหน้า' : 'Upcoming Schedule',
        };
      case 'เสร็จสิ้นแล้ว':
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: <CheckCircle2 className="w-4 h-4 text-slate-600" />,
          label: language === 'th' ? 'เสร็จสิ้นแล้ว' : 'Completed',
        };
    }
  };

  const isTPM1 = booking.room.toUpperCase().includes('TPM 1');
  const statusInfo = getStatusBadge(booking.status);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 relative text-white ${
          isTPM1 
            ? 'bg-gradient-to-r from-[#002045] via-[#0b3366] to-[#004080]' 
            : 'bg-gradient-to-r from-[#2e1065] via-[#4c1d95] to-[#581c87]'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-md shadow-inner">
                <DoorOpen className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tracking-wider border ${
                    isTPM1 
                      ? 'bg-blue-400/20 text-blue-200 border-blue-400/30' 
                      : 'bg-purple-400/20 text-purple-200 border-purple-400/30'
                  }`}>
                    ห้อง {booking.room}
                  </span>
                  <span className="text-xs text-slate-300">
                    ลำดับที่ {booking.seq}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white line-clamp-1">
                    {booking.subject}
                  </h2>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title={language === 'th' ? 'คัดลอกข้อมูลการจอง' : 'Copy details'}
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title={language === 'th' ? 'พิมพ์ข้อมูล' : 'Print'}
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Status Banner */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${statusInfo.bg}`}>
                {statusInfo.icon}
                <span>{statusInfo.label}</span>
              </span>
              <span className="text-xs text-slate-500">
                {language === 'th' ? 'สถานะเวลาการประชุม' : 'Schedule status'}
              </span>
            </div>

            {booking.timestamp && (
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">{language === 'th' ? 'บันทึกเมื่อ' : 'Recorded at'}</span>
                <span className="text-xs font-mono font-medium text-slate-600">{booking.timestamp}</span>
              </div>
            )}
          </div>

          {/* Meeting Subject Details Box */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === 'th' ? 'เรื่องที่ประชุม / อบรม' : 'Meeting / Training Topic'}</span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 text-slate-800 text-sm font-semibold leading-relaxed">
              {booking.subject}
            </div>
          </div>

          {/* Grid Information Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. วันที่และเวลา */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{language === 'th' ? 'วันที่ใช้งาน' : 'Booking Date'}</span>
              </div>
              <p className="text-sm font-bold text-slate-800">{booking.bookingDate}</p>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5 text-blue-500" />
                  <span>{language === 'th' ? 'ช่วงเวลา' : 'Time'}</span>
                </span>
                <span className="font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {booking.startTime} - {booking.endTime} น.
                </span>
              </div>
            </div>

            {/* 2. ห้องประชุม */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <DoorOpen className="w-4 h-4 text-indigo-600" />
                <span>{language === 'th' ? 'ห้องประชุม' : 'Meeting Room'}</span>
              </div>
              <p className="text-sm font-bold text-slate-800">ห้อง {booking.room}</p>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{language === 'th' ? 'จำนวนผู้เข้าร่วม' : 'Attendees'}</span>
                </span>
                <span className="font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  {booking.attendeesCount} {language === 'th' ? 'คน' : 'persons'}
                </span>
              </div>
            </div>

            {/* 3. แผนก / ฝ่าย */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>{language === 'th' ? 'แผนก / ฝ่ายที่จอง' : 'Department'}</span>
              </div>
              <p className="text-sm font-bold text-slate-800">{booking.department}</p>
              <span className="text-xs text-slate-500 block">
                {language === 'th' ? 'หน่วยงานผู้ขอใช้บริการ' : 'Requesting unit'}
              </span>
            </div>

            {/* 4. เบอร์โทรติดต่อ */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <Phone className="w-4 h-4 text-amber-600" />
                <span>{language === 'th' ? 'เบอร์โทรศัพท์ / ต่อภายใน' : 'Contact Phone'}</span>
              </div>
              <p className="text-sm font-mono font-bold text-slate-800">
                {booking.phoneNumber ? `โทร. ${booking.phoneNumber}` : '-'}
              </p>
              <span className="text-xs text-slate-500 block">
                {language === 'th' ? 'เบอร์ประสานงานผู้จอง' : 'Internal contact'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>{language === 'th' ? 'อัปเดตตามฐานข้อมูล Google Sheet Real-time' : 'Auto-synced with Google Sheets'}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#002045] hover:bg-[#0b3366] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
