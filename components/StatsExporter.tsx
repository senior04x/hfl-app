import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { Download, Check, Shield, Trophy, Target, Zap, Activity } from 'lucide-react';

export interface PlayerStats {
  username: string;
  level: number;
  rank: string;
  avatarUrl?: string;
  matches: number;
  winRate: number;
  kdRatio: number;
  goals?: number;
  assists?: number;
  mvpCount?: number;
}

interface StatsExporterProps {
  stats: PlayerStats;
}

type ExportState = 'idle' | 'loading' | 'complete';

export const StatsExporter: React.FC<StatsExporterProps> = ({ stats }) => {
  const [state, setState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState<number>(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleStartExport = async () => {
    if (state !== 'idle') return;

    setState('loading');
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 50);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (cardRef.current) {
        const canvas = await html2canvas(cardRef.current, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#0B0F19',
          logging: false,
        });

        const image = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.href = image;
        link.download = `${stats.username}_Amatora_Stats_9x16.png`;
        link.click();
      }

      setProgress(100);
      setState('complete');

      setTimeout(() => {
        setState('idle');
        setProgress(0);
      }, 3000);
    } catch (error) {
      console.error('Export Error:', error);
      clearInterval(interval);
      setState('idle');
      setProgress(0);
    }
  };

  return (
    <div className="relative w-full flex flex-col items-center justify-center py-4">
      {/* 🔮 YASHIRIN 9:16 POSTER CARD (DOM'da -top/left-[9999px]) */}
      <div className="absolute -top-[9999px] -left-[9999px] pointer-events-none">
        <div
          ref={cardRef}
          className="w-[1080px] h-[1920px] bg-[#0B0F19] text-white p-16 flex flex-col justify-between relative overflow-hidden font-sans border-8 border-cyan-500/20"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 0%, rgba(0, 229, 255, 0.18) 0%, transparent 60%),
              radial-gradient(circle at 100% 100%, rgba(15, 23, 42, 0.9) 0%, transparent 50%),
              linear-gradient(180deg, #0B0F19 0%, #05070D 100%)
            `,
          }}
        >
          {/* Cyberpunk Grid Accent Pattern */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(#00E5FF 1px, transparent 1px), linear-gradient(90deg, #00E5FF 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />

          {/* Header Branding */}
          <div className="relative z-10 flex items-center justify-between border-b border-cyan-500/30 pb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[2px]">
                <div className="w-full h-full bg-[#0B0F19] rounded-[14px] flex items-center justify-center">
                  <Zap className="w-8 h-8 text-cyan-400" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                  AMATORA LEAGUE
                </h1>
                <p className="text-xl text-cyan-300/70 font-semibold tracking-widest uppercase">
                  Official Player Card
                </p>
              </div>
            </div>
            <div className="px-6 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 font-bold text-lg tracking-widest uppercase">
              SEASON 2026
            </div>
          </div>

          {/* Player Avatar & Main Badge */}
          <div className="relative z-10 my-auto flex flex-col items-center text-center">
            <div className="relative mb-8">
              <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 opacity-50 blur-xl animate-pulse" />
              <div className="relative w-64 h-64 rounded-full p-2 bg-gradient-to-b from-cyan-400 to-blue-600 shadow-2xl">
                <img
                  src={stats.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'}
                  alt={stats.username}
                  className="w-full h-full object-cover rounded-full border-4 border-[#0B0F19]"
                />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-8 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-black text-2xl rounded-full shadow-lg border-2 border-[#0B0F19]">
                LVL {stats.level}
              </div>
            </div>

            <h2 className="text-7xl font-black tracking-tight text-white mb-3 uppercase drop-shadow-[0_4px_24px_rgba(0,229,255,0.4)]">
              {stats.username}
            </h2>
            <div className="inline-flex items-center gap-3 px-8 py-3 rounded-2xl bg-slate-900/80 border border-cyan-500/30 text-cyan-300 text-2xl font-extrabold uppercase tracking-widest shadow-inner">
              <Shield className="w-7 h-7 text-cyan-400" />
              {stats.rank}
            </div>
          </div>

          {/* Stats Cards Grid */}
          <div className="relative z-10 grid grid-cols-2 gap-8 my-8">
            <div className="bg-slate-900/90 border-2 border-cyan-500/30 rounded-3xl p-8 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-cyan-400/80 font-bold text-xl uppercase tracking-wider">O'yinlar</span>
                <Activity className="w-8 h-8 text-cyan-400" />
              </div>
              <div className="text-6xl font-black text-white">{stats.matches}</div>
              <p className="text-slate-400 text-lg mt-2 font-medium">Jami ishtirok</p>
            </div>

            <div className="bg-slate-900/90 border-2 border-emerald-500/30 rounded-3xl p-8 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-emerald-400/80 font-bold text-xl uppercase tracking-wider">G'alaba %</span>
                <Trophy className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                {stats.winRate}%
              </div>
              <p className="text-slate-400 text-lg mt-2 font-medium">G'alaba chastotasi</p>
            </div>

            <div className="bg-slate-900/90 border-2 border-blue-500/30 rounded-3xl p-8 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-blue-400/80 font-bold text-xl uppercase tracking-wider">K/D Ko'rsatkich</span>
                <Target className="w-8 h-8 text-blue-400" />
              </div>
              <div className="text-6xl font-black text-white">{stats.kdRatio}</div>
              <p className="text-slate-400 text-lg mt-2 font-medium">Samaradorlik</p>
            </div>

            <div className="bg-slate-900/90 border-2 border-amber-500/30 rounded-3xl p-8 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-amber-400/80 font-bold text-xl uppercase tracking-wider">MVP Unvonlari</span>
                <Zap className="w-8 h-8 text-amber-400" />
              </div>
              <div className="text-6xl font-black text-amber-400">{stats.mvpCount || 0}</div>
              <p className="text-slate-400 text-lg mt-2 font-medium">Eng yaxshi o'yinchi</p>
            </div>
          </div>

          {/* Footer Branding */}
          <div className="relative z-10 border-t border-cyan-500/30 pt-8 flex items-center justify-between text-slate-400 font-semibold text-xl">
            <span>AMATORA FOOTBALL MOBILE APP</span>
            <span className="text-cyan-400">#AMATORA2026</span>
          </div>
        </div>
      </div>

      {/* 🎬 INTERAKTIV EKSPORT TUGMASI (UX / Framer Motion States) */}
      <div className="w-full max-w-md px-4">
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.button
              key="idle-btn"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{
                scale: 1.03,
                boxShadow: '0px 0px 25px rgba(0, 229, 255, 0.5)',
              }}
              whileTap={{ scale: 0.97 }}
              onClick={handleStartExport}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 text-white font-extrabold text-base tracking-wide flex items-center justify-center gap-3 border border-cyan-400/40 shadow-lg cursor-pointer transition-all duration-300"
            >
              <Download className="w-5 h-5 text-cyan-200" />
              <span>Eksport variantini yuklash (9:16)</span>
            </motion.button>
          )}

          {state === 'loading' && (
            <motion.div
              key="loading-box"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full py-5 px-6 rounded-2xl bg-slate-900/90 border border-cyan-500/40 flex flex-col items-center justify-center gap-3 shadow-2xl backdrop-blur-lg"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="p-3 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-400"
              >
                <Download className="w-6 h-6" />
              </motion.div>

              <div className="flex items-center gap-2 text-cyan-300 font-black text-lg">
                <span>Rasm tayyorlanmoqda...</span>
                <span className="text-white">{progress}%</span>
              </div>

              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-[2px] border border-cyan-500/20">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 rounded-full shadow-[0_0_12px_rgba(0,229,255,0.8)]"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.1 }}
                />
              </div>
            </motion.div>
          )}

          {state === 'complete' && (
            <motion.div
              key="complete-box"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-base flex items-center justify-center gap-3 border border-emerald-400/50 shadow-[0_0_30px_rgba(16,185,129,0.4)]"
            >
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="w-8 h-8 rounded-full bg-white text-emerald-600 flex items-center justify-center"
              >
                <Check className="w-5 h-5 stroke-[3]" />
              </motion.div>
              <span className="tracking-wider uppercase">TAYYOR! RASM YUKLANDI</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StatsExporter;
