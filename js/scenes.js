'use strict';

const worldBg = buildBackground();

const menuScene     = new PIXI.Container();
const settingsScene = new PIXI.Container();
const mpScene       = new PIXI.Container();
const gameScene     = new PIXI.Container();
const overlayUI     = new PIXI.Container();

app.stage.addChild(worldBg);
app.stage.addChild(menuScene);
app.stage.addChild(settingsScene);
app.stage.addChild(mpScene);
app.stage.addChild(gameScene);
app.stage.addChild(overlayUI);

menuScene.visible = settingsScene.visible = mpScene.visible = gameScene.visible = false;

/* ---------- MAIN MENU ---------- */
const titleText = makeText('BLOBBY VOLLEY 2', 35, 0xffffff, {
  stroke: '#0e1c33', strokeThickness: 5, letterSpacing: 2
});
titleText.anchor.set(0.5);
titleText.x = VW / 2; titleText.y = 71;
menuScene.addChild(titleText);

const menuHint = makeText(
  isTouch
    ? 'Tap the on-screen buttons to play'
    : 'P1: A/D/W    P2: \u2190/\u2192/\u2191    ESC: menu',
  10, 0xdff2ff, { stroke: '#0e1c33', strokeThickness: 2 }
);
menuHint.anchor.set(0.5);
menuHint.x = VW / 2; menuHint.y = 334;
menuScene.addChild(menuHint);

const btnPlay = makeButton('PLAY', btnTex, () => startGame(1));
btnPlay.x = (VW - BTN_W) / 2; btnPlay.y = 132;
menuScene.addChild(btnPlay);

const btnMulti = makeButton('MULTIPLAYER', btnTex, () => showScene('mp'));
btnMulti.x = (VW - BTN_W) / 2; btnMulti.y = 180;
menuScene.addChild(btnMulti);

const btnSettings = makeButton('SETTINGS', btnTex, () => showScene('settings'));
btnSettings.x = (VW - BTN_W) / 2; btnSettings.y = 228;
menuScene.addChild(btnSettings);

/* ---------- SETTINGS ---------- */
const settingsTitle = makeText('SETTINGS', 28, 0xffffff, {
  stroke: '#0e1c33', strokeThickness: 4
});
settingsTitle.anchor.set(0.5);
settingsTitle.x = VW / 2; settingsTitle.y = 42;
settingsScene.addChild(settingsTitle);

function makeRow(y, labelText, labels, getIndex, cycle) {
  const row = new PIXI.Container();
  row.x = 60; row.y = y;
  const lbl = makeText(labelText, 14, 0xffffff, { stroke: '#0e1c33', strokeThickness: 2 });
  lbl.anchor.set(0, 0.5);
  row.addChild(lbl);

  const bg = new PIXI.Sprite(btnSmTex);
  bg.tint = 0x2f6fb0; bg.x = 204; bg.y = -BTN_SM_H / 2;
  bg.eventMode = 'static'; bg.cursor = 'pointer';
  bg.hitArea = new PIXI.Rectangle(0, 0, BTN_SM_W, BTN_SM_H);
  row.addChild(bg);

  const val = makeText(labels[getIndex()], 12, 0xffffff);
  val.anchor.set(0.5); val.x = 204 + BTN_SM_W / 2;
  row.addChild(val);

  bg.on('pointerover', () => { bg.tint = 0x4a9be0; });
  bg.on('pointerout',  () => { bg.tint = 0x2f6fb0; });
  bg.on('pointerup',   () => { cycle(); val.text = labels[getIndex()]; applySettings(); });
  return row;
}

settingsScene.addChild(makeRow(96, 'FPS LIMIT', FPS_LABELS,
  () => settings.fpsIndex,
  () => { settings.fpsIndex = (settings.fpsIndex + 1) % FPS_VALUES.length; }));
settingsScene.addChild(makeRow(138, 'SHOW FPS', ['ON', 'OFF'],
  () => (settings.showFps ? 0 : 1),
  () => { settings.showFps = !settings.showFps; }));
settingsScene.addChild(makeRow(180, 'HITBOXES', ['OFF', 'ON'],
  () => (settings.showHitboxes ? 1 : 0),
  () => { settings.showHitboxes = !settings.showHitboxes; }));
settingsScene.addChild(makeRow(222, 'SCORE TO WIN', ['5', '10', '15'],
  () => settings.winIndex,
  () => { settings.winIndex = (settings.winIndex + 1) % WIN_VALUES.length; }));

const btnBack = makeButton('BACK', btnTex, () => showScene('menu'));
btnBack.x = (VW - BTN_W) / 2; btnBack.y = 282;
settingsScene.addChild(btnBack);

/* ---------- MULTIPLAYER ---------- */
const mpTitle = makeText('MULTIPLAYER', 25, 0xffffff, {
  stroke: '#0e1c33', strokeThickness: 4
});
mpTitle.anchor.set(0.5);
mpTitle.x = VW / 2; mpTitle.y = 33;
mpScene.addChild(mpTitle);

const mpLobbyPanel = new PIXI.Container();
mpScene.addChild(mpLobbyPanel);

const createRoomBtn = makeButton('CREATE ROOM', btnTex, () => createRoom());
createRoomBtn.x = VW / 2 - BTN_W - 8;
createRoomBtn.y = 66;
mpLobbyPanel.addChild(createRoomBtn);

const refreshBtn = makeButton('REFRESH', btnTex, () => signalSend({ t: 'list' }));
refreshBtn.x = VW / 2 + 8;
refreshBtn.y = 66;
mpLobbyPanel.addChild(refreshBtn);

