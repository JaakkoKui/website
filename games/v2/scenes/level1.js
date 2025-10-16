// Level 1: side-view room with a sloped floor and a door to Level 2.
// - Move with arrows (or touch on phones), jump with Up/touch, drink with G near the fridge
// - Segis HUD animates with a rainbow color based on current Segis value
// Phaser is loaded globally via <script> in index.html
// Import combat system and segis utilities
import Combat from "../core/combat.js";
import { segis, getRainbowColor } from "../core/segis.js";

// Central configuration for Level 1: tweak values here (sizes, physics, zones)
const LEVEL1_CFG = {
  frame: { width: 200, height: 140 },
  floor: { start: { x: 0, y: 510 }, end: { x: 1000, y: 710 } },
  block: { xFrac: 0.13, width: 5, height: 800 },
  endBlock: { offsetX: 300, width: 10, height: 220 },
  scale: { min: 0.6, max: 1.6 },
  fridgeZone: { minFrac: 0.48, maxFrac: 0.68 },
  physics: { gravity: 0.5, jumpStrength: -10 },
  speed: { base: 7, drunk: 3 },
  hud: { font: { font: "20px Arial", color: "#ffffff" } },
  segisColorSpeedMul: 0.000005,
};

export default class Level1 extends Phaser.Scene {
  constructor() {
    super({ key: "Level1" });
    this.segisColorPhase = 0.0;
    this.playerSpeed = LEVEL1_CFG.speed.base;
    this.gravity = LEVEL1_CFG.physics.gravity;
    this.velocityY = 0;
    this.jumpStrength = LEVEL1_CFG.physics.jumpStrength;
    this.isJumping = false;
    this.facingRight = true;
    this.showDrinkPrompt = false;
    this.didDrink = false;
    this.wins = 0;
    this.inCombat = false;

    // Mobile controls state
    this.touchLeft = false;
    this.touchRight = false;
    this.touchJumpQueued = false; // one-shot tap
    this.touchButtons = null; // for cleanup
  }

  preload() {
    // Load images relative to games/v2/assets
    this.load.setPath("assets/");
    this.load.image("background", "backgrounds/level1.png");
    this.load.image("foxStanding", "fromSide/foxStanding.png");
    this.load.image("foxJump", "fromSide/foxJump.png");
    this.load.image("frownFox", "fromSide/frownFox.png");
    this.load.image("foxDidDrink", "fromSide/foxDidDrink.png");
  }

