import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { 
  Camera, 
  QrCode, 
  X, 
  CheckCircle2, 
  Package, 
  Inbox, 
  Send, 
  RefreshCw, 
  Sparkles, 
  Building2, 
  Clock, 
  Upload, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  FlipHorizontal, 
  FileText, 
  Check, 
  ExternalLink,
  PackageCheck,
  Search,
  Zap,
  Info
} from 'lucide-react';
import { ParcelDeliveryRecord } from '../types';
import { 
  submitParcelDeliveryRecord, 
  formatCurrentThaiParcelTimestamp,
  PARCEL_SHEET_URL,
  getLocalParcelRecords
} from '../services/googleSheetSyncService';
import { AdminUserAccount } from '../data/mockData';
import { useLanguage } from '../contexts/LanguageContext';

interface ParcelScanReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRecords: ParcelDeliveryRecord[];
  currentUser?: AdminUserAccount | null;
  onReceiveSuccess: (receivedRecord: ParcelDeliveryRecord) => void;
  initialParcel?: ParcelDeliveryRecord | null;
  onParcelDetected?: (record: ParcelDeliveryRecord, trackingCode: string) => void;
}

type ScanStep = 'scanning' | 'details' | 'success';

export const ParcelScanReceiveModal: React.FC<ParcelScanReceiveModalProps> = ({
  isOpen,
  onClose,
  existingRecords,
  currentUser,
  onReceiveSuccess,
  initialParcel,
  onParcelDetected,
}) => {
  const { language } = useLanguage();

  // Current Step in the Workflow: scanning -> details -> success
  const [currentStep, setCurrentStep] = useState<ScanStep>('scanning');
  
  // Camera & Scanner States
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [isProcessingFrame, setIsProcessingFrame] = useState<boolean>(false);
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [manualCodeError, setManualCodeError] = useState<string | null>(null);
  const [isScanningActive, setIsScanningActive] = useState<boolean>(true);

  // Scanned / Target Parcel Data
  const [scannedRawData, setScannedRawData] = useState<string>('');
  const [extractedTrackingCode, setExtractedTrackingCode] = useState<string>('');
  const [targetParcel, setTargetParcel] = useState<ParcelDeliveryRecord | null>(null);

  // Receiving Form States
  const [receiverName, setReceiverName] = useState<string>('');
  const [receiverDepartment, setReceiverDepartment] = useState<string>('');
  const [receiverNote, setReceiverNote] = useState<string>('');
  const [isSubmittingReceive, setIsSubmittingReceive] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Success Confirmation State
  const [completedRecord, setCompletedRecord] = useState<ParcelDeliveryRecord | null>(null);
  const [receiveTimestamp, setReceiveTimestamp] = useState<string>('');

  // Refs for Camera & Canvas
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Beep Audio Feedback using Web Audio API
  const playSuccessBeep = useCallback(() => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.12); // High chime
      
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.18);

      // Trigger light haptic vibration if available
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([80, 40, 80]);
      }
    } catch {
      // Audio might be muted by browser policy
    }
  }, []);

  // Initialize and stop camera stream
  const stopCameraStream = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  // Helper to extract tracking code from QR raw text
  const extractCodeFromRawText = useCallback((raw: string): string => {
    const text = (raw || '').trim();
    if (!text) return '';

    // Check if it's a URL with ?track=... or ?tracking=...
    try {
      if (text.includes('?') && (text.includes('track=') || text.includes('tracking='))) {
        const queryPart = text.split('?')[1] || '';
        const params = new URLSearchParams(queryPart);
        const code = params.get('track') || params.get('tracking');
        if (code) return code.trim();
      }
    } catch {
      // ignore URL parsing error
    }

    // Check for "LKB2 - YYMMDDXX" pattern
    const lkbMatch = text.match(/LKB2\s*[-_]?\s*(\d{8})/i);
    if (lkbMatch) {
      return `LKB2 - ${lkbMatch[1]}`;
    }

    // Check for general LKB2-xxxxx
    const generalLkbMatch = text.match(/LKB2\s*[-_]?\s*([A-Za-z0-9]+)/i);
    if (generalLkbMatch) {
      return `LKB2 - ${generalLkbMatch[1]}`;
    }

    // Return trimmed text
    return text;
  }, []);

  // Look up parcel in existing records
  const lookupParcel = useCallback((trackingCodeOrRaw: string): ParcelDeliveryRecord | null => {
    if (!trackingCodeOrRaw) return null;
    const cleanSearch = trackingCodeOrRaw.replace(/[\s\-_]/g, '').toLowerCase();

    const isMatch = (rec: ParcelDeliveryRecord) => {
      const rCode = (rec.trackingCode || '').replace(/[\s\-_]/g, '').toLowerCase();
      const rId = (rec.id || '').replace(/[\s\-_]/g, '').toLowerCase();
      return Boolean(
        (rCode && (rCode === cleanSearch || rCode.includes(cleanSearch) || cleanSearch.includes(rCode))) ||
        (rId && (rId === cleanSearch || rId.includes(cleanSearch)))
      );
    };

    // 1. Check in existingRecords
    let found = existingRecords.find(isMatch);
    if (found) return found;

    // 2. Check in local storage saved records
    try {
      const localRecords = getLocalParcelRecords();
      found = localRecords.find(isMatch);
      if (found) return found;
    } catch {}

    // 3. Partial match if ends with sequence (e.g. sequence number 01, 02)
    if (cleanSearch.length >= 2) {
      const seqMatch = cleanSearch.slice(-2);
      const parsedSeq = parseInt(seqMatch, 10);
      if (!isNaN(parsedSeq) && parsedSeq > 0) {
        const seqFound = existingRecords.find((r) => r.seq === parsedSeq && r.actionType === 'ส่ง');
        if (seqFound) return seqFound;
      }
    }

    return null;
  }, [existingRecords]);

  // Handle successful QR detection
  const handleDetectedQr = useCallback((rawText: string) => {
    if (!isScanningActive) return;
    setIsScanningActive(false);
    playSuccessBeep();

    setScannedRawData(rawText);
    const code = extractCodeFromRawText(rawText);
    setExtractedTrackingCode(code);
    setManualCodeInput(code); // Put tracking code into the search input box

    // Look up parcel record
    const matched = lookupParcel(code) || lookupParcel(rawText);
    if (matched) {
      setTargetParcel(matched);
      // Leave receiver info blank for user to fill in manually
      setReceiverName('');
      setReceiverDepartment('');
      if (onParcelDetected) {
        onParcelDetected(matched, code);
      }
    } else {
      // Create a sensible projected parcel object for unrecorded / external packages
      const fallbackParcel: ParcelDeliveryRecord = {
        id: `scanned-${Date.now()}`,
        seq: existingRecords.length + 1,
        timestamp: formatCurrentThaiParcelTimestamp(),
        actionType: 'ส่ง',
        senderName: 'ผู้ส่งภายนอก / ผู้จัดส่งพัสดุ',
        senderDepartment: 'ขนส่งพัสดุ / ไปรษณีย์',
        recipientName: 'ผู้รับเอกสาร / พัสดุ',
        recipientDepartment: 'ลาดกระบัง 2',
        itemTitle: `เอกสาร / พัสดุ (${code || 'รหัสสแกน'})`,
        operatorName: 'ระบบสแกนรับ',
        operatorDepartment: 'ธุรการ',
        trackingCode: code || rawText,
        status: 'รอดำเนินการลงรับ'
      };
      setTargetParcel(fallbackParcel);
      setReceiverName('');
      setReceiverDepartment('');
    }

    // Move to details step
    setCurrentStep('details');
  }, [isScanningActive, playSuccessBeep, extractCodeFromRawText, lookupParcel, currentUser, existingRecords.length, onParcelDetected]);

  // Start Camera Stream
  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setHasCameraPermission(false);
      setCameraError('เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้อง (WebRTC Camera not supported)');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        await videoRef.current.play();

        // Check if torch/flashlight is supported on the video track
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          try {
            const capabilities = (videoTrack as any).getCapabilities?.() || {};
            setTorchAvailable(Boolean(capabilities.torch));
          } catch {
            setTorchAvailable(false);
          }
        }

        // Start scanning loop
        setIsScanningActive(true);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setHasCameraPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('กรุณาอนุญาตการเข้าถึงกล้องในการตั้งค่าของเบราว์เซอร์ เพื่อสแกน QR Code');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('ไม่พบอุปกรณ์กล้องบนอุปกรณ์นี้ สามารถเลือกอัปโหลดรูปภาพ QR Code หรือกรอกรหัสด้วยตนเองได้');
      } else {
        setCameraError(err.message || 'ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบการอนุญาตสิทธิ์');
      }
    }
  }, [facingMode, stopCameraStream]);

  // QR Scanning Loop using requestAnimationFrame & jsQR
  useEffect(() => {
    if (currentStep !== 'scanning' || !isOpen || !isScanningActive) {
      return;
    }

    let isScanningLoopActive = true;

    const scanFrame = () => {
      if (!isScanningLoopActive || !isScanningActive) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data && code.data.trim().length > 0) {
              isScanningLoopActive = false;
              handleDetectedQr(code.data);
              return;
            }
          } catch (e) {
            // ignore scan frame error
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(scanFrame);

    return () => {
      isScanningLoopActive = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [currentStep, isOpen, isScanningActive, handleDetectedQr]);

  // Synchronize initialParcel if passed from outside
  useEffect(() => {
    if (isOpen) {
      if (initialParcel) {
        setTargetParcel(initialParcel);
        setReceiverName('');
        setReceiverDepartment('');
        setReceiverNote('');
        setExtractedTrackingCode(initialParcel.trackingCode || '');
        setCurrentStep('details');
      } else {
        setTargetParcel(null);
        setScannedRawData('');
        setExtractedTrackingCode('');
        setReceiverName('');
        setReceiverDepartment('');
        setReceiverNote('');
        setCurrentStep('scanning');
        setIsScanningActive(true);
      }
    }
  }, [isOpen, initialParcel, currentUser]);

  // Manage camera on modal open/close or step change
  useEffect(() => {
    if (isOpen && currentStep === 'scanning') {
      startCameraStream();
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, currentStep, startCameraStream, stopCameraStream]);

  // Toggle Flashlight/Torch
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const nextTorch = !torchOn;
      await (videoTrack as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Toggle Camera Facing Mode (Front / Back)
  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Handle Photo/Image Upload for QR Code scanning
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = img.width;
        offscreenCanvas.height = img.height;
        const ctx = offscreenCanvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        try {
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data) {
            handleDetectedQr(code.data);
          } else {
            alert('ไม่พบ QR Code ในรูปภาพที่อัปโหลด กรุณาลองเลือกรูปภาพที่ชัดเจนขึ้น หรือสแกนผ่านกล้อง');
          }
        } catch {
          alert('ไม่สามารถประมวลผลรูปภาพได้');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Manual Code Submit
  const handleManualSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setManualCodeError(null);
    const code = manualCodeInput.trim();
    if (!code) {
      setManualCodeError('กรุณากรอกรหัสติดตามหรือเลขพัสดุ');
      return;
    }
    handleDetectedQr(code);
  };

  // Reset to Scan Another
  const handleScanAnother = () => {
    setTargetParcel(null);
    setScannedRawData('');
    setExtractedTrackingCode('');
    setReceiverName('');
    setReceiverDepartment('');
    setReceiverNote('');
    setSubmitError(null);
    setCompletedRecord(null);
    setIsScanningActive(true);
    setCurrentStep('scanning');
  };

  // Action: "กดรับเอกสาร / พัสดุ" (Confirm Receipt and sync with Google Sheet)
  const handleConfirmReceive = async () => {
    if (!targetParcel) return;
    setIsSubmittingReceive(true);
    setSubmitError(null);

    const nowTs = formatCurrentThaiParcelTimestamp(new Date());

    try {
      // 1. Prepare Google Sheet Submission Payload (actionType: 'รับ')
      const payload = {
        timestamp: nowTs,
        actionType: 'รับ' as const,
        senderName: targetParcel.senderName || 'ผู้ส่งตามหน้าซอง',
        senderDepartment: targetParcel.senderDepartment || 'ทั่วไป',
        recipientName: receiverName.trim() || targetParcel.recipientName || 'ธุรการ',
        recipientDepartment: receiverDepartment.trim() || targetParcel.recipientDepartment || 'ธุรการลาดกระบัง 2',
        itemTitle: targetParcel.itemTitle || 'เอกสาร / พัสดุ',
        operatorName: currentUser?.name || currentUser?.username || 'ธุรการลาดกระบัง 2',
        operatorDepartment: 'ธุรการลาดกระบัง 2',
        trackingCode: targetParcel.trackingCode || extractedTrackingCode,
      };

      // 2. Submit to Server API (/api/parcel-submit) which automatically writes to Google Form & Sheet
      const res = await submitParcelDeliveryRecord(payload);

      if (res.success && res.record) {
        const finalizedRecord: ParcelDeliveryRecord = {
          ...res.record,
          status: 'รับเอกสารสำเร็จเรียบร้อยแล้ว',
          note: receiverNote.trim() || undefined,
        };

        setCompletedRecord(finalizedRecord);
        setReceiveTimestamp(nowTs);
        setCurrentStep('success');

        // Notify parent view to reload / refresh list
        onReceiveSuccess(finalizedRecord);
      } else {
        setSubmitError(res.error || 'ไม่สามารถบันทึกลง Google Sheet ได้ กรุณาตรวจสอบการเชื่อมต่อ');
      }
    } catch (err: any) {
      console.error('Error in handleConfirmReceive:', err);
      setSubmitError(err.message || 'เกิดข้อผิดพลาดในการบันทึกรับเอกสาร');
    } finally {
      setIsSubmittingReceive(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-pink-100 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden Canvas for QR frame extraction */}
        <canvas ref={canvasRef} className="hidden" />
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
          accept="image/*" 
          className="hidden" 
        />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-md shadow-inner">
              <Camera className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>ไอคอน QR Code รับเอกสาร / พัสดุ</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold border border-white/30">
                  {currentStep === 'scanning' ? 'กล้องพร้อมสแกน' : currentStep === 'details' ? 'หน้าต่างข้อมูล' : 'รับสำเร็จ'}
                </span>
              </h3>
              <p className="text-xs text-pink-100/90 mt-0.5">
                {currentStep === 'scanning' 
                  ? 'ส่องกล้องไปยัง QR Code เพื่ออ่านรหัสและดึงข้อมูลอัตโนมัติ' 
                  : currentStep === 'details'
                  ? 'ตรวจสอบข้อมูลก่อนกดลงรับเอกสาร / พัสดุ'
                  : 'บันทึกข้อมูลลง Google Sheet อัตโนมัติเรียบร้อยแล้ว'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: STEP 1 - SCANNING */}
        {currentStep === 'scanning' && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* Live Camera Viewfinder */}
            <div className="relative rounded-3xl overflow-hidden bg-black aspect-[4/3] sm:aspect-[16/11] flex items-center justify-center border-2 border-pink-200 dark:border-pink-900 shadow-inner group">
              {/* Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Aiming Reticle & Scanning Beam */}
              {hasCameraPermission !== false && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
                  {/* Outer Dimmed Mask */}
                  <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-pink-400/80 rounded-2xl shadow-2xl">
                    {/* Glowing corners */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg shadow-sm" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg shadow-sm" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg shadow-sm" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg shadow-sm" />

                    {/* Animated Scanning Laser Line */}
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-rose-400 to-transparent shadow-[0_0_12px_#f43f5e] animate-[bounce_2.4s_ease-in-out_infinite]" />

                    {/* Center Targeting Dot */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-40">
                      <div className="w-3 h-3 rounded-full border border-white" />
                    </div>
                  </div>

                  {/* Status Overlay Badge */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold border border-white/20 flex items-center gap-2 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>กำลังสแกนหากล่องหรือรหัส QR Code...</span>
                  </div>
                </div>
              )}

              {/* Camera Controls Overlay (Top Right of viewfinder) */}
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                {torchAvailable && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    className={`p-2.5 rounded-full backdrop-blur-md transition-all cursor-pointer border ${
                      torchOn 
                        ? 'bg-amber-400 text-slate-900 border-amber-300 shadow-lg' 
                        : 'bg-black/50 hover:bg-black/70 text-white border-white/20'
                    }`}
                    title={torchOn ? 'ปิดไฟแฟลช' : 'เปิดไฟแฟลช'}
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all cursor-pointer border border-white/20"
                  title="สลับกล้องหน้า/หลัง"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Camera Error / Permission Blocked Message */}
              {(cameraError || hasCameraPermission === false) && (
                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm p-6 flex flex-col items-center justify-center text-center text-white space-y-3 z-20">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-base text-rose-200">
                    ไม่สามารถเปิดใช้งานกล้องได้
                  </h4>
                  <p className="text-xs text-slate-300 max-w-sm leading-relaxed">
                    {cameraError || 'กรุณาอนุญาตการเข้าถึงกล้อง หรือใช้วิธีอัปโหลดรูปภาพ QR Code หรือพิมพ์รหัสติดตามด้านล่าง'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={startCameraStream}
                      className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      ลองใหม่อีกครั้ง
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      เลือกรูปภาพ QR Code
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Bar: Upload Image & Manual Code Entry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Upload QR Image Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3 rounded-2xl border border-pink-200 dark:border-slate-700 bg-pink-50/50 dark:bg-slate-800/60 hover:bg-pink-100/60 dark:hover:bg-slate-700 text-pink-700 dark:text-pink-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                <span>อัปโหลดรูปภาพ QR Code จากมือถือ</span>
              </button>

              {/* Sample / Test Demo Code Helper */}
              {existingRecords.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const latest = existingRecords.find(r => r.trackingCode) || existingRecords[0];
                    if (latest) {
                      handleDetectedQr(latest.trackingCode || `LKB2 - 26091201`);
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  title="ทดสอบด้วยข้อมูลพัสดุล่าสุดในระบบ"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>ทดสอบสแกน (ใช้รายการในระบบ)</span>
                </button>
              )}
            </div>

            {/* Manual Code Input Bar */}
            <form onSubmit={handleManualSearch} className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={manualCodeInput}
                    onChange={(e) => {
                      setManualCodeInput(e.target.value);
                      if (manualCodeError) setManualCodeError(null);
                    }}
                    placeholder="หรือพิมพ์รหัสติดตาม เช่น LKB2 - 26091201..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-pink-600 dark:hover:bg-pink-700 text-white text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs"
                >
                  ค้นหา
                </button>
              </div>
              {manualCodeError && (
                <p className="text-[11px] text-rose-500 font-semibold mt-1.5 ml-1">
                  {manualCodeError}
                </p>
              )}
            </form>
          </div>
        )}

        {/* Modal Body: STEP 2 - PARCEL DETAILS & CONFIRM RECEIPT */}
        {currentStep === 'details' && targetParcel && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* Scanned Success Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900 border-2 border-emerald-200 dark:border-emerald-800/60 flex items-start justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    ✓ ตรวจพบข้อมูลจาก QR Code
                  </span>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    พร้อมสำหรับการกดลงรับเอกสาร / พัสดุ
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={handleScanAnother}
                className="text-xs text-pink-600 dark:text-pink-400 hover:underline font-bold transition-colors cursor-pointer shrink-0"
              >
                สแกนใหม่
              </button>
            </div>

            {/* Tracking Code Badge */}
            {targetParcel.trackingCode && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">รหัสติดตาม:</span>
                  <span className="font-mono font-black text-sm text-rose-700 dark:text-rose-300 tracking-wider">
                    {targetParcel.trackingCode}
                  </span>
                </div>
              </div>
            )}

            {/* Scanned Item Details Card */}
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              {/* Item Title */}
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                  <FileText className="w-3.5 h-3.5 text-pink-500" />
                  ชื่อเอกสาร / พัสดุ
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white">
                  {targetParcel.itemTitle}
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-700" />

              {/* Sender Box */}
              <div>
                <div className="bg-rose-50/60 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 mb-1">
                    <Send className="w-3.5 h-3.5" />
                    ผู้ส่งตามหน้าซอง
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {targetParcel.senderName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    {targetParcel.senderDepartment}
                  </div>
                </div>
              </div>

              {/* Dispatch timestamp */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  วันที่ส่งออกเดิม:
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {targetParcel.timestamp}
                </span>
              </div>
            </div>

            {/* Receiving Information Form (ข้อมูลผู้กดลงรับเอกสาร / พัสดุ) */}
            <div className="bg-pink-50/50 dark:bg-pink-950/20 rounded-2xl p-4 border border-pink-100 dark:border-pink-900/40 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-pink-700 dark:text-pink-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                ข้อมูลผู้กดลงรับเอกสาร / พัสดุ
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Receiver Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อผู้รับ / ผู้ลงรับ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="กรอกชื่อผู้รับ / ผู้ลงรับ"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-pink-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                {/* Receiver Department */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    แผนกที่รับมอบ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={receiverDepartment}
                    onChange={(e) => setReceiverDepartment(e.target.value)}
                    placeholder="กรอกแผนกที่รับมอบ"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-pink-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Error Message if any */}
            {submitError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Action Buttons: "กดรับ เอกสาร / พัสดุ" */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleConfirmReceive}
                disabled={isSubmittingReceive || !receiverName.trim() || !receiverDepartment.trim()}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingReceive ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>กำลังบันทึกลง Google Sheet และอัปเดตสถานะ...</span>
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-5 h-5" />
                    <span>กดรับ เอกสาร / พัสดุ</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>ระบบจะส่งคำตอบเข้า Google Form และบันทึกแถวใหม่ใน Google Sheet อัตโนมัติ</span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body: STEP 3 - SUCCESS RECEIPT SCREEN */}
        {currentStep === 'success' && completedRecord && (
          <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-5 text-center">
            {/* Celebration Icon */}
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 animate-bounce">
              <Check className="w-9 h-9 stroke-[3]" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 mb-2">
                ✓ รับเอกสารสำเร็จเรียบร้อยแล้ว
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                บันทึกการรับเอกสาร / พัสดุ สำเร็จ!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                ข้อมูลการรับพัสดุถูกส่งไปยัง Google Sheet และบันทึกในระบบเรียบร้อยแล้ว
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 text-left space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  ใบยืนยันการรับเอกสาร / พัสดุ
                </div>
                {completedRecord.trackingCode && (
                  <span className="font-mono text-xs font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/60">
                    {completedRecord.trackingCode}
                  </span>
                )}
              </div>

              <div>
                <div className="text-xs text-slate-400">ชื่อเอกสาร / พัสดุ:</div>
                <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {completedRecord.itemTitle}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-slate-400">ผู้ส่ง:</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{completedRecord.senderName}</div>
                  <div className="text-slate-400 text-[11px]">({completedRecord.senderDepartment})</div>
                </div>
                <div>
                  <div className="text-slate-400">ผู้ลงรับ:</div>
                  <div className="font-semibold text-emerald-700 dark:text-emerald-400">{completedRecord.recipientName}</div>
                  <div className="text-slate-400 text-[11px]">({completedRecord.recipientDepartment})</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-400">วันและเวลาที่ลงรับ:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {receiveTimestamp || completedRecord.timestamp}
                </span>
              </div>
            </div>

            {/* Google Sheet Direct Link */}
            <div className="flex items-center justify-center">
              <a
                href={PARCEL_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-bold"
              >
                <span>เปิดดูตารางใน Google Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Success Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleScanAnother}
                className="w-full py-3 px-4 rounded-xl bg-pink-50 dark:bg-pink-950/40 hover:bg-pink-100 text-pink-700 dark:text-pink-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-pink-200 dark:border-pink-800"
              >
                <Camera className="w-4 h-4" />
                <span>สแกนรับรายการต่อไป</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                เสร็จสิ้น / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer (for Step 1 & 2) */}
        {currentStep !== 'success' && (
          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-pink-500" />
              <span>ระบบสแกนรับเอกสาร / พัสดุ ลาดกระบัง 2</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
