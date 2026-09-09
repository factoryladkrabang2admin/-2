import React from 'react';
import { Layers, TrendingUp, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

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
 * 1. สถานะไอคอน "รายการ OT ที่แสดง" (OT Records Displayed)
 * เลเยอร์เอกสารลอยยกตัวอย่างนุ่มนวลเป็นจังหวะ (animate-ot-records-float)
 */
export const OtRecordsAnimatedIcon: React.FC<IconProps> = ({
  size = 'md',
  className = '',
  iconClassName = ''
}) => {
  const s = sizeMap[size];
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${s.box} ${className}`}>
      <Layers className={`${s.icon} animate-ot-records-float ${iconClassName}`} />
    </div>
  );
};

/**
 * 2. สถานะไอคอน "ชั่วโมง OT รวม" (Total OT Hours)
 * พุ่งทะยานเติบโตและชีพจรมีชีวิตชีวา (animate-ot-hours-surge)
 */
export const OtHoursAnimatedIcon: React.FC<IconProps & { showSparkle?: boolean }> = ({
  size = 'md',
  className = '',
  iconClassName = '',
  showSparkle = false
}) => {
  const s = sizeMap[size];
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${s.box} ${className}`}>
      <TrendingUp className={`${s.icon} animate-ot-hours-surge ${iconClassName}`} />
      {showSparkle && (
        <Sparkles className={`absolute -top-1 -right-1 ${s.sub} text-emerald-500 animate-sparkle-glint`} />
      )}
    </div>
  );
};

/**
 * 3. สถานะไอคอน "อนุมัติแล้ว (Approved)"
 * เคลื่อนไหวเด้งฉลองอนุมัติอย่างสดใส (animate-ot-approved-pop) พร้อมประกายแสง
 */
export const OtApprovedAnimatedIcon: React.FC<IconProps & { showSparkle?: boolean }> = ({
  size = 'md',
  className = '',
  iconClassName = '',
  showSparkle = true
}) => {
  const s = sizeMap[size];
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${s.box} ${className}`}>
      <CheckCircle2 className={`${s.icon} animate-ot-approved-pop ${iconClassName}`} />
      {showSparkle && (
        <Sparkles className={`absolute -top-1 -right-1 ${s.sub} text-emerald-400 animate-sparkle-glint`} />
      )}
    </div>
  );
};

/**
 * 4. สถานะไอคอน "รอยืนยัน (Confirm)"
 * เคลื่อนไหวแกว่งเตือนอย่างมีชีวิตชีวา (animate-ot-confirm-sway) สื่อถึงการรอดำเนินการตรวจสอบ
 */
export const OtConfirmAnimatedIcon: React.FC<IconProps> = ({
  size = 'md',
  className = '',
  iconClassName = ''
}) => {
  const s = sizeMap[size];
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${s.box} ${className}`}>
      <AlertCircle className={`${s.icon} animate-ot-confirm-sway ${iconClassName}`} />
    </div>
  );
};
