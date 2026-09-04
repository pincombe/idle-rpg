/* =====================================================================
   TOY BOX QUEST — procedural audio (Web Audio API, no sound files)
   Exposes window.ToyAudio: unlock(), sfx(name, arg), setZone(i),
   setBoss(bool), setOptions({sfx, music, muted}), isUnlocked()
   ===================================================================== */
(() => {
'use strict';

let ctx = null, master, sfxBus, musBus, musOut;
let noiseBuf = null;
let opts = { sfx: 0.6, music: 0.35, muted: false };
let unlocked = false;
const lastPlayed = {};

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

function ensureCtx() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try { ctx = new AC(); } catch (e) { return false; }
  master = ctx.createGain(); master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.connect(master);
  musOut = ctx.createGain(); musOut.connect(master);
  // music bus with a soft music-box style echo
  musBus = ctx.createGain();
  const delay = ctx.createDelay(1.0); delay.delayTime.value = 0.31;
  const fb = ctx.createGain(); fb.gain.value = 0.28;
  const wet = ctx.createGain(); wet.gain.value = 0.3;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
  musBus.connect(musOut);
  musBus.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(wet); wet.connect(musOut);
  // white noise buffer for drums / hits
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  applyVolumes();
  return true;
}
function applyVolumes() {
  if (!ctx) return;
  master.gain.value = opts.muted ? 0 : 1;
  sfxBus.gain.value = opts.sfx;
  musOut.gain.value = opts.music * 0.8;
}

/* ------------------------------ voices ----------------------------- */
function env(t, dur, vol, attack = 0.004) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  return g;
}
function tone(dest, freq, t, dur, vol, type = 'sine', slideTo = null) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  const g = env(t, dur, vol);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + dur + 0.05);
}
function bell(dest, freq, t, dur, vol) {
  tone(dest, freq, t, dur, vol, 'sine');
  tone(dest, freq * 3.01, t, dur * 0.45, vol * 0.22, 'sine');
  tone(dest, freq * 5.4, t, dur * 0.2, vol * 0.08, 'sine');
}
function pluck(dest, freq, t, dur, vol) {
  tone(dest, freq, t, dur, vol * 0.7, 'triangle');
  tone(dest, freq * 2, t, dur * 0.5, vol * 0.25, 'sine');
}
function noise(dest, t, dur, vol, filterType = 'lowpass', freq = 1200, q = 0.7, sweepTo = null) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf; src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = filterType; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = env(t, dur, vol, 0.002);
  src.connect(f).connect(g).connect(dest);
  src.start(t); src.stop(t + dur + 0.05);
}
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

