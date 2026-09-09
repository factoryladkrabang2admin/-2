import React from 'react';
import { CalendarCheck, Briefcase, Plane, Sparkles } from 'lucide-react';

interface ScheduleIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  iconClassName?: string;
}

const sizeMap = {
  xs: { box: 'w-3.5 h-3.5', icon: 'w-2.5 h-2.5', sub: 'w-1.5 h-1.5' },
  sm: { box: 'w-4 h-4', icon: 'w-3.5 h-3.5', sub: 'w-2 h-2' },
  md: { box: 'w-5 h-5', icon: 'w-4 h-4', sub: 'w-2.5 h-2.5' },
  lg: { box: 'w-6 h-6', icon: 'w-5 h-5', sub: 'w-3 h-3' },
  xl: { box: 'w-8 h-8', icon: 'w-6 h-6', sub: 'w-3.5 h-3.5' }
};

/**
 * 1. สถานะไอคอน "จำนวนวันทำงาน" (Working Staff / Days On Duty)
 * เคลื่อนไหวน็อดผงกรับงานอย่างคล่องแคล่ว (animate-calendar-duty)
 */
export const WorkingDaysAnimatedIcon: React.FC<ScheduleIconProps & { showSparkle?: boolean }> = ({
  size = 'md',
  className = '',
  iconClassName = '',
  showSparkle = false
}) => {
  const s = sizeMap[size];
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${s.box} ${className}`}>
      <CalendarCheck className={`${s.icon} animate-calendar-duty ${iconClassName}`} />
      {showSparkle && (
        <Sparkles className={`absolute -top-1 -right-1 ${s.sub} text-emerald-400 animate-sparkle-glint`} />
      )}
    </div>
  );
};

/**
 * 2. สถานะไอคอน "พนักงานในระบบ" (Staff Count / Active Personnel)
 * เคลื่อนไหวกระเป๋าทำงาน/บุคลากรขยับเป็นจังหวะกระฉับกระเฉง (animate-staff-bob)
 */
export const StaffCountAnimatedIcon: React.FC<ScheduleIconProps> = ({
  size = 'md',
  className = '',
  iconClassName = ''
}) => {
  const s = sizeMap[size];
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${s.box} ${className}`}>
      <Briefcase className={`${s.icon} animate-staff-bob ${iconClassName}`} />
    </div>
  );
};

/**
 * 3. สถานะไอคอน "ลา / หยุด" (Leave / Off Duty)
 * เคลื่อนไหวเครื่องบินร่อนเหินฟ้าอย่างนุ่มนวล (animate-plane-glide)
 */
export const LeaveOffAnimatedIcon: React.FC<ScheduleIconProps> = ({
  size = 'md',
  className = '',
  iconClassName = ''
}) => {
  const s = sizeMap[size];
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${s.box} ${className}`}>
      <Plane className={`${s.icon} animate-plane-glide ${iconClassName}`} />
    </div>
  );
};
