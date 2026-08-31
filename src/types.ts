export type NavigationTab = 'dashboard' | 'announcements' | 'projects' | 'team' | 'reports' | 'laundry' | 'meeting_room' | 'maintenance' | 'schedule' | 'ot' | 'payslip' | 'equipment' | 'chlorine' | 'rags_gloves' | 'settings' | 'profile';

export interface ChlorineInspectionRecord {
  id: string;
  seq: number;
  timestamp: string;          // ประทับเวลา e.g. "11/3/2026, 9:10:00"
  inspectorName: string;      // ชื่อผู้ผสมสาร - ผู้สุ่มตรวจ e.g. "นพเก้า", "สุริยา"
  inspectionDate: string;     // กรุณาระบุวันที่ e.g. "11/3/2026"
  rawArea: string;            // เลือกพื้นที่ e.g. "ส่งผลอาคาร B", "ผลสุ่มตรวจอาคาร A"
  building: 'อาคาร A' | 'อาคาร B' | string; // อาคาร A หรือ อาคาร B
  actionType: string;         // ส่งผล หรือ ผลสุ่มตรวจ
  rawPhotoUrl: string;        // URL ลิงก์รูปภาพ Google Drive
  photoUrl: string;           // Direct Thumbnail URL
  status: string;             // บันทึกผลแล้ว / ผ่านเกณฑ์
  note?: string;
}

export type EquipmentSubCategory = 'cleaning' | 'softener' | 'gown' | 'keys' | 'ladder';

export type EquipmentActionStatus = 'เบิก' | 'คืน' | 'ยืม' | 'อยู่ระหว่างใช้งาน' | 'เสร็จสิ้น' | 'คีย์เบิกแล้ว' | 'อนุมัติแล้ว' | 'รอคืน' | string;

export interface EquipmentItemDetail {
  name: string;
  quantity: number;
  code?: string;
  size?: string;
  unit?: string;
  note?: string;
}

export interface EquipmentRecord {
  id: string;
  seq: number;
  subCategory: EquipmentSubCategory;
  timestamp?: string;
  date: string; // วันที่ e.g. "17/4/2026", "27/3/2026"
  requesterName: string; // ชื่อผู้เบิก / ผู้ยืม
  department: string; // แผนก / ฝ่าย
  actionType: 'เบิก' | 'คืน' | 'ยืม' | 'บันทึกเบิก' | string;
  status: EquipmentActionStatus;
  
  // Specific item details
  itemSummary: string;
  itemsList: EquipmentItemDetail[];
  totalQuantity: number;
  
  // Category specific fields
  shortCode?: string; // รหัส (ย่อ) เช่น "116"
  fullCode?: string; // รหัส (เต็ม) เช่น "0307100116"
  keyNumbers?: string; // หมายเลขกุญแจ เช่น "17,19"
  ladderType?: string; // ขนาดบันได เช่น "บันได 7 ขั้น (สูง 2.10 เมตร)"
  ladderInspection?: string; // การตรวจสอบ เช่น "ไม่พบจุดชำรุด"
  defectPhotoUrl?: string; // ลิงก์รูปถ่ายชำรุด
  gownSizes?: { size: string; count: number }[]; // ขนาดเสื้อกาวน์ L, XL, 2XL
  note?: string; // หมายเหตุ / อื่นๆ
}

export type AnnouncementStatus = 'active' | 'upcoming' | 'expired';

export interface AnnouncementItem {
  id: string;
  seq: number;
  title: string;          // หัวข้อ
  content: string;        // เนื้อหา
  department: string;     // แผนก / ฝ่าย
  startDate: string;      // วันเริ่มต้น e.g. "10/8/2026"
  endDate?: string;       // วันสิ้นสุด e.g. "31/8/2026"
  rawImageUrl?: string;   // Original link from sheet (e.g. Google Drive link)
  imageUrl?: string;      // Direct embeddable image URL (lh3/thumbnail)
  category?: string;      // Auto-categorized by department
  status?: AnnouncementStatus;
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: string;
}

export type MeetingStatus = 'กำลังประชุม' | 'รอเริ่มวันนี้' | 'นัดหมายล่วงหน้า' | 'เสร็จสิ้นแล้ว';

