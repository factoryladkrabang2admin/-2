import React, { useState, useEffect } from 'react';
import { 
  X, 
  PieChart, 
  BarChart3, 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  Sparkles,
  TrendingUp,
  User,
  Sparkle,
  Shirt,
  Key,
  Layers,
  Award
} from 'lucide-react';
import { EquipmentRecord, EquipmentSubCategory } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface EquipmentAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: EquipmentRecord[];
  activeSubCategory: EquipmentSubCategory;
}

export const EquipmentAnalyticsModal: React.FC<EquipmentAnalyticsModalProps> = ({
  isOpen,
  onClose,
  records,
  activeSubCategory,
}) => {
  const { language } = useLanguage();
  const [activeChartTab, setActiveChartTab] = useState<'status' | 'departments' | 'topRequesters'>('status');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalCount = records.length;
  const totalQuantity = records.reduce((sum, r) => sum + (r.totalQuantity || 1), 0);

  const returnCount = records.filter((r) => r.actionType === 'คืน' || r.status.includes('คืน')).length;
  const requisitionCount = records.filter((r) => r.actionType !== 'คืน' && !r.status.includes('คืน')).length;

  const returnPct = totalCount > 0 ? Math.round((returnCount / totalCount) * 100) : 0;
  const requisitionPct = totalCount > 0 ? Math.round((requisitionCount / totalCount) * 100) : 0;

  // Department distribution
  const deptCounts: Record<string, { count: number; qty: number }> = {};
  records.forEach((r) => {
    const dept = r.department?.trim() || (language === 'th' ? 'ไม่ระบุแผนก' : 'Unspecified');
    if (!deptCounts[dept]) {
      deptCounts[dept] = { count: 0, qty: 0 };
    }
    deptCounts[dept].count += 1;
    deptCounts[dept].qty += (r.totalQuantity || 1);
  });

  const topDepartments = Object.entries(deptCounts)
    .map(([dept, data]) => ({ dept, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // Top Requesters
  const requesterCounts: Record<string, { count: number; dept: string; qty: number }> = {};
  records.forEach((r) => {
    const name = r.requesterName?.trim() || (language === 'th' ? 'ไม่ระบุชื่อ' : 'Unknown');
    if (!requesterCounts[name]) {
      requesterCounts[name] = { count: 0, dept: r.department || '-', qty: 0 };
    }
    requesterCounts[name].count += 1;
    requesterCounts[name].qty += (r.totalQuantity || 1);
  });

  const topRequesters = Object.entries(requesterCounts)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  const getSubCategoryTitle = (sub: EquipmentSubCategory) => {
    switch (sub) {
      case 'cleaning':
        return language === 'th' ? 'อุปกรณ์ทำความสะอาด' : 'Cleaning Supplies';
      case 'gown':
        return language === 'th' ? 'เสื้อกาวน์' : 'Gowns';
      case 'keys':
        return language === 'th' ? 'กุญแจ' : 'Keys';
      case 'ladder':
        return language === 'th' ? 'บันไดทรง A' : 'A-Frame Ladder';
      default:
        return language === 'th' ? 'เบิกอุปกรณ์' : 'Equipment';
    }
  };

  // Donut Calculation
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const returnStroke = (returnPct / 100) * circumference;
  const reqStroke = (requisitionPct / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-orange-200/80 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50 border-b border-orange-200/80 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-600/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-[#7c2d12]">
                  {language === 'th' ? 'สถิติและภาพรวมการเบิกอุปกรณ์' : 'Equipment Analytics & Overview'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-200/80 text-orange-950 text-[11px] font-bold">
                  {getSubCategoryTitle(activeSubCategory)}
                </span>
              </div>
              <p className="text-xs text-orange-900/80 font-medium">
                {language === 'th' 
                  ? `วิเคราะห์จากข้อมูลบันทึกทั้งหมด ${totalCount} รายการ (${totalQuantity} ชิ้น)` 
                  : `Analyzed from all ${totalCount} records (${totalQuantity} items)`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Quick Metric Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200/80 text-center">
              <span className="text-[11px] font-bold text-orange-900">{language === 'th' ? 'รายการบันทึก' : 'Total Logs'}</span>
              <p className="text-2xl font-black text-[#7c2d12] mt-0.5">{totalCount}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center">
              <span className="text-[11px] font-bold text-amber-900">{language === 'th' ? 'เบิก / ยืม' : 'Requisitions'}</span>
              <p className="text-2xl font-black text-amber-700 mt-0.5">{requisitionCount}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-center">
              <span className="text-[11px] font-bold text-emerald-900">{language === 'th' ? 'ส่งคืนแล้ว' : 'Returned'}</span>
              <p className="text-2xl font-black text-emerald-700 mt-0.5">{returnCount}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 text-center">
              <span className="text-[11px] font-bold text-sky-900">{language === 'th' ? 'จำนวนชิ้นรวม' : 'Total Units'}</span>
              <p className="text-2xl font-black text-sky-700 mt-0.5">{totalQuantity}</p>
            </div>
          </div>

          {/* Sub Navigation Tabs inside Modal */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveChartTab('status')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeChartTab === 'status'
                  ? 'bg-white text-orange-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'th' ? 'สัดส่วนสถานะ' : 'Status Ratio'}
            </button>
            <button
              type="button"
              onClick={() => setActiveChartTab('departments')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeChartTab === 'departments'
                  ? 'bg-white text-orange-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'th' ? 'อันดับตามแผนก' : 'By Department'}
            </button>
            <button
              type="button"
              onClick={() => setActiveChartTab('topRequesters')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeChartTab === 'topRequesters'
                  ? 'bg-white text-orange-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'th' ? 'ผู้เบิกบ่อยที่สุด' : 'Top Requesters'}
            </button>
          </div>

          {/* Tab 1: Status Donut Chart */}
          {activeChartTab === 'status' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-around gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                {/* SVG Donut */}
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                    {/* Background Ring */}
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      className="stroke-slate-200"
                      strokeWidth="16"
                      fill="transparent"
                    />
                    {/* Requisition Ring (Amber) */}
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      className="stroke-amber-500 transition-all duration-700"
                      strokeWidth="16"
                      strokeDasharray={`${reqStroke} ${circumference}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      fill="transparent"
                    />
                    {/* Return Ring (Emerald) */}
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      className="stroke-emerald-500 transition-all duration-700"
                      strokeWidth="16"
                      strokeDasharray={`${returnStroke} ${circumference}`}
                      strokeDashoffset={`-${reqStroke}`}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-slate-500 font-bold">{language === 'th' ? 'อัตราคืน' : 'Return Rate'}</span>
                    <span className="text-2xl font-black text-emerald-700">{returnPct}%</span>
                  </div>
                </div>

                {/* Legend & Details */}
                <div className="space-y-3 flex-1 max-w-xs">
                  <div className="p-3 rounded-xl bg-white border border-amber-200 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold text-slate-700">{language === 'th' ? 'รายการเบิก / ยืม' : 'Requisitions'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-amber-700">{requisitionCount}</span>
                      <span className="text-[11px] text-slate-400 ml-1">({requisitionPct}%)</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-slate-700">{language === 'th' ? 'คืนอุปกรณ์เรียบร้อย' : 'Returned'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-700">{returnCount}</span>
                      <span className="text-[11px] text-slate-400 ml-1">({returnPct}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Top Departments */}
          {activeChartTab === 'departments' && (
            <div className="space-y-3">
              {topDepartments.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">{language === 'th' ? 'ไม่มีข้อมูลแผนก' : 'No department data'}</p>
              ) : (
                topDepartments.map((d, idx) => {
                  const pct = totalCount > 0 ? Math.round((d.count / totalCount) * 100) : 0;
                  return (
                    <div key={d.dept} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span>{d.dept}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="text-orange-700 font-bold">{d.count} {language === 'th' ? 'ครั้ง' : 'times'}</span>
                          <span className="text-slate-400 font-normal">({d.qty} {language === 'th' ? 'ชิ้น' : 'items'})</span>
                          <span className="text-slate-500 text-[11px] font-mono">{pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 3: Top Requesters */}
          {activeChartTab === 'topRequesters' && (
            <div className="space-y-3">
              {topRequesters.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">{language === 'th' ? 'ไม่มีข้อมูลผู้เบิก' : 'No requester data'}</p>
              ) : (
                topRequesters.map((r, idx) => {
                  const pct = totalCount > 0 ? Math.round((r.count / totalCount) * 100) : 0;
                  return (
                    <div key={r.name} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span>{r.name}</span>
                          <span className="text-[11px] text-slate-400 font-normal">({r.dept})</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="text-amber-800 font-bold">{r.count} {language === 'th' ? 'ครั้ง' : 'times'}</span>
                          <span className="text-slate-400 font-normal">({r.qty} {language === 'th' ? 'ชิ้น' : 'items'})</span>
                          <span className="text-slate-500 text-[11px] font-mono">{pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
