const fs = require('fs');
let theater = fs.readFileSync('src/components/SyncedTheater.tsx', 'utf-8');
theater = theater.replace('const playerRef = useRef<any>(null);', 'const playerRef = useRef<ReactPlayer>(null);');
fs.writeFileSync('src/components/SyncedTheater.tsx', theater);
