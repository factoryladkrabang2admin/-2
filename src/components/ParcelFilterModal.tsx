import React, { useState, useEffect } from 'react';
import { 
  X, 
  Filter, 
  RotateCcw, 
  Check, 
  Calendar, 
  Building2, 
  Package, 
  Send, 
  Inbox,
  Search
} from 'lucide-react';
import { ParcelDeliveryRecord } from '../types';

export interface ParcelFilterState {
  actionType: string;         // 'all' | 'ส่ง' | 'รับ'
  senderDepartment: string;   // 'all' or specific dept
  recipientDepartment: string;// 'all' or specific dept
  startDate: string;          // YYYY-MM-DD or empty
  endDate: string;            // YYYY-MM-DD or empty
  keyword: string;            // search keyword
}

interface ParcelFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ParcelFilterState;
  onApply: (newFilters: ParcelFilterState) => void;
  records: ParcelDeliveryRecord[];
}

export const ParcelFilterModal: React.FC<ParcelFilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  onApply,
  records,
}) => {
  const [localFilters, setLocalFilters] = useState<ParcelFilterState>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  if (!isOpen) return null;

  // Extract unique departments for senders and recipients
  const senderDepartments = Array.from(
    new Set(records.map(r => r.senderDepartment).filter(d => d && d !== '-'))
  ).sort();

  const recipientDepartments = Array.from(
    new Set(records.map(r => r.recipientDepartment).filter(d => d && d !== '-'))
  ).sort();

  const handleReset = () => {
    const empty: ParcelFilterState = {
      actionType: 'all',
      senderDepartment: 'all',
      recipientDepartment: 'all',
      startDate: '',
      endDate: '',
      keyword: '',
    };
    setLocalFilters(empty);
    onApply(empty);
    onClose();
  };

  const handleSave = () => {
    onApply(localFilters);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-pink-100 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-pink-600 to-rose-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">ตัวกรองเอกสารและพัสดุ</h3>
              <p className="text-xs text-pink-100">ปรับแต่งเงื่อนไขการค้นหาและแสดงผล</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-700 dark:text-slate-200 text-sm">
          {/* Action Type Filter */}
          <div>
            <label className="block font-semibold text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              ประเภทรายการ
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLocalFilters({ ...localFilters, actionType: 'all' })}
                className={`py-2 px-3 rounded-xl font-medium text-xs sm:text-sm border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  localFilters.actionType === 'all'
                    ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-pink-50 dark:hover:bg-slate-700'
                }`}
              >
                <Package className="w-4 h-4" />
                ทั้งหมด
              </button>

              <button
                type="button"
                onClick={() => setLocalFilters({ ...localFilters, actionType: 'ส่ง' })}
                className={`py-2 px-3 rounded-xl font-medium text-xs sm:text-sm border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  localFilters.actionType === 'ส่ง'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-slate-700'
                }`}
              >
                <Send className="w-4 h-4" />
                รายการส่ง
              </button>

              <button
                type="button"
                onClick={() => setLocalFilters({ ...localFilters, actionType: 'รับ' })}
                className={`py-2 px-3 rounded-xl font-medium text-xs sm:text-sm border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  localFilters.actionType === 'รับ'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700'
                }`}
              >
                <Inbox className="w-4 h-4" />
                รายการรับ
              </button>
            </div>
          </div>

          {/* Sender Department */}
          <div>
            <label className="block font-semibold text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              แผนกผู้ส่ง
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={localFilters.senderDepartment}
                onChange={(e) => setLocalFilters({ ...localFilters, senderDepartment: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-pink-500"
              >
                <option value="all">ทุกแผนกผู้ส่ง</option>
                {senderDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Recipient Department */}
          <div>
            <label className="block font-semibold text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              แผนกผู้รับ
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={localFilters.recipientDepartment}
                onChange={(e) => setLocalFilters({ ...localFilters, recipientDepartment: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-pink-500"
              >
                <option value="all">ทุกแผนกผู้รับ</option>
                {recipientDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search keyword */}
          <div>
            <label className="block font-semibold text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              คำค้นหาเฉพาะ (ชื่อเอกสาร/พัสดุ หรือชื่อบุคคล)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ระบุคำค้นหา..."
                value={localFilters.keyword}
                onChange={(e) => setLocalFilters({ ...localFilters, keyword: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="block font-semibold text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              ช่วงวันที่บันทึก (Date Range)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-slate-400 block mb-1">ตั้งแต่วันที่</span>
                <input
                  type="date"
                  value={localFilters.startDate}
                  onChange={(e) => setLocalFilters({ ...localFilters, startDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">ถึงวันที่</span>
                <input
                  type="date"
                  value={localFilters.endDate}
                  onChange={(e) => setLocalFilters({ ...localFilters, endDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-pink-600 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            ล้างตัวกรองทั้งหมด
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              ใช้งานตัวกรอง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
