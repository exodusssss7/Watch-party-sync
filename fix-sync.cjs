const fs = require('fs');

let theater = fs.readFileSync('src/components/SyncedTheater.tsx', 'utf-8');

theater = theater.replace(
  "const handlePlaybackEvent = () => {",
  "const handlePlaybackEvent = (playingOverride?: boolean) => {"
);

theater = theater.replace(
  "playing: isPlaying,",
  "playing: playingOverride !== undefined ? playingOverride : isPlaying,"
);

theater = theater.replace(
  "if (!isSyncingRef.current) handlePlaybackEvent();",
  "if (!isSyncingRef.current) handlePlaybackEvent(true);"
);

// We need to carefully replace the onPause one:
theater = theater.replace(
  `onPause={() => {
              setIsPlaying(false);
              if (!isSyncingRef.current) handlePlaybackEvent(true);
            }}`,
  `onPause={() => {
              setIsPlaying(false);
              if (!isSyncingRef.current) handlePlaybackEvent(false);
            }}`
);

// And onSeeked one:
theater = theater.replace(
  `onSeeked={() => {
              if (!isSyncingRef.current) handlePlaybackEvent(true);
            }}`,
  `onSeeked={() => {
              if (!isSyncingRef.current) handlePlaybackEvent();
            }}`
);

fs.writeFileSync('src/components/SyncedTheater.tsx', theater);
