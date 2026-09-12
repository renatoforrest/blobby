'use strict';

const FPS_VALUES = [30, 60, 144, 0];
const FPS_LABELS = ['30', '60', '144', 'OFF'];
const WIN_VALUES = [5, 10, 15];

const settings = { fpsIndex: 1, winIndex: 1, showFps: true, showHitboxes: false };
let winScore = WIN_VALUES[settings.winIndex];

let pendingSounds = [];

/* Serve + touch tracking */
let nextServer   = 1;   // 1 = P1 serves next, 2 = P2 serves next
let touchesP1    = 0;
let touchesP2    = 0;
let lastBallSide = 0;   // 0 = unset, 1 = left/P1 side, 2 = right/P2 side

const G = {
  mode: 1,
  state: 'serve',
  pointTimer: 0,
  scoreL: 0,
  scoreR: 0,
  acc: 0,
  matchTime: 0,
  ball: { x: NET_X, y: SERVE_Y, vx: 0, vy: 0 },
  p1:   { x: P1_HOME_X, y: GROUND_Y, vx: 0, vy: 0, onGround: true, jumpHeld: false },
  p2:   { x: P2_HOME_X, y: GROUND_Y, vx: 0, vy: 0, onGround: true, jumpHeld: false }
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
  const server = (nextServer === 1) ? G.p1 : G.p2;
  G.ball.x  = server.x;
  G.ball.y  = SERVE_Y;
  G.ball.vx = 0;
  G.ball.vy = 0;
  G.state = 'serve';
  touchesP1 = 0;
  touchesP2 = 0;
  lastBallSide = (G.ball.x < NET_X) ? 1 : 2;
}

function resetRound() {
  G.p1.x = P1_HOME_X; G.p1.y = GROUND_Y;
  G.p1.vx = 0;  G.p1.vy = 0;  G.p1.onGround = true; G.p1.jumpHeld = false;
  G.p2.x = P2_HOME_X; G.p2.y = GROUND_Y;
  G.p2.vx = 0;  G.p2.vy = 0;  G.p2.onGround = true; G.p2.jumpHeld = false;
  startServe();
}

function scorePoint(side) {
  if (side === 0) { G.scoreL++; nextServer = 1; }
  else            { G.scoreR++; nextServer = 2; }
  updateScoreText();
  playPointSound();
  G.state = 'point';
  G.pointTimer = POINT_DURATION;
}