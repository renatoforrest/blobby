'use strict';

let aiTimer = 0;
let aiTargetX = 620;

function applyInput(b, input, dt) {
  if (input.left && !input.right)       b.vx -= BLOB_ACC * dt;
  else if (input.right && !input.left)  b.vx += BLOB_ACC * dt;
  else                                  b.vx *= Math.pow(0.72, dt);

  if (b.vx >  BLOB_MAXVX) b.vx =  BLOB_MAXVX;
  if (b.vx < -BLOB_MAXVX) b.vx = -BLOB_MAXVX;

  if (input.jump && b.onGround) {
    b.vy = JUMP_V;
    b.onGround = false;
    return true;
  }
  return false;
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

function collideBallBlob(b) {
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
  if (vn < 0) {
    ball.vx -= (1 + BLOB_BOUNCE) * vn * nx;
    ball.vy -= (1 + BLOB_BOUNCE) * vn * ny;
  }
  ball.vx += nx * BLOB_KICK;
  ball.vy += ny * BLOB_KICK;

  playHitSound();
  if (G.mode === 3 && NET.role === 'host') pendingSounds.push('hit');
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

function predictBallX() {
  const ball = G.ball;
  if (ball.x < NET_X + 40 && ball.vx <= 0) return 640;
  let x = ball.x, y = ball.y, vx = ball.vx, vy = ball.vy;
  for (let i = 0; i < 90; i++) {
    vy += BALL_GRAV;
    x += vx; y += vy;
    if (x < BALL_R)      { x = BALL_R;      vx = -vx * 0.85; }
    if (x > VW - BALL_R) { x = VW - BALL_R; vx = -vx * 0.85; }
    if (x < NET_X && ball.x > NET_X) break;
    if (y > GROUND_Y - BALL_R) break;
  }
  return clamp(x, NET_X + NET_W / 2 + BLOB_R, VW - BLOB_R);
}

function aiThink(b, dt) {
  aiTimer -= dt;
  if (aiTimer <= 0) {
    aiTimer = 8;
    aiTargetX = predictBallX() + (Math.random() - 0.5) * 34;
  }
  const input = { left: false, right: false, jump: false };
  const diff = aiTargetX - b.x;
  if (diff < -12) input.left = true;
  else if (diff > 12) input.right = true;
  if (b.onGround && G.ball.x > NET_X - 30) {
    const dx = G.ball.x - b.x;
    const dy = G.ball.y - (b.y - BLOB_R);
    if (dy < -18 && dy > -320 && Math.abs(dx) < 130) input.jump = true;
  }
  return input;
}

function step(dt) {
  const ball = G.ball;
  if (G.mode === 3 && NET.role === 'guest') return;

  const p1In = getP1Input();
  const p1Jumped = applyInput(G.p1, p1In, dt);
  if (p1Jumped) jumpBufferP1 = 0;
  else if (jumpBufferP1 > 0) jumpBufferP1 -= 1;
  integrateBlob(G.p1, dt, BLOB_R, NET_X - NET_W / 2 - BLOB_R);

  let p2In;
  if (G.mode === 3 && NET.role === 'host') {
    p2In = {
      left:  NET.remoteInput.left,
      right: NET.remoteInput.right,
      jump:  NET.remoteInput.jump || jumpBufferP2 > 0
    };
  } else if (G.mode === 1) {
    p2In = aiThink(G.p2, dt);
  } else {
    p2In = getP2Input();
  }
  const p2Jumped = applyInput(G.p2, p2In, dt);
  if (p2Jumped) jumpBufferP2 = 0;
  else if (jumpBufferP2 > 0) jumpBufferP2 -= 1;
  integrateBlob(G.p2, dt, NET_X + NET_W / 2 + BLOB_R, VW - BLOB_R);

  if (G.state === 'serve') {
    ball.vx = 0;
    ball.vy = 0;
    const hit1 = collideBallBlob(G.p1);
    const hit2 = collideBallBlob(G.p2);
    if (hit1 || hit2) {
      ball.vy = SERVE_VY;
      ball.vx = (ball.x < NET_X) ? SERVE_VX : -SERVE_VX;
      G.state = 'play';
    }
    return;
  }
  if (G.state === 'over') return;

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
        const p1Won = G.scoreL >= winScore;
        winText.text = p1Won
          ? (G.mode === 1 ? 'YOU WIN!' : 'PLAYER 1 WINS!')
          : (G.mode === 1 ? 'CPU WINS!' : 'PLAYER 2 WINS!');
        winText.visible = true;
        winHint.visible = true;
      } else {
        resetRound();
      }
    }
    return;
  }

  ball.vy += BALL_GRAV * dt;
  ball.x  += ball.vx * dt;
  ball.y  += ball.vy * dt;

  collideBallBlob(G.p1);
  collideBallBlob(G.p2);
  collideBallNet();

  if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * 0.85; }
  else if (ball.x + BALL_R > VW) { ball.x = VW - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.85; }

  const sp = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (sp > BALL_MAX_SPEED) {
    const k = BALL_MAX_SPEED / sp;
    ball.vx *= k; ball.vy *= k;
  }

  if (ball.y + BALL_R >= GROUND_Y) {
    ball.y = GROUND_Y - BALL_R;
    scorePoint(ball.x < NET_X ? 1 : 0);
  }
}
