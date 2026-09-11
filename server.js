const http = require('http');
const fs   = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = filePath.split('?')[0];

  const abs = path.join(__dirname, filePath);
  if (!abs.startsWith(__dirname)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(abs, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(abs).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js':   'text/javascript',
      '.css':  'text/css',
      '.json': 'application/json',
      '.png':  'image/png',
      '.ico':  'image/x-icon'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server, path: '/ws' });

const rooms   = new Map();
const clients = new Set();

let nextClientId = 1;

function makeRoomId() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let s = '';
  for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)];
  return rooms.has(s) ? makeRoomId() : s;
}

function roomListPayload() {
  const list = [];
  for (const r of rooms.values()) {
    list.push({
      id:      r.id,
      name:    r.name,
      players: (r.host ? 1 : 0) + (r.guest ? 1 : 0),
      max:     2,
      locked:  !!r.guest
    });
  }
  return list;
}

function send(ws, obj) {
  if (!ws || ws.readyState !== 1) return false;
  try { ws.send(JSON.stringify(obj)); return true; } catch (e) { return false; }
}

function broadcastLobby() {
  const payload = JSON.stringify({ t: 'list', rooms: roomListPayload() });
  for (const ws of clients) {
    if (ws.readyState !== 1) continue;
    if (ws.roomId) continue;
    try { ws.send(payload); } catch (e) {}
  }
}

wss.on('connection', (ws) => {
  ws.clientId = nextClientId++;
  ws.roomId   = null;
  ws.role     = null;
  clients.add(ws);

  send(ws, { t: 'list', rooms: roomListPayload() });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg.t !== 'string') return;

    switch (msg.t) {
      case 'list':
        send(ws, { t: 'list', rooms: roomListPayload() });
        break;

      case 'create': {
        if (ws.roomId) return;
        const id   = makeRoomId();
        const name = (msg.name || '').toString().slice(0, 40) || ('Room ' + id);
        const room = { id, name, host: ws, guest: null, createdAt: Date.now() };
        rooms.set(id, room);
        ws.roomId = id;
        ws.role   = 'host';
        send(ws, { t: 'created', id, name });
        broadcastLobby();
        break;
      }

      case 'join': {
        if (ws.roomId) return;
        const r = rooms.get(msg.id);
        if (!r)           { send(ws, { t: 'error', msg: 'Room not found' }); return; }
        if (r.guest)      { send(ws, { t: 'error', msg: 'Room is full' });   return; }
        if (r.host === ws){ send(ws, { t: 'error', msg: 'Cannot join your own room' }); return; }

        r.guest = ws;
        ws.roomId = r.id;
        ws.role   = 'guest';
        send(ws, { t: 'joined', id: r.id, name: r.name, role: 'guest' });
        send(r.host, { t: 'peer-joined' });
        broadcastLobby();
        break;
      }

      case 'leave':
        leaveRoom(ws);
        break;

      case 'offer':
      case 'answer':
      case 'candidate': {
        if (!ws.roomId) return;
        const r = rooms.get(ws.roomId);
        if (!r) return;
        const peer = ws.role === 'host' ? r.guest : r.host;
        if (!peer) return;
        send(peer, msg);
        break;
      }

      case 'ping':
        send(ws, { t: 'pong' });
        break;
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    leaveRoom(ws);
  });

  ws.on('error', () => {});
});

function leaveRoom(ws) {
  if (!ws.roomId) return;
  const r = rooms.get(ws.roomId);
  ws.roomId = null;
  ws.role   = null;
  if (!r) return;

  if (r.host === ws) {
    if (r.guest) {
      send(r.guest, { t: 'peer-left' });
      r.guest.roomId = null;
      r.guest.role   = null;
    }
    rooms.delete(r.id);
  } else if (r.guest === ws) {
    r.guest = null;
    if (r.host) send(r.host, { t: 'peer-left' });
  }
  broadcastLobby();
}

server.listen(PORT, () => {
  console.log('');
  console.log('  Blobby Volley 2 signaling server');
  console.log('  ---------------------------------');
  console.log('  Listening on port ' + PORT);
  console.log('  Open http://localhost:' + PORT + ' to play');
  console.log('');
});
