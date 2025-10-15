// Module entry: only selects which scene to run
import Level1 from "./scenes/level1.js";
import { Level2Scene } from "./scenes/level2.js";
import { IntroCutscene } from "./cutscenes/intro.js";

class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  create() {
    // Hotkeys for testing
    this.input.keyboard.on("keydown-ONE", () => this.scene.start("Intro"));
    this.input.keyboard.on("keydown-TWO", () => this.scene.start("Level1"));
    this.input.keyboard.on("keydown-THREE", () => this.scene.start("Level2"));
    // Start with cutscene
    this.scene.start("Intro");
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  pixelArt: true,
  backgroundColor: "#1d1d1d",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: "arcade", arcade: { debug: false } },
  scene: [BootScene, IntroCutscene, Level1, Level2Scene],
};

new Phaser.Game(config);
