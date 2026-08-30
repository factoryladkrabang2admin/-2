import React from 'react';

// Bread Type definitions
export type BreadKind = 
  | 'farmhouse'
  | 'croissant' 
  | 'toast' 
  | 'baguette' 
  | 'pretzel' 
  | 'bagel' 
  | 'muffin' 
  | 'donut' 
  | 'bun' 
  | 'loaf';

interface BreadIconProps {
  kind?: BreadKind;
  className?: string;
  size?: number;
  animate?: boolean;
}

// 0. Signature Farmhouse Bread Loaf SVG (ขนมปังฟาร์มเฮ้าส์ แบบแถว/ปอนด์เอกลักษณ์สีแดง-เหลือง-ขาว)
export const FarmhouseBreadIcon: React.FC<{ size?: number; className?: string }> = ({ size = 36, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.25))">
      {/* Bread Loaf Base / Slices Outline */}
      <rect x="10" y="18" width="44" height="36" rx="10" fill="#E65100" />
      
      {/* Loaf Crown & Slices 3D Depth */}
      <path 
        d="M10 28C10 20 16 14 26 14C30 14 31 16 32 16C33 16 34 14 38 14C48 14 54 20 54 28V46C54 51 50 54 44 54H20C14 54 10 51 10 46V28Z" 
        fill="#FF9800" 
      />
      {/* Individual Slice Ridges on top */}
      <path d="M18 15.5V53" stroke="#D84315" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />
      <path d="M26 14V54" stroke="#D84315" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />
      <path d="M34 14V54" stroke="#D84315" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />
      <path d="M42 15.5V53" stroke="#D84315" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />

      {/* Bread Face - Soft Golden Crumb */}
      <path 
        d="M13 29C13 22 18 17 26 17C29 17 30.5 18.5 32 18.5C33.5 18.5 35 17 38 17C46 17 51 22 51 29V45C51 49 48 51 43 51H21C16 51 13 49 13 45V29Z" 
        fill="#FFF3E0" 
      />

      {/* Signature Red Farmhouse Wrapper Banner / Label */}
      <rect x="8" y="27" width="48" height="18" rx="4" fill="#D32F2F" />
      {/* White & Gold Accent Stripes on Wrapper */}
      <rect x="8" y="29" width="48" height="2" fill="#FFEB3B" />
      <rect x="8" y="41" width="48" height="2" fill="#FFFFFF" />

      {/* Little Farmhouse Red Roof Crest / House Emblem */}
      <path d="M32 30L26 35H38L32 30Z" fill="#FFF" />
      <rect x="28.5" y="34.5" width="7" height="6.5" rx="1" fill="#FFEB3B" />
      {/* Farmhouse House Door/Window */}
      <rect x="30.5" y="37" width="3" height="4" fill="#D32F2F" />

      {/* Package Tie / Kwik Lok Clip in Green on top corner */}
      <rect x="44" y="10" width="8" height="8" rx="2" fill="#4CAF50" stroke="#2E7D32" strokeWidth="1" />
      <circle cx="48" cy="14" r="1.5" fill="#FFF" />

      {/* Fresh Wheat Spike on label */}
      <path d="M16 35L19 33M16 37L19 35M16 39L19 37" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M48 35L45 33M48 37L45 35M48 39L45 37" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  </svg>
);

// 1. Croissant SVG (Flaky golden french pastry)
export const CroissantIcon: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g filter="url(#breadShadow)">
      {/* Outer curve */}
      <path 
        d="M12 36C8 30 10 20 18 16C26 12 38 12 46 16C54 20 56 30 52 36C48 42 42 46 32 46C22 46 16 42 12 36Z" 
        fill="#E69535" 
      />
      {/* Main body segments */}
      <path 
        d="M18 34C15 28 17 21 23 18C29 15 35 15 41 18C47 21 49 28 46 34C43 39 38 42 32 42C26 42 21 39 18 34Z" 
        fill="#F6B84C" 
      />
      {/* Center segment bulge */}
      <path 
        d="M24 32C22 26 25 21 29 19C33 17 37 17 40 20C43 23 44 28 41 33C38 37 35 39 31 39C27 39 25 36 24 32Z" 
        fill="#FDD87A" 
      />
      {/* Bread score lines & cuts */}
      <path d="M22 21C26 27 28 35 27 39" stroke="#C5701E" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M33 18C36 24 37 32 36 41" stroke="#C5701E" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M43 21C42 27 40 34 38 39" stroke="#C5701E" strokeWidth="2.5" strokeLinecap="round" />
      {/* Butter gloss highlight */}
      <path d="M28 20C32 19 36 19 39 21" stroke="#FFF7D6" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </g>
  </svg>
);

