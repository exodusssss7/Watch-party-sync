const fs = require('fs');

let theater = fs.readFileSync('src/components/SyncedTheater.tsx', 'utf-8');
theater = theater.replace('const playerRef = useRef<ReactPlayer>(null);', 'const playerRef = useRef<any>(null);');
theater = theater.replace('<ReactPlayer', '{/* @ts-ignore */}\n          <ReactPlayer');
fs.writeFileSync('src/components/SyncedTheater.tsx', theater);
