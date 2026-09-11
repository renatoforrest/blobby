'use strict';

const SIGNAL = {
  ws: null, connected: false, rooms: [], inRoom: null, reconnectAttempts: 0
};

const NET = {
  pc: null, dc: null, role: null, connected: false,
  remoteInput: { left: false, right: false, jump: false },
  pendingCandidates: []
};

function connectSignaling() {
  if (SIGNAL.ws && SIGNAL.ws.readyState <= 1) return;
  let ws;
  try { ws = new WebSocket(SIGNALING_URL); }
  catch (e) { scheduleSignalingReconnect(); return; }
  SIGNAL.ws = ws;

  ws.onopen = () => {
    SIGNAL.connected = true;
    SIGNAL.reconnectAttempts = 0;
    signalSend({ t: 'list' });
  };
  ws.onmessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch (err) { return; }
    handleSignalingMessage(msg);
  };
  ws.onclose = () => {
    SIGNAL.connected = false;
    if (SIGNAL.inRoom) {
      SIGNAL.inRoom = null;
      endPeerConnection();
      if (currentScene === 'mp') {
        showLobbyPanel();
        mpLobbyStatus.text = 'Connection lost. Reconnecting...';
      }
    }
    scheduleSignalingReconnect();
  };
  ws.onerror = () => {};
}

function scheduleSignalingReconnect() {
  if (SIGNAL.reconnectAttempts > 20) {
    if (currentScene === 'mp') mpLobbyStatus.text = 'Cannot reach server. Try refreshing.';
    return;
  }
  SIGNAL.reconnectAttempts++;
  const delay = Math.min(500 * Math.pow(1.5, SIGNAL.reconnectAttempts), 8000);
  setTimeout(connectSignaling, delay);
}

function signalSend(obj) {
  if (!SIGNAL.ws || SIGNAL.ws.readyState !== 1) return false;
  try { SIGNAL.ws.send(JSON.stringify(obj)); return true; }
  catch (e) { return false; }
}

function handleSignalingMessage(msg) {
  switch (msg.t) {
    case 'list':
      SIGNAL.rooms = msg.rooms || [];
      if (currentScene === 'mp' && !SIGNAL.inRoom) renderRoomList(SIGNAL.rooms);
      break;
    case 'created':
      SIGNAL.inRoom = { id: msg.id, name: msg.name, role: 'host' };
      showRoomPanel();
      break;
    case 'joined':
      SIGNAL.inRoom = { id: msg.id, name: msg.name, role: 'guest' };
      showRoomPanel();
      break;
    case 'peer-joined': startHostOffer(); break;
    case 'peer-left':
      endPeerConnection();
      if (SIGNAL.inRoom && SIGNAL.inRoom.role === 'host') {
        roomStatus.text = 'Opponent left. Waiting for a new one...';
      } else {
        SIGNAL.inRoom = null;
        showLobbyPanel();
        mpLobbyStatus.text = 'Opponent disconnected.';
      }
      break;
    case 'offer':     handleOffer(msg.sdp); break;
    case 'answer':    handleAnswer(msg.sdp); break;
    case 'candidate': handleCandidate(msg.candidate); break;
    case 'error':
      if (currentScene === 'mp') {
        if (SIGNAL.inRoom) roomStatus.text = msg.msg || 'Error';
        else mpLobbyStatus.text = msg.msg || 'Error';
      }
      break;
  }
}

function createPeerConnection() {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  pc.onicecandidate = (e) => {
    if (e.candidate) signalSend({ t: 'candidate', candidate: e.candidate });
  };
  pc.oniceconnectionstatechange = () => {
    if ((pc.iceConnectionState === 'failed' ||
         pc.iceConnectionState === 'disconnected') &&
        currentScene === 'mp' && SIGNAL.inRoom) {
      roomStatus.text = 'Connection failed. Try leaving and rejoining.';
    }
  };
  return pc;
}

async function startHostOffer() {
  endPeerConnection();
  const pc = createPeerConnection();
  NET.pc = pc;
  NET.role = 'host';
  const dc = pc.createDataChannel('game', { ordered: true });
  NET.dc = dc;
  setupDataChannel(dc);
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    signalSend({ t: 'offer', sdp: { type: offer.type, sdp: offer.sdp } });
    roomStatus.text = 'Connecting to opponent...';
  } catch (e) { roomStatus.text = 'Failed to create offer.'; }
}

async function handleOffer(sdp) {
  endPeerConnection();
  const pc = createPeerConnection();
  NET.pc = pc;
  NET.role = 'guest';
  pc.ondatachannel = (e) => { NET.dc = e.channel; setupDataChannel(e.channel); };
  try {
    await pc.setRemoteDescription(sdp);
    await flushCandidates();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    signalSend({ t: 'answer', sdp: { type: answer.type, sdp: answer.sdp } });
    roomStatus.text = 'Connecting to host...';
  } catch (e) { roomStatus.text = 'Failed to process offer.'; }
}

