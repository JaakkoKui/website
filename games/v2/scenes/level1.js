// Phaser is loaded globally via <script> in index.html
// Import combat system and segis utilities
import Combat from "../core/combat.js";
import { segis, getRainbowColor } from "../core/segis.js";

export default class Level1 extends Phaser.Scene {
  constructor() {
    super({ key: "Level1" });
    this.segisColorPhase = 0.0;
    this.playerSpeed = 7;
    this.gravity = 0.5;
    this.velocityY = 0;
    this.jumpStrength = -10;
    this.isJumping = false;
    this.facingRight = true;
    this.showDrinkPrompt = false;
    this.didDrink = false;
    this.wins = 0;
    this.inCombat = false;
  }

  preload() {
    // Load images
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

    this.player = this.add.image(width * 0.25, 550, "frownFox");
    this.player.setOrigin(0);
    this.player.setDisplaySize(200, 140);

    this.frameWidth = 200;
    this.frameHeight = 140;

    // Floor slope points
    this.floorStart = { x: 0, y: 560 };
    this.floorEnd = { x: 1000, y: 630 };

    // Block collision rect
    this.blockRect = new Phaser.Geom.Rectangle(width * 0.17, 0, 5, 800);

    // End rect: place AFTER the door (beyond right edge) so transition happens after exiting
    this.endBlockRect = new Phaser.Geom.Rectangle(
      width + 150,
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
  }

  ensureCombatRegistered() {
    const mgr = this.scene.manager;
    if (!mgr.keys || !mgr.keys["Combat"]) {
      this.scene.add("Combat", Combat, false);
    }
  }

  handleCombat() {
    if (this.inCombat) return;
    this.inCombat = true;
    this.ensureCombatRegistered();

    // Match original Python behavior: one quick reaction round, 3s timeout
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
                  "Ei bisse maistu, huomenna uus yritys.",
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

  update(time, delta) {
    const dt = delta;
    const width = this.scale.width;
    const height = this.scale.height;

    const segisValue = segis.get();
    const speed = 0.000005 * segisValue;
    this.segisColorPhase += speed * dt;
    segis.update(dt);

    const playerRect = new Phaser.Geom.Rectangle(
      this.player.x,
      this.player.y,
      this.frameWidth,
      this.frameHeight,
    );

    // Drink prompt trigger zone
    const fridgeXMin = width * 0.48;
    const fridgeXMax = width * 0.68;
    const canDrink = this.wins < 3 && !this.didDrink;
    this.showDrinkPrompt =
      this.player.x >= fridgeXMin && this.player.x <= fridgeXMax && canDrink;

    // Movement
    if (this.cursors.left.isDown) {
      this.player.x -= this.playerSpeed;
      this.facingRight = false;
    }
    if (this.cursors.right.isDown) {
      this.player.x += this.playerSpeed;
      this.facingRight = true;
    }

    // Jump
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) && !this.isJumping) {
      this.velocityY = this.jumpStrength;
      this.isJumping = true;
    }

    this.velocityY += this.gravity;
    this.player.y += this.velocityY;

    // Floor collision (slope)
    const { x: x0, y: y0 } = this.floorStart;
    const { x: x1, y: y1 } = this.floorEnd;
    const floorY = y0 + ((y1 - y0) * (this.player.x - x0)) / (x1 - x0);

    if (this.player.y + this.frameHeight >= floorY) {
      this.player.y = floorY - this.frameHeight;
      this.velocityY = 0;
      this.isJumping = false;
    }

    // Block collision
    if (
      Phaser.Geom.Intersects.RectangleToRectangle(playerRect, this.blockRect)
    ) {
      if (this.facingRight) {
        this.player.x = this.blockRect.x - this.frameWidth;
      } else {
        this.player.x = this.blockRect.x + this.blockRect.width;
      }
      this.player.y = floorY - this.frameHeight;
      this.velocityY = 0;
      this.isJumping = false;
    }

    // End trigger: go to Level2 only when touching the end block (after the door)
    if (
      Phaser.Geom.Intersects.RectangleToRectangle(playerRect, this.endBlockRect)
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

    // Player image switching
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

    // Scale player based on x position
    const minScale = 0.6;
    const maxScale = 1.6;
    const scaleFactor =
      minScale + (maxScale - minScale) * (this.player.x / Math.max(width, 1));
    this.player.setDisplaySize(
      this.frameWidth * scaleFactor,
      this.frameHeight * scaleFactor,
    );

    // Drink prompt UI
    if (this.showDrinkPrompt) {
      if (!this.promptContainer) {
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
      this.promptText.setText("Juo bisse. Paina G");
    } else if (this.promptContainer) {
      this.promptContainer.destroy();
      this.promptContainer = null;
      this.promptRect = null;
      this.promptText = null;
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
