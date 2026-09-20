import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Download,
  Package,
  Shirt,
  Sparkles,
  FileSpreadsheet,
  Info,
  Send,
  AlertCircle,
  Calendar,
  User,
  Building2,
  FileText,
  Loader2,
  RotateCw,
  CheckCircle2,
  ChevronDown,
  Search
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const MASTER_EQUIPMENT_REQUISITION_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScSaoDIIxRWdKWDK9HQRXkRwsMCGQoxViNRzi5INLEqSdmIPQ/viewform?usp=pp_url';

export const GOWN_GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1AQXHNA1gDBXl5gWMeXu_y04ziGi3CDk-z6MbH6DQQ2M/edit?gid=1537050902#gid=1537050902';

const GOWN_DEPARTMENTS = [
  'แผนกเทคนิคการผลิต 4',
  'แผนกความปลอดภัย',
  'แผนกซ่อมบำรุง',
  'แผนกเทคนิคบริการ',
  'แผนกธุรการลาดกระบัง 2',
  'แผนกปรับอากาศและทำความเย็น',
  'แผนกไฟฟ้าและสื่อสาร',
  'แผนกสุขาภิบาล',
  'แผนกสต็อก 4',
  'แผนกวิศวกรรม',
  'แผนก A/2',
  'แผนก A/3',
  'แผนก A/4',
  'แผนก B/1',
  'แผนก B/5',
  'แผนก QC Line',
  'แผนกการตลาด (ขาย 1)',
  'แผนกการตลาด (ขาย 2)',
  'แผนกสารสนเทศ',
];

interface SubmittedGownSummary {
  actionType: 'เบิกเสื้อกาวน์' | 'คืนเสื้อกาวน์';
  date: string;
  personName: string;
  department: string;
  sizeL: number;
  sizeXL: number;
  size2XL: number;
  totalPieces: number;
  timestamp: string;
}

interface CreateEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
  currentSubCategoryName?: string;
  activeSubCategory?: string;
  formUrl?: string;
  sheetUrl?: string;
  canAccessGoogleSheet?: boolean;
  existingRequesterNames?: string[];
  requesterNameToDept?: Record<string, string>;
}