// 2. Toast / Sliced Bread SVG
export const ToastIcon: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g>
      {/* Crust border */}
      <path 
        d="M16 22C16 16 20 12 26 12C28.5 12 30.5 13 32 14.5C33.5 13 35.5 12 38 12C44 12 48 16 48 22C49 27 50 44 48 48C46 51 43 52 32 52C21 52 18 51 16 48C14 44 15 27 16 22Z" 
        fill="#A65818" 
      />
      {/* Crumb soft face */}
      <path 
        d="M19 23C19 18 22 15 27 15C29 15 30.5 16 32 17C33.5 16 35 15 37 15C42 15 45 18 45 23C46 27 47 43 45 46C43 49 40 49 32 49C24 49 21 49 19 46C17 43 18 27 19 23Z" 
        fill="#FFE8A3" 
      />
      {/* Melting butter pat */}
      <rect x="27" y="27" width="10" height="9" rx="2.5" fill="#FFE033" stroke="#F5B300" strokeWidth="1.2" />
      <path d="M29 36C29 38 31 39 34 39C37 39 37 37 37 36" stroke="#FFE033" strokeWidth="2.5" strokeLinecap="round" />
      {/* Golden toasting blush */}
      <circle cx="25" cy="38" r="3" fill="#F4A950" opacity="0.4" />
      <circle cx="39" cy="38" r="3.5" fill="#F4A950" opacity="0.4" />
      <circle cx="32" cy="23" r="2.5" fill="#F4A950" opacity="0.3" />
    </g>
  </svg>
);

// 3. French Baguette SVG
export const BaguetteIcon: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g transform="rotate(-30 32 32)">
      {/* Loaf outline */}
      <rect x="14" y="24" width="36" height="16" rx="8" fill="#D9822B" />
      <rect x="16" y="26" width="32" height="12" rx="6" fill="#F7C46C" />
      {/* Traditional diagonal cuts / scores */}
      <path d="M22 25L26 39" stroke="#9E4D00" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 25L34 39" stroke="#9E4D00" strokeWidth="2" strokeLinecap="round" />
      <path d="M38 25L42 39" stroke="#9E4D00" strokeWidth="2" strokeLinecap="round" />
      {/* Glaze sheen */}
      <path d="M20 28C28 27 36 27 44 28" stroke="#FFF2B2" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
    </g>
  </svg>
);

// 4. Pretzel SVG (Bavarian style with salt grains)
export const PretzelIcon: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g>
      {/* Dark brown pretzel knot */}
      <path 
        d="M20 20C15 25 15 35 22 42C28 48 36 48 42 42C49 35 49 25 44 20C39 15 34 18 32 24C30 18 25 15 20 20Z" 
        stroke="#8B4513" 
        strokeWidth="9" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Golden pastry fill layer */}
      <path 
        d="M20 20C15 25 15 35 22 42C28 48 36 48 42 42C49 35 49 25 44 20C39 15 34 18 32 24C30 18 25 15 20 20Z" 
        stroke="#D27D2D" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Internal ribbon loop */}
      <path d="M26 28L38 40" stroke="#8B4513" strokeWidth="7" strokeLinecap="round" />
      <path d="M26 28L38 40" stroke="#D27D2D" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M38 28L26 40" stroke="#8B4513" strokeWidth="7" strokeLinecap="round" />
      <path d="M38 28L26 40" stroke="#D27D2D" strokeWidth="4.5" strokeLinecap="round" />
      {/* Salt crystals */}
      <circle cx="21" cy="30" r="1.5" fill="#FFFFFF" />
      <circle cx="28" cy="43" r="1.5" fill="#FFFFFF" />
      <circle cx="43" cy="30" r="1.5" fill="#FFFFFF" />
      <circle cx="36" cy="43" r="1.5" fill="#FFFFFF" />
      <circle cx="32" cy="19" r="1.5" fill="#FFFFFF" />
    </g>
  </svg>
);

// 5. Bagel SVG with sesame seeds
export const BagelIcon: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g>
      {/* Outer torus ring */}
      <circle cx="32" cy="32" r="19" fill="#E28D38" stroke="#AC5912" strokeWidth="3" />
      {/* Golden highlight */}
      <circle cx="32" cy="32" r="17" fill="#F8C471" />
      {/* Center hole */}
      <circle cx="32" cy="32" r="7" fill="#0b132b" stroke="#AC5912" strokeWidth="2.5" />
      {/* Sesame seeds */}
      <ellipse cx="23" cy="23" rx="1.5" ry="2.5" transform="rotate(30 23 23)" fill="#FFF3CD" />
      <ellipse cx="41" cy="23" rx="1.5" ry="2.5" transform="rotate(-30 41 23)" fill="#FFF3CD" />
      <ellipse cx="23" cy="41" rx="1.5" ry="2.5" transform="rotate(-40 23 41)" fill="#FFF3CD" />
      <ellipse cx="41" cy="41" rx="1.5" ry="2.5" transform="rotate(40 41 41)" fill="#FFF3CD" />
      <ellipse cx="32" cy="18" rx="1.5" ry="2.5" transform="rotate(90 32 18)" fill="#FFF3CD" />
      <ellipse cx="32" cy="46" rx="1.5" ry="2.5" transform="rotate(90 32 46)" fill="#FFF3CD" />
    </g>
  </svg>
);

