'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function HistoryChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="text-slate-500 text-center py-10">No history data yet</div>;

  // Reverse data for chart (oldest to newest)
  const chartData = [...data].reverse().map(d => ({
    ...d,
    time: format(new Date(d.timestamp), 'HH:mm:ss')
  }));

  return (
    <div className="w-full h-64 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700 p-4 shadow-xl">
      <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4">Live History (Voltage)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tick={{fill: '#94a3b8'}} />
          <YAxis stroke="#94a3b8" fontSize={12} tick={{fill: '#94a3b8'}} domain={['auto', 'auto']} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
            itemStyle={{ color: '#00ff41' }}
          />
          <Line type="monotone" dataKey="voltage" stroke="#00ff41" strokeWidth={2} dot={false} activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