/* ------------------------------- SFX ------------------------------- */
const SFX = {
  hit(t) {
    const p = 0.9 + Math.random() * 0.2;
    noise(sfxBus, t, 0.07, 0.35, 'lowpass', 1400 * p);
    tone(sfxBus, 220 * p, t, 0.09, 0.25, 'square', 70);
  },
  crit(t) {
    SFX.hit(t);
    tone(sfxBus, 880, t, 0.16, 0.22, 'sine', 1320);
    bell(sfxBus, 1760, t + 0.04, 0.25, 0.18);
  },
  hurt(t) {
    tone(sfxBus, 160, t, 0.2, 0.25, 'sawtooth', 55);
    noise(sfxBus, t, 0.1, 0.2, 'lowpass', 500);
  },
  kill(t) {
    // toy "boing"
    tone(sfxBus, 300, t, 0.28, 0.22, 'triangle', 650);
    tone(sfxBus, 150, t, 0.12, 0.15, 'square', 300);
    noise(sfxBus, t, 0.08, 0.2, 'bandpass', 900, 1.5);
  },
  coin(t) {
    bell(sfxBus, 1568, t, 0.1, 0.16);
    bell(sfxBus, 2093, t + 0.07, 0.28, 0.16);
  },
  loot(t, rarity = 0) {
    const n = Math.min(7, 2 + rarity);
    for (let i = 0; i < n; i++) bell(sfxBus, midi(81 + PENTA[i]), t + i * 0.085, 0.5, 0.16 + rarity * 0.015);
    if (rarity >= 3) tone(sfxBus, midi(57 + (rarity - 3) * 5), t, 0.9, 0.12, 'triangle');
    if (rarity >= 5) for (let i = 0; i < 6; i++) bell(sfxBus, midi(93 + PENTA[(i * 3) % 6]), t + 0.6 + i * 0.05, 0.4, 0.1);
  },
  pickup(t) { bell(sfxBus, 1320, t, 0.14, 0.12); },
  toy(t) {
    for (let i = 0; i < 5; i++) tone(sfxBus, midi(84 + PENTA[Math.floor(Math.random() * 6)]), t + i * 0.05, 0.22, 0.1, 'triangle');
  },
  newToy(t) {
    SFX.toy(t);
    [76, 80, 83, 88].forEach((m, i) => bell(sfxBus, midi(m), t + 0.25 + i * 0.1, 0.6, 0.18));
  },
  setComplete(t) {
    [72, 76, 79, 84, 79, 84, 88].forEach((m, i) => { bell(sfxBus, midi(m), t + i * 0.11, 0.7, 0.2); tone(sfxBus, midi(m - 12), t + i * 0.11, 0.3, 0.08, 'square'); });
  },
  levelup(t) {
    [72, 76, 79, 84].forEach((m, i) => { bell(sfxBus, midi(m), t + i * 0.11, 0.55, 0.22); tone(sfxBus, midi(m - 12), t + i * 0.11, 0.25, 0.08, 'square'); });
    bell(sfxBus, midi(88), t + 0.5, 0.9, 0.2);
  },
  achievement(t) {
    [79, 83, 86].forEach((m, i) => bell(sfxBus, midi(m), t + i * 0.09, 0.5, 0.18));
    bell(sfxBus, midi(91), t + 0.3, 1.0, 0.2);
  },
  boss(t) {
    tone(sfxBus, 70, t, 0.6, 0.5, 'sine', 35);
    noise(sfxBus, t, 0.3, 0.35, 'lowpass', 400);
    tone(sfxBus, 110, t + 0.35, 0.8, 0.18, 'sawtooth', 82);
    tone(sfxBus, 70, t + 0.7, 0.6, 0.5, 'sine', 35);
  },
  nap(t) {
    [69, 67, 65, 60].forEach((m, i) => tone(sfxBus, midi(m), t + i * 0.2, 0.35, 0.18, 'triangle'));
    tone(sfxBus, 90, t + 0.85, 0.7, 0.15, 'sine', 45);
  },
  buy(t) {
    tone(sfxBus, 1200, t, 0.04, 0.2, 'square');
    tone(sfxBus, 1700, t + 0.05, 0.05, 0.2, 'square');
    bell(sfxBus, 1046, t + 0.1, 0.3, 0.15);
  },
  sell(t) {
    noise(sfxBus, t, 0.04, 0.25, 'highpass', 3000);
    bell(sfxBus, 2200, t + 0.03, 0.15, 0.16);
    bell(sfxBus, 2960, t + 0.09, 0.35, 0.16);
  },
  equip(t) {
    noise(sfxBus, t, 0.05, 0.2, 'bandpass', 2500, 2);
    tone(sfxBus, 660, t + 0.02, 0.12, 0.15, 'triangle', 880);
  },
  zone(t) {
    noise(sfxBus, t, 0.45, 0.3, 'bandpass', 300, 1.2, 3500);
    bell(sfxBus, 1046, t + 0.3, 0.4, 0.14);
  },
  click(t) { tone(sfxBus, 900, t, 0.035, 0.12, 'sine'); },
  deny(t) { tone(sfxBus, 180, t, 0.09, 0.15, 'square'); tone(sfxBus, 150, t + 0.11, 0.12, 0.15, 'square'); },
  prestige(t) {
    [60, 64, 67, 72, 76, 79, 84, 88].forEach((m, i) => { bell(sfxBus, midi(m), t + i * 0.09, 0.8, 0.2); tone(sfxBus, midi(m - 12), t + i * 0.09, 0.3, 0.08, 'square'); });
    for (let i = 0; i < 12; i++) bell(sfxBus, midi(88 + PENTA[Math.floor(Math.random() * 7)]), t + 0.8 + i * 0.06, 0.5, 0.12);
    tone(sfxBus, midi(48), t + 0.7, 1.6, 0.15, 'triangle');
  },
};
const MIN_GAP = { hit: 0.05, crit: 0.05, hurt: 0.08, kill: 0.12, coin: 0.12, pickup: 0.1, click: 0.03 };

function sfx(name, arg) {
  if (!unlocked || !ctx || opts.muted || opts.sfx <= 0) return;
  const fn = SFX[name];
  if (!fn) return;
  const now = ctx.currentTime;
  const gap = MIN_GAP[name] || 0;
  if (gap && lastPlayed[name] && now - lastPlayed[name] < gap) return;
  lastPlayed[name] = now;
  try { fn(now, arg); } catch (e) { /* ignore audio glitches */ }
}

