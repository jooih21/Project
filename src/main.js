import { BootScene } from "./game/scenes/BootScene.js";
import { MenuScene } from "./game/scenes/MenuScene.js";
import { PlayScene } from "./game/scenes/PlayScene.js";
import { ResultScene } from "./game/scenes/ResultScene.js";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: "#fff9ec",
  width: 1280,
  height: 720,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      fps: 120,
      debug: false
    }
  },
  scene: [BootScene, MenuScene, PlayScene, ResultScene]
});

window.__chaosKitty = game;
