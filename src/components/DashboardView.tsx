import React, { useState, useMemo, useEffect } from 'react';
import { 
  Shirt, 
  Gauge, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle2, 
  PackageCheck, 
  Waves, 
  PieChart, 
  Building2, 
  BarChart3, 
  CalendarDays, 
  Tag, 
  DoorOpen,
  Clock,
  Users,
  Calendar,
  Sparkles,
  Search,
  Filter,
  X,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  ChevronDown,
  CalendarRange,
  ExternalLink,
  CalendarCheck,
  Check,
  ChevronRight
} from 'lucide-react';
import { LaundryOrder, MeetingRoomBooking } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  fetchGoogleSheetMeetingRoomBookings, 
  convertSheetRowsToMeetingRoomBookings,
  FALLBACK_MEETING_ROOM_CSV,
  calculateMeetingStatus
} from '../services/googleSheetSyncService';

interface DashboardViewProps {
  laundryOrders?: LaundryOrder[];
  meetingBookings?: MeetingRoomBooking[];
  onCreateLaundryOrder?: () => void;
  onNavigateToLaundry?: () => void;
  onNavigateToRagsGloves?: () => void;
  onNavigateToMeetingRoom?: () => void;
  onNavigateToReports?: () => void;
}

type TimeframeOption = 'today' | 'week' | 'month' | 'year' | 'range' | 'all' | 'custom';
type ServiceScopeOption = 'all' | 'laundry' | 'meeting';

const STORAGE_KEY = 'proworkflow_meeting_room_bookings_cache_v1';

