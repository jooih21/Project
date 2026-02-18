import { ASSETS_CONFIG } from "../config/assetsConfig.js";
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    this.preloadExternalAssets();
    this.load.json("objects", "src/game/data/objects.json");
    this.load.json("missions", "src/game/data/missions.json");
    this.load.json("cosmetics", "src/game/data/cosmetics.json");
  }


  preloadExternalAssets() {
    if (!ASSETS_CONFIG.externalEnabled) return;

    const base = ASSETS_CONFIG.basePath;
    for (const tone of ASSETS_CONFIG.cat.tones) {
      this.load.spritesheet(`cat-${tone}-sheet`, `${base}/cat/${tone}-sheet.png`, {
        frameWidth: ASSETS_CONFIG.cat.frameWidth,
        frameHeight: ASSETS_CONFIG.cat.frameHeight
      });
      this.load.image(`cat-${tone}-tail`, `${base}/cat/${tone}-tail.png`);
    }

    for (const key of ASSETS_CONFIG.objectTextureKeys) {
      this.load.image(key, `${base}/objects/${key}.png`);
    }
  }
  validateExternalAssets() {
    if (!ASSETS_CONFIG.externalEnabled) return;

    const missingCatSheets = ASSETS_CONFIG.cat.tones.filter((tone) => !this.textures.exists(`cat-${tone}-sheet`));
    if (missingCatSheets.length > 0) {
      console.warn(`[ChaosKitty] External cat sheets missing for tones: ${missingCatSheets.join(", ")}`);
    }

    const sampleMissingObjects = ASSETS_CONFIG.objectTextureKeys
      .filter((key) => !this.textures.exists(key))
      .slice(0, 12);

    if (sampleMissingObjects.length > 0) {
      console.warn(`[ChaosKitty] Some external object textures are missing (showing up to 12): ${sampleMissingObjects.join(", ")}`);
    }
  }
  create() {
    this.makeTextures();
    this.validateExternalAssets();
    this.scene.start("Menu");
  }

  makeTextures() {
    const g = this.add.graphics();

    this.drawCatSet(g, "orange", {
      coat: 0xe2974c,
      coatDark: 0xb86e34,
      belly: 0xffe8d3,
      paw: 0xf8d2b8,
      stripe: 0x7e4624,
      earInner: 0xffc7b0
    });

    this.drawCatSet(g, "sky", {
      coat: 0x8ca7df,
      coatDark: 0x5f78b3,
      belly: 0xe8f1ff,
      paw: 0xd4e3ff,
      stripe: 0x445f92,
      earInner: 0xcbdcff
    });

    this.drawCatSet(g, "mint", {
      coat: 0x90d2aa,
      coatDark: 0x5f9f7b,
      belly: 0xe9ffea,
      paw: 0xd5f3dc,
      stripe: 0x4f8468,
      earInner: 0xc1efce
    });

    this.drawBoxTexture(g, "obj-box", 0xcca27e, 0x8d6244, 0xe6c8aa);
    this.drawBoxTexture(g, "obj-crate", 0xbe8b63, 0x724b31, 0xd4a37a);
    this.drawBoxTippedTexture(g, "obj-box-tipped", 0xb08a6a, 0x774f36);
    this.drawBoxTippedTexture(g, "obj-crate-tipped", 0x9d754f, 0x5e3b27);

    this.drawCupTexture(g, "obj-cup", 0xd4edf7, 0x5f95a6, 0xf7fbff);
    this.drawVaseTexture(g, "obj-vase", 0xb7d1ff, 0x4f6aa0, 0xe3edff);
    this.drawCupBrokenTexture(g, "obj-cup-tipped", 0x93b8c5, 0x5f95a6);
    this.drawCupBrokenTexture(g, "obj-vase-tipped", 0x8ba7d9, 0x4f6aa0);

    this.drawPlantTexture(g, "obj-plant", 0x8a5735, 0x3c8f49, 0x70c96f);
    this.drawPlantTexture(g, "obj-succulent", 0x8f6848, 0x4fa25d, 0x8fe49b);
    this.drawPlantTippedTexture(g, "obj-plant-tipped", 0x7a4d30, 0x3c8f49);
    this.drawPlantTippedTexture(g, "obj-succulent-tipped", 0x7d5c42, 0x4fa25d);

    this.drawBoxTexture(g, "obj-book", 0x8a9bcc, 0x4b5f8f, 0xc9d6f5);
    this.drawBoxTexture(g, "obj-speaker", 0x595b64, 0x2d2f36, 0x8f939f);
    this.drawBoxTexture(g, "obj-toybox", 0xe5927c, 0x9c5544, 0xffceb8);
    this.drawBoxTexture(g, "obj-shoebox", 0xb28d71, 0x6f533f, 0xd7b79d);
    this.drawBoxTippedTexture(g, "obj-book-tipped", 0x6f84b7, 0x3d4f79);
    this.drawBoxTippedTexture(g, "obj-speaker-tipped", 0x4d4f57, 0x25272d);
    this.drawBoxTippedTexture(g, "obj-toybox-tipped", 0xd67f67, 0x844535);
    this.drawBoxTippedTexture(g, "obj-shoebox-tipped", 0x9e7b61, 0x5c4232);

    this.drawVaseTexture(g, "obj-bottle", 0xc4e6ff, 0x5d87a8, 0xf4fbff);
    this.drawCupTexture(g, "obj-plate", 0xf9efe0, 0xb89f83, 0xffffff);
    this.drawBoxTexture(g, "obj-frame", 0xc8b49a, 0x6f5a47, 0xf4e4cf);
    this.drawCupBrokenTexture(g, "obj-bottle-tipped", 0x8fb5d3, 0x4f6f87);
    this.drawCupBrokenTexture(g, "obj-plate-tipped", 0xd9c7ac, 0x9d856c);
    this.drawBoxTippedTexture(g, "obj-frame-tipped", 0xb29e86, 0x5f4b39);

    this.drawPlantTexture(g, "obj-cactus", 0x7d5a40, 0x3d9c66, 0x67cc8c);
    this.drawPlantTexture(g, "obj-bouquet", 0x9a6a4a, 0xdc6ba8, 0xffa8cd);
    this.drawPlantTippedTexture(g, "obj-cactus-tipped", 0x6d4d37, 0x3d9c66);
    this.drawPlantTippedTexture(g, "obj-bouquet-tipped", 0x865840, 0xdc6ba8);

    this.drawTableTexture(g, "obj-table", 0xf2ddbd, 0xbd9466, 0xab7d4c);
    this.drawTableTexture(g, "obj-table-oak", 0xe6cfaa, 0xa47648, 0x8f6337);
    this.drawTableTexture(g, "obj-desk", 0xe4c9a5, 0x8f6942, 0x775634);
    this.drawTableTexture(g, "obj-nightstand", 0xdabf9b, 0x8a6846, 0x6f5338);
    this.drawTableTexture(g, "obj-tvstand", 0xb8c2d1, 0x6a7482, 0x515966);
    this.drawTableTippedTexture(g, "obj-table-tipped", 0xd3be9d, 0x9f774a);
    this.drawTableTippedTexture(g, "obj-table-oak-tipped", 0xc4ae88, 0x845a34);
    this.drawTableTippedTexture(g, "obj-desk-tipped", 0xc7ae8d, 0x755737);
    this.drawTableTippedTexture(g, "obj-nightstand-tipped", 0xbfa486, 0x664c35);
    this.drawTableTippedTexture(g, "obj-tvstand-tipped", 0x98a3b2, 0x575f6b);

    this.drawVaseTexture(g, "obj-shampoobottle", 0xb8e4ff, 0x5e95b3, 0xeef9ff);
    this.drawCupTexture(g, "obj-soapdispenser", 0xe4f4ff, 0x7aa4b7, 0xffffff);
    this.drawCupTexture(g, "obj-toothmug", 0xd2fbff, 0x5c8f9e, 0xf7ffff);
    this.drawBoxTexture(g, "obj-towelstack", 0xbdd3e4, 0x6a8293, 0xe8f1f8);
    this.drawTableTexture(g, "obj-bathstool", 0xd8edf9, 0x8eb2cc, 0x7296af);

    this.drawCupBrokenTexture(g, "obj-shampoobottle-tipped", 0x93bdd4, 0x4f6f87);
    this.drawCupBrokenTexture(g, "obj-soapdispenser-tipped", 0xbbd2df, 0x5f7e90);
    this.drawCupBrokenTexture(g, "obj-toothmug-tipped", 0x9ac6cf, 0x4b7580);
    this.drawBoxTippedTexture(g, "obj-towelstack-tipped", 0xa5bed0, 0x607786);
    this.drawTableTippedTexture(g, "obj-bathstool-tipped", 0xc2dbea, 0x6f8ea8);

    this.drawCupTexture(g, "obj-kettle", 0xd9dce3, 0x6e7786, 0xf5f6f8);
    this.drawBoxTexture(g, "obj-toaster", 0xc9c1b8, 0x6b6258, 0xe9ddd1);
    this.drawCupTexture(g, "obj-pan", 0xbfc5d0, 0x59616f, 0xe8edf7);
    this.drawCupBrokenTexture(g, "obj-kettle-tipped", 0x949fb1, 0x5c6575);
    this.drawBoxTippedTexture(g, "obj-toaster-tipped", 0xab9f92, 0x5a5148);
    this.drawCupBrokenTexture(g, "obj-pan-tipped", 0x8e98a9, 0x4f5968);

    this.drawBoxTexture(g, "obj-controller", 0x8c96a6, 0x4f5865, 0xcfd5df);
    this.drawTableTexture(g, "obj-lamp", 0xf3ddb9, 0xb48e64, 0x9a754d);
    this.drawBoxTippedTexture(g, "obj-controller-tipped", 0x727d8d, 0x454d58);
    this.drawTableTippedTexture(g, "obj-lamp-tipped", 0xd5be9a, 0x8f6f49);

    this.drawCupTexture(g, "obj-perfume", 0xffd8ea, 0xc57ca1, 0xffeff6);
    this.drawBoxTexture(g, "obj-alarmclock", 0xd9c6b9, 0x785f53, 0xfff0df);
    this.drawCupBrokenTexture(g, "obj-perfume-tipped", 0xd2a8be, 0x9f6a86);
    this.drawBoxTippedTexture(g, "obj-alarmclock-tipped", 0xbca79a, 0x5f4d43);

    this.drawCupTexture(g, "obj-rattle", 0xffe1a9, 0xb8874a, 0xfff4d7);
    this.drawBoxTexture(g, "obj-storybook", 0x9bb4f0, 0x5a72ad, 0xdce6ff);
    this.drawBoxTexture(g, "obj-robottoy", 0xc7ccd6, 0x6b7484, 0xf0f3f7);
    this.drawTableTexture(g, "obj-blocktower", 0xf1c49a, 0xbe8450, 0x9d6438);
    this.drawCupBrokenTexture(g, "obj-rattle-tipped", 0xd5bc8d, 0x8d6837);
    this.drawBoxTippedTexture(g, "obj-storybook-tipped", 0x8098d2, 0x455c92);
    this.drawBoxTippedTexture(g, "obj-robottoy-tipped", 0xa4acb8, 0x596172);
    this.drawTableTippedTexture(g, "obj-blocktower-tipped", 0xd7a97e, 0x946038);

    this.drawCrackTexture(g, "fx-crack-small", 46, 34, 0x4f3a31);
    this.drawCrackTexture(g, "fx-crack-large", 132, 64, 0x4f3a31);

    this.drawOwnerTexture(g);
    this.drawShadowTexture(g);

    g.destroy();
  }

  drawCatSet(g, toneId, palette) {
    const base = `cat-${toneId}`;
    this.drawCatFrame(g, `${base}-idle`, palette, "idle");
    this.drawCatFrame(g, `${base}-run1`, palette, "run1");
    this.drawCatFrame(g, `${base}-run2`, palette, "run2");
    this.drawCatFrame(g, `${base}-jump`, palette, "jump");
    this.drawCatFrame(g, `${base}-land`, palette, "land");
    this.drawCatTail(g, `${base}-tail`, palette.coatDark, palette.coat);
    this.drawCatFrame(g, base, palette, "idle");
  }

  drawCatTail(g, key, outer, inner) {
    if (this.textures.exists(key)) return;
    g.clear();
    g.fillStyle(outer, 1);
    g.fillEllipse(16, 10, 24, 12);
    g.fillEllipse(26, 8, 14, 9);
    g.fillStyle(inner, 1);
    g.fillEllipse(15, 10, 14, 6);
    g.generateTexture(key, 36, 20);
  }

  drawCatFrame(g, key, p, pose) {
    if (this.textures.exists(key)) return;
    g.clear();

    const isJump = pose === "jump";
    const isLand = pose === "land";
    const run1 = pose === "run1";
    const run2 = pose === "run2";

    const bodyY = isJump ? 22 : isLand ? 30 : 27;
    const headY = isJump ? 14 : isLand ? 20 : 17;
    const pawY = isJump ? 31 : isLand ? 38 : 35;

    g.fillStyle(p.coatDark, 1);
    g.fillRoundedRect(10, bodyY + 2, 24, 6, 3);

    g.fillStyle(p.paw, 1);
    if (run1) {
      g.fillRoundedRect(24, pawY - 2, 8, 7, 3);
      g.fillRoundedRect(34, pawY + 2, 8, 6, 3);
      g.fillRoundedRect(18, pawY + 1, 8, 6, 3);
      g.fillRoundedRect(44, pawY - 2, 8, 7, 3);
    } else if (run2) {
      g.fillRoundedRect(24, pawY + 2, 8, 6, 3);
      g.fillRoundedRect(34, pawY - 2, 8, 7, 3);
      g.fillRoundedRect(18, pawY - 2, 8, 7, 3);
      g.fillRoundedRect(44, pawY + 1, 8, 6, 3);
    } else if (isJump) {
      g.fillRoundedRect(28, pawY - 4, 7, 5, 2);
      g.fillRoundedRect(37, pawY - 5, 7, 5, 2);
      g.fillRoundedRect(19, pawY - 1, 7, 5, 2);
      g.fillRoundedRect(47, pawY - 1, 7, 5, 2);
    } else if (isLand) {
      g.fillRoundedRect(22, pawY, 8, 7, 3);
      g.fillRoundedRect(33, pawY, 8, 7, 3);
      g.fillRoundedRect(15, pawY + 1, 8, 7, 3);
      g.fillRoundedRect(44, pawY + 1, 8, 7, 3);
    } else {
      g.fillRoundedRect(24, pawY, 8, 7, 3);
      g.fillRoundedRect(34, pawY, 8, 7, 3);
      g.fillRoundedRect(18, pawY + 1, 8, 6, 3);
      g.fillRoundedRect(44, pawY + 1, 8, 6, 3);
    }

    g.fillStyle(p.coatDark, 1);
    g.fillRoundedRect(8, bodyY + 6, 15, 6, 3);

    g.fillStyle(p.coat, 1);
    g.fillEllipse(34, bodyY, 36, 23);
    g.fillCircle(52, headY, 11);

    g.fillStyle(p.belly, 1);
    g.fillEllipse(33, bodyY + 2, 15, 11);

    g.fillStyle(p.coatDark, 1);
    g.fillTriangle(45, headY - 5, 49, headY - 14, 52, headY - 4);
    g.fillTriangle(54, headY - 5, 58, headY - 14, 61, headY - 4);

    g.fillStyle(p.earInner, 1);
    g.fillTriangle(47, headY - 6, 49, headY - 11, 51, headY - 6);
    g.fillTriangle(56, headY - 6, 58, headY - 11, 60, headY - 6);

    g.fillStyle(p.stripe, 1);
    g.fillRoundedRect(26, bodyY - 9, 3, 7, 1);
    g.fillRoundedRect(31, bodyY - 10, 3, 8, 1);
    g.fillRoundedRect(36, bodyY - 9, 3, 7, 1);

    g.fillStyle(0x2b1a16, 1);
    if (isJump) {
      g.fillCircle(49, headY - 1, 1.6);
      g.fillCircle(55, headY - 1, 1.6);
    } else {
      g.fillEllipse(49, headY - 1, 3.2, 2.6);
      g.fillEllipse(55, headY - 1, 3.2, 2.6);
    }

    g.fillTriangle(51, headY + 2, 53, headY + 2, 52, headY + 4);
    if (isLand) {
      g.fillRect(50, headY + 5, 4, 2);
    } else {
      g.fillRect(50, headY + 5, 4, 1);
    }

    g.generateTexture(key, 72, 52);
  }

  drawBoxTexture(g, key, base, edge, tape) {
    if (this.textures.exists(key)) return;
    g.clear();
    g.fillStyle(edge, 1);
    g.fillRoundedRect(0, 0, 42, 30, 5);
    g.fillStyle(base, 1);
    g.fillRoundedRect(2, 2, 38, 26, 4);
    g.fillStyle(tape, 1);
    g.fillRect(6, 5, 30, 4);
    g.fillRect(19, 2, 4, 26);
    g.fillStyle(edge, 0.35);
    g.fillRect(4, 16, 34, 10);
    g.generateTexture(key, 42, 30);
  }

  drawBoxTippedTexture(g, key, base, edge) {
    if (this.textures.exists(key)) return;
    g.clear();
    g.fillStyle(edge, 1);
    g.fillRoundedRect(0, 0, 42, 26, 4);
    g.fillStyle(base, 1);
    g.fillRoundedRect(2, 2, 38, 22, 4);
    g.fillStyle(0x000000, 0.16);
    g.fillRect(4, 13, 34, 8);
    g.lineStyle(2, edge, 1);
    g.beginPath();
    g.moveTo(10, 9);
    g.lineTo(16, 14);
    g.lineTo(22, 11);
    g.lineTo(30, 16);
    g.strokePath();
    g.generateTexture(key, 42, 28);
  }

  drawCupTexture(g, key, body, rim, shine) {
    if (this.textures.exists(key)) return;
    g.clear();
    g.fillStyle(rim, 1);
    g.fillRoundedRect(1, 1, 20, 27, 8);
    g.fillStyle(body, 1);
    g.fillRoundedRect(3, 3, 16, 23, 7);
    g.fillStyle(shine, 0.8);
    g.fillRoundedRect(6, 6, 4, 10, 2);
    g.lineStyle(2, rim, 1);
    g.strokeCircle(20, 13, 4);
    g.generateTexture(key, 24, 30);
  }

  drawCupBrokenTexture(g, key, body, edge) {
    if (this.textures.exists(key)) return;
    g.clear();
    g.fillStyle(body, 1);
    g.fillRoundedRect(2, 10, 18, 14, 5);
    g.fillStyle(edge, 1);
    g.fillTriangle(2, 10, 7, 4, 11, 10);
    g.fillTriangle(11, 10, 15, 5, 19, 10);
    g.fillStyle(0x000000, 0.2);
    g.fillRect(3, 17, 15, 4);
    g.generateTexture(key, 24, 26);
  }

  drawVaseTexture(g, key, body, edge, shine) {
    if (this.textures.exists(key)) return;
    g.clear();
    g.fillStyle(edge, 1);
    g.fillRoundedRect(6, 2, 16, 4, 2);
    g.fillRoundedRect(4, 5, 20, 26, 8);
    g.fillStyle(body, 1);
    g.fillRoundedRect(6, 6, 16, 23, 7);
    g.fillStyle(shine, 0.75);
    g.fillRoundedRect(9, 10, 3, 10, 2);
    g.generateTexture(key, 28, 34);
  }

  drawPlantTexture(g, key, pot, leaf1, leaf2) {
    if (this.textures.exists(key)) return;
    g.clear();
    g.fillStyle(pot, 1);
    g.fillRoundedRect(7, 18, 22, 14, 4);
    const pr = (pot >> 16) & 255;
    const pg = (pot >> 8) & 255;
    const pb = pot & 255;
    const darkPot = Phaser.Display.Color.GetColor(Math.floor(pr * 0.72), Math.floor(pg * 0.72), Math.floor(pb * 0.72));
    g.fillStyle(darkPot, 1);
    g.fillRect(7, 22, 22, 3);

    g.fillStyle(leaf1, 1);
    g.fillEllipse(12, 16, 10, 14);
    g.fillEllipse(18, 10, 12, 16);
    g.fillEllipse(24, 16, 10, 14);

    g.fillStyle(leaf2, 1);
    g.fillEllipse(18, 15, 7, 10);

    g.generateTexture(key, 36, 34);
  }

  drawPlantTippedTexture(g, key, pot, leaf) {
    if (this.textures.exists(key)) return;
    g.clear();
    g.fillStyle(leaf, 1);
    g.fillEllipse(12, 18, 15, 12);
    g.fillEllipse(20, 15, 15, 12);
    g.fillEllipse(28, 20, 13, 11);

    g.fillStyle(pot, 1);
    g.fillRoundedRect(4, 20, 20, 10, 4);
    g.fillStyle(0x000000, 0.2);
    g.fillRect(5, 24, 18, 3);
    g.generateTexture(key, 36, 34);
  }

  drawTableTexture(g, key, top, edge, leg) {
    if (this.textures.exists(key)) return;
    g.clear();
    g.fillStyle(edge, 1);
    g.fillRoundedRect(0, 4, 126, 18, 7);
    g.fillStyle(top, 1);
    g.fillRoundedRect(2, 2, 122, 14, 7);
    g.fillStyle(leg, 1);
    g.fillRoundedRect(12, 20, 14, 40, 5);
    g.fillRoundedRect(100, 20, 14, 40, 5);
    g.generateTexture(key, 126, 62);
  }

  drawTableTippedTexture(g, key, top, edge) {
    if (this.textures.exists(key)) return;
    g.clear();
    g.fillStyle(edge, 1);
    g.fillRoundedRect(0, 8, 126, 15, 6);
    g.fillStyle(top, 1);
    g.fillRoundedRect(2, 6, 122, 12, 6);
    g.fillStyle(0x000000, 0.18);
    g.fillRect(10, 18, 105, 5);
    g.generateTexture(key, 126, 28);
  }

  drawCrackTexture(g, key, width, height, color) {
    if (this.textures.exists(key)) return;
    g.clear();
    g.lineStyle(3, color, 0.72);
    g.beginPath();
    g.moveTo(width * 0.18, height * 0.2);
    g.lineTo(width * 0.35, height * 0.35);
    g.lineTo(width * 0.28, height * 0.58);
    g.lineTo(width * 0.46, height * 0.74);

    g.moveTo(width * 0.56, height * 0.15);
    g.lineTo(width * 0.62, height * 0.42);
    g.lineTo(width * 0.78, height * 0.58);

    g.moveTo(width * 0.4, height * 0.44);
    g.lineTo(width * 0.54, height * 0.5);
    g.lineTo(width * 0.68, height * 0.76);
    g.strokePath();

    g.generateTexture(key, width, height);
  }

  drawOwnerTexture(g) {
    if (this.textures.exists("owner")) return;
    g.clear();
    g.fillStyle(0x4f78a8, 1);
    g.fillRoundedRect(8, 16, 30, 24, 10);
    g.fillStyle(0xffefde, 1);
    g.fillCircle(23, 14, 11);
    g.fillStyle(0x2f1f1b, 1);
    g.fillCircle(19, 14, 1.6);
    g.fillCircle(27, 14, 1.6);
    g.fillRect(18, 20, 10, 3);
    g.generateTexture("owner", 46, 46);
  }

  drawShadowTexture(g) {
    if (this.textures.exists("shadow-soft")) return;
    g.clear();
    g.fillStyle(0x000000, 0.5);
    g.fillEllipse(32, 10, 52, 16);
    g.generateTexture("shadow-soft", 64, 20);
  }
}






