import React from 'react';
import { X, HelpCircle, BookOpen, Sparkles, MessageCircle, ShieldCheck, ExternalLink } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const { language, t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f9f9f9]">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#002045]" />
            <h3 className="text-base font-bold text-[#1a1c1c]">
              {language === 'th' ? `ศูนย์ช่วยเหลือ ${t.appName}` : `${t.appName} Help Center`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#74777f] hover:text-[#1a1c1c] p-1 rounded-md hover:bg-[#e8e8e8]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="p-4 bg-[#d2e4ff]/30 rounded-xl border border-[#adc7f7] text-[#001d37]">
            <h4 className="font-bold text-sm mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#0061a5]" />
              {language === 'th' ? 'คู่มือการใช้งานระบบ' : 'Enterprise User Guide'}
            </h4>
            <p className="text-xs leading-relaxed text-[#002045]">
              {language === 'th'
                ? 'ระบบ ธุรการลาดกระบัง 2 รวบรวมการติดตามข้อมูลการซัก-อบผ้า การปฏิบัติงาน และการวิเคราะห์ประสิทธิภาพการทำงานแบบเรียลไทม์ไว้ในที่เดียว'
                : 'Ladkrabang 2 Administrative integrates operational tracking, laundry workflow telemetry, and automated performance analytics in a single unified dashboard.'}
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 border border-[#e2e8f0] rounded-xl hover:bg-[#f9f9f9] transition-colors cursor-pointer flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-[#0061a5]" />
                <div>
                  <p className="font-semibold text-[#1a1c1c]">Navigating Initiatives & Milestones</p>
                  <p className="text-[11px] text-[#74777f]">Learn how to manage project progress and deadlines</p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#74777f]" />
            </div>

            <div className="p-3 border border-[#e2e8f0] rounded-xl hover:bg-[#f9f9f9] transition-colors cursor-pointer flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-[#0061a5]" />
                <div>
                  <p className="font-semibold text-[#1a1c1c]">Role Permissions & Security</p>
                  <p className="text-[11px] text-[#74777f]">Role hierarchy: Admins, Leads, and Members</p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#74777f]" />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#e2e8f0] bg-[#f9f9f9] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-[#0061a5] hover:bg-[#002045] text-white rounded-lg shadow-sm"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};
