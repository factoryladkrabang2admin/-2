import React from 'react';
import { 
  X, 
  BarChart3, 
  Building2, 
  Users, 
  Calendar, 
  FlaskConical,
  Award,
  TrendingUp,
  PieChart as PieChartIcon
} from 'lucide-react';
import { ChlorineInspectionRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ChlorineAnalyticsModalProps {
  isOpen: boolean;
  records: ChlorineInspectionRecord[];
  onClose: () => void;
}

export const ChlorineAnalyticsModal: React.FC<ChlorineAnalyticsModalProps> = ({
  isOpen,
  records,
  onClose,
}) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  const total = records.length;
  const buildingACount = records.filter(r => r.building.includes('A')).length;
  const buildingBCount = records.filter(r => r.building.includes('B')).length;
  const buildingAPercent = total > 0 ? Math.round((buildingACount / total) * 100) : 0;
  const buildingBPercent = total > 0 ? Math.round((buildingBCount / total) * 100) : 0;

  // Inspector counts
  const inspectorMap: { [name: string]: number } = {};
  records.forEach(r => {
    const name = r.inspectorName || 'ไม่ระบุ';
    inspectorMap[name] = (inspectorMap[name] || 0) + 1;
  });

  const inspectorRankings = Object.entries(inspectorMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#002045] via-[#0b3366] to-[#002045] text-white p-6 relative">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md shadow-inner">
                <BarChart3 className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-mono font-bold tracking-wider">
                  STATISTICS & INSIGHTS
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                  {language === 'th' ? 'สถิติและผลการสุ่มตรวจคลอรีน' : 'Chlorine Inspection Analytics'}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">{language === 'th' ? 'รายการตรวจทั้งหมด' : 'Total Inspections'}</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <FlaskConical className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900">{total.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">{language === 'th' ? 'รายการบันทึกสมบูรณ์' : 'Verified records'}</p>
            </div>

            {/* Building A */}
            <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between text-amber-700 mb-2">
                <span className="text-xs font-bold">{language === 'th' ? 'อาคาร A' : 'Building A'}</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-amber-950">{buildingACount.toLocaleString()}</p>
                <span className="text-xs font-bold text-amber-600">({buildingAPercent}%)</span>
              </div>
              <p className="text-xs text-amber-700/80 mt-1">{language === 'th' ? 'สุ่มตรวจในอาคาร A' : 'In Building A'}</p>
            </div>

            {/* Building B */}
            <div className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-2xs">
              <div className="flex items-center justify-between text-indigo-700 mb-2">
                <span className="text-xs font-bold">{language === 'th' ? 'อาคาร B' : 'Building B'}</span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-indigo-950">{buildingBCount.toLocaleString()}</p>
                <span className="text-xs font-bold text-indigo-600">({buildingBPercent}%)</span>
              </div>
              <p className="text-xs text-indigo-700/80 mt-1">{language === 'th' ? 'สุ่มตรวจในอาคาร B' : 'In Building B'}</p>
            </div>
          </div>

          {/* Building Distribution Ratio Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-slate-600" />
              <span>{language === 'th' ? 'สัดส่วนการตรวจแยกตามอาคาร' : 'Building Distribution Ratio'}</span>
            </h3>
            
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${buildingAPercent}%` }} 
                className="bg-amber-500 h-full transition-all duration-500"
                title={`อาคาร A: ${buildingACount} (${buildingAPercent}%)`}
              />
              <div 
                style={{ width: `${buildingBPercent}%` }} 
                className="bg-indigo-600 h-full transition-all duration-500"
                title={`อาคาร B: ${buildingBCount} (${buildingBPercent}%)`}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mt-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-amber-500" />
                <span>อาคาร A: {buildingACount} รายการ ({buildingAPercent}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-indigo-600" />
                <span>อาคาร B: {buildingBCount} รายการ ({buildingBPercent}%)</span>
              </div>
            </div>
          </div>

          {/* Top Inspectors Ranking */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>{language === 'th' ? 'อันดับผู้ผสมสาร - ผู้สุ่มตรวจ (ตามจำนวนครั้ง)' : 'Top Inspectors by Volume'}</span>
              </span>
              <span className="text-xs font-normal text-slate-500">
                {inspectorRankings.length} {language === 'th' ? 'คน' : 'people'}
              </span>
            </h3>

            <div className="space-y-3">
              {inspectorRankings.slice(0, 8).map((item, idx) => {
                const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      idx === 0 ? 'bg-amber-100 text-amber-800 font-black' :
                      idx === 1 ? 'bg-slate-200 text-slate-700' :
                      idx === 2 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-slate-50 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>

                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-slate-800">{item.name}</span>
                        <span className="text-slate-500">{item.count} {language === 'th' ? 'ครั้ง' : 'times'} ({percent}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#002045] hover:bg-[#003366] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
