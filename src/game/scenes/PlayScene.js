import { GAME_CONFIG } from "../config/gameConfig.js";
import { Cat } from "../entities/Cat.js";
import { ComboSystem } from "../systems/ComboSystem.js";
import { ScoreSystem } from "../systems/ScoreSystem.js";
import { MissionSystem } from "../systems/MissionSystem.js";
import { SpawnSystem } from "../systems/SpawnSystem.js";
import { SaveSystem } from "../systems/SaveSystem.js";
import { Hud } from "../../ui/Hud.js";
import { SoundSystem } from "../../audio/SoundSystem.js";

export class PlayScene extends Phaser.Scene {
  constructor() {
    super("Play");
  }

  init(data) {
    this.selectedCosmeticId = data?.selectedCosmeticId ?? "orange";
    this.saveData = data?.saveData ?? SaveSystem.load();
  }

  create() {
    this.worldW = 1760;
    this.worldH = 1080;
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.physics.world.OVERLAP_BIAS = 28;
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);

    this.drawMap();
    this.setupFixedGimmicks();
    this.setupRoomLighting();
    this.setupCinematicOverlay();
    this.soundFx = new SoundSystem(this, this.saveData.settings);
    this.soundFx.playStartBgm();

    this.events.once("shutdown", () => {
      this.soundFx?.stopBgm();
    });

    const catTexture = this.selectedCosmeticId === "sky" ? "cat-sky" : this.selectedCosmeticId === "mint" ? "cat-mint" : "cat-orange";
    this.cat = new Cat(this, 230, 220, catTexture, GAME_CONFIG, this.saveData.settings);

    this.cameras.main.startFollow(this.cat, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.05);

    this.comboSystem = new ComboSystem(GAME_CONFIG.comboWindowMs);
    this.scoreSystem = new ScoreSystem(this.comboSystem);
    this.missionSystem = new MissionSystem(this.cache.json.get("missions") ?? []);
    this.spawnSystem = new SpawnSystem(this);

    this.objects = this.spawnSystem.createObjects(
      this.cache.json.get("objects") ?? [],
      this.roomsById,
      GAME_CONFIG.maxDynamicObjects,
      this.doorZones
    );

    this.assignSpecialObjects();

    this.hud = new Hud(this);
    this.roundDurationSec = GAME_CONFIG.roundSeconds;
    this.setupRoundTimerDisplay();
    this.setupComboRushDisplay();
    this.setupHitFlashDisplay();
    this.setupRoomTraitDisplay();
    this.setupRoomAmbience();
    this.finished = false;

    this.moveHint = "W/A/S/D";
    this.lastDoorClearAt = 0;

    this.superDashCharges = 0;
    this.lastSuperTier = 0;

    this.currentRoomId = "living";
    this.lastRoomTraitId = "";
    this.lastGimmickTriggerAt = 0;

    this.kidsComboHits = [];
    this.nextKidsBonusAt = 0;

    this.setupOwnerEvent();

    this.tutorialStartAt = this.time.now;
    this.tutorialDurationMs = 20000;
    this.tutorialText = this.add.text(640, 96, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "24px",
      color: "#2d211c",
      stroke: "#fff5dc",
      strokeThickness: 6,
      align: "center"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2500);
    this.setupUiCamera();
    this.roundEndAt = this.time.now + this.roundDurationSec * 1000;

    for (const obj of this.objects) {
      this.physics.add.collider(this.cat, obj, () => {
        const speed = this.cat.body.velocity.length();
        if (speed > 180) {
          let impactPower = speed / 65;
          const now = this.time.now;
          if (this.cat.isDashActive(now)) {
            impactPower *= this.cat.getDashImpactMultiplier(now);
          }
          if (this.cat.isAirborne(now)) {
            impactPower *= this.cat.getJumpImpactMultiplier(now);
          }
          this.tryChaos(obj, impactPower);
        }
      });
    }

