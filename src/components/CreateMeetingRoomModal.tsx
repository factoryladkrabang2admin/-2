import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  CalendarPlus,
  Clock,
  Calendar,
  Building,
  Users,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Check,
  DoorOpen
} from 'lucide-react';
import { MeetingRoomBooking } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { submitMeetingRoomBooking } from '../services/googleSheetSyncService';
import { AdminUserAccount, isUserAdminOrSupervisor } from '../data/mockData';
import { SuggestiveInput } from './SuggestiveInput';

interface CreateMeetingRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingCreated?: (newBooking: MeetingRoomBooking) => void;
  currentUser?: AdminUserAccount | null;
  isAuthenticated?: boolean;
  existingBookings?: MeetingRoomBooking[];
}

export const CreateMeetingRoomModal: React.FC<CreateMeetingRoomModalProps> = ({
  isOpen,
  onClose,
  onBookingCreated,
  currentUser,
  isAuthenticated = true,
  existingBookings = [],
}) => {
  const { language } = useLanguage();
  const wasOpenRef = useRef<boolean>(false);

  // Check administrator / supervisor authorization
  const isAuthorized = useMemo(() => {
    return isUserAdminOrSupervisor(currentUser, isAuthenticated);
  }, [currentUser, isAuthenticated]);

  // Form Fields
  const [room, setRoom] = useState<'TPM 1' | 'TPM 2'>('TPM 1');
  const [bookingDate, setBookingDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [attendeesCount, setAttendeesCount] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  // Suggestions for Department & Phone Number
  const [savedDepartments, setSavedDepartments] = useState<string[]>([]);
  const [savedPhoneNumbers, setSavedPhoneNumbers] = useState<string[]>([]);

  // Load remembered departments and phone numbers from localStorage & existing bookings
  useEffect(() => {
    if (!isOpen) return;

    // 1. Departments
    const deptSet = new Set<string>();
    const defaultDepts = [
      'แผนกเทคนิคการผลิต 4',
      'ฝ่ายทรัพยากรบุคคล',
      'แผนกฝึกอบรมและสนับสนุนกิจกรรม',
      'แผนกสนับสนุนและประสานงาน',
      'แผนกวิศวกรรมพลังงาน',
      'ธุรการลาดกระบัง 2',
      'ความปลอดภัยและอาชีวอนามัย (SHE)',
      'ฝ่ายเทคโนโลยีสารสนเทศ (IT)',
      'ฝ่ายผลิต',
      'ฝ่ายประกันคุณภาพ (QA/QC)',
      'แผนกเงินเดือนและค่าจ้าง',
      'แผนกซ่อมบำรุง',
      'คลังสินค้าและโลจิสติกส์',
    ];
    defaultDepts.forEach((d) => deptSet.add(d));

    // From existing bookings
    if (existingBookings && Array.isArray(existingBookings)) {
      existingBookings.forEach((b) => {
        const d = (b.department || '').trim();
        if (d && d.length >= 2) deptSet.add(d);
      });
    }

    // From localStorage
    try {
      const saved = localStorage.getItem('proworkflow_meeting_departments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((d) => {
            if (typeof d === 'string' && d.trim()) deptSet.add(d.trim());
          });
        }
      }
    } catch {
      // ignore
    }

    setSavedDepartments(Array.from(deptSet));

    // 2. Phone Numbers / Extensions
    const phoneSet = new Set<string>();
    const defaultPhones = ['4510', '4520', '2201', '2202', '1101', '1102', '3301'];
    defaultPhones.forEach((p) => phoneSet.add(p));

    if (existingBookings && Array.isArray(existingBookings)) {
      existingBookings.forEach((b) => {
        const p = (b.phoneNumber || '').trim();
        if (p && p !== '-' && p !== 'ไม่ระบุ' && p.length >= 2) {
          phoneSet.add(p);
        }
      });
    }

    try {
      const savedP = localStorage.getItem('proworkflow_meeting_phone_numbers');
      if (savedP) {
        const parsedP = JSON.parse(savedP);
        if (Array.isArray(parsedP)) {
          parsedP.forEach((p) => {
            if (typeof p === 'string' && p.trim() && p.trim() !== '-') {
              phoneSet.add(p.trim());
            }
          });
        }
      }
    } catch {
      // ignore
    }

    setSavedPhoneNumbers(Array.from(phoneSet));
  }, [isOpen, existingBookings]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCreatedBooking, setLastCreatedBooking] = useState<MeetingRoomBooking | null>(null);

  // Initialize fields on open (only once per modal opening to prevent form reset on background syncs)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setIsSuccess(false);
      setErrorMessage(null);
      setLastCreatedBooking(null);

      setBookingDate('');
      setRoom('TPM 1');
      setStartTime('');
      setEndTime('');
      setSubject('');
      setAttendeesCount('');
      setDepartment('');
      setPhoneNumber('');
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen]);

  // Convert time to minutes for comparison
  const timeToMinutes = (t: string) => {
    const parts = (t || '00:00').replace('.', ':').split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  };

  // Check for time overlap conflicts with existing bookings
  const conflictingBooking = useMemo(() => {
    if (!bookingDate || !startTime || !endTime || !room) return null;

    // Format target date
    const [y, m, d] = bookingDate.split('-');
    const targetDateFormatted = `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;

    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);

    if (newStart >= newEnd) return null;

    return (
      existingBookings.find((b) => {
        // Must match room and date
        const rMatch = b.room.toUpperCase().replace(/\s+/g, '') === room.toUpperCase().replace(/\s+/g, '');
        if (!rMatch) return false;

        // Check date matching
        const bDate = b.bookingDate.trim();
        const dateMatches =
          bDate === targetDateFormatted ||
          bDate === `${d}/${m}/${y}` ||
          bDate === bookingDate;

        if (!dateMatches) return false;

        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);

        // Overlap condition: start < other.end && end > other.start
        return newStart < bEnd && newEnd > bStart;
      }) || null
    );
  }, [bookingDate, startTime, endTime, room, existingBookings]);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!room) {
      setErrorMessage(language === 'th' ? 'กรุณาเลือกห้องประชุม' : 'Please select a meeting room');
      return;
    }
    if (!bookingDate) {
      setErrorMessage(language === 'th' ? 'กรุณาระบุวันที่ประชุม' : 'Please select a booking date');
      return;
    }
    if (!startTime || !endTime) {
      setErrorMessage(language === 'th' ? 'กรุณาระบุเวลาเริ่มและเวลาสิ้นสุด' : 'Please specify start and end time');
      return;
    }
    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      setErrorMessage(
        language === 'th'
          ? 'เวลาสิ้นสุดต้องมากกว่าเวลาที่เริ่มประชุม'
          : 'End time must be greater than start time'
      );
      return;
    }
    if (!subject.trim()) {
      setErrorMessage(
        language === 'th' ? 'กรุณาระบุเรื่องที่ประชุม / อบรม' : 'Please specify the meeting subject'
      );
      return;
    }
    if (!department.trim()) {
      setErrorMessage(language === 'th' ? 'กรุณาระบุแผนก / ฝ่าย' : 'Please specify your department');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitMeetingRoomBooking({
        room,
        bookingDate,
        startTime,
        endTime,
        subject: subject.trim(),
        department: department.trim(),
        attendeesCount: parseInt(attendeesCount, 10) > 0 ? parseInt(attendeesCount, 10) : 1,
        phoneNumber: phoneNumber.trim() || '-',
      });

      if (result.success && result.booking) {
        setIsSuccess(true);
        setLastCreatedBooking(result.booking);

        // Remember department and phone number in localStorage for future sessions
        try {
          const cleanDept = department.trim();
          if (cleanDept) {
            const saved = localStorage.getItem('proworkflow_meeting_departments');
            const list: string[] = saved ? JSON.parse(saved) : [];
            if (!list.includes(cleanDept)) {
              list.unshift(cleanDept);
              localStorage.setItem('proworkflow_meeting_departments', JSON.stringify(list.slice(0, 100)));
            }
            setSavedDepartments((prev) => Array.from(new Set([cleanDept, ...prev])));
          }

          const cleanPhone = phoneNumber.trim();
          if (cleanPhone && cleanPhone !== '-') {
            const savedPhone = localStorage.getItem('proworkflow_meeting_phone_numbers');
            const phoneList: string[] = savedPhone ? JSON.parse(savedPhone) : [];
            if (!phoneList.includes(cleanPhone)) {
              phoneList.unshift(cleanPhone);
              localStorage.setItem('proworkflow_meeting_phone_numbers', JSON.stringify(phoneList.slice(0, 100)));
            }
            setSavedPhoneNumbers((prev) => Array.from(new Set([cleanPhone, ...prev])));
          }
        } catch {
          // ignore
        }

        if (onBookingCreated) {
          onBookingCreated(result.booking);
        }
      } else {
        setErrorMessage(result.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNext = () => {
    setIsSuccess(false);
    setSubject('');
    setBookingDate('');
    setStartTime('');
    setEndTime('');
    setDepartment('');
    setPhoneNumber('');
    setAttendeesCount('');
    setErrorMessage(null);
  };

  if (!isOpen) return null;

  return (
    <div
      id="meeting-room-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
    >
      <div 
        id="meeting-room-modal-container"
        className="bg-white rounded-3xl shadow-2xl border border-purple-200/80 w-full max-w-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Header */}
        <div className="relative px-5 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between shrink-0 overflow-hidden shadow-md">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/5 pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
              <CalendarPlus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white drop-shadow-xs">
                  {language === 'th' ? 'จองห้องประชุม' : 'Book Meeting Room'}
                </h2>
              </div>
              <p className="text-xs text-purple-200/90 font-medium">
                {language === 'th'
                  ? 'ลงข้อมูลจองห้องประชุม TPM 1 และ TPM 2 บันทึกลงระบบทันที'
                  : 'Reserve TPM 1 / TPM 2 meeting rooms'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="relative z-10 w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white/90 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-white/20"
            title={language === 'th' ? 'ปิด' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {!isAuthorized ? (
            <div className="py-8 text-center space-y-4 animate-in fade-in duration-200">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-base font-black text-slate-800">
                  {language === 'th' ? 'จำกัดสิทธิ์การทำรายการ' : 'Access Restricted'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {language === 'th'
                    ? 'สิทธิ์การจองห้องประชุมเปิดให้เฉพาะผู้ดูแลระบบ (Admin) และผู้ดูแลเพจ (Supervisor) เท่านั้น'
                    : 'Meeting room bookings are restricted to Administrators and Supervisors only.'}
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
                </button>
              </div>
            </div>
          ) : isSuccess && lastCreatedBooking ? (
            /* Success Confirmation View */
            <div className="py-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-2">
                  <Check className="w-3.5 h-3.5" />
                  {language === 'th' ? 'บันทึกการจองสำเร็จ' : 'Booking Successful'}
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  {lastCreatedBooking.subject}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'th'
                    ? 'ข้อมูลการจองห้องประชุมถูกบันทึกเรียบร้อยแล้ว'
                    : 'Your booking has been saved successfully.'}
                </p>
              </div>

              {/* Summary Card */}
              <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 text-left space-y-2.5 max-w-lg mx-auto text-xs">
                <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                  <span className="text-slate-500 font-medium">{language === 'th' ? 'ห้องประชุม:' : 'Room:'}</span>
                  <span className="font-black text-purple-900 bg-purple-200/60 px-2.5 py-0.5 rounded-lg">
                    {lastCreatedBooking.room}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                  <span className="text-slate-500 font-medium">{language === 'th' ? 'วันที่:' : 'Date:'}</span>
                  <span className="font-bold text-slate-800">{lastCreatedBooking.bookingDate}</span>
                </div>
                <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                  <span className="text-slate-500 font-medium">{language === 'th' ? 'เวลา:' : 'Time:'}</span>
                  <span className="font-bold text-purple-800">
                    {lastCreatedBooking.startTime} - {lastCreatedBooking.endTime} น.
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                  <span className="text-slate-500 font-medium">{language === 'th' ? 'แผนก/ฝ่าย:' : 'Department:'}</span>
                  <span className="font-bold text-slate-800">{lastCreatedBooking.department}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">{language === 'th' ? 'จำนวนผู้เข้าร่วม:' : 'Attendees:'}</span>
                  <span className="font-bold text-slate-800">
                    {lastCreatedBooking.attendeesCount} คน | โทร {lastCreatedBooking.phoneNumber}
                  </span>
                </div>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleResetForNext}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{language === 'th' ? 'จองรายการต่อไป' : 'Book Another Room'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  <span>{language === 'th' ? 'เสร็จสิ้น / ปิดหน้าต่าง' : 'Done / Close'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* In-App Booking Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold">{errorMessage}</span>
                </div>
              )}

              {/* Conflict Overlap Warning */}
              {conflictingBooking && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{language === 'th' ? 'ตรวจพบการจองช่วงเวลาซ้ำซ้อน!' : 'Time Conflict Detected!'}</span>
                  </div>
                  <p className="text-[11px] text-amber-700 pl-6">
                    ห้อง <strong>{conflictingBooking.room}</strong> มีการจองเรื่อง &quot;{conflictingBooking.subject}&quot; 
                    (แผนก {conflictingBooking.department}) เวลา <strong>{conflictingBooking.startTime} - {conflictingBooking.endTime} น.</strong> แล้ว
                  </p>
                </div>
              )}

              {/* 1. Room Selection Cards */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'th' ? 'เลือกห้องประชุม' : 'Select Meeting Room'} <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRoom('TPM 1')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      room === 'TPM 1'
                        ? 'bg-purple-50/90 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-purple-950">TPM 1</span>
                      <DoorOpen className={`w-4 h-4 ${room === 'TPM 1' ? 'text-purple-600' : 'text-slate-400'}`} />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1">
                      {language === 'th' ? 'รองรับ 10 - 50 คน (ห้องใหญ่)' : 'Cap. 10-50 people'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoom('TPM 2')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      room === 'TPM 2'
                        ? 'bg-purple-50/90 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-purple-950">TPM 2</span>
                      <DoorOpen className={`w-4 h-4 ${room === 'TPM 2' ? 'text-purple-600' : 'text-slate-400'}`} />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1">
                      {language === 'th' ? 'รองรับ 4 - 20 คน (ห้องกลาง)' : 'Cap. 4-20 people'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Date Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>{language === 'th' ? 'วันที่ใช้งาน' : 'Booking Date'}</span> <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white text-xs font-semibold text-slate-900 outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
                  required
                />
              </div>

              {/* 3. Start Time & End Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  <span>{language === 'th' ? 'ช่วงเวลาที่ประชุม' : 'Meeting Time Slot'}</span> <span className="text-rose-500">*</span>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 mb-1 block">
                      {language === 'th' ? 'เวลาที่เริ่ม' : 'Start Time'}
                    </span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-900 outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                      required
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 mb-1 block">
                      {language === 'th' ? 'เวลาสิ้นสุด' : 'End Time'}
                    </span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-900 outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 4. Subject / Meeting Topic */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  <span>{language === 'th' ? 'เรื่องที่ประชุม / อบรม' : 'Subject / Topic'}</span> <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={language === 'th' ? 'เช่น ประชุมแผนกประจำสัปดาห์, อบรมความปลอดภัย' : 'e.g. Weekly department sync'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 placeholder-slate-400 outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  required
                />
              </div>

              {/* 5. Department & Attendees & Phone Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Department with Autocomplete Memory */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-purple-600" />
                      <span>{language === 'th' ? 'แผนก/ฝ่าย' : 'Department'}</span> <span className="text-rose-500">*</span>
                    </span>
                  </label>
                  <SuggestiveInput
                    id="meeting-department-input"
                    value={department}
                    onChange={(val) => setDepartment(val)}
                    suggestions={savedDepartments}
                    placeholder={language === 'th' ? 'ระบุแผนก / เลือกจากที่จำไว้' : 'Type or select department'}
                    accentColor="purple"
                    required
                    inputClassName="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 placeholder-slate-400 outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 pr-16 transition-all"
                  />
                </div>

                {/* Attendees Count */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span>{language === 'th' ? 'จำนวน (คน)' : 'Attendees'}</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={attendeesCount}
                    onChange={(e) => setAttendeesCount(e.target.value)}
                    placeholder={language === 'th' ? 'ระบุจำนวนคน' : 'No. of attendees'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-900 placeholder-slate-400 outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>

                {/* Phone Number / Extension with Autocomplete Memory */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-purple-600" />
                      <span>{language === 'th' ? 'เบอร์โทร/ภายใน' : 'Phone/Ext'}</span>
                    </span>
                  </label>
                  <SuggestiveInput
                    id="meeting-phone-input"
                    value={phoneNumber}
                    onChange={(val) => setPhoneNumber(val)}
                    suggestions={savedPhoneNumbers}
                    placeholder={language === 'th' ? 'ระบุเบอร์โทร / ภายใน' : 'Phone / Ext.'}
                    accentColor="purple"
                    inputClassName="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 placeholder-slate-400 outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 pr-16 transition-all"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="relative group inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white text-xs bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:via-indigo-700 hover:to-purple-800 shadow-md hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 active:scale-95 cursor-pointer disabled:opacity-50 overflow-hidden"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{language === 'th' ? 'กำลังบันทึกข้อมูล...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{language === 'th' ? 'บันทึกการจองห้องประชุม' : 'Confirm Booking'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