const roomsHeader = makeText('OPEN ROOMS', 11, 0x9fe870, {
  fontFamily: 'Consolas, monospace', letterSpacing: 2
});
roomsHeader.x = 60;
roomsHeader.y = 117;
mpLobbyPanel.addChild(roomsHeader);

const mpLobbyList = new PIXI.Container();
mpLobbyList.x = 60;
mpLobbyList.y = 135;
mpLobbyPanel.addChild(mpLobbyList);

const mpLobbyStatus = makeText('', 10, 0xbcd4ea, {
  stroke: '#0e1c33', strokeThickness: 2
});
mpLobbyStatus.anchor.set(0.5);
mpLobbyStatus.x = VW / 2; mpLobbyStatus.y = 340;
mpLobbyPanel.addChild(mpLobbyStatus);

const lobbyBackBtn = makeButton('BACK', btnTex, () => showScene('menu'));
lobbyBackBtn.x = (VW - BTN_W) / 2;
lobbyBackBtn.y = 296;
mpLobbyPanel.addChild(lobbyBackBtn);

const mpRoomPanel = new PIXI.Container();
mpRoomPanel.visible = false;
mpScene.addChild(mpRoomPanel);

const roomInfoText = makeText('YOUR ROOM', 12, 0xbcd4ea, {
  fontFamily: 'Consolas, monospace', letterSpacing: 2
});
roomInfoText.anchor.set(0.5);
roomInfoText.x = VW / 2; roomInfoText.y = 90;
mpRoomPanel.addChild(roomInfoText);

const roomIdText = makeText('', 43, 0x39ff4a, {
  fontFamily: 'Courier New, monospace', letterSpacing: 4,
  stroke: '#001a00', strokeThickness: 4
});
roomIdText.anchor.set(0.5);
roomIdText.x = VW / 2; roomIdText.y = 138;
mpRoomPanel.addChild(roomIdText);

const roomNameText = makeText('', 13, 0xffffff, {
  stroke: '#0e1c33', strokeThickness: 2
});
roomNameText.anchor.set(0.5);
roomNameText.x = VW / 2; roomNameText.y = 180;
mpRoomPanel.addChild(roomNameText);

const roomStatus = makeText('', 12, 0xffd066, {
  stroke: '#0e1c33', strokeThickness: 2
});
roomStatus.anchor.set(0.5);
roomStatus.x = VW / 2; roomStatus.y = 216;
mpRoomPanel.addChild(roomStatus);

const leaveRoomBtn = makeButton('LEAVE ROOM', btnTex, () => leaveRoomAction());
leaveRoomBtn.x = (VW - BTN_W) / 2;
leaveRoomBtn.y = 264;
mpRoomPanel.addChild(leaveRoomBtn);

function renderRoomList(rooms) {
  mpLobbyList.removeChildren();
  if (!rooms.length) {
    const empty = makeText('No rooms right now - create one!', 11, 0xbcd4ea);
    empty.anchor.set(0.5, 0);
    empty.x = 180; empty.y = 12;
    mpLobbyList.addChild(empty);
    return;
  }
  const rowW = 360, rowH = 24, gap = 4;
  rooms.slice(0, 8).forEach((r, i) => {
    const row = new PIXI.Container();
    row.y = i * (rowH + gap);
    const bg = new PIXI.Sprite(rowBgTex);
    bg.tint = r.locked ? 0x30363d : 0x1a2530;
    row.addChild(bg);
    const nameT = makeText(r.name, 11, 0xffffff);
    nameT.anchor.set(0, 0.5);
    nameT.x = 10; nameT.y = rowH / 2;
    row.addChild(nameT);
    const playerT = makeText(r.players + '/' + r.max, 10,
      r.locked ? 0xff8866 : 0x9fe870);
    playerT.anchor.set(1, 0.5);
    playerT.x = rowW - 60; playerT.y = rowH / 2;
    row.addChild(playerT);
    const statusT = makeText(r.locked ? 'FULL' : 'JOIN', 10,
      r.locked ? 0x777788 : 0x39ff4a);
    statusT.anchor.set(1, 0.5);
    statusT.x = rowW - 12; statusT.y = rowH / 2;
    row.addChild(statusT);
    if (!r.locked) {
      row.eventMode = 'static';
      row.cursor = 'pointer';
      row.hitArea = new PIXI.Rectangle(0, 0, rowW, rowH);
      row.on('pointerover', () => { bg.tint = 0x2f4a60; });
      row.on('pointerout',  () => { bg.tint = 0x1a2530; });
      row.on('pointerup',   () => joinRoom(r.id));
    }
    mpLobbyList.addChild(row);
  });
}

function showLobbyPanel() {
  mpLobbyPanel.visible = true;
  mpRoomPanel.visible = false;
  renderRoomList(SIGNAL.rooms);
}

function showRoomPanel() {
  mpLobbyPanel.visible = false;
  mpRoomPanel.visible = true;
  if (!SIGNAL.inRoom) return;
  roomIdText.text = SIGNAL.inRoom.id;
  roomNameText.text = SIGNAL.inRoom.name;
  if (SIGNAL.inRoom.role === 'host') {
    roomInfoText.text = 'YOUR ROOM - SHARE THE CODE';
    roomStatus.text = 'Waiting for an opponent to join...';
  } else {
    roomInfoText.text = 'JOINED ROOM';
    roomStatus.text = 'Connecting to host...';
  }
}