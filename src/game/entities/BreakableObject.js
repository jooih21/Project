export class BreakableObject extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y, def) {
    super(scene, x, y, def.spriteKey);
    this.scene = scene;
    this.def = def;
    this.state = "upright";
    this.wobbleUntil = 0;
    this.lastChainAt = 0;

    this.tippedAt = 0;
    this.fadeDelayMs = 0;
    this.fadeDurationMs = 900;
    this.fadeStarted = false;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.textureVariants = this.getTextureVariants();
    this.baseTextureKey = this.textureVariants[Phaser.Math.Between(0, this.textureVariants.length - 1)];
    this.tippedTextureKey = this.getTippedTextureFor(this.baseTextureKey);
    this.setTexture(this.baseTextureKey);

    this.applyPhysicsProfile();
    this.setCollideWorldBounds(true);
    this.setDepth(100 + y);

    this.shadow = scene.add.image(x, y + 10, "shadow-soft");
    this.shadow.setScale(0.5, 0.28).setAlpha(0.2).setDepth(80 + y);

    this.crackOverlay = scene.add.image(x, y, this.getCrackOverlayKey());
    this.crackOverlay.setVisible(false).setAlpha(0.82).setDepth(160 + y);

    this.baseScale = Phaser.Math.FloatBetween(0.94, 1.06);
    this.roomAnimPhase = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.setScale(this.baseScale);

    this.isSpecial = false;
    this.specialMultiplier = 1;
    this.specialBadge = null;
  }

  getTextureVariants() {
    const tags = this.def.tags ?? [];
    const room = this.def.room ?? "living";

    if (tags.includes("fragile")) {
      if (room === "kitchen") return ["obj-plate", "obj-kettle", "obj-toaster", "obj-bottle", "obj-cup", "obj-vase"];
      if (room === "bathroom") return ["obj-shampoobottle", "obj-soapdispenser", "obj-toothmug", "obj-bottle", "obj-plate", "obj-cup"];
      if (room === "bedroom") return ["obj-vase", "obj-perfume", "obj-alarmclock", "obj-frame", "obj-bottle", "obj-cup"];
      if (room === "kids") return ["obj-rattle", "obj-storybook", "obj-cup", "obj-bottle", "obj-frame", "obj-plate"];
      return ["obj-cup", "obj-vase", "obj-bottle", "obj-frame"];
    }

    if (tags.includes("box")) {
      if (room === "living") return ["obj-speaker", "obj-controller", "obj-toybox", "obj-box", "obj-crate", "obj-book"];
      if (room === "bedroom") return ["obj-book", "obj-shoebox", "obj-box", "obj-toybox"];
      if (room === "bathroom") return ["obj-towelstack", "obj-shoebox", "obj-box", "obj-crate", "obj-book"];
      if (room === "kids") return ["obj-robottoy", "obj-storybook", "obj-toybox", "obj-book", "obj-box", "obj-shoebox"];
      return ["obj-crate", "obj-box", "obj-book", "obj-shoebox"];
    }

    if (tags.includes("plant")) {
      if (room === "kitchen") return ["obj-succulent", "obj-cactus", "obj-plant"];
      if (room === "bedroom") return ["obj-bouquet", "obj-cactus", "obj-plant"];
      if (room === "bathroom") return ["obj-succulent", "obj-plant", "obj-cactus"];
      if (room === "kids") return ["obj-bouquet", "obj-plant", "obj-succulent"];
      return ["obj-plant", "obj-succulent", "obj-bouquet"];
    }

    if (tags.includes("furniture")) {
      if (room === "bedroom") return ["obj-nightstand", "obj-desk", "obj-table-oak", "obj-table"];
      if (room === "living") return ["obj-lamp", "obj-tvstand", "obj-table", "obj-table-oak"];
      if (room === "bathroom") return ["obj-bathstool", "obj-nightstand", "obj-table", "obj-desk"];
      if (room === "kids") return ["obj-blocktower", "obj-nightstand", "obj-table", "obj-toybox"];
      return ["obj-table", "obj-table-oak", "obj-desk"];
    }

    return [this.def.spriteKey];
  }

  getCrackOverlayKey() {
    const tags = this.def.tags ?? [];
    if (tags.includes("furniture")) return "fx-crack-large";
    return "fx-crack-small";
  }

  getTippedTextureFor(baseTexture) {
    const key = `${baseTexture}-tipped`;
    if (this.scene.textures.exists(key)) return key;
    return baseTexture;
  }

  applyPhysicsProfile() {
    const tags = this.def.tags ?? [];
    const room = this.def.room ?? "living";

    let drag = 150;
    let bounce = 0.2;
    let mass = Math.max(0.5, this.def.mass);
    let maxSpeed = 260;

    if (tags.includes("fragile")) {
      drag = 75;
      bounce = 0.36;
      mass *= 0.85;
      maxSpeed = 300;
    } else if (tags.includes("box")) {
      drag = 220;
      bounce = 0.12;
      mass *= 1.05;
      maxSpeed = 220;
    } else if (tags.includes("plant")) {
      drag = 145;
      bounce = 0.24;
      mass *= 0.95;
      maxSpeed = 210;
    } else if (tags.includes("furniture")) {
      drag = 340;
      bounce = 0.06;
      mass *= 1.25;
      maxSpeed = 170;
    }

    if (room === "bathroom") {
      drag *= 0.78;
      bounce += 0.08;
      maxSpeed += 20;
    } else if (room === "kids") {
      drag *= 0.86;
      bounce += 0.05;
      mass *= 0.92;
      maxSpeed += 16;
    }

    this.setImmovable(false);
    this.setDrag(drag, drag);
    this.setBounce(bounce);
    this.setMass(mass);
    this.setMaxVelocity(maxSpeed, maxSpeed);
  }

  makeSpecial() {
    if (this.isSpecial) return;
    this.isSpecial = true;
    this.specialMultiplier = 2.0;

    this.specialBadge = this.scene.add.text(this.x, this.y - 24, "¡Ú", {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      color: "#ffcf4a",
      stroke: "#7c4e00",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(4000);

    this.scene.tweens.add({
      targets: this,
      scaleX: this.baseScale * 1.08,
      scaleY: this.baseScale * 1.08,
      duration: 340,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut"
    });
  }

  applyChaos(power, now) {
    if (this.state === "tipped" || this.state === "gone") return false;

    const crackThreshold = this.def.stability * 0.62;
    const tipThreshold = this.state === "cracked" ? this.def.stability * 0.72 : this.def.stability;

    this.wobbleUntil = now + 320;
    if (this.state !== "cracked") {
      this.state = "wobble";
      this.setTint(0xfff2b2);
    }

    if (power >= tipThreshold) {
      this.state = "tipped";
      this.clearTint();
      this.crackOverlay.setVisible(false);
      this.setTexture(this.tippedTextureKey);

      this.tippedAt = now;
      this.fadeDelayMs = Phaser.Math.Between(1000, 2000);
      this.fadeDurationMs = this.getFadeDurationMs();
      this.fadeStarted = false;
      this.setAlpha(1);

      const targetAngle = Phaser.Math.Between(-68, 68);
      this.scene.tweens.add({
        targets: this,
        angle: targetAngle,
        duration: 180,
        ease: "Back.Out"
      });

      this.setVelocity(this.body.velocity.x * 1.45, this.body.velocity.y * 1.45);
      this.scene.tweens.add({
        targets: this,
        scaleX: this.baseScale * 0.9,
        scaleY: this.baseScale * 0.9,
        duration: 120,
        yoyo: true
      });

      if (this.specialBadge) {
        this.specialBadge.setVisible(false);
      }
      return true;
    }

    if (power >= crackThreshold && this.state !== "cracked") {
      this.state = "cracked";
      this.setTint(0xffe7bf);
      this.crackOverlay.setVisible(true);
      this.scene.tweens.add({
        targets: this.crackOverlay,
        alpha: { from: 0.2, to: 0.9 },
        duration: 140,
        ease: "Sine.Out"
      });
    }

    return false;
  }

  getFadeDurationMs() {
    const tags = this.def.tags ?? [];
    if (tags.includes("fragile")) return 520;
    if (tags.includes("box") || tags.includes("plant")) return 760;
    if (tags.includes("furniture")) return 1250;
    return 900;
  }

  startFadeOut() {
    this.fadeStarted = true;

    this.scene.tweens.add({
      targets: [this, this.shadow],
      alpha: 0,
      duration: this.fadeDurationMs,
      ease: "Sine.InOut",
      onComplete: () => {
        this.state = "gone";
        this.setVisible(false);
        this.setActive(false);
        this.body.enable = false;
        this.shadow.setVisible(false);
        this.crackOverlay.setVisible(false);
      }
    });
  }

  update(now) {
    if (this.state === "gone") return;

    if (this.state === "wobble") {
      const wobblePower = Phaser.Math.Clamp((this.wobbleUntil - now) / 320, 0, 1);
      this.setAngle(Math.sin(now / 32) * 9 * wobblePower);
      if (now > this.wobbleUntil) {
        this.state = "upright";
        this.clearTint();
        this.setAngle(0);
      }
    }

    if (this.state === "cracked") {
      const wobble = Math.sin(now / 45) * 1.4;
      this.setAngle(wobble);
      this.crackOverlay.setVisible(true);
      this.crackOverlay.setPosition(this.x, this.y).setAngle(this.angle).setDepth(180 + this.y);
    }

    if (this.state === "upright" && this.body?.velocity?.length() < 12) {
      if (this.def.room === "kids") {
        this.setAngle(Math.sin(now / 95 + this.roomAnimPhase) * 1.8);
      } else if (this.def.room === "bathroom") {
        this.setAngle(Math.sin(now / 125 + this.roomAnimPhase) * 1.1);
      }
    }

    if (this.state === "tipped" && !this.fadeStarted && now >= this.tippedAt + this.fadeDelayMs) {
      this.startFadeOut();
    }

    if (this.specialBadge && this.state !== "tipped" && this.state !== "gone") {
      this.specialBadge.setPosition(this.x, this.y - 24);
      this.specialBadge.setDepth(220 + this.y);
    }

    const tippedRatio = this.state === "tipped" ? 1 : 0;
    this.shadow.setPosition(this.x, this.y + 10);
    this.shadow.setDepth(80 + this.y);
    this.shadow.setScale(0.5 + tippedRatio * 0.12, 0.28 + tippedRatio * 0.08);
    if (!this.fadeStarted) {
      this.shadow.setAlpha(0.2 - tippedRatio * 0.06);
    }

    if (this.state !== "cracked") {
      this.crackOverlay.setPosition(this.x, this.y).setAngle(this.angle).setDepth(180 + this.y);
    }

    this.setDepth(100 + this.y);
  }

  destroy(fromScene) {
    this.specialBadge?.destroy();
    this.shadow?.destroy();
    this.crackOverlay?.destroy();
    super.destroy(fromScene);
  }
}




