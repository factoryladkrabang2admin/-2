import React, { useState, useMemo } from 'react';
import { NavigationTab } from '../types';
import { LOGO_URL } from '../data/mockData';
import { 
  LayoutDashboard, 
  X, 
  Shirt,
  DoorOpen,
  Wrench,
  CalendarDays,
  Clock,
  CreditCard,
  Megaphone,
  PackageCheck,
  FlaskConical
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { DEFAULT_ADMIN_USER, AdminUserAccount } from '../data/mockData';
import { 
  BreadIcon, 
  BreadKind, 
  FloatingBreadParticles,
  CroissantIcon
} from './BreadIcons';
import { RotatingAvatar } from './RotatingAvatar';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  laundryCount?: number;
  maintenanceCount?: number;
  isAuthenticated?: boolean;
  currentUser?: AdminUserAccount;
  onLogin?: () => void;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
  isAuthenticated = true,
  currentUser = DEFAULT_ADMIN_USER,
  onLogin,
  onLogout,
  onOpenProfile,
  onOpenSettings,
}) => {
  const { t, language } = useLanguage();
  const [activeBreadHover, setActiveBreadHover] = useState<string | null>(null);

  const navItems: { 
    id: NavigationTab; 
    label: string; 
    icon: React.ReactNode; 
    breadKind: BreadKind; 
    breadName: string;
    requiresAuth: boolean;
    isExternal?: boolean;
    url?: string;
  }[] = [
    {
      id: 'dashboard',
      label: t.dashboard,
      icon: <LayoutDashboard className="w-5 h-5" />,
      breadKind: 'croissant',
      breadName: 'ครัวซองต์เนยสด',
      requiresAuth: true,
    },
    {
      id: 'announcements',
      label: t.announcements,
      icon: <Megaphone className="w-5 h-5" />,
      breadKind: 'muffin',
      breadName: 'มัฟฟินอบใหม่',
      requiresAuth: true,
    },
    {
      id: 'laundry',
      label: t.laundryTracking,
      icon: <Shirt className="w-5 h-5" />,
      breadKind: 'toast',
      breadName: 'ขนมปังปิ้งเนยฉ่ำ',
      requiresAuth: false,
    },
    {
      id: 'meeting_room',
      label: t.meetingRoomBooking,
      icon: <DoorOpen className="w-5 h-5" />,
      breadKind: 'bagel',
      breadName: 'เบเกิลอบหอมกรุ่น',
      requiresAuth: false,
    },
    {
      id: 'maintenance',
      label: t.maintenanceTracking,
      icon: <Wrench className="w-5 h-5" />,
      breadKind: 'pretzel',
      breadName: 'เพรทเซลอบเกลือ',
      requiresAuth: true,
    },
    {
      id: 'schedule',
      label: t.workSchedule,
      icon: <CalendarDays className="w-5 h-5" />,
      breadKind: 'baguette',
      breadName: 'บาแกตต์กรอบนอกนุ่มใน',
      requiresAuth: true,
    },
    {
      id: 'ot',
      label: t.otCheck,
      icon: <Clock className="w-5 h-5" />,
      breadKind: 'donut',
      breadName: 'โดนัทหวานกรอบ',
      requiresAuth: true,
    },
    {
      id: 'payslip',
      label: t.payslip,
      icon: <CreditCard className="w-5 h-5" />,
      breadKind: 'farmhouse',
      breadName: 'ขนมปังฟาร์มเฮ้าส์',
      requiresAuth: true,
      isExternal: true,
      url: 'https://epay.pbplc.co.th/',
    },
    {
      id: 'equipment',
      label: t.equipmentRequisition,
      icon: <PackageCheck className="w-5 h-5" />,
      breadKind: 'bun',
      breadName: 'บันกลมเนื้อนุ่ม',
      requiresAuth: true,
    },
    {
      id: 'chlorine',
      label: t.chlorineCheck,
      icon: <FlaskConical className="w-5 h-5" />,
      breadKind: 'loaf',
      breadName: 'ขนมปังแถวอบหอม',
      requiresAuth: true,
    },
  ];

  const visibleNavItems = useMemo(() => {
    if (isAuthenticated) {
      return navItems;
    }
    // General users can only view Laundry and Meeting Rooms
    return navItems.filter((item) => !item.requiresAuth);
  }, [isAuthenticated, navItems]);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar Container - Animated Rainbow Background with Floating Bakery Items */}
      <aside
        className={`fixed left-0 top-0 h-screen w-[280px] animated-rainbow-sidebar border-r border-white/20 shadow-2xl flex flex-col z-50 transition-transform duration-300 ease-in-out md:translate-x-0 overflow-hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Soft Glass Tint Overlay for High Contrast & Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-[#0a1128]/45 to-black/60 backdrop-blur-[2px] pointer-events-none z-0" />

        {/* Ambient Floating Bread Particles across the Rainbow Sky */}
        <FloatingBreadParticles />

        {/* Foreground Content with Relative Positioning */}
        <div className="relative z-10 flex flex-col h-full py-4 select-none">
          {/* Brand Header Box - Compact & Refined */}
          <div className="px-3.5 mb-3.5 flex items-center justify-between gap-2">
            <div 
              className="flex-1 flex items-center gap-2.5 p-2 rounded-xl bg-black/25 hover:bg-black/35 border border-white/15 backdrop-blur-md cursor-pointer group transition-all duration-200 shadow-sm min-w-0"
              onClick={() => {
                if (!isAuthenticated) {
                  onSelectTab('laundry');
                } else {
                  onSelectTab('dashboard');
                }
                onCloseMobile();
              }}
            >
              {/* Rotating Avatar Face Icon Container */}
              <div className="relative shrink-0 flex items-center justify-center group-hover:scale-105 transition-all duration-300">
                <RotatingAvatar size={34} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-[13px] sm:text-sm font-bold text-white tracking-tight leading-tight drop-shadow-md truncate" title={t.appName}>
                  {t.appName}
                </h1>
              </div>
            </div>

            {/* Close button on mobile */}
            <button 
              onClick={onCloseMobile}
              className="md:hidden text-white/80 hover:text-white p-2 rounded-xl bg-black/25 hover:bg-black/40 border border-white/15 cursor-pointer transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links with Bread Partner Icons */}
          <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
            {visibleNavItems.map((item) => {
              const isActive = currentTab === item.id;
              const isHovered = activeBreadHover === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.isExternal && item.url) {
                      window.open(item.url, '_blank', 'noopener,noreferrer');
                    } else if (item.id === 'settings' && onOpenSettings) {
                      onOpenSettings();
                    } else {
                      onSelectTab(item.id);
                    }
                    onCloseMobile();
                  }}
                  onMouseEnter={() => setActiveBreadHover(item.id)}
                  onMouseLeave={() => setActiveBreadHover(null)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 group cursor-pointer backdrop-blur-md border ${
                    isActive
                      ? 'text-white bg-white/25 border-white/40 shadow-md font-bold pl-3.5 scale-[1.01]'
                      : 'text-white/85 hover:text-white bg-black/20 hover:bg-white/15 border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span 
                      className={`p-1.5 rounded-lg transition-all duration-300 ${
                        isActive 
                          ? 'bg-white/30 text-white shadow-xs scale-105' 
                          : 'bg-black/30 text-white/90 group-hover:bg-white/20 group-hover:scale-105'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="tracking-wide drop-shadow-xs font-semibold truncate">{item.label}</span>
                    </div>
                  </div>

                  {/* Distinct Animated Bread Icon for each navigation tab */}
                  <div 
                    className={`transition-all duration-300 transform flex items-center justify-center shrink-0 ${
                      isActive 
                        ? 'scale-115 rotate-6 animate-bread-bob' 
                        : isHovered 
                        ? 'scale-115 -rotate-12 animate-bread-wobble' 
                        : 'scale-95 opacity-90 group-hover:scale-105'
                    }`}
                    title={item.breadName}
                  >
                    <BreadIcon kind={item.breadKind} size={20} />
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};


