import React, { useState, useEffect, useMemo } from 'react';
import { LaundryOrder, LaundryItemDetail } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { AdminUserAccount, canCreateLaundryOrder } from '../data/mockData';
import { 
  X, 
  Plus, 
  Trash2, 
  Shirt, 
  Sparkles, 
  Building2, 
  Calendar, 
  Clock, 
  Tag, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  FileSpreadsheet,
  Search,
  Lock
} from 'lucide-react';
import { 
  submitLaundryOrder, 
  buildPrefilledGoogleFormUrl, 
  GOOGLE_LAUNDRY_FORM_PREFILL_URL, 
  GOOGLE_LAUNDRY_SHEET_URL, 
  LAUNDRY_FORM_OPTIONS 
} from '../services/laundrySubmitService';

interface CreateLaundryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddOrder: (newOrder: LaundryOrder) => void;
  existingOrders?: LaundryOrder[];
  onSyncGoogleSheet?: () => void;
  initialOrderToComplete?: LaundryOrder | null;
  currentUser?: AdminUserAccount | null;
  isAuthenticated?: boolean;
}

export function generateTrackingCode(dateStr: string, existingOrders: LaundryOrder[] = [], offsetIndex: number = 0): string {
  let yy = '26';
  let mm = '09';
  let dd = '14';

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

export function extractOrderDate(order: LaundryOrder): string {
  if (order.orderDate && /^\d{4}-\d{2}-\d{2}$/.test(order.orderDate)) {
    return order.orderDate;
  }
  const clean = (order.trackingCode || '').replace(/\s+/g, '');
  const match = clean.match(/LKB2-(\d{2})(\d{2})(\d{2})/i) || clean.match(/(\d{2})(\d{2})(\d{2})\d{2}/);
  if (match) {
    const yy = match[1];
    const mm = match[2];
    const dd = match[3];
    return `20${yy}-${mm}-${dd}`;
  }
  if (order.receivedAt) {
    const dMatch = order.receivedAt.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dMatch) return `${dMatch[1]}-${dMatch[2]}-${dMatch[3]}`;
  }
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function extractDeliveryTime(order: LaundryOrder): string {
  if ((order as any).deliveryTime) {
    const dt = String((order as any).deliveryTime).replace(/[^\d.]/g, '');
    if (dt) return dt;
  }
  if (order.notes) {
    const match = order.notes.match(/เวลาจัดส่ง:\s*([0-9.]+)/i);
    if (match) return match[1];
  }
  if (order.estimatedCompletion) {
    const match = order.estimatedCompletion.match(/([0-9]{1,2}[.:][0-9]{2})/);
    if (match) return match[1].replace(':', '.');
  }
  return '12.35';
}

const COMMON_PRESETS = [
  { name: 'เสื้อกาวน์สีเขียว', category: 'Clothing' as const, price: 15 },
  { name: 'เสื้อกาวน์สีกรมท่า', category: 'Clothing' as const, price: 15 },
  { name: 'ผ้ากรองแอร์', category: 'Specialty' as const, price: 20 },
  { name: 'ผ้าปูเตียงพยาบาล', category: 'Bedding' as const, price: 18 },
  { name: 'ผ้าปูโต๊ะ', category: 'Towels & Linens' as const, price: 15 },
  { name: 'ผ้ารองปูโต๊ะ', category: 'Towels & Linens' as const, price: 15 },
  { name: 'ชุด Visitor', category: 'Clothing' as const, price: 18 },
  { name: 'ผ้าคลุมไส้', category: 'Specialty' as const, price: 20 },
  { name: 'เอี๊ยม/หมวก', category: 'Clothing' as const, price: 10 },
  { name: 'เสื้อแขนยาว', category: 'Clothing' as const, price: 15 },
];

interface FormLaundryItem {
  id: string;
  name: string;
  category: LaundryItemDetail['category'];
  quantity: number | '';
  unitPrice: number;
  careNote?: string;
}

export const CreateLaundryModal: React.FC<CreateLaundryModalProps> = ({
  isOpen,
  onClose,
  onAddOrder,
  existingOrders = [],
  onSyncGoogleSheet,
  initialOrderToComplete = null,
  currentUser,
  isAuthenticated = true,
}) => {
  const { language } = useLanguage();

  // ตรวจสอบสิทธิ์การสร้างรายการซักผ้า (เฉพาะ ผู้ดูแล, แอดมินเพจ และพนักงาน ตำแหน่ง ธุรการ)
  const canCreate = useMemo(() => {
    if (currentUser === undefined) return true;
    return canCreateLaundryOrder(currentUser, isAuthenticated);
  }, [currentUser, isAuthenticated]);

  // Helper to format today's date YYYY-MM-DD
  const getTodayDateStr = (): string => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Status choice from Google Form: "อยู่ระหว่างการซัก" vs "ซักเสร็จแล้ว"
  const [actionType, setActionType] = useState<'อยู่ระหว่างการซัก' | 'ซักเสร็จแล้ว'>('อยู่ระหว่างการซัก');

  const [orderDate, setOrderDate] = useState<string>(getTodayDateStr);
  const [trackingCode, setTrackingCode] = useState<string>(() => generateTrackingCode(getTodayDateStr(), existingOrders));
  const [deliveryTime, setDeliveryTime] = useState<string>(''); // Default unselected
  const [selectedDept, setSelectedDept] = useState<string>(''); // Default unselected
  const [customDept, setCustomDept] = useState('');
  const [customerName, setCustomerName] = useState(''); // Default empty for user input
  const [justSavedSuccess, setJustSavedSuccess] = useState(false);
  const [justCompletedSuccess, setJustCompletedSuccess] = useState(false);

  // Multi-item garment list: ค่าเริ่มต้นช่องจำนวนให้เป็นช่องว่าง เพื่อให้ผู้ใช้สามารถกรอกข้อมูลได้สะดวก
  const [items, setItems] = useState<FormLaundryItem[]>([
    { id: 'item-1', name: 'เสื้อกาวน์สีเขียว', category: 'Clothing', quantity: '', unitPrice: 15, careNote: '' },
  ]);

  // Active washing orders (currently pending or being processed)
  const washingOrders = useMemo(() => {
    return (existingOrders || []).filter(o => 
      o.stage === 'washing' || 
      o.stage === 'received' || 
      (o as any).status === 'in_progress' ||
      !o.completedAt
    );
  }, [existingOrders]);

  // Matched order from tracking code lookup
  const [matchedOrder, setMatchedOrder] = useState<LaundryOrder | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean | null>(null);
  const [submitFeedback, setSubmitFeedback] = useState<string>('');

  // Auto-populate from order
  const autoPopulateFromOrder = (order: LaundryOrder) => {
    setMatchedOrder(order);
    setTrackingCode(order.trackingCode);

    // 1. Date
    const d = extractOrderDate(order);
    setOrderDate(d);

    // 2. Operator Name
    const op = order.customerName || order.assignedStaff || '';
    setCustomerName(op);

    // 3. Department
    const dept = (order.customerRoomOrDept || '').trim();
    if (dept) {
      if (LAUNDRY_FORM_OPTIONS.departments.includes(dept)) {
        setSelectedDept(dept);
        setCustomDept('');
      } else {
        setSelectedDept('other');
        setCustomDept(dept);
      }
    }

    // 4. Delivery time
    const dTime = extractDeliveryTime(order);
    if (dTime) {
      setDeliveryTime(dTime);
    }

    // 5. Items
    if (order.items && order.items.length > 0) {
      setItems(
        order.items.map((it, idx) => ({
          id: `item-matched-${idx}-${Date.now()}`,
          name: it.name || 'เสื้อกาวน์สีเขียว',
          category: it.category || 'Clothing',
          quantity: it.quantity ?? '',
          unitPrice: it.unitPrice || 15,
          careNote: it.careNote || '',
        }))
      );
    }
  };

  // Auto update or populate order when modal opens
  useEffect(() => {
    if (isOpen) {
      setJustSavedSuccess(false);
      setJustCompletedSuccess(false);
      if (initialOrderToComplete) {
        setActionType('ซักเสร็จแล้ว');
        autoPopulateFromOrder(initialOrderToComplete);
      } else {
        if (actionType === 'อยู่ระหว่างการซัก') {
          const todayStr = getTodayDateStr();
          setOrderDate(todayStr);
          setTrackingCode(generateTrackingCode(todayStr, existingOrders));
          setMatchedOrder(null);
          setCustomerName('');
          setSelectedDept('');
          setCustomDept('');
          setDeliveryTime('');
          setItems([
            { id: 'item-1', name: 'เสื้อกาวน์สีเขียว', category: 'Clothing', quantity: '', unitPrice: 15, careNote: '' },
          ]);
        } else {
          // ถ้าไม่ได้เปิดจากรายการกำลังซัก ให้เป็นช่องว่างรอกรอก
          setTrackingCode('');
          setMatchedOrder(null);
          setCustomerName('');
          setSelectedDept('');
          setCustomDept('');
          setDeliveryTime('');
          setItems([
            { id: 'item-1', name: 'เสื้อกาวน์สีเขียว', category: 'Clothing', quantity: '', unitPrice: 15, careNote: '' },
          ]);
        }
      }
      setSubmitSuccess(null);
      setSubmitFeedback('');
    }
  }, [isOpen, initialOrderToComplete]);

  const handleDateChange = (newDate: string) => {
    setOrderDate(newDate);
    if (actionType === 'อยู่ระหว่างการซัก') {
      setTrackingCode(generateTrackingCode(newDate, existingOrders));
    }
  };

  const handleTrackingCodeChange = (inputCode: string) => {
    setTrackingCode(inputCode);
    const cleanInput = inputCode.trim().replace(/[\s\-_]/g, '').toLowerCase();
    if (!cleanInput) {
      setMatchedOrder(null);
      return;
    }

    // Look first in washingOrders, then all existingOrders
    const found = 
      washingOrders.find(o => {
        const oCode = (o.trackingCode || '').replace(/[\s\-_]/g, '').toLowerCase();
        return oCode === cleanInput || oCode.endsWith(cleanInput) || cleanInput.endsWith(oCode);
      }) ||
      existingOrders.find(o => {
        const oCode = (o.trackingCode || '').replace(/[\s\-_]/g, '').toLowerCase();
        return oCode === cleanInput || oCode.endsWith(cleanInput) || cleanInput.endsWith(oCode);
      });

    if (found) {
      autoPopulateFromOrder(found);
    } else {
      setMatchedOrder(null);
    }
  };

  const handleActionTypeChange = (newType: 'อยู่ระหว่างการซัก' | 'ซักเสร็จแล้ว') => {
    setActionType(newType);
    setJustSavedSuccess(false);
    setJustCompletedSuccess(false);
    setSubmitFeedback('');
    if (newType === 'อยู่ระหว่างการซัก') {
      setMatchedOrder(null);
      setTrackingCode(generateTrackingCode(orderDate || getTodayDateStr(), existingOrders));
    } else {
      // Switched to 'ซักเสร็จแล้ว'
      // ถ้าไม่ได้กดจากรายการอยู่ระหว่างซักผ้า ให้เป็นช่องว่างรอกรอก
      if (!initialOrderToComplete) {
        setTrackingCode('');
        setMatchedOrder(null);
        setCustomerName('');
        setSelectedDept('');
        setCustomDept('');
        setDeliveryTime('');
        setItems([
          { id: 'item-1', name: 'เสื้อกาวน์สีเขียว', category: 'Clothing', quantity: '', unitPrice: 15, careNote: '' },
        ]);
      }
    }
  };

  const handleAddItem = (preset?: typeof COMMON_PRESETS[0]) => {
    const defaultPreset = preset || COMMON_PRESETS[0];
    const newItem: FormLaundryItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: defaultPreset.name,
      category: defaultPreset.category,
      quantity: '',
      unitPrice: defaultPreset.price,
      careNote: '',
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((i) => i.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<FormLaundryItem>) => {
    setItems(prev => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const totalCost = items.reduce((acc, curr) => acc + ((Number(curr.quantity) || 0) * curr.unitPrice), 0);
  const totalPieces = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const finalDept = selectedDept === 'other' ? (customDept.trim() || 'แผนกทั่วไป') : selectedDept;

  // Generate dynamic prefilled URL for Google Form
  const prefillUrl = useMemo(() => {
    const firstQty = typeof items[0]?.quantity === 'number' ? items[0].quantity : (parseInt(String(items[0]?.quantity), 10) || 1);
    return buildPrefilledGoogleFormUrl({
      actionType,
      date: orderDate,
      operatorName: customerName,
      department: finalDept,
      deliveryTime,
      trackingCode,
      garmentType: items[0]?.name || 'เสื้อกาวน์สีเขียว',
      quantity: firstQty,
    });
  }, [actionType, orderDate, customerName, finalDept, deliveryTime, trackingCode, items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setSubmitSuccess(false);
      setSubmitFeedback(language === 'th' ? 'กรุณากรอกชื่อผู้ดำเนินการ' : 'Please enter operator name');
      return;
    }
    if (!selectedDept) {
      setSubmitSuccess(false);
      setSubmitFeedback(language === 'th' ? 'กรุณาเลือกแผนก' : 'Please select department');
      return;
    }
    if (selectedDept === 'other' && !customDept.trim()) {
      setSubmitSuccess(false);
      setSubmitFeedback(language === 'th' ? 'กรุณาระบุชื่อแผนก' : 'Please specify department');
      return;
    }
    if (!deliveryTime) {
      setSubmitSuccess(false);
      setSubmitFeedback(language === 'th' ? 'กรุณาเลือกเวลาที่จัดส่ง' : 'Please select delivery time');
      return;
    }

    if (actionType === 'ซักเสร็จแล้ว' && !trackingCode.trim()) {
      setSubmitSuccess(false);
      setSubmitFeedback(language === 'th' ? 'กรุณากรอกรหัสติดตามผ้าที่ซักเสร็จแล้ว' : 'Please enter tracking code');
      return;
    }

    const hasEmptyQty = items.some(it => it.quantity === '' || it.quantity === undefined || Number(it.quantity) < 1);
    if (hasEmptyQty) {
      setSubmitSuccess(false);
      setSubmitFeedback(language === 'th' ? 'กรุณากรอกจำนวนผ้าให้ครบถ้วน (อย่างน้อย 1 ชิ้น)' : 'Please enter valid garment quantity (at least 1 pc)');
      return;
    }

    setIsSubmitting(true);
    setSubmitFeedback('');

    const finalTrackingCode = trackingCode.trim() || generateTrackingCode(orderDate, existingOrders);
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes} น.`;

    const realDateStr = language === 'th'
      ? now.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
      : now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    
    const realReceivedAt = language === 'th'
      ? `${realDateStr} เวลา ${timeStr}`
      : `${realDateStr}, ${hours}:${minutes}`;

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

    const est = `${targetDateStr}, ${deliveryTime}`;
    const estimatedWeight = parseFloat((totalPieces * 0.4).toFixed(1)) || 2.0;

    const sanitizedItems: LaundryItemDetail[] = items.map((it, idx) => ({
      id: it.id || `item-${idx}`,
      name: it.name || 'เสื้อกาวน์สีเขียว',
      category: it.category || 'Clothing',
      quantity: typeof it.quantity === 'number' ? it.quantity : (parseInt(String(it.quantity), 10) || 1),
      unitPrice: it.unitPrice || 15,
      careNote: it.careNote,
    }));

    // 1. Submit to Google Form and Google Sheet via backend API
    const submitResult = await submitLaundryOrder({
      actionType,
      date: orderDate,
      operatorName: customerName.trim(),
      department: finalDept,
      deliveryTime,
      trackingCode: finalTrackingCode,
      items: sanitizedItems.map(it => ({
        garmentType: it.name,
        quantity: it.quantity,
        careNote: it.careNote,
      })),
    });

    setIsSubmitting(false);

    // 2. Build in-memory LaundryOrder for instantaneous UI display
    const newOrder: LaundryOrder = {
      ...(matchedOrder || {}),
      id: matchedOrder?.id || `lnd-${Date.now()}`,
      trackingCode: finalTrackingCode,
      orderDate: orderDate,
      customerName: customerName.trim(),
      customerRoomOrDept: finalDept,
      serviceType: matchedOrder?.serviceType || 'Wash & Fold',
      priority: matchedOrder?.priority || 'normal',
      stage: actionType === 'ซักเสร็จแล้ว' ? 'ready' : 'washing',
      items: sanitizedItems.length > 0 ? sanitizedItems : (matchedOrder?.items || [{ id: 'item-1', name: 'เสื้อกาวน์สีเขียว', category: 'Clothing', quantity: 1, unitPrice: 15 }]),
      totalWeightKg: estimatedWeight,
      totalPrice: totalCost || matchedOrder?.totalPrice || 15,
      paymentStatus: matchedOrder?.paymentStatus || 'Corporate Invoice',
      assignedStaff: customerName.trim() || matchedOrder?.assignedStaff || 'สุริยา',
      assignedStaffAvatar: matchedOrder?.assignedStaffAvatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
      assignedMachine: matchedOrder?.assignedMachine || 'Intake Station #01',
      waterTemp: matchedOrder?.waterTemp || 'Warm (40°C)',
      notes: `ประเภทผ้า: ${sanitizedItems.map(i => `${i.name} (${i.quantity})`).join(', ')} | เวลาจัดส่ง: ${deliveryTime}`,
      receivedAt: matchedOrder?.receivedAt || realReceivedAt,
      completedAt: actionType === 'ซักเสร็จแล้ว' ? realReceivedAt : undefined,
      createdAt: Date.now(),
      estimatedCompletion: est,
      historyTimeline: [
        ...(matchedOrder?.historyTimeline || []),
        {
          stage: actionType === 'ซักเสร็จแล้ว' ? 'ready' : 'washing',
          label: actionType === 'ซักเสร็จแล้ว' ? 'บันทึกสถานะซักเสร็จแล้ว' : 'บันทึกรับผ้า (กำลังซัก)',
          timestamp: realReceivedAt,
          note: `บันทึกเรียบร้อยแล้ว (รหัส: ${finalTrackingCode}) แผนก ${finalDept} โดย ${customerName.trim()}`,
          operator: customerName.trim(),
        },
      ],
    };

    onAddOrder(newOrder);

    // Trigger Google Sheet sync in background
    if (onSyncGoogleSheet) {
      onSyncGoogleSheet();
    }

    if (actionType === 'อยู่ระหว่างการซัก') {
      // Requirements 2 & 8:
      // เมื่อทำรายการอยู่ระหว่างซัก เมื่อกดปุ่มบันทึกข้อมูล แล้ว ให้เป็นเปลี่ยนสีเขียว ไม่ต้องปิดหน้าต่างลง แต่ให้ระบบรีเซ็ทหน้าเปล่าเพิ่มทำรายการใหม่
      setJustSavedSuccess(true);
      setSubmitSuccess(true);
      setSubmitFeedback(
        language === 'th'
          ? `✓ บันทึกข้อมูลรหัส ${finalTrackingCode} สำเร็จเรียบร้อยแล้ว ระบบรีเซ็ตฟอร์มพร้อมบันทึกรายการใหม่`
          : `✓ Order ${finalTrackingCode} saved! Form reset for next entry.`
      );

      // Reset form to blank state for new entry
      setMatchedOrder(null);
      const todayStr = getTodayDateStr();
      setOrderDate(todayStr);
      setCustomerName('');
      setSelectedDept('');
      setCustomDept('');
      setDeliveryTime('');
      setItems([
        { id: `item-${Date.now()}`, name: 'เสื้อกาวน์สีเขียว', category: 'Clothing', quantity: '', unitPrice: 15, careNote: '' },
      ]);
      const updatedOrders = [...existingOrders, newOrder];
      setTrackingCode(generateTrackingCode(todayStr, updatedOrders));

      // Revert green button state after 3 seconds
      setTimeout(() => {
        setJustSavedSuccess(false);
      }, 3000);
    } else {
      // Requirements:
      // หน้าต่างปุ่มเพิ่มรายการซักผ้า ปุ่มซักเสร็จแล้ว เมื่อกดปุ่มบันทึกข้อมูล แล้ว ให้เป็นเปลี่ยนสีเขียว และเปลี่ยนคำเป็น ดำเนินการเสร็จสิ้น
      setJustCompletedSuccess(true);
      setSubmitSuccess(true);
      setSubmitFeedback(
        language === 'th'
          ? `✓ บันทึกข้อมูลดำเนินการเสร็จสิ้นเรียบร้อยแล้ว (${finalTrackingCode})`
          : `✓ Order ${finalTrackingCode} completed successfully!`
      );
      setTimeout(() => {
        onClose();
        setJustCompletedSuccess(false);
      }, 1800);
    }
  };

  if (!isOpen) return null;
  if (!initialOrderToComplete && !canCreate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[#c4c6cf]/40 animate-in fade-in zoom-in-95 duration-150 my-auto">
        
        {/* Header with Google Form & Google Sheet Branding */}
        <div className="px-5 py-3.5 bg-[#002045] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
              <Shirt className="w-5 h-5 text-[#66affe]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {initialOrderToComplete 
                    ? (language === 'th' ? 'เปลี่ยนสถานะเป็นซักเสร็จแล้ว' : 'Mark as Washed & Ready')
                    : (language === 'th' ? 'เพิ่มรายการซัก-อบผ้า' : 'Add Laundry Record')}
                </h2>
              </div>
              <p className="text-[11px] text-[#adc7f7]">
                {initialOrderToComplete
                  ? `${language === 'th' ? 'รหัสติดตาม:' : 'Tracking Code:'} ${initialOrderToComplete.trackingCode} | ${language === 'th' ? 'แผนก:' : 'Dept:'} ${initialOrderToComplete.customerRoomOrDept}`
                  : (language === 'th'
                    ? 'บันทึกข้อมูลการซัก-อบผ้าโรงงาน'
                    : 'Factory laundry and uniform washing record')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert if applicable */}
        {submitFeedback && (
          <div className={`px-5 py-2.5 flex items-center gap-2 text-xs font-semibold ${
            submitSuccess ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' : 'bg-amber-50 text-amber-800 border-b border-amber-200'
          }`}>
            {submitSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
            <span>{submitFeedback}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Section 0: สถานะการซัก (เลือกข้อมูล: อยู่ระหว่างการซัก / ซักเสร็จแล้ว) */}
          <div className="p-3 bg-sky-50/60 border border-sky-200/80 rounded-xl">
            <label className="block text-xs font-bold text-sky-950 mb-2">
              {language === 'th' ? '1. เลือกข้อมูลสถานะ *' : '1. Status Selection *'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleActionTypeChange('อยู่ระหว่างการซัก')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  actionType === 'อยู่ระหว่างการซัก'
                    ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                อยู่ระหว่างการซัก
              </button>
              <button
                type="button"
                onClick={() => handleActionTypeChange('ซักเสร็จแล้ว')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  actionType === 'ซักเสร็จแล้ว'
                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                ซักเสร็จแล้ว
              </button>
            </div>
          </div>

          {/* Dedicated Section for 'ซักเสร็จแล้ว': ช่องรหัสติดตาม และดึงข้อมูลอัตโนมัติ */}
          {actionType === 'ซักเสร็จแล้ว' && (
            <div className="p-4 bg-emerald-50/90 border-2 border-emerald-400 rounded-2xl space-y-3.5 shadow-xs">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <span>{language === 'th' ? 'ช่องระบุรหัสติดตาม (ผ้าที่ซักเสร็จแล้ว) *' : 'Tracking Code (Completed Wash) *'}</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200 text-emerald-900">
                        {language === 'th' ? 'ดึงข้อมูลอัตโนมัติ' : 'Auto-fill'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-emerald-800">
                      {language === 'th'
                        ? 'เมื่อใส่รหัสติดตาม ระบบจะดึงข้อมูลแผนก ประเภทผ้า และผู้ดำเนินการที่กำลังซักมาใส่อัตโนมัติ'
                        : 'Enter tracking code to automatically populate in-progress laundry details'}
                    </p>
                  </div>
                </div>

                {washingOrders.length > 0 && (
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                    {language === 'th' ? 'รายการกำลังซัก:' : 'In Progress:'} <strong>{washingOrders.length}</strong> {language === 'th' ? 'รายการ' : 'orders'}
                  </span>
                )}
              </div>

              {/* Input Box: กรอกรหัสติดตาม หรือพิมพ์รหัส */}
              <div>
                <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                  {language === 'th' ? 'กรอกรหัสติดตาม (Tracking Code):' : 'Enter Tracking Code:'}
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      required
                      value={trackingCode}
                      onChange={(e) => handleTrackingCodeChange(e.target.value)}
                      placeholder="พิมพ์รหัสติดตาม เช่น LKB2 - 26091401..."
                      className="w-full pl-9 pr-20 py-2.5 text-xs bg-white border border-emerald-300 rounded-xl font-mono font-bold text-emerald-950 placeholder:text-emerald-700/50 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                    />
                    <Search className="w-4 h-4 text-emerald-600 absolute left-3 top-3 pointer-events-none" />
                    {trackingCode && (
                      <button
                        type="button"
                        onClick={() => {
                          setTrackingCode('');
                          setMatchedOrder(null);
                        }}
                        className="absolute right-2 top-2 px-2 py-1 text-[10px] text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                      >
                        ล้างรหัส
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTrackingCodeChange(trackingCode)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-xs cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{language === 'th' ? 'ค้นหา' : 'Search'}</span>
                  </button>
                </div>
              </div>

              {/* Matched Success Banner */}
              {matchedOrder ? (
                <div className="p-3 bg-white/95 border border-emerald-300 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-emerald-950">
                        {language === 'th' ? 'ดึงข้อมูลรายการกำลังซักสำเร็จ!' : 'Successfully loaded in-progress order!'}
                      </span>
                      <span className="font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[11px] font-bold">
                        {matchedOrder.trackingCode}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-800 leading-relaxed">
                      แผนก: <strong>{matchedOrder.customerRoomOrDept || '-'}</strong> | 
                      ผู้ดำเนินการ: <strong>{matchedOrder.customerName || matchedOrder.assignedStaff}</strong> | 
                      ประเภทผ้า: <strong>{matchedOrder.items?.map(i => `${i.name} (${i.quantity} ชิ้น)`).join(', ')}</strong> | 
                      วันที่: <strong>{orderDate}</strong> | 
                      เวลาจัดส่ง: <strong>{deliveryTime}</strong>
                    </div>
                  </div>
                </div>
              ) : trackingCode.trim().length >= 3 ? (
                <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {language === 'th'
                      ? `ยังไม่พบรายการกำลังซักที่ตรงกับรหัส "${trackingCode}" (คุณสามารถระบุข้อมูลในฟอร์มด้านล่างด้วยตนเองได้)`
                      : `No in-progress order found for "${trackingCode}". You can fill in the fields below manually.`}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* Section 1: Customer & Department Info */}
          <div>
            <h3 className="text-xs font-bold text-[#002045] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#0061a5]" />
              {language === 'th' ? '2. ข้อมูลทั่วไป' : '2. General Information'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {/* Order Date (กรุณาระบุวันที่) */}
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
                  className="w-full px-3 py-2 text-xs bg-[#f9f9f9] border border-[#c4c6cf] rounded-lg focus:bg-white focus:outline-hidden focus:border-[#0061a5] font-semibold text-[#002045]"
                />
              </div>

              {/* Submitter / Operator Name (ชื่อผู้ดำเนินการ) */}
              <div>
                <label className="block text-xs font-semibold text-[#002045] mb-1">
                  {language === 'th' ? 'ชื่อผู้ดำเนินการ *' : 'Operator Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={language === 'th' ? 'กรอกชื่อผู้ดำเนินการ...' : 'Enter operator name...'}
                  className="w-full px-3 py-2 text-xs bg-[#f9f9f9] border border-[#c4c6cf] rounded-lg focus:bg-white focus:outline-hidden focus:border-[#0061a5] font-semibold text-[#002045]"
                />
              </div>

              {/* Department Dropdown (แผนก) */}
              <div>
                <label className="block text-xs font-semibold text-[#002045] mb-1">
                  {language === 'th' ? 'แผนก *' : 'Department *'}
                </label>
                <select
                  required
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f9f9f9] border border-[#c4c6cf] rounded-lg focus:bg-white focus:outline-hidden focus:border-[#0061a5] font-semibold text-[#002045] cursor-pointer"
                >
                  <option value="" disabled>
                    {language === 'th' ? '-- กรุณาเลือกแผนก --' : '-- Select Department --'}
                  </option>
                  <optgroup label={language === 'th' ? '--- แผนกการผลิต / อาคาร ---' : '--- Production & Building ---'}>
                    <option value="2/1">2/1</option>
                    <option value="2/2">2/2</option>
                    <option value="2/3">2/3</option>
                    <option value="3/1">3/1</option>
                    <option value="3/2">3/2</option>
                    <option value="3/3">3/3</option>
                    <option value="3/4">3/4</option>
                    <option value="3/5">3/5</option>
                    <option value="A/2">A/2</option>
                    <option value="A/3">A/3</option>
                    <option value="A/4">A/4</option>
                    <option value="A/6">A/6</option>
                    <option value="B/1">B/1</option>
                    <option value="B/5">B/5</option>
                  </optgroup>
                  <optgroup label={language === 'th' ? '--- แผนกสำนักงาน & การตลาด ---' : '--- Admin & Marketing ---'}>
                    <option value="ธุรการลาดกระบัง 1">ธุรการลาดกระบัง 1</option>
                    <option value="ธุรการลาดกระบัง 2">ธุรการลาดกระบัง 2</option>
                    <option value="สรรหาลาดกระบัง 1">สรรหาลาดกระบัง 1</option>
                    <option value="การตลาด (ขาย 1)">การตลาด (ขาย 1)</option>
                    <option value="การตลาด (ขาย 2)">การตลาด (ขาย 2)</option>
                  </optgroup>
                  <option value="other">{language === 'th' ? 'ระบุแผนกอื่น ๆ...' : 'Other...'}</option>
                </select>

                {selectedDept === 'other' && (
                  <input
                    type="text"
                    required={selectedDept === 'other'}
                    value={customDept}
                    onChange={(e) => setCustomDept(e.target.value)}
                    placeholder={language === 'th' ? 'กรอกชื่อแผนก...' : 'Enter department...'}
                    className="mt-1.5 w-full px-3 py-1.5 text-xs bg-white border border-[#c4c6cf] rounded-lg focus:outline-hidden focus:border-[#0061a5]"
                  />
                )}
              </div>

              {/* Delivery Time Dropdown (เวลาที่จัดส่ง) */}
              <div>
                <label className="block text-xs font-semibold text-[#002045] mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0061a5]" />
                  {language === 'th' ? 'เวลาที่จัดส่ง *' : 'Delivery Time *'}
                </label>
                <select
                  required
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f9f9f9] border border-[#c4c6cf] rounded-lg focus:bg-white focus:outline-hidden focus:border-[#0061a5] font-semibold text-[#002045] cursor-pointer"
                >
                  <option value="" disabled>
                    {language === 'th' ? '-- กรุณาเลือกเวลาที่จัดส่ง --' : '-- Select Delivery Time --'}
                  </option>
                  {LAUNDRY_FORM_OPTIONS.deliveryTimes.map((timeOpt) => (
                    <option key={timeOpt} value={timeOpt}>
                      {timeOpt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tracking Code (รหัสติดตาม) */}
              <div className="sm:col-span-2">
                {actionType === 'อยู่ระหว่างการซัก' ? (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[#002045] flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[#0061a5]" />
                        {language === 'th' ? 'รหัสติดตาม (อัตโนมัติ) *' : 'Tracking Code *'}
                        <span className="text-[10px] font-normal text-slate-500 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5 text-slate-400" />
                          (ล็อกอัตโนมัติ)
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setTrackingCode(generateTrackingCode(orderDate, existingOrders))}
                        className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-1 cursor-pointer"
                        title={language === 'th' ? 'กดสร้างรหัสใหม่' : 'Regenerate code'}
                      >
                        <RefreshCw className="w-3 h-3" />
                        {language === 'th' ? 'สร้างรหัสใหม่' : 'Regenerate'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={trackingCode}
                        className="w-full px-3 py-2 pl-8 text-xs bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-mono font-bold cursor-not-allowed select-all focus:outline-hidden"
                        title={language === 'th' ? 'รหัสติดตามถูกล็อกอัตโนมัติ ไม่สามารถแก้ไขตัวเลขได้' : 'Locked tracking code'}
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-600" />
                        {language === 'th' ? 'รหัสติดตาม (ผ้าที่ซักเสร็จแล้ว) *' : 'Tracking Code (Completed) *'}
                      </label>
                      {matchedOrder ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          ✓ ดึงข้อมูลจากรายการกำลังซักเรียบร้อย
                        </span>
                      ) : (
                        <span className="text-[10px] font-normal text-slate-500">
                          {language === 'th' ? '(กรอกรหัสติดตามเพื่อดึงข้อมูล)' : '(Enter tracking code)'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={trackingCode}
                        onChange={(e) => handleTrackingCodeChange(e.target.value)}
                        placeholder={language === 'th' ? 'กรอกรหัสติดตาม เช่น LKB2 - 26091401...' : 'Enter tracking code...'}
                        className="w-full px-3 py-2 pl-8 text-xs bg-white border border-emerald-400 rounded-lg text-emerald-950 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                      <Search className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Garment Itemization (ประเภทผ้า และ จำนวน) */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-xs font-bold text-[#002045] uppercase tracking-wider flex items-center gap-1.5">
                <Shirt className="w-4 h-4 text-[#0061a5]" />
                {language === 'th' ? '3. ประเภทผ้าและจำนวน' : '3. Garment Item & Quantity'}
              </h3>
              <span className="text-[11px] text-slate-500 font-semibold">
                {language === 'th' ? 'รวมทั้งสิ้น:' : 'Total:'} <strong className="text-sky-700">{totalPieces}</strong> {language === 'th' ? 'ชิ้น' : 'pcs'}
              </span>
            </div>

            {/* Item Rows */}
            <div className="space-y-2.5">
              {items.map((item, index) => {
                const isPreset = LAUNDRY_FORM_OPTIONS.garmentTypes.includes(item.name);
                return (
                  <div
                    key={item.id}
                    className="p-3 bg-white border border-[#cbd5e1] rounded-xl flex items-center gap-3 text-xs shadow-2xs"
                  >
                    <div className="text-xs font-bold text-[#74777f] px-1 shrink-0">
                      #{index + 1}
                    </div>

                    {/* Garment Selector / Input */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <select
                        value={isPreset ? item.name : 'custom'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            handleUpdateItem(item.id, { name: '' });
                          } else {
                            handleUpdateItem(item.id, { name: val });
                          }
                        }}
                        className="w-full px-3 py-2 bg-[#f9f9f9] border border-[#c4c6cf] rounded-lg font-semibold text-[#002045] focus:bg-white focus:outline-hidden focus:border-[#0061a5] cursor-pointer text-xs"
                      >
                        {LAUNDRY_FORM_OPTIONS.garmentTypes.map((gName) => (
                          <option key={gName} value={gName}>{gName}</option>
                        ))}
                        <option value="custom">{language === 'th' ? '✏️ ระบุประเภทอื่น ๆ...' : '✏️ Other...'}</option>
                      </select>

                      {!isPreset && (
                        <input
                          type="text"
                          required
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                          placeholder={language === 'th' ? 'พิมพ์ประเภทผ้า...' : 'Enter garment name...'}
                          className="w-full px-2.5 py-1.5 bg-white border border-[#0061a5] rounded-md font-medium text-[#1a1c1c] text-xs focus:outline-hidden"
                          autoFocus
                        />
                      )}
                    </div>

                    {/* Quantity (จำนวน ตัว/ชิ้น/ผืน) */}
                    <div className="w-32 shrink-0">
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity === '' ? '' : item.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              handleUpdateItem(item.id, { quantity: '' });
                            } else {
                              const parsed = parseInt(val, 10);
                              handleUpdateItem(item.id, { quantity: isNaN(parsed) ? '' : Math.max(1, parsed) });
                            }
                          }}
                          className="w-full pl-3 pr-8 py-2 bg-white border border-[#c4c6cf] rounded-lg text-center font-bold text-[#002045] text-xs focus:bg-white focus:outline-hidden focus:border-[#0061a5]"
                          placeholder={language === 'th' ? 'ระบุจำนวน' : 'Qty'}
                        />
                        <span className="absolute right-2.5 top-2 text-[10px] text-[#74777f] pointer-events-none">
                          {language === 'th' ? 'ชิ้น' : 'pcs'}
                        </span>
                      </div>
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
                className="w-full py-2 bg-white border border-dashed border-[#0061a5] text-[#0061a5] hover:bg-[#f0f7ff] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                {language === 'th' ? '+ เพิ่มรายการผ้าอีกแถว' : '+ Add Another Garment'}
              </button>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <div>
              {justSavedSuccess && (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {language === 'th' ? 'บันทึกสำเร็จเรียบร้อยแล้ว!' : 'Saved successfully!'}
                </span>
              )}
              {justCompletedSuccess && (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {language === 'th' ? 'ดำเนินการเสร็จสิ้นเรียบร้อยแล้ว!' : 'Completed successfully!'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-[#43474e] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting || justCompletedSuccess}
                className={`px-5 py-2.5 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed ${
                  justSavedSuccess || justCompletedSuccess
                    ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300'
                    : 'bg-[#0061a5] hover:bg-[#004d84]'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                    <span>{language === 'th' ? 'กำลังบันทึก...' : 'Submitting...'}</span>
                  </>
                ) : justCompletedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>{language === 'th' ? 'ดำเนินการเสร็จสิ้น' : 'Completed'}</span>
                  </>
                ) : justSavedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>{language === 'th' ? 'บันทึกข้อมูลเรียบร้อยแล้ว' : 'Saved Successfully!'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white/90" />
                    <span>{language === 'th' ? 'บันทึกข้อมูล' : 'Save Order'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
