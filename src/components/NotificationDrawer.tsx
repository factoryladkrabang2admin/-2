import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Bell, 
  Sparkles, 
  Shirt, 
  Waves, 
  Package, 
  CheckCheck, 
  Trash2, 
  ExternalLink,
  Info,
  Wrench,
  Cog
} from 'lucide-react';
import { AppNotification } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onSelectNotificationOrder?: (orderIdOrCode: string) => void;
  onSelectNotificationMaintenance?: (workOrderNoOrId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ 
  isOpen, 
  onClose,
  notifications,
  onMarkAllAsRead,
  onMarkAsRead,
  onClearAll,
  onSelectNotificationOrder,
  onSelectNotificationMaintenance,
}) => {
  const { language } = useLanguage();
  const [filterType, setFilterType] = useState<'all' | 'laundry' | 'maintenance' | 'unread'>('all');

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => n.unread).length;

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'unread') return n.unread;
    if (filterType === 'laundry') return n.type === 'laundry_new' || n.type === 'laundry_status' || Boolean(n.trackingCode);
    if (filterType === 'maintenance') return n.type === 'maintenance_new' || n.type === 'maintenance_status' || Boolean(n.workOrderNo || n.ticketId);
    return true;
  });

  const handleNotificationClick = (n: AppNotification) => {
    if (n.unread) {
      onMarkAsRead(n.id);
    }
    const isMaint = n.type === 'maintenance_new' || n.type === 'maintenance_status' || Boolean(n.workOrderNo || n.ticketId);
    if (isMaint && onSelectNotificationMaintenance) {
      onSelectNotificationMaintenance(n.workOrderNo || n.ticketId || '');
      onClose();
    } else if ((n.orderId || n.trackingCode) && onSelectNotificationOrder) {
      onSelectNotificationOrder(n.trackingCode || n.orderId || '');
      onClose();
    }
  };

  const getNotificationIcon = (n: AppNotification) => {
    if (n.type === 'maintenance_new') {
      return (
        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
          <Wrench className="w-4 h-4" />
        </div>
      );
    }
    if (n.type === 'maintenance_status') {
      if (n.maintenanceStatus === 'เสร็จแล้ว' || n.title.includes('เสร็จแล้ว')) {
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      }
      return (
        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 border border-sky-300">
          <Cog className="w-4 h-4 animate-spin" />
        </div>
      );
    }
    if (n.type === 'laundry_new') {
      return (
        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
          <Shirt className="w-4 h-4" />
        </div>
      );
    }
    if (n.type === 'laundry_status') {
      if (n.stage === 'ready' || n.title.includes('เสร็จ') || n.title.includes('Ready')) {
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      }
      return (
        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
          <Waves className="w-4 h-4 animate-spin" />
        </div>
      );
    }
    if (n.type === 'alert') {
      return (
        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
          <AlertTriangle className="w-4 h-4" />
        </div>
      );
    }
    if (n.type === 'success') {
      return (
        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      );
    }
    if (n.type === 'report') {
      return (
        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200">
          <FileText className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
        <Info className="w-4 h-4 text-[#0061a5]" />
      </div>
    );
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-2xs transition-opacity" 
        onClick={onClose} 
      />
      <div className="fixed top-0 right-0 w-full sm:w-[420px] h-screen bg-white z-50 shadow-2xl border-l border-[#e2e8f0] flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#002045] text-white flex items-center justify-center shadow-xs">
                <Bell className="w-4 h-4 text-[#66affe]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#1a1c1c]">
                    {language === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-[#ba1a1a] text-white text-[10px] font-bold rounded-full animate-pulse">
                      {unreadCount} {language === 'th' ? 'ใหม่' : 'new'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#74777f]">
                  {language === 'th' ? 'แจ้งเตือนรายการผ้าใหม่และสถานะแบบ Real-time' : 'Real-time intake and laundry status updates'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#74777f] hover:text-[#1a1c1c] p-1.5 rounded-lg hover:bg-[#e8e8e8] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-200/80 flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-[#002045] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              {language === 'th' ? 'ทั้งหมด' : 'All'} ({notifications.length})
            </button>
            <button
              onClick={() => setFilterType('laundry')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'laundry'
                  ? 'bg-[#0061a5] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'ข้อมูลผ้า' : 'Laundry'}</span>
            </button>
            <button
              onClick={() => setFilterType('maintenance')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'maintenance'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'การแจ้งซ่อม' : 'Maintenance'}</span>
            </button>
            <button
              onClick={() => setFilterType('unread')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'unread'
                  ? 'bg-[#ba1a1a] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <span>{language === 'th' ? 'ยังไม่อ่าน' : 'Unread'}</span>
              {unreadCount > 0 && <span className="text-[10px] opacity-80">({unreadCount})</span>}
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#f1f5f9]">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center h-full text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <Bell className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-600">
                {language === 'th' ? 'ไม่มีรายการแจ้งเตือน' : 'No notifications'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                {language === 'th' 
                  ? 'เมื่อมีรายการผ้าใหม่ การเปลี่ยนสถานะ หรือการแจ้งซ่อมใหม่ จะแสดงที่นี่แบบเรียลไทม์' 
                  : 'New laundry orders, maintenance tickets and status changes will appear here in real-time'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const isLaundry = n.type === 'laundry_new' || n.type === 'laundry_status' || Boolean(n.trackingCode);
              const isMaintenance = n.type === 'maintenance_new' || n.type === 'maintenance_status' || Boolean(n.workOrderNo || n.ticketId);
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 hover:bg-slate-50/90 transition-all cursor-pointer flex gap-3 items-start relative group ${
                    n.unread ? 'bg-[#d2e4ff]/15 border-l-4 border-[#0061a5]' : 'border-l-4 border-transparent'
                  }`}
                >
                  {getNotificationIcon(n)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs leading-snug ${n.unread ? 'font-bold text-[#002045]' : 'font-semibold text-slate-700'}`}>
                        {n.title}
                      </p>
                      {n.unread && (
                        <span className="w-2 h-2 rounded-full bg-[#0061a5] shrink-0" title="ยังไม่อ่าน" />
                      )}
                    </div>

                    <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed line-clamp-2">
                      {n.desc}
                    </p>

                    {/* Chips & Metadata */}
                    <div className="flex items-center flex-wrap gap-1.5 mt-2">
                      {n.trackingCode && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold text-[10px] rounded-md border border-slate-200">
                          {n.trackingCode}
                        </span>
                      )}
                      {n.workOrderNo && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-900 font-mono font-bold text-[10px] rounded-md border border-amber-200">
                          {n.workOrderNo}
                        </span>
                      )}
                      {n.department && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-medium text-[10px] rounded-md truncate max-w-[140px]">
                          {n.department}
                        </span>
                      )}
                      {n.stage && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                          n.stage === 'ready' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {n.stage === 'ready' 
                            ? (language === 'th' ? 'ซักเสร็จแล้ว' : 'Ready') 
                            : (language === 'th' ? 'อยู่ระหว่างซัก' : 'In Washing')}
                        </span>
                      )}
                      {n.maintenanceStatus && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                          n.maintenanceStatus === 'เสร็จแล้ว'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : n.maintenanceStatus === 'อยู่ระหว่างดำเนินการ'
                            ? 'bg-sky-100 text-sky-800 border border-sky-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {n.maintenanceStatus}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-medium ml-auto">
                        {n.time}
                      </span>
                    </div>

                    {/* Action hints */}
                    {isLaundry && (
                      <div className="mt-2 text-[11px] font-bold text-[#0061a5] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>{language === 'th' ? 'คลิกดูรายละเอียดผ้า' : 'View order details'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    )}
                    {isMaintenance && (
                      <div className="mt-2 text-[11px] font-bold text-amber-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>{language === 'th' ? 'คลิกเปิดดูใบแจ้งซ่อม' : 'View work order'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between gap-2 text-xs">
          <button
            onClick={onMarkAllAsRead}
            disabled={unreadCount === 0}
            className={`font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              unreadCount > 0
                ? 'text-[#0061a5] hover:bg-[#0061a5]/10'
                : 'text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCheck className="w-4 h-4" />
            <span>{language === 'th' ? 'อ่านแล้วทั้งหมด' : 'Mark all read'}</span>
          </button>

          <button
            onClick={onClearAll}
            disabled={notifications.length === 0}
            className={`font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              notifications.length > 0
                ? 'text-rose-600 hover:bg-rose-50'
                : 'text-slate-400 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{language === 'th' ? 'ล้างทั้งหมด' : 'Clear all'}</span>
          </button>
        </div>
      </div>
    </>
  );
};
