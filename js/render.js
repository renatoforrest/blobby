'use strict';

let netSprite, p1Sprite, p2Sprite, ballShadowSprite, ballSprite;
let ballIndicatorGfx, ballIndicatorText;
let hudBanner, hudScoreText, hudTimerText, hudP1Bar, hudP2Bar;
let hudP1NameText, hudP2NameText;
let hintBar, hintText;
let winText, winHint, inGameBackBtn, hitboxGraphics;
let fullscreenBtn = null, fullscreenBtnIcon = null;
let fpsText;

function buildGameSceneSprites() {
  /* --- Net --- */
  netSprite = new PIXI.Sprite(netTex);
  netSprite.x = NET_X - NET_VW / 2;
  netSprite.y = NET_TOP;
  gameScene.addChild(netSprite);

  /* --- Blobs --- */
  p1Sprite = new PIXI.Sprite(blobRedTex);
  p1Sprite.anchor.set(0.5);
  p1Sprite.width  = BLOB_R * 2;
  p1Sprite.height = BLOB_R * 2;
  gameScene.addChild(p1Sprite);

  p2Sprite = new PIXI.Sprite(blobYellowTex);
  p2Sprite.anchor.set(0.5);
  p2Sprite.width  = BLOB_R * 2;
  p2Sprite.height = BLOB_R * 2;
  gameScene.addChild(p2Sprite);

  /* --- Ball + shadow --- */
  ballShadowSprite = new PIXI.Sprite(ballShadowTex);
  ballShadowSprite.anchor.set(0.5);
  ballShadowSprite.y = GROUND_Y - 1;
  gameScene.addChild(ballShadowSprite);

  ballSprite = new PIXI.Sprite(ballTex);
  ballSprite.anchor.set(0.5);
  ballSprite.width  = BALL_R * 2;
  ballSprite.height = BALL_R * 2;
  gameScene.addChild(ballSprite);

    /* --- Offscreen ball indicator (rendered on the top overlay) --- */
  ballIndicatorGfx = new PIXI.Graphics();
  ballIndicatorGfx.visible = false;
  overlayUI.addChild(ballIndicatorGfx);

  ballIndicatorText = makeText('', 10, 0xffe066, {
    fontFamily: 'Courier New, monospace',
    fontWeight: 'bold',
    stroke: '#000000',
    strokeThickness: 3
  });
  ballIndicatorText.anchor.set(0.5, 0);
  ballIndicatorText.visible = false;
  overlayUI.addChild(ballIndicatorText);

  /* --- Top HUD --- */
  buildHud();

  /* --- Bottom control hint (desktop only) --- */
  if (!isTouch) {
    hintBar = new PIXI.Graphics();
    hintBar.beginFill(0x0a0f1a, 0.85);
    hintBar.drawRect(0, VH - 16, VW, 16);
    hintBar.endFill();
    gameScene.addChild(hintBar);

    hintText = makeText(
      'A / D / W     \u2190 / \u2192 / \u2191     ESC: MENU',
      10, 0x9fe870, {
        fontFamily: 'Courier New, monospace',
        fontWeight: 'bold',
        letterSpacing: 2
      }
    );
    hintText.anchor.set(0.5, 0.5);
    hintText.x = VW / 2;
    hintText.y = VH - 8;
    gameScene.addChild(hintText);
  }

  /* --- Win text --- */
  winText = makeRetroText('', 25, 0xffe066);
  winText.anchor.set(0.5); winText.x = VW / 2; winText.y = 170;
  winText.visible = false;
  gameScene.addChild(winText);

  winHint = makeText(
    isTouch ? 'tap BACK to leave' : 'press SPACE for the menu',
    12, 0xffffff, { stroke: '#0e1c33', strokeThickness: 2 }
  );
  winHint.anchor.set(0.5); winHint.x = VW / 2; winHint.y = 200;
  winHint.visible = false;
  gameScene.addChild(winHint);

  /* --- Hitboxes --- */
  hitboxGraphics = new PIXI.Graphics();
  hitboxGraphics.visible = false;
  gameScene.addChild(hitboxGraphics);

  /* --- In-game back button (mobile) --- */
  inGameBackBtn = makeButton('BACK', btnSmTex, () => showScene('menu'));
  inGameBackBtn.scale.set(0.5);
  inGameBackBtn.x = VW - (BTN_SM_W * 0.5) - 8;
  inGameBackBtn.y = 58;
  inGameBackBtn.visible = false;
  gameScene.addChild(inGameBackBtn);

  /* --- Fullscreen button (mobile) --- */
  if (isTouch && isFullscreenSupported()) {
    const R = 14;
    const c = new PIXI.Container();
    c.x = VW - R - 8;
    c.y = 58 + (BTN_SM_H * 0.5) + R + 6;

    const g = new PIXI.Graphics();
    g.beginFill(0x0a0f1a, 0.85);
    g.drawCircle(0, 0, R);
    g.endFill();
    g.lineStyle(2, 0x2a3644, 1);
    g.drawCircle(0, 0, R);
    c.addChild(g);

    const t = makeText('\u26F6', 14, 0xffffff);
    t.anchor.set(0.5);
    c.addChild(t);

    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.hitArea = new PIXI.Circle(0, 0, R);

    c.on('pointerover',      () => { c.alpha = 0.85; });
    c.on('pointerout',       () => { c.alpha = 1.0;  });
    c.on('pointerdown',      () => { c.alpha = 0.7;  });
    c.on('pointerup',        () => { c.alpha = 1.0; toggleFullscreen(); });
    c.on('pointerupoutside', () => { c.alpha = 1.0;  });

    fullscreenBtn = c;
    fullscreenBtnIcon = t;
    overlayUI.addChild(c);
    c.visible = true;
    updateFullscreenIcon();
  }

  /* --- FPS counter --- */
  fpsText = makeText('FPS --', 9, 0x9fe870, { fontFamily: 'Consolas, monospace' });
  fpsText.x = 6;
  fpsText.y = VH - 28;
  overlayUI.addChild(fpsText);
}