/* ------------------------------- music ----------------------------- */
const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];
// one theme per zone: root midi, scale, tempo, chord progression (scale degrees), lead voice, feel
const THEMES = [
  { root: 60, scale: MAJOR, bpm: 112, prog: [0, 4, 5, 3], lead: 'bell',   feel: 'bouncy'  }, // Toy Chest
  { root: 55, scale: MAJOR, bpm: 122, prog: [0, 3, 4, 0], lead: 'square', feel: 'march'   }, // Block Castle
  { root: 53, scale: MAJOR, bpm: 96,  prog: [0, 5, 3, 4], lead: 'bell',   feel: 'soft'    }, // Plush Forest
  { root: 50, scale: MAJOR, bpm: 116, prog: [0, 2, 3, 4], lead: 'pluck',  feel: 'bouncy'  }, // Marble Mountains
  { root: 57, scale: MAJOR, bpm: 126, prog: [0, 3, 0, 4], lead: 'bell',   feel: 'bouncy'  }, // Bath Time Lagoon
  { root: 52, scale: MAJOR, bpm: 128, prog: [0, 4, 3, 4], lead: 'square', feel: 'bouncy'  }, // Crayon Canyon
  { root: 57, scale: MINOR, bpm: 132, prog: [0, 6, 5, 6], lead: 'square', feel: 'march'   }, // Wind-up Wasteland
  { root: 58, scale: MAJOR, bpm: 124, prog: [0, 5, 1, 4], lead: 'bell',   feel: 'bouncy'  }, // Candy Kingdom
  { root: 50, scale: MINOR, bpm: 108, prog: [0, 3, 6, 4], lead: 'pluck',  feel: 'soft'    }, // Puzzle Peaks
  { root: 52, scale: MINOR, bpm: 90,  prog: [0, 5, 3, 4], lead: 'bell',   feel: 'spooky'  }, // Haunted Attic
  { root: 60, scale: MAJOR, bpm: 120, prog: [0, 1, 3, 4], lead: 'square', feel: 'soft'    }, // Space Playroom
  { root: 55, scale: MINOR, bpm: 138, prog: [0, 6, 5, 4], lead: 'square', feel: 'march'   }, // Dragon's Toy Hoard
];
const M = {
  running: false, timer: null, zone: 0, boss: false,
  nextTime: 0, step: 0, bar: 0, theme: THEMES[0], pendingZone: null,
  lastDeg: 7, // melody random-walk position in scale steps (7 = one octave up)
};
function scaleNote(theme, deg, baseOct = 0) {
  // deg may exceed scale length; wrap into octaves
  const n = theme.scale.length;
  const oct = Math.floor(deg / n), idx = ((deg % n) + n) % n;
  return theme.root + theme.scale[idx] + oct * 12 + baseOct * 12;
}
function chordTones(theme, chordDeg) { return [chordDeg, chordDeg + 2, chordDeg + 4]; }

