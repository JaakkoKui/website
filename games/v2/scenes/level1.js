// Level 1: side-view room with a sloped floor and a door to Level 2.
// Move with arrows (or touch on phones), jump with Up/touch, drink with G near the fridge.
import Combat from "../core/combat.js";
import { segis, getRainbowColor } from "../core/segis.js";
import {
  GAME_BASE_HEIGHT,
  GAME_BASE_WIDTH,
} from "../core/constants.js";

// Central configuration for Level 1: tweak values here (sizes, physics, zones)
const LEVEL1_CFG = {
  frame: { width: 200, height: 140 },
  floor: { start: { x: 0, y: 510 }, end: { x: 1000, y: 710 } },
  block: { xFrac: 0.13, width: 5, height: 800 },
  endBlock: { offsetX: 300, width: 10, height: 220 },
  scale: { min: 0.6, max: 1.6 },
  fridgeZone: { minFrac: 0.48, maxFrac: 0.68 },
  physics: { gravity: 0.2, jumpStrength: -8 },
  speed: { base: 2, drunk: 1 },
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
    this.viewWidth = GAME_BASE_WIDTH;
    this.viewHeight = GAME_BASE_HEIGHT;
    this.playerXRatio = 0.32;
    this.spriteScale = 1;
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
    this.background = this.add
      .image(0, 0, "background")
      .setOrigin(0, 0);

    this.player = this.add.image(0, 0, "frownFox").setOrigin(0, 0);
    this.player.setDisplaySize(LEVEL1_CFG.frame.width, LEVEL1_CFG.frame.height);

    this.frameWidth = LEVEL1_CFG.frame.width;
    this.frameHeight = LEVEL1_CFG.frame.height;

    this.floorStart = { ...LEVEL1_CFG.floor.start };
    this.floorEnd = { ...LEVEL1_CFG.floor.end };

    this.blockRect = new Phaser.Geom.Rectangle(
      0,
      0,
      LEVEL1_CFG.block.width,
      LEVEL1_CFG.block.height,
    );

    this.endBlockRect = new Phaser.Geom.Rectangle(
      0,
      0,
      LEVEL1_CFG.endBlock.width,
      LEVEL1_CFG.endBlock.height,
    );

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyG = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G);
    this.keySpace = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );

    this.font = { font: "24px Arial", fill: "#ffffff" };

    this.jumpImage = "foxJump";
    this.standingImage = "frownFox";
    this.didDrinkImage = "foxDidDrink";
    this.didDrink = false;
    this.playerSpeed = LEVEL1_CFG.speed.base;

    this.segisText = this.add
      .text(15, 15, "Segis: 0", LEVEL1_CFG.hud.font)
      .setScrollFactor(0);

    const os =
      (this.sys &&
        this.sys.game &&
        this.sys.game.device &&
        this.sys.game.device.os) ||
      {};
    this.isPhone = !!(os.android || os.iOS);
    this.input.addPointer(3);

    this.applyLayout(this.scale.gameSize);

    if (this.isPhone) {
      this.recreateMobileControls();
    }

    this.events.once("shutdown", this.cleanupScene, this);
    this.events.once("destroy", this.cleanupScene, this);
    this.scale.on("resize", this.handleResize, this);

    this.player.y = this.getFloorY(this.player.x) - this.player.displayHeight;
  }

  applyLayout(gameSize) {
    const width = gameSize?.width ?? this.scale.gameSize.width ?? GAME_BASE_WIDTH;
    const height = gameSize?.height ?? this.scale.gameSize.height ?? GAME_BASE_HEIGHT;

    const previousWidth = this.viewWidth || width;
    let ratio = this.playerXRatio;
    if (previousWidth > 0 && this.player.displayWidth > 0) {
      ratio = (this.player.x + this.player.displayWidth / 2) / previousWidth;
    }

    this.viewWidth = width;
    this.viewHeight = height;
    this.playerXRatio = ratio ?? this.playerXRatio;

    const scaleX = width / GAME_BASE_WIDTH;
    const scaleY = height / GAME_BASE_HEIGHT;
    this.spriteScale = Math.min(scaleX, scaleY);

    if (this.background) {
      this.background.setDisplaySize(width, height);
    }

    const playerDisplayWidth = LEVEL1_CFG.frame.width * this.spriteScale;
    const playerDisplayHeight = LEVEL1_CFG.frame.height * this.spriteScale;
    const halfRatio = playerDisplayWidth / 2 / Math.max(width, 1);
    const edgeMargin = 0.02;
    const minRatio = Math.min(0.98, Math.max(halfRatio + edgeMargin, edgeMargin));
    const maxRatio = Math.max(minRatio, 1 - halfRatio - edgeMargin);
    this.playerXRatio = Phaser.Math.Clamp(
      this.playerXRatio ?? 0.5,
      minRatio,
      maxRatio,
    );
    this.player
      .setDisplaySize(playerDisplayWidth, playerDisplayHeight)
      .setPosition(width * this.playerXRatio - playerDisplayWidth / 2, this.player.y);

    this.frameWidth = LEVEL1_CFG.frame.width;
    this.frameHeight = LEVEL1_CFG.frame.height;

    this.floorStart = {
      x: LEVEL1_CFG.floor.start.x * scaleX,
      y: LEVEL1_CFG.floor.start.y * scaleY,
    };
    this.floorEnd = {
      x: LEVEL1_CFG.floor.end.x * scaleX,
      y: LEVEL1_CFG.floor.end.y * scaleY,
    };

    const blockWidth = Math.max(LEVEL1_CFG.block.width * scaleX, 2);
    const blockHeight = LEVEL1_CFG.block.height * scaleY;
    this.blockRect.setTo(
      width * LEVEL1_CFG.block.xFrac,
      0,
      blockWidth,
      blockHeight,
    );

    this.endBlockRect.setTo(
      width + LEVEL1_CFG.endBlock.offsetX * scaleX,
      this.floorEnd.y - 200 * scaleY,
      Math.max(LEVEL1_CFG.endBlock.width * scaleX, 4),
      LEVEL1_CFG.endBlock.height * scaleY,
    );

    const speedScale = Phaser.Math.Clamp(scaleX, 0.55, 1.15);
    const gravityScale = Phaser.Math.Clamp(scaleY, 0.75, 1.25);
    this.playerSpeed = LEVEL1_CFG.speed.base * speedScale;
    this.gravity = LEVEL1_CFG.physics.gravity * gravityScale;
    this.jumpStrength = LEVEL1_CFG.physics.jumpStrength * gravityScale;

    this.player.y = this.getFloorY(this.player.x) - this.player.displayHeight;

    if (this.segisText) {
      this.segisText.setFontSize(
        `${Phaser.Math.Clamp(Math.round(18 * this.spriteScale), 14, 22)}px`,
      );
    }

    this.refreshPromptUI();
  }

  handleResize(gameSize) {
    this.applyLayout(gameSize);
    if (this.isPhone) {
      this.recreateMobileControls();
    }
  }

  ensureCombatRegistered() {
    const mgr = this.scene.manager;
    if (!mgr.keys || !mgr.keys["Combat"]) {
      this.scene.add("Combat", Combat, false);
    }
  }

  // --- UI helpers for the fridge prompt ---
  createPromptUI() {
    if (!this.promptContainer) {
      const cont = this.add.container(0, 0).setDepth(1000).setScrollFactor(0);
      const graphics = this.add.graphics();
      cont.add(graphics);
      const text = this.add
        .text(0, 0, "", {
          font: "20px Arial",
          fill: "#096904ff",
        })
        .setOrigin(0.5);
      cont.add(text);

      this.promptContainer = cont;
      this.promptRect = graphics;
      this.promptText = text;
    }

    this.refreshPromptUI();
  }

  destroyPromptUI() {
    if (!this.promptContainer) return;
    if (this.promptRect) {
      this.promptRect.destroy();
    }
    if (this.promptText) {
      this.promptText.destroy();
    }
    this.promptContainer.destroy();
    this.promptContainer = null;
    this.promptRect = null;
    this.promptText = null;
  }

  refreshPromptUI() {
    if (!this.promptRect || !this.promptText || !this.promptContainer) return;

  const bubbleWidth = Math.round(Phaser.Math.Clamp(340 * this.spriteScale, 220, 380));
  const bubbleHeight = Math.round(Phaser.Math.Clamp(68 * this.spriteScale, 46, 88));
    const radius = Math.min(bubbleWidth, bubbleHeight) * 0.28;

    this.promptRect.clear();
    this.promptRect.fillStyle(0xe6e6e6, 0.95);
    this.promptRect.lineStyle(2, 0x000000, 1);
    this.promptRect.fillRoundedRect(
      -bubbleWidth / 2,
      -bubbleHeight / 2,
      bubbleWidth,
      bubbleHeight,
      radius,
    );
    this.promptRect.strokeRoundedRect(
      -bubbleWidth / 2,
      -bubbleHeight / 2,
      bubbleWidth,
      bubbleHeight,
      radius,
    );

    const fontSize = Phaser.Math.Clamp(Math.round(20 * this.spriteScale), 14, 22);
    this.promptText.setFontSize(fontSize);
    this.promptText.setWordWrapWidth(bubbleWidth * 0.82);

    this.positionPromptUI();
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
  recreateMobileControls() {
    this.cleanupControls();
    const width = this.viewWidth;
    const height = this.viewHeight;
    const scale = Math.max(width / GAME_BASE_WIDTH, 0.75);
    const btnW = Math.round(84 * scale);
    const btnH = Math.round(72 * scale);
    const gap = Math.round(12 * scale);
    const y = height - btnH / 2 - Math.round(16 * scale);

    const makeBtn = (x, label, onDown, onUp, color = 0x222222) => {
      const cont = this.add.container(x, y).setScrollFactor(0).setDepth(5000);
      const rect = this.add
        .rectangle(0, 0, btnW, btnH, color)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true });
      const txt = this.add
        .text(0, 0, label, {
          font: `${Math.max(18, Math.round(22 * scale))}px Arial`,
          fill: "#ffffff",
        })
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

    const leftX = 20 * scale + btnW / 2;
    const rightX = leftX + btnW + gap;
    const jumpX = width - (20 * scale + btnW / 2);
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
    const width = this.viewWidth;
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
      this.playerSpeed = 0;
    } else if (this.isJumping) {
      this.player.setTexture(this.jumpImage);
      this.player.flipX = !this.facingRight;
    } else {
      this.player.setTexture(this.standingImage);
      this.player.flipX = !this.facingRight;
    }

    if (this.viewWidth > 0) {
      this.playerXRatio = (this.player.x + this.player.displayWidth / 2) / this.viewWidth;
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

  // Unified cleanup: mobile controls and prompt UI
  cleanupScene() {
    if (this.scale) {
      this.scale.off("resize", this.handleResize, this);
    }
    this.cleanupControls && this.cleanupControls();
    this.destroyPromptUI && this.destroyPromptUI();
  }

  positionPromptUI() {
    if (!this.promptContainer) return;
    const cx = this.viewWidth * 0.64;
    const cy = this.viewHeight * 0.32;
    this.promptContainer.setPosition(cx, cy);
  }
}