/* =========================================================
   HUD — top banner
   ========================================================= */
function buildHud() {
  const HUD_X = 20;
  const HUD_Y = 6;
  const HUD_W = VW - 40;
  const HUD_H = 46;

  /* Banner background */
  hudBanner = new PIXI.Graphics();
  hudBanner.beginFill(0x0a0f1a, 0.92);
  hudBanner.drawRoundedRect(HUD_X, HUD_Y, HUD_W, HUD_H, 8);
  hudBanner.endFill();
  hudBanner.lineStyle(2, 0x2a3644, 1);
  hudBanner.drawRoundedRect(HUD_X, HUD_Y, HUD_W, HUD_H, 8);
  gameScene.addChild(hudBanner);

  /* Player 1 name (red) */
  hudP1NameText = makeText('PLAYER 1', 13, 0xff4a4a, {
    fontFamily: 'Courier New, monospace',
    fontWeight: 'bold',
    letterSpacing: 2
  });
  hudP1NameText.x = HUD_X + 14;
  hudP1NameText.y = HUD_Y + 8;
  gameScene.addChild(hudP1NameText);

  /* Player 2 name (blue) */
  hudP2NameText = makeText('PLAYER 2', 13, 0x4a9bff, {
    fontFamily: 'Courier New, monospace',
    fontWeight: 'bold',
    letterSpacing: 2
  });
  hudP2NameText.anchor.set(1, 0);
  hudP2NameText.x = HUD_X + HUD_W - 14;
  hudP2NameText.y = HUD_Y + 8;
  gameScene.addChild(hudP2NameText);

  /* Small blob icons next to names */
  const iconSize = 14;
  const redIcon = new PIXI.Sprite(blobRedTex);
  redIcon.width = iconSize;
  redIcon.height = iconSize;
  redIcon.x = HUD_X + 14 + 76;
  redIcon.y = HUD_Y + 8;
  gameScene.addChild(redIcon);

  const blueIcon = new PIXI.Sprite(blobYellowTex);
  blueIcon.width = iconSize;
  blueIcon.height = iconSize;
  blueIcon.x = HUD_X + HUD_W - 14 - 76 - iconSize;
  blueIcon.y = HUD_Y + 8;
  gameScene.addChild(blueIcon);

  /* Score in the center */
  hudScoreText = makeText('0 - 0', 22, 0xffffff, {
    fontFamily: 'Courier New, monospace',
    fontWeight: 'bold',
    letterSpacing: 3
  });
  hudScoreText.anchor.set(0.5, 0);
  hudScoreText.x = VW / 2;
  hudScoreText.y = HUD_Y + 5;
  gameScene.addChild(hudScoreText);

  /* Bars */
  hudP1Bar = new PIXI.Graphics();
  hudP2Bar = new PIXI.Graphics();
  gameScene.addChild(hudP1Bar);
  gameScene.addChild(hudP2Bar);
  drawHudBars(G.scoreL, G.scoreR);

  /* Timer box below the banner */
  const tbW = 76, tbH = 22;
  const tbX = (VW - tbW) / 2;
  const tbY = HUD_Y + HUD_H + 4;

  const timerBox = new PIXI.Graphics();
  timerBox.beginFill(0x0a0f1a, 0.92);
  timerBox.drawRoundedRect(tbX, tbY, tbW, tbH, 5);
  timerBox.endFill();
  timerBox.lineStyle(2, 0x2a3644, 1);
  timerBox.drawRoundedRect(tbX, tbY, tbW, tbH, 5);
  gameScene.addChild(timerBox);

  hudTimerText = makeText('00:00', 14, 0xffffff, {
    fontFamily: 'Courier New, monospace',
    fontWeight: 'bold',
    letterSpacing: 3
  });
  hudTimerText.anchor.set(0.5, 0.5);
  hudTimerText.x = VW / 2;
  hudTimerText.y = tbY + tbH / 2;
  gameScene.addChild(hudTimerText);
}

