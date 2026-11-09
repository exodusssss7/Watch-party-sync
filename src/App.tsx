import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Room, AestheticPreset } from './types';
import { Header } from './components/Header';
import { CardWithCutout } from './components/CardWithCutout';
import { RoomDetailDrawer } from './components/RoomDetailDrawer';
import { CastingModal } from './components/CastingModal';
import { SyncedTheater } from './components/SyncedTheater';
import { playMaterialSound } from './components/AudioEngine';
import { aestheticPresets } from './data';
import { 
  Tv, Users, Compass, Eye, ShieldAlert, 
  Hourglass, Sliders, CheckCircle2, Play, Plus, Trash2, HelpCircle 
} from 'lucide-react';

export default function App() {
  const [activeSection, setActiveSection] = useState<'gallery' | 'sandbox' | 'cart'>('gallery');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  
  // Active theater state (where the user is watching)
  const [currentTheater, setCurrentTheater] = useState<Room | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [currentUserIsHost, setCurrentUserIsHost] = useState<boolean>(false);

  // Creation Form state
  const [formRoomName, setFormRoomName] = useState<string>('');
  const [formMovieTitle, setFormMovieTitle] = useState<string>('');
  const [formMovieUrl, setFormMovieUrl] = useState<string>('');
  const [formHostName, setFormHostName] = useState<string>('');
  const [formPreset, setFormPreset] = useState<'concrete' | 'aluminum' | 'clay' | 'stone' | 'wood'>('concrete');
  const [showCastingModal, setShowCastingModal] = useState<boolean>(false);
  const [joinCode, setJoinCode] = useState<string>('');
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const triggerError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => {
      setErrorToast((current) => current === msg ? null : current);
    }, 4000);
  };

  // Check URL parameters for invite links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    if (roomId) {
      fetch(`/api/rooms/${roomId}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Room not found');
        })
        .then(roomData => {
          setSelectedRoom(roomData);
        })
        .catch(err => {
          console.error('Invite link error:', err);
          triggerError('ROOM NOT FOUND OR HAS BEEN CLOSED.');
        })
        .finally(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
  }, []);

  // Poll for active rooms on the network to show live viewer count updates
  useEffect(() => {
    const fetchRooms = () => {
      fetch('/api/rooms')
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('API failed');
        })
        .then(data => {
          setRooms(data);
          
          // Update current theater if we are in one, using functional update to avoid dependency
          setCurrentTheater(prev => {
            if (prev) {
              const updated = data.find((r: Room) => r.id === prev.id);
              if (updated && JSON.stringify(updated) !== JSON.stringify(prev)) {
                return updated;
              }
            }
            return prev;
          });
        })
        .catch(err => console.debug('Polling error (server launching)', err));
    };

    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectRoomDetail = (room: Room) => {
    playMaterialSound(room.selectedPreset);
    setSelectedRoom(room);
  };

  const handleDeleteRoom = (roomId: string) => {
    if (confirm("Are you sure you want to delete this room?")) {
      fetch(`/api/rooms/${roomId}`, { method: 'DELETE', headers: { 'x-username': localStorage.getItem('movie_username') || '' } })
        .then(() => {
          setRooms(prev => prev.filter(r => r.id !== roomId));
          if (currentTheater?.id === roomId) {
            setCurrentTheater(null);
          }
        })
        .catch(console.error);
    }
  };

  const handleJoinTheater = (username: string) => {
    if (selectedRoom) {
      setCurrentUsername(username);
      setCurrentUserIsHost(false);
      setCurrentTheater(selectedRoom);
      setSelectedRoom(null);
      // Switch to the THEATER screen
      setActiveSection('sandbox');
    }
  };

  const handleCastingSuccess = (newRoom: Room) => {
    // Automatically join as the Host
    setCurrentUsername(newRoom.hostName);
    setCurrentUserIsHost(true);
    setCurrentTheater(newRoom);
    
    // Auto-save host handle
    localStorage.setItem('movie_username', newRoom.hostName);

    // Reset creation form
    setFormRoomName('');
    setFormMovieTitle('');
    setFormMovieUrl('');
    
    // Open theater
    setActiveSection('sandbox');
  };

  const handleLeaveTheater = () => {
    setCurrentTheater(null);
    setCurrentUserIsHost(false);
    setActiveSection('gallery');
  };

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-100 flex flex-col items-center justify-start overflow-x-hidden antialiased selection:bg-neutral-800 selection:text-neutral-100">
      
      {/* Phone container mockup framework */}
      <div className="w-full max-w-md bg-[#080808] min-h-screen flex flex-col relative border-x border-[#242424] shadow-2xl overflow-hidden pb-12">
        
        {/* Error Toast notice */}
        <AnimatePresence>
          {errorToast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-4 right-4 z-50 bg-[#161616] border border-red-500/30 text-red-200 text-[10px] font-mono font-bold tracking-wider px-4 py-3 rounded-full flex items-center justify-between shadow-2xl backdrop-blur-md"
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span>{errorToast}</span>
              </div>
              <button
                onClick={() => setErrorToast(null)}
                className="text-neutral-500 hover:text-neutral-300 text-xs font-bold font-sans"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Soft upper status mesh background */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#1A1A1A] via-[#080808]/50 to-transparent pointer-events-none z-0" />

        {/* Dynamic header and core navigation */}
        <Header
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          cartCount={currentTheater ? 1 : 0}
        />

        {/* Content Screens */}
        <main className="flex-1 w-full mt-6 relative z-10">
          <AnimatePresence mode="wait">
            
            {/* 1. ROOMS CATALOG SCREEN */}
            {activeSection === 'gallery' && (
              <motion.div
                key="gallery"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="px-4 pb-24 flex flex-col gap-6"
              >
                {/* Intro statement block */}
                <div className="px-2">
                  <h1 className="font-sans text-xs font-bold tracking-[0.25em] text-[#E0E0E0] uppercase">
                    THEATER CHANNELS
                  </h1>
                  <p className="text-[11px] font-mono text-[#707070] mt-1 leading-relaxed">
                    Active synchronized listening clusters. Enter any channel to stream synced features in real-time.
                  </p>
                  
                  {/* Join by Code Form */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!joinCode.trim()) return;
                      fetch(`/api/rooms/${joinCode.trim()}`)
                        .then(res => {
                          if (res.ok) return res.json();
                          throw new Error('Room not found');
                        })
                        .then(roomData => setSelectedRoom(roomData))
                        .catch(err => {
                          console.error(err);
                          triggerError('ROOM NOT FOUND OR HAS BEEN CLOSED.');
                        });
                    }}
                    className="mt-4 flex gap-2"
                  >
                    <input
                      type="text"
                      placeholder="ENTER ROOM ID..."
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className="flex-1 bg-[#121212] border border-[#242424] rounded-full px-4 py-3 text-xs font-mono tracking-wide text-white placeholder-neutral-700 focus:outline-none focus:border-neutral-500 transition-all uppercase"
                    />
                    <button
                      type="submit"
                      className="px-5 rounded-full bg-[#E0E0E0] text-[#080808] text-xs font-sans font-bold tracking-widest active:scale-95 transition-transform uppercase"
                    >
                      JOIN
                    </button>
                  </form>
                </div>

                {/* Staggered Grid of Active Rooms */}
                <div className="flex flex-col gap-8 mt-2">
                  {rooms.length === 0 ? (
                    <div className="py-20 px-6 rounded-[40px] border border-dashed border-[#242424] bg-[#1A1A1A] flex flex-col items-center justify-center text-center gap-4 shadow-inner">
                      <div className="w-12 h-12 rounded-full border border-[#242424] bg-[#1A1A1A] flex items-center justify-center">
                        <Tv className="w-5 h-5 text-[#707070]" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-sans text-xs font-bold tracking-widest text-[#707070] uppercase">
                          No Active Enclaves
                        </span>
                        <span className="font-mono text-[9px] text-[#707070] max-w-[200px] leading-relaxed uppercase">
                          Initialize your own custom room inside the "CREATE" tab.
                        </span>
                      </div>
                    </div>
                  ) : (
                    rooms.map((room) => {
                      const roomPreset = aestheticPresets.find(p => p.id === room.selectedPreset) || aestheticPresets[0];
                      return (
                        <CardWithCutout
                          key={room.id}
                          acousticMaterial={room.selectedPreset}
                          acousticFreq={roomPreset.acousticProfile.frequency}
                          className="group"
                          onClick={() => handleSelectRoomDetail(room)}
                        >
                          {/* Photo wrapper */}
                          <div className="relative w-full aspect-[4/3] rounded-[24px] overflow-hidden bg-[#121212] border border-[#242424] shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center justify-center">
                            <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-[#333]">
                              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.7)]" />
                              <span className="font-sans text-sm font-black tracking-[0.2em] text-white uppercase">
                                LIVE
                              </span>
                            </div>

                            {/* Stamped Host badge overlay */}
                            <div className="absolute top-4 left-4 py-1 px-2.5 rounded-full bg-black/70 backdrop-blur-md border border-[#242424] flex items-center justify-center">
                              <span className="font-mono text-[8px] font-black tracking-widest text-[#707070] uppercase">
                                HOST: {room.hostName}
                              </span>
                            </div>

                            {/* Delete Room button */}
                            {localStorage.getItem('movie_username') === room.hostName && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRoom(room.id);
                                }}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/70 backdrop-blur-md border border-[#242424] flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-500 transition-all text-neutral-400 z-10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Viewer badge */}
                            <div className="absolute bottom-4 right-4 flex items-center gap-1">
                              <span className="font-mono text-[9px] font-bold text-neutral-300 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#242424] flex items-center gap-1 uppercase">
                                <Users className="w-3 h-3 text-neutral-400" />
                                {room.viewers.length} VIEWERS
                              </span>
                            </div>
                          </div>

                          {/* Info & Tactile Specs */}
                          <div className="mt-4 px-1 flex flex-col">
                            <div className="flex justify-between items-baseline">
                              <h3 className="font-sans text-base font-black tracking-tight text-neutral-200 transition-colors group-hover:text-white uppercase truncate max-w-[240px]">
                                {room.name}
                              </h3>
                              <span className="font-mono text-[9px] text-[#707070] tracking-wider font-bold">
                                ROOM ID: {room.id}
                              </span>
                            </div>

                            <div className="flex justify-between items-center mt-1.5 text-[10px] font-mono text-[#707070]">
                              <span className="flex items-center gap-1 uppercase truncate max-w-[200px]">
                                <Tv className="w-3 h-3 text-neutral-500" />
                                {room.movieTitle}
                              </span>
                              <span className="flex items-center gap-1.5 text-neutral-400 group-hover:text-neutral-200 transition-colors">
                                SPEC SHEET
                                <Eye className="w-3.5 h-3.5 text-[#707070]" />
                              </span>
                            </div>
                          </div>
                        </CardWithCutout>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}

            {/* 2. THEATER SYNCHRONIZER SCREEN */}
            {activeSection === 'sandbox' && (
              <motion.div
                key="sandbox"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              >
                {currentTheater ? (
                  <SyncedTheater
                    room={currentTheater}
                    username={currentUsername}
                    isHost={currentUserIsHost}
                    onLeave={handleLeaveTheater}
                  />
                ) : (
                  <div className="px-6 py-28 flex flex-col gap-6 items-center text-center">
                    <div className="w-14 h-14 rounded-full border border-[#242424] bg-[#111111] flex items-center justify-center shadow-inner">
                      <Tv className="w-6 h-6 text-neutral-500" />
                    </div>
                    
                    <div className="flex flex-col gap-1.5 max-w-xs">
                      <h3 className="font-sans text-xs font-bold tracking-widest text-[#707070] uppercase">
                        THEATER SUSPENDED
                      </h3>
                      <p className="font-mono text-[9px] text-neutral-500 leading-relaxed uppercase">
                        Choose an active channel from the list or initialize your own to commence real-time synchronized playback.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        playMaterialSound('clay', 400);
                        setActiveSection('gallery');
                      }}
                      className="mt-4 px-6 py-3 rounded-full bg-[#E0E0E0] text-[#080808] text-[10px] font-sans font-bold tracking-widest shadow-lg active:scale-95 transition-all cursor-pointer uppercase"
                    >
                      ENTER CHANNELS
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. CREATE/INITIALIZE ROOM SCREEN */}
            {activeSection === 'cart' && (
              <motion.div
                key="cart"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="px-4 pb-24 flex flex-col gap-6"
              >
                {/* Intro statement block */}
                <div className="px-2">
                  <h1 className="font-sans text-xs font-bold tracking-[0.25em] text-[#E0E0E0] uppercase">
                    INITIALIZE THEATER
                  </h1>
                  <p className="text-[11px] font-mono text-[#707070] mt-1 leading-relaxed">
                    Carve a new synchronized stream node. Specify your media links and dispatch them to the network.
                  </p>
                </div>

                {/* Creation Form */}
                <div className="bg-[#1A1A1A] border border-[#242424] rounded-[36px] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03),0_12px_40px_rgba(0,0,0,0.6)] flex flex-col gap-5">
                  <span className="font-mono text-[9px] tracking-widest text-[#707070] uppercase">
                    FABRICATION SPECIFICATIONS
                  </span>

                  {/* Room Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono text-[#707070] uppercase">ROOM NAME / TITLE</label>
                    <input
                      type="text"
                      placeholder="E.G., BRUTALIST CINEMA BETA"
                      value={formRoomName}
                      onChange={(e) => setFormRoomName(e.target.value)}
                      className="bg-[#080808] border border-[#242424] rounded-full px-4 py-3 text-xs font-mono tracking-wide text-white placeholder-neutral-800 focus:outline-none focus:border-neutral-700 transition-all uppercase"
                    />
                  </div>

                  {/* Movie Title */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono text-[#707070] uppercase">FEATURED MOVIE / VIDEO NAME</label>
                    <input
                      type="text"
                      placeholder="E.G., SINTEL SCI-FI ANTHOLOGY"
                      value={formMovieTitle}
                      onChange={(e) => setFormMovieTitle(e.target.value)}
                      className="bg-[#080808] border border-[#242424] rounded-full px-4 py-3 text-xs font-mono tracking-wide text-white placeholder-neutral-800 focus:outline-none focus:border-neutral-700 transition-all uppercase"
                    />
                  </div>

                  {/* Video URL */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono text-[#707070] uppercase">DROPBOX SHARE LINK OR DIRECT MP4 URL</label>
                    <input
                      type="text"
                      placeholder="HTTPS://WWW.DROPBOX.COM/... OR MP4 DIRECT"
                      value={formMovieUrl}
                      onChange={(e) => setFormMovieUrl(e.target.value)}
                      className="bg-[#080808] border border-[#242424] rounded-full px-4 py-3 text-xs font-mono tracking-wide text-white placeholder-neutral-800 focus:outline-none focus:border-neutral-700 transition-all"
                    />
                    <p className="text-[8px] font-mono text-neutral-500 italic mt-0.5 uppercase px-1">
                      * Dropbox links are auto-formatted instantly for raw, direct, low-latency streams.
                    </p>
                  </div>

                  {/* Host Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono text-[#707070] uppercase">HOST VIEWER NAME</label>
                    <input
                      type="text"
                      placeholder="YOUR OPERATOR HANDLE"
                      value={formHostName}
                      onChange={(e) => setFormHostName(e.target.value)}
                      className="bg-[#080808] border border-[#242424] rounded-full px-4 py-3 text-xs font-mono tracking-wide text-white placeholder-neutral-800 focus:outline-none focus:border-neutral-700 transition-all uppercase"
                    />
                  </div>

                  {/* Preset Selector */}
                  <div className="flex flex-col gap-2.5">
                    <label className="text-[9px] font-mono text-[#707070] uppercase">THEATER SPACE & ACOUSTICS PRESET</label>
                    <div className="grid grid-cols-5 gap-2">
                      {aestheticPresets.map((opt) => {
                        const isSelected = formPreset === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              playMaterialSound(opt.id);
                              setFormPreset(opt.id);
                            }}
                            className={`aspect-square rounded-2xl border flex flex-col items-center justify-center p-1 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#E0E0E0] border-[#E0E0E0] shadow-md'
                                : 'bg-[#080808] border-[#242424] hover:border-neutral-800'
                            }`}
                          >
                            <span className={`text-[8px] font-mono font-black ${isSelected ? 'text-black' : 'text-[#707070]'}`}>
                              {opt.id.toUpperCase()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Open Casting Hold Screen Trigger */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      if (!formRoomName || !formMovieTitle || !formMovieUrl || !formHostName) {
                        playMaterialSound('clay', 150);
                        triggerError('ALL SPECIFICATIONS MUST BE FILLED BEFORE LAUNCHING.');
                        return;
                      }
                      playMaterialSound('stone', 300);
                      setShowCastingModal(true);
                    }}
                    className="w-full py-4 mt-2 rounded-full bg-[#E0E0E0] text-[#080808] text-xs font-sans font-bold tracking-[0.2em] shadow-lg hover:bg-white cursor-pointer flex items-center justify-center gap-1.5 uppercase transition-all"
                  >
                    FABRICATE ROOM CHANNEL
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Global Drawers & Modals Overlay */}
        <AnimatePresence>
          {/* Specs Sheet Drawer */}
          {selectedRoom && (
            <RoomDetailDrawer
              room={selectedRoom}
              onClose={() => setSelectedRoom(null)}
              onJoin={handleJoinTheater}
            />
          )}

          {/* Checkout Casting Drawer */}
          {showCastingModal && (
            <CastingModal
              roomConfig={{
                name: formRoomName.trim(),
                movieTitle: formMovieTitle.trim(),
                movieUrl: formMovieUrl.trim(),
                hostName: formHostName.trim(),
                selectedPreset: formPreset
              }}
              onClose={() => setShowCastingModal(false)}
              onSuccess={handleCastingSuccess}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
