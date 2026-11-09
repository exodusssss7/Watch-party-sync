const fs = require('fs');

let theater = fs.readFileSync('src/components/SyncedTheater.tsx', 'utf-8');
theater = theater.replace('import ReactPlayer from \'react-player\';', 'import ReactPlayer from \'react-player\';\nconst Player = ReactPlayer as any;');
theater = theater.replace('{/* @ts-ignore */}\\n          <ReactPlayer', '<Player');
theater = theater.replace('{/* @ts-ignore */}\n          <ReactPlayer', '<Player');
theater = theater.replace('</ReactPlayer>', '</Player>');
fs.writeFileSync('src/components/SyncedTheater.tsx', theater);
