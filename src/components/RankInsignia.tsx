import React from 'react';
import { parseRank } from '../lib/rankUtils';

interface RankInsigniaProps {
  rankStr?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const OfficerStar = ({
  variant,
  size = 'md',
  className
}: {
  variant: 'diamond' | 'starburst';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const isXs = size === 'xs';
  const isSm = size === 'sm';
  const width = isXs ? 11 : isSm ? 15 : 24;
  const height = isXs ? 11 : isSm ? 15 : 24;

  if (variant === 'starburst') {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        className={className || 'text-amber-500 shrink-0'}
      >
        <path d="M12 1.5L14.5 8.5L21.5 11L14.5 13.5L12 20.5L9.5 13.5L2.5 11L9.5 8.5L12 1.5Z" fill="currentColor" />
        <circle cx="12" cy="11" r="4.5" fill="white" />
        <path d="M12 7.5L13.5 10.5H16.5L14 12.5L15 15.5L12 13.5L9 15.5L10 12.5L7.5 10.5H10.5L12 7.5Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      className={className || 'text-slate-400 shrink-0'}
    >
      <path d="M12 2L22 12L12 22L2 12L12 2Z" fill="currentColor" />
      <circle cx="12" cy="12" r="5" fill="white" />
      <path d="M12 8L13.5 10.5H16L14 12.5L15 15L12 13.5L9 15L10 12.5L8 10.5H10.5L12 8Z" fill="currentColor" />
    </svg>
  );
};

export function RankInsignia({ rankStr, className, size }: RankInsigniaProps) {
  if (!rankStr) return null;
  const r = parseRank(rankStr);

  const containerClasses = className || '';
  const isCompactClass = Boolean(
    className &&
      (className.includes('w-3') ||
        className.includes('w-4') ||
        className.includes('scale-'))
  );
  const effectiveSize = size || (isCompactClass ? 'xs' : 'md');
  const isXs = effectiveSize === 'xs';
  const isSm = effectiveSize === 'sm';

  const starGap = isXs ? 'gap-[1.5px]' : isSm ? 'gap-[2px]' : 'gap-[3px]';

  // Coronel
  if (r === 'CORONEL') {
    return (
      <div className={`flex items-center shrink-0 ${starGap} ${containerClasses}`}>
        <OfficerStar variant="starburst" size={effectiveSize} />
        <OfficerStar variant="starburst" size={effectiveSize} />
        <OfficerStar variant="starburst" size={effectiveSize} />
      </div>
    );
  }

  // Tenente Coronel
  if (r === 'TENENTE CORONEL') {
    return (
      <div className={`flex items-center shrink-0 ${starGap} ${containerClasses}`}>
        <OfficerStar variant="starburst" size={effectiveSize} />
        <OfficerStar variant="starburst" size={effectiveSize} />
        <OfficerStar variant="diamond" size={effectiveSize} />
      </div>
    );
  }

  // Major
  if (r === 'MAJOR') {
    return (
      <div className={`flex items-center shrink-0 ${starGap} ${containerClasses}`}>
        <OfficerStar variant="starburst" size={effectiveSize} />
        <OfficerStar variant="diamond" size={effectiveSize} />
        <OfficerStar variant="diamond" size={effectiveSize} />
      </div>
    );
  }

  // Capitão -> 3 Stars (Diamond shaped with star inside)
  if (r === 'CAPITÃO') {
    return (
      <div className={`flex items-center shrink-0 ${starGap} ${containerClasses}`}>
        <OfficerStar variant="diamond" size={effectiveSize} />
        <OfficerStar variant="diamond" size={effectiveSize} />
        <OfficerStar variant="diamond" size={effectiveSize} />
      </div>
    );
  }

  // 1º Tenente -> 2 Stars
  if (r === '1º TENENTE') {
    return (
      <div className={`flex items-center shrink-0 ${starGap} ${containerClasses}`}>
        <OfficerStar variant="diamond" size={effectiveSize} />
        <OfficerStar variant="diamond" size={effectiveSize} />
      </div>
    );
  }

  // 2º Tenente -> 1 Star
  if (r === '2º TENENTE' || r === 'ASP OF') {
    return (
      <div className={`flex items-center shrink-0 ${containerClasses}`}>
        <OfficerStar variant="diamond" size={effectiveSize} />
      </div>
    );
  }

  // Subtenente -> Triangle
  if (r === 'SUBTENENTE' || r === 'SUBTEN' || r === 'ST') {
    const triWidth = isXs ? 13 : isSm ? 17 : 24;
    const triHeight = isXs ? 13 : isSm ? 17 : 24;
    const minWClass = !isXs && !isSm && !isCompactClass ? 'min-w-[24px]' : '';
    return (
      <div className={`flex items-center justify-center shrink-0 ${minWClass} ${containerClasses}`}>
        <svg
          width={triWidth}
          height={triHeight}
          viewBox="0 0 24 24"
          fill="none"
          className="text-amber-500 shrink-0"
        >
          <path d="M12 5 L20.5 19.7 H3.5 Z" fill="white" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="miter" />
        </svg>
      </div>
    );
  }

  // Praças (Chevron logic)
  let chevrons = 0;
  if (r === '1º SARGENTO' || r === '1ºSGT' || r === '1º SGT') chevrons = 5;
  else if (r === '2º SARGENTO' || r === '2ºSGT' || r === '2º SGT') chevrons = 4;
  else if (r === '3º SARGENTO' || r === '3ºSGT' || r === '3º SGT') chevrons = 3;
  else if (r === 'CABO' || r === 'CB') chevrons = 2;
  else if (r === 'SOLDADO' || r === 'SD') chevrons = 1;

  if (chevrons > 0) {
    const chevWidth = isXs ? 12 : isSm ? 16 : 21;
    const chevHeight = isXs ? 5 : isSm ? 7 : 9;
    const spacingClass = isXs ? '-space-y-[2.5px]' : isSm ? '-space-y-[4px]' : '-space-y-[6px]';
    const minWClass = !isXs && !isSm && !isCompactClass ? 'min-w-[30px]' : '';
    return (
      <div className={`flex flex-col items-center justify-center ${spacingClass} text-red-500 opacity-80 shrink-0 ${minWClass} ${containerClasses}`}>
        {Array.from({ length: chevrons }).map((_, i) => {
          const hasGap = chevrons >= 4 && i === 1;
          const gapClass = hasGap ? (isXs ? 'mt-[2px]' : isSm ? 'mt-[3px]' : 'mt-[5px]') : '';
          return (
            <svg
              key={i}
              className={`shrink-0 ${gapClass}`}
              width={chevWidth}
              height={chevHeight}
              viewBox="0 0 16 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="miter"
            >
              <path d="M2.5 1.5L8 5L13.5 1.5" />
            </svg>
          );
        })}
      </div>
    );
  }

  return null;
}
