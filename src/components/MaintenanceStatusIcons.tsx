import React from 'react';
import { Layers, Wrench, CheckCircle2, Sparkles, Settings2 } from 'lucide-react';

interface IconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  iconClassName?: string;
}

const sizeMap = {
  xs: { box: 'w-3.5 h-3.5', icon: 'w-2.5 h-2.5', sub: 'w-1.5 h-1.5' },
  sm: { box: 'w-4 h-4', icon: 'w-3.5 h-3.5', sub: 'w-2 h-2' },
  md: { box: 'w-5 h-5', icon: 'w-4 h-4', sub: 'w-2.5 h-2.5' },
  lg: { box: 'w-7 h-7', icon: 'w-5 h-5', sub: 'w-3 h-3' },
  xl: { box: 'w-9 h-9', icon: 'w-6 h-6', sub: 'w-3.5 h-3.5' }
};

/**
 * 1. สถานะไอคอน "ใบแจ้งงานทั้งหมด" (Total Work Orders)
 * เคลื่อนไหวลอยขึ้นลงเป็นจังหวะหายใจอย่างสง่างาม (animate-layers-pulse)
 */
export const AllTicketsAnimatedIcon: React.FC<IconProps> = ({
  size = 'md',
  className = '',
  iconClassName = ''
}) => {
  const s = sizeMap[size];
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${s.box} ${className}`}>
      <Layers className={`${s.icon} animate-layers-pulse ${iconClassName}`} />
    </div>
  );
};

/**
 * 2. สถานะไอคอน "แจ้งใหม่ / รอดำเนินการ" (New / Pending / Repair in Action)
 * เคลื่อนไหวประแจกำลังขันซ่อมบำรุงอย่างคล่องแคล่ว (animate-wrench-repair)
 * พร้อมเฟืองกลไกหมุนคลอเบาๆ (animate-repair-gear) สื่อถึงการกำลังเข้าซ่อม
 */
export const RepairingActiveIcon: React.FC<IconProps & { showGear?: boolean }> = ({
  size = 'md',
  className = '',
  iconClassName = '',
  showGear = false
}) => {
  const s = sizeMap[size];
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${s.box} ${className}`}>
      {showGear && (
        <Settings2 className={`absolute -top-0.5 -right-0.5 ${s.sub} opacity-40 animate-repair-gear text-amber-600`} />
      )}
      <Wrench className={`${s.icon} animate-wrench-repair ${iconClassName}`} />
    </div>
  );
};

/**
 * 3. สถานะไอคอน "เสร็จแล้ว / ปิดงาน" (Completed / Closed)
 * เคลื่อนไหวเด้งฉลองความสำเร็จ (animate-ready-bounce) พร้อมประกายแสง (animate-sparkle-glint)
 */
export const CompletedRepairAnimatedIcon: React.FC<IconProps & { showSparkle?: boolean }> = ({
  size = 'md',
  className = '',
  iconClassName = '',
  showSparkle = false
}) => {
  const s = sizeMap[size];
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${s.box} ${className}`}>
      <CheckCircle2 className={`${s.icon} animate-ready-bounce ${iconClassName}`} />
      {showSparkle && (
        <Sparkles className={`absolute -top-1 -right-1 ${s.sub} text-emerald-400 animate-sparkle-glint`} />
      )}
    </div>
  );
};

/**
 * 4. สถานะไอคอน "อยู่ระหว่างดำเนินการ" (In Progress / Active Clock)
 * เคลื่อนไหวเข็มนาฬิกาหมุนบอกเวลาอย่างคล่องแคล่ว (animate-clock-sweep)
 * พร้อมตัวเรือนนาฬิกาขยับเต้นเป็นจังหวะมีชีวิตชีวา (animate-clock-tick)
 */
export const InProgressClockAnimatedIcon: React.FC<IconProps> = ({
  size = 'md',
  className = '',
  iconClassName = ''
}) => {
  const s = sizeMap[size];
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${s.box} ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${s.icon} animate-clock-tick ${iconClassName}`}
      >
        <circle cx="12" cy="12" r="10" />
        {/* Hour hand */}
        <polyline points="12 12 16 14" strokeWidth="2" strokeLinecap="round" />
        {/* Animated sweeping minute hand rotating around center (12, 12) */}
        <line
          x1="12"
          y1="12"
          x2="12"
          y2="6"
          strokeWidth="2"
          strokeLinecap="round"
          className="animate-clock-sweep"
          style={{ transformOrigin: '12px 12px' }}
        />
      </svg>
    </div>
  );
};
