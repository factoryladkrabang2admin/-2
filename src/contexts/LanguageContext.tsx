import React, { createContext, useContext, useState } from 'react';

export type Language = 'th' | 'en';

export interface LanguageConfig {
  code: Language;
  shortCode: string;
  name: string;
  nativeName: string;
  englishName: string;
  countryName: string;
  flagEmoji: string;
}

export const LANGUAGE_CONFIGS: LanguageConfig[] = [
  { code: 'th', shortCode: 'TH', name: 'ภาษาไทย', nativeName: 'ภาษาไทย', englishName: 'Thai', countryName: 'Thailand', flagEmoji: '🇹🇭' },
  { code: 'en', shortCode: 'EN', name: 'English', nativeName: 'English (US)', englishName: 'English', countryName: 'United States', flagEmoji: '🇺🇸' },
];

export const getLanguageConfig = (lang: Language | string): LanguageConfig => {
  const match = LANGUAGE_CONFIGS.find((l) => l.code === lang);
  return match || LANGUAGE_CONFIGS[0];
};

export interface Translations {
  // Brand
  appName: string;

  // Navigation
  dashboard: string;
  announcements: string;
  projects: string;
  team: string;
  reports: string;
  laundryTracking: string;
  meetingRoomBooking: string;
  maintenanceTracking: string;
  workSchedule: string;
  otCheck: string;
  payslip: string;
  equipmentRequisition: string;
  chlorineCheck: string;
  settings: string;
  profile: string;
  enterpriseHub: string;
  enterpriseTier: string;
  enterpriseTierDesc: string;

  // Header / TopBar
  searchPlaceholder: string;
  searchProjects: string;
  searchTeam: string;
  searchReports: string;
  searchLaundry: string;
  notifications: string;
  helpAndDocs: string;
  profileDetails: string;
  workspaceSettings: string;
  documentationApi: string;
  signOut: string;
  signIn: string;
  register: string;
  registerNewUser: string;
  alreadyHaveAccount: string;
  dontHaveAccount: string;
  adminEnterprise: string;

  // Settings Modal
  settingsTitle: string;
  generalSettings: string;
  teamSettings: string;
  notificationsSettings: string;
  securitySettings: string;
  languageSettings: string;
  interfaceLanguage: string;
  interfaceLanguageDesc: string;
  orgName: string;
  defaultDueOffset: string;
  days: string;
  emailDigest: string;
  emailDigestDesc: string;
  realtimeSync: string;
  realtimeSyncDesc: string;
  soc2Active: string;
  soc2Desc: string;
  savePreferences: string;
  saved: string;
  cancel: string;

  // Dashboard
  welcomeBack: string;
  dashboardSubtitle: string;
  activeProjects: string;
  activeProjectsDesc: string;
  completedTasks: string;
  teamVelocity: string;
  timeLoggedToday: string;
  needNewProject: string;
  needNewProjectDesc: string;
  createProject: string;
  recentActivity: string;
  viewAllProjects: string;
  viewTeam: string;
  startTimer: string;
  pauseTimer: string;
  tasksDue: string;
  needsAttention: string;
  onTrack: string;
  viewAll: string;
  activeSession: string;

  // Projects View
  projectsTitle: string;
  projectsSubtitle: string;
  allStatus: string;
  inProgress: string;
  inReview: string;
  completed: string;
  planning: string;
  dueDate: string;
  tasks: string;
  members: string;
  overdue: string;
  projectDetails: string;
  sortBy: string;
  newest: string;
  oldest: string;
  nameAZ: string;
  progress: string;

  // Team View
  teamTitle: string;
  teamSubtitle: string;
  inviteMember: string;
  department: string;
  online: string;
  offline: string;
  dnd: string;
  assignedProjects: string;

  // Reports View
  reportsTitle: string;
  reportsSubtitle: string;
  totalRevenue: string;
  avgCompletion: string;
  satisfactionRate: string;
  exportCsv: string;
  exportPdf: string;
  generatedReports: string;

