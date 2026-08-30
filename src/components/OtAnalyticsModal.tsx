import React, { useMemo, useState, useEffect } from 'react';
import { 
  X, 
  BarChart3, 
  Clock, 
  Users, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Award,
  Calendar,
  PieChart,
  ShieldCheck,
  User,
  Layers,
  Sparkles,
  Printer
} from 'lucide-react';
import { OtRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { formatOtHoursDisplay } from '../services/googleSheetSyncService';
import { OtDonutChart, DonutChartItem } from './OtDonutChart';
import { AdminUserAccount, isUserAdminOrSupervisor, getUserEmployeeId } from '../data/mockData';

interface OtAnalyticsModalProps {
  isOpen: boolean;
  records: OtRecord[];
  allRecords?: OtRecord[];
  currentUser?: AdminUserAccount;
  isAuthenticated?: boolean;
  onClose: () => void;
}

const PALETTE = [
  '#0284c7', // sky-600
  '#4f46e5', // indigo-600
  '#059669', // emerald-600
  '#d97706', // amber-600
  '#7c3aed', // violet-600
  '#e11d48', // rose-600
  '#0d9488', // teal-600
  '#ea580c', // orange-600
  '#475569', // slate-600
  '#2563eb', // blue-600
];

export const OtAnalyticsModal: React.FC<OtAnalyticsModalProps> = ({ 
  isOpen, 
  records = [], 
  allRecords = [],
  currentUser,
  isAuthenticated = true,
  onClose 
}) => {
  const { language } = useLanguage();
  const [activeChartTab, setActiveChartTab] = useState<'all' | 'dept' | 'status' | 'duration' | 'leaderboard'>('all');

  const isAdmin = useMemo(() => {
    return isUserAdminOrSupervisor(currentUser, isAuthenticated);
  }, [currentUser, isAuthenticated]);

  const userEmployeeId = useMemo(() => {
    return getUserEmployeeId(currentUser);
  }, [currentUser]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Comprehensive analytics calculation
  const stats = useMemo(() => {
    const totalRecords = records?.length || 0;
    const totalHours = (records || []).reduce((sum, r) => {
      const h = typeof r.totalHours === 'number' && !isNaN(r.totalHours) ? r.totalHours : 0;
      return sum + h;
    }, 0);
    const avgHoursPerSession = totalRecords > 0 ? (totalHours / totalRecords).toFixed(1) : '0';

    // 1. Unique employees map
    const empMap = new Map<string, { name: string; dept: string; hours: number; count: number }>();
    // 2. Department map
    const deptMap = new Map<string, { count: number; hours: number }>();
    // 3. Status map
    const statusMap = new Map<string, { count: number; hours: number }>();
    // 4. Duration bucket map
    const durationMap = {
      short: { label: '1.0 - 2.0 ชม. (กะสั้น)', hours: 0, count: 0 },
      medium: { label: '2.5 - 3.5 ชม. (กะมาตรฐาน)', hours: 0, count: 0 },
      long: { label: '4.0 - 5.5 ชม. (กะยาว)', hours: 0, count: 0 },
      over: { label: '6.0 ชม. ขึ้นไป (กะพิเศษ)', hours: 0, count: 0 },
    };

    (records || []).forEach(r => {
      const recordHours = typeof r.totalHours === 'number' && !isNaN(r.totalHours) ? r.totalHours : 0;
      const empId = r.employeeId && r.employeeId !== '-' ? r.employeeId : '';
      const empName = r.employeeName && r.employeeName !== '-' ? r.employeeName : (empId || 'ไม่ระบุชื่อ');
      const empKey = empId || empName;
      const empDept = r.department || 'ทั่วไป';

      // Employee tracking
      const currentEmp = empMap.get(empKey) || { name: empName, dept: empDept, hours: 0, count: 0 };
      currentEmp.hours += recordHours;
      currentEmp.count += 1;
      empMap.set(empKey, currentEmp);

      // Department tracking
      const deptKey = r.department && r.department !== '-' ? r.department : 'ทั่วไป';
      const currentDept = deptMap.get(deptKey) || { count: 0, hours: 0 };
      currentDept.count += 1;
      currentDept.hours += recordHours;
      deptMap.set(deptKey, currentDept);

      // Status tracking
      let statKey = 'Approved (อนุมัติแล้ว)';
      if (r.status.toLowerCase().includes('approved') || r.status.includes('อนุมัติ')) {
        statKey = 'Approved (อนุมัติแล้ว)';
      } else if (r.status.toLowerCase().includes('confirm') || r.status.includes('ยืนยัน')) {
        statKey = 'Confirm (รอยืนยัน)';
      } else {
        statKey = r.status || 'อื่นๆ';
      }
      const currentStat = statusMap.get(statKey) || { count: 0, hours: 0 };
      currentStat.count += 1;
      currentStat.hours += recordHours;
      statusMap.set(statKey, currentStat);

      // Duration distribution
      if (recordHours <= 2.0) {
        durationMap.short.hours += recordHours;
        durationMap.short.count += 1;
      } else if (recordHours <= 3.5) {
        durationMap.medium.hours += recordHours;
        durationMap.medium.count += 1;
      } else if (recordHours <= 5.5) {
        durationMap.long.hours += recordHours;
        durationMap.long.count += 1;
      } else {
        durationMap.over.hours += recordHours;
        durationMap.over.count += 1;
      }
    });

    // Generate Department Donut Items
    const deptDonutData: DonutChartItem[] = Array.from(deptMap.entries())
      .sort((a, b) => b[1].hours - a[1].hours)
      .map(([dept, data], idx) => ({
        id: `dept-${dept}`,
        label: dept,
        value: Math.round(data.hours * 10) / 10,
        count: data.count,
        color: PALETTE[idx % PALETTE.length],
      }));

    // Generate Status Donut Items
    const statusDonutData: DonutChartItem[] = Array.from(statusMap.entries()).map(([stat, data]) => {
      let color = '#3b82f6';
      if (stat.includes('Approved') || stat.includes('อนุมัติ')) color = '#10b981';
      else if (stat.includes('Confirm') || stat.includes('ยืนยัน')) color = '#f59e0b';
      return {
        id: `status-${stat}`,
        label: stat,
        value: Math.round(data.hours * 10) / 10,
        count: data.count,
        color,
      };
    });

    // Generate Duration Donut Items
    const durationDonutData: DonutChartItem[] = [
      { id: 'dur-short', label: durationMap.short.label, value: Math.round(durationMap.short.hours * 10) / 10, count: durationMap.short.count, color: '#06b6d4' },
      { id: 'dur-med', label: durationMap.medium.label, value: Math.round(durationMap.medium.hours * 10) / 10, count: durationMap.medium.count, color: '#3b82f6' },
      { id: 'dur-long', label: durationMap.long.label, value: Math.round(durationMap.long.hours * 10) / 10, count: durationMap.long.count, color: '#8b5cf6' },
      { id: 'dur-over', label: durationMap.over.label, value: Math.round(durationMap.over.hours * 10) / 10, count: durationMap.over.count, color: '#ec4899' },
    ].filter(item => item.value > 0);

    const topEmployees = Array.from(empMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.hours - a.hours);

    const approvedTotal = (statusMap.get('Approved (อนุมัติแล้ว)')?.count || 0);
    const confirmTotal = (statusMap.get('Confirm (รอยืนยัน)')?.count || 0);

    return {
      totalRecords,
      totalHours: Math.round(totalHours * 10) / 10,
      avgHoursPerSession,
      uniqueEmployeesCount: empMap.size,
      topEmployees,
      deptDonutData,
      statusDonutData,
      durationDonutData,
      approvedTotal,
      confirmTotal,
    };
  }, [records]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-sky-100 overflow-hidden flex flex-col max-h-[92vh] z-[110] relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with animated blue-navy theme */}
        <div className="bg-gradient-to-r from-[#002045] via-[#003366] to-[#0a4a82] text-white p-5 sm:p-6 relative flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3.5 pr-6">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <PieChart className="w-6 h-6 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-400/20 text-sky-200 border border-sky-300/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-sky-300" />
                  {language === 'th' ? 'สถิติและการวิเคราะห์กราฟวงกลม' : 'Modern Circular Analytics'}
                </span>
                {isAdmin ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-300" />
                    {language === 'th' ? 'สิทธิ์ผู้ดูแลระบบ: ทุกพนักงาน' : 'Admin: Organization Wide'}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-300" />
                    {language === 'th' ? `ข้อมูลส่วนตัว (${userEmployeeId || currentUser?.name})` : `Personal View`}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-xs">
                {language === 'th' ? 'สถิติและการวิเคราะห์ OT (OT Analytics)' : 'OT Analytics & Visual Charts'}
              </h2>
              <p className="text-xs sm:text-sm text-sky-200 mt-0.5">
                {language === 'th' 
                  ? `สรุปข้อมูลทั้งหมด ${stats.totalRecords} รายการ • รวม ${stats.totalHours} ชั่วโมงปฏิบัติงาน`
                  : `Summary of ${stats.totalRecords} records • ${stats.totalHours} total OT hours`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chart View Mode Tabs */}
        <div className="bg-slate-100/80 px-5 py-2.5 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline mr-1">
            {language === 'th' ? 'มุมมองกราฟ:' : 'View:'}
          </span>
          <button
            type="button"
            onClick={() => setActiveChartTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeChartTab === 'all'
                ? 'bg-[#002045] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{language === 'th' ? 'กราฟวงกลมทั้งหมด' : 'All Donut Charts'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartTab('dept')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeChartTab === 'dept'
                ? 'bg-[#002045] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{language === 'th' ? 'สัดส่วนฝ่ายงาน' : 'By Department'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartTab('status')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeChartTab === 'status'
                ? 'bg-[#002045] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{language === 'th' ? 'สถานะอนุมัติ' : 'By Status'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartTab('duration')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeChartTab === 'duration'
                ? 'bg-[#002045] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{language === 'th' ? 'ระยะเวลากะ OT' : 'By Duration'}</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveChartTab('leaderboard')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeChartTab === 'leaderboard'
                  ? 'bg-[#002045] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'อันดับพนักงาน' : 'Leaderboard'}</span>
            </button>
          )}
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-[#1a1c1c]">
          {/* Top 4 KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-sky-50/90 border border-sky-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-sky-900 mb-1">
                <span>{language === 'th' ? 'รายการ OT ทั้งหมด' : 'Total Records'}</span>
                <Clock className="w-4 h-4 text-sky-700" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-[#002045]">{stats.totalRecords}</p>
              <span className="text-[11px] text-sky-800 font-semibold">{language === 'th' ? 'ครั้งที่มีการบันทึก' : 'Sessions'}</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900 mb-1">
                <span>{language === 'th' ? 'ชั่วโมง OT รวม' : 'Total Hours'}</span>
                <TrendingUp className="w-4 h-4 text-emerald-700" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-800">{stats.totalHours}</p>
              <span className="text-[11px] text-emerald-800 font-semibold">{language === 'th' ? 'ชั่วโมงสะสม' : 'Total Hours'}</span>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900 mb-1">
                <span>{language === 'th' ? 'จำนวนพนักงาน' : 'Active Employees'}</span>
                <Users className="w-4 h-4 text-indigo-700" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-indigo-950">{stats.uniqueEmployeesCount}</p>
              <span className="text-[11px] text-indigo-800 font-semibold">{language === 'th' ? 'คนที่มีประวัติ OT' : 'People'}</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-1">
                <span>{language === 'th' ? 'เฉลี่ยต่อครั้ง' : 'Avg Hours/Session'}</span>
                <Clock className="w-4 h-4 text-amber-700" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-900">{stats.avgHoursPerSession}</p>
              <span className="text-[11px] text-amber-800 font-semibold">{language === 'th' ? 'ชม. ต่อกะปฏิบัติงาน' : 'hrs/session'}</span>
            </div>
          </div>

          {/* Section: DONUT CHARTS DISPLAY */}
          {(activeChartTab === 'all' || activeChartTab === 'dept') && (
            <div className="bg-slate-50/70 rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base text-[#002045] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-sky-700" />
                  <span>{language === 'th' ? 'กราฟวงกลม: สัดส่วนชั่วโมง OT ตามฝ่ายงาน' : 'OT Hours by Department (Donut Chart)'}</span>
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  {stats.deptDonutData.length} {language === 'th' ? 'ฝ่าย' : 'Departments'}
                </span>
              </div>
              
              <OtDonutChart
                data={stats.deptDonutData}
                title={language === 'th' ? 'จำแนกชั่วโมงตามแผนก' : 'Department Distribution'}
                unitLabel="ชม."
                totalLabel="ชั่วโมงรวม"
                size="md"
              />
            </div>
          )}

          {(activeChartTab === 'all' || activeChartTab === 'status') && (
            <div className="bg-slate-50/70 rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base text-[#002045] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>{language === 'th' ? 'กราฟวงกลม: สัดส่วนสถานะการอนุมัติ (Approved vs Confirm)' : 'Approval Status Breakdown (Donut Chart)'}</span>
                </h3>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="text-emerald-700">{stats.approvedTotal} อนุมัติ</span>
                  <span>•</span>
                  <span className="text-amber-700">{stats.confirmTotal} ยืนยัน</span>
                </div>
              </div>

              <OtDonutChart
                data={stats.statusDonutData}
                title={language === 'th' ? 'สถานะการดำเนินงาน' : 'Status Breakdown'}
                unitLabel="ชม."
                totalLabel="ชั่วโมงรวม"
                size="md"
              />
            </div>
          )}

          {(activeChartTab === 'all' || activeChartTab === 'duration') && (
            <div className="bg-slate-50/70 rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base text-[#002045] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <span>{language === 'th' ? 'กราฟวงกลม: การกระจายระยะเวลาชั่วโมง OT ต่อกะ' : 'Shift Duration Distribution (Donut Chart)'}</span>
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  {language === 'th' ? 'ระยะเวลากะทำงาน' : 'Shift lengths'}
                </span>
              </div>

              <OtDonutChart
                data={stats.durationDonutData}
                title={language === 'th' ? 'ช่วงระยะเวลาทำงาน' : 'Duration Buckets'}
                unitLabel="ชม."
                totalLabel="ชั่วโมงรวม"
                size="md"
              />
            </div>
          )}

          {/* Leaderboard Table (Available for Admins or in Leaderboard tab) */}
          {isAdmin && (activeChartTab === 'all' || activeChartTab === 'leaderboard') && (
            <div className="bg-slate-50/70 rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base text-[#002045] flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>{language === 'th' ? 'ตารางจัดอันดับพนักงานที่มีชั่วโมง OT สูงสุด' : 'Top Employees Leaderboard'}</span>
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  {stats.topEmployees.length} {language === 'th' ? 'คน' : 'Employees'}
                </span>
              </div>

              <div className="divide-y divide-slate-200/80 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                {stats.topEmployees.slice(0, 10).map((emp, index) => {
                  const percentOfTotal = stats.totalHours > 0 ? Math.round((emp.hours / stats.totalHours) * 100) : 0;
                  return (
                    <div key={emp.id} className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          index === 0 ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300' :
                          index === 1 ? 'bg-slate-200 text-slate-800' :
                          index === 2 ? 'bg-amber-50 text-amber-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-bold text-sm text-[#002045]">{emp.name}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold">{emp.dept}</span>
                            {emp.id !== emp.name && <span>• รหัส {emp.id}</span>}
                            <span>• {emp.count} {language === 'th' ? 'ครั้ง' : 'sessions'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-sm text-sky-950 block">
                          {formatOtHoursDisplay(undefined, undefined, emp.hours)} ชม.
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {percentOfTotal}% ของทั้งหมด
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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
            className="px-6 py-2.5 rounded-xl bg-[#002045] hover:bg-[#003366] text-white font-bold text-sm shadow-md cursor-pointer transition-all"
          >
            {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
