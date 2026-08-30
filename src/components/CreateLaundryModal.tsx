import React, { useState, useEffect } from 'react';
import { LaundryOrder, LaundryServiceType, LaundryPriority, LaundryItemDetail } from '../types';
import { LAUNDRY_DEPARTMENTS } from '../data/mockLaundryData';
import { useLanguage } from '../contexts/LanguageContext';
import { X, Plus, Trash2, Shirt, Sparkles, Building2, Calendar, Clock, QrCode, Lock } from 'lucide-react';

interface CreateLaundryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddOrder: (newOrder: LaundryOrder) => void;
  existingOrders?: LaundryOrder[];
}

export function generateTrackingCode(dateStr: string, existingOrders: LaundryOrder[] = [], offsetIndex: number = 0): string {
  let yy = '26';
  let mm = '08';
  let dd = '20';

  if (dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      yy = parts[0].slice(-2);
      mm = parts[1].padStart(2, '0');
      dd = parts[2].padStart(2, '0');
    }
  } else {
    const today = new Date();
    yy = String(today.getFullYear()).slice(-2);
    mm = String(today.getMonth() + 1).padStart(2, '0');
    dd = String(today.getDate()).padStart(2, '0');
  }

  const dateTag = `${yy}${mm}${dd}`;
  const prefix = `LKB2 - ${dateTag}`;

  let maxSeq = 0;
  if (existingOrders && existingOrders.length > 0) {
    const targetTag = `LKB2${dateTag}`.toUpperCase();
    for (const order of existingOrders) {
      if (!order.trackingCode) continue;
      const normalized = order.trackingCode.replace(/[\s\-_]/g, '').toUpperCase();
      if (normalized.startsWith(targetTag)) {
        const seqStr = normalized.slice(targetTag.length);
        const parsed = parseInt(seqStr, 10);
        if (!isNaN(parsed) && parsed > maxSeq) {
          maxSeq = parsed;
        }
      }
    }
  }

  const nextSeq = String(maxSeq + 1 + offsetIndex).padStart(2, '0');
  return `${prefix}${nextSeq}`;
}

const ESTIMATED_TIME_OPTIONS = [
  '10:30 น.',
  '12:30 น.',
  '14:30 น.',
  '16:30 น.',
];

const COMMON_PRESETS = [
  { name: 'เสื้อกาวน์สีเขียว', category: 'Clothing' as const, price: 15 },
  { name: 'เสื้อกาวน์สีกรมท่า', category: 'Clothing' as const, price: 15 },
  { name: 'ผ้ากรองแอร์', category: 'Specialty' as const, price: 20 },
  { name: 'ผ้าปูเตียงพยาบาล', category: 'Bedding' as const, price: 18 },
  { name: 'ผ้าปูโต๊ะ', category: 'Towels & Linens' as const, price: 15 },
  { name: 'ชุด Visitor', category: 'Clothing' as const, price: 18 },
  { name: 'ผ้าคลุมไส้', category: 'Specialty' as const, price: 20 },
  { name: 'เอี๊ยม/หมวก', category: 'Clothing' as const, price: 10 },
];