  // Laundry Tracking
  laundryTitle: string;
  laundrySubtitle: string;
  newIntake: string;
  trackByCode: string;
  totalActiveLoad: string;
  inWashDrums: string;
  dryAndPress: string;
  readyForPickup: string;
  rushExpress: string;
  ordersPipeline: string;
  ragsGlovesTab: string;
  machineryEquipment: string;
  fastTrackingLookup: string;
  trackingCode: string;
  customerLocation: string;
  serviceType: string;
  stageAndProgress: string;
  estReady: string;
  action: string;
  advance: string;
  details: string;

  // Laundry Filters & Actions
  allPriorities: string;
  expressOnly: string;
  highPriority: string;
  normalPriority: string;
  allServices: string;
  noOrdersFound: string;
  noOrdersDesc: string;
  createIntakeBtn: string;
  commercialEquipmentTitle: string;
  commercialEquipmentDesc: string;
  activeCycles: string;
  drumCapacity: string;
  runsToday: string;
  temp: string;
  activeProgram: string;
  assignedOrder: string;
  minsRemaining: string;
  equipmentIdle: string;
  operationalStatus: string;
  startCycle: string;
  pauseCycle: string;
  terminalTitle: string;
  terminalSubtitle: string;
  enterTrackingCode: string;
  trackBtn: string;
  sampleCodes: string;
  openInspector: string;
  assignedMachine: string;
  itemsAndWeight: string;

  // Laundry Stages
  stageAll: string;
  stageReceived: string;
  stageWashing: string;
  stageDrying: string;
  stageIroning: string;
  stageQC: string;
  stageReady: string;
  stageDelivered: string;

  // General & Common
  thaiLanguage: string;
  englishLanguage: string;
  save: string;
  close: string;
  delete: string;
  edit: string;
  print: string;

  // Announcements
  announcementsTitle: string;
  announcementsSubtitle: string;
  pinnedAnnouncementsBadge: string;
  searchAnnouncementsPlaceholder: string;
  allDepartments: string;
  statusAll: string;
  statusActive: string;
  statusUpcoming: string;
  statusExpired: string;
  viewCard: string;
  viewList: string;
  noAnnouncementsFound: string;
  noAnnouncementsDesc: string;
  clearAllFilters: string;
  showingPagination: string;
  fromTotal: string;
  items: string;
  page: string;
  ofPage: string;
  firstPage: string;
  prevPage: string;
  nextPage: string;
  lastPage: string;
  readFullAnnouncement: string;
  pinnedBadge: string;
  unpinAction: string;
  pinAction: string;
  pinAnnouncementTitle: string;
  unpinAnnouncementTitle: string;
  pinnedByNotice: string;
  onwards: string;
  unspecifiedDuration: string;
  unspecifiedEndDate: string;
  unspecifiedDate: string;
  announcementDetailsTitle: string;
  startDateLabel: string;
  endDateLabel: string;
  companyPRBadge: string;
  zoomFullImage: string;
  copyLink: string;
  printDoc: string;
  closeModal: string;
  departmentLabel: string;
  adminPinSuccessToast: string;
  adminUnpinSuccessToast: string;
  adminPinOnlyToast: string;
}

