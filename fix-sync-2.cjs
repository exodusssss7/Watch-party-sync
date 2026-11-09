const fs = require('fs');

let theater = fs.readFileSync('src/components/SyncedTheater.tsx', 'utf-8');

theater = theater.replace(
  `onPause={() => {
              setIsPlaying(false);
              if (!isSyncingRef.current) handlePlaybackEvent();
            }}`,
  `onPause={() => {
              setIsPlaying(false);
              if (!isSyncingRef.current) handlePlaybackEvent(false);
            }}`
);

fs.writeFileSync('src/components/SyncedTheater.tsx', theater);
