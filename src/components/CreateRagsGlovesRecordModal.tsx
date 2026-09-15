import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { AdminUserAccount, canRecordRagsGloves } from '../data/mockData';
import { 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  RotateCcw, 
  Hand,
  Calendar,
  Scale,
  Sparkles,
  Trash2,
  Lock,
  Loader2
} from 'lucide-react';

export const GOOGLE_RAGS_GLOVES_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSd0iF7VKIbQxRsvXbhVZXiIXkkBfe7Mu26D0dLWhaOfVbfkrw/viewform?usp=pp_url';

interface CreateRagsGlovesRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AdminUserAccount;
  isAuthenticated?: boolean;
  defaultDate?: string; // YYYY-MM-DD
  onRecordSaved?: (record: any) => void;
  onSyncRequested?: () => void;
}

export const CreateRagsGlovesRecordModal: React.FC<CreateRagsGlovesRecordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isAuthenticated = true,
  defaultDate,
  onRecordSaved,
  onSyncRequested
}) => {
  const { language } = useLanguage();

  // Verify permission: ผู้ดูแล, แอดมินเพจ และพนักงานตำแหน่งธุรการ เท่านั้น
  const isAuthorized = useMemo(() => {
    return canRecordRagsGloves(currentUser, isAuthenticated);
  }, [currentUser, isAuthenticated]);

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Form states
  const [date, setDate] = useState<string>(defaultDate || todayStr);
  const [discardRags, setDiscardRags] = useState<string>('');
  const [discardGloves, setDiscardGloves] = useState<string>('');
  const [beforeRags, setBeforeRags] = useState<string>('');
  const [beforeGloves, setBeforeGloves] = useState<string>('');
  const [afterRags, setAfterRags] = useState<string>('');
  const [afterGloves, setAfterGloves] = useState<string>('');

  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Totals calculations
  const totals = useMemo(() => {
    const dRags = parseFloat(discardRags) || 0;
    const dGloves = parseFloat(discardGloves) || 0;
    const bRags = parseFloat(beforeRags) || 0;
    const bGloves = parseFloat(beforeGloves) || 0;
    const aRags = parseFloat(afterRags) || 0;
    const aGloves = parseFloat(afterGloves) || 0;

    const discardTotal = dRags + dGloves;
    const beforeTotal = bRags + bGloves;
    const afterTotal = aRags + aGloves;
    const netTotal = beforeTotal - afterTotal - discardTotal;

    return {
      discardTotal: Math.round(discardTotal * 100) / 100,
      beforeTotal: Math.round(beforeTotal * 100) / 100,
      afterTotal: Math.round(afterTotal * 100) / 100,
      netTotal: Math.round(netTotal * 100) / 100,
      hasInput: (discardTotal > 0 || beforeTotal > 0 || afterTotal > 0)
    };
  }, [discardRags, discardGloves, beforeRags, beforeGloves, afterRags, afterGloves]);

  if (!isOpen) return null;

  // Handle Quick Date Buttons
  const handleSetQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDate(`${y}-${m}-${day}`);
    setIsSaved(false);
    if (submitSuccess) setSubmitSuccess(null);
  };

  // Reset Form
  const handleReset = () => {
    setDate(todayStr);
    setDiscardRags('');
    setDiscardGloves('');
    setBeforeRags('');
    setBeforeGloves('');
    setAfterRags('');
    setAfterGloves('');
    setIsSaved(false);
    setSubmitSuccess(null);
    setSubmitError(null);
  };

  // Submit via Server Proxy to Google Form & Google Sheet
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setSubmitError(language === 'th' ? 'คุณไม่มีสิทธิ์ในการทำรายการนี้ (เฉพาะผู้ดูแล, แอดมินเพจ และธุรการ)' : 'Unauthorized');
      return;
    }

    if (!date) {
      setSubmitError(language === 'th' ? 'กรุณาระบุวันที่' : 'Please specify a date');
      return;
    }

    if (!totals.hasInput) {
      setSubmitError(language === 'th' ? 'กรุณากรอกข้อมูลน้ำหนักอย่างน้อย 1 รายการ' : 'Please enter at least one weight record');
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(null);
    setSubmitError(null);

    try {
      const payload = {
        date,
        discardRags: parseFloat(discardRags) || 0,
        discardGloves: parseFloat(discardGloves) || 0,
        beforeRags: parseFloat(beforeRags) || 0,
        beforeGloves: parseFloat(beforeGloves) || 0,
        afterRags: parseFloat(afterRags) || 0,
        afterGloves: parseFloat(afterGloves) || 0,
      };

      const res = await fetch('/api/rags-gloves-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsSaved(true);
        setSubmitSuccess(
          language === 'th'
            ? 'บันทึกข้อมูลเรียบร้อยแล้ว'
            : 'Record saved successfully'
        );

        if (onRecordSaved && data.record) {
          onRecordSaved(data.record);
        }

        // Trigger Google Sheet sync so the latest records reload
        if (onSyncRequested) {
          setTimeout(() => {
            onSyncRequested();
          }, 1500);
        }

        // Auto close after 2.5 seconds so user has clear visual confirmation of the green button
        setTimeout(() => {
          handleReset();
          onClose();
        }, 2500);
      } else {
        setSubmitError(data.error || (language === 'th' ? 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' : 'Failed to submit record'));
      }
    } catch (err: any) {
      setSubmitError(err?.message || (language === 'th' ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' : 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-[#d7ccc8] w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#5d4037] via-[#6d4c41] to-[#8d5b4c] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Hand className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {language === 'th' ? 'บันทึกรายการ เศษผ้า - ถุงมือ' : 'Record Rags & Gloves (เศษผ้า - ถุงมือ)'}
              </h2>
              <p className="text-[11px] sm:text-xs text-amber-100/80 mt-0.5 font-medium">
                {language === 'th' 
                  ? 'กรอกข้อมูลน้ำหนักเศษผ้าและถุงมือประจำวัน (หน่วย: KG)' 
                  : 'Daily weight record of rags and gloves (KG)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Authorization Guard */}
        {!isAuthorized ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {language === 'th' ? 'จำกัดสิทธิ์การทำรายการ' : 'Restricted Access'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md">
              {language === 'th'
                ? 'ไอคอนบันทึกรายการ จำกัดสิทธิ์การมองเห็นและทำรายการเฉพาะ ผู้ดูแล, แอดมินเพจ และพนักงาน ตำแหน่งธุรการ เท่านั้น'
                : 'This action is restricted to Super Administrator, Page Admin, and Administrative Staff only.'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* Status alerts */}
            {submitSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3 flex items-center gap-2 text-xs font-bold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}
            {submitError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3 flex items-center gap-2 text-xs font-bold animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Date Input */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#6d4c41]" />
                  <span>{language === 'th' ? 'กรุณาระบุวันที่' : 'Select Date'}</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate(0)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                  >
                    {language === 'th' ? 'วันนี้' : 'Today'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate(-1)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                  >
                    {language === 'th' ? 'เมื่อวาน' : 'Yesterday'}
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setIsSaved(false);
                  if (submitSuccess) setSubmitSuccess(null);
                }}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8d5b4c] focus:border-transparent bg-slate-50/50"
              />
            </div>

            {/* Grid of 3 Sections: คัดทิ้ง, ก่อนซัก, หลังซัก */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* 1. คัดทิ้ง (KG) */}
              <div className="bg-amber-50/40 rounded-2xl p-4 border border-amber-200/70 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                  <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-amber-700" />
                    {language === 'th' ? 'คัดทิ้ง (KG)' : 'Discard (KG)'}
                  </span>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                    {totals.discardTotal} KG
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                      {language === 'th' ? 'เศษผ้า (KG)' : 'Rags (KG)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={discardRags}
                      onChange={(e) => {
                        setDiscardRags(e.target.value);
                        setIsSaved(false);
                        if (submitSuccess) setSubmitSuccess(null);
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                      {language === 'th' ? 'ถุงมือ (KG)' : 'Gloves (KG)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={discardGloves}
                      onChange={(e) => {
                        setDiscardGloves(e.target.value);
                        setIsSaved(false);
                        if (submitSuccess) setSubmitSuccess(null);
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* 2. ก่อนซัก (KG) */}
              <div className="bg-sky-50/40 rounded-2xl p-4 border border-sky-200/70 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-sky-200/60">
                  <span className="text-xs font-black text-sky-900 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-sky-700" />
                    {language === 'th' ? 'ก่อนซัก (KG)' : 'Before Wash (KG)'}
                  </span>
                  <span className="text-[11px] font-bold text-sky-800 bg-sky-100/70 px-2 py-0.5 rounded-md">
                    {totals.beforeTotal} KG
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                      {language === 'th' ? 'เศษผ้า (KG)' : 'Rags (KG)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={beforeRags}
                      onChange={(e) => {
                        setBeforeRags(e.target.value);
                        setIsSaved(false);
                        if (submitSuccess) setSubmitSuccess(null);
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-sky-200 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                      {language === 'th' ? 'ถุงมือ (KG)' : 'Gloves (KG)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={beforeGloves}
                      onChange={(e) => {
                        setBeforeGloves(e.target.value);
                        setIsSaved(false);
                        if (submitSuccess) setSubmitSuccess(null);
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-sky-200 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. หลังซัก (KG) */}
              <div className="bg-emerald-50/40 rounded-2xl p-4 border border-emerald-200/70 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                  <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    {language === 'th' ? 'หลังซัก (KG)' : 'After Wash (KG)'}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    {totals.afterTotal} KG
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                      {language === 'th' ? 'เศษผ้า (KG)' : 'Rags (KG)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={afterRags}
                      onChange={(e) => {
                        setAfterRags(e.target.value);
                        setIsSaved(false);
                        if (submitSuccess) setSubmitSuccess(null);
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-emerald-200 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                      {language === 'th' ? 'ถุงมือ (KG)' : 'Gloves (KG)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={afterGloves}
                      onChange={(e) => {
                        setAfterGloves(e.target.value);
                        setIsSaved(false);
                        if (submitSuccess) setSubmitSuccess(null);
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-emerald-200 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary calculation card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <span className="text-slate-500 block text-[10px]">{language === 'th' ? 'รวมคัดทิ้ง' : 'Total Discard'}</span>
                  <span className="font-bold text-amber-800">{totals.discardTotal} KG</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{language === 'th' ? 'รวมก่อนซัก' : 'Total Before'}</span>
                  <span className="font-bold text-sky-800">{totals.beforeTotal} KG</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">{language === 'th' ? 'รวมหลังซัก' : 'Total After'}</span>
                  <span className="font-bold text-emerald-800">{totals.afterTotal} KG</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">{language === 'th' ? 'ยอดคงเหลือสุทธิ' : 'Net Weight'}</span>
                <span className="font-black text-sm text-[#4e342e]">
                  {totals.netTotal} KG
                </span>
              </div>
            </div>

            {/* Form Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'th' ? 'ล้างข้อมูล' : 'Reset'}</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !totals.hasInput}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                  isSaved
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/40 shadow-emerald-700/20'
                    : 'bg-gradient-to-r from-[#5d4037] to-[#8d5b4c] hover:from-[#4e342e] hover:to-[#6d4c41] text-white hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{language === 'th' ? 'กำลังบันทึกข้อมูล...' : 'Saving...'}</span>
                  </>
                ) : isSaved ? (
                  <>
                    <Check className="w-4 h-4 text-white stroke-[2.5]" />
                    <span>{language === 'th' ? 'บันทึกข้อมูลแล้ว' : 'Saved'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{language === 'th' ? 'บันทึกข้อมูล' : 'Save Record'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
