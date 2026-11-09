import React from 'react';
import { motion } from 'motion/react';
import { Room, AestheticPreset } from '../types';
import { playMaterialSound } from './AudioEngine';
import { X, Users, Tv, User, Compass, Activity, ChevronRight } from 'lucide-react';
import { aestheticPresets } from '../data';

interface RoomDetailDrawerProps {
  room: Room;
  onClose: () => void;
  onJoin: (username: string) => void;
}

export const RoomDetailDrawer: React.FC<RoomDetailDrawerProps> = ({
  room,
  onClose,
  onJoin
}) => {
  const [username, setUsername] = React.useState<string>('');
  const [errorMsg, setErrorMsg] = React.useState<string>('');

  const preset: AestheticPreset = aestheticPresets.find(p => p.id === room.selectedPreset) || aestheticPresets[0];

  const handleJoinClick = () => {
    if (!username.trim()) {
      setErrorMsg('ENTER NAME FIRST');
      playMaterialSound('clay', 150);
      return;
    }
    localStorage.setItem('movie_username', username.trim());
    playMaterialSound(preset.id);
    onJoin(username.trim());
  };

  const handleTapAcoustics = () => {
    playMaterialSound(preset.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#080808]/95 backdrop-blur-md z-50 overflow-y-auto flex justify-center pb-12 select-none"
    >
      <div className="w-full max-w-md bg-[#080808] min-h-screen flex flex-col relative border-x border-[#242424]">
        {/* Navigation / Header */}
        <div className="sticky top-0 bg-[#080808]/80 backdrop-blur-md z-10 py-4 px-6 flex justify-between items-center border-b border-[#242424]">
          <div className="flex flex-col">
            <span className="font-mono text-[9px] tracking-widest text-[#707070] uppercase">
              ROOM ID: {room.id}
            </span>
            <span className="font-sans text-xs font-bold tracking-widest text-[#E0E0E0]">
              THEATER SPEC SHEET
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

        {/* Content Body */}
        <div className="px-5 pt-6 flex flex-col gap-6">
          {/* Main Photo: The sole source of color (the theater style banner) */}
          <div className="relative w-full aspect-[3/4] rounded-[40px] overflow-hidden bg-[#121212] border border-[#242424] shadow-[inset_0_4px_12px_rgba(0,0,0,0.8),0_12px_36px_rgba(0,0,0,0.6)] group flex items-center justify-center">
            <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-[#333]">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.7)]" />
              <span className="font-sans text-sm font-black tracking-[0.2em] text-white uppercase">
                LIVE
              </span>
            </div>

            {/* Tap resonance hot spot */}
            <button
              onClick={handleTapAcoustics}
              className="absolute bottom-6 right-6 px-4 py-2 bg-black/80 backdrop-blur-md border border-[#242424] rounded-full text-[10px] font-mono font-bold tracking-widest text-[#E0E0E0] flex items-center gap-1.5 shadow-lg active:scale-95 transition-all hover:border-neutral-600 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-neutral-400 animate-pulse" />
              TEST ACOUSTICS
            </button>
          </div>

          {/* Title and Movie */}
          <div className="flex flex-col">
            <div className="flex justify-between items-baseline flex-wrap gap-2">
              <h1 className="font-sans text-xl font-black tracking-tight text-[#E0E0E0]">
                {room.name}
              </h1>
              <span className="font-mono text-xs font-semibold text-neutral-400 flex items-center gap-1 bg-[#1A1A1A] px-2.5 py-1 rounded-full border border-[#242424]">
                <Users className="w-3 h-3" />
                {room.viewers.length} VIEWING
              </span>
            </div>
            <div className="flex justify-between items-center mt-3 text-[11px] font-mono text-[#707070] border-t border-[#1A1A1A] pt-2">
              <span className="flex items-center gap-1">
                <Tv className="w-3.5 h-3.5" />
                FEATURED: {room.movieTitle}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1 text-[11px] font-mono text-[#707070]">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                HOSTED BY: {room.hostName.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Space Description */}
          <div className="p-5 rounded-[28px] bg-[#1A1A1A] border border-[#242424] shadow-inner flex flex-col gap-2">
            <span className="font-mono text-[9px] tracking-widest text-[#707070] uppercase">
              THEATER CHARACTERISTICS
            </span>
            <p className="text-xs font-sans text-neutral-400 leading-relaxed text-justify">
              This space features the <span className="text-[#E0E0E0] font-semibold">{preset.name}</span> acoustic profile. {preset.description}
            </p>
          </div>

          {/* User Sign-In Form inside the drawer */}
          <div className="bg-[#1A1A1A] border border-[#242424] rounded-[32px] p-5 flex flex-col gap-3">
            <span className="font-mono text-[10px] tracking-widest text-[#707070] uppercase">
              VISITOR LOG / ENTRANCE PASS
            </span>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="YOUR VIEWER HANDLE"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg('');
                }}
                className={`w-full bg-[#080808] border ${errorMsg ? 'border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-[#242424]'} rounded-full px-4 py-3 text-xs font-sans font-medium tracking-wide text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-all text-center uppercase`}
              />
              {errorMsg && (
                <p className="text-[10px] font-mono text-red-400 text-center uppercase">
                  {errorMsg}
                </p>
              )}
            </div>
          </div>

          {/* Laser etched structural specifications list */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-[#1A1A1A] border border-[#242424] rounded-[24px] p-4 flex flex-col justify-between shadow-inner">
              <span className="text-[9px] font-mono text-[#707070] uppercase">VISUAL CODEC</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-sm font-bold font-sans text-[#E0E0E0]">
                  H.264
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  HTML5
                </span>
              </div>
              <span className="text-[8px] font-mono text-[#707070] mt-2 block">
                * Low latency playback
              </span>
            </div>

            <div className="bg-[#1A1A1A] border border-[#242424] rounded-[24px] p-4 flex flex-col justify-between shadow-inner">
              <span className="text-[9px] font-mono text-[#707070] uppercase">ACOUSTICAL DELAY</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-sans text-[#E0E0E0]">
                  {preset.acousticProfile.frequency}
                </span>
                <span className="text-xs font-mono text-neutral-400">
                  ms
                </span>
              </div>
              <span className="text-[8px] font-mono text-[#707070] mt-2 block">
                * Calibrated {preset.id.toUpperCase()} dampening
              </span>
            </div>
          </div>

          {/* Master Materials list */}
          <div className="flex flex-col gap-2 p-1">
            <span className="font-mono text-[9px] tracking-widest text-[#707070] uppercase flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              Stream Details & Presets
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <div className="px-3 py-1.5 rounded-full border border-[#242424] bg-[#1A1A1A] text-[10px] font-mono text-[#707070] shadow-inner">
                {preset.textureDescription}
              </div>
            </div>
          </div>

          {/* Primary Action Section */}
          <div className="pt-4 pb-12">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleJoinClick}
              className="w-full py-4 rounded-full bg-[#E0E0E0] text-[#080808] text-xs font-sans font-bold tracking-[0.2em] shadow-[0_4px_24px_rgba(255,255,255,0.1),inset_0_1px_1px_white] active:shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)] hover:bg-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              ENTER THEATER
              <ChevronRight className="w-4 h-4 text-[#080808]" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
