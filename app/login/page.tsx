'use client';

import { useState } from 'react';
import { login } from '@/lib/auth';
import Image from 'next/image';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const result = await login(formData);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 selection:bg-cyan-500/30">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-2xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex p-5 rounded-3xl bg-slate-800/50 mb-6 border border-slate-700 shadow-inner">
            <Image src="/logo.png" alt="HYAT Logo" width={64} height={64} className="object-contain" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">HYAT</span> ADMIN
          </h1>
          <p className="text-slate-500 text-xs font-mono uppercase tracking-[0.3em]">Secure SCADA Gateway</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">System Identifier</label>
            <input
              name="username"
              type="text"
              required
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all duration-300"
              placeholder="HAYT"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Access Key</label>
            <input
              name="password"
              type="password"
              required
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all duration-300"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-500/5 border border-red-500/20 text-red-400 text-[11px] py-3 px-4 rounded-xl text-center font-bold animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="group w-full relative overflow-hidden bg-white text-slate-950 font-black py-4 rounded-2xl transition-all duration-300 active:scale-[0.98] shadow-xl shadow-white/5 uppercase tracking-widest disabled:opacity-50"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                'Initialize Uplink'
              )}
            </span>
          </button>
        </form>

        <div className="mt-12 pt-6 border-t border-slate-800/50 text-center">
          <p className="text-slate-600 text-[9px] uppercase tracking-[0.25em] leading-relaxed">
            Proprietary System • ADDIS ABABA Hub<br/>
            Unauthorized Access is strictly prohibited
          </p>
        </div>
      </div>
    </div>
  );
}