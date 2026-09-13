'use strict';

let aiTimer = 0;
let aiJumpCooldown = 0;
let jumpBufferP1 = 0;
let jumpBufferP2 = 0;

function applyInput(b, input, dt) {
  if (input.left && !input.right)       b.vx -= BLOB_ACC * dt;
  else if (input.right && !input.left)  b.vx += BLOB_ACC * dt;
  else                                  b.vx *= Math.pow(0.72, dt);

  if (b.vx >  BLOB_MAXVX) b.vx =  BLOB_MAXVX;
  if (b.vx < -BLOB_MAXVX) b.vx = -BLOB_MAXVX;

  let jumped = false;

  if (input.jump && b.onGround) {
    b.vy = JUMP_V;
    b.onGround = false;
    b.jumpHeld = true;
    jumped = true;
  }

  if (!input.jump && b.jumpHeld) {
    if (b.vy < 0) b.vy *= JUMP_CUT_FACTOR;
    b.jumpHeld = false;
  }

  return jumped;
}

function integrateBlob(b, dt, minX, maxX) {
  b.vy += BLOB_GRAV * dt;
  b.x  += b.vx * dt;
  b.y  += b.vy * dt;
  if (b.x < minX) { b.x = minX; if (b.vx < 0) b.vx = 0; }
  if (b.x > maxX) { b.x = maxX; if (b.vx > 0) b.vx = 0; }
  if (b.y >= GROUND_Y) {
    b.y = GROUND_Y;
    if (b.vy > 0) b.vy = 0;
    b.onGround = true;
  } else b.onGround = false;
}

function collideBallBlob(b, events) {
  const ball = G.ball;
  const bx = b.x;
  const by = b.y - BLOB_R;

  const dx = ball.x - bx;
  const dy = ball.y - by;
  const distSq = dx * dx + dy * dy;
  const minDist = BLOB_R + BALL_R;

  if (distSq >= minDist * minDist) return false;

  const dist = Math.sqrt(distSq) || 0.0001;
  const nx = dx / dist;
  const ny = dy / dist;

  ball.x = bx + nx * minDist;
  ball.y = by + ny * minDist;

  const vn = ball.vx * nx + ball.vy * ny;
  const isRealHit = (vn < 0);

  if (isRealHit) {
    ball.vx -= (1 + BLOB_BOUNCE) * vn * nx;
    ball.vy -= (1 + BLOB_BOUNCE) * vn * ny;
  }
  ball.vx += nx * BLOB_KICK;
  ball.vy += ny * BLOB_KICK;

  const bn = b.vx * nx + b.vy * ny;
  if (bn > 0) {
    ball.vx += nx * bn * BLOB_MOMENTUM;
    ball.vy += ny * bn * BLOB_MOMENTUM;
  }

  if (isRealHit || G.state === 'serve') {
    events.push('hit');
    if (b === G.p1) touchesP1++;
    else if (b === G.p2) touchesP2++;
  }
  return true;
}

function collideBallNet() {
  const ball = G.ball;
  const netL = NET_X - NET_W / 2;
  const netR = NET_X + NET_W / 2;
  const netT = NET_TOP;
  const netB = GROUND_Y;

  const cx = clamp(ball.x, netL, netR);
  const cy = clamp(ball.y, netT, netB);

  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const distSq = dx * dx + dy * dy;

  if (distSq >= BALL_R * BALL_R) return;

  if (distSq < 0.0001) {
    if (ball.x < NET_X) {
      ball.x = netL - BALL_R;
      if (ball.vx > 0) ball.vx = -ball.vx * NET_BOUNCE;
    } else {
      ball.x = netR + BALL_R;
      if (ball.vx < 0) ball.vx = -ball.vx * NET_BOUNCE;
    }
    return;
  }

  const dist = Math.sqrt(distSq) || 0.0001;
  const nx = dx / dist;
  const ny = dy / dist;

  ball.x = cx + nx * BALL_R;
  ball.y = cy + ny * BALL_R;

  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    ball.vx -= (1 + NET_BOUNCE) * vn * nx;
    ball.vy -= (1 + NET_BOUNCE) * vn * ny;
  }
}

/* =========================================================
   AI
   ========================================================= */

/* Time (in frames) until the ball's y reaches targetY. Infinity
   if it never will. */
