import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Bell, 
  Shield, 
  Sliders, 
  Check, 
  Globe,
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  RotateCcw,
  Database,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
  Lock,
  UserCheck,
  UserX,
  BadgeCheck,
  ShieldCheck,
  ShieldAlert,
  Crown,
  UserCog,
  Edit3,
  FileEdit,
  Pencil,
  Info,
  RefreshCw,
  Key,
  Unlock,
  Filter
} from 'lucide-react';
import { useLanguage, LANGUAGE_CONFIGS } from '../contexts/LanguageContext';
import { FlagIcon } from './FlagIcon';
import { 
  DEFAULT_ADMIN_USER, 
  MARK_ADMIN_USER,
  EXAM_USER,
  AdminUserAccount, 
  getAllOtStaffList, 
  saveUpdatedUserCredentials,
  getDeletedStaffIds,
  addDeletedStaffId,
  removeDeletedStaffId
} from '../data/mockData';
import { realtimeHub } from '../services/realtimeService';

export type SettingsTabType = 'language' | 'general' | 'notifications' | 'security';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTabType;
  currentUser?: AdminUserAccount;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose,
  initialTab = 'language',
  currentUser,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SettingsTabType>(initialTab);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackSync, setSlackSync] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [copiedMarkPassword, setCopiedMarkPassword] = useState(false);
  const [showMarkPass, setShowMarkPass] = useState(false);
  const [copiedExamPassword, setCopiedExamPassword] = useState(false);
  const [showExamPass, setShowExamPass] = useState(false);

  // Determine if current active user is the super admin (reizosischen) or an administrator
  const activeUser = currentUser || (() => {
    try {
      const saved = localStorage.getItem('proworkflow_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();
  const isSuperAdmin = (activeUser?.username || '').toLowerCase() === 'reizosischen';
  const isMarkAdmin = (activeUser?.username || '').toLowerCase() === 'mark';
  const isUserAdmin = Boolean(
    activeUser?.isAdmin ||
    isSuperAdmin ||
    isMarkAdmin ||
    (activeUser?.role && (
      activeUser.role.toLowerCase().includes('admin') ||
      activeUser.role.includes('ผู้ดูแลระบบ') ||
      activeUser.role.includes('ผู้ดูแล')
    )) ||
    activeUser?.permissions?.canDeleteData
  );

  // Sample data management state
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [keepGoogleSheetData, setKeepGoogleSheetData] = useState(true);
  const [clearActionFeedback, setClearActionFeedback] = useState<{ type: 'cleared' | 'restored' | null; message: string }>({ type: null, message: '' });

  // Counts of current stored sample items
  const [currentOrderCount, setCurrentOrderCount] = useState(0);
  const [currentProjectCount, setCurrentProjectCount] = useState(0);

  // Registered users and staff directory state
  const [registeredUsers, setRegisteredUsers] = useState<AdminUserAccount[]>([]);
  const [deletedStaffIds, setDeletedStaffIds] = useState<string[]>(() => getDeletedStaffIds());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterCategory, setUserFilterCategory] = useState<'all' | 'customized' | 'admin' | 'canEdit' | 'deleted'>('all');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedUserPass, setCopiedUserPass] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToReset, setUserToReset] = useState<string | null>(null);
  const [confirmClearAllUsers, setConfirmClearAllUsers] = useState(false);
  const [userActionToast, setUserActionToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Modal / Form state for Admin editing an employee's credentials directly
  const [editingEmployee, setEditingEmployee] = useState<{
    originalUsername: string;
    employeeId: string;
    name: string;
    username: string;
    password: string;
    role: string;
    isAdmin: boolean;
    canEdit: boolean;
  } | null>(null);
  const [showEditEmpPass, setShowEditEmpPass] = useState(false);

  const [adminAuth, setAdminAuth] = useState<AdminUserAccount>(() => {
    try {
      const saved = localStorage.getItem('proworkflow_admin_auth');
      return saved ? JSON.parse(saved) : DEFAULT_ADMIN_USER;
    } catch {
      return DEFAULT_ADMIN_USER;
    }
  });

  const [adminUsernameInput, setAdminUsernameInput] = useState(adminAuth.username || 'reizosischen');
  const [adminPasswordInput, setAdminPasswordInput] = useState(adminAuth.password || '724754');

  const [markAuth, setMarkAuth] = useState<AdminUserAccount>(() => {
    try {
      const saved = localStorage.getItem('proworkflow_mark_admin_auth');
      return saved ? JSON.parse(saved) : MARK_ADMIN_USER;
    } catch {
      return MARK_ADMIN_USER;
    }
  });

  const [markUsernameInput, setMarkUsernameInput] = useState(markAuth.username || 'Mark');
  const [markPasswordInput, setMarkPasswordInput] = useState(markAuth.password || '717681');

  const [examAuth, setExamAuth] = useState<AdminUserAccount>(() => {
    try {
      const saved = localStorage.getItem('proworkflow_exam_admin_auth');
      return saved ? JSON.parse(saved) : EXAM_USER;
    } catch {
      return EXAM_USER;
    }
  });

  const [examUsernameInput, setExamUsernameInput] = useState(examAuth.username || 'Exam');
  const [examPasswordInput, setExamPasswordInput] = useState(examAuth.password || '1234567890');

  // Load and refresh settings data
  const refreshSettingsData = () => {
    try {
      const saved = localStorage.getItem('proworkflow_admin_auth');
      const data = saved ? JSON.parse(saved) : DEFAULT_ADMIN_USER;
      setAdminAuth(data);
      setAdminUsernameInput(data.username || 'reizosischen');
      setAdminPasswordInput(data.password || '724754');

      const savedMark = localStorage.getItem('proworkflow_mark_admin_auth');
      const markData = savedMark ? JSON.parse(savedMark) : MARK_ADMIN_USER;
      setMarkAuth(markData);
      setMarkUsernameInput(markData.username || 'Mark');
      setMarkPasswordInput(markData.password || '717681');

      const savedExam = localStorage.getItem('proworkflow_exam_admin_auth');
      const examData = savedExam ? JSON.parse(savedExam) : EXAM_USER;
      setExamAuth(examData);
      setExamUsernameInput(examData.username || 'Exam');
      setExamPasswordInput(examData.password || '1234567890');

      // Update registered users and deleted staff
      const users = realtimeHub.getStoredRegisteredUsers();
      setRegisteredUsers(users);
      setDeletedStaffIds(getDeletedStaffIds());

      // Update counts
      const orders = realtimeHub.getStoredLaundryOrders();
      const projects = realtimeHub.getStoredProjects();
      setCurrentOrderCount(orders.length);
      setCurrentProjectCount(projects.length);
    } catch (e) {
      console.warn('Error refreshing settings data:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialTab === 'security' && !isUserAdmin) {
        setActiveTab('general');
      } else if (initialTab) {
        setActiveTab(initialTab);
      }
      refreshSettingsData();
    }
  }, [isOpen, initialTab, isUserAdmin]);

  // Subscribe to real-time events for registered users and sync
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = realtimeHub.subscribe((msg) => {
      if (msg.type === 'USER_REGISTERED' || msg.type === 'SYNC_ALL') {
        const users = realtimeHub.getStoredRegisteredUsers();
        setRegisteredUsers(users);
        setDeletedStaffIds(getDeletedStaffIds());
      }
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyPassword = () => {
    navigator.clipboard?.writeText(adminPasswordInput);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 1500);
  };

  const handleCopyMarkPassword = () => {
    navigator.clipboard?.writeText(markPasswordInput);
    setCopiedMarkPassword(true);
    setTimeout(() => setCopiedMarkPassword(false), 1500);
  };

  const handleCopyExamPassword = () => {
    navigator.clipboard?.writeText(examPasswordInput);
    setCopiedExamPassword(true);
    setTimeout(() => setCopiedExamPassword(false), 1500);
  };

  const handleToggleUserPassword = (usernameKey: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [usernameKey]: !prev[usernameKey]
    }));
  };

  const handleCopyUserPassword = (usernameKey: string, pass: string) => {
    navigator.clipboard?.writeText(pass);
    setCopiedUserPass(usernameKey);
    setTimeout(() => setCopiedUserPass(null), 1500);
  };

  const handleDeleteStaff = (account: { name: string; username: string; employeeId?: string; originalEmpId?: string }) => {
    const empId = account.employeeId || account.originalEmpId || account.username;
    const username = account.username;
    
    // 1. Delete from registered custom users
    realtimeHub.deleteRegisteredUser(username);
    if (empId && empId.toLowerCase() !== username.toLowerCase()) {
      realtimeHub.deleteRegisteredUser(empId);
    }
    
    // 2. Add to deleted staff IDs list
    if (empId) addDeletedStaffId(empId);
    if (username) addDeletedStaffId(username);
    
    // 3. Update local state
    const updated = realtimeHub.getStoredRegisteredUsers();
    setRegisteredUsers(updated);
    const updatedDeleted = getDeletedStaffIds();
    setDeletedStaffIds(updatedDeleted);
    setUserToDelete(null);
    
    // 4. Record audit activity
    realtimeHub.addActivity({
      id: `act-del-staff-${Date.now()}`,
      type: 'member_joined' as const,
      user: account.name || username,
      title: 'ลบพนักงานออกจากระบบ',
      highlightText: empId ? `[รหัส ${empId}]` : `@${username}`,
      subtitle: `ลบสิทธิ์การเข้าถึงของ @${username} แล้ว`,
      timestamp: 'เมื่อสักครู่',
      badgeType: 'system' as const
    });
    
    // 5. Broadcast real-time sync
    realtimeHub.broadcast('SYNC_ALL', { entity: 'staff_deleted', empId, username });

    setUserActionToast({
      message: language === 'th'
        ? `ลบพนักงาน "${account.name}" (รหัส ${empId}) ออกจากระบบเรียบร้อยแล้ว`
        : `Deleted employee "${account.name}" from the system`,
      type: 'info'
    });
    setTimeout(() => setUserActionToast(null), 3500);
  };

  const handleRestoreStaff = (empIdOrUser: string, name?: string) => {
    removeDeletedStaffId(empIdOrUser);
    const updatedDeleted = getDeletedStaffIds();
    setDeletedStaffIds(updatedDeleted);
    const updated = realtimeHub.getStoredRegisteredUsers();
    setRegisteredUsers(updated);

    realtimeHub.broadcast('SYNC_ALL', { entity: 'staff_restored', empIdOrUser });

    setUserActionToast({
      message: language === 'th'
        ? `กู้คืนสิทธิ์พนักงาน ${name ? `"${name}" ` : ''}[${empIdOrUser}] กลับเข้าสู่ระบบเรียบร้อยแล้ว`
        : `Restored employee access for ${name || empIdOrUser}`,
      type: 'success'
    });
    setTimeout(() => setUserActionToast(null), 3500);
  };

  const handleResetToDefault = (empId: string, name: string) => {
    // Remove custom registered override so user resets to default (Username=EmpId, Password=EmpId)
    const list = realtimeHub.getStoredRegisteredUsers();
    const filtered = list.filter(u => {
      const uEmpId = (u.employeeId || '').toUpperCase();
      const uUser = (u.username || '').toLowerCase();
      if (empId && uEmpId && empId.toUpperCase() === uEmpId) return false;
      if (empId && uUser && empId.toLowerCase() === uUser) return false;
      return true;
    });

    realtimeHub.saveRegisteredUsers(filtered);
    setRegisteredUsers(filtered);
    setUserToReset(null);

    setUserActionToast({
      message: language === 'th' 
        ? `รีเซ็ตชื่อผู้ใช้และรหัสผ่านของ ${name} [${empId}] กลับเป็นค่าเริ่มต้น (รหัสพนักงาน) แล้ว` 
        : `Reset credentials for ${name} to default employee ID`,
      type: 'success'
    });
    setTimeout(() => setUserActionToast(null), 3500);
  };

  const handleSaveEditedEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    const cleanUser = editingEmployee.username.trim().toLowerCase().replace(/^@/, '');
    if (!cleanUser) return;

    const updatedAccount: AdminUserAccount = {
      name: editingEmployee.name.trim(),
      username: cleanUser,
      employeeId: editingEmployee.employeeId,
      password: editingEmployee.password.trim(),
      role: editingEmployee.role.trim() || 'พนักงานปฏิบัติการ',
      isAdmin: editingEmployee.isAdmin,
      canEdit: editingEmployee.canEdit,
      lastLogin: `อัปเดตโดยแอดมิน (${new Date().toLocaleDateString('th-TH')})`,
      permissions: {
        canEditData: editingEmployee.canEdit,
        canManageOrders: editingEmployee.canEdit,
        canManageProjects: editingEmployee.canEdit,
        canDeleteData: editingEmployee.isAdmin
      }
    };

    saveUpdatedUserCredentials(updatedAccount);
    const updated = realtimeHub.getStoredRegisteredUsers();
    setRegisteredUsers(updated);
    setEditingEmployee(null);

    setUserActionToast({
      message: language === 'th' 
        ? `บันทึกข้อมูล Username & Password ของ @${cleanUser} เรียบร้อยแล้ว` 
        : `Updated credentials for @${cleanUser}`,
      type: 'success'
    });
    setTimeout(() => setUserActionToast(null), 3000);
  };

  const handleClearAllRegisteredUsers = () => {
    realtimeHub.saveRegisteredUsers([]);
    setRegisteredUsers([]);
    setConfirmClearAllUsers(false);
    setUserActionToast({
      message: language === 'th' ? 'ล้างการตั้งค่ากำหนดเองทั้งหมดแล้ว พนักงานทุกคนกลับสู่รหัสเริ่มต้น' : 'Cleared custom accounts',
      type: 'info'
    });
    setTimeout(() => setUserActionToast(null), 3000);
  };

  const handleToggleAdminRole = (account: { username: string; employeeId?: string; name: string; role: string; isAdmin?: boolean; canEdit?: boolean }) => {
    const users = realtimeHub.getStoredRegisteredUsers();
    const matchEmp = (account.employeeId || '').toUpperCase();
    const matchUser = (account.username || '').toLowerCase();

    let target = users.find(u => 
      (matchEmp && (u.employeeId || '').toUpperCase() === matchEmp) || 
      (u.username || '').toLowerCase() === matchUser
    );

    const newIsAdmin = !Boolean(target ? target.isAdmin : account.isAdmin);

    let updatedUsers: AdminUserAccount[];
    if (target) {
      updatedUsers = users.map(u => {
        if ((matchEmp && (u.employeeId || '').toUpperCase() === matchEmp) || (u.username || '').toLowerCase() === matchUser) {
          return {
            ...u,
            isAdmin: newIsAdmin,
            role: newIsAdmin ? (language === 'th' ? 'ผู้ดูแลระบบ (Admin)' : 'Administrator') : (u.role || 'เจ้าหน้าที่ปฏิบัติการ'),
            canEdit: newIsAdmin ? true : (u.canEdit ?? true),
            permissions: {
              ...(u.permissions || {}),
              canEditData: true,
              canManageOrders: true,
              canManageProjects: true,
              canDeleteData: newIsAdmin,
            }
          };
        }
        return u;
      });
    } else {
      // Create new custom registered record for this employee
      const newRecord: AdminUserAccount = {
        name: account.name,
        username: account.username,
        employeeId: account.employeeId,
        password: account.employeeId || '123456',
        role: newIsAdmin ? (language === 'th' ? 'ผู้ดูแลระบบ (Admin)' : 'Administrator') : account.role,
        isAdmin: newIsAdmin,
        canEdit: true,
        lastLogin: `ปรับสิทธิ์แอดมิน (${new Date().toLocaleDateString('th-TH')})`,
        permissions: {
          canEditData: true,
          canManageOrders: true,
          canManageProjects: true,
          canDeleteData: newIsAdmin,
        }
      };
      updatedUsers = [...users, newRecord];
    }

    realtimeHub.saveRegisteredUsers(updatedUsers);
    setRegisteredUsers(updatedUsers);

    setUserActionToast({
      message: newIsAdmin
        ? (language === 'th' ? `ปรับสิทธิ์ ${account.name} (@${account.username}) เป็นแอดมินเรียบร้อยแล้ว` : `Granted Admin privileges to @${account.username}`)
        : (language === 'th' ? `เปลี่ยนสิทธิ์ ${account.name} (@${account.username}) เป็นสมาชิกทั่วไปแล้ว` : `Changed @${account.username} to Member role`),
      type: 'success'
    });
    setTimeout(() => setUserActionToast(null), 3000);
  };

  const handleToggleEditPermission = (account: { username: string; employeeId?: string; name: string; role: string; isAdmin?: boolean; canEdit?: boolean }) => {
    const users = realtimeHub.getStoredRegisteredUsers();
    const matchEmp = (account.employeeId || '').toUpperCase();
    const matchUser = (account.username || '').toLowerCase();

    let target = users.find(u => 
      (matchEmp && (u.employeeId || '').toUpperCase() === matchEmp) || 
      (u.username || '').toLowerCase() === matchUser
    );

    const currentCanEdit = target ? target.canEdit !== false : account.canEdit !== false;
    const newCanEdit = !currentCanEdit;

    let updatedUsers: AdminUserAccount[];
    if (target) {
      updatedUsers = users.map(u => {
        if ((matchEmp && (u.employeeId || '').toUpperCase() === matchEmp) || (u.username || '').toLowerCase() === matchUser) {
          return {
            ...u,
            canEdit: newCanEdit,
            permissions: {
              ...(u.permissions || {}),
              canEditData: newCanEdit,
              canManageOrders: newCanEdit,
              canManageProjects: newCanEdit
            }
          };
        }
        return u;
      });
    } else {
      const newRecord: AdminUserAccount = {
        name: account.name,
        username: account.username,
        employeeId: account.employeeId,
        password: account.employeeId || '123456',
        role: account.role,
        isAdmin: Boolean(account.isAdmin),
        canEdit: newCanEdit,
        lastLogin: `ปรับสิทธิ์แก้ไข (${new Date().toLocaleDateString('th-TH')})`,
        permissions: {
          canEditData: newCanEdit,
          canManageOrders: newCanEdit,
          canManageProjects: newCanEdit,
          canDeleteData: Boolean(account.isAdmin)
        }
      };
      updatedUsers = [...users, newRecord];
    }

    realtimeHub.saveRegisteredUsers(updatedUsers);
    setRegisteredUsers(updatedUsers);

    setUserActionToast({
      message: newCanEdit
        ? (language === 'th' ? `เปิดสิทธิ์แก้ไขข้อมูลให้ ${account.name} (@${account.username}) แล้ว` : `Enabled edit permissions for @${account.username}`)
        : (language === 'th' ? `จำกัดสิทธิ์ ${account.name} (@${account.username}) เป็นดูได้อย่างเดียว` : `Restricted @${account.username} to view-only mode`),
      type: 'success'
    });
    setTimeout(() => setUserActionToast(null), 3000);
  };

  const handleUpdateGranularPermission = (
    account: { username: string; employeeId?: string; name: string; role: string; isAdmin?: boolean; canEdit?: boolean; permissions?: any },
    permKey: 'canEditData' | 'canManageOrders' | 'canManageProjects' | 'canDeleteData', 
    val: boolean
  ) => {
    const users = realtimeHub.getStoredRegisteredUsers();
    const matchEmp = (account.employeeId || '').toUpperCase();
    const matchUser = (account.username || '').toLowerCase();

    let target = users.find(u => 
      (matchEmp && (u.employeeId || '').toUpperCase() === matchEmp) || 
      (u.username || '').toLowerCase() === matchUser
    );

    let updatedUsers: AdminUserAccount[];
    if (target) {
      updatedUsers = users.map(u => {
        if ((matchEmp && (u.employeeId || '').toUpperCase() === matchEmp) || (u.username || '').toLowerCase() === matchUser) {
          const currentPerms = u.permissions || {
            canEditData: u.canEdit !== false,
            canManageOrders: u.canEdit !== false,
            canManageProjects: u.canEdit !== false,
            canDeleteData: false,
          };
          const updatedPerms = { ...currentPerms, [permKey]: val };
          const anyEditPerm = Boolean(updatedPerms.canEditData || updatedPerms.canManageOrders || updatedPerms.canManageProjects);
          return {
            ...u,
            canEdit: anyEditPerm,
            permissions: updatedPerms
          };
        }
        return u;
      });
    } else {
      const defaultPerms = {
        canEditData: true,
        canManageOrders: true,
        canManageProjects: true,
        canDeleteData: false,
        [permKey]: val
      };
      const anyEditPerm = Boolean(defaultPerms.canEditData || defaultPerms.canManageOrders || defaultPerms.canManageProjects);
      const newRecord: AdminUserAccount = {
        name: account.name,
        username: account.username,
        employeeId: account.employeeId,
        password: account.employeeId || '123456',
        role: account.role,
        isAdmin: Boolean(account.isAdmin),
        canEdit: anyEditPerm,
        permissions: defaultPerms
      };
      updatedUsers = [...users, newRecord];
    }

    realtimeHub.saveRegisteredUsers(updatedUsers);
    setRegisteredUsers(updatedUsers);
  };

  const handleClearSampleData = () => {
    const res = realtimeHub.clearAllSampleData({ keepGoogleSheetOrders: keepGoogleSheetData });
    if (res.success) {
      setClearActionFeedback({
        type: 'cleared',
        message: language === 'th' 
          ? 'ลบข้อมูลตัวอย่างในระบบทั้งหมดเรียบร้อยแล้ว!' 
          : 'All sample data has been completely removed from the system!'
      });
      setCurrentOrderCount(realtimeHub.getStoredLaundryOrders().length);
      setCurrentProjectCount(realtimeHub.getStoredProjects().length);
      setConfirmClearOpen(false);
      setTimeout(() => {
        setClearActionFeedback({ type: null, message: '' });
      }, 3500);
    }
  };

  const handleRestoreSampleData = () => {
    const res = realtimeHub.restoreSampleData();
    if (res.success) {
      setClearActionFeedback({
        type: 'restored',
        message: language === 'th' 
          ? 'กู้คืนข้อมูลตัวอย่างเริ่มต้นกลับมาเรียบร้อยแล้ว!' 
          : 'Sample demo data has been successfully restored!'
      });
      setCurrentOrderCount(realtimeHub.getStoredLaundryOrders().length);
      setCurrentProjectCount(realtimeHub.getStoredProjects().length);
      setTimeout(() => {
        setClearActionFeedback({ type: null, message: '' });
      }, 3500);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSuperAdmin) {
      const updated: AdminUserAccount = {
        ...adminAuth,
        username: adminUsernameInput.trim() || 'reizosischen',
        name: adminUsernameInput.trim() || 'reizosischen',
        password: adminPasswordInput || '724754',
        lastLogin: 'Active Session'
      };
      setAdminAuth(updated);
      try {
        localStorage.setItem('proworkflow_admin_auth', JSON.stringify(updated));
      } catch {
        // storage error
      }
    }

    if (isSuperAdmin || isMarkAdmin) {
      const updatedMark: AdminUserAccount = {
        ...markAuth,
        username: markUsernameInput.trim() || 'Mark',
        name: markUsernameInput.trim() || 'Mark (Administrator)',
        password: markPasswordInput || '717681',
        lastLogin: 'Active Session'
      };
      setMarkAuth(updatedMark);
      try {
        localStorage.setItem('proworkflow_mark_admin_auth', JSON.stringify(updatedMark));
      } catch {
        // storage error
      }
    }

    if (isSuperAdmin || isUserAdmin) {
      const updatedExam: AdminUserAccount = {
        ...examAuth,
        username: examUsernameInput.trim() || 'Exam',
        name: examUsernameInput.trim() ? `${examUsernameInput.trim()} (พนักงานทั่วไป)` : 'Exam (พนักงานทั่วไป)',
        role: 'พนักงานทั่วไป (Staff)',
        isAdmin: false,
        password: examPasswordInput || '1234567890',
        lastLogin: 'Active Session',
        permissions: {
          canEditData: true,
          canManageOrders: true,
          canManageProjects: false,
          canDeleteData: false,
        }
      };
      setExamAuth(updatedExam);
      try {
        localStorage.setItem('proworkflow_exam_admin_auth', JSON.stringify(updatedExam));
      } catch {
        // storage error
      }
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  // 1. Build comprehensive unified list of all staff and registered accounts
  const otStaffDirectory = getAllOtStaffList(false);
  const allStaffDirectoryIncludingDeleted = getAllOtStaffList(true);
  
  // Create unified staff user account objects
  const allCombinedStaffAccounts = (() => {
    const list: Array<AdminUserAccount & {
      employeeId: string;
      isCustomized: boolean;
      originalEmpId: string;
    }> = [];

    const matchedRegisteredIds = new Set<string>();

    // Process OT staff directory
    otStaffDirectory.forEach(staff => {
      const reg = registeredUsers.find(r => 
        (r.employeeId && r.employeeId.toUpperCase() === staff.employeeId.toUpperCase()) ||
        (r.username && r.username.toLowerCase() === staff.employeeId.toLowerCase())
      );

      if (reg) {
        matchedRegisteredIds.add((reg.username || '').toLowerCase());
        const isCustomized = (reg.username !== staff.employeeId) || (reg.password !== staff.employeeId);
        list.push({
          ...reg,
          name: reg.name || staff.name,
          employeeId: staff.employeeId,
          originalEmpId: staff.employeeId,
          role: reg.role || staff.department || 'พนักงานปฏิบัติการ',
          isCustomized,
          canEdit: reg.canEdit !== false,
          isAdmin: Boolean(reg.isAdmin),
          permissions: reg.permissions || {
            canEditData: reg.canEdit !== false,
            canManageOrders: reg.canEdit !== false,
            canManageProjects: reg.canEdit !== false,
            canDeleteData: Boolean(reg.isAdmin)
          }
        });
      } else {
        // Default OT staff account (Username = Emp ID, Password = Emp ID)
        list.push({
          name: staff.name,
          username: staff.employeeId,
          employeeId: staff.employeeId,
          originalEmpId: staff.employeeId,
          password: staff.employeeId,
          role: staff.department || 'พนักงานปฏิบัติการ',
          isCustomized: false,
          canEdit: true,
          isAdmin: false,
          lastLogin: language === 'th' ? 'ค่าเริ่มต้น (รหัสพนักงาน)' : 'Default credentials',
          permissions: {
            canEditData: true,
            canManageOrders: true,
            canManageProjects: true,
            canDeleteData: false
          }
        });
      }
    });

    // Add remaining registered users not in OT directory (e.g. custom admin accounts)
    registeredUsers.forEach(reg => {
      const empIdUpper = (reg.employeeId || reg.username || '').toUpperCase();
      const userUpper = (reg.username || '').toUpperCase();
      if (deletedStaffIds.includes(empIdUpper) || deletedStaffIds.includes(userUpper)) {
        return;
      }
      const userLower = (reg.username || '').toLowerCase();
      const empIdLower = (reg.employeeId || '').toLowerCase();
      if (userLower === 'mark' || userLower === 'admin-mark' || empIdLower === 'mark' || empIdLower === 'admin-mark') {
        return;
      }
      if (!matchedRegisteredIds.has(userLower)) {
        matchedRegisteredIds.add(userLower);
        list.push({
          ...reg,
          employeeId: reg.employeeId || reg.username,
          originalEmpId: reg.employeeId || reg.username,
          isCustomized: true,
          canEdit: reg.canEdit !== false,
          isAdmin: Boolean(reg.isAdmin),
          permissions: reg.permissions || {
            canEditData: reg.canEdit !== false,
            canManageOrders: reg.canEdit !== false,
            canManageProjects: reg.canEdit !== false,
            canDeleteData: Boolean(reg.isAdmin)
          }
        });
      }
    });

    // Exclude Mark and Super Admin from the general staff list (Mark is configured in the dedicated admin card above)
    return list.filter(item => {
      const u = (item.username || '').toLowerCase();
      const emp = (item.employeeId || '').toLowerCase();
      const name = (item.name || '').toLowerCase();
      return u !== 'mark' && u !== 'admin-mark' && u !== 'reizosischen' && emp !== 'mark' && emp !== 'admin-mark' && !name.includes('mark (administrator)');
    });
  })();

  // Deleted staff accounts list
  const deletedStaffAccounts = (() => {
    const deletedMap = new Map<string, { name: string; username: string; employeeId: string; department: string }>();

    // 1. Check OT staff directory for deleted members
    allStaffDirectoryIncludingDeleted.forEach(s => {
      if (deletedStaffIds.includes(s.employeeId.toUpperCase())) {
        deletedMap.set(s.employeeId.toUpperCase(), {
          name: s.name,
          username: s.employeeId,
          employeeId: s.employeeId,
          department: s.department || 'ทั่วไป'
        });
      }
    });

    // 2. Check other deleted IDs
    deletedStaffIds.forEach(id => {
      const cleanId = id.toUpperCase();
      if (!deletedMap.has(cleanId)) {
        deletedMap.set(cleanId, {
          name: `พนักงาน [${id}]`,
          username: id,
          employeeId: id,
          department: 'ทั่วไป'
        });
      }
    });

    return Array.from(deletedMap.values());
  })();

  // Metric counts
  const totalAccountsCount = allCombinedStaffAccounts.length;
  const customizedCount = allCombinedStaffAccounts.filter(u => u.isCustomized).length;
  const adminAccountsCount = allCombinedStaffAccounts.filter(u => u.isAdmin).length;
  const canEditAccountsCount = allCombinedStaffAccounts.filter(u => u.canEdit).length;
  const deletedAccountsCount = deletedStaffAccounts.length;

  // Filter combined accounts by category tab & search query
  const filteredStaffAccounts = allCombinedStaffAccounts.filter(u => {
    // 1. Category tab filter
    if (userFilterCategory === 'customized' && !u.isCustomized) return false;
    if (userFilterCategory === 'admin' && !u.isAdmin) return false;
    if (userFilterCategory === 'canEdit' && !u.canEdit) return false;
    if (userFilterCategory === 'deleted') return false;

    // 2. Search query filter
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.trim().toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  const filteredDeletedStaff = deletedStaffAccounts.filter(d => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.trim().toLowerCase();
    return (
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.username && d.username.toLowerCase().includes(q)) ||
      (d.employeeId && d.employeeId.toLowerCase().includes(q)) ||
      (d.department && d.department.toLowerCase().includes(q))
    );
  });

  if (!isOpen || !isUserAdmin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Dialog Window with stopPropagation */}
      <div 
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Settings Sidebar */}
        <div className="w-full md:w-60 bg-[#f9f9f9] border-r border-[#e2e8f0] p-4 flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-5 px-2">
              <Settings className="w-5 h-5 text-[#002045]" />
              <span className="font-bold text-sm text-[#002045]">{t.settingsTitle}</span>
            </div>

            <div className="space-y-1 text-xs font-semibold">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('language');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                  activeTab === 'language' ? 'bg-[#d2e4ff] text-[#001d37] font-bold shadow-2xs' : 'text-[#43474e] hover:bg-[#e8e8e8]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#0061a5]" />
                  <span>{t.languageSettings}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-white rounded font-mono font-bold uppercase text-[#0061a5]">
                  {language.toUpperCase()}
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('general');
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                  activeTab === 'general' ? 'bg-[#d2e4ff] text-[#001d37] font-bold shadow-2xs' : 'text-[#43474e] hover:bg-[#e8e8e8]'
                }`}
              >
                <Sliders className="w-4 h-4 text-[#0061a5]" />
                <span>{t.generalSettings}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('notifications');
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                  activeTab === 'notifications' ? 'bg-[#d2e4ff] text-[#001d37] font-bold shadow-2xs' : 'text-[#43474e] hover:bg-[#e8e8e8]'
                }`}
              >
                <Bell className="w-4 h-4 text-[#0061a5]" />
                <span>{t.notificationsSettings}</span>
              </button>

              {/* Security & Access Tab - Only visible and accessible by Admins */}
              {isUserAdmin && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('security');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                    activeTab === 'security' ? 'bg-[#d2e4ff] text-[#001d37] font-bold shadow-2xs' : 'text-[#43474e] hover:bg-[#e8e8e8]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#0061a5]" />
                    <span>{t.securitySettings}</span>
                  </div>
                </button>
              )}
            </div>
          </div>

          <div className="text-[11px] text-[#74777f] px-2 pt-4 border-t border-[#e2e8f0] truncate">
            {t.appName} v3.8.4 Enterprise
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col justify-between p-6 overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0]">
            <div>
              <h3 className="text-lg font-bold text-[#1a1c1c]">
                {activeTab === 'language' 
                  ? t.languageSettings 
                  : activeTab === 'general' 
                  ? t.generalSettings 
                  : activeTab === 'notifications' 
                  ? t.notificationsSettings 
                  : t.securitySettings}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[#74777f] hover:text-[#1a1c1c] p-1 rounded-md hover:bg-[#f3f3f4] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="py-4 space-y-4 text-xs flex-1 overflow-y-auto pr-1">
            {/* Language Tab */}
            {activeTab === 'language' && (
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-sm text-[#1a1c1c] mb-1">
                    {t.interfaceLanguage}
                  </label>
                  <p className="text-[#74777f] text-xs mb-4">
                    {t.interfaceLanguageDesc}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {LANGUAGE_CONFIGS.map((cfg) => {
                    const isSelected = language === cfg.code;
                    const descriptions: Record<string, string> = {
                      th: 'แสดงผลเมนู แดชบอร์ด รายงาน และระบบติดตามผ้าเป็นภาษาไทยทั้งหมด',
                      en: 'Standard international terminology across all modules and pipelines.',
                    };

                    const activeLabels: Record<string, string> = {
                      th: 'ใช้งานอยู่',
                      en: 'Active',
                    };

                    return (
                      <div
                        key={cfg.code}
                        onClick={() => setLanguage(cfg.code)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-[#0061a5] bg-[#f0f7ff] shadow-sm'
                            : 'border-[#e2e8f0] bg-white hover:border-[#c4c6cf] hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white shadow-2xs border border-[#e2e8f0] w-14 shrink-0">
                            <FlagIcon code={cfg.code} size="md" />
                            <span className="mt-1 font-extrabold text-[10px] text-[#002045] bg-[#f0f4f9] px-1.5 py-0.2 rounded border border-[#e2e8f0]">
                              {cfg.shortCode}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-[#002045]">
                                {cfg.nativeName} ({cfg.englishName})
                              </h4>
                              {isSelected && (
                                <span className="px-2 py-0.2 bg-[#0061a5] text-white text-[10px] font-bold rounded-full">
                                  {activeLabels[language] || 'Active'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#43474e] mt-0.5">
                              {descriptions[cfg.code] || `${cfg.englishName} interface`}
                            </p>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-[#0061a5] bg-[#0061a5] text-white' : 'border-[#c4c6cf]'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] text-xs text-[#74777f] flex items-center gap-2 mt-2">
                  <Sparkles className="w-4 h-4 text-[#0061a5] shrink-0" />
                  <span>
                    {language === 'th' 
                      ? 'ระบบจะจดจำภาษาที่คุณเลือกไว้ใช้งานโดยอัตโนมัติสำหรับการเข้าใช้งานครั้งถัดไป'
                      : 'Your language choice is automatically saved for your next session.'}
                  </span>
                </div>
              </div>
            )}

            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-5">
                <div>
                  <label className="block font-semibold text-[#1a1c1c] mb-1">{t.orgName}</label>
                  <input
                    type="text"
                    defaultValue={t.appName}
                    className="w-full px-3 py-2 border border-[#c4c6cf] rounded-lg text-xs outline-hidden focus:border-[#0061a5]"
                  />
                  <p className="text-[11px] text-[#74777f] mt-1.5">
                    {language === 'th' 
                      ? 'ชื่อองค์กรและระบบงานจะแสดงในส่วนหัวและรายงานอย่างเป็นทางการ' 
                      : 'Used in email headers, exports, and automated audit trails.'}
                  </p>
                </div>

                {/* Database & Sample Data Management Panel - Only visible and accessible by Admins */}
                {isUserAdmin && (
                  <div className="mt-6 pt-5 border-t border-[#e2e8f0]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-[#0061a5]" />
                        <h4 className="font-bold text-xs text-[#002045]">
                          {language === 'th' ? 'การจัดการข้อมูลตัวอย่างในระบบ' : 'Sample Data & Storage Management'}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full border border-amber-300 flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                          <span>{language === 'th' ? 'สิทธิ์ผู้ดูแลและแอดมิน' : 'Admin Access'}</span>
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-bold">
                          {currentOrderCount} {language === 'th' ? 'รายการผ้า' : 'orders'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#74777f] mb-3">
                      {language === 'th'
                        ? 'คุณสามารถเลือกลบข้อมูลตัวอย่างทั้งหมดเพื่อเริ่มต้นใช้งานด้วยข้อมูลจริง หรือกู้คืนข้อมูลตัวอย่างกลับมาได้ตลอดเวลา (เฉพาะผู้ดูแลและแอดมิน)'
                        : 'Reset or restore demo items to work exclusively with real factory production data (Admin & Managers only).'}
                    </p>

                    {/* Feedback toast message */}
                    {clearActionFeedback.type && (
                      <div className={`p-3 rounded-xl mb-3 flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-200 ${
                        clearActionFeedback.type === 'cleared'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{clearActionFeedback.message}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Clear Sample Data Button */}
                      <button
                        type="button"
                        onClick={() => setConfirmClearOpen(true)}
                        className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{language === 'th' ? 'ลบข้อมูลตัวอย่างทั้งหมด' : 'Clear All Sample Data'}</span>
                      </button>

                      {/* Restore Sample Data Button */}
                      <button
                        type="button"
                        onClick={handleRestoreSampleData}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#002045] border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <RotateCcw className="w-4 h-4 text-[#0061a5] shrink-0" />
                        <span>{language === 'th' ? 'กู้คืนข้อมูลตัวอย่างเริ่มต้น' : 'Restore Demo Sample Data'}</span>
                      </button>
                    </div>

                    {/* Confirmation Modal for Clearing Data */}
                    {confirmClearOpen && (
                      <div className="mt-3 p-4 bg-rose-50/80 rounded-xl border-2 border-rose-300 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h5 className="font-bold text-xs text-rose-900">
                              {language === 'th' ? 'ยืนยันการลบข้อมูลตัวอย่าง?' : 'Confirm Clear Sample Data?'}
                            </h5>
                            <p className="text-[11px] text-rose-800 mt-1">
                              {language === 'th'
                                ? 'ระบบจะลบข้อมูลจำลองของรายการผ้าและประวัติกิจกรรมทั้งหมด'
                                : 'This will purge simulated demo laundry orders and activities.'}
                            </p>

                            <div className="mt-2.5 mb-3 bg-white p-2.5 rounded-lg border border-rose-200">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={keepGoogleSheetData}
                                  onChange={(e) => setKeepGoogleSheetData(e.target.checked)}
                                  className="rounded text-rose-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                />
                                <span className="font-medium text-[11px] text-rose-950">
                                  {language === 'th' 
                                    ? 'คงข้อมูลจริงที่ซิงค์จาก Google Sheet ไว้ (ลบเฉพาะข้อมูลจำลอง)' 
                                    : 'Keep real data synced from Google Sheet'}
                                </span>
                              </label>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleClearSampleData}
                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                              >
                                {language === 'th' ? 'ยืนยันลบข้อมูล' : 'Yes, Delete Demo Data'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmClearOpen(false)}
                                className="px-3 py-1.5 bg-white border border-[#c4c6cf] text-[#43474e] rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                              >
                                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 bg-[#f9f9f9] rounded-xl border border-[#e2e8f0] cursor-pointer">
                  <div>
                    <p className="font-semibold text-[#1a1c1c]">{t.emailDigest}</p>
                    <p className="text-[11px] text-[#74777f]">{t.emailDigestDesc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="rounded text-[#0061a5] focus:ring-0 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-[#f9f9f9] rounded-xl border border-[#e2e8f0] cursor-pointer">
                  <div>
                    <p className="font-semibold text-[#1a1c1c]">{t.realtimeSync}</p>
                    <p className="text-[11px] text-[#74777f]">{t.realtimeSyncDesc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={slackSync}
                    onChange={(e) => setSlackSync(e.target.checked)}
                    className="rounded text-[#0061a5] focus:ring-0 w-4 h-4"
                  />
                </label>
              </div>
            )}

            {/* Security & Access Tab - Only visible and accessible by Admins */}
            {activeTab === 'security' && isUserAdmin && (
              <div className="space-y-5">
                {/* 1. Super Admin Account Credentials Card (Only visible to @reizosischen) */}
                {isSuperAdmin && (
                  <div className="p-4 bg-gradient-to-br from-amber-50/50 via-white to-slate-50 rounded-2xl border border-amber-300 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-200">
                      <div className="flex items-center gap-2 text-[#002045] font-bold text-xs">
                        <KeyRound className="w-4 h-4 text-amber-600" />
                        <span>{language === 'th' ? 'ข้อมูลการเข้าสู่ระบบของผู้ดูแลระบบสูงสุด (Super Admin - @reizosischen)' : 'Super Administrator Credentials (@reizosischen)'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold border border-amber-300">
                          <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                          <span>{language === 'th' ? 'ผู้ดูแลระบบสูงสุด (Super Admin)' : 'Super Admin'}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{language === 'th' ? 'สิทธิ์แก้ไขเต็มรูปแบบ' : 'Full Edit Access'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block font-semibold text-[#1a1c1c] mb-1">
                          {language === 'th' ? '1. ชื่อผู้ใช้ (Username)' : '1. Username'}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={adminUsernameInput}
                            onChange={(e) => setAdminUsernameInput(e.target.value)}
                            className="w-full px-3 py-2 border border-[#c4c6cf] rounded-lg text-xs font-mono font-bold text-[#002045] bg-white outline-hidden focus:border-[#0061a5]"
                            placeholder="reizosischen"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-semibold text-[#1a1c1c]">
                            {language === 'th' ? '2. รหัสผ่าน (Password)' : '2. Password'}
                          </label>
                          <button
                            type="button"
                            onClick={handleCopyPassword}
                            className="text-[11px] font-medium text-[#0061a5] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            {copiedPassword ? (language === 'th' ? 'คัดลอกแล้ว!' : 'Copied!') : (language === 'th' ? 'คัดลอกรหัส' : 'Copy')}
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showAdminPass ? 'text' : 'password'}
                            value={adminPasswordInput}
                            onChange={(e) => setAdminPasswordInput(e.target.value)}
                            className="w-full pl-3 pr-10 py-2 border border-[#c4c6cf] rounded-lg text-xs font-mono font-bold tracking-wider text-[#002045] bg-white outline-hidden focus:border-[#0061a5]"
                            placeholder="724754"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPass(!showAdminPass)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#002045] p-1 cursor-pointer"
                            title={showAdminPass ? 'Hide password' : 'Show password'}
                          >
                            {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-amber-600" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Administrator Account Credentials Card (Mark Admin) */}
                <div className="p-4 bg-gradient-to-br from-sky-50/60 via-white to-blue-50/40 rounded-2xl border-2 border-blue-200 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-blue-100">
                    <div className="flex items-center gap-2 text-[#002045] font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>{language === 'th' ? 'ข้อมูลการเข้าสู่ระบบของแอดมินเพจ Mark (Admin Account)' : 'Administrator Credentials (@Mark)'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-extrabold border border-blue-300">
                        <Crown className="w-3 h-3 text-blue-600 fill-blue-500" />
                        <span>{language === 'th' ? 'แอดมิน (Admin)' : 'Admin'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{language === 'th' ? 'สิทธิ์แอดมินเต็มรูปแบบ' : 'Full Admin Access'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-[#1a1c1c] mb-1">
                        {language === 'th' ? '1. ชื่อผู้ใช้ (Username)' : '1. Username'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={markUsernameInput}
                          onChange={(e) => setMarkUsernameInput(e.target.value)}
                          disabled={!isSuperAdmin && !isMarkAdmin}
                          className="w-full px-3 py-2 border border-[#c4c6cf] rounded-lg text-xs font-mono font-bold text-[#002045] bg-white outline-hidden focus:border-[#0061a5] disabled:bg-slate-100 disabled:text-slate-600"
                          placeholder="Mark"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-[#1a1c1c]">
                          {language === 'th' ? '2. รหัสผ่าน (Password)' : '2. Password'}
                        </label>
                        <button
                          type="button"
                          onClick={handleCopyMarkPassword}
                          className="text-[11px] font-medium text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedMarkPassword ? (language === 'th' ? 'คัดลอกแล้ว!' : 'Copied!') : (language === 'th' ? 'คัดลอกรหัส' : 'Copy')}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showMarkPass ? 'text' : 'password'}
                          value={markPasswordInput}
                          onChange={(e) => setMarkPasswordInput(e.target.value)}
                          disabled={!isSuperAdmin && !isMarkAdmin}
                          className="w-full pl-3 pr-10 py-2 border border-[#c4c6cf] rounded-lg text-xs font-mono font-bold tracking-wider text-[#002045] bg-white outline-hidden focus:border-[#0061a5] disabled:bg-slate-100 disabled:text-slate-600"
                          placeholder="717681"
                        />
                        <button
                          type="button"
                          onClick={() => setShowMarkPass(!showMarkPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#002045] p-1 cursor-pointer"
                          title={showMarkPass ? 'Hide password' : 'Show password'}
                        >
                          {showMarkPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-blue-600" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Staff Account Credentials Card (Exam) */}
                <div className="p-4 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 rounded-2xl border-2 border-slate-200 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-200">
                    <div className="flex items-center gap-2 text-[#002045] font-bold text-xs">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>{language === 'th' ? 'ข้อมูลการเข้าสู่ระบบของ Exam (พนักงานทั่วไป)' : 'Staff Credentials (@Exam)'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-300">
                        <Users className="w-3 h-3 text-slate-600" />
                        <span>{language === 'th' ? 'พนักงานทั่วไป (Staff)' : 'Staff'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-bold border border-blue-200">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" />
                        <span>{language === 'th' ? 'สิทธิ์พนักงานทั่วไป' : 'General Staff Access'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-[#1a1c1c] mb-1">
                        {language === 'th' ? '1. ชื่อผู้ใช้ (Username)' : '1. Username'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={examUsernameInput}
                          onChange={(e) => setExamUsernameInput(e.target.value)}
                          disabled={!isSuperAdmin && !isUserAdmin}
                          className="w-full px-3 py-2 border border-[#c4c6cf] rounded-lg text-xs font-mono font-bold text-[#002045] bg-white outline-hidden focus:border-[#0061a5] disabled:bg-slate-100 disabled:text-slate-600"
                          placeholder="Exam"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-[#1a1c1c]">
                          {language === 'th' ? '2. รหัสผ่าน (Password)' : '2. Password'}
                        </label>
                        <button
                          type="button"
                          onClick={handleCopyExamPassword}
                          className="text-[11px] font-medium text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedExamPassword ? (language === 'th' ? 'คัดลอกแล้ว!' : 'Copied!') : (language === 'th' ? 'คัดลอกรหัส' : 'Copy')}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showExamPass ? 'text' : 'password'}
                          value={examPasswordInput}
                          onChange={(e) => setExamPasswordInput(e.target.value)}
                          disabled={!isSuperAdmin && !isUserAdmin}
                          className="w-full pl-3 pr-10 py-2 border border-[#c4c6cf] rounded-lg text-xs font-mono font-bold tracking-wider text-[#002045] bg-white outline-hidden focus:border-[#0061a5] disabled:bg-slate-100 disabled:text-slate-600"
                          placeholder="1234567890"
                        />
                        <button
                          type="button"
                          onClick={() => setShowExamPass(!showExamPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#002045] p-1 cursor-pointer"
                          title={showExamPass ? 'Hide password' : 'Show password'}
                        >
                          {showExamPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-indigo-600" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Registered Users & Staff Credentials Management Section */}
                <div className="p-4 bg-white rounded-2xl border-2 border-[#0061a5]/20 shadow-xs">
                  {/* Section Title & Summary */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-[#e2e8f0]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0061a5] to-[#002045] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-[#002045] flex items-center gap-1.5">
                          <span>{language === 'th' ? 'ตรวจสอบและจัดการ Username & Password พนักงาน' : 'Staff Credentials & Access Management'}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live Sync
                          </span>
                        </h4>
                        <p className="text-[10px] text-[#74777f]">
                          {language === 'th' 
                            ? 'แอดมินสามารถดู ตรวจสอบ แก้ไข และรีเซ็ต Username/Password ของพนักงานทุกคนที่เปลี่ยนข้อมูลได้ที่นี่' 
                            : 'Administrators can view, audit, modify, and reset credentials for all staff members here.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={refreshSettingsData}
                        className="px-2 py-1 text-[10px] font-semibold text-[#0061a5] hover:bg-[#f0f7ff] border border-[#b3d7ff] rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        title="Refresh list"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{language === 'th' ? 'รีเฟรช' : 'Refresh'}</span>
                      </button>

                      {customizedCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setConfirmClearAllUsers(true)}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                          title="Reset all customized accounts to default"
                        >
                          {language === 'th' ? 'รีเซ็ตทั้งหมดเป็นค่าเริ่มต้น' : 'Reset All'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <div className="text-[10px] text-slate-500 font-medium">{language === 'th' ? 'พนักงานทั้งหมด' : 'Total Staff'}</div>
                      <div className="text-sm font-extrabold text-[#002045]">{totalAccountsCount}</div>
                    </div>
                    <div className={`p-2 rounded-xl text-center border transition-all ${
                      customizedCount > 0 
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <div className="text-[10px] font-medium text-emerald-700 flex items-center justify-center gap-1">
                        <Key className="w-3 h-3 text-emerald-600" />
                        <span>{language === 'th' ? 'เปลี่ยนรหัสแล้ว' : 'Changed'}</span>
                      </div>
                      <div className="text-sm font-extrabold text-emerald-700">{customizedCount}</div>
                    </div>
                    <div className="p-2 bg-amber-50/80 border border-amber-200 rounded-xl text-center">
                      <div className="text-[10px] text-amber-800 font-medium flex items-center justify-center gap-1">
                        <Crown className="w-3 h-3 text-amber-600" />
                        <span>{language === 'th' ? 'ผู้ดูแล (Admin)' : 'Admins'}</span>
                      </div>
                      <div className="text-sm font-extrabold text-amber-900">{adminAccountsCount}</div>
                    </div>
                    <div className="p-2 bg-[#f0f7ff] border border-[#b3d7ff] rounded-xl text-center">
                      <div className="text-[10px] text-[#0061a5] font-medium flex items-center justify-center gap-1">
                        <Edit3 className="w-3 h-3 text-[#0061a5]" />
                        <span>{language === 'th' ? 'มีสิทธิ์แก้ไข' : 'Can Edit'}</span>
                      </div>
                      <div className="text-sm font-extrabold text-[#0061a5]">{canEditAccountsCount}</div>
                    </div>
                  </div>

                  {/* Filter Tabs & Search Bar */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setUserFilterCategory('all')}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer shrink-0 ${
                          userFilterCategory === 'all'
                            ? 'bg-[#002045] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {language === 'th' ? `ทั้งหมด (${totalAccountsCount})` : `All (${totalAccountsCount})`}
                      </button>

                      <button
                        type="button"
                        onClick={() => setUserFilterCategory('customized')}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                          userFilterCategory === 'customized'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{language === 'th' ? `เปลี่ยนรหัสผ่านแล้ว (${customizedCount})` : `Changed (${customizedCount})`}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUserFilterCategory('admin')}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                          userFilterCategory === 'admin'
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        <Crown className="w-3 h-3" />
                        <span>{language === 'th' ? `แอดมิน (${adminAccountsCount})` : `Admins (${adminAccountsCount})`}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUserFilterCategory('canEdit')}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                          userFilterCategory === 'canEdit'
                            ? 'bg-[#0061a5] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{language === 'th' ? `สิทธิ์แก้ไข (${canEditAccountsCount})` : `Can Edit (${canEditAccountsCount})`}</span>
                      </button>

                      {deletedAccountsCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setUserFilterCategory('deleted')}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                            userFilterCategory === 'deleted'
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{language === 'th' ? `พนักงานที่ถูกลบ (${deletedAccountsCount})` : `Deleted (${deletedAccountsCount})`}</span>
                        </button>
                      )}
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#74777f]" />
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        placeholder={language === 'th' ? 'ค้นหาชื่อ, รหัสพนักงาน (เช่น 358167), ชื่อผู้ใช้, แผนก...' : 'Search name, employee ID, username, department...'}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-[#c4c6cf] rounded-lg text-xs outline-hidden focus:border-[#0061a5] focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Reset All Confirmation Prompt */}
                  {confirmClearAllUsers && (
                    <div className="mb-3 p-3 bg-rose-50 rounded-xl border border-rose-200 animate-in fade-in duration-150">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-rose-900">
                            {language === 'th' ? 'ยืนยันรีเซ็ตชื่อผู้ใช้และรหัสผ่านพนักงานทุกคนกลับเป็นค่าเริ่มต้น?' : 'Reset all credentials to default employee IDs?'}
                          </p>
                          <p className="text-[11px] text-rose-700 mt-0.5">
                            {language === 'th' ? 'พนักงานทุกคนจะต้องใช้รหัสพนักงานเป็น Username และ Password เหมือนตอนเริ่มต้น' : 'All staff accounts will revert to using their Employee ID for both username and password.'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={handleClearAllRegisteredUsers}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[11px] font-bold cursor-pointer"
                            >
                              {language === 'th' ? 'ยืนยันรีเซ็ตทั้งหมด' : 'Yes, Reset All'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmClearAllUsers(false)}
                              className="px-2.5 py-1 bg-white border border-[#c4c6cf] text-[#43474e] rounded-md text-[11px] font-semibold hover:bg-slate-50 cursor-pointer"
                            >
                              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Toast Feedback */}
                  {userActionToast && (
                    <div className="mb-3 p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-150">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{userActionToast.message}</span>
                    </div>
                  )}

                  {/* Staff & User Accounts List */}
                  {userFilterCategory === 'deleted' ? (
                    filteredDeletedStaff.length > 0 ? (
                      <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                        <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs font-semibold flex items-center justify-between">
                          <span>{language === 'th' ? `รายชื่อพนักงานที่ถูกลบออกจากระบบ (${filteredDeletedStaff.length} คน)` : `Deleted Employees (${filteredDeletedStaff.length})`}</span>
                        </div>
                        {filteredDeletedStaff.map((d) => (
                          <div key={d.employeeId} className="p-3 bg-rose-50/50 rounded-xl border border-rose-200 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                                <Trash2 className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-rose-950 truncate">{d.name}</span>
                                  <span className="text-[10px] font-mono bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-bold">
                                    รหัส {d.employeeId}
                                  </span>
                                  <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                    {d.department}
                                  </span>
                                </div>
                                <p className="text-[10px] text-rose-700 mt-0.5">
                                  {language === 'th' ? 'ถูกลบ/ระงับสิทธิ์การใช้งานและการเข้าสู่ระบบ' : 'Login and access suspended'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRestoreStaff(d.employeeId, d.name)}
                              className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors shrink-0"
                              title={language === 'th' ? 'กู้คืนสิทธิ์พนักงานกลับเข้าสู่ระบบ' : 'Restore employee access'}
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{language === 'th' ? 'กู้คืนสิทธิ์' : 'Restore'}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-5 bg-slate-50/70 rounded-xl border border-dashed border-slate-300 text-center">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                          <Trash2 className="w-5 h-5" />
                        </div>
                        <h5 className="font-bold text-xs text-slate-700 mb-1">
                          {language === 'th' ? 'ไม่มีพนักงานที่ถูกลบ' : 'No deleted employees'}
                        </h5>
                      </div>
                    )
                  ) : filteredStaffAccounts.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {filteredStaffAccounts.map((u) => {
                        const accountKey = u.username || u.employeeId;
                        const isPassVisible = visiblePasswords[accountKey] || false;
                        const isCopied = copiedUserPass === accountKey;
                        const isConfirmingDelete = userToDelete === (u.employeeId || u.username);
                        const isConfirmingReset = userToReset === u.employeeId;
                        const isUserAdmin = Boolean(u.isAdmin || (u.role && (u.role.includes('Admin') || u.role.includes('ผู้ดูแลระบบ'))));
                        const hasEditPermission = u.canEdit !== false;

                        return (
                          <div
                            key={`${u.employeeId}_${u.username}`}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col gap-3 ${
                              isConfirmingDelete
                                ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-200'
                                : isUserAdmin 
                                ? 'bg-gradient-to-br from-amber-50/60 to-white border-amber-200 shadow-2xs' 
                                : u.isCustomized
                                  ? 'bg-gradient-to-br from-emerald-50/30 to-white border-emerald-200 shadow-2xs'
                                  : 'bg-slate-50 hover:bg-[#f8fafc] border-slate-200'
                            }`}
                          >
                            {/* User Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs uppercase overflow-hidden mt-0.5 ${
                                  u.isAdmin
                                    ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white ring-2 ring-amber-300'
                                    : u.isCustomized
                                      ? 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white'
                                      : 'bg-gradient-to-br from-[#0061a5] to-[#002045] text-white'
                                }`}>
                                  {u.avatarUrl ? (
                                    <img src={u.avatarUrl} alt={u.name || u.username} className="w-full h-full object-cover" />
                                  ) : u.isAdmin ? (
                                    <Crown className="w-4 h-4" />
                                  ) : (
                                    u.name ? u.name.charAt(0) : u.username.charAt(0)
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-[#002045]">
                                      {u.name}
                                    </span>
                                    {u.employeeId && (
                                      <span className="text-[10px] font-mono text-slate-700 bg-slate-200/80 px-1.5 py-0.2 rounded font-bold">
                                        รหัส {u.employeeId}
                                      </span>
                                    )}
                                    <span className="text-[10px] font-mono text-[#0061a5] bg-[#e1effe] px-1.5 py-0.2 rounded font-semibold">
                                      @{u.username}
                                    </span>

                                    {/* Status Badge */}
                                    {u.isCustomized ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-extrabold">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>{language === 'th' ? 'เปลี่ยน Username & Password แล้ว' : 'Credentials Updated'}</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-300 text-[10px] font-medium">
                                        <span>{language === 'th' ? 'ค่าเริ่มต้น (รหัสพนักงาน)' : 'Default ID Login'}</span>
                                      </span>
                                    )}

                                    {u.isAdmin && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold">
                                        <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                                        <span>ADMIN</span>
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 text-[10px] text-[#74777f] mt-1 flex-wrap">
                                    <span className="font-semibold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                      {u.role || 'พนักงานปฏิบัติการ'}
                                    </span>
                                    {u.lastLogin && (
                                      <span className="text-slate-500">
                                        {u.lastLogin}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right Action Icons: Edit / Admin Toggle / Reset / Delete */}
                              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                {/* Admin Edit Credentials Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEmployee({
                                      originalUsername: u.username,
                                      employeeId: u.employeeId || u.username,
                                      name: u.name,
                                      username: u.username,
                                      password: u.password || u.employeeId || '',
                                      role: u.role || 'พนักงานปฏิบัติการ',
                                      isAdmin: Boolean(u.isAdmin),
                                      canEdit: u.canEdit !== false
                                    });
                                    setShowEditEmpPass(false);
                                  }}
                                  className="px-2 py-1 bg-white hover:bg-slate-100 text-[#0061a5] hover:text-[#002045] border border-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                  title={language === 'th' ? 'แก้ไข Username & Password' : 'Edit Credentials'}
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>{language === 'th' ? 'แก้ไข' : 'Edit'}</span>
                                </button>

                                {/* Admin Status Toggle Button */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleAdminRole(u)}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                                    u.isAdmin
                                      ? 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-600'
                                      : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-300 hover:border-amber-300'
                                  }`}
                                  title={
                                    u.isAdmin
                                      ? (language === 'th' ? 'คลิกเพื่อลดสิทธิ์เป็นสมาชิกทั่วไป' : 'Demote to Member')
                                      : (language === 'th' ? 'คลิกเพื่อตั้งเป็นแอดมิน' : 'Make Admin')
                                  }
                                >
                                  {u.isAdmin ? (
                                    <>
                                      <Crown className="w-3 h-3 fill-amber-100 text-amber-100" />
                                      <span>{language === 'th' ? 'แอดมิน' : 'Admin'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Shield className="w-3 h-3 text-slate-500" />
                                      <span>{language === 'th' ? 'ตั้งแอดมิน' : 'Admin'}</span>
                                    </>
                                  )}
                                </button>

                                {/* Reset to Default Button (if customized) */}
                                {u.isCustomized && (
                                  <button
                                    type="button"
                                    onClick={() => setUserToReset(isConfirmingReset ? null : u.employeeId)}
                                    className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-amber-200"
                                    title={language === 'th' ? 'รีเซ็ตกลับเป็นรหัสพนักงานเริ่มต้น' : 'Reset to default employee ID'}
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Delete Employee Icon Button */}
                                <button
                                  type="button"
                                  onClick={() => setUserToDelete(isConfirmingDelete ? null : (u.employeeId || u.username))}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                                  title={language === 'th' ? `ลบพนักงาน ${u.name} ออกจากระบบ` : `Delete employee ${u.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Credentials Inspection Bar (Username & Password) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-100/70 p-2 rounded-xl border border-slate-200 text-[11px]">
                              {/* Username Info */}
                              <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="text-[#74777f] font-medium">{language === 'th' ? 'ชื่อผู้ใช้:' : 'Username:'}</span>
                                  <span className="font-mono font-bold text-[#0061a5] truncate">@{u.username}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyUserPassword(`user_${accountKey}`, u.username)}
                                  className="text-[10px] text-slate-500 hover:text-[#0061a5] px-1 py-0.5 hover:bg-slate-50 rounded cursor-pointer shrink-0"
                                  title="Copy username"
                                >
                                  {copiedUserPass === `user_${accountKey}` ? (language === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (language === 'th' ? 'คัดลอก' : 'Copy')}
                                </button>
                              </div>

                              {/* Password Info with Eye Toggle */}
                              <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-1.5 truncate">
                                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="text-[#74777f] font-medium">{language === 'th' ? 'รหัสผ่าน:' : 'Password:'}</span>
                                  <span className="font-mono font-bold text-[#002045] truncate">
                                    {isPassVisible ? u.password : '••••••••'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleUserPassword(accountKey)}
                                    className="p-1 text-slate-500 hover:text-[#002045] rounded-md hover:bg-slate-100 cursor-pointer"
                                    title={isPassVisible ? 'Hide' : 'Show'}
                                  >
                                    {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyUserPassword(accountKey, u.password)}
                                    className="px-1.5 py-0.5 text-[10px] font-semibold text-[#0061a5] hover:bg-[#f0f7ff] rounded cursor-pointer"
                                    title="Copy password"
                                  >
                                    {isCopied ? (language === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (language === 'th' ? 'คัดลอก' : 'Copy')}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Data Edit Permissions Controls */}
                            <div className="pt-2 border-t border-slate-200/80">
                              <div className={`p-2.5 rounded-xl border transition-colors ${
                                hasEditPermission 
                                  ? 'bg-white border-emerald-200/80 shadow-2xs' 
                                  : 'bg-slate-100/90 border-slate-200 text-slate-500'
                              }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                      hasEditPermission ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-[#002045]">
                                          {language === 'th' ? 'สิทธิ์การแก้ไขข้อมูล' : 'Data Edit Permission'}
                                        </span>
                                        {hasEditPermission ? (
                                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                            {language === 'th' ? 'มีสิทธิ์แก้ไข' : 'Edit Allowed'}
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                                            {language === 'th' ? 'ดูได้อย่างเดียว' : 'Read Only'}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-[#74777f]">
                                        {hasEditPermission
                                          ? (language === 'th' ? 'สามารถเพิ่ม บันทึก และแก้ไขข้อมูลในระบบได้' : 'Authorized to add, edit and update system records')
                                          : (language === 'th' ? 'ดูข้อมูลได้อย่างเดียว ไม่อนุญาตให้แก้ไขข้อมูล' : 'View only mode. Data modification is restricted.')}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Toggle Switch */}
                                  <div className="flex items-center gap-2 self-end sm:self-center">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={hasEditPermission}
                                        onChange={() => handleToggleEditPermission(u)}
                                        className="sr-only peer"
                                      />
                                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0061a5]"></div>
                                    </label>
                                    <span className="text-[11px] font-bold text-[#002045]">
                                      {hasEditPermission ? (language === 'th' ? 'เปิดสิทธิ์' : 'Enabled') : (language === 'th' ? 'ปิดสิทธิ์' : 'Disabled')}
                                    </span>
                                  </div>
                                </div>

                                {/* Granular Option Checkboxes for Edit Access */}
                                <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px]">
                                  <label className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={u.permissions?.canEditData !== false && hasEditPermission}
                                      disabled={!hasEditPermission}
                                      onChange={(e) => handleUpdateGranularPermission(u, 'canEditData', e.target.checked)}
                                      className="rounded text-[#0061a5] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    <span className={!hasEditPermission ? 'text-slate-400' : 'text-slate-700 font-medium'}>
                                      {language === 'th' ? 'แก้ไข/บันทึกข้อมูล' : 'Edit & Save Data'}
                                    </span>
                                  </label>
                                  <label className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={u.permissions?.canManageOrders !== false && hasEditPermission}
                                      disabled={!hasEditPermission}
                                      onChange={(e) => handleUpdateGranularPermission(u, 'canManageOrders', e.target.checked)}
                                      className="rounded text-[#0061a5] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    <span className={!hasEditPermission ? 'text-slate-400' : 'text-slate-700 font-medium'}>
                                      {language === 'th' ? 'จัดการออเดอร์ซักรีด' : 'Manage Orders'}
                                    </span>
                                  </label>
                                  <label className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(u.permissions?.canDeleteData && hasEditPermission)}
                                      disabled={!hasEditPermission}
                                      onChange={(e) => handleUpdateGranularPermission(u, 'canDeleteData', e.target.checked)}
                                      className="rounded text-[#0061a5] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    <span className={!hasEditPermission ? 'text-slate-400' : 'text-slate-700 font-medium'}>
                                      {language === 'th' ? 'สิทธิ์ลบข้อมูล' : 'Delete Rights'}
                                    </span>
                                  </label>
                                </div>
                              </div>
                            </div>

                            {/* Reset Confirmation */}
                            {isConfirmingReset && (
                              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between gap-2 animate-in fade-in duration-100">
                                <span className="text-[11px] font-bold text-amber-900">
                                  {language === 'th' ? `รีเซ็ต ${u.name} กลับเป็นรหัสเริ่มต้น (รหัสพนักงาน: ${u.employeeId})?` : `Reset ${u.name} credentials?`}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleResetToDefault(u.employeeId, u.name)}
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    {language === 'th' ? 'ยืนยันรีเซ็ต' : 'Confirm'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setUserToReset(null)}
                                    className="px-2 py-1 bg-white text-slate-700 border border-slate-300 rounded text-[10px] font-semibold hover:bg-slate-100 cursor-pointer"
                                  >
                                    {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Delete Staff Member Confirmation Box */}
                            {isConfirmingDelete && (
                              <div className="p-3 bg-rose-50 rounded-xl border-2 border-rose-300 text-xs animate-in fade-in duration-150 shadow-xs">
                                <div className="flex items-start gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                                    <Trash2 className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-bold text-rose-900">
                                      {language === 'th' ? `ยืนยันการลบพนักงาน "${u.name}" ออกจากระบบ?` : `Confirm Delete Employee "${u.name}"?`}
                                    </div>
                                    <p className="text-[11px] text-rose-800 mt-1 leading-relaxed">
                                      {language === 'th'
                                        ? `คุณต้องการลบ "${u.name}" (รหัสพนักงาน: ${u.employeeId} / @${u.username}) ออกจากระบบใช่หรือไม่? พนักงานคนนี้จะไม่สามารถเข้าสู่ระบบ ดูข้อมูล หรือเข้าใช้งานส่วนใดๆ ของระบบได้อีก`
                                        : `Are you sure you want to delete "${u.name}" (ID: ${u.employeeId}) from the system? They will no longer have access to login or view workspace features.`}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2.5">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteStaff(u)}
                                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>{language === 'th' ? 'ยืนยันลบพนักงาน' : 'Confirm Delete'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setUserToDelete(null)}
                                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                                      >
                                        {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-5 bg-slate-50/70 rounded-xl border border-dashed border-slate-300 text-center">
                      <div className="w-10 h-10 rounded-full bg-[#e1effe] text-[#0061a5] mx-auto flex items-center justify-center mb-2">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <h5 className="font-bold text-xs text-[#002045] mb-1">
                        {language === 'th' ? 'ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา' : 'No matching staff accounts found'}
                      </h5>
                      <p className="text-[11px] text-[#74777f] max-w-md mx-auto">
                        {language === 'th'
                          ? 'ลองค้นหาด้วยคำอื่น หรือเลือกแท็บ "ทั้งหมด" เพื่อดูรายชื่อพนักงานและบัญชีผู้ใช้งานทั้งหมด'
                          : 'Try adjusting your search query or selecting the "All" tab to view all accounts.'}
                      </p>
                    </div>
                  )}

                  {/* Admin Edit Credentials Modal Dialog */}
                  {editingEmployee && (
                    <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
                      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-4 bg-[#002045] text-white flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-[#73c2fb]" />
                            <h3 className="font-bold text-xs text-white">
                              {language === 'th' ? `แก้ไขข้อมูลบัญชี ${editingEmployee.name}` : `Edit Credentials: ${editingEmployee.name}`}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingEmployee(null)}
                            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <form onSubmit={handleSaveEditedEmployee} className="p-4 space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-[#002045] mb-1">
                              {language === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name'}
                            </label>
                            <input
                              type="text"
                              value={editingEmployee.name}
                              onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                              required
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-hidden focus:border-[#0061a5] focus:bg-white"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-bold text-[#002045] mb-1">
                                {language === 'th' ? 'รหัสพนักงาน' : 'Employee ID'}
                              </label>
                              <input
                                type="text"
                                value={editingEmployee.employeeId}
                                disabled
                                className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-[#002045] mb-1">
                                {language === 'th' ? 'ชื่อผู้ใช้ (Username)' : 'Username'}
                              </label>
                              <input
                                type="text"
                                value={editingEmployee.username}
                                onChange={(e) => setEditingEmployee({ ...editingEmployee, username: e.target.value })}
                                required
                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-[#0061a5] font-bold outline-hidden focus:border-[#0061a5] focus:bg-white"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-[#002045] mb-1">
                              {language === 'th' ? 'รหัสผ่าน (Password)' : 'Password'}
                            </label>
                            <div className="relative">
                              <input
                                type={showEditEmpPass ? 'text' : 'password'}
                                value={editingEmployee.password}
                                onChange={(e) => setEditingEmployee({ ...editingEmployee, password: e.target.value })}
                                required
                                className="w-full pl-3 pr-10 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold outline-hidden focus:border-[#0061a5] focus:bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => setShowEditEmpPass(!showEditEmpPass)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                {showEditEmpPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-[#002045] mb-1">
                              {language === 'th' ? 'แผนก/ตำแหน่ง' : 'Department/Role'}
                            </label>
                            <input
                              type="text"
                              value={editingEmployee.role}
                              onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value })}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-hidden focus:border-[#0061a5] focus:bg-white"
                            />
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEmployee({
                                  ...editingEmployee,
                                  username: editingEmployee.employeeId,
                                  password: editingEmployee.employeeId
                                });
                              }}
                              className="px-2.5 py-1 text-[10px] font-semibold text-amber-700 hover:bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-1 cursor-pointer"
                              title="Reset fields to Employee ID"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{language === 'th' ? 'ใส่ค่าเริ่มต้น (รหัสพนักงาน)' : 'Set Default ID'}</span>
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingEmployee(null)}
                                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                              >
                                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                              </button>
                              <button
                                type="submit"
                                className="px-4 py-1.5 bg-[#0061a5] hover:bg-[#002045] text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                              >
                                {language === 'th' ? 'บันทึกการแก้ไข' : 'Save Changes'}
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Security Compliance & Protocols */}
                <div className="p-3.5 bg-emerald-50/90 rounded-xl border border-emerald-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>{t.soc2Active}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 text-[10px] font-bold">
                      AES-256 Bit
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700">{t.soc2Desc}</p>

                  <div className="mt-2.5 pt-2 border-t border-emerald-200/70 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-emerald-800 font-medium">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{language === 'th' ? 'รหัสผ่านขั้นต่ำ 8 ตัวอักษร (A-Z, a-z, 0-9)' : 'Password Policy: 8+ chars (A-Z, a-z, 0-9)'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{language === 'th' ? 'การบันทึกประวัติการเข้าใช้งาน Audit Trail' : 'Real-time Security Audit Logging'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#e2e8f0] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-[#43474e] hover:bg-[#f3f3f4] rounded-lg transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 font-semibold bg-[#0061a5] hover:bg-[#002045] text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  {t.saved}
                </>
              ) : (
                t.savePreferences
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
