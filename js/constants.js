'use strict';

const VW = 800, VH = 600;

const GROUND_Y = 545;
const NET_X    = 400;
const NET_W    = 10;
const NET_VW   = 18;
const NET_TOP  = 280;
const BLOB_R   = 42;
const BALL_R   = 35;

const BLOB_ACC   = 1.10;
const BLOB_MAXVX = 5.5;
const JUMP_V     = -30;

const SERVE_Y = 300;
const POINT_DURATION = 55;

const BALL_GRAV      = 0.50;
const BLOB_GRAV      = 1.35;
const BLOB_BOUNCE    = 1.05;
const NET_BOUNCE     = 0.70;
const BALL_MAX_SPEED = 18;

const BLOB_KICK = 2.5;

const SERVE_VY = -10;
const SERVE_VX = 4.5;

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