export const DashboardView: React.FC<DashboardViewProps> = ({
  laundryOrders = [],
  meetingBookings: propBookings,
  onCreateLaundryOrder,
  onNavigateToLaundry,
  onNavigateToRagsGloves,
  onNavigateToMeetingRoom,
  onNavigateToReports,
}) => {
  const { language, t } = useLanguage();

  // Current Date definitions
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDate = now.getDate();
  const todayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;
  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  // Filter States - Default to 'today' (วันปัจจุบัน)
  const [timeframe, setTimeframe] = useState<TimeframeOption>('today');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [startDate, setStartDate] = useState<string>(() => {
    // default 7 days ago
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const yr = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mm}-${dd}`;
  });
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [customDate, setCustomDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [serviceScope, setServiceScope] = useState<ServiceScopeOption>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Modal State for All Departments breakdown
  const [showAllDeptsModal, setShowAllDeptsModal] = useState<boolean>(false);
  const [modalDeptSearch, setModalDeptSearch] = useState<string>('');

  // Hover & Chart States
  const [hoveredStatusIndex, setHoveredStatusIndex] = useState<number | null>(null);
  const [hoveredDeptIndex, setHoveredDeptIndex] = useState<number | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [statusChartTab, setStatusChartTab] = useState<'laundry' | 'meeting'>('laundry');
  const [barChartMode, setBarChartMode] = useState<'daily' | 'category' | 'meeting_topics'>('daily');

  // Local state for meeting room bookings
  const [bookings, setBookings] = useState<MeetingRoomBooking[]>(() => {
    if (propBookings && propBookings.length > 0) return propBookings;
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return convertSheetRowsToMeetingRoomBookings(FALLBACK_MEETING_ROOM_CSV);
  });

  // Fetch updated meeting room bookings in background
  useEffect(() => {
    let isMounted = true;
    fetchGoogleSheetMeetingRoomBookings().then(res => {
      if (isMounted && res.bookings && res.bookings.length > 0) {
        setBookings(res.bookings);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Update if propBookings changes
  useEffect(() => {
    if (propBookings && propBookings.length > 0) {
      setBookings(propBookings);
    }
  }, [propBookings]);

  // Helper to extract date YYYY-MM-DD from order
  const getOrderDateString = (order: LaundryOrder): string | null => {
    if (order.orderDate) {
      const match = order.orderDate.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    }
    if (order.receivedAt) {
      const slashMatch = order.receivedAt.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (slashMatch) {
        let yr = parseInt(slashMatch[3], 10);
        if (yr > 2400) yr -= 543;
        else if (yr < 100) yr += 2000;
        const mm = slashMatch[2].padStart(2, '0');
        const dd = slashMatch[1].padStart(2, '0');
        return `${yr}-${mm}-${dd}`;
      }
      const matchISO = order.receivedAt.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (matchISO) return `${matchISO[1]}-${matchISO[2]}-${matchISO[3]}`;
    }
    const matchCode = order.trackingCode.replace(/\s+/g, '').match(/LKB2-?(\d{2})(\d{2})(\d{2})/i);
    if (matchCode) {
      const yy = parseInt(matchCode[1], 10);
      const year = yy < 50 ? `20${matchCode[1]}` : (yy > 2400 ? `${yy - 543}` : `19${matchCode[1]}`);
      const month = matchCode[2];
      const day = matchCode[3];
      return `${year}-${month}-${day}`;
    }
    if (order.id) {
      const match = order.id.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    }
    return null;
  };

  // Helper to extract date YYYY-MM-DD from booking
  const getBookingDateString = (b: MeetingRoomBooking): string | null => {
    if (!b.bookingDate) return null;
    const parts = b.bookingDate.trim().split(/[-/.]/);
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      let y = parseInt(parts[2], 10);
      if (y > 2500) y -= 543;
      if (y < 100) y += 2000;
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  };

  // Week boundaries (Monday to Sunday)
  const { startOfWeekStr, endOfWeekStr } = useMemo(() => {
    const d = new Date(now);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const sYr = start.getFullYear();
    const sMm = String(start.getMonth() + 1).padStart(2, '0');
    const sDd = String(start.getDate()).padStart(2, '0');

    const eYr = end.getFullYear();
    const eMm = String(end.getMonth() + 1).padStart(2, '0');
    const eDd = String(end.getDate()).padStart(2, '0');

    return {
      startOfWeekStr: `${sYr}-${sMm}-${sDd}`,
      endOfWeekStr: `${eYr}-${eMm}-${eDd}`
    };
  }, [now]);

  const thaiMonthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const englishMonthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const thaiShortMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  // Format date helper for Thai / Eng display
  const formatDateDisplay = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const mm = parseInt(parts[1], 10);
      const dd = parseInt(parts[2], 10);
      if (language === 'th') {
        return `${dd} ${thaiShortMonths[mm - 1]} ${yr + 543}`;
      }
      return `${dd} ${englishMonthNames[mm - 1].substring(0, 3)} ${yr}`;
    }
    return dateStr;
  };

  // Available years dynamically gathered from data
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentYear);
    yearsSet.add(currentYear - 1);
    yearsSet.add(currentYear - 2);

    laundryOrders.forEach(o => {
      const dStr = getOrderDateString(o);
      if (dStr) {
        const yr = parseInt(dStr.split('-')[0], 10);
        if (yr > 2000 && yr < 2100) yearsSet.add(yr);
      }
    });

    bookings.forEach(b => {
      const dStr = getBookingDateString(b);
      if (dStr) {
        const yr = parseInt(dStr.split('-')[0], 10);
        if (yr > 2000 && yr < 2100) yearsSet.add(yr);
      }
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [laundryOrders, bookings, currentYear]);

  // Label for active timeframe display
  const activeTimeframeLabel = useMemo(() => {
    if (timeframe === 'today') {
      return language === 'th' ? `วันนี้ (${formatDateDisplay(todayStr)})` : `Today (${formatDateDisplay(todayStr)})`;
    }
    if (timeframe === 'week') {
      return language === 'th' 
        ? `สัปดาห์นี้ (${formatDateDisplay(startOfWeekStr)} - ${formatDateDisplay(endOfWeekStr)})` 
        : `This Week (${formatDateDisplay(startOfWeekStr)} - ${formatDateDisplay(endOfWeekStr)})`;
    }
    if (timeframe === 'month') {
      const mName = language === 'th' ? `${thaiMonthNames[currentMonth - 1]} ${currentYear + 543}` : `${englishMonthNames[currentMonth - 1]} ${currentYear}`;
      return language === 'th' ? `เดือนนี้ (${mName})` : `This Month (${mName})`;
    }
    if (timeframe === 'year') {
      return language === 'th' ? `ประจำปี ${selectedYear + 543} (${selectedYear})` : `Year ${selectedYear}`;
    }
    if (timeframe === 'range') {
      const minD = startDate <= endDate ? startDate : endDate;
      const maxD = startDate <= endDate ? endDate : startDate;
      return language === 'th' 
        ? `ช่วงวันที่ ${formatDateDisplay(minD)} - ${formatDateDisplay(maxD)}` 
        : `Date Range: ${formatDateDisplay(minD)} - ${formatDateDisplay(maxD)}`;
    }
    if (timeframe === 'custom') {
      return language === 'th' ? `วันที่ ${formatDateDisplay(customDate)}` : `Date: ${formatDateDisplay(customDate)}`;
    }
    return language === 'th' ? 'ข้อมูลทั้งหมด (All Time)' : 'All Records (All Time)';
  }, [timeframe, selectedYear, startDate, endDate, customDate, todayStr, startOfWeekStr, endOfWeekStr, currentMonth, currentYear, language]);

  // List of all available departments for filter
  const departmentOptions = useMemo(() => {
    const deptSet = new Set<string>();
    laundryOrders.forEach(o => {
      if (o.customerRoomOrDept && o.customerRoomOrDept.trim()) {
        deptSet.add(o.customerRoomOrDept.trim());
      }
    });
    bookings.forEach(b => {
      if (b.department && b.department.trim()) {
        deptSet.add(b.department.trim());
      }
    });
    return Array.from(deptSet).sort((a, b) => a.localeCompare(b, 'th'));
  }, [laundryOrders, bookings]);

  // Date filter matching predicate
  const isDateMatched = (dStr: string | null): boolean => {
    if (!dStr) return timeframe === 'all';

    if (timeframe === 'today') {
      return dStr === todayStr;
    }
    if (timeframe === 'week') {
      return dStr >= startOfWeekStr && dStr <= endOfWeekStr;
    }
    if (timeframe === 'month') {
      return dStr.startsWith(currentMonthStr);
    }
    if (timeframe === 'year') {
      return dStr.startsWith(`${selectedYear}-`);
    }
    if (timeframe === 'range') {
      const minD = startDate <= endDate ? startDate : endDate;
      const maxD = startDate <= endDate ? endDate : startDate;
      return dStr >= minD && dStr <= maxD;
    }
    if (timeframe === 'custom') {
      return dStr === customDate;
    }
    return true; // 'all'
  };

  // 1. Filtered Laundry Orders
  const filteredLaundryOrders = useMemo(() => {
    return laundryOrders.filter(order => {
      // Date filter
      const dStr = getOrderDateString(order);
      if (!isDateMatched(dStr)) return false;

      // Department filter
      if (selectedDept !== 'ALL') {
        const orderDept = order.customerRoomOrDept?.trim() || '';
        if (orderDept.toLowerCase() !== selectedDept.toLowerCase()) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tracking = (order.trackingCode || '').toLowerCase();
        const customer = (order.customerName || '').toLowerCase();
        const dept = (order.customerRoomOrDept || '').toLowerCase();
        const notes = (order.notes || '').toLowerCase();
        const items = order.items.map(i => i.name.toLowerCase()).join(' ');

        const match = tracking.includes(q) || customer.includes(q) || dept.includes(q) || notes.includes(q) || items.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [laundryOrders, timeframe, selectedYear, startDate, endDate, customDate, todayStr, startOfWeekStr, endOfWeekStr, currentMonthStr, selectedDept, searchQuery]);

  // 2. Filtered Meeting Bookings
  const parsedBookings = useMemo(() => {
    return bookings.map(b => {
      const liveStatus = calculateMeetingStatus(b.bookingDate, b.startTime, b.endTime);
      return {
        ...b,
        status: liveStatus
      };
    });
  }, [bookings]);

  const filteredMeetingBookings = useMemo(() => {
    return parsedBookings.filter(b => {
      // Date filter
      const dStr = getBookingDateString(b);
      if (!isDateMatched(dStr)) return false;

      // Department filter
      if (selectedDept !== 'ALL') {
        const bDept = (b.department || '').trim();
        if (bDept.toLowerCase() !== selectedDept.toLowerCase()) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const subject = (b.subject || '').toLowerCase();
        const booker = (b.bookerName || '').toLowerCase();
        const dept = (b.department || '').toLowerCase();
        const room = (b.room || '').toLowerCase();
        const purpose = (b.purpose || '').toLowerCase();

        const match = subject.includes(q) || booker.includes(q) || dept.includes(q) || room.includes(q) || purpose.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [parsedBookings, timeframe, selectedYear, startDate, endDate, customDate, todayStr, startOfWeekStr, endOfWeekStr, currentMonthStr, selectedDept, searchQuery]);

  // Active counts for filtered laundry
  const inWashingLaundryCount = filteredLaundryOrders.filter(o => o.stage !== 'ready' && o.stage !== 'delivered' && o.stage !== 'completed').length;
  const readyLaundryCount = filteredLaundryOrders.filter(o => o.stage === 'ready' || o.stage === 'delivered').length;
  const completedLaundryCount = filteredLaundryOrders.filter(o => o.stage === 'ready' || o.stage === 'delivered' || o.stage === 'completed').length;
  const totalLaundryPieces = useMemo(() => {
    return filteredLaundryOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
  }, [filteredLaundryOrders]);

  const laundryCompletionRate = filteredLaundryOrders.length > 0
    ? Math.round((completedLaundryCount / filteredLaundryOrders.length) * 100)
    : 100;

  // Real-time room occupancy & active status
  const ongoingMeetings = useMemo(() => {
    return parsedBookings.filter(b => b.status === 'กำลังประชุม');
  }, [parsedBookings]);

  const todayAllBookings = useMemo(() => {
    return parsedBookings.filter(b => getBookingDateString(b) === todayStr);
  }, [parsedBookings, todayStr]);

  const roomStatus = useMemo(() => {
    const getRoomStatus = (roomName: string) => {
      const current = ongoingMeetings.find(b => b.room.toUpperCase().includes(roomName.toUpperCase()));
      if (current) {
        return {
          isOccupied: true,
          meeting: current,
          statusText: language === 'th' ? 'กำลังใช้งาน' : 'In Use',
          color: 'bg-emerald-500'
        };
      }
      const upcomingToday = todayAllBookings.find(b => 
        b.room.toUpperCase().includes(roomName.toUpperCase()) && b.status === 'รอเริ่มวันนี้'
      );
      if (upcomingToday) {
        return {
          isOccupied: false,
          meeting: upcomingToday,
          statusText: language === 'th' ? `ว่าง (รอเริ่ม ${upcomingToday.startTime})` : `Available (Starts ${upcomingToday.startTime})`,
          color: 'bg-amber-500'
        };
      }
      return {
        isOccupied: false,
        meeting: null,
        statusText: language === 'th' ? 'ว่างพร้อมใช้งาน' : 'Available',
        color: 'bg-sky-500'
      };
    };

    return {
      tpm1: getRoomStatus('TPM 1'),
      tpm2: getRoomStatus('TPM 2')
    };
  }, [ongoingMeetings, todayAllBookings, language]);

  // 3. Meeting Room Topics & Summary Calculations
  const meetingSummary = useMemo(() => {
    const totalBookings = filteredMeetingBookings.length;
    const totalAttendees = filteredMeetingBookings.reduce((sum, b) => sum + (b.attendeesCount || 0), 0);

    // Group by meeting topic / subject
    const topicMap: Record<string, {
      subject: string;
      count: number;
      attendees: number;
      departments: Set<string>;
      rooms: Set<string>;
      latestDate: string;
      latestTime: string;
      bookings: MeetingRoomBooking[];
    }> = {};

    let ongoingCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let tpm1Count = 0;
    let tpm2Count = 0;

    filteredMeetingBookings.forEach(b => {
      const subj = (b.subject || '').trim() || (language === 'th' ? 'การประชุมทั่วไป' : 'General Meeting');
      if (!topicMap[subj]) {
        topicMap[subj] = {
          subject: subj,
          count: 0,
          attendees: 0,
          departments: new Set<string>(),
          rooms: new Set<string>(),
          latestDate: b.bookingDate || '',
          latestTime: b.startTime || '',
          bookings: []
        };
      }

      topicMap[subj].count += 1;
      topicMap[subj].attendees += b.attendeesCount || 0;
      if (b.department) topicMap[subj].departments.add(b.department.trim());
      if (b.room) topicMap[subj].rooms.add(b.room.trim());
      topicMap[subj].bookings.push(b);

      if (b.status === 'กำลังประชุม') ongoingCount += 1;
      else if (b.status === 'รอเริ่มวันนี้' || b.status === 'นัดหมายล่วงหน้า') upcomingCount += 1;
      else if (b.status === 'เสร็จสิ้นแล้ว') completedCount += 1;

      if (b.room?.toUpperCase().includes('TPM 1')) tpm1Count += 1;
      if (b.room?.toUpperCase().includes('TPM 2')) tpm2Count += 1;
    });

    const sortedTopics = Object.values(topicMap).map(item => ({
      subject: item.subject,
      count: item.count,
      attendees: item.attendees,
      departments: Array.from(item.departments),
      rooms: Array.from(item.rooms),
      latestDate: item.latestDate,
      latestTime: item.latestTime,
      bookings: item.bookings
    })).sort((a, b) => b.count - a.count || b.attendees - a.attendees);

    return {
      totalBookings,
      totalAttendees,
      uniqueTopicsCount: sortedTopics.length,
      topics: sortedTopics,
      ongoingCount,
      upcomingCount,
      completedCount,
      tpm1Count,
      tpm2Count
    };
  }, [filteredMeetingBookings, language]);

  // Chart 1: Status Breakdown of Filtered Laundry & Meeting Room Services
  const statusSegmentsData = useMemo(() => {
    if (statusChartTab === 'meeting') {
      const rawMeetings = [
        {
          id: 'meeting_completed',
          label: language === 'th' ? 'เสร็จสิ้นแล้ว' : 'Completed',
          count: meetingSummary.completedCount,
          color: '#10b981',
          textColor: 'text-emerald-700',
          icon: CheckCircle2
        },
        {
          id: 'meeting_ongoing',
          label: language === 'th' ? 'กำลังประชุม' : 'In Progress',
          count: meetingSummary.ongoingCount,
          color: '#0284c7',
          textColor: 'text-sky-700',
          icon: Users
        },
        {
          id: 'meeting_upcoming',
          label: language === 'th' ? 'รอเริ่ม / นัดหมายล่วงหน้า' : 'Upcoming / Scheduled',
          count: meetingSummary.upcomingCount,
          color: '#f59e0b',
          textColor: 'text-amber-700',
          icon: Clock
        }
      ];

      const total = rawMeetings.reduce((sum, item) => sum + item.count, 0) || 1;
      const radius = 52;
      const circumference = 2 * Math.PI * radius;
      let accumulatedOffset = 0;

      return {
        total,
        isMeeting: true,
        segments: rawMeetings.map((item, idx) => {
          const percentageVal = item.count / total;
          const strokeLength = percentageVal * circumference;
          const dashOffset = accumulatedOffset;
          accumulatedOffset += strokeLength;

          return {
            ...item,
            percentage: (percentageVal * 100).toFixed(1),
            strokeLength,
            dashOffset,
            radius,
            circumference,
            idx
          };
        })
      };
    }

    const rawLaundry = [
      {
        id: 'laundry_ready',
        label: language === 'th' ? 'ผ้าพร้อมส่ง / สำเร็จ' : 'Ready for Delivery',
        count: readyLaundryCount,
        color: '#10b981',
        textColor: 'text-emerald-700',
        icon: PackageCheck
      },
      {
        id: 'laundry_washing',
        label: language === 'th' ? 'ผ้าอยู่ระหว่างซัก' : 'In Washing',
        count: inWashingLaundryCount,
        color: '#f59e0b',
        textColor: 'text-amber-700',
        icon: Waves
      }
    ];

    const total = rawLaundry.reduce((sum, item) => sum + item.count, 0) || 1;
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    return {
      total,
      isMeeting: false,
      segments: rawLaundry.map((item, idx) => {
        const percentageVal = item.count / total;
        const strokeLength = percentageVal * circumference;
        const dashOffset = accumulatedOffset;
        accumulatedOffset += strokeLength;

        return {
          ...item,
          percentage: (percentageVal * 100).toFixed(1),
          strokeLength,
          dashOffset,
          radius,
          circumference,
          idx
        };
      })
    };
  }, [statusChartTab, readyLaundryCount, inWashingLaundryCount, meetingSummary, language]);

  // Chart 2: Department Distribution of Filtered Laundry AND Meeting Bookings (Top 5 + All Depts Modal Data)
  const deptData = useMemo(() => {
    const deptMap: Record<string, { 
      pieces: number; 
      orders: number; 
      meetings: number; 
      meetingTopics: Set<string>;
      meetingAttendees: number;
    }> = {};
    let totalPieces = 0;

    // Aggregate laundry orders by dept
    filteredLaundryOrders.forEach(order => {
      const dept = order.customerRoomOrDept?.trim() || (language === 'th' ? 'ส่วนกลาง' : 'General');
      const orderPieces = order.items.reduce((s, i) => s + i.quantity, 0) || 1;
      if (!deptMap[dept]) {
        deptMap[dept] = { pieces: 0, orders: 0, meetings: 0, meetingTopics: new Set<string>(), meetingAttendees: 0 };
      }
      deptMap[dept].pieces += orderPieces;
      deptMap[dept].orders += 1;
      totalPieces += orderPieces;
    });

    // Aggregate meeting room bookings by dept
    filteredMeetingBookings.forEach(b => {
      const dept = (b.department || '').trim() || (language === 'th' ? 'ส่วนกลาง' : 'General');
      if (!deptMap[dept]) {
        deptMap[dept] = { pieces: 0, orders: 0, meetings: 0, meetingTopics: new Set<string>(), meetingAttendees: 0 };
      }
      deptMap[dept].meetings += 1;
      if (b.subject && b.subject.trim()) {
        deptMap[dept].meetingTopics.add(b.subject.trim());
      }
      deptMap[dept].meetingAttendees += (b.attendeesCount || 0);
    });

    const modernPalette = ['#0284c7', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#e11d48'];
    // Sort by pieces first, then meetings count
    const sorted = Object.entries(deptMap).sort((a, b) => (b[1].pieces + b[1].meetings * 5) - (a[1].pieces + a[1].meetings * 5));
    
    // All list for modal
    const allDepartments = sorted.map(([name, val], i) => ({
      name,
      pieces: val.pieces,
      orders: val.orders,
      meetings: val.meetings,
      meetingTopics: Array.from(val.meetingTopics),
      meetingAttendees: val.meetingAttendees,
      percentage: totalPieces > 0 ? ((val.pieces / totalPieces) * 100).toFixed(1) : (val.meetings > 0 ? '100' : '0'),
      color: modernPalette[i % modernPalette.length]
    }));

    const top5 = sorted.slice(0, 5);
    const others = sorted.slice(5);
    const othersPieces = others.reduce((sum, [, val]) => sum + val.pieces, 0);
    const othersOrders = others.reduce((sum, [, val]) => sum + val.orders, 0);
    const othersMeetings = others.reduce((sum, [, val]) => sum + val.meetings, 0);

    const finalTop5Items = top5.map(([name, val], i) => ({
      name,
      pieces: val.pieces,
      orders: val.orders,
      meetings: val.meetings,
      meetingTopics: Array.from(val.meetingTopics),
      meetingAttendees: val.meetingAttendees,
      color: modernPalette[i % modernPalette.length],
      isOthers: false
    }));

    if (othersPieces > 0 || othersMeetings > 0) {
      finalTop5Items.push({
        name: language === 'th' ? 'แผนกอื่นๆ' : 'Others',
        pieces: othersPieces,
        orders: othersOrders,
        meetings: othersMeetings,
        meetingTopics: [],
        meetingAttendees: 0,
        color: '#64748b',
        isOthers: true
      });
    }

    if (finalTop5Items.length === 0) {
      finalTop5Items.push({
        name: language === 'th' ? 'ไม่มีข้อมูลในช่วงที่เลือก' : 'No Data In Range',
        pieces: 0,
        orders: 0,
        meetings: 0,
        meetingTopics: [],
        meetingAttendees: 0,
        color: '#94a3b8',
        isOthers: false
      });
    }

    const total = totalPieces || 1;
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    const segments = finalTop5Items.map((item, idx) => {
      const percentageVal = totalPieces > 0 ? item.pieces / total : 0;
      const strokeLength = percentageVal * circumference;
      const dashOffset = accumulatedOffset;
      accumulatedOffset += strokeLength;

      return {
        ...item,
        percentage: (percentageVal * 100).toFixed(1),
        strokeLength,
        dashOffset,
        radius,
        circumference,
        idx
      };
    });

    return {
      totalPieces,
      totalOrders: filteredLaundryOrders.length,
      totalMeetings: filteredMeetingBookings.length,
      departmentsCount: sorted.length,
      segments,
      allDepartments,
      hasOthers: (othersPieces > 0 || othersMeetings > 0),
      othersCount: others.length
    };
  }, [filteredLaundryOrders, filteredMeetingBookings, language]);

  // Chart 3: Timeline / Category / Meeting Topics Breakdown
  const filteredBarChartData = useMemo(() => {
    // 1. Daily Breakdown
    const dayMap: Record<string, { 
      readyPieces: number; 
      washingPieces: number; 
      totalPieces: number; 
      orders: number; 
      meetings: number; 
      fullDate: string; 
    }> = {};
    
    filteredLaundryOrders.forEach(order => {
      const dStr = getOrderDateString(order);
      const dayKey = dStr ? dStr : todayStr;
      const orderPieces = order.items.reduce((s, i) => s + i.quantity, 0) || 1;
      const isReady = order.stage === 'ready' || order.stage === 'delivered';

      if (!dayMap[dayKey]) {
        dayMap[dayKey] = { readyPieces: 0, washingPieces: 0, totalPieces: 0, orders: 0, meetings: 0, fullDate: dayKey };
      }
      if (isReady) {
        dayMap[dayKey].readyPieces += orderPieces;
      } else {
        dayMap[dayKey].washingPieces += orderPieces;
      }
      dayMap[dayKey].totalPieces += orderPieces;
      dayMap[dayKey].orders += 1;
    });

    filteredMeetingBookings.forEach(b => {
      const dStr = getBookingDateString(b);
      const dayKey = dStr ? dStr : todayStr;
      if (!dayMap[dayKey]) {
        dayMap[dayKey] = { readyPieces: 0, washingPieces: 0, totalPieces: 0, orders: 0, meetings: 0, fullDate: dayKey };
      }
      dayMap[dayKey].meetings += 1;
    });

    const sortedDays = Object.entries(dayMap).sort((a, b) => a[0].localeCompare(b[0]));
    
    // 2. Laundry Category Breakdown
    const catMap: Record<string, { pieces: number; orders: number }> = {};
    filteredLaundryOrders.forEach(order => {
      const garmentType = order.notes?.match(/ประเภทผ้า:\s*([^|]+)/)?.[1]?.trim() || 
                          order.items[0]?.name || (language === 'th' ? 'ผ้าทั่วไป' : 'General Linen');
      const orderPieces = order.items.reduce((s, i) => s + i.quantity, 0) || 1;
      if (!catMap[garmentType]) {
        catMap[garmentType] = { pieces: 0, orders: 0 };
      }
      catMap[garmentType].pieces += orderPieces;
      catMap[garmentType].orders += 1;
    });
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1].pieces - a[1].pieces).slice(0, 6);

    // 3. Meeting Topics Breakdown
    const meetingTopicsList = meetingSummary.topics;
    const maxTopicCount = Math.max(...meetingTopicsList.map(t => t.count), 1);
    const maxTopicAttendees = Math.max(...meetingTopicsList.map(t => t.attendees), 1);

    const maxDayPieces = Math.max(...sortedDays.map(([, v]) => v.totalPieces), 1);
    const maxCatPieces = Math.max(...sortedCats.map(([, v]) => v.pieces), 1);
    const totalPieces = filteredLaundryOrders.reduce((sum, o) => sum + o.items.reduce((isum, i) => isum + i.quantity, 0), 0);
    const totalOrders = filteredLaundryOrders.length;
    const avgPiecesPerOrder = totalOrders > 0 ? (totalPieces / totalOrders).toFixed(1) : '0';

    return {
      dailyBars: sortedDays.map(([dateKey, val]) => {
        const parts = dateKey.split('-');
        const dd = parts[2] ? parseInt(parts[2], 10) : 1;
        const mm = parts[1] ? parseInt(parts[1], 10) : 1;
        const label = `${dd} ${language === 'th' ? thaiShortMonths[mm - 1] : englishMonthNames[mm - 1].substring(0, 3)}`;
        return {
          dateKey,
          label,
          readyPieces: val.readyPieces,
          washingPieces: val.washingPieces,
          totalPieces: val.totalPieces,
          orders: val.orders,
          meetings: val.meetings,
          readyPercent: val.totalPieces > 0 ? (val.readyPieces / val.totalPieces) * 100 : 0,
          washingPercent: val.totalPieces > 0 ? (val.washingPieces / val.totalPieces) * 100 : 0,
          heightRatio: val.totalPieces / maxDayPieces
        };
      }),
      categoryBars: sortedCats.map(([name, val]) => ({
        name,
        pieces: val.pieces,
        orders: val.orders,
        heightRatio: val.pieces / maxCatPieces
      })),
      meetingTopics: meetingTopicsList.map(item => ({
        ...item,
        countHeightRatio: item.count / maxTopicCount,
        attendeesHeightRatio: item.attendees / maxTopicAttendees
      })),
      totalPieces,
      totalOrders,
      totalMeetings: filteredMeetingBookings.length,
      totalMeetingAttendees: meetingSummary.totalAttendees,
      uniqueTopicsCount: meetingSummary.uniqueTopicsCount,
      avgPiecesPerOrder,
      maxDayPieces
    };
  }, [filteredLaundryOrders, filteredMeetingBookings, meetingSummary, todayStr, language]);

  // Filtered list inside All Departments Modal
  const modalFilteredDepts = useMemo(() => {
    if (!modalDeptSearch.trim()) return deptData.allDepartments;
    const q = modalDeptSearch.toLowerCase().trim();
    return deptData.allDepartments.filter(d => d.name.toLowerCase().includes(q));
  }, [deptData.allDepartments, modalDeptSearch]);

  // Reset all filters back to Default (วันนี้)
  const handleResetFilters = () => {
    setTimeframe('today');
    setSelectedYear(currentYear);
    setCustomDate(todayStr);
    setStartDate(() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const yr = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yr}-${mm}-${dd}`;
    });
    setEndDate(todayStr);
    setSearchQuery('');
    setSelectedDept('ALL');
    setServiceScope('all');
  };

  const isFiltered = timeframe !== 'today' || searchQuery.trim() !== '' || selectedDept !== 'ALL' || serviceScope !== 'all' || selectedYear !== currentYear;

  const activeStatusHoverItem = hoveredStatusIndex !== null ? statusSegmentsData.segments[hoveredStatusIndex] : null;
  const activeDeptHoverItem = hoveredDeptIndex !== null ? deptData.segments[hoveredDeptIndex] : null;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#002045] to-[#004b87] text-white flex items-center justify-center shadow-md">
              <Gauge className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-[#1a1c1c] tracking-tight">
                {t.welcomeBack}
              </h2>
              <p className="text-xs sm:text-sm text-[#43474e] mt-0.5">
                {language === 'th' 
                  ? 'ภาพรวมระบบบริหารจัดการงานซัก-อบผ้า และสถิติงานตามช่วงเวลา' 
                  : "Overview of laundry operations and real-time operational statistics."}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Date Display Badge */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center gap-2 bg-white border border-[#e2e8f0] px-3.5 py-2 rounded-xl card-shadow">
            <Calendar className="w-4 h-4 text-[#0061a5]" />
            <span className="text-xs font-bold text-slate-700">
              {activeTimeframeLabel}
            </span>
          </div>
          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              title={language === 'th' ? 'รีเซ็ตกลับเป็นวันปัจจุบัน' : 'Reset to Today'}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === 'th' ? 'กลับสู่วันนี้' : 'Reset Today'}</span>
            </button>
          )}
        </div>
      </div>

      {/* FILTER & SEARCH CONTROL BAR - แสดงตัวกรองเป็นไอคอนเท่านั้น */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] card-shadow p-3.5 sm:p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'th'
                  ? 'ค้นหาตามรหัสคำสั่ง, ชื่อผู้ส่ง, แผนก หรือรายการผ้า...'
                  : 'Search by tracking code, customer name, department, items...'
              }
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0061a5] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-all cursor-pointer"
                title={language === 'th' ? 'ล้างคำค้นหา' : 'Clear search'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Timeframe Presets - แสดงเป็นไอคอนเท่านั้น (Icon-Only Filter Buttons) */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200 shrink-0 overflow-x-auto scrollbar-none">
            {/* 1. วันนี้ (Today) */}
            <button
              type="button"
              onClick={() => setTimeframe('today')}
              title={language === 'th' ? 'วันนี้ (Today)' : 'Today'}
              className={`p-2 rounded-lg transition-all cursor-pointer relative group flex items-center justify-center ${
                timeframe === 'today'
                  ? 'bg-white text-[#0061a5] shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Clock className="w-4 h-4 stroke-[2.2]" />
              <span className="sr-only">Today</span>
            </button>

            {/* 2. สัปดาห์นี้ (This Week) */}
            <button
              type="button"
              onClick={() => setTimeframe('week')}
              title={language === 'th' ? 'สัปดาห์นี้ (This Week)' : 'This Week'}
              className={`p-2 rounded-lg transition-all cursor-pointer relative group flex items-center justify-center ${
                timeframe === 'week'
                  ? 'bg-white text-[#0061a5] shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <CalendarDays className="w-4 h-4 stroke-[2.2]" />
              <span className="sr-only">This Week</span>
            </button>

            {/* 3. เดือนนี้ (This Month) */}
            <button
              type="button"
              onClick={() => setTimeframe('month')}
              title={language === 'th' ? 'เดือนนี้ (This Month)' : 'This Month'}
              className={`p-2 rounded-lg transition-all cursor-pointer relative group flex items-center justify-center ${
                timeframe === 'month'
                  ? 'bg-white text-[#0061a5] shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Calendar className="w-4 h-4 stroke-[2.2]" />
              <span className="sr-only">This Month</span>
            </button>

            {/* 4. รายปี (Year) */}
            <button
              type="button"
              onClick={() => {
                setTimeframe('year');
                setShowAdvancedFilters(true);
              }}
              title={language === 'th' ? `ประจำปี ${selectedYear + 543} (${selectedYear})` : `Year ${selectedYear}`}
              className={`p-2 rounded-lg transition-all cursor-pointer relative group flex items-center justify-center ${
                timeframe === 'year'
                  ? 'bg-white text-[#0061a5] shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <CalendarRange className="w-4 h-4 stroke-[2.2]" />
              <span className="sr-only">Year</span>
            </button>

            {/* 5. จากวันที่ถึงวันที่ (Date Range) */}
            <button
              type="button"
              onClick={() => {
                setTimeframe('range');
                setShowAdvancedFilters(true);
              }}
              title={language === 'th' ? 'จากวันที่ ถึง วันที่ (Date Range)' : 'From Date to Date Range'}
              className={`p-2 rounded-lg transition-all cursor-pointer relative group flex items-center justify-center ${
                timeframe === 'range'
                  ? 'bg-white text-[#0061a5] shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <CalendarCheck className="w-4 h-4 stroke-[2.2]" />
              <span className="sr-only">Date Range</span>
            </button>

            {/* 6. ทั้งหมด (All Time) */}
            <button
              type="button"
              onClick={() => setTimeframe('all')}
              title={language === 'th' ? 'ข้อมูลทั้งหมด (All Time)' : 'All Time'}
              className={`p-2 rounded-lg transition-all cursor-pointer relative group flex items-center justify-center ${
                timeframe === 'all'
                  ? 'bg-white text-[#0061a5] shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-4 h-4 stroke-[2.2]" />
              <span className="sr-only">All Time</span>
            </button>

            <div className="w-[1px] h-5 bg-slate-300 mx-0.5" />

            {/* 7. Toggle More Filters Icon Button */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              title={language === 'th' ? 'ตัวกรองเพิ่มเติม (ปี, จากวันที่ถึงวันที่, แผนก)' : 'More Filters (Year, Date Range, Department)'}
              className={`p-2 rounded-lg transition-all cursor-pointer relative group flex items-center justify-center ${
                showAdvancedFilters || selectedDept !== 'ALL' || timeframe === 'year' || timeframe === 'range' || timeframe === 'custom'
                  ? 'bg-[#002045] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 stroke-[2.2]" />
              {(selectedDept !== 'ALL' || timeframe === 'year' || timeframe === 'range') && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white" />
              )}
              <span className="sr-only">Filters</span>
            </button>
          </div>
        </div>

        {/* Expandable Advanced Filters (ปี, จากวันที่ถึงวันที่, แผนก) */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. เลือกปี (Filter by Year) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarRange className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{language === 'th' ? 'เลือกปี (Year)' : 'Select Year'}</span>
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(parseInt(e.target.value, 10));
                    setTimeframe('year');
                  }}
                  className={`w-full px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    timeframe === 'year'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-1 ring-indigo-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white'
                  }`}
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>
                      {language === 'th' ? `พ.ศ. ${yr + 543} (${yr})` : `Year ${yr}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. จากวันที่ (From Date) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{language === 'th' ? 'จากวันที่ (From Date)' : 'From Date'}</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setTimeframe('range');
                  }}
                  className={`w-full px-3 py-1.5 border rounded-xl text-xs font-bold transition-all ${
                    timeframe === 'range'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-1 ring-emerald-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* 3. ถึงวันที่ (To Date) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{language === 'th' ? 'ถึงวันที่ (To Date)' : 'To Date'}</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setTimeframe('range');
                  }}
                  className={`w-full px-3 py-1.5 border rounded-xl text-xs font-bold transition-all ${
                    timeframe === 'range'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-1 ring-emerald-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* 4. แผนก / หน่วยงาน (Department Filter) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>{language === 'th' ? 'แผนก / หน่วยงาน' : 'Department'}</span>
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    selectedDept !== 'ALL'
                      ? 'bg-blue-50 border-blue-300 text-blue-900 ring-1 ring-blue-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white'
                  }`}
                >
                  <option value="ALL">
                    {language === 'th' ? 'ทุกแผนก (All Departments)' : 'All Departments'}
                  </option>
                  {departmentOptions.map(dept => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Presets within range picker */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-500 font-semibold">{language === 'th' ? 'ช่วงเวลายอดนิยม:' : 'Quick ranges:'}</span>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    const yr = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    setStartDate(`${yr}-${mm}-${dd}`);
                    setEndDate(todayStr);
                    setTimeframe('range');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-all"
                >
                  {language === 'th' ? '7 วันที่ผ่านมา' : 'Last 7 Days'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 30);
                    const yr = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    setStartDate(`${yr}-${mm}-${dd}`);
                    setEndDate(todayStr);
                    setTimeframe('range');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-all"
                >
                  {language === 'th' ? '30 วันที่ผ่านมา' : 'Last 30 Days'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 90);
                    const yr = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    setStartDate(`${yr}-${mm}-${dd}`);
                    setEndDate(todayStr);
                    setTimeframe('range');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-all"
                >
                  {language === 'th' ? '3 เดือนที่ผ่านมา' : 'Last 90 Days'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{language === 'th' ? 'รีเซ็ตค่าเริ่มต้น' : 'Reset to Default'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Filter Summary Tags Strip */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100 text-xs">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-slate-500 text-[11px] font-medium">
              {language === 'th' ? 'กำลังแสดง:' : 'Displaying:'}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold text-[11px]">
              <Clock className="w-3 h-3 text-indigo-600" />
              {activeTimeframeLabel}
            </span>

            {selectedDept !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-bold text-[11px]">
                <Building2 className="w-3 h-3 text-blue-600" />
                {selectedDept}
                <button
                  type="button"
                  onClick={() => setSelectedDept('ALL')}
                  className="hover:text-blue-950 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[11px]">
                <Search className="w-3 h-3 text-amber-600" />
                "{searchQuery}"
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-amber-950 ml-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-2 flex-wrap">
            <span>
              {language === 'th' 
                ? `งานผ้า: ${filteredLaundryOrders.length} รายการ (${totalLaundryPieces.toLocaleString()} ชิ้น)`
                : `Laundry: ${filteredLaundryOrders.length} orders (${totalLaundryPieces.toLocaleString()} pcs)`}
            </span>
            <span>•</span>
            <span className="text-indigo-600">
              {language === 'th'
                ? `ห้องประชุม: ${filteredMeetingBookings.length} รายการ (${meetingSummary.uniqueTopicsCount} หัวข้อ)`
                : `Meetings: ${filteredMeetingBookings.length} bookings (${meetingSummary.uniqueTopicsCount} topics)`}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Bento Summary Cards: ผ้ากำลังดำเนินการ, ผ้าพร้อมส่งมอบ, ห้องประชุม & หัวข้อ, สรุปปริมาณชิ้นผ้า & แผนก */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: งานผ้าที่กำลังดำเนินการ (Active Laundry Intake) */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] card-shadow p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden select-none">
          <div className="absolute top-3 right-3 p-3 opacity-10 text-amber-600">
            <Waves className="w-16 h-16" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[#43474e] uppercase tracking-wider">
              {language === 'th' ? 'ผ้าอยู่ระหว่างซัก-อบ' : 'In Washing / Processing'}
            </h3>
            <span className="text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200/80">
              <Waves className="w-4 h-4" />
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="text-3xl sm:text-4xl font-bold text-amber-600 tracking-tight">
                {inWashingLaundryCount}
              </span>
              <span className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 font-medium">
                {language === 'th' ? 'รายการ' : 'orders'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-[11px] flex-wrap">
              <span className="flex items-center gap-1 text-slate-700 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                <Shirt className="w-3 h-3 text-[#0061a5]" />
                <span>{filteredLaundryOrders.length} {language === 'th' ? 'คำสั่ง' : 'orders'}</span>
              </span>
              <span className="flex items-center gap-1 text-amber-900 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>{totalLaundryPieces.toLocaleString()} {language === 'th' ? 'ชิ้น' : 'pcs'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: งานผ้าพร้อมส่งมอบ / สำเร็จ (Ready for Delivery) */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] card-shadow p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden select-none">
          <div className="absolute top-3 right-3 p-3 opacity-10 text-emerald-600">
            <PackageCheck className="w-16 h-16" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[#43474e] uppercase tracking-wider">
              {language === 'th' ? 'ผ้าพร้อมส่งมอบ / สำเร็จ' : 'Ready / Completed'}
            </h3>
            <span className="text-emerald-700 bg-emerald-50 p-1.5 rounded-lg border border-emerald-200/80">
              <PackageCheck className="w-4 h-4" />
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="text-3xl sm:text-4xl font-bold text-emerald-600 tracking-tight">
                {readyLaundryCount}
              </span>
              <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 font-medium">
                {laundryCompletionRate}% {language === 'th' ? 'ความพร้อมส่ง' : 'ready'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-[11px] flex-wrap">
              <span className="flex items-center gap-1 text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>{language === 'th' ? 'ส่งมอบแล้ว' : 'Delivered'}: {filteredLaundryOrders.filter(o => o.stage === 'delivered' || o.stage === 'completed').length}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: การใช้ห้องประชุม & หัวข้อการประชุม (Meeting Topics & Bookings) */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] card-shadow p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden select-none">
          <div className="absolute top-3 right-3 p-3 opacity-10 text-sky-600">
            <DoorOpen className="w-16 h-16" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[#43474e] uppercase tracking-wider">
              {language === 'th' ? 'ห้องประชุม & หัวข้อประชุม' : 'Meetings & Topics'}
            </h3>
            <span className="text-sky-700 bg-sky-50 p-1.5 rounded-lg border border-sky-200/80">
              <DoorOpen className="w-4 h-4" />
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="text-3xl sm:text-4xl font-bold text-sky-600 tracking-tight">
                {meetingSummary.totalBookings}
              </span>
              <span className="text-xs text-sky-800 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200 font-medium">
                {meetingSummary.uniqueTopicsCount} {language === 'th' ? 'หัวข้อ' : 'topics'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-[11px] flex-wrap">
              <span className="flex items-center gap-1 text-sky-900 font-medium bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60">
                <Users className="w-3 h-3 text-sky-600" />
                <span>{meetingSummary.totalAttendees} {language === 'th' ? 'ผู้เข้าร่วม' : 'attendees'}</span>
              </span>
              <span className="flex items-center gap-1 text-slate-700 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>
                  {meetingSummary.ongoingCount > 0 
                    ? `${meetingSummary.ongoingCount} ${language === 'th' ? 'กำลังประชุม' : 'ongoing'}` 
                    : (meetingSummary.upcomingCount > 0 
                        ? `${meetingSummary.upcomingCount} ${language === 'th' ? 'รอเริ่ม' : 'upcoming'}`
                        : `${meetingSummary.completedCount} ${language === 'th' ? 'เสร็จสิ้น' : 'done'}`)}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: สรุปภาพรวมจำนวนผ้าทั้งหมด (Total Laundry Pieces) */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] card-shadow p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden select-none">
          <div className="absolute top-3 right-3 p-3 opacity-10 text-indigo-600">
            <Building2 className="w-16 h-16" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[#43474e] uppercase tracking-wider">
              {language === 'th' ? 'จำนวนผ้าทั้งหมด' : 'Total Laundry Pieces'}
            </h3>
            <span className="text-indigo-700 bg-indigo-50 p-1.5 rounded-lg border border-indigo-200/80">
              <Building2 className="w-4 h-4" />
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="text-3xl sm:text-4xl font-bold text-indigo-600 tracking-tight">
                {totalLaundryPieces.toLocaleString()}
              </span>
              <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 font-medium">
                {language === 'th' ? 'ชิ้นผ้า' : 'total pcs'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-1.5 mt-3 pt-3 border-t border-slate-100 text-[11px]">
              <span className="flex items-center gap-1 text-slate-700 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                <Building2 className="w-3 h-3 text-indigo-600" />
                <span>{deptData.departmentsCount} {language === 'th' ? 'แผนก' : 'depts'}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State Warning if no data in filter */}
      {filteredLaundryOrders.length === 0 && filteredMeetingBookings.length === 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 text-center space-y-3 animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-amber-950">
              {language === 'th' ? 'ไม่พบข้อมูลในช่วงตัวกรองนี้' : 'No records found for the current filters'}
            </h4>
            <p className="text-xs text-amber-800 mt-1 max-w-md mx-auto">
              {language === 'th' 
                ? 'ลองเปลี่ยนช่วงเวลาเป็น "เดือนนี้", "ประจำปี" หรือ "ทั้งหมด" เพื่อดูข้อมูลย้อนหลัง หรือล้างคำค้นหา' 
                : 'Try switching the timeframe to "This Month", "Year", or "All Time" to view previous records, or clear your search query.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTimeframe('month')}
              className="px-3.5 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all cursor-pointer"
            >
              {language === 'th' ? 'ดูข้อมูลเดือนนี้' : 'View This Month'}
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('all')}
              className="px-3.5 py-1.5 bg-[#002045] text-white rounded-xl text-xs font-bold hover:bg-[#003366] transition-all cursor-pointer"
            >
              {language === 'th' ? 'ดูข้อมูลทั้งหมด' : 'View All Time'}
            </button>
          </div>
        </div>
      )}

      {/* Modern Circular Charts Section: สัดส่วนสถานะงานบริการ & สัดส่วนงานผ้าตามแผนก */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart 1: สัดส่วนสถานะงานบริการ (สลับดู งานซัก-อบผ้า หรือ ห้องประชุม & หัวข้อ ได้) */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] card-shadow p-5 sm:p-6 flex flex-col justify-between h-full">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-xs ${
                statusChartTab === 'laundry' 
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600' 
                  : 'bg-gradient-to-br from-sky-500 to-indigo-600'
              }`}>
                <PieChart className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#1a1c1c]">
                  {statusChartTab === 'laundry'
                    ? (language === 'th' ? 'สัดส่วนสถานะงานซัก-อบผ้า' : 'Laundry Stage Proportion')
                    : (language === 'th' ? 'สัดส่วนสถานะห้องประชุม & หัวข้อ' : 'Meeting Status & Topics')}
                </h3>
                <p className="text-xs text-slate-500">
                  {statusChartTab === 'laundry'
                    ? (language === 'th' ? 'เปรียบเทียบผ้าพร้อมส่งมอบ และผ้าอยู่ระหว่างซัก' : 'Breakdown by ready vs in washing')
                    : (language === 'th' ? `รวม ${meetingSummary.uniqueTopicsCount} หัวข้อการประชุม • ${meetingSummary.totalAttendees} ผู้เข้าร่วม` : `${meetingSummary.uniqueTopicsCount} topics • ${meetingSummary.totalAttendees} attendees`)}
                </p>
              </div>
            </div>

            {/* Switch Tab: Laundry vs Meeting */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setStatusChartTab('laundry')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusChartTab === 'laundry'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {language === 'th' ? 'งานผ้า' : 'Laundry'}
              </button>
              <button
                type="button"
                onClick={() => setStatusChartTab('meeting')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusChartTab === 'meeting'
                    ? 'bg-white text-sky-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {language === 'th' ? 'ห้องประชุม' : 'Meetings'}
              </button>
            </div>
          </div>

          {/* Centered Donut & Balanced Legend */}
          <div className="py-6 flex flex-col items-center justify-center gap-6 flex-1">
            {/* SVG Modern Donut - Centered & Uniform Size */}
            <div className="relative w-48 h-48 sm:w-52 sm:h-52 shrink-0 flex items-center justify-center mx-auto">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                {/* Background Ring */}
                <circle
                  cx="70"
                  cy="70"
                  r="52"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="15"
                />

                {/* Donut Segments */}
                {statusSegmentsData.segments.map((seg) => {
                  const isHovered = hoveredStatusIndex === seg.idx;
                  return (
                    <circle
                      key={seg.id}
                      cx="70"
                      cy="70"
                      r="52"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={isHovered ? 18 : 15}
                      strokeDasharray={`${seg.strokeLength} ${seg.circumference}`}
                      strokeDashoffset={-seg.dashOffset}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        filter: isHovered ? `drop-shadow(0 0 6px ${seg.color}80)` : 'none'
                      }}
                      onMouseEnter={() => setHoveredStatusIndex(seg.idx)}
                      onMouseLeave={() => setHoveredStatusIndex(null)}
                    />
                  );
                })}
              </svg>

              {/* Donut Center Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
                {activeStatusHoverItem ? (
                  <div className="animate-in zoom-in-90 duration-150">
                    <span className="text-2xl sm:text-3xl font-black text-[#1a1c1c]">
                      {activeStatusHoverItem.percentage}%
                    </span>
                    <p className="text-[11px] font-bold text-slate-500 truncate max-w-[100px] mt-0.5">
                      {activeStatusHoverItem.count} {language === 'th' ? 'รายการ' : 'records'}
                    </p>
                  </div>
                ) : statusChartTab === 'laundry' ? (
                  <div>
                    <span className="text-2xl sm:text-3xl font-black text-[#1a1c1c]">
                      {laundryCompletionRate}%
                    </span>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                      {language === 'th' ? 'พร้อมส่งมอบ' : 'Ready Rate'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-2xl sm:text-3xl font-black text-sky-600">
                      {meetingSummary.totalBookings}
                    </span>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                      {language === 'th' ? 'การจองทั้งหมด' : 'Bookings'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Legend Grid - Neatly Centered & Structured */}
            <div className="w-full space-y-2 max-w-md mx-auto">
              {statusSegmentsData.segments.map((seg) => {
                const isHovered = hoveredStatusIndex === seg.idx;
                const IconComponent = seg.icon;
                return (
                  <div
                    key={seg.id}
                    onMouseEnter={() => setHoveredStatusIndex(seg.idx)}
                    onMouseLeave={() => setHoveredStatusIndex(null)}
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer border ${
                      isHovered
                        ? 'bg-slate-50 border-slate-300 shadow-2xs scale-[1.01]'
                        : 'border-slate-100 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: seg.color }}
                      />
                      <IconComponent className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        {seg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-slate-900">
                        {seg.count}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md min-w-[48px] text-right font-mono">
                        {seg.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Donut Chart 2: สัดส่วนงานผ้าและห้องประชุมตามแผนก (Top 5) + แผนกอื่นๆ */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] card-shadow p-5 sm:p-6 flex flex-col justify-between h-full">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Building2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#1a1c1c] flex items-center gap-1.5">
                  <span>{language === 'th' ? 'สัดส่วนงานแยกตามแผนก (Top 5)' : 'Distribution by Dept (Top 5)'}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {language === 'th' ? `ข้อมูลตามตัวกรอง: ${activeTimeframeLabel}` : `Overview: ${activeTimeframeLabel}`}
                </p>
              </div>
            </div>

            {/* Quick View All Departments Button in Header */}
            <button
              type="button"
              onClick={() => setShowAllDeptsModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer border border-indigo-200/80 shadow-2xs hover:scale-105 active:scale-95"
              title={language === 'th' ? 'ดูข้อมูลแผนกทั้งหมด' : 'View All Departments'}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{language === 'th' ? `ดูทั้งหมด (${deptData.departmentsCount})` : `All (${deptData.departmentsCount})`}</span>
            </button>
          </div>

          {/* Centered Donut & Balanced Legend */}
          <div className="py-6 flex flex-col items-center justify-center gap-6 flex-1">
            {/* SVG Modern Donut - Centered & Uniform Size */}
            <div className="relative w-48 h-48 sm:w-52 sm:h-52 shrink-0 flex items-center justify-center mx-auto">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                {/* Background Ring */}
                <circle
                  cx="70"
                  cy="70"
                  r="52"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="15"
                />

                {/* Donut Segments */}
                {deptData.segments.map((seg) => {
                  const isHovered = hoveredDeptIndex === seg.idx;
                  return (
                    <circle
                      key={seg.name}
                      cx="70"
                      cy="70"
                      r="52"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={isHovered ? 18 : 15}
                      strokeDasharray={`${seg.strokeLength} ${seg.circumference}`}
                      strokeDashoffset={-seg.dashOffset}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        filter: isHovered ? `drop-shadow(0 0 6px ${seg.color}80)` : 'none'
                      }}
                      onClick={() => {
                        if (seg.isOthers) {
                          setShowAllDeptsModal(true);
                        } else {
                          setSelectedDept(seg.name);
                        }
                      }}
                      onMouseEnter={() => setHoveredDeptIndex(seg.idx)}
                      onMouseLeave={() => setHoveredDeptIndex(null)}
                    />
                  );
                })}
              </svg>

              {/* Donut Center Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
                {activeDeptHoverItem ? (
                  <div className="animate-in zoom-in-90 duration-150">
                    <span className="text-2xl sm:text-3xl font-black text-[#1a1c1c]">
                      {activeDeptHoverItem.percentage}%
                    </span>
                    <p className="text-[11px] font-bold text-slate-500 truncate max-w-[100px] mt-0.5">
                      {activeDeptHoverItem.pieces} {language === 'th' ? 'ชิ้น' : 'pcs'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-2xl sm:text-3xl font-black text-[#1a1c1c]">
                      {deptData.totalPieces.toLocaleString()}
                    </span>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                      {language === 'th' ? 'ชิ้นผ้าทั้งหมด' : 'Total Pieces'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Legend Column (Top 5 + แผนกอื่นๆ) */}
            <div className="w-full space-y-1.5 max-w-md mx-auto">
              {deptData.segments.map((seg) => {
                const isHovered = hoveredDeptIndex === seg.idx;
                return (
                  <div
                    key={seg.name}
                    onClick={() => {
                      if (seg.isOthers) {
                        setShowAllDeptsModal(true);
                      } else {
                        // Clicking on a top-5 dept can toggle filter or open detail
                        if (selectedDept === seg.name) {
                          setSelectedDept('ALL');
                        } else {
                          setSelectedDept(seg.name);
                        }
                      }
                    }}
                    onMouseEnter={() => setHoveredDeptIndex(seg.idx)}
                    onMouseLeave={() => setHoveredDeptIndex(null)}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                      seg.isOthers 
                        ? 'bg-amber-50/60 border-amber-200 hover:bg-amber-100/70 hover:border-amber-300' 
                        : isHovered
                          ? 'bg-slate-50 border-slate-300 shadow-2xs scale-[1.01]'
                          : 'border-slate-100 hover:bg-slate-50/70'
                    }`}
                    title={seg.isOthers ? (language === 'th' ? 'คลิกเพื่อดูข้อมูลแผนกทั้งหมด' : 'Click to view all departments') : undefined}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: seg.color }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs truncate font-semibold text-slate-700">
                            {seg.name}
                          </span>
                          {seg.isOthers && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded inline-flex items-center gap-0.5">
                              {language === 'th' ? 'คลิกดูทั้งหมด' : 'View all'}
                              <ChevronRight className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        {seg.meetings > 0 && !seg.isOthers && (
                          <span className="text-[10px] text-sky-600 block">
                            {seg.meetings} {language === 'th' ? 'การประชุม' : 'meetings'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-slate-900">
                        {seg.pieces} {language === 'th' ? 'ชิ้น' : 'pcs'}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md min-w-[48px] text-right font-mono">
                        {seg.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Bar Chart Section: ไทม์ไลน์, ปริมาณงานผ้า, และหัวข้อห้องประชุม */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] card-shadow p-5 sm:p-6 space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-md">
              <BarChart3 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#1a1c1c]">
                  {barChartMode === 'meeting_topics' 
                    ? (language === 'th' ? 'สรุปการวิเคราะห์หัวข้อห้องประชุม' : 'Meeting Topics Analysis')
                    : (language === 'th' ? 'ภาพรวมปริมาณงานผ้าตามช่วงเวลา' : 'Laundry Volume Timeline')}
                </h3>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  {activeTimeframeLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {barChartMode === 'meeting_topics'
                  ? (language === 'th' ? 'จัดอันดับหัวข้อการประชุม จำนวนครั้งที่จัด และยอดผู้เข้าร่วมประชุม' : 'Ranked topics with session count, attendees, and host departments')
                  : (language === 'th' ? 'เปรียบเทียบแนวโน้มปริมาณชิ้นผ้า สถานะความพร้อมส่งมอบ และสถิติงานตามช่วงที่เลือก' : 'Timeline and category distribution of laundry loads throughout the selected filter')}
              </p>
            </div>
          </div>

          {/* Toggle Daily Timeline vs Category Bars vs Meeting Topics */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto border border-slate-200/80 flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setBarChartMode('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                barChartMode === 'daily'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'th' ? 'ลำดับวัน (Daily)' : 'Daily Timeline'}
            </button>
            <button
              type="button"
              onClick={() => setBarChartMode('category')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                barChartMode === 'category'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'th' ? 'แยกประเภทผ้า' : 'Categories'}
            </button>
            <button
              type="button"
              onClick={() => setBarChartMode('meeting_topics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                barChartMode === 'meeting_topics'
                  ? 'bg-white text-sky-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'th' ? 'หัวข้อห้องประชุม' : 'Meeting Topics'}
            </button>
          </div>
        </div>

        {/* Quick Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              {language === 'th' ? 'ปริมาณชิ้นผ้ารวม' : 'Total Pieces'}
            </span>
            <p className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              {filteredBarChartData.totalPieces.toLocaleString()} <span className="text-xs font-normal text-slate-500">{language === 'th' ? 'ชิ้น' : 'pcs'}</span>
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              {language === 'th' ? 'จำนวนคำสั่งซักรวม' : 'Intake Orders'}
            </span>
            <p className="text-lg sm:text-xl font-black text-indigo-600 mt-0.5">
              {filteredBarChartData.totalOrders} <span className="text-xs font-normal text-slate-500">{language === 'th' ? 'รายการ' : 'orders'}</span>
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              {language === 'th' ? 'หัวข้อการประชุม' : 'Meeting Topics'}
            </span>
            <p className="text-lg sm:text-xl font-black text-sky-600 mt-0.5">
              {filteredBarChartData.uniqueTopicsCount} <span className="text-xs font-normal text-slate-500">{language === 'th' ? 'หัวข้อ' : 'topics'}</span>
            </p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              {language === 'th' ? 'ผู้เข้าร่วมประชุมรวม' : 'Total Attendees'}
            </span>
            <p className="text-lg sm:text-xl font-black text-emerald-600 mt-0.5">
              {filteredBarChartData.totalMeetingAttendees} <span className="text-xs font-normal text-slate-500">{language === 'th' ? 'คน' : 'pax'}</span>
            </p>
          </div>
        </div>

        {/* Bar Chart Visualization */}
        {barChartMode === 'daily' ? (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-2xs" />
                  <span className="font-semibold text-slate-700">{language === 'th' ? 'ผ้าซักเสร็จสมบูรณ์ / พร้อมส่ง' : 'Ready / Completed'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-amber-400 shadow-2xs" />
                  <span className="font-semibold text-slate-700">{language === 'th' ? 'ผ้าอยู่ระหว่างซัก' : 'In Washing'}</span>
                </div>
              </div>
              <span className="text-[11px] text-slate-400">
                {language === 'th' ? '* โฮเวอร์ที่แท่งกราฟเพื่อดูรายละเอียดเชิงลึก' : '* Hover over bars to see breakdown details'}
              </span>
            </div>

            {/* Daily Bars Container with Mobile Scroll Support */}
            <div className="h-52 sm:h-64 flex items-end justify-start sm:justify-between gap-2 sm:gap-3 pt-8 pb-3 px-1 sm:px-2 border-b border-slate-200 overflow-x-auto scrollbar-thin">
              {filteredBarChartData.dailyBars.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs sm:text-sm py-8">
                  {language === 'th' ? 'ยังไม่มีข้อมูลการบันทึกผ้าในช่วงเวลาที่เลือก' : 'No recorded laundry data in the selected range'}
                </div>
              ) : (
                filteredBarChartData.dailyBars.map((bar, idx) => {
                  const isHovered = hoveredBarIndex === idx;
                  const barHeightPct = Math.max(14, Math.round(bar.heightRatio * 100));
                  return (
                    <div
                      key={bar.dateKey}
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                      className="min-w-[44px] sm:min-w-0 sm:flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer shrink-0 sm:shrink"
                    >
                      {/* Floating Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-24 z-30 bg-slate-900 text-white rounded-xl p-2.5 shadow-xl text-left pointer-events-none min-w-[130px] sm:min-w-[140px] animate-in fade-in zoom-in-95 duration-150">
                          <p className="text-[11px] font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1">
                            {formatDateDisplay(bar.dateKey)}
                          </p>
                          <div className="space-y-0.5 text-[10.5px]">
                            <div className="flex justify-between gap-2">
                              <span className="text-emerald-400 font-medium">{language === 'th' ? 'เสร็จแล้ว:' : 'Ready:'}</span>
                              <span className="font-bold">{bar.readyPieces} {language === 'th' ? 'ชิ้น' : 'pcs'}</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-amber-400 font-medium">{language === 'th' ? 'กำลังซัก:' : 'Washing:'}</span>
                              <span className="font-bold">{bar.washingPieces} {language === 'th' ? 'ชิ้น' : 'pcs'}</span>
                            </div>
                            <div className="flex justify-between gap-2 pt-1 border-t border-slate-800 text-white font-bold">
                              <span>{language === 'th' ? 'รวม:' : 'Total:'}</span>
                              <span>{bar.totalPieces} {language === 'th' ? 'ชิ้น' : 'pcs'} ({bar.orders} {language === 'th' ? 'งาน' : 'jobs'})</span>
                            </div>
                          </div>
                          {/* Triangle Arrow */}
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45" />
                        </div>
                      )}

                      {/* Number on Top of Bar */}
                      <span className={`text-[9.5px] sm:text-[10px] font-black mb-1.5 transition-all ${
                        isHovered ? 'text-indigo-600 scale-110 font-extrabold' : 'text-slate-500'
                      }`}>
                        {bar.totalPieces}
                      </span>

                      {/* Stacked Vertical Bar */}
                      <div 
                        className={`w-full max-w-[28px] sm:max-w-[42px] rounded-t-xl overflow-hidden flex flex-col justify-end transition-all duration-300 ${
                          isHovered ? 'ring-2 ring-indigo-500 shadow-lg scale-x-105' : 'shadow-2xs'
                        }`}
                        style={{ height: `${barHeightPct}%` }}
                      >
                        {/* Washing portion (Amber Top) */}
                        {bar.washingPieces > 0 && (
                          <div 
                            className="w-full bg-gradient-to-t from-amber-500 to-yellow-400 transition-all"
                            style={{ height: `${bar.washingPercent}%` }}
                          />
                        )}
                        {/* Ready portion (Emerald Bottom) */}
                        {bar.readyPieces > 0 && (
                          <div 
                            className="w-full bg-gradient-to-t from-emerald-600 to-teal-500 transition-all"
                            style={{ height: `${bar.readyPercent}%` }}
                          />
                        )}
                      </div>

                      {/* Day Label Underneath */}
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 mt-2 truncate max-w-full text-center">
                        {bar.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : barChartMode === 'category' ? (
          /* Category Horizontal Bar Breakdown */
          <div className="space-y-3 pt-2">
            {filteredBarChartData.categoryBars.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                {language === 'th' ? 'ไม่มีข้อมูลแยกประเภทผ้าในช่วงเวลานี้' : 'No category data available in this range'}
              </div>
            ) : (
              filteredBarChartData.categoryBars.map((cat, idx) => {
                const colors = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
                const currentColor = colors[idx % colors.length];
                const pct = filteredBarChartData.totalPieces > 0 ? ((cat.pieces / filteredBarChartData.totalPieces) * 100).toFixed(1) : '0';
                return (
                  <div key={cat.name} className="space-y-1 group">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-800">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-black text-slate-900">{cat.pieces.toLocaleString()} {language === 'th' ? 'ชิ้น' : 'pcs'}</span>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {pct}%
                        </span>
                      </div>
                    </div>

                    {/* Horizontal Bar */}
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 group-hover:brightness-110"
                        style={{
                          width: `${Math.max(6, Math.round(cat.heightRatio * 100))}%`,
                          backgroundColor: currentColor
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Meeting Topics Breakdown */
          <div className="space-y-3 pt-2">
            {filteredBarChartData.meetingTopics.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                {language === 'th' ? 'ไม่มีข้อมูลหัวข้อการประชุมในช่วงเวลาที่เลือก' : 'No meeting topics recorded in this selected range'}
              </div>
            ) : (
              filteredBarChartData.meetingTopics.map((topicItem, idx) => {
                const topicColors = ['#0284c7', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];
                const currentColor = topicColors[idx % topicColors.length];
                const totalMeetings = filteredBarChartData.totalMeetings || 1;
                const pct = ((topicItem.count / totalMeetings) * 100).toFixed(1);

                return (
                  <div key={topicItem.subject} className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/70 space-y-2 group transition-all">
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-white text-slate-600 font-bold flex items-center justify-center text-[10px] border border-slate-200 shadow-2xs">
                          #{idx + 1}
                        </span>
                        <DoorOpen className="w-4 h-4 text-sky-600 shrink-0" />
                        <span className="font-bold text-slate-900 truncate">
                          {topicItem.subject}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                          {topicItem.count} {language === 'th' ? 'ครั้ง' : 'sessions'} ({pct}%)
                        </span>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Users className="w-3 h-3 text-emerald-600" />
                          {topicItem.attendees} {language === 'th' ? 'คน' : 'pax'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar for Topic Attendance */}
                    <div className="w-full h-2.5 bg-slate-200/70 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(8, Math.round(topicItem.countHeightRatio * 100))}%`,
                          backgroundColor: currentColor
                        }}
                      />
                    </div>

                    {/* Sub-info: Rooms & Departments */}
                    <div className="flex items-center gap-2 flex-wrap text-[10.5px] text-slate-500 pt-0.5">
                      {topicItem.rooms.length > 0 && (
                        <span>
                          {language === 'th' ? 'ห้อง:' : 'Rooms:'} <strong className="text-slate-700">{topicItem.rooms.join(', ')}</strong>
                        </span>
                      )}
                      {topicItem.departments.length > 0 && (
                        <span>
                          • {language === 'th' ? 'แผนก:' : 'Depts:'} <strong className="text-slate-700">{topicItem.departments.join(', ')}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* MODAL: สัดส่วนงานผ้าและห้องประชุมแยกตามแผนกทั้งหมด (All Departments Breakdown Modal) */}
      {showAllDeptsModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowAllDeptsModal(false)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#002045] to-[#004b87] text-white flex items-center justify-center shadow-md">
                  <Building2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {language === 'th' ? 'สัดส่วนงานบริการแยกตามแผนกทั้งหมด' : 'All Departments Service Breakdown'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {language === 'th' 
                      ? `พบทั้งหมด ${deptData.departmentsCount} แผนก • งานผ้า ${deptData.totalPieces.toLocaleString()} ชิ้น • จองห้องประชุม ${deptData.totalMeetings} รายการ`
                      : `Total ${deptData.departmentsCount} departments • ${deptData.totalPieces.toLocaleString()} pcs • ${deptData.totalMeetings} meetings`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAllDeptsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Search & Filter */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/70">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={modalDeptSearch}
                  onChange={(e) => setModalDeptSearch(e.target.value)}
                  placeholder={language === 'th' ? 'ค้นหาชื่อแผนกในรายการ...' : 'Search department in list...'}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0061a5]"
                />
                {modalDeptSearch && (
                  <button
                    type="button"
                    onClick={() => setModalDeptSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Department List Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-3">
              {modalFilteredDepts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs sm:text-sm">
                  {language === 'th' ? 'ไม่พบแผนกที่ตรงกับการค้นหา' : 'No departments match your search'}
                </div>
              ) : (
                modalFilteredDepts.map((dept, index) => {
                  const maxPieces = modalFilteredDepts[0]?.pieces || 1;
                  const ratio = Math.max(5, Math.round((dept.pieces / maxPieces) * 100));
                  const isCurrentFilter = selectedDept.toLowerCase() === dept.name.toLowerCase();

                  return (
                    <div 
                      key={dept.name} 
                      className={`pt-3 first:pt-0 pb-3 flex flex-col gap-2 group transition-all rounded-xl p-2.5 ${
                        isCurrentFilter ? 'bg-blue-50/70 border border-blue-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="w-6 text-center font-mono font-bold text-xs text-slate-400">
                            #{index + 1}
                          </span>
                          <div 
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: dept.color }}
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {dept.name}
                              </span>
                              {isCurrentFilter && (
                                <span className="text-[10px] font-bold text-[#0061a5] bg-[#d2e4ff] px-1.5 py-0.2 rounded">
                                  {language === 'th' ? 'กำลังกรอง' : 'Active Filter'}
                                </span>
                              )}
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${ratio}%`,
                                  backgroundColor: dept.color 
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-9 sm:pl-0">
                          <div className="text-left sm:text-right">
                            <span className="text-xs sm:text-sm font-black text-slate-900">
                              {dept.pieces.toLocaleString()} {language === 'th' ? 'ชิ้น' : 'pcs'}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              ({dept.orders} {language === 'th' ? 'คำสั่งผ้า' : 'orders'})
                              {dept.meetings > 0 && ` • ${dept.meetings} ${language === 'th' ? 'จองห้อง' : 'meetings'}`}
                            </span>
                          </div>

                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg min-w-[50px] text-center font-mono">
                            {dept.percentage}%
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDept(dept.name);
                              setShowAllDeptsModal(false);
                            }}
                            title={language === 'th' ? 'กรองแดชบอร์ดตามแผนกนี้' : 'Filter dashboard by this department'}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isCurrentFilter
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-[#002045] hover:text-white text-slate-700'
                            }`}
                          >
                            <Filter className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Display Meeting Topics Pills if the department has hosted meeting topics */}
                      {dept.meetingTopics && dept.meetingTopics.length > 0 && (
                        <div className="pl-9 flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] font-bold text-sky-700 flex items-center gap-1">
                            <DoorOpen className="w-3 h-3 text-sky-600" />
                            {language === 'th' ? 'หัวข้อประชุม:' : 'Topics:'}
                          </span>
                          {dept.meetingTopics.map(topic => (
                            <span 
                              key={topic} 
                              className="text-[10px] font-medium bg-sky-50 text-sky-900 border border-sky-200/80 px-2 py-0.5 rounded-md"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {language === 'th' ? `แสดง ${modalFilteredDepts.length} จากทั้งหมด ${deptData.departmentsCount} แผนก` : `Showing ${modalFilteredDepts.length} of ${deptData.departmentsCount} departments`}
              </span>
              <button
                type="button"
                onClick={() => setShowAllDeptsModal(false)}
                className="px-4 py-2 rounded-xl bg-[#002045] hover:bg-[#003366] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
