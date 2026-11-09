const fs = require('fs');

let theater = fs.readFileSync('src/components/SyncedTheater.tsx', 'utf-8');

// Change getCurrentTime() back to currentTime
theater = theater.replace(/playerRef\.current\.getCurrentTime\(\)/g, "playerRef.current.currentTime");
theater = theater.replace(/playerRef\.current\.seekTo\((.*?), 'seconds'\)/g, "playerRef.current.currentTime = $1");

// Change onSeek to onSeeked
theater = theater.replace(/onSeek=\{/g, "onSeeked={");

fs.writeFileSync('src/components/SyncedTheater.tsx', theater);
