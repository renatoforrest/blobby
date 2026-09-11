'use strict';

const rotateOverlay = document.getElementById('rotate-overlay');

function makeText(str, size, fill, opts) {
  const t = new PIXI.Text(str, Object.assign({
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: size, fontWeight: 'bold', fill: fill, align: 'center'
  }, opts || {}));
  t.resolution = 1;
  return t;
}

function makeRetroText(str, size, fill) {
  return makeText(str, size, fill, {
    fontFamily: 'Courier New, monospace',
    letterSpacing: 2, stroke: '#001a00',
    strokeThickness: Math.max(3, Math.round(size * 0.10))
  });
}

function makeButton(label, tex, onClick) {
  const c = new PIXI.Container();
  const bg = new PIXI.Sprite(tex);
  bg.tint = 0x2f6fb0;
  c.addChild(bg);
  const t = makeText(label, 26, 0xffffff);
  t.anchor.set(0.5);
  t.x = tex.width / 2; t.y = tex.height / 2;
  c.addChild(t);
  c.eventMode = 'static'; c.cursor = 'pointer';
  c.hitArea = new PIXI.Rectangle(0, 0, tex.width, tex.height);
  c.on('pointerover', () => { bg.tint = 0x4a9be0; });
  c.on('pointerout',  () => { bg.tint = 0x2f6fb0; });
  c.on('pointerdown', () => { bg.tint = 0x1c4d80; });
  c.on('pointerup',   () => { bg.tint = 0x4a9be0; onClick(); });
  c.on('pointerupoutside', () => { bg.tint = 0x2f6fb0; });
  return c;
}

function isFullscreenSupported() {
  return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
}
function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}
function toggleFullscreen() {
  const el = document.documentElement;
  try {
    if (isFullscreen()) {
      const fn = document.exitFullscreen || document.webkitExitFullscreen;
      if (fn) fn.call(document);
    } else {
      const fn = el.requestFullscreen || el.webkitRequestFullscreen;
      if (fn) {
        const p = fn.call(el);
        if (p && p.then) {
          p.then(() => {
            if (screen.orientation && screen.orientation.lock) {
              screen.orientation.lock('landscape').catch(() => {});
            }
          }).catch(() => {});
        }
      }
    }
  } catch (e) {}
}
function updateFullscreenIcon() {
  if (typeof fullscreenBtnIcon !== 'undefined' && fullscreenBtnIcon) {
    fullscreenBtnIcon.text = isFullscreen() ? '\u2715' : '\u26F6';
  }
}
function checkOrientation() {
  if (isTouch && window.innerHeight > window.innerWidth) {
    rotateOverlay.style.display = 'flex';
  } else {
    rotateOverlay.style.display = 'none';
  }
}

window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 150));
checkOrientation();

document.addEventListener('fullscreenchange', () => {
  updateFullscreenIcon();
  setTimeout(() => { fitView(); checkOrientation(); }, 80);
});
document.addEventListener('webkitfullscreenchange', () => {
  updateFullscreenIcon();
  setTimeout(() => { fitView(); checkOrientation(); }, 80);
});
