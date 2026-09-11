'use strict';

let netSprite, p1Sprite, p2Sprite, ballShadowSprite, ballSprite;
let scoreLText, scoreRText, timerText, leftLabel, rightLabel;
let winText, winHint, inGameBackBtn, hitboxGraphics;
let fullscreenBtn = null, fullscreenBtnIcon = null;
let fpsText;

function buildGameSceneSprites() {
  netSprite = new PIXI.Sprite(netTex);
  netSprite.x = NET_X - NET_VW / 2;
  netSprite.y = NET_TOP;
  gameScene.addChild(netSprite);

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

  ballShadowSprite = new PIXI.Sprite(ballShadowTex);
  ballShadowSprite.anchor.set(0.5);
  ballShadowSprite.y = GROUND_Y - 2;
  gameScene.addChild(ballShadowSprite);

  ballSprite = new PIXI.Sprite(ballTex);
  ballSprite.anchor.set(0.5);
  ballSprite.width  = BALL_R * 2;
  ballSprite.height = BALL_R * 2;
  gameScene.addChild(ballSprite);

  scoreLText = makeRetroText('00', 46, 0x39ff4a);
  scoreLText.anchor.set(0, 0); scoreLText.x = 28; scoreLText.y = 22;
  gameScene.addChild(scoreLText);

  scoreRText = makeRetroText('02', 46, 0x39ff4a);
  scoreRText.anchor.set(1, 0); scoreRText.x = VW - 28; scoreRText.y = 22;
  gameScene.addChild(scoreRText);

  timerText = makeRetroText('00:00', 34, 0x39ff4a);
  timerText.anchor.set(0.5, 0); timerText.x = VW / 2; timerText.y = 26;
  gameScene.addChild(timerText);

  inGameBackBtn = makeButton('BACK', btnSmTex, () => showScene('menu'));
  inGameBackBtn.scale.set(0.45);
  inGameBackBtn.x = VW / 2 - (BTN_SM_W * 0.45) / 2;
  inGameBackBtn.y = 78;
  inGameBackBtn.visible = false;
  gameScene.addChild(inGameBackBtn);

  leftLabel = makeRetroText('LEFT PLAYER', 22, 0x39ff4a);
  leftLabel.anchor.set(0, 1); leftLabel.x = 24; leftLabel.y = VH - 14;
  gameScene.addChild(leftLabel);

  rightLabel = makeRetroText('RIGHT PLAYER', 22, 0x39ff4a);
  rightLabel.anchor.set(1, 1); rightLabel.x = VW - 24; rightLabel.y = VH - 14;
  gameScene.addChild(rightLabel);

  winText = makeRetroText('', 42, 0xffe066);
  winText.anchor.set(0.5); winText.x = VW / 2; winText.y = 250;
  winText.visible = false;
  gameScene.addChild(winText);

  winHint = makeText(
    isTouch ? 'tap BACK to leave' : 'press SPACE for the menu',
    20, 0xffffff, { stroke: '#0e1c33', strokeThickness: 3 }
  );
  winHint.anchor.set(0.5); winHint.x = VW / 2; winHint.y = 300;
  winHint.visible = false;
  gameScene.addChild(winHint);

  hitboxGraphics = new PIXI.Graphics();
  hitboxGraphics.visible = false;
  gameScene.addChild(hitboxGraphics);

  if (isTouch && isFullscreenSupported()) {
    const R = 24;
    const c = new PIXI.Container();
    c.x = VW - R - 18;
    c.y = 110;

    const g = new PIXI.Graphics();
    g.beginFill(0x2f6fb0, 0.85);
    g.drawCircle(0, 0, R);
    g.endFill();
    g.lineStyle(2, 0xffffff, 0.45);
    g.drawCircle(0, 0, R);
    c.addChild(g);

    const t = makeText('\u26F6', 22, 0xffffff);
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

  fpsText = makeText('FPS --', 14, 0x9fe870, { fontFamily: 'Consolas, monospace' });
  fpsText.x = 8; fpsText.y = 6;
  overlayUI.addChild(fpsText);
}

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
}

function drawHitboxes() {
  if (!hitboxGraphics) return;
  const g = hitboxGraphics;
  g.clear();
  g.lineStyle(2, 0xff2a4a, 1);
  g.drawRect(NET_X - NET_W / 2, NET_TOP, NET_W, GROUND_Y - NET_TOP);
  g.lineStyle(2, 0x00ff66, 1);
  g.drawCircle(G.ball.x, G.ball.y, BALL_R);
  g.lineStyle(2, 0xffe83a, 1);
  g.drawCircle(G.p1.x, G.p1.y - BLOB_R, BLOB_R);
  g.lineStyle(2, 0x33ccff, 1);
  g.drawCircle(G.p2.x, G.p2.y - BLOB_R, BLOB_R);
}
