'use strict';

const keys = Object.create(null);

const touchKeys = {
  left: false, right: false, jump: false,
  p1Left: false, p1Right: false, p1Jump: false,
  p2Left: false, p2Right: false, p2Jump: false
};

let jumpBufferP1 = 0;
let jumpBufferP2 = 0;

const touchZones = [];
const activePointers = new Map();

const touchLayer = new PIXI.Container();
touchLayer.visible = false;
overlayUI.addChild(touchLayer);

function clearKeys() { for (const k in keys) keys[k] = false; }

function clearTouchKeys() {
  for (const k in touchKeys) touchKeys[k] = false;
  activePointers.clear();
  jumpBufferP1 = 0;
  jumpBufferP2 = 0;
  for (const z of touchZones) {
    if (z.gfx) z.gfx.tint = 0xffffff;
  }
}

function makeTouchButtonVisual(cx, cy, r, label) {
  const c = new PIXI.Container();
  c.x = cx; c.y = cy;

  const g = new PIXI.Graphics();
  g.beginFill(0xffffff, 0.16);
  g.drawCircle(0, 0, r);
  g.endFill();
  g.lineStyle(2, 0xffffff, 0.6);
  g.drawCircle(0, 0, r);
  c.addChild(g);

  const t = makeText(label, r * 0.95, 0xffffff);
  t.anchor.set(0.5);
  c.addChild(t);

  return { container: c, gfx: g };
}

function buildTouchControls() {
  touchLayer.removeChildren();
  touchZones.length = 0;
  clearTouchKeys();
  if (!isTouch) return;

  const bottomPad = 12;
  let buttons;

  if (G.mode === 2) {
    const R = 20, gap = 6;
    const y = VH - R - bottomPad;
    const p1Start = R + 8;
    const p2End   = VW - R - 8;
    buttons = [
      { cx: p1Start,                        cy: y, r: R, label: '\u25C0', key: 'p1Left' },
      { cx: p1Start + R*2 + gap,            cy: y, r: R, label: '\u25B6', key: 'p1Right' },
      { cx: p1Start + (R*2+gap)*2,          cy: y, r: R, label: '\u25B2', key: 'p1Jump' },
      { cx: p2End,                          cy: y, r: R, label: '\u25B6', key: 'p2Right' },
      { cx: p2End - (R*2+gap),              cy: y, r: R, label: '\u25C0', key: 'p2Left' },
      { cx: p2End - (R*2+gap)*2,            cy: y, r: R, label: '\u25B2', key: 'p2Jump' }
    ];
  } else {
    const R = 35;
    const y = VH - R - bottomPad;
    const lx = R + 11;
    buttons = [
      { cx: lx,               cy: y, r: R, label: '\u25C0', key: 'left' },
      { cx: lx + R*2 + 8,     cy: y, r: R, label: '\u25B6', key: 'right' },
      { cx: VW - R - 11,      cy: y, r: R, label: '\u25B2', key: 'jump' }
    ];
  }

  for (const b of buttons) {
    const { container, gfx } = makeTouchButtonVisual(b.cx, b.cy, b.r, b.label);
    touchLayer.addChild(container);
    touchZones.push({ keyName: b.key, x: b.cx, y: b.cy, r: b.r, gfx });
  }
}

function updateTouchControls() {
  if (!isTouch) { touchLayer.visible = false; return; }

  const showFullscreen =
    fullscreenBtn &&
    (currentScene === 'menu' || currentScene === 'game');
  if (fullscreenBtn) fullscreenBtn.visible = showFullscreen;

  if (currentScene === 'game') {
    buildTouchControls();
    touchLayer.visible = true;
    if (inGameBackBtn) inGameBackBtn.visible = true;
  } else {
    touchLayer.visible = false;
    clearTouchKeys();
    if (inGameBackBtn) inGameBackBtn.visible = false;
  }
}

function clientToGame(clientX, clientY) {
  const rect = view.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / rect.width * VW,
    y: (clientY - rect.top)  / rect.height * VH
  };
}

function findZoneAt(x, y) {
  for (const z of touchZones) {
    const dx = x - z.x, dy = y - z.y;
    const extra = (z.keyName === 'jump' ||
                   z.keyName === 'p1Jump' ||
                   z.keyName === 'p2Jump') ? 10 : 5;
    const rr = z.r + extra;
    if (dx*dx + dy*dy <= rr * rr) return z;
  }
  return null;
}

