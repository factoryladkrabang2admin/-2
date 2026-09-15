import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Package,
  Send,
  Inbox,
  Clock,
  User,
  Building,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  ArrowRight,
  Copy,
  Check,
  Info,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { ParcelDeliveryRecord } from '../types';
import { AdminUserAccount, isUserAdminOrSupervisor } from '../data/mockData';
import {
  formatCurrentThaiParcelTimestamp,
  submitParcelDeliveryRecord,
  checkParcelFormStatus,
  ParcelFormStatusResult,
  ParcelSubmitResult,
} from '../services/googleSheetSyncService';
import { useLanguage } from '../contexts/LanguageContext';
import {
  generateParcelTrackingCode,
  markTrackingCodeAsReceivedLocally,
  checkParcelAlreadyReceived,
} from '../utils/parcelTrackingUtils';
import { SuggestiveInput } from './SuggestiveInput';
import {
  getRememberedSenders,
  getRememberedSenderDepartments,
  getRememberedRecipients,
  getRememberedRecipientDepartments,
  saveRememberedContacts,
} from '../services/parcelContactMemoryService';

interface CreateParcelRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordCreated: (newRecord: ParcelDeliveryRecord) => void;
  currentUser?: AdminUserAccount | null;
  isAuthenticated?: boolean;
  existingRecords?: ParcelDeliveryRecord[];
  initialRecordToReceive?: ParcelDeliveryRecord | null;
}

// Popular departments for quick selection
const POPULAR_DEPARTMENTS = [
  'การเงิน',
  'ธุรการลาดกระบัง 2',
  'ธุรการลาดกระบัง 1',
  'บัญชี',
  'ช่างกล บางชัน',
  'บุคคล ลาดกระบัง',
  'จัดซื้อ',
  'ฝ่ายผลิต',
  'คลังสินค้า',
  'ประกันคุณภาพ (QA/QC)',
];

// Popular document/parcel items
const POPULAR_ITEMS = [
  'PO ผลไม้',
  'ใบสั่งซื้อ (PO)',
  'ใบกำกับภาษี / ใบเสร็จ',
  'เอกสารสัญญา / บันทึกข้อตกลง',
  'ใบส่งของ / ใบแจ้งหนี้',
  'ซองเอกสารธุรการ',
  'กล่องพัสดุด่วน',
  'พัสดุอะไหล่ / อุปกรณ์ช่าง',
];

