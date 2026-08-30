import { LaundryOrder, Project, TeamMember, ActivityItem, AppNotification } from '../types';
import { INITIAL_LAUNDRY_ORDERS } from '../data/mockLaundryData';
import { INITIAL_PROJECTS, INITIAL_TEAM_MEMBERS, DASHBOARD_ACTIVITIES, AdminUserAccount } from '../data/mockData';

export type RealtimeEventType = 
  | 'SYNC_ALL'
  | 'ORDER_CREATED'
  | 'ORDER_UPDATED'
  | 'ORDER_DELETED'
  | 'NOTIFICATION_ADDED'
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_DELETED'
  | 'MEMBER_ADDED'
  | 'USER_REGISTERED'
  | 'ACTIVITY_ADDED'
  | 'SIMULATE_AUTO_TICK'
  | 'PING';

export interface RealtimeMessage {
  type: RealtimeEventType;
  senderId: string;
  timestamp: number;
  payload?: any;
}

const STORAGE_KEYS = {
  LAUNDRY_ORDERS: 'proworkflow_laundry_orders_v3',
  PROJECTS: 'proworkflow_projects_v2',
  TEAM_MEMBERS: 'proworkflow_team_members_v2',
  ACTIVITIES: 'proworkflow_activities_v2',
  NOTIFICATIONS: 'proworkflow_notifications_v2',
  REGISTERED_USERS: 'proworkflow_registered_users',
  PINNED_ANNOUNCEMENTS: 'proworkflow_pinned_announcements_v2',
  AUTO_RUN: 'proworkflow_autorun_enabled_v2',
  LAST_SYNC: 'proworkflow_last_sync_v2',
};

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

class RealtimeHub {
  private channel: BroadcastChannel | null = null;
  private clientId: string = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  private listeners: Set<(msg: RealtimeMessage) => void> = new Set();
  private isAutoRunActive: boolean = false;
  private autoRunTimer: any = null;

  constructor() {
    this.sanitizeLegacyMockStorage();
    this.initBroadcastChannel();
    this.initStorageListener();
    this.initPostMessageListener();
    this.startAutoRunEngine();
  }

