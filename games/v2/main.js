// v2 entry point:
// - BootScene registers handy hotkeys and starts the Intro cutscene
// - Phaser game config wires all scenes together
// - Phaser is loaded globally via a <script> tag in games/v2/index.html
import Level1 from "./scenes/level1.js";
import { Level2 } from "./scenes/level2.js";
import { IntroCutscene } from "./cutscenes/intro.js";
import Combat from "./core/combat.js";
import { Level3 } from "./scenes/level3.js";

// Lightweight HUD with tappable scene buttons (helps on mobile)
class HUDScene extends Phaser.Scene {
  constructor() { super("HUD"); }
  create() {
    // Ensure HUD is on top of other scenes
    this.scene.bringToTop();

    const w = this.scale.width;
    const h = this.scale.height;
    const pad = 8;
    const btnW = 60;
    const btnH = 34;
    const gap = 8;
    const labels = [
      { key: 'Intro', text: 'Intro' },
      { key: 'Level1', text: 'L1' },
      { key: 'Level2', text: 'L2' },
      { key: 'Level3', text: 'L3' },
    ];

    const totalW = labels.length * btnW + (labels.length - 1) * gap + pad * 2;
    const x0 = (w - totalW) / 2 + pad;
    const y0 = h - btnH - 10;

    // Background bar
    const bar = this.add.rectangle(w / 2, y0 + btnH / 2, totalW, btnH + pad * 2, 0x000000, 0.35)
      .setScrollFactor(0)
      .setDepth(9999)
      .setInteractive();

    // Buttons
    labels.forEach((item, i) => {
      const bx = x0 + i * (btnW + gap) + btnW / 2;
      const by = y0 + btnH / 2;
      const r = this.add.rectangle(bx, by, btnW, btnH, 0x1f2937, 0.7)
        .setStrokeStyle(1, 0x9ca3af, 0.9)
        .setScrollFactor(0)
        .setDepth(10000)
        .setInteractive({ useHandCursor: true });
      const t = this.add.text(bx, by, item.text, {
        fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#e5e7eb'
      }).setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(10001)
        .setInteractive({ useHandCursor: true });

      const go = () => {
        try { startScene(item.key); } catch (e) { /* noop */ }
      };
      r.on('pointerup', go);
      t.on('pointerup', go);
    });

    // Reposition HUD on resize
    this.scale.on('resize', (sz) => this.scene.restart());
  }
}

class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  create() {
    // Launch HUD (mobile-friendly scene switcher), then start with cutscene
    this.scene.launch("HUD");
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
  scene: [BootScene, HUDScene, IntroCutscene, Level1, Level2, Combat, Level3],
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