export const CreateParcelRecordModal: React.FC<CreateParcelRecordModalProps> = ({
  isOpen,
  onClose,
  onRecordCreated,
  currentUser,
  isAuthenticated,
  existingRecords = [],
  initialRecordToReceive = null,
}) => {
  const { language } = useLanguage();
  const isAdmin = isUserAdminOrSupervisor(currentUser, isAuthenticated);

  // Core Google Form fields
  // entry.1879722225: ประเภท ('รับ' หรือ 'ส่ง')
  const [actionType, setActionType] = useState<'รับ' | 'ส่ง'>('รับ');
  // entry.645686724: ชื่อผู้ส่งตามหน้าซอง
  const [senderName, setSenderName] = useState<string>('');
  // entry.1066148556: แผนกผู้ส่ง
  const [senderDepartment, setSenderDepartment] = useState<string>('');
  // entry.222826518: ชื่อผู้รับตามหน้าซอง
  const [recipientName, setRecipientName] = useState<string>('');
  // entry.600874339: แผนกผู้รับ
  const [recipientDepartment, setRecipientDepartment] = useState<string>('');

  // Helper app-level fields
  const [timestamp, setTimestamp] = useState<string>('');
  const [itemTitle, setItemTitle] = useState<string>('');
  const [operatorName, setOperatorName] = useState<string>('');
  const [operatorDepartment, setOperatorDepartment] = useState<string>('ธุรการลาดกระบัง 2');

  // Submission & UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSavedRecord, setLastSavedRecord] = useState<ParcelDeliveryRecord | null>(null);
  const [lastSubmitResult, setLastSubmitResult] = useState<ParcelSubmitResult | null>(null);
  const [formStatus, setFormStatus] = useState<ParcelFormStatusResult | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [copiedData, setCopiedData] = useState(false);
  const [copiedTrackingCode, setCopiedTrackingCode] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Search tracking code state when actionType is 'รับ'
  const [searchTrackingCode, setSearchTrackingCode] = useState<string>('');
  const [matchedParcel, setMatchedParcel] = useState<ParcelDeliveryRecord | null>(null);

  // Projected tracking code for live preview when sending
  const projectedTrackingCode = actionType === 'ส่ง' 
    ? generateParcelTrackingCode(timestamp || new Date(), existingRecords)
    : '';

  // Effective tracking code preview when receiving ('รับ')
  const projectedReceiveTrackingCode = actionType === 'รับ'
    ? (matchedParcel?.trackingCode || (searchTrackingCode.trim() ? searchTrackingCode.trim() : ''))
    : '';

  // ตรวจสอบการทำรายการซ้ำแบบเรียลไทม์ (ตั้งค่าเลขรหัส หรือ ข้อมูลที่ถูกรับไปแล้วไม่สามารถทำรายการซ้ำได้)
  const duplicateStatus = useMemo(() => {
    const codeToCheck = actionType === 'รับ'
      ? (searchTrackingCode.trim() || matchedParcel?.trackingCode || undefined)
      : undefined;

    return checkParcelAlreadyReceived({
      trackingCode: codeToCheck,
      itemTitle: itemTitle.trim() || undefined,
      senderName: senderName.trim() || undefined,
      recipientName: recipientName.trim() || undefined,
      actionType,
      allRecords: existingRecords,
    });
  }, [searchTrackingCode, matchedParcel, itemTitle, senderName, recipientName, actionType, existingRecords]);

  // Field validation flags - all fields are mandatory
  const isSenderNameValid = senderName.trim().length > 0;
  const isSenderDeptValid = senderDepartment.trim().length > 0;
  const isRecipientNameValid = recipientName.trim().length > 0;
  const isRecipientDeptValid = recipientDepartment.trim().length > 0;
  const isItemTitleValid = itemTitle.trim().length > 0;

  const isFormComplete =
    isSenderNameValid &&
    isSenderDeptValid &&
    isRecipientNameValid &&
    isRecipientDeptValid &&
    isItemTitleValid &&
    !duplicateStatus.isAlreadyReceived;

  const wasOpenRef = useRef(false);

  // Fetch form status when modal opens
  useEffect(() => {
    if (isOpen) {
      checkParcelFormStatus().then((status) => {
        if (status) setFormStatus(status);
      });
    }
  }, [isOpen]);

  const handleRefreshFormStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const status = await checkParcelFormStatus(true);
      if (status) setFormStatus(status);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Reset fields to empty or prefill with initialRecordToReceive when modal opens
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setTimestamp(formatCurrentThaiParcelTimestamp(new Date()));
      setIsSuccess(false);
      setErrorMessage(null);
      setCopiedData(false);
      setHasAttemptedSubmit(false);
      setLastSubmitResult(null);

      if (initialRecordToReceive) {
        // Pre-fill for "กดรับพัสดุนี้เอกสาร / พัสดุ"
        // ช่อง ชื่อผู้รับตามหน้าซอง, แผนกผู้รับ ให้เป็นช่องว่างเปล่า บังคับให้กรอกข้อมูลให้เรียบร้อย ถึงก่อนกดบันทึก
        setActionType('รับ');
        setSenderName(initialRecordToReceive.senderName || '');
        setSenderDepartment(initialRecordToReceive.senderDepartment || '');
        setRecipientName('');
        setRecipientDepartment('');
        setItemTitle(initialRecordToReceive.itemTitle || '');
        if (initialRecordToReceive.trackingCode) {
          setSearchTrackingCode(initialRecordToReceive.trackingCode);
          setMatchedParcel(initialRecordToReceive);
        } else {
          setSearchTrackingCode('');
          setMatchedParcel(null);
        }
      } else {
        setSenderName('');
        setSenderDepartment('');
        setRecipientName('');
        setRecipientDepartment('');
        setItemTitle('');
        setSearchTrackingCode('');
        setMatchedParcel(null);
      }

      const userName = currentUser?.name || currentUser?.username || 'เจม';
      setOperatorName(userName);
      if (currentUser?.department) {
        setOperatorDepartment(currentUser.department);
      }
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen, currentUser, initialRecordToReceive]);

  // Remembered contacts and departments for auto-completion (called unconditionally before any early return)
  const senderSuggestions = useMemo(() => {
    return getRememberedSenders(existingRecords);
  }, [existingRecords, isSuccess]);

  const senderDeptSuggestions = useMemo(() => {
    return getRememberedSenderDepartments(existingRecords);
  }, [existingRecords, isSuccess]);

  const recipientSuggestions = useMemo(() => {
    return getRememberedRecipients(existingRecords);
  }, [existingRecords, isSuccess]);

  const recipientDeptSuggestions = useMemo(() => {
    return getRememberedRecipientDepartments(existingRecords);
  }, [existingRecords, isSuccess]);

  if (!isOpen) return null;

  // Handler to refresh timestamp to current moment
  const handleResetTimestamp = () => {
    setTimestamp(formatCurrentThaiParcelTimestamp(new Date()));
  };

  // Quick preset from the user's provided link
  const handleLoadSampleFromLink = () => {
    setActionType('รับ');
    setSenderName('ทดสอบ');
    setSenderDepartment('การเงิน');
    setRecipientName('เจม');
    setRecipientDepartment('ธุรการลาดกระบัง 2');
    setItemTitle('เอกสารการเงิน / ทดสอบ');
    setTimestamp(formatCurrentThaiParcelTimestamp(new Date()));
  };

  // Quick switch of Action Type
  const handleSwitchActionType = (type: 'รับ' | 'ส่ง') => {
    if (isSuccess) setIsSuccess(false);
    setActionType(type);
    if (type === 'ส่ง') {
      setSearchTrackingCode('');
      setMatchedParcel(null);
    }
  };

  // Handler for searching tracking code when actionType is 'รับ'
  // เมื่อใส่รหัสแล้ว ให้ดึงข้อมูลที่ส่งใส่ในช่องที่เหลือให้ถูกต้อง
  const handleTrackingCodeSearch = (code: string) => {
    setSearchTrackingCode(code);
    if (isSuccess) setIsSuccess(false);

    const clean = code.trim().toLowerCase().replace(/[\s\-_]/g, '');
    if (!clean) {
      setMatchedParcel(null);
      return;
    }

    // Find matching parcel with tracking code
    const match = existingRecords.find((r) => {
      if (!r.trackingCode) return false;
      const rClean = r.trackingCode.toLowerCase().replace(/[\s\-_]/g, '');
      return rClean === clean || rClean.includes(clean) || clean.includes(rClean);
    });

    if (match) {
      setMatchedParcel(match);
      // ดึงข้อมูลที่ส่งใส่ในช่องที่เหลือให้ถูกต้อง (ยกเว้นผู้รับและแผนกผู้รับให้เป็นช่องว่างเพื่อให้กรอกใหม่ตามข้อกำหนด)
      if (match.itemTitle) setItemTitle(match.itemTitle);
      if (match.senderName) setSenderName(match.senderName);
      if (match.senderDepartment) setSenderDepartment(match.senderDepartment);
      setRecipientName('');
      setRecipientDepartment('');
    } else {
      setMatchedParcel(null);
    }
  };

  const handleClearTrackingSearch = () => {
    setSearchTrackingCode('');
    setMatchedParcel(null);
  };

  // Handle Form Submission via Google Form POST
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setHasAttemptedSubmit(true);

    // บังคับให้กรอกข้อมูลทุกช่อง หากไม่ครบไม่สามารถทำรายการได้
    if (!isSenderNameValid) {
      setErrorMessage(language === 'th' ? 'กรุณาระบุชื่อผู้ส่งตามหน้าซอง' : 'Sender name is required');
      document.getElementById('input-sender-name')?.focus();
      return;
    }
    if (!isSenderDeptValid) {
      setErrorMessage(language === 'th' ? 'กรุณาระบุแผนกผู้ส่ง' : 'Sender department is required');
      document.getElementById('input-sender-dept')?.focus();
      return;
    }
    if (!isRecipientNameValid) {
      setErrorMessage(language === 'th' ? 'กรุณาระบุชื่อผู้รับตามหน้าซอง' : 'Recipient name is required');
      document.getElementById('input-recipient-name')?.focus();
      return;
    }
    if (!isRecipientDeptValid) {
      setErrorMessage(language === 'th' ? 'กรุณาระบุแผนกผู้รับ' : 'Recipient department is required');
      document.getElementById('input-recipient-dept')?.focus();
      return;
    }
    if (!isItemTitleValid) {
      setErrorMessage(language === 'th' ? 'กรุณาระบุชื่อเอกสาร / พัสดุ' : 'Item title is required');
      document.getElementById('input-item-title')?.focus();
      return;
    }

    const currentTs = timestamp || formatCurrentThaiParcelTimestamp(new Date());
    const effectiveTrackingCode = actionType === 'ส่ง'
      ? generateParcelTrackingCode(currentTs, existingRecords)
      : (matchedParcel?.trackingCode || (searchTrackingCode.trim() ? searchTrackingCode.trim() : undefined));

    // ตรวจสอบการทำรายการซ้ำ (ตั้งค่าเลขรหัส หรือ ข้อมูลที่ถูกรับไปแล้วไม่สามารถทำรายการซ้ำได้)
    const duplicateCheck = checkParcelAlreadyReceived({
      trackingCode: effectiveTrackingCode,
      itemTitle: itemTitle.trim(),
      senderName: senderName.trim(),
      recipientName: recipientName.trim(),
      actionType,
      allRecords: existingRecords,
    });

    if (duplicateCheck.isAlreadyReceived) {
      setErrorMessage(duplicateCheck.message || (language === 'th' ? 'รหัสติดตามหรือข้อมูลนี้ถูกทำรายการรับไปแล้ว ไม่สามารถทำรายการซ้ำได้' : 'This tracking code or record has already been received. Duplicate entry not allowed.'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit via Server Endpoint /api/parcel-submit (Executes a single, clean server-to-server POST to Google Form)
      const res = await submitParcelDeliveryRecord({
        timestamp: currentTs,
        actionType,
        senderName: senderName.trim(),
        senderDepartment: senderDepartment.trim(),
        recipientName: recipientName.trim(),
        recipientDepartment: recipientDepartment.trim(),
        itemTitle: itemTitle.trim(),
        operatorName: operatorName.trim() || currentUser?.name || currentUser?.username || 'เจม',
        operatorDepartment: operatorDepartment.trim() || 'ธุรการลาดกระบัง 2',
        trackingCode: effectiveTrackingCode,
      });

      if (res.success && res.record) {
        if (!res.record.trackingCode && effectiveTrackingCode) {
          res.record.trackingCode = effectiveTrackingCode;
        }

        if (actionType === 'รับ') {
          if (effectiveTrackingCode) {
            markTrackingCodeAsReceivedLocally(effectiveTrackingCode);
          }
          if (matchedParcel?.trackingCode) {
            markTrackingCodeAsReceivedLocally(matchedParcel.trackingCode);
          }
        }

        // Automatically remember sender/recipient contact & department in local memory
        saveRememberedContacts({
          senderName: senderName.trim(),
          senderDepartment: senderDepartment.trim(),
          recipientName: recipientName.trim(),
          recipientDepartment: recipientDepartment.trim(),
        });

        setLastSavedRecord(res.record);
        setLastSubmitResult(res);
        setIsSuccess(true);
        onRecordCreated(res.record);
      } else {
        setErrorMessage(res.error || (language === 'th' ? 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' : 'Failed to save. Please try again.'));
      }
    } catch (err: any) {
      console.error('Error submitting parcel delivery Google Form:', err);
      setErrorMessage(err?.message || (language === 'th' ? 'เกิดข้อผิดพลาดในการส่งคำขอ POST ไปยัง Google Form' : 'Error submitting request to Google Form.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form for another new entry
  const handleResetForNewRecord = () => {
    setIsSuccess(false);
    setHasAttemptedSubmit(false);
    setErrorMessage(null);
    setLastSavedRecord(null);
    setLastSubmitResult(null);
    setCopiedTrackingCode(false);
    setTimestamp(formatCurrentThaiParcelTimestamp(new Date()));
    setSearchTrackingCode('');
    setMatchedParcel(null);
    setSenderName('');
    setSenderDepartment('');
    setRecipientName('');
    setRecipientDepartment('');
    setItemTitle('');
  };

  const handleCopyTrackingCode = async () => {
    if (!lastSavedRecord?.trackingCode) return;
    try {
      await navigator.clipboard.writeText(lastSavedRecord.trackingCode);
      setCopiedTrackingCode(true);
      setTimeout(() => setCopiedTrackingCode(false), 2500);
    } catch {
      // ignore
    }
  };

  // Copy details to clipboard
  const handleCopyDetails = async () => {
    if (!lastSavedRecord) return;
    const text = language === 'th'
      ? `[บันทึกรับ-ส่งเอกสาร/พัสดุ]\nวันที่เวลา: ${lastSavedRecord.timestamp}\nประเภท: ${lastSavedRecord.actionType}\nผู้ส่ง: ${lastSavedRecord.senderName} (${lastSavedRecord.senderDepartment})\nผู้รับ: ${lastSavedRecord.recipientName} (${lastSavedRecord.recipientDepartment})\nรายการ: ${lastSavedRecord.itemTitle}`
      : `[Document & Parcel Record]\nTimestamp: ${lastSavedRecord.timestamp}\nType: ${lastSavedRecord.actionType === 'รับ' ? 'Receive (Incoming)' : 'Send (Outgoing)'}\nSender: ${lastSavedRecord.senderName} (${lastSavedRecord.senderDepartment})\nRecipient: ${lastSavedRecord.recipientName} (${lastSavedRecord.recipientDepartment})\nItem: ${lastSavedRecord.itemTitle}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedData(true);
      setTimeout(() => setCopiedData(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div
      id="parcel-google-form-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
    >
      <div
        id="parcel-google-form-modal-container"
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-pink-200/80 dark:border-slate-800 w-full max-w-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 p-4 sm:p-5 text-white flex items-center justify-between gap-3 shrink-0 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white drop-shadow-xs">
                {language === 'th' ? 'รับ-ส่ง เอกสาร / พัสดุ' : 'Document / Parcel'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              id="btn-close-parcel-modal"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/35 text-white flex items-center justify-center transition-colors cursor-pointer"
              title={language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Form */}
        <div className="overflow-y-auto p-4 sm:p-5 flex-1 space-y-4.5">
          {/* Success State Banner */}
          {isSuccess && lastSavedRecord ? (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-400 dark:border-emerald-600 space-y-4 animate-in fade-in zoom-in-95 duration-200 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex items-center h-10">
                  <h3 className="text-base font-black text-emerald-900 dark:text-emerald-100">
                    {lastSavedRecord.actionType === 'รับ' 
                      ? (language === 'th' ? 'บันทึกข้อมูลเข้าแล้ว' : 'Incoming delivery recorded')
                      : (language === 'th' ? 'บันทึกข้อมูลออกแล้ว' : 'Outgoing delivery recorded')}
                  </h3>
                </div>
              </div>

              {/* Summary Card */}
              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] block">
                      {language === 'th' ? 'ประเภท:' : 'Type:'}
                    </span>
                    <span className="font-black text-pink-600 dark:text-pink-400 text-sm">
                      {lastSavedRecord.actionType === 'รับ'
                        ? (language === 'th' ? 'รับ' : 'Receive')
                        : (language === 'th' ? 'ส่ง' : 'Send')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] block">
                      {language === 'th' ? 'วันที่เวลา:' : 'Timestamp:'}
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                      {lastSavedRecord.timestamp}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] block">
                      {language === 'th' ? 'ผู้ส่ง:' : 'Sender:'}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {lastSavedRecord.senderName}
                    </span>{' '}
                    <span className="text-slate-500">({lastSavedRecord.senderDepartment})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] block">
                      {language === 'th' ? 'ผู้รับ:' : 'Recipient:'}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {lastSavedRecord.recipientName}
                    </span>{' '}
                    <span className="text-slate-500">({lastSavedRecord.recipientDepartment})</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] block">
                        {language === 'th' ? 'ชื่อเอกสาร / พัสดุ:' : 'Item / Document Title:'}
                      </span>
                      <span className="font-bold text-pink-600 dark:text-pink-400 text-sm">
                        {lastSavedRecord.itemTitle || '-'}
                      </span>
                    </div>
                    {lastSavedRecord.trackingCode && (
                      <div className="text-right">
                        <span className="text-slate-400 dark:text-slate-500 text-[10px] block">
                          {language === 'th' ? 'รหัสติดตาม:' : 'Tracking Code:'}
                        </span>
                        <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 ${
                          lastSavedRecord.actionType === 'รับ'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-2xs'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        }`}>
                          <span className={lastSavedRecord.actionType === 'รับ' ? 'text-emerald-700 dark:text-emerald-300 font-black' : ''}>
                            {lastSavedRecord.trackingCode}
                          </span>
                          {lastSavedRecord.actionType === 'รับ' && (
                            <span className="font-sans font-bold text-[11px] bg-emerald-200/80 dark:bg-emerald-900/90 text-emerald-900 dark:text-emerald-100 px-1.5 py-0.5 rounded-md">
                              {language === 'th' ? 'รับแล้ว' : 'Received'}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tracking Code Note for both 'รับ' and 'ส่ง' Deliveries */}
              {lastSavedRecord.trackingCode && (
                <div className={`p-4 rounded-2xl border space-y-2 ${
                  lastSavedRecord.actionType === 'รับ'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80'
                }`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${
                        lastSavedRecord.actionType === 'รับ'
                          ? 'text-emerald-900 dark:text-emerald-200'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {lastSavedRecord.actionType === 'รับ'
                          ? (language === 'th' ? 'รหัสติดตาม (รับเอกสาร/พัสดุแล้ว):' : 'Tracking Code (Received):')
                          : (language === 'th' ? 'รหัสติดตามสถานะ:' : 'Status Tracking Code:')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono font-black text-sm tracking-wider ${
                          lastSavedRecord.actionType === 'รับ'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-pink-700 dark:text-pink-400'
                        }`}>
                          {lastSavedRecord.trackingCode}
                        </span>
                        {lastSavedRecord.actionType === 'รับ' && (
                          <span className="font-sans font-bold text-xs bg-emerald-200/90 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700">
                            {language === 'th' ? 'รับแล้ว' : 'Received'}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyTrackingCode}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                        lastSavedRecord.actionType === 'รับ'
                          ? 'border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 hover:bg-emerald-50 text-emerald-700 dark:text-emerald-300'
                          : 'border-pink-200 dark:border-pink-800 bg-white dark:bg-slate-800 hover:bg-pink-50 text-pink-700 dark:text-pink-300'
                      }`}
                    >
                      {copiedTrackingCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>
                        {copiedTrackingCode 
                          ? (language === 'th' ? 'คัดลอกแล้ว' : 'Copied') 
                          : (language === 'th' ? 'คัดลอกรหัส' : 'Copy Code')}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Status Note on Google Sheet Item Title Column */}
              {lastSubmitResult && !lastSubmitResult.itemTitleSyncedToSheet ? (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold">
                        {language === 'th' ? 'ข้อมูล 5 รายการหลักบันทึกเข้า Google Sheet เรียบร้อยแล้ว' : 'Core items saved to Google Sheet successfully'}
                      </div>
                      <div className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                        {language === 'th' 
                          ? 'หมายเหตุ: ในแบบฟอร์ม Google Form ปัจจุบันยังไม่มีคำถามสำหรับ "ชื่อเอกสาร / พัสดุ" ทำให้ Google Form ยังไม่นำข้อมูลนี้ไปกรอกในคอลัมน์ของ Sheet'
                          : 'Note: The current Google Form template does not include an item title question yet.'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href="https://docs.google.com/forms/d/1FAIpQLSfhL7tVwlJ7aYMt7fCWkBnMk1hS7ZJePsjYDRxnSDxmwsqq_g/edit"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{language === 'th' ? 'เปิดแก้ไข Google Form' : 'Edit Google Form'}</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{language === 'th' ? 'บันทึกชื่อเอกสาร / พัสดุ ลงใน Google Sheet เรียบร้อยสมบูรณ์' : 'Item title synchronized with Google Sheet'}</span>
                </div>
              )}

              {/* Status Note on Google Sheet Tracking Code Column */}
              {lastSavedRecord.trackingCode && (
                <div className="p-2.5 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {language === 'th' ? 'เพิ่มรหัสติดตาม ' : 'Tracking code added: '}
                    <span className="font-mono font-black">{lastSavedRecord.trackingCode}</span>
                    {language === 'th' ? ' เข้าไปใน Google Sheet เรียบร้อยแล้ว' : ' in Google Sheet'}
                  </span>
                </div>
              )}

              {/* Success Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleResetForNewRecord}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{language === 'th' ? 'บันทึกรายการใหม่อีกครั้ง' : 'Record Another'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyDetails}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedData ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedData ? (language === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (language === 'th' ? 'คัดลอกข้อมูล' : 'Copy Details')}</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center gap-2.5 text-rose-800 dark:text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* The Form */}
          <form id="parcel-google-form-html" onSubmit={handleSubmit} className="space-y-4">
            {/* Field 1: ประเภท */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>{language === 'th' ? '1. ประเภท' : '1. Type'}</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
              </div>

              {/* Responsive Pill Selection Buttons */}
              <div className="grid grid-cols-2 gap-3">
                {/* Option 1: รับ (Receive) */}
                <button
                  type="button"
                  id="btn-parcel-type-receive"
                  onClick={() => handleSwitchActionType('รับ')}
                  className={`p-3 sm:p-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all border-2 cursor-pointer ${
                    actionType === 'รับ'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-100 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-300'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      actionType === 'รับ'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    <Inbox className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-black text-sm">{language === 'th' ? 'รับ' : 'Receive'}</div>
                    <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                      {language === 'th' ? 'รับเอกสาร / พัสดุเข้า' : 'Incoming delivery'}
                    </div>
                  </div>
                </button>

                {/* Option 2: ส่ง (Send) */}
                <button
                  type="button"
                  id="btn-parcel-type-send"
                  onClick={() => handleSwitchActionType('ส่ง')}
                  className={`p-3 sm:p-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all border-2 cursor-pointer ${
                    actionType === 'ส่ง'
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-100 shadow-md ring-2 ring-rose-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-rose-300'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      actionType === 'ส่ง'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-black text-sm">{language === 'th' ? 'ส่ง' : 'Send'}</div>
                    <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                      {language === 'th' ? 'ส่งเอกสาร / พัสดุออก' : 'Outgoing delivery'}
                    </div>
                  </div>
                </button>
              </div>

              {/* Live Tracking Code Preview for Send */}
              {actionType === 'ส่ง' && projectedTrackingCode && (
                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-pink-600 dark:text-pink-400 shrink-0" />
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                      {language === 'th' ? 'รหัสติดตามสถานะ:' : 'Tracking Code:'} <span className="font-mono font-bold text-pink-700 dark:text-pink-300 text-xs">{projectedTrackingCode}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ช่อง ค้นหา รหัสติดตาม ใต้ปุ่มรับ */}
              {actionType === 'รับ' && (
                <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label 
                      htmlFor="input-search-tracking-code" 
                      className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5"
                    >
                      <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{language === 'th' ? 'ค้นหา รหัสติดตาม (ดึงข้อมูลที่ส่งอัตโนมัติ)' : 'Search Tracking Code (Auto-fill)'}</span>
                    </label>
                    {searchTrackingCode && (
                      <button
                        type="button"
                        onClick={handleClearTrackingSearch}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 cursor-pointer flex items-center gap-0.5"
                      >
                        <X className="w-3 h-3" /> {language === 'th' ? 'ล้าง' : 'Clear'}
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      id="input-search-tracking-code"
                      value={searchTrackingCode}
                      onChange={(e) => handleTrackingCodeSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                      }}
                      placeholder={language === 'th' ? 'พิมพ์หรือวางรหัสติดตาม เช่น LKB2 - 26091201' : 'Enter tracking code, e.g. LKB2 - 26091201'}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                    {searchTrackingCode && (
                      <button
                        type="button"
                        onClick={handleClearTrackingSearch}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={language === 'th' ? 'ล้างข้อมูล' : 'Clear'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Match Result Banner */}
                  {matchedParcel && (
                    <div className="p-2.5 rounded-xl bg-emerald-100/90 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-xs text-emerald-900 dark:text-emerald-100 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{language === 'th' ? 'ดึงข้อมูลที่ส่งเรียบร้อยแล้ว:' : 'Matched outgoing item:'} {matchedParcel.itemTitle}</span>
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-300 pl-5">
                        {language === 'th' ? 'ผู้ส่ง:' : 'Sender:'} {matchedParcel.senderName} ({matchedParcel.senderDepartment}) ➔ {language === 'th' ? 'ผู้รับ:' : 'Recipient:'} {matchedParcel.recipientName} ({matchedParcel.recipientDepartment})
                      </div>
                      {matchedParcel.trackingCode && (
                        <div className="pl-5 pt-0.5 flex items-center gap-2">
                          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">{language === 'th' ? 'รหัสติดตาม:' : 'Tracking Code:'}</span>
                          <span className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-300 bg-white/90 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 shadow-2xs">
                            <span>{matchedParcel.trackingCode}</span>
                            <span className="font-sans font-bold text-[10px] text-emerald-800 dark:text-emerald-200 bg-emerald-200/80 dark:bg-emerald-800 px-1.5 py-0.2 rounded">
                              {language === 'th' ? 'รับแล้ว' : 'Received'}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Duplicate Alert Banner */}
                  {duplicateStatus.isAlreadyReceived && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-400 dark:border-rose-700 text-xs text-rose-900 dark:text-rose-100 space-y-1 animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-200">
                        <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>{language === 'th' ? 'ตั้งค่าระบบ: รายการนี้ถูกรับไปแล้ว ไม่สามารถทำรายการซ้ำได้' : 'System Policy: This parcel has already been received.'}</span>
                      </div>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 pl-5 leading-relaxed">
                        {duplicateStatus.message}
                      </p>
                    </div>
                  )}

                  {!matchedParcel && projectedReceiveTrackingCode && !duplicateStatus.isAlreadyReceived && (
                    <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
                      <span className="text-[11px] text-emerald-800 dark:text-emerald-200 font-semibold">
                        {language === 'th' ? 'รหัสติดตามที่จะบันทึกรับ:' : 'Assigned Tracking Code:'}
                      </span>
                      <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                        <span className="font-black">{projectedReceiveTrackingCode}</span>
                        <span className="font-sans font-bold text-[10px] text-emerald-800 dark:text-emerald-200 bg-emerald-200/80 dark:bg-emerald-800 px-1.5 py-0.2 rounded">
                          {language === 'th' ? 'รับแล้ว' : 'Received'}
                        </span>
                      </span>
                    </div>
                  )}

                  {searchTrackingCode.trim() && !matchedParcel && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {language === 'th' 
                          ? `ไม่พบรหัสติดตาม "${searchTrackingCode}" ในรายการที่ส่ง สามารถกรอกข้อมูลเองด้านล่างได้` 
                          : `Tracking code "${searchTrackingCode}" not found in outgoing records. You can fill out details below.`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Field 2: ชื่อผู้ส่งตามหน้าซอง */}
            <div className="bg-rose-50/50 dark:bg-rose-950/20 p-3.5 rounded-2xl border border-rose-200/70 dark:border-rose-900/40 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-rose-600" />
                <span>{language === 'th' ? '2. ชื่อผู้ส่งตามหน้าซอง' : '2. Sender Name on Label'}</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>

              <SuggestiveInput
                id="input-sender-name"
                value={senderName}
                onChange={(val) => {
                  if (isSuccess) setIsSuccess(false);
                  setSenderName(val);
                }}
                suggestions={senderSuggestions}
                placeholder={language === 'th' ? 'เช่น ทดสอบ, เจม, มาร์ค, คุณศศิประภา' : 'e.g. Test, James, Mark, Staff'}
                icon={<User className="w-3.5 h-3.5 text-rose-500" />}
                accentColor="rose"
                required
                hasError={hasAttemptedSubmit && !isSenderNameValid}
                errorMessage={language === 'th' ? 'กรุณาระบุชื่อผู้ส่งตามหน้าซอง (จำเป็น)' : 'Sender name is required'}
              />
            </div>

            {/* Field 3: แผนกผู้ส่ง */}
            <div className="bg-rose-50/50 dark:bg-rose-950/20 p-3.5 rounded-2xl border border-rose-200/70 dark:border-rose-900/40 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-rose-600" />
                <span>{language === 'th' ? '3. แผนกผู้ส่ง' : '3. Sender Department'}</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>

              <SuggestiveInput
                id="input-sender-dept"
                value={senderDepartment}
                onChange={(val) => {
                  if (isSuccess) setIsSuccess(false);
                  setSenderDepartment(val);
                }}
                suggestions={senderDeptSuggestions}
                placeholder={language === 'th' ? 'เช่น การเงิน, ธุรการลาดกระบัง 1, ธุรการลาดกระบัง 2' : 'e.g. Finance, Admin Lat Krabang 1, Admin 2'}
                icon={<Building className="w-3.5 h-3.5 text-rose-500" />}
                accentColor="rose"
                required
                hasError={hasAttemptedSubmit && !isSenderDeptValid}
                errorMessage={language === 'th' ? 'กรุณาระบุแผนกผู้ส่ง (จำเป็น)' : 'Sender department is required'}
              />
            </div>

            {/* Field 4: ชื่อผู้รับตามหน้าซอง */}
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>{language === 'th' ? '4. ชื่อผู้รับตามหน้าซอง' : '4. Recipient Name on Label'}</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>

              <SuggestiveInput
                id="input-recipient-name"
                value={recipientName}
                onChange={(val) => {
                  if (isSuccess) setIsSuccess(false);
                  setRecipientName(val);
                }}
                suggestions={recipientSuggestions}
                placeholder={language === 'th' ? 'เช่น เจม, มาร์ค, คุณศศิประภา' : 'e.g. James, Mark, Staff'}
                icon={<User className="w-3.5 h-3.5 text-emerald-500" />}
                accentColor="emerald"
                required
                hasError={hasAttemptedSubmit && !isRecipientNameValid}
                errorMessage={language === 'th' ? 'กรุณาระบุชื่อผู้รับตามหน้าซอง (จำเป็น)' : 'Recipient name is required'}
              />
            </div>

            {/* Field 5: แผนกผู้รับ */}
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-600" />
                <span>{language === 'th' ? '5. แผนกผู้รับ' : '5. Recipient Department'}</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>

              <SuggestiveInput
                id="input-recipient-dept"
                value={recipientDepartment}
                onChange={(val) => {
                  if (isSuccess) setIsSuccess(false);
                  setRecipientDepartment(val);
                }}
                suggestions={recipientDeptSuggestions}
                placeholder={language === 'th' ? 'เช่น ธุรการลาดกระบัง 2, ธุรการลาดกระบัง 1, การเงิน' : 'e.g. Admin Lat Krabang 2, Admin 1, Finance'}
                icon={<Building className="w-3.5 h-3.5 text-emerald-500" />}
                accentColor="emerald"
                required
                hasError={hasAttemptedSubmit && !isRecipientDeptValid}
                errorMessage={language === 'th' ? 'กรุณาระบุแผนกผู้รับ (จำเป็น)' : 'Recipient department is required'}
              />
            </div>

            {/* Helper Field: ชื่อเอกสาร/พัสดุ */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
                  <span>{language === 'th' ? 'ชื่อเอกสาร / พัสดุ' : 'Item / Document Title'}</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>

                {formStatus && !formStatus.hasItemTitleQuestion && (
                  <div>
                    <button
                      type="button"
                      onClick={handleRefreshFormStatus}
                      className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                      title={language === 'th' ? 'คลิกเพื่อตรวจเช็ค Google Form อีกครั้ง' : 'Check Google Form status again'}
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                      {language === 'th' ? 'ตรวจสถานะ Form' : 'Check Status'}
                    </button>
                  </div>
                )}
              </div>

              <input
                type="text"
                id="input-item-title"
                value={itemTitle}
                onChange={(e) => {
                  if (isSuccess) setIsSuccess(false);
                  setItemTitle(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.preventDefault();
                }}
                placeholder={language === 'th' ? 'เช่น PO ผลไม้, ใบสั่งซื้อ, ซองเอกสารทั่วไป' : 'e.g. Fruit PO, Purchase Order, Document Envelope'}
                className={`w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none transition-all ${
                  hasAttemptedSubmit && !isItemTitleValid
                    ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30'
                    : 'border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-pink-500'
                }`}
                required
              />
              {hasAttemptedSubmit && !isItemTitleValid && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{language === 'th' ? 'กรุณาระบุชื่อเอกสาร / พัสดุ (จำเป็น)' : 'Item title is required'}</span>
                </p>
              )}

              {/* Notice if Google Form doesn't have the question yet */}
              {formStatus && !formStatus.hasItemTitleQuestion && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-100">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{language === 'th' ? 'คำแนะนำ: เพื่อให้ข้อมูลช่องนี้ลงใน Google Sheet' : 'Recommendation: Sync to Google Sheet'}</span>
                  </div>
                  <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                    {language === 'th'
                      ? 'แบบฟอร์ม Google Form ปัจจุบันมี 5 คำถามหลัก (ยังไม่มีคำถามสำหรับชื่อเอกสาร) หากต้องการให้ Google Form บันทึกช่องนี้ลง Google Sheet ด้วย สามารถกดเปิด Google Form เพื่อเพิ่มคำถาม 1 ข้อได้ทันที'
                      : 'The current Google Form has 5 primary questions. To record item titles into Google Sheet automatically, please add a title question in Google Form.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <a
                      href={formStatus.formEditUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{language === 'th' ? 'เปิดแก้ไข Google Form (กด + เพิ่มคำถามชื่อเอกสาร)' : 'Edit Google Form'}</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleRefreshFormStatus}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 font-semibold text-[10px] hover:bg-amber-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                      <span>{language === 'th' ? 'เช็คอีกครั้งเมื่อเพิ่มแล้ว' : 'Check Again'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Date & Time display */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{language === 'th' ? 'วันที่เวลาบันทึก:' : 'Timestamp:'}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {timestamp || '-'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetTimestamp}
                className="text-[11px] text-pink-600 hover:text-pink-700 font-bold flex items-center gap-1 cursor-pointer"
                title={language === 'th' ? 'รีเฟรชเวลาปัจจุบัน' : 'Refresh time'}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{language === 'th' ? 'รีเฟรชเวลา' : 'Refresh Time'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] min-w-0">
            {duplicateStatus.isAlreadyReceived ? (
              <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5 truncate" title={duplicateStatus.message}>
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{duplicateStatus.message || (language === 'th' ? 'รายการนี้ถูกรับไปแล้ว (ห้ามทำรายการซ้ำ)' : 'Already received')}</span>
              </span>
            ) : !isSuccess && (!isRecipientNameValid || !isRecipientDeptValid) ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{language === 'th' ? 'กรุณากรอกชื่อผู้รับตามหน้าซองและแผนกผู้รับให้เรียบร้อย' : 'Please fill in recipient name & department'}</span>
              </span>
            ) : !isSuccess && !isFormComplete ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{language === 'th' ? 'กรุณากรอกข้อมูลให้ครบถ้วน' : 'Please fill in all fields'}</span>
              </span>
            ) : !isSuccess ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{language === 'th' ? 'กรอกข้อมูลครบถ้วน พร้อมบันทึก' : 'Ready to save'}</span>
              </span>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              id="btn-cancel-parcel-modal"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </button>

            <button
              type="button"
              id="btn-submit-parcel-google-form"
              onClick={() => {
                if (isSuccess) {
                  handleResetForNewRecord();
                } else {
                  handleSubmit();
                }
              }}
              disabled={isSubmitting || (!isSuccess && (!isRecipientNameValid || !isRecipientDeptValid || !isSenderNameValid || !isSenderDeptValid || !isItemTitleValid || duplicateStatus.isAlreadyReceived))}
              title={
                !isSuccess && (!isRecipientNameValid || !isRecipientDeptValid)
                  ? (language === 'th' ? 'กรุณากรอกชื่อผู้รับตามหน้าซองและแผนกผู้รับให้เรียบร้อยก่อนบันทึก' : 'Please fill in recipient name and department before saving')
                  : undefined
              }
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                isSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 border border-emerald-500/50'
                  : duplicateStatus.isAlreadyReceived
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  : (!isRecipientNameValid || !isRecipientDeptValid || !isFormComplete)
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:via-rose-600 hover:to-amber-600 text-white shadow-md shadow-pink-500/20 hover:shadow-lg'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{language === 'th' ? 'กำลังบันทึกข้อมูล...' : 'Saving...'}</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>{language === 'th' ? 'บันทึกข้อมูลแล้ว' : 'Saved'}</span>
                </>
              ) : duplicateStatus.isAlreadyReceived ? (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>{language === 'th' ? 'รายการนี้ถูกรับแล้ว (ห้ามซ้ำ)' : 'Already Received'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'th' ? 'บันทึกข้อมูล' : 'Save'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
