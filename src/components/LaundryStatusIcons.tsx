import React from 'react';
import { WashingMachine, CheckCircle2, Sparkles } from 'lucide-react';

interface StatusIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  iconClassName?: string;
  showSparkle?: boolean;
}

/**
 * Animated Washing Machine Icon representing "อยู่ระหว่างซัก" (actively washing clothes)
 * Features mechanical agitation rumble and active spinning drum cycle inside the door window
 */
export const WashingMachineActiveIcon: React.FC<StatusIconProps> = ({
  size = 'sm',
  className = '',
  iconClassName = '',
}) => {
  if (size === 'xs') {
    return (
      <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <WashingMachine className={`w-3 h-3 animate-washing-machine shrink-0 ${iconClassName}`} />
        <span className="absolute top-[54%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full border-[1px] border-current border-t-transparent animate-washing-drum block opacity-80" />
        </span>
      </span>
    );
  }

  if (size === 'md') {
    return (
      <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <WashingMachine className={`w-5 h-5 animate-washing-machine shrink-0 ${iconClassName}`} />
        <span className="absolute top-[54%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-current border-t-transparent animate-washing-drum block opacity-85" />
        </span>
        <span className="absolute -top-1 -right-1 flex h-2 w-2 pointer-events-none">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
      </span>
    );
  }

  if (size === 'lg') {
    return (
      <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <WashingMachine className={`w-6 h-6 animate-washing-machine shrink-0 ${iconClassName}`} />
        <span className="absolute top-[54%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-washing-drum block opacity-85" />
        </span>
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
        </span>
      </span>
    );
  }

  // Default 'sm' (for table rows, pills, badges)
  return (
    <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <WashingMachine className={`w-3.5 h-3.5 animate-washing-machine shrink-0 ${iconClassName}`} />
      <span className="absolute top-[54%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <span className="w-2 h-2 rounded-full border-[1.5px] border-current border-t-transparent animate-washing-drum block opacity-80" />
      </span>
    </span>
  );
};

/**
 * Animated Ready / Washed Icon representing "ซักเสร็จแล้ว"
 * Features celebratory spring bounce and glistening sparkle
 */
export const ReadyStatusAnimatedIcon: React.FC<StatusIconProps> = ({
  size = 'sm',
  className = '',
  iconClassName = '',
  showSparkle = true,
}) => {
  if (size === 'xs') {
    return (
      <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <CheckCircle2 className={`w-3 h-3 animate-ready-bounce shrink-0 ${iconClassName}`} />
        {showSparkle && (
          <Sparkles className="w-1.5 h-1.5 text-emerald-400 absolute -top-0.5 -right-0.5 animate-sparkle-glint pointer-events-none" />
        )}
      </span>
    );
  }

  if (size === 'md') {
    return (
      <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <CheckCircle2 className={`w-5 h-5 animate-ready-bounce shrink-0 ${iconClassName}`} />
        {showSparkle && (
          <Sparkles className="w-3 h-3 text-emerald-300 absolute -top-1.5 -right-1.5 animate-sparkle-glint pointer-events-none" />
        )}
      </span>
    );
  }

  if (size === 'lg') {
    return (
      <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <CheckCircle2 className={`w-6 h-6 animate-ready-bounce shrink-0 ${iconClassName}`} />
        {showSparkle && (
          <Sparkles className="w-3.5 h-3.5 text-emerald-300 absolute -top-2 -right-2 animate-sparkle-glint pointer-events-none" />
        )}
      </span>
    );
  }

  // Default 'sm' (for table rows, pills, badges)
  return (
    <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <CheckCircle2 className={`w-3.5 h-3.5 animate-ready-bounce shrink-0 ${iconClassName}`} />
      {showSparkle && (
        <Sparkles className="w-2 h-2 text-emerald-400 absolute -top-1 -right-1 animate-sparkle-glint pointer-events-none" />
      )}
    </span>
  );
};
