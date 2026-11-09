import React from 'react';
import { motion } from 'motion/react';
import { playMaterialSound } from './AudioEngine';

interface CardWithCutoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  acousticMaterial?: 'concrete' | 'aluminum' | 'clay' | 'stone' | 'wood';
  acousticFreq?: number;
  interactive?: boolean;
}

export const CardWithCutout: React.FC<CardWithCutoutProps> = ({
  children,
  acousticMaterial = 'stone',
  acousticFreq,
  interactive = true,
  className = '',
  id,
  ...props
}) => {
  const handleTap = () => {
    if (interactive) {
      playMaterialSound(
        acousticMaterial as 'concrete' | 'aluminum' | 'clay' | 'stone' | 'wood',
        acousticFreq
      );
    }
  };

  return (
    <motion.div
      id={id}
      whileHover={interactive ? { y: -4, scale: 1.01 } : {}}
      whileTap={interactive ? { scale: 0.99, y: -1 } : {}}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onClick={handleTap}
      className={`relative bg-[#1A1A1A] border border-[#242424] rounded-[32px] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03),0_8px_30px_rgb(0,0,0,0.4)] transition-all overflow-visible ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
      {...(props as any)}
    >
      {/* Organic Cut-out Notches on Left and Right Sides */}
      {/* Left Notch */}
      <div className="absolute top-1/2 -left-[17px] w-8 h-8 rounded-full bg-[#080808] border border-[#242424] -translate-y-1/2 z-10 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
        {/* Physical fasteners/rivet inside the socket */}
        <div className="w-2 h-2 rounded-full bg-gradient-to-b from-[#333333] to-[#1a1a1a] border border-[#444444] shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
      </div>

      {/* Right Notch */}
      <div className="absolute top-1/2 -right-[17px] w-8 h-8 rounded-full bg-[#080808] border border-[#242424] -translate-y-1/2 z-10 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
        {/* Physical fasteners/rivet inside the socket */}
        <div className="w-2 h-2 rounded-full bg-gradient-to-b from-[#333333] to-[#1a1a1a] border border-[#444444] shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-0 h-full w-full">
        {children}
      </div>
    </motion.div>
  );
};
