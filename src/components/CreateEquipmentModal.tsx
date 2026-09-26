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
  Key,
  Sparkles,
  FileSpreadsheet,
  Info,
  Send,
  AlertCircle,
  AlertTriangle,
  Calendar,
  User,
  Building2,
  FileText,
  Loader2,
  RotateCw,
  CheckCircle2,
  ChevronDown,
  Search,
  Lock,
  Droplets,
  MapPin,
  Tag
} from 'lucide-react';
import { Ladder } from './LadderIcon';
import { Mop } from './MopIcon';
import { useLanguage } from '../contexts/LanguageContext';
import { generateGownTrackingCode } from '../utils/equipmentDateUtils';
import {
  CLEANING_FORM_ITEMS,
  CLEANING_FORM_URL,
  CLEANING_SHEET_URL,
  CleaningFormItem,
} from '../data/cleaningItems';

export const MASTER_EQUIPMENT_REQUISITION_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScSaoDIIxRWdKWDK9HQRXkRwsMCGQoxViNRzi5INLEqSdmIPQ/viewform?usp=pp_url';

export const GOWN_GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1AQXHNA1gDBXl5gWMeXu_y04ziGi3CDk-z6MbH6DQQ2M/edit?gid=1537050902#gid=1537050902';

export const KEYS_EQUIPMENT_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSeHCJ7dco8nkjZY5FbzFobIWNfDHCLh2JzEvCORYhTU7Lwhvw/viewform?usp=pp_url';

export const KEYS_GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1hBOaTsILrvA5UtTyL1iULW7SzGkW0-tPO3QmOUiR8mY/edit?gid=546384221#gid=546384221';

export const LADDER_EQUIPMENT_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSeW4R1vKlM-YjsA2EghWuOnw1H8s0A46zoocbqAvo_4KHuyVg/viewform?usp=pp_url';

export const LADDER_GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1ccv4HxX9QRRNVR6rQdCq5LvqD__tTyrxQnj1EWncy2s/edit?gid=1183570474#gid=1183570474';

export const SOFTENER_EQUIPMENT_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSeO-DULwAXxDIj2lb7D75UMuKmEB6wlt-n_RuOFm7_LDtv5lw/viewform?usp=pp_url';

export const SOFTENER_GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1Xs6vgGFieSYkJ1cl38Txer9Czr_A3Eh9_vh_Kyxr860/edit?gid=1462351217#gid=1462351217';

export const SOFTENER_AREAS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export const INITIAL_SOFTENER_NAMES = ['พรนิภา', 'สงกรานต์', 'ณัฐภัทร', 'สุดารัตน์', 'ยุพา'];
export const INITIAL_CLEANING_NAMES = [
  'ณัฐภัทร',
  'พงศกร',
  'พรนิภา',
  'ยุพา  กำพังเทียม',
  'สงกรานต์',
  'สุดารัตน์',
  'สุริยา',
];
export const CLEANING_CATEGORIES = [
  'ทั้งหมด',
  'ไม้กวาด',
  'ไม้ถูพื้น/ด้ามจับ',
  'แปรง/ขัด',
  'น้ำยา/เคมีภัณฑ์',
  'ฟองน้ำ/ฝอยขัด',
  'อุปกรณ์ฉีด/เช็ด',
  'อุปกรณ์ปาดน้ำ',
  'อุปกรณ์ดักแมลง',
  'เครื่องดื่ม/อาหารว่าง',
  'เครื่องเขียน/สำนักงาน',
  'ของใช้ทั่วไป',
  'ถุง/บรรจุภัณฑ์',
  'อุปกรณ์ป้องกัน',
  'อุปกรณ์ทำความสะอาด',
  'อุปกรณ์ทั่วไป',
] as const;

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

export const KEYS_DEPARTMENTS = [
  'แผนกความปลอดภัย',
  'แผนกธุรการลาดกระบัง 1',
  'แผนกธุรการลาดกระบัง 2',
  'แผนกเทคนิคบริการ',
  'แผนกไฟฟ้าและสื่อสาร',
  'แผนกปรับอากาศ',
  'แผนกสุขาภิบาล',
  'แผนกวิศกรรมเครื่องกล',
  'แผนก Lab',
  'แผนกสารสนเทศ',
  'ฝ่ายผลิตลาดกระบัง 2',
];

export const LADDER_DEPARTMENTS = [
  'A/2',
  'A/3',
  'A/4',
  'B/1',
  'B/5',
  'สต็อก 4',
  'การตลาด',
  'ซาโบเต็น',
  'เทคนิคการผลิต 4',
  'เทคนิคบริการ ส่วนบำรุงรักษาอาคาร',
  'บำรุงรักษาอาคาร',
  'ปรับอากาศ',
  'ไฟฟ้าและสื่อสาร',
  'สารสนเทศโรงงาน',
  'สุขาภิบาลและเครื่องกล',
  'วิศวกรรมเครื่องกล',
];

export const LADDER_OPTIONS = [
  { id: 'ladder-5', name: 'บันได 5 ขั้น (สูง 1.50 เมตร)', steps: '5 ขั้น', height: 'สูง 1.50 ม.', desc: 'ความสูงเหมาะกับงานทั่วไป ภายในอาคาร' },
  { id: 'ladder-7', name: 'บันได 7 ขั้น (สูง 2.10 เมตร)', steps: '7 ขั้น', height: 'สูง 2.10 ม.', desc: 'ความสูงระดับกลาง งานเปลี่ยนหลอดไฟ ฝ้าเพดาน' },
  { id: 'ladder-13', name: 'บันได 13 ขั้น (สูง 3.80 เมตร)', steps: '13 ขั้น', height: 'สูง 3.80 ม.', desc: 'ความสูงพิเศษ สำหรับงานติดตั้ง งานซ่อมบำรุงที่สูง' },
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
  trackingCode?: string;
  timestamp: string;
}

interface SubmittedKeySummary {
  actionType: 'เบิก' | 'คืน';
  date: string;
  personName: string;
  department: string;
  keyNumbers: string;
  note?: string;
  timestamp: string;
}

interface SubmittedLadderSummary {
  actionType: 'ยืม' | 'คืน';
  date: string;
  personName: string;
  department: string;
  ladderType: string;
  timestamp: string;
}

interface SubmittedSoftenerSummary {
  date: string;
  personName: string;
  area: string;
  item: string;
  timestamp: string;
}

interface SubmittedCleaningSummary {
  date: string;
  personName: string;
  items: { id: number; name: string; quantity: string }[];
  other?: string;
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
  canAccessRestricted?: boolean;
  existingRequesterNames?: string[];
  existingDepartments?: string[];
  requesterNameToDept?: Record<string, string>;
}

