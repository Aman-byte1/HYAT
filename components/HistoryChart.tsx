'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';
import { Reading } from '@/lib/analysis';

interface HistoryChartProps {
  data: Reading[];
  mode?: 'voltage' | 'temperature' | 'all';
}

export default function HistoryChart({ data, mode = 'all' }: HistoryChartProps) {
  if (!data || data.length === 0) return (
    <div className="history-chart-empty">
      <div className="history-chart-empty-icon">📊</div>
      <p>Awaiting sensor data...</p>
    </div>
  );

  // Reverse data for chart (oldest to newest)
  const chartData = [...data].reverse().map(d => ({
    ...d,
    time: format(new Date(d.timestamp), 'HH:mm'),
    timeFull: format(new Date(d.timestamp), 'HH:mm:ss')
  }));

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-time">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="chart-tooltip-row">
              <span className="chart-tooltip-dot" style={{ backgroundColor: entry.color }} />
              <span className="chart-tooltip-label">{entry.name}</span>
              <span className="chart-tooltip-value">{entry.value?.toFixed(1)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (mode === 'voltage') {
    return (
      <div className="history-chart-card">
        <div className="history-chart-header">
          <div className="history-chart-title-row">
            <span className="history-chart-icon">⚡</span>
            <h3>3-Phase Voltage Trend</h3>
          </div>
          <span className="history-chart-badge">LIVE</span>
        </div>
        <div className="history-chart-body">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="voltGrad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="voltGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="voltGrad3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#475569" fontSize={11} tick={{fill: '#64748b'}} axisLine={{ stroke: '#1e293b' }} />
              <YAxis stroke="#475569" fontSize={11} tick={{fill: '#64748b'}} domain={['auto', 'auto']} axisLine={{ stroke: '#1e293b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area name="L1 Voltage" type="monotone" dataKey="voltage1" stroke="#10b981" strokeWidth={2} fill="url(#voltGrad1)" dot={false} activeDot={{ r: 4, stroke: '#10b981', strokeWidth: 2 }} />
              <Area name="L2 Voltage" type="monotone" dataKey="voltage2" stroke="#06b6d4" strokeWidth={1.5} fill="url(#voltGrad2)" dot={false} activeDot={{ r: 3 }} strokeDasharray="4 2" />
              <Area name="L3 Voltage" type="monotone" dataKey="voltage3" stroke="#8b5cf6" strokeWidth={1.5} fill="url(#voltGrad3)" dot={false} activeDot={{ r: 3 }} strokeDasharray="6 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (mode === 'temperature') {
    return (
      <div className="history-chart-card">
        <div className="history-chart-header">
          <div className="history-chart-title-row">
            <span className="history-chart-icon">🌡️</span>
            <h3>Temperature Trend</h3>
          </div>
          <span className="history-chart-badge history-chart-badge--temp">LIVE</span>
        </div>
        <div className="history-chart-body">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#475569" fontSize={11} tick={{fill: '#64748b'}} axisLine={{ stroke: '#1e293b' }} />
              <YAxis stroke="#475569" fontSize={11} tick={{fill: '#64748b'}} domain={['auto', 'auto']} axisLine={{ stroke: '#1e293b' }} unit="°C" />
              <Tooltip content={<CustomTooltip />} />
              <Area name="Temperature" type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} fill="url(#tempGrad)" dot={false} activeDot={{ r: 4, stroke: '#f97316', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Default: all
  return (
    <div className="history-chart-card">
      <div className="history-chart-header">
        <div className="history-chart-title-row">
          <span className="history-chart-icon">📈</span>
          <h3>System Overview</h3>
        </div>
        <span className="history-chart-badge">LIVE</span>
      </div>
      <div className="history-chart-body">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#475569" fontSize={11} tick={{fill: '#64748b'}} axisLine={{ stroke: '#1e293b' }} />
            <YAxis stroke="#475569" fontSize={11} tick={{fill: '#64748b'}} domain={['auto', 'auto']} axisLine={{ stroke: '#1e293b' }} />
            <Tooltip content={<CustomTooltip />} />
            <Line name="Voltage" type="monotone" dataKey="voltage1" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line name="Temp" type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line name="Oil" type="monotone" dataKey="oilLevel" stroke="#f59e0b" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
