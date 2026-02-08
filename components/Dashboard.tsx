'use client';

import { useState, useEffect, useRef } from 'react';
import Gauge from './Gauge';
import HistoryChart from './HistoryChart';
import axios from 'axios';
import { logout } from '@/lib/auth';

const TS_CHANNEL = '3229956';
const TS_KEY = 'XOSZ81IYE81XCDLJ';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [alarmActive, setAlarmActive] = useState(false);
  const [alarmAcked, setAlarmAcked] = useState(false);
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

  // Poll ThingSpeak
  useEffect(() => {
    const poll = async () => {
      try {
        // Fetch from ThingSpeak
        const res = await axios.get(`https://api.thingspeak.com/channels/${TS_CHANNEL}/feeds/last.json?api_key=${TS_KEY}`);
        const feed = res.data;
        
        const reading = {
          voltage: parseFloat(feed.field1) || 0,
          temp: parseFloat(feed.field2) || 0,
          oilLevel: parseFloat(feed.field3) || 0,
          quality: parseFloat(feed.field4) || 0,
        };

        setData(reading);
        setLastUpdated(new Date());

        // Alarm Logic: Voltage Drop (< 50V)
        if (reading.voltage < 50) {
          console.log("CRITICAL VOLTAGE DETECTED:", reading.voltage);
          if (!alarmAcked) {
            setAlarmActive(true);
            if (audioRef.current) {
              audioRef.current.play().catch(e => console.error("Audio play failed:", e));
            }
          }
        } else {
          // If power returns, we DON'T auto-reset the alarm anymore
          // This ensures the operator sees the failure occurred
          if (alarmActive) console.log("Power restored, but keeping alarm active until ACK");
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
      } finally {
        setLoading(false);
      }
    };

    poll(); // Initial call
    const interval = setInterval(poll, 15000); // 15s poll
    return () => clearInterval(interval);
  }, [alarmAcked]); // Depend on ack state so poll can read it

  if (loading && !data) return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-cyan-500">
      <div className="animate-pulse text-2xl font-bold">Initializing SCADA Uplink...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12 font-sans selection:bg-cyan-500/30 relative overflow-hidden">
      {/* Alarm Overlay */}
      {alarmActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-900/50 backdrop-blur-sm animate-pulse">
          <div className="bg-slate-900 border-4 border-red-500 p-10 rounded-3xl text-center shadow-[0_0_100px_rgba(220,38,38,0.5)]">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-4xl font-black text-red-500 mb-2">POWER FAILURE DETECTED</h1>
            <p className="text-xl text-white mb-8">Voltage Critical: {data?.voltage}V</p>
            <button 
              onClick={handleAckAlarm}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-xl text-xl shadow-lg transition-transform active:scale-95"
            >
              ACKNOWLEDGE & SILENCE
            </button>
          </div>
        </div>
      )}

      <audio ref={audioRef} loop preload="auto" crossOrigin="anonymous">
        <source src="/alarm.mp3" type="audio/mp3" />
      </audio>

      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="HYAT Logo" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">HYAT</span> SCADA
            </h1>
            <p className="text-slate-500 text-sm font-mono">ID: 315KVA-01 • ADDIS ABABA</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <button 
            onClick={handleLogout}
            className="text-xs font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest mr-4"
          >
            Logout
          </button>
          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${error ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-emerald-900/20 border-emerald-500 text-emerald-500'}`}>
            {error ? 'OFFLINE' : 'LIVE UPLINK'}
          </div>
          <div className="text-xs text-slate-600 font-mono">
            {lastUpdated?.toLocaleTimeString()}
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {/* Location Card */}
        <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📍</span>
              <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Site Location</h3>
            </div>
            <p className="text-xs font-mono text-cyan-500 mb-4">ADDIS ABABA: 9.018472, 38.750917</p>
          </div>
          <div className="rounded-xl overflow-hidden border border-slate-800 h-32">
            <iframe 
              width="100%" 
              height="100%" 
              src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1000!2d38.750917!3d9.018472!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2set!4v123456789&maptype=satellite"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
            ></iframe>
          </div>
        </div>

        <Gauge 
          value={data.voltage} 
          min={180} max={260} 
          label="Voltage" 
          unit="V" 
          warnLow={200} warnHigh={240} 
          color="#10b981"
        />
        <Gauge 
          value={data.temp} 
          min={0} max={100} 
          label="Temperature" 
          unit="°C" 
          warnHigh={80} 
          color="#06b6d4" 
        />
        <Gauge 
          value={data.oilLevel} 
          min={0} max={100} 
          label="Oil Level" 
          unit="%" 
          warnLow={20} 
          color="#f59e0b" 
        />
        <Gauge 
          value={data.quality} 
          min={0} max={100} 
          label="Quality" 
          unit="%" 
          warnLow={70} 
          color="#8b5cf6" 
        />
      </div>

      {/* Charts & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <HistoryChart data={history} />
        </div>
        
        {/* Simple Log/Status Panel */}
        <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700 p-6 shadow-xl">
          <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <span className="text-sm text-slate-300">Transformer Status</span>
              <span className="text-xs font-bold text-emerald-400">OPTIMAL</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <span className="text-sm text-slate-300">Cooling System</span>
              <span className="text-xs font-bold text-emerald-400">ACTIVE</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <span className="text-sm text-slate-300">Security Breach</span>
              <span className="text-xs font-bold text-slate-500">NONE</span>
            </div>

            {/* AI Prediction Card */}
            {prediction && prediction.ready && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🤖</span>
                  <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest">System Health Forecast</h4>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Current Health Score</span>
                      <span className={`font-mono font-bold ${prediction.health.current < 70 ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {prediction.health.current}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${prediction.health.current < 70 ? 'bg-orange-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${prediction.health.current}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Predicted (15m)</span>
                      <span className={`font-mono font-bold ${prediction.health.predicted < 70 ? 'text-red-400' : 'text-cyan-400'}`}>
                        {prediction.health.predicted}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${prediction.health.predicted < 70 ? 'bg-red-500' : 'bg-cyan-500'}`} 
                        style={{ width: `${prediction.health.predicted}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-right mt-1 text-slate-500">{prediction.health.direction}</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-8 pt-4 border-t border-slate-800">
              <h4 className="text-xs text-slate-500 uppercase mb-2">Recent Alerts</h4>
              <div className="h-32 overflow-y-auto text-xs font-mono space-y-1 text-slate-400 custom-scrollbar">
                {history.slice(0, 10).map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-slate-600">[{new Date(h.timestamp).toLocaleTimeString()}]</span>
                    <span>V:{h.voltage} T:{h.temp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
