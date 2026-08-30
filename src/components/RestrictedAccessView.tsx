import React from 'react';
import { Lock, LogIn, Shirt, DoorOpen, ShieldAlert, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { NavigationTab } from '../types';

interface RestrictedAccessViewProps {
  currentTab: NavigationTab;
  onOpenLogin: () => void;
  onNavigateToLaundry: () => void;
  onNavigateToMeetingRoom: () => void;
}

export const RestrictedAccessView: React.FC<RestrictedAccessViewProps> = ({
  currentTab,
  onOpenLogin,
  onNavigateToLaundry,
  onNavigateToMeetingRoom,
}) => {
  const { language, t } = useLanguage();

  const getTabLabel = (tab: NavigationTab): string => {
    switch (tab) {
      case 'dashboard':
        return language === 'th' ? 'ภาพรวมระบบ (Dashboard)' : 'System Dashboard';
      case 'announcements':
        return language === 'th' ? 'ข่าวประชาสัมพันธ์ (Press Release)' : 'Press Release';
      case 'maintenance':
        return language === 'th' ? 'การแจ้งซ่อมและบำรุงรักษา (Maintenance)' : 'Maintenance Tracking';
      case 'schedule':
        return language === 'th' ? 'ตารางการทำงานพนักงาน (Work Schedule)' : 'Work Schedule';
      case 'ot':
        return language === 'th' ? 'ระบบตรวจสอบ OT (OT Check)' : 'OT Verification';
      case 'payslip':
        return language === 'th' ? 'สลิปเงินเดือน (e-Pay Payslip)' : 'e-Pay Payslip';
      case 'equipment':
        return language === 'th' ? 'ระบบเบิกอุปกรณ์ (Equipment Requisition)' : 'Equipment Requisition';
      case 'chlorine':
        return language === 'th' ? 'ระบบสุ่มตรวจคลอรีน (Chlorine Inspection)' : 'Chlorine Inspection';
      case 'reports':
        return language === 'th' ? 'รายงานและสถิติ (Reports & Analytics)' : 'Reports & Analytics';
      default:
        return language === 'th' ? 'ส่วนงานที่เลือก' : 'Selected Section';
    }
  };

  const tabTitle = getTabLabel(currentTab);

  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-2xl bg-white/90 backdrop-blur-md rounded-3xl border border-blue-100 shadow-xl overflow-hidden text-center p-8 sm:p-12 relative">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-amber-100/60 rounded-full blur-3xl pointer-events-none" />

        {/* Central Lock Icon */}
        <div className="relative mx-auto mb-6 w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-[#002045] to-[#0061a5] text-white flex items-center justify-center shadow-lg shadow-blue-900/20 animate-pulse">
          <Lock className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.2]" />
          <div className="absolute -top-1.5 -right-1.5 p-1.5 rounded-full bg-amber-400 text-amber-950 border-2 border-white shadow-xs">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold mb-3 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>{language === 'th' ? 'สิทธิ์เฉพาะพนักงานที่ลงทะเบียนเท่านั้น' : 'Registered Staff Only'}</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#002045] tracking-tight mb-3">
          {tabTitle}
        </h2>

        {/* Description */}
        <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed mb-6">
          {language === 'th' ? (
            <>
              ผู้ใช้งานทั่วไปสามารถดูได้เฉพาะหัวข้อ <strong className="text-blue-900 font-bold">"ข้อมูลการซัก-อบผ้า"</strong> และ <strong className="text-blue-900 font-bold">"ห้องประชุม"</strong> เท่านั้น ส่วนหัวข้อนี้สงวนสิทธิ์เฉพาะพนักงานและผู้ดูแลระบบที่ลงทะเบียนเรียบร้อยแล้ว
            </>
          ) : (
            <>
              General users can only access <strong className="text-blue-900 font-bold">"Laundry Tracking"</strong> and <strong className="text-blue-900 font-bold">"Meeting Rooms"</strong>. This section is strictly restricted to registered staff.
            </>
          )}
        </p>

        {/* Primary CTA: Login */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <button
            onClick={onOpenLogin}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#002045] to-[#004e8c] hover:from-[#001733] hover:to-[#003c6e] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>{language === 'th' ? 'เข้าสู่ระบบสำหรับพนักงาน (Sign In)' : 'Staff Sign In'}</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="w-full border-t border-slate-200" />
          <span className="absolute bg-white px-3 text-xs text-slate-400 font-medium uppercase tracking-wider">
            {language === 'th' ? 'หรือดูหัวข้อที่เปิดให้เข้าถึงทั่วไป' : 'Or browse public sections'}
          </span>
        </div>

        {/* Public Sections Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={onNavigateToLaundry}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 transition-all flex items-center gap-3 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#002045] group-hover:text-blue-700">
                {language === 'th' ? 'ข้อมูลการซัก-อบผ้า' : 'Laundry Tracking'}
              </p>
              <p className="text-xs text-slate-500">
                {language === 'th' ? 'เปิดให้ดูได้สำหรับทุกคน' : 'Publicly accessible'}
              </p>
            </div>
          </button>

          <button
            onClick={onNavigateToMeetingRoom}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 transition-all flex items-center gap-3 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#002045] group-hover:text-emerald-700">
                {language === 'th' ? 'ห้องประชุม' : 'Meeting Rooms'}
              </p>
              <p className="text-xs text-slate-500">
                {language === 'th' ? 'เปิดให้ดูได้สำหรับทุกคน' : 'Publicly accessible'}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
