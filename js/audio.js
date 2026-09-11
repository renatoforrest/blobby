'use strict';

let audioCtx = null;
let lastHitSoundTime = 0;

function ensureAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { audioCtx = null; }
}

function playHitSound() {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    if (now - lastHitSoundTime < 0.06) return;
    lastHitSoundTime = now;

    const t0 = now;
    const noiseLen = 0.07;
    const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * noiseLen));
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = 1 - i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 650;
    noiseFilter.Q.value = 0.7;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, t0);
    noiseGain.gain.linearRampToValueAtTime(0.12, t0 + 0.004);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    noise.start(t0);
    noise.stop(t0 + 0.1);

    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t0);
    osc.frequency.exponentialRampToValueAtTime(90, t0 + 0.08);

    oscGain.gain.setValueAtTime(0.0001, t0);
    oscGain.gain.linearRampToValueAtTime(0.09, t0 + 0.005);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);

    osc.connect(oscGain);
    oscGain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.12);
  } catch (e) {}
}

function playPointSound() {
  if (!audioCtx) return;
  try {
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, t0);
    osc.frequency.exponentialRampToValueAtTime(330, t0 + 0.25);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.09, t0 + 0.02);
    gain.gain.setValueAtTime(0.09, t0 + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(t0); osc.stop(t0 + 0.4);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(220, t0);
    osc2.frequency.exponentialRampToValueAtTime(165, t0 + 0.25);
    gain2.gain.setValueAtTime(0.0001, t0);
    gain2.gain.linearRampToValueAtTime(0.05, t0 + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
    osc2.connect(gain2); gain2.connect(audioCtx.destination);
    osc2.start(t0); osc2.stop(t0 + 0.34);
  } catch (e) {}
}