export const CreateLaundryModal: React.FC<CreateLaundryModalProps> = ({
  isOpen,
  onClose,
  onAddOrder,
  existingOrders = [],
}) => {
  const { language } = useLanguage();
  const [orderDate, setOrderDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [trackingCode, setTrackingCode] = useState<string>(() => generateTrackingCode(orderDate, existingOrders));
  const [estimatedTime, setEstimatedTime] = useState<string>('12:30 น.');
  const [selectedDept, setSelectedDept] = useState<string>('A/2');
  const [customDept, setCustomDept] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Update tracking code when modal opens or existingOrders/orderDate change
  useEffect(() => {
    if (isOpen) {
      setTrackingCode(generateTrackingCode(orderDate, existingOrders));
    }
  }, [isOpen, orderDate, existingOrders]);

  const [items, setItems] = useState<LaundryItemDetail[]>([
    { id: 'item-1', name: 'เสื้อกาวน์สีเขียว', category: 'Clothing', quantity: 1, unitPrice: 15, careNote: '' },
  ]);

  if (!isOpen) return null;

  const handleDateChange = (newDate: string) => {
    setOrderDate(newDate);
    setTrackingCode(generateTrackingCode(newDate, existingOrders));
  };

  const handleAddItem = (preset?: typeof COMMON_PRESETS[0]) => {
    const defaultPreset = preset || COMMON_PRESETS[0];
    const newItem: LaundryItemDetail = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: defaultPreset.name,
      category: defaultPreset.category,
      quantity: 1,
      unitPrice: defaultPreset.price,
      careNote: '',
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((i) => i.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<LaundryItemDetail>) => {
    setItems(prev => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const totalCost = items.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
  const totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    const finalTrackingCode = trackingCode.trim() || generateTrackingCode(orderDate, existingOrders);
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes} น.`;

    // Real recorded date and time
    const realDateStr = language === 'th'
      ? now.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
      : now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    
    const realReceivedAt = language === 'th'
      ? `${realDateStr} เวลา ${timeStr}`
      : `${realDateStr}, ${hours}:${minutes}`;

    // Target completion date string
    let targetDateStr = language === 'th' ? 'วันนี้' : 'Today';
    if (orderDate) {
      const parts = orderDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        targetDateStr = language === 'th'
          ? d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
          : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
    }

    const est = `${targetDateStr}, ${estimatedTime}`;
    const finalDept = selectedDept === 'other' ? (customDept.trim() || 'แผนกทั่วไป') : selectedDept;
    const estimatedWeight = parseFloat((totalPieces * 0.4).toFixed(1)) || 2.0;

    const newOrder: LaundryOrder = {
      id: `lnd-${Date.now()}`,
      trackingCode: finalTrackingCode,
      orderDate: orderDate,
      customerName: customerName.trim(),
      customerRoomOrDept: finalDept,
      serviceType: 'Wash & Fold',
      priority: 'normal',
      stage: 'washing',
      items: items.length > 0 ? items : [{ id: 'item-1', name: 'เสื้อกาวน์สีเขียว', category: 'Clothing', quantity: 1, unitPrice: 15 }],
      totalWeightKg: estimatedWeight,
      totalPrice: totalCost || 15,
      paymentStatus: 'Corporate Invoice',
      assignedStaff: customerName.trim() || 'สุริยา',
      assignedStaffAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
      assignedMachine: 'Intake Station #01',
      waterTemp: 'Warm (40°C)',
      notes: `ประเภทผ้า: ${items[0]?.name || 'ผ้าทั่วไป'} | แผนก: ${finalDept}`,
      receivedAt: realReceivedAt,
      estimatedCompletion: est,
      historyTimeline: [
        {
          stage: 'washing',
          label: language === 'th' ? 'บันทึกรับผ้าตามเวลาจริง' : 'Actual Order Intake Time',
          timestamp: realReceivedAt,
          note: language === 'th'
            ? `บันทึกรับผ้าจริงเมื่อ ${realReceivedAt} จากแผนก ${finalDept} โดย ${customerName.trim()} กำหนดเสร็จ: ${est} รวม ${totalPieces} ชิ้น`
            : `Order recorded at ${realReceivedAt} from Dept ${finalDept} by ${customerName.trim()}. Est. Ready: ${est}. Total items: ${totalPieces} pcs.`,
          operator: customerName.trim(),
        },
      ],
    };

    onAddOrder(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[#c4c6cf]/40 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-[#002045] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Shirt className="w-5 h-5 text-[#66affe]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {language === 'th' ? 'บันทึกรายการซัก-อบผ้า' : 'New Laundry Intake Order'}
              </h2>
              <p className="text-xs text-[#adc7f7]">
                {language === 'th'
                  ? 'เลือกแผนกผู้ส่ง ลงทะเบียนรายการผ้า และกำหนดเวลาเสร็จ'
                  : 'Register garment batch, select department, and set target completion time'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Customer & Department Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-[#0061a5]" />
              <h3 className="text-xs font-bold text-[#002045] uppercase tracking-wider">
                {language === 'th' ? '1. ข้อมูลแผนกและกำหนดเวลา' : '1. Department & Target Time'}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Date Calendar Picker */}
              <div>
                <label className="block text-xs font-semibold text-[#002045] mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0061a5]" />
                  {language === 'th' ? 'วันที่ดำเนินการ *' : 'Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={orderDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#f9f9f9] border border-[#c4c6cf] rounded-lg focus:bg-white focus:outline-hidden focus:border-[#0061a5] font-semibold text-[#002045]"
                />
              </div>

              {/* Tracking Code (รหัสติดตาม) */}
              <div>
                <label className="block text-xs font-semibold text-[#002045] mb-1 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-[#0061a5]" />
                  {language === 'th' ? 'รหัสติดตาม' : 'Tracking Code'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={trackingCode}
                    className="w-full px-3 py-2 text-sm bg-slate-100/90 border border-slate-300 rounded-lg text-slate-800 font-mono font-bold cursor-not-allowed select-all focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Target Completion Time (กำหนดเสร็จ) */}
              <div>
                <label className="block text-xs font-semibold text-[#002045] mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0061a5]" />
                  {language === 'th' ? 'กำหนดเสร็จ *' : 'Target Ready *'}
                </label>
                <select
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#f9f9f9] border border-[#c4c6cf] rounded-lg focus:bg-white focus:outline-hidden focus:border-[#0061a5] font-semibold text-[#002045] cursor-pointer"
                >
                  {ESTIMATED_TIME_OPTIONS.map((timeOption) => (
                    <option key={timeOption} value={timeOption}>
                      {timeOption}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-[#002045] mb-1">
                  {language === 'th' ? 'เลือกแผนก *' : 'Department *'}
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#f9f9f9] border border-[#c4c6cf] rounded-lg focus:bg-white focus:outline-hidden focus:border-[#0061a5] font-semibold text-[#002045]"
                >
                  <optgroup label={language === 'th' ? '--- แผนกการผลิต / อาคาร ---' : '--- Production & Building ---'}>
                    <option value="A/2">A/2</option>
                    <option value="A/3">A/3</option>
                    <option value="A/4">A/4</option>
                    <option value="A/6">A/6</option>
                    <option value="B/1">B/1</option>
                    <option value="B/5">B/5</option>
                    <option value="2/1">2/1</option>
                    <option value="2/2">2/2</option>
                    <option value="2/3">2/3</option>
                    <option value="3/1">3/1</option>
                    <option value="3/2">3/2</option>
                    <option value="3/3">3/3</option>
                    <option value="3/4">3/4</option>
                    <option value="3/5">3/5</option>
                  </optgroup>
                  <optgroup label={language === 'th' ? '--- แผนกสำนักงาน / ลาดกระบัง ---' : '--- Admin & HR Offices ---'}>
                    <option value="ธุรการลาดกระบัง 1">ธุรการลาดกระบัง 1</option>
                    <option value="ธุรการลาดกระบัง 2">ธุรการลาดกระบัง 2</option>
                    <option value="สรรหาลาดกระบัง 1">สรรหาลาดกระบัง 1</option>
                    <option value="สวัสดิการลาดกระบัง 1">สวัสดิการลาดกระบัง 1</option>
                  </optgroup>
                  <option value="other">{language === 'th' ? 'ระบุแผนกอื่น ๆ (พิมพ์เอง)...' : 'Other Department...'}</option>
                </select>

                {selectedDept === 'other' && (
                  <input
                    type="text"
                    required={selectedDept === 'other'}
                    value={customDept}
                    onChange={(e) => setCustomDept(e.target.value)}
                    placeholder={language === 'th' ? 'กรอกชื่อแผนก...' : 'Enter department name...'}
                    className="mt-2 w-full px-3 py-2 text-sm bg-white border border-[#c4c6cf] rounded-lg focus:outline-hidden focus:border-[#0061a5]"
                  />
                )}
              </div>

              {/* Submitter / Operator Name */}
              <div>
                <label className="block text-xs font-semibold text-[#002045] mb-1">
                  {language === 'th' ? 'ชื่อดำเนินการ *' : 'Operator / Submitter Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={language === 'th' ? 'เช่น สมชาย หรือ รหัสพนักงาน' : 'e.g. Marcus Sterling'}
                  className="w-full px-3 py-2 text-sm bg-[#f9f9f9] border border-[#c4c6cf] rounded-lg focus:bg-white focus:outline-hidden focus:border-[#0061a5]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Garment Itemization */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-xs font-bold text-[#002045] uppercase tracking-wider flex items-center gap-1.5">
                <Shirt className="w-4 h-4 text-[#0061a5]" />
                {language === 'th' ? '2. รายการผ้าและจำนวน' : '2. Itemized Garments & Quantities'}
              </h3>
            </div>

            {/* Item Rows */}
            <div className="space-y-2.5">
              {items.map((item, index) => {
                const isPreset = COMMON_PRESETS.some(p => p.name === item.name);
                return (
                  <div
                    key={item.id}
                    className="p-3 bg-white border border-[#cbd5e1] rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs shadow-2xs"
                  >
                    <div className="text-xs font-bold text-[#74777f] px-1 shrink-0">
                      #{index + 1}
                    </div>

                    {/* Garment Selector / Input */}
                    <div className="flex-1 w-full sm:w-auto space-y-1.5">
                      <select
                        value={isPreset ? item.name : 'custom'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            handleUpdateItem(item.id, { name: '', unitPrice: 15 });
                          } else {
                            const found = COMMON_PRESETS.find(p => p.name === val);
                            if (found) {
                              handleUpdateItem(item.id, {
                                name: found.name,
                                category: found.category,
                                unitPrice: found.price,
                              });
                            }
                          }
                        }}
                        className="w-full px-3 py-2 bg-[#f9f9f9] border border-[#c4c6cf] rounded-lg font-semibold text-[#002045] focus:bg-white focus:outline-hidden focus:border-[#0061a5] cursor-pointer text-xs"
                      >
                        <option value="" disabled>{language === 'th' ? '-- เลือกรายการผ้า --' : '-- Select Garment --'}</option>
                        {COMMON_PRESETS.map((p, idx) => (
                          <option key={idx} value={p.name}>{p.name}</option>
                        ))}
                        <option value="custom">{language === 'th' ? '✏️ ระบุรายการอื่น ๆ (พิมพ์เอง)...' : '✏️ Other / Custom Name...'}</option>
                      </select>

                      {!isPreset && (
                        <input
                          type="text"
                          required
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                          placeholder={language === 'th' ? 'พิมพ์ชื่อรายการผ้า...' : 'Enter garment name...'}
                          className="w-full px-2.5 py-1.5 bg-white border border-[#0061a5] rounded-md font-medium text-[#1a1c1c] text-xs focus:outline-hidden"
                          autoFocus
                        />
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="w-24 shrink-0">
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full pl-3 pr-7 py-2 bg-white border border-[#c4c6cf] rounded-lg text-center font-bold text-[#002045] text-xs"
                          placeholder="1"
                        />
                        <span className="absolute right-2 top-2 text-[10px] text-[#74777f] pointer-events-none">
                          {language === 'th' ? 'ชิ้น' : 'pcs'}
                        </span>
                      </div>
                    </div>

                    {/* Care Note */}
                    <div className="flex-1 w-full sm:w-auto">
                      <input
                        type="text"
                        value={item.careNote || ''}
                        onChange={(e) => handleUpdateItem(item.id, { careNote: e.target.value })}
                        placeholder={language === 'th' ? 'หมายเหตุ (ถ้ามี)' : 'Note (optional)'}
                        className="w-full px-2.5 py-2 bg-white border border-[#c4c6cf] rounded-lg text-[#43474e] text-xs"
                      />
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={items.length <= 1}
                      className={`p-2 rounded-lg transition-colors shrink-0 ${
                        items.length <= 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer'
                      }`}
                      title={language === 'th' ? 'ลบรายการนี้' : 'Remove item'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => handleAddItem()}
                className="w-full py-2.5 bg-white border border-dashed border-[#0061a5] text-[#0061a5] hover:bg-[#f0f7ff] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                {language === 'th' ? '+ เพิ่มรายการผ้าอีกแถว' : '+ Add Another Garment Line'}
              </button>
            </div>
          </div>

          {/* Total pieces summary */}
          <div className="p-3 bg-[#f3f3f4] rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold text-[#43474e]">
              {language === 'th' ? 'จำนวนชิ้นรวม:' : 'Total Items:'}
            </span>
            <span className="text-sm font-bold text-[#002045]">
              {totalPieces} {language === 'th' ? 'ชิ้น' : 'pcs'}
            </span>
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#43474e] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#0061a5] text-white text-xs font-bold rounded-lg hover:bg-[#004d84] shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#66affe]" />
              {language === 'th' ? 'ยืนยันบันทึกรายการ' : 'Confirm & Save Intake'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


