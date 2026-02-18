export class Cat extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, config, inputSettings = {}) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.scene = scene;
    this.config = config;
    this.skinPrefix = texture;
    this.inputSettings = {
      actionPower: inputSettings.actionPower ?? 1.0
    };

    this.setCollideWorldBounds(true);
    this.body.setSize(50, 30);
    this.body.setOffset(11, 18);
    this.setDrag(780, 780);
    this.setMaxVelocity(config.baseMoveSpeed + config.dashForce + 480);

    this.cursors = scene.input.keyboard.addKeys({
      up: "W",
      down: "S",
      left: "A",
      right: "D"
    });

    this.pendingJump = false;
    this.pendingDash = false;

    this.lastDashAt = 0;
    this.lastJumpAt = 0;
    this.dashCooldownMs = 420;
    this.jumpCooldownMs = 240;

    const power = Phaser.Math.Clamp(this.inputSettings.actionPower, 0.8, 1.4);
    this.jumpForce = 260 * power;
    this.dashForce = this.config.dashForce * power;

    this.visualState = "idle";
    this.stateUntil = 0;
    this.dashActiveUntil = 0;
    this.dashImpactMultiplier = 1;
    this.dashMotionUntil = 0;
    this.dashMotionVx = 0;
    this.dashMotionVy = 0;
    this.lastMoveDirX = 1;
    this.lastMoveDirY = 0;
    this.lastDashGhostAt = 0;

    this.jumpStartAt = 0;
    this.jumpActiveUntil = 0;
    this.jumpDurationMs = 310;
    this.jumpHeight = 21;
    this.jumpImpactMultiplier = 1;
    this.landSquashUntil = 0;
    this.landSquashDurationMs = 150;

    this.baseDisplayOriginX = this.displayOriginX;
    this.baseDisplayOriginY = this.displayOriginY;
    this.baseScaleX = 1;
    this.baseScaleY = 1;

    this.shadow = scene.add.image(x, y + 18, "shadow-soft");
    this.shadow.setDepth(90 + y).setAlpha(0.3).setScale(0.78, 0.42);

    const tailKey = `${this.skinPrefix}-tail`;
    this.tail = scene.add.image(x - 20, y + 6, scene.textures.exists(tailKey) ? tailKey : "shadow-soft");
    this.tail.setDepth(98 + y).setScale(0.9, 0.9).setAlpha(0.96);

    this.wasAirborne = false;
    this.runToggle = false;
    this.runToggleAt = 0;
    this.currentPoseKey = "";
    this.usesExternalSheet = scene.textures.exists(`${this.skinPrefix}-sheet`);

    if (this.usesExternalSheet) {
      this.ensureSheetAnimations();
      this.setTexture(`${this.skinPrefix}-sheet`);
    }

    if (scene.input.mouse) {
      scene.input.mouse.disableContextMenu();
    }

    this.onPointerDown = (pointer) => {
      if (pointer.leftButtonDown()) {
        this.pendingJump = true;
      }
      if (pointer.rightButtonDown()) {
        this.pendingDash = true;
      }
    };

    scene.input.on("pointerdown", this.onPointerDown);

    scene.events.once("shutdown", () => {
      scene.input.off("pointerdown", this.onPointerDown);
      this.shadow?.destroy();
      this.tail?.destroy();
    });
  }


  ensureSheetAnimations() {
    const sheetKey = `${this.skinPrefix}-sheet`;
    if (!this.scene.textures.exists(sheetKey)) return;

    const createIfNeeded = (suffix, frames, frameRate, repeat = -1) => {
      const key = `${this.skinPrefix}-${suffix}-anim`;
      if (this.scene.anims.exists(key)) return;

      const max = this.scene.textures.get(sheetKey)?.frameTotal ?? 0;
      const safeFrames = frames.filter((f) => f < max);
      if (safeFrames.length === 0) return;

      this.scene.anims.create({
        key,
        frames: this.scene.anims.generateFrameNumbers(sheetKey, { frames: safeFrames }),
        frameRate,
        repeat
      });
    };

    createIfNeeded("idle", [0, 1, 2, 1], 8, -1);
    createIfNeeded("run", [4, 5, 6, 7], 12, -1);
    createIfNeeded("jump", [8, 9], 10, 0);
    createIfNeeded("land", [10, 11], 14, 0);
    createIfNeeded("dash", [12, 13, 14, 15], 18, -1);
  }
  setState(state, durationMs = 0, time = 0) {
    this.visualState = state;
    this.stateUntil = durationMs > 0 ? time + durationMs : 0;
  }

  applyRoomRule(roomId) {
    if (roomId === "kitchen") {
      this.setDrag(280, 280);
    } else if (roomId === "bathroom") {
      this.setDrag(210, 210);
    } else if (roomId === "kids") {
      this.setDrag(640, 640);
    } else if (roomId === "bedroom") {
      this.setDrag(920, 920);
    } else {
      this.setDrag(780, 780);
    }
  }

  isDashActive(time) {
    return time <= this.dashActiveUntil;
  }

  isAirborne(time) {
    return time <= this.jumpActiveUntil;
  }

  getDashImpactMultiplier(time) {
    return this.isDashActive(time) ? this.dashImpactMultiplier : 1;
  }

  getJumpImpactMultiplier(time) {
    return this.isAirborne(time) ? this.jumpImpactMultiplier : 1;
  }

  getJumpLift(time) {
    if (!this.isAirborne(time)) return 0;
    const p = Phaser.Math.Clamp((time - this.jumpStartAt) / this.jumpDurationMs, 0, 1);
    return Math.sin(p * Math.PI) * this.jumpHeight;
  }

  setPoseTexture(pose) {
    if (this.usesExternalSheet) {
      const animPose = pose === "run1" || pose === "run2" ? "run" : pose;
      const animKey = `${this.skinPrefix}-${animPose}-anim`;
      if (this.currentPoseKey === animKey && this.anims.currentAnim?.key === animKey) return;
      this.currentPoseKey = animKey;
      if (this.scene.anims.exists(animKey)) {
        this.play(animKey, true);
      }
      return;
    }

    const key = `${this.skinPrefix}-${pose}`;
    const useKey = this.scene.textures.exists(key) ? key : this.skinPrefix;
    if (this.currentPoseKey === useKey) return;
    this.currentPoseKey = useKey;
    this.setTexture(useKey);
  }

  spawnDashAfterimage(time) {
    if (time - this.lastDashGhostAt < 30) return;
    this.lastDashGhostAt = time;

    const ghost = this.scene.add.image(this.x, this.y, this.texture.key);
    ghost
      .setDepth(this.depth - 1)
      .setFlipX(this.flipX)
      .setAngle(this.angle)
      .setScale(this.scaleX * 0.97, this.scaleY * 0.97)
      .setAlpha(this.visualState === "superDash" ? 0.52 : 0.34)
      .setTint(this.visualState === "superDash" ? 0xffd36b : 0xffbe9c);

    if (this.scene.uiCamera) this.scene.uiCamera.ignore(ghost);

    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: ghost.scaleX * 0.88,
      scaleY: ghost.scaleY * 0.88,
      duration: 170,
      ease: "Sine.Out",
      onComplete: () => ghost.destroy()
    });
  }

  update(time) {
    const speed = this.config.baseMoveSpeed;
    let inputVx = 0;
    let inputVy = 0;

    if (this.cursors.left.isDown) inputVx -= speed;
    if (this.cursors.right.isDown) inputVx += speed;
    if (this.cursors.up.isDown) inputVy -= speed;
    if (this.cursors.down.isDown) inputVy += speed;

    const inputLen = Math.hypot(inputVx, inputVy);
    if (inputLen > 0.01) {
      this.lastMoveDirX = inputVx / inputLen;
      this.lastMoveDirY = inputVy / inputLen;
    }

    let vx = inputVx;
    let vy = inputVy;

    if (time <= this.dashMotionUntil) {
      vx = this.dashMotionVx;
      vy = this.dashMotionVy;
    }

    this.setVelocity(vx, vy);

    if (this.pendingDash && time - this.lastDashAt > this.dashCooldownMs) {
      this.pendingDash = false;

      let canSuperDash = false;
      if (typeof this.scene.consumeSuperDashCharge === "function") {
        canSuperDash = this.scene.consumeSuperDashCharge();
      }
      if (canSuperDash) {
        this.lastDashAt = time;

      let dx = this.lastMoveDirX;
      let dy = this.lastMoveDirY;
      const len = Math.hypot(dx, dy);
      if (len < 0.01) {
        dx = this.flipX ? -1 : 1;
        dy = 0;
      } else {
        dx /= len;
        dy /= len;
      }

      const dashMult = 2.4;
      const dashSpeedBoost = 2.35;
      this.dashMotionVx = dx * this.dashForce * dashSpeedBoost;
      this.dashMotionVy = dy * this.dashForce * dashSpeedBoost;
      this.dashMotionUntil = time + 260;

      this.setVelocity(
        this.dashMotionVx,
        this.dashMotionVy
      );

      this.dashActiveUntil = time + 420;
      this.dashImpactMultiplier = 3.6;

      if (typeof this.scene.onCatDashStart === "function") {
        this.scene.onCatDashStart(this, dashMult, time);
      }

      this.setState("superDash", 420, time);
      }
    } else if (this.pendingDash && time - this.lastDashAt <= this.dashCooldownMs) {
      this.pendingDash = false;
    }

    if (vx < 0) this.setFlipX(true);
    if (vx > 0) this.setFlipX(false);

    this.updateVisualState(time);
    this.applyJumpVisual(time);

    if (this.isDashActive(time) && this.visualState === "superDash") {
      this.spawnDashAfterimage(time);
    }

    const airborne = this.isAirborne(time);
    if (this.wasAirborne && !airborne) {
      this.landSquashUntil = time + this.landSquashDurationMs;
      if (typeof this.scene.onCatLand === "function") {
        this.scene.onCatLand(this);
      }
    }
    this.wasAirborne = airborne;

    const lift = this.getJumpLift(time);
    this.setDepth(100 + this.y + lift);

    this.shadow.setPosition(this.x, this.y + 18);
    this.shadow.setDepth(90 + this.y);

    this.updateTailVisual(time, lift);
  }

  updateVisualState(time) {
    const airborne = this.isAirborne(time);

    if (this.stateUntil > time && (this.visualState === "dash" || this.visualState === "superDash" || this.visualState === "pounce")) {
      if (this.visualState === "superDash") {
        const dir = this.flipX ? -1 : 1;
        this.setTint(0xffe074);
        this.baseScaleX = 1.34;
        this.baseScaleY = 0.7;
        this.setAngle(Math.sin(time / 34) * 24 * dir);
      } else if (this.visualState === "dash") {
        this.clearTint();
        this.baseScaleX = 1.04;
        this.baseScaleY = 0.96;
        this.setAngle(0);
      } else {
        this.setTint(0xffd4be);
        this.baseScaleX = 1.08;
        this.baseScaleY = 0.93;
        this.setAngle(0);
      }
    } else {
      const speed = this.body.velocity.length();
      if (speed > 12) {
        const bob = Math.sin(time / 85) * 0.035;
        this.clearTint();
        this.baseScaleX = 1 + bob;
        this.baseScaleY = 1 - bob;
        this.visualState = "run";
        this.setAngle(0);
      } else {
        const idleBreath = Math.sin(time / 190) * 0.018;
        this.clearTint();
        this.baseScaleX = 1 + idleBreath;
        this.baseScaleY = 1 - idleBreath;
        this.visualState = "idle";
        this.setAngle(0);
      }
    }

    let pose = "idle";
    if (airborne) {
      const progress = Phaser.Math.Clamp((time - this.jumpStartAt) / this.jumpDurationMs, 0, 1);
      pose = progress > 0.76 ? "land" : "jump";
    } else if (this.visualState === "run") {
      if (time - this.runToggleAt > 105) {
        this.runToggle = !this.runToggle;
        this.runToggleAt = time;
      }
      pose = this.runToggle ? "run1" : "run2";
    }
    this.setPoseTexture(pose);
  }

  updateTailVisual(time, lift) {
    const moving = this.body.velocity.length() > 12;
    const wagBase = moving ? 26 : 14;
    const wagFreq = moving ? 58 : 110;
    const wag = Math.sin(time / wagFreq) * wagBase;

    const tailOffsetX = this.flipX ? 22 : -22;
    const tailOffsetY = 8 - lift;

    this.tail.setPosition(this.x + tailOffsetX, this.y + tailOffsetY);
    this.tail.setFlipX(this.flipX);
    this.tail.setAngle(this.flipX ? 180 - wag : wag);
    this.tail.setDepth(this.depth - 2);

    const tailStretch = moving ? 1.03 : 0.96;
    this.tail.setScale(tailStretch, 0.95 - lift * 0.003);
  }

  applyJumpVisual(time) {
    const lift = this.getJumpLift(time);
    const liftRatio = lift / this.jumpHeight;

    const velocityLen = this.body.velocity.length();
    const moveStretch = Phaser.Math.Clamp(velocityLen / 420, 0, 1) * 0.08;

    let landT = 0;
    if (time < this.landSquashUntil) {
      landT = 1 - (this.landSquashUntil - time) / this.landSquashDurationMs;
      landT = Phaser.Math.Clamp(landT, 0, 1);
    }
    const landSquash = Math.sin(landT * Math.PI) * 0.14;

    this.setDisplayOrigin(this.baseDisplayOriginX, this.baseDisplayOriginY + lift);
    this.setScale(
      this.baseScaleX * (1 + liftRatio * 0.08 + moveStretch + landSquash),
      this.baseScaleY * (1 - liftRatio * 0.11 - moveStretch * 0.7 - landSquash * 0.85)
    );

    const shadowScaleX = Phaser.Math.Linear(0.78, 0.56, liftRatio) + landSquash * 0.2;
    const shadowScaleY = Phaser.Math.Linear(0.42, 0.28, liftRatio) - landSquash * 0.1;
    const shadowAlpha = Phaser.Math.Linear(0.3, 0.15, liftRatio);
    this.shadow.setScale(shadowScaleX, shadowScaleY).setAlpha(shadowAlpha);
  }

  consumeJumpAction(time) {
    if (!this.pendingJump) return false;
    this.pendingJump = false;

    if (time - this.lastJumpAt <= this.jumpCooldownMs) {
      return false;
    }
    this.lastJumpAt = time;

    const pointer = this.scene.input.activePointer;
    let dx = pointer.worldX - this.x;
    let dy = pointer.worldY - this.y;
    const len = Math.hypot(dx, dy);

    if (len < 0.01) {
      dx = this.flipX ? -1 : 1;
      dy = 0;
    } else {
      dx /= len;
      dy /= len;
    }

    this.setVelocity(
      this.body.velocity.x + dx * this.jumpForce,
      this.body.velocity.y + dy * this.jumpForce
    );

    this.jumpStartAt = time;
    this.jumpActiveUntil = time + this.jumpDurationMs;
    this.jumpImpactMultiplier = 1.7;

    this.setState("pounce", 170, time);

    this.scene.tweens.killTweensOf(this.shadow);
    this.scene.tweens.add({
      targets: this.shadow,
      alpha: 0.1,
      scaleX: 0.55,
      scaleY: 0.28,
      duration: 120,
      yoyo: true,
      ease: "Sine.Out"
    });

    return true;
  }
}