// 6. Muffin / Cupcake SVG
export const MuffinIcon: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g>
      {/* Paper liner cup */}
      <path d="M19 35L24 51C24.5 52 26 53 28 53H36C38 53 39.5 52 40 51L45 35H19Z" fill="#F06292" stroke="#C2185B" strokeWidth="1.5" />
      {/* Liner ridges */}
      <path d="M25 35L28 52" stroke="#AD1457" strokeWidth="1.5" opacity="0.6" />
      <path d="M32 35V53" stroke="#AD1457" strokeWidth="1.5" opacity="0.6" />
      <path d="M39 35L36 52" stroke="#AD1457" strokeWidth="1.5" opacity="0.6" />
      {/* Fluffy mushroom muffin top */}
      <path 
        d="M15 35C13 32 14 26 19 23C21 17 28 14 32 14C36 14 43 17 45 23C50 26 51 32 49 35C45 38 19 38 15 35Z" 
        fill="#F5B041" 
        stroke="#B9770E" 
        strokeWidth="2" 
      />
      {/* Chocolate chips / Blueberries */}
      <circle cx="24" cy="24" r="2.5" fill="#5D4037" />
      <circle cx="33" cy="21" r="2.8" fill="#5D4037" />
      <circle cx="41" cy="26" r="2.2" fill="#5D4037" />
      <circle cx="28" cy="30" r="2.3" fill="#5D4037" />
      <circle cx="38" cy="31" r="2.5" fill="#5D4037" />
    </g>
  </svg>
);

// 7. Donut SVG with pink strawberry glaze & sprinkles
export const DonutIcon: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g>
      {/* Dough ring */}
      <circle cx="32" cy="32" r="18" fill="#E59866" stroke="#BA4A00" strokeWidth="2" />
      {/* Frosting glaze */}
      <path 
        d="M17 31C16 35 19 40 23 44C27 48 37 48 41 44C45 40 48 35 47 31C45 23 40 16 32 16C24 16 19 23 17 31Z" 
        fill="#FF69B4" 
      />
      {/* Frosting drips */}
      <circle cx="22" cy="40" r="2" fill="#FF69B4" />
      <circle cx="34" cy="45" r="2.5" fill="#FF69B4" />
      <circle cx="43" cy="39" r="2" fill="#FF69B4" />
      {/* Donut hole */}
      <circle cx="32" cy="32" r="6.5" fill="#0b132b" stroke="#BA4A00" strokeWidth="2" />
      {/* Colorful sprinkles */}
      <rect x="23" y="21" width="4" height="1.8" rx="0.9" transform="rotate(25 23 21)" fill="#FFF" />
      <rect x="36" y="20" width="4" height="1.8" rx="0.9" transform="rotate(-30 36 20)" fill="#00E676" />
      <rect x="42" y="29" width="4" height="1.8" rx="0.9" transform="rotate(45 42 29)" fill="#FFEB3B" />
      <rect x="21" y="32" width="4" height="1.8" rx="0.9" transform="rotate(-40 21 32)" fill="#00B0FF" />
      <rect x="29" y="40" width="4" height="1.8" rx="0.9" transform="rotate(10 29 40)" fill="#FFF" />
    </g>
  </svg>
);

// 8. Whole Artisan Loaf Bread SVG
export const LoafIcon: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g>
      {/* Loaf body */}
      <path 
        d="M14 36C12 28 16 18 32 18C48 18 52 28 50 36C48 44 42 46 32 46C22 46 16 44 14 36Z" 
        fill="#C06C20" 
        stroke="#7E3B00" 
        strokeWidth="2" 
      />
      <path 
        d="M17 34C15 28 18 21 32 21C46 21 49 28 47 34C45 41 40 43 32 43C24 43 19 41 17 34Z" 
        fill="#F39C12" 
      />
      {/* Baker leaf cut slits */}
      <path d="M22 28C26 25 30 25 32 29" stroke="#FFF2B2" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 29C34 25 38 25 42 28" stroke="#FFF2B2" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M27 35C30 33 34 33 37 35" stroke="#FFF2B2" strokeWidth="2" strokeLinecap="round" />
      {/* Flour dusting */}
      <circle cx="28" cy="24" r="1.5" fill="#FFF" opacity="0.6" />
      <circle cx="36" cy="24" r="1.5" fill="#FFF" opacity="0.6" />
    </g>
  </svg>
);

