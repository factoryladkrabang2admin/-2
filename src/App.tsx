import React, { useState, useEffect, useRef } from 'react';
import { NavigationTab, TeamMember, ActivityItem, LaundryOrder, AppNotification, LaundryStage, MaintenanceTicket, MaintenanceStatus, AnnouncementItem } from './types';
import { 
  INITIAL_TEAM_MEMBERS, 
  DASHBOARD_ACTIVITIES,
  DEFAULT_ADMIN_USER,
  DEFAULT_GUEST_USER,
  AdminUserAccount,
  isUserAdminOrSupervisor,
  saveUpdatedUserCredentials
} from './data/mockData';
import { INITIAL_LAUNDRY_ORDERS } from './data/mockLaundryData';
import { Sidebar } from './components/Sidebar';
import { TopNavBar } from './components/TopNavBar';
import { DashboardView } from './components/DashboardView';
import { AnnouncementsView } from './components/AnnouncementsView';
import { ReportsView } from './components/ReportsView';
import { LaundryView } from './components/LaundryView';
import { MaintenanceView } from './components/MaintenanceView';
import { WorkScheduleView } from './components/WorkScheduleView';
import { OtView } from './components/OtView';
import { PayslipView } from './components/PayslipView';
import { EquipmentView } from './components/EquipmentView';
import { ChlorineView } from './components/ChlorineView';
import { MeetingRoomView } from './components/MeetingRoomView';
import { RagsGlovesLogView } from './components/RagsGlovesLogView';
import { RestrictedAccessView } from './components/RestrictedAccessView';
import { InviteMemberModal } from './components/InviteMemberModal';
import { LaundryDetailModal } from './components/LaundryDetailModal';
import { CreateLaundryModal } from './components/CreateLaundryModal';
import { MobileTrackingView } from './components/MobileTrackingView';
import { SettingsModal } from './components/SettingsModal';
import { ProfileModal } from './components/ProfileModal';
import { HelpModal } from './components/HelpModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { LoginModal } from './components/LoginModal';
import { FloatingMobileMenu } from './components/FloatingMobileMenu';
import { realtimeHub, RealtimeMessage } from './services/realtimeService';
import { fetchGoogleSheetLaundryOrders, fetchGoogleSheetMaintenanceTickets, fetchGoogleSheetOtRecords, fetchGoogleSheetAnnouncements, GOOGLE_SHEET_URL } from './services/googleSheetSyncService';

