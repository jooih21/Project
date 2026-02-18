import { SaveSystem } from "../systems/SaveSystem.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    this.save = SaveSystem.load();
    this.cosmetics = this.cache.json.get("cosmetics") ?? [];
    this.boundKeyboardHandlers = [];

    if (this.input.mouse) {
      this.input.mouse.disableContextMenu();
    }

    this.add.rectangle(640, 360, 1280, 720, 0xfef5dd).setDepth(-10);
    this.add.text(640, 85, "Chaos Kitty House", {
      fontFamily: "Trebuchet MS",
      fontSize: "52px",
      color: "#3b2e2a",
      stroke: "#fff5dc",
      strokeThickness: 8
    }).setOrigin(0.5);

    this.add.text(640, 145, "Knock over as many objects as possible in 1 minute.", {
      fontFamily: "Trebuchet MS",
      fontSize: "22px",
      color: "#5f4a43"
    }).setOrigin(0.5);

    this.bestText = this.add.text(640, 185, `Best Score: ${this.save.bestScore} | Stars: ${this.save.totalStars}`, {
      fontFamily: "Trebuchet MS",
      fontSize: "22px",
      color: "#5f4a43"
    }).setOrigin(0.5);

    this.index = Math.max(0, this.cosmetics.findIndex((x) => x.id === this.save.selectedCosmeticId));
    this.preview = this.add.image(640, 290, this.textureFromCosmetic(this.cosmetics[this.index]?.id)).setScale(3);

    this.nameText = this.add.text(640, 355, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "26px",
      color: "#3b2e2a"
    }).setOrigin(0.5);

    this.lockText = this.add.text(640, 388, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      color: "#a03838"
    }).setOrigin(0.5);

    this.settingDefs = [
      {
        id: "sfxVolume",
        label: "SFX Volume",
        min: 0,
        max: 1,
        step: 0.05,
        toText: (v) => `${Math.round(v * 100)}%`
      },
      {
        id: "bgmVolume",
        label: "BGM Volume",
        min: 0,
        max: 1,
        step: 0.05,
        toText: (v) => `${Math.round(v * 100)}%`
      },
      {
        id: "actionPower",
        label: "Jump/Dash Power",
        min: 0.8,
        max: 1.4,
        step: 0.05,
        toText: (v) => `${Math.round(v * 100)}%`
      }
    ];
    this.settingCursor = 0;

    this.settingTitle = this.add.text(640, 430, "Settings", {
      fontFamily: "Trebuchet MS",
      fontSize: "23px",
      color: "#3b2e2a"
    }).setOrigin(0.5);

    this.settingLines = [];
    for (let i = 0; i < this.settingDefs.length; i += 1) {
      const text = this.add.text(640, 460 + i * 28, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "20px",
        color: "#5f4a43"
      }).setOrigin(0.5);
      this.settingLines.push(text);
    }

    this.add.text(640, 575, "A/D: Costume | W/S or Up/Down: Select Setting | Left/Right: Adjust", {
      fontFamily: "Trebuchet MS",
      fontSize: "17px",
      color: "#5f4a43"
    }).setOrigin(0.5);

    this.add.text(640, 603, "In-Game: Move WASD | Left Click Jump | Right Click Dash", {
      fontFamily: "Trebuchet MS",
      fontSize: "16px",
      color: "#6b5851"
    }).setOrigin(0.5);

    this.add.text(640, 630, "Left Click to Start", {
      fontFamily: "Trebuchet MS",
      fontSize: "20px",
      color: "#3b2e2a"
    }).setOrigin(0.5);

    this.bindKey("keydown-A", () => this.move(-1));
    this.bindKey("keydown-D", () => this.move(1));
    this.bindKey("keydown-W", () => this.changeSettingCursor(-1));
    this.bindKey("keydown-S", () => this.changeSettingCursor(1));
    this.bindKey("keydown-UP", () => this.changeSettingCursor(-1));
    this.bindKey("keydown-DOWN", () => this.changeSettingCursor(1));
    this.bindKey("keydown-LEFT", () => this.changeSettingValue(-1));
    this.bindKey("keydown-RIGHT", () => this.changeSettingValue(1));

    this.onPointerDown = (pointer) => {
      if (pointer.leftButtonDown()) {
        this.startIfUnlocked();
      }
    };
    this.input.on("pointerdown", this.onPointerDown);

    this.events.once("shutdown", () => {
      for (const binding of this.boundKeyboardHandlers) {
        this.input.keyboard.off(binding.event, binding.handler);
      }
      this.boundKeyboardHandlers.length = 0;
      this.input.off("pointerdown", this.onPointerDown);
    });

    this.refreshCosmeticUi();
    this.refreshSettingsUi();
  }

  bindKey(event, handler) {
    this.input.keyboard.on(event, handler);
    this.boundKeyboardHandlers.push({ event, handler });
  }

  move(dir) {
    if (this.cosmetics.length === 0) return;
    this.index = Phaser.Math.Wrap(this.index + dir, 0, this.cosmetics.length);
    this.refreshCosmeticUi();
  }

  changeSettingCursor(dir) {
    this.settingCursor = Phaser.Math.Wrap(this.settingCursor + dir, 0, this.settingDefs.length);
    this.refreshSettingsUi();
  }

  changeSettingValue(dir) {
    const def = this.settingDefs[this.settingCursor];
    const key = def.id;

    const next = Phaser.Math.Clamp(
      Number((this.save.settings[key] + dir * def.step).toFixed(2)),
      def.min,
      def.max
    );
    this.save.settings[key] = next;

    SaveSystem.save(this.save);
    this.refreshSettingsUi();
  }

  refreshSettingsUi() {
    for (let i = 0; i < this.settingDefs.length; i += 1) {
      const def = this.settingDefs[i];
      const selected = i === this.settingCursor;
      const value = this.save.settings[def.id];

      this.settingLines[i]
        .setText(`${selected ? ">" : " "} ${def.label}: ${def.toText(value)}`)
        .setColor(selected ? "#2f7d46" : "#5f4a43");
    }
  }

  refreshCosmeticUi() {
    const c = this.cosmetics[this.index];
    const unlocked = this.save.unlockedCosmeticIds.includes(c.id);
    this.preview.setTexture(this.textureFromCosmetic(c.id));
    this.nameText.setText(`Costume: ${c.name}`);
    this.lockText.setText(unlocked ? "Unlocked" : `Locked (Need ${c.unlockStars} total stars)`);
    this.lockText.setColor(unlocked ? "#2f7d46" : "#a03838");
  }

  startIfUnlocked() {
    const c = this.cosmetics[this.index];
    if (!this.save.unlockedCosmeticIds.includes(c.id)) return;

    this.save.selectedCosmeticId = c.id;
    SaveSystem.save(this.save);
    this.scene.start("Play", { selectedCosmeticId: c.id, saveData: this.save });
  }

  textureFromCosmetic(id) {
    if (id === "sky") return "cat-sky";
    if (id === "mint") return "cat-mint";
    return "cat-orange";
  }
}