export interface MeetingRoomBooking {
  id: string;
  seq: number;
  timestamp: string;          // ประทับเวลา e.g. "24/8/2026, 15:17:57"
  room: string;               // เลือกห้องประชุม e.g. "TPM 1", "TPM 2"
  bookingDate: string;        // วันที่ e.g. "3/8/2026", "28/10/2026"
  startTime: string;          // เวลาที่เริ่ม e.g. "10:30:00" or "10:30"
  endTime: string;            // เวลาสิ้นสุด e.g. "11:30:00" or "11:30"
  subject: string;            // เรื่องที่ประชุม/อบรม
  department: string;         // แผนก/ฝ่าย
  attendeesCount: number;     // จำนวน (คน)
  phoneNumber: string;        // เบอร์โทร e.g. "4510"
  status?: MeetingStatus;
  note?: string;
}

export type WorkScheduleStatus = 'ทำงาน' | 'วันหยุด' | 'ลาพักร้อน' | 'ลาป่วย' | 'ลากิจ' | 'ขาดงาน' | 'วันนักขัตฤกษ์';

export interface EmployeeScheduleItem {
  id: string;
  seq: number;
  dateStr: string;
  dayOfWeek: string;
  employeeName: string;
  department: string;
  shiftTime: string;
  status: WorkScheduleStatus;
  note?: string;
}

export interface DailyWorkSchedule {
  id: string;
  seq: number;
  dayOfWeek: string;
  dateStr: string;
  formattedDate: string;
  onDutyEmployees: { name: string; shiftTime: string; department: string }[];
  offDutyEmployees: { name: string; department: string }[];
  leaveEmployees: { name: string; department: string; leaveType: WorkScheduleStatus }[];
  totalOnDuty: number;
  totalOffDuty: number;
  totalLeaves: number;
}

export interface OtRecord {
  id: string;
  seq: number;
  recordedDate: string; // วันที่บันทึกข้อมูล
  employeeId: string;   // รหัสพนักงาน
  employeeName: string; // ชื่อ - นามสกุล
  department: string;   // ฝ่ายงาน
  otDate: string;       // วันที่ทำ OT
  startTime: string;    // เวลาเริ่มต้น (เช่น 14.30, 6.00)
  endTime: string;      // เวลาสิ้นสุด (เช่น 18.30, 14.30)
  totalHours: number;   // คำนวณชั่วโมง OT
  docNo: string;        // เลขที่เอกสาร
  status: string;       // สถานะ เช่น Approved, Confirm
  note?: string;        // หมายเหตุ
}

export type MaintenanceStatus = 'แจ้งใหม่' | 'อยู่ระหว่างดำเนินการ' | 'เสร็จแล้ว';

export interface MaintenanceTicket {
  id: string;
  seq: number;
  workOrderNo: string;
  department: string;
  issueDetail: string;
  reportedDate: string;
  status: MaintenanceStatus;
  actionDate?: string;
  requester: string;
  completedDate?: string;
  note?: string;
  location?: string;
  priority?: 'normal' | 'high' | 'urgent';
  estimatedDays?: number;
}

export type ProjectStatus = 'In Progress' | 'Review' | 'Completed' | 'Planning';
export type ProjectCategory = 'Enterprise' | 'SMB' | 'Startup';

export type LaundryStage = 'received' | 'washing' | 'drying' | 'ironing' | 'quality_check' | 'ready' | 'delivered';
export type LaundryPriority = 'normal' | 'high' | 'express';
export type LaundryServiceType = 'Wash & Fold' | 'Dry Cleaning' | 'Premium Steam Press' | 'Delicate Fabrics' | 'Heavy Bedding & Linens' | 'Express 3-Hour Service';

export interface LaundryItemDetail {
  id: string;
  name: string;
  category: 'Clothing' | 'Bedding' | 'Suits/Dresses' | 'Towels & Linens' | 'Delicates' | 'Specialty';
  quantity: number;
  unitPrice: number;
  careNote?: string;
}

