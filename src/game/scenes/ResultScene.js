export class ResultScene extends Phaser.Scene {
  constructor() {
    super("Result");
  }

  init(data) {
    this.runResult = data?.runResult;
    this.completedMissions = data?.completedMissions ?? [];
    this.saveData = data?.saveData;
  }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0xfff5e4);

    this.add.text(640, 90, "Round Complete", {
      fontFamily: "Trebuchet MS",
      fontSize: "56px",
      color: "#3b2e2a"
    }).setOrigin(0.5);

    const lines = [
      `Score: ${this.runResult.totalScore}`,
      `Best Combo: ${this.runResult.bestCombo}`,
      `Objects Tipped: ${this.runResult.destroyedCount}`,
      `Stars Earned: ${this.runResult.starsEarned}`,
      `Total Stars: ${this.saveData.totalStars}`,
      `Best Score: ${this.saveData.bestScore}`
    ];

    this.add.text(640, 200, lines.join("\n"), {
      fontFamily: "Trebuchet MS",
      fontSize: "30px",
      align: "center",
      color: "#5f4a43",
      lineSpacing: 10
    }).setOrigin(0.5, 0);

    this.add.text(640, 500, `Missions Complete: ${this.completedMissions.length}`, {
      fontFamily: "Trebuchet MS",
      fontSize: "24px",
      color: "#2d6f3b"
    }).setOrigin(0.5);

    this.add.text(640, 570, "Press R to Replay or M for Menu", {
      fontFamily: "Trebuchet MS",
      fontSize: "24px",
      color: "#3b2e2a"
    }).setOrigin(0.5);

    this.onReplay = () => {
      this.scene.start("Play", { selectedCosmeticId: this.saveData.selectedCosmeticId, saveData: this.saveData });
    };
    this.onMenu = () => {
      this.scene.start("Menu");
    };

    this.input.keyboard.on("keydown-R", this.onReplay);
    this.input.keyboard.on("keydown-M", this.onMenu);

    this.events.once("shutdown", () => {
      this.input.keyboard.off("keydown-R", this.onReplay);
      this.input.keyboard.off("keydown-M", this.onMenu);
    });
  }
}
