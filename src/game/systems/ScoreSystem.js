export class ScoreSystem {
  constructor(comboSystem) {
    this.comboSystem = comboSystem;
    this.totalScore = 0;
    this.destroyedCount = 0;
  }

  registerObjectChaos(baseScore, nowMs, bonusMultiplier = 1) {
    this.comboSystem.register(nowMs);
    const comboMultiplier = this.comboSystem.getMultiplier(nowMs);
    const gained = Math.round(baseScore * comboMultiplier * Math.max(0.1, bonusMultiplier));
    this.totalScore += gained;
    this.destroyedCount += 1;
    return { gained, multiplier: comboMultiplier, total: this.totalScore };
  }
}