  create() {
    const { width, height } = this.scale;

    this.background = this.add
      .image(0, 0, "background")
      .setOrigin(0)
      .setDisplaySize(width, height);

    // Player spawns at quarter width, front-facing frown by default (pre-drink)
    this.player = this.add.image(width * 0.2, 520, "frownFox");
    this.player.setOrigin(0);
    this.player.setDisplaySize(LEVEL1_CFG.frame.width, LEVEL1_CFG.frame.height);

    // Base logical size; visual size is scaled during update for fake depth
    // Base logical size; visual size is scaled during update for fake depth
    this.frameWidth = LEVEL1_CFG.frame.width;
    this.frameHeight = LEVEL1_CFG.frame.height;

    // Floor slope points (linear interpolation used to place the feet on the floor)
    this.floorStart = { ...LEVEL1_CFG.floor.start };
    this.floorEnd = { ...LEVEL1_CFG.floor.end };

    // Thin blocker at left to prevent walking into the wall
    // Thin blocker at left to prevent walking into the wall
    this.blockRect = new Phaser.Geom.Rectangle(
      width * LEVEL1_CFG.block.xFrac,
      0,
      LEVEL1_CFG.block.width,
      LEVEL1_CFG.block.height,
    );

    // End rect: AFTER the door (beyond right edge) so transition happens after exiting
    this.endBlockRect = new Phaser.Geom.Rectangle(
      width + LEVEL1_CFG.endBlock.offsetX,
      this.floorEnd.y - 200,
      LEVEL1_CFG.endBlock.width,
      LEVEL1_CFG.endBlock.height,
    );

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyG = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G);
    this.keySpace = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );

    // Shared font style
    this.font = { font: "24px Arial", fill: "#ffffff" };

    this.jumpImage = "foxJump";
    // Use frownFox as default before drinking
    this.standingImage = "frownFox";
    this.didDrinkImage = "foxDidDrink";
    // Reset carry-over state on scene start
    this.didDrink = false;
    this.playerSpeed = 7;

    // Segis HUD (top-left)
    this.segisText = this.add
      .text(15, 15, "Segis: 0", LEVEL1_CFG.hud.font)
      .setScrollFactor(0);

    // Global debug hotkeys: 1->Intro, 2->Level1, 3->Level2
    const goIntro = () => this.scene.start("Intro");
    const goL1 = () => this.scene.start("Level1");
    const goL2 = () => this.scene.start("Level2");
    this._hotkeys = { goIntro, goL1, goL2 };
    this.input.keyboard.on("keydown-ONE", goIntro, this);
    this.input.keyboard.on("keydown-TWO", goL1, this);
    this.input.keyboard.on("keydown-THREE", goL2, this);

    // Mobile controls: show only on phones; enable multi-touch
    const os =
      (this.sys &&
        this.sys.game &&
        this.sys.game.device &&
        this.sys.game.device.os) ||
      {};
    const isPhone = !!(os.android || os.iOS);
    this.input.addPointer(3);
    if (isPhone) {
      this.createMobileControls();
    }
    // Unified cleanup to avoid leaks (applies to both desktop and phone)
    this.events.once("shutdown", this.cleanupScene, this);
    this.events.once("destroy", this.cleanupScene, this);
  }

  ensureCombatRegistered() {
    const mgr = this.scene.manager;
    if (!mgr.keys || !mgr.keys["Combat"]) {
      this.scene.add("Combat", Combat, false);
    }
  }

  // --- UI helpers for the fridge prompt ---
  createPromptUI() {
    if (this.promptContainer) return;
    const cx = 525;
    const cy = 180;
    const cont = this.add.container(cx, cy).setDepth(1000).setScrollFactor(0);

    // Phaser's rectangle does not support rounded corners directly.
    // Use Graphics to draw a rounded rectangle instead:
    const graphics = this.add.graphics();
    graphics.fillStyle(0xe6e6e6, 0.95);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.fillRoundedRect(-175, -30, 350, 60, 18);
    graphics.strokeRoundedRect(-175, -30, 350, 60, 18);

    cont.add(graphics);

    const text = this.add
      .text(0, 0, "", {
        font: "22px Arial",
        fill: "#096904ff",
      })
      .setOrigin(0.5);
    cont.add(text);

    this.promptContainer = cont;
    this.promptRect = graphics;
    this.promptText = text;
  }

  destroyPromptUI() {
    if (!this.promptContainer) return;
    this.promptContainer.destroy();
    this.promptContainer = null;
    this.promptRect = null;
    this.promptText = null;
  }

  handleCombat() {
    if (this.inCombat) return;
    this.inCombat = true;
    this.ensureCombatRegistered();

    // One quick reaction round, 3s timeout
    const rounds = 1;
    const promptTime = 3000;
    const level = this;

    // Pause this scene and launch Combat overlay
    // Remove prompt UI if visible to avoid overlaying Combat
    if (this.promptContainer) {
      this.promptContainer.destroy();
      this.promptContainer = null;
    }
    this.scene.pause();
    this.scene.launch("Combat", {
      promptTime,
      rounds,
      returnSceneKey: null,
      onEnd(result) {
        // Stop combat and resume Level1
        level.scene.stop("Combat");
        level.scene.resume();

        if (result === "win") {
          level.didDrink = false;
          if (level.player && level.standingImage) {
            level.player.setTexture(level.standingImage);
          }
          segis.add(5);
          level.wins++;
          level.standingImage = "foxStanding";
        } else {
          level.didDrink = true;
          if (level.player && level.didDrinkImage) {
            level.player.setTexture(level.didDrinkImage);
          }
          level.playerSpeed = 0;

          // Fade to black and go back to Intro
          const fade = level.add
            .rectangle(0, 0, level.scale.width, level.scale.height, 0x000000)
            .setOrigin(0)
            .setAlpha(0);
          level.tweens.add({
            targets: fade,
            alpha: 1,
            duration: 800,
            onComplete: () => {
              // Center drunk fox on the black screen
              const cx = level.scale.width / 2;
              const cy = level.scale.height / 2;
              const drunk = level.add
                .image(cx, cy - 20, level.didDrinkImage)
                .setOrigin(0.5)
                .setDisplaySize(level.frameWidth, level.frameHeight);
              level.add
                .text(
                  cx,
                  cy + level.frameHeight * 0.45,
                  "Potions too strong, better luck tomorrow",
                  level.font,
                )
                .setOrigin(0.5);
              level.time.delayedCall(3500, () => {
                // Reset for next day
                level.didDrink = false;
                level.playerSpeed = LEVEL1_CFG.speed.base;
                level.scene.start("Intro");
              });
            },
          });
          segis.reset();
        }

        level.inCombat = false;
      },
    });
    // Ensure Combat scene is rendered above Level1
    this.scene.bringToTop("Combat");
  }

  // Helpers: compute visual scale and floor Y for current X
  getScaleFactor(x, width) {
    const t = Phaser.Math.Clamp(x / Math.max(width, 1), 0, 1);
    return (
      LEVEL1_CFG.scale.min + (LEVEL1_CFG.scale.max - LEVEL1_CFG.scale.min) * t
    );
  }

  getFloorY(x) {
    const { x: x0, y: y0 } = this.floorStart;
    const { x: x1, y: y1 } = this.floorEnd;
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }

  // --- Mobile controls (phone-only) --------------------------------------
  createMobileControls() {
    const { width, height } = this.scale;
    const btnW = 84;
    const btnH = 72;
    const gap = 12;
    const y = height - btnH / 2 - 16;

    const makeBtn = (x, label, onDown, onUp, color = 0x222222) => {
      const cont = this.add.container(x, y).setScrollFactor(0);
      const rect = this.add
        .rectangle(0, 0, btnW, btnH, color)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true });
      const txt = this.add
        .text(0, 0, label, { font: "22px Arial", fill: "#ffffff" })
        .setOrigin(0.5);
      cont.add([rect, txt]);
      rect.on("pointerdown", () => {
        rect.setFillStyle(0x333333);
        onDown && onDown();
      });
      const up = () => {
        rect.setFillStyle(color);
        onUp && onUp();
      };
      rect.on("pointerup", up);
      rect.on("pointerout", up);
      rect.on("pointerupoutside", up);
      return { cont, rect, txt };
    };

    const leftX = 20 + btnW / 2;
    const rightX = leftX + btnW + gap;
    const jumpX = width - (20 + btnW / 2);
    const drinkX = jumpX - (btnW + gap);

    const leftBtn = makeBtn(
      leftX,
      "◀",
      () => (this.touchLeft = true),
      () => (this.touchLeft = false),
    );
    const rightBtn = makeBtn(
      rightX,
      "▶",
      () => (this.touchRight = true),
      () => (this.touchRight = false),
    );
    const jumpBtn = makeBtn(
      jumpX,
      "⤴",
      () => (this.touchJumpQueued = true),
      null,
      0x2e7d32,
    );
    const drinkBtn = makeBtn(
      drinkX,
      "G",
      () => {
        if (this.showDrinkPrompt && this.wins < 3 && !this.inCombat) {
          this.handleCombat();
        }
      },
      null,
      0x6a1b9a,
    );

    this.touchButtons = { leftBtn, rightBtn, jumpBtn, drinkBtn };
  }

  cleanupControls() {
    if (!this.touchButtons) return;
    for (const b of Object.values(this.touchButtons)) {
      if (!b) continue;
      if (b.rect) b.rect.disableInteractive();
      if (b.cont) b.cont.destroy();
    }
    this.touchButtons = null;
    this.touchLeft = false;
    this.touchRight = false;
    this.touchJumpQueued = false;
  }

  update(time, delta) {
    const dt = delta;
    const width = this.scale.width;
    const prevX = this.player.x;

    // Rainbow color phase advances based on current Segis value
    // Segis animation speed scales with current segis value
    const segisValue = segis.get();
    const speed = LEVEL1_CFG.segisColorSpeedMul * segisValue;
    this.segisColorPhase += speed * dt;
    segis.update(dt);

    // Apply scaling first so collision math uses visual size
    const scaleFactor = this.getScaleFactor(this.player.x, width);
    this.player.setDisplaySize(
      this.frameWidth * scaleFactor,
      this.frameHeight * scaleFactor,
    );

    // We'll compute collision rectangles right before use to avoid stale values after movement

    // Drink prompt trigger zone
    const fridgeXMin = width * LEVEL1_CFG.fridgeZone.minFrac;
    const fridgeXMax = width * LEVEL1_CFG.fridgeZone.maxFrac;
    const canDrink = this.wins < 3 && !this.didDrink;
    this.showDrinkPrompt =
      this.player.x >= fridgeXMin && this.player.x <= fridgeXMax && canDrink;

    // Movement (keyboard + touch), allows jump while moving
    const leftPressed = this.cursors.left.isDown || this.touchLeft;
    const rightPressed = this.cursors.right.isDown || this.touchRight;
    if (leftPressed) {
      this.player.x -= this.playerSpeed;
      this.facingRight = false;
    }
    if (rightPressed) {
      this.player.x += this.playerSpeed;
      this.facingRight = true;
    }

    // Jump (keyboard + touch) — works while moving
    const jumpRequested =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.touchJumpQueued;
    if (jumpRequested && !this.isJumping) {
      this.velocityY = this.jumpStrength;
      this.isJumping = true;
    }
    this.touchJumpQueued = false;

    this.velocityY += this.gravity;
    this.player.y += this.velocityY;

    // Floor collision (slope)
    // Compute floor Y at current X along the slope
    const floorY = this.getFloorY(this.player.x);

    if (this.player.y + this.player.displayHeight >= floorY) {
      this.player.y = floorY - this.player.displayHeight;
      this.velocityY = 0;
      this.isJumping = false;
    }

    // Block collision
    const rectNowForBlock = new Phaser.Geom.Rectangle(
      this.player.x,
      this.player.y,
      this.player.displayWidth,
      this.player.displayHeight,
    );
    if (
      Phaser.Geom.Intersects.RectangleToRectangle(
        rectNowForBlock,
        this.blockRect,
      )
    ) {
      const dx = this.player.x - prevX;
      if (dx > 0) {
        // moving right: keep player to the left of the block
        this.player.x = this.blockRect.x - this.player.displayWidth;
      } else if (dx < 0) {
        // moving left: keep player to the right of the block
        this.player.x = this.blockRect.x + this.blockRect.width;
      } else {
        // no horizontal movement: resolve by proximity to closest side
        const playerCenter = this.player.x + this.player.displayWidth / 2;
        const wallCenter = this.blockRect.x + this.blockRect.width / 2;
        if (playerCenter < wallCenter) {
          this.player.x = this.blockRect.x - this.player.displayWidth;
        } else {
          this.player.x = this.blockRect.x + this.blockRect.width;
        }
      }
      this.player.y = floorY - this.player.displayHeight;
      this.velocityY = 0;
      this.isJumping = false;
    }

    // End trigger: go to Level2 only when touching the end block (after the door)
    const rectNowForEnd = new Phaser.Geom.Rectangle(
      this.player.x,
      this.player.y,
      this.player.displayWidth,
      this.player.displayHeight,
    );
    if (
      Phaser.Geom.Intersects.RectangleToRectangle(
        rectNowForEnd,
        this.endBlockRect,
      )
    ) {
      this.scene.start("Level2");
      return;
    }

    // Scene switch with SPACE
    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      this.scene.start("Intro");
    }

    // G to drink
    if (
      Phaser.Input.Keyboard.JustDown(this.keyG) &&
      this.showDrinkPrompt &&
      this.wins < 3
    ) {
      this.handleCombat();
      this.showDrinkPrompt = false;
    }

    // Player image switching (drunk > jump > standing)
    if (this.didDrink) {
      this.player.setTexture(this.didDrinkImage);
      this.playerSpeed = 3;
    } else if (this.isJumping) {
      this.player.setTexture(this.jumpImage);
      this.player.flipX = !this.facingRight;
    } else {
      this.player.setTexture(this.standingImage);
      this.player.flipX = !this.facingRight;
    }

    // Scaling already applied above

    // Drink prompt UI
    if (this.showDrinkPrompt) {
      this.createPromptUI();
      this.promptText.setText("Press G to drink a potion.");
    } else {
      this.destroyPromptUI();
    }

    // Update Segis HUD with rainbow color
    const segVal = segisValue; // reuse value fetched earlier
    const rgb = getRainbowColor(this.segisColorPhase % 1);
    const hex = `#${rgb.r.toString(16).padStart(2, "0")}${rgb.g
      .toString(16)
      .padStart(2, "0")}${rgb.b.toString(16).padStart(2, "0")}`;
    if (this.segisText) {
      this.segisText.setText(`Segis: ${segVal}`);
      this.segisText.setColor(hex);
    }
  }

  // Unified cleanup: mobile controls, prompt UI, and hotkeys
  cleanupScene() {
    this.cleanupControls && this.cleanupControls();
    this.destroyPromptUI && this.destroyPromptUI();
    if (this._hotkeys) {
      const { goIntro, goL1, goL2 } = this._hotkeys;
      this.input.keyboard.off("keydown-ONE", goIntro, this);
      this.input.keyboard.off("keydown-TWO", goL1, this);
      this.input.keyboard.off("keydown-THREE", goL2, this);
      this._hotkeys = null;
    }
  }
}
