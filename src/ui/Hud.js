export class Hud {
  constructor(scene) {
    this.scene = scene;

    this.panelBg = this.scene.add.rectangle(206, 116, 350, 210, 0x2a1e1a, 0.22)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1988)
      .setStrokeStyle(2, 0xffd9b8, 0.55);

    this.panelGlow = this.scene.add.rectangle(210, 120, 342, 202, 0xfff1de, 0.08)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1989);

    this.scoreText = this.createHudText(42, 18, "Score: 0");
    this.comboText = this.createHudText(42, 50, "Combo: x1.0");
    this.timeText = this.createHudText(42, 82, "Time: 60");
    this.superText = this.createHudText(42, 114, "Super Dash: 0");
    this.roomText = this.createHudText(42, 146, "Room: living");
    this.toast = this.createHudText(42, 182, "");
  }

  createHudText(x, y, text) {
    return this.scene.add
      .text(x, y, text, this.style())
      .setOrigin(0, 0)
      .setPadding(10, 3, 6, 3)
      .setScrollFactor(0)
      .setDepth(2000);
  }

  getDisplayObjects() {
    return [
      this.panelBg,
      this.panelGlow,
      this.scoreText,
      this.comboText,
      this.timeText,
      this.superText,
      this.roomText,
      this.toast
    ];
  }

  style() {
    return {
      fontFamily: "Trebuchet MS",
      fontSize: "20px",
      color: "#2d211c",
      stroke: "#fff5dc",
      strokeThickness: 4
    };
  }

  update({ score, comboMult, timeLeft, comboLeftMs, superDashCharges, roomId }) {
    this.scoreText.setText(`Score: ${score}`);
    this.comboText.setText(`Combo: x${comboMult.toFixed(1)} (${Math.ceil(comboLeftMs / 1000)}s)`);
    this.timeText.setText(`Time: ${Math.ceil(timeLeft)}`);
    this.superText.setText(`Super Dash: ${superDashCharges}`);
    this.roomText.setText(`Room: ${roomId}`);

    const pressure = Phaser.Math.Clamp(comboMult / 5, 0, 1);
    const bgAlpha = Phaser.Math.Linear(0.22, 0.36, pressure);
    const glowAlpha = Phaser.Math.Linear(0.08, 0.2, pressure);
    this.panelBg.setFillStyle(0x2a1e1a, bgAlpha);
    this.panelGlow.setFillStyle(0xfff1de, glowAlpha);

    if (comboMult >= 2.5) {
      this.comboText.setColor("#ff7d64");
    } else {
      this.comboText.setColor("#2d211c");
    }
  }

  showGain(msg) {
    this.toast.setText(msg);
    this.scene.tweens.killTweensOf(this.toast);
    this.toast.setAlpha(1);
    this.scene.tweens.add({ targets: this.toast, alpha: 0, duration: 700, delay: 350 });
  }
}
