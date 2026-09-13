'use strict';

const SIGNAL = {
  ws: null, connected: false, rooms: [], inRoom: null, reconnectAttempts: 0
};

const NET = {
  pc: null, dc: null, role: null, connected: false,
  pendingCandidates: []
};

const NETSTATS = {
  rtt: 0,
  rollbackAvg: 0,
  rollbackPeak: 0,
  ahead: 0,
  _pingSent: 0,
  _pingTimer: null
};

function netStatsPing() {
  if (!NET.dc || NET.dc.readyState !== 'open') return;
  NETSTATS._pingSent = performance.now();
  try { NET.dc.send(JSON.stringify({ t: 'p' })); } catch (e) {}
}

function netStatsStart() {
  netStatsStop();
  NETSTATS._pingTimer = setInterval(netStatsPing, 500);
  netStatsPing();
}

function netStatsStop() {
  if (NETSTATS._pingTimer) {
    clearInterval(NETSTATS._pingTimer);
    NETSTATS._pingTimer = null;
  }
  NETSTATS.rtt = 0;
  NETSTATS.rollbackAvg = 0;
  NETSTATS.rollbackPeak = 0;
  NETSTATS.ahead = 0;
}

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
      rbTeardown();
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
      rbTeardown();
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
  netStatsStop();
  if (NET.dc) { try { NET.dc.close(); } catch (e) {} NET.dc = null; }
  if (NET.pc) { try { NET.pc.close(); } catch (e) {} NET.pc = null; }
  NET.connected = false;
  NET.pendingCandidates = [];
}

function setupDataChannel(dc) {
  dc.onopen = () => {
    NET.connected = true;
    netStatsStart();
    if (currentScene === 'mp') roomStatus.text = 'Connected! Starting...';
    if (SIGNAL.inRoom) startGame(3);
  };
  dc.onclose = () => {
    NET.connected = false;
    netStatsStop();
    rbTeardown();
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
  if (msg.t === 'go') {
    rbInit();
  } else if (msg.t === 'i') {
    rbOnRemoteInput(
      msg.f,
      { left: !!msg.l, right: !!msg.r, jump: !!msg.j },
      NET.role === 'guest'
    );
  } else if (msg.t === 'p') {
    try { NET.dc.send(JSON.stringify({ t: 'q' })); } catch (e) {}
  } else if (msg.t === 'q') {
    NETSTATS.rtt = performance.now() - NETSTATS._pingSent;
  }
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
  rbTeardown();
  showLobbyPanel();
  signalSend({ t: 'list' });
}