function drawHudBars(scoreL, scoreR) {
  const maxScore = Math.max(1, winScore);
  const p1Frac = Math.min(1, scoreL / maxScore);
  const p2Frac = Math.min(1, scoreR / maxScore);

  const HUD_X = 20;
  const HUD_W = VW - 40;
  const barY = 36;
  const barH = 8;
  const barW = 180;

  const b1x = HUD_X + 14;
  hudP1Bar.clear();
  hudP1Bar.beginFill(0x2a1414);
  hudP1Bar.drawRoundedRect(b1x, barY, barW, barH, 3);
  hudP1Bar.endFill();
  if (p1Frac > 0) {
    hudP1Bar.beginFill(0xff4a4a);
    hudP1Bar.drawRoundedRect(b1x, barY, Math.max(6, barW * p1Frac), barH, 3);
    hudP1Bar.endFill();
  }

  const b2x = HUD_X + HUD_W - 14 - barW;
  hudP2Bar.clear();
  hudP2Bar.beginFill(0x141a2a);
  hudP2Bar.drawRoundedRect(b2x, barY, barW, barH, 3);
  hudP2Bar.endFill();
  if (p2Frac > 0) {
    hudP2Bar.beginFill(0x4a9bff);
    hudP2Bar.drawRoundedRect(b2x, barY, Math.max(6, barW * p2Frac), barH, 3);
    hudP2Bar.endFill();
  }
}

/* =========================================================
   Sprite sync + hitboxes
   ========================================================= */
function syncSprites() {
  if (!p1Sprite || !p2Sprite || !ballSprite || !ballShadowSprite) return;
  p1Sprite.x = G.p1.x; p1Sprite.y = G.p1.y - BLOB_R;
  p2Sprite.x = G.p2.x; p2Sprite.y = G.p2.y - BLOB_R;
  ballSprite.x = G.ball.x; ballSprite.y = G.ball.y;
  ballShadowSprite.x = G.ball.x;

  const maxHeight = GROUND_Y - NET_TOP;
  const heightAboveGround = clamp(GROUND_Y - G.ball.y, 0, maxHeight);
  const t = heightAboveGround / maxHeight;
    const scale = 1.0 - t * 0.45;
  ballShadowSprite.scale.set(scale, scale * 0.55);
  ballShadowSprite.alpha = 0.85 - t * 0.45;

  /* --- Offscreen ball indicator --- */
  if (currentScene === 'game' && G.ball.y < 0) {
    const x = clamp(G.ball.x, 12, VW - 12);
    const dist = Math.round(-G.ball.y);

    ballIndicatorGfx.visible = true;
    ballIndicatorGfx.clear();
    ballIndicatorGfx.beginFill(0xffe066);
    ballIndicatorGfx.moveTo(x - 6, 0);
    ballIndicatorGfx.lineTo(x + 6, 0);
    ballIndicatorGfx.lineTo(x, 8);
    ballIndicatorGfx.closePath();
    ballIndicatorGfx.endFill();

    ballIndicatorText.visible = true;
    ballIndicatorText.text = String(dist);
    ballIndicatorText.x = x;
    ballIndicatorText.y = 10;
  } else {
    ballIndicatorGfx.visible = false;
    ballIndicatorText.visible = false;
  }
}

function drawHitboxes() {
  if (!hitboxGraphics) return;
  const g = hitboxGraphics;
  g.clear();
  g.lineStyle(1, 0xff2a4a, 1);
  g.drawRect(NET_X - NET_W / 2, NET_TOP, NET_W, GROUND_Y - NET_TOP);
  g.lineStyle(1, 0x00ff66, 1);
  g.drawCircle(G.ball.x, G.ball.y, BALL_R);
  g.lineStyle(1, 0xffe83a, 1);
  g.drawCircle(G.p1.x, G.p1.y - BLOB_R, BLOB_R);
  g.lineStyle(1, 0x33ccff, 1);
  g.drawCircle(G.p2.x, G.p2.y - BLOB_R, BLOB_R);
}