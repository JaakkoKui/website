import Level1 from "./scenes/level1.js";
import { Level2 } from "./scenes/level2.js";
import { IntroCutscene } from "./cutscenes/intro.js";
import Combat from "./core/combat.js";
import { Level3 } from "./scenes/level3.js";
import {
  GAME_BASE_WIDTH,
  GAME_BASE_HEIGHT,
} from "./core/constants.js";

const SCENE_KEYS = ["Intro", "Level1", "Level2", "Level3"];
const MANAGED_SCENES = [...SCENE_KEYS, "Combat"];
const HOTKEYS = {
  Digit1: "Intro",
  Numpad1: "Intro",
  Digit2: "Level1",
  Numpad2: "Level1",
  Digit3: "Level2",
  Numpad3: "Level2",
  Digit4: "Level3",
  Numpad4: "Level3",
};

// Lightweight HUD with tappable scene buttons (helps on mobile)
class HUDScene extends Phaser.Scene {
  constructor() { super("HUD"); }
  create() {
    this.scene.bringToTop();

    const w = this.scale.width;
    const h = this.scale.height;
    const widthRatio = Math.max(w / GAME_BASE_WIDTH, 0.5);
    const pad = Math.max(6, Math.round(12 * widthRatio));
    const btnW = Math.max(64, Math.round(110 * widthRatio));
    const btnH = Math.max(32, Math.round(46 * widthRatio));
    const gap = Math.max(6, Math.round(14 * widthRatio));
    const labels = SCENE_KEYS.map((key) => ({
      key,
      text: key === "Intro" ? "Intro" : key.replace("Level", "L"),
    }));

    const totalW = labels.length * btnW + (labels.length - 1) * gap + pad * 2;
    const x0 = (w - totalW) / 2 + pad;
    const y0 = h - btnH - 10;

    const bar = this.add.rectangle(w / 2, y0 + btnH / 2, totalW, btnH + pad * 2, 0x000000, 0.35)
      .setScrollFactor(0)
      .setDepth(9999)
      .setInteractive();

    labels.forEach((item, i) => {
      const bx = x0 + i * (btnW + gap) + btnW / 2;
      const by = y0 + btnH / 2;
      const r = this.add.rectangle(bx, by, btnW, btnH, 0x1f2937, 0.7)
        .setStrokeStyle(1, 0x9ca3af, 0.9)
        .setScrollFactor(0)
        .setDepth(10000)
        .setInteractive({ useHandCursor: true });
      const t = this.add.text(bx, by, item.text, {
        fontFamily: "Arial, sans-serif",
        fontSize: `${Math.max(14, Math.round(btnH * 0.42))}px`,
        color: "#e5e7eb",
      }).setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(10001)
        .setInteractive({ useHandCursor: true });

      const go = () => startScene(item.key);
      r.on('pointerup', go);
      t.on('pointerup', go);
    });

    this._handleResize = () => this.scene.restart();
    this.scale.on('resize', this._handleResize);
    this.events.once('shutdown', this.cleanupHud, this);
    this.events.once('destroy', this.cleanupHud, this);
  }

  cleanupHud() {
    if (this._handleResize) {
      this.scale.off('resize', this._handleResize);
      this._handleResize = null;
    }
  }
}

class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  create() {
    this.scene.launch("HUD");
    this.scene.start("Intro");
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: GAME_BASE_WIDTH,
  height: GAME_BASE_HEIGHT,
  pixelArt: true,
  backgroundColor: "#1d1d1d",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: { default: "arcade", arcade: { debug: false } },
  scene: [BootScene, HUDScene, IntroCutscene, Level1, Level2, Combat, Level3],
};

const game = new Phaser.Game(config);
let lastStartedKey = null;

function startScene(key) {
  if (!SCENE_KEYS.includes(key)) return;
  const manager = game.scene;
  if (!manager?.keys?.[key]) return;
  if (lastStartedKey === key && manager.isActive(key)) {
    if (manager?.keys?.HUD) manager.bringToTop("HUD");
    return;
  }

  MANAGED_SCENES.forEach((sceneKey) => {
    if (sceneKey === key || sceneKey === "HUD") return;
    if (manager.isActive(sceneKey) || manager.isSleeping?.(sceneKey)) {
      manager.stop(sceneKey);
    }
  });

  const target = manager.getScene(key);
  if (target?.scene?.isActive?.()) {
    target.scene.restart();
  } else {
    manager.start(key);
  }

  if (manager.isActive("HUD")) {
    manager.bringToTop("HUD");
  }

  lastStartedKey = key;
}

function handleHotkeys(e) {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const key = HOTKEYS[e.code];
  if (!key) return;
  e.preventDefault();
  startScene(key);
}

window.addEventListener('keydown', handleHotkeys);
window.addEventListener('beforeunload', () => {
  window.removeEventListener('keydown', handleHotkeys);
});
