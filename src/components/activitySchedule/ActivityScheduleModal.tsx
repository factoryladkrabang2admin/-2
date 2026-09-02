import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarClock,
  FileSpreadsheet,
  Search,
  Filter,
  List,
  LayoutGrid,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Bus,
  Users,
  CheckCircle2,
  CalendarCheck,
  Sparkles,
  ChevronRight,
  X,
  AlertCircle
} from 'lucide-react';
import { ActivityScheduleRecord } from '../../types';
import {
  fetchGoogleSheetActivitySchedule,
  getCachedActivitySchedules,
  ACTIVITY_SCHEDULE_SHEET_URL
} from '../../services/googleSheetSyncService';
import { AdminUserAccount, isUserAdminOrSupervisor } from '../../data/mockData';
import { ActivityCalendarView } from './ActivityCalendarView';
import { ActivityDetailModal } from './ActivityDetailModal';

interface ActivityScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  canAccessGoogleSheet?: boolean;
  currentUser?: AdminUserAccount | null;
  isAuthenticated?: boolean;
}

export const ActivityScheduleModal: React.FC<ActivityScheduleModalProps> = ({
  isOpen,
  onClose,
  canAccessGoogleSheet,
  currentUser,
  isAuthenticated = false,
}) => {
  const [activities, setActivities] = useState<ActivityScheduleRecord[]>(() => {
    return getCachedActivitySchedules();
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 1. จำกัดสิทธิ์การมองเห็นไอคอน Google sheet เฉพาะ ผู้ดูแลและแอดมินเพจเท่านั้น
  const hasSheetAccess = useMemo(() => {
    if (typeof canAccessGoogleSheet === 'boolean') {
      return canAccessGoogleSheet;
    }
    return isUserAdminOrSupervisor(currentUser, isAuthenticated);
  }, [canAccessGoogleSheet, currentUser, isAuthenticated]);

  // 2. ตั้งค่าเริ่มต้นเมื่อกดเข้าดูให้เป็นมุมมองปฏิทิน ('calendar')
  const [viewMode, setViewMode] = useState<'calendar' | 'table' | 'grid'>('calendar');
  const [selectedActivity, setSelectedActivity] = useState<ActivityScheduleRecord | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const loadData = async () => {
    try {
      const res = await fetchGoogleSheetActivitySchedule();
      if (res.success && res.activities.length > 0) {
        setActivities(res.activities);
        setLastUpdated(res.lastSyncedAt);
      }
    } catch {
      // keep current data
    }
  };

  // 3. นำปุ่ม รีเฟรชข้อมูล ออก แต่ให้อัพเดทข้อมูลเรียลไทม์เบื้องหลัง
  // และรีเซ็ตเป็นมุมมองปฏิทินทุกครั้งที่เปิด modal
  useEffect(() => {
    if (isOpen) {
      setViewMode('calendar');
      loadData();

      // Background realtime polling every 15 seconds while modal is open
      const interval = setInterval(() => {
        loadData();
      }, 15000);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Month options
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    activities.forEach(act => {
      const parts = act.dateStr.split(/[-/.]/);
      if (parts.length === 3) {
        set.add(`${parts[1]}/${parts[2]}`);
      }
    });
    return Array.from(set).sort();
  }, [activities]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter(item => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mTitle = item.title.toLowerCase().includes(q);
        const mLocation = item.location.toLowerCase().includes(q);
        const mDate = item.dateStr.toLowerCase().includes(q) || item.formattedDate.toLowerCase().includes(q);
        const mDay = item.dayOfWeek.toLowerCase().includes(q);
        const mParticipants = item.participants.toLowerCase().includes(q);
        if (!mTitle && !mLocation && !mDate && !mDay && !mParticipants) {
          return false;
        }
      }

      // Month
      if (selectedMonth !== 'all') {
        const parts = item.dateStr.split(/[-/.]/);
        if (parts.length === 3) {
          const mY = `${parts[1]}/${parts[2]}`;
          if (mY !== selectedMonth) return false;
        }
      }

      // Status
      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [activities, searchQuery, selectedMonth, selectedStatus]);

  // Metrics summary
  const stats = useMemo(() => {
    const todayCount = activities.filter(a => a.status === 'today').length;
    const upcomingCount = activities.filter(a => a.status === 'upcoming').length;
    const completedCount = activities.filter(a => a.status === 'completed').length;
    return {
      todayCount,
      upcomingCount,
      completedCount,
      total: activities.length,
    };
  }, [activities]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedMonth !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    return count;
  }, [searchQuery, selectedMonth, selectedStatus]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedMonth('all');
    setSelectedStatus('all');
  };

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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            วันนี้
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <CalendarCheck className="w-3 h-3 text-blue-600" />
            กำลังจะมาถึง
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-3 h-3 text-slate-500" />
            เสร็จสิ้น
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div 
        className="bg-slate-50 rounded-3xl max-w-6xl w-full max-h-[92vh] overflow-hidden border border-emerald-200 shadow-2xl flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-5 sm:p-6 shrink-0 relative overflow-hidden shadow-sm">
          {/* Decorative glows */}
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-32 -bottom-10 w-36 h-36 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-inner shrink-0">
                <CalendarClock className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-xs">
                    ตารางกิจกรรม
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-xs font-black shadow-xs">
                    {activities.length} กิจกรรม
                  </span>
                </div>
                <p className="text-xs text-emerald-100/90 mt-0.5">
                  ตารางกิจกรรม การอบรม และกำหนดการเดินทางของพนักงาน
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* 1. ไอคอน เปิด google sheet, จำกัดสิทธิ์การมองเห็นเฉพาะ ผู้ดูแลและแอดมินเพจเท่านั้น (แสดงเฉพาะไอคอน) */}
              {hasSheetAccess && (
                <a
                  href={ACTIVITY_SCHEDULE_SHEET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                  title="เปิดดู Google Sheet ตารางกิจกรรม (เฉพาะผู้ดูแลและแอดมินเพจ)"
                  aria-label="เปิดดู Google Sheet ตารางกิจกรรม"
                >
                  <FileSpreadsheet className="w-5 h-5 text-emerald-200 hover:text-white transition-colors" />
                </a>
              )}

              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-xl bg-white/15 hover:bg-white/30 text-white border border-white/25 backdrop-blur-md transition-all cursor-pointer ml-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 3 Metric Summary Boxes (เหมือนตารางทำงาน) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Box 1: กิจกรรมวันนี้ */}
            <div className="bg-white rounded-2xl p-4 border border-emerald-200/90 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-emerald-900/70 font-semibold truncate">
                  กิจกรรมวันนี้ (Today)
                </div>
                <div className="text-xl font-black text-amber-950">
                  {stats.todayCount} กิจกรรม
                </div>
              </div>
            </div>

            {/* Box 2: กิจกรรมที่กำลังจะมาถึง */}
            <div className="bg-white rounded-2xl p-4 border border-emerald-200/90 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-emerald-900/70 font-semibold truncate">
                  กำลังจะมาถึง (Upcoming)
                </div>
                <div className="text-xl font-black text-blue-950">
                  {stats.upcomingCount} กิจกรรม
                </div>
              </div>
            </div>

            {/* Box 3: กิจกรรมทั้งหมดในระบบ */}
            <div className="bg-white rounded-2xl p-4 border border-emerald-200/90 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-emerald-900/70 font-semibold truncate">
                  กิจกรรมทั้งหมดในระบบ
                </div>
                <div className="text-xl font-black text-emerald-950">
                  {stats.total} กิจกรรม
                </div>
              </div>
            </div>
          </div>

          {/* Filter & View Switcher Bar */}
          <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-emerald-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-emerald-700 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเรื่องกิจกรรม, สถานที่, พนักงาน..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-emerald-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Month Dropdown */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-emerald-200 text-xs font-semibold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">ทุกเดือน</option>
                {monthOptions.map((mY) => (
                  <option key={mY} value={mY}>
                    เดือน {mY}
                  </option>
                ))}
              </select>

              {/* Status Dropdown */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-emerald-200 text-xs font-semibold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="today">เฉพาะวันนี้</option>
                <option value="upcoming">กำลังจะมาถึง</option>
                <option value="completed">เสร็จสิ้นแล้ว</option>
              </select>

              {/* View Mode Switcher (เหมือนตารางทำงาน) */}
              <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 shadow-2xs">
                {/* 1. รายการ / ตาราง (Table View) */}
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'text-slate-700 hover:text-emerald-900 hover:bg-slate-200/60'
                  }`}
                  title="มุมมองรายการ / ตาราง"
                >
                  <List className="w-4 h-4" />
                </button>

                {/* 2. ปฏิทิน (Calendar View) */}
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'calendar'
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'text-slate-700 hover:text-emerald-900 hover:bg-slate-200/60'
                  }`}
                  title="มุมมองปฏิทิน"
                >
                  <CalendarIcon className="w-4 h-4" />
                </button>

                {/* 3. การ์ด (Card View) */}
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-emerald-700 text-white shadow-xs font-bold'
                      : 'text-slate-700 hover:text-emerald-900 hover:bg-slate-200/60'
                  }`}
                  title="มุมมองการ์ด"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap px-4 py-2 bg-amber-50/90 border border-amber-200 rounded-xl text-xs">
              <span className="font-bold text-amber-900 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                ตัวกรองที่ใช้งาน ({activeFiltersCount}):
              </span>
              {searchQuery && (
                <span className="px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-900 font-medium">
                  คำค้น: "{searchQuery}"
                </span>
              )}
              {selectedMonth !== 'all' && (
                <span className="px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-900 font-medium">
                  เดือน: {selectedMonth}
                </span>
              )}
              {selectedStatus !== 'all' && (
                <span className="px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-900 font-medium">
                  สถานะ: {selectedStatus === 'today' ? 'เฉพาะวันนี้' : selectedStatus === 'upcoming' ? 'กำลังจะมาถึง' : 'เสร็จสิ้นแล้ว'}
                </span>
              )}
              <button
                type="button"
                onClick={handleResetFilters}
                className="ml-auto text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
              >
                ล้างตัวกรอง
              </button>
            </div>
          )}

          {/* Content Area according to viewMode */}
          {filteredActivities.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                <CalendarClock className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">
                  ไม่พบข้อมูลกิจกรรมตามเงื่อนไขที่เลือก
                </h3>
                <p className="text-xs text-slate-500">
                  ลองล้างตัวกรองหรือค้นหาด้วยคำอื่น
                </p>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors cursor-pointer"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              )}
            </div>
          ) : viewMode === 'calendar' ? (
            /* CALENDAR VIEW */
            <ActivityCalendarView
              activities={filteredActivities}
              onSelectActivity={(act) => setSelectedActivity(act)}
            />
          ) : viewMode === 'grid' ? (
            /* GRID / CARD VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredActivities.map((act) => (
                <div
                  key={act.id}
                  onClick={() => setSelectedActivity(act)}
                  className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    {/* Top Row: Date & Status */}
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${getDayBadge(act.dayOfWeek)}`}>
                        {act.dayOfWeek || 'วันที่'}
                      </span>
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        {act.formattedDate}
                      </span>
                    </div>

                    {/* Title */}
                    <div>
                      <h4 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                        {act.title}
                      </h4>
                      <div className="mt-1">{getStatusBadge(act.status)}</div>
                    </div>

                    {/* Meta rows */}
                    <div className="space-y-1.5 pt-1 text-xs text-slate-700">
                      {/* Time */}
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-emerald-950">{act.timeRange}</span>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{act.location}</span>
                      </div>

                      {/* Shuttle Van */}
                      {(act.vehicleDepartureTime || act.vehicleReturnTime) && (
                        <div className="flex items-center gap-2 text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          <Bus className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="text-[11px] font-medium">
                            รถออก {act.vehicleDepartureTime || '-'} • กลับ {act.vehicleReturnTime || '-'}
                          </span>
                        </div>
                      )}

                      {/* Participants chips */}
                      <div className="pt-1.5 flex items-start gap-1.5 flex-wrap">
                        <Users className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {act.participantList.map((p, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 text-[10px] font-semibold border border-purple-200"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-bold group-hover:translate-x-1 transition-transform">
                    <span>ดูรายละเอียดกิจกรรม</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* TABLE / LIST VIEW (เหมือนตารางทำงาน) */
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4">วัน / วันที่</th>
                      <th className="py-3.5 px-4">เรื่อง / กิจกรรม</th>
                      <th className="py-3.5 px-4">กำหนดการเวลา</th>
                      <th className="py-3.5 px-4">สถานที่</th>
                      <th className="py-3.5 px-4">รถรับ-ส่ง</th>
                      <th className="py-3.5 px-4">พนักงาน / ผู้เข้าร่วม</th>
                      <th className="py-3.5 px-4">สถานะ</th>
                      <th className="py-3.5 px-4 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredActivities.map((act) => (
                      <tr
                        key={act.id}
                        onClick={() => setSelectedActivity(act)}
                        className="hover:bg-emerald-50/50 cursor-pointer transition-colors"
                      >
                        {/* 1. วัน / วันที่ */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${getDayBadge(act.dayOfWeek)}`}>
                              {act.dayOfWeek || 'วันที่'}
                            </span>
                            <span className="font-bold text-slate-900">{act.formattedDate}</span>
                          </div>
                        </td>

                        {/* 2. เรื่อง / กิจกรรม */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-950 flex items-center gap-1.5 max-w-xs">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate">{act.title}</span>
                          </div>
                        </td>

                        {/* 3. เวลา */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 font-bold text-xs border border-emerald-200">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            {act.timeRange}
                          </span>
                        </td>

                        {/* 4. สถานที่ */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{act.location}</span>
                          </div>
                        </td>

                        {/* 5. รถรับส่ง */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {act.vehicleDepartureTime || act.vehicleReturnTime ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 text-xs font-semibold border border-amber-200">
                              <Bus className="w-3 h-3 text-amber-600" />
                              ออก {act.vehicleDepartureTime || '-'} • กลับ {act.vehicleReturnTime || '-'}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>

                        {/* 6. พนักงาน */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {act.participantList.map((p, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-900 text-xs font-medium border border-purple-200"
                              >
                                <Users className="w-3 h-3 text-purple-600" />
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* 7. สถานะ */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(act.status)}
                        </td>

                        {/* 8. จัดการ */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedActivity(act);
                            }}
                            className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-colors cursor-pointer"
                          >
                            ดูรายละเอียด
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-end text-xs text-slate-500 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* DETAIL MODAL */}
      <ActivityDetailModal
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  );
};
