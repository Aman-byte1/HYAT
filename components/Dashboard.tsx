'use client';

import { useState, useEffect, useRef } from 'react';
import Gauge from './Gauge';
import HistoryChart from './HistoryChart';
import axios from 'axios';
import { logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Reading } from '@/lib/analysis';
import Image from 'next/image';

const TS_CHANNEL = '3229956';
const TS_KEY = 'XOSZ81IYE81XCDLJ';

interface PredictionData {
  ready: boolean;
  health: {
    current: number;
    predicted: number;
    direction: string;
  };
  ml?: {
    active: boolean;
    prediction?: number;
    confidence?: number;
    failureProbability?: number;
    riskLabel?: string;
    model?: string;
  };
}

export default function Dashboard() {
  const [data, setData] = useState<Reading | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [alarmActive, setAlarmActive] = useState(false);
  const [alarmAcked, setAlarmAcked] = useState(false);
  const [activeChart, setActiveChart] = useState<'voltage' | 'temperature' | 'all'>('voltage');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    router.refresh();
  };

  const handleAckAlarm = () => {
    console.log("Alarm acknowledged");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAlarmAcked(true);
    setAlarmActive(false);
  };

  // Poll Logic (Real)
  useEffect(() => {
    const poll = async () => {
      try {
        // Fetch from ThingSpeak
        const res = await axios.get(`https://api.thingspeak.com/channels/${TS_CHANNEL}/feeds/last.json?api_key=${TS_KEY}`);
        const feed = res.data;
        
        const sensorVoltage = parseFloat(feed.field1) || 0;
        const sensorTemp = parseFloat(feed.field3) || 0;
        
        // Single voltage sensor → replicate across all 3 phases
        const reading: Reading = {
          voltage1: sensorVoltage,
          voltage2: sensorVoltage,
          voltage3: sensorVoltage,
          current1: 0,
          current2: 0,
          current3: 0,
          temp: sensorTemp,
          oilLevel: feed.field2 ? parseFloat(feed.field2) : 0,
          quality: feed.field4 ? parseFloat(feed.field4) : 0,
          timestamp: new Date().toISOString()
        };

        setData(reading);
        setLastUpdated(new Date());

        // Alarm Logic: Voltage Drop (< 50V) on Phase 1
        if (reading.voltage1 < 50) {
          if (!alarmAcked) {
            setAlarmActive(true);
            if (audioRef.current) {
              audioRef.current.play().catch(e => console.error("Audio play failed:", e));
            }
          }
        }

        // Save to our DB via API
        await axios.post('/api/readings', reading);

        // Fetch updated history from our DB
        const histRes = await axios.get('/api/readings');
        setHistory(histRes.data);

        // Fetch AI Prediction
        const predRes = await axios.get('/api/predict');
        setPrediction(predRes.data);

        setError('');
      } catch (err) {
        console.error("Polling error", err);
        setError('Connection lost... Retrying');
      }
    };

    poll(); // Initial call
    const interval = setInterval(poll, 15000); 
    return () => clearInterval(interval);
  }, [alarmAcked, alarmActive]); 

  // Get transformer status
  const getTransformerStatus = () => {
    if (prediction?.ml?.active) {
      const label = prediction.ml.riskLabel;
      if (label === 'CRITICAL') return { text: 'CRITICAL', color: 'red' };
      if (label === 'WARNING') return { text: 'WARNING', color: 'amber' };
      if (label === 'CAUTION') return { text: 'CAUTION', color: 'yellow' };
      if (label === 'NORMAL') return { text: 'NORMAL', color: 'emerald' };
    }
    // Fallback
    if (!data) return { text: 'UNKNOWN', color: 'slate' };
    if (data.temp > 90 || data.voltage1 < 50) return { text: 'CRITICAL', color: 'red' };
    if (data.temp > 59) return { text: 'WARNING', color: 'amber' };
    return { text: 'NORMAL', color: 'emerald' };
  };

  const txStatus = getTransformerStatus();

  if (!data) return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <div className="loading-text">Initializing SCADA Uplink...</div>
      <div className="loading-sub">Connecting to transformer sensors</div>
    </div>
  );

  return (
    <div className="dashboard">
      {/* Alarm Overlay */}
      {alarmActive && (
        <div className="alarm-overlay">
          <div className="alarm-card">
            <div className="alarm-icon-ring">
              <span className="alarm-icon">⚠️</span>
            </div>
            <h1 className="alarm-title">POWER FAILURE DETECTED</h1>
            <p className="alarm-subtitle">Voltage Critical: <strong>{data?.voltage1.toFixed(1)}V</strong></p>
            <div className="alarm-details">
              <div className="alarm-detail-row">
                <span>Phase L1</span><span className="alarm-detail-val">{data?.voltage1.toFixed(1)}V</span>
              </div>
              <div className="alarm-detail-row">
                <span>Phase L2</span><span className="alarm-detail-val">{data?.voltage2.toFixed(1)}V</span>
              </div>
              <div className="alarm-detail-row">
                <span>Phase L3</span><span className="alarm-detail-val">{data?.voltage3.toFixed(1)}V</span>
              </div>
            </div>
            <button onClick={handleAckAlarm} className="alarm-btn">
              ACKNOWLEDGE & SILENCE
            </button>
          </div>
        </div>
      )}

      <audio ref={audioRef} loop preload="auto" crossOrigin="anonymous">
        <source src="/alarm.mp3" type="audio/mp3" />
      </audio>

      {/* ── Header ── */}
      <header className="dash-header">
        <div className="dash-header-left">
          <Image src="/logo.png" alt="HYAT Logo" width={40} height={40} className="dash-logo" />
          <div>
            <h1 className="dash-title">
              <span className="dash-title-accent">HYAT</span> SCADA
            </h1>
            <p className="dash-subtitle">Transformer ID: 315KVA-01 • Addis Ababa</p>
          </div>
        </div>
        <div className="dash-header-right">
          <button onClick={handleLogout} className="dash-logout-btn">Logout</button>
          <div className={`dash-status-badge ${error ? 'dash-status-badge--offline' : 'dash-status-badge--live'}`}>
            <span className="dash-status-dot" />
            {error ? 'OFFLINE' : 'LIVE'}
          </div>
          <span className="dash-time">{lastUpdated?.toLocaleTimeString()}</span>
        </div>
      </header>

      {/* ── Top Stats Row ── */}
      <div className="stats-row">
        <div className="stat-card stat-card--primary">
          <div className="stat-card-icon">⚡</div>
          <div className="stat-card-content">
            <span className="stat-card-label">Voltage (Avg)</span>
            <span className="stat-card-value">{data.voltage1.toFixed(1)}<span className="stat-card-unit">V</span></span>
          </div>
        </div>
        <div className="stat-card stat-card--current" style={{ borderTop: '2px solid #3b82f6', background: 'rgba(59, 130, 246, 0.05)' }}>
          <div className="stat-card-icon" style={{color: '#3b82f6'}}>🔌</div>
          <div className="stat-card-content">
            <span className="stat-card-label">Current (Avg)</span>
            <span className="stat-card-value">{data.current1.toFixed(1)}<span className="stat-card-unit">A</span></span>
          </div>
        </div>
        <div className="stat-card stat-card--temp">
          <div className="stat-card-icon">🌡️</div>
          <div className="stat-card-content">
            <span className="stat-card-label">Temperature</span>
            <span className="stat-card-value">{data.temp.toFixed(1)}<span className="stat-card-unit">°C</span></span>
          </div>
        </div>
        <div className="stat-card stat-card--oil">
          <div className="stat-card-icon">🛢️</div>
          <div className="stat-card-content">
            <span className="stat-card-label">Oil Level</span>
            <span className="stat-card-value">{data.oilLevel.toFixed(1)}<span className="stat-card-unit">%</span></span>
          </div>
        </div>
        <div className={`stat-card stat-card--status stat-card--${txStatus.color}`}>
          <div className="stat-card-icon">🔧</div>
          <div className="stat-card-content">
            <span className="stat-card-label">Transformer</span>
            <span className="stat-card-value stat-card-value--status">{txStatus.text}</span>
          </div>
        </div>
      </div>

      {/* ── 3-Phase Voltage Section ── */}
      <section className="section-panel">
        <div className="section-header">
          <div className="section-title-row">
            <span className="section-icon">⚡</span>
            <h2 className="section-title">3-Phase Voltage Monitoring</h2>
          </div>
          <span className="section-badge">Single Sensor → 3-Phase</span>
        </div>
        <div className="phase-grid">
          <Gauge 
            value={data.voltage1} 
            min={0} max={300} 
            label="Phase L1" 
            unit="V" 
            warnLow={200} warnHigh={240} 
            color="#10b981"
            icon={<span style={{color:'#10b981'}}>⚡</span>}
          />
          <Gauge 
            value={data.voltage2} 
            min={0} max={300} 
            label="Phase L2" 
            unit="V" 
            warnLow={200} warnHigh={240} 
            color="#06b6d4"
            icon={<span style={{color:'#06b6d4'}}>⚡</span>}
          />
          <Gauge 
            value={data.voltage3} 
            min={0} max={300} 
            label="Phase L3" 
            unit="V" 
            warnLow={200} warnHigh={240} 
            color="#8b5cf6"
            icon={<span style={{color:'#8b5cf6'}}>⚡</span>}
          />
        </div>
      </section>

      {/* ── 3-Phase Current Section (No Sensor) ── */}
      <section className="section-panel">
        <div className="section-header">
          <div className="section-title-row">
            <span className="section-icon">🔌</span>
            <h2 className="section-title">3-Phase Current Monitoring</h2>
          </div>
          <span className="section-badge">Offline / No Sensor</span>
        </div>
        <div className="phase-grid">
          <Gauge 
            value={data.current1} 
            min={0} max={100} 
            label="Phase L1" 
            unit="A" 
            warnHigh={80} 
            color="#3b82f6"
            icon={<span style={{color:'#3b82f6'}}>🔌</span>}
          />
          <Gauge 
            value={data.current2} 
            min={0} max={100} 
            label="Phase L2" 
            unit="A" 
            warnHigh={80} 
            color="#3b82f6"
            icon={<span style={{color:'#3b82f6'}}>🔌</span>}
          />
          <Gauge 
            value={data.current3} 
            min={0} max={100} 
            label="Phase L3" 
            unit="A" 
            warnHigh={80} 
            color="#3b82f6"
            icon={<span style={{color:'#3b82f6'}}>🔌</span>}
          />
        </div>
      </section>

      {/* ── Sensor Readings Section ── */}
      <section className="section-panel">
        <div className="section-header">
          <div className="section-title-row">
            <span className="section-icon">📡</span>
            <h2 className="section-title">Sensor Readings</h2>
          </div>
        </div>
        <div className="sensor-grid">
          <Gauge 
            value={data.temp} 
            min={0} max={120} 
            label="Oil Temperature" 
            unit="°C" 
            warnHigh={80} 
            color="#f97316"
            icon={<span>🌡️</span>}
          />
          <Gauge 
            value={data.oilLevel} 
            min={0} max={100} 
            label="Oil Level" 
            unit="%" 
            warnLow={20} 
            color="#f59e0b"
            icon={<span>🛢️</span>}
          />
          <Gauge 
            value={data.quality} 
            min={0} max={100} 
            label="Power Quality" 
            unit="%" 
            warnLow={70} 
            color="#8b5cf6"
            icon={<span>📊</span>}
          />
        </div>
      </section>

      {/* ── Charts Section ── */}
      <section className="section-panel">
        <div className="section-header">
          <div className="section-title-row">
            <span className="section-icon">📈</span>
            <h2 className="section-title">Live Trends</h2>
          </div>
          <div className="chart-tabs">
            <button 
              className={`chart-tab ${activeChart === 'voltage' ? 'chart-tab--active' : ''}`}
              onClick={() => setActiveChart('voltage')}
            >⚡ Voltage</button>
            <button 
              className={`chart-tab ${activeChart === 'temperature' ? 'chart-tab--active' : ''}`}
              onClick={() => setActiveChart('temperature')}
            >🌡️ Temperature</button>
            <button 
              className={`chart-tab ${activeChart === 'all' ? 'chart-tab--active' : ''}`}
              onClick={() => setActiveChart('all')}
            >📊 Overview</button>
          </div>
        </div>
        <HistoryChart data={history} mode={activeChart} />
      </section>

      {/* ── Bottom Row: AI + Status + Map ── */}
      <div className="bottom-grid">
        {/* AI Prediction */}
        <div className="panel ai-panel">
          <div className="panel-header">
            <span className="panel-icon">🤖</span>
            <h3 className="panel-title">AI Health Forecast</h3>
            {prediction?.ml?.active && (
              <span className="ml-badge">ML ACTIVE</span>
            )}
          </div>
          {prediction && prediction.ready ? (
            <div className="ai-content">
              {/* ML Risk Label */}
              {prediction.ml?.active && (
                <div className={`ml-risk-card ml-risk-card--${prediction.ml.riskLabel?.toLowerCase()}`}>
                  <div className="ml-risk-label">{prediction.ml.riskLabel}</div>
                  <div className="ml-risk-details">
                    <span>Failure Prob: <strong>{prediction.ml.failureProbability}%</strong></span>
                    <span>Confidence: <strong>{prediction.ml.confidence}%</strong></span>
                  </div>
                  <div className="ml-model-tag">{prediction.ml.model}</div>
                </div>
              )}
              <div className="ai-score-block">
                <div className="ai-score-header">
                  <span className="ai-score-label">Current Health</span>
                  <span className={`ai-score-value ${prediction.health.current < 70 ? 'ai-score-value--warn' : ''}`}>
                    {prediction.health.current}%
                  </span>
                </div>
                <div className="ai-bar-track">
                  <div 
                    className={`ai-bar-fill ${prediction.health.current < 70 ? 'ai-bar-fill--warn' : ''}`}
                    style={{ width: `${prediction.health.current}%` }}
                  />
                </div>
              </div>
              <div className="ai-score-block">
                <div className="ai-score-header">
                  <span className="ai-score-label">Predicted (15m)</span>
                  <span className={`ai-score-value ${prediction.health.predicted < 70 ? 'ai-score-value--danger' : 'ai-score-value--cyan'}`}>
                    {prediction.health.predicted}%
                  </span>
                </div>
                <div className="ai-bar-track">
                  <div 
                    className={`ai-bar-fill ${prediction.health.predicted < 70 ? 'ai-bar-fill--danger' : 'ai-bar-fill--cyan'}`}
                    style={{ width: `${prediction.health.predicted}%` }}
                  />
                </div>
                <div className="ai-direction">{prediction.health.direction}</div>
              </div>
            </div>
          ) : (
            <div className="ai-loading">
              <div className="ai-loading-pulse" />
              <span>Collecting data for prediction...</span>
            </div>
          )}
        </div>

        {/* System Status */}
        <div className="panel status-panel">
          <div className="panel-header">
            <span className="panel-icon">🔋</span>
            <h3 className="panel-title">System Status</h3>
          </div>
          <div className="status-rows">
            <div className="status-row">
              <span className="status-row-label">Transformer</span>
              <span className={`status-row-badge status-row-badge--${txStatus.color}`}>{txStatus.text}</span>
            </div>
            <div className="status-row">
              <span className="status-row-label">Cooling System</span>
              <span className="status-row-badge status-row-badge--emerald">ACTIVE</span>
            </div>
            <div className="status-row">
              <span className="status-row-label">Security Breach</span>
              <span className="status-row-badge status-row-badge--slate">NONE</span>
            </div>
            <div className="status-row">
              <span className="status-row-label">Temp Sensor</span>
              <span className={`status-row-badge ${data.temp > 0 ? 'status-row-badge--emerald' : 'status-row-badge--red'}`}>
                {data.temp > 0 ? 'CONNECTED' : 'OFFLINE'}
              </span>
            </div>
            <div className="status-row">
              <span className="status-row-label">Voltage Sensor</span>
              <span className={`status-row-badge ${data.voltage1 > 0 ? 'status-row-badge--emerald' : 'status-row-badge--red'}`}>
                {data.voltage1 > 0 ? 'CONNECTED' : 'OFFLINE'}
              </span>
            </div>
          </div>
          <div className="recent-alerts-section">
            <h4 className="recent-alerts-title">Recent Activity</h4>
            <div className="recent-alerts-list">
              {history.slice(0, 8).map((h, i) => (
                <div key={i} className="recent-alert-item">
                  <span className="recent-alert-time">[{new Date(h.timestamp).toLocaleTimeString()}]</span>
                  <span className="recent-alert-data">V:{h.voltage1.toFixed(0)} T:{h.temp.toFixed(1)}°C Oil:{h.oilLevel.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Location Card */}
        <div className="panel location-panel">
          <div className="panel-header">
            <span className="panel-icon">📍</span>
            <h3 className="panel-title">Site Location</h3>
          </div>
          <p className="location-coords">Addis Ababa: 9.018472, 38.750917</p>
          <div className="location-map">
            <iframe 
              width="100%" 
              height="100%" 
              src="https://maps.google.com/maps?q=9.018472,38.750917&t=&z=15&ie=UTF8&iwloc=B&output=embed"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
            ></iframe>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="dash-footer">
        <span>© 2026 HYAT Technologies • Advanced Transformer Monitoring</span>
        <span className="dash-footer-version">v2.0.0</span>
      </footer>
    </div>
  );
}
