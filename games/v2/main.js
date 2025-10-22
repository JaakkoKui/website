// v2 entry point:
// - BootScene registers handy hotkeys and starts the Intro cutscene
// - Phaser game config wires all scenes together
// - Phaser is loaded globally via a <script> tag in games/v2/index.html
import Level1 from "./scenes/level1.js";
import { Level2 } from "./scenes/level2.js";
import { IntroCutscene } from "./cutscenes/intro.js";
import Combat from "./core/combat.js";
import { Level3 } from "./scenes/level3.js";

class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  create() {
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
  scene: [BootScene, IntroCutscene, Level1, Level2, Combat, Level3],
};

const game = new Phaser.Game(config);

// Global scene hotkeys (work in every scene)
// 1 -> Intro, 2 -> Level1, 3 -> Level2, 4 -> Level3
function startScene(key) {
  try {
    if (game && game.scene && game.scene.keys && game.scene.keys[key]) {
      game.scene.start(key);
    }
  } catch (e) {
    // noop
  }
}

function handleHotkeys(e) {
  // Ignore when typing in inputs or with modifiers pressed
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.altKey || e.ctrlKey || e.metaKey) return;

  switch (e.code) {
    case 'Digit1':
    case 'Numpad1':
      e.preventDefault();
      startScene('Intro');
      break;
    case 'Digit2':
    case 'Numpad2':
      e.preventDefault();
      startScene('Level1');
      break;
    case 'Digit3':
    case 'Numpad3':
      e.preventDefault();
      startScene('Level2');
      break;
    case 'Digit4':
    case 'Numpad4':
      e.preventDefault();
      startScene('Level3');
      break;
    default:
      break;
  }
}

window.addEventListener('keydown', handleHotkeys);
