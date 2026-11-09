import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

interface Viewer {
  id: string;
  name: string;
  isHost: boolean;
}

interface Room {
  id: string;
  name: string;
  movieTitle: string;
  movieUrl: string;
  hostName: string;
  selectedPreset: string;
  createdAt: number;
  videoState: {
    playing: boolean;
    currentTime: number;
    lastUpdated: number;
  };
  viewers: Viewer[];
}

const PORT = process.env.PORT || 3000;

// In-memory rooms database
const rooms: Record<string, Room> = {};

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Endpoints
  app.get("/api/rooms", (req, res) => {
    res.json(Object.values(rooms));
  });

  app.post("/api/rooms", (req, res) => {
    const { name, movieTitle, movieUrl, hostName, selectedPreset } = req.body;
    if (!name || !movieTitle || !movieUrl || !hostName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newRoom: Room = {
      id,
      name,
      movieTitle,
      movieUrl,
      hostName,
      selectedPreset: selectedPreset || 'concrete',
      createdAt: Date.now(),
      videoState: {
        playing: false,
        currentTime: 0,
        lastUpdated: Date.now(),
      },
      viewers: [],
    };
    rooms[id] = newRoom;
    res.json(newRoom);
  });

  app.get("/api/rooms/:id", (req, res) => {
    const room = rooms[req.params.id];
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.json(room);
  });

  app.delete("/api/rooms/:id", (req, res) => {
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
  });

  // Video proxy endpoint — streams external video URLs through the server to bypass CORS
  app.get("/api/proxy-video/stream.mp4", async (req, res) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).json({ error: "Missing 'url' query parameter" });
    }

    try {
      // Format Dropbox URLs for raw content delivery
      let targetUrl = rawUrl;
      if (targetUrl.includes('dropbox.com')) {
        targetUrl = targetUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
        // Replace dl=0 with raw=1 for direct content (handles both ?dl=0 and &dl=0)
        targetUrl = targetUrl.replace(/([?&])dl=0/, '$1raw=1');
        targetUrl = targetUrl.replace(/([?&])dl=1/, '$1raw=1');
        // If no raw/dl param, add raw=1
        if (!targetUrl.includes('raw=1') && !targetUrl.includes('dl=1')) {
          targetUrl += (targetUrl.includes('?') ? '&' : '?') + 'raw=1';
        }
      }

      // Forward range header for seeking support
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const response = await fetch(targetUrl, {
        headers,
        redirect: 'follow'
      });

      if (!response.ok && response.status !== 206) {
        return res.status(response.status).json({ error: `Upstream returned ${response.status}` });
      }

      // Forward essential headers
      let contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      const contentRange = response.headers.get('content-range');
      const acceptRanges = response.headers.get('accept-ranges');

      // Detect video extensions from URL or content-disposition header to prevent Dropbox
      // from misidentifying and returning 'application/json' content-type on direct streams.
      let detectedExtension = '';
      try {
        const parsedUrl = new URL(rawUrl);
        const pathname = parsedUrl.pathname.toLowerCase();
        if (pathname.endsWith('.mp4')) detectedExtension = 'mp4';
        else if (pathname.endsWith('.mkv')) detectedExtension = 'mkv';
        else if (pathname.endsWith('.webm')) detectedExtension = 'webm';
      } catch (e) {
        console.error("Error parsing rawUrl in proxy:", e);
      }

      const disposition = response.headers.get('content-disposition');
      if (disposition) {
        const matches = disposition.match(/filename="?([^";]+)"?/i);
        if (matches && matches[1]) {
          const filename = matches[1].toLowerCase();
          if (filename.endsWith('.mp4')) detectedExtension = 'mp4';
          else if (filename.endsWith('.mkv')) detectedExtension = 'mkv';
          else if (filename.endsWith('.webm')) detectedExtension = 'webm';
        }
      }

      if (detectedExtension === 'mp4') {
        contentType = 'video/mp4';
      } else if (detectedExtension === 'mkv') {
        contentType = 'video/webm'; // Trick browsers into playing MKV files
      } else if (detectedExtension === 'webm') {
        contentType = 'video/webm';
      } else if (contentType && contentType.includes('matroska')) {
        // Fallback check
        contentType = 'video/webm';
      }

      res.status(response.status);
      if (contentType) res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      if (contentRange) res.setHeader('Content-Range', contentRange);
      if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Pipe the response body to the client
      if (response.body) {
        const reader = response.body.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) { res.end(); break; }
            if (!res.write(value)) {
              await new Promise(resolve => res.once('drain', resolve));
            }
          }
        };
        pump().catch(() => res.end());
        
        // Clean up if client disconnects
        req.on('close', () => {
          reader.cancel().catch(() => {});
        });
      } else {
        res.end();
      }
    } catch (err: any) {
      console.error("Proxy error:", err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: "Failed to fetch video from source" });
      }
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  const clients = new Map<WebSocket, { roomId: string; id: string; name: string; isHost: boolean }>();

  function broadcastToRoom(roomId: string, message: any, excludeWs?: WebSocket) {
    const payload = JSON.stringify(message);
    for (const [ws, info] of clients.entries()) {
      if (info.roomId === roomId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  wss.on("connection", (ws: WebSocket) => {
    ws.on("message", (messageStr: string) => {
      try {
        const data = JSON.parse(messageStr.toString());

        if (data.type === "join") {
          const { roomId, id, name, isHost } = data;
          const room = rooms[roomId];
          if (!room) {
            ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
            return;
          }

          clients.set(ws, { roomId, id, name, isHost });

          // Ensure user is unique in viewer list
          room.viewers = room.viewers.filter(v => v.id !== id);
          
          // Determine if we need to promote this user to host
          const hasActiveHost = room.viewers.some(v => v.isHost);
          const promoteToHost = isHost || !hasActiveHost;

          room.viewers.push({
            id,
            name,
            isHost: promoteToHost
          });

          if (promoteToHost) {
            // Unset other hosts in the list
            room.viewers.forEach(v => {
              if (v.id !== id) v.isHost = false;
            });
            const clientData = clients.get(ws);
            if (clientData) clientData.isHost = true;
          }

          // Broadcast state to all room members
          broadcastToRoom(roomId, {
            type: "room-update",
            room
          });
        }

        if (data.type === "video-state") {
          const info = clients.get(ws);
          if (!info) return;

          const room = rooms[info.roomId];
          if (!room) return;

          // Update room cache
          room.videoState = {
            playing: data.playing,
            currentTime: data.currentTime,
            lastUpdated: Date.now()
          };

          // Broadcast playback state to rest of room
          broadcastToRoom(info.roomId, {
            type: "video-state",
            playing: data.playing,
            currentTime: data.currentTime,
            senderId: info.id,
            timestamp: Date.now()
          }, ws);
        }

        if (data.type === "chat") {
          const info = clients.get(ws);
          if (!info) return;

          broadcastToRoom(info.roomId, {
            type: "chat",
            name: info.name,
            message: data.message,
            timestamp: Date.now()
          });
        }

        if (data.type === "reaction") {
          const info = clients.get(ws);
          if (!info) return;

          broadcastToRoom(info.roomId, {
            type: "reaction",
            name: info.name,
            reaction: data.reaction,
            timestamp: Date.now()
          });
        }

        if (data.type === "voice-pcm" || data.type === "voice-hd" || data.type === "voice-status") {
          const info = clients.get(ws);
          if (!info) return;

          broadcastToRoom(info.roomId, {
            ...data,
            senderName: info.name,
            senderId: info.id
          }, ws);
        }
      } catch (err) {
        console.error("WS message processing error:", err);
      }
    });

    ws.on("close", () => {
      const info = clients.get(ws);
      if (!info) return;

      const { roomId, id } = info;
      clients.delete(ws);

      const room = rooms[roomId];
      if (room) {
        const wasHost = room.viewers.find(v => v.id === id)?.isHost;
        room.viewers = room.viewers.filter(v => v.id !== id);

        // If the host left but others are in, elect a new host
        if (wasHost && room.viewers.length > 0) {
          room.viewers[0].isHost = true;
          // Update host status in websocket metadata
          for (const [socket, metadata] of clients.entries()) {
            if (metadata.roomId === roomId && metadata.id === room.viewers[0].id) {
              metadata.isHost = true;
              break;
            }
          }
        }

        // Keep rooms alive for catalogs, only purge if they aren't seeded demo rooms
        if (room.viewers.length === 0 && !roomId.startsWith("DEMO")) {
          // Keep active for 15 minutes of emptiness, but for in-memory let's keep them in the catalog so other people can still join!
        }

        broadcastToRoom(roomId, {
          type: "room-update",
          room
        });
      }
    });
  });

  server.on("upgrade", (request, socket, head) => {
    if (request.url && request.url.startsWith('/ws-rooms')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  // Serve static or dev Vite
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} [VITE + WS ACTIVE]`);
  });
}

startServer();