function scheduleStep(t) {
  const th = M.theme;
  const boss = M.boss;
  const spb = 60 / (th.bpm * (boss ? 1.15 : 1)); // seconds per beat
  const s16 = spb / 4;
  const step = M.step % 16;          // 16th-note position within bar
  const beat = Math.floor(step / 4); // 0..3
  const chordDeg = th.prog[M.bar % th.prog.length];
  const tones = chordTones(th, chordDeg);
  const soft = th.feel === 'soft' || th.feel === 'spooky';

  // --- bass: beats 1 & 3 (and 2 & 4 for march / boss)
  if (step === 0 || step === 8 || ((th.feel === 'march' || boss) && (step === 4 || step === 12))) {
    const root = scaleNote(th, chordDeg, -2);
    pluck(musBus, midi(root), t, spb * 0.9, boss ? 0.28 : 0.22);
    if (boss) tone(musBus, midi(root - 12), t, spb * 0.5, 0.1, 'sawtooth');
  }
  // --- arpeggio accompaniment on off-8ths (music-box tinkle)
  if (step % 2 === 0 && step % 4 !== 0) {
    const idx = (step / 2) % 3;
    const n = scaleNote(th, tones[idx], -1);
    bell(musBus, midi(n + (th.feel === 'spooky' ? 0 : 12)), t, s16 * 3, soft ? 0.07 : 0.09);
  }
  // --- melody on 8ths, random walk with chord-tone bias on strong beats
  if (step % 2 === 0) {
    const strong = step % 4 === 0;
    let play = strong ? Math.random() < 0.85 : Math.random() < (soft ? 0.4 : 0.6);
    if (M.bar % 4 === 3 && step >= 12) play = strong; // breathe at phrase end
    if (play) {
      let deg;
      if (strong && Math.random() < 0.7) {
        // nearest chord tone (in the melody octave range 7..14)
        const cands = tones.map(d => { let x = d; while (x < 7) x += 7; while (x > 14) x -= 7; return x; });
        cands.sort((a, b) => Math.abs(a - M.lastDeg) - Math.abs(b - M.lastDeg));
        deg = cands[Math.random() < 0.6 ? 0 : Math.floor(Math.random() * cands.length)];
      } else {
        deg = M.lastDeg + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.7 ? 1 : 2);
        if (deg < 6) deg += 2; if (deg > 15) deg -= 2;
      }
      M.lastDeg = deg;
      const f = midi(scaleNote(th, deg, 0));
      const dur = strong ? spb * 0.9 : spb * 0.5;
      const vol = soft ? 0.14 : 0.17;
      if (th.lead === 'square') { tone(musBus, f, t, dur, vol * 0.55, 'square'); tone(musBus, f, t, dur, vol * 0.4, 'sine'); }
      else if (th.lead === 'pluck') pluck(musBus, f, t, dur, vol * 1.1);
      else bell(musBus, f, t, dur * 1.3, vol);
    }
  }
  // --- percussion (toy drums)
  const kick = step === 0 || step === 8 || (boss && (step === 4 || step === 12)) || (th.feel === 'bouncy' && step === 10);
  if (kick && th.feel !== 'spooky') tone(musBus, 130, t, 0.14, boss ? 0.3 : 0.2, 'sine', 40);
  if ((step === 4 || step === 12) && !soft) noise(musBus, t, 0.09, 0.09, 'bandpass', 1800, 1.2);           // clap
  if (step % 2 === 0 && th.feel !== 'soft') tone(musBus, step % 4 === 2 ? 2400 : 1900, t, 0.03, 0.05, 'sine'); // woodblock tick
  if (boss && step % 4 === 2) noise(musBus, t, 0.05, 0.08, 'highpass', 6000);                              // hat
  if (th.feel === 'spooky' && step === 14) noise(musBus, t, spb * 1.5, 0.05, 'bandpass', 500, 4, 900);      // creak

  // advance
  M.step++;
  if (M.step % 16 === 0) {
    M.bar++;
    if (M.pendingZone !== null && M.bar % 2 === 0) { M.zone = M.pendingZone; M.theme = THEMES[M.zone % THEMES.length]; M.pendingZone = null; M.lastDeg = 7; }
  }
  return s16;
}
function scheduler() {
  if (!M.running || !ctx) return;
  const ahead = document.hidden ? 1.6 : 0.25;
  let guard = 0;
  while (M.nextTime < ctx.currentTime + ahead && guard++ < 64) {
    if (M.nextTime < ctx.currentTime - 0.5) M.nextTime = ctx.currentTime + 0.05; // resync after a long stall
    const dur = scheduleStep(M.nextTime);
    M.nextTime += dur;
  }
}
function startMusic() {
  if (!ctx || M.running) return;
  M.running = true;
  M.nextTime = ctx.currentTime + 0.1;
  M.timer = setInterval(scheduler, 60);
}
function stopMusic() {
  M.running = false;
  if (M.timer) clearInterval(M.timer);
  M.timer = null;
}
function updateMusicState() {
  if (!ctx) return;
  if (!opts.muted && opts.music > 0 && unlocked) startMusic(); else stopMusic();
}

/* ------------------------------- API ------------------------------- */
const ToyAudio = {
  unlock() {
    if (unlocked) return true;
    if (!ensureCtx()) return false;
    if (ctx.state === 'suspended') ctx.resume();
    unlocked = true;
    updateMusicState();
    return true;
  },
  isUnlocked: () => unlocked,
  sfx,
  setZone(i) {
    if (M.zone === i && M.pendingZone === null) return;
    if (!M.running) { M.zone = i; M.theme = THEMES[i % THEMES.length]; M.pendingZone = null; }
    else M.pendingZone = i;
  },
  setBoss(b) { M.boss = !!b; },
  setOptions(o) {
    Object.assign(opts, o);
    applyVolumes();
    updateMusicState();
  },
  getOptions: () => ({ ...opts }),
  getState: () => ({ context: ctx ? ctx.state : 'none', musicRunning: M.running, zone: M.zone, boss: M.boss }),
};
window.ToyAudio = ToyAudio;

// unlock on first gesture anywhere
const unlockOnce = () => { ToyAudio.unlock(); document.dispatchEvent(new CustomEvent('toyaudio-unlocked')); document.removeEventListener('pointerdown', unlockOnce); document.removeEventListener('keydown', unlockOnce); };
document.addEventListener('pointerdown', unlockOnce);
document.addEventListener('keydown', unlockOnce);
document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx && ctx.state === 'suspended' && unlocked) ctx.resume(); });
})();
