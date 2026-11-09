# Watch Party Sync

A synchronized movie theater in the browser. Watch videos together in real time with live rooms, synced playback and chat — everyone sees the same frame at the same moment.

**Live demo:** https://watch-party-sync.onrender.com

## Features

- **Synchronized playback** — play, pause and seek are broadcast to the whole room over WebSockets, so the theater stays frame-in-sync
- **Live rooms & lobbies** — create or join a room and watch together in a shared social lobby
- **Active viewer list** — see exactly who is in the theater with you
- **Live chat** — message the room without leaving the screening
- **Casting support** — send the screening to a bigger screen
- **A premium monochrome design** — a minimalist black-and-white theater UI with soundstage calibration controls

## Quick start

```bash
npm install
npm run build
npm start
```

For development:

```bash
npm run dev
```

The server listens on `PORT` (default `3000`).

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `PORT` | No | Port the server listens on (default `3000`) |
| `NODE_ENV` | No | Set to `production` for deployed environments |
| `GEMINI_API_KEY` | Optional | Only relevant if you enable Gemini-powered features; the watch-party app itself runs without it. See [`.env.example`](.env.example). Never commit a real key. |

## Tech stack

- **Frontend:** React 19, Vite, Tailwind CSS 4, Motion, React Player
- **Backend:** Express, WebSocket (`ws`), esbuild-bundled Node server
- **Language:** TypeScript throughout

## License

MIT — see [LICENSE](LICENSE).
