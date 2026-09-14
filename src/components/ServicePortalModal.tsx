import React from 'react';
import { Shirt, Package, X, Sparkles } from 'lucide-react';
import { NavigationTab } from '../types';

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
        className="fixed inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Main Floating Modal Window */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col my-auto">
        {/* Top Accent Strip */}
        <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-indigo-500 via-pink-500 to-rose-500" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-3 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>ระบบงานธุรการลาดกระบัง 2</span>
            </div>
            <h2
              id="portal-title"
              className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight"
            >
              เลือกบริการ
            </h2>
          </div>

          <button
            type="button"
            id="portal-close-button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="ปิดหน้าต่าง"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Only Icon and Title per Box */}
        <div className="p-5 sm:p-6 pt-2 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Box 1: ข้อมูลการซักผ้า */}
            <button
              type="button"
              id="portal-option-laundry"
              onClick={() => onSelectService('laundry')}
              className={`group flex flex-col items-center justify-center text-center p-6 sm:p-8 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
                currentTab === 'laundry'
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/20 shadow-blue-500/10'
                  : 'bg-slate-50/90 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:bg-blue-700 group-hover:scale-110 transition-all mb-4">
                <Shirt className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                ข้อมูลการซักผ้า
              </h3>
            </button>

            {/* Box 2: รับ-ส่ง เอกสาร / พัสดุ */}
            <button
              type="button"
              id="portal-option-parcel"
              onClick={() => onSelectService('document_delivery')}
              className={`group flex flex-col items-center justify-center text-center p-6 sm:p-8 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
                currentTab === 'document_delivery'
                  ? 'bg-pink-50/80 dark:bg-pink-950/40 border-pink-400 dark:border-pink-600 ring-2 ring-pink-500/20 shadow-pink-500/10'
                  : 'bg-slate-50/90 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:bg-pink-50/60 dark:hover:bg-pink-950/30 hover:border-pink-300 dark:hover:border-pink-700'
              }`}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/30 group-hover:from-pink-700 group-hover:to-rose-600 group-hover:scale-110 transition-all mb-4">
                <Package className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                รับ-ส่ง เอกสาร / พัสดุ
              </h3>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            id="portal-dismiss-button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
