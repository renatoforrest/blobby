'use strict';

(async function init() {
  await loadBlobAndBallTextures();
  buildGameSceneSprites();
  registerTick();
  applySettings();
  updateScoreText();
  updateTimerText();
  syncSprites();
  showScene('menu');
  connectSignaling();
})();