// 9. Soft Round Bun (Burger / Dinner Roll)
export const BunIcon: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g>
      {/* Bottom base */}
      <rect x="18" y="38" width="28" height="8" rx="4" fill="#D3812E" stroke="#9A4D00" strokeWidth="1.5" />
      {/* Golden dome top */}
      <path 
        d="M16 36C16 23 23 17 32 17C41 17 48 23 48 36H16Z" 
        fill="#F8B146" 
        stroke="#9A4D00" 
        strokeWidth="1.8" 
      />
      {/* Gloss shine */}
      <path d="M22 26C25 21 31 20 37 22" stroke="#FFF3CC" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      {/* Sesame seeds */}
      <circle cx="26" cy="25" r="1.2" fill="#FFFBE6" />
      <circle cx="34" cy="23" r="1.2" fill="#FFFBE6" />
      <circle cx="39" cy="27" r="1.2" fill="#FFFBE6" />
      <circle cx="30" cy="30" r="1.2" fill="#FFFBE6" />
    </g>
  </svg>
);

// Main Master Bread Icon Switcher
export const BreadIcon: React.FC<BreadIconProps> = ({ 
  kind = 'croissant', 
  size = 28, 
  className = '', 
  animate = false 
}) => {
  const animClass = animate ? 'animate-bread-bob hover:rotate-12 transition-transform' : '';
  const combinedClass = `${className} ${animClass}`.trim();

  switch (kind) {
    case 'farmhouse':
      return <FarmhouseBreadIcon size={size} className={combinedClass} />;
    case 'croissant':
      return <CroissantIcon size={size} className={combinedClass} />;
    case 'toast':
      return <ToastIcon size={size} className={combinedClass} />;
    case 'baguette':
      return <BaguetteIcon size={size} className={combinedClass} />;
    case 'pretzel':
      return <PretzelIcon size={size} className={combinedClass} />;
    case 'bagel':
      return <BagelIcon size={size} className={combinedClass} />;
    case 'muffin':
      return <MuffinIcon size={size} className={combinedClass} />;
    case 'donut':
      return <DonutIcon size={size} className={combinedClass} />;
    case 'loaf':
      return <LoafIcon size={size} className={combinedClass} />;
    case 'bun':
    default:
      return <BunIcon size={size} className={combinedClass} />;
  }
};

// Ambient Floating Breads Overlay for the Rainbow Sidebar Background
export const FloatingBreadParticles: React.FC = () => {
  const breadParticles = [
    { kind: 'croissant' as BreadKind, top: '4%', left: '8%', size: 30, anim: 'animate-bread-float-1', delay: '0s', opacity: 0.85, rot: '12deg' },
    { kind: 'toast' as BreadKind, top: '16%', right: '10%', size: 28, anim: 'animate-bread-float-2', delay: '1.2s', opacity: 0.8, rot: '-15deg' },
    { kind: 'pretzel' as BreadKind, top: '30%', left: '12%', size: 32, anim: 'animate-bread-float-3', delay: '2.5s', opacity: 0.9, rot: '20deg' },
    { kind: 'baguette' as BreadKind, top: '44%', right: '8%', size: 32, anim: 'animate-bread-float-1', delay: '0.7s', opacity: 0.85, rot: '-25deg' },
    { kind: 'donut' as BreadKind, top: '58%', left: '10%', size: 30, anim: 'animate-bread-float-2', delay: '3s', opacity: 0.9, rot: '15deg' },
    { kind: 'muffin' as BreadKind, top: '72%', right: '12%', size: 30, anim: 'animate-bread-float-3', delay: '1.8s', opacity: 0.85, rot: '-10deg' },
    { kind: 'bagel' as BreadKind, top: '85%', left: '14%', size: 28, anim: 'animate-bread-float-1', delay: '2.2s', opacity: 0.85, rot: '18deg' },
    { kind: 'bun' as BreadKind, top: '93%', right: '10%', size: 28, anim: 'animate-bread-float-2', delay: '0.5s', opacity: 0.8, rot: '-12deg' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {breadParticles.map((item, idx) => (
        <div
          key={idx}
          className={`absolute ${item.anim} filter drop-shadow-md transition-all`}
          style={{
            top: item.top,
            left: item.left,
            right: item.right,
            animationDelay: item.delay,
            opacity: item.opacity,
            transform: `rotate(${item.rot})`,
          }}
        >
          <BreadIcon kind={item.kind} size={item.size} />
        </div>
      ))}
    </div>
  );
};
