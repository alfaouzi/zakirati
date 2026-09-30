import React from 'react';

interface AppLogoProps {
  variant?: 'full' | 'symbol' | 'badge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showSubtitle?: boolean;
}

/**
 * Symbol of "صدى حكايتي" (My Memory Tells)
 * An open storybook emitting harmonic echo sound waves and a subtle memory sparkle.
 * Colors: Deep Teal (#0D9488 / #0F766E) with Warm Golden Amber (#F59E0B / #FBBF24).
 */
export const AppSymbol: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="شعار صدى حكايتي"
    >
      {/* Soft rounded container */}
      <rect width="64" height="64" rx="18" fill="url(#logo_teal_grad)" />

      {/* Echo Wave 1 (Upper Outer Arc) */}
      <path
        d="M 23 20 A 11 11 0 0 1 41 20"
        stroke="#FDE68A"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* Echo Wave 2 (Middle Arc) */}
      <path
        d="M 26 25.5 A 7 7 0 0 1 38 25.5"
        stroke="#F59E0B"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* Echo Wave 3 (Inner Arc) */}
      <path
        d="M 29 30.5 A 3.5 3.5 0 0 1 35 30.5"
        stroke="#FBBF24"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* Open Book: Left Page (Warm Cream) */}
      <path
        d="M 32 37 C 28 35 21 34 16 35.5 L 16 47 C 21 45.5 28 46.5 32 49 Z"
        fill="#FFFBEB"
      />

      {/* Open Book: Right Page (Pure White) */}
      <path
        d="M 32 37 C 36 35 43 34 48 35.5 L 48 47 C 43 45.5 36 46.5 32 49 Z"
        fill="#FFFFFF"
      />

      {/* Book Spine (Golden Accent) */}
      <rect x="31.3" y="36.5" width="1.4" height="13" rx="0.7" fill="#D97706" />

      {/* Bottom Cover Accent */}
      <path
        d="M 16 47.5 C 21 46 28 47 32 49.5 C 36 47 43 46 48 47.5 L 48 48.5 C 43 47 36 48 32 50.5 C 28 48 21 47 16 48.5 Z"
        fill="#115E59"
      />

      <defs>
        <linearGradient
          id="logo_teal_grad"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0D9488" />
          <stop offset="1" stopColor="#0F766E" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const AppLogo: React.FC<AppLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  showSubtitle = true,
}) => {
  const pixelSizes = {
    sm: 36,
    md: 44,
    lg: 56,
    xl: 72,
  };

  const currentSize = pixelSizes[size];

  if (variant === 'symbol') {
    return <AppSymbol size={currentSize} className={className} />;
  }

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className}`}>
      <div className="shrink-0 shadow-sm rounded-2xl overflow-hidden hover:scale-105 transition-transform duration-200">
        <AppSymbol size={currentSize} />
      </div>
      <div className="text-right">
        <h1
          className={`font-black tracking-tight text-slate-900 leading-tight ${
            size === 'sm'
              ? 'text-base'
              : size === 'md'
              ? 'text-lg sm:text-xl'
              : size === 'lg'
              ? 'text-2xl sm:text-3xl'
              : 'text-3xl sm:text-4xl'
          }`}
        >
          صدى حكايتي
        </h1>
        {showSubtitle && (
          <p
            className={`font-bold text-teal-700 block ${
              size === 'sm' ? 'text-[10px]' : 'text-xs sm:text-sm'
            }`}
          >
            My Memory Tells
          </p>
        )}
      </div>
    </div>
  );
};
