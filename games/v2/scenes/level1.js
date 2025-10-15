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

    this.player = this.add.image(width * 0.25, 700, "frownFox");
    this.player.setOrigin(0);
    this.player.setDisplaySize(200, 140);

    this.frameWidth = 200;
    this.frameHeight = 140;

    // Floor slope points
    this.floorStart = { x: 0, y: 710 };
    this.floorEnd = { x: 1000, y: 780 };

    // Block collision rect
    this.blockRect = new Phaser.Geom.Rectangle(width * 0.17, 0, 5, 800);

    // End rect
    this.endBlockRect = new Phaser.Geom.Rectangle(width + 100, 700, 10, 200);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyG = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G);
    this.keySpace = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );

    this.font = { font: "24px Arial", fill: "#ffffff" };

    this.jumpImage = "foxJump";
    this.standingImage = "foxStanding";
    this.didDrinkImage = "foxDidDrink";
  }

  handleCombat() {
    // TODO: Replace with your Combat implementation in JS
    const result = Math.random() > 0.5 ? "win" : "lose"; // stub
    if (result === "win") {
      this.didDrink = false;
      this.player.setTexture(this.standingImage);
      segis.add(5);
      this.wins++;
      console.log(`Wins: ${this.wins}`);
    } else {
      this.didDrink = true;
      this.player.setTexture(this.didDrinkImage);
      this.playerSpeed = 0;

      // Fade to black
      const fade = this.add
        .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000)
        .setOrigin(0)
        .setAlpha(0);
      this.tweens.add({
        targets: fade,
        alpha: 1,
        duration: 800,
        onComplete: () => {
          this.add.text(
            this.scale.width / 4,
            this.scale.height / 3.5,
            "Ei bisse maistu, huomenna uus yritys.",
            this.font,
          );
          this.time.delayedCall(3500, () => {
            this.scene.start("Intro");
          });
        },
      });

      segis.reset();
    }
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
    const fridgeXMin = width * 0.5;
    const fridgeXMax = width * 0.65;
    if (
      this.player.x >= fridgeXMin &&
      this.player.x <= fridgeXMax &&
      !this.didDrink
    ) {
      this.showDrinkPrompt = true;
    } else {
      this.showDrinkPrompt = false;
    }

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

    // End trigger
    if (
      Phaser.Geom.Intersects.RectangleToRectangle(playerRect, this.endBlockRect)
    ) {
      this.scene.start("Level2");
    }

    // Scene switch with SPACE
    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      this.scene.start("Intro");
    }

    // G to drink
    if (Phaser.Input.Keyboard.JustDown(this.keyG) && this.showDrinkPrompt) {
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
      if (!this.promptRect) {
        this.promptRect = this.add
          .rectangle(525, 180, 350, 60, 0xe6e6e6)
          .setStrokeStyle(2, 0x000000)
          .setOrigin(0.5);
        this.promptText = this.add
          .text(0, 0, "", { font: "20px Arial", fill: "#000" })
          .setOrigin(0.5);
        this.promptContainer = this.add.container(525, 180, [
          this.promptRect,
          this.promptText,
        ]);
      }
      if (this.wins < 3) {
        this.promptText.setText("Juo bisse. Paina G");
      } else {
        this.promptText.setText("Pitää hakee lisää bissee");
        this.showDrinkPrompt = false;
      }
    } else if (this.promptContainer) {
      this.promptContainer.destroy();
      this.promptContainer = null;
    }
  }
}
