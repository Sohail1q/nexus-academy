import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Sparkles } from 'lucide-react';
import { getPakistanTime } from '../services/feeAutomation';

interface PakistanClockProps {
  locationText?: string;
  showDetails?: boolean;
}

export const PakistanClock: React.FC<PakistanClockProps> = ({
  locationText,
  showDetails = true,
}) => {
  const [pktTime, setPktTime] = useState(getPakistanTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setPktTime(getPakistanTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="inline-flex items-center flex-wrap gap-2 text-xs">
      {locationText && (
        <div className="inline-flex items-center gap-1 text-slate-500 font-medium">
          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span>{locationText}</span>
        </div>
      )}

      {locationText && <span className="text-slate-300 hidden sm:inline">•</span>}

      {/* Live Running Pakistan Time */}
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/90 text-white rounded-lg border border-slate-700 shadow-xs font-mono"
        title="Live Pakistan Standard Time (Asia/Karachi, UTC+5) — Used for Academy Monthly Fee Cycle & Billing"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>

        <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />

        <span className="font-bold text-emerald-300 tracking-wider">
          {pktTime.timeString}
        </span>

        <span className="text-slate-400 hidden sm:inline">|</span>

        <span className="text-slate-200 hidden sm:inline font-sans font-medium text-[11px]">
          {pktTime.dayName}, {pktTime.dateString}
        </span>

        <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-sans font-bold tracking-tight border border-emerald-500/30">
          PKT (UTC+5)
        </span>
      </div>

      {showDetails && (
        <span className="text-[11px] text-slate-500 hidden md:inline font-medium">
          Billing Cycle: <strong className="text-slate-700">{pktTime.monthYearName}</strong>
        </span>
      )}
    </div>
  );
};