export const CreateEquipmentModal: React.FC<CreateEquipmentModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  currentSubCategoryName,
  activeSubCategory,
  formUrl: propFormUrl,
  sheetUrl: propSheetUrl,
  canAccessGoogleSheet = false,
  existingRequesterNames: propExistingRequesterNames,
  requesterNameToDept: propRequesterNameToDept,
}) => {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

  const formUrl = propFormUrl || MASTER_EQUIPMENT_REQUISITION_FORM_URL;
  const isGown = activeSubCategory === 'gown' || formUrl === MASTER_EQUIPMENT_REQUISITION_FORM_URL;
  const effectiveSheetUrl = propSheetUrl || (isGown ? GOWN_GOOGLE_SHEET_URL : undefined);

  // Tab: only used for non-gown equipment
  const [activeTab, setActiveTab] = useState<'form' | 'direct'>('direct');

  // Gown Form States
  const [actionType, setActionType] = useState<'เบิกเสื้อกาวน์' | 'คืนเสื้อกาวน์'>('เบิกเสื้อกาวน์');
  const [date, setDate] = useState<string>('');
  const [personName, setPersonName] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [sizeL, setSizeL] = useState<string>('');
  const [sizeXL, setSizeXL] = useState<string>('');
  const [size2XL, setSize2XL] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);
  const [submittedRecord, setSubmittedRecord] = useState<SubmittedGownSummary | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Autocomplete / Suggestion state for ชื่อผู้เบิก-คืน
  const [rememberedNames, setRememberedNames] = useState<string[]>([]);
  const [nameDeptMap, setNameDeptMap] = useState<Record<string, string>>({});
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const nameInputWrapperRef = useRef<HTMLDivElement>(null);

  // Helper to validate and exclude action types like 'คืนเสื้อกาวน์', 'เบิกเสื้อกาวน์' from person names
  const isInvalidGownName = (name: string) => {
    const n = (name || '').trim();
    if (!n || n.length < 2) return true;
    if (n === 'ไม่ระบุชื่อ' || n === 'ไม่ระบุชื่อผู้เบิก' || n === 'ชื่อผู้เบิก-คืน') return true;
    if (n === 'คืนเสื้อกาวน์' || n === 'เบิกเสื้อกาวน์') return true;
    if (n.includes('คืนเสื้อกาวน์') || n.includes('เบิกเสื้อกาวน์') || n.includes('เสื้อกาวน์')) return true;
    if (n === 'เบิก' || n === 'คืน' || n === 'เบิกกาวน์' || n === 'คืนกาวน์') return true;
    return false;
  };

  // Load and remember names from Google Sheet column, records, and history
  useEffect(() => {
    if (!isOpen) return;

    const nameSet = new Set<string>();
    const deptMap: Record<string, string> = { ...(propRequesterNameToDept || {}) };

    // 1. From props (records from Google Sheet)
    if (propExistingRequesterNames && Array.isArray(propExistingRequesterNames)) {
      propExistingRequesterNames.forEach((n) => {
        const trimmed = (n || '').trim();
        if (!isInvalidGownName(trimmed)) {
          nameSet.add(trimmed);
        }
      });
    }

    // 2. From saved list in localStorage (clean out invalid action names)
    try {
      const saved = localStorage.getItem('proworkflow_gown_requester_names');
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) {
          const cleaned = arr.filter((n) => typeof n === 'string' && !isInvalidGownName(n));
          localStorage.setItem('proworkflow_gown_requester_names', JSON.stringify(cleaned));
          cleaned.forEach((n) => {
            nameSet.add(n.trim());
          });
        }
      }
    } catch {
      // ignore
    }

    // 3. From cached gown records in localStorage
    try {
      const cached = localStorage.getItem('proworkflow_equipment_cache_gown');
      if (cached) {
        const arr = JSON.parse(cached);
        if (Array.isArray(arr)) {
          arr.forEach((r: any) => {
            const trimmed = (r?.requesterName || '').trim();
            if (!isInvalidGownName(trimmed)) {
              nameSet.add(trimmed);
              if (r.department && !deptMap[trimmed]) {
                deptMap[trimmed] = r.department;
              }
            }
          });
        }
      }
    } catch {
      // ignore
    }

    // 4. From raw CSV in localStorage ('proworkflow_eq_gown_csv_v1')
    try {
      const rawCsv = localStorage.getItem('proworkflow_eq_gown_csv_v1');
      if (rawCsv) {
        const lines = rawCsv.split('\n');
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split(',');
          if (parts.length > 3) {
            const name = parts[3].replace(/^["']|["']$/g, '').trim();
            const dept = parts.length > 4 ? parts[4].replace(/^["']|["']$/g, '').trim() : '';
            if (!isInvalidGownName(name)) {
              nameSet.add(name);
              if (dept && !deptMap[name]) {
                deptMap[name] = dept;
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }

    const sortedNames = Array.from(nameSet).sort((a, b) => a.localeCompare(b, 'th'));
    setRememberedNames(sortedNames);
    setNameDeptMap(deptMap);
  }, [isOpen, propExistingRequesterNames, propRequesterNameToDept]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (nameInputWrapperRef.current && !nameInputWrapperRef.current.contains(e.target as Node)) {
        setIsNameDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Filtered name suggestions when typing consonants or letters
  const filteredNameSuggestions = useMemo(() => {
    const q = personName.trim().toLowerCase();
    const validNames = rememberedNames.filter((n) => !isInvalidGownName(n));
    if (!q) {
      // When empty, show recent/popular remembered names
      return validNames.slice(0, 10);
    }
    const startsWith: string[] = [];
    const contains: string[] = [];

    for (const name of validNames) {
      const lower = name.toLowerCase();
      if (lower.startsWith(q)) {
        startsWith.push(name);
      } else if (lower.includes(q)) {
        contains.push(name);
      }
    }
    return [...startsWith, ...contains].slice(0, 15);
  }, [personName, rememberedNames]);

  const handleSelectName = (name: string) => {
    setPersonName(name);
    setIsNameDropdownOpen(false);
    setActiveSuggestionIndex(-1);

    // If department is currently blank and we know their department, auto-fill it
    if (!department.trim() && nameDeptMap[name]) {
      setDepartment(nameDeptMap[name]);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isNameDropdownOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsNameDropdownOpen(true);
      return;
    }

    if (isNameDropdownOpen && filteredNameSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) =>
          prev < filteredNameSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredNameSuggestions.length - 1
        );
      } else if (e.key === 'Enter') {
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < filteredNameSuggestions.length) {
          e.preventDefault();
          handleSelectName(filteredNameSuggestions[activeSuggestionIndex]);
        }
      } else if (e.key === 'Escape') {
        setIsNameDropdownOpen(false);
      }
    }
  };

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setDate('');
      setPersonName('');
      setDepartment('');
      setSizeL('');
      setSizeXL('');
      setSize2XL('');
      setIsSubmitting(false);
      setIsSubmittedSuccess(false);
      setSubmittedRecord(null);
      setSubmitError(null);
      setIsNameDropdownOpen(false);
      setActiveSuggestionIndex(-1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(formUrl)}`;

  const numL = parseInt(sizeL || '0', 10) || 0;
  const numXL = parseInt(sizeXL || '0', 10) || 0;
  const num2XL = parseInt(size2XL || '0', 10) || 0;
  const totalGownPieces = numL + numXL + num2XL;

  const handleCopy = () => {
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyQrUrl = () => {
    navigator.clipboard.writeText(formUrl);
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 2500);
  };

  const handleStartNewEntry = () => {
    setIsSubmittedSuccess(false);
    setSubmittedRecord(null);
    setSubmitError(null);
    setPersonName('');
    setDepartment('');
    setSizeL('');
    setSizeXL('');
    setSize2XL('');
  };

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!date.trim()) {
      setSubmitError(language === 'th' ? 'กรุณาระบุวันที่' : 'Please specify date');
      return;
    }

    if (!personName.trim()) {
      setSubmitError(language === 'th' ? 'กรุณาระบุชื่อผู้เบิก-คืน' : 'Please enter borrower/returner name');
      return;
    }

    if (!department.trim()) {
      setSubmitError(language === 'th' ? 'กรุณาระบุแผนก' : 'Please specify department');
      return;
    }

    if (totalGownPieces <= 0) {
      setSubmitError(language === 'th' ? 'กรุณาระบุขนาดและจำนวนเสื้อกาวน์อย่างน้อย 1 ตัว' : 'Please specify at least 1 gown');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        actionType,
        date: date.trim(),
        personName: personName.trim(),
        department: department.trim(),
        sizeL: numL > 0 ? numL : undefined,
        sizeXL: numXL > 0 ? numXL : undefined,
        size2XL: num2XL > 0 ? num2XL : undefined,
      };

      const res = await fetch('/api/equipment-gown-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const trimmedName = personName.trim();
        const trimmedDept = department.trim();

        // 1. Mark success and store record summary
        setIsSubmittedSuccess(true);
        setSubmittedRecord({
          actionType,
          date: date.trim(),
          personName: trimmedName,
          department: trimmedDept,
          sizeL: numL,
          sizeXL: numXL,
          size2XL: num2XL,
          totalPieces: totalGownPieces,
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        });

        // 2. Remember name in localStorage for instant future autocompletion
        if (!isInvalidGownName(trimmedName)) {
          try {
            const saved = localStorage.getItem('proworkflow_gown_requester_names');
            const list: string[] = saved ? JSON.parse(saved) : [];
            const cleanedList = list.filter((n) => typeof n === 'string' && !isInvalidGownName(n));
            if (!cleanedList.includes(trimmedName)) {
              cleanedList.unshift(trimmedName);
              localStorage.setItem('proworkflow_gown_requester_names', JSON.stringify(cleanedList.slice(0, 100)));
            }
          } catch {
            // ignore
          }

          // Update local state suggestions
          setRememberedNames((prev) => {
            if (!prev.includes(trimmedName)) {
              return [trimmedName, ...prev.filter((n) => !isInvalidGownName(n))].sort((a, b) => a.localeCompare(b, 'th'));
            }
            return prev;
          });
        }

        if (trimmedDept) {
          setNameDeptMap((prev) => ({ ...prev, [trimmedName]: trimmedDept }));
        }

        // 3. Refresh background data table
        if (onRefreshData) {
          onRefreshData();
        }

        // Requirement 1: "1. เมื่อทำรายการเรียบร้อยแล้ว ยังคงให้หน้าต่างค้างอยู่จนกว่าจะกดปิด"
        // Intentionally keep window open until the user clicks close button!
      } else {
        setSubmitError(data.error || (language === 'th' ? 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' : 'Failed to submit data'));
      }
    } catch (err: any) {
      setSubmitError(err?.message || (language === 'th' ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' : 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to highlight matching text in suggestions
  const renderHighlightedText = (text: string, query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return <span>{text}</span>;
    const lowerText = text.toLowerCase();
    const lowerQuery = trimmed.toLowerCase();
    const idx = lowerText.indexOf(lowerQuery);
    if (idx === -1) return <span>{text}</span>;

    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + trimmed.length);
    const after = text.slice(idx + trimmed.length);
    return (
      <span>
        {before}
        <strong className="text-rose-700 bg-rose-100/90 px-0.5 rounded font-black">
          {match}
        </strong>
        {after}
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-rose-200/90 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-700 via-red-600 to-amber-600 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-inner">
              {isGown ? (
                <Shirt className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <Package className="w-5 h-5 stroke-[2.5]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {isGown
                    ? (language === 'th' ? 'แบบฟอร์มการเบิก-คืน เสื้อกาวน์สีกรมท่า' : 'Navy Gown Requisition & Return Form')
                    : (language === 'th' ? `เพิ่มรายการ ${currentSubCategoryName || 'เบิกอุปกรณ์'}` : `Add Requisition: ${currentSubCategoryName || 'Equipment'}`)}
                </h2>
                {!isGown && (
                  <span className="px-2 py-0.5 rounded-full text-2xs font-black bg-white/20 backdrop-blur-sm border border-white/30 text-white">
                    Google Form
                  </span>
                )}
              </div>
              {!isGown && (
                <p className="text-xs text-rose-100 font-medium">
                  {language === 'th'
                    ? 'กรอกข้อมูลผ่านฟอร์มเพื่อบันทึกลงในระบบและ Google Sheet'
                    : 'Fill out the form to record into the system and Google Sheet'}
                </p>
              )}
              {isGown && (
                <p className="text-xs text-rose-100/95 font-medium">
                  {language === 'th'
                    ? 'บันทึกรายการเบิกหรือคืนเสื้อกาวน์ พร้อมซิงค์เข้า Google Sheet อัตโนมัติ'
                    : 'Record requisition or return of navy gowns, auto-syncing with Google Sheet'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Google Sheet link in header - restricted to admin/supervisor only (Requirement 3) */}
            {canAccessGoogleSheet && effectiveSheetUrl && (
              <a
                href={effectiveSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all cursor-pointer mr-1"
                title={language === 'th' ? 'เปิดดู Google Sheet' : 'Open Google Sheet'}
                aria-label="Google Sheet"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
              title={language === 'th' ? 'ปิด' : 'Close'}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Completely hidden for Gown as per user specification */}
        {!isGown && (
          <div className="p-3 sm:p-4 bg-rose-50/50 border-b border-rose-100 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-200 hover:border-rose-300 text-rose-800 text-xs font-bold shadow-xs hover:shadow transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{language === 'th' ? 'เปิดในแท็บใหม่' : 'Open New Tab'}</span>
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-200 hover:border-rose-300 text-slate-700 text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">{language === 'th' ? 'คัดลอกแล้ว' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>{language === 'th' ? 'คัดลอกลิงก์' : 'Copy Link'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {isGown ? (
            /* Direct Form for Gown */
            isSubmittedSuccess && submittedRecord ? (
              /* Requirement 1: Success confirmation receipt - stays open until user clicks close */
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white border-2 border-emerald-500/40 shadow-lg space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-emerald-950">
                        {language === 'th' ? 'บันทึกรายการเรียบร้อยแล้ว' : 'Recorded Successfully'}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <Check className="w-3 h-3 stroke-[3]" />
                        {language === 'th' ? 'สำเร็จ' : 'Success'}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800/90 font-medium mt-1">
                      {language === 'th'
                        ? 'ข้อมูลได้ถูกบันทึกเข้าสู่ระบบและเชื่อมต่อ Google Sheet แล้ว หน้าต่างนี้จะยังคงอยู่จนกว่าคุณจะกดปิด'
                        : 'Data recorded and synced. This window will remain open until you close it.'}
                    </p>
                  </div>
                </div>

                {/* Summary receipt card */}
                <div className="bg-white rounded-xl border border-emerald-200/80 p-4 shadow-xs divide-y divide-emerald-100 text-xs sm:text-sm">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'ประเภทรายการ' : 'Action Type'}</span>
                    <span
                      className={`px-3 py-1 rounded-lg font-black text-xs ${
                        submittedRecord.actionType === 'คืนเสื้อกาวน์'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}
                    >
                      {submittedRecord.actionType}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'วันที่ทำรายการ' : 'Date'}</span>
                    <span className="font-bold text-slate-800">{submittedRecord.date}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'ชื่อผู้เบิก-คืน' : 'Name'}</span>
                    <span className="font-black text-rose-950 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-rose-600" />
                      {submittedRecord.personName}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'แผนก' : 'Department'}</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      {submittedRecord.department}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'จำนวนเสื้อกาวน์' : 'Quantity'}</span>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {submittedRecord.sizeL > 0 && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700 text-xs">
                          L: {submittedRecord.sizeL} ตัว
                        </span>
                      )}
                      {submittedRecord.sizeXL > 0 && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700 text-xs">
                          XL: {submittedRecord.sizeXL} ตัว
                        </span>
                      )}
                      {submittedRecord.size2XL > 0 && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700 text-xs">
                          2XL: {submittedRecord.size2XL} ตัว
                        </span>
                      )}
                      <span className="font-black text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded text-xs border border-emerald-300">
                        {language === 'th' ? `รวม ${submittedRecord.totalPieces} ตัว` : `Total ${submittedRecord.totalPieces} pcs`}
                      </span>
                    </div>
                  </div>
                  <div className="py-2 flex items-center justify-between text-xs text-slate-400">
                    <span>{language === 'th' ? 'เวลาบันทึก' : 'Recorded at'}</span>
                    <span>{submittedRecord.timestamp} น.</span>
                  </div>
                </div>

                {/* Actions: ทำรายการใหม่ & ปิดหน้าต่าง */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
                  {/* Google Sheet button - visible ONLY for admin/supervisor (Requirement 3) */}
                  {canAccessGoogleSheet && effectiveSheetUrl && (
                    <a
                      href={effectiveSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-all"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                      <span>{language === 'th' ? 'เปิดดูใน Google Sheet' : 'Open Google Sheet'}</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleStartNewEntry}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
                  >
                    <RotateCw className="w-4 h-4 text-slate-600" />
                    <span>{language === 'th' ? 'ทำรายการใหม่' : 'New Transaction'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>{language === 'th' ? 'ปิดหน้าต่าง' : 'Close Window'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDirectSubmit} className="space-y-5">
                {submitError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* 1. Action Type Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {language === 'th' ? 'กรุณาเลือกการเบิก-คืน' : 'Please select Action'} <span className="text-rose-600">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setActionType('เบิกเสื้อกาวน์')}
                      className={`p-3 rounded-xl border-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        actionType === 'เบิกเสื้อกาวน์'
                          ? 'border-rose-600 bg-rose-50 text-rose-900 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Shirt className="w-4 h-4" />
                      <span>{language === 'th' ? 'เบิกเสื้อกาวน์' : 'Requisition Gown'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionType('คืนเสื้อกาวน์')}
                      className={`p-3 rounded-xl border-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        actionType === 'คืนเสื้อกาวน์'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>{language === 'th' ? 'คืนเสื้อกาวน์' : 'Return Gown'}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Date & Borrower/Returner Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-rose-600" />
                      <span>{language === 'th' ? 'วันที่' : 'Date'}</span> <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white"
                    />
                  </div>

                  {/* Autocomplete for ชื่อผู้เบิก-คืน (Requirement 2) */}
                  <div className="relative" ref={nameInputWrapperRef}>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-rose-600" />
                        <span>{language === 'th' ? 'ชื่อผู้เบิก-คืน' : 'Name of Person'}</span> <span className="text-rose-600">*</span>
                      </span>
                      {rememberedNames.length > 0 && (
                        <span className="text-2xs text-slate-400 font-medium">
                          {language === 'th' ? `จำชื่อ ${rememberedNames.length} ท่าน` : `${rememberedNames.length} names saved`}
                        </span>
                      )}
                    </label>

                    <div className="relative">
                      <input
                        type="text"
                        value={personName}
                        onChange={(e) => {
                          setPersonName(e.target.value);
                          setIsNameDropdownOpen(true);
                          setActiveSuggestionIndex(-1);
                        }}
                        onFocus={() => {
                          if (rememberedNames.length > 0) {
                            setIsNameDropdownOpen(true);
                          }
                        }}
                        onKeyDown={handleNameKeyDown}
                        placeholder={language === 'th' ? 'พิมพ์พยัญชนะหรือชื่อเพื่อเลือก' : 'Type letter to choose name'}
                        required
                        autoComplete="off"
                        list="gown-person-names-datalist"
                        className="w-full pl-3.5 pr-16 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white"
                      />

                      {/* Dropdown toggle & clear buttons */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {personName && (
                          <button
                            type="button"
                            onClick={() => {
                              setPersonName('');
                              setActiveSuggestionIndex(-1);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                            title={language === 'th' ? 'ล้างข้อความ' : 'Clear text'}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsNameDropdownOpen((prev) => !prev)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                          title={language === 'th' ? 'แสดงรายชื่อ' : 'Toggle names'}
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isNameDropdownOpen ? 'rotate-180 text-rose-600' : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Native Datalist as extra device fallback */}
                    <datalist id="gown-person-names-datalist">
                      {rememberedNames.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>

                    {/* Interactive Autocomplete Suggestions Dropdown */}
                    {isNameDropdownOpen && filteredNameSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-rose-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-normal text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Search className="w-3.5 h-3.5 text-slate-400" />
                            <span>{language === 'th' ? 'เลือกชื่อผู้เบิก-คืนจากระบบ' : 'Select from recorded names'}</span>
                          </span>
                          <span className="text-xs font-normal text-slate-400">
                            {language === 'th' ? 'กดลูกศรขึ้น/ลงเพื่อเลือก' : 'Use arrow keys'}
                          </span>
                        </div>

                        {filteredNameSuggestions.map((item, idx) => {
                          const isSelected = idx === activeSuggestionIndex;
                          const knownDept = nameDeptMap[item];
                          return (
                            <div
                              key={item}
                              onClick={() => handleSelectName(item)}
                              onMouseEnter={() => setActiveSuggestionIndex(idx)}
                              className={`px-3 py-2.5 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-rose-50 text-rose-950 font-bold'
                                  : 'hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-2xs font-black ${
                                    isSelected
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {item.slice(0, 1)}
                                </div>
                                <span className="truncate">
                                  {renderHighlightedText(item, personName)}
                                </span>
                              </div>

                              {knownDept && (
                                <span className="text-2xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0 max-w-[150px] truncate border border-slate-200">
                                  {knownDept}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>{language === 'th' ? 'แผนก' : 'Department'}</span> <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="gown-departments-datalist"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder={language === 'th' ? 'พิมพ์หรือเลือกแผนก' : 'Type or select department'}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white"
                    />
                    <datalist id="gown-departments-datalist">
                      {GOWN_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* 4. Sizes and Quantity */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      {language === 'th' ? 'ระบุขนาดและจำนวนเสื้อกาวน์ที่ต้องการ' : 'Specify Size and Quantity'} <span className="text-rose-600">*</span>
                    </label>
                    {totalGownPieces > 0 && (
                      <span className="text-xs font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full">
                        {language === 'th' ? `รวม ${totalGownPieces} ตัว` : `Total ${totalGownPieces} pcs`}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Size L */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center space-y-2">
                      <span className="text-xs font-black text-slate-700 block">ไซส์ L</span>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.max(0, (parseInt(sizeL || '0', 10) || 0) - 1);
                            setSizeL(val === 0 ? '' : String(val));
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={sizeL}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSizeL(val === '' ? '' : String(Math.max(0, parseInt(val, 10) || 0)));
                          }}
                          placeholder="0"
                          className="w-14 text-center font-black text-sm py-1 border border-slate-300 rounded-lg outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = (parseInt(sizeL || '0', 10) || 0) + 1;
                            setSizeL(String(val));
                          }}
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Size XL */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center space-y-2">
                      <span className="text-xs font-black text-slate-700 block">ไซส์ XL</span>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.max(0, (parseInt(sizeXL || '0', 10) || 0) - 1);
                            setSizeXL(val === 0 ? '' : String(val));
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={sizeXL}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSizeXL(val === '' ? '' : String(Math.max(0, parseInt(val, 10) || 0)));
                          }}
                          placeholder="0"
                          className="w-14 text-center font-black text-sm py-1 border border-slate-300 rounded-lg outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = (parseInt(sizeXL || '0', 10) || 0) + 1;
                            setSizeXL(String(val));
                          }}
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Size 2XL */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center space-y-2">
                      <span className="text-xs font-black text-slate-700 block">ไซส์ 2XL</span>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.max(0, (parseInt(size2XL || '0', 10) || 0) - 1);
                            setSize2XL(val === 0 ? '' : String(val));
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={size2XL}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSize2XL(val === '' ? '' : String(Math.max(0, parseInt(val, 10) || 0)));
                          }}
                          placeholder="0"
                          className="w-14 text-center font-black text-sm py-1 border border-slate-300 rounded-lg outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = (parseInt(size2XL || '0', 10) || 0) + 1;
                            setSize2XL(String(val));
                          }}
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-sm flex items-center justify-center transition-colors cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || totalGownPieces <= 0}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-rose-700 via-red-600 to-amber-600 hover:from-rose-800 hover:via-red-700 hover:to-amber-700 text-white shadow-rose-500/30 hover:scale-102 active:scale-98"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{language === 'th' ? 'กำลังบันทึกข้อมูล...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{language === 'th' ? 'บันทึกข้อมูล' : 'Save Data'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* General Equipment View */
            <div className="space-y-4">
              <div className="rounded-2xl border border-rose-200 bg-white overflow-hidden shadow-sm">
                <div className="relative w-full h-[540px] bg-slate-100 flex flex-col items-center justify-center">
                  <iframe
                    src={`${formUrl}&embedded=true`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    marginHeight={0}
                    marginWidth={0}
                    title="Equipment Requisition"
                    className="w-full h-full border-0 bg-white"
                  >
                    Loading...
                  </iframe>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            {currentSubCategoryName ? `หมวดหมู่: ${currentSubCategoryName}` : 'ระบบเบิกอุปกรณ์'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            {language === 'th' ? 'ปิด' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