function ballTimeToY(targetY) {
  const ball = G.ball;
  const dy   = targetY - ball.y;
  const disc = ball.vy * ball.vy + 2 * BALL_GRAV * dy;
  if (disc < 0) return Infinity;
  const sq = Math.sqrt(disc);
  const t1 = (-ball.vy + sq) / BALL_GRAV;
  const t2 = (-ball.vy - sq) / BALL_GRAV;
  let t = Infinity;
  if (t1 >= 0) t = Math.min(t, t1);
  if (t2 >= 0) t = Math.min(t, t2);
  return t;
}

/* Ball's x at a future frame, accounting for wall bounces. */
function ballXAtTime(t) {
  let x  = G.ball.x;
  let vx = G.ball.vx;
  const steps = Math.ceil(t);
  if (steps <= 0) return x;
  const dtStep = t / steps;
  for (let i = 0; i < steps; i++) {
    x += vx * dtStep;
    if (x < BALL_R)      { x = BALL_R;      vx = Math.abs(vx); }
    if (x > VW - BALL_R) { x = VW - BALL_R; vx = -Math.abs(vx); }
  }
  return x;
}

function aiThink(b, dt) {
  aiTimer -= dt;
  aiJumpCooldown -= dt;

  const input = { left: false, right: false, jump: false };

  /* =========================================================
     1. HUMAN IS SERVING — hold position near home
     ========================================================= */
  if (G.state === 'serve' && G.ball.x < NET_X) {
    const diff = P2_HOME_X - b.x;
    if (diff >  8) input.right = true;
    else if (diff < -8) input.left = true;
    return input;
  }

  /* =========================================================
     2. AI IS SERVING — stand next to ball, jump
     ========================================================= */
  if (G.state === 'serve' && G.ball.x >= NET_X) {
    if (!b.onGround) {
      input.jump = true;
      const dx = G.ball.x - b.x;
      if (dx < -3) input.left = true;
      else if (dx > 3) input.right = true;
      return input;
    }
    const targetX = clamp(G.ball.x + 15, NET_X + 40, VW - BLOB_R - 4);
    const diff = targetX - b.x;
    if (diff >  2) input.right = true;
    else if (diff < -2) input.left = true;
    if (Math.abs(diff) < 8 && aiJumpCooldown <= 0) {
      input.jump = true;
      aiJumpCooldown = 30;
    }
    return input;
  }

  /* =========================================================
     3. BALL ON OPPONENT'S SIDE, MOVING AWAY — retreat home
     ========================================================= */
  if (G.ball.x < NET_X && G.ball.vx <= 0.5) {
    const diff = P2_HOME_X - b.x;
    if (diff >  8) input.right = true;
    else if (diff < -8) input.left = true;
    return input;
  }

  /* =========================================================
     4. BALL IS ON OUR SIDE (or crossing over) — intercept
     ========================================================= */

  /* Y at the blob's bottom when at jump peak. Add a small margin
     so the ball hits the blob's body rather than its very tip. */
  const jumpY = GROUND_Y - JUMP_HEIGHT + 30;
  const headY = GROUND_Y - 2 * BLOB_R - BALL_R;

  let targetX = null;
  let targetT = 0;
  let useJump = false;

  const tJump = ballTimeToY(jumpY);
  if (isFinite(tJump) && tJump > 0) {
    const xJump = ballXAtTime(tJump);
    if (xJump > NET_X + 20) {
      targetX = xJump;
      targetT = tJump;
      useJump = true;
    }
  }

  if (targetX === null) {
    const tHead = ballTimeToY(headY);
    if (isFinite(tHead) && tHead > 0) {
      const xHead = ballXAtTime(tHead);
      if (xHead > NET_X + 10) {
        targetX = xHead;
        targetT = tHead;
        useJump = false;
      }
    }
  }

  if (targetX === null) {
    const diff = P2_HOME_X - b.x;
    if (diff >  8) input.right = true;
    else if (diff < -8) input.left = true;
    return input;
  }

  const clampedTargetX = clamp(targetX, NET_X + 30, VW - BLOB_R - 8);
  const diff = clampedTargetX - b.x;
  if (diff >  4) input.right = true;
  else if (diff < -4) input.left = true;

  if (useJump && b.onGround && aiJumpCooldown <= 0) {
    const framesToPeak = 27;
    const distToTarget = Math.abs(targetX - b.x);
    const travelTime   = distToTarget / BLOB_MAXVX;
    const canReach     = travelTime < targetT + 2;
    const inWindow     = targetT <= framesToPeak + 3 &&
                         targetT >= framesToPeak - 5;

    if (canReach && inWindow) {
      input.jump = true;
      aiJumpCooldown = 55;
    }
  }

  return input;
}

