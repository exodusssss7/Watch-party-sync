const fs = require('fs');

let theater = fs.readFileSync('src/components/SyncedTheater.tsx', 'utf-8');
theater = theater.replace('playerVars: { modestbranding: 1 } as any', '');
theater = theater.replace('playerVars: { modestbranding: 1 }', '');
fs.writeFileSync('src/components/SyncedTheater.tsx', theater);
