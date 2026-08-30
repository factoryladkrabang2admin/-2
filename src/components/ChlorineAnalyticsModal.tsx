import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  BarChart3, 
  Building2, 
  Users, 
  Calendar, 
  FlaskConical,
  Award,
  TrendingUp,
  PieChart as PieChartIcon,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle
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
  const [activeTab, setActiveTab] = useState<'building' | 'type' | 'inspector'>('building');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  const total = records.length;
  const buildingACount = records.filter(r => (r.building || '').includes('A')).length;
  const buildingBCount = records.filter(r => (r.building || '').includes('B')).length;
  const buildingAPercent = total > 0 ? Math.round((buildingACount / total) * 100) : 0;
  const buildingBPercent = total > 0 ? Math.round((buildingBCount / total) * 100) : 0;

  // 1. Building Donut Data (อาคาร A vs อาคาร B)
  const buildingDonutData = useMemo(() => {
    const items = [
      {
        id: 'building-a',
        name: language === 'th' ? 'อาคาร A' : 'Building A',
        count: buildingACount,
        color: '#f59e0b', // Amber 500
        bgColor: 'bg-amber-500',
        lightBg: 'bg-amber-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-800',
        percentage: total > 0 ? Math.round((buildingACount / total) * 100) : 0,
      },
      {
        id: 'building-b',
        name: language === 'th' ? 'อาคาร B' : 'Building B',
        count: buildingBCount,
        color: '#4f46e5', // Indigo 600
        bgColor: 'bg-indigo-600',
        lightBg: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        textColor: 'text-indigo-800',
        percentage: total > 0 ? Math.round((buildingBCount / total) * 100) : 0,
      },
    ];

    const otherCount = total - (buildingACount + buildingBCount);
    if (otherCount > 0) {
      items.push({
        id: 'building-other',
        name: language === 'th' ? 'อื่นๆ / ไม่ระบุอาคาร' : 'Other / Unspecified',
        count: otherCount,
        color: '#64748b', // Slate 500
        bgColor: 'bg-slate-500',
        lightBg: 'bg-slate-50',
        borderColor: 'border-slate-200',
        textColor: 'text-slate-800',
        percentage: total > 0 ? Math.round((otherCount / total) * 100) : 0,
      });
    }

    return items;
  }, [buildingACount, buildingBCount, total, language]);

  // 2. Inspection Type Donut Data (ส่งผลตรวจ vs สุ่มตรวจ)
  const typeDonutData = useMemo(() => {
    let sendCount = 0;
    let inspectCount = 0;

    records.forEach(r => {
      const raw = ((r.rawArea || '') + ' ' + (r.actionType || '')).toLowerCase();
      if (raw.includes('สุ่ม') || raw.includes('สุ่มตรวจ') || r.actionType === 'สุ่มตรวจ') {
        inspectCount++;
      } else {
        sendCount++;
      }
    });

    const items = [
      {
        id: 'type-send',
        name: language === 'th' ? 'ส่งผลตรวจประจำวัน' : 'Daily Routine Inspection',
        count: sendCount,
        color: '#0284c7', // Sky 600
        bgColor: 'bg-sky-600',
        lightBg: 'bg-sky-50',
        borderColor: 'border-sky-200',
        textColor: 'text-sky-800',
        percentage: total > 0 ? Math.round((sendCount / total) * 100) : 0,
      },
      {
        id: 'type-inspect',
        name: language === 'th' ? 'สุ่มตรวจพิเศษ' : 'Random Spot Check',
        count: inspectCount,
        color: '#10b981', // Emerald 500
        bgColor: 'bg-emerald-500',
        lightBg: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        textColor: 'text-emerald-800',
        percentage: total > 0 ? Math.round((inspectCount / total) * 100) : 0,
      },
    ];

    return items;
  }, [records, total, language]);

  // 3. Inspector Donut Data
  const inspectorMap: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach(r => {
      const name = (r.inspectorName || 'ไม่ระบุ').trim();
      map[name] = (map[name] || 0) + 1;
    });
    return map;
  }, [records]);

  const inspectorRankings = useMemo(() => {
    return Object.entries(inspectorMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [inspectorMap]);

  const inspectorDonutData = useMemo(() => {
    const colors = ['#2563eb', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#64748b'];
    const top5 = inspectorRankings.slice(0, 5);
    const otherCount = inspectorRankings.slice(5).reduce((sum, item) => sum + item.count, 0);

    const items = top5.map((item, idx) => ({
      id: `inspector-${idx}`,
      name: item.name,
      count: item.count,
      color: colors[idx % colors.length],
      bgColor: `bg-[${colors[idx % colors.length]}]`,
      lightBg: 'bg-slate-50',
      borderColor: 'border-slate-200',
      textColor: 'text-slate-800',
      percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
    }));

    if (otherCount > 0) {
      items.push({
        id: 'inspector-others',
        name: language === 'th' ? 'ผู้ตรวจท่านอื่น ๆ' : 'Other Inspectors',
        count: otherCount,
        color: '#94a3b8',
        bgColor: 'bg-slate-400',
        lightBg: 'bg-slate-50',
        borderColor: 'border-slate-200',
        textColor: 'text-slate-700',
        percentage: total > 0 ? Math.round((otherCount / total) * 100) : 0,
      });
    }

    return items;
  }, [inspectorRankings, total, language]);

  // Current active data set for the Donut Chart
  const currentChartData = useMemo(() => {
    switch (activeTab) {
      case 'building':
        return buildingDonutData;
      case 'type':
        return typeDonutData;
      case 'inspector':
        return inspectorDonutData;
      default:
        return buildingDonutData;
    }
  }, [activeTab, buildingDonutData, typeDonutData, inspectorDonutData]);

  // Donut SVG circumference and stroke offset calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius; // ~439.82

  const donutSegments = useMemo(() => {
    let accumulatedDashOffset = 0;
    return currentChartData.map((item, index) => {
      const ratio = total > 0 ? item.count / total : 0;
      const strokeLength = ratio * circumference;
      const dashOffset = accumulatedDashOffset;
      accumulatedDashOffset += strokeLength;

      return {
        ...item,
        strokeLength,
        dashOffset,
        isHovered: hoveredIndex === index,
      };
    });
  }, [currentChartData, total, circumference, hoveredIndex]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#002045] via-[#0b3366] to-[#002045] text-white p-6 relative flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md shadow-inner">
              <PieChartIcon className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-2xs font-mono font-bold tracking-wider">
                  STATISTICS & PIE CHARTS
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/30 text-2xs font-bold text-blue-200">
                  {total} {language === 'th' ? 'รายการ' : 'records'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                {language === 'th' ? 'สถิติและผลการสุ่มตรวจคลอรีน' : 'Chlorine Inspection Analytics & Charts'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
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

          {/* Interactive Pie / Donut Chart Tab Selector */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-200/80 border border-slate-300/80 overflow-x-auto">
            <button
              type="button"
              onClick={() => { setActiveTab('building'); setHoveredIndex(null); }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'building'
                  ? 'bg-white text-[#002045] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4 text-amber-500" />
              <span>{language === 'th' ? 'กราฟวงกลม: สัดส่วนตามอาคาร' : 'Pie: By Building'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('type'); setHoveredIndex(null); }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'type'
                  ? 'bg-white text-[#002045] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4 text-sky-600" />
              <span>{language === 'th' ? 'กราฟวงกลม: ประเภทการตรวจ' : 'Pie: By Type'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('inspector'); setHoveredIndex(null); }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'inspector'
                  ? 'bg-white text-[#002045] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>{language === 'th' ? 'กราฟวงกลม: สัดส่วนผู้ตรวจ' : 'Pie: By Inspector'}</span>
            </button>
          </div>

          {/* Circular Donut & Pie Chart Main Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            {/* SVG Circular Donut Chart */}
            <div className="md:col-span-5 flex flex-col items-center justify-center relative select-none">
              <div className="relative w-56 h-56 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  {/* Background Track Circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    className="stroke-slate-100"
                    strokeWidth="24"
                    fill="transparent"
                  />

                  {/* Circular Donut Segments */}
                  {total > 0 && donutSegments.map((seg, idx) => (
                    <circle
                      key={seg.id}
                      cx="100"
                      cy="100"
                      r={radius}
                      stroke={seg.color}
                      strokeWidth={seg.isHovered ? '28' : '24'}
                      strokeDasharray={`${seg.strokeLength} ${circumference}`}
                      strokeDashoffset={-seg.dashOffset}
                      fill="transparent"
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        filter: seg.isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))' : 'none',
                      }}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  ))}
                </svg>

                {/* Donut Center Core Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
                  {hoveredIndex !== null && donutSegments[hoveredIndex] ? (
                    <div className="animate-in zoom-in-75 duration-150">
                      <p className="text-2xl font-black text-slate-800">
                        {donutSegments[hoveredIndex].percentage}%
                      </p>
                      <p className="text-xs font-bold text-slate-600 truncate max-w-[130px]">
                        {donutSegments[hoveredIndex].name}
                      </p>
                      <p className="text-[11px] font-bold text-blue-700 mt-0.5">
                        {donutSegments[hoveredIndex].count} {language === 'th' ? 'ครั้ง' : 'times'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-3xl font-black text-[#002045]">{total}</p>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {language === 'th' ? 'รายการตรวจรวม' : 'Total Inspections'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'th' ? 'นำเมาส์ชี้ที่แถบวงกลมเพื่อดูสัดส่วน' : 'Hover over chart segments for details'}</span>
              </div>
            </div>

            {/* Legend & Breakdown List */}
            <div className="md:col-span-7 space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>{language === 'th' ? 'รายละเอียดสัดส่วนตามหมวดหมู่' : 'Category Breakdown'}</span>
                <span>{donutSegments.length} {language === 'th' ? 'กลุ่ม' : 'groups'}</span>
              </h4>

              <div className="space-y-2.5">
                {donutSegments.map((item, idx) => (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      item.isHovered
                        ? 'bg-slate-50 border-blue-400 shadow-sm scale-[1.01]'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs" 
                          style={{ backgroundColor: item.color }} 
                        />
                        <span className="text-xs font-bold text-slate-900">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">
                          {item.count} {language === 'th' ? 'ครั้ง' : 'times'}
                        </span>
                        <span 
                          className="px-2 py-0.5 rounded-full text-2xs font-bold text-white shrink-0"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Linear Progress Indicator */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Inspectors Ranking Section */}
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
