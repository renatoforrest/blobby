'use strict';

const RB_LOOKAHEAD = 3;
const FRAME_MS = 1000 / 60;

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

function rbInit() {
  rb.active = true;
  rb.frame = 0;
  rb.hostFrame = 0;
  rb.startWallTime = performance.now();
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
  const t0 = performance.now();

  if (NET.role === 'host') {
    const targetFrame = Math.floor((performance.now() - rb.startWallTime) / FRAME_MS);
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
  if (dtms > 8) console.warn('rbTick', dtms.toFixed(2) + 'ms',
                             'frame=' + rb.frame);
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
    try {
      NET.dc.send(JSON.stringify({
        t: 'i', f,
        l: localInput.left  ? 1 : 0,
        r: localInput.right ? 1 : 0,
        j: localInput.jump  ? 1 : 0
      }));
    } catch (e) {}
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

function rbOnRemoteInput(frame, input, fromHost) {
  if (!rb.active) return;
  const t0 = performance.now();

  if (fromHost && frame > rb.hostFrame) rb.hostFrame = frame;

  rb.remoteInputs.set(frame, input);
  rb.lastRemoteInput = input;

  if (frame >= rb.frame) return;
  if (frame < rb.frame - 240) return;

  const depth = rb.frame - frame;
  NETSTATS.rollbackAvg = NETSTATS.rollbackAvg * 0.9 + depth * 0.1;
  if (depth > NETSTATS.rollbackPeak) NETSTATS.rollbackPeak = depth;

  const snap = rb.snapshots.get(frame);
  if (!snap) return;

  restoreSim(snap);

  const isHost = (NET.role === 'host');
  for (let f = frame; f < rb.frame; f++) {
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
  if (dtms > 4) console.warn('rbOnRemoteInput', dtms.toFixed(2) + 'ms',
                             'frame=' + frame, 'depth=' + depth,
                             'cur=' + rb.frame);
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