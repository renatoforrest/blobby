'use strict';

const FPS_VALUES = [30, 60, 144, 0];
const FPS_LABELS = ['30', '60', '144', 'OFF'];
const WIN_VALUES = [5, 10, 15];

const settings = { fpsIndex: 1, winIndex: 1, showFps: true, showHitboxes: false };
let winScore = WIN_VALUES[settings.winIndex];

const G = {
  mode: 1,
  state: 'serve',
  pointTimer: 0,
  serveTimer: 0,
  scoreL: 0,
  scoreR: 0,
  acc: 0,
  matchTime: 0,
  ball: { x: NET_X, y: SERVE_Y, vx: 0, vy: 0 },
  p1:   { x: P1_HOME_X, y: GROUND_Y, vx: 0, vy: 0, onGround: true },
  p2:   { x: P2_HOME_X, y: GROUND_Y, vx: 0, vy: 0, onGround: true }
};

function applySettings() {
  app.ticker.maxFPS = FPS_VALUES[settings.fpsIndex];
  winScore = WIN_VALUES[settings.winIndex];
  if (typeof fpsText !== 'undefined' && fpsText) fpsText.visible = settings.showFps;
  if (typeof hitboxGraphics !== 'undefined' && hitboxGraphics) {
    hitboxGraphics.visible = settings.showHitboxes;
  }
}

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function updateScoreText() {
  if (typeof hudScoreText === 'undefined' || !hudScoreText) return;
  hudScoreText.text = G.scoreL + ' - ' + G.scoreR;
  if (typeof drawHudBars === 'function') drawHudBars(G.scoreL, G.scoreR);
}

function updateTimerText() {
  if (typeof hudTimerText === 'undefined' || !hudTimerText) return;
  const total = Math.floor(G.matchTime);
  const m = Math.floor(total / 60);
  const s = total % 60;
  hudTimerText.text = pad2(m) + ':' + pad2(s);
}

function startServe() {
  const side = Math.random() < 0.5 ? -1 : 1;
  const server = (side === -1) ? G.p1 : G.p2;
  G.ball.x  = server.x;
  G.ball.y  = SERVE_Y;
  G.ball.vx = 0;
  G.ball.vy = 0;
  G.state = 'serve';
}

function resetRound() {
  G.p1.x = P1_HOME_X; G.p1.y = GROUND_Y;
  G.p1.vx = 0;  G.p1.vy = 0;  G.p1.onGround = true;
  G.p2.x = P2_HOME_X; G.p2.y = GROUND_Y;
  G.p2.vx = 0;  G.p2.vy = 0;  G.p2.onGround = true;
  startServe();
}

function scorePoint(side) {
  if (side === 0) G.scoreL++; else G.scoreR++;
  updateScoreText();
  playPointSound();
  G.state = 'point';
  G.pointTimer = POINT_DURATION;
}