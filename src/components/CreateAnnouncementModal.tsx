import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Megaphone,
  Calendar,
  Building,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Globe,
  Tag,
  Eye,
  Send,
  FileSpreadsheet,
  Settings,
  ArrowRight,
  ArrowLeft,
  ClipboardPaste,
  ShieldCheck,
  HelpCircle,
  UploadCloud,
  Upload,
  Trash2,
  HardDrive,
  FolderUp,
  FolderOpen,
  Download,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { AnnouncementItem } from '../types';
import { AdminUserAccount } from '../data/mockData';
import { SuggestiveInput } from './SuggestiveInput';
import {
  ANNOUNCEMENTS_SHEET_URL,
  ANNOUNCEMENTS_FORM_VIEW_URL,
  ANNOUNCEMENTS_FORM_EDIT_URL,
  ANNOUNCEMENTS_DRIVE_FOLDER_ID,
  ANNOUNCEMENTS_DRIVE_FOLDER_URL,
  submitAnnouncementRecord,
  extractGoogleDriveDirectImageUrl,
  getAnnouncementsWebhookUrl,
  setAnnouncementsWebhookUrl,
  AnnouncementSubmitResult,
} from '../services/googleSheetSyncService';
import { useLanguage } from '../contexts/LanguageContext';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnnouncementCreated?: (newAnnouncement: AnnouncementItem) => void;
  onRefreshFromSheet?: () => void;
  currentUser?: AdminUserAccount | null;
  isAuthenticated?: boolean;
  existingAnnouncements?: AnnouncementItem[];
}

// Popular department tags for quick selection
const POPULAR_DEPARTMENTS = [
  'ฝ่ายทรัพยากรบุคคล',
  'แผนกฝึกอบรมและสนับสนุนกิจกรรม',
  'แผนกสนับสนุนและประสานงาน',
  'แผนกวิศวกรรมพลังงาน',
  'แผนกเงินเดือนและค่าจ้าง',
  'ธุรการลาดกระบัง 2',
  'ความปลอดภัยและอาชีวอนามัย (SHE)',
  'ฝ่ายเทคโนโลยีสารสนเทศ (IT)',
  'ฝ่ายผลิต',
  'ฝ่ายประกันคุณภาพ (QA/QC)',
];

const APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script Web App for Announcements & Google Drive Auto-Upload
 * บันทึกข่าวประชาสัมพันธ์พร้อมอัปโหลดรูปภาพลง Google Drive และเขียนแถวลง Google Sheet
 * โฟลเดอร์ Google Drive: รูปภาพประกอบ (File responses)
 * ID: 1EBXWk_SpFm-cGO5M3gLszNTtAMVyGxgwx4WLTZz1zYfLZ6c3urVwrsY8lMc448XnaRzoziQb
 */
