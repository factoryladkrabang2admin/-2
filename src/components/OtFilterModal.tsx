import React, { useEffect } from 'react';
import { 
  X, 
  Filter, 
  RotateCcw, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  Check,
  Search,
  ArrowUpDown
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface OtFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  sortBy: string;
  onSortByChange: (sort: 'seq_desc' | 'seq_asc' | 'hours_desc' | 'date_desc') => void;
  departments: string[];
  selectedDepartment: string;
  onSelectDepartment: (dept: string) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  onResetFilters: () => void;
  activeFiltersCount: number;
}

export const OtFilterModal: React.FC<OtFilterModalProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSearchQueryChange,
  sortBy,
  onSortByChange,
  departments,
  selectedDepartment,
  onSelectDepartment,
  selectedStatus,
  onSelectStatus,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onResetFilters,
  activeFiltersCount,
}) => {
  const { language } = useLanguage();

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

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-sky-100 overflow-hidden flex flex-col max-h-[90vh] z-[110] relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#002045] to-[#003366] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Filter className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {language === 'th' ? 'ตัวกรองและการค้นหา OT' : 'Filter & Search OT'}
              </h3>
              <p className="text-xs text-sky-200">
                {activeFiltersCount > 0 
                  ? (language === 'th' ? `กำลังใช้งาน ${activeFiltersCount} ตัวกรอง/ค้นหา` : `${activeFiltersCount} active filters`)
                  : (language === 'th' ? 'กำหนดเงื่อนไขการค้นหาและตัวกรอง' : 'Set search and filter criteria')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-[#1a1c1c]">
          {/* 1. Search Query */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              {language === 'th' ? 'คำค้นหา (รหัสพนักงาน, ชื่อ, เลขที่เอกสาร)' : 'Search Keywords'}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder={language === 'th' ? 'ค้นหารหัสพนักงาน, ชื่อ, ฝ่ายงาน, เลขที่เอกสาร...' : 'Search employee ID, name, dept, doc no...'}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchQueryChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Sorting */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              {language === 'th' ? 'เรียงลำดับข้อมูล' : 'Sort Order'}
            </label>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as any)}
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              >
                <option value="seq_desc">{language === 'th' ? 'รายการล่าสุด (บันทึกล่าสุด)' : 'Latest recorded'}</option>
                <option value="seq_asc">{language === 'th' ? 'รายการแรกสุด (บันทึกแรกสุด)' : 'First recorded'}</option>
                <option value="date_desc">{language === 'th' ? 'วันที่ทำ OT (ล่าสุดก่อน)' : 'OT Date (Newest first)'}</option>
                <option value="hours_desc">{language === 'th' ? 'ชั่วโมง OT สูงสุด' : 'Highest OT Hours'}</option>
              </select>
            </div>
          </div>

          {/* 3. Status Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              {language === 'th' ? 'สถานะการอนุมัติ (Status)' : 'Approval Status'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: language === 'th' ? 'ทั้งหมด' : 'All' },
                { id: 'Approved', label: 'Approved' },
                { id: 'Confirm', label: 'Confirm' },
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onSelectStatus(st.id)}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                    selectedStatus === st.id
                      ? 'bg-[#002045] text-white border-[#002045] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Department Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              {language === 'th' ? 'ฝ่ายงาน / แผนก (Department)' : 'Department'}
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => onSelectDepartment(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
            >
              <option value="all">{language === 'th' ? 'ทุกฝ่ายงาน (All Departments)' : 'All Departments'}</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* 5. Date Range Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              {language === 'th' ? 'ช่วงวันที่ทำ OT' : 'OT Date Range'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 mb-1 block">{language === 'th' ? 'ตั้งแต่วันที่' : 'From'}</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 mb-1 block">{language === 'th' ? 'ถึงวันที่' : 'To'}</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer hover:bg-slate-200/60"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {language === 'th' ? 'ล้างตัวกรอง' : 'Reset Filters'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#002045] hover:bg-[#003366] text-white font-bold text-xs shadow-md cursor-pointer transition-all"
          >
            {language === 'th' ? 'เสร็จสิ้น' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};
