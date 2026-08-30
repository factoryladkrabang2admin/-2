import React from 'react';
import { 
  X, 
  Filter, 
  RotateCcw, 
  Check, 
  Building2, 
  User, 
  Calendar 
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export interface ChlorineFilters {
  building: string; // 'all' | 'อาคาร A' | 'อาคาร B'
  inspector: string; // 'all' | name
  startDate: string; // YYYY-MM-DD or empty
  endDate: string; // YYYY-MM-DD or empty
}

interface ChlorineFilterModalProps {
  isOpen: boolean;
  filters: ChlorineFilters;
  inspectorsList: string[];
  onClose: () => void;
  onApplyFilters: (newFilters: ChlorineFilters) => void;
  onResetFilters: () => void;
}

export const ChlorineFilterModal: React.FC<ChlorineFilterModalProps> = ({
  isOpen,
  filters,
  inspectorsList,
  onClose,
  onApplyFilters,
  onResetFilters,
}) => {
  const { language } = useLanguage();
  const [localFilters, setLocalFilters] = React.useState<ChlorineFilters>(filters);

  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    const emptyFilters: ChlorineFilters = {
      building: 'all',
      inspector: 'all',
      startDate: '',
      endDate: '',
    };
    setLocalFilters(emptyFilters);
    onResetFilters();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#002045] via-[#0b3366] to-[#002045] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Filter className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                {language === 'th' ? 'ตัวกรองข้อมูลการสุ่มตรวจคลอรีน' : 'Filter Chlorine Records'}
              </h3>
              <p className="text-xs text-slate-300">
                {language === 'th' ? 'กรองตามอาคาร ผู้ตรวจ หรือช่วงวันที่' : 'Filter by building, inspector, or date'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Building Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>{language === 'th' ? 'พื้นที่ / อาคาร' : 'Building / Area'}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: language === 'th' ? 'ทุกอาคาร' : 'All Buildings' },
                { id: 'อาคาร A', label: 'อาคาร A' },
                { id: 'อาคาร B', label: 'อาคาร B' },
              ].map((opt) => {
                const isSelected = localFilters.building === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLocalFilters({ ...localFilters, building: opt.id })}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#002045] text-white border-[#002045] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inspector Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-600" />
              <span>{language === 'th' ? 'ผู้ผสมสาร - ผู้สุ่มตรวจ' : 'Inspector'}</span>
            </label>
            <select
              value={localFilters.inspector}
              onChange={(e) => setLocalFilters({ ...localFilters, inspector: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{language === 'th' ? 'ผู้สุ่มตรวจทั้งหมด' : 'All Inspectors'}</option>
              {inspectorsList.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Date Range Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>{language === 'th' ? 'ช่วงวันที่ตรวจ' : 'Date Range'}</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-2xs text-slate-400 block mb-1">{language === 'th' ? 'จากวันที่' : 'Start Date'}</span>
                <input
                  type="date"
                  value={localFilters.startDate}
                  onChange={(e) => setLocalFilters({ ...localFilters, startDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white"
                />
              </div>
              <div>
                <span className="text-2xs text-slate-400 block mb-1">{language === 'th' ? 'ถึงวันที่' : 'End Date'}</span>
                <input
                  type="date"
                  value={localFilters.endDate}
                  onChange={(e) => setLocalFilters({ ...localFilters, endDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === 'th' ? 'ล้างตัวกรอง' : 'Reset'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-[#002045] hover:bg-[#003366] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{language === 'th' ? 'นำไปใช้' : 'Apply Filters'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
