'use strict';

const RB_LOOKAHEAD = 3;
const FRAME_MS = 1000 / 60;
const RB_INPUT_REDUNDANCY = 5;

const rb = {
  active: false,
  frame: 0,
  hostFrame: 0,
  startWallTime: 0,
  localInputs: new Map(),
  remoteInputs: new Map(),
  snapshots: new Map(),
  eventsByFrame: new Map(),
  lastRemoteInput: { left: false, right: false, jump: false }
};

let rbLastTickWall = 0;

function rbInit() {
  rb.active = true;
  rb.frame = 0;
  rb.hostFrame = 0;
  rb.startWallTime = performance.now();
  rbLastTickWall = rb.startWallTime;
  rb.localInputs.clear();
  rb.remoteInputs.clear();
  rb.snapshots.clear();
  rb.eventsByFrame.clear();
  rb.lastRemoteInput = { left: false, right: false, jump: false };
  NETSTATS.rollbackAvg = 0;
  NETSTATS.rollbackPeak = 0;
  NETSTATS.ahead = 0;
}

function rbTeardown() {
  rb.active = false;
  rb.localInputs.clear();
  rb.remoteInputs.clear();
  rb.snapshots.clear();
  rb.eventsByFrame.clear();
}

function rbTick() {
  if (!rb.active) return;

  const now = performance.now();
  const gapSinceLastTick = now - rbLastTickWall;
  rbLastTickWall = now;
  const t0 = now;

  if (NET.role === 'host') {
    const targetFrame = Math.floor((now - rb.startWallTime) / FRAME_MS);
    let guard = 0;
    while (rb.frame < targetFrame && guard < 240) {
      rbAdvanceOneFrame();
      guard++;
    }
    if (rb.frame < targetFrame) rb.frame = targetFrame;
    NETSTATS.ahead = 0;
  } else {
    const target = rb.hostFrame + RB_LOOKAHEAD;
    let guard = 0;
    while (rb.frame < target && guard < 240) {
      rbAdvanceOneFrame();
      guard++;
    }
    NETSTATS.ahead = rb.frame - rb.hostFrame;
  }

  syncSprites();
  syncUiFromState();
  if (settings.showHitboxes) drawHitboxes();

  const dtms = performance.now() - t0;
  if (dtms > 8 || gapSinceLastTick > 33) {
    console.warn('rbTick', dtms.toFixed(2) + 'ms',
                 'gap=' + gapSinceLastTick.toFixed(2) + 'ms',
                 'frame=' + rb.frame);
  }
}

function rbAdvanceOneFrame() {
  const f = rb.frame;
  const isHost = (NET.role === 'host');
  const localInput = isHost ? getP1Input() : getP2Input();

  rb.localInputs.set(f, localInput);
  rb.snapshots.set(f, snapshotSim());

  const remoteInput = rb.remoteInputs.get(f) || rb.lastRemoteInput;

  const p1In = isHost ? localInput  : remoteInput;
  const p2In = isHost ? remoteInput : localInput;

  const events = step(1, p1In, p2In);
  rb.eventsByFrame.set(f, events);
  rbPlayEvents(events);

  if (NET.dc && NET.dc.readyState === 'open') {
    const frames = [];
    for (let k = 0; k < RB_INPUT_REDUNDANCY; k++) {
      const fr = f - k;
      if (fr < 0) break;
      const inp = rb.localInputs.get(fr);
      if (!inp) break;
      frames.push([fr, inp.left ? 1 : 0, inp.right ? 1 : 0, inp.jump ? 1 : 0]);
    }
    try { NET.dc.send(JSON.stringify({ t: 'i', a: frames })); } catch (e) {}
  }

  rb.frame++;
  rbTrim();
}

function rbTrim() {
  const cutoff = rb.frame - 240;
  if (cutoff <= 0) return;
  for (const map of [rb.localInputs, rb.remoteInputs, rb.snapshots, rb.eventsByFrame]) {
    for (const k of map.keys()) if (k < cutoff) map.delete(k);
  }
}

function rbOnRemoteInputBatch(entries, fromHost) {
  if (!rb.active) return;
  const t0 = performance.now();

  let oldest = Infinity;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const fr = e[0];
    const inp = { left: !!e[1], right: !!e[2], jump: !!e[3] };
    if (fromHost && fr > rb.hostFrame) rb.hostFrame = fr;
    if (!rb.remoteInputs.has(fr)) {
      rb.remoteInputs.set(fr, inp);
      if (fr < oldest) oldest = fr;
    }
    rb.lastRemoteInput = inp;
  }

  if (oldest === Infinity) return;
  if (oldest >= rb.frame) return;
  if (oldest < rb.frame - 240) return;

  const snap = rb.snapshots.get(oldest);
  if (!snap) return;

  const depth = rb.frame - oldest;
  NETSTATS.rollbackAvg = NETSTATS.rollbackAvg * 0.9 + depth * 0.1;
  if (depth > NETSTATS.rollbackPeak) NETSTATS.rollbackPeak = depth;

  restoreSim(snap);

  const isHost = (NET.role === 'host');
  for (let f = oldest; f < rb.frame; f++) {
    const local = rb.localInputs.get(f);
    if (!local) break;
    const remote = rb.remoteInputs.get(f) || rb.lastRemoteInput;
    const p1In = isHost ? local  : remote;
    const p2In = isHost ? remote : local;
    const events = step(1, p1In, p2In);
    rbPlayNewEvents(f, events);
    rb.snapshots.set(f + 1, snapshotSim());
  }
  syncUiFromState();

  const dtms = performance.now() - t0;
  if (dtms > 4) {
    console.warn('rbOnRemoteInputBatch', dtms.toFixed(2) + 'ms',
                 'oldest=' + oldest, 'depth=' + depth,
                 'cur=' + rb.frame);
  }
}

function rbPlayEvents(events) {
  for (let i = 0; i < events.length; i++) {
    if (events[i] === 'hit')        playHitSound();
    else if (events[i] === 'point') playPointSound();
  }
}

function rbPlayNewEvents(frame, newEvents) {
  const old = rb.eventsByFrame.get(frame) || [];
  for (let i = 0; i < newEvents.length; i++) {
    const e = newEvents[i];
    if (old.indexOf(e) === -1) {
      if (e === 'hit')        playHitSound();
      else if (e === 'point') playPointSound();
    }
  }
  rb.eventsByFrame.set(frame, newEvents);
}