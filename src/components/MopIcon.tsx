import React from 'react';

export interface MopIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  strokeWidth?: number | string;
}

/**
 * Mop Icon (ไอคอนไม้ถูพื้น)
 * Designed on a 24x24 grid with crisp lines matching Lucide icon specifications.
 */
export const Mop: React.FC<MopIconProps> = ({
  size = 24,
  className = '',
  strokeWidth = 2,
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Handle pole */}
      <path d="M12 2v9.5" />
      {/* Handle top grip */}
      <circle cx="12" cy="2.5" r="0.75" fill="currentColor" />
      {/* Clamp collar */}
      <rect x="9" y="10" width="6" height="2" rx="0.5" />
      {/* Base holder block */}
      <path d="M7 12.5h10l-1 2.5H8l-1-2.5z" />
      {/* Mop cloth strands */}
      <path d="M7.5 15c-.4 2-.8 3.8-.8 5.5a1.3 1.3 0 0 0 2.6 0c0-1.5.4-3.5.7-5.5" />
      <path d="M10.5 15c-.2 2-.4 3.8-.4 5.5a1.3 1.3 0 0 0 2.6 0c0-1.5.2-3.5.4-5.5" />
      <path d="M13.5 15c.2 2 .4 3.8.4 5.5a1.3 1.3 0 0 0 2.6 0c0-1.7-.4-3.7-.8-5.5" />
    </svg>
  );
};

export default Mop;
