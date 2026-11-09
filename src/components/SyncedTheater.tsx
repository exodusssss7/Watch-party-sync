import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactPlayer from 'react-player';
const Player = ReactPlayer as any;
import { Room, ChatMessage, AestheticPreset } from '../types';
import { playMaterialSound } from './AudioEngine';
import { InteractiveWaves } from './InteractiveWaves';
import { aestheticPresets } from '../data';
import { 
  Tv, Users, Send, Volume2, Info, RefreshCw, 
  Play, Pause, Compass, Activity, VolumeX, Shield, UserCheck, Maximize, Minimize,
  MessageSquare, Mic, MicOff, Headphones, Radio
} from 'lucide-react';

interface SyncedTheaterProps {
  room: Room;
  username: string;
  isHost: boolean;
  onLeave: () => void;
}

interface FloatingReaction {
  id: string;
  senderName: string;
  reaction: string;
  x: number;
}

interface FullscreenToast {
  id: string;
  sender: string;
  message: string;
  timestamp: number;
  isReplying?: boolean;
  replyInput?: string;
}

export const SyncedTheater: React.FC<SyncedTheaterProps> = ({
  room,
  username,
  isHost: initialIsHost,
  onLeave
}) => {
  const [activeRoom, setActiveRoom] = useState<Room>(room);
  const [isHost, setIsHost] = useState<boolean>(initialIsHost);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'unsynced' | 'connecting'>('connecting');
  const [delayMs, setDelayMs] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showCopied, setShowCopied] = useState<boolean>(false);
  const [showCopiedInvite, setShowCopiedInvite] = useState<boolean>(false);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [fullscreenToasts, setFullscreenToasts] = useState<FullscreenToast[]>([]);
  const [showFullscreenChatPanel, setShowFullscreenChatPanel] = useState<boolean>(false);
  const [showFullscreenCompose, setShowFullscreenCompose] = useState<boolean>(false);
  const [fullscreenComposeInput, setFullscreenComposeInput] = useState<string>('');

  // Voice Chat States
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);
  const [speakingUser, setSpeakingUser] = useState<string | null>(null);

  const isMicActiveRef = useRef<boolean>(false);
  const isDeafenedRef = useRef<boolean>(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceSegmentTimerRef = useRef<any>(null);
  const speakingTimerRef = useRef<any>(null);
  const gainCtxRef = useRef<AudioContext | null>(null);

  // Audio modifier states (carrying over original sandbox values for aesthetic calibration)
  const [frequencyFactor, setFrequencyFactor] = useState<number>(1.0);
  const [decayFactor, setDecayFactor] = useState<number>(1.0);
  const [wavePoints, setWavePoints] = useState<number[]>([]);
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const animationRef = useRef<number | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const fsChatContainerRef = useRef<HTMLDivElement | null>(null);
  const isSyncingRef = useRef<boolean>(false); // prevent infinite sync event loops
  const isHostRef = useRef<boolean>(initialIsHost); // ref to avoid stale closures in WS handler
  const isPlayingRef = useRef<boolean>(false); // ref to avoid stale closures in WS handler & periodic sync

  const preset: AestheticPreset = aestheticPresets.find(p => p.id === activeRoom.selectedPreset) || aestheticPresets[0];

  // Keep refs in sync with state to avoid stale closures in WS handler and intervals
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isDeafenedRef.current = isDeafened; }, [isDeafened]);

  // Voice Engine Handlers (Strict Push-To-Talk & HD Opus Studio Quality Audio)
  const stopVoiceTx = useCallback((e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    isMicActiveRef.current = false;
    setIsMicActive(false);

    if (voiceSegmentTimerRef.current) {
      clearTimeout(voiceSegmentTimerRef.current);
      voiceSegmentTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {}
      mediaRecorderRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }

    if (gainCtxRef.current) {
      gainCtxRef.current.close().catch(() => {});
      gainCtxRef.current = null;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'voice-status', isTalking: false }));
    }

    playMaterialSound('wood', 440);
  }, []);

  const startVoiceTx = useCallback(async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (isMicActiveRef.current || micStreamRef.current) return;

    try {
      isMicActiveRef.current = true;
      setIsMicActive(true);
      playMaterialSound('wood', 880);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (!isMicActiveRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      micStreamRef.current = stream;

      // Boost mic volume with GainNode (2.5x amplification)
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const gainCtx = new AudioCtxClass();
      gainCtxRef.current = gainCtx;
      const micSource = gainCtx.createMediaStreamSource(stream);
      const gainNode = gainCtx.createGain();
      gainNode.gain.value = 2.5;
      const dest = gainCtx.createMediaStreamDestination();
      micSource.connect(gainNode);
      gainNode.connect(dest);
      const boostedStream = dest.stream;

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
        else mimeType = '';
      }

      const startSegment = () => {
        if (!micStreamRef.current || !isMicActiveRef.current) return;

        const chunks: Blob[] = [];
        const recorder = mimeType ? new MediaRecorder(boostedStream, { mimeType }) : new MediaRecorder(boostedStream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (evt) => {
          if (evt.data && evt.data.size > 0) {
            chunks.push(evt.data);
          }
        };

        recorder.onstop = () => {
          if (chunks.length > 0) {
            const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
            if (blob.size > 100) {
              const reader = new FileReader();
              reader.onloadend = () => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({
                    type: 'voice-hd',
                    audio: reader.result
                  }));
                }
              };
              reader.readAsDataURL(blob);
            }
          }
        };

        recorder.start();

        voiceSegmentTimerRef.current = setTimeout(() => {
          if (isMicActiveRef.current && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            startSegment();
          }
        }, 250);
      };

      startSegment();

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'voice-status', isTalking: true }));
      }
    } catch (err) {
      console.error("Microphone initialization error:", err);
      stopVoiceTx();
    }
  }, [stopVoiceTx]);

  // Global mouseup/touchend safeguard for Push-To-Talk release
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (isMicActiveRef.current) {
        stopVoiceTx();
      }
    };
    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    return () => {
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
    };
  }, [stopVoiceTx]);

  // Fullscreen management
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
      setIsFullscreen(isFs);
      if (isFs) setShowFullscreenChatPanel(true);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
      } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  // Client ID helper
  const [clientId] = useState(() => `client_${Math.random().toString(36).substring(2, 9)}`);

  // Auto-format video URLs — routes through server proxy to bypass CORS and handle Dropbox formatting
  const getFormattedVideoUrl = (url: string): string => {
    if (!url) return '';
    const trimmed = url.trim();
    
    // For Dropbox links and other external URLs, route through our server proxy
    // The proxy handles Dropbox URL conversion AND bypasses CORS restrictions
    if (trimmed.includes('dropbox.com')) {
      return `/api/proxy-video/stream.mp4?url=${encodeURIComponent(trimmed)}`;
    }
    
    // For direct MP4/video URLs (non-Dropbox), try direct first
    return trimmed;
  };

  // WebSocket connection & management
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws-rooms`;
    
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setWsConnected(true);
      setSyncStatus('synced');
      // Send join event
      socket.send(JSON.stringify({
        type: 'join',
        roomId: activeRoom.id,
        id: clientId,
        name: username,
        isHost: isHost
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'room-update') {
          setActiveRoom(data.room);
          // Check if my role changed (e.g. promoted to host because previous host disconnected)
          const myUserInList = data.room.viewers.find((v: any) => v.id === clientId);
          if (myUserInList) {
            setIsHost(myUserInList.isHost);
          }
        }

        if (data.type === 'video-state') {
          if (isHostRef.current) return; // Hosts are source of truth, ignore updates

          // Calculate latency
          const latency = Date.now() - data.timestamp;
          setDelayMs(latency > 0 ? latency : 0);

          if (playerRef.current) {
            isSyncingRef.current = true;
            
            // Sync play/pause
            if (data.playing !== isPlayingRef.current) {
              setIsPlaying(data.playing);
            }

            // Sync seek if time difference is greater than 1.5 seconds
            const currentTime = playerRef.current.currentTime || 0;
            const diff = Math.abs(currentTime - data.currentTime);
            if (diff > 1.5) {
              playerRef.current.currentTime = data.currentTime;
              setSyncStatus('synced');
            }
            
            setTimeout(() => {
              isSyncingRef.current = false;
            }, 100);
          }
        }

        if (data.type === 'voice-hd') {
          if (isDeafenedRef.current) return;
          if (!data.audio) return;

          setSpeakingUser(data.senderName || 'ROOM MEMBER');
          if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
          speakingTimerRef.current = setTimeout(() => {
            setSpeakingUser(null);
          }, 2500);

          try {
            const audio = new Audio(data.audio);
            audio.volume = 1.0;
            audio.play().catch(() => {});
          } catch (err) {
            console.error("HD Voice playback failed:", err);
          }
        }

        if (data.type === 'voice-status') {
          if (data.isTalking) {
            setSpeakingUser(data.senderName || 'ROOM MEMBER');
          } else {
            setSpeakingUser(null);
          }
        }

        if (data.type === 'chat') {
          setChatLog(prev => [...prev, {
            name: data.name,
            message: data.message,
            timestamp: data.timestamp
          }]);

          // If in fullscreen, show a beautiful toast
          if (document.fullscreenElement && data.name !== username) {
            const toastId = Math.random().toString();
            setFullscreenToasts(prev => {
              const newToast = {
                id: toastId,
                sender: data.name,
                message: data.message,
                timestamp: data.timestamp,
                isReplying: false,
                replyInput: ''
              };
              const replying = prev.filter(t => t.isReplying);
              const passive = prev.filter(t => !t.isReplying);
              const maxPassive = 2; // only show 2 passive toasts maximum
              const trimmedPassive = [...passive, newToast].slice(-maxPassive);
              return [...replying, ...trimmedPassive];
            });

            // Auto dismiss after 6 seconds if not currently replying
            setTimeout(() => {
              setFullscreenToasts(prev => prev.filter(t => t.id !== toastId || t.isReplying));
            }, 6000);
          }
        }

        if (data.type === 'reaction') {
          const matId = data.reaction;
          let isMaterial = false;
          let isWave = false;
          let reactionLabel = matId;

          if (matId.startsWith('wave:')) {
            isWave = true;
            const [, mat, freq] = matId.split(':');
            playMaterialSound(mat as any, parseFloat(freq));
            reactionLabel = `WAVE:${mat.toUpperCase()}`;
          } else if (matId === 'concrete' || matId === 'aluminum' || matId === 'clay' || matId === 'stone' || matId === 'wood') {
            isMaterial = true;
            playMaterialSound(matId);
            reactionLabel = matId === 'concrete' ? 'SKIP' : matId === 'aluminum' ? 'PAUSE' : matId === 'clay' ? 'RESUME' : matId === 'stone' ? 'REWIND' : 'SYNC';
          } else {
            const pitchMultiplier = matId === '🔥' ? 1.8 : matId === '👏' ? 1.4 : matId === '😮' ? 1.2 : matId === '😂' ? 1.6 : matId === '❤️' ? 1.3 : 1.0;
            playMaterialSound(preset.id as any, preset.acousticProfile.frequency * pitchMultiplier);
          }

          const newReaction: FloatingReaction = {
            id: Math.random().toString(),
            senderName: data.name,
            reaction: reactionLabel,
            x: 15 + Math.random() * 70
          };

          if (!isWave) {
            setReactions(prev => [...prev, newReaction]);
            setTimeout(() => {
              setReactions(prev => prev.filter(r => r.id !== newReaction.id));
            }, 3000);
            
            setChatLog(prev => [...prev, {
              name: data.name,
              message: `RESONATED [${reactionLabel}]`,
              timestamp: data.timestamp
            }]);
          }
        }
      } catch (err) {
        console.error('Error handling ws packet:', err);
      }
    };

    socket.onclose = () => {
      setWsConnected(false);
      setSyncStatus('unsynced');
    };

    return () => {
      socket.close();
    };
  }, [activeRoom.id, username, clientId]);

  // Scroll chat to bottom without scrolling the whole page
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    if (fsChatContainerRef.current) {
      fsChatContainerRef.current.scrollTop = fsChatContainerRef.current.scrollHeight;
    }
  }, [chatLog]);

  // Handle Play/Pause/Seek events from the host to broadcast to guests
  const handlePlaybackEvent = (playingOverride?: boolean) => {
    if (!isHost || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (isSyncingRef.current) return;

    if (playerRef.current) {
      const currentTime = playerRef.current.currentTime || 0;
      wsRef.current.send(JSON.stringify({
        type: 'video-state',
        playing: playingOverride !== undefined ? playingOverride : isPlayingRef.current,
        currentTime: currentTime
      }));
    }
  };

  // Periodic host sync broadcasting every 2 seconds
  useEffect(() => {
    if (!isHost) return;

    const interval = setInterval(() => {
      if (playerRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const currentTime = playerRef.current.currentTime || 0;
        wsRef.current.send(JSON.stringify({
          type: 'video-state',
          playing: isPlayingRef.current,
          currentTime: currentTime
        }));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isHost, isPlaying]);

  // Hard manual resync for guests
  const triggerHardResync = () => {
    playMaterialSound('aluminum', 750);
    setSyncStatus('connecting');
    
    // Request full status from server/host (or just wait for the next periodic packet)
    // For fast results, we can poll the server API to get the cached host state immediately
    fetch(`/api/rooms/${activeRoom.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.videoState && playerRef.current) {
          playerRef.current.currentTime = data.videoState.currentTime;
          setIsPlaying(data.videoState.playing);
          setSyncStatus('synced');
        }
      })
      .catch(() => setSyncStatus('unsynced'));
  };

  // Send a chat message
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    playMaterialSound('clay', 350);
    wsRef.current.send(JSON.stringify({
      type: 'chat',
      message: chatInput.trim()
    }));
    setChatInput('');
  };

  const sendReaction = (reaction: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    // Play sound locally if it's an emoji/material
    if (['concrete', 'aluminum', 'clay', 'stone', 'wood'].includes(reaction)) {
      playMaterialSound(reaction as any);
      triggerResonantStrike();

      // Implement actual useful actions for the host
      if (isHost && playerRef.current) {
        const ct = playerRef.current.currentTime || 0;
        if (reaction === 'concrete') { // SKIP
          playerRef.current.currentTime = ct + 10;
        } else if (reaction === 'stone') { // REWIND
          playerRef.current.currentTime = Math.max(0, ct - 10);
        } else if (reaction === 'aluminum') { // PAUSE
          setIsPlaying(false);
        } else if (reaction === 'clay') { // RESUME
          setIsPlaying(true);
        } else if (reaction === 'wood') { // SYNC
          handlePlaybackEvent();
        }
      }
    } else {
      const pitchMultiplier = reaction === '🔥' ? 1.8 : reaction === '👏' ? 1.4 : reaction === '😮' ? 1.2 : reaction === '😂' ? 1.6 : reaction === '❤️' ? 1.3 : 1.0;
      playMaterialSound(preset.id as any, preset.acousticProfile.frequency * pitchMultiplier);
    }

    wsRef.current.send(JSON.stringify({
      type: 'reaction',
      reaction: reaction
    }));
  };

  const handleWaveInteract = (freq: number) => {
    const matId = preset.id;
    playMaterialSound(matId as any, freq);
    
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'reaction',
      reaction: `wave:${matId}:${freq}`
    }));
  };

  const sendQuickChat = (message: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    playMaterialSound('clay', 350);
    wsRef.current.send(JSON.stringify({
      type: 'chat',
      message: message
    }));
  };

  // Sound triggering & Waveform animation (Carrying over physical acoustic simulator)
  const triggerResonantStrike = () => {
    const baseFreq = preset.acousticProfile.frequency * frequencyFactor;
    playMaterialSound(preset.id, baseFreq);
    generateWave(preset.id, baseFreq);
  };

  const generateWave = (materialId: string, freq: number) => {
    let t = 0;
    const sampleCount = 50;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const runAnimation = () => {
      const points: number[] = [];
      const duration = materialId === 'aluminum' ? 1.5 : materialId === 'stone' ? 0.6 : materialId === 'wood' ? 0.7 : 0.35;
      const decay = (1 / (duration * decayFactor)) * t;

      if (t < 1) {
        for (let i = 0; i < sampleCount; i++) {
          const x = (i / sampleCount) * Math.PI * 12;
          let amp = Math.exp(-decay) * Math.sin(x - t * freq * 0.15);

          if (materialId === 'aluminum') {
            amp += Math.exp(-decay * 0.8) * 0.4 * Math.sin(x * 1.54 - t * freq * 0.2);
          } else if (materialId === 'concrete') {
            amp = Math.exp(-decay * 2) * (Math.sin(x * 0.5 - t * freq * 0.05) + (Math.random() * 0.15 - 0.07));
          } else if (materialId === 'clay') {
            amp = Math.exp(-decay * 2.5) * Math.sin(x * 0.8 - t * freq * 0.1);
          } else if (materialId === 'stone') {
            amp = Math.exp(-decay * 1.5) * (Math.sin(x - t * freq * 0.12) * (1 - (i / sampleCount)));
          }

          points.push(amp);
        }
        setWavePoints(points);
        t += 0.05;
        animationRef.current = requestAnimationFrame(runAnimation);
      } else {
        setWavePoints([]);
      }
    };

    runAnimation();
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className="w-full max-w-md mx-auto px-4 pb-28 select-none flex flex-col gap-5">
      
      {/* Title & Stream Name */}
      <div className="pt-4 text-center">
        <span className="font-sans text-[10px] font-bold tracking-[0.25em] text-[#707070] uppercase">
          THEATER ENGAGED
        </span>
        <h2 className="font-sans text-lg font-black tracking-tight text-white uppercase mt-0.5">
          {activeRoom.name}
        </h2>
        <p className="text-[10px] font-mono text-neutral-500 mt-1 uppercase flex items-center justify-center gap-1.5">
          <Tv className="w-3.5 h-3.5" />
          {activeRoom.movieTitle}
        </p>
      </div>

      {/* Synchronized Brutalist HTML5 Player */}
      <div className="relative w-full bg-[#121212] border border-[#242424] rounded-[36px] overflow-hidden shadow-[inset_0_4px_12px_rgba(0,0,0,0.95),0_12px_36px_rgba(0,0,0,0.7)] p-2">
        <div ref={containerRef} className="relative w-full aspect-video rounded-[28px] overflow-hidden bg-black border border-[#1A1A1A] group">
          <Player
            ref={playerRef}
            src={getFormattedVideoUrl(activeRoom.movieUrl)}
            playing={isPlaying}
            controls={true}
            onPlay={() => {
              setIsPlaying(true);
              if (!isSyncingRef.current) handlePlaybackEvent(true);
            }}
            onPause={() => {
              setIsPlaying(false);
              if (!isSyncingRef.current) handlePlaybackEvent(false);
            }}
            onSeeked={() => {
              if (!isSyncingRef.current) handlePlaybackEvent();
            }}
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
          
          {/* Speaking User Badge Overlay */}
          <AnimatePresence>
            {speakingUser && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                className="absolute top-4 left-4 z-20 bg-emerald-950/90 border border-emerald-500/50 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="text-[9px] font-mono font-bold text-emerald-200 uppercase tracking-wide">
                  {speakingUser} IS SPEAKING...
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top-Right: Non-Fullscreen voice controls + Fullscreen toggle (always) */}
          <div className={`absolute top-4 right-4 z-20 flex items-center gap-2 md:opacity-0 opacity-100 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 ${isFullscreen ? 'hidden' : ''}`}>
            {/* Mic Push-To-Talk Button */}
            <button 
              type="button"
              onMouseDown={startVoiceTx}
              onMouseUp={stopVoiceTx}
              onMouseLeave={stopVoiceTx}
              onTouchStart={startVoiceTx}
              onTouchEnd={stopVoiceTx}
              onTouchCancel={stopVoiceTx}
              onContextMenu={(e) => e.preventDefault()}
              className={`px-3 py-1.5 rounded-xl border font-mono text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                isMicActive 
                  ? 'bg-emerald-600/90 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.7)] animate-pulse' 
                  : 'bg-black/60 hover:bg-black/90 border-[#333] text-neutral-300'
              }`}
              title="Hold to talk to room members"
            >
              <Mic className={`w-3.5 h-3.5 ${isMicActive ? 'text-white animate-bounce' : 'text-emerald-400'}`} />
              <span>{isMicActive ? 'VOICE LIVE' : 'HOLD TO TALK'}</span>
            </button>

            {/* Deafen Button */}
            <button
              type="button"
              onClick={() => {
                playMaterialSound('clay', 300);
                setIsDeafened(prev => !prev);
              }}
              className={`p-1.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer select-none active:scale-95 ${
                isDeafened 
                  ? 'bg-red-950/80 border-red-500 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.5)]' 
                  : 'bg-black/60 hover:bg-black/90 border-[#333] text-neutral-300'
              }`}
              title={isDeafened ? 'Undeafen Voice' : 'Deafen Voice'}
            >
              {isDeafened ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Headphones className="w-3.5 h-3.5 text-neutral-300" />}
            </button>

            <button 
               onClick={toggleFullscreen} 
               className="p-2 bg-black/60 text-white rounded-xl hover:bg-black/90 border border-[#333] transition-all flex items-center justify-center cursor-pointer"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>

          {/* Top-Right: Fullscreen exit button only (fullscreen mode) */}
          {isFullscreen && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button 
                onClick={toggleFullscreen} 
                className="p-2 bg-black/60 text-white rounded-xl hover:bg-black/90 border border-[#333] transition-all flex items-center justify-center cursor-pointer"
              >
                <Minimize className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bottom-Center: Fullscreen Voice & Chat Controls Bar */}
          {isFullscreen && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {/* Mic Push-To-Talk */}
              <button 
                type="button"
                onMouseDown={startVoiceTx}
                onMouseUp={stopVoiceTx}
                onMouseLeave={stopVoiceTx}
                onTouchStart={startVoiceTx}
                onTouchEnd={stopVoiceTx}
                onTouchCancel={stopVoiceTx}
                onContextMenu={(e) => e.preventDefault()}
                className={`px-4 py-2 rounded-2xl border font-mono text-[11px] font-bold transition-all flex items-center gap-2 cursor-pointer select-none active:scale-95 backdrop-blur-md ${
                  isMicActive 
                    ? 'bg-emerald-600/90 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.6)] animate-pulse' 
                    : 'bg-black/70 hover:bg-black/90 border-[#444] text-neutral-200'
                }`}
                title="Hold to talk"
              >
                <Mic className={`w-4 h-4 ${isMicActive ? 'text-white animate-bounce' : 'text-emerald-400'}`} />
                <span>{isMicActive ? 'VOICE LIVE' : 'HOLD TO TALK'}</span>
              </button>

              {/* Deafen */}
              <button
                type="button"
                onClick={() => {
                  playMaterialSound('clay', 300);
                  setIsDeafened(prev => !prev);
                }}
                className={`p-2 rounded-2xl border transition-all flex items-center justify-center cursor-pointer select-none active:scale-95 backdrop-blur-md ${
                  isDeafened 
                    ? 'bg-red-950/80 border-red-500 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.5)]' 
                    : 'bg-black/70 hover:bg-black/90 border-[#444] text-neutral-200'
                }`}
                title={isDeafened ? 'Undeafen' : 'Deafen'}
              >
                {isDeafened ? <VolumeX className="w-4 h-4 text-red-400" /> : <Headphones className="w-4 h-4 text-neutral-200" />}
              </button>

              {/* Chat Toggle */}
              <button 
                onClick={() => setShowFullscreenChatPanel(prev => !prev)} 
                className={`p-2 rounded-2xl border transition-all flex items-center justify-center cursor-pointer backdrop-blur-md ${
                  showFullscreenChatPanel ? 'bg-black/80 border-neutral-400 text-white' : 'bg-black/70 hover:bg-black/90 border-[#444] text-neutral-200'
                }`}
                title="Toggle Chat"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Fullscreen Incoming Chat Toasts */}
          {isFullscreen && (
            <div className="absolute top-16 right-4 z-30 flex flex-col gap-1.5 max-w-[280px] w-full pointer-events-auto">
              <AnimatePresence>
                {fullscreenToasts.map((toast) => (
                  <motion.div
                    key={toast.id}
                    initial={{ opacity: 0, x: 100, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 100, scale: 0.9 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                    className="bg-black/70 backdrop-blur-md border border-neutral-800/40 p-2.5 rounded-xl shadow-2xl flex flex-col gap-1.5 text-white font-mono"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-[8px] text-[#A0A0A0] font-black uppercase tracking-wider block mb-0.5">
                          {toast.sender}
                        </span>
                        <p className="text-[11px] text-neutral-300 leading-normal break-words">
                          {toast.message}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setFullscreenToasts(prev => prev.filter(t => t.id !== toast.id));
                        }}
                        className="text-[9px] text-neutral-500 hover:text-white transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    {!toast.isReplying ? (
                       <button
                        onClick={() => {
                          setFullscreenToasts(prev => prev.map(t => t.id === toast.id ? { ...t, isReplying: true } : t));
                        }}
                        className="self-end px-2.5 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800/60 text-[8px] font-bold text-neutral-400 hover:text-white rounded transition-all active:scale-95 cursor-pointer"
                      >
                        REPLY
                      </button>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!toast.replyInput || !toast.replyInput.trim()) return;
                            sendQuickChat(toast.replyInput);
                            // Clear and close toast
                            setFullscreenToasts(prev => prev.filter(t => t.id !== toast.id));
                          }}
                          className="flex gap-1 mt-0.5"
                        >
                          <input
                            type="text"
                            autoFocus
                            placeholder="REPLY..."
                            value={toast.replyInput || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFullscreenToasts(prev => prev.map(t => t.id === toast.id ? { ...t, replyInput: val } : t));
                            }}
                            className="flex-1 bg-neutral-950/80 border border-neutral-800/60 rounded px-2 py-0.5 text-[9px] text-white placeholder-neutral-700 focus:outline-none focus:border-neutral-500 transition-all uppercase"
                          />
                          <button
                            type="submit"
                            className="px-2 py-0.5 bg-white text-neutral-950 font-black text-[8px] rounded active:scale-95 transition-all cursor-pointer"
                          >
                            SEND
                          </button>
                        </form>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Floating Reactions overlay */}
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            <AnimatePresence>
              {reactions.map((r) => {
                const label = r.reaction === 'concrete' ? 'SKIP' 
                            : r.reaction === 'aluminum' ? 'PAUSE'
                            : r.reaction === 'clay' ? 'RESUME'
                            : r.reaction === 'stone' ? 'REWIND'
                            : r.reaction === 'wood' ? 'SYNC'
                            : r.reaction;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: '80%', scale: 0.8 }}
                    animate={{ 
                      opacity: [0, 1, 1, 0], 
                      y: ['80%', '20%'], 
                      x: [0, (Math.random() - 0.5) * 80], 
                      scale: [0.8, 1.3, 1.3, 0.9] 
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 3.0, ease: "easeOut" }}
                    className="absolute bottom-12 flex flex-col items-center"
                    style={{ left: `${r.x}%` }}
                  >
                    <div className="px-3 py-1.5 bg-black/95 border border-neutral-800 text-[10px] font-mono rounded-2xl text-white shadow-2xl flex items-center gap-2">
                      <span className="text-[8px] text-neutral-400 font-bold tracking-widest">[{label}]</span>
                      <span className="text-[8px] text-neutral-500 border-l border-[#242424] pl-2 uppercase tracking-wide truncate max-w-[80px]">{r.senderName}</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Fullscreen Chat Overlay */}
          <AnimatePresence>
            {isFullscreen && showFullscreenChatPanel && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-20 left-6 right-6 max-w-lg mx-auto bg-black/85 backdrop-blur-md p-4 rounded-3xl border border-[#333] flex flex-col gap-3.5 z-20 shadow-2xl"
              >
                <div ref={fsChatContainerRef} className="w-full h-28 overflow-y-auto flex flex-col gap-2 no-scrollbar scroll-smooth">
                  {chatLog.slice(-5).map((chat, idx) => (
                    <div key={idx} className="flex gap-2 text-[11px] font-mono leading-normal">
                      <span className="text-[#E0E0E0] font-black uppercase shrink-0">{chat.name}:</span>
                      <span className="text-neutral-400 break-words">{chat.message}</span>
                    </div>
                  ))}
                </div>

                {/* Fullscreen Quick Reactions (Restored Tactile Acoustics) */}
                <div className="flex flex-col gap-1.5 border-t border-[#222] pt-2.5">
                  <span className="font-mono text-[8px] text-[#707070] uppercase tracking-widest text-center">
                    QUICK RESONANT REACTION
                  </span>
                  <div className="flex gap-1.5 justify-center flex-wrap">
                    {[
                      { id: 'concrete', label: 'SKIP' },
                      { id: 'aluminum', label: 'PAUSE' },
                      { id: 'clay', label: 'RESUME' },
                      { id: 'stone', label: 'REWIND' },
                      { id: 'wood', label: 'SYNC' }
                    ].map((mat) => (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => sendReaction(mat.id)}
                        className="px-2.5 py-1.5 bg-[#121212] hover:bg-[#1C1C1C] border border-[#242424] hover:border-neutral-700 text-[9px] font-mono text-neutral-400 hover:text-white rounded-md cursor-pointer transition-all active:scale-95 uppercase"
                      >
                        [{mat.label}]
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fullscreen Quick Replies / Quick Chat removed */}

                <form onSubmit={handleSendChat} className="flex gap-2 border-t border-[#222] pt-2.5">
                  <input
                    type="text"
                    placeholder="QUICK REPLY..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-[#111] border border-[#333] rounded-full px-4 py-2 text-xs font-mono tracking-wide text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 transition-all uppercase"
                  />
                  <button
                    type="submit"
                    className="w-8 h-8 rounded-full bg-[#E0E0E0] active:scale-95 border border-white flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
                  >
                    <Send className="w-3 h-3 text-neutral-950" />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sync Metadata Dashboard Bar */}
        <div className="flex justify-between items-center px-4 py-2 mt-1.5 text-[9px] font-mono text-[#707070] border-t border-[#1C1C1C]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span>ROLE: {isHost ? 'HOST' : 'GUEST'}</span>
          </div>

          {/* Quick Voice Bar Right Near Player */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onMouseDown={startVoiceTx}
              onMouseUp={stopVoiceTx}
              onMouseLeave={stopVoiceTx}
              onTouchStart={startVoiceTx}
              onTouchEnd={stopVoiceTx}
              onTouchCancel={stopVoiceTx}
              onContextMenu={(e) => e.preventDefault()}
              className={`px-2.5 py-1 rounded-lg border font-mono text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                isMicActive 
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                  : 'bg-[#1C1C1C] hover:bg-[#2C2C2C] border-[#2A2A2A] text-neutral-300'
              }`}
              title="Hold to talk to room members"
            >
              <Mic className={`w-3 h-3 ${isMicActive ? 'text-white animate-bounce' : 'text-emerald-400'}`} />
              <span>{isMicActive ? 'VOICE LIVE' : 'HOLD MIC'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playMaterialSound('clay', 300);
                setIsDeafened(prev => !prev);
              }}
              className={`px-2 py-1 rounded-lg border font-mono text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                isDeafened 
                  ? 'bg-red-950 border-red-500 text-red-300' 
                  : 'bg-[#1C1C1C] hover:bg-[#2C2C2C] border-[#2A2A2A] text-neutral-300'
              }`}
              title={isDeafened ? 'Undeafen Voice' : 'Deafen Voice'}
            >
              {isDeafened ? <VolumeX className="w-3 h-3 text-red-400" /> : <Headphones className="w-3 h-3 text-neutral-400" />}
              <span>{isDeafened ? 'DEAFENED' : 'DEAFEN'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 relative">
            {showCopied && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute right-0 -top-8 bg-[#161616] border border-neutral-700 text-neutral-200 text-[8px] font-mono font-bold px-2.5 py-1 rounded shadow-md z-30"
              >
                COPIED
              </motion.div>
            )}
            <button
              onClick={() => {
                const inviteUrl = `${window.location.origin}/?room=${activeRoom.id}`;
                navigator.clipboard.writeText(inviteUrl);
                setShowCopied(true);
                setTimeout(() => setShowCopied(false), 2000);
              }}
              className="px-2 py-1 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded border border-[#242424] text-neutral-300 font-bold active:scale-95 transition-all cursor-pointer"
            >
              SHARE LINK
            </button>
            {isHost ? (
              <span className="text-[#E0E0E0] font-bold hidden sm:inline">SOURCE TX</span>
            ) : (
              <button 
                onClick={triggerHardResync}
                className="flex items-center gap-1 text-[#E0E0E0] font-bold bg-[#1C1C1C] hover:bg-[#2C2C2C] active:scale-95 px-2 py-1 rounded border border-[#2A2A2A] transition-all cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-neutral-400" />
                <span className="hidden sm:inline">SYNC ({delayMs}MS)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Room Members Grid */}
      <div className="bg-[#1A1A1A] border border-[#242424] rounded-[28px] p-4 shadow-inner">
        <span className="font-mono text-[9px] tracking-widest text-[#707070] uppercase flex items-center gap-1.5 mb-2.5">
          <Users className="w-3.5 h-3.5 text-neutral-400" />
          ACTIVE MEMBERS ({activeRoom.viewers.length})
        </span>

        <div className="flex flex-wrap gap-2">
          {activeRoom.viewers.map((viewer) => (
            <div 
              key={viewer.id}
              className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 text-[10px] font-mono ${
                viewer.id === clientId
                  ? 'bg-[#E0E0E0] border-[#E0E0E0] text-neutral-950 font-bold'
                  : 'bg-[#0E0E0E] border-[#1C1C1C] text-neutral-400'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${viewer.isHost ? 'bg-red-400' : 'bg-green-400'}`} />
              <span className="uppercase truncate max-w-[80px]">{viewer.name}</span>
              {viewer.isHost && (
                <Shield className={`w-3 h-3 ${viewer.id === clientId ? 'text-neutral-900' : 'text-neutral-500'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Live Brutalist Chat Room */}
      <div className="bg-[#1A1A1A] border border-[#242424] rounded-[32px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.5)] flex flex-col gap-3">
        <span className="font-mono text-[9px] tracking-widest text-[#707070] uppercase">
          LIVE COMMUNICATIONS CHRONICLE
        </span>

        {/* Messages Output Area */}
        <div ref={chatContainerRef} className="w-full h-44 bg-[#080808] border border-[#242424] rounded-2xl p-4 overflow-y-auto flex flex-col gap-2 shadow-inner scroll-smooth">
          {chatLog.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center">
              <span className="text-[10px] font-mono text-[#707070] uppercase">
                COMS ROSTER CLEAR. SEND FIRST DIRECTIVE.
              </span>
            </div>
          ) : (
            chatLog.map((chat, idx) => (
              <div key={idx} className="flex flex-col gap-0.5 text-[11px] font-mono leading-normal border-b border-[#141414] pb-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[#E0E0E0] font-black uppercase tracking-tight">{chat.name}</span>
                  <span className="text-[8px] text-[#505050]">
                    {new Date(chat.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                </div>
                <p className="text-neutral-400 text-left mt-0.5 whitespace-pre-wrap">{chat.message}</p>
              </div>
            ))
          )}
        </div>

        {/* Quick Reactions Bar */}
        <div className="flex flex-col gap-2.5 bg-[#0E0E0E] p-3 rounded-2xl border border-[#242424]">
          <span className="font-mono text-[8px] text-[#707070] uppercase tracking-widest pl-1">
            QUICK TRANSMIT ACOUSTIC REACTION:
          </span>
          <div className="flex gap-1.5 justify-start flex-wrap pl-1">
            {[
              { id: 'concrete', label: 'SKIP' },
              { id: 'aluminum', label: 'PAUSE' },
              { id: 'clay', label: 'RESUME' },
              { id: 'stone', label: 'REWIND' },
              { id: 'wood', label: 'SYNC' }
            ].map((mat) => (
              <button
                key={mat.id}
                type="button"
                onClick={() => sendReaction(mat.id)}
                className="px-2.5 py-1.5 bg-[#121212] hover:bg-[#1E1E1E] border border-[#242424] hover:border-neutral-700 text-[9px] font-mono text-neutral-400 hover:text-white rounded-md cursor-pointer transition-all active:scale-95"
              >
                [{mat.label}]
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendChat} className="flex gap-2">
          <input
            type="text"
            placeholder="TYPE TRANSMISSION..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 bg-[#080808] border border-[#242424] rounded-full px-4 py-3 text-xs font-mono tracking-wide text-white placeholder-neutral-700 focus:outline-none focus:border-neutral-700 transition-all uppercase"
          />
          <button
            type="submit"
            className="w-10 h-10 rounded-full bg-[#E0E0E0] hover:bg-white active:scale-95 border border-white flex items-center justify-center cursor-pointer transition-all flex-shrink-0 shadow-lg"
          >
            <Send className="w-4 h-4 text-neutral-950" />
          </button>
        </form>
      </div>

      {/* Sound Game / Interactive Waves */}
      <div className="bg-[#1A1A1A] border border-[#242424] rounded-[32px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03),0_12px_40px_rgba(0,0,0,0.6)] flex flex-col gap-5">
        <div className="text-[10px] font-sans font-bold tracking-widest text-[#707070] uppercase flex justify-between items-center">
          <span>THEATER SOUND GAME</span>
          <span className="font-mono text-[9px] bg-[#0E0E0E] px-2 py-0.5 rounded-full text-neutral-400">
            INTERACTIVE WAVES
          </span>
        </div>

        <p className="text-[10px] font-mono text-[#707070] uppercase">
          Touch and drag across the wave canvas to generate satisfying synthetic tones based on the room's acoustic preset.
        </p>

        {/* Wave Canvas */}
        <InteractiveWaves 
          onInteract={handleWaveInteract} 
          baseFrequency={preset.acousticProfile.frequency}
        />
      </div>

      {/* Disconnect Room Action Button */}
      <div className="pt-2 pb-12">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            playMaterialSound('clay', 200);
            onLeave();
          }}
          className="w-full py-4 rounded-full bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 text-xs font-sans font-bold tracking-[0.2em] transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          DISCONNECT THEATER ROOM
        </motion.button>
      </div>
    </div>
  );
};
