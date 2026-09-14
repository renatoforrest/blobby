'use strict';

const FPS_VALUES = [30, 60, 144, 240];
const FPS_LABELS = ['30', '60', '144', 'MAX'];
const WIN_VALUES = [5, 10, 15];

const settings = {
  fpsIndex: 3,
  winIndex: 1,
  showFps: true,
  showHitboxes: false,
  showNetStats: false
};
let winScore = WIN_VALUES[settings.winIndex];

let nextServer   = 1;
let touchesP1    = 0;
let touchesP2    = 0;
let lastBallSide = 0;

const G = {
  mode: 1,
  state: 'serve',
  pointTimer: 0,
  scoreL: 0, scoreR: 0,
  acc: 0, matchTime: 0,
  winner: 0,
  ball: { x: NET_X, y: SERVE_Y, vx: 0, vy: 0 },
  p1: { x: P1_HOME_X, y: GROUND_Y, vx: 0, vy: 0, onGround: true, jumpHeld: false, prevJump: false },
  p2: { x: P2_HOME_X, y: GROUND_Y, vx: 0, vy: 0, onGround: true, jumpHeld: false, prevJump: false }
};

function applySettings() {
  app.ticker.maxFPS = FPS_VALUES[settings.fpsIndex];
  winScore = WIN_VALUES[settings.winIndex];

  if (typeof fpsBox !== 'undefined' && fpsBox) {
    fpsBox.visible = settings.showFps;
  }
  if (typeof netStatsBox !== 'undefined' && netStatsBox) {
    netStatsBox.visible = settings.showNetStats;
  }
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

function scorePoint(side, events) {
  if (side === 0) { G.scoreL++; nextServer = 1; }
  else            { G.scoreR++; nextServer = 2; }
  events.push('point');
  G.state = 'point';
  G.pointTimer = POINT_DURATION;
}

function snapshotSim() {
  return {
    ball: { x: G.ball.x, y: G.ball.y, vx: G.ball.vx, vy: G.ball.vy },
    p1:   { x: G.p1.x, y: G.p1.y, vx: G.p1.vx, vy: G.p1.vy,
            onGround: G.p1.onGround, jumpHeld: G.p1.jumpHeld, prevJump: G.p1.prevJump },
    p2:   { x: G.p2.x, y: G.p2.y, vx: G.p2.vx, vy: G.p2.vy,
            onGround: G.p2.onGround, jumpHeld: G.p2.jumpHeld, prevJump: G.p2.prevJump },
    state: G.state, pointTimer: G.pointTimer,
    scoreL: G.scoreL, scoreR: G.scoreR,
    matchTime: G.matchTime, winner: G.winner,
    nextServer, touchesP1, touchesP2, lastBallSide,
    jumpBufferP1, jumpBufferP2,
    aiTimer, aiJumpCooldown
  };
}

function restoreSim(s) {
  G.ball.x = s.ball.x; G.ball.y = s.ball.y;
  G.ball.vx = s.ball.vx; G.ball.vy = s.ball.vy;
  G.p1.x = s.p1.x; G.p1.y = s.p1.y; G.p1.vx = s.p1.vx; G.p1.vy = s.p1.vy;
  G.p1.onGround = s.p1.onGround; G.p1.jumpHeld = s.p1.jumpHeld; G.p1.prevJump = s.p1.prevJump;
  G.p2.x = s.p2.x; G.p2.y = s.p2.y; G.p2.vx = s.p2.vx; G.p2.vy = s.p2.vy;
  G.p2.onGround = s.p2.onGround; G.p2.jumpHeld = s.p2.jumpHeld; G.p2.prevJump = s.p2.prevJump;
  G.state = s.state; G.pointTimer = s.pointTimer;
  G.scoreL = s.scoreL; G.scoreR = s.scoreR;
  G.matchTime = s.matchTime; G.winner = s.winner;
  nextServer = s.nextServer;
  touchesP1 = s.touchesP1; touchesP2 = s.touchesP2;
  lastBallSide = s.lastBallSide;
  jumpBufferP1 = s.jumpBufferP1; jumpBufferP2 = s.jumpBufferP2;
  aiTimer = s.aiTimer; aiJumpCooldown = s.aiJumpCooldown;
}

function syncUiFromState() {
  updateScoreText();
  updateTimerText();
  if (typeof winText === 'undefined' || !winText) return;
  if (G.state === 'over') {
    const p1Won = (G.winner === 1);
    winText.text = p1Won
      ? (G.mode === 1 ? 'YOU WIN!' : 'PLAYER 1 WINS!')
      : (G.mode === 1 ? 'CPU WINS!' : 'PLAYER 2 WINS!');
    winText.visible = true;
    winHint.visible = true;
  } else {
    winText.visible = false;
    winHint.visible = false;
  }
}