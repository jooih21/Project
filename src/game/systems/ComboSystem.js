export class ComboSystem {
  constructor(comboWindowMs) {
    this.comboWindowMs = comboWindowMs;
    this.reset();
  }

  reset() {
    this.combo = 0;
    this.bestCombo = 0;
    this.lastHitAt = 0;
  }

  breakChain(timeNowMs) {
    this.combo = 0;
    this.lastHitAt = timeNowMs ?? 0;
  }

  register(timeNowMs) {
    if (timeNowMs - this.lastHitAt <= this.comboWindowMs) {
      this.combo += 1;
    } else {
      this.combo = 1;
    }
    this.lastHitAt = timeNowMs;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    return this.combo;
  }

  getMultiplier(timeNowMs) {
    if (timeNowMs - this.lastHitAt > this.comboWindowMs) {
      this.combo = 0;
      return 1;
    }
    return 1 + Math.min(4, this.combo * 0.2);
  }

  remainingMs(timeNowMs) {
    const left = this.comboWindowMs - (timeNowMs - this.lastHitAt);
    return Math.max(0, left);
  }
}
