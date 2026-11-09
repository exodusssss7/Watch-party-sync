const fs = require('fs');

let content = fs.readFileSync('src/components/SyncedTheater.tsx', 'utf-8');

// Import ReactPlayer
content = content.replace("import { motion, AnimatePresence } from 'motion/react';", "import { motion, AnimatePresence } from 'motion/react';\nimport ReactPlayer from 'react-player';");

// Add state and change ref
content = content.replace(
  "const videoRef = useRef<HTMLVideoElement | null>(null);",
  "const playerRef = useRef<any>(null);\n  const [isPlaying, setIsPlaying] = useState<boolean>(false);"
);

// handlePlaybackEvent
content = content.replace(
  "if (videoRef.current) {\n      wsRef.current.send(JSON.stringify({\n        type: 'video-state',\n        playing: !videoRef.current.paused,\n        currentTime: videoRef.current.currentTime\n      }));\n    }",
  "if (playerRef.current) {\n      wsRef.current.send(JSON.stringify({\n        type: 'video-state',\n        playing: isPlaying,\n        currentTime: playerRef.current.getCurrentTime()\n      }));\n    }"
);

// handlePlaybackEvent should probably trigger based on onPlay/onPause of ReactPlayer, which might have race conditions with isPlaying state... Let's just fix it.

content = content.replace(
  "if (videoRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {\n        wsRef.current.send(JSON.stringify({\n          type: 'video-state',\n          playing: !videoRef.current.paused,\n          currentTime: videoRef.current.currentTime\n        }));\n      }",
  "if (playerRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {\n        wsRef.current.send(JSON.stringify({\n          type: 'video-state',\n          playing: isPlaying,\n          currentTime: playerRef.current.getCurrentTime()\n        }));\n      }"
);

// Inside data.type === 'video-state'
content = content.replace(
  /if \(videoRef\.current\) \{[\s\S]*?isSyncingRef\.current = true;\s*\/\/ Sync play\/pause\s*if \(data\.playing && videoRef\.current\.paused\) \{\s*videoRef\.current\.play\(\)\.catch\(\(\) => \{\}\);\s*\} else if \(\!data\.playing && \!videoRef\.current\.paused\) \{\s*videoRef\.current\.pause\(\);\s*\}\s*\/\/ Sync seek if time difference is greater than 1\.5 seconds\s*const diff = Math\.abs\(videoRef\.current\.currentTime - data\.currentTime\);\s*if \(diff > 1\.5\) \{\s*videoRef\.current\.currentTime = data\.currentTime;\s*\}\s*setTimeout\(\(\) => \{\s*isSyncingRef\.current = false;\s*\}, 100\);\s*\}/g,
  `if (playerRef.current) {
            isSyncingRef.current = true;
            
            // Sync play/pause
            if (data.playing !== isPlaying) {
              setIsPlaying(data.playing);
            }

            // Sync seek if time difference is greater than 1.5 seconds
            const diff = Math.abs(playerRef.current.getCurrentTime() - data.currentTime);
            if (diff > 1.5) {
              playerRef.current.seekTo(data.currentTime, 'seconds');
            }

            setTimeout(() => {
              isSyncingRef.current = false;
            }, 100);
          }`
);

// initial room sync
content = content.replace(
  /if \(data\.videoState && videoRef\.current\) \{\s*videoRef\.current\.currentTime = data\.videoState\.currentTime;\s*if \(data\.videoState\.playing && videoRef\.current\.paused\) \{\s*videoRef\.current\.play\(\)\.catch\(\(\) => \{\}\);\s*\} else if \(\!data\.videoState\.playing && \!videoRef\.current\.paused\) \{\s*videoRef\.current\.pause\(\);\s*\}\s*\}/g,
  `if (data.videoState && playerRef.current) {
          playerRef.current.seekTo(data.videoState.currentTime, 'seconds');
          setIsPlaying(data.videoState.playing);
        }`
);

// Reaction host actions
content = content.replace(
  "if (isHost && videoRef.current) {",
  "if (isHost && playerRef.current) {"
);

content = content.replace(
  "videoRef.current.currentTime += 10;",
  "playerRef.current.seekTo(playerRef.current.getCurrentTime() + 10, 'seconds');"
);

content = content.replace(
  "videoRef.current.currentTime -= 10;",
  "playerRef.current.seekTo(playerRef.current.getCurrentTime() - 10, 'seconds');"
);

content = content.replace(
  "videoRef.current.pause();",
  "setIsPlaying(false);"
);

content = content.replace(
  "videoRef.current.play().catch(() => {});",
  "setIsPlaying(true);"
);

// Now the player itself
const oldPlayer = `<video
            ref={videoRef}
            src={getFormattedVideoUrl(activeRoom.movieUrl)}
            controls
            controlsList="nofullscreen"
            onPlay={handlePlaybackEvent}
            onPause={handlePlaybackEvent}
            onSeeked={handlePlaybackEvent}
            className="w-full h-full object-contain"
            playsInline
          />`;

const newPlayer = `<ReactPlayer
            ref={playerRef}
            url={getFormattedVideoUrl(activeRoom.movieUrl)}
            playing={isPlaying}
            controls={true}
            onPlay={() => {
              setIsPlaying(true);
              if (!isSyncingRef.current) handlePlaybackEvent();
            }}
            onPause={() => {
              setIsPlaying(false);
              if (!isSyncingRef.current) handlePlaybackEvent();
            }}
            onSeek={() => {
              if (!isSyncingRef.current) handlePlaybackEvent();
            }}
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
            config={{
              youtube: {
                playerVars: { modestbranding: 1 }
              }
            }}
          />`;

content = content.replace(oldPlayer, newPlayer);

// Because we replaced absolute positioning, let's make sure the wrapper is correct.
content = content.replace(
  '<div ref={containerRef} className="relative w-full aspect-video rounded-[28px] overflow-hidden bg-black border border-[#1A1A1A] group">',
  '<div ref={containerRef} className="relative w-full aspect-video rounded-[28px] overflow-hidden bg-black border border-[#1A1A1A] group">'
);


fs.writeFileSync('src/components/SyncedTheater.tsx', content);

console.log("Theater update done");
