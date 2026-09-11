'use strict';

function buildBackground() {
  const bg = new PIXI.Container();
  bg.addChild(new PIXI.Sprite(skyTex));

  const cloudData = [
    { x:  36, y:  33, s: 0.95, v: 0.10 },
    { x: 192, y:  54, s: 1.20, v: 0.16 },
    { x: 348, y:  27, s: 1.00, v: 0.12 },
    { x: 432, y:  78, s: 0.75, v: 0.08 },
    { x: 276, y: 102, s: 0.60, v: 0.06 }
  ];
  const clouds = [];
  for (const c of cloudData) {
    const s = new PIXI.Sprite(cloudTex);
    s.x = c.x; s.y = c.y; s.scale.set(c.s); s.alpha = 0.9;
    s._speed = c.v;
    bg.addChild(s); clouds.push(s);
  }
  bg._clouds = clouds;

  const ocean = new PIXI.Sprite(oceanTex); ocean.x = 0; ocean.y = 213; bg.addChild(ocean);
  const rock  = new PIXI.Sprite(rockTex);  rock.x  = 123; rock.y = 233; bg.addChild(rock);
  const cliff = new PIXI.Sprite(cliffTex); cliff.x = 0;   cliff.y = 180; bg.addChild(cliff);
  const sand  = new PIXI.Sprite(sandTex);  sand.x  = 0;   sand.y = 252; bg.addChild(sand);

  const palmData = [
    { x:  36, baseY: 303, tex: palmRightTex, scale: 1.00 },
    { x:   6, baseY: 315, tex: palmLeftTex,  scale: 0.85 },
    { x: 372, baseY: 294, tex: palmRightTex, scale: 1.05 },
    { x: 420, baseY: 306, tex: palmLeftTex,  scale: 0.90 },
    { x: 462, baseY: 317, tex: palmRightTex, scale: 0.75 }
  ];
  for (const p of palmData) {
    const s = new PIXI.Sprite(p.tex);
    s.anchor.set(0.5, 1); s.x = p.x; s.y = p.baseY; s.scale.set(p.scale);
    bg.addChild(s);
  }
  return bg;
}