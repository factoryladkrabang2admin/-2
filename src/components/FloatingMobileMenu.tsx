import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bell, 
  Settings, 
  User, 
  LogOut, 
  LogIn, 
  LayoutGrid, 
  Mail, 
  HeartHandshake, 
  Building2, 
  Server, 
  Hash,
  ExternalLink, 
  Check, 
  X, 
  Sparkles,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useLanguage, LANGUAGE_CONFIGS, getLanguageConfig } from '../contexts/LanguageContext';
import { FlagIcon } from './FlagIcon';
import { AdminUserAccount, isUserAdminOrSupervisor } from '../data/mockData';

interface FloatingMobileMenuProps {
  isAuthenticated: boolean;
  currentUser: AdminUserAccount;
  unreadNotificationsCount?: number;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onToggleNotifications: () => void;
  onLogin?: () => void;
  onLogout?: () => void;
}

export const FloatingMobileMenu: React.FC<FloatingMobileMenuProps> = ({
  isAuthenticated,
  currentUser,
  unreadNotificationsCount = 0,
  onOpenSettings,
  onOpenProfile,
  onToggleNotifications,
  onLogin,
  onLogout,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const currentLang = getLanguageConfig(language);

  const [isOpen, setIsOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<'main' | 'language' | 'services'>('main');

  // Dragging state
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('proworkflow_floating_menu_pos_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    // Default initial position (bottom right)
    return {
      x: typeof window !== 'undefined' ? Math.max(12, window.innerWidth - 44) : 300,
      y: typeof window !== 'undefined' ? Math.max(70, window.innerHeight - 110) : 600,
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number; hasMoved: boolean }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
    hasMoved: false,
  });

  const buttonRef = useRef<HTMLDivElement>(null);

  // Permission checks
  const isSuperAdmin = (currentUser?.username || '').toLowerCase() === 'reizosischen';
  const isUserAdmin = isUserAdminOrSupervisor(currentUser, isAuthenticated);
  const canAccessServices = isUserAdmin || isSuperAdmin || currentUser?.isAdmin;

  // Clamp position within viewport
  const clampPosition = useCallback((x: number, y: number) => {
    const btnSize = 32;
    const margin = 8;
    const maxX = Math.max(margin, window.innerWidth - btnSize - margin);
    const maxY = Math.max(60, window.innerHeight - btnSize - margin);
    const clampedX = Math.min(Math.max(margin, x), maxX);
    const clampedY = Math.min(Math.max(60, y), maxY);
    return { x: clampedX, y: clampedY };
  }, []);

  // Update on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => clampPosition(prev.x, prev.y));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPosition]);

  // Pointer drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary button
    if (e.button !== 0) return;
    
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
      hasMoved: false,
    };
    setIsDragging(true);

    if (buttonRef.current) {
      buttonRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    if (Math.hypot(deltaX, deltaY) > 5) {
      dragStartRef.current.hasMoved = true;
    }

    const newX = dragStartRef.current.posX + deltaX;
    const newY = dragStartRef.current.posY + deltaY;

    const clamped = clampPosition(newX, newY);
    setPosition(clamped);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    if (buttonRef.current && buttonRef.current.hasPointerCapture(e.pointerId)) {
      buttonRef.current.releasePointerCapture(e.pointerId);
    }

    // Save final position
    try {
      localStorage.setItem('proworkflow_floating_menu_pos_v1', JSON.stringify(position));
    } catch {
      // ignore
    }

    // If user tapped without significant drag movement, toggle menu
    if (!dragStartRef.current.hasMoved) {
      setIsOpen((prev) => {
        const next = !prev;
        if (next) setActiveSubMenu('main');
        return next;
      });
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (buttonRef.current && buttonRef.current.hasPointerCapture(e.pointerId)) {
      buttonRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // Quick link list
  const quickLinks = [
    {
      title: 'Zimbra',
      sub: 'mail.pbplc.co.th',
      tag: 'Webmail',
      url: 'https://mail.pbplc.co.th/',
      icon: Mail,
      color: 'from-sky-50 to-blue-100 text-sky-600 border-sky-200',
    },
    {
      title: language === 'th' ? 'สวัสดิการ' : 'Welfare System',
      sub: language === 'th' ? 'ระบบสวัสดิการพนักงาน' : 'Employee Welfare',
      tag: 'Welfare',
      url: 'https://script.google.com/macros/s/AKfycbzWFzj_Qwy743_V7jeMlqufsK1n8xQYfCcSCqLIIK2WEeI01C76WealY4zEk87HW6-U4w/exec',
      icon: HeartHandshake,
      color: 'from-rose-50 to-pink-100 text-rose-600 border-rose-200',
    },
    {
      title: 'Zycoda',
      sub: 'farmhouse.zycoda.com/auth/login',
      tag: 'Farmhouse',
      url: 'https://farmhouse.zycoda.com/auth/login',
      icon: Building2,
      color: 'from-indigo-50 to-blue-100 text-indigo-600 border-indigo-200',
    },
    {
      title: 'JCS',
      sub: 'fac.farmhouse.co.th:81/jcs',
      tag: 'System',
      url: 'http://fac.farmhouse.co.th:81/jcs/login.aspx',
      icon: Server,
      color: 'from-emerald-50 to-teal-100 text-emerald-600 border-emerald-200',
    },
    {
      title: 'Running No.',
      sub: language === 'th' ? 'ระบบรันนิ่งนัมเบอร์' : 'Running Number System',
      tag: 'Running',
      url: 'https://script.google.com/macros/s/AKfycbxBWCnWwGsnka6ROGBx0dRcGt2W9lMC3a_B9yZdbTm6Er0Dr_RvbRygbsFQgt0hLNcFXg/exec',
      icon: Hash,
      color: 'from-amber-50 to-orange-100 text-amber-600 border-amber-200',
    },
  ];

  return (
    <>
      {/* Backdrop overlay when floating menu is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Floating Widget Container (Visible on mobile & portrait tablet) */}
      <div
        id="floating-mobile-menu-container"
        className="fixed z-50 lg:hidden touch-none select-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {/* Floating Trigger Button (Draggable - Half Size) */}
        <div
          ref={buttonRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className={`group relative flex items-center justify-center w-8 h-8 rounded-full shadow-lg transition-transform cursor-grab active:cursor-grabbing active:scale-95 ${
            isOpen
              ? 'bg-[#002045] text-white ring-2 ring-sky-300 scale-105'
              : 'bg-gradient-to-tr from-[#002045] to-[#005187] text-white ring-1.5 ring-white/90 hover:shadow-xl'
          } ${isDragging ? 'opacity-90 shadow-xl scale-110' : ''}`}
          title={language === 'th' ? 'เมนูลอยด่วน (ลากเพื่อย้ายที่)' : 'Floating Quick Menu (Drag to move)'}
          aria-label="Floating quick menu"
        >
          {/* Visual indicator / icon */}
          {isOpen ? (
            <X className="w-4 h-4 text-white animate-in zoom-in-75 duration-150" />
          ) : (
            <div className="relative flex items-center justify-center w-full h-full">
              {/* Center icon / Avatar */}
              {isAuthenticated ? (
                <div className="w-6 h-6 rounded-full overflow-hidden border border-white/90 shadow-2xs flex items-center justify-center bg-sky-900 text-white font-black text-[9px]">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name || currentUser.username}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <span>{currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'RZ'}</span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <LayoutGrid className="w-3.5 h-3.5 text-white pointer-events-none" />
                </div>
              )}

              {/* Language Flag Sub-badge (Bottom-Right) */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-2xs border border-slate-200 flex items-center justify-center overflow-hidden pointer-events-none scale-90">
                <FlagIcon code={currentLang.code} size="sm" />
              </div>

              {/* Notification Badge (Top-Right) */}
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 bg-[#ba1a1a] text-white text-[8px] font-black rounded-full flex items-center justify-center ring-1 ring-white shadow-xs pointer-events-none">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expanded Floating Popover Menu */}
        {isOpen && (
          <div
            className={`absolute z-50 w-[290px] sm:w-[320px] bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl border border-sky-100 p-3.5 animate-in zoom-in-95 fade-in duration-200 text-slate-800 ${
              position.x > window.innerWidth / 2 ? 'right-0' : 'left-0'
            } ${
              position.y > window.innerHeight / 2 ? 'bottom-10' : 'top-10'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Submenu navigation */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
              {activeSubMenu === 'main' ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#002045] text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4 text-sky-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#002045]">
                      {language === 'th' ? 'เมนูด่วนและการตั้งค่า' : 'Quick Menu & Settings'}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {language === 'th' ? 'ลากปุ่มลอยเพื่อเปลี่ยนตำแหน่งได้' : 'Drag floating button anywhere'}
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveSubMenu('main')}
                  className="flex items-center gap-1 text-xs font-bold text-[#0061a5] hover:text-[#002045] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{language === 'th' ? 'ย้อนกลับ' : 'Back'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* MAIN MENU VIEW */}
            {activeSubMenu === 'main' && (
              <div className="space-y-2">
                {/* 1. Profile / Authentication Section */}
                <div className="p-2.5 bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-xl border border-slate-200/80">
                  {isAuthenticated ? (
                    <div className="flex items-center justify-between gap-2">
                      <div 
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                        onClick={() => {
                          setIsOpen(false);
                          onOpenProfile();
                        }}
                      >
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-sky-300 bg-[#002045] flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs">
                          {currentUser.avatarUrl ? (
                            <img
                              src={currentUser.avatarUrl}
                              alt={currentUser.name || currentUser.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'RZ'}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {currentUser.name || 'reizosischen'}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-bold rounded truncate ${
                              (currentUser.isAdmin || currentUser.username.toLowerCase() === 'reizosischen' || (currentUser.role && (currentUser.role.includes('Admin') || currentUser.role.includes('ผู้ดูแลระบบ'))))
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-[#d2e4ff] text-[#001d37]'
                            }`}>
                              {(currentUser.isAdmin || currentUser.username.toLowerCase() === 'reizosischen' || (currentUser.role && (currentUser.role.includes('Admin') || currentUser.role.includes('ผู้ดูแลระบบ')))) && (
                                <span className="text-amber-600 font-extrabold">👑</span>
                              )}
                              <span>{currentUser.role || t.adminEnterprise}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onOpenProfile();
                          }}
                          className="p-2 rounded-lg bg-white hover:bg-sky-50 text-slate-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                          title={t.profileDetails}
                        >
                          <User className="w-4 h-4 text-[#0061a5]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onLogout?.();
                          }}
                          className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors shadow-2xs cursor-pointer"
                          title={t.signOut}
                        >
                          <LogOut className="w-4 h-4 text-rose-600" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onLogin?.();
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-[#002045] hover:bg-[#003366] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
                    >
                      <LogIn className="w-4 h-4 text-sky-300" />
                      <span>{language === 'th' ? 'เข้าสู่ระบบ (Sign In)' : t.signIn}</span>
                    </button>
                  )}
                </div>

                {/* 2. Actions: Notifications & Settings (Settings restricted to Admin / Supervisor) */}
                <div className={canAccessServices ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                  {/* Notifications Action */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onToggleNotifications();
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center justify-between group cursor-pointer shadow-2xs text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shrink-0">
                        <Bell className="w-4 h-4" />
                        {unreadNotificationsCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 bg-[#ba1a1a] text-white text-[9px] font-black rounded-full flex items-center justify-center">
                            {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {language === 'th' ? 'แจ้งเตือน' : 'Notifications'}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {unreadNotificationsCount > 0 ? `${unreadNotificationsCount} ${language === 'th' ? 'ใหม่' : 'new'}` : (language === 'th' ? 'ไม่มีใหม่' : 'All read')}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Settings Action (Restricted to Admin / Supervisor) */}
                  {canAccessServices && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenSettings();
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center justify-between group cursor-pointer shadow-2xs text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200/80 flex items-center justify-center text-[#0061a5] shrink-0">
                          <Settings className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {language === 'th' ? 'ตั้งค่าระบบ' : 'Settings'}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {language === 'th' ? 'จัดการระบบ' : 'Workspace'}
                          </p>
                        </div>
                      </div>
                    </button>
                  )}
                </div>

                {/* 3. Language Selector Toggle */}
                <button
                  type="button"
                  onClick={() => setActiveSubMenu('language')}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center justify-between group cursor-pointer shadow-2xs text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0">
                      <FlagIcon code={currentLang.code} size="md" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {currentLang.nativeName}
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.2 bg-slate-800 text-white rounded">
                          {currentLang.shortCode}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        {language === 'th' ? 'เปลี่ยนภาษาการใช้งาน' : 'Switch interface language'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0" />
                </button>

                {/* 4. Services & Quick Links (สวัสดิการ, Zycoda, Zimbra, JCS, Running No.) - Restricted to Admin / Supervisor */}
                {canAccessServices && (
                  <button
                    type="button"
                    onClick={() => setActiveSubMenu('services')}
                    className="w-full p-2.5 rounded-xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/70 to-blue-50/70 hover:from-indigo-100/70 hover:to-blue-100/70 transition-all flex items-center justify-between group cursor-pointer shadow-2xs text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <LayoutGrid className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-indigo-950">
                            {language === 'th' ? 'ระบบและลิงก์ด่วน' : 'Services & Quick Links'}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-indigo-200 text-indigo-900 rounded-full">
                            5 {language === 'th' ? 'ระบบ' : 'apps'}
                          </span>
                        </div>
                        <p className="text-[10px] text-indigo-700/80 truncate">
                          Zimbra • สวัสดิการ • Zycoda • JCS • Running No.
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:text-indigo-700 transition-colors shrink-0" />
                  </button>
                )}
              </div>
            )}

            {/* LANGUAGE SUBMENU VIEW */}
            {activeSubMenu === 'language' && (
              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                <div className="px-1 py-1 text-[11px] font-bold text-slate-500 flex items-center justify-between">
                  <span>{t.interfaceLanguage}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                    {LANGUAGE_CONFIGS.length} Languages
                  </span>
                </div>

                {LANGUAGE_CONFIGS.map((cfg) => {
                  const isSelected = language === cfg.code;
                  return (
                    <button
                      key={cfg.code}
                      type="button"
                      onClick={() => {
                        setLanguage(cfg.code);
                        setActiveSubMenu('main');
                      }}
                      className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#002045] text-white font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center shrink-0">
                          <FlagIcon code={cfg.code} size="sm" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold truncate">{cfg.nativeName}</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                            }`}>
                              {cfg.shortCode}
                            </span>
                          </div>
                          <p className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                            {cfg.englishName} ({cfg.countryName})
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-sky-300 shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* SERVICES & QUICK LINKS SUBMENU VIEW */}
            {activeSubMenu === 'services' && (
              <div className="space-y-1.5">
                <div className="px-1 py-1 text-[11px] font-bold text-slate-500 flex items-center justify-between">
                  <span>{language === 'th' ? 'ระบบบริการและลิงก์ภายนอก' : 'Services & External Portals'}</span>
                </div>

                {quickLinks.map((item, idx) => {
                  const IconComp = item.icon;
                  return (
                    <a
                      key={`floating-quicklink-${idx}`}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsOpen(false)}
                      className="w-full p-2.5 rounded-xl text-left text-xs flex items-center justify-between transition-all hover:bg-slate-50 border border-slate-200 group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 group-hover:text-[#0061a5] transition-colors">
                              {item.title}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                              {item.tag}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {item.sub}
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0061a5] shrink-0 ml-1.5 transition-colors" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
