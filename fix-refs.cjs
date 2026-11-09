const fs = require('fs');

let content = fs.readFileSync('src/components/SyncedTheater.tsx', 'utf-8');

// Fullscreen
content = content.replace(
  "} else if ((videoRef.current as any)?.webkitEnterFullscreen) {\n        (videoRef.current as any).webkitEnterFullscreen();\n      }",
  "}"
);

content = content.replace(/if \(videoRef\.current\) \{/g, "if (playerRef.current) {");

// handlePlaybackEvent should be correct, but let's check
// The initial room sync block:
content = content.replace(
  /if \(data\.videoState && videoRef\.current\) \{\s*videoRef\.current\.currentTime = data\.videoState\.currentTime;\s*if \(data\.videoState\.playing && videoRef\.current\.paused\) \{\s*videoRef\.current\.play\(\)\.catch\(\(\) => \{\}\);\s*\} else if \(\!data\.videoState\.playing && \!videoRef\.current\.paused\) \{\s*videoRef\.current\.pause\(\);\s*\}\s*\}/g,
  `if (data.videoState && playerRef.current) {
          playerRef.current.seekTo(data.videoState.currentTime, 'seconds');
          setIsPlaying(data.videoState.playing);
        }`
);

// Reaction host actions
content = content.replace(
  "videoRef.current.pause();",
  "setIsPlaying(false);"
);

content = content.replace(
  "videoRef.current.play().catch(() => {});",
  "setIsPlaying(true);"
);

// inside data.type === 'video-state' (the main sync logic)
content = content.replace(
  /if \(data\.playing && videoRef\.current\.paused\) \{\s*videoRef\.current\.play\(\)\.catch\(\(\) => \{\}\);\s*\} else if \(\!data\.playing && \!videoRef\.current\.paused\) \{\s*videoRef\.current\.pause\(\);\s*\}/g,
  `if (data.playing !== isPlaying) {
              setIsPlaying(data.playing);
            }`
);

content = content.replace(
  /const diff = Math\.abs\(videoRef\.current\.currentTime - data\.currentTime\);\s*if \(diff > 1\.5\) \{\s*videoRef\.current\.currentTime = data\.currentTime;\s*\}/g,
  `const diff = Math.abs(playerRef.current.getCurrentTime() - data.currentTime);
            if (diff > 1.5) {
              playerRef.current.seekTo(data.currentTime, 'seconds');
            }`
);

fs.writeFileSync('src/components/SyncedTheater.tsx', content);