export const translations: Record<Language, Translations> = {
  th: {
    // Brand
    appName: 'ธุรการลาดกระบัง 2',

    // Navigation
    dashboard: 'แดชบอร์ด',
    announcements: 'ข่าวประชาสัมพันธ์',
    projects: 'โครงการ',
    team: 'ทีมงาน',
    reports: 'รายงานและสถิติ',
    laundryTracking: 'ข้อมูลการซัก-อบผ้า',
    meetingRoomBooking: 'ห้องประชุม',
    maintenanceTracking: 'การแจ้งซ่อม',
    workSchedule: 'ตารางทำงาน',
    otCheck: 'ตรวจสอบ OT',
    payslip: 'สลิปเงินเดือน',
    equipmentRequisition: 'เบิกอุปกรณ์',
    chlorineCheck: 'สุ่มตรวจคลอรีน',
    settings: 'การตั้งค่า',
    profile: 'โปรไฟล์',
    enterpriseHub: 'ศูนย์กลางองค์กร',
    enterpriseTier: 'ระดับองค์กร (Enterprise)',
    enterpriseTierDesc: 'เปิดใช้งานการทำงานร่วมกันหลายทีมและการวิเคราะห์ข้อมูลอัตโนมัติเต็มรูปแบบ',

    // Header / TopBar
    searchPlaceholder: 'ค้นหาข้อมูล (รหัสผ้า, รายการ, สมาชิก)...',
    searchProjects: 'ค้นหารายการ...',
    searchTeam: 'ค้นหาสมาชิกในทีม...',
    searchReports: 'ค้นหารายงานและสถิติ...',
    searchLaundry: 'ค้นหารหัสผ้า (LND-8821), ลูกค้า, ห้อง...',
    notifications: 'การแจ้งเตือน',
    helpAndDocs: 'คู่มือและความช่วยเหลือ',
    profileDetails: 'ข้อมูลโปรไฟล์',
    workspaceSettings: 'ตั้งค่า',
    documentationApi: 'เอกสารและ API',
    signOut: 'ออกจากระบบ',
    signIn: 'เข้าสู่ระบบ',
    register: 'ลงทะเบียน',
    registerNewUser: 'ลงทะเบียน',
    alreadyHaveAccount: 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบที่นี่',
    dontHaveAccount: 'ยังไม่มีบัญชี? ลงทะเบียน',
    adminEnterprise: 'ผู้ดูแลระบบ / องค์กร',

    // Settings Modal
    settingsTitle: 'การตั้งค่าระบบ',
    generalSettings: 'ทั่วไป',
    teamSettings: 'จัดการผู้ลงทะเบียน',
    notificationsSettings: 'การแจ้งเตือน',
    securitySettings: 'ความปลอดภัยและการเข้าถึง',
    languageSettings: 'ภาษา (Language)',
    interfaceLanguage: 'ภาษาของระบบ (Interface Language)',
    interfaceLanguageDesc: 'เลือกภาษาที่ต้องการให้แสดงผลในระบบ (ภาษาไทย / English)',
    orgName: 'ชื่อองค์กร / บริษัท',
    defaultDueOffset: 'ระยะเวลากำหนดส่งเริ่มต้น',
    days: 'วัน',
    emailDigest: 'สรุปความคืบหน้ารายสัปดาห์ทางอีเมล',
    emailDigestDesc: 'รับสรุปความคืบหน้าการดำเนินงานทุกสัปดาห์',
    realtimeSync: 'การแจ้งเตือนสถานะแบบเรียลไทม์',
    realtimeSyncDesc: 'แจ้งเตือนสมาชิกที่ได้รับมอบหมายเมื่อมีการเปลี่ยนแปลงงาน',
    soc2Active: 'ระบบความปลอดภัย SOC2 เปิดใช้งานอยู่',
    soc2Desc: 'การบันทึกประวัติการตรวจสอบและการเข้ารหัสเซสชันแบบ End-to-End มีผลบังคับใช้',
    savePreferences: 'บันทึกการตั้งค่า',
    saved: 'บันทึกสำเร็จ!',
    cancel: 'ยกเลิก',

    // Dashboard
    welcomeBack: 'ยินดีต้อนรับ',
    dashboardSubtitle: 'นี่คือภาพรวมความคืบหน้ารายการผ้าและกิจกรรมของคุณวันนี้',
    activeProjects: 'โครงการที่กำลังดำเนินการ',
    activeProjectsDesc: 'จากทุกพื้นที่การทำงาน',
    completedTasks: 'งานที่เสร็จสมบูรณ์',
    teamVelocity: 'อัตราความเร็วของทีม',
    timeLoggedToday: 'เวลาที่บันทึกวันนี้',
    needNewProject: 'ต้องการสร้างพื้นที่โครงการใหม่?',
    needNewProjectDesc: 'สร้างพื้นที่ทำงานใหม่ได้ทันทีด้วยเทมเพลตมาตรฐานและระบบติดตามงานของทีม',
    createProject: 'สร้างโครงการใหม่',
    recentActivity: 'กิจกรรมล่าสุด',
    viewAllProjects: 'ดูโครงการทั้งหมด',
    viewTeam: 'ดูรายชื่อสมาชิกในทีม',
    startTimer: 'เริ่มบันทึกเวลา',
    pauseTimer: 'หยุดพักเวลา',
    tasksDue: 'งานที่ถึงกำหนดส่ง',
    needsAttention: 'ต้องติดตาม',
    onTrack: 'ตามแผนงาน',
    viewAll: 'ดูทั้งหมด',
    activeSession: 'กำลังบันทึกเวลาปฏิบัติงาน...',

    // Projects View
    projectsTitle: 'โครงการและพื้นที่ทำงาน',
    projectsSubtitle: 'จัดการโครงการที่กำลังดำเนินการ กำหนดส่ง และการส่งมอบเป้าหมาย',
    allStatus: 'ทุกสถานะ',
    inProgress: 'กำลังดำเนินการ',
    inReview: 'กำลังตรวจสอบ',
    completed: 'เสร็จสมบูรณ์',
    planning: 'กำลังวางแผน',
    dueDate: 'กำหนดส่ง',
    tasks: 'งาน',
    members: 'สมาชิก',
    overdue: 'เลยกำหนดส่ง',
    projectDetails: 'รายละเอียดโครงการ',
    sortBy: 'เรียงตาม',
    newest: 'ใหม่ล่าสุด',
    oldest: 'เก่าที่สุด',
    nameAZ: 'ชื่อ (ก-ฮ / A-Z)',
    progress: 'ความคืบหน้า',

    // Team View
    teamTitle: 'สมาชิกในทีมและโครงสร้าง',
    teamSubtitle: 'ดูการจัดสรรแผนก สถานะการทำงาน และโครงการที่ได้รับมอบหมาย',
    inviteMember: 'เชิญสมาชิกใหม่',
    department: 'แผนก',
    online: 'ออนไลน์',
    offline: 'ออฟไลน์',
    dnd: 'ห้ามรบกวน',
    assignedProjects: 'โครงการที่รับผิดชอบ',

    // Reports View
    reportsTitle: 'รายงานและสถิติองค์กร',
    reportsSubtitle: 'ข้อมูลการเงิน ระยะเวลาเฉลี่ยในการส่งมอบ และประสิทธิภาพของแต่ละแผนก',
    totalRevenue: 'รายได้รวม',
    avgCompletion: 'ระยะเวลาเฉลี่ยในการเสร็จสิ้น',
    satisfactionRate: 'คะแนนความพึงพอใจ',
    exportCsv: 'ส่งออก CSV',
    exportPdf: 'ส่งออก PDF',
    generatedReports: 'คลังรายงานที่สร้างไว้',

    // Laundry Tracking
    laundryTitle: 'ข้อมูลการซัก-อบผ้า',
    laundrySubtitle: 'ติดตามรายการผ้าตั้งแต่การรับเข้า, การซัก, อบแห้ง, รีดไอน้ำ จนถึงการส่งมอบ พร้อมตรวจสอบสถานะเครื่องจักรและระยะเวลา SLA แบบเรียลไทม์',
    newIntake: 'บันทึกรายการ',
    trackByCode: 'ค้นหาด้วยรหัสติดตาม',
    totalActiveLoad: 'ยอดผ้าทั้งหมดที่กำลังดำเนินการ',
    inWashDrums: 'กำลังซักในถัง',
    dryAndPress: 'กำลังอบและรีดไอน้ำ',
    readyForPickup: 'พร้อมส่งมอบ/รับผ้า',
    rushExpress: 'งานด่วนพิเศษ (Rush/Express)',
    ordersPipeline: 'ขั้นตอนการดำเนินงาน (Pipeline)',
    ragsGlovesTab: 'ข้อมูลเศษผ้า - ถุงมือ',
    machineryEquipment: 'เครื่องจักรและสถานีซักรีด',
    fastTrackingLookup: 'เทอร์มินัลค้นหาด่วน',
    trackingCode: 'รหัสติดตาม',
    customerLocation: 'ลูกค้า / สถานที่ส่งมอบ',
    serviceType: 'ประเภทบริการ',
    stageAndProgress: 'สถานะ',
    estReady: 'ประมาณการเสร็จ',
    action: 'การกระทำ',
    advance: 'เลื่อนสถานะ',
    details: 'รายละเอียด',

    // Laundry Filters & Actions
    allPriorities: 'ทุกระดับความสำคัญ',
    expressOnly: 'เฉพาะด่วนพิเศษ (Express)',
    highPriority: 'ความสำคัญสูง (High)',
    normalPriority: 'ปกติ (Normal)',
    allServices: 'ทุกประเภทบริการ',
    noOrdersFound: 'ไม่พบรายการซัก-อบผ้า',
    noOrdersDesc: 'ไม่พบรายการที่ตรงกับตัวกรองหรือเงื่อนไขการค้นหาที่เลือก',
    createIntakeBtn: '+ บันทึกรายการ',
    commercialEquipmentTitle: 'เครื่องซักอุตสาหกรรม, เครื่องอบ และเครื่องรีดไอน้ำ',
    commercialEquipmentDesc: 'ข้อมูลสถานะแบบเรียลไทม์, ตัวนับเวลา, ความจุถัง และการบำรุงรักษาเชิงป้องกัน',
    activeCycles: 'รอบการทำงานที่กำลังเดินเครื่อง',
    drumCapacity: 'ความจุถัง',
    runsToday: 'จำนวนรอบวันนี้',
    temp: 'อุณหภูมิ',
    activeProgram: 'โปรแกรมที่กำลังทำงาน:',
    assignedOrder: 'รหัสผ้าที่มอบหมาย:',
    minsRemaining: 'นาทีที่เหลือ',
    equipmentIdle: 'เครื่องจักรว่างและผ่านการฆ่าเชื้อแล้ว พร้อมรับงานรอบถัดไป',
    operationalStatus: 'สถานะ: พร้อมใช้งาน',
    startCycle: 'เริ่มทำงาน',
    pauseCycle: 'หยุดชั่วคราว',
    terminalTitle: 'เทอร์มินัลติดตามสถานะผ้าแบบเรียลไทม์',
    terminalSubtitle: 'กรอกรหัสติดตาม 7 หลักจากใบรับผ้า (เช่น LND-8821) เพื่อตรวจสอบสถานะการซัก-อบสด',
    enterTrackingCode: 'กรอกรหัสติดตาม (เช่น LND-8821)...',
    trackBtn: 'ค้นหา',
    sampleCodes: 'รหัสตัวอย่าง:',
    openInspector: 'เปิดดูรายละเอียดฉบับเต็ม',
    assignedMachine: 'เครื่องจักรที่กำหนด:',
    itemsAndWeight: 'จำนวนชิ้น & น้ำหนัก:',

    // Laundry Stages
    stageAll: 'ทั้งหมด',
    stageReceived: 'อยู่ระหว่างซัก',
    stageWashing: 'อยู่ระหว่างซัก',
    stageDrying: 'อยู่ระหว่างซัก',
    stageIroning: 'อยู่ระหว่างซัก',
    stageQC: 'อยู่ระหว่างซัก',
    stageReady: 'ซักเสร็จแล้ว',
    stageDelivered: 'ซักเสร็จแล้ว',

    // General & Common
    thaiLanguage: 'ภาษาไทย (Thai)',
    englishLanguage: 'English (US)',
    save: 'บันทึก',
    close: 'ปิด',
    delete: 'ลบ',
    edit: 'แก้ไข',
    print: 'พิมพ์ใบเสร็จ/แท็ก',

    // Announcements
    announcementsTitle: 'ข่าวประชาสัมพันธ์',
    announcementsSubtitle: 'ประกาศ ข่าวสาร และกิจกรรมสำคัญภายในองค์กร',
    pinnedAnnouncementsBadge: 'ปักหมุด',
    searchAnnouncementsPlaceholder: 'ค้นหาหัวข้อข่าว, กิจกรรม, เนื้อหา, หรือแผนก...',
    allDepartments: 'ทุกแผนก / ฝ่าย',
    statusAll: 'ทั้งหมด',
    statusActive: 'กำลังเผยแพร่',
    statusUpcoming: 'เร็วๆ นี้',
    statusExpired: 'สิ้นสุดแล้ว',
    viewCard: 'มุมมองการ์ด',
    viewList: 'มุมมองรายการ',
    noAnnouncementsFound: 'ไม่พบข่าวประชาสัมพันธ์ที่ตรงกับเงื่อนไข',
    noAnnouncementsDesc: 'ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองแผนกใหม่อีกครั้ง',
    clearAllFilters: 'ล้างตัวกรองทั้งหมด',
    showingPagination: 'แสดง',
    fromTotal: 'จากทั้งหมด',
    items: 'รายการ',
    page: 'หน้า',
    ofPage: 'จาก',
    firstPage: 'หน้าแรก',
    prevPage: 'ก่อนหน้า',
    nextPage: 'ถัดไป',
    lastPage: 'หน้าสุดท้าย',
    readFullAnnouncement: 'อ่านฉบับเต็ม',
    pinnedBadge: 'ปักหมุด',
    unpinAction: 'ถอนหมุด',
    pinAction: 'ปักหมุด',
    pinAnnouncementTitle: 'ปักหมุดประกาศนี้ให้อยู่บนสุด',
    unpinAnnouncementTitle: 'ถอนการปักหมุดประกาศนี้',
    pinnedByNotice: 'ประกาศปักหมุด',
    onwards: 'เป็นต้นไป',
    unspecifiedDuration: 'ไม่ระบุช่วงเวลา',
    unspecifiedEndDate: 'ไม่มีกำหนดสิ้นสุด',
    unspecifiedDate: 'ไม่ระบุ',
    announcementDetailsTitle: 'รายละเอียดประชาสัมพันธ์',
    startDateLabel: 'วันที่เริ่มต้นประชาสัมพันธ์',
    endDateLabel: 'วันสิ้นสุดการประชาสัมพันธ์',
    companyPRBadge: 'ข่าวประชาสัมพันธ์บริษัท',
    zoomFullImage: 'ซูมภาพเต็ม',
    copyLink: 'คัดลอกข้อความ',
    printDoc: 'พิมพ์เอกสาร',
    closeModal: 'ปิด',
    departmentLabel: 'ฝ่ายงาน:',
    adminPinSuccessToast: '📌 ปักหมุดประกาศ "{title}" ไว้บนสุดเรียบร้อยแล้ว',
    adminUnpinSuccessToast: 'ปลดหมุดประกาศ "{title}" เรียบร้อยแล้ว',
    adminPinOnlyToast: 'เฉพาะผู้ดูแลระบบและแอดมินเท่านั้นที่สามารถปักหมุดประกาศได้',
  },
  en: {
    // Brand
    appName: 'Ladkrabang 2 Administrative',

    // Navigation
    dashboard: 'Dashboard',
    announcements: 'Press Release',
    projects: 'Projects',
    team: 'Team',
    reports: 'Reports',
    laundryTracking: 'Laundry Tracking',
    meetingRoomBooking: 'Meeting Rooms',
    maintenanceTracking: 'Maintenance & Repairs',
    workSchedule: 'Work Schedule',
    otCheck: 'OT Verification',
    payslip: 'e-Pay Payslip',
    equipmentRequisition: 'Equipment Requisition',
    chlorineCheck: 'Chlorine Inspection',
    settings: 'Settings',
    profile: 'Profile',
    enterpriseHub: 'Enterprise Hub',
    enterpriseTier: 'Enterprise Tier',
    enterpriseTierDesc: 'Full multi-team collaboration & automated analytics enabled.',

    // Header / TopBar
    searchPlaceholder: 'Search anything (projects, tasks, members)...',
    searchProjects: 'Search projects...',
    searchTeam: 'Search team members...',
    searchReports: 'Search reports & analytics...',
    searchLaundry: 'Search laundry code (LND-8821), customer, room...',
    notifications: 'Notifications',
    helpAndDocs: 'Help & Documentation',
    profileDetails: 'Profile Details',
    workspaceSettings: 'Settings',
    documentationApi: 'Documentation & API',
    signOut: 'Sign Out',
    signIn: 'Sign In',
    register: 'Register',
    registerNewUser: 'Register New Account',
    alreadyHaveAccount: 'Already have an account? Sign In',
    dontHaveAccount: "Don't have an account? Register here",
    adminEnterprise: 'Admin / Enterprise',

    // Settings Modal
    settingsTitle: 'Settings',
    generalSettings: 'General',
    teamSettings: 'Manage Registered Users',
    notificationsSettings: 'Notifications',
    securitySettings: 'Security & Access',
    languageSettings: 'Language (ภาษา)',
    interfaceLanguage: 'Interface Language',
    interfaceLanguageDesc: 'Select your preferred application display language (Thai / English).',
    orgName: 'Organization Name',
    defaultDueOffset: 'Default Initiative Due Offset',
    days: 'Days',
    emailDigest: 'Email Milestone Digest',
    emailDigestDesc: 'Receive summary of weekly progress',
    realtimeSync: 'Real-time Status Sync',
    realtimeSyncDesc: 'Notify assigned members on task changes',
    soc2Active: 'SOC2 Compliance Active',
    soc2Desc: 'Audit logging and end-to-end encrypted session keys are enforced.',
    savePreferences: 'Save Preferences',
    saved: 'Saved!',
    cancel: 'Cancel',

    // Dashboard
    welcomeBack: 'Welcome',
    dashboardSubtitle: "Here's what's happening with your projects today.",
    activeProjects: 'Active Projects',
    activeProjectsDesc: 'Across all workspaces',
    completedTasks: 'Completed Tasks',
    teamVelocity: 'Team Velocity',
    timeLoggedToday: 'Time Logged Today',
    needNewProject: 'Need a new project space?',
    needNewProjectDesc: 'Set up a new workspace in seconds with our predefined templates and team tracking.',
    createProject: 'Create Project',
    recentActivity: 'Recent Activity',
    viewAllProjects: 'View All Projects',
    viewTeam: 'View Team Directory',
    startTimer: 'Start tracking',
    pauseTimer: 'Pause tracking',
    tasksDue: 'Tasks Due',
    needsAttention: 'Needs attention',
    onTrack: 'On track',
    viewAll: 'View all',
    activeSession: 'Active session running...',

    // Projects View
    projectsTitle: 'Projects & Workspaces',
    projectsSubtitle: 'Manage active initiatives, deadlines, and milestone deliveries.',
    allStatus: 'All Statuses',
    inProgress: 'In Progress',
    inReview: 'Review',
    completed: 'Completed',
    planning: 'Planning',
    dueDate: 'Due Date',
    tasks: 'Tasks',
    members: 'Members',
    overdue: 'Overdue',
    projectDetails: 'Project Details',
    sortBy: 'Sort by',
    newest: 'Newest',
    oldest: 'Oldest',
    nameAZ: 'Name (A-Z)',
    progress: 'Progress',

    // Team View
    teamTitle: 'Team Members & Directory',
    teamSubtitle: 'View department allocations, activity statuses, and project assignments.',
    inviteMember: 'Invite Member',
    department: 'Department',
    online: 'Online',
    offline: 'Offline',
    dnd: 'Do Not Disturb',
    assignedProjects: 'Assigned Projects',

    // Reports View
    reportsTitle: 'Enterprise Reports & Analytics',
    reportsSubtitle: 'Comprehensive financial, delivery turnaround, and department productivity metrics.',
    totalRevenue: 'Total Revenue',
    avgCompletion: 'Avg Completion Turnaround',
    satisfactionRate: 'Satisfaction Score',
    exportCsv: 'Export CSV',
    exportPdf: 'Export PDF',
    generatedReports: 'Generated Report Archives',

    // Laundry Tracking
    laundryTitle: 'Laundry Tracking',
    laundrySubtitle: 'Track garment batches through washing, drying, steam press, and dispatch with real-time equipment telemetry and guest delivery SLA monitoring.',
    newIntake: 'New Laundry Intake',
    trackByCode: 'Track by Code',
    totalActiveLoad: 'Total Active Load',
    inWashDrums: 'In Wash Drums',
    dryAndPress: 'Dry & Steam Press',
    readyForPickup: 'Ready for Pickup',
    rushExpress: 'Rush / Express',
    ordersPipeline: 'Orders Pipeline',
    ragsGlovesTab: 'Rags & Gloves Log',
    machineryEquipment: 'Machinery & Equipment',
    fastTrackingLookup: 'Fast Tracking Lookup',
    trackingCode: 'Tracking Code',
    customerLocation: 'Customer / Location',
    serviceType: 'Service Type',
    stageAndProgress: 'Status',
    estReady: 'Est. Ready',
    action: 'Action',
    advance: 'Advance',
    details: 'Details',

    // Laundry Filters & Actions
    allPriorities: 'All Priorities',
    expressOnly: 'Express Only',
    highPriority: 'High Priority',
    normalPriority: 'Normal',
    allServices: 'All Services',
    noOrdersFound: 'No laundry batches found',
    noOrdersDesc: 'No orders match your active filter criteria. Try selecting another stage or create a new order.',
    createIntakeBtn: '+ Create New Intake',
    commercialEquipmentTitle: 'Commercial Washers, Dryers & Steam Calenders',
    commercialEquipmentDesc: 'Live telemetry, cycle timers, drum capacity, and preventive maintenance status.',
    activeCycles: 'Active Cycles',
    drumCapacity: 'Drum Cap.',
    runsToday: 'Runs Today',
    temp: 'Temp',
    activeProgram: 'Active Program:',
    assignedOrder: 'Assigned Order:',
    minsRemaining: 'mins remaining',
    equipmentIdle: 'Equipment is idle and sanitized. Ready for next intake batch.',
    operationalStatus: 'Status: Operational',
    startCycle: 'Start Cycle',
    pauseCycle: 'Pause Cycle',
    terminalTitle: 'Real-time Garment Tracking Terminal',
    terminalSubtitle: 'Enter the 7-digit tracking code from the guest receipt tag (e.g. LND-8821) to inspect live wash stages.',
    enterTrackingCode: 'Enter Tracking Code (e.g. LND-8821)...',
    trackBtn: 'Track',
    sampleCodes: 'Sample codes:',
    openInspector: 'Open Full Inspector',
    assignedMachine: 'Assigned Machine:',
    itemsAndWeight: 'Item Count & Weight:',

    // Laundry Stages
    stageAll: 'All Orders',
    stageReceived: 'In Washing',
    stageWashing: 'In Washing',
    stageDrying: 'In Washing',
    stageIroning: 'In Washing',
    stageQC: 'In Washing',
    stageReady: 'Washed / Finished',
    stageDelivered: 'Washed / Finished',

    // General & Common
    thaiLanguage: 'ภาษาไทย (Thai)',
    englishLanguage: 'English (US)',
    save: 'Save',
    close: 'Close',
    delete: 'Delete',
    edit: 'Edit',
    print: 'Print Tag/Receipt',

    // Announcements
    announcementsTitle: 'Press Release',
    announcementsSubtitle: 'Important press releases, company notices, and official updates',
    pinnedAnnouncementsBadge: 'Pinned',
    searchAnnouncementsPlaceholder: 'Search press releases, activities, content, or department...',
    allDepartments: 'All Departments',
    statusAll: 'All',
    statusActive: 'Active',
    statusUpcoming: 'Upcoming',
    statusExpired: 'Expired',
    viewCard: 'Card View',
    viewList: 'List View',
    noAnnouncementsFound: 'No press releases found matching criteria',
    noAnnouncementsDesc: 'Try adjusting your search terms or selecting another department.',
    clearAllFilters: 'Clear All Filters',
    showingPagination: 'Showing',
    fromTotal: 'of',
    items: 'items',
    page: 'Page',
    ofPage: 'of',
    firstPage: 'First Page',
    prevPage: 'Previous',
    nextPage: 'Next',
    lastPage: 'Last Page',
    readFullAnnouncement: 'Read Full Press Release',
    pinnedBadge: 'Pinned',
    unpinAction: 'Unpin',
    pinAction: 'Pin',
    pinAnnouncementTitle: 'Pin this press release to top',
    unpinAnnouncementTitle: 'Unpin this press release',
    pinnedByNotice: 'Pinned Press Release',
    onwards: 'onwards',
    unspecifiedDuration: 'Unspecified duration',
    unspecifiedEndDate: 'No expiration date',
    unspecifiedDate: 'Unspecified',
    announcementDetailsTitle: 'Press Release Details',
    startDateLabel: 'Publication Start Date',
    endDateLabel: 'Publication End Date',
    companyPRBadge: 'Press Release',
    zoomFullImage: 'Zoom Image',
    copyLink: 'Copy Details',
    printDoc: 'Print',
    closeModal: 'Close',
    departmentLabel: 'Department:',
    adminPinSuccessToast: '📌 Pinned press release "{title}" to the top successfully',
    adminUnpinSuccessToast: 'Unpinned press release "{title}" successfully',
    adminPinOnlyToast: 'Only administrators and supervisors can pin press releases',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('proworkflow_lang');
    const validLanguages: Language[] = ['th', 'en'];
    return validLanguages.includes(saved as Language) ? (saved as Language) : 'th';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('proworkflow_lang', lang);
  };

  const t = translations[language] || translations.th;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
