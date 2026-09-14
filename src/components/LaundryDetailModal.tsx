import React, { useState } from 'react';
import { LaundryOrder } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { AdminUserAccount, isUserAdminOrSupervisor } from '../data/mockData';
import { getDepartmentColor, getGarmentColor } from '../utils/laundryColorHelper';
import { WashingMachineActiveIcon, ReadyStatusAnimatedIcon } from './LaundryStatusIcons';
import {
  X,
  Shirt,
  Calendar,
  Building2,
  CheckCircle2,
  Waves,
  Copy,
  Tag,
  Sparkles,
  Trash2,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';

interface LaundryDetailModalProps {
  isOpen: boolean;
  order: LaundryOrder | null;
  onClose: () => void;
  onUpdateOrder?: (updated: LaundryOrder) => void;
  onDeleteOrder?: (orderId: string) => void;
  onCompleteOrder?: (order: LaundryOrder) => void;
  currentUser?: AdminUserAccount;
}

const STAGES_CONFIG = [
  { 
    key: 'washing' as const, 
    labelTh: 'อยู่ระหว่างซัก', 
    labelEn: 'In Washing', 
    descTh: 'รายการผ้ากำลังดำเนินการซัก-อบ', 
    descEn: 'Garments currently in washing / processing cycle' 
  },
  { 
    key: 'ready' as const, 
    labelTh: 'ซักเสร็จแล้ว', 
    labelEn: 'Washed / Ready', 
    descTh: 'ดำเนินการซักเสร็จสมบูรณ์เรียบร้อยแล้ว', 
    descEn: 'Washing completed and batch ready' 
  },
];

export const LaundryDetailModal: React.FC<LaundryDetailModalProps> = ({
  isOpen,
  order,
  onClose,
  onUpdateOrder,
  onDeleteOrder,
  onCompleteOrder,
  currentUser,
}) => {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || !order) return null;

  // Check if current user has Admin or Supervisor permissions (ผู้ดูแลและแอดมินเพจ)
  const isUserAdmin = Boolean(
    isUserAdminOrSupervisor(currentUser, true) ||
    currentUser?.isAdmin ||
    currentUser?.username?.toLowerCase() === 'reizosischen' ||
    (currentUser?.role && (
      currentUser.role.toLowerCase().includes('admin') ||
      currentUser.role.includes('ผู้ดูแลระบบ') ||
      currentUser.role.includes('ผู้ดูแล') ||
      currentUser.role.includes('แอดมิน')
    )) ||
    currentUser?.permissions?.canDeleteData
  );

  const currentStage: 'washing' | 'ready' = (order.stage === 'ready' || order.stage === 'delivered') ? 'ready' : 'washing';
  const garmentTypeName = order.notes?.match(/ประเภทผ้า:\s*([^|]+)/)?.[1]?.trim() || 
                         order.items[0]?.name || (language === 'th' ? 'ผ้าทั่วไป' : 'General Linen');
  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);
  const deptStyle = getDepartmentColor(order.customerRoomOrDept);
  const garmentStyle = getGarmentColor(garmentTypeName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-[#c4c6cf]/40 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-[#002045] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Shirt className="w-5 h-5 text-[#66affe]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-[#adc7f7] bg-white/10 px-2 py-0.5 rounded">
                  {order.trackingCode}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  currentStage === 'ready' 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-amber-400 text-amber-950'
                }`}>
                  {currentStage === 'ready' ? (
                    <>
                      <ReadyStatusAnimatedIcon size="xs" iconClassName="text-white" />
                      <span>{language === 'th' ? 'ซักเสร็จแล้ว' : 'Ready'}</span>
                    </>
                  ) : (
                    <>
                      <WashingMachineActiveIcon size="xs" iconClassName="text-amber-950" />
                      <span>{language === 'th' ? 'อยู่ระหว่างซัก' : 'In Washing'}</span>
                    </>
                  )}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5 flex items-center gap-1.5">
                <Building2 className="w-5 h-5 text-[#66affe]" />
                {order.customerRoomOrDept || (language === 'th' ? 'แผนกทั่วไป' : 'General Intake')}
              </h2>
              <p className="text-xs text-[#adc7f7] mt-0.5">
                {language === 'th' ? 'ผู้ดำเนินการ: ' : 'Operator: '}<span className="font-semibold text-white">{order.customerName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentStage === 'washing' && onCompleteOrder && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCompleteOrder(order);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-xs active:scale-95"
                title={language === 'th' ? 'กดเปลี่ยนสถานะเป็นซักเสร็จแล้ว' : 'Mark as Washed'}
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span className="hidden sm:inline">{language === 'th' ? 'ซักเสร็จแล้ว' : 'Mark Done'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Tracker / Current Status Display (Read-Only: ดูได้อย่างเดียว ไม่สามารถแก้ไขได้) */}
            <div className="px-6 py-4 bg-[#f8fafc] border-b border-[#e2e8f0]">
              <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
                <span className="text-xs font-bold text-[#002045] uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#0061a5]" />
                  <span>{language === 'th' ? 'สถานะของผ้า (สถานะปัจจุบัน):' : 'Garment Status (Current):'}</span>
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs ${
                  currentStage === 'ready' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {currentStage === 'ready' ? (
                    <>
                      <ReadyStatusAnimatedIcon size="sm" iconClassName="text-emerald-600" />
                      <span>{language === 'th' ? 'ซักเสร็จแล้ว' : 'Washed / Ready'}</span>
                    </>
                  ) : (
                    <>
                      <WashingMachineActiveIcon size="sm" iconClassName="text-amber-600" />
                      <span>{language === 'th' ? 'อยู่ระหว่างซัก' : 'In Washing'}</span>
                    </>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STAGES_CONFIG.map((cfg) => {
                  const isSelected = currentStage === cfg.key;
                  const isWashing = cfg.key === 'washing';
                  return (
                    <div
                      key={cfg.key}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between select-none ${
                        isSelected
                          ? isWashing
                            ? 'bg-amber-50/90 border-amber-400 text-amber-950 ring-2 ring-amber-400/30 shadow-xs'
                            : 'bg-emerald-50/90 border-emerald-400 text-emerald-950 ring-2 ring-emerald-400/30 shadow-xs'
                          : 'bg-white/60 border-[#e2e8f0] text-gray-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                          isSelected
                            ? isWashing
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isWashing ? (
                            <WashingMachineActiveIcon size="md" iconClassName={isSelected ? 'text-white' : 'text-gray-400'} />
                          ) : (
                            <ReadyStatusAnimatedIcon size="md" iconClassName={isSelected ? 'text-white' : 'text-gray-400'} />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-sm flex items-center gap-1.5">
                            <span>{language === 'th' ? cfg.labelTh : cfg.labelEn}</span>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {language === 'th' ? cfg.descTh : cfg.descEn}
                          </p>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                          isWashing ? 'bg-amber-200 text-amber-950' : 'bg-emerald-200 text-emerald-900'
                        }`}>
                          {language === 'th' ? 'สถานะปัจจุบัน' : 'Current'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-medium px-2 py-0.5 bg-gray-100 rounded-md shrink-0">
                          {language === 'th' ? 'ยังไม่ถึงขั้นตอนนี้' : 'Inactive'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Essential Details Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {/* Tracking Code Card - Clean, Focused, No QR Code */}
              <div className="bg-gradient-to-br from-slate-50 to-sky-50/60 p-4 sm:p-5 rounded-2xl border border-sky-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                  <div className="w-12 h-12 rounded-2xl bg-[#002045] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Tag className="w-6 h-6 text-[#66affe]" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-[#0061a5] uppercase tracking-wider block">
                      {language === 'th' ? 'รหัสติดตามงานผ้า' : 'Tracking Code'}
                    </span>
                    <div className="font-mono text-xl sm:text-2xl font-black text-[#002045] tracking-wide mt-0.5 select-all">
                      {order.trackingCode}
                    </div>
                    <p className="text-xs text-[#595c62] mt-0.5">
                      {language === 'th' ? 'ใช้รหัสนี้สำหรับค้นหาและติดตามสถานะงานผ้าในระบบ' : 'Use this code to search and track laundry order in system'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(order.trackingCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 text-[#002045] border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">{language === 'th' ? 'คัดลอกแล้ว' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>{language === 'th' ? 'คัดลอกรหัส' : 'Copy Code'}</span>
                      </>
                    )}
                  </button>

                  {currentStage === 'washing' && onCompleteOrder && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onCompleteOrder(order);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>{language === 'th' ? 'เปลี่ยนสถานะเป็นซักเสร็จแล้ว' : 'Mark as Washed'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Department, Garment Type & Submitter Details Box */}
                <div className="bg-[#f9f9f9] p-4 rounded-xl border border-[#e2e8f0] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#74777f] uppercase tracking-wider mb-2">
                      <Building2 className={`w-4 h-4 ${deptStyle.icon}`} />
                      {language === 'th' ? 'แผนกที่ส่งผ้า' : 'Department'}
                    </div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border font-extrabold text-lg shadow-2xs ${deptStyle.pill}`}>
                      <Building2 className={`w-4 h-4 shrink-0 ${deptStyle.icon}`} />
                      <span>{order.customerRoomOrDept || (language === 'th' ? 'แผนกทั่วไป' : 'General Drop-off')}</span>
                    </div>
                    <p className="text-xs font-semibold text-[#43474e] mt-2.5 flex items-center gap-1">
                      <span className="text-[#74777f]">{language === 'th' ? 'ชื่อดำเนินการ:' : 'Operator:'}</span>
                      <span className="text-[#1a1c1c] font-bold">{order.customerName}</span>
                    </p>
                  </div>

                  {/* Garment Type Display in Department Box */}
                  <div className="mt-3 pt-3 border-t border-[#e2e8f0]">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#595c62] mb-1.5">
                      <Tag className={`w-3.5 h-3.5 ${garmentStyle.icon}`} />
                      <span>{language === 'th' ? 'ประเภทผ้าที่ส่ง:' : 'Garment Type:'}</span>
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-bold shadow-2xs ${garmentStyle.pill}`}>
                      <Shirt className={`w-3.5 h-3.5 shrink-0 ${garmentStyle.icon}`} />
                      <span>{garmentTypeName}</span>
                    </div>
                  </div>
                </div>

                {/* Items Summary (Quantity Only & Actual Received Time) */}
                <div className="bg-[#f9f9f9] p-4 rounded-xl border border-[#e2e8f0] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#74777f] uppercase tracking-wider mb-2">
                      <Shirt className="w-4 h-4 text-[#0061a5]" />
                      {language === 'th' ? 'จำนวนผ้าทั้งหมด' : 'Total Items Quantity'}
                    </div>
                    <p className="font-bold text-2xl text-[#002045]">
                      {totalItems} <span className="text-sm font-medium text-[#43474e]">{language === 'th' ? 'ชิ้น' : 'pcs'}</span>
                    </p>
                  </div>

                  <div className="mt-3 text-xs text-[#002045] font-semibold bg-white px-2.5 py-2 rounded-lg border border-[#e2e8f0] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#0061a5] shrink-0" />
                      <span className="text-[#74777f]">{language === 'th' ? 'วันที่ส่งคืน:' : 'Return Date:'}</span>
                      <span className="text-[#002045] font-bold">{order.estimatedCompletion || order.receivedAt}</span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {order.items.length} {language === 'th' ? 'รายการย่อย' : 'items'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-between shrink-0 flex-wrap gap-2">
          <div className="text-xs text-[#74777f]">
            {language === 'th' ? 'วันที่ส่งคืน:' : 'Return Date:'} <span className="font-semibold text-[#0061a5]">{order.estimatedCompletion || order.receivedAt}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {currentStage === 'washing' && onCompleteOrder && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCompleteOrder(order);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>{language === 'th' ? 'เปลี่ยนสถานะเป็นซักเสร็จแล้ว' : 'Mark as Washed'}</span>
              </button>
            )}

            {/* Admin-only Delete Icon Button in Footer (Icon only) */}
            {isUserAdmin && onDeleteOrder && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
                title={language === 'th' ? 'ลบรายการผ้านี้' : 'Delete Order'}
                aria-label={language === 'th' ? 'ลบรายการผ้านี้' : 'Delete Order'}
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-white text-[#43474e] hover:bg-gray-100 border border-[#c4c6cf] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              {language === 'th' ? 'ปิดหน้าต่าง' : 'Close Details'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Deleting Laundry Order */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-rose-200 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {language === 'th' ? 'ยืนยันการลบรายการผ้า?' : 'Delete Laundry Order?'}
            </h3>
            
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {language === 'th' ? (
                <>
                  คุณแน่ใจหรือไม่ว่าต้องการลบรายการผ้ารหัส{' '}
                  <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    {order.trackingCode}
                  </span>{' '}
                  ({order.customerRoomOrDept || order.customerName})?
                  <br />
                  <span className="text-rose-600 font-medium mt-1 inline-block">
                    การกระทำนี้จะลบข้อมูลออกจากระบบทันทีและไม่สามารถย้อนกลับได้
                  </span>
                </>
              ) : (
                <>
                  Are you sure you want to permanently delete order{' '}
                  <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    {order.trackingCode}
                  </span>{' '}
                  ({order.customerRoomOrDept || order.customerName})?
                  <br />
                  <span className="text-rose-600 font-medium mt-1 inline-block">
                    This action will delete the record immediately and cannot be undone.
                  </span>
                </>
              )}
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteOrder) {
                    onDeleteOrder(order.id);
                  }
                  setShowDeleteConfirm(false);
                  onClose();
                }}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>{language === 'th' ? 'ยืนยันการลบ' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
