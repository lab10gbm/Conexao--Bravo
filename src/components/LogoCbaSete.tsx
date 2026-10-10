import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  allowUpload?: boolean;
}

export function LogoCbaSete({ className, allowUpload = false }: LogoProps) {
  const [customSrc, setCustomSrc] = useState<string | null>(() => {
    try {
      return localStorage.getItem('logo_cba7_custom');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        setCustomSrc(localStorage.getItem('logo_cba7_custom'));
      } catch {}
    };
    window.addEventListener('logos_updated', handleUpdate);
    return () => window.removeEventListener('logos_updated', handleUpdate);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setCustomSrc(result);
          try {
            localStorage.setItem('logo_cba7_custom', result);
            window.dispatchEvent(new Event('logos_updated'));
          } catch {}
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (customSrc) {
    return (
      <div className={cn("relative group inline-flex items-center justify-center", className)}>
        <img
          src={customSrc}
          alt="CBA VII - Costa Verde"
          className="max-h-full max-w-full object-contain"
          referrerPolicy="no-referrer"
          onError={() => {
            setCustomSrc(null);
          }}
        />
        {allowUpload && (
          <label className="absolute inset-0 bg-black/60 text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity rounded print:hidden shadow-xs">
            Trocar
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative group inline-flex items-center justify-center select-none", className)}>
      <svg
        viewBox="0 0 200 240"
        className="w-full h-full drop-shadow-sm"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cbaGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="30%" stopColor="#D97706" />
            <stop offset="70%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
          <linearGradient id="cbaGreen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#047857" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>
          <linearGradient id="cbaNavy" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="cbaSilver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="50%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <filter id="cbaShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Laurel Wreath on Background (representing Area Command) */}
        <g fill="none" stroke="url(#cbaGold)" strokeWidth="2.5" strokeLinecap="round">
          {/* Left Wreath Branch */}
          <path d="M 45 195 C 15 155, 12 85, 45 42" />
          {/* Leaves Left */}
          <path d="M 28 60 Q 15 50 25 45 Q 35 55 28 60 Z" fill="url(#cbaGold)" />
          <path d="M 22 88 Q 8 80 16 72 Q 28 80 22 88 Z" fill="url(#cbaGold)" />
          <path d="M 18 118 Q 4 114 10 102 Q 24 108 18 118 Z" fill="url(#cbaGold)" />
          <path d="M 20 148 Q 8 148 12 136 Q 26 138 20 148 Z" fill="url(#cbaGold)" />
          <path d="M 30 178 Q 18 182 20 168 Q 32 166 30 178 Z" fill="url(#cbaGold)" />

          {/* Right Wreath Branch */}
          <path d="M 155 195 C 185 155, 188 85, 155 42" />
          {/* Leaves Right */}
          <path d="M 172 60 Q 185 50 175 45 Q 165 55 172 60 Z" fill="url(#cbaGold)" />
          <path d="M 178 88 Q 192 80 184 72 Q 172 80 178 88 Z" fill="url(#cbaGold)" />
          <path d="M 182 118 Q 196 114 190 102 Q 176 108 182 118 Z" fill="url(#cbaGold)" />
          <path d="M 180 148 Q 192 148 188 136 Q 174 138 180 148 Z" fill="url(#cbaGold)" />
          <path d="M 170 178 Q 182 182 180 168 Q 168 166 170 178 Z" fill="url(#cbaGold)" />
        </g>

        {/* Outer Command Shield Outline */}
        <path
          d="M 100 8 C 158 8, 188 20, 188 68 C 188 142, 152 192, 100 228 C 48 192, 12 142, 12 68 C 12 20, 42 8, 100 8 Z"
          fill="url(#cbaGold)"
          stroke="#78350F"
          strokeWidth="2.5"
          filter="url(#cbaShadow)"
        />

        {/* Inner Shield Body */}
        <path
          d="M 100 14 C 152 14, 180 25, 180 70 C 180 138, 146 185, 100 219 C 54 185, 20 138, 20 70 C 20 25, 48 14, 100 14 Z"
          fill="#0F172A"
        />

        {/* Shield Field Left: Green (Costa Verde) / Right: Navy (Atlantic Waters) */}
        <path
          d="M 100 17 C 52 17, 24 27, 24 70 C 24 136, 56 181, 100 214 L 100 17 Z"
          fill="url(#cbaGreen)"
        />
        <path
          d="M 100 17 C 148 17, 176 27, 176 70 C 176 136, 144 181, 100 214 L 100 17 Z"
          fill="url(#cbaNavy)"
        />

        {/* Center Vertical Gold Rib */}
        <line x1="100" y1="17" x2="100" y2="214" stroke="url(#cbaGold)" strokeWidth="1.5" strokeOpacity="0.8" />

        {/* Crossed Firefighter Axes */}
        <g transform="rotate(-38 100 108)">
          <rect x="96" y="45" width="8" height="125" rx="3" fill="#B45309" stroke="#78350F" strokeWidth="1" />
          <path d="M 104 46 L 124 38 C 130 50, 130 60, 124 72 L 104 64 Z" fill="url(#cbaSilver)" stroke="#334155" strokeWidth="1" />
          <path d="M 96 49 L 78 54 C 84 56, 86 58, 96 59 Z" fill="url(#cbaSilver)" stroke="#334155" strokeWidth="1" />
        </g>
        <g transform="rotate(38 100 108)">
          <rect x="96" y="45" width="8" height="125" rx="3" fill="#B45309" stroke="#78350F" strokeWidth="1" />
          <path d="M 96 46 L 76 38 C 70 50, 70 60, 76 72 L 96 64 Z" fill="url(#cbaSilver)" stroke="#334155" strokeWidth="1" />
          <path d="M 104 49 L 122 54 C 116 56, 114 58, 104 59 Z" fill="url(#cbaSilver)" stroke="#334155" strokeWidth="1" />
        </g>

        {/* Flaming Torch in Center (Tocha da Vida) */}
        <g filter="url(#cbaShadow)">
          {/* Torch Handle */}
          <path d="M 97 100 L 95 138 L 105 138 L 103 100 Z" fill="url(#cbaGold)" stroke="#78350F" strokeWidth="1" />
          {/* Torch Cup */}
          <path d="M 92 98 C 92 104, 108 104, 108 98 L 106 92 L 94 92 Z" fill="url(#cbaGold)" />
          {/* Flame (Chama) */}
          <path
            d="M 100 68 C 93 78, 92 84, 95 91 C 98 94, 102 94, 105 91 C 108 84, 107 78, 100 68 Z"
            fill="#EF4444"
          />
          <path
            d="M 100 74 C 96 80, 96 85, 98 89 C 100 91, 102 91, 103 89 C 105 85, 104 80, 100 74 Z"
            fill="#FBBF24"
          />
        </g>

        {/* Top Arc: CBMERJ */}
        <path d="M 40 28 Q 100 18 160 28" fill="none" id="topTextCba" />
        <text fontSize="10.5" fontWeight="900" fill="#FEF08A" letterSpacing="2" textAnchor="middle" fontFamily="sans-serif">
          <textPath href="#topTextCba" startOffset="50%">
            C B M E R J
          </textPath>
        </text>

        {/* Prominent Roman Numeral VII or Central Badge */}
        <g filter="url(#cbaShadow)">
          {/* Ribbon Tails */}
          <path d="M 28 166 L 44 154 L 44 178 Z" fill="#78350F" />
          <path d="M 172 166 L 156 154 L 156 178 Z" fill="#78350F" />
          {/* Main Ribbon Body */}
          <rect x="36" y="152" width="128" height="26" rx="4" fill="url(#cbaGold)" stroke="#78350F" strokeWidth="1.5" />
          <rect x="39" y="155" width="122" height="20" rx="2" fill="none" stroke="#FEF08A" strokeWidth="0.8" strokeDasharray="3,2" />
          {/* CBA VII Text */}
          <text
            x="100"
            y="170"
            textAnchor="middle"
            fontSize="15"
            fontWeight="900"
            fill="#064E3B"
            fontFamily="Arial, sans-serif"
            letterSpacing="1.5"
          >
            CBA VII
          </text>
        </g>

        {/* Bottom Banner: "COSTA VERDE" */}
        <g>
          <rect x="48" y="184" width="104" height="16" rx="3" fill="#064E3B" stroke="url(#cbaGold)" strokeWidth="1" />
          <text
            x="100"
            y="196"
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="bold"
            fill="#FDE68A"
            fontFamily="sans-serif"
            letterSpacing="1"
          >
            COSTA VERDE
          </text>
        </g>

        {/* Command Stars (Representing Area Command VII) */}
        <g fill="url(#cbaGold)">
          <polygon points="100,40 102,44 107,44 103,47 105,52 100,49 95,52 97,47 93,44 98,44" />
          <polygon points="76,46 78,50 83,50 79,53 81,58 76,55 71,58 73,53 69,50 74,50" />
          <polygon points="124,46 126,50 131,50 127,53 129,58 124,55 119,58 121,53 117,50 122,50" />
        </g>
      </svg>
      {allowUpload && (
        <label className="absolute inset-0 bg-black/60 text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity rounded print:hidden shadow-xs">
          Personalizar
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>
      )}
    </div>
  );
}