function doPost(e) {
  try {
    var ss;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (eActive) {}
    if (!ss) {
      try {
        ss = SpreadsheetApp.openById("1cfsHq0UnSl6cwUgX7DQXeyDbnwDvIb01Y3Xb01PgxyU");
      } catch (eOpen) {
        ss = SpreadsheetApp.getActiveSpreadsheet();
      }
    }
    var sheet = ss ? (ss.getSheetByName("การตอบแบบฟอร์ม 1") || ss.getSheets()[0]) : SpreadsheetApp.getActiveSheet();
    var data = {};
    
    // Parse incoming payload (JSON or Form Data)
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e.parameter) {
      data = e.parameter;
    }

    // Comprehensive multi-key field extraction (Thai & English)
    var title = data.title || data['หัวข้อ'] || data.subject || data.topic || data['ชื่อเรื่อง'] || '';
    var content = data.content || data['เนื้อหา'] || data.detail || data['รายละเอียด'] || '';
    var department = data.department || data['แผนก / ฝ่าย'] || data['แผนก'] || data['ฝ่าย'] || '';
    var startDate = data.startDate || data['วันเริ่มต้น'] || '';
    var endDate = data.endDate || data['วันสิ้นสุด'] || '';
    var imageUrl = data.imageUrl || data['รูปภาพประกอบ'] || data['รูปภาพ'] || data.image || '';
    var operatorName = data.operatorName || data['ผู้บันทึก'] || '';
    var driveUploaded = false;
    var driveFileId = '';

    // 1. Target Google Drive Folder: "รูปภาพประกอบ (File responses)"
    var TARGET_DRIVE_FOLDER_ID = "1EBXWk_SpFm-cGO5M3gLszNTtAMVyGxgwx4WLTZz1zYfLZ6c3urVwrsY8lMc448XnaRzoziQb";
    var folderIdToUse = (data.driveFolderId && String(data.driveFolderId).trim()) ? String(data.driveFolderId).trim() : TARGET_DRIVE_FOLDER_ID;

    // 2. Automatic Google Drive Upload if imageBase64 is provided
    if (data.imageBase64 && typeof data.imageBase64 === 'string' && data.imageBase64.length > 50) {
      try {
        var base64Str = data.imageBase64;
        if (base64Str.indexOf(',') > -1) {
          base64Str = base64Str.split(',')[1];
        }
        var mimeType = data.imageMimeType || 'image/jpeg';
        var fileName = data.imageFileName || ('announcement_' + new Date().getTime() + '.jpg');
        var decodedBytes = Utilities.base64Decode(base64Str);
        var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

        var folder;
        try {
          folder = DriveApp.getFolderById(folderIdToUse);
        } catch(fErr) {
          try {
            folder = DriveApp.getFolderById(TARGET_DRIVE_FOLDER_ID);
          } catch(fErr2) {
            folder = DriveApp.getRootFolder();
          }
        }

        var driveFile = folder.createFile(blob);
        // Set sharing permissions: anyone with link can view
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        driveFileId = driveFile.getId();
        imageUrl = "https://drive.google.com/file/d/" + driveFileId + "/view?usp=sharing";
        driveUploaded = true;
      } catch (driveErr) {
        // Keep existing imageUrl if drive upload fails
      }
    }

    // 3. Dynamic Column Header Mapping (alters for Google Form 7-column or manual 6-column)
    var lastCol = sheet.getLastColumn();
    var headers = [];
    if (lastCol > 0) {
      headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    }

    var now = new Date();
    var timestampStr = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear() + ' ' + 
                       ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2) + ':' + ('0' + now.getSeconds()).slice(-2);

    if (headers && headers.length > 0) {
      var normHeaders = headers.map(function(h) { return String(h || '').trim().toLowerCase(); });
      var titleIdx = -1;
      var contentIdx = -1;
      var deptIdx = -1;
      var startIdx = -1;
      var endIdx = -1;
      var imgIdx = -1;
      var timeIdx = -1;

      for (var i = 0; i < normHeaders.length; i++) {
        var h = normHeaders[i];
        if (timeIdx === -1 && (h.indexOf('เวลา') !== -1 || h.indexOf('timestamp') !== -1 || h.indexOf('ประทับ') !== -1)) timeIdx = i;
        else if (titleIdx === -1 && (h.indexOf('หัวข้อ') !== -1 || h.indexOf('title') !== -1 || h.indexOf('เรื่อง') !== -1)) titleIdx = i;
        else if (contentIdx === -1 && (h.indexOf('เนื้อหา') !== -1 || h.indexOf('content') !== -1 || h.indexOf('รายละ') !== -1)) contentIdx = i;
        else if (deptIdx === -1 && (h.indexOf('แผนก') !== -1 || h.indexOf('ฝ่าย') !== -1 || h.indexOf('department') !== -1)) deptIdx = i;
        else if (startIdx === -1 && (h.indexOf('เริ่มต้น') !== -1 || h.indexOf('start') !== -1)) startIdx = i;
        else if (endIdx === -1 && (h.indexOf('สิ้นสุด') !== -1 || h.indexOf('end') !== -1)) endIdx = i;
        else if (imgIdx === -1 && (h.indexOf('รูป') !== -1 || h.indexOf('ภาพ') !== -1 || h.indexOf('image') !== -1 || h.indexOf('แนบ') !== -1)) imgIdx = i;
      }

      // CRITICAL FOR GOOGLE FORM:
      // If timeIdx is column 0 (Google Form default), Title MUST be at column 1 (คอลัมน์ B)
      if (timeIdx === 0) {
        if (titleIdx === -1 || titleIdx === 0) titleIdx = 1;
        if (contentIdx === -1 || contentIdx <= 1) contentIdx = 2;
        if (deptIdx === -1 || deptIdx <= 2) deptIdx = 3;
        if (startIdx === -1 || startIdx <= 3) startIdx = 4;
        if (endIdx === -1 || endIdx <= 4) endIdx = 5;
        if (imgIdx === -1 || imgIdx <= 5) imgIdx = 6;
      } else {
        if (titleIdx === -1) titleIdx = 0;
        if (contentIdx === -1) contentIdx = 1;
        if (deptIdx === -1) deptIdx = 2;
        if (startIdx === -1) startIdx = 3;
        if (endIdx === -1) endIdx = 4;
        if (imgIdx === -1) imgIdx = 5;
      }

      var maxIndex = Math.max(headers.length, timeIdx === 0 ? 7 : 6);
      var rowData = new Array(maxIndex);
      for (var j = 0; j < rowData.length; j++) rowData[j] = '';

      if (timeIdx >= 0 && timeIdx < rowData.length) rowData[timeIdx] = timestampStr;
      if (titleIdx >= 0 && titleIdx < rowData.length) rowData[titleIdx] = title;
      if (contentIdx >= 0 && contentIdx < rowData.length) rowData[contentIdx] = content;
      if (deptIdx >= 0 && deptIdx < rowData.length) rowData[deptIdx] = department;
      if (startIdx >= 0 && startIdx < rowData.length) rowData[startIdx] = startDate;
      if (endIdx >= 0 && endIdx < rowData.length) rowData[endIdx] = endDate;
      if (imgIdx >= 0 && imgIdx < rowData.length) rowData[imgIdx] = imageUrl;

      sheet.appendRow(rowData);
    } else {
      // Default to Google Form 7 columns if sheet has no headers
      sheet.appendRow([
        timestampStr,
        title,
        content,
        department,
        startDate,
        endDate,
        imageUrl
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "บันทึกข้อมูลและอัปโหลดรูปเข้า Google Drive & Google Sheet สำเร็จ",
      title: title,
      imageUrl: imageUrl,
      driveUploaded: driveUploaded,
      driveFolderId: folderIdToUse,
      fileId: driveFileId
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Health-check GET endpoint for testing Webhook connection
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Google Apps Script Announcement & Drive Upload Webhook is active",
    targetDriveFolder: "1EBXWk_SpFm-cGO5M3gLszNTtAMVyGxgwx4WLTZz1zYfLZ6c3urVwrsY8lMc448XnaRzoziQb"
  })).setMimeType(ContentService.MimeType.JSON);
}`;

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({
  isOpen,
  onClose,
  onAnnouncementCreated,
  onRefreshFromSheet,
  currentUser,
  existingAnnouncements = [],
}) => {
  const { language } = useLanguage();

  // Active Tab: 'in-app' | 'webhook-setup' | 'external-links'
  const [activeTab, setActiveTab] = useState<'in-app' | 'webhook-setup' | 'external-links'>('in-app');

  // Form Fields
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [content, setContent] = useState('');

  // Department Memory & Autocomplete Suggestions
  const [savedAnnouncementDepartments, setSavedAnnouncementDepartments] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const deptSet = new Set<string>();

    // 1. Initial known departments
    POPULAR_DEPARTMENTS.forEach((d) => deptSet.add(d));

    // 2. Historical departments from existing announcements
    if (existingAnnouncements && Array.isArray(existingAnnouncements)) {
      existingAnnouncements.forEach((a) => {
        const d = (a.department || '').trim();
        if (d && d.length >= 2) deptSet.add(d);
      });
    }

    // 3. Departments from localStorage
    try {
      const saved = localStorage.getItem('proworkflow_announcement_departments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((d) => {
            if (typeof d === 'string' && d.trim()) deptSet.add(d.trim());
          });
        }
      }
    } catch {
      // ignore
    }

    setSavedAnnouncementDepartments(Array.from(deptSet));
  }, [isOpen, existingAnnouncements]);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [endDate, setEndDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [operatorName, setOperatorName] = useState(() => currentUser?.name || 'แอดมินธุรการ');

  // Image Attachment Mode & File State
  const [imageAttachmentMode, setImageAttachmentMode] = useState<'upload' | 'url'>('upload');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedImageBase64, setAttachedImageBase64] = useState<string>('');
  const [attachedImageFileName, setAttachedImageFileName] = useState<string>('');
  const [attachedImageFileSize, setAttachedImageFileSize] = useState<number>(0);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdItem, setCreatedItem] = useState<AnnouncementItem | null>(null);
  const [lastSubmitResult, setLastSubmitResult] = useState<AnnouncementSubmitResult | null>(null);
  const [pasteFormat, setPasteFormat] = useState<'google_form' | 'standard'>('google_form');
  const [isSummaryCopied, setIsSummaryCopied] = useState(false);
  const [isRowCopied, setIsRowCopied] = useState(false);
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  // Webhook State
  const [webhookUrl, setWebhookUrl] = useState(() => getAnnouncementsWebhookUrl());
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [webhookSaveNotice, setWebhookSaveNotice] = useState<string | null>(null);
  const [isDriveFolderUrlCopied, setIsDriveFolderUrlCopied] = useState(false);
  const [isInlineWebhookExpanded, setIsInlineWebhookExpanded] = useState(false);
  const [isRetryingSyncWithWebhook, setIsRetryingSyncWithWebhook] = useState(false);
  const [retrySyncError, setRetrySyncError] = useState<string | null>(null);

  // Sync operatorName if currentUser changes
  useEffect(() => {
    if (currentUser?.name && !title) {
      setOperatorName(currentUser.name);
      if (currentUser.department && !department) {
        setDepartment(currentUser.department);
      }
    }
  }, [currentUser]);

  // Sync Webhook URL from server configuration on mount
  useEffect(() => {
    fetch('/api/announcement-webhook')
      .then((res) => res.json())
      .then((data) => {
        if (data.webhookUrl && typeof data.webhookUrl === 'string' && data.webhookUrl.trim()) {
          const url = data.webhookUrl.trim();
          setWebhookUrl((prev) => {
            if (!prev) {
              setAnnouncementsWebhookUrl(url);
              return url;
            }
            return prev;
          });
        }
      })
      .catch(() => {});
  }, []);

  // Handle local image file selection with client-side auto-compression for speed & reliability
  const handleImageFilePicked = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSubmitError('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (.jpg, .jpeg, .png, .webp, .gif)');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setSubmitError('ขนาดไฟล์รูปภาพเกิน 25MB กรุณาเลือกไฟล์รูปภาพที่มีขนาดเล็กลง');
      return;
    }

    setSubmitError(null);
    setAttachedFile(file);
    setAttachedImageFileName(file.name);
    setAttachedImageFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (e) => {
      const resultStr = e.target?.result as string;
      if (!resultStr) return;

      // If file is large (> 1.2MB), scale down via canvas to ensure Google Apps Script payload fits within quota
      if (file.size > 1.2 * 1024 * 1024) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          const maxDimension = 1920;
          if (w > maxDimension || h > maxDimension) {
            if (w > h) {
              h = Math.round((h * maxDimension) / w);
              w = maxDimension;
            } else {
              w = Math.round((w * maxDimension) / h);
              h = maxDimension;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const compressedUrl = canvas.toDataURL(file.type || 'image/jpeg', 0.88);
            setAttachedImageBase64(compressedUrl);
          } else {
            setAttachedImageBase64(resultStr);
          }
        };
        img.src = resultStr;
      } else {
        setAttachedImageBase64(resultStr);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachedImage = () => {
    setAttachedFile(null);
    setAttachedImageBase64('');
    setAttachedImageFileName('');
    setAttachedImageFileSize(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Copy Google Drive Folder URL
  const handleCopyDriveFolderUrl = () => {
    navigator.clipboard.writeText(ANNOUNCEMENTS_DRIVE_FOLDER_URL);
    setIsDriveFolderUrlCopied(true);
    setTimeout(() => setIsDriveFolderUrlCopied(false), 2500);
  };

  // Download attached image to user's device for easy drag-and-drop into Google Drive
  const handleDownloadAttachedImage = () => {
    if (!attachedImageBase64) return;
    const a = document.createElement('a');
    a.href = attachedImageBase64;
    a.download = attachedImageFileName || `announcement_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Reset form
  const handleResetForm = () => {
    setTitle('');
    setContent('');
    setDepartment(currentUser?.department || '');
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setStartDate(`${y}-${m}-${d}`);
    setEndDate('');
    setHasEndDate(false);
    setImageUrl('');
    handleRemoveAttachedImage();
    setImageAttachmentMode('upload');
    setCreatedItem(null);
    setLastSubmitResult(null);
    setSubmitError(null);
    setIsSaveSuccess(false);
  };

  // Reset success state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsSaveSuccess(false);
      setSubmitError(null);
    }
  }, [isOpen]);

  // Convert input date YYYY-MM-DD to DD/MM/YYYY for Thai sheet standard
  const formatIsoToThaiSheetDate = (iso: string): string => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const month = parseInt(parts[1], 10);
      const year = parts[0];
      return `${day}/${month}/${year}`;
    }
    return iso;
  };

  // Live image preview
  const liveImageInfo = extractGoogleDriveDirectImageUrl(imageUrl);
  const displayPreviewUrl = liveImageInfo.previewUrl || imageUrl.trim();

  // Handle in-app form submission
  const handleSubmitInApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaveSuccess) {
      handleResetForm();
      onClose();
      return;
    }
    setSubmitError(null);

    if (!title.trim()) {
      setSubmitError('กรุณาระบุหัวข้อข่าวประชาสัมพันธ์');
      return;
    }
    if (!department.trim()) {
      setSubmitError('กรุณาระบุแผนก / ฝ่าย');
      return;
    }
    if (!content.trim()) {
      setSubmitError('กรุณาระบุเนื้อหาข่าวประชาสัมพันธ์');
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedStartDate = formatIsoToThaiSheetDate(startDate);
      const formattedEndDate = hasEndDate && endDate ? formatIsoToThaiSheetDate(endDate) : undefined;

      const result = await submitAnnouncementRecord({
        title: title.trim(),
        content: content.trim(),
        department: department.trim(),
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        imageUrl: imageAttachmentMode === 'url' ? (imageUrl.trim() || undefined) : undefined,
        imageBase64: imageAttachmentMode === 'upload' && attachedImageBase64 ? attachedImageBase64 : undefined,
        imageFileName: imageAttachmentMode === 'upload' ? (attachedImageFileName || undefined) : undefined,
        imageMimeType: imageAttachmentMode === 'upload' ? (attachedFile?.type || 'image/jpeg') : undefined,
        driveFolderId: ANNOUNCEMENTS_DRIVE_FOLDER_ID,
        operatorName: operatorName.trim() || undefined,
        webhookUrl: webhookUrl.trim() || undefined,
      });

      setLastSubmitResult(result);

      if (result.success && result.announcement) {
        setIsSaveSuccess(true);
        setSubmitError(null);

        // Remember department for autocomplete memory
        try {
          const cleanDept = department.trim();
          if (cleanDept) {
            const saved = localStorage.getItem('proworkflow_announcement_departments');
            const list: string[] = saved ? JSON.parse(saved) : [];
            if (!list.includes(cleanDept)) {
              list.unshift(cleanDept);
              localStorage.setItem('proworkflow_announcement_departments', JSON.stringify(list.slice(0, 100)));
            }
            setSavedAnnouncementDepartments((prev) => Array.from(new Set([cleanDept, ...prev])));
          }
        } catch {
          // ignore
        }

        if (onAnnouncementCreated) {
          onAnnouncementCreated(result.announcement);
        }

        // Delay closing so the user clearly sees the button change to "บันทึกเรียบร้อย"
        setTimeout(() => {
          handleResetForm();
          onClose();
        }, 1500);
      } else {
        setSubmitError(result.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
        setIsSaveSuccess(false);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setIsSaveSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle saving Webhook URL
  const handleSaveWebhook = async () => {
    const cleanUrl = webhookUrl.trim();
    setAnnouncementsWebhookUrl(cleanUrl);
    try {
      await fetch('/api/announcement-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: cleanUrl }),
      });
    } catch {
      // ignore
    }
    setWebhookSaveNotice('บันทึก Webhook URL สำเร็จเรียบร้อย (ซิงค์ทั่วทั้งระบบ)');
    setTimeout(() => setWebhookSaveNotice(null), 3000);
  };

  // Retry sending the newly created announcement to Google Sheet via Webhook
  const handleRetrySyncWithWebhook = async (customUrl?: string) => {
    const urlToUse = (customUrl || webhookUrl).trim();
    if (!urlToUse || !urlToUse.startsWith('http')) {
      setRetrySyncError('กรุณากรอก Webhook URL ให้ถูกต้อง (ขึ้นต้นด้วย https://)');
      return;
    }
    if (!createdItem) return;

    setIsRetryingSyncWithWebhook(true);
    setRetrySyncError(null);
    try {
      setWebhookUrl(urlToUse);
      setAnnouncementsWebhookUrl(urlToUse);

      const formattedStartDate = formatIsoToThaiSheetDate(startDate);
      const formattedEndDate = hasEndDate && endDate ? formatIsoToThaiSheetDate(endDate) : undefined;

      const result = await submitAnnouncementRecord({
        title: createdItem.title,
        content: createdItem.content,
        department: createdItem.department,
        startDate: createdItem.startDate || formattedStartDate,
        endDate: createdItem.endDate || formattedEndDate,
        imageUrl: createdItem.imageUrl,
        imageBase64: attachedImageBase64 || undefined,
        imageFileName: attachedImageFileName || undefined,
        driveFolderId: ANNOUNCEMENTS_DRIVE_FOLDER_ID,
        operatorName: operatorName.trim() || undefined,
        webhookUrl: urlToUse,
      });

      setLastSubmitResult(result);
      if (result.googleSheetSynced) {
        if (onRefreshFromSheet) {
          onRefreshFromSheet().catch(() => {});
        }
      } else {
        setRetrySyncError(result.error || 'ไม่สามารถส่งข้อมูลเข้า Google Sheet ได้ กรุณาตรวจสอบสิทธิ์การแชร์ของ Apps Script Webhook');
      }
    } catch (err: any) {
      setRetrySyncError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsRetryingSyncWithWebhook(false);
    }
  };

  // Handle testing Webhook
  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      setWebhookTestResult({ success: false, message: 'กรุณาระบุ URL ของ Google Apps Script Webhook ก่อนทำการทดสอบ' });
      return;
    }
    setIsTestingWebhook(true);
    setWebhookTestResult(null);
    try {
      const res = await fetch('/api/announcement-webhook-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWebhookTestResult({ success: true, message: 'เชื่อมต่อสำเร็จ! Webhook ตอบรับปกติ' });
      } else {
        setWebhookTestResult({ success: false, message: data.error || 'Webhook ไม่ตอบรับ' });
      }
    } catch (err: any) {
      setWebhookTestResult({ success: false, message: err.message || 'ไม่สามารถเชื่อมต่อกับ Webhook ได้' });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  // Copy Sheet Row TSV Helper (supports Google Form 7-column and Standard 6-column)
  const handleCopySheetRow = (formatOverride?: 'google_form' | 'standard') => {
    if (!createdItem) return;
    const formatToUse = formatOverride || pasteFormat;
    if (formatOverride) setPasteFormat(formatOverride);

    let rowText = '';
    if (formatToUse === 'google_form') {
      if (lastSubmitResult?.googleFormRowTsv) {
        rowText = lastSubmitResult.googleFormRowTsv;
      } else {
        const now = new Date();
        const timestampStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        rowText = [
          timestampStr,
          createdItem.title,
          createdItem.content.replace(/\n/g, ' '),
          createdItem.department,
          createdItem.startDate,
          createdItem.endDate || '',
          createdItem.rawImageUrl || createdItem.imageUrl || '',
        ].join('\t');
      }
    } else {
      rowText =
        lastSubmitResult?.sheetRowTsv ||
        [
          createdItem.title,
          createdItem.content.replace(/\n/g, ' '),
          createdItem.department,
          createdItem.startDate,
          createdItem.endDate || '',
          createdItem.rawImageUrl || createdItem.imageUrl || '',
        ].join('\t');
    }

    navigator.clipboard.writeText(rowText);
    setIsRowCopied(true);
    setTimeout(() => setIsRowCopied(false), 3000);
  };

  // 1-Click: Copy row and open Google Sheet in new tab to paste
  const handleOpenSheetAndPaste = (formatOverride?: 'google_form' | 'standard') => {
    handleCopySheetRow(formatOverride);
    window.open(ANNOUNCEMENTS_SHEET_URL, '_blank', 'noopener,noreferrer');
  };

  // Copy Summary text
  const handleCopySummary = () => {
    if (!createdItem) return;
    const summary = `📢 ข่าวประชาสัมพันธ์: ${createdItem.title}\n🏢 แผนก/ฝ่าย: ${createdItem.department}\n📅 วันที่: ${createdItem.startDate}${createdItem.endDate ? ` ถึง ${createdItem.endDate}` : ''}\n📝 เนื้อหา: ${createdItem.content}`;
    navigator.clipboard.writeText(summary);
    setIsSummaryCopied(true);
    setTimeout(() => setIsSummaryCopied(false), 2500);
  };

  // Copy Apps Script code
  const handleCopyAppsScriptCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setIsCodeCopied(true);
    setTimeout(() => setIsCodeCopied(false), 2500);
  };

  // Handle Manual Refresh
  const handleTriggerRefresh = async () => {
    setIsRefreshing(true);
    setRefreshNotice(null);
    try {
      if (onRefreshFromSheet) {
        await onRefreshFromSheet();
      }
      setRefreshNotice('รีเฟรชข้อมูลจาก Google Sheet สำเร็จเรียบร้อย');
      setTimeout(() => setRefreshNotice(null), 4000);
    } catch {
      setRefreshNotice('เกิดข้อผิดพลาดในการรีเฟรช');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isOpen) return null;

  const isWebhookConnected = !!webhookUrl.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden my-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Gradient Header */}
        <div className="relative px-5 sm:px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner shrink-0">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>{language === 'th' ? 'เพิ่มข่าวประชาสัมพันธ์' : 'New Announcement'}</span>
                </h2>
              </div>
              <p className="text-xs text-blue-100/90 font-medium">
                {language === 'th'
                  ? 'สร้างและเผยแพร่ข่าวสารประชาสัมพันธ์ของโรงงาน'
                  : 'Create and publish factory announcements'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* ปุ่ม ตั้งค่าเชื่อมต่อ Google sheet (Icon only on header) */}
            <button
              type="button"
              id="btn-header-webhook-setup"
              onClick={() => setActiveTab(activeTab === 'webhook-setup' ? 'in-app' : 'webhook-setup')}
              className={`relative p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                activeTab === 'webhook-setup'
                  ? 'bg-white text-emerald-800 border-white shadow-md'
                  : 'bg-white/10 hover:bg-white/25 text-white/90 hover:text-white border-white/20'
              }`}
              title={language === 'th' ? 'ตั้งค่าเชื่อมต่อ Google Sheet' : 'Google Sheet Setup'}
              aria-label={language === 'th' ? 'ตั้งค่าเชื่อมต่อ Google Sheet' : 'Google Sheet Setup'}
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span
                className={`absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-indigo-900 ${
                  isWebhookConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
            </button>

            {/* ปุ่ม ลิงก์ภายนอก (Icon only on header) */}
            <button
              type="button"
              id="btn-header-external-links"
              onClick={() => setActiveTab(activeTab === 'external-links' ? 'in-app' : 'external-links')}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                activeTab === 'external-links'
                  ? 'bg-white text-purple-800 border-white shadow-md'
                  : 'bg-white/10 hover:bg-white/25 text-white/90 hover:text-white border-white/20'
              }`}
              title={language === 'th' ? 'ลิงก์ภายนอก' : 'External Links'}
              aria-label={language === 'th' ? 'ลิงก์ภายนอก' : 'External Links'}
            >
              <ExternalLink className="w-5 h-5" />
            </button>

            {/* Close Button */}
            <button
              type="button"
              id="btn-close-create-announcement-modal"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/25 text-white/90 hover:text-white transition-all border border-white/20 cursor-pointer ml-0.5 sm:ml-1"
              aria-label={language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              title={language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Main Announcement Form & Result Screen */}
          {activeTab === 'in-app' && (
            <div>
            {createdItem ? (
                /* Success Screen with Direct Google Sheet Action */
                <div className="py-4 px-2 sm:px-6 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-emerald-100 border-2 border-emerald-300 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                      {lastSubmitResult?.googleSheetSynced
                        ? 'บันทึกและส่งข้อมูลเข้า Google Sheet สำเร็จ!'
                        : 'บันทึกข้อมูลข่าวประชาสัมพันธ์เรียบร้อยแล้ว!'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
                      {lastSubmitResult?.googleSheetSynced
                        ? 'ข้อมูลถูกส่งเข้าสู่ Google Sheet ผ่าน Apps Script Webhook และอัปเดตลงระบบเรียบร้อยแล้ว'
                        : 'ข้อมูลถูกบันทึกและแสดงผลในระบบเรียบร้อยแล้ว'}
                    </p>
                  </div>

                  {/* Immediate Alert and Solutions if Not Yet Synced to Google Sheet */}
                  {!lastSubmitResult?.googleSheetSynced && (
                    <div className="bg-amber-50/95 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 text-left max-w-xl mx-auto space-y-3.5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <span className="text-xs sm:text-sm font-black text-amber-950 block">
                            ข้อมูลแสดงในระบบแล้ว แต่ยังไม่ได้บันทึกลง Google Sheet
                          </span>
                          <p className="text-xs text-amber-900 leading-relaxed">
                            ระบบบันทึกข่าวสารในระบบเรียบร้อยแล้ว หากต้องการให้แถวข้อมูลนี้บันทึกลงใน Google Sheet ด้วย คุณสามารถทำได้ทันทีผ่าน 2 ช่องทางด้านล่าง:
                          </p>
                        </div>
                      </div>

                      {/* Method 1: Instant Webhook Retry Input */}
                      <div className="bg-white rounded-xl p-3.5 border border-amber-200 space-y-2">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">1</span>
                            <span>วิธีที่ 1: ส่งเข้า Google Sheet ทันทีด้วย Apps Script Webhook</span>
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="url"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://script.google.com/macros/s/.../exec"
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            disabled={isRetryingSyncWithWebhook}
                            onClick={() => handleRetrySyncWithWebhook()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            {isRetryingSyncWithWebhook ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>กำลังส่ง...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                <span>ส่งเข้า Sheet ตอนนี้</span>
                              </>
                            )}
                          </button>
                        </div>
                        {retrySyncError && (
                          <div className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{retrySyncError}</span>
                          </div>
                        )}
                      </div>

                      {/* Method 2: 1-Click Copy & Open Sheet */}
                      <div className="bg-white rounded-xl p-3.5 border border-amber-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">2</span>
                            <span>วิธีที่ 2: คัดลอกแถวข้อมูลแล้วเปิด Google Sheet เพื่อวาง (Paste)</span>
                          </span>
                          <span className="text-[11px] text-slate-500 block mt-0.5 ml-6">
                            ระบบจะคัดลอกแถวข้อมูลลงคลิปบอร์ดและเปิดหน้า Google Sheet ให้ทันที
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenSheetAndPaste('google_form')}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all shrink-0 cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                          <span>คัดลอก & เปิด Sheet</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Google Drive Status & Target Folder */}
                  {lastSubmitResult?.driveUploaded ? (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl p-4 text-left max-w-xl mx-auto space-y-2.5 shadow-sm">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-emerald-950">รูปภาพถูกบันทึกเข้า Google Drive เรียบร้อยแล้ว!</span>
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                                รูปภาพประกอบ (File responses)
                              </span>
                            </div>
                            <p className="text-[11px] text-emerald-700 mt-0.5">
                              ไฟล์ถูกส่งขึ้น Google Drive และสร้างลิงก์สำหรับเปิดดูรูปภาพในระบบอัตโนมัติ
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          {lastSubmitResult?.driveUrl && (
                            <a
                              href={lastSubmitResult.driveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>ดูรูปภาพ</span>
                            </a>
                          )}
                          <a
                            href={ANNOUNCEMENTS_DRIVE_FOLDER_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold shadow-xs transition-all"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
                            <span>เปิดโฟลเดอร์</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (attachedImageBase64 || createdItem?.rawImageUrl || createdItem?.imageUrl) ? (
                    <div className="bg-amber-50/90 border-2 border-amber-300/90 rounded-2xl p-4 text-left max-w-xl mx-auto space-y-3 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                          <HardDrive className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-amber-950">บันทึกข้อมูลข่าวสารแล้ว แต่รูปภาพยังไม่ได้อยู่ใน Google Drive</span>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200">
                              ต้องนำรูปเข้า Drive
                            </span>
                          </div>
                          <p className="text-xs text-amber-900 leading-relaxed">
                            ระบบบันทึกข่าวสารในระบบเรียบร้อยแล้ว หากยังไม่ได้เชื่อมต่อ Google Apps Script Webhook เพื่ออัปโหลดอัตโนมัติ คุณสามารถนำรูปภาพเข้าสู่ Google Drive ได้ทันที:
                          </p>
                        </div>
                      </div>

                      {/* Folder Link & Download Action */}
                      <div className="bg-white rounded-xl p-3 border border-amber-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-slate-700 block">โฟลเดอร์ Google Drive ปลายทาง:</span>
                          <span className="text-xs font-black text-blue-700 truncate block">รูปภาพประกอบ (File responses)</span>
                          <a
                            href={ANNOUNCEMENTS_DRIVE_FOLDER_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-blue-600 hover:underline truncate block"
                          >
                            {ANNOUNCEMENTS_DRIVE_FOLDER_URL}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                          <a
                            href={ANNOUNCEMENTS_DRIVE_FOLDER_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex-1 sm:flex-none cursor-pointer"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>เปิดโฟลเดอร์ใน Drive</span>
                          </a>
                          {attachedImageBase64 && (
                            <button
                              type="button"
                              onClick={handleDownloadAttachedImage}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition-all flex-1 sm:flex-none cursor-pointer"
                              title="ดาวน์โหลดรูปภาพที่แนบลงเครื่องเพื่อนำไปลากใส่โฟลเดอร์ Drive"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>ดาวน์โหลดรูป</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleCopyDriveFolderUrl}
                            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 transition-all cursor-pointer"
                            title="คัดลอกลิงก์โฟลเดอร์ Google Drive"
                          >
                            {isDriveFolderUrlCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 text-left max-w-xl mx-auto space-y-2 shadow-xs">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <FolderOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-slate-900">โฟลเดอร์ Google Drive:</span>
                              <span className="text-xs font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                                รูปภาพประกอบ (File responses)
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              โฟลเดอร์จัดเก็บรูปภาพประกอบข่าวสารของระบบ
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <a
                            href={ANNOUNCEMENTS_DRIVE_FOLDER_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>เปิดโฟลเดอร์ใน Drive</span>
                          </a>
                          <button
                            type="button"
                            onClick={handleCopyDriveFolderUrl}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-xs transition-all cursor-pointer"
                          >
                            {isDriveFolderUrlCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PROMINENT GOOGLE SHEET FAST-PASTE BOX (Form & Standard Formats) */}
                  <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-300/80 rounded-2xl p-4 sm:p-5 text-left max-w-xl mx-auto space-y-3 shadow-sm">
                    {/* Header & Format Switcher */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/70 pb-2.5">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                        <span className="text-xs sm:text-sm font-black text-emerald-950">
                          แถวข้อมูลสำหรับนำไปวางใน Google Sheet:
                        </span>
                      </div>
                      
                      {/* Format Switcher Pills */}
                      <div className="flex items-center bg-emerald-100/70 p-0.5 rounded-xl text-[11px] font-bold self-start sm:self-auto border border-emerald-300/60">
                        <button
                          type="button"
                          onClick={() => setPasteFormat('google_form')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                            pasteFormat === 'google_form'
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'text-emerald-900 hover:bg-emerald-200/50'
                          }`}
                        >
                          <span>Google Form (7 คอลัมน์)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPasteFormat('standard')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                            pasteFormat === 'standard'
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'text-emerald-900 hover:bg-emerald-200/50'
                          }`}
                        >
                          <span>ชีตทั่วไป (6 คอลัมน์)</span>
                        </button>
                      </div>
                    </div>

                    {/* Columns breakdown */}
                    <div className="bg-white rounded-xl p-3 border border-emerald-200 text-xs space-y-2.5">
                      {pasteFormat === 'google_form' ? (
                        <>
                          <div className="flex items-center justify-between gap-1 text-[11px]">
                            <span className="font-black text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>รูปแบบ Google Form: คอลัมน์ [B] คือหัวข้อข่าวสาร</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                              คอลัมน์ A ถึง G
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-[10px] font-black text-slate-500 uppercase block">[A] ประทับเวลา</span>
                              <span className="font-semibold text-slate-700 text-[11px] truncate block">Auto Timestamp</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-emerald-100/70 border border-emerald-300">
                              <span className="text-[10px] font-black text-emerald-800 uppercase block">[B] หัวข้อข่าวสาร</span>
                              <span className="font-black text-emerald-950 text-[11px] truncate block">{createdItem.title}</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-[10px] font-black text-slate-500 uppercase block">[C] เนื้อหา</span>
                              <span className="font-semibold text-slate-700 text-[11px] truncate block">{createdItem.content}</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-[10px] font-black text-slate-500 uppercase block">[D] แผนก / ฝ่าย</span>
                              <span className="font-semibold text-slate-700 text-[11px] truncate block">{createdItem.department}</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-[10px] font-black text-slate-500 uppercase block">[E] วันเริ่มต้น</span>
                              <span className="font-semibold text-slate-700 text-[11px] truncate block">{createdItem.startDate}</span>
                            </div>
                            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-[10px] font-black text-slate-500 uppercase block">[G] รูปภาพ (Drive)</span>
                              <span className="font-semibold text-slate-700 text-[11px] truncate block">
                                {createdItem.rawImageUrl || createdItem.imageUrl ? 'ลิงก์รูปภาพ' : 'ไม่มี'}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-1 text-[11px]">
                            <span className="font-black text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>รูปแบบชีตทั่วไป: เริ่มต้นคอลัมน์ [A] หัวข้อข่าวสาร</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                              คอลัมน์ A ถึง F
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200">
                              <span className="text-[10px] font-black text-emerald-800 uppercase block">[A] หัวข้อข่าวสาร</span>
                              <span className="font-bold text-slate-900 line-clamp-1">{createdItem.title}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-[10px] font-black text-slate-600 uppercase block">[C] แผนก / ฝ่าย</span>
                              <span className="font-bold text-slate-800 line-clamp-1">{createdItem.department}</span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* TSV preview line */}
                      <div className="text-[11px] text-slate-600 font-mono bg-slate-50 p-2 rounded-lg border border-slate-200 overflow-x-auto whitespace-pre">
                        {pasteFormat === 'google_form'
                          ? (lastSubmitResult?.googleFormRowTsv || [
                              'Timestamp',
                              createdItem.title,
                              createdItem.content.replace(/\n/g, ' '),
                              createdItem.department,
                              createdItem.startDate,
                              createdItem.endDate || '',
                              createdItem.rawImageUrl || createdItem.imageUrl || '',
                            ].join('\t'))
                          : (lastSubmitResult?.sheetRowTsv || [
                              createdItem.title,
                              createdItem.content.replace(/\n/g, ' '),
                              createdItem.department,
                              createdItem.startDate,
                              createdItem.endDate || '',
                              createdItem.rawImageUrl || createdItem.imageUrl || '',
                            ].join('\t'))}
                      </div>
                    </div>

                    {/* Direct Action Buttons for Google Sheet */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {/* Button 1: Copy Row TSV */}
                      <button
                        type="button"
                        id="btn-copy-sheet-row"
                        onClick={() => handleCopySheetRow()}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs ${
                          isRowCopied
                            ? 'bg-emerald-700 text-white'
                            : 'bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300'
                        }`}
                      >
                        {isRowCopied ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-300" />
                            <span>คัดลอกแถวข้อมูลแล้ว!</span>
                          </>
                        ) : (
                          <>
                            <ClipboardPaste className="w-4 h-4 text-emerald-600" />
                            <span>
                              คัดลอกแถว {pasteFormat === 'google_form' ? 'Google Form (7 คอลัมน์)' : 'ชีตทั่วไป (6 คอลัมน์)'}
                            </span>
                          </>
                        )}
                      </button>

                      {/* Button 2: Open Google Sheet & Auto-Copy to Paste */}
                      <button
                        type="button"
                        id="btn-open-sheet-to-paste"
                        onClick={() => handleOpenSheetAndPaste()}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer text-center"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>เปิด Sheet เพื่อวาง (Ctrl+V)</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-emerald-800/90 leading-relaxed font-sans">
                      💡 <strong>ตำแหน่งคอลัมน์:</strong> {pasteFormat === 'google_form' ? (
                        <>คอลัมน์ A คือเวลา และ<strong>คอลัมน์ B คือหัวข้อข่าวสาร (&quot;{createdItem.title}&quot;)</strong> ตรงตามแบบฟอร์ม Google Form พอดี 100%</>
                      ) : (
                        <>คอลัมน์ A คือหัวข้อข่าวสาร (&quot;{createdItem.title}&quot;) เริ่มต้นที่คอลัมน์แรก</>
                      )}
                    </p>
                  </div>

                  {/* Summary Card Preview */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left max-w-xl mx-auto space-y-2.5 shadow-inner">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                        {createdItem.department}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {createdItem.startDate}
                        {createdItem.endDate ? ` - ${createdItem.endDate}` : ''}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-black text-slate-900 text-sm sm:text-base line-clamp-2">{createdItem.title}</h4>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed whitespace-pre-line">
                        {createdItem.content}
                      </p>
                    </div>

                    {createdItem.imageUrl && (
                      <div className="pt-2 border-t border-slate-200">
                        <img
                          src={createdItem.imageUrl}
                          alt="preview"
                          className="h-24 w-full object-cover rounded-xl border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCopySummary}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
                    >
                      {isSummaryCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{isSummaryCopied ? 'คัดลอกข้อความแล้ว' : 'คัดลอกข้อความสรุป'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{language === 'th' ? 'เพิ่มข่าวประชาสัมพันธ์ใหม่อีก' : 'Add Another'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-800 text-white hover:bg-slate-900 shadow-xs transition-all cursor-pointer"
                    >
                      <span>{language === 'th' ? 'เสร็จสิ้น / ปิดหน้าต่าง' : 'Done / Close'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* In-App Form */
                <form onSubmit={handleSubmitInApp} className="space-y-4">
                  {submitError && (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Title Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-800 tracking-wide uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span>หัวข้อข่าวประชาสัมพันธ์</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </span>
                      <span className="text-[11px] font-normal text-slate-400">{title.length}/150 ตัวอักษร</span>
                    </label>
                    <input
                      type="text"
                      id="input-announcement-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={150}
                      placeholder="เช่น ประกาศวันหยุดตามประเพณีประจำปี, Healthy Minds at Work, ประมวลภาพกิจกรรม..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden"
                      required
                    />
                  </div>

                  {/* Department Field with Autocomplete Memory */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-800 tracking-wide uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-indigo-600" />
                        <span>แผนก / ฝ่ายที่ออกประกาศ</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </span>
                    </label>
                    <SuggestiveInput
                      id="input-announcement-department"
                      value={department}
                      onChange={(val) => setDepartment(val)}
                      suggestions={savedAnnouncementDepartments}
                      placeholder="พิมพ์พยัญชนะ/ตัวอักษรเพื่อค้นหา หรือเลือกจากแผนกที่บันทึกไว้"
                      accentColor="indigo"
                      required
                      inputClassName="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden pr-16 bg-white"
                    />
                  </div>

                  {/* Content Field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-800 tracking-wide uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span>เนื้อหาข่าวประชาสัมพันธ์</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </span>
                      <span className="text-[11px] font-normal text-slate-400">{content.length} ตัวอักษร</span>
                    </label>
                    <textarea
                      id="input-announcement-content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={4}
                      placeholder="ระบุรายละเอียดข่าวสาร กิจกรรม วัตถุประสงค์ หรือสิ่งที่พนักงานต้องทราบ..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden resize-y leading-relaxed"
                      required
                    />
                  </div>

                  {/* Date Range Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Start Date */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-800 tracking-wide uppercase flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <span>วันเริ่มต้นประชาสัมพันธ์</span>
                        <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="date"
                        id="input-announcement-startdate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 text-sm font-medium text-slate-900 transition-all"
                        required
                      />
                    </div>

                    {/* End Date (Optional) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-800 tracking-wide uppercase flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>วันสิ้นสุด (ถ้ามี)</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasEndDate}
                            onChange={(e) => {
                              setHasEndDate(e.target.checked);
                              if (!e.target.checked) setEndDate('');
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <span className="text-[11px] font-semibold text-slate-600">มีวันสิ้นสุด</span>
                        </label>
                      </div>
                      <input
                        type="date"
                        id="input-announcement-enddate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        disabled={!hasEndDate}
                        className={`w-full px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                          hasEndDate
                            ? 'border-slate-300 bg-white text-slate-900 focus:border-indigo-500'
                            : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Image Attachment & Drive Upload Section */}
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-black text-slate-800 tracking-wide uppercase flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-indigo-600" />
                        <span>รูปภาพประกอบข่าวสาร (บันทึกเข้า Google Drive)</span>
                        <span className="text-slate-400 font-normal text-[11px]">(ไม่บังคับ)</span>
                      </label>

                      {/* Mode Toggle Switcher */}
                      <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-[11px] font-bold self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setImageAttachmentMode('upload')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                            imageAttachmentMode === 'upload'
                              ? 'bg-white text-indigo-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <HardDrive className="w-3.5 h-3.5" />
                          <span>แนบจากเครื่อง (เข้า Drive)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageAttachmentMode('url')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                            imageAttachmentMode === 'url'
                              ? 'bg-white text-indigo-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>ระบุ URL / ลิงก์ Drive</span>
                        </button>
                      </div>
                    </div>

                    {/* Mode 1: Local File Upload to Google Drive */}
                    {imageAttachmentMode === 'upload' && (
                      <div className="space-y-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          id="input-file-announcement-image"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleImageFilePicked(e.target.files[0]);
                            }
                          }}
                        />

                        {!attachedImageBase64 ? (
                          /* Dropzone */
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsDraggingImage(true);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              setIsDraggingImage(false);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsDraggingImage(false);
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleImageFilePicked(e.dataTransfer.files[0]);
                              }
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all ${
                              isDraggingImage
                                ? 'border-indigo-500 bg-indigo-50/80 scale-[0.99]'
                                : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/20'
                            }`}
                          >
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-2.5 shadow-xs">
                              <UploadCloud className="w-6 h-6" />
                            </div>
                            <p className="text-xs sm:text-sm font-black text-slate-800">
                              คลิกเพื่อแนบรูปภาพจากเครื่อง หรือลากไฟล์มาวางที่นี่
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1">
                              รองรับ .JPG, .PNG, .WEBP (เมื่อกดบันทึก รูปภาพจะถูกส่งไปเก็บใน Google Drive โฟลเดอร์ <strong>&quot;รูปภาพประกอบ (File responses)&quot;</strong> ให้อัตโนมัติ)
                            </p>
                            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all">
                                <FolderUp className="w-3.5 h-3.5 text-indigo-600" />
                                <span>เลือกรูปภาพจากเครื่อง</span>
                              </div>
                              <a
                                href={ANNOUNCEMENTS_DRIVE_FOLDER_URL}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all border border-blue-200"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>ดูโฟลเดอร์ใน Drive</span>
                              </a>
                            </div>
                          </div>
                        ) : (
                          /* Selected Image Card */
                          <div className="p-3.5 bg-white rounded-xl border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={attachedImageBase64}
                                alt="preview"
                                className="h-16 w-20 object-cover rounded-lg border border-slate-200 bg-slate-100 shrink-0"
                              />
                              <div className="space-y-0.5 min-w-0">
                                <span className="font-bold text-xs text-slate-900 line-clamp-1 block">
                                  {attachedImageFileName || 'รูปภาพประกอบ'}
                                </span>
                                <div className="flex items-center gap-2 text-[11px] flex-wrap">
                                  <span className="text-slate-400">
                                    {Math.round(attachedImageFileSize / 1024)} KB
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <HardDrive className="w-3 h-3 text-emerald-600" />
                                    <span>บันทึกลงโฟลเดอร์ รูปภาพประกอบ (File responses)</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center shrink-0">
                              <a
                                href={ANNOUNCEMENTS_DRIVE_FOLDER_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-all cursor-pointer"
                                title="เปิดโฟลเดอร์ Google Drive เพื่อดูหรือลากไฟล์ใส่"
                              >
                                <FolderOpen className="w-3.5 h-3.5" />
                                <span>เปิด Drive</span>
                              </a>
                              <button
                                type="button"
                                onClick={handleDownloadAttachedImage}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                                title="ดาวน์โหลดรูปภาพเก็บไว้ในเครื่อง"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>ดาวน์โหลด</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                              >
                                เปลี่ยนรูป
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveAttachedImage}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                                title="ลบรูปภาพ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Webhook Auto-Drive Upload Status */}
                        {isWebhookConnected && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                            <span className="flex items-center gap-1.5 font-bold text-emerald-800">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>ระบบพร้อมอัปโหลดรูปภาพเข้า Google Drive อัตโนมัติเมื่อกดบันทึก</span>
                            </span>
                            <span className="text-[10px] text-emerald-600 font-mono bg-emerald-100/80 px-2 py-0.5 rounded-md">
                              Webhook เชื่อมต่อแล้ว
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mode 2: Direct URL / Google Drive Link */}
                    {imageAttachmentMode === 'url' && (
                      <div className="space-y-2.5">
                        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5 text-xs text-slate-700">
                          <span className="font-black text-blue-950 block flex items-center gap-1.5">
                            <FolderOpen className="w-4 h-4 text-blue-600" />
                            <span>วิธีนำรูปภาพจาก Google Drive มาแสดง:</span>
                          </span>
                          <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                            <li>คลิกปุ่ม <strong>&quot;เปิดโฟลเดอร์ใน Drive&quot;</strong> ด้านบน แล้วอัปโหลดหรือเลือกรูปในโฟลเดอร์</li>
                            <li>คลิกขวาที่รูปภาพใน Drive &gt; เลือก <strong>&quot;แชร์&quot;</strong> &gt; <strong>&quot;คัดลอกลิงก์&quot;</strong></li>
                            <li>นำลิงก์มาวางในช่องด้านล่างนี้ ระบบจะแปลงเป็นภาพพรีวิวทันที</li>
                          </ol>
                        </div>

                        <input
                          type="url"
                          id="input-announcement-imageurl"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="วางลิงก์ เช่น https://drive.google.com/file/d/... หรือ URL รูปภาพ"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium text-slate-900 transition-all outline-hidden bg-white"
                        />
                        <p className="text-[11px] text-slate-500">
                          💡 รองรับลิงก์ Google Drive โดยตรง ระบบจะแปลงเป็นรูปภาพพรีวิวให้อัตโนมัติ
                        </p>

                        {/* Image Live Preview */}
                        {displayPreviewUrl && (
                          <div className="mt-2 p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={displayPreviewUrl}
                                alt="preview"
                                className="h-16 w-24 object-cover rounded-lg border border-slate-300 bg-white shrink-0"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                              <div className="text-xs text-slate-700 min-w-0">
                                <span className="font-bold flex items-center gap-1 text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>พบรูปภาพพรีวิว</span>
                                </span>
                                <span className="text-[11px] text-slate-500 truncate max-w-xs block mt-0.5">{imageUrl}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setImageUrl('')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                              title="ล้าง URL"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Operator Info */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                    <span className="flex items-center gap-1">
                      <span>ผู้บันทึก:</span>
                      <strong className="text-slate-800">{operatorName}</strong>
                    </span>
                    <span className="text-slate-400">สถานะ: จะเปิดให้แสดงทันที (Active)</span>
                  </div>

                  {/* Success Notice */}
                  {isSaveSuccess && (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>บันทึกข้อมูลข่าวประชาสัมพันธ์เรียบร้อยแล้ว</span>
                    </div>
                  )}

                  {/* Form Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
                    >
                      ยกเลิก
                    </button>

                    <button
                      type="submit"
                      id="btn-submit-announcement"
                      disabled={isSubmitting}
                      className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isSaveSuccess
                          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30'
                          : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>กำลังบันทึกข้อมูล...</span>
                        </>
                      ) : isSaveSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>บันทึกเรียบร้อย</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>บันทึกข้อมูล</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: Google Apps Script Webhook Setup */}
          {activeTab === 'webhook-setup' && (
            <div className="space-y-5">
              {/* Back to Form Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('in-app')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-indigo-600" />
                  <span>{language === 'th' ? 'กลับสู่แบบฟอร์มเพิ่มข่าว' : 'Back to Announcement Form'}</span>
                </button>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {language === 'th' ? 'การตั้งค่า Google Sheet' : 'Google Sheet Setup'}
                </span>
              </div>

              {/* Sheet Card */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-emerald-950">Google Sheet ข่าวประชาสัมพันธ์</h4>
                    <p className="text-xs text-emerald-700">ปลายทางข้อมูล: 1cfsHq0UnSl6cwUgX7DQXeyDbnwDvIb01Y3Xb01PgxyU (gid=1228686844)</p>
                  </div>
                </div>
                <a
                  href={ANNOUNCEMENTS_SHEET_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all shrink-0 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิด Google Sheet</span>
                </a>
              </div>

              {/* Webhook URL Input Section */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wide flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-emerald-600" />
                      <span>Google Apps Script Webhook URL (สำหรับบันทึกลง Sheet อัตโนมัติ)</span>
                    </span>
                    {isWebhookConnected && (
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        เชื่อมต่อแล้ว
                      </span>
                    )}
                  </label>
                  <p className="text-xs text-slate-500">
                    นำ Web App URL ที่ได้จากการ Deploy Google Apps Script ใน Google Sheet มาวางที่นี่
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    id="input-announcement-webhook-url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-xs sm:text-sm font-mono text-slate-800 transition-all outline-hidden bg-white"
                  />

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      id="btn-save-announcement-webhook"
                      onClick={handleSaveWebhook}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
                    >
                      บันทึก URL
                    </button>

                    <button
                      type="button"
                      id="btn-test-announcement-webhook"
                      onClick={handleTestWebhook}
                      disabled={isTestingWebhook || !webhookUrl.trim()}
                      className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isTestingWebhook ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                      ) : (
                        'ทดสอบ'
                      )}
                    </button>
                  </div>
                </div>

                {webhookSaveNotice && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-in fade-in">
                    {webhookSaveNotice}
                  </div>
                )}

                {webhookTestResult && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs font-bold animate-in fade-in flex items-center gap-2 ${
                      webhookTestResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {webhookTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{webhookTestResult.message}</span>
                  </div>
                )}
              </div>

              {/* 3-Step Setup Instructions */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>วิธีตั้งค่า Google Apps Script (บันทึกข้อมูลเข้า Sheet และอัปโหลดรูปภาพลง Google Drive อัตโนมัติ):</span>
                </h4>

                <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1">
                  <span className="font-black flex items-center gap-1.5 text-indigo-950">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    ฟีเจอร์สำคัญของสคริปต์นี้:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-indigo-800 font-medium">
                    <li><strong>ป้องกันข้อมูลหัวข้อหาย:</strong> ระบบจะค้นหาคอลัมน์ <em>&quot;หัวข้อ&quot; / &quot;Title&quot;</em> ใน Google Sheet อัตโนมัติ เพื่อวางข้อมูลลงในช่องที่ถูกต้อง 100%</li>
                    <li><strong>อัปโหลดรูปภาพเข้า Google Drive อัตโนมัติ:</strong> เมื่อแนบรูปภาพจากเครื่อง สคริปต์จะสร้างไฟล์ลงใน Google Drive และนำลิงก์มาบันทึกลงในคอลัมน์รูปภาพของ Google Sheet ให้ทันที</li>
                  </ul>
                </div>

                <ol className="text-xs text-slate-600 space-y-2.5 list-decimal list-inside leading-relaxed">
                  <li>
                    เปิด <strong>Google Sheet ข่าวประชาสัมพันธ์1</strong> แล้วไปที่เมนู{' '}
                    <strong className="text-slate-900">ส่วนขยาย (Extensions)</strong> &gt;{' '}
                    <strong className="text-slate-900">Apps Script</strong>
                  </li>
                  <li>
                    ลบโค้ดเดิมทั้งหมดออก แล้วคัดลอกโค้ด Apps Script ด้านล่างไปวางแทนที่
                  </li>
                  <li>
                    กดปุ่ม <strong className="text-slate-900">ทำให้ใช้งานได้ (Deploy)</strong> &gt;{' '}
                    <strong className="text-slate-900">การทำให้ใช้งานได้ใหม่ (New deployment)</strong>
                  </li>
                  <li>
                    เลือกประเภทเป็น <strong className="text-slate-900">เว็บแอป (Web app)</strong> และตั้งค่า{' '}
                    <strong className="text-emerald-700">&quot;ใครมีสิทธิ์เข้าถึง (Who has access)&quot;</strong> เป็น{' '}
                    <strong className="text-emerald-700">&quot;ทุกคน (Anyone)&quot;</strong>
                  </li>
                  <li>
                    คัดลอก <strong>URL เว็บแอป</strong> ที่ได้ มาวางในช่อง Webhook URL ด้านบน แล้วกด <strong>&quot;บันทึก URL&quot;</strong>
                  </li>
                </ol>

                {/* Code Box */}
                <div className="relative mt-2">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 rounded-t-xl text-white text-[11px] font-mono">
                    <span>Code.gs</span>
                    <button
                      type="button"
                      onClick={handleCopyAppsScriptCode}
                      className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                      {isCodeCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCodeCopied ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ด'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-b-xl text-[11px] font-mono overflow-x-auto leading-relaxed max-h-48">
                    {APPS_SCRIPT_TEMPLATE}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: External Links (Form & Sheet) */}
          {activeTab === 'external-links' && (
            <div className="space-y-4">
              {/* Back to Form Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('in-app')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-indigo-600" />
                  <span>{language === 'th' ? 'กลับสู่แบบฟอร์มเพิ่มข่าว' : 'Back to Announcement Form'}</span>
                </button>
                <span className="text-xs font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                  {language === 'th' ? 'ลิงก์ภายนอก' : 'External Links'}
                </span>
              </div>

              <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border-2 border-purple-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-purple-950">ลิงก์ Google Sheet & Form ทางการ</h4>
                    <p className="text-xs text-slate-600">ท่านสามารถเปิดทำรายการหรือเข้าดูข้อมูลโดยตรงบน Google ได้</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <a
                    href={ANNOUNCEMENTS_SHEET_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>เปิด Google Sheet (ตารางข้อมูล)</span>
                  </a>

                  <a
                    href={ANNOUNCEMENTS_FORM_VIEW_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>เปิด Google Form (แบบฟอร์มส่ง)</span>
                  </a>
                </div>
              </div>

              {/* Manual Refresh Trigger */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h5 className="text-xs sm:text-sm font-bold text-indigo-950">
                    เพิ่มข้อมูลใน Google Sheet หรือ Google Form แล้ว?
                  </h5>
                  <p className="text-[11px] text-indigo-700">
                    กดปุ่มนี้เพื่อดึงข้อมูลล่าสุดจาก Google Sheet เข้าสู่หน้าข่าวประชาสัมพันธ์ทันที
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-refresh-announcements-from-sheet"
                  onClick={handleTriggerRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'กำลังรีเฟรชข้อมูล...' : 'รีเฟรชข้อมูลจาก Sheet'}</span>
                </button>
              </div>

              {refreshNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center animate-in fade-in">
                  {refreshNotice}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ระบบซิงก์ข้อมูล Google Sheet ข่าวประชาสัมพันธ์</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg font-bold text-slate-600 hover:bg-slate-200 text-xs transition-all cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
