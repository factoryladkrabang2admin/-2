import React, { useState, useMemo, useEffect } from 'react';
import { RagsGlovesDailyRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { realtimeHub } from '../services/realtimeService';
import { AdminUserAccount, DEFAULT_ADMIN_USER, isUserAdminOrSupervisor } from '../data/mockData';
import { 
  fetchGoogleSheetRagsGloves, 
  RAGS_GLOVES_SHEET_URL,
  convertSheetRowsToMonthlyRagsGloves,
  createEmptyMonthRecords,
  RAGS_GLOVES_FALLBACK_CSV
} from '../services/googleSheetSyncService';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  QrCode,
  Copy,
  Plus, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Save, 
  Check, 
  Scale, 
  Sparkles, 
  Trash2, 
  Layers, 
  TrendingUp,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  ArrowLeft,
  CalendarDays,
  BarChart3,
  PieChart,
  Activity,
  X,
  Percent,
  Bell,
  Filter,
  Hand
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface RagsGlovesLogViewProps {
  currentUser?: AdminUserAccount;
  isAuthenticated?: boolean;
  onBackToPipeline?: () => void;
}

interface AddedNotificationData {
  day: number;
  monthName: string;
  year: number;
  beforeRagsKg: number;
  beforeGlovesKg: number;
  beforeTotalKg: number;
  afterTotalKg: number;
  discardTotalKg: number;
  timestamp: string;
}

export const RAGS_GLOVES_FORM_URL = 'https://docs.google.com/forms/d/1Iu1AwEsRobId9kfREog6OFt8VGzTV7qF3VNNoSQkbXU/edit';

const STORAGE_KEY = 'rags_gloves_monthly_data_v3';

export const RagsGlovesLogView: React.FC<RagsGlovesLogViewProps> = ({ 
  currentUser, 
  isAuthenticated = true,
  onBackToPipeline 
}) => {
  const { language } = useLanguage();
  
  // Check if current user is an administrator or supervisor (เฉพาะผู้ดูแลระบบและแอดมินเท่านั้น)
  const isAdmin = useMemo(() => {
    return isUserAdminOrSupervisor(currentUser, isAuthenticated);
  }, [currentUser, isAuthenticated]);
  
  // Current Month / Year selection (defaults to current date or August 2026)
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear() || 2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() !== undefined ? today.getMonth() : 7); // 0-indexed (7 = August)

  // Syncing state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  const [addedNotification, setAddedNotification] = useState<AddedNotificationData | null>(null);

  // Master Monthly Dictionary: { "2026-08": [...records], "2026-09": [...records] }
  const [monthlyData, setMonthlyData] = useState<Record<string, RagsGlovesDailyRecord[]>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      } catch (e) {
        // fallback
      }
    }
    // Initial baseline conversion from fallback
    const { monthlyData: initialData } = convertSheetRowsToMonthlyRagsGloves(RAGS_GLOVES_FALLBACK_CSV);
    return initialData;
  });

  // Current Month Key (e.g. "2026-08")
  const currentMonthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  // Filter States
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'has_data' | 'has_discard' | 'has_wash'>('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterMinWeight, setFilterMinWeight] = useState<string>('');
  const [filterStartDay, setFilterStartDay] = useState<number>(1);
  const [filterEndDay, setFilterEndDay] = useState<number>(31);

  // Current month's records
  const records = useMemo(() => {
    if (monthlyData[currentMonthKey] && monthlyData[currentMonthKey].length > 0) {
      return monthlyData[currentMonthKey];
    }
    return createEmptyMonthRecords(selectedYear, selectedMonth);
  }, [monthlyData, currentMonthKey, selectedYear, selectedMonth]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterMode !== 'all') count++;
    if (filterSearch.trim()) count++;
    if (filterMinWeight && parseFloat(filterMinWeight) > 0) count++;
    if (filterStartDay > 1 || filterEndDay < (records.length || 31)) count++;
    return count;
  }, [filterMode, filterSearch, filterMinWeight, filterStartDay, filterEndDay, records.length]);

  const filteredRecords = useMemo(() => {
    const minD = Math.min(filterStartDay, filterEndDay);
    const maxD = Math.max(filterStartDay, filterEndDay);

    return records.filter((r) => {
      // Day bounds
      if (filterStartDay > 1 || filterEndDay < (records.length || 31)) {
        if (r.day < minD || r.day > maxD) return false;
      }

      const beforeTotal = (r.beforeWashRagsKg || 0) + (r.beforeWashGlovesKg || 0);
      const afterTotal = (r.afterWashRagsKg || 0) + (r.afterWashGlovesKg || 0);
      const discardTotal = (r.discardRagsKg || 0) + (r.discardGlovesKg || 0);
      const grandTotal = beforeTotal + afterTotal + discardTotal;

      if (filterMode === 'has_data' && grandTotal === 0 && !r.note) {
        return false;
      }
      if (filterMode === 'has_discard' && discardTotal === 0) {
        return false;
      }
      if (filterMode === 'has_wash' && (beforeTotal === 0 && afterTotal === 0)) {
        return false;
      }
      if (filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        const matchDay = String(r.day).includes(q);
        const matchNote = (r.note || '').toLowerCase().includes(q);
        if (!matchDay && !matchNote) return false;
      }
      if (filterMinWeight && parseFloat(filterMinWeight) > 0) {
        const minW = parseFloat(filterMinWeight);
        if (grandTotal < minW) return false;
      }
      return true;
    });
  }, [records, filterMode, filterSearch, filterMinWeight, filterStartDay, filterEndDay]);

  // Modal for quick day entry
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [entryDay, setEntryDay] = useState<number>(() => Math.min(new Date().getDate(), records.length || 31));
  const [entryDiscardRags, setEntryDiscardRags] = useState<string>('0');
  const [entryDiscardGloves, setEntryDiscardGloves] = useState<string>('0');
  const [entryBeforeRags, setEntryBeforeRags] = useState<string>('0');
  const [entryBeforeGloves, setEntryBeforeGloves] = useState<string>('0');
  const [entryAfterRags, setEntryAfterRags] = useState<string>('0');
  const [entryAfterGloves, setEntryAfterGloves] = useState<string>('0');
  const [entryNote, setEntryNote] = useState<string>('');

  // Auto-sync function (silent or with notice)
  const performSync = async (isBackground = false) => {
    if (!isBackground) {
      setIsSyncing(true);
    }
    try {
      const res = await fetchGoogleSheetRagsGloves(selectedYear, selectedMonth);
      if (res.success && res.monthlyData) {
        // Merge with existing monthlyData only if there is a real difference
        setMonthlyData((prev) => {
          const merged = { ...prev, ...res.monthlyData };
          if (JSON.stringify(prev) === JSON.stringify(merged)) {
            return prev;
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          return merged;
        });
        setLastSyncedTime(res.lastSyncedAt);
      }
    } catch (err) {
      console.error('Error syncing rags & gloves:', err);
    } finally {
      if (!isBackground) {
        setIsSyncing(false);
      }
    }
  };

  // Real-time polling: initial load + interval every 15s + on window focus / visibility change
  useEffect(() => {
    performSync(false);

    const interval = setInterval(() => {
      performSync(true);
    }, 15000); // 15s real-time sync polling

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performSync(true);
      }
    };

    const handleFocus = () => {
      performSync(true);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedYear, selectedMonth]);

  // Sync when storage or realtime hub updates
  useEffect(() => {
    const unsub = realtimeHub.subscribe((msg) => {
      if (msg.type === 'SYNC_ALL') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
          try {
            setMonthlyData(JSON.parse(saved));
          } catch {
            const { monthlyData: initialData } = convertSheetRowsToMonthlyRagsGloves(RAGS_GLOVES_FALLBACK_CSV);
            setMonthlyData(initialData);
          }
        }
      }
    });
    return () => unsub();
  }, []);

  // Month names
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const engMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentMonthName = language === 'th' ? thaiMonths[selectedMonth] : engMonths[selectedMonth];
  const displayYear = language === 'th' ? selectedYear + 543 : selectedYear;

  // Save changes for current month
  const saveMonthRecords = (newMonthRecords: RagsGlovesDailyRecord[]) => {
    setMonthlyData((prev) => {
      const updated = {
        ...prev,
        [currentMonthKey]: newMonthRecords,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2000);
  };

  // Cell change handler
  const handleCellChange = (day: number, field: keyof RagsGlovesDailyRecord, val: string) => {
    const numVal = parseFloat(val) || 0;
    const updated = records.map((r) => {
      if (r.day === day) {
        return {
          ...r,
          [field]: numVal,
        };
      }
      return r;
    });
    saveMonthRecords(updated);
  };

  // Row Net Total Calculation: (หลังซัก เศษผ้า + ถุงมือ) หรือ ยอดสุทธิ
  const getRowNet = (r: RagsGlovesDailyRecord) => {
    const afterTotal = (r.afterWashRagsKg || 0) + (r.afterWashGlovesKg || 0);
    if (afterTotal > 0) return afterTotal;
    const beforeTotal = (r.beforeWashRagsKg || 0) + (r.beforeWashGlovesKg || 0);
    const discardTotal = (r.discardRagsKg || 0) + (r.discardGlovesKg || 0);
    return Math.max(0, beforeTotal - discardTotal);
  };

  // Column Sums (Totals)
  const totals = useMemo(() => {
    return records.reduce(
      (acc, r) => {
        acc.discardRags += r.discardRagsKg || 0;
        acc.discardGloves += r.discardGlovesKg || 0;
        acc.beforeWashRags += r.beforeWashRagsKg || 0;
        acc.beforeWashGloves += r.beforeWashGlovesKg || 0;
        acc.afterWashRags += r.afterWashRagsKg || 0;
        acc.afterWashGloves += r.afterWashGlovesKg || 0;
        acc.netTotal += getRowNet(r);
        return acc;
      },
      {
        discardRags: 0,
        discardGloves: 0,
        beforeWashRags: 0,
        beforeWashGloves: 0,
        afterWashRags: 0,
        afterWashGloves: 0,
        netTotal: 0,
      }
    );
  }, [records]);

  // Total stats for main view
  const totalBeforeWashAll = totals.beforeWashRags + totals.beforeWashGloves;
  const totalAfterWashAll = totals.afterWashRags + totals.afterWashGloves;
  const totalDiscardAll = totals.discardRags + totals.discardGloves;
  const yieldRate = totalBeforeWashAll > 0 ? ((totalAfterWashAll / totalBeforeWashAll) * 100).toFixed(1) : '100';

  // Statistics Modal Filter State
  const [statsFilterOpen, setStatsFilterOpen] = useState(false);
  const [statsFilterDayRange, setStatsFilterDayRange] = useState<'all' | 'first_half' | 'second_half' | 'custom'>('all');
  const [statsStartDay, setStatsStartDay] = useState<number>(1);
  const [statsEndDay, setStatsEndDay] = useState<number>(31);
  const [statsFilterMode, setStatsFilterMode] = useState<'all' | 'has_data' | 'has_discard' | 'has_wash'>('all');
  const [statsFilterMinWeight, setStatsFilterMinWeight] = useState<string>('');

  // Keep statsEndDay in sync with month length when month changes
  useEffect(() => {
    if (records.length > 0) {
      if (statsFilterDayRange === 'all') {
        setStatsStartDay(1);
        setStatsEndDay(records.length);
      } else if (statsFilterDayRange === 'first_half') {
        setStatsStartDay(1);
        setStatsEndDay(15);
      } else if (statsFilterDayRange === 'second_half') {
        setStatsStartDay(16);
        setStatsEndDay(records.length);
      } else {
        setStatsEndDay((prev) => Math.min(prev, records.length));
      }
    }
  }, [records.length, statsFilterDayRange]);

  const statsActiveFilterCount = useMemo(() => {
    let count = 0;
    const maxDays = records.length || 31;
    if (statsFilterDayRange !== 'all' || statsStartDay > 1 || statsEndDay < maxDays) count++;
    if (statsFilterMode !== 'all') count++;
    if (statsFilterMinWeight && parseFloat(statsFilterMinWeight) > 0) count++;
    return count;
  }, [statsFilterDayRange, statsStartDay, statsEndDay, statsFilterMode, statsFilterMinWeight, records.length]);

  const handleResetStatsFilters = () => {
    setStatsFilterDayRange('all');
    setStatsStartDay(1);
    setStatsEndDay(records.length || 31);
    setStatsFilterMode('all');
    setStatsFilterMinWeight('');
  };

  // Filtered records for the Stats Modal
  const statsFilteredRecords = useMemo(() => {
    const minD = Math.min(statsStartDay, statsEndDay);
    const maxD = Math.max(statsStartDay, statsEndDay);

    return records.filter((r) => {
      // Day range filter
      if (statsFilterDayRange === 'first_half') {
        if (r.day < 1 || r.day > 15) return false;
      } else if (statsFilterDayRange === 'second_half') {
        if (r.day < 16 || r.day > (records.length || 31)) return false;
      } else if (statsFilterDayRange === 'custom') {
        if (r.day < minD || r.day > maxD) return false;
      } else if (statsFilterDayRange === 'all') {
        // if user adjusted start/end day while in 'all', respect the bounds if modified
        if (statsStartDay > 1 || statsEndDay < (records.length || 31)) {
          if (r.day < minD || r.day > maxD) return false;
        }
      }

      // Filter Mode
      const beforeTotal = (r.beforeWashRagsKg || 0) + (r.beforeWashGlovesKg || 0);
      const afterTotal = (r.afterWashRagsKg || 0) + (r.afterWashGlovesKg || 0);
      const discardTotal = (r.discardRagsKg || 0) + (r.discardGlovesKg || 0);
      const grandTotal = beforeTotal + afterTotal + discardTotal;

      if (statsFilterMode === 'has_data' && grandTotal === 0 && !r.note) return false;
      if (statsFilterMode === 'has_discard' && discardTotal === 0) return false;
      if (statsFilterMode === 'has_wash' && beforeTotal === 0 && afterTotal === 0) return false;

      // Min weight
      if (statsFilterMinWeight && parseFloat(statsFilterMinWeight) > 0) {
        if (grandTotal < parseFloat(statsFilterMinWeight)) return false;
      }

      return true;
    });
  }, [records, statsFilterDayRange, statsStartDay, statsEndDay, statsFilterMode, statsFilterMinWeight]);

  // Statistics Totals calculation for the Stats modal (using statsFilteredRecords)
  const statsTotals = useMemo(() => {
    return statsFilteredRecords.reduce(
      (acc, r) => {
        acc.discardRags += r.discardRagsKg || 0;
        acc.discardGloves += r.discardGlovesKg || 0;
        acc.beforeWashRags += r.beforeWashRagsKg || 0;
        acc.beforeWashGloves += r.beforeWashGlovesKg || 0;
        acc.afterWashRags += r.afterWashRagsKg || 0;
        acc.afterWashGloves += r.afterWashGlovesKg || 0;
        acc.netTotal += getRowNet(r);
        return acc;
      },
      {
        discardRags: 0,
        discardGloves: 0,
        beforeWashRags: 0,
        beforeWashGloves: 0,
        afterWashRags: 0,
        afterWashGloves: 0,
        netTotal: 0,
      }
    );
  }, [statsFilteredRecords]);

  const statsTotalBeforeWashAll = statsTotals.beforeWashRags + statsTotals.beforeWashGloves;
  const statsTotalAfterWashAll = statsTotals.afterWashRags + statsTotals.afterWashGloves;
  const statsTotalDiscardAll = statsTotals.discardRags + statsTotals.discardGloves;
  const statsYieldRate = statsTotalBeforeWashAll > 0 ? ((statsTotalAfterWashAll / statsTotalBeforeWashAll) * 100).toFixed(1) : '100';

  // Statistics calculation for the Stats modal
  const statsAnalysis = useMemo(() => {
    let activeDays = 0;
    let peakDay = statsFilteredRecords.length > 0 ? statsFilteredRecords[0].day : 1;
    let peakKg = 0;
    statsFilteredRecords.forEach((r) => {
      const dayBeforeTotal = (r.beforeWashRagsKg || 0) + (r.beforeWashGlovesKg || 0);
      const dayTotal = dayBeforeTotal + (r.afterWashRagsKg || 0) + (r.discardRagsKg || 0);
      if (dayTotal > 0 || (r.note && r.note.trim().length > 0)) {
        activeDays++;
      }
      if (dayBeforeTotal > peakKg) {
        peakKg = dayBeforeTotal;
        peakDay = r.day;
      }
    });

    const avgDailyKg = activeDays > 0 ? (statsTotalBeforeWashAll / activeDays).toFixed(1) : '0';
    const ragsPct = statsTotalBeforeWashAll > 0 ? Math.round((statsTotals.beforeWashRags / statsTotalBeforeWashAll) * 100) : 50;
    const glovesPct = statsTotalBeforeWashAll > 0 ? 100 - ragsPct : 50;

    const ragsYield = statsTotals.beforeWashRags > 0 ? ((statsTotals.afterWashRags / statsTotals.beforeWashRags) * 100).toFixed(1) : '100';
    const glovesYield = statsTotals.beforeWashGloves > 0 ? ((statsTotals.afterWashGloves / statsTotals.beforeWashGloves) * 100).toFixed(1) : '100';

    const ragsDiscardRate = statsTotals.beforeWashRags + statsTotals.discardRags > 0 
      ? ((statsTotals.discardRags / (statsTotals.beforeWashRags + statsTotals.discardRags)) * 100).toFixed(1) 
      : '0';
    const glovesDiscardRate = statsTotals.beforeWashGloves + statsTotals.discardGloves > 0 
      ? ((statsTotals.discardGloves / (statsTotals.beforeWashGloves + statsTotals.discardGloves)) * 100).toFixed(1) 
      : '0';

    return {
      activeDays,
      peakDay,
      peakKg,
      avgDailyKg,
      ragsPct,
      glovesPct,
      ragsYield,
      glovesYield,
      ragsDiscardRate,
      glovesDiscardRate,
    };
  }, [statsFilteredRecords, statsTotals, statsTotalBeforeWashAll]);

  // Quick entry submit
  const handleQuickEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dRags = parseFloat(entryDiscardRags) || 0;
    const dGloves = parseFloat(entryDiscardGloves) || 0;
    const bRags = parseFloat(entryBeforeRags) || 0;
    const bGloves = parseFloat(entryBeforeGloves) || 0;
    const aRags = parseFloat(entryAfterRags) || 0;
    const aGloves = parseFloat(entryAfterGloves) || 0;

    const updated = records.map((r) => {
      if (r.day === entryDay) {
        return {
          ...r,
          discardRagsKg: dRags,
          discardGlovesKg: dGloves,
          beforeWashRagsKg: bRags,
          beforeWashGlovesKg: bGloves,
          afterWashRagsKg: aRags,
          afterWashGlovesKg: aGloves,
          note: entryNote.trim(),
        };
      }
      return r;
    });
    saveMonthRecords(updated);
    setQuickEntryOpen(false);

    const totalBefore = bRags + bGloves;
    const totalAfter = aRags + aGloves;
    const totalDiscard = dRags + dGloves;
    const timeFormatted = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // 1. Set on-screen banner notification
    setAddedNotification({
      day: entryDay,
      monthName: currentMonthName,
      year: displayYear,
      beforeRagsKg: bRags,
      beforeGlovesKg: bGloves,
      beforeTotalKg: totalBefore,
      afterTotalKg: totalAfter,
      discardTotalKg: totalDiscard,
      timestamp: timeFormatted,
    });

    // 2. Broadcast to system notification hub (top bell icon badge & notification drawer)
    realtimeHub.addNotification({
      id: `rg-entry-${Date.now()}`,
      type: 'success',
      title: language === 'th' 
        ? `บันทึกข้อมูลเศษผ้า - ถุงมือ วันที่ ${entryDay} ${currentMonthName}`
        : `Added Rags & Gloves Record (Day ${entryDay} ${currentMonthName})`,
      desc: language === 'th'
        ? `บันทึกสำเร็จ • ก่อนซัก: ${totalBefore.toFixed(1)} กก. (เศษผ้า ${bRags} / ถุงมือ ${bGloves}) • หลังซัก: ${totalAfter.toFixed(1)} กก. • คัดทิ้ง: ${totalDiscard.toFixed(1)} กก.`
        : `Pre-wash: ${totalBefore.toFixed(1)} kg • Post-wash: ${totalAfter.toFixed(1)} kg • Discard: ${totalDiscard.toFixed(1)} kg`,
      time: language === 'th' ? 'เมื่อสักครู่' : 'Just now',
      timestamp: Date.now(),
      unread: true,
    });

    // 3. Add to activity stream
    realtimeHub.addActivity({
      id: `act-rg-${Date.now()}`,
      type: 'task_completed',
      user: currentUser?.name || (language === 'th' ? 'ผู้บันทึกข้อมูล' : 'Operator'),
      userInitials: (currentUser?.name || 'RG').substring(0, 2).toUpperCase(),
      title: language === 'th' ? 'บันทึกข้อมูลเศษผ้า - ถุงมือ' : 'Logged Rags & Gloves Record',
      subtitle: language === 'th' ? `วันที่ ${entryDay} ${currentMonthName} ${displayYear} (ก่อนซัก ${totalBefore.toFixed(1)} กก.)` : `Day ${entryDay} ${currentMonthName} ${displayYear}`,
      timestamp: language === 'th' ? 'เมื่อสักครู่' : 'Just now',
      badgeType: 'success',
    });

    // Auto hide after 6 seconds
    setTimeout(() => {
      setAddedNotification(null);
    }, 6000);
  };

  // Open quick entry modal prepopulated for a day
  const handleOpenDayModal = (dayRecord: RagsGlovesDailyRecord) => {
    setEntryDay(dayRecord.day);
    setEntryDiscardRags(dayRecord.discardRagsKg.toString());
    setEntryDiscardGloves(dayRecord.discardGlovesKg.toString());
    setEntryBeforeRags(dayRecord.beforeWashRagsKg.toString());
    setEntryBeforeGloves(dayRecord.beforeWashGlovesKg.toString());
    setEntryAfterRags(dayRecord.afterWashRagsKg.toString());
    setEntryAfterGloves(dayRecord.afterWashGlovesKg.toString());
    setEntryNote(dayRecord.note || '');
    setQuickEntryOpen(true);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'ว/ด/ป',
      'คัดทิ้ง-เศษผ้า (KG)',
      'คัดทิ้ง-ถุงมือ (KG)',
      'ก่อนซัก-เศษผ้า (KG)',
      'ก่อนซัก-ถุงมือ (KG)',
      'หลังซัก-เศษผ้า (KG)',
      'หลังซัก-ถุงมือ (KG)',
      'รวมสุทธิ (KG)',
    ];

    const rows = records.map((r) => [
      r.day,
      r.discardRagsKg || 0,
      r.discardGlovesKg || 0,
      r.beforeWashRagsKg || 0,
      r.beforeWashGlovesKg || 0,
      r.afterWashRagsKg || 0,
      r.afterWashGlovesKg || 0,
      getRowNet(r).toFixed(0),
    ]);

    // Add totals row
    rows.push([
      'Total',
      totals.discardRags,
      totals.discardGloves,
      totals.beforeWashRags,
      totals.beforeWashGloves,
      totals.afterWashRags,
      totals.afterWashGloves,
      totals.netTotal,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rags_Gloves_Log_${currentMonthName}_${displayYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  // Reset current month to blank/default
  const handleResetData = () => {
    if (window.confirm(language === 'th' ? `ต้องการรีเซ็ตข้อมูลประจำเดือน ${currentMonthName} ${displayYear} หรือไม่?` : `Reset data for ${currentMonthName} ${displayYear}?`)) {
      if (selectedYear === 2026 && selectedMonth === 7) {
        const { monthlyData: initData } = convertSheetRowsToMonthlyRagsGloves(RAGS_GLOVES_FALLBACK_CSV);
        saveMonthRecords(initData['2026-08'] || createEmptyMonthRecords(2026, 7));
      } else {
        saveMonthRecords(createEmptyMonthRecords(selectedYear, selectedMonth));
      }
    }
  };

  // Available Years for fast selection
  const yearsList = [2024, 2025, 2026, 2027, 2028];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Back button if called inside Laundry section */}
      {onBackToPipeline && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToPipeline}
            className="px-4 py-2 bg-white hover:bg-emerald-50 text-[#064e3b] font-bold text-xs rounded-xl border border-emerald-200 shadow-2xs transition-all flex items-center gap-2 cursor-pointer hover:border-emerald-300"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600" />
            <span>{language === 'th' ? 'กลับไปยังรายการซัก-อบผ้า (Laundry Orders)' : 'Back to Laundry Orders'}</span>
          </button>
        </div>
      )}

      {/* Top Header Banner: Animated Light Brown and White Gradient with Floating White Glove & Rag Icons */}
      <div className="animated-rags-brown-header rounded-2xl p-6 shadow-lg border border-[#e8d5c4] relative overflow-hidden text-[#3e2723]">
        {/* Animated Floating White Glove and Rag/Cloth Icons in Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          {/* Floating White Glove 1 */}
          <div className="absolute top-2 right-36 opacity-30 animate-float-glove-1">
            <Hand className="w-24 h-24 text-white drop-shadow-md transform -rotate-12" />
          </div>
          {/* Floating White Rag/Cloth 1 */}
          <div className="absolute -bottom-4 right-10 opacity-35 animate-float-rag-1">
            <Layers className="w-36 h-36 text-white drop-shadow-md transform rotate-6" />
          </div>
          {/* Floating White Glove 2 */}
          <div className="absolute top-1/2 right-80 -translate-y-1/2 opacity-20 animate-float-glove-2 hidden sm:block">
            <Hand className="w-16 h-16 text-white drop-shadow-sm transform rotate-45" />
          </div>
          {/* Floating White Rag 2 */}
          <div className="absolute top-3 left-1/3 opacity-25 animate-float-rag-2 hidden md:block">
            <Layers className="w-20 h-20 text-white drop-shadow-sm transform -rotate-15" />
          </div>
          {/* Subtle sparkles */}
          <div className="absolute bottom-3 left-1/2 opacity-40 animate-pulse hidden lg:block">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              {onBackToPipeline && (
                <button
                  type="button"
                  onClick={onBackToPipeline}
                  className="px-3 py-1 rounded-full bg-white/70 hover:bg-white text-[#5d4037] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-[#d7ccc8] active:scale-95 shadow-2xs"
                  title={language === 'th' ? 'กลับไปหน้ารายการซัก-อบผ้า' : 'Back to Laundry Orders'}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{language === 'th' ? 'กลับหน้ารายการซัก-อบผ้า' : 'Back to Laundry'}</span>
                </button>
              )}

              {/* Read-Only Google Sheets live indicator */}
              <span className="px-2.5 py-0.5 rounded-full bg-white/80 text-[#6d4c41] border border-[#d7ccc8] text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#8d5b4c]" />
                <span>{language === 'th' ? 'โหมดอ่านอย่างเดียว (ลิงก์ Google Sheets)' : 'Read-Only (Google Sheets Live)'}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#3e2723] flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8d5b4c] to-[#5d4037] text-white flex items-center justify-center shadow-md">
                <Hand className="w-6 h-6 stroke-[2.2]" />
              </div>
              <span>{language === 'th' ? 'เศษผ้า - ถุงมือ' : 'Rags & Gloves Log (เศษผ้า - ถุงมือ)'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#5d4037] mt-1 max-w-2xl font-medium">
              {language === 'th' 
                ? 'ตารางแสดงข้อมูลน้ำหนักการคัดทิ้ง, ชั่งก่อนซัก และชั่งหลังซัก ประจำวัน จาก Google Sheets (หน่วย: KG)' 
                : 'Daily record of discarded, pre-wash, and post-wash rags & gloves synced from Google Sheets (KG)'}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
            {/* 1. Statistics Icon Button */}
            <button
              type="button"
              onClick={() => setStatsModalOpen(true)}
              className="p-2.5 rounded-xl bg-white/90 hover:bg-white text-[#3e2723] border border-[#d7ccc8] backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs hover:border-[#bcaaa4]"
              title={language === 'th' ? 'สถิติและการวิเคราะห์' : 'Analytics & Statistics'}
              aria-label={language === 'th' ? 'สถิติและการวิเคราะห์' : 'Analytics & Statistics'}
            >
              <BarChart3 className="w-5 h-5 text-[#6d4c41] stroke-[2]" />
            </button>

            {/* 2. Filter Icon Button */}
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className={`p-2.5 rounded-xl border backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center relative shadow-xs ${
                activeFiltersCount > 0
                  ? 'bg-[#6d4c41] text-white border-[#5d4037] shadow-md ring-2 ring-[#a1887f]'
                  : 'bg-white/90 hover:bg-white text-[#3e2723] border border-[#d7ccc8] hover:border-[#bcaaa4]'
              }`}
              title={language === 'th' ? (activeFiltersCount > 0 ? `ตัวกรองการค้นหา (${activeFiltersCount})` : 'ตัวกรองการค้นหา') : (activeFiltersCount > 0 ? `Filters (${activeFiltersCount})` : 'Filters')}
              aria-label={language === 'th' ? 'ตัวกรองการค้นหา' : 'Filters'}
            >
              <Filter className={`w-5 h-5 stroke-[2] ${activeFiltersCount > 0 ? 'text-white' : 'text-[#6d4c41]'}`} />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#6d4c41] text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white shadow-xs">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* 3. Google Sheets Icon Button (เฉพาะผู้ดูแลและแอดมินเท่านั้น) */}
            {isAdmin && (
              <a 
                href={RAGS_GLOVES_SHEET_URL} 
                target="_blank" 
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-white/90 hover:bg-white text-[#6d4c41] border border-[#d7ccc8] backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs hover:border-[#bcaaa4]"
                title={language === 'th' ? 'เปิด Google Sheets (เฉพาะผู้ดูแลและแอดมิน)' : 'Open Google Sheets (Admin Only)'}
                aria-label="Google Sheet"
              >
                <FileSpreadsheet className="w-5 h-5 text-[#6d4c41] stroke-[2]" />
              </a>
            )}

            {/* 4. Print Icon-Only Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-2.5 rounded-xl bg-white/90 hover:bg-white text-[#3e2723] border border-[#d7ccc8] backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs hover:border-[#bcaaa4]"
              title={language === 'th' ? 'พิมพ์รายการ' : 'Print'}
              aria-label={language === 'th' ? 'พิมพ์รายการ' : 'Print'}
            >
              <Printer className="w-5 h-5 text-[#6d4c41]" />
            </button>

            {/* 5. QR CODE Icon-Only Button (Admin / Supervisor Only) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="p-2.5 rounded-xl bg-white/90 hover:bg-white text-[#3e2723] border border-[#d7ccc8] backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs hover:border-[#bcaaa4]"
                title={language === 'th' ? 'QR Code แบบฟอร์มบันทึกข้อมูล (เฉพาะผู้ดูแล/แอดมิน)' : 'QR Code Form Entry (Admin Only)'}
                aria-label={language === 'th' ? 'QR Code แบบฟอร์มบันทึกข้อมูล' : 'QR Code Form Entry'}
              >
                <QrCode className="w-5 h-5 text-[#6d4c41]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-xs">
          <div className="flex items-center justify-between text-[#74777f] text-xs font-medium mb-1">
            <span>{language === 'th' ? 'ยอดก่อนซักรวม' : 'Total Before Wash'}</span>
            <Scale className="w-4 h-4 text-[#0061a5]" />
          </div>
          <p className="text-2xl font-bold text-[#002045]">{totalBeforeWashAll.toFixed(1)} <span className="text-xs font-normal text-[#74777f]">KG</span></p>
          <div className="flex items-center gap-2 text-[11px] text-[#74777f] mt-1">
            <span>เศษผ้า: <b className="text-[#002045]">{totals.beforeWashRags.toFixed(1)}</b></span>
            <span>•</span>
            <span>ถุงมือ: <b className="text-[#002045]">{totals.beforeWashGloves.toFixed(1)}</b></span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-xs">
          <div className="flex items-center justify-between text-[#74777f] text-xs font-medium mb-1">
            <span>{language === 'th' ? 'ยอดหลังซักรวม' : 'Total After Wash'}</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{totalAfterWashAll.toFixed(1)} <span className="text-xs font-normal text-[#74777f]">KG</span></p>
          <div className="flex items-center gap-2 text-[11px] text-[#74777f] mt-1">
            <span>เศษผ้า: <b className="text-emerald-700">{totals.afterWashRags.toFixed(1)}</b></span>
            <span>•</span>
            <span>ถุงมือ: <b className="text-emerald-700">{totals.afterWashGloves.toFixed(1)}</b></span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-xs">
          <div className="flex items-center justify-between text-[#74777f] text-xs font-medium mb-1">
            <span>{language === 'th' ? 'ยอดคัดทิ้งรวม' : 'Total Discarded'}</span>
            <Trash2 className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700">{totalDiscardAll.toFixed(1)} <span className="text-xs font-normal text-[#74777f]">KG</span></p>
          <div className="flex items-center gap-2 text-[11px] text-[#74777f] mt-1">
            <span>เศษผ้า: <b className="text-rose-700">{totals.discardRags.toFixed(1)}</b></span>
            <span>•</span>
            <span>ถุงมือ: <b className="text-rose-700">{totals.discardGloves.toFixed(1)}</b></span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-xs">
          <div className="flex items-center justify-between text-[#74777f] text-xs font-medium mb-1">
            <span>{language === 'th' ? 'รวมสุทธิทั้งหมด' : 'Grand Net Total'}</span>
            <TrendingUp className="w-4 h-4 text-[#0061a5]" />
          </div>
          <p className="text-2xl font-bold text-[#002045]">{totals.netTotal.toFixed(1)} <span className="text-xs font-normal text-[#74777f]">KG</span></p>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 mt-1 font-semibold">
            <span>อัตราผลผลิต (Yield): {yieldRate}%</span>
          </div>
        </div>
      </div>

      {/* Controls Bar: Robust Month & Year Dropdown Selectors + Fast Tools */}
      <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Previous Month Button */}
          <button
            type="button"
            onClick={() => {
              if (selectedMonth === 0) {
                setSelectedMonth(11);
                setSelectedYear(prev => prev - 1);
              } else {
                setSelectedMonth(prev => prev - 1);
              }
            }}
            className="p-2 text-[#43474e] hover:bg-slate-100 rounded-lg transition-colors border border-gray-200 cursor-pointer"
            title="เดือนก่อนหน้า"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Month Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="appearance-none pl-8 pr-8 py-2 bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#8d5b4c] cursor-pointer shadow-2xs"
            >
              {thaiMonths.map((mName, idx) => (
                <option key={idx} value={idx}>
                  {language === 'th' ? `เดือน ${mName}` : engMonths[idx]}
                </option>
              ))}
            </select>
            <Calendar className="w-4 h-4 text-[#8d5b4c] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Year Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="appearance-none pl-3 pr-7 py-2 bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#8d5b4c] cursor-pointer shadow-2xs"
            >
              {yearsList.map((y) => (
                <option key={y} value={y}>
                  {language === 'th' ? `พ.ศ. ${y + 543} (${y})` : `Year ${y}`}
                </option>
              ))}
            </select>
          </div>

          {/* Next Month Button */}
          <button
            type="button"
            onClick={() => {
              if (selectedMonth === 11) {
                setSelectedMonth(0);
                setSelectedYear(prev => prev + 1);
              } else {
                setSelectedMonth(prev => prev + 1);
              }
            }}
            className="p-2 text-[#43474e] hover:bg-slate-100 rounded-lg transition-colors border border-gray-200 cursor-pointer"
            title="เดือนถัดไป"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Current Month Quick Button */}
          <button
            type="button"
            onClick={() => {
              const n = new Date();
              setSelectedYear(n.getFullYear());
              setSelectedMonth(n.getMonth());
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="ไปยังเดือนปัจจุบัน"
          >
            <CalendarDays className="w-3.5 h-3.5 text-[#8d5b4c]" />
            <span>{language === 'th' ? 'เดือนปัจจุบัน' : 'Today'}</span>
          </button>
        </div>
      </div>

      {/* Alert Notification Toast on Data Added */}
      {addedNotification && (
        <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-950 rounded-2xl p-4 shadow-lg flex items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm sm:text-base text-emerald-900">
                  {language === 'th' 
                    ? `แจ้งเตือน: บันทึกข้อมูลวันที่ ${addedNotification.day} ${addedNotification.monthName} ${addedNotification.year} สำเร็จ!`
                    : `Notification: Added record for Day ${addedNotification.day} ${addedNotification.monthName} ${addedNotification.year} successfully!`}
                </span>
                <span className="text-[11px] bg-emerald-200/80 text-emerald-800 font-bold px-2 py-0.5 rounded-md shadow-2xs">
                  {addedNotification.timestamp}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-800 mt-1 font-medium">
                {language === 'th'
                  ? `ก่อนซักรวม: ${addedNotification.beforeTotalKg.toFixed(1)} กก. (เศษผ้า ${addedNotification.beforeRagsKg} กก. / ถุงมือ ${addedNotification.beforeGlovesKg} กก.) • หลังซัก: ${addedNotification.afterTotalKg.toFixed(1)} กก. • คัดทิ้ง: ${addedNotification.discardTotalKg.toFixed(1)} กก.`
                  : `Pre-wash Total: ${addedNotification.beforeTotalKg.toFixed(1)} kg (Rags ${addedNotification.beforeRagsKg} / Gloves ${addedNotification.beforeGlovesKg}) • Post-wash: ${addedNotification.afterTotalKg.toFixed(1)} kg • Discard: ${addedNotification.discardTotalKg.toFixed(1)} kg`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAddedNotification(null)}
            className="p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
            title={language === 'th' ? 'ปิดการแจ้งเตือน' : 'Dismiss'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Table - Exact Layout and Colors as in User Image (ตัวอย่าง.png) */}
      <div className="bg-white rounded-lg border-2 border-black shadow-lg overflow-hidden">
        {/* 1. Header Top Bar: Pure Green '#00a854' with centered title 'เศษผ้า - ถุงมือ' */}
        <div className="bg-[#00a854] text-white py-2.5 px-4 text-center font-bold text-base sm:text-lg tracking-wide border-b-2 border-black flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium opacity-90">
            {currentMonthName} {displayYear}
          </span>
          <span className="font-extrabold text-base sm:text-lg">
            เศษผ้า - ถุงมือ
          </span>
          <span className="text-xs sm:text-sm font-medium opacity-90">
            {records.length} วัน
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse border border-black text-xs font-sans">
            <thead>
              {/* Row 1: Main Category Headers */}
              <tr className="border-b border-black">
                {/* Col 1: ว/ด/ป (Gray Background, rowSpan 2) */}
                <th 
                  rowSpan={2} 
                  className="border-r border-black border-b border-black py-2 px-3 w-16 bg-[#e6e6e6] text-black font-bold text-center align-middle"
                >
                  ว/ด/ป
                </th>

                {/* Col 2-3: คัดทิ้ง / KG (Peach/Orange Background #fcd9b6) */}
                <th 
                  colSpan={2} 
                  className="border-r border-black border-b border-black py-1.5 px-3 bg-[#fcd9b6] text-black font-bold text-center"
                >
                  คัดทิ้ง / KG
                </th>

                {/* Col 4-5: ก่อนซัก / KG (Peach/Orange Background #fcd9b6) */}
                <th 
                  colSpan={2} 
                  className="border-r border-black border-b border-black py-1.5 px-3 bg-[#fcd9b6] text-black font-bold text-center"
                >
                  ก่อนซัก / KG
                </th>

                {/* Col 6-7: หลังซัก / KG (Peach/Orange Background #fcd9b6) */}
                <th 
                  colSpan={2} 
                  className="border-r border-black border-b border-black py-1.5 px-3 bg-[#fcd9b6] text-black font-bold text-center"
                >
                  หลังซัก / KG
                </th>

                {/* Col 8: รวม (White/Gray, with สุทธิ below) */}
                <th 
                  className="border-b border-black py-1 px-4 w-20 bg-white text-black font-bold text-center"
                >
                  รวม
                </th>
              </tr>

              {/* Row 2: Sub-headers (เศษผ้า / ถุงมือ) */}
              <tr className="border-b-2 border-black bg-[#fcd9b6] text-black font-bold">
                {/* Under คัดทิ้ง */}
                <th className="border-r border-black py-1.5 px-2 bg-[#fcd9b6] text-black font-bold">เศษผ้า</th>
                <th className="border-r border-black py-1.5 px-2 bg-[#fcd9b6] text-black font-bold">ถุงมือ</th>

                {/* Under ก่อนซัก */}
                <th className="border-r border-black py-1.5 px-2 bg-[#fcd9b6] text-black font-bold">เศษผ้า</th>
                <th className="border-r border-black py-1.5 px-2 bg-[#fcd9b6] text-black font-bold">ถุงมือ</th>

                {/* Under หลังซัก */}
                <th className="border-r border-black py-1.5 px-2 bg-[#fcd9b6] text-black font-bold">เศษผ้า</th>
                <th className="border-r border-black py-1.5 px-2 bg-[#fcd9b6] text-black font-bold">ถุงมือ</th>

                {/* Under รวม */}
                <th className="border-b border-black py-1 px-2 bg-white text-black font-bold text-center">
                  สุทธิ
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-medium bg-slate-50">
                    {language === 'th' ? 'ไม่พบข้อมูลตามตัวกรองที่เลือก' : 'No records match the active filter criteria.'}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                const rowNet = getRowNet(record);
                const isCurrentDay = record.day === new Date().getDate() && selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear();

                return (
                  <tr 
                    key={record.day}
                    className={`border-b border-black transition-colors ${
                      isCurrentDay ? 'bg-amber-50/70' : 'bg-white hover:bg-amber-50/30'
                    }`}
                  >
                    {/* Day / Date (1 to daysInMonth) - Read-only */}
                    <td 
                      className={`border-r border-black py-1.5 px-2 text-center font-bold select-none ${
                        isCurrentDay ? 'bg-amber-100/70 text-amber-950' : 'text-black'
                      }`}
                    >
                      <span>{record.day}</span>
                    </td>

                    {/* 1. คัดทิ้ง: เศษผ้า (Read-only) */}
                    <td className="border-r border-black py-1 px-2 text-center text-xs text-black font-medium bg-white">
                      {record.discardRagsKg > 0 ? record.discardRagsKg : ''}
                    </td>

                    {/* 1. คัดทิ้ง: ถุงมือ (Read-only) */}
                    <td className="border-r border-black py-1 px-2 text-center text-xs text-black font-medium bg-white">
                      {record.discardGlovesKg > 0 ? record.discardGlovesKg : ''}
                    </td>

                    {/* 2. ก่อนซัก: เศษผ้า (Read-only) */}
                    <td className="border-r border-black py-1 px-2 text-center text-xs text-black font-semibold bg-white">
                      {record.beforeWashRagsKg > 0 ? record.beforeWashRagsKg : ''}
                    </td>

                    {/* 2. ก่อนซัก: ถุงมือ (Read-only) */}
                    <td className="border-r border-black py-1 px-2 text-center text-xs text-black font-semibold bg-white">
                      {record.beforeWashGlovesKg > 0 ? record.beforeWashGlovesKg : ''}
                    </td>

                    {/* 3. หลังซัก: เศษผ้า (Read-only) */}
                    <td className="border-r border-black py-1 px-2 text-center text-xs text-black font-semibold bg-white">
                      {record.afterWashRagsKg > 0 ? record.afterWashRagsKg : ''}
                    </td>

                    {/* 3. หลังซัก: ถุงมือ (Read-only) */}
                    <td className="border-r border-black py-1 px-2 text-center text-xs text-black font-semibold bg-white">
                      {record.afterWashGlovesKg > 0 ? record.afterWashGlovesKg : ''}
                    </td>

                    {/* รวม สุทธิ (Read-only) */}
                    <td className="py-1 px-2 text-center text-xs text-black font-normal bg-white">
                      {rowNet > 0 ? rowNet : 0}
                    </td>
                  </tr>
                );
              }))}

              {/* BOTTOM TOTAL ROW: Matching colors and style in image */}
              <tr className="border-t-2 border-black font-bold text-xs select-none h-8">
                {/* Total label */}
                <td className="border-r border-black py-2 px-3 bg-white text-black font-bold text-center">
                  Total
                </td>

                {/* Discard Rags Total: Green #00a854 */}
                <td className="border-r border-black py-2 px-2 bg-[#00a854] text-black font-bold text-center">
                  {totals.discardRags > 0 ? totals.discardRags : 0}
                </td>

                {/* Discard Gloves Total: Green #00a854 */}
                <td className="border-r border-black py-2 px-2 bg-[#00a854] text-black font-bold text-center">
                  {totals.discardGloves > 0 ? totals.discardGloves : 0}
                </td>

                {/* Before Wash Rags Total: Green #00a854 */}
                <td className="border-r border-black py-2 px-2 bg-[#00a854] text-black font-bold text-center">
                  {totals.beforeWashRags > 0 ? totals.beforeWashRags : 0}
                </td>

                {/* Before Wash Gloves Total: Green #00a854 */}
                <td className="border-r border-black py-2 px-2 bg-[#00a854] text-black font-bold text-center">
                  {totals.beforeWashGloves > 0 ? totals.beforeWashGloves : 0}
                </td>

                {/* After Wash Rags Total: Bright Yellow #ffff00 */}
                <td className="border-r border-black py-2 px-2 bg-[#ffff00] text-black font-bold text-center">
                  {totals.afterWashRags > 0 ? totals.afterWashRags : 0}
                </td>

                {/* After Wash Gloves Total: Bright Yellow #ffff00 */}
                <td className="border-r border-black py-2 px-2 bg-[#ffff00] text-black font-bold text-center">
                  {totals.afterWashGloves > 0 ? totals.afterWashGloves : 0}
                </td>

                {/* Grand Net Total: White */}
                <td className="py-2 px-2 bg-white text-black font-bold text-center">
                  {totals.netTotal > 0 ? totals.netTotal : 0}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics & Analytics Modal */}
      {statsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-2xs">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-[#002045]">
                      {language === 'th' ? `รายงานสถิติ เศษผ้า - ถุงมือ` : `Rags & Gloves Analytics`}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      {statsFilterDayRange === 'all' && statsStartDay === 1 && statsEndDay >= (records.length || 31)
                        ? (language === 'th' ? `ทั้งเดือน (${statsFilteredRecords.length} วัน)` : `All Month (${statsFilteredRecords.length} days)`)
                        : (language === 'th' ? `วันที่ ${statsStartDay} - ${statsEndDay} (${statsFilteredRecords.length} วัน)` : `Days ${statsStartDay} - ${statsEndDay} (${statsFilteredRecords.length} days)`)}
                    </span>
                  </div>
                  <p className="text-xs text-[#74777f]">
                    {language === 'th' 
                      ? `ประจำเดือน ${currentMonthName} ${displayYear} • กรองข้อมูลตามช่วงวันที่และเงื่อนไข` 
                      : `Month: ${currentMonthName} ${displayYear} • Filtered by date range & conditions`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Filter Icon Button (Icon Only) */}
                <button
                  type="button"
                  onClick={() => setStatsFilterOpen(!statsFilterOpen)}
                  className={`relative w-9 h-9 rounded-xl border backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-xs ${
                    statsFilterOpen || statsActiveFilterCount > 0
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                  title={language === 'th' ? (statsActiveFilterCount > 0 ? `ตัวกรองข้อมูลสถิติ (${statsActiveFilterCount})` : 'ตัวกรองข้อมูลสถิติ') : (statsActiveFilterCount > 0 ? `Filters (${statsActiveFilterCount})` : 'Filters')}
                  aria-label={language === 'th' ? 'ตัวกรองข้อมูลสถิติ' : 'Filter Analytics'}
                >
                  <Filter className={`w-4 h-4 stroke-[2.2] ${statsFilterOpen || statsActiveFilterCount > 0 ? 'text-white' : 'text-slate-700'}`} />
                  {statsActiveFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-xs ring-1 ring-white">
                      {statsActiveFilterCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStatsModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expandable Filter Box inside Stats Modal */}
            {statsFilterOpen && (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 sm:p-5 mb-5 animate-in slide-in-from-top-2 duration-150 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-emerald-200/60">
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-4 h-4 text-emerald-800" />
                    <span className="text-xs font-bold text-emerald-950">
                      {language === 'th' ? 'ตัวกรองข้อมูลสถิติ (ช่วงวันที่ และ เงื่อนไข)' : 'Analytics Filter Settings'}
                    </span>
                  </div>
                  {statsActiveFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetStatsFilters}
                      className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-white/80 hover:bg-white px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{language === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Reset All'}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* 1. Date Range Section */}
                  <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-emerald-950">
                        {language === 'th' ? '1. ช่วงวันที่ (เริ่มต้น - สิ้นสุด)' : '1. Date Range'}
                      </label>
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/60 px-1.5 py-0.5 rounded">
                        {language === 'th' ? `วันที่ ${statsStartDay} ถึง ${statsEndDay}` : `Days ${statsStartDay} - ${statsEndDay}`}
                      </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setStatsFilterDayRange('all');
                          setStatsStartDay(1);
                          setStatsEndDay(records.length || 31);
                        }}
                        className={`px-1.5 py-1.5 rounded-lg font-bold text-[10.5px] transition-all cursor-pointer text-center ${
                          statsFilterDayRange === 'all'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-emerald-200 hover:bg-emerald-100/50'
                        }`}
                      >
                        {language === 'th' ? 'ทั้งเดือน' : 'All'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatsFilterDayRange('first_half');
                          setStatsStartDay(1);
                          setStatsEndDay(15);
                        }}
                        className={`px-1.5 py-1.5 rounded-lg font-bold text-[10.5px] transition-all cursor-pointer text-center ${
                          statsFilterDayRange === 'first_half'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-emerald-200 hover:bg-emerald-100/50'
                        }`}
                      >
                        {language === 'th' ? '1-15' : '1-15'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStatsFilterDayRange('second_half');
                          setStatsStartDay(16);
                          setStatsEndDay(records.length || 31);
                        }}
                        className={`px-1.5 py-1.5 rounded-lg font-bold text-[10.5px] transition-all cursor-pointer text-center ${
                          statsFilterDayRange === 'second_half'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-emerald-200 hover:bg-emerald-100/50'
                        }`}
                      >
                        {language === 'th' ? '16-สิ้นเดือน' : '16-End'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatsFilterDayRange('custom')}
                        className={`px-1.5 py-1.5 rounded-lg font-bold text-[10.5px] transition-all cursor-pointer text-center ${
                          statsFilterDayRange === 'custom'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-emerald-200 hover:bg-emerald-100/50'
                        }`}
                      >
                        {language === 'th' ? 'กำหนดเอง' : 'Custom'}
                      </button>
                    </div>

                    {/* Start Day & End Day Inputs */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                          {language === 'th' ? 'ตั้งแต่วันที่:' : 'From Day:'}
                        </label>
                        <select
                          value={statsStartDay}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setStatsStartDay(val);
                            setStatsFilterDayRange('custom');
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border border-emerald-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {Array.from({ length: records.length || 31 }, (_, i) => i + 1).map((d) => (
                            <option key={`start-day-${d}`} value={d}>
                              {language === 'th' ? `วันที่ ${d}` : `Day ${d}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                          {language === 'th' ? 'ถึงวันที่:' : 'To Day:'}
                        </label>
                        <select
                          value={statsEndDay}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setStatsEndDay(val);
                            setStatsFilterDayRange('custom');
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border border-emerald-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {Array.from({ length: records.length || 31 }, (_, i) => i + 1).map((d) => (
                            <option key={`end-day-${d}`} value={d}>
                              {language === 'th' ? `วันที่ ${d}` : `Day ${d}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 2. Data Condition & Minimum Weight */}
                  <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/70 space-y-2.5">
                    <label className="block text-[11px] font-bold text-emerald-950">
                      {language === 'th' ? '2. เงื่อนไขข้อมูล' : '2. Data Condition'}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setStatsFilterMode('all')}
                        className={`px-2 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                          statsFilterMode === 'all'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-emerald-200 hover:bg-emerald-100/50'
                        }`}
                      >
                        {language === 'th' ? 'ทุกวัน' : 'All'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatsFilterMode('has_data')}
                        className={`px-2 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                          statsFilterMode === 'has_data'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-emerald-200 hover:bg-emerald-100/50'
                        }`}
                      >
                        {language === 'th' ? 'มีข้อมูล' : 'Has Data'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatsFilterMode('has_wash')}
                        className={`px-2 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                          statsFilterMode === 'has_wash'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-emerald-200 hover:bg-emerald-100/50'
                        }`}
                      >
                        {language === 'th' ? 'มีชั่งซัก' : 'Has Wash'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatsFilterMode('has_discard')}
                        className={`px-2 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                          statsFilterMode === 'has_discard'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-emerald-200 hover:bg-emerald-100/50'
                        }`}
                      >
                        {language === 'th' ? 'มีคัดทิ้ง' : 'Has Discard'}
                      </button>
                    </div>

                    {/* Min Weight Filter */}
                    <div className="pt-1">
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                        {language === 'th' ? 'น้ำหนักรวมขั้นต่ำ (KG):' : 'Min Weight (KG):'}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={statsFilterMinWeight}
                        onChange={(e) => setStatsFilterMinWeight(e.target.value)}
                        placeholder="0.0"
                        className="w-full px-2 py-1.5 rounded-lg border border-emerald-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Metrics Grid (Dynamic by selected filter) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-[#f8fafc] p-3.5 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-medium block mb-1">
                  {language === 'th' ? 'วันที่บันทึก (ตามตัวกรอง)' : 'Active Days'}
                </span>
                <p className="text-lg font-bold text-slate-900">
                  {statsAnalysis.activeDays} <span className="text-xs font-normal text-slate-500">/ {statsFilteredRecords.length} วัน</span>
                </p>
              </div>

              <div className="bg-[#f0fdf4] p-3.5 rounded-xl border border-emerald-200">
                <span className="text-[11px] text-emerald-700 font-medium block mb-1">
                  {language === 'th' ? 'เฉลี่ยต่อวัน' : 'Daily Average'}
                </span>
                <p className="text-lg font-bold text-emerald-900">
                  {statsAnalysis.avgDailyKg} <span className="text-xs font-normal text-emerald-700">KG</span>
                </p>
              </div>

              <div className="bg-[#eff6ff] p-3.5 rounded-xl border border-blue-200">
                <span className="text-[11px] text-blue-700 font-medium block mb-1">
                  {language === 'th' ? 'ยอดสูงสุดต่อวัน' : 'Peak Day'}
                </span>
                <p className="text-lg font-bold text-blue-900">
                  {statsAnalysis.peakKg.toFixed(1)} <span className="text-xs font-normal text-blue-700">KG (วันที่ {statsAnalysis.peakDay})</span>
                </p>
              </div>

              <div className="bg-[#faf5ff] p-3.5 rounded-xl border border-purple-200">
                <span className="text-[11px] text-purple-700 font-medium block mb-1">
                  {language === 'th' ? 'อัตราผลผลิต (Yield)' : 'Overall Yield'}
                </span>
                <p className="text-lg font-bold text-purple-900">
                  {statsYieldRate}%
                </p>
              </div>
            </div>

            {/* Material Breakdown Comparison (Dynamic by selected filter) */}
            <div className="space-y-4 mb-5">
              <h4 className="text-xs font-bold text-[#002045] uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>{language === 'th' ? 'เปรียบเทียบสัดส่วน: เศษผ้า vs ถุงมือ (ตามช่วงวันที่เลือก)' : 'Material Comparison: Rags vs Gloves (Filtered Range)'}</span>
              </h4>

              {/* Volume Distribution Bar */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-2">
                  <span>เศษผ้า (Rags): {statsTotals.beforeWashRags.toFixed(1)} KG ({statsAnalysis.ragsPct}%)</span>
                  <span>ถุงมือ (Gloves): {statsTotals.beforeWashGloves.toFixed(1)} KG ({statsAnalysis.glovesPct}%)</span>
                </div>
                <div className="w-full h-3.5 bg-gray-200 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-emerald-600 transition-all duration-500" 
                    style={{ width: `${statsAnalysis.ragsPct}%` }}
                    title={`เศษผ้า: ${statsAnalysis.ragsPct}%`}
                  />
                  <div 
                    className="h-full bg-blue-600 transition-all duration-500" 
                    style={{ width: `${statsAnalysis.glovesPct}%` }}
                    title={`ถุงมือ: ${statsAnalysis.glovesPct}%`}
                  />
                </div>
              </div>

              {/* Detailed 2-column comparison card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Rags Details */}
                <div className="bg-emerald-50/60 border border-emerald-200 p-3.5 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                      {language === 'th' ? 'ข้อมูลเศษผ้า (Rags)' : 'Rags Summary'}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                      Yield: {statsAnalysis.ragsYield}%
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-emerald-950">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ชั่งก่อนซัก:</span>
                      <span className="font-bold">{statsTotals.beforeWashRags.toFixed(1)} KG</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ชั่งหลังซัก:</span>
                      <span className="font-bold">{statsTotals.afterWashRags.toFixed(1)} KG</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">คัดทิ้ง:</span>
                      <span className="font-bold text-rose-700">{statsTotals.discardRags.toFixed(1)} KG ({statsAnalysis.ragsDiscardRate}%)</span>
                    </div>
                  </div>
                </div>

                {/* Gloves Details */}
                <div className="bg-blue-50/60 border border-blue-200 p-3.5 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      {language === 'th' ? 'ข้อมูลถุงมือ (Gloves)' : 'Gloves Summary'}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                      Yield: {statsAnalysis.glovesYield}%
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-blue-950">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ชั่งก่อนซัก:</span>
                      <span className="font-bold">{statsTotals.beforeWashGloves.toFixed(1)} KG</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ชั่งหลังซัก:</span>
                      <span className="font-bold">{statsTotals.afterWashGloves.toFixed(1)} KG</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">คัดทิ้ง:</span>
                      <span className="font-bold text-rose-700">{statsTotals.discardGloves.toFixed(1)} KG ({statsAnalysis.glovesDiscardRate}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Log Breakdown Table (ตามตัวกรองที่เลือก) */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#002045] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>{language === 'th' ? `ตารางรายละเอียดรายวันตามตัวกรอง (${statsFilteredRecords.length} วัน)` : `Daily Records Breakdown (${statsFilteredRecords.length} days)`}</span>
                </h4>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {language === 'th' ? `ยอดสุทธิรวม: ${statsTotals.netTotal.toFixed(1)} KG` : `Net Total: ${statsTotals.netTotal.toFixed(1)} KG`}
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-56 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-2.5 text-center w-14">{language === 'th' ? 'วันที่' : 'Day'}</th>
                      <th className="py-2 px-2 text-center bg-rose-50/80 text-rose-900">{language === 'th' ? 'คัดทิ้ง (ผ้า/ถุงมือ)' : 'Discard'}</th>
                      <th className="py-2 px-2 text-center bg-emerald-50/80 text-emerald-900">{language === 'th' ? 'ก่อนซัก (ผ้า/ถุงมือ)' : 'Before Wash'}</th>
                      <th className="py-2 px-2 text-center bg-amber-50/80 text-amber-900">{language === 'th' ? 'หลังซัก (ผ้า/ถุงมือ)' : 'After Wash'}</th>
                      <th className="py-2 px-2 text-center bg-slate-200/80 text-slate-900">{language === 'th' ? 'สุทธิ (KG)' : 'Net (KG)'}</th>
                      <th className="py-2 px-2.5">{language === 'th' ? 'หมายเหตุ' : 'Note'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {statsFilteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                          {language === 'th' ? 'ไม่พบข้อมูลตามเงื่อนไขตัวกรองที่เลือก' : 'No records match the selected filter'}
                        </td>
                      </tr>
                    ) : (
                      statsFilteredRecords.map((r) => {
                        const rowNet = getRowNet(r);
                        const hasActivity = (r.discardRagsKg || 0) + (r.discardGlovesKg || 0) + (r.beforeWashRagsKg || 0) + (r.beforeWashGlovesKg || 0) + (r.afterWashRagsKg || 0) + (r.afterWashGlovesKg || 0) > 0 || (r.note && r.note.trim());
                        return (
                          <tr key={`stat-row-${r.day}`} className={`hover:bg-slate-50/80 transition-colors ${hasActivity ? 'bg-white' : 'bg-slate-50/40 text-slate-400'}`}>
                            <td className="py-1.5 px-2.5 text-center font-bold text-slate-800">
                              {r.day}
                            </td>
                            <td className="py-1.5 px-2 text-center text-rose-700">
                              {(r.discardRagsKg || 0) + (r.discardGlovesKg || 0) > 0 ? (
                                <span className="font-semibold">{r.discardRagsKg || 0} / {r.discardGlovesKg || 0}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-center text-emerald-800">
                              {(r.beforeWashRagsKg || 0) + (r.beforeWashGlovesKg || 0) > 0 ? (
                                <span className="font-semibold">{r.beforeWashRagsKg || 0} / {r.beforeWashGlovesKg || 0}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-center text-amber-800">
                              {(r.afterWashRagsKg || 0) + (r.afterWashGlovesKg || 0) > 0 ? (
                                <span className="font-semibold">{r.afterWashRagsKg || 0} / {r.afterWashGlovesKg || 0}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-center font-bold text-slate-900 bg-slate-50/50">
                              {rowNet > 0 ? rowNet : '-'}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-600 truncate max-w-[150px]">
                              {r.note || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {statsFilteredRecords.length > 0 && (
                    <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-10">
                      <tr>
                        <td className="py-2 px-2.5 text-center font-bold">{language === 'th' ? 'รวม' : 'Total'}</td>
                        <td className="py-2 px-2 text-center text-rose-700 font-bold">
                          {statsTotals.discardRags.toFixed(1)} / {statsTotals.discardGloves.toFixed(1)}
                        </td>
                        <td className="py-2 px-2 text-center text-emerald-800 font-bold">
                          {statsTotals.beforeWashRags.toFixed(1)} / {statsTotals.beforeWashGloves.toFixed(1)}
                        </td>
                        <td className="py-2 px-2 text-center text-amber-800 font-bold">
                          {statsTotals.afterWashRags.toFixed(1)} / {statsTotals.afterWashGloves.toFixed(1)}
                        </td>
                        <td className="py-2 px-2 text-center text-slate-900 font-black bg-slate-200">
                          {statsTotals.netTotal.toFixed(1)}
                        </td>
                        <td className="py-2 px-2.5 text-slate-500 font-normal">
                          {statsFilteredRecords.length} {language === 'th' ? 'วัน' : 'days'}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setStatsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#43474e] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatsModalOpen(false);
                  handlePrint();
                }}
                className="px-4 py-2 text-xs font-bold bg-[#002045] hover:bg-[#003366] text-white rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                {language === 'th' ? 'พิมพ์รายงานนี้' : 'Print Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Google Form Modal (Admin / Supervisor Only) */}
      {qrModalOpen && isAdmin && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setQrModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-emerald-100 w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#002045]">
                    {language === 'th' ? 'QR Code แบบฟอร์มบันทึกข้อมูล' : 'Rags & Gloves Form QR Code'}
                  </h3>
                  <p className="text-xs text-[#74777f]">
                    {language === 'th' ? 'สแกนเพื่อบันทึกข้อมูลเศษผ้า - ถุงมือ ผ่าน Google Form' : 'Scan to submit records via Google Form'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                title={language === 'th' ? 'ปิด' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code Container */}
            <div className="py-5 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-gradient-to-b from-emerald-50 to-white rounded-2xl border-2 border-emerald-200/80 shadow-md">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(RAGS_GLOVES_FORM_URL)}&margin=8`}
                  alt="QR Code Google Form"
                  className="w-52 h-52 sm:w-60 sm:h-60 rounded-xl bg-white shadow-inner"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="mt-4 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{language === 'th' ? 'สแกนด้วยกล้องมือถือเพื่อเปิดแบบฟอร์มทันที' : 'Scan with mobile camera to open form instantly'}</span>
              </div>

              {/* URL Box */}
              <div className="mt-3.5 w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 text-left">
                <span className="text-xs font-mono text-slate-600 truncate flex-1 select-all">
                  {RAGS_GLOVES_FORM_URL}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(RAGS_GLOVES_FORM_URL);
                    setQrCopied(true);
                    setTimeout(() => setQrCopied(false), 2500);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    qrCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {qrCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{language === 'th' ? 'คัดลอกแล้ว' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{language === 'th' ? 'คัดลอก' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2.5">
              <a
                href={RAGS_GLOVES_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{language === 'th' ? 'เปิดแบบฟอร์ม' : 'Open Form'}</span>
              </a>

              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(RAGS_GLOVES_FORM_URL)}&margin=10`}
                download="rags-gloves-form-qr-code.png"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{language === 'th' ? 'บันทึกรูป QR' : 'Save QR'}</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
                  <Filter className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">
                    {language === 'th' ? 'ตัวกรองข้อมูลเศษผ้า - ถุงมือ' : 'Filter Rags & Gloves'}
                  </h3>
                  <p className="text-xs text-emerald-100">
                    {language === 'th' ? 'เลือกเงื่อนไขเพื่อกรองแถวในตาราง' : 'Select criteria to filter records'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Date Range Filter */}
              <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-emerald-950">
                    {language === 'th' ? 'ช่วงวันที่' : 'Day Range'}
                  </label>
                  <span className="text-[11px] text-emerald-700 font-semibold bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {language === 'th' ? `วันที่ ${filterStartDay} - ${filterEndDay}` : `Days ${filterStartDay} - ${filterEndDay}`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStartDay(1);
                      setFilterEndDay(records.length || 31);
                    }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      filterStartDay === 1 && filterEndDay >= (records.length || 31)
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-100/50'
                    }`}
                  >
                    {language === 'th' ? 'ทั้งเดือน' : 'All'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStartDay(1);
                      setFilterEndDay(15);
                    }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      filterStartDay === 1 && filterEndDay === 15
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-100/50'
                    }`}
                  >
                    {language === 'th' ? 'วันที่ 1-15' : '1-15'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStartDay(16);
                      setFilterEndDay(records.length || 31);
                    }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      filterStartDay === 16 && filterEndDay >= (records.length || 31)
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-100/50'
                    }`}
                  >
                    {language === 'th' ? 'วันที่ 16-สิ้นเดือน' : '16-End'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                      {language === 'th' ? 'ตั้งแต่วันที่:' : 'From Day:'}
                    </label>
                    <select
                      value={filterStartDay}
                      onChange={(e) => setFilterStartDay(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {Array.from({ length: records.length || 31 }, (_, i) => i + 1).map((d) => (
                        <option key={`main-filter-start-${d}`} value={d}>
                          {language === 'th' ? `วันที่ ${d}` : `Day ${d}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                      {language === 'th' ? 'ถึงวันที่:' : 'To Day:'}
                    </label>
                    <select
                      value={filterEndDay}
                      onChange={(e) => setFilterEndDay(parseInt(e.target.value, 10))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {Array.from({ length: records.length || 31 }, (_, i) => i + 1).map((d) => (
                        <option key={`main-filter-end-${d}`} value={d}>
                          {language === 'th' ? `วันที่ ${d}` : `Day ${d}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Filter Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'th' ? 'ประเภทข้อมูล' : 'Data Type'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      filterMode === 'all'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'th' ? 'ทั้งหมด (ทุกแถว)' : 'All Records'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('has_data')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      filterMode === 'has_data'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'th' ? 'เฉพาะวันที่มีข้อมูล' : 'Logged Only'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('has_discard')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      filterMode === 'has_discard'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'th' ? 'เฉพาะวันที่มีคัดทิ้ง' : 'Discard Only'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('has_wash')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      filterMode === 'has_wash'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'th' ? 'เฉพาะวันที่มีการชั่งซัก' : 'Wash Only'}
                  </button>
                </div>
              </div>

              {/* Search text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'th' ? 'ค้นหาวันที่ หรือ หมายเหตุ' : 'Search Day or Note'}
                </label>
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder={language === 'th' ? 'เช่น วันที่ 15 หรือ ข้อความหมายเหตุ...' : 'e.g. 15 or note keyword...'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Minimum Weight */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {language === 'th' ? 'น้ำหนักรวมขั้นต่ำ (KG)' : 'Minimum Total Weight (KG)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={filterMinWeight}
                  onChange={(e) => setFilterMinWeight(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setFilterMode('all');
                  setFilterSearch('');
                  setFilterMinWeight('');
                  setFilterStartDay(1);
                  setFilterEndDay(records.length || 31);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                {language === 'th' ? 'ล้างตัวกรองทั้งหมด' : 'Reset Filters'}
              </button>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                {language === 'th' ? 'เสร็จสิ้น' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

