'use client';

import { useEffect, useState } from 'react';

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  warnLow?: number;
  warnHigh?: number;
  color?: string;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export default function Gauge({ value, min, max, label, unit, warnLow, warnHigh, color = '#06b6d4', size = 'md', icon }: GaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 50);
    return () => clearTimeout(timer);
  }, [value]);

  const percentage = Math.min(Math.max((animatedValue - min) / (max - min) * 100, 0), 100);
  
  // Determine color based on thresholds
  let finalColor = color;
  let status: 'normal' | 'warning' | 'danger' = 'normal';
  if (warnLow !== undefined && value < warnLow) { finalColor = '#ef4444'; status = 'danger'; }
  if (warnHigh !== undefined && value > warnHigh) { finalColor = '#ef4444'; status = 'danger'; }
  if (warnLow !== undefined && value >= warnLow && value < (warnLow + 10)) { finalColor = '#f59e0b'; status = 'warning'; }
  if (warnHigh !== undefined && value <= warnHigh && value > (warnHigh - 10)) { finalColor = '#f59e0b'; status = 'warning'; }

  const isSm = size === 'sm';
  const radius = isSm ? 32 : 52;
  const strokeWidth = isSm ? 5 : 7;
  const circumference = Math.PI * radius; // Half circle
  const offset = circumference - (percentage / 100) * circumference;
  const svgSize = isSm ? 80 : 130;
  const center = svgSize / 2;

  return (
    <div className={`gauge-card gauge-card--${size} ${status !== 'normal' ? 'gauge-card--alert' : ''}`}>
      {/* Glow background effect */}
      <div className="gauge-glow" style={{ background: `radial-gradient(circle at 50% 60%, ${finalColor}15, transparent 70%)` }} />
      
      <div className="gauge-label-row">
        {icon && <span className="gauge-icon">{icon}</span>}
        <h3 className="gauge-label">{label}</h3>
      </div>
      
      <div className="gauge-svg-wrap" style={{ width: svgSize, height: svgSize * 0.65 }}>
        <svg 
          width={svgSize} 
          height={svgSize * 0.65} 
          viewBox={`0 0 ${svgSize} ${svgSize * 0.65}`}
          className="gauge-svg"
        >
          <defs>
            <linearGradient id={`grad-${label.replace(/\s+/g, '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={finalColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={finalColor} stopOpacity="1" />
            </linearGradient>
            <filter id={`glow-${label.replace(/\s+/g, '')}`}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Background track */}
          <path
            d={`M ${center - radius} ${center + (isSm ? 8 : 12)} A ${radius} ${radius} 0 0 1 ${center + radius} ${center + (isSm ? 8 : 12)}`}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth + 2}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d={`M ${center - radius} ${center + (isSm ? 8 : 12)} A ${radius} ${radius} 0 0 1 ${center + radius} ${center + (isSm ? 8 : 12)}`}
            fill="none"
            stroke={`url(#grad-${label.replace(/\s+/g, '')})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            filter={`url(#glow-${label.replace(/\s+/g, '')})`}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div className="gauge-value-overlay" style={{ bottom: isSm ? '0px' : '2px' }}>
          <span className={`gauge-value ${isSm ? 'gauge-value--sm' : ''}`} style={{ color: finalColor }}>
            {value.toFixed(value % 1 === 0 ? 0 : 1)}
          </span>
          <span className={`gauge-unit ${isSm ? 'gauge-unit--sm' : ''}`}>{unit}</span>
        </div>
      </div>
      
      {!isSm && (
        <div className="gauge-range">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      )}

      {/* Status dot */}
      <div className="gauge-status-dot" style={{ 
        backgroundColor: status === 'danger' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#10b981',
        boxShadow: `0 0 6px ${status === 'danger' ? '#ef444480' : status === 'warning' ? '#f59e0b80' : '#10b98180'}`
      }} />
    </div>
  );
}
