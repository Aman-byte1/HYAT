'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  warnLow?: number;
  warnHigh?: number;
  color?: string;
}

export default function Gauge({ value, min, max, label, unit, warnLow, warnHigh, color = '#00ff41' }: GaugeProps) {
  const percentage = Math.min(Math.max((value - min) / (max - min) * 100, 0), 100);
  
  // Determine color based on thresholds
  let finalColor = color;
  if (warnLow !== undefined && value < warnLow) finalColor = '#ef4444'; // Red
  if (warnHigh !== undefined && value > warnHigh) finalColor = '#ef4444'; // Red
  
  // Warning range logic could be added here (yellow)
  if (warnLow !== undefined && value >= warnLow && value < (warnLow + 10)) finalColor = '#f59e0b';
  if (warnHigh !== undefined && value <= warnHigh && value > (warnHigh - 10)) finalColor = '#f59e0b';

  const data = [
    { name: 'Value', value: percentage },
    { name: 'Rest', value: 100 - percentage },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden group hover:border-cyan-500/50 transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2 z-10">{label}</h3>
      
      <div className="w-full h-32 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="70%"
              startAngle={180}
              endAngle={0}
              innerRadius="70%"
              outerRadius="90%"
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell key="cell-0" fill={finalColor} />
              <Cell key="cell-1" fill="#1e293b" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pt-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-white drop-shadow-md">
              {value}<span className="text-sm text-slate-500 ml-1">{unit}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-full flex justify-between text-xs text-slate-500 px-4 mt-[-10px] z-10">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
