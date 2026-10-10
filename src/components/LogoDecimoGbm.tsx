import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  allowUpload?: boolean;
}

export function LogoDecimoGbm({ className, allowUpload = false }: LogoProps) {
  const [customSrc, setCustomSrc] = useState<string | null>(() => {
    try {
      return localStorage.getItem('logo_10gbm_custom');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        setCustomSrc(localStorage.getItem('logo_10gbm_custom'));
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
            localStorage.setItem('logo_10gbm_custom', result);
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
          alt="10º GBM - Décimo Grupamento de Bombeiro Militar"
          className="max-h-full max-w-full object-contain"
          referrerPolicy="no-referrer"
          onError={() => {
            // fallback if image fails
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
          {/* Gradients */}
          <linearGradient id="gbmGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="35%" stopColor="#D97706" />
            <stop offset="70%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <linearGradient id="gbmRed" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="50%" stopColor="#B91C1C" />
            <stop offset="100%" stopColor="#7F1D1D" />
          </linearGradient>
          <linearGradient id="gbmBlue" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="metalSilver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="50%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <radialGradient id="torchGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="80%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="shadow10" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Outer Shield Outline */}
        <path
          d="M 100 8 C 160 8, 192 20, 192 70 C 192 145, 155 195, 100 230 C 45 195, 8 145, 8 70 C 8 20, 40 8, 100 8 Z"
          fill="url(#gbmGold)"
          stroke="#78350F"
          strokeWidth="2.5"
          filter="url(#shadow10)"
        />

        {/* Inner Shield Border Line */}
        <path
          d="M 100 14 C 154 14, 184 25, 184 72 C 184 140, 149 188, 100 221 C 51 188, 16 140, 16 72 C 16 25, 46 14, 100 14 Z"
          fill="#1E293B"
        />

        {/* Shield Field Left Red / Right Blue */}
        <path
          d="M 100 17 C 50 17, 20 27, 20 72 C 20 138, 54 184, 100 216 L 100 17 Z"
          fill="url(#gbmRed)"
        />
        <path
          d="M 100 17 C 150 17, 180 27, 180 72 C 180 138, 146 184, 100 216 L 100 17 Z"
          fill="url(#gbmBlue)"
        />

        {/* Decorative Inner Gold Rib */}
        <line x1="100" y1="17" x2="100" y2="216" stroke="url(#gbmGold)" strokeWidth="1.5" strokeOpacity="0.8" />

        {/* Crossed Firefighter Axes (Machadinhas) */}
        {/* Axe 1: Left-Bottom to Right-Top */}
        <g transform="rotate(-38 100 112)">
          <rect x="96" y="45" width="8" height="135" rx="3" fill="#B45309" stroke="#78350F" strokeWidth="1" />
          <path d="M 88 50 C 88 42, 100 40, 100 40 C 100 40, 112 42, 112 50 C 112 56, 104 62, 100 64 C 96 62, 88 56, 88 50 Z" fill="url(#gbmGold)" />
          {/* Axe Head */}
          <path d="M 104 46 L 126 38 C 132 50, 132 60, 126 72 L 104 64 Z" fill="url(#metalSilver)" stroke="#334155" strokeWidth="1" />
          {/* Pick head */}
          <path d="M 96 49 L 78 54 C 84 56, 86 58, 96 59 Z" fill="url(#metalSilver)" stroke="#334155" strokeWidth="1" />
        </g>

        {/* Axe 2: Right-Bottom to Left-Top */}
        <g transform="rotate(38 100 112)">
          <rect x="96" y="45" width="8" height="135" rx="3" fill="#B45309" stroke="#78350F" strokeWidth="1" />
          <path d="M 88 50 C 88 42, 100 40, 100 40 C 100 40, 112 42, 112 50 C 112 56, 104 62, 100 64 C 96 62, 88 56, 88 50 Z" fill="url(#gbmGold)" />
          {/* Axe Head */}
          <path d="M 96 46 L 74 38 C 68 50, 68 60, 74 72 L 96 64 Z" fill="url(#metalSilver)" stroke="#334155" strokeWidth="1" />
          {/* Pick head */}
          <path d="M 104 49 L 122 54 C 116 56, 114 58, 104 59 Z" fill="url(#metalSilver)" stroke="#334155" strokeWidth="1" />
        </g>

        {/* Maritime Anchor (Representing Angra dos Reis / Costa Verde) */}
        <g stroke="url(#gbmGold)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* Anchor Ring */}
          <circle cx="100" cy="80" r="7" strokeWidth="2.5" />
          {/* Anchor Shaft */}
          <line x1="100" y1="87" x2="100" y2="152" strokeWidth="3.5" />
          {/* Stock (cross bar) */}
          <line x1="84" y1="96" x2="116" y2="96" strokeWidth="3" />
          <circle cx="84" cy="96" r="2" fill="url(#gbmGold)" />
          <circle cx="116" cy="96" r="2" fill="url(#gbmGold)" />
          {/* Anchor Arms & Flukes */}
          <path d="M 74 135 C 78 158, 122 158, 126 135" strokeWidth="3.5" />
          <polygon points="72,135 77,130 81,137" fill="url(#gbmGold)" stroke="none" />
          <polygon points="128,135 123,130 119,137" fill="url(#gbmGold)" stroke="none" />
        </g>

        {/* Central Torch / Firefighter Helmet */}
        <g filter="url(#shadow10)">
          {/* Helmet Dome */}
          <path
            d="M 84 104 C 84 90, 116 90, 116 104 C 120 106, 122 110, 120 114 C 114 116, 86 116, 80 114 C 78 110, 80 106, 84 104 Z"
            fill="url(#gbmGold)"
            stroke="#78350F"
            strokeWidth="1.2"
          />
          {/* Helmet Comb/Crest */}
          <path d="M 97 88 C 97 86, 103 86, 103 88 L 102 104 L 98 104 Z" fill="#FEF08A" stroke="#78350F" strokeWidth="0.8" />
          {/* Front Shield Badge on Helmet */}
          <polygon points="100,98 94,103 97,110 103,110 106,103" fill="#DC2626" stroke="url(#gbmGold)" strokeWidth="0.8" />
          <text x="100" y="107" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#FEF08A" fontFamily="sans-serif">10</text>
        </g>

        {/* Top Header Text Banner */}
        <path
          d="M 38 28 Q 100 18 162 28 Q 100 24 38 28 Z"
          fill="none"
          id="topTextPathGbm"
        />
        <text fontSize="10.5" fontWeight="900" fill="#FEF08A" letterSpacing="2" textAnchor="middle" fontFamily="sans-serif">
          <textPath href="#topTextPathGbm" startOffset="50%">
            C B M E R J
          </textPath>
        </text>

        {/* Central Prominent Text Ribbon: "10º GBM" */}
        <g filter="url(#shadow10)">
          {/* Ribbon Tails */}
          <path d="M 28 170 L 44 158 L 44 182 Z" fill="#92400E" />
          <path d="M 172 170 L 156 158 L 156 182 Z" fill="#92400E" />
          {/* Main Ribbon Body */}
          <rect x="36" y="156" width="128" height="26" rx="4" fill="url(#gbmGold)" stroke="#78350F" strokeWidth="1.5" />
          {/* Ribbon Border Stitch */}
          <rect x="39" y="159" width="122" height="20" rx="2" fill="none" stroke="#FEF08A" strokeWidth="0.8" strokeDasharray="3,2" />
          {/* 10º GBM Text */}
          <text
            x="100"
            y="174"
            textAnchor="middle"
            fontSize="15"
            fontWeight="900"
            fill="#7F1D1D"
            fontFamily="Arial, sans-serif"
            letterSpacing="1"
          >
            10º GBM
          </text>
        </g>

        {/* Bottom Banner: "ANGRA DOS REIS" */}
        <g>
          <rect x="48" y="188" width="104" height="16" rx="3" fill="#0F172A" stroke="url(#gbmGold)" strokeWidth="1" />
          <text
            x="100"
            y="200"
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill="#FDE68A"
            fontFamily="sans-serif"
            letterSpacing="1"
          >
            ANGRA DOS REIS
          </text>
        </g>

        {/* Sub-unit Stars on bottom flanks (1/10, 2/10, 3/10, 4/10) */}
        <g fill="url(#gbmGold)">
          {/* Star Left */}
          <polygon points="35,130 37,135 42,135 38,138 40,143 35,140 30,143 32,138 28,135 33,135" />
          {/* Star Right */}
          <polygon points="165,130 167,135 172,135 168,138 170,143 165,140 160,143 162,138 158,135 163,135" />
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
