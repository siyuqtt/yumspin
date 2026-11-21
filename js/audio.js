window.YumSpin = window.YumSpin || {};

(function (ns) {
/**
 * YumSpin Soft Acoustic Audio Engine (Pure Web Audio API, zero external assets)
 * Designed to sound warm, human, and organic — NOT electronic:
 * - Warm wooden room reverb (procedural damped ConvolverNode)
 * - Dynamic low-pass filter envelopes (soft bright attack -> mellow warm decay)
 * - Felt upright piano, nylon-string guitar, warm harp, pizzicato upright bass & soft brushes
 * - Subtle human timing & velocity variation so it breathes like live acoustic playing
 */

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Cozy acoustic themes per Guilt-o-Meter tier (+ Market Morning on Screen 1)
const THEMES = {
  pick: {
    name: 'Morning Guitar',
    emoji: '🌿',
    // C Major warm open voicings: Cmaj7 - Am7 - Fmaj7 - G6
    chords: [
      [48, 55, 60, 64, 71],
      [45, 52, 57, 60, 64],
      [41, 48, 53, 57, 64],
      [43, 50, 55, 59, 64],
    ],
    bass: [48, 45, 41, 43],
    melodies: [
      [76, null, null, 79, 81, null, 79, 76],
      [72, null, 76, null, 79, null, 76, 74],
      [74, null, 76, 79, null, 81, 79, null],
      [74, null, 72, null, 74, null, 72, null],
    ],
    harp: [72, 76, 79, 84, 79, 76, 74, 79],
    leadVoice: 'nylon',
    chordVoice: 'nylonStrum',
    swing: 0.03,
  },
  economy: {
    name: 'Zen Harp & Felt',
    emoji: '🧘',
    // G Major Pentatonic peaceful open voicings: Gmaj7 - Cadd9 - Em7 - D6
    chords: [
      [43, 50, 55, 59, 66],
      [48, 55, 60, 62, 67],
      [40, 47, 52, 55, 62],
      [38, 45, 50, 54, 59],
    ],
    bass: [43, 48, 40, 38],
    melodies: [
      [79, null, null, 81, 83, null, 79, null],
      [74, null, 76, null, 79, null, 81, null],
      [83, null, 81, null, 79, null, 76, null],
      [74, null, 76, 79, null, null, 74, null],
    ],
    harp: [79, 83, 86, 83, 81, 79, 76, 81],
    leadVoice: 'harp',
    chordVoice: 'feltPiano',
    swing: 0.0,
  },
  balanced: {
    name: 'Sunny Acoustic',
    emoji: '☀️',
    // C Major bright cozy cafe: Cmaj7 - Fmaj7 - Dm7 - G6
    chords: [
      [48, 55, 60, 64, 71],
      [41, 48, 53, 57, 64],
      [38, 45, 50, 53, 60],
      [43, 50, 55, 59, 64],
    ],
    bass: [48, 41, 38, 43],
    melodies: [
      [72, null, 76, 79, null, 81, 79, 76],
      [77, null, 76, null, 72, 74, 76, null],
      [74, null, 77, 81, null, 79, 77, null],
      [76, null, 74, 72, null, 76, 74, null],
    ],
    harp: [76, 79, 84, 79, 77, 81, 84, 79],
    leadVoice: 'nylon',
    chordVoice: 'feltPiano',
    swing: 0.04,
  },
  savory: {
    name: 'Honey Bossa',
    emoji: '🍯',
    // F Major warm acoustic bossa: Fmaj9 - Dm9 - Gm7 - C9
    chords: [
      [41, 48, 53, 57, 64, 67],
      [38, 45, 50, 53, 60, 64],
      [43, 50, 55, 58, 62],
      [48, 52, 55, 58, 62],
    ],
    bass: [41, 38, 43, 48],
    melodies: [
      [77, null, 81, 79, null, 77, 76, null],
      [72, null, 76, 77, 81, null, 79, null],
      [77, null, 79, 82, null, 81, 79, 77],
      [76, null, 79, null, 81, 79, 77, null],
    ],
    harp: [77, 81, 84, 86, 84, 81, 79, 81],
    leadVoice: 'feltPiano',
    chordVoice: 'nylonStrum',
    swing: 0.08,
  },
  deluxe: {
    name: 'Café Felt Jazz',
    emoji: '🧈',
    // Eb Major warm lounge jazz: Ebmaj9 - Cm9 - Fm9 - Bb13
    chords: [
      [39, 46, 51, 55, 62, 65],
      [36, 43, 48, 51, 58, 62],
      [41, 48, 53, 56, 63, 67],
      [46, 50, 53, 56, 60],
    ],
    bass: [39, 36, 41, 46],
    melodies: [
      [75, null, 79, 82, null, 84, 82, 79],
      [75, null, 77, 79, null, 82, 79, null],
      [80, null, 79, 77, 75, null, 79, null],
      [77, null, 79, 82, null, 79, 75, null],
    ],
    harp: [75, 79, 82, 86, 84, 82, 79, 82],
    leadVoice: 'feltPiano',
    chordVoice: 'feltPiano',
    swing: 0.13,
  },
};

const COMPLEXITY_ENSEMBLE = {
  1: 'Soft & Minimal',
  2: 'Acoustic Duo',
  3: 'Warm Trio',
  4: 'Cozy Quartet',
  5: 'Café Ensemble',
};

function getTempoForTime(timeMin, screen) {
  if (screen === 1) return 90;
  if (timeMin <= 10) return 108;
  if (timeMin <= 15) return 100;
  if (timeMin <= 20) return 92;
  if (timeMin <= 25) return 86;
  if (timeMin <= 30) return 80;
  if (timeMin <= 40) return 73;
  return 68;
}

class CozyAudioEngine {
  constructor() {
    this.ctx = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.softNoiseBuffer = null;

    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.unlocked = false;

    this.schedulerId = null;
    this.nextStepTime = 0;
    this.stepIndex = 0;

    this.lastSliderTickMs = 0;
    this.wasPlayingBeforeHide = false;

    this.mood = {
      screen: 1,
      tierId: 'balanced',
      complexity: 2,
      timeMin: 20,
    };

    try {
      const savedMusic = localStorage.getItem('yumspin_music');
      const savedSfx = localStorage.getItem('yumspin_sfx');
      if (savedMusic === '0') this.musicEnabled = false;
      if (savedSfx === '0') this.sfxEnabled = false;
    } catch (_) {}

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) {
        if (this.ctx.state === 'running') {
          this.wasPlayingBeforeHide = true;
          this.ctx.suspend().catch(() => {});
        }
      } else if (this.wasPlayingBeforeHide) {
        this.wasPlayingBeforeHide = false;
        this.ctx.resume().catch(() => {});
      }
    });
  }

  ensureContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    const ctx = new AudioCtx();
    this.ctx = ctx;

    // Warm acoustic room bus: cozy low-mid warmth + smooth roll-off (no digital harshness)
    const bodyWarmth = ctx.createBiquadFilter();
    bodyWarmth.type = 'lowshelf';
    bodyWarmth.frequency.value = 260;
    bodyWarmth.gain.value = 2.6;

    const softAir = ctx.createBiquadFilter();
    softAir.type = 'lowpass';
    softAir.frequency.value = 2650;
    softAir.Q.value = 0.5;

    // Gentle wooden room reverb
    const convolver = ctx.createConvolver();
    convolver.buffer = this.createWarmRoomImpulse(ctx, 1.35);

    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.72;

    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.34;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 22;
    comp.ratio.value = 2.6;
    comp.attack.value = 0.015;
    comp.release.value = 0.24;

    const master = ctx.createGain();
    master.gain.value = 0.9;

    const bgmGain = ctx.createGain();
    bgmGain.gain.value = this.musicEnabled ? 0.25 : 0.0;

    const sfxGain = ctx.createGain();
    sfxGain.gain.value = this.sfxEnabled ? 0.3 : 0.0;

    // Route BGM & SFX through warm room
    bgmGain.connect(bodyWarmth);
    sfxGain.connect(bodyWarmth);

    bodyWarmth.connect(softAir);
    softAir.connect(dryGain);
    softAir.connect(convolver);
    convolver.connect(wetGain);

    dryGain.connect(comp);
    wetGain.connect(comp);
    comp.connect(master);
    master.connect(ctx.destination);

    this.bgmGain = bgmGain;
    this.sfxGain = sfxGain;
    this.softNoiseBuffer = this.createPinkishNoiseBuffer(ctx);

    return ctx;
  }

  /**
   * Warm, dark acoustic room impulse response (sounds like wood & curtains, not metallic).
   */
  createWarmRoomImpulse(ctx, seconds) {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const impulse = ctx.createBuffer(2, length, rate);

    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const env = Math.pow(1 - t, 3.1);
        const white = Math.random() * 2 - 1;
        // One-pole low-pass inside impulse for warm wooden damping
        lp = lp * 0.84 + white * 0.16;
        data[i] = lp * env * 0.65;
      }
    }
    return impulse;
  }

  /**
   * Soft warm pink-filtered noise for realistic acoustic brush swishes & hammer felt.
   */
  createPinkishNoiseBuffer(ctx) {
    const length = Math.floor(ctx.sampleRate * 0.35);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.029;
      b1 = 0.985 * b1 + w * 0.032;
      b2 = 0.95 * b2 + w * 0.048;
      data[i] = (b0 + b1 + b2 + w * 0.08) * 1.4;
    }
    return buffer;
  }

  unlock() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (!this.unlocked) {
      this.unlocked = true;
      try {
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      } catch (_) {}

      if (this.musicEnabled) {
        this.startMusicLoop();
      }
    }
  }

  setMood({ screen, tierId, complexity, timeMin }) {
    if (screen !== undefined) this.mood.screen = screen;
    if (tierId !== undefined) this.mood.tierId = tierId;
    if (complexity !== undefined) this.mood.complexity = complexity;
    if (timeMin !== undefined) this.mood.timeMin = timeMin;
  }

  getMoodSummary() {
    const { screen, tierId, complexity, timeMin } = this.mood;
    const theme = screen === 1 ? THEMES.pick : (THEMES[tierId] || THEMES.balanced);
    const bpm = getTempoForTime(timeMin, screen);
    const ensemble = screen === 1 ? 'Soft Pluck' : (COMPLEXITY_ENSEMBLE[complexity] || 'Acoustic Duo');
    return {
      name: theme.name,
      emoji: theme.emoji,
      bpm,
      ensemble,
      playing: this.musicEnabled && this.unlocked,
      musicEnabled: this.musicEnabled,
      sfxEnabled: this.sfxEnabled,
    };
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    try {
      localStorage.setItem('yumspin_music', this.musicEnabled ? '1' : '0');
    } catch (_) {}

    const ctx = this.ensureContext();
    if (ctx && this.bgmGain) {
      const now = ctx.currentTime;
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.setTargetAtTime(this.musicEnabled ? 0.25 : 0.0, now, 0.12);
    }

    if (this.musicEnabled) {
      this.unlocked = true;
      this.startMusicLoop();
    } else {
      this.stopMusicLoop();
    }
    return this.musicEnabled;
  }

  toggleSfx() {
    this.sfxEnabled = !this.sfxEnabled;
    try {
      localStorage.setItem('yumspin_sfx', this.sfxEnabled ? '1' : '0');
    } catch (_) {}

    const ctx = this.ensureContext();
    if (ctx && this.sfxGain) {
      const now = ctx.currentTime;
      this.sfxGain.gain.cancelScheduledValues(now);
      this.sfxGain.gain.setTargetAtTime(this.sfxEnabled ? 0.3 : 0.0, now, 0.04);
    }
    if (this.sfxEnabled) {
      this.playPickerToggle(true);
    }
    return this.sfxEnabled;
  }

  /* ==================== SOFT ACOUSTIC INSTRUMENTS ==================== */

  /**
   * Soft Felt Upright Piano — warm pure tone, subtle hammer felt puff,
   * and decaying low-pass filter so notes bloom softly then melt into warmth.
   */
  playFeltPianoNote(freq, time, duration, volume, dest) {
    const ctx = this.ctx;
    if (!ctx || !dest) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    // Pure sine fundamental + ultra-gentle warm 2nd harmonic slightly detuned like real piano strings
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.001, time);
    g2.gain.setValueAtTime(0.11, time);
    g2.gain.exponentialRampToValueAtTime(0.008, time + Math.min(0.45, duration * 0.45));

    // Decaying low-pass envelope removes any "synth" buzz
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(1800, freq * 3.6), time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(360, freq * 1.4), time + Math.min(0.6, duration * 0.7));
    filter.Q.value = 0.4;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.022);
    gain.gain.exponentialRampToValueAtTime(volume * 0.38, time + duration * 0.48);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc1.connect(filter);
    osc2.connect(g2);
    g2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    // Subtle soft felt hammer thump
    if (this.softNoiseBuffer) {
      const felt = ctx.createBufferSource();
      felt.buffer = this.softNoiseBuffer;
      const feltFilter = ctx.createBiquadFilter();
      feltFilter.type = 'lowpass';
      feltFilter.frequency.setValueAtTime(520, time);
      const feltGain = ctx.createGain();
      feltGain.gain.setValueAtTime(0.0001, time);
      feltGain.gain.linearRampToValueAtTime(volume * 0.14, time + 0.006);
      feltGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.032);
      felt.connect(feltFilter);
      feltFilter.connect(feltGain);
      feltGain.connect(dest);
      felt.start(time);
      felt.stop(time + 0.04);
    }

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.04);
    osc2.stop(time + duration + 0.04);
  }

  /**
   * Warm Nylon-String Acoustic Guitar Pluck — soft woody body resonance,
   * finger-pluck transient, and rapid warm harmonic mellowing.
   */
  playNylonPluck(freq, time, duration, volume, dest) {
    const ctx = this.ctx;
    if (!ctx || !dest) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const body = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);
    // Tiny organic string pitch settle (3 cents) on pluck
    osc1.detune.setValueAtTime(6, time);
    osc1.detune.exponentialRampToValueAtTime(0.1, time + 0.06);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, time);
    g2.gain.setValueAtTime(0.22, time);
    g2.gain.exponentialRampToValueAtTime(0.01, time + 0.18);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(2100, freq * 4.2), time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(420, freq * 1.5), time + Math.min(0.4, duration * 0.55));
    filter.Q.value = 0.7;

    // Wooden guitar body warmth around 220Hz
    body.type = 'peaking';
    body.frequency.value = 220;
    body.Q.value = 1.2;
    body.gain.value = 3.0;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.014);
    gain.gain.exponentialRampToValueAtTime(volume * 0.35, time + duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc1.connect(filter);
    osc2.connect(g2);
    g2.connect(filter);
    filter.connect(body);
    body.connect(gain);
    gain.connect(dest);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.04);
    osc2.stop(time + duration + 0.04);
  }

  /**
   * Dreamy Wooden Harp — pure gentle sine bloom with soft octave halo.
   */
  playHarpPluck(freq, time, duration, volume, dest) {
    const ctx = this.ctx;
    if (!ctx || !dest) return;

    const osc = ctx.createOscillator();
    const halo = ctx.createOscillator();
    const haloGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    halo.type = 'sine';
    halo.frequency.setValueAtTime(freq * 2, time);
    haloGain.gain.setValueAtTime(0.1, time);
    haloGain.gain.exponentialRampToValueAtTime(0.001, time + Math.min(0.35, duration * 0.45));

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    halo.connect(haloGain);
    haloGain.connect(gain);
    gain.connect(dest);

    osc.start(time);
    halo.start(time);
    osc.stop(time + duration + 0.04);
    halo.stop(time + duration + 0.04);
  }

  /**
   * Play a voice by name ('feltPiano' | 'nylon' | 'harp').
   */
  playVoice(voice, freq, time, duration, volume, dest) {
    if (voice === 'nylon') {
      this.playNylonPluck(freq, time, duration, volume, dest);
    } else if (voice === 'harp') {
      this.playHarpPluck(freq, time, duration, volume, dest);
    } else {
      this.playFeltPianoNote(freq, time, duration, volume, dest);
    }
  }

  /**
   * Play a cozy human-strummed acoustic chord (felt piano roll or nylon guitar strum).
   */
  playAcousticChord(notes, time, duration, volume, dest, chordVoice = 'feltPiano') {
    const perNote = volume / Math.max(2.6, notes.length * 0.72);
    const strumGap = chordVoice === 'nylonStrum' ? 0.032 : 0.024;

    notes.forEach((midi, idx) => {
      const humanOffset = idx * strumGap + (Math.random() * 0.006);
      const vel = perNote * (0.88 + Math.random() * 0.2);
      if (chordVoice === 'nylonStrum') {
        this.playNylonPluck(midiToFreq(midi), time + humanOffset, duration, vel, dest);
      } else {
        this.playFeltPianoNote(midiToFreq(midi), time + humanOffset, duration, vel, dest);
      }
    });
  }

  /**
   * Soft Plucked Acoustic Upright Double Bass (pizzicato).
   */
  playUprightBass(midi, time, duration, volume, dest) {
    const ctx = this.ctx;
    if (!ctx || !dest) return;

    const freq = midiToFreq(midi);
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc.detune.setValueAtTime(8, time);
    osc.detune.exponentialRampToValueAtTime(0.1, time + 0.07);

    sub.type = 'sine';
    sub.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, time);
    filter.frequency.exponentialRampToValueAtTime(160, time + Math.min(0.45, duration * 0.6));

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.022);
    gain.gain.exponentialRampToValueAtTime(volume * 0.4, time + duration * 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(time);
    sub.start(time);
    osc.stop(time + duration + 0.04);
    sub.stop(time + duration + 0.04);
  }

  /**
   * Whisper-soft Jazz Brush Swish (warm bandpassed pink noise, zero harsh hiss).
   */
  playBrush(time, volume, dest, accent = false) {
    const ctx = this.ctx;
    if (!ctx || !dest || !this.softNoiseBuffer) return;

    const src = ctx.createBufferSource();
    src.buffer = this.softNoiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(accent ? 2100 : 1650, time);
    filter.Q.value = 0.9;

    const gain = ctx.createGain();
    const dur = accent ? 0.11 : 0.07;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    src.start(time);
    src.stop(time + dur + 0.02);
  }

  /**
   * Soft Acoustic Guitar-Body / Wooden Palm Tap (organic muffled percussive warmth).
   */
  playWoodTap(time, pitch, volume, dest) {
    const ctx = this.ctx;
    if (!ctx || !dest) return;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, time);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.58, time + 0.045);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.065);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.075);
  }

  /* ==================== ADAPTIVE COZY BGM SCHEDULER ==================== */

  startMusicLoop() {
    if (this.schedulerId || !this.musicEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.nextStepTime = ctx.currentTime + 0.1;
    this.schedulerId = window.setInterval(() => this.scheduleAhead(), 60);
  }

  stopMusicLoop() {
    if (this.schedulerId) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  scheduleAhead() {
    if (!this.ctx || !this.musicEnabled || this.ctx.state !== 'running') return;

    const lookAhead = 0.2;
    while (this.nextStepTime < this.ctx.currentTime + lookAhead) {
      this.scheduleStep(this.stepIndex, this.nextStepTime);

      const bpm = getTempoForTime(this.mood.timeMin, this.mood.screen);
      const eighthDur = 60 / bpm / 2;
      this.nextStepTime += eighthDur;
      this.stepIndex = (this.stepIndex + 1) % 32;
    }
  }

  scheduleStep(step, rawTime) {
    const { screen, tierId, complexity, timeMin } = this.mood;
    const theme = screen === 1 ? THEMES.pick : (THEMES[tierId] || THEMES.balanced);
    const bpm = getTempoForTime(timeMin, screen);
    const eighthDur = 60 / bpm / 2;

    const bar = Math.floor(step / 8);
    const beatInBar = step % 8;
    const effectiveComplexity = screen === 1 ? 2 : complexity;

    // Gentle human swing + subtle micro-timing feel (±6ms)
    const swingOffset = beatInBar % 2 === 1 ? eighthDur * theme.swing : 0;
    const humanJitter = (Math.random() - 0.5) * 0.012;
    const t = Math.max(this.ctx.currentTime + 0.005, rawTime + swingOffset + humanJitter);

    const chord = theme.chords[bar];
    const bassRoot = theme.bass[bar];
    const melodyRow = theme.melodies[bar];
    const dest = this.bgmGain;

    // Layer 1 (Complexity 1+): Warm strummed acoustic guitar or rolled felt piano chords
    if (beatInBar === 0) {
      const chordLen = eighthDur * (effectiveComplexity >= 3 ? 5.6 : 8.2);
      this.playAcousticChord(chord, t, chordLen, 0.34, dest, theme.chordVoice);
    } else if (beatInBar === 4 && effectiveComplexity >= 3) {
      // Soft mid-bar acoustic comping touch
      this.playAcousticChord(chord.slice(1, 4), t, eighthDur * 3.4, 0.15, dest, theme.chordVoice);
    } else if (beatInBar === 6 && effectiveComplexity >= 5 && (tierId === 'deluxe' || tierId === 'savory')) {
      // Gentle cafe bossa/jazz anticipation strum
      this.playAcousticChord(chord.slice(2), t, eighthDur * 2.0, 0.11, dest, theme.chordVoice);
    }

    // Layer 2 (Complexity 1 sparse / Complexity 2+ full): Soft acoustic melody
    const melodyNote = melodyRow[beatInBar];
    if (melodyNote !== null) {
      const playIt = effectiveComplexity >= 2 || beatInBar === 0 || beatInBar === 4;
      if (playIt) {
        const noteDur = eighthDur * (timeMin >= 30 ? 3.2 : 2.3);
        const humanVel = (effectiveComplexity === 1 ? 0.17 : 0.23) * (0.88 + Math.random() * 0.22);
        this.playVoice(theme.leadVoice, midiToFreq(melodyNote), t, noteDur, humanVel, dest);
      }
    }

    // Layer 3 (Complexity 3+): Soft pizzicato upright bass
    if (effectiveComplexity >= 3) {
      if (beatInBar === 0) {
        this.playUprightBass(bassRoot, t, eighthDur * 3.8, 0.3, dest);
      } else if (beatInBar === 4) {
        const bounce = bar % 2 === 1 ? bassRoot + 7 : bassRoot + 12;
        this.playUprightBass(bounce, t, eighthDur * 2.8, 0.2, dest);
      } else if (beatInBar === 6 && effectiveComplexity >= 5) {
        this.playUprightBass(bassRoot + 5, t, eighthDur * 1.8, 0.17, dest);
      }
    }

    // Layer 4 (Complexity 3+): Whisper-soft acoustic brushes & muted wooden palm tap
    if (effectiveComplexity >= 3) {
      if (beatInBar % 2 === 0) {
        this.playBrush(t, beatInBar === 4 ? 0.085 : 0.055, dest, beatInBar === 4);
      } else if (effectiveComplexity >= 4) {
        this.playBrush(t, 0.035, dest, false);
      }

      if (effectiveComplexity >= 4 && (beatInBar === 2 || beatInBar === 6)) {
        this.playWoodTap(t, beatInBar === 2 ? 320 : 390, 0.075, dest);
      }
    }

    // Layer 5 (Complexity 4+): Delicate dreamy harp counter-plucks
    if (effectiveComplexity >= 4) {
      const shouldPluck =
        effectiveComplexity === 5
          ? beatInBar === 2 || beatInBar === 5 || beatInBar === 7
          : beatInBar === 3 || beatInBar === 7;

      if (shouldPluck) {
        const harpNote = theme.harp[(step + bar) % theme.harp.length];
        this.playHarpPluck(
          midiToFreq(harpNote),
          t,
          eighthDur * 2.8,
          effectiveComplexity === 5 ? 0.12 : 0.085,
          dest
        );
      }
    }
  }

  /* ==================== SOFT ORGANIC SOUND EFFECTS (SFX) ==================== */

  canPlaySfx() {
    if (!this.sfxEnabled) return false;
    const ctx = this.ensureContext();
    return Boolean(ctx);
  }

  playSwipe(direction = 1) {
    if (!this.canPlaySfx()) return;
    const now = this.ctx.currentTime;
    const base = direction > 0 ? 64 : 67;
    const target = direction > 0 ? 71 : 64;
    this.playNylonPluck(midiToFreq(base), now, 0.22, 0.18, this.sfxGain);
    this.playHarpPluck(midiToFreq(target), now + 0.04, 0.26, 0.2, this.sfxGain);
    this.playBrush(now, 0.07, this.sfxGain, false);
  }

  playLock(isLocked) {
    if (!this.canPlaySfx()) return;
    const now = this.ctx.currentTime;
    if (isLocked) {
      this.playWoodTap(now, 420, 0.22, this.sfxGain);
      this.playWoodTap(now + 0.055, 620, 0.24, this.sfxGain);
    } else {
      this.playWoodTap(now, 580, 0.18, this.sfxGain);
      this.playWoodTap(now + 0.05, 380, 0.2, this.sfxGain);
    }
  }

  playPickerToggle(opening) {
    if (!this.canPlaySfx()) return;
    const now = this.ctx.currentTime;
    this.playHarpPluck(midiToFreq(opening ? 74 : 69), now, 0.22, 0.2, this.sfxGain);
  }

  playReshuffle() {
    if (!this.canPlaySfx()) return;
    const now = this.ctx.currentTime;
    const notes = [67, 72, 74, 76, 79, 84];
    notes.forEach((midi, i) => {
      const t = now + i * 0.052;
      this.playHarpPluck(midiToFreq(midi), t, 0.34, 0.2, this.sfxGain);
      if (i < 3) {
        this.playWoodTap(t, 360 + i * 70, 0.1, this.sfxGain);
      }
    });
  }

  playScreenSwitch(toCook) {
    if (!this.canPlaySfx()) return;
    const now = this.ctx.currentTime;
    const notes = toCook ? [67, 72, 76, 79] : [76, 72, 67];
    notes.forEach((midi, i) => {
      this.playHarpPluck(midiToFreq(midi), now + i * 0.055, 0.42, 0.2, this.sfxGain);
    });
  }

  playSliderTick(score) {
    if (!this.canPlaySfx()) return;
    const ms = performance.now();
    if (ms - this.lastSliderTickMs < 72) return;
    this.lastSliderTickMs = ms;

    const scale = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84];
    const idx = Math.min(scale.length - 1, Math.floor((score / 100) * scale.length));
    this.playHarpPluck(midiToFreq(scale[idx]), this.ctx.currentTime, 0.18, 0.15, this.sfxGain);
  }

  playStepper(delta, normalized = 0.5) {
    if (!this.canPlaySfx()) return;
    const now = this.ctx.currentTime;
    const baseMidi = Math.round(62 + normalized * 12);
    const secondMidi = delta > 0 ? baseMidi + 4 : baseMidi - 3;
    this.playNylonPluck(midiToFreq(baseMidi), now, 0.2, 0.17, this.sfxGain);
    this.playHarpPluck(midiToFreq(secondMidi), now + 0.045, 0.26, 0.19, this.sfxGain);
  }

  playAltStyle() {
    if (!this.canPlaySfx()) return;
    const now = this.ctx.currentTime;
    this.playNylonPluck(midiToFreq(72), now, 0.24, 0.18, this.sfxGain);
    this.playHarpPluck(midiToFreq(79), now + 0.06, 0.34, 0.21, this.sfxGain);
  }

  playStepCheck(done, allDone) {
    if (!this.canPlaySfx()) return;
    const now = this.ctx.currentTime;

    if (!done) {
      this.playNylonPluck(midiToFreq(62), now, 0.2, 0.15, this.sfxGain);
      return;
    }

    if (allDone) {
      // Soft joyful harp + felt piano bloom when the meal is ready!
      const fanfare = [67, 72, 76, 79, 83, 88];
      fanfare.forEach((midi, i) => {
        this.playHarpPluck(midiToFreq(midi), now + i * 0.072, 0.72, 0.23, this.sfxGain);
      });
      this.playAcousticChord([60, 64, 67, 71, 74], now + 0.14, 1.3, 0.26, this.sfxGain, 'feltPiano');
    } else {
      this.playWoodTap(now, 460, 0.14, this.sfxGain);
      this.playNylonPluck(midiToFreq(72), now + 0.02, 0.26, 0.18, this.sfxGain);
      this.playHarpPluck(midiToFreq(79), now + 0.075, 0.36, 0.2, this.sfxGain);
    }
  }
}

ns.audio = new CozyAudioEngine();
})(window.YumSpin);
