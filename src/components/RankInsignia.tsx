import React from 'react';
import { parseRank } from '../lib/rankUtils';

interface RankInsigniaProps {
  rankStr?: string;
  className?: string;
}

const OfficerStar = ({ variant, className }: { variant: 'diamond' | 'starburst', className?: string }) => {
  if (variant === 'starburst') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className || "text-amber-500"}>
        <path d="M12 1.5L14.5 8.5L21.5 11L14.5 13.5L12 20.5L9.5 13.5L2.5 11L9.5 8.5L12 1.5Z" fill="currentColor" />
        <circle cx="12" cy="11" r="4.5" fill="white" />
        <path d="M12 7.5L13.5 10.5H16.5L14 12.5L15 15.5L12 13.5L9 15.5L10 12.5L7.5 10.5H10.5L12 7.5Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className || "text-slate-400"}>
      <path d="M12 2L22 12L12 22L2 12L12 2Z" fill="currentColor" />
      <circle cx="12" cy="12" r="5" fill="white" />
      <path d="M12 8L13.5 10.5H16L14 12.5L15 15L12 13.5L9 15L10 12.5L8 10.5H10.5L12 8Z" fill="currentColor" />
    </svg>
  );
}

export function RankInsignia({ rankStr, className }: RankInsigniaProps) {
  if (!rankStr) return null;
  const r = parseRank(rankStr);

  const containerClasses = className || "";

  // Coronel
  if (r === 'CORONEL') {
    return (
      <div className={`flex gap-[3px] ${containerClasses}`}>
        <OfficerStar variant="starburst" />
        <OfficerStar variant="starburst" />
        <OfficerStar variant="starburst" />
      </div>
    );
  }

  // Tenente Coronel
  if (r === 'TEN CEL') {
    return (
      <div className={`flex gap-[3px] ${containerClasses}`}>
        <OfficerStar variant="starburst" />
        <OfficerStar variant="starburst" />
        <OfficerStar variant="diamond" />
      </div>
    );
  }

  // Major
  if (r === 'MAJOR') {
    return (
      <div className={`flex gap-[3px] ${containerClasses}`}>
        <OfficerStar variant="starburst" />
        <OfficerStar variant="diamond" />
        <OfficerStar variant="diamond" />
      </div>
    );
  }

  // Capitão -> 3 Stars (Diamond shaped with star inside)
  if (r === 'CAPITÃO') {
    return (
      <div className={`flex gap-[3px] ${containerClasses}`}>
        <OfficerStar variant="diamond" />
        <OfficerStar variant="diamond" />
        <OfficerStar variant="diamond" />
      </div>
    );
  }

  // 1º Tenente -> 2 Stars
  if (r === '1º TEN') {
    return (
      <div className={`flex gap-[3px] ${containerClasses}`}>
        <OfficerStar variant="diamond" />
        <OfficerStar variant="diamond" />
      </div>
    );
  }

  // 2º Tenente -> 1 Star
  if (r === '2º TEN' || r === 'ASP OF') {
    return (
      <div className={containerClasses}>
        <OfficerStar variant="diamond" />
      </div>
    );
  }

  // Subtenente -> Triangle
  if (r === 'SUBTEN') {
    return (
      <div className={containerClasses}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-amber-500">
          <path d="M12 4L22 20H2L12 4Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
          <path d="M12 9L18 19H6L12 9Z" fill="white" stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  // Praças (Chevron logic)
  let chevrons = 0;
  if (r === '1º SGT') chevrons = 5;
  else if (r === '2º SGT') chevrons = 4;
  else if (r === '3º SGT') chevrons = 3;
  else if (r === 'CABO') chevrons = 2;
  else if (r === 'SOLDADO') chevrons = 1;

  if (chevrons > 0) {
    return (
      <div className={`flex flex-col items-center justify-center -space-y-[6px] text-red-500 opacity-80 min-w-[30px] ${containerClasses}`}>
        {Array.from({ length: chevrons }).map((_, i) => {
          const hasGap = (chevrons >= 4 && i === 1);
          return (
            <svg key={i} className={hasGap ? "mt-[5px]" : ""} width="21" height="9" viewBox="0 0 16 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="miter">
              <path d="M2.5 1.5L8 5L13.5 1.5" />
            </svg>
          );
        })}
      </div>
    );
  }

  return null;
}
