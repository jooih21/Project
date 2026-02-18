export class SoundSystem {
  constructor(scene, settings) {
    this.scene = scene;
    this.settings = settings;
    this.ctx = null;
    this.sfxMaster = null;
    this.bgmMaster = null;
    this.bgmTimer = null;
  }

  ensureCtx() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    this.sfxMaster = this.ctx.createGain();
    this.sfxMaster.gain.value = this.settings?.sfxVolume ?? 0.6;

    this.bgmMaster = this.ctx.createGain();
    this.bgmMaster.gain.value = this.settings?.bgmVolume ?? 0.35;

    this.sfxMaster.connect(this.ctx.destination);
    this.bgmMaster.connect(this.ctx.destination);
  }

  beep(freq = 440, durationMs = 90, volume = 0.07, type = "triangle", channel = "sfx") {
    this.ensureCtx();
    if (!this.ctx || !this.sfxMaster || !this.bgmMaster) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(channel === "bgm" ? this.bgmMaster : this.sfxMaster);

    osc.start();
    osc.stop(this.ctx.currentTime + durationMs / 1000);
  }

  sweep(fromFreq, toFreq, durationMs = 120, volume = 0.06, type = "triangle") {
    this.ensureCtx();
    if (!this.ctx || !this.sfxMaster) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(fromFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, toFreq), this.ctx.currentTime + durationMs / 1000);

    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(this.sfxMaster);

    osc.start();
    osc.stop(this.ctx.currentTime + durationMs / 1000);
  }

  playHit() {
    this.beep(600, 120, 0.08, "square", "sfx");
  }

  playHitByMaterial(material = "default") {
    if (material === "fragile") {
      this.beep(980, 70, 0.06, "triangle", "sfx");
      this.beep(1320, 55, 0.045, "sine", "sfx");
      return;
    }
    if (material === "furniture") {
      this.beep(180, 120, 0.08, "square", "sfx");
      this.beep(240, 90, 0.05, "triangle", "sfx");
      return;
    }
    if (material === "plant") {
      this.beep(340, 90, 0.055, "triangle", "sfx");
      this.beep(520, 70, 0.04, "sine", "sfx");
      return;
    }
    if (material === "box") {
      this.beep(260, 100, 0.06, "square", "sfx");
      return;
    }
    this.playHit();
  }

  playCombo(combo) {
    this.beep(420 + combo * 20, 100, 0.09, "triangle", "sfx");
  }

  playDash() {
    this.sweep(320, 920, 120, 0.07, "sawtooth");
    this.beep(220, 80, 0.04, "square", "sfx");
  }

  playLand(speed = 0) {
    const power = Math.min(1, speed / 360);
    this.beep(180 + power * 70, 90 + power * 40, 0.05 + power * 0.03, "square", "sfx");
  }

  playRoomShift(roomId = "living") {
    const map = {
      living: 300,
      kitchen: 520,
      bedroom: 430,
      bathroom: 610,
      kids: 560
    };
    const base = map[roomId] ?? 360;
    this.beep(base, 90, 0.045, "sine", "sfx");
    this.beep(base * 1.25, 70, 0.03, "triangle", "sfx");
  }

  playStartBgm() {
    this.ensureCtx();
    if (!this.ctx || this.bgmTimer) return;

    const notes = [220, 262, 294, 330, 294, 262, 196, 196];
    let idx = 0;
    this.bgmTimer = window.setInterval(() => {
      this.beep(notes[idx % notes.length], 180, 0.08, "sine", "bgm");
      idx += 1;
    }, 220);
  }

  stopBgm() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}