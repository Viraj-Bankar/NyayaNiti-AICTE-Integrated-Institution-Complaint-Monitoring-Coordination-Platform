import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTickerItem } from '../../types';
import { api } from '../../services/api';
import { AlertCircle, Pause, Play, Bell, ExternalLink, ShieldAlert } from 'lucide-react';

export const AlertTicker: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertTickerItem[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadTicker();
    const interval = setInterval(loadTicker, 25000); // 25s polling
    return () => clearInterval(interval);
  }, []);

  const loadTicker = async () => {
    try {
      const data = await api.getTicker();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alert ticker', err);
    }
  };

  if (!alerts.length) return null;

  return (
    <div className="bg-[#061E46] border-y border-amber-500/40 text-slate-100 py-1.5 px-3 overflow-hidden shadow-inner flex items-center gap-3 relative z-10 text-xs">
      {/* Ticker Badge / Controls */}
      <div className="flex items-center gap-2 bg-[#C62828] text-white px-2.5 py-0.5 rounded font-bold tracking-wider text-[11px] uppercase flex-shrink-0 shadow-sm animate-pulse">
        <ShieldAlert className="w-3.5 h-3.5" />
        <span>REGULATORY ALERTS</span>
      </div>

      <button
        onClick={() => setIsPaused(!isPaused)}
        className="p-1 rounded bg-[#092D62] text-slate-300 hover:text-white flex-shrink-0"
        title={isPaused ? 'Resume Ticker' : 'Pause Ticker'}
      >
        {isPaused ? <Play className="w-3 h-3 text-[#FFB900]" /> : <Pause className="w-3 h-3" />}
      </button>

      {/* Scrolling Track */}
      <div
        className="overflow-hidden flex-1 relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className={`ticker-track flex items-center gap-8 ${isPaused ? 'style-paused' : ''}`}
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
        >
          {/* Double array for seamless infinite scroll */}
          {[...alerts, ...alerts].map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              onClick={() => navigate(item.link_url)}
              className="inline-flex items-center gap-2 cursor-pointer group hover:bg-[#092D62]/80 px-2.5 py-0.5 rounded transition-colors whitespace-nowrap"
            >
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                  item.severity === 'Critical'
                    ? 'bg-red-600 text-white'
                    : item.severity === 'High'
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {item.category}
              </span>
              <span className="font-semibold text-amber-300 group-hover:underline">
                {item.related_id}:
              </span>
              <span className="text-slate-200 group-hover:text-white">
                {item.short_message}
              </span>
              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-amber-300 opacity-60 group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
