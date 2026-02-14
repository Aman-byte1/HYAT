'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Reading } from '@/lib/analysis';

export default function HistoryChart({ data }: { data: Reading[] }) {
  if (!data || data.length === 0) return <div className="text-slate-500 text-center py-10">No history data yet</div>;

  // Reverse data for chart (oldest to newest)
  const chartData = [...data].reverse().map(d => ({
    ...d,
    time: format(new Date(d.timestamp), 'HH:mm:ss')
  }));

  return (
    <div className="w-full h-64 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700 p-4 shadow-xl">
      <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4">Live History (Phase 1 Voltage)</h3>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tick={{fill: '#94a3b8'}} />
          <YAxis stroke="#94a3b8" fontSize={12} tick={{fill: '#94a3b8'}} domain={['auto', 'auto']} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
          />
          <Line name="Voltage" type="monotone" dataKey="voltage1" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
