import React from 'react';
import { 
  X, 
  Calendar, 
  User, 
  Building2, 
  Package, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Key, 
  Sparkles, 
  Tag, 
  FileText,
  Layers,
  Shirt
} from 'lucide-react';
import { EquipmentRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface EquipmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: EquipmentRecord | null;
}

export const EquipmentDetailModal: React.FC<EquipmentDetailModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  const { language } = useLanguage();

  if (!isOpen || !record) return null;

  const handlePrint = () => {
    window.print();
  };

  const getSubCategoryTitle = (sub: string) => {
    switch (sub) {
      case 'cleaning':
        return language === 'th' ? 'อุปกรณ์ทำความสะอาด' : 'Cleaning Supplies';
      case 'gown':
        return language === 'th' ? 'เสื้อกาวน์' : 'Gowns';
      case 'keys':
        return language === 'th' ? 'กุญแจ' : 'Keys';
      case 'ladder':
        return language === 'th' ? 'บันไดทรง A' : 'A-Frame Ladder';
      case 'office':
        return language === 'th' ? 'อุปกรณ์สำนักงาน (ธุรการลาดกระบัง 2)' : 'Office Supplies';
      default:
        return language === 'th' ? 'เบิกอุปกรณ์' : 'Equipment';
    }
  };

  const isReturn = record.actionType === 'คืน' || record.status.includes('คืน');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-orange-200/80 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 border-b border-orange-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white shadow-xs border border-orange-200 flex items-center justify-center text-orange-600">
              {record.subCategory === 'gown' ? (
                <Shirt className="w-6 h-6" />
              ) : record.subCategory === 'keys' ? (
                <Key className="w-6 h-6" />
              ) : (
                <Package className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-orange-200/80 text-orange-950">
                  {getSubCategoryTitle(record.subCategory)}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  isReturn ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                }`}>
                  {record.actionType || record.status}
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-800 mt-0.5">
                {record.itemSummary || 'รายละเอียดรายการเบิก'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white/80 hover:bg-white text-slate-600 border border-orange-200/80 transition-all hover:scale-105 cursor-pointer shadow-2xs"
              title={language === 'th' ? 'พิมพ์ใบรายการ' : 'Print Record'}
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/80 hover:bg-white text-slate-600 hover:text-red-600 border border-orange-200/80 transition-all hover:scale-105 cursor-pointer shadow-2xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Key Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-slate-200 text-slate-500 shrink-0">
                <Calendar className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500">{language === 'th' ? 'วันที่บันทึก' : 'Date'}</p>
                <p className="font-bold text-slate-800">{record.date || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-slate-200 text-slate-500 shrink-0">
                <User className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500">{language === 'th' ? 'ผู้เบิก / ผู้ยืม' : 'Requester / Borrower'}</p>
                <p className="font-bold text-slate-800">{record.requesterName || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-slate-200 text-slate-500 shrink-0">
                <Building2 className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500">{language === 'th' ? 'แผนก / สังกัด' : 'Department'}</p>
                <p className="font-bold text-slate-800">{record.department || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-slate-200 text-slate-500 shrink-0">
                <Layers className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500">{language === 'th' ? 'จำนวนรวม' : 'Total Quantity'}</p>
                <p className="font-bold text-slate-800">
                  {record.totalQuantity || 1} {language === 'th' ? 'รายการ / ชิ้น' : 'items'}
                </p>
              </div>
            </div>
          </div>

          {/* Subcategory Specific Details */}
          {/* 1. Gowns Size breakdown */}
          {record.subCategory === 'gown' && record.gownSizes && record.gownSizes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Shirt className="w-3.5 h-3.5 text-orange-600" />
                {language === 'th' ? 'รายละเอียดขนาดเสื้อกาวน์' : 'Gown Sizes Breakdown'}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {record.gownSizes.map((g, idx) => (
                  <div key={idx} className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 text-center">
                    <span className="text-xs font-bold text-amber-950">Size {g.size}</span>
                    <p className="text-xl font-black text-amber-900 mt-1">{g.count} <span className="text-xs font-normal">ตัว</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Keys Number */}
          {record.subCategory === 'keys' && record.keyNumbers && (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-orange-600" />
                {language === 'th' ? 'หมายเลขกุญแจ' : 'Key Numbers'}
              </h3>
              <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 flex items-center gap-2 flex-wrap">
                {record.keyNumbers.split(/[,+\/\s]+/).filter(Boolean).map((num, i) => (
                  <span key={i} className="px-3 py-1 bg-amber-600 text-white font-black text-sm rounded-lg shadow-2xs">
                    #{num}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 3. Ladder Details */}
          {record.subCategory === 'ladder' && (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-orange-600" />
                {language === 'th' ? 'ประเภทบันไดและการตรวจสอบ' : 'Ladder Type & Condition'}
              </h3>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">{language === 'th' ? 'ประเภทบันได:' : 'Ladder Type:'}</span>
                  <span className="font-bold text-slate-800">{record.ladderType || 'บันไดทรง A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">{language === 'th' ? 'ผลการตรวจสอบ:' : 'Inspection:'}</span>
                  <span className="font-semibold text-emerald-700">{record.ladderInspection || 'ไม่พบจุดชำรุด'}</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Office Supplies Code */}
          {record.subCategory === 'office' && (record.shortCode || record.fullCode) && (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-orange-600" />
                {language === 'th' ? 'รหัสพัสดุ / บาร์โค้ด' : 'Item Code'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">{language === 'th' ? 'รหัสย่อ' : 'Short Code'}</span>
                  <span className="font-bold text-slate-800 text-base">{record.shortCode || '-'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">{language === 'th' ? 'รหัสเต็ม' : 'Full Code'}</span>
                  <span className="font-bold text-slate-800 text-base">{record.fullCode || '-'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Items Breakdown Table */}
          {record.itemsList && record.itemsList.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-orange-600" />
                {language === 'th' ? 'รายการอุปกรณ์ที่เบิกทั้งหมด' : 'Requisitioned Items List'}
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 pl-3">#</th>
                      <th className="p-2.5">{language === 'th' ? 'ชื่ออุปกรณ์ / รายการ' : 'Item Name'}</th>
                      <th className="p-2.5 text-right">{language === 'th' ? 'จำนวน' : 'Qty'}</th>
                      <th className="p-2.5 pr-3">{language === 'th' ? 'หมายเหตุ' : 'Note'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {record.itemsList.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="p-2.5 pl-3 text-slate-400">{index + 1}</td>
                        <td className="p-2.5 font-bold text-slate-800">{item.name}</td>
                        <td className="p-2.5 text-right font-black text-orange-600">{item.quantity}</td>
                        <td className="p-2.5 pr-3 text-slate-500">{item.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Additional Notes */}
          {record.note && (
            <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80 text-xs">
              <span className="font-bold text-amber-950 block mb-0.5">{language === 'th' ? 'หมายเหตุเพิ่มเติม:' : 'Note:'}</span>
              <p className="text-amber-900">{record.note}</p>
            </div>
          )}

          {/* Timestamp Info */}
          {record.timestamp && (
            <p className="text-[11px] text-slate-400 text-right">
              {language === 'th' ? 'ประทับเวลาในระบบ:' : 'System Timestamp:'} {record.timestamp}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            {language === 'th' ? 'ระบบเบิกอุปกรณ์ ธุรการลาดกระบัง 2' : 'Ladkrabang 2 Equipment System'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-105 cursor-pointer"
          >
            {language === 'th' ? 'ปิด' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
