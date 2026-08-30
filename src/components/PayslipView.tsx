import React, { useState } from 'react';
import { 
  ExternalLink, 
  ShieldCheck, 
  Copy, 
  Check, 
  Lock, 
  Info, 
  Building2, 
  CreditCard, 
  UserCheck, 
  FileText, 
  RefreshCw, 
  Maximize2,
  Sparkles,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { AdminUserAccount } from '../data/mockData';
import { FarmhouseBreadIcon } from './BreadIcons';

interface PayslipViewProps {
  currentUser?: AdminUserAccount;
  isAuthenticated?: boolean;
}

export const PayslipView: React.FC<PayslipViewProps> = ({
  currentUser,
  isAuthenticated = true,
}) => {
  const { language } = useLanguage();
  const [copiedId, setCopiedId] = useState(false);
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [iframeFailed, setIframeFailed] = useState(false);

  const epayUrl = 'https://epay.pbplc.co.th/';
  const empId = currentUser?.employeeId || currentUser?.originalEmpId || (currentUser?.username?.match(/^\d+$/) ? currentUser.username : '');
  const empName = currentUser?.name || 'พนักงาน บมจ. เพรซิเดนท์ เบเกอรี่';
  const department = currentUser?.department || 'ฝ่ายผลิต / โรงงานลาดกระบัง 2';

  const handleCopyId = () => {
    if (!empId) return;
    navigator.clipboard.writeText(empId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleRefreshIframe = () => {
    setIframeFailed(false);
    setIframeKey(Date.now());
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#003366] via-[#004f98] to-[#0066b3] text-white p-6 sm:p-8 shadow-lg border border-sky-400/20">
        <div className="absolute -right-6 -bottom-8 opacity-15 pointer-events-none transform rotate-12">
          <FarmhouseBreadIcon size={220} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-sky-100 text-xs font-semibold border border-white/20">
              <Building2 className="w-3.5 h-3.5 text-amber-300" />
              <span>บริษัท เพรซิเดนท์ เบเกอรี่ จำกัด (มหาชน) • PBPLC e-Pay</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-amber-300 shrink-0" />
              <span>{language === 'th' ? 'ระบบสลิปเงินเดือนออนไลน์ (e-Pay)' : 'Online Payslip System (e-Pay)'}</span>
            </h1>
            <p className="text-sky-100 text-sm sm:text-base leading-relaxed">
              {language === 'th' 
                ? 'บริการตรวจสอบสลิปเงินเดือน รายการหัก ภาษี และเอกสารการจ่ายเงินของพนักงาน บริษัท เพรซิเดนท์ เบเกอรี่ จำกัด (มหาชน)'
                : 'Access online payslips, deductions, tax withholdings, and salary statements of President Bakery Public Company Limited.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <a
              href={epayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 font-bold rounded-xl shadow-md transition-all text-sm cursor-pointer group"
            >
              <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              <span>{language === 'th' ? 'เปิดระบบ e-Pay (หน้าต่างใหม่)' : 'Open e-Pay Portal (New Window)'}</span>
            </a>
            <div className="flex items-center justify-center gap-1.5 text-xs text-sky-200">
              <Lock className="w-3.5 h-3.5 text-emerald-300" />
              <span>{language === 'th' ? 'ระบบความปลอดภัยมาตรฐานองค์กร' : 'Enterprise Secure Portal'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info & Helper Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* User Quick Info */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {language === 'th' ? 'ข้อมูลพนักงานปัจจุบัน' : 'Employee Profile'}
              </span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-full flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                {language === 'th' ? 'พร้อมใช้งาน' : 'Ready'}
              </span>
            </div>

            <div className="space-y-2.5">
              <div>
                <p className="text-xs text-slate-400">{language === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name'}</p>
                <p className="font-bold text-sm text-slate-800">{empName}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400">{language === 'th' ? 'ฝ่าย / แผนก' : 'Department'}</p>
                <p className="text-xs font-semibold text-slate-700">{department}</p>
              </div>

              {empId && (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium">{language === 'th' ? 'รหัสพนักงานของคุณ' : 'Your Employee ID'}</p>
                    <p className="font-mono font-bold text-sm text-sky-950">{empId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="px-2.5 py-1.5 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    title="คัดลอกรหัสพนักงานเพื่อนำไปล็อกอินใน e-Pay"
                  >
                    {copiedId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">{language === 'th' ? 'คัดลอกแล้ว' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-sky-600" />
                        <span>{language === 'th' ? 'คัดลอก' : 'Copy'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>{language === 'th' ? 'สามารถคัดลอกรหัสพนักงานไปวางในหน้า e-Pay ได้เลย' : 'Copy employee ID to paste into e-Pay login'}</span>
          </p>
        </div>

        {/* Login Guide */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {language === 'th' ? 'วิธีเข้าสู่ระบบ e-Pay' : 'How to Log In to e-Pay'}
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <div>
                  <strong className="text-slate-800">{language === 'th' ? 'ชื่อผู้ใช้ (Username):' : 'Username:'}</strong>
                  <span className="ml-1">{language === 'th' ? 'กรอกรหัสประจำตัวพนักงาน' : 'Enter your employee ID'}</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <div>
                  <strong className="text-slate-800">{language === 'th' ? 'รหัสผ่าน (Password):' : 'Password:'}</strong>
                  <span className="ml-1">{language === 'th' ? 'รหัสผ่านส่วนตัวระบบ e-Pay' : 'Your private e-Pay password'}</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                <div>
                  <strong className="text-slate-800">{language === 'th' ? 'ตรวจสอบสลิป:' : 'View Slip:'}</strong>
                  <span className="ml-1">{language === 'th' ? 'เลือกงวดเดือนและปีที่ต้องการดู' : 'Select desired payroll period and month'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 p-2 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
            <span>
              {language === 'th'
                ? 'หากเข้าใช้งานครั้งแรกหรือลืมรหัสผ่าน กรุณาติดต่อฝ่ายทรัพยากรบุคคล (HR)'
                : 'For first-time login or password reset, contact HR department.'}
            </span>
          </div>
        </div>

        {/* Security & Direct Launch */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {language === 'th' ? 'ระบบความปลอดภัยและการรักษาความลับ' : 'Security & Privacy'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {language === 'th'
                ? 'ข้อมูลเงินเดือนและสิทธิประโยชน์เป็นข้อมูลส่วนบุคคลที่ต้องรักษาความลับ ห้ามเปิดเผยหรือส่งต่อรหัสผ่านให้ผู้อื่น'
                : 'Payroll and benefit details are strictly confidential personal data. Never share your password with anyone.'}
            </p>

            <div className="p-2.5 bg-white/10 rounded-xl border border-white/15 text-xs text-slate-200">
              <div className="font-semibold text-amber-300 mb-0.5">URL ระบบทางการ:</div>
              <a 
                href={epayUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sky-300 hover:underline font-mono text-[11px] break-all flex items-center gap-1"
              >
                <span>{epayUrl}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          </div>

          <a
            href={epayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 active:scale-98 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <span>{language === 'th' ? 'คลิกเปิดหน้าเว็บ epay.pbplc.co.th' : 'Open epay.pbplc.co.th'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Embedded Portal / Interactive Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Portal Header Toolbar */}
        <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            <span className="text-xs font-mono font-bold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200 ml-2">
              https://epay.pbplc.co.th/
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshIframe}
              className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              title="รีเฟรชหน้าต่าง"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === 'th' ? 'รีเฟรช' : 'Refresh'}</span>
            </button>

            <a
              href={epayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'เปิดเต็มจอ' : 'Full Screen'}</span>
            </a>
          </div>
        </div>

        {/* Embedded Portal Screen / Frame */}
        <div className="relative min-h-[560px] w-full bg-slate-50 flex flex-col items-center justify-center">
          <iframe
            key={iframeKey}
            src={epayUrl}
            title="President Bakery e-Pay System"
            className="w-full h-[620px] border-none"
            onError={() => setIframeFailed(true)}
          />

          {/* Embedded fallback assistance banner */}
          <div className="w-full bg-slate-100 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                {language === 'th' 
                  ? 'หากหน้าจอในระบบไม่แสดงผลเนื่องจากการรักษาความปลอดภัยของเบราว์เซอร์ สามารถกดปุ่มเปิดหน้าต่างใหม่ได้ทันที'
                  : 'If the embedded portal does not render due to browser security policies, click to open in a new window.'}
              </span>
            </div>
            <a
              href={epayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#004f98] hover:bg-[#003d75] text-white font-bold rounded-lg shrink-0 flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'เปิดเว็บไซต์ e-Pay โดยตรง' : 'Open e-Pay Directly'}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