function step(dt, rawP1, rawP2) {
  const ball = G.ball;
  const events = [];

  // P1 — always human (AI plays P2 only)
  if (rawP1.jump && !G.p1.prevJump) jumpBufferP1 = JUMP_BUFFER_FRAMES;
  G.p1.prevJump = rawP1.jump;
  const p1EffJump = rawP1.jump || jumpBufferP1 > 0;
  const p1Jumped = applyInput(G.p1,
    { left: rawP1.left, right: rawP1.right, jump: p1EffJump }, dt);
  if (p1Jumped) jumpBufferP1 = 0;
  else if (jumpBufferP1 > 0) jumpBufferP1--;
  integrateBlob(G.p1, dt, BLOB_R, NET_X - NET_W / 2 - BLOB_R);

  // P2 — AI in mode 1, human otherwise
  let p2In;
  let p2Buffered = false;
  if (G.mode === 1) {
    p2In = aiThink(G.p2, dt);
  } else {
    if (rawP2.jump && !G.p2.prevJump) jumpBufferP2 = JUMP_BUFFER_FRAMES;
    G.p2.prevJump = rawP2.jump;
    const p2EffJump = rawP2.jump || jumpBufferP2 > 0;
    p2In = { left: rawP2.left, right: rawP2.right, jump: p2EffJump };
    p2Buffered = true;
  }
  const p2Jumped = applyInput(G.p2, p2In, dt);
  if (p2Buffered) {
    if (p2Jumped) jumpBufferP2 = 0;
    else if (jumpBufferP2 > 0) jumpBufferP2--;
  }
  integrateBlob(G.p2, dt, NET_X + NET_W / 2 + BLOB_R, VW - BLOB_R);

  if (G.state === 'play') G.matchTime += dt / 60;

  if (G.state === 'serve') {
    ball.vx = 0; ball.vy = 0;
    if (collideBallBlob(G.p1, events) | collideBallBlob(G.p2, events)) {
      G.state = 'play';
    }
    return events;
  }
  if (G.state === 'over') return events;

  if (G.state === 'point') {
    ball.vy += BALL_GRAV * dt;
    ball.x  += ball.vx * dt;
    ball.y  += ball.vy * dt;
    if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * 0.75; }
    else if (ball.x + BALL_R > VW) { ball.x = VW - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.75; }
    collideBallNet();
    if (ball.y + BALL_R >= GROUND_Y) {
      ball.y = GROUND_Y - BALL_R;
      ball.vy = -Math.abs(ball.vy) * 0.55;
      ball.vx *= 0.86;
      if (Math.abs(ball.vy) < 2) ball.vy = 0;
      if (ball.vy === 0) ball.vx *= Math.pow(0.92, dt);
    }
    G.pointTimer -= dt;
    if (G.pointTimer <= 0) {
      if (G.scoreL >= winScore || G.scoreR >= winScore) {
        G.state = 'over';
        G.winner = (G.scoreL >= winScore) ? 1 : 2;
      } else {
        resetRound();
      }
    }
    return events;
  }

  ball.vy += BALL_GRAV * dt;
  ball.x  += ball.vx * dt;
  ball.y  += ball.vy * dt;
  collideBallBlob(G.p1, events);
  collideBallBlob(G.p2, events);
  collideBallNet();

  if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * 0.85; }
  else if (ball.x + BALL_R > VW) { ball.x = VW - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.85; }

  const sp = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (sp > BALL_MAX_SPEED) {
    const k = BALL_MAX_SPEED / sp;
    ball.vx *= k; ball.vy *= k;
  }

  const side = (ball.x < NET_X) ? 1 : 2;
  if (lastBallSide !== 0 && side !== lastBallSide) { touchesP1 = 0; touchesP2 = 0; }
  lastBallSide = side;

  if (touchesP1 > 3) { scorePoint(1, events); return events; }
  if (touchesP2 > 3) { scorePoint(0, events); return events; }

  if (ball.y + BALL_R >= GROUND_Y) {
    ball.y = GROUND_Y - BALL_R;
    scorePoint(ball.x < NET_X ? 1 : 0, events);
  }
  return events;
}