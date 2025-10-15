import { StoryTeller } from "../core/storytelling.js";

export class IntroCutscene extends Phaser.Scene {
  constructor() {
    super({ key: "Intro" });
    this.timer = 0;
    this.textAlpha = 1;
    this.textFadeDuration = 1000;
    this.foxPos = { x: 360, y: 580 };
    this.foxState = "silent"; // silent, talking, flipping, walking
    this.storyteller = null;
  }

  preload() {
    this.load.setPath("assets/");
    this.load.image("backgroundSofa", "backgrounds/sofa.png");
    this.load.image("foxStanding", "fromSide/foxStanding.png");
    this.load.image("foxTired", "fromSide/tiredFox.png");
    this.load.image("foxFrown", "fromSide/frownFox.png");
  }

  create() {
    const { width, height } = this.scale;

    // Reinit state to ensure consistent fade behavior when returning here
    this.timer = 0;
    this.textAlpha = 1;
    this.foxPos = { x: 360, y: 580 - 60 }; // include the visual offset applied later
    this.foxState = "silent";
    this.storyteller = null;

    // Intro text
    this.introText = this.add
      .text(width / 2, height / 2 - 100, "Perustuu tositapahtumiin...", {
        fontFamily: "sans-serif",
        fontSize: "40px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0.5);

    // Background (hidden until text fades)
    this.background = this.add
      .image(width / 2, height / 2, "backgroundSofa")
      .setDisplaySize(width, height)
      .setVisible(false);

    // Fox sprites
    // Increase size slightly (position already has the 60px offset applied)
    this.foxTired = this.add
      .image(this.foxPos.x, this.foxPos.y, "foxTired")
      .setDisplaySize(110, 77)
      .setVisible(false);
    this.foxFrown = this.add
      .image(this.foxPos.x, this.foxPos.y, "foxFrown")
      .setDisplaySize(110, 77)
      .setVisible(false);

    // Flip the tired fox vertically (like in pygame)
    this.foxTiredFlipped = this.add
      .image(this.foxPos.x, this.foxPos.y, "foxTired")
      .setDisplaySize(110, 77)
      .setFlipY(true)
      .setVisible(false);

    // Keyboard
    this.enterKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER,
    );

    this.timer = 0;

    // Global hotkeys: 1->Intro, 2->Level1, 3->Level2
    this.input.keyboard.on("keydown-ONE", () => this.scene.start("Intro"));
    this.input.keyboard.on("keydown-TWO", () => this.scene.start("Level1"));
    this.input.keyboard.on("keydown-THREE", () => this.scene.start("Level2"));
  }

  update(time, delta) {
    const dt = delta;

    // Handle enter → skip to level1
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.scene.start("Level1");
    }

    this.timer += dt;

    // Fade out intro text
    if (this.timer > 1000 && this.textAlpha > 0) {
      this.textAlpha -= dt / this.textFadeDuration;
      if (this.textAlpha < 0) this.textAlpha = 0;
      this.introText.setAlpha(this.textAlpha);
      if (this.textAlpha === 0) {
        this.background.setVisible(true);
      }
    }

    // State switching
    if (this.timer < 3000) {
      this.foxState = "silent";
    } else if (this.timer < 6500) {
      this.foxState = "talking";
    } else if (this.timer < 8000) {
      this.foxState = "flipping";
    } else {
      this.foxState = "walking";
    }

    // Start storyteller when talking starts
    if (this.foxState === "talking" && !this.storyteller) {
      this.storyteller = new StoryTeller(
        this,
        "The wizard Fox awakens to the new day...",
      );
    }
    if (this.storyteller) {
      this.storyteller.update(dt);
    }

    // Update fox positions / visibility
    this.foxTired.setVisible(false);
    this.foxFrown.setVisible(false);
    this.foxTiredFlipped.setVisible(false);

    if (this.textAlpha === 0) {
      if (this.foxState === "silent") {
        this.foxTiredFlipped
          .setPosition(this.foxPos.x, this.foxPos.y)
          .setVisible(true);
      } else if (this.foxState === "talking") {
        this.foxTiredFlipped
          .setPosition(this.foxPos.x, this.foxPos.y)
          .setVisible(true);
      } else if (this.foxState === "flipping") {
        this.foxTired
          .setPosition(this.foxPos.x, this.foxPos.y)
          .setVisible(true);
      } else if (this.foxState === "walking") {
        this.foxPos.x += 7;
        this.foxFrown
          .setPosition(this.foxPos.x, this.foxPos.y)
          .setVisible(true);

        // Draw "Potions..." bubble
        this.drawTalkBubble(
          this.foxPos.x + 140,
          this.foxPos.y - 70,
          "Potions...",
        );
      }
    }

    // End scene after 12s
    if (this.timer > 12000) {
      this.scene.start("Level1");
    }
  }

  drawTalkBubble(x, y, text) {
    const graphics = this.add.graphics();
    const bubbleWidth = 150;
    const bubbleHeight = 40;
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRoundedRect(x, y, bubbleWidth, bubbleHeight, 10);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.strokeRoundedRect(x, y, bubbleWidth, bubbleHeight, 10);

    const bubbleText = this.add.text(x + 20, y + 8, text, {
      fontFamily: "sans-serif",
      fontSize: "18px",
      color: "#141414",
    });

    // Remove after one frame to avoid duplicates
    this.events.once("postupdate", () => {
      graphics.destroy();
      bubbleText.destroy();
    });
  }
}
