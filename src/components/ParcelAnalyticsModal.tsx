import React, { useMemo } from 'react';
import { 
  X, 
  BarChart3, 
  Send, 
  Inbox, 
  Package, 
  Building2, 
  User, 
  TrendingUp, 
  PieChart as PieChartIcon,
  Calendar,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ParcelDeliveryRecord } from '../types';

interface ParcelAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ParcelDeliveryRecord[];
}

export const ParcelAnalyticsModal: React.FC<ParcelAnalyticsModalProps> = ({
  isOpen,
  onClose,
  records,
}) => {
  if (!isOpen) return null;

  const stats = useMemo(() => {
    const total = records.length;
    const sent = records.filter(r => r.actionType === 'ส่ง').length;
    const received = records.filter(r => r.actionType === 'รับ').length;
    const other = total - (sent + received);

    const sentPct = total > 0 ? Math.round((sent / total) * 100) : 0;
    const receivedPct = total > 0 ? Math.round((received / total) * 100) : 0;

    // Sender Departments breakdown
    const senderDeptMap: Record<string, number> = {};
    const recipientDeptMap: Record<string, number> = {};
    const operatorMap: Record<string, number> = {};

    records.forEach(r => {
      if (r.senderDepartment && r.senderDepartment !== '-') {
        senderDeptMap[r.senderDepartment] = (senderDeptMap[r.senderDepartment] || 0) + 1;
      }
      if (r.recipientDepartment && r.recipientDepartment !== '-') {
        recipientDeptMap[r.recipientDepartment] = (recipientDeptMap[r.recipientDepartment] || 0) + 1;
      }
      if (r.operatorName && r.operatorName !== '-') {
        operatorMap[r.operatorName] = (operatorMap[r.operatorName] || 0) + 1;
      }
    });

    const topSenderDepts = Object.entries(senderDeptMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topRecipientDepts = Object.entries(recipientDeptMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topOperators = Object.entries(operatorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      total,
      sent,
      received,
      other,
      sentPct,
      receivedPct,
      topSenderDepts,
      topRecipientDepts,
      topOperators,
    };
  }, [records]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-pink-100 dark:border-slate-800 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Pink Gradient) */}
        <div className="p-6 bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-inner">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-pink-50 border border-white/20">
                  Analytics & Overview
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black mt-0.5">
                สถิติและการวิเคราะห์การรับ-ส่ง เอกสาร / พัสดุ
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">
          {/* Top KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total */}
            <div className="p-4 rounded-2xl bg-pink-50/70 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-700 dark:text-pink-300 uppercase tracking-wider">
                  รายการทั้งหมด
                </span>
                <Package className="w-4 h-4 text-pink-500" />
              </div>
              <div className="text-3xl font-black text-pink-900 dark:text-pink-100 mt-2">
                {stats.total.toLocaleString()}
              </div>
              <div className="text-xs text-pink-600 dark:text-pink-400 mt-1">
                บันทึกสะสมในระบบ
              </div>
            </div>

            {/* Sent */}
            <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                  รายการส่ง (Outgoing)
                </span>
                <Send className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-3xl font-black text-rose-900 dark:text-rose-100 mt-2 flex items-baseline gap-2">
                {stats.sent.toLocaleString()}
                <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                  ({stats.sentPct}%)
                </span>
              </div>
              <div className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                พัสดุ/เอกสารขาออก
              </div>
            </div>

            {/* Received */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                  รายการรับ (Incoming)
                </span>
                <Inbox className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-emerald-900 dark:text-emerald-100 mt-2 flex items-baseline gap-2">
                {stats.received.toLocaleString()}
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  ({stats.receivedPct}%)
                </span>
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                พัสดุ/เอกสารขาเข้า
              </div>
            </div>
          </div>

          {/* Ratio bar */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <Send className="w-3.5 h-3.5" /> รายการส่ง ({stats.sentPct}%)
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Inbox className="w-3.5 h-3.5" /> รายการรับ ({stats.receivedPct}%)
              </span>
            </div>
            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
              <div 
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${stats.sentPct}%` }}
              />
              <div 
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${stats.receivedPct}%` }}
              />
            </div>
          </div>

          {/* Department Rankings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Top Sending Departments */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-300 mb-3">
                <Building2 className="w-4 h-4 text-rose-500" />
                5 อันดับแผนกผู้ส่งสูงสุด
              </div>
              {stats.topSenderDepts.length > 0 ? (
                <div className="space-y-2.5">
                  {stats.topSenderDepts.map(([dept, count], idx) => (
                    <div key={dept} className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200 truncate">
                        <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </span>
                        <span className="truncate">{dept}</span>
                      </div>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {count} รายการ
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic py-2">ไม่มีข้อมูลแผนก</div>
              )}
            </div>

            {/* Top Receiving Departments */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-3">
                <Building2 className="w-4 h-4 text-emerald-500" />
                5 อันดับแผนกผู้รับสูงสุด
              </div>
              {stats.topRecipientDepts.length > 0 ? (
                <div className="space-y-2.5">
                  {stats.topRecipientDepts.map(([dept, count], idx) => (
                    <div key={dept} className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200 truncate">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </span>
                        <span className="truncate">{dept}</span>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {count} รายการ
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic py-2">ไม่มีข้อมูลแผนก</div>
              )}
            </div>
          </div>

          {/* Top Operators */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm font-bold text-pink-700 dark:text-pink-300 mb-3">
              <User className="w-4 h-4 text-pink-500" />
              เจ้าหน้าที่ผู้ทำรายการสูงสุด (Top Operators)
            </div>
            {stats.topOperators.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {stats.topOperators.map(([name, count], idx) => (
                  <div key={name} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </div>
                      <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {name}
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pink-50 dark:bg-pink-950 text-pink-600 dark:text-pink-300">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic py-2">ไม่มีข้อมูลผู้ทำรายการ</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
