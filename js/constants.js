'use strict';

const VW = 640, VH = 360;

const GROUND_Y = 327;
const NET_X    = 320;
const NET_W    = 6;
const NET_VW   = 11;
const NET_TOP  = 168;
const BLOB_R   = 25;
const BALL_R   = 21;

const P1_HOME_X = 144;
const P2_HOME_X = 496;

const BLOB_ACC   = 0.8;
const BLOB_MAXVX = 4;

const SERVE_Y = 180;
const POINT_DURATION = 55;

const BALL_GRAV      = 0.22;
const BLOB_GRAV      = 0.55;
const BLOB_BOUNCE    = 1.05;
const BLOB_MOMENTUM  = 0.7;
const NET_BOUNCE     = 0.70;
const BALL_MAX_SPEED = 9;

const BLOB_KICK = 1.8;

/* Jump — JUMP_V is derived from BLOB_GRAV and JUMP_HEIGHT so that the
   full-hold jump peaks at exactly JUMP_HEIGHT pixels above the ground.
   Change BLOB_GRAV or JUMP_HEIGHT freely; JUMP_V updates automatically. */
const JUMP_HEIGHT     = 205;                                              // pixels
const JUMP_V          = -Math.sqrt(2 * BLOB_GRAV * JUMP_HEIGHT);          // ≈ -15 at grav 0.55
const JUMP_CUT_FACTOR = 0.75;   // release multiplies remaining rise velocity

const JUMP_BUFFER_FRAMES = 10;


const SPRITE_URLS = {
  blobRed:    'blob-red.png',
  blobYellow: 'blob-yellow.png',
  ball:       'ball.png'
};

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ]
};

const SIGNALING_URL =
  (location.protocol === 'https:' ? 'wss://' : 'ws://') +
  location.host + '/ws';

const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));

const isTouch = ('ontouchstart' in window) ||
                navigator.maxTouchPoints > 0 ||
                (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);