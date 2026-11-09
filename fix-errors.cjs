const fs = require('fs');

// CardWithCutout.tsx
let card = fs.readFileSync('src/components/CardWithCutout.tsx', 'utf-8');
card = card.replace('{...props}', '{...(props as any)}');
fs.writeFileSync('src/components/CardWithCutout.tsx', card);

// InteractiveWaves.tsx
let waves = fs.readFileSync('src/components/InteractiveWaves.tsx', 'utf-8');
waves = waves.replace('const animationRef = useRef<number>();', 'const animationRef = useRef<number | null>(null);');
waves = waves.replace('animationRef.current = requestAnimationFrame(animate);', 'animationRef.current = requestAnimationFrame(animate);');
fs.writeFileSync('src/components/InteractiveWaves.tsx', waves);

// SyncedTheater.tsx
let theater = fs.readFileSync('src/components/SyncedTheater.tsx', 'utf-8');
theater = theater.replace('playerVars: { modestbranding: 1 }', 'playerVars: { modestbranding: 1 } as any');
fs.writeFileSync('src/components/SyncedTheater.tsx', theater);