  private sanitizeLegacyMockStorage() {
    if (typeof window === 'undefined') return;
    try {
      const isCleaned = localStorage.getItem('proworkflow_mock_cleaned_v2');
      if (!isCleaned) {
        // Clean out legacy mock laundry orders (keep only real gsheet orders or user manual ones)
        const rawLaundry = localStorage.getItem(STORAGE_KEYS.LAUNDRY_ORDERS);
        if (rawLaundry) {
          const parsed = JSON.parse(rawLaundry);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(o => 
              o && typeof o.id === 'string' && 
              !o.id.startsWith('lnd-1') && 
              !o.id.startsWith('lnd-2') && 
              !o.id.startsWith('lnd-3') && 
              !o.id.startsWith('lnd-4') && 
              !o.id.startsWith('lnd-5') && 
              !o.id.startsWith('lnd-6') &&
              !o.id.startsWith('lnd-live-')
            );
            localStorage.setItem(STORAGE_KEYS.LAUNDRY_ORDERS, JSON.stringify(cleaned));
          }
        }

        // Clean out legacy mock projects, activities, notifications, rags & gloves
        const rawProj = localStorage.getItem(STORAGE_KEYS.PROJECTS);
        if (rawProj) {
          localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify([]));
        }
        const rawAct = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
        if (rawAct) {
          localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify([]));
        }
        const rawNotif = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
        if (rawNotif) {
          const parsedNotif = JSON.parse(rawNotif);
          if (Array.isArray(parsedNotif)) {
            const cleanedNotif = parsedNotif.filter(n => !n.id?.startsWith('notif-init-'));
            localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(cleanedNotif));
          }
        }
        const rawTeam = localStorage.getItem(STORAGE_KEYS.TEAM_MEMBERS);
        if (rawTeam) {
          localStorage.setItem(STORAGE_KEYS.TEAM_MEMBERS, JSON.stringify([]));
        }
        localStorage.removeItem('rags_gloves_records_v1');

        localStorage.setItem('proworkflow_mock_cleaned_v2', 'true');
      }
    } catch {
      // storage error
    }
  }

  private initBroadcastChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.channel = new BroadcastChannel('proworkflow_realtime_hub');
        this.channel.onmessage = (event: MessageEvent) => {
          if (event.data && event.data.senderId !== this.clientId) {
            this.notifyListeners(event.data);
          }
        };
      }
    } catch (e) {
      console.warn('[RealtimeHub] BroadcastChannel fallback to storage events', e);
    }
  }

  private initStorageListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key && event.key.startsWith('proworkflow_')) {
          this.notifyListeners({
            type: 'SYNC_ALL',
            senderId: 'storage_sync',
            timestamp: Date.now(),
          });
        }
      });
    }
  }

  private initPostMessageListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        try {
          if (
            event.data && 
            typeof event.data === 'object' && 
            event.data.source === 'proworkflow_embed' && 
            event.data.message && 
            event.data.message.senderId !== this.clientId
          ) {
            this.notifyListeners(event.data.message);
          }
        } catch {
          // ignore
        }
      });
    }
  }

  public subscribe(callback: (msg: RealtimeMessage) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(msg: RealtimeMessage) {
    this.listeners.forEach((cb) => {
      try {
        cb(msg);
      } catch (e) {
        console.error('[RealtimeHub] Listener error:', e);
      }
    });
  }

  public broadcast(type: RealtimeEventType, payload?: any) {
    const msg: RealtimeMessage = {
      type,
      senderId: this.clientId,
      timestamp: Date.now(),
      payload,
    };

    // 1. BroadcastChannel (fastest across tabs in same browser)
    try {
      if (this.channel) {
        this.channel.postMessage(msg);
      }
    } catch {
      // fallback
    }

    // 2. Cross-window / iframe parent postMessage
    try {
      if (typeof window !== 'undefined') {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ source: 'proworkflow_embed', message: msg }, '*');
        }
      }
    } catch {
      // ignore
    }

    // Save timestamp of last sync
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, String(Date.now()));
      } catch {
        // ignore
      }
    }
  }

  // Storage Helpers with robust validation & default fallback
  public getStoredLaundryOrders(): LaundryOrder[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LAUNDRY_ORDERS);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_LAUNDRY_ORDERS;
  }

  public saveLaundryOrders(orders: LaundryOrder[]) {
    try {
      const serialized = JSON.stringify(orders);
      const current = localStorage.getItem(STORAGE_KEYS.LAUNDRY_ORDERS);
      if (current === serialized) {
        return; // No change, skip redundant write & broadcast
      }
      localStorage.setItem(STORAGE_KEYS.LAUNDRY_ORDERS, serialized);
      this.broadcast('SYNC_ALL', { entity: 'laundry', count: orders.length });
    } catch (e) {
      console.warn('[RealtimeHub] Failed to save laundry orders:', e);
    }
  }

  public getStoredProjects(): Project[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_PROJECTS;
  }

  public saveProjects(projects: Project[]) {
    try {
      const serialized = JSON.stringify(projects);
      const current = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (current === serialized) {
        return;
      }
      localStorage.setItem(STORAGE_KEYS.PROJECTS, serialized);
      this.broadcast('SYNC_ALL', { entity: 'projects', count: projects.length });
    } catch (e) {
      console.warn('[RealtimeHub] Failed to save projects:', e);
    }
  }

  public getStoredTeamMembers(): TeamMember[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TEAM_MEMBERS);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_TEAM_MEMBERS;
  }

  public saveTeamMembers(members: TeamMember[]) {
    try {
      const serialized = JSON.stringify(members);
      const current = localStorage.getItem(STORAGE_KEYS.TEAM_MEMBERS);
      if (current === serialized) {
        return;
      }
      localStorage.setItem(STORAGE_KEYS.TEAM_MEMBERS, serialized);
      this.broadcast('SYNC_ALL', { entity: 'team', count: members.length });
    } catch (e) {
      console.warn('[RealtimeHub] Failed to save team members:', e);
    }
  }

  public getStoredActivities(): ActivityItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return DASHBOARD_ACTIVITIES;
  }

  public saveActivities(activities: ActivityItem[]) {
    try {
      const serialized = JSON.stringify(activities);
      const current = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      if (current === serialized) {
        return;
      }
      localStorage.setItem(STORAGE_KEYS.ACTIVITIES, serialized);
      this.broadcast('SYNC_ALL', { entity: 'activities', count: activities.length });
    } catch (e) {
      console.warn('[RealtimeHub] Failed to save activities:', e);
    }
  }

  public addActivity(activity: ActivityItem): ActivityItem[] {
    try {
      const current = this.getStoredActivities();
      const updated = [activity, ...current.filter(a => a.id !== activity.id)].slice(0, 50);
      this.saveActivities(updated);
      this.broadcast('ACTIVITY_ADDED', activity);
      return updated;
    } catch (e) {
      console.warn('[RealtimeHub] Failed to add activity:', e);
      return this.getStoredActivities();
    }
  }

  public getStoredNotifications(): AppNotification[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_NOTIFICATIONS;
  }

  public saveNotifications(notifications: AppNotification[]) {
    try {
      const serialized = JSON.stringify(notifications);
      const current = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (current === serialized) {
        return;
      }
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, serialized);
      this.broadcast('SYNC_ALL', { entity: 'notifications', count: notifications.length });
    } catch (e) {
      console.warn('[RealtimeHub] Failed to save notifications:', e);
    }
  }

  public addNotification(notification: AppNotification) {
    try {
      const current = this.getStoredNotifications();
      // Avoid exact duplicate within 2 seconds
      const isDuplicate = current.some(
        n => n.title === notification.title && 
             n.desc === notification.desc && 
             Math.abs(n.timestamp - notification.timestamp) < 2000
      );
      if (isDuplicate) return current;

      const updated = [notification, ...current.filter(n => n.id !== notification.id)].slice(0, 50);
      this.saveNotifications(updated);
      this.broadcast('NOTIFICATION_ADDED', notification);
      return updated;
    } catch (e) {
      console.warn('[RealtimeHub] Failed to add notification:', e);
      return this.getStoredNotifications();
    }
  }

  public markAllNotificationsAsRead(): AppNotification[] {
    try {
      const current = this.getStoredNotifications();
      const updated = current.map(n => ({ ...n, unread: false }));
      this.saveNotifications(updated);
      return updated;
    } catch {
      return [];
    }
  }

  public markNotificationAsRead(id: string): AppNotification[] {
    try {
      const current = this.getStoredNotifications();
      const updated = current.map(n => n.id === id ? { ...n, unread: false } : n);
      this.saveNotifications(updated);
      return updated;
    } catch {
      return [];
    }
  }

  public clearAllNotifications(): AppNotification[] {
    try {
      this.saveNotifications([]);
      return [];
    } catch {
      return [];
    }
  }

  public getStoredRegisteredUsers(): AdminUserAccount[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.REGISTERED_USERS);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }

  public saveRegisteredUsers(users: AdminUserAccount[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(users));
      this.broadcast('USER_REGISTERED', { count: users.length });
      this.broadcast('SYNC_ALL', { entity: 'registered_users', count: users.length });
    } catch (e) {
      console.warn('[RealtimeHub] Failed to save registered users:', e);
    }
  }

  public deleteRegisteredUser(username: string): boolean {
    try {
      const users = this.getStoredRegisteredUsers();
      const updated = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
      this.saveRegisteredUsers(updated);
      return true;
    } catch {
      return false;
    }
  }

  public getStoredPinnedAnnouncements(): { key: string; pinnedBy?: string; pinnedAt?: string }[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PINNED_ANNOUNCEMENTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => {
            if (typeof item === 'string') {
              return { key: item, pinnedBy: 'ผู้ดูแลระบบ', pinnedAt: new Date().toLocaleDateString('th-TH') };
            }
            return item;
          });
        }
      }
    } catch {
      // ignore
    }
    return [];
  }

  public savePinnedAnnouncements(pins: { key: string; pinnedBy?: string; pinnedAt?: string }[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.PINNED_ANNOUNCEMENTS, JSON.stringify(pins));
      this.broadcast('SYNC_ALL', { entity: 'pinned_announcements', count: pins.length });
    } catch (e) {
      console.warn('[RealtimeHub] Failed to save pinned announcements:', e);
    }
  }

  public isAnnouncementPinned(item: { id?: string; title?: string; department?: string; isPinned?: boolean }): boolean {
    if (!item) return false;
    const pins = this.getStoredPinnedAnnouncements();
    const titleKey = (item.title || '').trim();
    const deptKey = (item.department || '').trim();
    const compositeKey = `${titleKey}_${deptKey}`;
    
    return pins.some(p => 
      (item.id && p.key === item.id) ||
      p.key === compositeKey ||
      p.key === titleKey
    );
  }

  public getAnnouncementPinInfo(item: { id?: string; title?: string; department?: string; isPinned?: boolean }): { isPinned: boolean; pinnedBy?: string; pinnedAt?: string } {
    if (!item) return { isPinned: false };
    const pins = this.getStoredPinnedAnnouncements();
    const titleKey = (item.title || '').trim();
    const deptKey = (item.department || '').trim();
    const compositeKey = `${titleKey}_${deptKey}`;
    
    const found = pins.find(p => 
      (item.id && p.key === item.id) ||
      p.key === compositeKey ||
      p.key === titleKey
    );

    if (found) {
      return { isPinned: true, pinnedBy: found.pinnedBy || 'ผู้ดูแลระบบ', pinnedAt: found.pinnedAt };
    }
    return { isPinned: !!item.isPinned };
  }

  public togglePinAnnouncement(
    item: { id?: string; title?: string; department?: string; isPinned?: boolean }, 
    adminName: string = 'ผู้ดูแลระบบ'
  ): { isPinned: boolean; pinnedBy?: string } {
    try {
      const pins = this.getStoredPinnedAnnouncements();
      const titleKey = (item.title || '').trim();
      const deptKey = (item.department || '').trim();
      const compositeKey = `${titleKey}_${deptKey}`;
      const isCurrentlyPinned = this.isAnnouncementPinned(item);

      let updatedPins: { key: string; pinnedBy?: string; pinnedAt?: string }[];
      let nextPinnedState: boolean;

      if (isCurrentlyPinned) {
        // Unpin
        updatedPins = pins.filter(p => 
          p.key !== compositeKey &&
          p.key !== titleKey &&
          (item.id ? p.key !== item.id : true)
        );
        nextPinnedState = false;
      } else {
        // Pin to top
        const newPinItem = {
          key: compositeKey || item.id || titleKey,
          pinnedBy: adminName,
          pinnedAt: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        };
        updatedPins = [newPinItem, ...pins.filter(p => p.key !== compositeKey && p.key !== titleKey)];
        nextPinnedState = true;
      }

      this.savePinnedAnnouncements(updatedPins);
      return { isPinned: nextPinnedState, pinnedBy: adminName };
    } catch {
      return { isPinned: false };
    }
  }

  /**
   * Clears all sample/mock data from the entire system
   */
  public clearAllSampleData(options?: { keepGoogleSheetOrders?: boolean }) {
    try {
      const currentOrders = this.getStoredLaundryOrders();
      let remainingOrders: LaundryOrder[] = [];
      
      if (options?.keepGoogleSheetOrders) {
        // Keep real Google Sheet synced orders, remove only mock orders
        remainingOrders = currentOrders.filter(o => o.id.startsWith('gsheet-'));
      }

      this.saveLaundryOrders(remainingOrders);
      this.saveProjects([]);
      this.saveActivities([]);
      
      // Also clear Rags & Gloves mock records from localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('rags_gloves_records_v1', JSON.stringify([]));
      }

      this.broadcast('SYNC_ALL', { cleared: true });
      return { success: true };
    } catch (err) {
      console.error('[RealtimeHub] Failed to clear sample data:', err);
      return { success: false, error: String(err) };
    }
  }

  /**
   * Restores initial sample/mock data back into the system
   */
  public restoreSampleData() {
    try {
      this.saveLaundryOrders(INITIAL_LAUNDRY_ORDERS);
      this.saveProjects(INITIAL_PROJECTS);
      this.saveTeamMembers(INITIAL_TEAM_MEMBERS);
      this.saveActivities(DASHBOARD_ACTIVITIES);
      
      // Also reset Rags & Gloves to initial
      if (typeof window !== 'undefined') {
        localStorage.removeItem('rags_gloves_records_v1');
      }

      this.broadcast('SYNC_ALL', { restored: true });
      return { success: true };
    } catch (err) {
      console.error('[RealtimeHub] Failed to restore sample data:', err);
      return { success: false, error: String(err) };
    }
  }

  // Auto-run Live Engine (Automatic timer & live simulation)
  public startAutoRunEngine() {
    if (this.autoRunTimer) return;
    
    // Check user preference
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUTO_RUN);
      if (stored !== null) {
        this.isAutoRunActive = stored === 'true';
      }
    } catch {
      this.isAutoRunActive = true;
    }

    // Auto-run engine is idle by default unless explicit simulation is triggered
    this.isAutoRunActive = false;
  }

  public setAutoRunEnabled(enabled: boolean) {
    this.isAutoRunActive = enabled;
    try {
      localStorage.setItem(STORAGE_KEYS.AUTO_RUN, String(enabled));
    } catch {
      // ignore
    }
    this.broadcast('SYNC_ALL', { autorun: enabled });
  }

  public isAutoRun(): boolean {
    return this.isAutoRunActive;
  }

  // Create a simulated live order (For instant demonstration of real-time sync)
  public simulateLiveIncomingOrder(currentOrders: LaundryOrder[]): { newOrder: LaundryOrder; activity: ActivityItem } {
    const randomDepts = ['A/2', 'A/4', 'B/1', '2/1', '3/2', 'ธุรการลาดกระบัง 1', 'สวัสดิการลาดกระบัง 1'];
    const randomNames = ['วิเชียร มั่นคง', 'สุรีย์ นพรัตน์', 'ธีระพงษ์ สว่างจิต', 'กมลทิพย์ ศรีสุวรรณ', 'เอกชัย ใจดี'];
    const randomItems = [
      { name: 'เสื้อกาวน์สีเขียว', category: 'Clothing' as const, qty: 12, price: 15 },
      { name: 'ผ้ากรองแอร์', category: 'Specialty' as const, qty: 8, price: 20 },
      { name: 'ผ้าปูโต๊ะสัมมนา', category: 'Towels & Linens' as const, qty: 15, price: 18 },
      { name: 'ชุด Visitor Cleanroom', category: 'Clothing' as const, qty: 6, price: 25 },
    ];

    const pickDept = randomDepts[Math.floor(Math.random() * randomDepts.length)];
    const pickName = randomNames[Math.floor(Math.random() * randomNames.length)];
    const pickItem = randomItems[Math.floor(Math.random() * randomItems.length)];
    const dateCode = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomSeq = String(Math.floor(Math.random() * 899) + 100);
    const trackingCode = `LKB2 - ${dateCode}${randomSeq}`;
    const nowTimeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

    const newOrder: LaundryOrder = {
      id: `lnd-live-${Date.now()}`,
      trackingCode,
      customerName: pickName,
      customerRoomOrDept: pickDept,
      serviceType: 'Wash & Fold',
      priority: Math.random() > 0.6 ? 'express' : 'normal',
      stage: 'received',
      items: [
        {
          id: `item-${Date.now()}`,
          name: pickItem.name,
          category: pickItem.category,
          quantity: pickItem.qty,
          unitPrice: pickItem.price,
          careNote: 'ออเดอร์ใหม่จากระบบ Real-time Auto-Sync',
        },
      ],
      totalWeightKg: Number((pickItem.qty * 0.35).toFixed(1)),
      totalPrice: pickItem.qty * pickItem.price,
      paymentStatus: 'Corporate Invoice',
      assignedStaff: 'Elena Rostova',
      assignedStaffAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
      assignedMachine: 'DryClean Master Pro-01',
      waterTemp: 'Eco Gentle',
      specialInstructions: 'บันทึกอัตโนมัติผ่าน Real-time Stream',
      receivedAt: `วันนี้ เวลา ${nowTimeStr}`,
      estimatedCompletion: `วันนี้ เวลา 17:00 น.`,
      historyTimeline: [
        {
          stage: 'received',
          label: 'Order Registered (Real-time)',
          timestamp: nowTimeStr,
          note: 'ระบบบันทึกรับผ้าอัตโนมัติ Real-time',
          operator: pickName,
        },
      ],
    };

    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      type: 'task_completed',
      user: pickName,
      title: 'ส่งผ้าเข้าซักใหม่ (Real-time Live)',
      highlightText: `"${trackingCode}" [แผนก ${pickDept}]`,
      subtitle: `${pickItem.name} ${pickItem.qty} ชิ้น • เมื่อสักครู่`,
      timestamp: 'เมื่อสักครู่',
      badgeType: 'success',
    };

    const updated = [newOrder, ...currentOrders];
    this.saveLaundryOrders(updated);

    // Create and broadcast real-time notification
    const newNotification: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'laundry_new',
      title: 'รายการรับผ้าใหม่เข้าระบบ',
      desc: `รหัส: ${trackingCode} • แผนก ${pickDept} • ${pickItem.name} (${pickItem.qty} ชิ้น)`,
      time: 'เมื่อสักครู่',
      timestamp: Date.now(),
      unread: true,
      orderId: newOrder.id,
      trackingCode: newOrder.trackingCode,
      customerName: newOrder.customerName,
      department: newOrder.customerRoomOrDept,
      stage: 'washing',
    };
    this.addNotification(newNotification);

    return { newOrder, activity: newActivity };
  }
}

export const realtimeHub = new RealtimeHub();
