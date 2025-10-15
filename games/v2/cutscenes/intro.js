export class IntroCutscene extends Phaser.Scene {
  constructor() {
    super("Intro");
  }
  preload() {
    this.load.setPath("assets/");
    this.load.image("sofa", "sofa.png");
  }
  create() {
    let bg;
    if (this.textures.exists("sofa")) {
      bg = this.add.image(0, 0, "sofa").setOrigin(0).setAlpha(0);
      this.tweens.add({
        targets: bg,
        alpha: 1,
        duration: 800,
        ease: "sine.out",
      });
    } else {
      // Fallback background if sofa.png is missing
      const g = this.add.graphics();
      g.fillStyle(0x222244, 1).fillRect(
        0,
        0,
        this.scale.width,
        this.scale.height,
      );
      bg = g;
    }

    this.add
      .text(20, 20, "Intro cutscene… (Space to skip)", { color: "#fff" })
      .setScrollFactor(0);

    // Auto-advance after 5s or Space to skip
    this.time.delayedCall(5000, () => this.scene.start("Level1"));
    this.input.keyboard.once("keydown-SPACE", () => this.scene.start("Level1"));
  }
}
