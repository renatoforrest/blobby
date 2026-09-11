'use strict';

const BTN_W = 280, BTN_H = 60;
const BTN_SM_W = 220, BTN_SM_H = 48;

let blobRedTex = null;
let blobYellowTex = null;
let ballTex = null;

function makeTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = PIXI.Texture.from(cv);
  t.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
  return t;
}

const skyTex = makeTex(VW, 380, (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, 380);
  g.addColorStop(0.00, '#0a2f66');
  g.addColorStop(0.40, '#2a6fb8');
  g.addColorStop(1.00, '#a5d2ec');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, 380);
});

const cloudTex = makeTex(160, 80, (ctx) => {
  ctx.beginPath();
  ctx.arc(40, 50, 22, 0, Math.PI * 2);
  ctx.arc(72, 38, 30, 0, Math.PI * 2);
  ctx.arc(108, 50, 24, 0, Math.PI * 2);
  ctx.arc(80, 60, 26, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill();
  ctx.beginPath();
  ctx.arc(48, 58, 16, 0, Math.PI * 2);
  ctx.arc(112, 58, 16, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(210,228,246,0.85)'; ctx.fill();
});

const oceanTex = makeTex(VW, 70, (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, 70);
  g.addColorStop(0.0, '#0f4a7d');
  g.addColorStop(0.5, '#1e5a8c');
  g.addColorStop(1.0, '#3a7fb8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, 70);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const x = (i * 73) % VW;
    const y = 10 + ((i * 37) % 50);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10 + (i % 5), y); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(0, 0, VW, 2);
});

const sandTex = makeTex(VW, 180, (ctx) => {
  const g = ctx.createLinearGradient(0, 0, 0, 180);
  g.addColorStop(0.00, '#e8d3a2');
  g.addColorStop(0.35, '#dcc789');
  g.addColorStop(1.00, '#c4a45c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, 180);
  ctx.fillStyle = 'rgba(150,120,60,0.20)';
  for (let i = 0; i < 260; i++) ctx.fillRect((i * 97) % VW, (i * 53) % 180, 1, 1);
});

const cliffTex = makeTex(180, 120, (ctx) => {
  ctx.fillStyle = '#5c574c';
  ctx.beginPath();
  ctx.moveTo(0, 20); ctx.lineTo(45, 8); ctx.lineTo(100, 24);
  ctx.lineTo(140, 60); ctx.lineTo(170, 100); ctx.lineTo(180, 120);
  ctx.lineTo(0, 120); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#453f36';
  ctx.beginPath();
  ctx.moveTo(0, 45); ctx.lineTo(40, 38); ctx.lineTo(90, 60);
  ctx.lineTo(130, 95); ctx.lineTo(150, 120); ctx.lineTo(0, 120);
  ctx.closePath(); ctx.fill();
});

const rockTex = makeTex(50, 30, (ctx) => {
  ctx.fillStyle = '#5c574c';
  ctx.beginPath();
  ctx.moveTo(2, 26); ctx.lineTo(14, 4); ctx.lineTo(34, 2);
  ctx.lineTo(48, 22); ctx.lineTo(42, 28); ctx.lineTo(8, 28);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3f3a30';
  ctx.beginPath();
  ctx.moveTo(10, 26); ctx.lineTo(20, 10); ctx.lineTo(34, 12);
  ctx.lineTo(40, 26); ctx.closePath(); ctx.fill();
});

function makePalmTex(lean) {
  const W = 260, H = 360;
  return makeTex(W, H, (ctx) => {
    const baseX = 130, baseY = 335, tipX = baseX + lean, tipY = 60;
    const height = baseY - tipY;
    ctx.fillStyle = 'rgba(60,40,10,0.28)';
    ctx.beginPath(); ctx.ellipse(baseX + 24, 342, 44, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4a3820'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + lean * 0.25, baseY - height * 0.5, tipX, tipY);
    ctx.stroke();
    ctx.strokeStyle = '#6a5230'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(baseX - 2, baseY - 4);
    ctx.quadraticCurveTo(baseX + lean * 0.25 - 2, baseY - height * 0.5, tipX - 2, tipY + 4);
    ctx.stroke();
    ctx.strokeStyle = '#2e2410'; ctx.lineWidth = 1;
    for (let i = 1; i < 16; i++) {
      const t = i / 16;
      const tx = baseX + (tipX - baseX) * t * t;
      const ty = baseY - height * t;
      ctx.beginPath(); ctx.moveTo(tx - 4, ty); ctx.lineTo(tx + 4, ty); ctx.stroke();
    }
    ctx.fillStyle = '#15552a';
    for (let a = 0; a < 10; a++) {
      const angle = (a / 10) * Math.PI * 2 - 0.3;
      const len = 72 + ((a * 11) % 20);
      const ex = tipX + Math.cos(angle) * len;
      const ey = tipY + Math.sin(angle) * len * 0.8;
      const mx = tipX + Math.cos(angle) * len * 0.55;
      const my = tipY + Math.sin(angle) * len * 0.55 - 14;
      ctx.beginPath(); ctx.moveTo(tipX, tipY);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.quadraticCurveTo(mx + 8, my + 16, tipX, tipY);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#237a3a';
    for (let a = 0; a < 8; a++) {
      const angle = (a / 8) * Math.PI * 2 + 0.2;
      const len = 58;
      const ex = tipX + Math.cos(angle) * len;
      const ey = tipY + Math.sin(angle) * len * 0.8;
      const mx = tipX + Math.cos(angle) * len * 0.5;
      const my = tipY + Math.sin(angle) * len * 0.5 - 10;
      ctx.beginPath(); ctx.moveTo(tipX, tipY);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.quadraticCurveTo(mx + 5, my + 12, tipX, tipY);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#3a2410';
    ctx.beginPath(); ctx.arc(tipX - 5, tipY + 9, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tipX + 5, tipY + 11, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tipX + 1, tipY + 5, 4, 0, Math.PI * 2); ctx.fill();
  });
}
const palmRightTex = makePalmTex(40);
const palmLeftTex  = makePalmTex(-40);

function makeFallbackBlobTex(body, dark, highlight) {
  const S = BLOB_R * 2;
  return makeTex(S, S, (ctx) => {
    ctx.scale(S / 100, S / 100);
    ctx.beginPath();
    ctx.moveTo(12, 90);
    ctx.bezierCurveTo(0, 68, 18, 16, 50, 6);
    ctx.bezierCurveTo(82, 16, 100, 68, 88, 90);
    ctx.quadraticCurveTo(50, 98, 12, 90);
    ctx.closePath();
    ctx.fillStyle = dark; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(17, 87);
    ctx.bezierCurveTo(6, 66, 22, 20, 50, 11);
    ctx.bezierCurveTo(78, 20, 94, 66, 83, 87);
    ctx.quadraticCurveTo(50, 93, 17, 87);
    ctx.closePath();
    ctx.fillStyle = body; ctx.fill();
    ctx.beginPath();
    ctx.ellipse(38, 26, 10, 7, -0.35, 0, Math.PI * 2);
    ctx.fillStyle = highlight; ctx.fill();
    const eyeY = 42;
    ctx.fillStyle = '#0b0b12';
    ctx.beginPath(); ctx.ellipse(42, eyeY, 3.2, 4.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(58, eyeY, 3.2, 4.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(43, eyeY - 1.2, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(59, eyeY - 1.2, 1, 0, Math.PI * 2); ctx.fill();
  });
}

function makeFallbackBallTex() {
  return makeTex(BALL_R * 2 + 2, BALL_R * 2 + 2, (ctx) => {
    const c = BALL_R + 1;
    const lw = Math.max(1.8, BALL_R * 0.11);
    ctx.beginPath(); ctx.arc(c, c, BALL_R, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(
      c - BALL_R * 0.3, c - BALL_R * 0.3, BALL_R * 0.15,
      c, c, BALL_R
    );
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d8dde6');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(90,110,145,0.75)'; ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(c - BALL_R * 0.85, c, BALL_R * 0.9, -Math.PI * 0.85, Math.PI * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c + BALL_R * 0.85, c, BALL_R * 0.9, Math.PI * 0.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(c, c, BALL_R - lw * 0.4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(50,70,105,0.65)'; ctx.lineWidth = lw * 0.8;
    ctx.stroke();
  });
}

const ballShadowTex = makeTex(BALL_R * 4, BALL_R * 2, (ctx, w, h) => {
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fill();
});

const netTex = makeTex(NET_VW, GROUND_Y - NET_TOP, (ctx, w, h) => {
  ctx.strokeStyle = 'rgba(20,30,50,0.85)'; ctx.lineWidth = 1;
  for (let y = 14; y < h; y += 9) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  for (let x = 1; x < w - 1; x += 9) {
    ctx.beginPath(); ctx.moveTo(x, 12); ctx.lineTo(x, h); ctx.stroke();
  }
  ctx.fillStyle = '#f5f8fc'; ctx.fillRect(w / 2 - 4, 0, 8, h);
  ctx.fillStyle = 'rgba(180,205,230,0.9)'; ctx.fillRect(w / 2 + 2, 0, 2, h);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, 10);
  ctx.fillStyle = 'rgba(190,215,240,0.9)'; ctx.fillRect(0, 8, w, 2);
});

function btnTexture(w, h) {
  return makeTex(w, h, (ctx) => {
    const r = Math.min(14, h / 3);
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r);
    ctx.closePath();
    ctx.fillStyle = '#ffffff'; ctx.fill();
  });
}
const btnTex   = btnTexture(BTN_W, BTN_H);
const btnSmTex = btnTexture(BTN_SM_W, BTN_SM_H);

const rowBgTex = makeTex(600, 44, (ctx, w, h) => {
  const r = 8;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r);
  ctx.closePath();
  ctx.fillStyle = '#ffffff'; ctx.fill();
});

async function loadOne(url, label, fallbackDraw) {
  try {
    const res = await PIXI.Assets.load(url);
    const tex = (res && res.texture) ? res.texture : res;
    if (!tex || !tex.width || !tex.height) {
      throw new Error('empty texture');
    }
    console.log('[sprites] Loaded ' + label + ' -> ' + url +
                ' (' + tex.width + '\u00d7' + tex.height + ')');
    return tex;
  } catch (e) {
    console.warn('[sprites] FAILED ' + label + ' -> ' + url +
                 ' - using procedural fallback.', e && e.message);
    return fallbackDraw();
  }
}

async function loadBlobAndBallTextures() {
  const results = await Promise.all([
    loadOne(SPRITE_URLS.blobRed, 'blobRed',
      () => makeFallbackBlobTex('#e8352c', '#7a1410', 'rgba(255,200,190,0.65)')),
    loadOne(SPRITE_URLS.blobYellow, 'blobYellow',
      () => makeFallbackBlobTex('#ffe83a', '#a67c00', 'rgba(255,255,220,0.75)')),
    loadOne(SPRITE_URLS.ball, 'ball',
      () => makeFallbackBallTex())
  ]);
  blobRedTex    = results[0];
  blobYellowTex = results[1];
  ballTex       = results[2];
}