function setZoneVisual(keyName, on) {
  for (const z of touchZones) {
    if (z.keyName === keyName && z.gfx) {
      z.gfx.tint = on ? 0x88ccff : 0xffffff;
    }
  }
}

function requestJump(keyName) {
  if (keyName !== 'jump' && keyName !== 'p1Jump' && keyName !== 'p2Jump') return;
  if (keyName === 'p1Jump') { jumpBufferP1 = JUMP_BUFFER_FRAMES; return; }
  if (keyName === 'p2Jump') { jumpBufferP2 = JUMP_BUFFER_FRAMES; return; }
  if (G.mode === 3 && NET.role === 'guest') jumpBufferP2 = JUMP_BUFFER_FRAMES;
  else                                       jumpBufferP1 = JUMP_BUFFER_FRAMES;
}

function pressZone(zone, pointerId) {
  releasePointer(pointerId);
  activePointers.set(pointerId, zone.keyName);
  touchKeys[zone.keyName] = true;
  setZoneVisual(zone.keyName, true);
  requestJump(zone.keyName);
}

function releasePointer(pointerId) {
  const k = activePointers.get(pointerId);
  if (!k) return;
  activePointers.delete(pointerId);
  for (const kk of activePointers.values()) {
    if (kk === k) return;
  }
  touchKeys[k] = false;
  setZoneVisual(k, false);
}

window.addEventListener('keydown', (e) => {
  ensureAudio();
  const wasDown = keys[e.code];
  keys[e.code] = true;

  if (!wasDown && (e.code === 'KeyW' || e.code === 'ArrowUp')) {
    if (G.mode === 3 && NET.role === 'guest') jumpBufferP2 = JUMP_BUFFER_FRAMES;
    else                                       jumpBufferP1 = JUMP_BUFFER_FRAMES;
  }

  if (e.code === 'Escape') {
    if (currentScene === 'game')          showScene('menu');
    else if (currentScene === 'settings') showScene('menu');
    else if (currentScene === 'mp')       showScene('menu');
  }
  if (e.code === 'Space' && currentScene === 'game' && G.state === 'over') showScene('menu');
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('pointerdown', ensureAudio);

view.addEventListener('pointerdown', (e) => {
  if (!isTouch || currentScene !== 'game') return;
  const pt = clientToGame(e.clientX, e.clientY);
  const z = findZoneAt(pt.x, pt.y);
  if (z) {
    pressZone(z, e.pointerId);
    e.preventDefault();
  }
}, { passive: false });

window.addEventListener('pointermove', (e) => {
  if (!isTouch || currentScene !== 'game') return;
  const k = activePointers.get(e.pointerId);
  if (!k) return;
  const pt = clientToGame(e.clientX, e.clientY);
  const z = findZoneAt(pt.x, pt.y);
  if (!z) {
    releasePointer(e.pointerId);
  } else if (z.keyName !== k) {
    releasePointer(e.pointerId);
    pressZone(z, e.pointerId);
  }
}, { passive: true });

window.addEventListener('pointerup',     (e) => releasePointer(e.pointerId), { passive: true });
window.addEventListener('pointercancel', (e) => releasePointer(e.pointerId), { passive: true });
window.addEventListener('blur', () => { clearKeys(); clearTouchKeys(); });

function getP1Input() {
  const bufJump = jumpBufferP1 > 0;
  if (G.mode === 2) {
    return {
      left:  !!keys['KeyA'] || touchKeys.p1Left,
      right: !!keys['KeyD'] || touchKeys.p1Right,
      jump:  !!keys['KeyW'] || touchKeys.p1Jump || bufJump
    };
  }
  return {
    left:  !!keys['KeyA'] || touchKeys.left,
    right: !!keys['KeyD'] || touchKeys.right,
    jump:  !!keys['KeyW'] || touchKeys.jump || bufJump
  };
}

function getP2Input() {
  const bufJump = jumpBufferP2 > 0;
  if (G.mode === 2) {
    return {
      left:  !!keys['ArrowLeft']  || touchKeys.p2Left,
      right: !!keys['ArrowRight'] || touchKeys.p2Right,
      jump:  !!keys['ArrowUp']    || touchKeys.p2Jump || bufJump
    };
  }
  return {
    left:  !!keys['ArrowLeft']  || touchKeys.left,
    right: !!keys['ArrowRight'] || touchKeys.right,
    jump:  !!keys['ArrowUp']    || touchKeys.jump || bufJump
  };
}