async function handleAnswer(sdp) {
  if (!NET.pc) return;
  try { await NET.pc.setRemoteDescription(sdp); await flushCandidates(); }
  catch (e) {}
}

function handleCandidate(cand) {
  if (!NET.pc) return;
  if (!NET.pc.remoteDescription || !NET.pc.remoteDescription.type) {
    NET.pendingCandidates.push(cand); return;
  }
  NET.pc.addIceCandidate(cand).catch(() => {});
}

async function flushCandidates() {
  if (!NET.pc) return;
  const list = NET.pendingCandidates;
  NET.pendingCandidates = [];
  for (const c of list) {
    try { await NET.pc.addIceCandidate(c); } catch (e) {}
  }
}

function endPeerConnection() {
  if (NET.dc) { try { NET.dc.close(); } catch (e) {} NET.dc = null; }
  if (NET.pc) { try { NET.pc.close(); } catch (e) {} NET.pc = null; }
  NET.connected = false;
  NET.remoteInput = { left: false, right: false, jump: false };
  NET.pendingCandidates = [];
}

function setupDataChannel(dc) {
  dc.onopen = () => {
    NET.connected = true;
    if (currentScene === 'mp') roomStatus.text = 'Connected! Starting...';
    setTimeout(() => { if (SIGNAL.inRoom) startGame(3); }, 250);
  };
  dc.onclose = () => {
    NET.connected = false;
    if (currentScene === 'game') showScene('menu');
  };
  dc.onerror = () => {};
  dc.onmessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch (err) { return; }
    handleNetMessage(msg);
  };
}

function handleNetMessage(msg) {
  if (msg.t === 'i') {
    const wasJump = NET.remoteInput.jump;
    NET.remoteInput.left  = !!msg.l;
    NET.remoteInput.right = !!msg.r;
    NET.remoteInput.jump  = !!msg.j;
    if (!wasJump && NET.remoteInput.jump) {
      jumpBufferP2 = JUMP_BUFFER_FRAMES;
    }
  } else if (msg.t === 's') applyNetState(msg);
}

function applyNetState(s) {
  G.ball.x = s.b[0]; G.ball.y = s.b[1]; G.ball.vx = s.b[2]; G.ball.vy = s.b[3];
  G.p1.x = s.p1[0]; G.p1.y = s.p1[1]; G.p1.vx = s.p1[2]; G.p1.vy = s.p1[3];
  G.p1.onGround = !!s.p1[4];
  G.p2.x = s.p2[0]; G.p2.y = s.p2[1]; G.p2.vx = s.p2[2]; G.p2.vy = s.p2[3];
  G.p2.onGround = !!s.p2[4];
  if (G.scoreL !== s.sc[0] || G.scoreR !== s.sc[1]) {
    G.scoreL = s.sc[0]; G.scoreR = s.sc[1]; updateScoreText();
  }
  G.state = s.st; G.serveTimer = s.sv || 0; G.pointTimer = s.pt || 0;
  G.matchTime = s.tm || 0; updateTimerText();
  if (s.txt) {
    if (!winText.visible) {
      winText.text = s.txt; winText.visible = true; winHint.visible = true;
    }
  } else { winText.visible = false; winHint.visible = false; }

  if (s.snd && s.snd.length) {
    for (let i = 0; i < s.snd.length; i++) {
      const kind = s.snd[i];
      if (kind === 'hit')        playHitSound();
      else if (kind === 'point') playPointSound();
    }
  } 
  syncSprites();
}

function sendState() {
  if (!NET.dc || NET.dc.readyState !== 'open') return;
  try {
    NET.dc.send(JSON.stringify({
      t: 's',
      b:  [G.ball.x, G.ball.y, G.ball.vx, G.ball.vy],
      p1: [G.p1.x, G.p1.y, G.p1.vx, G.p1.vy, G.p1.onGround ? 1 : 0],
      p2: [G.p2.x, G.p2.y, G.p2.vx, G.p2.vy, G.p2.onGround ? 1 : 0],
      sc: [G.scoreL, G.scoreR],
      st: G.state, sv: G.serveTimer, pt: G.pointTimer, tm: G.matchTime,
      txt: winText.visible ? winText.text : '',
      snd: pendingSounds
    }));
    pendingSounds = [];
  } catch (e) {}
}

function createRoom() {
  if (!SIGNAL.connected) {
    mpLobbyStatus.text = 'Not connected to server. Retrying...';
    connectSignaling();
    return;
  }
  mpLobbyStatus.text = 'Creating room...';
  signalSend({ t: 'create', name: 'Room' });
}

function joinRoom(id) {
  if (!SIGNAL.connected) {
    mpLobbyStatus.text = 'Not connected to server. Retrying...';
    connectSignaling();
    return;
  }
  mpLobbyStatus.text = 'Joining room...';
  signalSend({ t: 'join', id });
}

function leaveRoomAction() {
  signalSend({ t: 'leave' });
  SIGNAL.inRoom = null;
  endPeerConnection();
  showLobbyPanel();
  signalSend({ t: 'list' });
}
