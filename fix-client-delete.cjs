const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');
app = app.replace(
  "fetch(`/api/rooms/${roomId}`, { method: 'DELETE' })",
  "fetch(`/api/rooms/${roomId}`, { method: 'DELETE', headers: { 'x-username': localStorage.getItem('movie_username') || '' } })"
);
fs.writeFileSync('src/App.tsx', app);
