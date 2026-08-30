import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Zap, 
  RefreshCw, 
  CheckCircle2, 
  Play, 
  Pause, 
  PlusCircle, 
  Layers, 
  ShieldCheck, 
  ChevronDown,
  Sparkles,
  Wifi
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { realtimeHub, RealtimeMessage } from '../services/realtimeService';
import { LaundryOrder } from '../types';

interface RealtimeStatusBadgeProps {
  orders: LaundryOrder[];
  onSimulateOrder?: (newOrder: LaundryOrder) => void;
  className?: string;
}

export const RealtimeStatusBadge: React.FC<RealtimeStatusBadgeProps> = ({
  orders,
  onSimulateOrder,
  className = '',
}) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isAutoRun, setIsAutoRun] = useState(realtimeHub.isAutoRun());
  const [lastSyncTime, setLastSyncTime] = useState<string>('เมื่อสักครู่');
  const [pulseCount, setPulseCount] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const unsubscribe = realtimeHub.subscribe((msg: RealtimeMessage) => {
      setPulseCount((prev) => prev + 1);
      const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncTime(`${now} น.`);
    });

    return () => unsubscribe();
  }, []);

  const handleToggleAutoRun = () => {
    const nextState = !isAutoRun;
    setIsAutoRun(nextState);
    realtimeHub.setAutoRunEnabled(nextState);
  };

  const handleSimulateNewOrder = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const { newOrder } = realtimeHub.simulateLiveIncomingOrder(orders);
      if (onSimulateOrder) {
        onSimulateOrder(newOrder);
      }
      setIsSimulating(false);
    }, 400);
  };

  const handleForceSync = () => {
    realtimeHub.broadcast('SYNC_ALL', { manual: true });
    const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSyncTime(`${now} น.`);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer select-none ${
          isAutoRun
            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300 ring-1 ring-emerald-200/50'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
        }`}
        title={language === 'th' ? 'สถานะ Real-time อัตโนมัติ (คลิกเพื่อดูรายละเอียด)' : 'Real-time Live Sync (Click to manage)'}
      >
        <span className="relative flex h-2.5 w-2.5">
          {isAutoRun && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isAutoRun ? 'bg-emerald-500' : 'bg-slate-400'}`} />
        </span>
        <span className="hidden sm:inline">
          {language === 'th' ? (isAutoRun ? 'Realtime สด' : 'Realtime พัก') : (isAutoRun ? 'Live Realtime' : 'Paused')}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-500" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
            {/* Title & Status */}
            <div className="flex items-start justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Radio className="w-4 h-4 text-emerald-700 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-[#002045]">
                    {language === 'th' ? 'ระบบ Real-time ซิงค์สดอัตโนมัติ' : 'Real-time Live Sync Hub'}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {language === 'th' ? 'เชื่อมต่อและอัปเดตข้อมูลทุกหน้าต่างอัตโนมัติ' : 'Connected & synced across all tabs'}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <Wifi className="w-3 h-3 text-emerald-600" />
                {language === 'th' ? 'ออนไลน์' : 'Active'}
              </span>
            </div>

            {/* Sync Info Pill */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-slate-600">
                <span>{language === 'th' ? 'อัปเดตล่าสุด:' : 'Last Synced:'}</span>
                <span className="font-bold text-[#002045]">{lastSyncTime}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>{language === 'th' ? 'เทคโนโลยีซิงค์:' : 'Sync Protocol:'}</span>
                <span className="font-bold text-emerald-700 font-mono text-[10px]">BroadcastChannel + LocalStorage</span>
              </div>
            </div>

            {/* Actions: Toggle Auto-Run & Simulate Order */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleToggleAutoRun}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                  isAutoRun
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isAutoRun ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{language === 'th' ? 'รันระบบอัตโนมัติ (Auto-Run)' : 'Auto-Run Engine'}</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/20">
                  {isAutoRun ? (language === 'th' ? 'เปิดใช้งาน' : 'ON') : (language === 'th' ? 'ปิด' : 'OFF')}
                </span>
              </button>

              <button
                type="button"
                disabled={isSimulating}
                onClick={handleSimulateNewOrder}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-[#002045] hover:bg-[#003366] text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#66affe]" />
                <span>
                  {isSimulating 
                    ? (language === 'th' ? 'กำลังส่งข้อมูลสด...' : 'Transmitting live...') 
                    : (language === 'th' ? 'จำลองรับออเดอร์ผ้าสด (Simulate Live)' : 'Simulate Live Incoming Order')}
                </span>
              </button>

              <button
                type="button"
                onClick={handleForceSync}
                className="w-full py-1.5 px-3 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-slate-500" />
                <span>{language === 'th' ? 'บังคับซิงค์ข้อมูลใหม่ตอนนี้ (Force Sync)' : 'Force Sync All Now'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
