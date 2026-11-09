import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AudioLines, Sparkles, Volume2, PackageOpen } from 'lucide-react';
import { playMaterialSound } from './AudioEngine';

interface HeaderProps {
  activeSection: 'gallery' | 'sandbox' | 'cart';
  setActiveSection: (section: 'gallery' | 'sandbox' | 'cart') => void;
  cartCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  setActiveSection,
  cartCount
}) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTabClick = (section: 'gallery' | 'sandbox' | 'cart') => {
    playMaterialSound('clay', 350);
    setActiveSection(section);
  };

  return (
    <header className="relative w-full max-w-md mx-auto pt-6 px-4 flex flex-col gap-4 z-40 select-none">
      {/* Brand & Physical clock */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          {/* Circular logo mark */}
          <div 
            onClick={() => playMaterialSound('aluminum', 750)}
            className="w-8 h-8 rounded-full border border-[#242424] bg-[#1A1A1A] flex items-center justify-center cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.5)] hover:border-neutral-700 active:scale-95 transition-all"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#E0E0E0]" />
          </div>
          <span className="font-sans text-[10px] font-bold tracking-[0.3em] text-[#707070] uppercase">
            OBJECT
          </span>
        </div>

        {/* Real-time timepiece indicator */}
        <div 
          onClick={() => playMaterialSound('stone', 380)}
          className="flex items-center gap-2 py-1 px-3.5 rounded-full bg-[#1A1A1A] border border-[#242424] cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] hover:border-neutral-800"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-pulse" />
          <span className="font-mono text-[10px] font-medium tracking-widest text-neutral-400">
            {time || '00:00:00'}
          </span>
        </div>
      </div>

      {/* Pill-shaped Tactile Navigation Menu */}
      <div className="w-full bg-[#1A1A1A] border border-[#242424] p-1.5 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_4px_20px_rgba(0,0,0,0.4)] flex justify-between items-center">
        <button
          onClick={() => handleTabClick('gallery')}
          className="relative flex-1 py-2 text-xs font-medium tracking-wider rounded-full transition-all focus:outline-none"
        >
          {activeSection === 'gallery' && (
            <motion.div
              layoutId="nav-pill"
              className="absolute inset-0 bg-[#E0E0E0] rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            />
          )}
          <span
            className={`relative z-10 font-sans transition-colors duration-200 ${
              activeSection === 'gallery' ? 'text-[#080808] font-semibold' : 'text-[#707070] hover:text-[#E0E0E0]'
            }`}
          >
            CHANNELS
          </span>
        </button>

        <button
          onClick={() => handleTabClick('sandbox')}
          className="relative flex-1 py-2 text-xs font-medium tracking-wider rounded-full transition-all focus:outline-none"
        >
          {activeSection === 'sandbox' && (
            <motion.div
              layoutId="nav-pill"
              className="absolute inset-0 bg-[#E0E0E0] rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            />
          )}
          <span
            className={`relative z-10 font-sans transition-colors duration-200 ${
              activeSection === 'sandbox' ? 'text-[#080808] font-semibold' : 'text-[#707070] hover:text-[#E0E0E0]'
            }`}
          >
            THEATER
          </span>
        </button>

        <button
          onClick={() => handleTabClick('cart')}
          className="relative flex-1 py-2 text-xs font-medium tracking-wider rounded-full transition-all focus:outline-none"
        >
          {activeSection === 'cart' && (
            <motion.div
              layoutId="nav-pill"
              className="absolute inset-0 bg-[#E0E0E0] rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            />
          )}
          <span
            className={`relative z-10 font-sans transition-colors duration-200 flex items-center justify-center gap-1.5 ${
              activeSection === 'cart' ? 'text-[#080808] font-semibold' : 'text-[#707070] hover:text-[#E0E0E0]'
            }`}
          >
            CREATE
            {cartCount > 0 && (
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full transition-colors ${
                  activeSection === 'cart' ? 'bg-[#080808] text-[#E0E0E0]' : 'bg-[#242424] text-neutral-300'
                }`}
              >
                {cartCount}
              </span>
            )}
          </span>
        </button>
      </div>
    </header>
  );
};
