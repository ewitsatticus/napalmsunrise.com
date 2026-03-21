/**
 * cd-audio.js — Web Audio API dreamlike chord engine
 * Procedural audio: no audio files needed.
 */

/* Chord palette — frequencies in Hz */
const CHORDS = [
  /* Cmaj7:  C3   E3    G3    B3   */
  [130.81, 164.81, 196.00, 246.94],
  /* Dm9:   D3   F3    A3    C4    E4  */
  [146.83, 174.61, 220.00, 261.63, 329.63],
  /* Fmaj7: F3   A3    C4    E4   */
  [174.61, 220.00, 261.63, 329.63],
  /* Am7:   A2   C3    E3    G3   */
  [110.00, 130.81, 164.81, 196.00],
  /* Em9:   E3   G3    B3    D4    F#4 */
  [164.81, 196.00, 246.94, 293.66, 369.99],
  /* Gadd9: G2   B2    D3    A3   */
  [98.00, 123.47, 146.83, 220.00],
];

export class CDChordEngine {
  constructor(config) {
    this.enabled = config.enableAudio !== false;
    this.volume = (config.audioVolume || 40) / 100;
    this.ctx = null;
    this.masterGain = null;
    this.filterNode = null;
    this.convolverNode = null;
    this.dryGain = null;
    this.wetGain = null;
    this.chordIndex = 0;
    this.activeOscillators = [];
  }

  init() {
    if (this.ctx || !this.enabled) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      this.enabled = false;
      return;
    }

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    /* Master gain */
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume * 0.5;
    this.masterGain.connect(this.ctx.destination);

    /* Lowpass filter */
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 800;
    this.filterNode.Q.value = 1;

    /* Reverb (procedural impulse response) */
    this.convolverNode = this.ctx.createConvolver();
    this.convolverNode.buffer = this._createImpulseResponse(3, 2);

    /* Dry/wet routing */
    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 0.4;

    this.wetGain = this.ctx.createGain();
    this.wetGain.gain.value = 0.6;

    /* Signal chain */
    this.filterNode.connect(this.dryGain);
    this.filterNode.connect(this.convolverNode);
    this.convolverNode.connect(this.wetGain);
    this.dryGain.connect(this.masterGain);
    this.wetGain.connect(this.masterGain);
  }

  _createImpulseResponse(duration, decay) {
    const length = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }

    return buffer;
  }

  triggerChord() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const chord = CHORDS[this.chordIndex % CHORDS.length];
    this.chordIndex++;

    const now = this.ctx.currentTime;
    const attackTime = 0.05;
    const releaseTime = 4;

    chord.forEach((freq) => {
      /* Main sine oscillator */
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = freq;

      /* Slightly detuned for chorus effect */
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 1.002;

      /* Sub octave triangle for warmth */
      const sub = this.ctx.createOscillator();
      sub.type = 'triangle';
      sub.frequency.value = freq / 2;

      /* Individual gains */
      const g1 = this.ctx.createGain();
      const g2 = this.ctx.createGain();
      const gSub = this.ctx.createGain();

      const peakGain = 0.12;
      const subPeakGain = 0.04;

      /* Attack */
      g1.gain.setValueAtTime(0, now);
      g1.gain.linearRampToValueAtTime(peakGain, now + attackTime);
      g1.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);

      g2.gain.setValueAtTime(0, now);
      g2.gain.linearRampToValueAtTime(peakGain, now + attackTime);
      g2.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);

      gSub.gain.setValueAtTime(0, now);
      gSub.gain.linearRampToValueAtTime(subPeakGain, now + attackTime);
      gSub.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);

      /* Connect */
      osc1.connect(g1);
      osc2.connect(g2);
      sub.connect(gSub);

      g1.connect(this.filterNode);
      g2.connect(this.filterNode);
      gSub.connect(this.filterNode);

      /* Start and schedule stop */
      osc1.start(now);
      osc2.start(now);
      sub.start(now);

      const stopTime = now + releaseTime + 0.1;
      osc1.stop(stopTime);
      osc2.stop(stopTime);
      sub.stop(stopTime);

      this.activeOscillators.push(
        { osc: osc1, gain: g1 },
        { osc: osc2, gain: g2 },
        { osc: sub, gain: gSub }
      );
    });

    /* Cleanup stopped oscillators */
    setTimeout(() => {
      this.activeOscillators = this.activeOscillators.filter((o) => {
        try {
          o.osc.disconnect();
          o.gain.disconnect();
        } catch (_) { /* already disconnected */ }
        return false;
      });
    }, (releaseTime + 0.5) * 1000);
  }

  setFilterCutoff(normalized) {
    if (!this.filterNode) return;
    /* Map 0-1 to 200-2000 Hz */
    const freq = 200 + normalized * 1800;
    this.filterNode.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
  }

  setReverbMix(normalized) {
    if (!this.dryGain || !this.wetGain) return;
    this.dryGain.gain.setTargetAtTime(1 - normalized * 0.6, this.ctx.currentTime, 0.1);
    this.wetGain.gain.setTargetAtTime(0.3 + normalized * 0.7, this.ctx.currentTime, 0.1);
  }

  release() {
    /* Force faster fade on all active oscillators */
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.activeOscillators.forEach((o) => {
      try {
        o.gain.gain.cancelScheduledValues(now);
        o.gain.gain.setValueAtTime(o.gain.gain.value, now);
        o.gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      } catch (_) { /* ignore */ }
    });
  }
}
