import React, { useState } from 'react';
import { 
  DollarSign, 
  Package, 
  Clock, 
  Smile, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  Download, 
  FileText, 
  MoreVertical,
  PlusCircle,
  CheckCircle2,
  Loader2,
  Sparkles
} from 'lucide-react';
import { ReportItem, AnalyticsData } from '../types';
import { ANALYTICS_DATA, INITIAL_REPORTS } from '../data/mockData';

interface ReportsViewProps {
  onGenerateReport?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onGenerateReport }) => {
  const [timeRange, setTimeRange] = useState<'30 Days' | 'Quarter' | 'Year' | 'Custom'>('30 Days');
  const [reports, setReports] = useState<ReportItem[]>(INITIAL_REPORTS);
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const data: AnalyticsData = ANALYTICS_DATA;

  const handleCreateReport = () => {
    setIsGenerating(true);
    const newReport: ReportItem = {
      id: `rep-${Date.now()}`,
      name: `Ad-hoc Analytics ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      generatedDate: 'Pending',
      status: 'GENERATING',
      category: 'Analytics',
    };
    setReports([newReport, ...reports]);

    setTimeout(() => {
      setReports((prev) =>
        prev.map((r) =>
          r.id === newReport.id
            ? { ...r, status: 'READY', generatedDate: 'Just now', fileSize: '1.4 MB' }
            : r
        )
      );
      setIsGenerating(false);
    }, 2500);
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Department,Allocation\n"
      + data.resourceAllocation.map(e => `${e.department},${e.percentage}%`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "resource_allocation_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header & Range Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1c] tracking-tight">
            Analytics Overview
          </h2>
          <p className="text-sm text-[#43474e] mt-1">
            Comprehensive performance and resource metrics.
          </p>
        </div>

        {/* Range Selector Pill */}
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-[#e2e8f0] card-shadow text-xs font-semibold">
          <button
            onClick={() => setTimeRange('30 Days')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              timeRange === '30 Days'
                ? 'bg-[#0061a5] text-white shadow-xs'
                : 'text-[#43474e] hover:bg-[#f3f3f4]'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange('Quarter')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              timeRange === 'Quarter'
                ? 'bg-[#0061a5] text-white shadow-xs'
                : 'text-[#43474e] hover:bg-[#f3f3f4]'
            }`}
          >
            Quarter
          </button>
          <button
            onClick={() => setTimeRange('Year')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              timeRange === 'Year'
                ? 'bg-[#0061a5] text-white shadow-xs'
                : 'text-[#43474e] hover:bg-[#f3f3f4]'
            }`}
          >
            Year
          </button>
          <div className="w-px h-4 bg-[#c4c6cf] mx-1" />
          <button
            onClick={() => setTimeRange('Custom')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              timeRange === 'Custom'
                ? 'bg-[#0061a5] text-white shadow-xs'
                : 'text-[#43474e] hover:bg-[#f3f3f4]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Custom
          </button>
        </div>
      </div>

      {/* 4 Bento KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Total Revenue */}
        <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] card-shadow flex flex-col justify-between hover:border-[#0061a5]/40 transition-all">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-[#43474e] uppercase tracking-wider">
              Total Revenue
            </p>
            <span className="text-[#0061a5] bg-[#d2e4ff]/40 p-2 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl md:text-3xl font-bold text-[#1a1c1c] tracking-tight">
              ${data.totalRevenue.toLocaleString()}
            </h3>
            <div className="flex items-center gap-1 mt-1.5 text-xs text-emerald-600 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{data.revenueChange}%</span>
              <span className="text-[#74777f] font-normal ml-1">vs last month</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Active Orders */}
        <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] card-shadow flex flex-col justify-between hover:border-[#0061a5]/40 transition-all">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-[#43474e] uppercase tracking-wider">
              Active Orders
            </p>
            <span className="text-[#0061a5] bg-[#d2e4ff]/40 p-2 rounded-lg">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl md:text-3xl font-bold text-[#1a1c1c] tracking-tight">
              {data.activeProjects}
            </h3>
            <div className="flex items-center gap-1 mt-1.5 text-xs text-emerald-600 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{data.projectsChange}</span>
              <span className="text-[#74777f] font-normal ml-1">vs last month</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Avg Completion Time */}
        <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] card-shadow flex flex-col justify-between hover:border-[#ba1a1a]/40 transition-all">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-[#43474e] uppercase tracking-wider">
              Avg Completion Time
            </p>
            <span className="text-[#0061a5] bg-[#d2e4ff]/40 p-2 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl md:text-3xl font-bold text-[#1a1c1c] tracking-tight">
              {data.avgCompletionDays} <span className="text-sm font-normal text-[#74777f]">days</span>
            </h3>
            <div className="flex items-center gap-1 mt-1.5 text-xs text-[#ba1a1a] font-semibold">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>{data.completionChange}%</span>
              <span className="text-[#74777f] font-normal ml-1">vs last month</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Client Satisfaction */}
        <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] card-shadow flex flex-col justify-between hover:border-[#0061a5]/40 transition-all">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-[#43474e] uppercase tracking-wider">
              Client Satisfaction
            </p>
            <span className="text-[#0061a5] bg-[#d2e4ff]/40 p-2 rounded-lg">
              <Smile className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl md:text-3xl font-bold text-[#1a1c1c] tracking-tight">
              {data.satisfactionScore}<span className="text-sm font-normal text-[#74777f]">/5</span>
            </h3>
            <div className="flex items-center gap-1 mt-1.5 text-xs text-emerald-600 font-semibold">
              <Minus className="w-3.5 h-3.5" />
              <span>0.0%</span>
              <span className="text-[#74777f] font-normal ml-1">vs last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row: Performance Trends (Line) & Project Distribution (Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Performance Trends (8 cols LG) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#e2e8f0] card-shadow p-6 flex flex-col min-h-[380px] justify-between">
          <div className="flex justify-between items-center pb-4 border-b border-[#e2e8f0]">
            <div>
              <h3 className="text-base font-bold text-[#1a1c1c]">
                Performance Trends
              </h3>
              <p className="text-xs text-[#74777f]">Revenue vs Operating Costs</p>
            </div>
            <button className="text-[#74777f] hover:text-[#1a1c1c] p-1 rounded-md hover:bg-[#f3f3f4]">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Chart Area */}
          <div className="flex-1 relative w-full h-48 sm:h-56 flex items-end justify-between px-6 pb-6 pt-6">
            {/* Grid Horizontal Guidelines */}
            <div className="absolute inset-0 flex flex-col justify-between py-6 px-4 opacity-30 pointer-events-none">
              <div className="border-b border-dashed border-[#c4c6cf] w-full" />
              <div className="border-b border-dashed border-[#c4c6cf] w-full" />
              <div className="border-b border-dashed border-[#c4c6cf] w-full" />
              <div className="border-b border-solid border-[#c4c6cf] w-full" />
            </div>

            {/* Bars with interactive tooltips */}
            {data.trendMonths.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 z-20">
                <FileText className="w-8 h-8 stroke-1 text-slate-300 mb-1" />
                <p className="text-xs font-medium text-slate-500">ไม่มีข้อมูลแนวโน้มย้อนหลัง</p>
                <p className="text-[11px] text-slate-400">ระบบพร้อมประมวลผลเมื่อเริ่มมีการบันทึกข้อมูลจริง</p>
              </div>
            ) : (
              data.trendMonths.map((item, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredTrendIndex(idx)}
                  onMouseLeave={() => setHoveredTrendIndex(null)}
                  className="relative flex flex-col items-center h-full justify-end group z-10 w-8 cursor-pointer"
                >
                  {/* Tooltip on Hover */}
                  {hoveredTrendIndex === idx && (
                    <div className="absolute -top-12 bg-[#002045] text-white px-2.5 py-1 rounded text-[11px] whitespace-nowrap shadow-lg z-30 pointer-events-none">
                      <p className="font-bold">{item.month}</p>
                      <p className="text-[#adc7f7]">Rev: ${item.revenue}k | Cost: ${item.costs}k</p>
                    </div>
                  )}

                  <div className="w-3 bg-[#0061a5] rounded-t-xs transition-all duration-300 group-hover:bg-[#3182ce] group-hover:w-4"
                    style={{ height: `${item.revenuePct}%` }}
                  />
                  <span className="text-[11px] font-medium text-[#74777f] mt-2 group-hover:text-[#1a1c1c]">
                    {item.month}
                  </span>
                </div>
              ))
            )}

            {/* SVG Trend Line Overlay */}
            {data.trendMonths.length > 0 && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-sm px-6 pb-8 pt-6"
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
              >
                {/* Revenue Smooth Curve */}
                <path
                  d="M 5,60 Q 20,40 35,55 T 65,40 T 95,15"
                  fill="none"
                  stroke="#3182ce"
                  strokeWidth="2.5"
                  className="opacity-90"
                />
                {/* Costs Dashed Curve */}
                <path
                  d="M 5,80 Q 20,70 35,75 T 65,60 T 95,50"
                  fill="none"
                  stroke="#a0aec0"
                  strokeWidth="2"
                  strokeDasharray="4"
                  className="opacity-70"
                />
              </svg>
            )}
          </div>

          {/* Chart Legend */}
          <div className="flex justify-center items-center gap-6 pt-3 border-t border-[#f3f3f4]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#0061a5]" />
              <span className="text-xs font-medium text-[#43474e]">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#c4c6cf]" />
              <span className="text-xs font-medium text-[#43474e]">Costs</span>
            </div>
          </div>
        </div>

        {/* Service Distribution Donut (4 cols LG) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-[#e2e8f0] card-shadow p-6 flex flex-col justify-between">
          <div className="pb-4 border-b border-[#e2e8f0]">
            <h3 className="text-base font-bold text-[#1a1c1c]">
              Service Distribution
            </h3>
            <p className="text-xs text-[#74777f]">By Service Type</p>
          </div>

          {/* SVG Donut Chart representation */}
          <div className="flex-1 flex flex-col items-center justify-center my-4">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background circle */}
                <path
                  className="text-[#f3f3f4]"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Wash & Fold Slice: 55% */}
                <path
                  strokeDasharray="55, 100"
                  strokeDashoffset="0"
                  className="text-[#0061a5] transition-all duration-700"
                  strokeWidth="4"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Dry Clean Slice: 30% */}
                <path
                  strokeDasharray="30, 100"
                  strokeDashoffset="-55"
                  className="text-[#1a365d] transition-all duration-700"
                  strokeWidth="4"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Express Slice: 15% */}
                <path
                  strokeDasharray="15, 100"
                  strokeDashoffset="-85"
                  className="text-[#f2bc82] transition-all duration-700"
                  strokeWidth="4"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>

              {/* Centered Total Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-[#1a1c1c]">100%</span>
                <span className="text-[11px] font-semibold text-[#74777f] uppercase tracking-wider">
                  Capacity
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Rows */}
          <div className="space-y-2 pt-3 border-t border-[#f3f3f4] text-xs">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-[#0061a5]" />
                <span className="text-[#43474e]">Wash & Fold</span>
              </div>
              <span className="font-semibold text-[#1a1c1c]">55%</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-[#1a365d]" />
                <span className="text-[#43474e]">Dry Clean & Press</span>
              </div>
              <span className="font-semibold text-[#1a1c1c]">30%</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-[#f2bc82]" />
                <span className="text-[#43474e]">Express / Hospital</span>
              </div>
              <span className="font-semibold text-[#1a1c1c]">15%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tertiary Row: Resource Allocation Bar Chart & Recent Reports Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Allocation Bars */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] card-shadow p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center pb-4 border-b border-[#e2e8f0] mb-5">
            <h3 className="text-base font-bold text-[#1a1c1c]">
              Resource Allocation
            </h3>
            <button
              onClick={handleExportCSV}
              className="text-[#74777f] hover:text-[#002045] p-1 rounded-md hover:bg-[#f3f3f4] transition-colors"
              title="Download CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {data.resourceAllocation.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-[#43474e]">{item.department}</span>
                  <span className="text-[#1a1c1c]">{item.percentage}%</span>
                </div>
                <div className="w-full bg-[#f3f3f4] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-[#f3f3f4] flex justify-between items-center text-xs text-[#74777f]">
            <span>Average Utilization: 66.2%</span>
            <span className="text-[#10b981] font-semibold">Optimal Range</span>
          </div>
        </div>

        {/* Recent Reports Table */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] card-shadow p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center pb-4 border-b border-[#e2e8f0] mb-4">
            <h3 className="text-base font-bold text-[#1a1c1c]">
              Recent Reports
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateReport}
                disabled={isGenerating}
                className="text-xs font-semibold text-[#0061a5] hover:text-[#002045] flex items-center gap-1 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5" />
                    New Report
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-[11px] font-semibold text-[#74777f] uppercase tracking-wider">
                  <th className="pb-3">Report Name</th>
                  <th className="pb-3">Generated</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]/50 text-xs">
                {reports.map((rep) => (
                  <tr
                    key={rep.id}
                    className="hover:bg-[#f9f9f9] transition-colors cursor-pointer group"
                  >
                    <td className="py-3 font-medium text-[#1a1c1c] flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#74777f] shrink-0 group-hover:text-[#0061a5]" />
                      <span className="truncate max-w-[180px] sm:max-w-none">{rep.name}</span>
                    </td>
                    <td className="py-3 text-[#74777f]">{rep.generatedDate}</td>
                    <td className="py-3 text-right">
                      {rep.status === 'READY' ? (
                        <span className="px-2 py-0.5 rounded-xs bg-emerald-100 text-emerald-800 text-[10px] font-bold tracking-wider uppercase">
                          READY
                        </span>
                      ) : rep.status === 'GENERATING' ? (
                        <span className="px-2 py-0.5 rounded-xs bg-amber-100 text-amber-800 text-[10px] font-bold tracking-wider uppercase animate-pulse">
                          GENERATING
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-xs bg-red-100 text-red-800 text-[10px] font-bold tracking-wider uppercase">
                          FAILED
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
