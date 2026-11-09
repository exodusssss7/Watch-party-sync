const fs = require('fs');

let theater = fs.readFileSync('src/components/SyncedTheater.tsx', 'utf-8');
theater = theater.replace(/url=\{getFormattedVideoUrl\(activeRoom\.movieUrl\)\}/g, "src={getFormattedVideoUrl(activeRoom.movieUrl)}");
fs.writeFileSync('src/components/SyncedTheater.tsx', theater);
