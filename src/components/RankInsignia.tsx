import React from 'react';
import { parseRank } from '../lib/rankUtils';

interface RankInsigniaProps {
  rankStr?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const ESTRELA_OFICIAL_DOURADA = '/assets/ranks/estrela-oficial-dourada.png';
export const ESTRELA_OFICIAL_PRATEADA = '/assets/ranks/estrela-oficial-prateada.png';

export const OfficerStar = ({
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
  const isLg = size === 'lg';
  const dim = isXs ? 12 : isSm ? 16 : isLg ? 28 : 22;

  const isGold = variant === 'starburst';
  const src = isGold ? ESTRELA_OFICIAL_DOURADA : ESTRELA_OFICIAL_PRATEADA;
  const alt = isGold ? 'Estrela Dourada CBMERJ' : 'Estrela Prateada CBMERJ';

  return (
    <img
      src={src}
      alt={alt}
      title={alt}
      width={dim}
      height={dim}
      loading="eager"
      decoding="async"
      className={`inline-block shrink-0 object-contain select-none pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] ${className || ''}`}
      style={{ width: `${dim}px`, height: `${dim}px`, minWidth: `${dim}px`, minHeight: `${dim}px` }}
    />
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

  // Remove narrow width classes like w-3, w-4, etc. from multi-star officer row containers so stars never overflow
  const officerContainerClasses = containerClasses
    .replace(/\bw-(?:3|3\.5|4|5|6|7|8)\b/g, '')
    .trim();

  // Coronel
  if (r === 'CORONEL') {
    return (
      <div className={`flex items-center shrink-0 w-auto min-w-fit ${starGap} ${officerContainerClasses}`}>
        <OfficerStar variant="starburst" size={effectiveSize} />
        <OfficerStar variant="starburst" size={effectiveSize} />
        <OfficerStar variant="starburst" size={effectiveSize} />
      </div>
    );
  }

  // Tenente Coronel
  if (r === 'TENENTE CORONEL') {
    return (
      <div className={`flex items-center shrink-0 w-auto min-w-fit ${starGap} ${officerContainerClasses}`}>
        <OfficerStar variant="starburst" size={effectiveSize} />
        <OfficerStar variant="starburst" size={effectiveSize} />
        <OfficerStar variant="diamond" size={effectiveSize} />
      </div>
    );
  }

  // Major
  if (r === 'MAJOR') {
    return (
      <div className={`flex items-center shrink-0 w-auto min-w-fit ${starGap} ${officerContainerClasses}`}>
        <OfficerStar variant="starburst" size={effectiveSize} />
        <OfficerStar variant="diamond" size={effectiveSize} />
        <OfficerStar variant="diamond" size={effectiveSize} />
      </div>
    );
  }

  // Capitão -> 3 Stars (Diamond shaped with star inside)
  if (r === 'CAPITÃO') {
    return (
      <div className={`flex items-center shrink-0 w-auto min-w-fit ${starGap} ${officerContainerClasses}`}>
        <OfficerStar variant="diamond" size={effectiveSize} />
        <OfficerStar variant="diamond" size={effectiveSize} />
        <OfficerStar variant="diamond" size={effectiveSize} />
      </div>
    );
  }

  // 1º Tenente -> 2 Stars
  if (r === '1º TENENTE') {
    return (
      <div className={`flex items-center shrink-0 w-auto min-w-fit ${starGap} ${officerContainerClasses}`}>
        <OfficerStar variant="diamond" size={effectiveSize} />
        <OfficerStar variant="diamond" size={effectiveSize} />
      </div>
    );
  }

  // 2º Tenente -> 1 Star
  if (r === '2º TENENTE' || r === 'ASP OF') {
    return (
      <div className={`flex items-center shrink-0 w-auto min-w-fit ${officerContainerClasses}`}>
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
