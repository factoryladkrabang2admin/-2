import React, { useState } from 'react';
import { formatOtHoursDisplay } from '../services/googleSheetSyncService';

export interface DonutChartItem {
  id: string;
  label: string;
  value: number; // hours or count
  count?: number;
  color: string;
  percentage?: number;
}

interface OtDonutChartProps {
  data: DonutChartItem[];
  title?: string;
  unitLabel?: string;
  totalLabel?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const OtDonutChart: React.FC<OtDonutChartProps> = ({
  data,
  title,
  unitLabel = 'ชม.',
  totalLabel = 'รวมทั้งหมด',
  size = 'md',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalValue = data.reduce((sum, item) => sum + (item.value || 0), 0);
  const roundedTotal = Math.round(totalValue * 10) / 10;

  // Sizing parameters
  const dimensions = size === 'sm' ? 170 : size === 'lg' ? 240 : 210;
  const radius = size === 'sm' ? 60 : size === 'lg' ? 84 : 74;
  const strokeWidth = size === 'sm' ? 20 : size === 'lg' ? 26 : 24;
  const center = dimensions / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const segments = data.map((item, index) => {
    const percent = totalValue > 0 ? item.value / totalValue : 0;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;

    return {
      ...item,
      index,
      percent: Math.round(percent * 100),
      rawPercent: percent,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeItem = hoveredIndex !== null ? segments[hoveredIndex] : null;

  if (!data || data.length === 0 || totalValue === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-50/80 rounded-2xl border border-slate-200 text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-slate-200/70 flex items-center justify-center text-slate-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="9" strokeWidth="2" strokeDasharray="4 4" />
          </svg>
        </div>
        <p className="text-xs font-semibold text-slate-500">ไม่มีข้อมูลสถิติสำหรับการแสดงกราฟ</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-6 p-5 bg-white/95 rounded-2xl border border-sky-100 shadow-xs hover:shadow-md transition-shadow">
      {/* 1. Circular Donut Chart SVG */}
      <div 
        className="relative shrink-0 flex items-center justify-center select-none"
        style={{ width: dimensions, height: dimensions }}
      >
        <svg
          viewBox={`0 0 ${dimensions} ${dimensions}`}
          className="w-full h-full transform -rotate-90 filter drop-shadow-xs transition-all duration-300"
        >
          {/* Background circle track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {segments.map((seg) => {
            const isHovered = hoveredIndex === seg.index;
            return (
              <circle
                key={seg.id}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 5 : strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                className="cursor-pointer transition-all duration-300 ease-out"
                style={{
                  opacity: hoveredIndex === null || isHovered ? 1 : 0.4,
                  transformOrigin: `${center}px ${center}px`,
                  transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                }}
                onMouseEnter={() => setHoveredIndex(seg.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </svg>

        {/* Center Donut Hole Info Badge */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none transition-all duration-200 px-3"
        >
          {activeItem ? (
            <div className="space-y-0.5 animate-in zoom-in-90 duration-150 max-w-[140px]">
              <span className="text-[10.5px] font-bold text-slate-500 truncate block">
                {activeItem.label}
              </span>
              <p className="text-xl sm:text-2xl font-black text-[#002045] leading-none">
                {formatOtHoursDisplay(undefined, undefined, activeItem.value)}
              </p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span 
                  className="px-1.5 py-0.5 rounded text-[10px] font-black text-white"
                  style={{ backgroundColor: activeItem.color }}
                >
                  {activeItem.percent}%
                </span>
                <span className="text-[11px] font-bold text-slate-600">
                  {unitLabel}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                {totalLabel}
              </span>
              <p className="text-2xl sm:text-3xl font-black text-[#002045] tracking-tight leading-none">
                {formatOtHoursDisplay(undefined, undefined, roundedTotal)}
              </p>
              <span className="text-[11px] font-bold text-sky-800">
                {unitLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Interactive Legend Breakdown */}
      <div className="flex-1 w-full space-y-2 max-h-60 overflow-y-auto pr-1">
        {title && (
          <div className="text-xs font-bold text-[#002045] uppercase tracking-wider mb-2 flex items-center justify-between pb-1 border-b border-slate-100">
            <span>{title}</span>
            <span className="text-[11px] text-slate-400 font-normal">{data.length} รายการ</span>
          </div>
        )}
        <div className="grid grid-cols-1 gap-1.5">
          {segments.map((item) => {
            const isHovered = hoveredIndex === item.index;
            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredIndex(item.index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
                  isHovered
                    ? 'bg-sky-50/90 border border-sky-300 shadow-xs translate-x-1'
                    : 'hover:bg-slate-50/90 border border-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0">
                    <span className={`text-xs font-bold truncate block ${isHovered ? 'text-[#002045]' : 'text-slate-700'}`}>
                      {item.label}
                    </span>
                    {item.count !== undefined && (
                      <span className="text-[10.5px] text-slate-400 font-normal">
                        {item.count} รายการ
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-sky-950">
                    {formatOtHoursDisplay(undefined, undefined, item.value)} {unitLabel}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold text-white shadow-xs"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.percent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
