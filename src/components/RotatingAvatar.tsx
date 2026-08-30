import React, { useState, useEffect } from 'react';

// Diverse set of stylized avatar face icons for factory & office team members
const AVATAR_FACES = [
  // 1. Female Admin Officer with stylish bun & cheerful smile
  {
    id: 'admin_female_1',
    name: 'เจ้าหน้าที่ธุรการ',
    bg: 'from-amber-400 via-rose-400 to-pink-500',
    render: () => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm">
        {/* Hair Back */}
        <circle cx="32" cy="18" r="10" fill="#4A2810" />
        <circle cx="32" cy="12" r="6" fill="#6B3A1A" />
        {/* Body / Shoulders */}
        <path d="M16 54C16 44 23 40 32 40C41 40 48 44 48 54V58H16V54Z" fill="#3B82F6" />
        <path d="M26 40L32 47L38 40H26Z" fill="#F8FAFC" />
        {/* Neck */}
        <rect x="28" y="34" width="8" height="8" rx="2" fill="#FCD34D" />
        {/* Face */}
        <ellipse cx="32" cy="28" rx="13" ry="14" fill="#FDE68A" />
        {/* Bangs / Front Hair */}
        <path d="M19 24C22 18 30 16 38 18C42 19 45 22 45 25C43 21 37 20 32 20C25 20 21 22 19 24Z" fill="#6B3A1A" />
        {/* Eyes */}
        <ellipse cx="26" cy="27" rx="2" ry="2.5" fill="#1E293B" />
        <ellipse cx="38" cy="27" rx="2" ry="2.5" fill="#1E293B" />
        <circle cx="27" cy="26" r="0.8" fill="#FFFFFF" />
        <circle cx="39" cy="26" r="0.8" fill="#FFFFFF" />
        {/* Cheerful Blush */}
        <circle cx="23" cy="31" r="2.5" fill="#FB7185" opacity="0.6" />
        <circle cx="41" cy="31" r="2.5" fill="#FB7185" opacity="0.6" />
        {/* Happy Smile */}
        <path d="M28 32C29 35 35 35 36 32" stroke="#B45309" strokeWidth="1.8" strokeLinecap="round" />
        {/* Cute Glasses */}
        <circle cx="26" cy="27" r="4.5" stroke="#E11D48" strokeWidth="1.5" fill="none" />
        <circle cx="38" cy="27" r="4.5" stroke="#E11D48" strokeWidth="1.5" fill="none" />
        <path d="M30.5 27H33.5" stroke="#E11D48" strokeWidth="1.5" />
      </svg>
    ),
  },

  // 2. Male Supervisor / Leader with styled hair & necktie
  {
    id: 'supervisor_male',
    name: 'หัวหน้างาน',
    bg: 'from-blue-500 via-indigo-500 to-purple-600',
    render: () => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm">
        {/* Hair Back */}
        <ellipse cx="32" cy="22" rx="15" ry="14" fill="#1E293B" />
        {/* Body / Suit */}
        <path d="M15 54C15 43 22 39 32 39C42 39 49 43 49 54V58H15V54Z" fill="#1E3A8A" />
        {/* White Shirt Collar */}
        <path d="M26 39L32 46L38 39H26Z" fill="#FFFFFF" />
        {/* Red Necktie */}
        <path d="M31 43L33 43L34 52L32 55L30 52L31 43Z" fill="#DC2626" />
        {/* Neck */}
        <rect x="28" y="33" width="8" height="8" rx="2" fill="#FBBF24" />
        {/* Face */}
        <ellipse cx="32" cy="27" rx="13" ry="13.5" fill="#FED7AA" />
        {/* Stylish Modern Quiff Hair */}
        <path d="M19 22C21 13 31 12 37 13C43 14 46 19 45 24C41 18 33 16 27 18C22 20 20 22 19 22Z" fill="#334155" />
        {/* Eyebrows */}
        <path d="M24 22C26 21 28 22 29 23" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M35 23C36 22 38 21 40 22" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />
        {/* Eyes (Confidence/Wink) */}
        <ellipse cx="26" cy="26" rx="2" ry="2.2" fill="#1E293B" />
        <path d="M36 26C38 24.5 40 26 40 26" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
        <circle cx="27" cy="25.5" r="0.7" fill="#FFFFFF" />
        {/* Bright Confident Smile */}
        <path d="M28 32C29.5 35 34.5 35 36 32" stroke="#9A3412" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },

  // 3. Female Production Specialist / Inspector with Safety Visor & Ponytail
  {
    id: 'inspector_female',
    name: 'ฝ่ายปฏิบัติการ/ตรวจสอบ',
    bg: 'from-emerald-400 via-teal-500 to-cyan-600',
    render: () => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm">
        {/* Ponytail Hair */}
        <path d="M42 22C48 20 53 26 50 34C48 30 45 28 42 26V22Z" fill="#78350F" />
        <ellipse cx="32" cy="22" rx="14" ry="13" fill="#92400E" />
        {/* Uniform */}
        <path d="M16 54C16 43 23 39 32 39C41 39 48 43 48 54V58H16V54Z" fill="#059669" />
        <path d="M27 39L32 45L37 39H27Z" fill="#E6FFFA" />
        {/* Neck */}
        <rect x="28" y="33" width="8" height="8" rx="2" fill="#FDE68A" />
        {/* Face */}
        <ellipse cx="32" cy="27" rx="12.5" ry="13.5" fill="#FEF08A" />
        {/* Clean Bangs */}
        <path d="M20 22C24 17 32 17 44 22C41 18 35 17 29 18C24 19 21 21 20 22Z" fill="#78350F" />
        {/* Headset / Safety Mic */}
        <path d="M19 26C19 19 25 14 32 14C39 14 45 19 45 26" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
        <rect x="17" y="24" width="4" height="7" rx="2" fill="#0284C7" />
        <rect x="43" y="24" width="4" height="7" rx="2" fill="#0284C7" />
        <path d="M43 29C41 35 36 36 34 36" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="33" cy="36" r="1.5" fill="#EF4444" />
        {/* Eyes */}
        <ellipse cx="27" cy="26" rx="2" ry="2.5" fill="#0F172A" />
        <ellipse cx="37" cy="26" rx="2" ry="2.5" fill="#0F172A" />
        <circle cx="28" cy="25" r="0.8" fill="#FFFFFF" />
        <circle cx="38" cy="25" r="0.8" fill="#FFFFFF" />
        {/* Rosy Cheeks */}
        <circle cx="23" cy="30" r="2.5" fill="#F43F5E" opacity="0.5" />
        <circle cx="41" cy="30" r="2.5" fill="#F43F5E" opacity="0.5" />
        {/* Radiant Smile */}
        <path d="M28 32C29.5 35.5 34.5 35.5 36 32" stroke="#A16207" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },

  // 4. Male Maintenance Engineer with Safety Helmet
  {
    id: 'engineer_male',
    name: 'ช่างเทคนิค/ซ่อมบำรุง',
    bg: 'from-amber-500 via-orange-500 to-red-500',
    render: () => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm">
        {/* Body / Work Uniform */}
        <path d="M15 54C15 44 22 40 32 40C42 40 49 44 49 54V58H15V54Z" fill="#EA580C" />
        {/* Hi-Vis Reflective Strip */}
        <path d="M17 49H47" stroke="#FEF08A" strokeWidth="2.5" strokeDasharray="4 2" />
        {/* Neck */}
        <rect x="28" y="34" width="8" height="8" rx="2" fill="#FCD34D" />
        {/* Face */}
        <ellipse cx="32" cy="29" rx="12.5" ry="13" fill="#FDE68A" />
        {/* Big Yellow Safety Hard Hat */}
        <path d="M18 24C18 14 24 10 32 10C40 10 46 14 46 24H18Z" fill="#FACC15" />
        <path d="M15 24C15 22.5 49 22.5 49 24C49 25.5 15 25.5 15 24Z" fill="#EAB308" />
        <rect x="30" y="10" width="4" height="12" rx="1" fill="#CA8A04" />
        {/* Eyes */}
        <ellipse cx="26" cy="28" rx="2" ry="2.2" fill="#1E293B" />
        <ellipse cx="38" cy="28" rx="2" ry="2.2" fill="#1E293B" />
        <circle cx="27" cy="27.5" r="0.7" fill="#FFFFFF" />
        <circle cx="39" cy="27.5" r="0.7" fill="#FFFFFF" />
        {/* Friendly Mustache & Big Grin */}
        <path d="M28 32C29.5 35 34.5 35 36 32" stroke="#9A3412" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },

  // 5. Friendly Female Office Coordinator with Wavy Hair & Pearls
  {
    id: 'coordinator_female',
    name: 'ผู้ประสานงานสำนักงาน',
    bg: 'from-fuchsia-500 via-pink-500 to-rose-500',
    render: () => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm">
        {/* Wavy Hair */}
        <circle cx="20" cy="28" r="8" fill="#581C87" />
        <circle cx="44" cy="28" r="8" fill="#581C87" />
        <circle cx="32" cy="20" r="14" fill="#6B21A8" />
        {/* Body */}
        <path d="M16 54C16 43 23 39 32 39C41 39 48 43 48 54V58H16V54Z" fill="#9333EA" />
        {/* Pearl Necklace */}
        <circle cx="28" cy="41" r="1.5" fill="#FFFFFF" />
        <circle cx="32" cy="42" r="1.8" fill="#FFFFFF" />
        <circle cx="36" cy="41" r="1.5" fill="#FFFFFF" />
        {/* Neck */}
        <rect x="28" y="33" width="8" height="8" rx="2" fill="#FED7AA" />
        {/* Face */}
        <ellipse cx="32" cy="27" rx="12.5" ry="13.5" fill="#FFEDD5" />
        {/* Bangs */}
        <path d="M21 21C26 16 38 16 43 21C39 18 34 17 29 18C25 19 22 20 21 21Z" fill="#581C87" />
        {/* Cute Pearl Earrings */}
        <circle cx="19" cy="28" r="2" fill="#FFFFFF" />
        <circle cx="45" cy="28" r="2" fill="#FFFFFF" />
        {/* Eyes */}
        <ellipse cx="26" cy="26" rx="2.2" ry="2.8" fill="#18181B" />
        <ellipse cx="38" cy="26" rx="2.2" ry="2.8" fill="#18181B" />
        <circle cx="27" cy="25" r="0.9" fill="#FFFFFF" />
        <circle cx="39" cy="25" r="0.9" fill="#FFFFFF" />
        {/* Soft Blushes */}
        <circle cx="23" cy="30" r="2.5" fill="#F472B6" opacity="0.6" />
        <circle cx="41" cy="30" r="2.5" fill="#F472B6" opacity="0.6" />
        {/* Warm Smiling Mouth */}
        <path d="M27.5 32C29.5 35.5 34.5 35.5 36.5 32" stroke="#BE185D" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },

  // 6. Energetic Male Operations Staff with Cap & Headband
  {
    id: 'staff_male_cap',
    name: 'เจ้าหน้าที่ประสานงาน OT',
    bg: 'from-cyan-500 via-sky-500 to-blue-600',
    render: () => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm">
        {/* Body */}
        <path d="M15 54C15 44 22 40 32 40C42 40 49 44 49 54V58H15V54Z" fill="#0284C7" />
        <path d="M27 40L32 46L37 40H27Z" fill="#E0F2FE" />
        {/* Neck */}
        <rect x="28" y="34" width="8" height="8" rx="2" fill="#FDE68A" />
        {/* Face */}
        <ellipse cx="32" cy="29" rx="12.5" ry="13" fill="#FEF08A" />
        {/* Sporty Baseball Cap */}
        <path d="M19 23C19 14 25 12 32 12C39 12 45 14 45 23H19Z" fill="#1E40AF" />
        <path d="M16 23C16 21 44 21 48 24C44 25 20 25 16 23Z" fill="#3B82F6" />
        <circle cx="32" cy="12" r="1.5" fill="#60A5FA" />
        {/* Eyes */}
        <ellipse cx="26" cy="28" rx="2" ry="2.4" fill="#0F172A" />
        <ellipse cx="38" cy="28" rx="2" ry="2.4" fill="#0F172A" />
        <circle cx="27" cy="27" r="0.8" fill="#FFFFFF" />
        <circle cx="39" cy="27" r="0.8" fill="#FFFFFF" />
        {/* Enthusiastic Open Smile */}
        <path d="M28 32C28.5 36 35.5 36 36 32H28Z" fill="#DC2626" />
        <path d="M29 32H35" stroke="#FFFFFF" strokeWidth="1.5" />
      </svg>
    ),
  },

  // 7. Cheerful Lady with Bob Haircut & Glasses
  {
    id: 'admin_female_bob',
    name: 'เจ้าหน้าที่ธุรการ/บัญชี',
    bg: 'from-violet-500 via-purple-500 to-indigo-600',
    render: () => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm">
        {/* Bob Cut Hair Back & Sides */}
        <path d="M17 26C17 16 24 12 32 12C40 12 47 16 47 26V36C47 38 44 40 43 36C42 32 44 26 44 26C42 20 37 18 32 18C27 18 22 20 20 26C20 26 22 32 21 36C20 40 17 38 17 36V26Z" fill="#292524" />
        {/* Body */}
        <path d="M16 54C16 44 23 40 32 40C41 40 48 44 48 54V58H16V54Z" fill="#7C3AED" />
        {/* Neck */}
        <rect x="28" y="34" width="8" height="8" rx="2" fill="#FED7AA" />
        {/* Face */}
        <ellipse cx="32" cy="28" rx="12.5" ry="13.5" fill="#FFEDD5" />
        {/* Bangs */}
        <path d="M20 22C24 18 32 18 44 22C40 19 35 18 31 18C26 18 22 19 20 22Z" fill="#44403C" />
        {/* Trendy Round Glasses */}
        <circle cx="26" cy="27" r="4.5" stroke="#059669" strokeWidth="1.6" fill="none" />
        <circle cx="38" cy="27" r="4.5" stroke="#059669" strokeWidth="1.6" fill="none" />
        <path d="M30.5 27H33.5" stroke="#059669" strokeWidth="1.6" />
        {/* Eyes */}
        <circle cx="26" cy="27" r="1.5" fill="#18181B" />
        <circle cx="38" cy="27" r="1.5" fill="#18181B" />
        {/* Smile */}
        <path d="M28 33C29 35.5 35 35.5 36 33" stroke="#B45309" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },

  // 8. Cheerful Factory Housekeeping & Service Staff
  {
    id: 'service_staff',
    name: 'แม่บ้าน/บริการ',
    bg: 'from-teal-400 via-emerald-500 to-green-600',
    render: () => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-sm">
        {/* Hair with Headscarf/Bandana */}
        <ellipse cx="32" cy="22" rx="14" ry="13" fill="#451A03" />
        <path d="M18 20C18 13 24 10 32 10C40 10 46 13 46 20H18Z" fill="#F43F5E" />
        <path d="M16 20C16 19 48 19 48 21C48 22 16 22 16 20Z" fill="#FB7185" />
        {/* Uniform */}
        <path d="M16 54C16 43 23 39 32 39C41 39 48 43 48 54V58H16V54Z" fill="#0D9488" />
        <path d="M26 39L32 45L38 39H26Z" fill="#CCFBF1" />
        {/* Neck */}
        <rect x="28" y="33" width="8" height="8" rx="2" fill="#FDE68A" />
        {/* Face */}
        <ellipse cx="32" cy="27" rx="12.5" ry="13.5" fill="#FEF08A" />
        {/* Eyes */}
        <ellipse cx="26" cy="26" rx="2" ry="2.3" fill="#1C1917" />
        <ellipse cx="38" cy="26" rx="2" ry="2.3" fill="#1C1917" />
        <circle cx="27" cy="25.5" r="0.8" fill="#FFFFFF" />
        <circle cx="39" cy="25.5" r="0.8" fill="#FFFFFF" />
        {/* Bright Smile */}
        <path d="M28 32C29.5 35 34.5 35 36 32" stroke="#9A3412" strokeWidth="2" strokeLinecap="round" />
        {/* Rosy Blush */}
        <circle cx="23" cy="29" r="2.5" fill="#FB7185" opacity="0.6" />
        <circle cx="41" cy="29" r="2.5" fill="#FB7185" opacity="0.6" />
      </svg>
    ),
  },
];

