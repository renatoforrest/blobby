'use strict';

let currentScene = 'menu';
let fpsAccum = 0;

function showScene(name) {
  if (currentScene === 'game' && name !== 'game' && G.mode === 3) rbTeardown();

  currentScene = name;
  menuScene.visible     = (name === 'menu');
  settingsScene.visible = (name === 'settings');
  mpScene.visible       = (name === 'mp');
  gameScene.visible     = (name === 'game');
  if (name !== 'game') clearKeys();

  if (name === 'mp') {
    if (SIGNAL.inRoom) showRoomPanel();
    else { showLobbyPanel(); signalSend({ t: 'list' }); }
  }

  if (name === 'menu' || name === 'settings') {
    if (SIGNAL.inRoom) { signalSend({ t: 'leave' }); SIGNAL.inRoom = null; }
    endPeerConnection();
  }

  updateTouchControls();
}

function startGame(mode) {
  G.mode = mode;
  G.scoreL = 0; G.scoreR = 0; G.acc = 0; G.matchTime = 0; G.winner = 0;
  nextServer = 1;
  jumpBufferP1 = 0; jumpBufferP2 = 0;
  aiTimer = 0; aiJumpCooldown = 0;

  G.p1.x = P1_HOME_X; G.p1.y = GROUND_Y;
  G.p1.vx = 0; G.p1.vy = 0;
  G.p1.onGround = true; G.p1.jumpHeld = false; G.p1.prevJump = false;

  G.p2.x = P2_HOME_X; G.p2.y = GROUND_Y;
  G.p2.vx = 0; G.p2.vy = 0;
  G.p2.onGround = true; G.p2.jumpHeld = false; G.p2.prevJump = false;

  updateScoreText();
  updateTimerText();
  if (winText) winText.visible = false;
  if (winHint) winHint.visible = false;
  startServe();
  clearKeys();
  clearTouchKeys();

  if (hudP2NameText) hudP2NameText.text = (mode === 3) ? 'OPPONENT' : 'PLAYER 2';
  if (hudP1NameText) {
    hudP1NameText.text = (mode === 3 && NET.role === 'guest') ? 'OPPONENT' : 'PLAYER 1';
  }

  showScene('game');
  syncSprites();
  syncUiFromState();
  updateTouchControls();

  if (mode === 3) {
    rbTeardown();
    if (NET.role === 'host') {
      rbInit();
      if (NET.dc && NET.dc.readyState === 'open') {
        try { NET.dc.send(JSON.stringify({ t: 'go' })); } catch (e) {}
      }
    }
  }
}

const SIM_STEP = 1 / 60;

function registerTick() {
  app.ticker.add(() => {
    const ms = app.ticker.deltaMS;
    const dt = ms / 16.67;

    const clouds = worldBg._clouds;
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      c.x += c._speed * dt;
      if (c.x > VW + 100) c.x = -180;
    }

    if (currentScene === 'game') {
      if (G.mode === 3) {
        rbTick();
      } else {
        G.acc += ms / 1000;
        if (G.acc > 0.1) G.acc = 0.1;
        let n = 0;
        while (G.acc >= SIM_STEP && n < 5) {
          const p1In = getP1Input();
          const p2In = (G.mode === 2) ? getP2Input() : { left: false, right: false, jump: false };
          const events = step(1, p1In, p2In);
          for (let i = 0; i < events.length; i++) {
            if (events[i] === 'hit')        playHitSound();
            else if (events[i] === 'point') playPointSound();
          }
          G.acc -= SIM_STEP;
          n++;
        }
        syncSprites();
        syncUiFromState();
        if (settings.showHitboxes) drawHitboxes();
      }
    } else if (currentScene === 'menu') {
      titleText.y = 71 + Math.sin(performance.now() * 0.0018) * 4;
    }

    if (settings.showFps && fpsText) {
      fpsAccum += ms;
      if (fpsAccum >= 500) {
        fpsAccum = 0;
        fpsText.text = 'FPS ' + Math.round(app.ticker.FPS);
      }
    }

    if (settings.showNetStats && netStatsText) {
      const rtt = NETSTATS.rtt;
      const avg = NETSTATS.rollbackAvg;
      const pk  = NETSTATS.rollbackPeak;
      const ah  = NETSTATS.ahead;
      netStatsText.text =
        'PING ' + (rtt > 0 ? Math.round(rtt) + 'ms' : '--') +
        '  RB ' + avg.toFixed(1) + '/' + pk +
        '  AHEAD ' + ah;
    }
  });
}