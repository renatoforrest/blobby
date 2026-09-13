'use strict';

const ROLLBACK_CAP = 8;      // max frames we'll resim on one input arrival
const RB_LOOKAHEAD = 3;      // guest runs this many frames ahead of newest host input
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

  if (NET.role === 'host') {
    // Host drives its own frame clock from wall time.
    const targetFrame = Math.floor((performance.now() - rb.startWallTime) / FRAME_MS);
    let guard = 0;
    while (rb.frame < targetFrame && guard < 6) {
      rbAdvanceOneFrame();
      guard++;
    }
    // Tab was hidden / hard stall: skip ahead without simulating every frame.
    if (targetFrame - rb.frame > 6) rb.frame = targetFrame;
  } else {
    // Guest paces to hostFrame + lookahead. Stalls if host packets stop
    // arriving; that's the cost of host-owns-the-clock.
    const target = rb.hostFrame + RB_LOOKAHEAD;
    let guard = 0;
    while (rb.frame < target && guard < 6) {
      rbAdvanceOneFrame();
      guard++;
    }
  }

  syncSprites();
  syncUiFromState();
  if (settings.showHitboxes) drawHitboxes();
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
  const cutoff = rb.frame - 120;
  if (cutoff <= 0) return;
  for (const map of [rb.localInputs, rb.remoteInputs, rb.snapshots, rb.eventsByFrame]) {
    for (const k of map.keys()) if (k < cutoff) map.delete(k);
  }
}

function rbOnRemoteInput(frame, input, fromHost) {
  if (!rb.active) return;

  if (fromHost && frame > rb.hostFrame) rb.hostFrame = frame;

  rb.remoteInputs.set(frame, input);
  rb.lastRemoteInput = input;
  if (frame >= rb.frame) return;

  const targetFrame = Math.max(frame, rb.frame - ROLLBACK_CAP);
  const snap = rb.snapshots.get(targetFrame);
  if (!snap) return;

  restoreSim(snap);

  const isHost = (NET.role === 'host');
  for (let f = targetFrame; f < rb.frame; f++) {
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