'use strict';

PIXI.settings.FAIL_IF_MAJOR_PERFORMANCE_CAVEAT = false;
PIXI.settings.RESOLUTION = 1;
PIXI.settings.SORTABLE_CHILDREN = false;

const app = new PIXI.Application({
  width: VW,
  height: VH,
  antialias: false,
  resolution: 1,
  autoDensity: false,
  backgroundColor: 0x000000,
  powerPreference: 'high-performance'
});

const view = app.view;
view.style.position = 'absolute';
document.body.appendChild(view);

function fitView() {
  const s = Math.min(window.innerWidth / VW, window.innerHeight / VH);
  view.style.width  = (VW * s) + 'px';
  view.style.height = (VH * s) + 'px';
  view.style.left   = Math.round((window.innerWidth  - VW * s) * 0.5) + 'px';
  view.style.top    = Math.round((window.innerHeight - VH * s) * 0.5) + 'px';
}

window.addEventListener('resize', fitView);
window.addEventListener('orientationchange', () => setTimeout(fitView, 150));
fitView();
