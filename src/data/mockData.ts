import { Project, TeamMember, ActivityItem, ReportItem, AnalyticsData } from '../types';
import { realtimeHub } from '../services/realtimeService';

export const INITIAL_PROJECTS: Project[] = [];

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [];

export const DASHBOARD_ACTIVITIES: ActivityItem[] = [];

export const TEAM_RECENT_ACTIVITIES: Array<{
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  highlightClass: string;
}> = [];

export const INITIAL_REPORTS: ReportItem[] = [];

export const ANALYTICS_DATA: AnalyticsData = {
  timeRange: '30 Days',
  totalRevenue: 0,
  revenueChange: 0,
  activeProjects: 0,
  projectsChange: 0,
  avgCompletionDays: 0,
  completionChange: 0,
  satisfactionScore: 5.0,
  satisfactionChange: 0.0,
  categoryDistribution: [],
  resourceAllocation: [],
  trendMonths: [],
};

export const LOGO_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuB9B0pbqmcIUj6X1VLWkNQPs63-hZzWrdplpQm9wjQQyxLEZdoAKvmyFdA4_5ywkeaggqB0y5k-s795cceL3tux84iZVwZNtZTg0vTB78E0I6_ZSADZXmNzLbWxqy3MqTY8SGrxpFBkDdIXSDAz6Kq3xujYHfCuka_P6X2dtDF3k44zkAgLuSXcZB6HKfAYd8YjzsPervSu76NI4DUoDRH54Vax7SMBo3eqATkc5Y-eAgVg38qJKbTj3w';
export const CURRENT_USER_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOt7uGvM7wmf5FyO-ytN5B2czjD6OeErJex8aDUIDpl72UqJaUgpQfaKwWRSpBBzjRu4gAsjhusgGmHZm9g6t9aVD3bs7_mgf8oObnlh0NbODxTHwsRCVnTgFDwd0XYtaU8JZlMwOtbF3s-_FCLtlS_4aBgbj-qhh_zdVObgK8mipsHdILEFK0Re3I_6mmXj7KtInGyZSqx1BPvpDSvhTKBEnp_d1BfnmmDRak8EV0uYKwtLC6hF-yZA';

export interface AdminUserAccount {
  username: string;
  name: string;
  email?: string;
  role: string;
  password: string;
  employeeId?: string;
  avatarUrl?: string;
  lastLogin?: string;
  isAdmin?: boolean;
  canEdit?: boolean;
  permissions?: {
    canEditData?: boolean;
    canManageOrders?: boolean;
    canManageProjects?: boolean;
    canDeleteData?: boolean;
  };
}

