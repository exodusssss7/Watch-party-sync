import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Room, AestheticPreset } from '../types';
import { playMaterialSound } from './AudioEngine';
import { X, CheckCircle2, ShieldAlert, Sparkles, Sliders, ArrowRight, Play } from 'lucide-react';
import { aestheticPresets } from '../data';

interface CastingModalProps {
  roomConfig: {
    name: string;
    movieTitle: string;
    movieUrl: string;
    hostName: string;
    selectedPreset: 'concrete' | 'aluminum' | 'clay' | 'stone' | 'wood';
  };
  onClose: () => void;
  onSuccess: (room: Room) => void;
}

export const CastingModal: React.FC<CastingModalProps> = ({
  roomConfig,
  onClose,
  onSuccess
}) => {
  // Press-to-cast state
  const [isPressing, setIsPressing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [castSuccess, setCastSuccess] = useState<boolean>(false);
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const pressInterval = useRef<any>(null);
  const preset = aestheticPresets.find(p => p.id === roomConfig.selectedPreset) || aestheticPresets[0];

  const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isLoading || castSuccess) return;
    
    // Clear any existing interval to prevent double-firing
    if (pressInterval.current) {
      clearInterval(pressInterval.current);
    }

    setIsPressing(true);
    setProgress(0);
    playMaterialSound(preset.id);

    const startTime = Date.now();
    const duration = 1500; // 1.5 seconds of holding

    pressInterval.current = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);

      if (pct >= 100) {
        if (pressInterval.current) {
          clearInterval(pressInterval.current);
          pressInterval.current = null;
        }
        setIsPressing(false);
        setIsLoading(true);
        await fabricateRoom();
      }
    }, 30);
  };

  const handlePressEnd = () => {
    if (isLoading || castSuccess) return;
    setIsPressing(false);
    setProgress(0);
    if (pressInterval.current) {
      clearInterval(pressInterval.current);
      pressInterval.current = null;
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (pressInterval.current) {
        clearInterval(pressInterval.current);
      }
    };
  }, []);

  const fabricateRoom = async () => {
    try {
      // POST the room to the Express server
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roomConfig)
      });

      if (!response.ok) {
        throw new Error('Failed to create room on server');
      }

      const roomData: Room = await response.json();
      setCreatedRoom(roomData);

      // Play satisfying solid strike and chime
      playMaterialSound('stone', 290);
      setTimeout(() => {
        playMaterialSound('aluminum', 680);
      }, 180);

      setCastSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Error fabricating room: Server is unreachable.');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterStream = () => {
    if (createdRoom) {
      onSuccess(createdRoom);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#080808]/95 backdrop-blur-md z-50 overflow-y-auto flex justify-center pb-12 select-none">
      <div className="w-full max-w-md bg-[#080808] min-h-screen flex flex-col relative border-x border-[#242424] px-6 pt-6">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-[#242424] mb-6">
          <div className="flex flex-col">
            <span className="font-mono text-[9px] tracking-widest text-[#707070] uppercase">
              FABRICATION MANIFEST
            </span>
            <span className="font-sans text-xs font-bold tracking-widest text-[#E0E0E0]">
              CAST THEATER ROOM
            </span>
          </div>

          <button
            onClick={() => {
              playMaterialSound('clay', 400);
              onClose();
            }}
            className="w-8 h-8 rounded-full border border-[#242424] bg-[#1A1A1A] flex items-center justify-center hover:border-neutral-700 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-4 h-4 text-[#707070] hover:text-[#E0E0E0]" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!castSuccess ? (
            <motion.div
              key="hold-to-cast"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col justify-between pb-8"
            >
              {/* Spec Sheet Display */}
              <div className="flex flex-col gap-5">
                <div className="p-5 rounded-[28px] bg-[#1A1A1A] border border-[#242424] shadow-inner flex flex-col gap-3">
                  <span className="font-mono text-[9px] tracking-widest text-[#707070] uppercase">
                    FABRICATION SPEC SHEET
                  </span>
                  
                  <div className="flex flex-col gap-1.5 border-b border-[#242424] pb-2.5">
                    <span className="text-[10px] font-mono text-[#707070]">ROOM NAME:</span>
                    <span className="text-xs font-sans font-bold text-[#E0E0E0] uppercase">{roomConfig.name}</span>
                  </div>

                  <div className="flex flex-col gap-1.5 border-b border-[#242424] pb-2.5">
                    <span className="text-[10px] font-mono text-[#707070]">MOVIE TITLE:</span>
                    <span className="text-xs font-sans font-bold text-[#E0E0E0] uppercase">{roomConfig.movieTitle}</span>
                  </div>

                  <div className="flex flex-col gap-1.5 border-b border-[#242424] pb-2.5">
                    <span className="text-[10px] font-mono text-[#707070]">HOST IDENTITY:</span>
                    <span className="text-xs font-sans font-bold text-[#E0E0E0] uppercase">{roomConfig.hostName}</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-mono text-[#707070]">ACOUSTIC SPACE PRESET:</span>
                    <span className="text-xs font-sans font-bold text-[#E0E0E0] uppercase">{preset.name}</span>
                  </div>
                </div>

                <div className="p-4 rounded-[20px] bg-[#111111] border border-[#242424] flex gap-3 items-center">
                  <ShieldAlert className="w-5 h-5 text-neutral-400 flex-shrink-0" />
                  <p className="text-[10px] font-mono text-[#707070] uppercase leading-normal">
                    ROOM PRESETS WILL DEFINE THE VISUAL BACKGROUND AND REVERB RATINGS OF YOUR MULTI-USER VIDEO ENCLAVE.
                  </p>
                </div>
              </div>

              {/* Huge Tactile Hold Button */}
              <div className="flex flex-col items-center gap-6 mt-8">
                <div className="text-center">
                  <span className="text-[10px] font-mono text-[#707070] uppercase tracking-wider block mb-1">
                    {isPressing ? 'ENGRAVING SEALS...' : 'FIRM PRESSURE TO CAST'}
                  </span>
                  <span className="text-[11px] font-sans font-semibold text-[#E0E0E0] block">
                    Hold down to fabricate room on network
                  </span>
                </div>

                <div 
                  className="relative w-44 h-44 flex items-center justify-center select-none touch-none cursor-pointer"
                  onMouseDown={handlePressStart}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                  onTouchStart={handlePressStart}
                  onTouchEnd={handlePressEnd}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {/* Circular progress track */}
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
                    <circle
                      cx="88"
                      cy="88"
                      r="76"
                      stroke="#1A1A1A"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="88"
                      cy="88"
                      r="76"
                      stroke="#E0E0E0"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 76}
                      strokeDashoffset={2 * Math.PI * 76 * (1 - progress / 100)}
                      strokeLinecap="round"
                      className="transition-all duration-75"
                    />
                  </svg>

                  {/* Press Button Center */}
                  <div
                    className={`w-32 h-32 rounded-full flex flex-col justify-center items-center transition-all border border-[#242424] shadow-[0_12px_24px_rgba(0,0,0,0.8)] pointer-events-none ${
                      isPressing
                        ? 'bg-[#121212] scale-95 shadow-[inset_0_4px_10px_rgba(0,0,0,0.9)]'
                        : 'bg-[#1E1E1E] hover:border-neutral-700'
                    }`}
                  >
                    <Sliders className={`w-8 h-8 text-neutral-400 mb-1 transition-transform ${isPressing ? 'scale-110' : ''}`} />
                    <span className="font-sans text-[10px] font-black tracking-widest text-[#E0E0E0] uppercase">
                      {isPressing ? `${progress.toFixed(0)}%` : 'CAST ROOM'}
                    </span>
                  </div>
                </div>

                <div className="w-full text-center">
                  <span className="font-mono text-[9px] text-[#707070] uppercase">
                    SYSTEM STATUS: READY FOR SOLID FABRICATION
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="cast-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 20 }}
              className="flex-1 flex flex-col justify-between pb-8 items-center text-center pt-8"
            >
              <div className="flex flex-col items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-[#E0E0E0] flex items-center justify-center shadow-[0_4px_20px_rgba(255,255,255,0.2)]">
                  <CheckCircle2 className="w-8 h-8 text-[#080808]" />
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="font-sans text-lg font-black tracking-wider text-[#E0E0E0] uppercase">
                    THEATER ENGRAVED
                  </h3>
                  <p className="text-xs font-sans text-neutral-400 max-w-xs leading-relaxed">
                    Movie Room <span className="text-white font-semibold">{createdRoom?.name}</span> is now active on the central network.
                  </p>
                </div>

                <div className="p-5 rounded-[28px] bg-[#1A1A1A] border border-[#242424] shadow-inner text-left w-full mt-4 flex flex-col gap-2.5">
                  <span className="font-mono text-[9px] tracking-widest text-[#707070] uppercase block">
                    NETWORK RECEIPT
                  </span>
                  <div className="flex justify-between items-center text-xs font-mono border-b border-[#242424] pb-2">
                    <span className="text-[#707070]">ROOM HASH:</span>
                    <span className="text-[#E0E0E0] font-bold">{createdRoom?.id}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[#707070]">STATION PRESET:</span>
                    <span className="text-[#E0E0E0] uppercase">{createdRoom?.selectedPreset}</span>
                  </div>
                </div>
              </div>

              <div className="w-full pt-8">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleEnterStream}
                  className="w-full py-4 rounded-full bg-[#E0E0E0] text-[#080808] text-xs font-sans font-bold tracking-[0.2em] shadow-[0_4px_24px_rgba(255,255,255,0.1),inset_0_1px_1px_white] hover:bg-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  START STREAMING
                  <ArrowRight className="w-4 h-4 text-[#080808]" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