// Utility to parse CSV text handling quoted fields with commas
function parseCsvText(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let current = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim().replace(/^["']+|["']+$/g, ''));
      current = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(current.trim().replace(/^["']+|["']+$/g, ''));
      if (row.some((c) => c.length > 0)) {
        lines.push(row);
      }
      row = [];
      current = '';
    } else {
      current += char;
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim().replace(/^["']+|["']+$/g, ''));
    if (row.some((c) => c.length > 0)) {
      lines.push(row);
    }
  }
  return lines;
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
  canAccessRestricted = true,
  existingRequesterNames: propExistingRequesterNames,
  existingDepartments: propExistingDepartments,
  requesterNameToDept: propRequesterNameToDept,
}) => {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

  const isLadder = activeSubCategory === 'ladder';
  const isKeys = activeSubCategory === 'keys';
  const isSoftener = activeSubCategory === 'softener';
  const isCleaning = activeSubCategory === 'cleaning';
  const isGown = activeSubCategory === 'gown' || (!isKeys && !isLadder && !isSoftener && !isCleaning && propFormUrl === MASTER_EQUIPMENT_REQUISITION_FORM_URL);
  const formUrl = isLadder
    ? LADDER_EQUIPMENT_FORM_URL
    : isKeys
    ? KEYS_EQUIPMENT_FORM_URL
    : isSoftener
    ? SOFTENER_EQUIPMENT_FORM_URL
    : isCleaning
    ? CLEANING_FORM_URL
    : (propFormUrl || MASTER_EQUIPMENT_REQUISITION_FORM_URL);
  const effectiveSheetUrl = propSheetUrl || (
    isGown
      ? GOWN_GOOGLE_SHEET_URL
      : isKeys
      ? KEYS_GOOGLE_SHEET_URL
      : isLadder
      ? LADDER_GOOGLE_SHEET_URL
      : isSoftener
      ? SOFTENER_GOOGLE_SHEET_URL
      : isCleaning
      ? CLEANING_SHEET_URL
      : undefined
  );

  // Tab: only used for non-gown, non-keys, non-ladder, non-softener equipment
  const [activeTab, setActiveTab] = useState<'form' | 'direct'>('direct');

  // Gown Form States
  const [actionType, setActionType] = useState<'เบิกเสื้อกาวน์' | 'คืนเสื้อกาวน์'>('เบิกเสื้อกาวน์');
  const [date, setDate] = useState<string>('');
  const [personName, setPersonName] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [sizeL, setSizeL] = useState<string>('');
  const [sizeXL, setSizeXL] = useState<string>('');
  const [size2XL, setSize2XL] = useState<string>('');
  const [gownTrackingCode, setGownTrackingCode] = useState<string>('');
  const [trackingCodeCopied, setTrackingCodeCopied] = useState<boolean>(false);

  // Keys Form States
  const [keyActionType, setKeyActionType] = useState<'เบิก' | 'คืน'>('เบิก');
  const [keyNumbers, setKeyNumbers] = useState<string>('');
  const [keyNote, setKeyNote] = useState<string>('');
  const [submittedKeyRecord, setSubmittedKeyRecord] = useState<SubmittedKeySummary | null>(null);

  // Ladder Form States
  const [ladderActionType, setLadderActionType] = useState<'ยืม' | 'คืน'>('ยืม');
  const [selectedLadderType, setSelectedLadderType] = useState<string>('บันได 5 ขั้น (สูง 1.50 เมตร)');
  const [submittedLadderRecord, setSubmittedLadderRecord] = useState<SubmittedLadderSummary | null>(null);
  const [ladderDepartmentsList, setLadderDepartmentsList] = useState<string[]>(LADDER_DEPARTMENTS);

  // Softener Form States
  const [selectedSoftenerArea, setSelectedSoftenerArea] = useState<string>('A1');
  const [submittedSoftenerRecord, setSubmittedSoftenerRecord] = useState<SubmittedSoftenerSummary | null>(null);

  // Cleaning Form States
  const [submittedCleaningRecord, setSubmittedCleaningRecord] = useState<SubmittedCleaningSummary | null>(null);
  const [cleaningSelectedItems, setCleaningSelectedItems] = useState<{ [id: number]: string }>({});
  const [cleaningOther, setCleaningOther] = useState<string>('');
  const [cleaningSearchQuery, setCleaningSearchQuery] = useState<string>('');
  const [cleaningSelectedCategory, setCleaningSelectedCategory] = useState<string>('ทั้งหมด');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);
  const [submittedRecord, setSubmittedRecord] = useState<SubmittedGownSummary | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Autocomplete / Suggestion state for ชื่อผู้เบิก-คืน
  const [rememberedNames, setRememberedNames] = useState<string[]>([]);
  const [nameDeptMap, setNameDeptMap] = useState<Record<string, string>>({});
  const [keyDepartmentsList, setKeyDepartmentsList] = useState<string[]>([]);
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const nameInputWrapperRef = useRef<HTMLDivElement>(null);

  // Helper to validate and exclude action types from person names
  const isInvalidGownName = (name: string) => {
    const n = (name || '').trim();
    if (!n || n.length < 2) return true;
    if (n === 'ไม่ระบุชื่อ' || n === 'ไม่ระบุชื่อผู้เบิก' || n === 'ชื่อผู้เบิก-คืน') return true;
    if (n === 'คืนเสื้อกาวน์' || n === 'เบิกเสื้อกาวน์' || n === 'เบิกกุญแจ' || n === 'คืนกุญแจ') return true;
    if (n.includes('คืนเสื้อกาวน์') || n.includes('เบิกเสื้อกาวน์') || n.includes('เสื้อกาวน์')) return true;
    if (n === 'เบิก' || n === 'คืน' || n === 'เบิกกาวน์' || n === 'คืนกาวน์') return true;
    return false;
  };

  // Load and remember names & departments from Google Sheet column, records, and history
  useEffect(() => {
    if (!isOpen) return;

    const nameSet = new Set<string>();
    const deptSet = new Set<string>();
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

    if (propExistingDepartments && Array.isArray(propExistingDepartments)) {
      propExistingDepartments.forEach((d) => {
        const trimmed = (d || '').trim();
        if (trimmed && trimmed !== 'แผนกทั่วไป' && trimmed !== 'ไม่ระบุแผนก') {
          deptSet.add(trimmed);
        }
      });
    }

    // 2. From saved list in localStorage
    try {
      const storageKey = isLadder
        ? 'proworkflow_ladder_requester_names'
        : isKeys
        ? 'proworkflow_keys_requester_names'
        : isSoftener
        ? 'proworkflow_remembered_names_softener'
        : isCleaning
        ? 'proworkflow_cleaning_requester_names'
        : 'proworkflow_gown_requester_names';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) {
          const cleaned = arr.filter((n) => typeof n === 'string' && !isInvalidGownName(n));
          localStorage.setItem(storageKey, JSON.stringify(cleaned));
          cleaned.forEach((n) => {
            nameSet.add(n.trim());
          });
        }
      }
      if (isSoftener) {
        const altSaved = localStorage.getItem('proworkflow_softener_requester_names');
        if (altSaved) {
          const arr = JSON.parse(altSaved);
          if (Array.isArray(arr)) {
            arr.forEach((n) => {
              if (typeof n === 'string' && !isInvalidGownName(n)) {
                nameSet.add(n.trim());
              }
            });
          }
        }
      }
    } catch {
      // ignore
    }

    // 3. From cached equipment records in localStorage
    try {
      const cacheKey = isLadder
        ? 'proworkflow_equipment_cache_ladder'
        : isKeys
        ? 'proworkflow_equipment_cache_keys'
        : isSoftener
        ? 'proworkflow_equipment_cache_softener'
        : isCleaning
        ? 'proworkflow_equipment_cache_cleaning'
        : 'proworkflow_equipment_cache_gown';
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const arr = JSON.parse(cached);
        if (Array.isArray(arr)) {
          arr.forEach((r: any) => {
            const trimmed = (r?.requesterName || '').trim();
            const dept = (r?.department || '').trim();
            if (!isInvalidGownName(trimmed)) {
              nameSet.add(trimmed);
              if (dept && !deptMap[trimmed]) {
                deptMap[trimmed] = dept;
              }
            }
            if (dept && dept !== 'แผนกทั่วไป' && dept !== 'ไม่ระบุแผนก') {
              deptSet.add(dept);
            }
          });
        }
      }
      if (isSoftener) {
        const altCache = localStorage.getItem('proworkflow_eq_softener_records_v1');
        if (altCache) {
          const arr = JSON.parse(altCache);
          if (Array.isArray(arr)) {
            arr.forEach((r: any) => {
              const trimmed = (r?.requesterName || '').trim();
              if (!isInvalidGownName(trimmed)) {
                nameSet.add(trimmed);
              }
            });
          }
        }
      }
    } catch {
      // ignore
    }

    // 4. From raw CSV in localStorage using proper CSV parsing
    try {
      const csvKey = isLadder
        ? 'proworkflow_eq_ladder_csv_v1'
        : isKeys
        ? 'proworkflow_eq_keys_csv_v1'
        : isSoftener
        ? 'proworkflow_eq_softener_csv_v1'
        : isCleaning
        ? 'proworkflow_eq_cleaning_csv_v1'
        : 'proworkflow_eq_gown_csv_v1';
      const rawCsv = localStorage.getItem(csvKey);
      if (rawCsv) {
        const rows = parseCsvText(rawCsv);
        // If softener, locate column index of "ชื่อผู้เบิก (ชื่อจริง)" dynamically
        let softenerNameCol = 2;
        if (isSoftener && rows.length > 0) {
          const hRow = rows[0].map((h) => (h || '').trim());
          for (let c = 0; c < hRow.length; c++) {
            const h = hRow[c];
            if (
              h.includes('ผู้เบิก') ||
              h.includes('ชื่อจริง') ||
              (h.includes('ชื่อ') && !h.includes('ไม่ระบุ') && !h.includes('คำถาม'))
            ) {
              softenerNameCol = c;
              break;
            }
          }
        }

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 3) continue;
          if (isLadder) {
            // Ladder sheet: col 0 timestamp, col 1 date, col 2 action, col 3 name, col 4 dept, col 5 ladder
            const name = (row[3] || '').trim();
            const dept = (row[4] || '').trim();
            if (!isInvalidGownName(name)) {
              nameSet.add(name);
              if (dept && !deptMap[name]) {
                deptMap[name] = dept;
              }
            }
            if (dept && dept !== 'แผนกทั่วไป' && dept !== 'ไม่ระบุแผนก') {
              deptSet.add(dept);
            }
          } else if (isKeys) {
            // Keys sheet: col 0 is timestamp, col 1 is date, col 2 is "กรุณาระบุชื่อ", col 3 is "แผนก"
            const name = (row[2] || '').trim();
            const dept = (row[3] || '').trim();
            if (!isInvalidGownName(name)) {
              nameSet.add(name);
              if (dept && !deptMap[name]) {
                deptMap[name] = dept;
              }
            }
            if (dept && dept !== 'แผนกทั่วไป' && dept !== 'ไม่ระบุแผนก') {
              deptSet.add(dept);
            }
          } else if (isSoftener) {
            // Softener sheet: col 0 timestamp, col 1 date, col 2 name ("ชื่อผู้เบิก (ชื่อจริง)"), col 3 area
            const name = (row[softenerNameCol] || row[2] || '').trim();
            if (!isInvalidGownName(name)) {
              nameSet.add(name);
            }
          } else if (isCleaning) {
            // Cleaning sheet: col 0 timestamp, col 1 date, col 2 name ("ชื่อผู้เบิก")
            const name = (row[2] || '').trim();
            if (!isInvalidGownName(name)) {
              nameSet.add(name);
            }
          } else {
            // Gown sheet: col 0 timestamp, col 1 action, col 2 date, col 3 name, col 4 dept
            const name = (row[3] || '').trim();
            const dept = (row[4] || '').trim();
            if (!isInvalidGownName(name)) {
              nameSet.add(name);
              if (dept && !deptMap[name]) {
                deptMap[name] = dept;
              }
            }
            if (dept && dept !== 'แผนกทั่วไป' && dept !== 'ไม่ระบุแผนก') {
              deptSet.add(dept);
            }
          }
        }
      }
    } catch {
      // ignore
    }

    // Default seed for softener names from Google Sheet column if nameSet is still empty
    if (isSoftener && nameSet.size === 0) {
      INITIAL_SOFTENER_NAMES.forEach((n) => nameSet.add(n));
    }

    // Specifically for Cleaning, ensure names strictly come from Google Sheet column "ชื่อผู้เบิก"
    if (isCleaning) {
      nameSet.clear();
      INITIAL_CLEANING_NAMES.forEach((n) => {
        if (!isInvalidGownName(n)) nameSet.add(n.trim());
      });

      // From saved cleaning requester names in localStorage
      try {
        const saved = localStorage.getItem('proworkflow_cleaning_requester_names');
        if (saved) {
          const arr = JSON.parse(saved);
          if (Array.isArray(arr)) {
            arr.forEach((n: any) => {
              if (typeof n === 'string' && !isInvalidGownName(n)) nameSet.add(n.trim());
            });
          }
        }
      } catch {
        // ignore
      }

      // From raw cleaning CSV in localStorage (reading column "ชื่อผู้เบิก")
      try {
        const rawCsv = localStorage.getItem('proworkflow_eq_cleaning_csv_v1');
        if (rawCsv) {
          const rows = parseCsvText(rawCsv);
          let nameCol = 2;
          if (rows.length > 0) {
            const hRow = rows[0].map((h) => (h || '').trim());
            for (let c = 0; c < hRow.length; c++) {
              if (hRow[c].includes('ผู้เบิก') || hRow[c].includes('ชื่อ')) {
                nameCol = c;
                break;
              }
            }
          }
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row && row[nameCol]) {
              const n = (row[nameCol] || '').trim();
              if (n && !isInvalidGownName(n)) nameSet.add(n);
            }
          }
        }
      } catch {
        // ignore
      }

      // From propExistingRequesterNames if provided
      if (propExistingRequesterNames && Array.isArray(propExistingRequesterNames)) {
        propExistingRequesterNames.forEach((n) => {
          const trimmed = (n || '').trim();
          if (trimmed && !isInvalidGownName(trimmed)) nameSet.add(trimmed);
        });
      }
    }

    // Fallback departments
    if (isLadder && deptSet.size === 0) {
      LADDER_DEPARTMENTS.forEach((d) => deptSet.add(d));
    } else if (isKeys && deptSet.size === 0) {
      KEYS_DEPARTMENTS.forEach((d) => deptSet.add(d));
    }

    const sortedNames = Array.from(nameSet).sort((a, b) => a.localeCompare(b, 'th'));
    const sortedDepts = Array.from(deptSet).sort((a, b) => a.localeCompare(b, 'th'));
    setRememberedNames(sortedNames);
    setNameDeptMap(deptMap);
    if (isLadder) {
      setLadderDepartmentsList(LADDER_DEPARTMENTS);
    } else {
      setKeyDepartmentsList(sortedDepts.length > 0 ? sortedDepts : KEYS_DEPARTMENTS);
    }

    // 5. In-flight background fetch of Google Sheets to keep names and departments up-to-date
    if (isLadder) {
      fetch('/api/sheet-csv?sheetId=1ccv4HxX9QRRNVR6rQdCq5LvqD__tTyrxQnj1EWncy2s&gid=1183570474')
        .then((res) => res.text())
        .then((csvText) => {
          if (!csvText || !csvText.trim()) return;
          try {
            localStorage.setItem('proworkflow_eq_ladder_csv_v1', csvText);
          } catch {
            // ignore
          }
          const rows = parseCsvText(csvText);
          const freshNames = new Set<string>(nameSet);
          const freshDeptMap = { ...deptMap };

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 5) continue;
            const name = (row[3] || '').trim();
            const dept = (row[4] || '').trim();
            if (!isInvalidGownName(name)) {
              freshNames.add(name);
              if (dept && !freshDeptMap[name]) {
                freshDeptMap[name] = dept;
              }
            }
          }

          setRememberedNames(Array.from(freshNames).sort((a, b) => a.localeCompare(b, 'th')));
          setNameDeptMap(freshDeptMap);
          setLadderDepartmentsList(LADDER_DEPARTMENTS);
        })
        .catch(() => {
          // ignore network error
        });
    } else if (isKeys) {
      fetch('/api/sheet-csv?sheetId=1hBOaTsILrvA5UtTyL1iULW7SzGkW0-tPO3QmOUiR8mY&gid=546384221')
        .then((res) => res.text())
        .then((csvText) => {
          if (!csvText || !csvText.trim()) return;
          try {
            localStorage.setItem('proworkflow_eq_keys_csv_v1', csvText);
          } catch {
            // ignore
          }
          const rows = parseCsvText(csvText);
          const freshNames = new Set<string>(nameSet);
          const freshDepts = new Set<string>(deptSet);
          const freshDeptMap = { ...deptMap };

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 3) continue;
            const name = (row[2] || '').trim();
            const dept = (row[3] || '').trim();
            if (!isInvalidGownName(name)) {
              freshNames.add(name);
              if (dept && !freshDeptMap[name]) {
                freshDeptMap[name] = dept;
              }
            }
            if (dept && dept !== 'แผนกทั่วไป' && dept !== 'ไม่ระบุแผนก') {
              freshDepts.add(dept);
            }
          }

          setRememberedNames(Array.from(freshNames).sort((a, b) => a.localeCompare(b, 'th')));
          setNameDeptMap(freshDeptMap);
          setKeyDepartmentsList(Array.from(freshDepts).sort((a, b) => a.localeCompare(b, 'th')));
        })
        .catch(() => {
          // ignore network error
        });
    } else if (isSoftener) {
      fetch('/api/sheet-csv?sheetId=1Xs6vgGFieSYkJ1cl38Txer9Czr_A3Eh9_vh_Kyxr860&gid=1462351217')
        .then((res) => res.text())
        .then((csvText) => {
          if (!csvText || !csvText.trim()) return;
          try {
            localStorage.setItem('proworkflow_eq_softener_csv_v1', csvText);
          } catch {
            // ignore
          }
          const rows = parseCsvText(csvText);
          const freshNames = new Set<string>(nameSet);

          // Find column index of "ชื่อผู้เบิก (ชื่อจริง)" dynamically from headers
          let nameColIdx = 2;
          if (rows.length > 0) {
            const hRow = rows[0].map((h) => (h || '').trim());
            for (let c = 0; c < hRow.length; c++) {
              const h = hRow[c];
              if (
                h.includes('ผู้เบิก') ||
                h.includes('ชื่อจริง') ||
                (h.includes('ชื่อ') && !h.includes('ไม่ระบุ') && !h.includes('คำถาม'))
              ) {
                nameColIdx = c;
                break;
              }
            }
          }

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length <= nameColIdx) continue;
            const name = (row[nameColIdx] || '').trim();
            if (!isInvalidGownName(name)) {
              freshNames.add(name);
            }
          }

          const sorted = Array.from(freshNames).sort((a, b) => a.localeCompare(b, 'th'));
          setRememberedNames(sorted);
          try {
            localStorage.setItem('proworkflow_remembered_names_softener', JSON.stringify(sorted));
            localStorage.setItem('proworkflow_softener_requester_names', JSON.stringify(sorted));
          } catch {
            // ignore
          }
        })
        .catch(() => {
          // ignore network error
        });
    } else if (isCleaning) {
      fetch('/api/sheet-csv?sheetId=1ghnlCzcIq9A6rGVrZtEqiVA0bGFdqO3ZhbuYLhyBViw&gid=1432727518')
        .then((res) => res.text())
        .then((csvText) => {
          if (!csvText || !csvText.trim()) return;
          try {
            localStorage.setItem('proworkflow_eq_cleaning_csv_v1', csvText);
          } catch {
            // ignore
          }
          const rows = parseCsvText(csvText);
          const freshNames = new Set<string>();
          INITIAL_CLEANING_NAMES.forEach((n) => {
            if (!isInvalidGownName(n)) freshNames.add(n.trim());
          });

          let nameColIdx = 2;
          if (rows.length > 0) {
            const hRow = rows[0].map((h) => (h || '').trim());
            for (let c = 0; c < hRow.length; c++) {
              const h = hRow[c];
              if (h.includes('ผู้เบิก') || h.includes('ชื่อ')) {
                nameColIdx = c;
                break;
              }
            }
          }

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length <= nameColIdx) continue;
            const name = (row[nameColIdx] || '').trim();
            if (!isInvalidGownName(name)) {
              freshNames.add(name);
            }
          }

          const sorted = Array.from(freshNames).sort((a, b) => a.localeCompare(b, 'th'));
          setRememberedNames(sorted);
          try {
            localStorage.setItem('proworkflow_cleaning_requester_names', JSON.stringify(sorted));
          } catch {
            // ignore
          }
        })
        .catch(() => {
          // ignore network error
        });
    }
  }, [isOpen, isKeys, isLadder, isSoftener, isCleaning, propExistingRequesterNames, propExistingDepartments, propRequesterNameToDept]);

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
      // When empty, show remembered names from Google Sheet column
      return validNames.slice(0, 30);
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
    return [...startsWith, ...contains].slice(0, 30);
  }, [personName, rememberedNames]);

  const handleSelectName = (name: string) => {
    setPersonName(name);
    setIsNameDropdownOpen(false);
    setActiveSuggestionIndex(-1);

    // If department is currently blank and we know their department, auto-fill it
    if (!department.trim() && nameDeptMap[name]) {
      const mapped = nameDeptMap[name];
      if (isLadder) {
        if (LADDER_DEPARTMENTS.includes(mapped)) {
          setDepartment(mapped);
        } else {
          const matched = LADDER_DEPARTMENTS.find(
            (d) => d.toLowerCase() === mapped.toLowerCase() || d.includes(mapped) || mapped.includes(d)
          );
          if (matched) setDepartment(matched);
        }
      } else if (isKeys) {
        if (KEYS_DEPARTMENTS.includes(mapped)) {
          setDepartment(mapped);
        } else {
          const matched = KEYS_DEPARTMENTS.find(
            (d) => d.toLowerCase() === mapped.toLowerCase() || d.includes(mapped) || mapped.includes(d)
          );
          if (matched) setDepartment(matched);
        }
      } else {
        setDepartment(mapped);
      }
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
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const initialDate = `${y}-${m}-${d}`;
      setDate(initialDate);
      setPersonName('');
      setDepartment('');
      setSizeL('');
      setSizeXL('');
      setSize2XL('');
      setActionType('เบิกเสื้อกาวน์');
      setGownTrackingCode(generateGownTrackingCode(initialDate));
      setTrackingCodeCopied(false);
      setKeyActionType('เบิก');
      setKeyNumbers('');
      setKeyNote('');
      setLadderActionType('ยืม');
      setSelectedLadderType('บันได 5 ขั้น (สูง 1.50 เมตร)');
      setSelectedSoftenerArea('A1');
      setIsSubmitting(false);
      setIsSubmittedSuccess(false);
      setSubmittedRecord(null);
      setSubmittedKeyRecord(null);
      setSubmittedLadderRecord(null);
      setSubmittedSoftenerRecord(null);
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
    setGownTrackingCode(generateGownTrackingCode(date));
    setTrackingCodeCopied(false);
  };

  const handleStartNewKeyEntry = () => {
    setIsSubmittedSuccess(false);
    setSubmittedKeyRecord(null);
    setSubmitError(null);
    setKeyNumbers('');
    setKeyNote('');
  };

  const handleStartNewLadderEntry = () => {
    setIsSubmittedSuccess(false);
    setSubmittedLadderRecord(null);
    setSubmitError(null);
    setLadderActionType('ยืม');
    setSelectedLadderType('บันได 5 ขั้น (สูง 1.50 เมตร)');
  };

  const handleStartNewSoftenerEntry = () => {
    setIsSubmittedSuccess(false);
    setSubmittedSoftenerRecord(null);
    setSubmitError(null);
    setPersonName('');
    setSelectedSoftenerArea('A1');
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setDate(`${y}-${m}-${d}`);
  };

  const handleLadderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!date.trim()) {
      setSubmitError(language === 'th' ? 'กรุณาระบุวันที่' : 'Please specify date');
      return;
    }

    if (!personName.trim()) {
      setSubmitError(language === 'th' ? 'กรุณาระบุชื่อผู้ยืม-คืน' : 'Please enter borrower/returner name');
      return;
    }

    if (!department.trim()) {
      setSubmitError(language === 'th' ? 'กรุณาเลือกแผนก' : 'Please select department');
      return;
    }

    if (!LADDER_DEPARTMENTS.includes(department.trim())) {
      setSubmitError(language === 'th' ? 'กรุณาเลือกแผนกจากรายการที่กำหนด' : 'Please select a valid department from the list');
      return;
    }

    if (!selectedLadderType.trim()) {
      setSubmitError(language === 'th' ? 'กรุณาเลือกบันไดทรง A' : 'Please select an A-Frame ladder');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        actionType: ladderActionType,
        date: date.trim(),
        personName: personName.trim(),
        department: department.trim(),
        ladderType: selectedLadderType.trim(),
      };

      const res = await fetch('/api/equipment-ladder-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success && data.googleSheetSynced) {
        const trimmedName = personName.trim();
        const trimmedDept = department.trim();

        // 1. Mark success and store record summary
        setIsSubmittedSuccess(true);
        setSubmittedLadderRecord({
          actionType: ladderActionType,
          date: date.trim(),
          personName: trimmedName,
          department: trimmedDept,
          ladderType: selectedLadderType.trim(),
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        });

        // 2. Remember name in localStorage for instant future autocompletion
        if (trimmedName && !isInvalidGownName(trimmedName)) {
          try {
            const saved = localStorage.getItem('proworkflow_ladder_requester_names');
            const list: string[] = saved ? JSON.parse(saved) : [];
            const cleanedList = list.filter((n) => typeof n === 'string' && !isInvalidGownName(n));
            if (!cleanedList.includes(trimmedName)) {
              cleanedList.unshift(trimmedName);
              localStorage.setItem('proworkflow_ladder_requester_names', JSON.stringify(cleanedList.slice(0, 100)));
            }
          } catch {
            // ignore
          }

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

        // Requirement: Keep window open until the user clicks close button!
      } else {
        setSubmitError(data.error || (language === 'th' ? 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' : 'Failed to submit data'));
      }
    } catch (err: any) {
      setSubmitError(err?.message || (language === 'th' ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' : 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSoftenerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!date.trim()) {
      setSubmitError(language === 'th' ? 'กรุณาระบุวันที่' : 'Please specify date');
      return;
    }

    if (!personName.trim()) {
      setSubmitError(language === 'th' ? 'กรุณาระบุชื่อผู้เบิก (ชื่อจริง)' : 'Please enter requester name');
      return;
    }

    if (!selectedSoftenerArea.trim()) {
      setSubmitError(language === 'th' ? 'กรุณาเลือกพื้นที่ในการใช้งาน' : 'Please select usage area');
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmedName = personName.trim();
      const trimmedArea = selectedSoftenerArea.trim();

      const res = await fetch('/api/equipment-softener-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: date.trim(),
          personName: trimmedName,
          area: trimmedArea,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsSubmittedSuccess(true);
        const record = data.record || {};
        const submissionTime = record.timestamp
          ? new Date(record.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

        setSubmittedSoftenerRecord({
          date: record.date || date,
          personName: record.personName || trimmedName,
          area: record.area || trimmedArea,
          item: 'น้ำยาปรับผ้านุ่ม',
          timestamp: submissionTime,
        });

        // 1. Update local cache
        try {
          const cacheKey = 'proworkflow_eq_softener_records_v1';
          const cachedStr = localStorage.getItem(cacheKey);
          const cachedRecords = cachedStr ? JSON.parse(cachedStr) : [];
          const newCachedItem = {
            id: record.id || `softener-${Date.now()}`,
            timestamp: record.timestamp || new Date().toISOString(),
            date: record.date || date,
            requesterName: record.personName || trimmedName,
            department: record.area || trimmedArea,
            subCategory: 'softener',
            items: [{ name: 'น้ำยาปรับผ้านุ่ม', quantity: 1, note: `พื้นที่: ${record.area || trimmedArea}` }],
            status: 'ยืม',
            raw: record,
          };
          localStorage.setItem(cacheKey, JSON.stringify([newCachedItem, ...cachedRecords]));
        } catch {
          // ignore
        }

        // 2. Remember requester name
        if (trimmedName) {
          try {
            const raw = localStorage.getItem('proworkflow_remembered_names_softener');
            const arr = raw ? JSON.parse(raw) : [];
            if (!arr.includes(trimmedName)) {
              const updated = [trimmedName, ...arr].slice(0, 100);
              localStorage.setItem('proworkflow_remembered_names_softener', JSON.stringify(updated));
              localStorage.setItem('proworkflow_softener_requester_names', JSON.stringify(updated));
            }
          } catch {
            // ignore
          }

          setRememberedNames((prev) => {
            if (!prev.includes(trimmedName)) {
              return [trimmedName, ...prev.filter((n) => !isInvalidGownName(n))].sort((a, b) => a.localeCompare(b, 'th'));
            }
            return prev;
          });
        }

        // 3. Refresh background data table
        if (onRefreshData) {
          onRefreshData();
        }
      } else {
        setSubmitError(data.error || (language === 'th' ? 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' : 'Failed to submit data'));
      }
    } catch (err: any) {
      setSubmitError(err?.message || (language === 'th' ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' : 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCleaningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!date.trim()) {
      setSubmitError(language === 'th' ? 'กรุณาระบุวันที่' : 'Please specify date');
      return;
    }

    if (!personName.trim()) {
      setSubmitError(language === 'th' ? 'กรุณาระบุชื่อผู้เบิก' : 'Please enter requester name');
      return;
    }

    const itemsToSubmit = Object.entries(cleaningSelectedItems)
      .filter(([_, qty]) => ['1', '2', '3'].includes(String(qty)))
      .map(([idStr, qty]) => {
        const idNum = Number(idStr);
        const itemObj = CLEANING_FORM_ITEMS.find((it) => it.id === idNum);
        return {
          id: idNum,
          name: itemObj ? itemObj.name : `รายการที่ ${idNum}`,
          quantity: String(qty),
        };
      });

    if (itemsToSubmit.length === 0 && !cleaningOther.trim()) {
      setSubmitError(
        language === 'th'
          ? 'กรุณาเลือกรายการอุปกรณ์อย่างน้อย 1 รายการ หรือระบุในช่องอื่นๆ'
          : 'Please select at least 1 item or specify in notes'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmedName = personName.trim();
      const payload = {
        date: date.trim(),
        personName: trimmedName,
        items: itemsToSubmit,
        other: cleaningOther.trim() || undefined,
      };

      const res = await fetch('/api/equipment-cleaning-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsSubmittedSuccess(true);
        const record = data.record || {};
        const submissionTime = record.timestamp
          ? new Date(record.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

        setSubmittedCleaningRecord({
          date: record.date || date,
          personName: record.personName || trimmedName,
          items: itemsToSubmit,
          other: cleaningOther.trim() || undefined,
          timestamp: submissionTime,
        });

        // 1. Update local cache
        try {
          const cacheKey = 'proworkflow_equipment_cache_cleaning';
          const cachedStr = localStorage.getItem(cacheKey);
          const cachedRecords = cachedStr ? JSON.parse(cachedStr) : [];
          const newCachedItem = {
            id: record.id || `cleaning-${Date.now()}`,
            timestamp: record.timestamp || new Date().toISOString(),
            date: record.date || date,
            requesterName: record.personName || trimmedName,
            subCategory: 'cleaning',
            items: itemsToSubmit.map((it) => ({
              name: it.name,
              quantity: parseInt(String(it.quantity), 10) || 1,
            })),
            status: 'เบิก',
            raw: record,
          };
          localStorage.setItem(cacheKey, JSON.stringify([newCachedItem, ...cachedRecords]));
        } catch {
          // ignore
        }

        // 2. Remember requester name
        if (trimmedName) {
          try {
            const raw = localStorage.getItem('proworkflow_cleaning_requester_names');
            const arr = raw ? JSON.parse(raw) : [];
            if (!arr.includes(trimmedName)) {
              const updated = [trimmedName, ...arr].slice(0, 100);
              localStorage.setItem('proworkflow_cleaning_requester_names', JSON.stringify(updated));
            }
          } catch {
            // ignore
          }

          setRememberedNames((prev) => {
            if (!prev.includes(trimmedName)) {
              return [trimmedName, ...prev.filter((n) => !isInvalidGownName(n))].sort((a, b) => a.localeCompare(b, 'th'));
            }
            return prev;
          });
        }

        // 3. Refresh background data table
        if (onRefreshData) {
          onRefreshData();
        }
      } else {
        setSubmitError(data.error || (language === 'th' ? 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' : 'Failed to submit data'));
      }
    } catch (err: any) {
      setSubmitError(err?.message || (language === 'th' ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' : 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartNewCleaningEntry = () => {
    setIsSubmittedSuccess(false);
    setSubmittedCleaningRecord(null);
    setCleaningSelectedItems({});
    setCleaningOther('');
    setCleaningSearchQuery('');
    setCleaningSelectedCategory('ทั้งหมด');
    setDate(new Date().toISOString().split('T')[0]);
    setPersonName('');
    setSubmitError(null);
  };

  const handleKeySubmit = async (e: React.FormEvent) => {
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
      setSubmitError(language === 'th' ? 'กรุณาเลือกแผนก' : 'Please select department');
      return;
    }

    if (!KEYS_DEPARTMENTS.includes(department.trim())) {
      setSubmitError(language === 'th' ? 'กรุณาเลือกแผนกจากรายการที่กำหนด' : 'Please select a valid department from the list');
      return;
    }

    if (!keyNumbers.trim()) {
      setSubmitError(language === 'th' ? 'กรุณาระบุหมายเลขกุญแจ' : 'Please specify key number(s)');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        actionType: keyActionType,
        date: date.trim(),
        personName: personName.trim(),
        department: department.trim(),
        keyNumbers: keyNumbers.trim(),
        note: keyNote.trim() || undefined,
      };

      const res = await fetch('/api/equipment-keys-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success && data.googleSheetSynced) {
        const trimmedName = personName.trim();
        const trimmedDept = department.trim();

        // 1. Mark success and store record summary
        setIsSubmittedSuccess(true);
        setSubmittedKeyRecord({
          actionType: keyActionType,
          date: date.trim(),
          personName: trimmedName,
          department: trimmedDept,
          keyNumbers: keyNumbers.trim(),
          note: keyNote.trim() || undefined,
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        });

        // 2. Remember name in localStorage for instant future autocompletion
        if (!isInvalidGownName(trimmedName)) {
          try {
            const saved = localStorage.getItem('proworkflow_keys_requester_names');
            const list: string[] = saved ? JSON.parse(saved) : [];
            const cleanedList = list.filter((n) => typeof n === 'string' && !isInvalidGownName(n));
            if (!cleanedList.includes(trimmedName)) {
              cleanedList.unshift(trimmedName);
              localStorage.setItem('proworkflow_keys_requester_names', JSON.stringify(cleanedList.slice(0, 100)));
            }
          } catch {
            // ignore
          }

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

        // Requirement: Keep window open until the user clicks close button!
      } else {
        setSubmitError(data.error || (language === 'th' ? 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' : 'Failed to submit data'));
      }
    } catch (err: any) {
      setSubmitError(err?.message || (language === 'th' ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' : 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
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

    const isRequisition = actionType === 'เบิกเสื้อกาวน์';
    const effectiveTrackingCode = isRequisition 
      ? (gownTrackingCode.trim() || generateGownTrackingCode(date)) 
      : (gownTrackingCode.trim() || undefined);

    try {
      const payload = {
        actionType,
        date: date.trim(),
        personName: personName.trim(),
        department: department.trim(),
        sizeL: numL > 0 ? numL : undefined,
        sizeXL: numXL > 0 ? numXL : undefined,
        size2XL: num2XL > 0 ? num2XL : undefined,
        trackingCode: effectiveTrackingCode,
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
        const savedTrackingCode = data?.record?.trackingCode || effectiveTrackingCode;

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
          trackingCode: savedTrackingCode,
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        });

        // 2. Cache record locally for instant table update
        try {
          const cacheKey = 'proworkflow_equipment_cache_gown';
          const cachedStr = localStorage.getItem(cacheKey);
          const cachedRecords = cachedStr ? JSON.parse(cachedStr) : [];
          const newGownItem = {
            id: data?.record?.id || `gown-${Date.now()}`,
            timestamp: new Date().toISOString(),
            date: date.trim(),
            requesterName: trimmedName,
            department: trimmedDept,
            subCategory: 'gown',
            actionType: isRequisition ? 'เบิก' : 'คืน',
            status: isRequisition ? 'เบิกแล้ว' : 'คืนแล้ว',
            itemSummary: `เสื้อกาวน์ (${totalGownPieces} ตัว)`,
            itemsList: [
              ...(numL > 0 ? [{ name: 'เสื้อกาวน์ Size L', quantity: numL, size: 'L' }] : []),
              ...(numXL > 0 ? [{ name: 'เสื้อกาวน์ Size XL', quantity: numXL, size: 'XL' }] : []),
              ...(num2XL > 0 ? [{ name: 'เสื้อกาวน์ Size 2XL', quantity: num2XL, size: '2XL' }] : []),
            ],
            totalQuantity: totalGownPieces,
            trackingCode: savedTrackingCode,
          };
          localStorage.setItem(cacheKey, JSON.stringify([newGownItem, ...cachedRecords]));
        } catch {
          // ignore
        }

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
              ) : isKeys ? (
                <Key className="w-5 h-5 stroke-[2.5]" />
              ) : activeSubCategory === 'ladder' ? (
                <Ladder className="w-5 h-5 stroke-[2.5]" />
              ) : isSoftener ? (
                <Droplets className="w-5 h-5 stroke-[2.5]" />
              ) : isCleaning ? (
                <Mop className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <Package className="w-5 h-5 stroke-[2.5]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {isGown
                    ? (language === 'th' ? 'แบบฟอร์มการเบิก-คืน เสื้อกาวน์สีกรมท่า' : 'Navy Gown Requisition & Return Form')
                    : isKeys
                    ? (language === 'th' ? 'แบบฟอร์มยืมกุญแจ แผนกธุรการลาดกระบัง 2' : 'Key Requisition Form - Ladkrabang 2')
                    : isLadder
                    ? (language === 'th' ? 'แบบฟอร์มยืมบันไดทรง A แผนกธุรการลาดกระบัง 2' : 'A-Frame Ladder Requisition Form - Ladkrabang 2')
                    : isSoftener
                    ? (language === 'th' ? 'แบบฟอร์มเบิกน้ำยาปรับผ้านุ่ม แผนกธุรการลาดกระบัง 2' : 'Fabric Softener Requisition Form - Ladkrabang 2')
                    : isCleaning
                    ? (language === 'th' ? 'แบบฟอร์มเบิกอุปกรณ์ทำความสะอาด แผนกธุรการลาดกระบัง 2' : 'Cleaning Equipment Requisition Form - Ladkrabang 2')
                    : (language === 'th' ? `เพิ่มรายการ ${currentSubCategoryName || 'เบิกอุปกรณ์'}` : `Add Requisition: ${currentSubCategoryName || 'Equipment'}`)}
                </h2>
                {!isGown && !isKeys && !isLadder && !isSoftener && !isCleaning && (
                  <span className="px-2 py-0.5 rounded-full text-2xs font-black bg-white/20 backdrop-blur-sm border border-white/30 text-white">
                    Google Form
                  </span>
                )}
              </div>
              {isGown && (
                <p className="text-xs text-rose-100/95 font-medium">
                  {language === 'th'
                    ? 'บันทึกรายการเบิกหรือคืนเสื้อกาวน์ พร้อมซิงค์เข้า Google Sheet อัตโนมัติ'
                    : 'Record requisition or return of navy gowns, auto-syncing with Google Sheet'}
                </p>
              )}
              {isKeys && (
                <p className="text-xs text-rose-100/95 font-medium">
                  {language === 'th'
                    ? 'บันทึกรายการเบิกหรือคืนกุญแจ พร้อมซิงค์เข้า Google Sheet อัตโนมัติ'
                    : 'Record borrowing or return of keys, auto-syncing with Google Sheet'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Google Sheet link in header - hidden for Gown, Keys, Ladder, Softener, and Cleaning */}
            {!isGown && !isKeys && !isLadder && !isSoftener && !isCleaning && canAccessGoogleSheet && effectiveSheetUrl && (
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

        {/* Toolbar: Completely hidden for Gown, Keys, Ladder, Softener, and Cleaning */}
        {!isGown && !isKeys && !isLadder && !isSoftener && !isCleaning && (
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
          {(activeSubCategory === 'softener' || activeSubCategory === 'cleaning') && !canAccessRestricted ? (
            <div className="text-center py-12 px-4 space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center shadow-xs">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                {language === 'th' ? 'จำกัดสิทธิ์การทำรายการ' : 'Restricted Access'}
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                {language === 'th'
                  ? `หัวข้อย่อย${activeSubCategory === 'softener' ? 'น้ำยาปรับผ้านุ่ม' : 'อุปกรณ์ทำความสะอาด'} จำกัดสิทธิ์การมองเห็นและทำรายการได้เฉพาะ ผู้ดูแล, แอดมินเพจ และผู้ที่เข้าสู่ระบบเท่านั้น`
                  : 'This section is restricted to Administrators, Page Admins, and Authenticated Users only.'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm shadow-md hover:bg-slate-800 transition-all cursor-pointer"
              >
                {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
            </div>
          ) : isGown ? (
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
                  {submittedRecord.trackingCode && (
                    <div className="py-2.5 flex items-center justify-between bg-rose-50/80 -mx-4 px-4 border-y border-rose-200">
                      <span className="text-rose-950 font-bold flex items-center gap-1.5 text-xs">
                        <Tag className="w-3.5 h-3.5 text-rose-600" />
                        {language === 'th' ? 'รหัสติดตาม (Google Sheet)' : 'Tracking Code'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-rose-800 text-sm bg-white px-2.5 py-1 rounded-lg border border-rose-300 shadow-2xs">
                          {submittedRecord.trackingCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (submittedRecord.trackingCode) {
                              navigator.clipboard.writeText(submittedRecord.trackingCode);
                              setTrackingCodeCopied(true);
                              setTimeout(() => setTrackingCodeCopied(false), 2000);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-white border border-rose-300 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                          title={language === 'th' ? 'คัดลอกรหัสติดตาม' : 'Copy tracking code'}
                        >
                          {trackingCodeCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="py-2 flex items-center justify-between text-xs text-slate-400">
                    <span>{language === 'th' ? 'เวลาบันทึก' : 'Recorded at'}</span>
                    <span>{submittedRecord.timestamp} น.</span>
                  </div>
                </div>

                {/* Actions: ทำรายการใหม่ & ปิดหน้าต่าง */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
                  {/* Google Sheet button - hidden for Gown as requested */}
                  {!isGown && canAccessGoogleSheet && effectiveSheetUrl && (
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
                      onClick={() => {
                        setActionType('เบิกเสื้อกาวน์');
                        if (!gownTrackingCode) {
                          setGownTrackingCode(generateGownTrackingCode(date));
                        }
                      }}
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
                      onChange={(e) => {
                        const newD = e.target.value;
                        setDate(newD);
                        if (actionType === 'เบิกเสื้อกาวน์') {
                          setGownTrackingCode(generateGownTrackingCode(newD));
                        }
                      }}
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

                {/* 5. Gown Tracking Code Section (สร้างรหัสติดตาม และบันทึกรหัสติดตาม ลงใน Google sheet เฉพาะเบิกเสื้อกาวน์) */}
                {actionType === 'เบิกเสื้อกาวน์' ? (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 border border-rose-200/90 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-rose-600" />
                        <span>{language === 'th' ? 'รหัสติดตาม (สร้างอัตโนมัติเฉพาะเบิกเสื้อกาวน์)' : 'Tracking Code (Gown Requisition)'}</span>
                        <span className="text-rose-600">*</span>
                      </label>
                      <span className="px-2 py-0.5 rounded-md bg-rose-100/90 text-rose-800 font-bold text-2xs border border-rose-200">
                        Google Sheet Auto-Sync
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={gownTrackingCode}
                          onChange={(e) => setGownTrackingCode(e.target.value)}
                          placeholder="LKB2 - 26092601"
                          required={actionType === 'เบิกเสื้อกาวน์'}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 focus:border-rose-600 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm font-mono font-bold bg-white text-rose-950 tracking-wider shadow-2xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(gownTrackingCode);
                          setTrackingCodeCopied(true);
                          setTimeout(() => setTrackingCodeCopied(false), 2000);
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-white border border-rose-300 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                        title={language === 'th' ? 'คัดลอกรหัสติดตาม' : 'Copy tracking code'}
                      >
                        {trackingCodeCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        <span className="hidden sm:inline">{trackingCodeCopied ? (language === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (language === 'th' ? 'คัดลอก' : 'Copy')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGownTrackingCode(generateGownTrackingCode(date))}
                        className="px-3.5 py-2.5 rounded-xl bg-white border border-rose-300 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                        title={language === 'th' ? 'สร้างรหัสใหม่' : 'Regenerate code'}
                      >
                        <RotateCw className="w-4 h-4" />
                        <span className="hidden sm:inline">{language === 'th' ? 'รีเฟรช' : 'Refresh'}</span>
                      </button>
                    </div>

                    <p className="text-2xs text-rose-800/90 leading-relaxed font-medium">
                      {language === 'th'
                        ? '💡 ระบบจะสร้างรหัสติดตามอัตโนมัติ และบันทึกลงใน Google Sheet ทันทีที่กดบันทึก (เฉพาะการเบิกเสื้อกาวน์เท่านั้น)'
                        : '💡 Tracking code will be auto-generated and saved to Google Sheet upon gown requisition.'}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/70 border border-amber-200/90 space-y-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-700" />
                      <span>{language === 'th' ? 'รหัสติดตามที่ส่งคืน (อิงตามรหัสติดตามเดิม)' : 'Tracking Code to Return (Referencing Original Code)'}</span>
                    </label>
                    <input
                      type="text"
                      value={gownTrackingCode}
                      onChange={(e) => setGownTrackingCode(e.target.value)}
                      placeholder="เช่น LKB2 - 26092601 (ถ้ามี)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-200 text-xs sm:text-sm font-mono font-bold bg-white text-slate-900 tracking-wider shadow-2xs"
                    />
                    <p className="text-2xs text-amber-900/80 font-medium leading-relaxed">
                      {language === 'th'
                        ? '💡 หากระบุรหัสติดตาม ระบบจะบันทึกรหัสนี้ลงใน Google Sheet พร้อมการคืน และอัปเดตสถานะของรายการนั้นเป็น "คืนแล้ว"'
                        : '💡 If a tracking code is specified, it will be saved to Google Sheet and set to Returned.'}
                    </p>
                  </div>
                )}

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
          ) : isKeys ? (
            /* Direct Form for Keys */
            isSubmittedSuccess && submittedKeyRecord ? (
              /* Success confirmation receipt - stays open until user clicks close */
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
                        submittedKeyRecord.actionType === 'คืน'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}
                    >
                      {submittedKeyRecord.actionType === 'คืน'
                        ? (language === 'th' ? 'คืนกุญแจ' : 'Return Key')
                        : (language === 'th' ? 'เบิกกุญแจ' : 'Borrow Key')}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'วันที่ทำรายการ' : 'Date'}</span>
                    <span className="font-bold text-slate-800">{submittedKeyRecord.date}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'ชื่อผู้เบิก-คืน' : 'Name'}</span>
                    <span className="font-black text-rose-950 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-rose-600" />
                      {submittedKeyRecord.personName}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'แผนก' : 'Department'}</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      {submittedKeyRecord.department}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'หมายเลขกุญแจ' : 'Key Numbers'}</span>
                    <span className="font-black text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-600" />
                      {submittedKeyRecord.keyNumbers}
                    </span>
                  </div>
                  {submittedKeyRecord.note && (
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">{language === 'th' ? 'หมายเหตุ' : 'Notes'}</span>
                      <span className="text-slate-700 font-medium">{submittedKeyRecord.note}</span>
                    </div>
                  )}
                  <div className="py-2 flex items-center justify-between text-xs text-slate-400">
                    <span>{language === 'th' ? 'เวลาบันทึก' : 'Recorded at'}</span>
                    <span>{submittedKeyRecord.timestamp} น.</span>
                  </div>
                </div>

                {/* Actions: ทำรายการใหม่ & ปิดหน้าต่าง */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleStartNewKeyEntry}
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
              <form onSubmit={handleKeySubmit} className="space-y-5">
                {submitError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* 1. Action Type Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {language === 'th' ? 'เลือกรูปแบบ' : 'Select Action'} <span className="text-rose-600">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setKeyActionType('เบิก')}
                      className={`p-3.5 rounded-xl border-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                        keyActionType === 'เบิก'
                          ? 'border-rose-600 bg-rose-50 text-rose-900 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Key className="w-4 h-4 text-rose-700" />
                      <span>{language === 'th' ? 'เบิก' : 'Borrow'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setKeyActionType('คืน')}
                      className={`p-3.5 rounded-xl border-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                        keyActionType === 'คืน'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Check className="w-4 h-4 text-emerald-700" />
                      <span>{language === 'th' ? 'คืน' : 'Return'}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-600" />
                    <span>{language === 'th' ? 'กรุณาระบุวันที่' : 'Date'}</span> <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white"
                  />
                </div>

                {/* 3. Requester Name with Suggestive Autocomplete */}
                <div ref={nameInputWrapperRef} className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-rose-600" />
                      <span>{language === 'th' ? 'กรุณาระบุชื่อ' : 'Name'}</span> <span className="text-rose-600">*</span>
                    </label>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={personName}
                      onChange={(e) => {
                        setPersonName(e.target.value);
                        setIsNameDropdownOpen(true);
                        setActiveSuggestionIndex(-1);
                      }}
                      onFocus={() => setIsNameDropdownOpen(true)}
                      onKeyDown={handleNameKeyDown}
                      placeholder={language === 'th' ? 'พิมพ์ชื่อ (มีระบบแนะนำอัตโนมัติ)' : 'Type name (with autocomplete)'}
                      required
                      autoComplete="off"
                      className="w-full px-3.5 py-2.5 pr-9 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white"
                    />

                    {personName.trim() ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPersonName('');
                          setIsNameDropdownOpen(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer text-xs"
                      >
                        ×
                      </button>
                    ) : (
                      <ChevronDown
                        className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none transition-transform ${
                          isNameDropdownOpen ? 'rotate-180 text-rose-600' : ''
                        }`}
                      />
                    )}

                    {/* Autocomplete dropdown */}
                    {isNameDropdownOpen && filteredNameSuggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
                        {filteredNameSuggestions.map((item, idx) => {
                          const isSelected = idx === activeSuggestionIndex;
                          const knownDept = nameDeptMap[item];
                          return (
                            <div
                              key={`${item}-${idx}`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectName(item);
                              }}
                              className={`px-3.5 py-2.5 text-xs sm:text-sm cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                                isSelected ? 'bg-rose-50 text-rose-900 font-bold' : 'hover:bg-slate-50 text-slate-700 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-2xs font-black ${
                                    isSelected ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {item.slice(0, 1)}
                                </div>
                                <span className="truncate">{renderHighlightedText(item, personName)}</span>
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

                {/* 4. Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>{language === 'th' ? 'แผนก' : 'Department'}</span> <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white appearance-none pr-9 cursor-pointer shadow-xs"
                    >
                      <option value="" disabled>
                        {language === 'th' ? '-- กรุณาเลือกแผนก --' : '-- Select Department --'}
                      </option>
                      {KEYS_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 5. หมายเลขกุญแจ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>{language === 'th' ? 'หมายเลขกุญแจ' : 'Key Numbers'}</span> <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={keyNumbers}
                    onChange={(e) => setKeyNumbers(e.target.value)}
                    placeholder={language === 'th' ? 'เช่น 17, 19 หรือ ห้องประชุม 1' : 'e.g. 17, 19 or Meeting Room 1'}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white"
                  />
                </div>

                {/* 6. หมายเหตุ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>{language === 'th' ? 'หมายเหตุ (ถ้ามี)' : 'Notes (optional)'}</span>
                  </label>
                  <input
                    type="text"
                    value={keyNote}
                    onChange={(e) => setKeyNote(e.target.value)}
                    placeholder={language === 'th' ? 'เช่น เช็คสัญญาณไวไฟ, ซ่อมระบบไฟฟ้า' : 'e.g. WiFi check, electrical repair'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white"
                  />
                </div>

                {/* 7. Live Summary Preview Card */}
                {(keyNumbers.trim() || personName.trim() || department.trim()) && (
                  <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs space-y-1.5">
                    <div className="font-bold text-amber-950 flex items-center justify-between">
                      <span>{language === 'th' ? 'ตัวอย่างข้อมูลที่จะบันทึก' : 'Preview Data'}</span>
                      <span className={`px-2 py-0.5 rounded text-2xs font-black ${
                        keyActionType === 'คืน' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                      }`}>
                        {keyActionType === 'คืน' ? 'คืนกุญแจ' : 'เบิกกุญแจ'}
                      </span>
                    </div>
                    <div className="text-slate-700 space-y-0.5 pt-1">
                      <div><span className="text-slate-500">วันที่:</span> <span className="font-medium">{date || '-'}</span></div>
                      <div><span className="text-slate-500">ผู้ทำรายการ:</span> <span className="font-bold text-slate-900">{personName || '-'}</span></div>
                      <div><span className="text-slate-500">แผนก:</span> <span className="font-medium">{department || '-'}</span></div>
                      <div><span className="text-slate-500">หมายเลขกุญแจ:</span> <span className="font-black text-amber-900">{keyNumbers || '-'}</span></div>
                      {keyNote.trim() && <div><span className="text-slate-500">หมายเหตุ:</span> <span className="font-medium">{keyNote}</span></div>}
                    </div>
                  </div>
                )}

                {/* 8. Submit Button */}
                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !keyNumbers.trim() || !personName.trim() || !department.trim()}
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
          ) : isLadder ? (
            /* Direct Form for A-Frame Ladder - matches แบบฟอร์มยืมกุญแจ แผนกธุรการลาดกระบัง 2 */
            isSubmittedSuccess && submittedLadderRecord ? (
              /* Success confirmation receipt - stays open until user clicks close */
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
                        submittedLadderRecord.actionType === 'คืน'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}
                    >
                      {submittedLadderRecord.actionType === 'คืน'
                        ? (language === 'th' ? 'คืนบันไดทรง A' : 'Return A-Frame Ladder')
                        : (language === 'th' ? 'ยืมบันไดทรง A' : 'Borrow A-Frame Ladder')}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'วันที่ทำรายการ' : 'Date'}</span>
                    <span className="font-bold text-slate-800">{submittedLadderRecord.date}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'ชื่อผู้ยืม-คืน' : 'Name'}</span>
                    <span className="font-black text-rose-950 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-rose-600" />
                      {submittedLadderRecord.personName}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'แผนก' : 'Department'}</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      {submittedLadderRecord.department}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'รายการบันไดทรง A' : 'A-Frame Ladder'}</span>
                    <span className="font-black text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5">
                      <Ladder className="w-3.5 h-3.5 text-amber-600 stroke-[2.2]" />
                      {submittedLadderRecord.ladderType}
                    </span>
                  </div>
                  <div className="py-2 flex items-center justify-between text-xs text-slate-400">
                    <span>{language === 'th' ? 'เวลาบันทึก' : 'Recorded at'}</span>
                    <span>{submittedLadderRecord.timestamp} น.</span>
                  </div>
                </div>

                {/* Actions: ทำรายการใหม่ & ปิดหน้าต่าง */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleStartNewLadderEntry}
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
              <form onSubmit={handleLadderSubmit} className="space-y-5">
                {submitError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* 1. Action Type Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {language === 'th' ? 'กรุณาเลือกการยืม - คืน' : 'Select Action'} <span className="text-rose-600">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLadderActionType('ยืม')}
                      className={`p-3.5 rounded-xl border-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                        ladderActionType === 'ยืม'
                          ? 'border-rose-600 bg-rose-50 text-rose-900 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Ladder className="w-4 h-4 text-rose-700 stroke-[2.2]" />
                      <span>{language === 'th' ? 'ยืม' : 'Borrow'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLadderActionType('คืน')}
                      className={`p-3.5 rounded-xl border-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                        ladderActionType === 'คืน'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Check className="w-4 h-4 text-emerald-700" />
                      <span>{language === 'th' ? 'คืน' : 'Return'}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-600" />
                    <span>{language === 'th' ? 'กรุณาระบุวันที่' : 'Date'}</span> <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white"
                  />
                </div>

                {/* 3. Requester Name with Suggestive Autocomplete */}
                <div ref={nameInputWrapperRef} className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-rose-600" />
                      <span>{language === 'th' ? 'กรุณาระบุชื่อ' : 'Name'}</span> <span className="text-rose-600">*</span>
                    </label>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={personName}
                      onChange={(e) => {
                        setPersonName(e.target.value);
                        setIsNameDropdownOpen(true);
                        setActiveSuggestionIndex(-1);
                      }}
                      onFocus={() => setIsNameDropdownOpen(true)}
                      onKeyDown={handleNameKeyDown}
                      placeholder={language === 'th' ? 'พิมพ์ชื่อ (มีระบบแนะนำอัตโนมัติ)' : 'Type name (with autocomplete)'}
                      required
                      autoComplete="off"
                      className="w-full px-3.5 py-2.5 pr-9 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white"
                    />

                    {personName.trim() ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPersonName('');
                          setIsNameDropdownOpen(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer text-xs"
                      >
                        ×
                      </button>
                    ) : (
                      <ChevronDown
                        className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none transition-transform ${
                          isNameDropdownOpen ? 'rotate-180 text-rose-600' : ''
                        }`}
                      />
                    )}

                    {/* Autocomplete dropdown */}
                    {isNameDropdownOpen && filteredNameSuggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
                        {filteredNameSuggestions.map((item, idx) => {
                          const isSelected = idx === activeSuggestionIndex;
                          const knownDept = nameDeptMap[item];
                          return (
                            <div
                              key={`${item}-${idx}`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectName(item);
                              }}
                              className={`px-3.5 py-2.5 text-xs sm:text-sm cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                                isSelected ? 'bg-rose-50 text-rose-900 font-bold' : 'hover:bg-slate-50 text-slate-700 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-2xs font-black ${
                                    isSelected ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {item.slice(0, 1)}
                                </div>
                                <span className="truncate">{renderHighlightedText(item, personName)}</span>
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

                {/* 4. Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>{language === 'th' ? 'แผนก' : 'Department'}</span> <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white appearance-none pr-9 cursor-pointer shadow-xs"
                    >
                      <option value="" disabled>
                        {language === 'th' ? '-- กรุณาเลือกแผนก --' : '-- Select Department --'}
                      </option>
                      {LADDER_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 5. กรุณาเลือกบันไดทรง A */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Ladder className="w-3.5 h-3.5 text-amber-600 stroke-[2.2]" />
                    <span>{language === 'th' ? 'กรุณาเลือกบันไดทรง A' : 'Select A-Frame Ladder'}</span> <span className="text-rose-600">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {LADDER_OPTIONS.map((opt) => {
                      const isSelected = selectedLadderType === opt.name;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedLadderType(opt.name)}
                          className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-2 ${
                            isSelected
                              ? 'border-rose-600 bg-rose-50/70 text-rose-950 shadow-sm ring-2 ring-rose-200/60'
                              : 'border-slate-200 bg-white hover:bg-slate-50/80 text-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  isSelected ? 'border-rose-600 bg-rose-600' : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <span className="font-bold text-xs sm:text-sm">{opt.steps}</span>
                            </div>
                            <span className={`text-2xs font-bold px-2 py-0.5 rounded-md ${
                              isSelected ? 'bg-rose-200 text-rose-900' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {opt.height}
                            </span>
                          </div>
                          <p className="text-2xs text-slate-500 font-medium leading-relaxed">
                            {opt.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6. Live Summary Preview Card */}
                {(selectedLadderType || personName.trim() || department.trim()) && (
                  <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs space-y-1.5">
                    <div className="font-bold text-amber-950 flex items-center justify-between">
                      <span>{language === 'th' ? 'ตัวอย่างข้อมูลที่จะบันทึก' : 'Preview Data'}</span>
                      <span className={`px-2 py-0.5 rounded text-2xs font-black ${
                        ladderActionType === 'คืน' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                      }`}>
                        {ladderActionType === 'คืน' ? 'คืนบันไดทรง A' : 'ยืมบันไดทรง A'}
                      </span>
                    </div>
                    <div className="text-slate-700 space-y-0.5 pt-1">
                      <div><span className="text-slate-500">วันที่:</span> <span className="font-medium">{date || '-'}</span></div>
                      <div><span className="text-slate-500">ผู้ทำรายการ:</span> <span className="font-bold text-slate-900">{personName || '-'}</span></div>
                      <div><span className="text-slate-500">แผนก:</span> <span className="font-medium">{department || '-'}</span></div>
                      <div><span className="text-slate-500">บันไดทรง A:</span> <span className="font-black text-amber-900">{selectedLadderType || '-'}</span></div>
                    </div>
                  </div>
                )}

                {/* 7. Submit Button */}
                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedLadderType.trim() || !personName.trim() || !department.trim()}
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
          ) : isSoftener ? (
            /* Softener Requisition Form */
            isSubmittedSuccess && submittedSoftenerRecord ? (
              /* Softener Success Receipt View */
              <div className="space-y-4 animate-in fade-in">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3.5">
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
                    <span className="px-3 py-1 rounded-lg font-black text-xs bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-rose-600" />
                      {language === 'th' ? 'เบิกน้ำยาปรับผ้านุ่ม' : 'Requisition Softener'}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'วันที่ทำรายการ' : 'Date'}</span>
                    <span className="font-bold text-slate-800">{submittedSoftenerRecord.date}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'ชื่อผู้เบิก (ชื่อจริง)' : 'Name'}</span>
                    <span className="font-black text-rose-950 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-rose-600" />
                      {submittedSoftenerRecord.personName}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'พื้นที่ในการใช้งาน' : 'Usage Area'}</span>
                    <span className="font-black text-rose-900 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-600" />
                      {submittedSoftenerRecord.area}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'รายการ' : 'Item'}</span>
                    <span className="font-bold text-slate-900">{submittedSoftenerRecord.item}</span>
                  </div>
                  <div className="py-2 flex items-center justify-between text-xs text-slate-400">
                    <span>{language === 'th' ? 'เวลาบันทึก' : 'Recorded at'}</span>
                    <span>{submittedSoftenerRecord.timestamp} น.</span>
                  </div>
                </div>

                {/* Actions: ทำรายการใหม่ & ปิดหน้าต่าง */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleStartNewSoftenerEntry}
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
              <form onSubmit={handleSoftenerSubmit} className="space-y-5">
                {submitError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* 1. Date */}
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

                {/* 2. Requester Name with Suggestive Autocomplete from Google Sheet column */}
                <div ref={nameInputWrapperRef} className="relative">
                  <div className="mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-rose-600" />
                      <span>{language === 'th' ? 'ชื่อผู้เบิก (ชื่อจริง)' : 'Name'}</span> <span className="text-rose-600">*</span>
                    </label>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={personName}
                      onChange={(e) => {
                        setPersonName(e.target.value);
                        setIsNameDropdownOpen(true);
                        setActiveSuggestionIndex(-1);
                      }}
                      onFocus={() => setIsNameDropdownOpen(true)}
                      onKeyDown={handleNameKeyDown}
                      placeholder={language === 'th' ? 'พิมพ์ชื่อผู้เบิก' : 'Type name'}
                      required
                      autoComplete="off"
                      list="softener-person-names-datalist"
                      className="w-full px-3.5 py-2.5 pr-14 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white"
                    />

                    {/* Toggle dropdown or clear button */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {personName.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            setPersonName('');
                            setIsNameDropdownOpen(false);
                          }}
                          className="w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer text-xs"
                          title={language === 'th' ? 'ล้างข้อความ' : 'Clear'}
                        >
                          ×
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsNameDropdownOpen((prev) => !prev)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                        title={language === 'th' ? 'แสดงรายชื่อ' : 'Toggle names'}
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isNameDropdownOpen ? 'rotate-180 text-rose-600' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Native Datalist as extra device fallback */}
                    <datalist id="softener-person-names-datalist">
                      {rememberedNames.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>

                    {/* Autocomplete dropdown from Google Sheet column */}
                    {isNameDropdownOpen && filteredNameSuggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100 animate-in fade-in duration-150">
                        <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-2xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                            <span>{language === 'th' ? 'เลือกรายชื่อ' : 'Select name'}</span>
                          </span>
                          <span className="text-2xs text-slate-400">
                            {filteredNameSuggestions.length} {language === 'th' ? 'รายชื่อ' : 'names'}
                          </span>
                        </div>

                        {filteredNameSuggestions.map((item, idx) => {
                          const isSelected = idx === activeSuggestionIndex;
                          const knownDept = nameDeptMap[item];
                          return (
                            <div
                              key={`${item}-${idx}`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectName(item);
                              }}
                              className={`px-3.5 py-2.5 text-xs sm:text-sm cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                                isSelected ? 'bg-rose-50 text-rose-900 font-bold' : 'hover:bg-slate-50 text-slate-700 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-2xs font-black ${
                                    isSelected ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600 border border-rose-200'
                                  }`}
                                >
                                  {item.slice(0, 1)}
                                </div>
                                <span className="truncate">{renderHighlightedText(item, personName)}</span>
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

                {/* 3. พื้นที่ในการใช้งาน */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    <span>{language === 'th' ? 'พื้นที่ในการใช้งาน' : 'Usage Area'}</span> <span className="text-rose-600">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {SOFTENER_AREAS.map((area) => {
                      const isSelected = selectedSoftenerArea === area;
                      return (
                        <button
                          key={area}
                          type="button"
                          onClick={() => setSelectedSoftenerArea(area)}
                          className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? 'border-rose-600 bg-rose-50/80 text-rose-950 shadow-sm ring-2 ring-rose-200'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-rose-600 bg-rose-600' : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span className="font-black text-sm">{area}</span>
                          </div>
                          <span className="text-2xs text-slate-500 font-medium">
                            {language === 'th' ? `โซน ${area}` : `Zone ${area}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. รายการที่เบิก (น้ำยาปรับผ้านุ่ม) */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                      <Droplets className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-800">
                        {language === 'th' ? 'น้ำยาปรับผ้านุ่ม' : 'Fabric Softener'}
                      </div>
                      <div className="text-2xs text-slate-500">
                        {language === 'th' ? 'จำนวน 1 รายการ' : 'Quantity: 1 item'}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    1 ถุง / แกลลอน
                  </span>
                </div>

                {/* 5. Live Summary Preview Card */}
                {(personName.trim() || selectedSoftenerArea) && (
                  <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80 text-xs space-y-1.5">
                    <div className="font-bold text-rose-950 flex items-center justify-between">
                      <span>{language === 'th' ? 'ตัวอย่างข้อมูลที่จะบันทึก' : 'Preview Data'}</span>
                      <span className="px-2 py-0.5 rounded text-2xs font-black bg-rose-100 text-rose-900 border border-rose-200">
                        {language === 'th' ? 'เบิกน้ำยาปรับผ้านุ่ม' : 'Requisition Softener'}
                      </span>
                    </div>
                    <div className="text-slate-700 space-y-0.5 pt-1">
                      <div><span className="text-slate-500">วันที่:</span> <span className="font-medium">{date || '-'}</span></div>
                      <div><span className="text-slate-500">ชื่อผู้เบิก (ชื่อจริง):</span> <span className="font-bold text-slate-900">{personName || '-'}</span></div>
                      <div><span className="text-slate-500">พื้นที่ในการใช้งาน:</span> <span className="font-black text-rose-900">{selectedSoftenerArea || '-'}</span></div>
                      <div><span className="text-slate-500">รายการ:</span> <span className="font-medium text-slate-800">น้ำยาปรับผ้านุ่ม</span></div>
                    </div>
                  </div>
                )}

                {/* 6. Submit Button */}
                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !personName.trim() || !selectedSoftenerArea.trim()}
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
          ) : isCleaning ? (
            /* Cleaning Equipment Requisition Form */
            isSubmittedSuccess && submittedCleaningRecord ? (
              /* Success Receipt View */
              <div className="space-y-4 animate-in fade-in">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3.5">
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
                    <span className="px-3 py-1 rounded-lg font-black text-xs bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1.5">
                      <Mop className="w-3.5 h-3.5 text-rose-600" />
                      {language === 'th' ? 'เบิกอุปกรณ์ทำความสะอาด' : 'Cleaning Equipment Requisition'}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'วันที่ทำรายการ' : 'Date'}</span>
                    <span className="font-bold text-slate-800">{submittedCleaningRecord.date}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{language === 'th' ? 'ชื่อผู้เบิก' : 'Name'}</span>
                    <span className="font-black text-rose-950 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-rose-600" />
                      {submittedCleaningRecord.personName}
                    </span>
                  </div>
                  <div className="py-2.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">{language === 'th' ? 'รายการอุปกรณ์ที่เบิก' : 'Requested Items'}</span>
                      <span className="text-xs font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                        {submittedCleaningRecord.items.length} {language === 'th' ? 'รายการ' : 'items'}
                      </span>
                    </div>
                    {submittedCleaningRecord.items.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {submittedCleaningRecord.items.map((item) => (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-slate-800 truncate pr-2">{item.name}</span>
                            <span className="font-bold text-rose-700 bg-white px-2.5 py-1 rounded border border-rose-200 shrink-0">
                              {item.quantity} ชิ้น
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-400 text-xs italic">
                        {language === 'th' ? 'ไม่ได้เลือกจากรายการหลัก' : 'No items from list'}
                      </div>
                    )}
                  </div>
                  {submittedCleaningRecord.other && (
                    <div className="py-2.5 flex items-start justify-between gap-3">
                      <span className="text-slate-500 font-medium shrink-0">{language === 'th' ? 'อื่นๆ (ระบุเพิ่มเติม)' : 'Other / Notes'}</span>
                      <span className="font-medium text-slate-800 text-right">{submittedCleaningRecord.other}</span>
                    </div>
                  )}
                  <div className="py-2 flex items-center justify-between text-xs text-slate-400">
                    <span>{language === 'th' ? 'เวลาบันทึก' : 'Recorded at'}</span>
                    <span>{submittedCleaningRecord.timestamp} น.</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleStartNewCleaningEntry}
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
              /* Cleaning Equipment Form */
              <form onSubmit={handleCleaningSubmit} className="space-y-5">
                {submitError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Notice banner matching Google Form description */}
                <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 font-medium leading-relaxed">
                    <p className="font-bold text-amber-950">
                      {language === 'th'
                        ? 'ข้อตกลงในการเบิกอุปกรณ์ แผนกธุรการลาดกระบัง 2'
                        : 'Requisition Notice - Ladkrabang 2'}
                    </p>
                    <p>
                      {language === 'th'
                        ? 'เลือกรายการเบิกอุปกรณ์ แผนกธุรการลาดกระบัง 2 ภายในวันศุกร์ก่อนเที่ยง เพื่อจะได้รับอุปกรณ์ในวันพฤหัสบดีอาทิตย์ถัดไป'
                        : 'Submit equipment requisition by Friday before 12:00 PM to receive items on Thursday of next week.'}
                    </p>
                  </div>
                </div>

                {/* 1. Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-600" />
                    <span>{language === 'th' ? 'ระบุวันที่' : 'Date'}</span> <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white"
                  />
                </div>

                {/* 2. Requester Name with Autocomplete */}
                <div ref={nameInputWrapperRef} className="relative">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-rose-600" />
                      <span>{language === 'th' ? 'ชื่อผู้เบิก' : 'Requester Name'}</span> <span className="text-rose-600">*</span>
                    </span>
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
                      className="w-full pl-3.5 pr-16 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white"
                    />

                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {personName && (
                        <button
                          type="button"
                          onClick={() => {
                            setPersonName('');
                            setActiveSuggestionIndex(-1);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                          title={language === 'th' ? 'ล้างข้อความ' : 'Clear'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsNameDropdownOpen((prev) => !prev)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
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

                  {/* Suggestions dropdown */}
                  {isNameDropdownOpen && filteredNameSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-rose-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-2xs font-bold text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Search className="w-3 h-3 text-slate-400" />
                          <span>{language === 'th' ? 'เลือกชื่อผู้เบิกจากระบบ' : 'Select name'}</span>
                        </span>
                        <span className="text-2xs font-normal text-slate-400">
                          {language === 'th' ? 'กดลูกศรขึ้น/ลงเพื่อเลือก' : 'Use arrow keys'}
                        </span>
                      </div>

                      {filteredNameSuggestions.map((item, idx) => {
                        const isSelected = idx === activeSuggestionIndex;
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
                                  isSelected ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600 border border-rose-200'
                                }`}
                              >
                                {item.slice(0, 1)}
                              </div>
                              <span className="truncate">{renderHighlightedText(item, personName)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Items Selection (40 Items from Google Form) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Mop className="w-3.5 h-3.5 text-rose-600" />
                      <span>{language === 'th' ? 'เลือกรายการอุปกรณ์ทำความสะอาด' : 'Select Cleaning Items'}</span>
                    </label>

                    {Object.values(cleaningSelectedItems).filter((v) => ['1', '2', '3'].includes(String(v))).length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                          {language === 'th'
                            ? `เลือกแล้ว ${Object.values(cleaningSelectedItems).filter((v) => ['1', '2', '3'].includes(String(v))).length} รายการ`
                            : `${Object.values(cleaningSelectedItems).filter((v) => ['1', '2', '3'].includes(String(v))).length} selected`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCleaningSelectedItems({})}
                          className="text-2xs text-slate-500 hover:text-rose-600 underline cursor-pointer"
                        >
                          {language === 'th' ? 'ล้างการเลือก' : 'Clear all'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={cleaningSearchQuery}
                      onChange={(e) => setCleaningSearchQuery(e.target.value)}
                      placeholder={language === 'th' ? 'ค้นหาชื่ออุปกรณ์ทำความสะอาด เช่น ไม้กวาด, ถูพื้น, น้ำยา...' : 'Search cleaning items...'}
                      className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs bg-slate-50 focus:bg-white outline-hidden font-medium"
                    />
                    {cleaningSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCleaningSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white p-1">
                    {CLEANING_FORM_ITEMS.filter((it) => {
                      if (cleaningSearchQuery.trim()) {
                        const q = cleaningSearchQuery.trim().toLowerCase();
                        return it.name.toLowerCase().includes(q);
                      }
                      return true;
                    }).length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        {language === 'th' ? 'ไม่พบรายการอุปกรณ์ที่ค้นหา' : 'No matching items found'}
                      </div>
                    ) : (
                      CLEANING_FORM_ITEMS.filter((it) => {
                        if (cleaningSearchQuery.trim()) {
                          const q = cleaningSearchQuery.trim().toLowerCase();
                          return it.name.toLowerCase().includes(q);
                        }
                        return true;
                      }).map((item) => {
                        const currentQty = cleaningSelectedItems[item.id] || '';
                        const hasSelection = ['1', '2', '3'].includes(currentQty);

                        return (
                          <div
                            key={item.id}
                            className={`p-2.5 rounded-lg flex items-center justify-between gap-3 transition-colors ${
                              hasSelection ? 'bg-rose-50/70' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-slate-800">
                                {item.name}
                              </span>
                            </div>

                            {/* Quantity buttons 1, 2, 3 */}
                            <div className="flex items-center gap-1 shrink-0">
                              {(['1', '2', '3'] as const).map((q) => {
                                const isThisQty = currentQty === q;
                                return (
                                  <button
                                    key={q}
                                    type="button"
                                    onClick={() => {
                                      setCleaningSelectedItems((prev) => {
                                        if (prev[item.id] === q) {
                                          const copy = { ...prev };
                                          delete copy[item.id];
                                          return copy;
                                        }
                                        return { ...prev, [item.id]: q };
                                      });
                                    }}
                                    className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                                      isThisQty
                                        ? 'bg-rose-600 text-white shadow-xs scale-105 ring-2 ring-rose-200'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                    title={`เลือก ${q} ชิ้น`}
                                  >
                                    {q}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 4. อื่นๆ (ระบุเพิ่มเติม) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <span>{language === 'th' ? 'อื่นๆ (ระบุเพิ่มเติม)' : 'Other / Notes (Optional)'}</span>
                  </label>
                  <input
                    type="text"
                    value={cleaningOther}
                    onChange={(e) => setCleaningOther(e.target.value)}
                    placeholder={language === 'th' ? 'ระบุรายการหรือความต้องการเพิ่มเติม (ถ้ามี)' : 'Specify other requirements if any'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs sm:text-sm outline-hidden font-medium bg-white"
                  />
                </div>

                {/* 5. Live Summary Preview Card */}
                {(personName.trim() || Object.values(cleaningSelectedItems).some((v) => ['1', '2', '3'].includes(String(v))) || cleaningOther.trim()) && (
                  <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80 text-xs space-y-1.5">
                    <div className="font-bold text-rose-950 flex items-center justify-between">
                      <span>{language === 'th' ? 'ตัวอย่างข้อมูลที่จะบันทึก' : 'Preview Data'}</span>
                      <span className="px-2 py-0.5 rounded text-2xs font-black bg-rose-100 text-rose-900 border border-rose-200">
                        {language === 'th' ? 'เบิกอุปกรณ์ทำความสะอาด' : 'Cleaning Equipment Requisition'}
                      </span>
                    </div>
                    <div className="text-slate-700 space-y-0.5 pt-1">
                      <div><span className="text-slate-500">วันที่:</span> <span className="font-medium">{date || '-'}</span></div>
                      <div><span className="text-slate-500">ชื่อผู้เบิก:</span> <span className="font-bold text-slate-900">{personName || '-'}</span></div>
                      <div>
                        <span className="text-slate-500">รายการอุปกรณ์ที่เลือก:</span>{' '}
                        <span className="font-bold text-rose-900">
                          {Object.entries(cleaningSelectedItems).filter(([_, qty]) => ['1', '2', '3'].includes(String(qty))).length > 0
                            ? Object.entries(cleaningSelectedItems)
                                .filter(([_, qty]) => ['1', '2', '3'].includes(String(qty)))
                                .map(([id, qty]) => {
                                  const it = CLEANING_FORM_ITEMS.find((x) => x.id === Number(id));
                                  return `${it ? it.name : id} (${qty} ชิ้น)`;
                                })
                                .join(', ')
                            : '-'}
                        </span>
                      </div>
                      {cleaningOther.trim() && (
                        <div><span className="text-slate-500">อื่นๆ:</span> <span className="font-medium text-slate-800">{cleaningOther}</span></div>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. Submit Button */}
                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !personName.trim() ||
                      (!Object.values(cleaningSelectedItems).some((v) => ['1', '2', '3'].includes(String(v))) && !cleaningOther.trim())
                    }
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