export interface LaundryOrder {
  id: string;
  trackingCode: string;
  customerName: string;
  customerPhone?: string;
  customerRoomOrDept?: string;
  serviceType: LaundryServiceType;
  priority: LaundryPriority;
  stage: LaundryStage;
  items: LaundryItemDetail[];
  totalWeightKg: number;
  totalPrice: number;
  paymentStatus: 'Paid' | 'Pending' | 'Billed to Room' | 'Corporate Invoice';
  assignedStaff: string;
  assignedStaffAvatar?: string;
  assignedMachine?: string;
  waterTemp?: 'Cold (30°C)' | 'Warm (40°C)' | 'Hot (60°C)' | 'Eco Gentle';
  specialInstructions?: string;
  notes?: string;
  orderDate?: string; // YYYY-MM-DD format
  receivedAt: string;
  estimatedCompletion: string;
  completedAt?: string;
  historyTimeline: {
    stage: LaundryStage;
    label: string;
    timestamp: string;
    note: string;
    operator: string;
  }[];
}

export interface LaundryEquipment {
  id: string;
  name: string;
  type: 'Washer' | 'Dryer' | 'Steam Press' | 'Ozone Disinfector';
  capacityKg: number;
  status: 'running' | 'idle' | 'maintenance' | 'completed';
  currentOrderId?: string;
  currentCycle?: string;
  remainingMinutes?: number;
  totalRunsToday: number;
  temperature?: string;
}

export interface RagsGlovesDailyRecord {
  day: number; // 1 to 31
  dateStr?: string;
  discardRagsKg: number; // คัดทิ้ง เศษผ้า
  discardGlovesKg: number; // คัดทิ้ง ถุงมือ
  beforeWashRagsKg: number; // ก่อนซัก เศษผ้า
  beforeWashGlovesKg: number; // ก่อนซัก ถุงมือ
  afterWashRagsKg: number; // หลังซัก เศษผ้า
  afterWashGlovesKg: number; // หลังซัก ถุงมือ
  note?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: 'Engineering' | 'Design' | 'Product' | 'Marketing' | 'Sales';
  status: 'Online' | 'Offline' | 'Do Not Disturb' | 'Last active 2h ago' | string;
  statusType: 'online' | 'offline' | 'dnd' | 'away';
  avatarUrl?: string;
  initials?: string;
  roleBadgeClass?: string;
  isOnline: boolean;
  projectsAssigned?: number;
  recentAction?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  dueDate: string;
  isOverdue?: boolean;
  category: ProjectCategory;
  members: {
    id: string;
    name: string;
    avatarUrl?: string;
    initials?: string;
  }[];
  totalMembersCount?: number;
  tasksCompleted?: number;
  tasksTotal?: number;
  updatedAt?: string;
}

export interface ActivityItem {
  id: string;
  type: 'task_completed' | 'comment' | 'report_generated' | 'commit' | 'design_update' | 'issue_closed' | 'member_joined';
  user: string;
  userAvatar?: string;
  userInitials?: string;
  title: string;
  highlightText?: string;
  quote?: string;
  subtitle: string;
  timestamp: string;
  badgeType?: 'success' | 'comment' | 'system' | 'code' | 'figma';
}

export interface ReportItem {
  id: string;
  name: string;
  generatedDate: string;
  status: 'READY' | 'GENERATING' | 'FAILED';
  category: string;
  downloadUrl?: string;
  fileSize?: string;
}

export interface AnalyticsData {
  timeRange: '30 Days' | 'Quarter' | 'Year' | 'Custom';
  totalRevenue: number;
  revenueChange: number;
  activeProjects: number;
  projectsChange: number;
  avgCompletionDays: number;
  completionChange: number;
  satisfactionScore: number;
  satisfactionChange: number;
  categoryDistribution: {
    category: string;
    percentage: number;
    count: number;
    color: string;
  }[];
  resourceAllocation: {
    department: string;
    percentage: number;
    color: string;
  }[];
  trendMonths: {
    month: string;
    revenue: number;
    costs: number;
    revenuePct: number;
    costsPct: number;
  }[];
}

export interface AppNotification {
  id: string;
  type: 'laundry_new' | 'laundry_status' | 'maintenance_new' | 'maintenance_status' | 'alert' | 'success' | 'report' | 'info';
  title: string;
  desc: string;
  time: string;
  timestamp: number;
  unread: boolean;
  orderId?: string;
  trackingCode?: string;
  customerName?: string;
  department?: string;
  stage?: LaundryStage;
  workOrderNo?: string;
  ticketId?: string;
  maintenanceStatus?: MaintenanceStatus;
  requester?: string;
}