interface RotatingAvatarProps {
  size?: number;
  className?: string;
  cycleIntervalMs?: number;
  showSparkle?: boolean;
}

export const RotatingAvatar: React.FC<RotatingAvatarProps> = ({
  size = 44,
  className = '',
  cycleIntervalMs = 2800,
  showSparkle = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      // Trigger 3D flip animation
      setIsFlipping(true);

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % AVATAR_FACES.length);
        setIsFlipping(false);
      }, 350); // half of flip duration to swap face
    }, cycleIntervalMs);

    return () => clearInterval(timer);
  }, [cycleIntervalMs]);

  const currentFace = AVATAR_FACES[currentIndex];

  const handleManualNext = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % AVATAR_FACES.length);
      setIsFlipping(false);
    }, 250);
  };

  return (
    <div
      onClick={handleManualNext}
      className={`relative inline-flex items-center justify-center cursor-pointer select-none group/avatar ${className}`}
      style={{ width: size, height: size }}
      title={`${currentFace.name} (คลิกเพื่อเปลี่ยนใบหน้า)`}
    >
      {/* Outer Glowing Gradient Ring that spins smoothly */}
      <div
        className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500 opacity-80 blur-[2px] group-hover/avatar:opacity-100 group-hover/avatar:scale-105 transition-all duration-300 animate-spin"
        style={{ animationDuration: '8s' }}
      />

      {/* Main Avatar Card with 3D Flip & Pop */}
      <div
        className={`relative w-full h-full rounded-2xl p-1 bg-gradient-to-br ${currentFace.bg} border-2 border-white/80 shadow-lg flex items-center justify-center overflow-hidden transition-all duration-500 transform ${
          isFlipping
            ? 'rotate-y-90 scale-90 opacity-60'
            : 'rotate-y-0 scale-100 opacity-100 group-hover/avatar:scale-105'
        }`}
        style={{
          perspective: '600px',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Soft radial shine */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/30 pointer-events-none" />

        {/* Render Active Avatar Character */}
        <div className="w-full h-full relative z-10 flex items-center justify-center animate-avatar-bounce">
          {currentFace.render()}
        </div>

        {/* Small Active Badge Dot */}
        <div className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white shadow-xs" />
      </div>

      {/* Optional Sparkle / Shine effect */}
      {showSparkle && (
        <span
          className="absolute -top-1 -right-1 text-amber-300 text-xs animate-pulse pointer-events-none drop-shadow-sm"
          style={{ animationDuration: '1.5s' }}
        >
          ✨
        </span>
      )}
    </div>
  );
};