export default function App() {
  // Main State: default to 'laundry' for guest users so they land directly on public content
  const [currentTab, setCurrentTab] = useState<NavigationTab>('laundry');
  const [laundrySubTab, setLaundrySubTab] = useState<'pipeline' | 'rags_gloves' | 'analytics'>('pipeline');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Authentication State - Security Policy: Start unauthenticated when page is opened
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AdminUserAccount>(DEFAULT_GUEST_USER);
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);

  // Security Policy: Clear any auto-login on session start so login is required every page open
  useEffect(() => {
    try {
      localStorage.setItem('proworkflow_is_authenticated', 'false');
      localStorage.removeItem('proworkflow_current_user');
    } catch {
      // ignore
    }
  }, []);

  // Prefetch OT and Google Sheet records immediately in background on startup
  useEffect(() => {
    fetchGoogleSheetOtRecords().catch(() => {});
  }, []);

  const handleLoginSuccess = (user: AdminUserAccount) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    try {
      localStorage.setItem('proworkflow_is_authenticated', 'true');
      localStorage.setItem('proworkflow_current_user', JSON.stringify(user));
    } catch {
      // storage
    }
    setLoginModalOpen(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(DEFAULT_GUEST_USER);
    try {
      localStorage.setItem('proworkflow_is_authenticated', 'false');
      localStorage.removeItem('proworkflow_current_user');
    } catch {
      // storage
    }
    setLoginModalOpen(false);
    setCurrentTab('laundry');
  };

  const handleUpdateCurrentUser = (updated: AdminUserAccount) => {
    setCurrentUser(updated);
    saveUpdatedUserCredentials(updated);
  };

  // Entities State with persistent Real-time initial values
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => realtimeHub.getStoredTeamMembers());
  const [activities, setActivities] = useState<ActivityItem[]>(() => realtimeHub.getStoredActivities());
  const [laundryOrders, setLaundryOrders] = useState<LaundryOrder[]>(() => realtimeHub.getStoredLaundryOrders());
  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceTicket[]>(() => {
    try {
      const cached = localStorage.getItem('proworkflow_maintenance_tickets_cache_v2');
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return [];
  });
  const [selectedMaintenanceWorkOrder, setSelectedMaintenanceWorkOrder] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(() => {
    try {
      const cached = localStorage.getItem('proworkflow_announcements_cache_v1');
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return [];
  });
  const [notifications, setNotifications] = useState<AppNotification[]>(() => realtimeHub.getStoredNotifications());

  const knownOrdersMapRef = useRef<Map<string, LaundryStage>>(new Map());
  const knownMaintenanceMapRef = useRef<Map<string, MaintenanceStatus>>(new Map());

  // Calculate unread count
  const unreadNotificationsCount = notifications.filter(n => n.unread).length;

  // Google Sheet Sync State
  const [isSyncingSheet, setIsSyncingSheet] = useState<boolean>(false);
  const [lastSheetSyncTime, setLastSheetSyncTime] = useState<Date | null>(null);
  const [sheetSyncError, setSheetSyncError] = useState<string | null>(null);
  const [sheetRowsCount, setSheetRowsCount] = useState<number>(0);

  // Modals & Drawers State
  const [inviteMemberModalOpen, setInviteMemberModalOpen] = useState(false);
  const [createLaundryModalOpen, setCreateLaundryModalOpen] = useState(false);
  const [selectedLaundryOrder, setSelectedLaundryOrder] = useState<LaundryOrder | null>(null);
  const [standaloneTrackingOrder, setStandaloneTrackingOrder] = useState<LaundryOrder | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'language' | 'general' | 'notifications' | 'security'>('general');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Determine if current active user is the super admin or an administrator
  const isSuperAdmin = (currentUser?.username || '').toLowerCase() === 'reizosischen';
  const isUserAdmin = isUserAdminOrSupervisor(currentUser, isAuthenticated);

  const handleOpenSettingsWithTab = (tab: 'language' | 'general' | 'notifications' | 'security' = 'general') => {
    if (!isUserAdmin) return;
    setSettingsInitialTab(tab);
    setSettingsModalOpen(true);
  };

  // Helper to test if orders list is structurally identical to avoid unnecessary re-renders
  const areLaundryOrdersEqual = (a: LaundryOrder[], b: LaundryOrder[]): boolean => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (
        a[i].id !== b[i].id ||
        a[i].stage !== b[i].stage ||
        a[i].trackingCode !== b[i].trackingCode ||
        a[i].orderDate !== b[i].orderDate ||
        a[i].customerRoomOrDept !== b[i].customerRoomOrDept ||
        a[i].customerName !== b[i].customerName ||
        a[i].completedAt !== b[i].completedAt ||
        a[i].items.length !== b[i].items.length ||
        (a[i].items[0]?.quantity !== b[i].items[0]?.quantity) ||
        (a[i].items[0]?.name !== b[i].items[0]?.name) ||
        (a[i].historyTimeline?.length !== b[i].historyTimeline?.length)
      ) {
        return false;
      }
    }
    return true;
  };

  // Google Sheet Fetch & Sync Function for Laundry Orders with intelligent notification detection
  const syncGoogleSheet = async (showLoading = true) => {
    if (showLoading) setIsSyncingSheet(true);
    setSheetSyncError(null);
    try {
      const result = await fetchGoogleSheetLaundryOrders();
      if (result.success && result.orders.length > 0) {
        setSheetRowsCount(result.rawRowsCount);
        setLastSheetSyncTime(result.lastSyncedAt);

        // Check if there are newly added orders or status changes from Google Sheet
        const previousMap = knownOrdersMapRef.current;
        if (previousMap.size > 0) {
          let hasNewNotifs = false;
          result.orders.forEach((order) => {
            const previousStage = previousMap.get(order.id);
            if (!previousStage) {
              // New order added from Google Sheet
              const notif: AppNotification = {
                id: `notif-gsheet-new-${order.id}-${Date.now()}`,
                type: 'laundry_new',
                title: 'มีรายการรับผ้าใหม่เข้าระบบ (Google Sheet)',
                desc: `รหัส: ${order.trackingCode} • ${order.customerName}${order.customerRoomOrDept ? ` (แผนก ${order.customerRoomOrDept})` : ''} • สถานะ: อยู่ระหว่างซัก`,
                time: 'เมื่อสักครู่',
                timestamp: Date.now(),
                unread: true,
                orderId: order.id,
                trackingCode: order.trackingCode,
                customerName: order.customerName,
                department: order.customerRoomOrDept,
                stage: order.stage,
              };
              realtimeHub.addNotification(notif);
              hasNewNotifs = true;
            } else if (previousStage !== order.stage) {
              // Order stage changed in Google Sheet
              const isReady = order.stage === 'ready' || order.stage === 'delivered';
              const stageLabel = isReady ? 'ซักเสร็จแล้ว' : 'อยู่ระหว่างซัก';
              const notif: AppNotification = {
                id: `notif-gsheet-status-${order.id}-${Date.now()}`,
                type: 'laundry_status',
                title: `เปลี่ยนสถานะผ้าเป็น: ${stageLabel}`,
                desc: `รหัส: ${order.trackingCode} • ${order.customerName}${order.customerRoomOrDept ? ` (แผนก ${order.customerRoomOrDept})` : ''} • อัปเดตจาก Google Sheet`,
                time: 'เมื่อสักครู่',
                timestamp: Date.now(),
                unread: true,
                orderId: order.id,
                trackingCode: order.trackingCode,
                customerName: order.customerName,
                department: order.customerRoomOrDept,
                stage: order.stage,
              };
              realtimeHub.addNotification(notif);
              hasNewNotifs = true;
            }
          });
          if (hasNewNotifs) {
            setNotifications(realtimeHub.getStoredNotifications());
          }
        }

        // Merge with existing local orders (preserve non-gsheet manual orders)
        const currentStored = realtimeHub.getStoredLaundryOrders();
        const nonSheetOrders = currentStored.filter((o) => !o.id.startsWith('gsheet-'));
        const mergedOrders = [...result.orders, ...nonSheetOrders];

        // Update known orders map
        const newMap = new Map<string, LaundryStage>();
        mergedOrders.forEach((o) => newMap.set(o.id, o.stage));
        knownOrdersMapRef.current = newMap;

        // Only update state if data actually changed
        setLaundryOrders((prev) => {
          if (areLaundryOrdersEqual(prev, mergedOrders)) {
            return prev;
          }
          realtimeHub.saveLaundryOrders(mergedOrders);
          return mergedOrders;
        });
      } else if (!result.success) {
        setSheetSyncError(result.error || 'Failed to sync Google Sheet');
      }
    } catch (err: any) {
      setSheetSyncError(err.message || 'Error connecting to Google Sheet');
    } finally {
      if (showLoading) setIsSyncingSheet(false);
    }
  };

  // Google Sheet Fetch & Sync Function for Maintenance Tickets with intelligent notification detection
  const syncGoogleSheetMaintenance = async () => {
    try {
      const result = await fetchGoogleSheetMaintenanceTickets();
      if (result.success && result.tickets.length > 0) {
        const previousMap = knownMaintenanceMapRef.current;
        if (previousMap.size > 0) {
          let hasNewNotifs = false;
          result.tickets.forEach((ticket) => {
            const previousStatus = previousMap.get(ticket.id);
            if (!previousStatus) {
              // 1. Newly added maintenance ticket from Google Sheet -> Alert via Notifications
              const notif: AppNotification = {
                id: `notif-gsheet-maint-new-${ticket.id}-${Date.now()}`,
                type: 'maintenance_new',
                title: `มีรายการแจ้งซ่อมใหม่: ${ticket.workOrderNo || `ลำดับ ${ticket.seq}`}`,
                desc: `แผนก: ${ticket.department} • ปัญหา: ${ticket.issueDetail} • ผู้แจ้ง: ${ticket.requester}`,
                time: 'เมื่อสักครู่',
                timestamp: Date.now(),
                unread: true,
                workOrderNo: ticket.workOrderNo,
                ticketId: ticket.id,
                department: ticket.department,
                maintenanceStatus: ticket.status,
                requester: ticket.requester,
              };
              realtimeHub.addNotification(notif);
              hasNewNotifs = true;
            } else if (previousStatus !== ticket.status) {
              // 2. Status of maintenance ticket changed in Google Sheet -> Alert via Notifications
              const notif: AppNotification = {
                id: `notif-gsheet-maint-status-${ticket.id}-${Date.now()}`,
                type: 'maintenance_status',
                title: `อัปเดตสถานะงานซ่อม ${ticket.workOrderNo || `ลำดับ ${ticket.seq}`}: ${ticket.status}`,
                desc: `แผนก: ${ticket.department} • ปัญหา: ${ticket.issueDetail} • อัปเดตจาก Google Sheet`,
                time: 'เมื่อสักครู่',
                timestamp: Date.now(),
                unread: true,
                workOrderNo: ticket.workOrderNo,
                ticketId: ticket.id,
                department: ticket.department,
                maintenanceStatus: ticket.status,
                requester: ticket.requester,
              };
              realtimeHub.addNotification(notif);
              hasNewNotifs = true;
            }
          });
          if (hasNewNotifs) {
            setNotifications(realtimeHub.getStoredNotifications());
          }
        }

        // Update known maintenance map
        const newMap = new Map<string, MaintenanceStatus>();
        result.tickets.forEach((t) => newMap.set(t.id, t.status));
        knownMaintenanceMapRef.current = newMap;

        setMaintenanceTickets((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(result.tickets)) {
            return prev;
          }
          try {
            localStorage.setItem('proworkflow_maintenance_tickets_cache_v4', JSON.stringify(result.tickets));
          } catch {
            // ignore
          }
          return result.tickets;
        });
      }
    } catch {
      // keep existing state quietly
    }
  };

  // Google Sheet Fetch & Sync Function for Announcements in real-time background
  const syncGoogleSheetAnnouncements = async () => {
    try {
      const result = await fetchGoogleSheetAnnouncements();
      if (result.success && result.announcements.length > 0) {
        setAnnouncements((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(result.announcements)) {
            return prev;
          }
          try {
            localStorage.setItem('proworkflow_announcements_cache_v1', JSON.stringify(result.announcements));
          } catch {
            // ignore
          }
          return result.announcements;
        });
      }
    } catch {
      // keep existing state quietly
    }
  };

  // Run seamless real-time Google Sheet background sync embedded in the system
  useEffect(() => {
    syncGoogleSheet(false);
    syncGoogleSheetMaintenance();
    syncGoogleSheetAnnouncements();

    // Embedded real-time background sync (every 5 seconds quietly in background)
    const interval = setInterval(() => {
      syncGoogleSheet(false);
      syncGoogleSheetMaintenance();
      syncGoogleSheetAnnouncements();
    }, 5000);

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        syncGoogleSheet(false);
        syncGoogleSheetMaintenance();
        syncGoogleSheetAnnouncements();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, []);

  // Real-time synchronization subscription
  useEffect(() => {
    const unsubscribe = realtimeHub.subscribe((msg: RealtimeMessage) => {
      if (msg.type === 'SYNC_ALL' || msg.type === 'NOTIFICATION_ADDED') {
        setTeamMembers((prev) => {
          const next = realtimeHub.getStoredTeamMembers();
          return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
        });
        setActivities((prev) => {
          const next = realtimeHub.getStoredActivities();
          return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
        });
        setLaundryOrders((prev) => {
          const next = realtimeHub.getStoredLaundryOrders();
          return areLaundryOrdersEqual(prev, next) ? prev : next;
        });
        setNotifications((prev) => {
          const next = realtimeHub.getStoredNotifications();
          return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Deep-link / QR Code URL Tracker & Tab Navigation: Auto-open tab or order details once on mount or url change
  useEffect(() => {
    const handleUrlRouting = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        
        // 1. Check tab param or hash
        const tabParam = urlParams.get('tab') as NavigationTab | null;
        let hashTab: string = '';
        if (window.location.hash) {
          const cleanHash = window.location.hash.replace(/^#\/?/, '').split('?')[0].toLowerCase();
          if (['dashboard', 'reports', 'laundry', 'maintenance', 'ot', 'rags_gloves'].includes(cleanHash)) {
            hashTab = cleanHash;
          }
        }

        if (tabParam && ['dashboard', 'reports', 'laundry', 'maintenance', 'ot', 'rags_gloves'].includes(tabParam)) {
          setCurrentTab(tabParam);
        } else if (hashTab) {
          setCurrentTab(hashTab as NavigationTab);
        }

        // 2. Check tracking code
        let trackCode = urlParams.get('track') || urlParams.get('tracking') || urlParams.get('order');
        if (!trackCode && window.location.hash) {
          const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.hash.replace(/^#\/?/, '');
          const hashParams = new URLSearchParams(hashQuery);
          trackCode = hashParams.get('track') || hashParams.get('tracking') || hashParams.get('order');
        }

        if (trackCode) {
          const currentOrders = realtimeHub.getStoredLaundryOrders();
          const normalized = trackCode.replace(/[\s\-_]/g, '').toLowerCase();
          const matched = currentOrders.find((o) => {
            const orderCodeNorm = o.trackingCode.replace(/[\s\-_]/g, '').toLowerCase();
            const orderIdNorm = o.id.replace(/[\s\-_]/g, '').toLowerCase();
            return orderCodeNorm === normalized || orderIdNorm === normalized;
          });

          if (matched) {
            setStandaloneTrackingOrder(matched);
            setSelectedLaundryOrder(matched);
            setCurrentTab('laundry');
          } else if (trackCode) {
            const fallbackOrder: LaundryOrder = {
              id: trackCode,
              trackingCode: trackCode,
              customerName: 'ผู้ส่งผ้า / Staff',
              customerRoomOrDept: 'แผนกผ้า / Laundry Dept',
              serviceType: 'Wash & Fold',
              priority: 'normal',
              stage: 'washing',
              items: [{ id: '1', name: 'รายการผ้าทั่วไป (General Linen)', quantity: 1, category: 'Clothing', unitPrice: 0 }],
              totalWeightKg: 1,
              totalPrice: 0,
              paymentStatus: 'Paid',
              assignedStaff: 'Staff',
              specialInstructions: 'ประเภทผ้า: รายการผ้าทั่วไป | กำลังดำเนินการซัก-อบ',
              receivedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              estimatedCompletion: 'ตามกำหนดการแผนก',
              historyTimeline: [
                {
                  stage: 'received',
                  label: 'รับผ้าเข้าระบบ',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  note: 'รับผ้าเข้าระบบเรียบร้อย',
                  operator: 'Staff'
                }
              ]
            };
            setStandaloneTrackingOrder(fallbackOrder);
            setCurrentTab('laundry');
          }
        }
      } catch {
        // Safe fallback
      }
    };

    handleUrlRouting();
    window.addEventListener('popstate', handleUrlRouting);
    window.addEventListener('hashchange', handleUrlRouting);
    return () => {
      window.removeEventListener('popstate', handleUrlRouting);
      window.removeEventListener('hashchange', handleUrlRouting);
    };
  }, []);

  // Handlers for Notification actions
  const handleMarkAllNotificationsAsRead = () => {
    const updated = realtimeHub.markAllNotificationsAsRead();
    setNotifications(updated);
  };

  const handleMarkNotificationAsRead = (id: string) => {
    const updated = realtimeHub.markNotificationAsRead(id);
    setNotifications(updated);
  };

  const handleClearAllNotifications = () => {
    const updated = realtimeHub.clearAllNotifications();
    setNotifications(updated);
  };

  const handleSelectNotificationOrder = (orderIdOrCode: string) => {
    if (!orderIdOrCode) return;
    const normalized = orderIdOrCode.replace(/[\s\-_]/g, '').toLowerCase();
    const matched = laundryOrders.find((o) => {
      const orderCodeNorm = o.trackingCode.replace(/[\s\-_]/g, '').toLowerCase();
      const orderIdNorm = o.id.replace(/[\s\-_]/g, '').toLowerCase();
      return orderCodeNorm === normalized || orderIdNorm === normalized;
    });
    if (matched) {
      setSelectedLaundryOrder(matched);
    }
    setCurrentTab('laundry');
  };

  const handleSelectNotificationMaintenance = (workOrderNoOrId: string) => {
    if (workOrderNoOrId) {
      setSelectedMaintenanceWorkOrder(workOrderNoOrId);
    }
    setCurrentTab('maintenance');
  };

  // Handlers for Team Member actions
  const handleAddMember = (newMember: TeamMember) => {
    const updated = [newMember, ...teamMembers];
    setTeamMembers(updated);
    realtimeHub.saveTeamMembers(updated);
  };

  // Handlers for Laundry actions
  const handleAddLaundryOrder = (newOrder: LaundryOrder) => {
    const updatedOrders = [newOrder, ...laundryOrders];
    setLaundryOrders(updatedOrders);

    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      type: 'task_completed',
      user: currentUser?.name || 'Alex Vance',
      title: 'registered laundry intake order',
      highlightText: `${newOrder.trackingCode} (${newOrder.customerName})`,
      subtitle: `${newOrder.serviceType} • Just now`,
      timestamp: 'Just now',
      badgeType: 'success',
    };
    const updatedActivities = [newActivity, ...activities];
    setActivities(updatedActivities);

    // Save and broadcast real-time
    realtimeHub.saveLaundryOrders(updatedOrders);
    realtimeHub.saveActivities(updatedActivities);

    // Create and broadcast notification for new laundry order
    const notif: AppNotification = {
      id: `notif-new-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'laundry_new',
      title: 'มีรายการซัก-อบผ้าใหม่เข้าระบบ',
      desc: `รหัส: ${newOrder.trackingCode} • ${newOrder.customerName}${newOrder.customerRoomOrDept ? ` (แผนก ${newOrder.customerRoomOrDept})` : ''} • สถานะ: อยู่ระหว่างซัก`,
      time: 'เมื่อสักครู่',
      timestamp: Date.now(),
      unread: true,
      orderId: newOrder.id,
      trackingCode: newOrder.trackingCode,
      customerName: newOrder.customerName,
      department: newOrder.customerRoomOrDept,
      stage: newOrder.stage,
    };
    const updatedNotifs = realtimeHub.addNotification(notif);
    setNotifications(updatedNotifs);
  };

  const handleUpdateLaundryOrder = (updated: LaundryOrder) => {
    const oldOrder = laundryOrders.find((o) => o.id === updated.id);
    const newOrders = laundryOrders.map((o) => (o.id === updated.id ? updated : o));
    setLaundryOrders(newOrders);
    if (selectedLaundryOrder?.id === updated.id) {
      setSelectedLaundryOrder(updated);
    }
    realtimeHub.saveLaundryOrders(newOrders);

    // Check if status of the laundry changed
    if (oldOrder && oldOrder.stage !== updated.stage) {
      const isReady = updated.stage === 'ready' || updated.stage === 'delivered';
      const stageLabel = isReady ? 'ซักเสร็จแล้ว' : 'อยู่ระหว่างซัก';
      
      const notif: AppNotification = {
        id: `notif-stage-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'laundry_status',
        title: `เปลี่ยนสถานะผ้าเป็น: ${stageLabel}`,
        desc: `รหัส: ${updated.trackingCode} • ${updated.customerName}${updated.customerRoomOrDept ? ` (แผนก ${updated.customerRoomOrDept})` : ''} • อัปเดตสถานะล่าสุด`,
        time: 'เมื่อสักครู่',
        timestamp: Date.now(),
        unread: true,
        orderId: updated.id,
        trackingCode: updated.trackingCode,
        customerName: updated.customerName,
        department: updated.customerRoomOrDept,
        stage: updated.stage,
      };
      const updatedNotifs = realtimeHub.addNotification(notif);
      setNotifications(updatedNotifs);
    }
  };

  const handleDeleteLaundryOrder = (orderId: string) => {
    const updated = laundryOrders.filter((o) => o.id !== orderId);
    setLaundryOrders(updated);
    if (selectedLaundryOrder?.id === orderId) {
      setSelectedLaundryOrder(null);
    }
    realtimeHub.saveLaundryOrders(updated);
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c] flex font-sans antialiased overflow-x-hidden">
      {/* Permanent & Responsive Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'settings') {
            handleOpenSettingsWithTab('general');
          } else if (tab === 'profile') {
            setProfileModalOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        laundryCount={laundryOrders.length}
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        onLogin={() => setLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenSettings={() => handleOpenSettingsWithTab('general')}
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-[280px] w-full min-w-0">
        {/* Top Header */}
        <TopNavBar
          currentTab={currentTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenMobile={() => setMobileSidebarOpen(true)}
          onOpenSettings={() => handleOpenSettingsWithTab('general')}
          onOpenProfile={() => setProfileModalOpen(true)}
          onToggleNotifications={() => setNotificationsOpen(!notificationsOpen)}
          onOpenHelp={() => setHelpModalOpen(true)}
          unreadNotificationsCount={unreadNotificationsCount}
          laundryOrders={laundryOrders}
          onSimulateOrder={handleAddLaundryOrder}
          isAuthenticated={isAuthenticated}
          currentUser={currentUser}
          onLogin={() => setLoginModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* Scrollable Main Canvas */}
        <main className="flex-1 mt-16 p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto w-full">
          {currentTab === 'dashboard' && (
            isAuthenticated ? (
              <DashboardView
                laundryOrders={laundryOrders}
                onCreateLaundryOrder={() => setCreateLaundryModalOpen(true)}
                onNavigateToLaundry={() => {
                  setLaundrySubTab('pipeline');
                  setCurrentTab('laundry');
                }}
                onNavigateToRagsGloves={() => {
                  setLaundrySubTab('rags_gloves');
                  setCurrentTab('laundry');
                }}
                onNavigateToMeetingRoom={() => setCurrentTab('meeting_room')}
                onNavigateToReports={() => setCurrentTab('reports')}
              />
            ) : (
              <RestrictedAccessView
                currentTab="dashboard"
                onOpenLogin={() => setLoginModalOpen(true)}
                onNavigateToLaundry={() => {
                  setLaundrySubTab('pipeline');
                  setCurrentTab('laundry');
                }}
                onNavigateToMeetingRoom={() => setCurrentTab('meeting_room')}
              />
            )
          )}

          {currentTab === 'announcements' && (
            isAuthenticated ? (
              <AnnouncementsView
                announcements={announcements}
                searchQuery={searchQuery}
                currentUser={currentUser}
                isAuthenticated={isAuthenticated}
              />
            ) : (
              <RestrictedAccessView
                currentTab="announcements"
                onOpenLogin={() => setLoginModalOpen(true)}
                onNavigateToLaundry={() => {
                  setLaundrySubTab('pipeline');
                  setCurrentTab('laundry');
                }}
                onNavigateToMeetingRoom={() => setCurrentTab('meeting_room')}
              />
            )
          )}

          {currentTab === 'reports' && (
            isAuthenticated ? (
              <ReportsView />
            ) : (
              <RestrictedAccessView
                currentTab="reports"
                onOpenLogin={() => setLoginModalOpen(true)}
                onNavigateToLaundry={() => {
                  setLaundrySubTab('pipeline');
                  setCurrentTab('laundry');
                }}
                onNavigateToMeetingRoom={() => setCurrentTab('meeting_room')}
              />
            )
          )}

          {currentTab === 'rags_gloves' && (
            <LaundryView
              orders={laundryOrders}
              searchQuery={searchQuery}
              currentUser={currentUser}
              isAuthenticated={isAuthenticated}
              initialSubTab="rags_gloves"
              onOpenCreateOrder={() => setCreateLaundryModalOpen(true)}
              onSelectOrder={(order) => setSelectedLaundryOrder(order)}
              onUpdateOrder={handleUpdateLaundryOrder}
              onDeleteOrder={handleDeleteLaundryOrder}
              onSyncGoogleSheet={() => syncGoogleSheet(true)}
              isSyncingSheet={isSyncingSheet}
              lastSheetSyncTime={lastSheetSyncTime}
              sheetSyncError={sheetSyncError}
              sheetRowsCount={sheetRowsCount}
            />
          )}

          {currentTab === 'meeting_room' && (
            <MeetingRoomView
              currentUser={currentUser}
              isAuthenticated={isAuthenticated}
            />
          )}

          {currentTab === 'maintenance' && (
            isAuthenticated ? (
              <MaintenanceView
                currentUser={currentUser}
                isAuthenticated={isAuthenticated}
                externalTickets={maintenanceTickets}
                highlightWorkOrderNo={selectedMaintenanceWorkOrder}
                onClearHighlight={() => setSelectedMaintenanceWorkOrder(null)}
              />
            ) : (
              <RestrictedAccessView
                currentTab="maintenance"
                onOpenLogin={() => setLoginModalOpen(true)}
                onNavigateToLaundry={() => {
                  setLaundrySubTab('pipeline');
                  setCurrentTab('laundry');
                }}
                onNavigateToMeetingRoom={() => setCurrentTab('meeting_room')}
              />
            )
          )}

          {currentTab === 'schedule' && (
            isAuthenticated ? (
              <WorkScheduleView
                currentUser={currentUser}
                isAuthenticated={isAuthenticated}
              />
            ) : (
              <RestrictedAccessView
                currentTab="schedule"
                onOpenLogin={() => setLoginModalOpen(true)}
                onNavigateToLaundry={() => {
                  setLaundrySubTab('pipeline');
                  setCurrentTab('laundry');
                }}
                onNavigateToMeetingRoom={() => setCurrentTab('meeting_room')}
              />
            )
          )}

          {currentTab === 'ot' && (
            isAuthenticated ? (
              <OtView
                currentUser={currentUser}
                isAuthenticated={isAuthenticated}
                onOpenLogin={() => setLoginModalOpen(true)}
              />
            ) : (
              <RestrictedAccessView
                currentTab="ot"
                onOpenLogin={() => setLoginModalOpen(true)}
                onNavigateToLaundry={() => {
                  setLaundrySubTab('pipeline');
                  setCurrentTab('laundry');
                }}
                onNavigateToMeetingRoom={() => setCurrentTab('meeting_room')}
              />
            )
          )}

          {currentTab === 'payslip' && (
            isAuthenticated ? (
              <PayslipView
                currentUser={currentUser}
                isAuthenticated={isAuthenticated}
              />
            ) : (
              <RestrictedAccessView
                currentTab="ot"
                onOpenLogin={() => setLoginModalOpen(true)}
                onNavigateToLaundry={() => {
                  setLaundrySubTab('pipeline');
                  setCurrentTab('laundry');
                }}
                onNavigateToMeetingRoom={() => setCurrentTab('meeting_room')}
              />
            )
          )}

          {currentTab === 'equipment' && (
            isAuthenticated ? (
              <EquipmentView
                currentUser={currentUser}
                isAuthenticated={isAuthenticated}
              />
            ) : (
              <RestrictedAccessView
                currentTab="equipment"
                onOpenLogin={() => setLoginModalOpen(true)}
                onNavigateToLaundry={() => {
                  setLaundrySubTab('pipeline');
                  setCurrentTab('laundry');
                }}
                onNavigateToMeetingRoom={() => setCurrentTab('meeting_room')}
              />
            )
          )}

          {currentTab === 'chlorine' && (
            isAuthenticated ? (
              <ChlorineView
                currentUser={currentUser}
                isAuthenticated={isAuthenticated}
              />
            ) : (
              <RestrictedAccessView
                currentTab="chlorine"
                onOpenLogin={() => setLoginModalOpen(true)}
                onNavigateToLaundry={() => {
                  setLaundrySubTab('pipeline');
                  setCurrentTab('laundry');
                }}
                onNavigateToMeetingRoom={() => setCurrentTab('meeting_room')}
              />
            )
          )}

          {currentTab === 'laundry' && (
            <LaundryView
              orders={laundryOrders}
              searchQuery={searchQuery}
              currentUser={currentUser}
              isAuthenticated={isAuthenticated}
              initialSubTab={laundrySubTab}
              onOpenCreateOrder={() => setCreateLaundryModalOpen(true)}
              onSelectOrder={(order) => setSelectedLaundryOrder(order)}
              onUpdateOrder={handleUpdateLaundryOrder}
              onDeleteOrder={handleDeleteLaundryOrder}
              onSyncGoogleSheet={() => syncGoogleSheet(true)}
              isSyncingSheet={isSyncingSheet}
              lastSheetSyncTime={lastSheetSyncTime}
              sheetSyncError={sheetSyncError}
              sheetRowsCount={sheetRowsCount}
            />
          )}
        </main>
      </div>

      {/* Modals & Overlays */}
      <InviteMemberModal
        isOpen={inviteMemberModalOpen}
        onClose={() => setInviteMemberModalOpen(false)}
        onAddMember={handleAddMember}
      />

      <CreateLaundryModal
        isOpen={createLaundryModalOpen}
        onClose={() => setCreateLaundryModalOpen(false)}
        onAddOrder={handleAddLaundryOrder}
        existingOrders={laundryOrders}
      />

      <LaundryDetailModal
        isOpen={!!selectedLaundryOrder && !standaloneTrackingOrder}
        order={selectedLaundryOrder}
        onClose={() => setSelectedLaundryOrder(null)}
        onUpdateOrder={handleUpdateLaundryOrder}
        onDeleteOrder={handleDeleteLaundryOrder}
        currentUser={currentUser}
      />

      {standaloneTrackingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <MobileTrackingView
            order={standaloneTrackingOrder}
            isStandalone={true}
            onClose={() => {
              setStandaloneTrackingOrder(null);
              // Clean URL
              if (window.history?.replaceState) {
                window.history.replaceState({}, '', window.location.pathname);
              }
            }}
            onRefresh={() => syncGoogleSheet(false)}
          />
        </div>
      )}

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        initialTab={settingsInitialTab}
        currentUser={currentUser}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        currentUser={currentUser}
        onUpdateUser={handleUpdateCurrentUser}
        onLogout={handleLogout}
      />

      <HelpModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />

      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onMarkAsRead={handleMarkNotificationAsRead}
        onClearAll={handleClearAllNotifications}
        onSelectNotificationOrder={handleSelectNotificationOrder}
        onSelectNotificationMaintenance={handleSelectNotificationMaintenance}
      />

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        isDismissible={true}
      />

      {/* Floating Draggable Quick Menu for Mobile and Tablet Portrait */}
      <FloatingMobileMenu
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenSettings={() => {
          setSettingsInitialTab('general');
          setSettingsModalOpen(true);
        }}
        onOpenProfile={() => setProfileModalOpen(true)}
        onToggleNotifications={() => setNotificationsOpen(true)}
        onLogin={() => setLoginModalOpen(true)}
        onLogout={handleLogout}
      />
    </div>
  );
}

