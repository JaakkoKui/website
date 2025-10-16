// Level 1: side-view room with a sloped floor and a door to Level 2.
// - Move with arrows, jump with Up, drink at the fridge with G (limited times)
// - Segis HUD shows a value that changes over time
// Phaser is loaded globally via <script> in index.html
// Import combat system and segis utilities
import Combat from "../core/combat.js";
import { segis, getRainbowColor } from "../core/segis.js";

export default class Level1 extends Phaser.Scene {
  constructor() {
    super({ key: "Level1" });
    this.segisColorPhase = 0.0;
    this.playerSpeed = 6;
    this.gravity = 0.5;
    this.velocityY = 0;
    this.jumpStrength = -10;
    this.isJumping = false;
    this.facingRight = true;
    this.showDrinkPrompt = false;
    this.didDrink = false;
    this.wins = 0;
    this.inCombat = false;

    // Mobile controls state
    this.touchLeft = false;
    this.touchRight = false;
    this.touchJumpQueued = false; // one-shot on tap
    this.touchButtons = null; // containers map for cleanup
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
    this.player.setDisplaySize(200, 140);

    // Base logical size; visual size is scaled during update for fake depth
    this.frameWidth = 200;
    this.frameHeight = 140;

    // Floor slope points (linear interpolation used to place the feet on the floor)
    this.floorStart = { x: 0, y: 510 };
    this.floorEnd = { x: 1000, y: 710 };

    // Thin blocker at left to prevent walking into the wall
    this.blockRect = new Phaser.Geom.Rectangle(width * 0.13, 0, 5, 800);

    // End rect: AFTER the door (beyond right edge) so transition happens after exiting
    this.endBlockRect = new Phaser.Geom.Rectangle(
      width + 300,
      this.floorEnd.y - 200,
      10,
      220,
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
      .text(15, 15, "Segis: 0", { font: "20px Arial", color: "#ffffff" })
      .setScrollFactor(0);

    // Global debug hotkeys: 1->Intro, 2->Level1, 3->Level2
    this.input.keyboard.on("keydown-ONE", () => this.scene.start("Intro"));
    this.input.keyboard.on("keydown-TWO", () => this.scene.start("Level1"));
    this.input.keyboard.on("keydown-THREE", () => this.scene.start("Level2"));

    // Mobile controls
    this.createMobileControls();

    // Cleanup on shutdown/destroy
    this.events.once("shutdown", this.cleanupControls, this);
    this.events.once("destroy", this.cleanupControls, this);
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
    this.promptRect = this.add
      .rectangle(525, 180, 350, 60, 0xe6e6e6)
      .setStrokeStyle(2, 0x000000)
      .setOrigin(0.5);
    this.promptText = this.add
      .text(0, 0, "", { font: "20px Arial", fill: "#0dff00ff" })
      .setOrigin(0.5);
    this.promptContainer = this.add.container(525, 180, [
      this.promptRect,
      this.promptText,
    ]);
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
                level.playerSpeed = 7;
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

  // --- Mobile controls ----------------------------------------------------
  createMobileControls() {
    const { width, height } = this.scale;
    const btnW = 84;
    const btnH = 72;
    const gap = 12;
    const y = height - btnH / 2 - 16;

    const makeButton = (x, label, onDown, onUp, color = 0x222222) => {
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

    // Left/right on bottom left
    const leftX = 20 + btnW / 2;
    const rightX = leftX + btnW + gap;
    const leftBtn = makeButton(
      leftX,
      "◀",
      () => (this.touchLeft = true),
      () => (this.touchLeft = false),
    );
    const rightBtn = makeButton(
      rightX,
      "▶",
      () => (this.touchRight = true),
      () => (this.touchRight = false),
    );

    // Jump on bottom right
    const jumpX = width - (20 + btnW / 2);
    const jumpBtn = makeButton(
      jumpX,
      "⤴",
      () => (this.touchJumpQueued = true),
      null,
      0x2e7d32,
    );

    // Optional: Drink button near jump (only active near fridge)
    const drinkX = jumpX - (btnW + gap);
    const drinkBtn = makeButton(
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
    const all = Object.values(this.touchButtons);
    for (const b of all) {
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
    const height = this.scale.height;
    const prevX = this.player.x;

    // Rainbow color phase advances based on current Segis value
    const segisValue = segis.get();
    const speed = 0.000005 * segisValue;
    this.segisColorPhase += speed * dt;
    segis.update(dt);

    // Apply scaling first so collision math uses visual size
    const minScale = 0.6;
    const maxScale = 1.6;
    const t = Phaser.Math.Clamp(this.player.x / Math.max(width, 1), 0, 1);
    const scaleFactor = minScale + (maxScale - minScale) * t;
    this.player.setDisplaySize(
      this.frameWidth * scaleFactor,
      this.frameHeight * scaleFactor,
    );

    // We'll compute collision rectangles right before use to avoid stale values after movement

    // Drink prompt trigger zone
    const fridgeXMin = width * 0.48;
    const fridgeXMax = width * 0.68;
    const canDrink = this.wins < 3 && !this.didDrink;
    this.showDrinkPrompt =
      this.player.x >= fridgeXMin && this.player.x <= fridgeXMax && canDrink;

    // Movement
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

    // Jump
    const jumpRequested =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.touchJumpQueued;
    if (jumpRequested && !this.isJumping) {
      this.velocityY = this.jumpStrength;
      this.isJumping = true;
    }
    // consume touch jump if queued
    this.touchJumpQueued = false;

    this.velocityY += this.gravity;
    this.player.y += this.velocityY;

    // Floor collision (slope)
    const { x: x0, y: y0 } = this.floorStart;
    const { x: x1, y: y1 } = this.floorEnd;
    const floorY = y0 + ((y1 - y0) * (this.player.x - x0)) / (x1 - x0);

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
      this.promptText.setText("Juo bisse. Paina G");
    } else {
      this.destroyPromptUI();
    }

    // Update Segis HUD with rainbow color
    const segVal = segis.get();
    const rgb = getRainbowColor(this.segisColorPhase % 1);
    const hex = `#${rgb.r.toString(16).padStart(2, "0")}${rgb.g
      .toString(16)
      .padStart(2, "0")}${rgb.b.toString(16).padStart(2, "0")}`;
    if (this.segisText) {
      this.segisText.setText(`Segis: ${segVal}`);
      this.segisText.setColor(hex);
    }
  }
}
