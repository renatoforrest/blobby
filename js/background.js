'use strict';

function buildBackground() {
  const bg = new PIXI.Container();
  bg.addChild(new PIXI.Sprite(skyTex));

  const cloudData = [
    { x: 60, y: 55, s: 0.95, v: 0.10 },
    { x: 320, y: 90, s: 1.20, v: 0.16 },
    { x: 580, y: 45, s: 1.00, v: 0.12 },
    { x: 720, y: 130, s: 0.75, v: 0.08 },
    { x: 460, y: 170, s: 0.60, v: 0.06 }
  ];
  const clouds = [];
  for (const c of cloudData) {
    const s = new PIXI.Sprite(cloudTex);
    s.x = c.x; s.y = c.y; s.scale.set(c.s); s.alpha = 0.9;
    s._speed = c.v;
    bg.addChild(s); clouds.push(s);
  }
  bg._clouds = clouds;

  const ocean = new PIXI.Sprite(oceanTex); ocean.x = 0; ocean.y = 355; bg.addChild(ocean);
  const rock  = new PIXI.Sprite(rockTex);  rock.x  = 205; rock.y = 388; bg.addChild(rock);
  const cliff = new PIXI.Sprite(cliffTex); cliff.x = 0;   cliff.y = 300; bg.addChild(cliff);
  const sand  = new PIXI.Sprite(sandTex);  sand.x  = 0;   sand.y = 420; bg.addChild(sand);

  const palmData = [
    { x: 60,  baseY: 505, tex: palmRightTex, scale: 1.00 },
    { x: 10,  baseY: 525, tex: palmLeftTex,  scale: 0.85 },
    { x: 620, baseY: 490, tex: palmRightTex, scale: 1.05 },
    { x: 700, baseY: 510, tex: palmLeftTex,  scale: 0.90 },
    { x: 770, baseY: 528, tex: palmRightTex, scale: 0.75 }
  ];
  for (const p of palmData) {
    const s = new PIXI.Sprite(p.tex);
    s.anchor.set(0.5, 1); s.x = p.x; s.y = p.baseY; s.scale.set(p.scale);
    bg.addChild(s);
  }
  return bg;
}
