import React from "react";

interface TransladoTripTimelineProps {
  currentBoardingOptions: string[];
  direction: "ida" | "volta";
}

export const TransladoTripTimeline: React.FC<TransladoTripTimelineProps> = ({
  currentBoardingOptions,
  direction,
}) => {
  return (
    <div className="w-full md:w-36 lg:w-44 shrink-0 border-t-4 md:border-t-0 md:border-l-4 border-dashed border-slate-300/60 bg-slate-200/20 p-4 relative flex flex-col justify-center min-h-[350px]">
      <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center absolute top-4 left-0 w-full">
        Trajeto
      </div>
      <div className="flex-1 relative flex flex-col justify-between items-center py-8 w-full mt-4">
        {/* the line */}
        <div className="absolute inset-y-8 left-1/2 -translate-x-1/2 w-1 bg-slate-300 rounded-full" />

        {currentBoardingOptions.map((point, index) => {
          const total = currentBoardingOptions.length;

          // Determine percentage position
          let topPercent = total > 1 ? (index / (total - 1)) * 100 : 50;

          // Specific rule for Verolme to be at 75% of the distance between Itaguaí and 10º GBM
          if (total === 3 && index === 1) {
            if (
              point.toLowerCase().includes("ver") ||
              point.toLowerCase().includes("ang")
            ) {
              if (direction === "ida") {
                topPercent = 75;
              } else {
                topPercent = 25;
              }
            }
          }

          return (
            <div
              key={point}
              className="absolute w-full px-2 flex flex-col items-center gap-1.5"
              style={{
                top: `${topPercent}%`,
                transform: "translateY(-50%)",
              }}
            >
              <div className="w-3.5 h-3.5 rounded-full border-4 border-slate-200 shadow-sm flex items-center justify-center bg-blue-500 relative z-10 animate-pulse" />
              <span className="text-[9px] font-black text-slate-600 block text-center leading-tight bg-white px-2 py-1 rounded-lg max-w-full z-10 break-words w-full shadow-xs uppercase">
                {point}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