    this.physics.add.collider(this.objects, this.objects, this.onObjectCollision, undefined, this);
    this.physics.add.collider(this.cat, this.wallGroup);
    this.physics.add.collider(this.objects, this.wallGroup);
    this.physics.add.collider(this.ownerNpc, this.wallGroup);
    this.physics.add.collider(this.ownerNpc, this.objects);
    this.physics.add.overlap(this.ownerNpc, this.cat, this.onOwnerTouchCat, undefined, this);
  }

  setupUiCamera() {
    const hudObjects = [...this.hud.getDisplayObjects(), this.tutorialText, this.roundTimerBg, this.roundTimerText, this.comboRushText, this.hitFlashOverlay, this.vignetteOverlay, this.comboTintOverlay, this.impactPulseCircle, this.roomTraitBg, this.roomTraitText];
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height, false, "ui");
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setZoom(1);
    this.cameras.main.ignore(hudObjects);
    const worldObjects = this.children.list.filter((obj) => !hudObjects.includes(obj));
    this.uiCamera.ignore(worldObjects);
  }
  setupRoundTimerDisplay() {
    this.roundTimerBg = this.add.rectangle(640, 34, 200, 44, 0x2f241f, 0.6)
      .setScrollFactor(0)
      .setDepth(2480)
      .setStrokeStyle(3, 0xffe8bf, 0.95);
    this.roundTimerText = this.add.text(640, 34, "01:00", {
      fontFamily: "Trebuchet MS",
      fontSize: "32px",
      color: "#fff6e4",
      stroke: "#1f1713",
      strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2490);
  }
  updateRoundTimerDisplay(timeLeftSec) {
    const total = Math.max(0, Math.ceil(timeLeftSec));
    const mm = Math.floor(total / 60).toString().padStart(2, "0");
    const ss = (total % 60).toString().padStart(2, "0");
    this.roundTimerText.setText(`${mm}:${ss}`);
    if (total <= 10) {
      const pulse = 1 + Math.sin(this.time.now / 70) * 0.06;
      this.roundTimerText.setColor("#ffb0a8").setScale(pulse);
      this.roundTimerBg.setFillStyle(0x4a1e1b, 0.78);
    } else {
      this.roundTimerText.setColor("#fff6e4").setScale(1);
      this.roundTimerBg.setFillStyle(0x2f241f, 0.6);
    }
  }
  setupComboRushDisplay() {
    this.comboRushText = this.add.text(640, 228, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "66px",
      fontStyle: "bold",
      color: "#ff5e54",
      stroke: "#2a0f0d",
      strokeThickness: 10,
      shadow: {
        offsetX: 0,
        offsetY: 5,
        color: "#000000",
        blur: 6,
        stroke: false,
        fill: true
      }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2495).setAlpha(0);
  }
  showComboRush(comboCount, comboMult) {
    if (!this.comboRushText || comboCount < 2) return;
    const tiers = [
      { at: 2, name: "POUNCE CHAIN", color: "#ffb07f" },
      { at: 4, name: "CLAW STRING", color: "#ff996d" },
      { at: 6, name: "KITTY FRENZY", color: "#ff835b" },
      { at: 9, name: "SOFA STORM", color: "#ff6f4c" },
      { at: 12, name: "WILD RAMPAGE", color: "#ff5a41" },
      { at: 16, name: "PANIC MODE", color: "#f8483a" },
      { at: 21, name: "SCRATCH CYCLONE", color: "#ef3b34" },
      { at: 27, name: "CHAOS PARADE", color: "#e4322d" },
      { at: 34, name: "MELTDOWN", color: "#d52a27" },
      { at: 42, name: "CATACLYSM", color: "#c82424" },
      { at: 51, name: "APOCALYPURRSE", color: "#710f15" }
    ];

    let tierName = tiers[0].name;
    let color = tiers[0].color;
    for (const tier of tiers) {
      if (comboCount >= tier.at) {
        tierName = tier.name;
        color = tier.color;
      }
    }
    if (comboCount > 51) {
      const overLevel = Math.floor((comboCount - 51) / 8) + 1;
      tierName = `${tierName} +${overLevel}`;
    }

    this.comboRushText
      .setText(`${tierName} x${comboCount}  (${comboMult.toFixed(1)}x)`)
      .setColor(color)
      .setY(248)
      .setScale(0.8)
      .setAlpha(1);
    this.tweens.killTweensOf(this.comboRushText);
    this.tweens.add({
      targets: this.comboRushText,
      y: 206,
      scaleX: 1.03,
      scaleY: 1.03,
      alpha: 0,
      duration: 1180,
      ease: "Sine.Out"
    });

    this.pulseComboTint(comboCount);
  }
  setupCinematicOverlay() {
    this.vignetteOverlay = this.add.rectangle(640, 360, this.scale.width, this.scale.height, 0x1a0f0b, 0)
      .setScrollFactor(0)
      .setDepth(2468)
      .setVisible(true);

    this.comboTintOverlay = this.add.rectangle(640, 360, this.scale.width, this.scale.height, 0xff7d5f, 0)
      .setScrollFactor(0)
      .setDepth(2469)
      .setVisible(true);

    this.impactPulseCircle = this.add.circle(640, 360, 30, 0xffffff, 0)
      .setScrollFactor(0)
      .setDepth(2472)
      .setVisible(true);
  }

  updateCinematicOverlay(comboMult) {
    if (!this.vignetteOverlay) return;
    const target = Phaser.Math.Clamp(0.06 + comboMult * 0.01, 0.06, 0.22);
    const current = this.vignetteOverlay.alpha ?? 0;
    this.vignetteOverlay.setAlpha(Phaser.Math.Linear(current, target, 0.09));
  }

  pulseComboTint(comboCount) {
    if (!this.comboTintOverlay) return;
    const intensity = Phaser.Math.Clamp(0.08 + comboCount * 0.008, 0.08, 0.34);
    this.tweens.killTweensOf(this.comboTintOverlay);
    this.comboTintOverlay.setAlpha(intensity);
    this.tweens.add({
      targets: this.comboTintOverlay,
      alpha: 0,
      duration: 260,
      ease: "Quad.Out"
    });
  }

  triggerImpactPulse(worldX, worldY, strength = 1) {
    if (!this.impactPulseCircle) return;
    const sx = Phaser.Math.Clamp(worldX - this.cameras.main.scrollX, 40, this.scale.width - 40);
    const sy = Phaser.Math.Clamp(worldY - this.cameras.main.scrollY, 40, this.scale.height - 40);
    const radius = Phaser.Math.Linear(70, 180, Phaser.Math.Clamp(strength, 0, 1));
    const alpha = Phaser.Math.Linear(0.08, 0.22, Phaser.Math.Clamp(strength, 0, 1));

    this.tweens.killTweensOf(this.impactPulseCircle);
    this.impactPulseCircle.setPosition(sx, sy).setRadius(30).setFillStyle(0xfff4d0, alpha);
    this.tweens.add({
      targets: this.impactPulseCircle,
      radius,
      alpha: 0,
      duration: 220,
      ease: "Quad.Out"
    });
  }
  setupHitFlashDisplay() {
    this.hitFlashOverlay = this.add.rectangle(640, 360, this.scale.width, this.scale.height, 0xff3b30)
      .setScrollFactor(0)
      .setDepth(2470)
      .setAlpha(0)
      .setVisible(false);
  }
  triggerOwnerHitEffect() {
    this.cameras.main.shake(170, 0.007);
    if (!this.hitFlashOverlay) return;
    this.tweens.killTweensOf(this.hitFlashOverlay);
    this.hitFlashOverlay.setVisible(true).setAlpha(0);
    this.tweens.add({
      targets: this.hitFlashOverlay,
      alpha: 0.24,
      duration: 70,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.hitFlashOverlay.setAlpha(0).setVisible(false);
      }
    });
  }
  setupOwnerEvent() {
    this.ownerNpc = this.physics.add.image(0, 0, "owner");
    this.ownerNpc.setDepth(2100);
    this.ownerNpc.setScale(1.55);
    this.ownerNpc.body.setSize(54, 54, true);
    this.ownerNpc.setVisible(false);
    this.ownerNpc.setActive(false);
    this.ownerNpc.body.enable = false;
    this.ownerNpc.setDrag(300, 300);
    this.ownerNpc.setMaxVelocity(220, 220);

    this.ownerActive = false;
    this.ownerEndAt = 0;
    this.ownerTouchCooldownUntil = 0;
    this.nextOwnerEventAt = this.time.now + Phaser.Math.Between(22000, 30000);
  }

  startOwnerEvent(now) {
    const roomIds = Object.keys(this.roomsById);
    const roomId = roomIds[Phaser.Math.Between(0, roomIds.length - 1)] ?? "living";
    const room = this.roomsById[roomId];

    this.ownerActive = true;
    this.ownerEndAt = now + 9000;
    this.ownerNpc.setPosition(room.x + room.w * 0.5, room.y + 40);
    this.ownerNpc.setVisible(true);
    this.ownerNpc.setActive(true);
    this.ownerNpc.body.enable = true;

    this.hud.showGain("Owner is coming! Keep causing chaos!");
  }

  stopOwnerEvent(now) {
    this.ownerActive = false;
    this.ownerNpc.setVelocity(0, 0);
    this.ownerNpc.setVisible(false);
    this.ownerNpc.setActive(false);
    this.ownerNpc.body.enable = false;
    this.nextOwnerEventAt = now + Phaser.Math.Between(22000, 32000);
  }

  updateOwnerNpc(now) {
    if (!this.ownerActive) {
      if (now >= this.nextOwnerEventAt) {
        this.startOwnerEvent(now);
      }
      return;
    }

    if (now >= this.ownerEndAt) {
      this.stopOwnerEvent(now);
      return;
    }

    const dx = this.cat.x - this.ownerNpc.x;
    const dy = this.cat.y - this.ownerNpc.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = 135;
    this.ownerNpc.setVelocity((dx / len) * speed, (dy / len) * speed);
    this.ownerNpc.setDepth(100 + this.ownerNpc.y);
  }

  onOwnerTouchCat() {
    const now = this.time.now;
    if (now < this.ownerTouchCooldownUntil) return;
    this.ownerTouchCooldownUntil = now + 1200;

    const dx = this.cat.x - this.ownerNpc.x;
    const dy = this.cat.y - this.ownerNpc.y;
    const len = Math.hypot(dx, dy) || 1;
    this.cat.setVelocity(this.cat.body.velocity.x + (dx / len) * 220, this.cat.body.velocity.y + (dy / len) * 220);

    this.comboSystem.breakChain(now);
    this.superDashCharges = 0;
    this.lastSuperTier = 0;

    this.triggerOwnerHitEffect();
    this.hud.showGain("Caught by owner! Combo broken!");
  }

  onObjectCollision(objA, objB) {
    const a = objA;
    const b = objB;
    if (!a?.body || !b?.body) return;

    const rvx = a.body.velocity.x - b.body.velocity.x;
    const rvy = a.body.velocity.y - b.body.velocity.y;
    const relativeSpeed = Math.hypot(rvx, rvy);
    if (relativeSpeed < 135) return;

    const now = this.time.now;

    const tryChain = (source, target) => {
      if (source.state !== "tipped") return;
      if (target.state === "tipped") return;
      if (now - target.lastChainAt < 160) return;

      target.lastChainAt = now;
      const power = Math.min(8, relativeSpeed / 95);
      this.tryChaos(target, power);
    };

    tryChain(a, b);
    tryChain(b, a);
  }
  onCatLand(cat) {
    const speed = cat.body.velocity.length();
    const dustCount = speed > 170 ? 8 : 5;

    const dust = this.add.particles(cat.x, cat.y + 16, "shadow-soft", {
      speed: { min: 12, max: 46 },
      scale: { start: 0.26, end: 0.02 },
      lifespan: 180,
      quantity: dustCount,
      alpha: { start: 0.22, end: 0 }
    });
    if (this.uiCamera) this.uiCamera.ignore(dust);
    this.time.delayedCall(180, () => dust.destroy());

    this.cameras.main.shake(45, 0.0022);
  }
  onCatDashStart(cat, dashMult) {
    const radius = 190;
    const shockPower = 7.2;

    const blast = (powerScale = 1) => {
      for (const obj of this.objects) {
        if (!obj?.body || obj.state === "tipped" || obj.state === "gone") continue;

        const d = Phaser.Math.Distance.Between(cat.x, cat.y, obj.x, obj.y);
        if (d > radius * powerScale) continue;

        let dx = obj.x - cat.x;
        let dy = obj.y - cat.y;
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;

        const push = 260 * dashMult * powerScale;
        obj.setVelocity(obj.body.velocity.x + dx * push, obj.body.velocity.y + dy * push);

        const roomBonus = this.getRoomChaosPowerBonus(this.currentRoomId);
        this.tryChaos(obj, shockPower * roomBonus * powerScale);
      }
    };

    blast(1);

    this.time.delayedCall(80, () => {
      if (this.finished) return;
      blast(0.78);
    });

    const ring = this.add.circle(cat.x, cat.y, 34, 0xffd36b, 0.22).setDepth(2400);
    const ring2 = this.add.circle(cat.x, cat.y, 20, 0xff8d52, 0.2).setDepth(2399);
    if (this.uiCamera) this.uiCamera.ignore([ring, ring2]);
    this.tweens.add({
      targets: ring,
      radius: 190,
      alpha: 0,
      duration: 210,
      ease: "Quad.Out",
      onComplete: () => ring.destroy()
    });
    this.tweens.add({
      targets: ring2,
      radius: 220,
      alpha: 0,
      duration: 260,
      ease: "Sine.Out",
      onComplete: () => ring2.destroy()
    });

    this.triggerImpactPulse(cat.x, cat.y, 1);
    this.cameras.main.shake(170, 0.0082);
  }
  assignSpecialObjects() {
    const candidates = [...this.objects].filter((o) => o.state === "upright");
    Phaser.Utils.Array.Shuffle(candidates);

    const count = Math.min(6, Math.max(3, Math.floor(this.objects.length * 0.12)));
    for (let i = 0; i < count; i += 1) {
      const obj = candidates[i];
      if (obj) obj.makeSpecial();
    }
  }

  consumeSuperDashCharge() {
    if (this.superDashCharges <= 0) return false;
    this.superDashCharges -= 1;
    this.hud?.showGain("SUPER DASH!");
    return true;
  }

  getRoomIdFor(x, y) {
    for (const [id, room] of Object.entries(this.roomsById)) {
      if (x >= room.x && x <= room.x + room.w && y >= room.y && y <= room.y + room.h) {
        return id;
      }
    }
    return "living";
  }

  getRoomScoreBonus(roomId) {
    if (roomId === "living") return 1.1;
    if (roomId === "bathroom") return 1.18;
    if (roomId === "kids") return 1.05;
    if (roomId === "bedroom") return 0.95;
    return 1;
  }

  getObjectRoomScoreBonus(obj) {
    const room = obj?.def?.room ?? this.currentRoomId;
    const tags = obj?.def?.tags ?? [];

    let bonus = 1;
    if (room === "kitchen" && tags.includes("fragile")) bonus += 0.16;
    if (room === "bathroom" && tags.includes("fragile")) bonus += 0.18;
    if (room === "living" && tags.includes("furniture")) bonus += 0.2;
    if (room === "bedroom" && tags.includes("plant")) bonus += 0.14;
    if (room === "kids" && tags.includes("box")) bonus += 0.12;
    if (tags.includes("box")) bonus -= 0.05;

    return Phaser.Math.Clamp(bonus, 0.8, 1.35);
  }

  getRoomChaosPowerBonus(roomId) {
    if (roomId === "kitchen") return 1.08;
    if (roomId === "bathroom") return 1.15;
    if (roomId === "kids") return 1.12;
    if (roomId === "bedroom") return 0.9;
    return 1;
  }

  setupRoomTraitDisplay() {
    this.roomTraitBg = this.add.rectangle(640, 692, 1220, 44, 0x1f1815, 0.76)
      .setScrollFactor(0)
      .setDepth(2488)
      .setStrokeStyle(2, 0xffe8bf, 0.9);
    this.roomTraitText = this.add.text(640, 692, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "19px",
      color: "#fff8eb",
      stroke: "#2a1d17",
      strokeThickness: 5,
      align: "center"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2489);
  }

  showRoomTrait(roomId) {
    if (!this.roomTraitBg || !this.roomTraitText) return;
    const traitByRoom = {
      living: { text: "LIVING: Stable baseline | Furniture bonus +20%", color: "#ffe3b0", stroke: 0x9b6a3f },
      kitchen: { text: "KITCHEN: HOT ZONE + Fragile bonus | splash chain", color: "#d5f1ff", stroke: 0x4f7fa1 },
      bedroom: { text: "BEDROOM: Heavy crash bonus | soft movement", color: "#ffd9ef", stroke: 0x9a5b82 },
      bathroom: { text: "BATHROOM: SLIP ZONE | sliding chaos and rebounds", color: "#d9f7ff", stroke: 0x4c94ae },
      kids: { text: "KIDS: TRAMPOLINE ZONE | Toy Stampede burst", color: "#ffe0f6", stroke: 0xa65489 }
    };
    const trait = traitByRoom[roomId] ?? traitByRoom.living;

    this.roomTraitBg
      .setFillStyle(0x1f1815, 0.76)
      .setStrokeStyle(2, trait.stroke, 0.95);
    this.roomTraitText
      .setText(trait.text)
      .setColor(trait.color)
      .setAlpha(1);
  }
  setupFixedGimmicks() {
    this.fixedGimmicks = {
      kitchenHot: [
        { x: 980, y: 180, w: 220, h: 90 },
        { x: 1340, y: 180, w: 220, h: 90 }
      ],
      bathroomSlip: [
        { x: 170, y: 700, w: 190, h: 80 },
        { x: 420, y: 770, w: 170, h: 70 },
        { x: 250, y: 875, w: 230, h: 80 }
      ],
      kidsBounce: [
        { x: 980, y: 810, w: 170, h: 90 },
        { x: 1320, y: 880, w: 180, h: 85 }
      ]
    };

    const drawZone = (z, color, alpha, depth) => {
      this.add.rectangle(z.x + z.w / 2, z.y + z.h / 2, z.w, z.h, color).setAlpha(alpha).setDepth(depth);
      this.add.rectangle(z.x + z.w / 2, z.y + z.h / 2, z.w, z.h)
        .setStrokeStyle(2, color, Math.min(alpha + 0.25, 0.8))
        .setDepth(depth + 1);
    };

    const drawMarker = (z, label, fg, bg, depth, kind) => {
      const mx = z.x + z.w / 2;
      const my = z.y + 14;
      const pill = this.add.rectangle(mx, my, 92, 22, bg, 0.84)
        .setDepth(depth)
        .setStrokeStyle(2, fg, 0.95);
      const text = this.add.text(mx + 10, my, label, {
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        color: fg,
        stroke: "#201613",
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(depth + 2);

      const iconX = mx - 27;
      const iconY = my;
      let iconParts = [];

      if (kind === "hot") {
        const flameOuter = this.add.triangle(iconX, iconY + 1, 0, 8, 5, -7, 10, 8, 0xffbb73, 1).setDepth(depth + 1);
        const flameInner = this.add.triangle(iconX, iconY + 1, 3, 7, 5, -2, 7, 7, 0xffe2a5, 1).setDepth(depth + 2);
        iconParts = [flameOuter, flameInner];
      } else if (kind === "slip") {
        const drop = this.add.ellipse(iconX, iconY + 1, 9, 12, 0xcff6ff, 1).setDepth(depth + 1);
        const tip = this.add.triangle(iconX, iconY - 5, 0, 4, 3, -3, 6, 4, 0xcff6ff, 1).setDepth(depth + 1);
        iconParts = [drop, tip];
      } else if (kind === "bounce") {
        const coil1 = this.add.rectangle(iconX, iconY + 3, 10, 2, 0xffd8ef, 1).setDepth(depth + 1);
        const coil2 = this.add.rectangle(iconX, iconY, 10, 2, 0xffd8ef, 1).setDepth(depth + 1);
        const coil3 = this.add.rectangle(iconX, iconY - 3, 10, 2, 0xffd8ef, 1).setDepth(depth + 1);
        const cap = this.add.rectangle(iconX, iconY - 7, 8, 2, 0xfff0f8, 1).setDepth(depth + 2);
        iconParts = [coil1, coil2, coil3, cap];
      }

      this.tweens.add({
        targets: [pill, text, ...iconParts],
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 680,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut"
      });
    };

    for (const z of this.fixedGimmicks.kitchenHot) {
      drawZone(z, 0xffb67a, 0.2, -1432);
      drawMarker(z, "HOT", "#ffd39d", 0x6e2f1e, -1429, "hot");
    }

    for (const z of this.fixedGimmicks.bathroomSlip) {
      drawZone(z, 0xa9e9ff, 0.22, -1432);
      drawMarker(z, "SLIP", "#d7f6ff", 0x1f5168, -1429, "slip");
    }

    for (const z of this.fixedGimmicks.kidsBounce) {
      drawZone(z, 0xffb8e9, 0.2, -1432);
      drawMarker(z, "BOUNCE", "#ffd6f1", 0x6f2d62, -1429, "bounce");
    }
  }
  isInZone(x, y, zone) {
    return x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h;
  }

  applyFixedGimmicks(now) {
    const x = this.cat.x;
    const y = this.cat.y;

    if (this.currentRoomId === "kitchen") {
      const inHot = this.fixedGimmicks.kitchenHot.some((z) => this.isInZone(x, y, z));
      if (inHot && now - this.lastGimmickTriggerAt > 900) {
        this.lastGimmickTriggerAt = now;
        this.cat.setVelocity(this.cat.body.velocity.x * 0.72, this.cat.body.velocity.y * 0.72);
        this.hud.showGain("HOT FLOOR! Speed dampened");
        this.cameras.main.shake(55, 0.0028);
      }
    }

    if (this.currentRoomId === "bathroom") {
      const inSlip = this.fixedGimmicks.bathroomSlip.some((z) => this.isInZone(x, y, z));
      if (inSlip) {
        const vx = this.cat.body.velocity.x;
        const vy = this.cat.body.velocity.y;
        this.cat.setVelocity(vx * 1.06 + Math.sign(vx || 1) * 8, vy * 1.06 + Math.sign(vy || 1) * 8);
      }
    }

    if (this.currentRoomId === "kids") {
      const inBounce = this.fixedGimmicks.kidsBounce.some((z) => this.isInZone(x, y, z));
      if (inBounce && now - this.lastGimmickTriggerAt > 700) {
        this.lastGimmickTriggerAt = now;
        const a = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
        this.cat.setVelocity(this.cat.body.velocity.x + Math.cos(a) * 150, this.cat.body.velocity.y + Math.sin(a) * 150);
        this.hud.showGain("TRAMPOLINE BOUNCE!");
        this.cameras.main.shake(65, 0.0034);
      }
    }
  }
  setupRoomAmbience() {
    this.roomAmbient = {
      lastEmitAt: 0,
      livingTwinkleAt: 0,
      kitchenSteamAt: 0,
      bathroomBubbleAt: 0,
      bedroomDustAt: 0,
      kidsSparkAt: 0
    };
  }

  updateRoomAmbience(now) {
    if (!this.roomAmbient) return;
    if (now - this.roomAmbient.lastEmitAt < 120) return;
    this.roomAmbient.lastEmitAt = now;

    const room = this.roomsById[this.currentRoomId];
    if (!room) return;

    const emit = (tint, speedMin, speedMax, scaleFrom, scaleTo, lifespan, alphaFrom, alphaTo) => {
      const x = Phaser.Math.Between(room.x + 24, room.x + room.w - 24);
      const y = Phaser.Math.Between(room.y + 24, room.y + room.h - 24);
      const p = this.add.particles(x, y, "shadow-soft", {
        speed: { min: speedMin, max: speedMax },
        angle: { min: 230, max: 310 },
        scale: { start: scaleFrom, end: scaleTo },
        lifespan,
        quantity: 1,
        tint: [tint],
        alpha: { start: alphaFrom, end: alphaTo }
      });
      if (this.uiCamera) this.uiCamera.ignore(p);
      this.time.delayedCall(lifespan + 40, () => p.destroy());
    };

    if (this.currentRoomId === "kitchen" && now - this.roomAmbient.kitchenSteamAt > 260) {
      this.roomAmbient.kitchenSteamAt = now;
      emit(0xf2fbff, 8, 24, 0.2, 0.02, 620, 0.22, 0);
    } else if (this.currentRoomId === "bathroom" && now - this.roomAmbient.bathroomBubbleAt > 210) {
      this.roomAmbient.bathroomBubbleAt = now;
      emit(0xc6efff, 12, 28, 0.24, 0.04, 540, 0.24, 0);
    } else if (this.currentRoomId === "bedroom" && now - this.roomAmbient.bedroomDustAt > 300) {
      this.roomAmbient.bedroomDustAt = now;
      emit(0xffe1f1, 5, 14, 0.18, 0.03, 700, 0.18, 0);
    } else if (this.currentRoomId === "kids" && now - this.roomAmbient.kidsSparkAt > 180) {
      this.roomAmbient.kidsSparkAt = now;
      emit(0xffd580, 18, 42, 0.22, 0.02, 460, 0.3, 0);
    } else if (this.currentRoomId === "living" && now - this.roomAmbient.livingTwinkleAt > 280) {
      this.roomAmbient.livingTwinkleAt = now;
      emit(0xffe8b6, 8, 20, 0.2, 0.03, 620, 0.2, 0);
    }
  }
  setupRoomLighting() {
    this.roomToneOverlay = this.add.rectangle(this.worldW / 2, this.worldH / 2, this.worldW, this.worldH, 0xffd8a8)
      .setDepth(1700)
      .setAlpha(0.08);
    this.roomLightBloom = this.add.ellipse(this.worldW / 2, this.worldH / 2, 540, 260, 0xfff2cf)
      .setDepth(1690)
      .setAlpha(0.22);
    this.lastLitRoomId = "";
    this.updateRoomLighting("living");
  }
  updateRoomLighting(roomId) {
    if (!this.roomToneOverlay || !this.roomLightBloom) return;
    if (roomId === this.lastLitRoomId) return;
    this.lastLitRoomId = roomId;
    if (roomId === "kitchen") {
      this.roomToneOverlay.setFillStyle(0xa9ddff).setAlpha(0.14);
      this.roomLightBloom.setPosition(1080, 250).setFillStyle(0xdff3ff).setAlpha(0.25);
      return;
    }
    if (roomId === "bedroom") {
      this.roomToneOverlay.setFillStyle(0xf0b6dd).setAlpha(0.14);
      this.roomLightBloom.setPosition(1210, 545).setFillStyle(0xffe1ef).setAlpha(0.24);
      return;
    }
    if (roomId === "bathroom") {
      this.roomToneOverlay.setFillStyle(0x9fdef5).setAlpha(0.15);
      this.roomLightBloom.setPosition(400, 825).setFillStyle(0xd8f3ff).setAlpha(0.26);
      return;
    }
    if (roomId === "kids") {
      this.roomToneOverlay.setFillStyle(0xffbfe8).setAlpha(0.15);
      this.roomLightBloom.setPosition(1210, 865).setFillStyle(0xffe2f3).setAlpha(0.26);
      return;
    }
    this.roomToneOverlay.setFillStyle(0xffd19a).setAlpha(0.13);
    this.roomLightBloom.setPosition(400, 375).setFillStyle(0xffedc2).setAlpha(0.27);
  }

  drawRoomPattern(roomId, room) {
    if (roomId === "kitchen" || roomId === "bathroom") {
      const tileW = roomId === "bathroom" ? 40 : 48;
      const tileH = roomId === "bathroom" ? 32 : 42;
      const colorA = roomId === "bathroom" ? 0xcff3ff : 0xdff4ff;
      const colorB = roomId === "bathroom" ? 0xbfe8f8 : 0xcbe9f7;
      for (let y = room.y + 12, row = 0; y < room.y + room.h - 12; y += tileH, row += 1) {
        for (let x = room.x + 12, col = 0; x < room.x + room.w - 12; x += tileW, col += 1) {
          const fill = (row + col) % 2 === 0 ? colorA : colorB;
          this.add.rectangle(x + tileW / 2, y + tileH / 2, tileW - 3, tileH - 3, fill).setAlpha(0.24).setDepth(-1498);
        }
      }
      return;
    }

    if (roomId === "kids") {
      for (let i = 0; i < 70; i += 1) {
        const x = Phaser.Math.Between(room.x + 20, room.x + room.w - 20);
        const y = Phaser.Math.Between(room.y + 20, room.y + room.h - 20);
        const dot = this.add.circle(x, y, Phaser.Math.Between(3, 6), Phaser.Utils.Array.GetRandom([0xffc7e8, 0xffe4a0, 0xc7f0ff]), 0.2);
        dot.setDepth(-1498);
      }
      return;
    }

    if (roomId === "bedroom") {
      for (let y = room.y + 14; y < room.y + room.h - 14; y += 24) {
        this.add.rectangle(room.x + room.w / 2, y, room.w - 22, 8, 0xffe9f4).setAlpha(0.15).setDepth(-1498);
      }
      return;
    }

    for (let y = room.y + 12; y < room.y + room.h - 12; y += 22) {
      this.add.rectangle(room.x + room.w / 2, y, room.w - 20, 3, 0xf7dfba).setAlpha(0.18).setDepth(-1498);
    }
  }
  drawMap() {
    this.add.rectangle(this.worldW / 2, this.worldH / 2, this.worldW, this.worldH, 0xf4ead8).setDepth(-2200);
    this.add.rectangle(this.worldW / 2, this.worldH / 2, this.worldW - 40, this.worldH - 40, 0xfff6e8).setDepth(-2190).setAlpha(0.8);

    this.roomsById = {
      living: { x: 90, y: 90, w: 600, h: 560, color: 0xffe4be },
      kitchen: { x: 720, y: 90, w: 950, h: 280, color: 0xc9eeff },
      bedroom: { x: 720, y: 400, w: 950, h: 300, color: 0xf6d0ec },
      bathroom: { x: 90, y: 670, w: 600, h: 310, color: 0xbdefff },
      kids: { x: 720, y: 730, w: 950, h: 250, color: 0xffc6ea }
    };

    for (const [roomId, room] of Object.entries(this.roomsById)) {
      this.add.rectangle(room.x + room.w / 2, room.y + room.h / 2, room.w, room.h, room.color).setDepth(-1500);
      this.drawRoomPattern(roomId, room);
      this.add.rectangle(room.x + room.w / 2, room.y + room.h / 2, room.w - 18, room.h - 18, 0xffffff)
        .setAlpha(0.06)
        .setDepth(-1495);
      this.add.rectangle(room.x + room.w / 2, room.y + room.h / 2, room.w, room.h)
        .setStrokeStyle(6, 0x8f6f64)
        .setDepth(-1490);
    }

    this.add.ellipse(390, 305, 360, 170, 0xffd2a8).setAlpha(0.34).setDepth(-1460);
    this.add.ellipse(1190, 230, 430, 140, 0xd2ecff).setAlpha(0.32).setDepth(-1460);
    this.add.ellipse(1210, 545, 450, 170, 0xffc8e0).setAlpha(0.3).setDepth(-1460);
    this.add.ellipse(390, 675, 300, 140, 0xc8f0ff).setAlpha(0.3).setDepth(-1460);
    this.add.ellipse(1210, 855, 470, 160, 0xffc7e8).setAlpha(0.32).setDepth(-1460);

    this.add.rectangle(250, 205, 170, 26, 0xfff7d7).setAlpha(0.44).setDepth(-1455);
    this.add.rectangle(1120, 150, 260, 22, 0xf1fbff).setAlpha(0.42).setDepth(-1455);
    this.add.rectangle(1230, 470, 280, 24, 0xffeef7).setAlpha(0.42).setDepth(-1455);
    this.add.rectangle(260, 600, 220, 22, 0xe8fbff).setAlpha(0.44).setDepth(-1455);
    this.add.rectangle(1160, 790, 320, 26, 0xffecf8).setAlpha(0.44).setDepth(-1455);

    this.add.rectangle(250, 735, 180, 80, 0xd6f2ff).setAlpha(0.34).setDepth(-1438);
    this.add.rectangle(1210, 902, 230, 90, 0xffd9f2).setAlpha(0.34).setDepth(-1438);
    this.add.rectangle(1210, 245, 260, 84, 0xe0f5ff).setAlpha(0.18).setDepth(-1438);

    const walls = [
      { x: 70, y: 70, w: 1620, h: 20 },
      { x: 70, y: 1010, w: 1620, h: 20 },
      { x: 70, y: 70, w: 20, h: 960 },
      { x: 1690, y: 70, w: 20, h: 960 },

      { x: 700, y: 90, w: 20, h: 170 },
      { x: 700, y: 350, w: 20, h: 260 },
      { x: 700, y: 700, w: 20, h: 160 },
      { x: 700, y: 940, w: 20, h: 70 },

      { x: 90, y: 650, w: 240, h: 20 },
      { x: 470, y: 650, w: 230, h: 20 },

      { x: 720, y: 380, w: 300, h: 20 },
      { x: 1240, y: 380, w: 430, h: 20 },

      { x: 720, y: 710, w: 260, h: 20 },
      { x: 1170, y: 710, w: 500, h: 20 }
    ];

    this.doorZones = [
      { x: 650, y: 250, w: 110, h: 120 },
      { x: 650, y: 600, w: 110, h: 120 },
      { x: 650, y: 850, w: 110, h: 110 },
      { x: 330, y: 620, w: 150, h: 90 },
      { x: 1020, y: 330, w: 220, h: 100 },
      { x: 980, y: 660, w: 220, h: 100 }
    ];

    this.add.rectangle(705, 310, 90, 110, 0xfff4c0).setAlpha(0.34).setDepth(-1400);
    this.add.rectangle(705, 655, 90, 120, 0xfff4c0).setAlpha(0.34).setDepth(-1400);
    this.add.rectangle(405, 655, 170, 80, 0xfff4c0).setAlpha(0.34).setDepth(-1400);
    this.add.rectangle(1130, 380, 250, 76, 0xfff4c0).setAlpha(0.34).setDepth(-1400);
    this.add.rectangle(1090, 710, 240, 76, 0xfff4c0).setAlpha(0.34).setDepth(-1400);

    this.wallGroup = this.physics.add.staticGroup();
    for (const w of walls) {
      const rect = this.add.rectangle(w.x + w.w / 2, w.y + w.h / 2, w.w, w.h, 0x7f6a62).setDepth(-1200);
      this.physics.add.existing(rect, true);
      this.wallGroup.add(rect);
    }
  }
  update(time) {
    this.cat.update(time);

    this.currentRoomId = this.getRoomIdFor(this.cat.x, this.cat.y);
    this.updateRoomLighting(this.currentRoomId);
    this.cat.applyRoomRule(this.currentRoomId);
    this.updateRoomAmbience(time);
    this.applyFixedGimmicks(time);
    if (this.currentRoomId !== this.lastRoomTraitId) {
      this.showRoomTrait(this.currentRoomId);
      this.lastRoomTraitId = this.currentRoomId;
    }

    for (const obj of this.objects) obj.update(time);

    if (this.cat.consumeJumpAction(time)) {
      const nearby = this.objects
        .filter((o) => Phaser.Math.Distance.Between(o.x, o.y, this.cat.x, this.cat.y) < 90)
        .sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, this.cat.x, this.cat.y) - Phaser.Math.Distance.Between(b.x, b.y, this.cat.x, this.cat.y));

      const jumpShock = this.add.particles(this.cat.x, this.cat.y + 16, "shadow-soft", {
        speed: { min: 15, max: 55 },
        scale: { start: 0.3, end: 0.02 },
        lifespan: 180,
        quantity: 5,
        alpha: { start: 0.25, end: 0 }
      });
      if (this.uiCamera) this.uiCamera.ignore(jumpShock);
      this.time.delayedCall(170, () => jumpShock.destroy());
      if (nearby[0]) {
        nearby[0].setVelocity((nearby[0].x - this.cat.x) * 3.4, (nearby[0].y - this.cat.y) * 3.4);
        const airBonus = this.cat.getJumpImpactMultiplier(time);
        const power = 3.8 * this.getRoomChaosPowerBonus(this.currentRoomId) * airBonus;
        this.tryChaos(nearby[0], power);
        this.cameras.main.shake(55, 0.0028);
      }
    }

    const now = this.time.now;

    if (now - this.lastDoorClearAt > 120) {
      this.lastDoorClearAt = now;
      this.clearDoorways();
    }

    this.updateOwnerNpc(now);

    const timeLeft = Math.max(0, (this.roundEndAt - now) / 1000);
    const comboMult = this.comboSystem.getMultiplier(now);
    const comboLeftMs = this.comboSystem.remainingMs(now);

    const tier = Math.floor(this.comboSystem.combo / 6);
    if (tier > this.lastSuperTier) {
      this.superDashCharges += tier - this.lastSuperTier;
      this.lastSuperTier = tier;
      this.hud.showGain("Super Dash Charged!");
    } else if (tier < this.lastSuperTier) {
      this.lastSuperTier = tier;
    }

    this.updateRoundTimerDisplay(timeLeft);
    this.hud.update({
      score: this.scoreSystem.totalScore,
      comboMult,
      timeLeft,
      comboLeftMs,
      superDashCharges: this.superDashCharges,
      roomId: this.currentRoomId
    });

    this.updateCinematicOverlay(comboMult);

    this.updateTutorial(now);

    if (!this.finished && now >= this.roundEndAt) {
      this.finishRun();
    }
  }

  clearDoorways() {
    for (const obj of this.objects) {
      if (!obj?.body || obj.state === "tipped" || obj.state === "gone") continue;

      for (const zone of this.doorZones) {
        const inZone = obj.x >= zone.x && obj.x <= zone.x + zone.w && obj.y >= zone.y && obj.y <= zone.y + zone.h;
        if (!inZone) continue;

        const centerX = zone.x + zone.w / 2;
        const centerY = zone.y + zone.h / 2;
        let dx = obj.x - centerX;
        let dy = obj.y - centerY;
        const len = Math.hypot(dx, dy) || 1;

        dx /= len;
        dy /= len;

        const current = obj.body.velocity.length();
        const push = current < 90 ? 110 : 55;
        obj.setVelocity(obj.body.velocity.x + dx * push, obj.body.velocity.y + dy * push);
      }
    }
  }

  updateTutorial(now) {
    const elapsed = now - this.tutorialStartAt;
    if (elapsed > this.tutorialDurationMs) {
      if (this.tutorialText.visible) {
        this.tutorialText.setVisible(false);
      }
      return;
    }

    let text = "";
    if (elapsed < 6000) {
      text = `Move with ${this.moveHint} and chase targets around the house.`;
    } else if (elapsed < 12000) {
      text = "Left Click: Jump/Pounce toward your cursor.";
    } else {
      text = "Right Click: Super Dash only. Charge at combo 6+.";
    }

    const fade = elapsed > 17000 ? Phaser.Math.Linear(1, 0, (elapsed - 17000) / 3000) : 1;
    this.tutorialText.setText(text).setAlpha(fade);
  }

  tryChaos(obj, power) {
    const tipped = obj.applyChaos(power, this.time.now);
    if (!tipped) return;

    const roomBonus = this.getRoomScoreBonus(this.currentRoomId);
    const objectRoomBonus = this.getObjectRoomScoreBonus(obj);
    const specialBonus = obj.isSpecial ? obj.specialMultiplier : 1;

    const res = this.scoreSystem.registerObjectChaos(obj.def.scoreValue, this.time.now, roomBonus * objectRoomBonus * specialBonus);

    if (this.currentRoomId === "kids") {
      const now = this.time.now;
      this.kidsComboHits.push(now);
      this.kidsComboHits = this.kidsComboHits.filter((t) => now - t <= 4200);
      if (this.kidsComboHits.length >= 4 && now >= this.nextKidsBonusAt) {
        const bonus = 220 + Math.floor(this.comboSystem.combo * 18);
        this.scoreSystem.totalScore += bonus;
        this.nextKidsBonusAt = now + 6200;
        this.hud.showGain(`TOY STAMPEDE! +${bonus}`);
        this.cameras.main.shake(110, 0.0045);
      }
    }

    if (this.currentRoomId === "kitchen" && (obj.def.tags ?? []).includes("fragile")) {
      const bonus = 90;
      this.scoreSystem.totalScore += bonus;
      this.hud.showGain(`SPLASH CHAIN +${bonus}`);
    }

    if (this.currentRoomId === "bedroom" && (obj.def.tags ?? []).includes("furniture")) {
      const bonus = 140;
      this.scoreSystem.totalScore += bonus;
      this.hud.showGain(`HEAVY CRASH +${bonus}`);
      this.cameras.main.shake(90, 0.0042);
    }

    if (this.currentRoomId === "bathroom") {
      for (const n of this.objects) {
        if (!n?.body || n === obj || n.state !== "upright") continue;
        const d = Phaser.Math.Distance.Between(obj.x, obj.y, n.x, n.y);
        if (d > 85) continue;
        const dx = (n.x - obj.x) / (d || 1);
        const dy = (n.y - obj.y) / (d || 1);
        n.setVelocity(n.body.velocity.x + dx * 70, n.body.velocity.y + dy * 70);
      }
    }
    const comboCount = this.comboSystem.combo;
    this.soundFx.playHit();
    this.soundFx.playCombo(Math.floor(res.multiplier * 10));

    const tag = obj.isSpecial ? " [SPECIAL]" : "";
    this.hud.showGain(`+${res.gained}${tag} (${res.multiplier.toFixed(1)}x)`);
    this.showComboRush(comboCount, res.multiplier);
    this.triggerImpactPulse(obj.x, obj.y, Phaser.Math.Clamp(comboCount / 14, 0.25, 1));

    const shakePower = this.currentRoomId === "bedroom" ? 0.002 : 0.0035;
    this.cameras.main.shake(70, shakePower);

    const particles = this.add.particles(obj.x, obj.y, "obj-cup", {
      speed: { min: 20, max: 90 },
      scale: { start: 0.45, end: 0.05 },
      lifespan: 250,
      quantity: obj.isSpecial ? 10 : 6,
      tint: obj.isSpecial ? [0xffd54f, 0xffffff] : [0xfff2b2, 0xffffff]
    });
    if (this.uiCamera) this.uiCamera.ignore(particles);
    this.time.delayedCall(220, () => particles.destroy());
  }

  finishRun() {
    this.finished = true;
    this.soundFx.stopBgm();

    const runResult = {
      totalScore: this.scoreSystem.totalScore,
      bestCombo: this.comboSystem.bestCombo,
      destroyedCount: this.scoreSystem.destroyedCount,
      starsEarned: 0
    };

    const mission = this.missionSystem.evaluate(runResult);
    runResult.starsEarned = mission.starsEarned;

    const cosmetics = this.cache.json.get("cosmetics") ?? [];
    const save = SaveSystem.load();
    save.bestScore = Math.max(save.bestScore, runResult.totalScore);
    save.totalStars += mission.starsEarned;

    for (const c of cosmetics) {
      if (save.totalStars >= c.unlockStars && !save.unlockedCosmeticIds.includes(c.id)) {
        save.unlockedCosmeticIds.push(c.id);
      }
    }
    SaveSystem.save(save);

    this.scene.start("Result", {
      runResult,
      completedMissions: mission.completed,
      saveData: save
    });
  }
}