export function getUserEmployeeId(user?: AdminUserAccount | null): string {
  if (!user) return '';
  if (user.employeeId && user.employeeId.trim()) {
    return user.employeeId.trim().toUpperCase();
  }
  const role = user.role || '';
  const match = role.match(/(?:รหัสพนักงาน:?\s*|emp:?\s*|id:?\s*)([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1].trim().toUpperCase();
  }
  // Check username if it's alphanumeric and not generic
  const username = (user.username || '').trim().replace(/^@/, '');
  if (username && !['guest', 'admin', 'reizosischen', 'administrator', 'staff'].includes(username.toLowerCase())) {
    return username.toUpperCase();
  }
  return '';
}

export function isOtRecordMatchedToUser(
  record: { employeeId?: string; employeeName?: string },
  user?: AdminUserAccount | null,
  customEmployeeId?: string
): boolean {
  if (customEmployeeId && customEmployeeId.trim()) {
    const cleanCustom = customEmployeeId.trim().toUpperCase();
    const cleanRecEmp = (record.employeeId || '').trim().toUpperCase();
    if (cleanRecEmp && cleanRecEmp === cleanCustom) return true;
  }

  if (!user) return false;

  const targetEmpId = getUserEmployeeId(user);
  const cleanRecEmpId = (record.employeeId || '').trim().toUpperCase();
  const cleanRecName = (record.employeeName || '').trim().toLowerCase();

  // Match by Employee ID
  if (targetEmpId && cleanRecEmpId && targetEmpId === cleanRecEmpId) {
    return true;
  }

  // Match by User's exact name
  const userName = (user.name || '').trim().toLowerCase();
  if (userName && cleanRecName && (cleanRecName.includes(userName) || userName.includes(cleanRecName))) {
    return true;
  }

  // Match by User's username if it matches employeeId
  const rawUser = (user.username || '').trim().toUpperCase().replace(/^@/, '');
  if (rawUser && cleanRecEmpId && rawUser === cleanRecEmpId) {
    return true;
  }

  return false;
}

export const DEFAULT_ADMIN_USER: AdminUserAccount = {
  username: 'reizosischen',
  name: 'reizosischen',
  email: 'reizosischen@proworkflow.com',
  role: 'Super Administrator (ผู้ดูแลระบบสูงสุด)',
  password: '724754',
  lastLogin: 'Active Session',
  isAdmin: true,
  canEdit: true,
  permissions: {
    canEditData: true,
    canManageOrders: true,
    canManageProjects: true,
    canDeleteData: true,
  }
};

export const MARK_ADMIN_USER: AdminUserAccount = {
  username: 'Mark',
  name: 'Mark (Administrator)',
  email: 'mark@proworkflow.com',
  role: 'Administrator (ผู้ดูแลระบบ)',
  password: '717681',
  lastLogin: 'Active Session',
  isAdmin: true,
  canEdit: true,
  permissions: {
    canEditData: true,
    canManageOrders: true,
    canManageProjects: true,
    canDeleteData: true,
  }
};

export const EXAM_USER: AdminUserAccount = {
  username: 'Exam',
  name: 'Exam (พนักงานทั่วไป)',
  email: 'exam@proworkflow.com',
  role: 'พนักงานทั่วไป (Staff)',
  password: '1234567890',
  lastLogin: 'Active Session',
  isAdmin: false,
  canEdit: true,
  permissions: {
    canEditData: true,
    canManageOrders: true,
    canManageProjects: false,
    canDeleteData: false,
  }
};

export const DEFAULT_GUEST_USER: AdminUserAccount = {
  username: 'guest',
  name: 'พนักงานทั่วไป (Staff)',
  email: 'staff@system.local',
  role: 'พนักงานฝ่ายผลิต (Staff)',
  password: '',
  isAdmin: false,
  canEdit: true,
  permissions: {
    canEditData: true,
    canManageOrders: true,
    canManageProjects: false,
    canDeleteData: false,
  }
};

export function isUserAdminOrSupervisor(user?: AdminUserAccount | null, isAuthenticated: boolean = true): boolean {
  if (!isAuthenticated || !user) return false;
  if (user.isAdmin === true) return true;
  const username = (user.username || '').toLowerCase().replace(/^@/, '').trim();
  if (username === 'reizosischen' || username === 'mark' || username === 'admin') return true;

  const role = (user.role || '').toLowerCase().trim();
  
  if (
    role === 'admin' ||
    role === 'administrator' ||
    role === 'super admin' ||
    role.includes('ผู้ดูแลระบบ') ||
    role.includes('ผู้ดูแล') ||
    role.includes('แอดมิน') ||
    role.includes('แอดมินเพจ') ||
    role.includes('page admin') ||
    role.includes('supervisor') ||
    role.includes('manager') ||
    role.includes('หัวหน้า')
  ) {
    return true;
  }

  // If role specifically specifies general staff / employee without admin privileges
  if (role.startsWith('รหัสพนักงาน') || role.startsWith('emp') || role.includes('พนักงาน') || role.includes('staff') || role.includes('operator')) {
    return false;
  }

  return false;
}

export interface StaffEmployeeInfo {
  employeeId: string;
  name: string;
  department: string;
}

export const INITIAL_OT_STAFF_EMPLOYEES: StaffEmployeeInfo[] = [
  { employeeId: '358167', name: 'สงกรานต์ สุริยแสง', department: 'แม่บ้าน' },
  { employeeId: '363146', name: 'ณัฐภัทร ละลี', department: 'แม่บ้าน' },
  { employeeId: '359110', name: 'พรนิภา บุติพันคา', department: 'แม่บ้าน' },
  { employeeId: '339858', name: 'ชมภู ยาหยี', department: 'ธุรการ' },
  { employeeId: '716767', name: 'สุริยา เวชพันธ์', department: 'ธุรการ' },
  { employeeId: '714314', name: 'นพเก้า ทองปลิว', department: 'ธุรการ' },
  { employeeId: '720592', name: 'พงศกร พิกุลทอง', department: 'ธุรการ' },
];

export const DELETED_STAFF_STORAGE_KEY = 'proworkflow_deleted_staff_ids_v1';

export function getDeletedStaffIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_STAFF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((id: string) => String(id).toUpperCase().trim());
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export function addDeletedStaffId(id: string): void {
  try {
    const cleanId = String(id).toUpperCase().trim();
    if (!cleanId) return;
    const current = getDeletedStaffIds();
    if (!current.includes(cleanId)) {
      const updated = [...current, cleanId];
      localStorage.setItem(DELETED_STAFF_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {
    // ignore
  }
}

export function removeDeletedStaffId(id: string): void {
  try {
    const cleanId = String(id).toUpperCase().trim();
    if (!cleanId) return;
    const current = getDeletedStaffIds();
    const updated = current.filter(item => item !== cleanId);
    localStorage.setItem(DELETED_STAFF_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function getAllOtStaffList(includeDeleted: boolean = false): StaffEmployeeInfo[] {
  const staffMap = new Map<string, StaffEmployeeInfo>();
  const deletedIds = new Set(getDeletedStaffIds());

  // 1. Initial known OT staff from spreadsheet
  INITIAL_OT_STAFF_EMPLOYEES.forEach((emp) => {
    staffMap.set(emp.employeeId.toUpperCase(), emp);
  });

  // 2. Add from cached / live OT records if available
  try {
    const rawOt = localStorage.getItem('proworkflow_ot_records_cache_v2');
    if (rawOt) {
      const records = JSON.parse(rawOt);
      if (Array.isArray(records)) {
        records.forEach((r: any) => {
          const empId = (r.employeeId || '').trim();
          if (empId && empId !== '-' && empId !== '#N/A' && !staffMap.has(empId.toUpperCase())) {
            staffMap.set(empId.toUpperCase(), {
              employeeId: empId.toUpperCase(),
              name: (r.employeeName || '').trim() || `พนักงาน ${empId}`,
              department: (r.department || '').trim() || 'ทั่วไป',
            });
          }
        });
      }
    }
  } catch {
    // ignore
  }

  const allList = Array.from(staffMap.values());
  if (includeDeleted) return allList;
  return allList.filter(s => !deletedIds.has(s.employeeId.toUpperCase()));
}

export function saveUpdatedUserCredentials(updatedUser: AdminUserAccount): void {
  try {
    localStorage.setItem('proworkflow_current_user', JSON.stringify(updatedUser));

    if (updatedUser.username.toLowerCase() === 'reizosischen') {
      localStorage.setItem('proworkflow_admin_auth', JSON.stringify(updatedUser));
      realtimeHub.broadcast('SYNC_ALL', { entity: 'admin_auth', user: updatedUser });
      return;
    }
    if (updatedUser.username.toLowerCase() === 'mark') {
      localStorage.setItem('proworkflow_mark_admin_auth', JSON.stringify(updatedUser));
      realtimeHub.broadcast('SYNC_ALL', { entity: 'mark_admin_auth', user: updatedUser });
      return;
    }
    if (updatedUser.username.toLowerCase() === 'exam') {
      localStorage.setItem('proworkflow_exam_admin_auth', JSON.stringify(updatedUser));
      realtimeHub.broadcast('SYNC_ALL', { entity: 'exam_admin_auth', user: updatedUser });
      return;
    }

    let list: AdminUserAccount[] = realtimeHub.getStoredRegisteredUsers();
    if (!Array.isArray(list) || list.length === 0) {
      const saved = localStorage.getItem('proworkflow_registered_users');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) list = parsed;
        } catch {}
      }
    }

    const empId = (updatedUser.employeeId || '').toUpperCase();
    const username = (updatedUser.username || '').toLowerCase();

    const filtered = list.filter((u) => {
      const uEmpId = (u.employeeId || '').toUpperCase();
      const uUser = (u.username || '').toLowerCase();
      if (empId && uEmpId && empId === uEmpId) return false;
      if (username && uUser && username === uUser) return false;
      return true;
    });

    filtered.push(updatedUser);
    localStorage.setItem('proworkflow_registered_users', JSON.stringify(filtered));
    realtimeHub.saveRegisteredUsers(filtered);
    realtimeHub.broadcast('USER_REGISTERED', updatedUser);
    realtimeHub.broadcast('SYNC_ALL', { entity: 'registered_users', updatedUser });

    // Record audit activity log for admin visibility
    const auditActivity = {
      id: `act-cred-${Date.now()}`,
      type: 'member_joined' as const,
      user: updatedUser.name || updatedUser.username,
      title: 'อัปเดตข้อมูลความปลอดภัย (Username/Password)',
      highlightText: updatedUser.employeeId ? `[รหัส ${updatedUser.employeeId}]` : `@${updatedUser.username}`,
      subtitle: `เปลี่ยนเป็น @${updatedUser.username} เรียบร้อยแล้ว`,
      timestamp: 'เมื่อสักครู่',
      badgeType: 'system' as const
    };
    realtimeHub.addActivity(auditActivity);
  } catch (err) {
    console.error('Error saving credentials:', err);
  }
}

export function authenticateStaffOrAdmin(
  inputUsername: string,
  inputPass: string
): { success: boolean; user?: AdminUserAccount; error?: 'INCORRECT_PASSWORD' | 'USER_NOT_FOUND' | 'EMPTY' } {
  const cleanInputUser = inputUsername.trim().toLowerCase().replace(/^@/, '');
  const pass = inputPass.trim();

  if (!cleanInputUser || !pass) {
    return { success: false, error: 'EMPTY' };
  }

  // 1. Super Admin (reizosischen)
  let admin = DEFAULT_ADMIN_USER;
  try {
    const savedAdmin = localStorage.getItem('proworkflow_admin_auth');
    if (savedAdmin) admin = JSON.parse(savedAdmin);
  } catch {}

  const adminUsername = (admin.username || 'reizosischen').toLowerCase().replace(/^@/, '').trim();
  const isAdminMatch = cleanInputUser === 'reizosischen' || cleanInputUser === adminUsername;
  if (isAdminMatch) {
    const isPassOk = pass === (admin.password || '724754') || pass === '724754';
    if (isPassOk) {
      return { success: true, user: admin };
    }
    return { success: false, error: 'INCORRECT_PASSWORD' };
  }

  // 2. Mark Admin
  let markAdmin = MARK_ADMIN_USER;
  try {
    const savedMark = localStorage.getItem('proworkflow_mark_admin_auth');
    if (savedMark) markAdmin = JSON.parse(savedMark);
  } catch {}

  const markUsername = (markAdmin.username || 'mark').toLowerCase().replace(/^@/, '').trim();
  const isMarkMatch = cleanInputUser === 'mark' || cleanInputUser === markUsername;
  if (isMarkMatch) {
    const isMarkPassOk = pass === '717681' || pass === (markAdmin.password || '717681');
    if (isMarkPassOk) {
      return { success: true, user: markAdmin };
    }
    return { success: false, error: 'INCORRECT_PASSWORD' };
  }

  // 3. Exam Admin
  let examAdmin = EXAM_USER;
  try {
    const savedExam = localStorage.getItem('proworkflow_exam_admin_auth');
    if (savedExam) examAdmin = JSON.parse(savedExam);
  } catch {}

  const examUsername = (examAdmin.username || 'exam').toLowerCase().replace(/^@/, '').trim();
  const isExamMatch = cleanInputUser === 'exam' || cleanInputUser === examUsername;
  if (isExamMatch) {
    const isExamPassOk = pass === '1234567890' || pass === (examAdmin.password || '1234567890');
    if (isExamPassOk) {
      return { success: true, user: examAdmin };
    }
    return { success: false, error: 'INCORRECT_PASSWORD' };
  }

  // Check if this account has been deleted by admin
  const deletedIds = new Set(getDeletedStaffIds());
  if (deletedIds.has(cleanInputUser.toUpperCase())) {
    return { success: false, error: 'USER_NOT_FOUND' };
  }

  // 3. Check customized stored user accounts (e.g. employee who changed password or username)
  let customUsers: AdminUserAccount[] = [];
  try {
    const saved = localStorage.getItem('proworkflow_registered_users');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) customUsers = parsed;
    }
  } catch {}

  const matchedCustomUser = customUsers.find((u) => {
    const uUser = (u.username || '').toLowerCase().replace(/^@/, '').trim();
    const uEmpId = (u.employeeId || '').toLowerCase().trim();
    const uName = (u.name || '').toLowerCase().trim();
    const isMatched = uUser === cleanInputUser || (uEmpId && uEmpId === cleanInputUser) || (uName && uName === cleanInputUser);
    if (isMatched) {
      if ((u.employeeId && deletedIds.has(u.employeeId.toUpperCase())) || (u.username && deletedIds.has(u.username.toUpperCase()))) {
        return false;
      }
      return true;
    }
    return false;
  });

  if (matchedCustomUser) {
    if (
      matchedCustomUser.password === pass ||
      matchedCustomUser.password.trim() === pass ||
      (matchedCustomUser.employeeId && pass === matchedCustomUser.employeeId.trim())
    ) {
      return { success: true, user: matchedCustomUser };
    }
    return { success: false, error: 'INCORRECT_PASSWORD' };
  }

  // 4. Check OT Staff members (Default credentials: username = employeeId, password = employeeId)
  const allStaff = getAllOtStaffList();
  const matchedStaff = allStaff.find((s) => {
    const sId = s.employeeId.toLowerCase().trim();
    const sName = s.name.toLowerCase().trim();
    return sId === cleanInputUser || sName === cleanInputUser;
  });

  if (matchedStaff) {
    const defaultPass = matchedStaff.employeeId.trim();
    if (
      pass === defaultPass ||
      pass.toLowerCase() === defaultPass.toLowerCase() ||
      pass.toUpperCase() === defaultPass.toUpperCase()
    ) {
      const staffUser: AdminUserAccount = {
        username: matchedStaff.employeeId,
        name: matchedStaff.name,
        email: `emp${matchedStaff.employeeId}@proworkflow.local`,
        role: `พนักงานฝ่าย${matchedStaff.department} (รหัสพนักงาน: ${matchedStaff.employeeId})`,
        employeeId: matchedStaff.employeeId,
        password: matchedStaff.employeeId,
        lastLogin: new Date().toLocaleDateString('th-TH'),
        isAdmin: false,
        canEdit: true,
        permissions: {
          canEditData: true,
          canManageOrders: true,
          canManageProjects: false,
          canDeleteData: false,
        },
      };
      return { success: true, user: staffUser };
    }
    return { success: false, error: 'INCORRECT_PASSWORD' };
  }

  return { success: false, error: 'USER_NOT_FOUND' };
}
