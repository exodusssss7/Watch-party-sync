const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf-8');

server = server.replace(
`  app.delete("/api/rooms/:id", (req, res) => {
    const id = req.params.id;
    if (rooms[id]) {
      delete rooms[id];
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Room not found" });
    }
  });`,
`  app.delete("/api/rooms/:id", (req, res) => {
    const id = req.params.id;
    const username = req.headers['x-username'];
    const room = rooms[id];
    if (room) {
      if (room.hostName === username) {
        delete rooms[id];
        res.json({ success: true });
      } else {
        res.status(403).json({ error: "Only the host can delete this room" });
      }
    } else {
      res.status(404).json({ error: "Room not found" });
    }
  });`
);
fs.writeFileSync('server.ts', server);
