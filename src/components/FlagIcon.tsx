import React from 'react';
import { Language } from '../contexts/LanguageContext';

interface FlagIconProps {
  code: Language | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showCode?: boolean;
}

export const FlagIcon: React.FC<FlagIconProps> = ({ 
  code, 
  size = 'md', 
  className = '',
  showCode = false 
}) => {
  const normalizedCode = (code || 'th').toLowerCase() as Language;

  // Sizing definitions
  const dimensions = {
    xs: { width: 18, height: 12, box: 'w-[18px] h-[12px]' },
    sm: { width: 22, height: 15, box: 'w-[22px] h-[15px]' },
    md: { width: 28, height: 19, box: 'w-[28px] h-[19px]' },
    lg: { width: 36, height: 24, box: 'w-[36px] h-[24px]' },
    xl: { width: 48, height: 32, box: 'w-[48px] h-[32px]' },
  }[size] || { width: 28, height: 19, box: 'w-[28px] h-[19px]' };

  const renderSvgFlag = () => {
    switch (normalizedCode) {
      case 'th': // Thailand 🇹🇭 (Red - White - Blue - White - Red)
        return (
          <svg viewBox="0 0 900 600" className="w-full h-full object-cover">
            <rect width="900" height="600" fill="#ED1C24" />
            <rect y="100" width="900" height="400" fill="#FFFFFF" />
            <rect y="200" width="900" height="200" fill="#241D4F" />
          </svg>
        );

      case 'en': // United States / English 🇺🇸 (Red/White Stripes + Blue Canton with Star Grid)
      default:
        return (
          <svg viewBox="0 0 900 600" className="w-full h-full object-cover">
            <rect width="900" height="600" fill="#B22234" />
            <rect y="46" width="900" height="46" fill="#FFFFFF" />
            <rect y="138" width="900" height="46" fill="#FFFFFF" />
            <rect y="230" width="900" height="46" fill="#FFFFFF" />
            <rect y="322" width="900" height="46" fill="#FFFFFF" />
            <rect y="414" width="900" height="46" fill="#FFFFFF" />
            <rect y="506" width="900" height="46" fill="#FFFFFF" />
            {/* Blue Canton */}
            <rect width="380" height="322" fill="#3C3B6E" />
            {/* Stylized White Stars Grid */}
            <g fill="#FFFFFF">
              <circle cx="50" cy="40" r="10" />
              <circle cx="120" cy="40" r="10" />
              <circle cx="190" cy="40" r="10" />
              <circle cx="260" cy="40" r="10" />
              <circle cx="330" cy="40" r="10" />

              <circle cx="85" cy="85" r="10" />
              <circle cx="155" cy="85" r="10" />
              <circle cx="225" cy="85" r="10" />
              <circle cx="295" cy="85" r="10" />

              <circle cx="50" cy="130" r="10" />
              <circle cx="120" cy="130" r="10" />
              <circle cx="190" cy="130" r="10" />
              <circle cx="260" cy="130" r="10" />
              <circle cx="330" cy="130" r="10" />

              <circle cx="85" cy="175" r="10" />
              <circle cx="155" cy="175" r="10" />
              <circle cx="225" cy="175" r="10" />
              <circle cx="295" cy="175" r="10" />

              <circle cx="50" cy="220" r="10" />
              <circle cx="120" cy="220" r="10" />
              <circle cx="190" cy="220" r="10" />
              <circle cx="260" cy="220" r="10" />
              <circle cx="330" cy="220" r="10" />

              <circle cx="85" cy="265" r="10" />
              <circle cx="155" cy="265" r="10" />
              <circle cx="225" cy="265" r="10" />
              <circle cx="295" cy="265" r="10" />
            </g>
          </svg>
        );
    }
  };

  const getCodeText = () => {
    switch (normalizedCode) {
      case 'th': return 'TH';
      case 'en': return 'EN';
      default: return 'TH';
    }
  };

  return (
    <div className={`inline-flex items-center shrink-0 ${className}`}>
      <div 
        className={`relative overflow-hidden rounded-[4px] border border-black/15 shadow-2xs bg-white shrink-0 flex items-center justify-center ${dimensions.box}`}
        style={{ aspectRatio: '3/2' }}
      >
        {renderSvgFlag()}
      </div>
      {showCode && (
        <span className="ml-1.5 font-extrabold text-[10px] tracking-wider text-[#002045] bg-[#f0f4f9] px-1.5 py-0.5 rounded border border-[#d8e2ee]">
          {getCodeText()}
        </span>
      )}
    </div>
  );
};
