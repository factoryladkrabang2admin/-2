import React from 'react';
import { Shirt, Package, X, Sparkles, ArrowRight } from 'lucide-react';
import { NavigationTab } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ServicePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectService: (service: 'laundry' | 'document_delivery') => void;
  currentTab?: NavigationTab;
}

export const ServicePortalModal: React.FC<ServicePortalModalProps> = ({
  isOpen,
  onClose,
  onSelectService,
  currentTab,
}) => {
  const { language } = useLanguage();
  if (!isOpen) return null;

  return (
    <div
      id="service-portal-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-title"
    >
      {/* Dimmed Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/65 dark:bg-black/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Main Floating Modal Window */}
      <div className="relative w-full max-w-lg sm:max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col my-auto mx-1">
        {/* Top Accent Strip */}
        <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-600 via-rose-500 to-amber-500" />

        {/* Modal Header */}
        <div className="p-4 sm:p-6 pb-2 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>{language === 'th' ? 'แผนกธุรการลาดกระบัง 2' : 'Admin Department Lat Krabang 2'}</span>
            </div>
            <h2
              id="portal-title"
              className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight"
            >
              {language === 'th' ? 'เลือกบริการ' : 'Select Service'}
            </h2>
          </div>

          <button
            type="button"
            id="portal-close-button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label={language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
            title={language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2 Main Service Cards (คลังอุปกรณ์ แสดงเฉพาะในแถวด้านซ้าย) */}
        <div className="p-3 sm:p-6 pt-2 pb-5 sm:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-lg mx-auto">
            {/* Box 1: ข้อมูลการซัก-อบผ้า */}
            <button
              type="button"
              id="portal-option-laundry"
              onClick={() => onSelectService('laundry')}
              className={`group relative flex flex-col items-center justify-between text-center px-3 py-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
                currentTab === 'laundry'
                  ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/20'
                  : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <div className="flex flex-col items-center w-full min-w-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md sm:shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-all mb-2 sm:mb-3">
                  <Shirt className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2]" />
                </div>
                <h3 className="text-[13px] min-[360px]:text-sm sm:text-base font-bold sm:font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight text-center whitespace-nowrap tracking-tight w-full">
                  {language === 'th' ? 'ข้อมูลการซัก-อบผ้า' : 'Laundry & Drying'}
                </h3>
              </div>

              <div className="mt-2.5 sm:mt-3 pt-2 border-t border-slate-200/80 dark:border-slate-700/60 w-full flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform whitespace-nowrap">
                <span>{language === 'th' ? 'เข้าสู่บริการ' : 'Open Service'}</span>
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              </div>
            </button>

            {/* Box 2: รับ-ส่ง เอกสาร / พัสดุ */}
            <button
              type="button"
              id="portal-option-parcel"
              onClick={() => onSelectService('document_delivery')}
              className={`group relative flex flex-col items-center justify-between text-center px-3 py-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
                currentTab === 'document_delivery'
                  ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/20'
                  : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-700'
              }`}
            >
              <div className="flex flex-col items-center w-full min-w-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center shadow-md sm:shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-all mb-2 sm:mb-3">
                  <Package className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2]" />
                </div>
                <h3 className="text-[13px] min-[360px]:text-sm sm:text-base font-bold sm:font-black text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors leading-tight text-center whitespace-nowrap tracking-tight w-full">
                  {language === 'th' ? 'รับ-ส่ง เอกสาร / พัสดุ' : 'Document / Parcel'}
                </h3>
              </div>

              <div className="mt-2.5 sm:mt-3 pt-2 border-t border-slate-200/80 dark:border-slate-700/60 w-full flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:translate-x-0.5 transition-transform whitespace-nowrap">
                <span>{language === 'th' ? 'เข้าสู่บริการ' : 'Open Service'}</span>
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              </div>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
          <button
            type="button"
            id="portal-dismiss-button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {language === 'th' ? 'ปิด' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
