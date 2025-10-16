// Intro cutscene: shows a fading title, then a short sequence with the fox and a speech bubble.
// Uses StoryTeller for typewriter text and a rounded box.
// All tunables are centralized in INTRO_CFG below so changes are in one place.
import { StoryTeller } from "../core/storytelling.js";

// Centralized config for the Intro scene
const INTRO_CFG = {
  fox: {
    startX: 360,
    startY: 580,
    yOffset: 60, // visual lift
    width: 160,
    height: 112,
    walkSpeed: 4,
  },
  title: {
    text: "Based on a true story",
    fadeDelay: 1000,
    fadeDuration: 1000,
    fontFamily: "comic sans ms, sans-serif",
    fontSize: "40px",
    color: "#fd7600ff",
  },
  timings: {
    silentEnd: 3000,
    talkingEnd: 6500,
    flippingEnd: 8000,
    endSceneAt: 10000,
  },
  bubble: {
    text: "Potions...",
    offsetX: 70,
    offsetY: -70,
    width: 130,
    height: 40,
    textPadX: 20,
    textPadY: 8,
    fill: 0xd5d0d0ff,
    stroke: 0x000000,
  },
};

// Simple state enum
const STATES = {
  SILENT: "silent",
  TALKING: "talking",
  FLIPPING: "flipping",
  WALKING: "walking",
};

export class IntroCutscene extends Phaser.Scene {
  constructor() {
    super({ key: "Intro" });
    this.timer = 0;
    this.textAlpha = 1;
    this.textFadeDuration = INTRO_CFG.title.fadeDuration;
    this.foxPos = { x: INTRO_CFG.fox.startX, y: INTRO_CFG.fox.startY };
    this.foxState = STATES.SILENT; // silent, talking, flipping, walking
    this.storyteller = null;
    this.bubbleActive = false; // track if a Potions bubble is currently shown
    this.bubbleContainer = null; // container holding bubble graphics + text
    this._lastFoxState = null; // cache to avoid redundant visibility changes
    this.currentFoxSprite = null; // currently visible fox sprite
    this._hotkeyHandlers = null; // store bound hotkey handlers for cleanup
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
    // include the visual offset applied later
    this.foxPos = {
      x: INTRO_CFG.fox.startX,
      y: INTRO_CFG.fox.startY - INTRO_CFG.fox.yOffset,
    };
    this.foxState = STATES.SILENT;
    this.storyteller = null;
    this.bubbleActive = false;
    this.bubbleContainer = null;
    this._lastFoxState = null;
    this.currentFoxSprite = null;

    // Lifecycle hooks for cleanup
    this.events.on("postupdate", this.checkStorytellerCleanup, this);
    this.events.once("shutdown", this.cleanup, this);
    this.events.once("destroy", this.cleanup, this);

    // Intro text
    this.introText = this.add
      .text(width / 2, height / 2 - 100, INTRO_CFG.title.text, {
        fontFamily: INTRO_CFG.title.fontFamily,
        fontSize: INTRO_CFG.title.fontSize,
        color: INTRO_CFG.title.color,
      })
      .setOrigin(0.5, 0.5);

    // Background (hidden until text fades)
    this.background = this.add
      .image(width / 2, height / 2, "backgroundSofa")
      .setDisplaySize(width, height)
      .setVisible(false);

    // Fox sprites (position already has the y-offset applied)
    this.foxTired = this.add
      .image(this.foxPos.x, this.foxPos.y, "foxTired")
      .setDisplaySize(INTRO_CFG.fox.width, INTRO_CFG.fox.height)
      .setVisible(false);
    this.foxFrown = this.add
      .image(this.foxPos.x, this.foxPos.y, "foxFrown")
      .setDisplaySize(INTRO_CFG.fox.width, INTRO_CFG.fox.height)
      .setVisible(false);

    // Flip the tired fox vertically (like in pygame)
    this.foxTiredFlipped = this.add
      .image(this.foxPos.x, this.foxPos.y, "foxTired")
      .setDisplaySize(INTRO_CFG.fox.width, INTRO_CFG.fox.height)
      .setFlipY(true)
      .setVisible(false);

    // Helper: only toggle sprite visibility when state actually changes
    this.setFoxState = (state) => {
      if (this._lastFoxState === state) return;
      this._lastFoxState = state;
      // Hide all first
      this.foxTired.setVisible(false);
      this.foxFrown.setVisible(false);
      this.foxTiredFlipped.setVisible(false);
      // Pick current sprite
      switch (state) {
        case STATES.SILENT:
        case STATES.TALKING:
          this.currentFoxSprite = this.foxTiredFlipped;
          break;
        case STATES.FLIPPING:
          this.currentFoxSprite = this.foxTired;
          break;
        case STATES.WALKING:
          this.currentFoxSprite = this.foxFrown;
          break;
        default:
          this.currentFoxSprite = null;
      }
      if (this.currentFoxSprite) this.currentFoxSprite.setVisible(true);
    };

    // Keyboard
    this.enterKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER,
    );

    this.timer = 0;

    // Global hotkeys: 1->Intro, 2->Level1, 3->Level2 (track handlers for cleanup)
    const goIntro = () => this.scene.start("Intro");
    const goL1 = () => this.scene.start("Level1");
    const goL2 = () => this.scene.start("Level2");
    this._hotkeyHandlers = { goIntro, goL1, goL2 };
    this.input.keyboard.on("keydown-ONE", goIntro, this);
    this.input.keyboard.on("keydown-TWO", goL1, this);
    this.input.keyboard.on("keydown-THREE", goL2, this);
  }

  update(time, delta) {
    const dt = delta;

    // Handle enter → skip to level1
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.scene.start("Level1");
    }

    this.timer += dt;

    // Fade out intro text
    if (this.timer > INTRO_CFG.title.fadeDelay && this.textAlpha > 0) {
      this.textAlpha -= dt / this.textFadeDuration;
      if (this.textAlpha < 0) this.textAlpha = 0;
      this.introText.setAlpha(this.textAlpha);
      if (this.textAlpha === 0) {
        this.background.setVisible(true);
      }
    }

    // State switching
    let nextState;
    if (this.timer < INTRO_CFG.timings.silentEnd) {
      nextState = STATES.SILENT;
    } else if (this.timer < INTRO_CFG.timings.talkingEnd) {
      nextState = STATES.TALKING;
    } else if (this.timer < INTRO_CFG.timings.flippingEnd) {
      nextState = STATES.FLIPPING;
    } else {
      nextState = STATES.WALKING;
    }
    this.foxState = nextState;

    // Start storyteller when talking starts
    if (this.foxState === STATES.TALKING && !this.storyteller) {
      this.storyteller = new StoryTeller(
        this,
        "The wizard Fox awakens to the new day with a hungover curse...",
      );
    }
    if (this.storyteller) {
      this.storyteller.update(dt);
    }

    // Update fox positions / visibility
    if (this.textAlpha === 0) {
      // Toggle visibility only on state change
      this.setFoxState(this.foxState);

      if (this.foxState === STATES.WALKING) {
        this.foxPos.x += INTRO_CFG.fox.walkSpeed;
      }
      // Keep the active sprite at current position
      if (this.currentFoxSprite) {
        this.currentFoxSprite.setPosition(this.foxPos.x, this.foxPos.y);
      }

      // Maintain a bubble that follows the fox while walking
      if (this.foxState === STATES.WALKING) {
        if (!this.bubbleActive) {
          this.createTalkBubble(INTRO_CFG.bubble.text);
        } else if (this.bubbleContainer) {
          const bx = this.foxPos.x + INTRO_CFG.bubble.offsetX;
          const by = this.foxPos.y + INTRO_CFG.bubble.offsetY;
          this.updateTalkBubblePosition(bx, by);
        }
      } else {
        // Not walking: ensure bubble is gone
        this.destroyTalkBubble();
      }
    }

    // End scene after 10s
    if (this.timer > INTRO_CFG.timings.endSceneAt) {
      this.scene.start("Level1");
    }
  }

  createTalkBubble(text) {
    if (this.bubbleActive) return;
    this.bubbleActive = true;
    const x = this.foxPos.x + INTRO_CFG.bubble.offsetX;
    const y = this.foxPos.y + INTRO_CFG.bubble.offsetY;
    const bubbleWidth = INTRO_CFG.bubble.width;
    const bubbleHeight = INTRO_CFG.bubble.height;
    // Bubble container makes moving/destroying simpler
    const container = this.add.container(x, y);
    const gfx = this.add.graphics();
    gfx.fillStyle(INTRO_CFG.bubble.fill, 1);
    gfx.fillRoundedRect(0, 0, bubbleWidth, bubbleHeight, 10);
    gfx.lineStyle(2, INTRO_CFG.bubble.stroke, 1);
    gfx.strokeRoundedRect(0, 0, bubbleWidth, bubbleHeight, 10);
    const txt = this.add.text(
      INTRO_CFG.bubble.textPadX,
      INTRO_CFG.bubble.textPadY,
      text,
      { fontFamily: "sans-serif", fontSize: "18px", color: "#141414" },
    );
    container.add([gfx, txt]);
    this.bubbleContainer = container;
  }

  destroyTalkBubble() {
    if (!this.bubbleActive) return;
    this.bubbleActive = false;
    if (this.bubbleContainer) {
      this.bubbleContainer.destroy(true);
      this.bubbleContainer = null;
    }
  }

  checkStorytellerCleanup() {
    if (this.storyteller && this.storyteller.isFinished()) {
      this.storyteller.destroy();
      this.storyteller = null;
    }
    if (this.foxState !== STATES.WALKING) {
      this.destroyTalkBubble();
    }
  }

  updateTalkBubblePosition(x, y) {
    if (this.bubbleContainer) this.bubbleContainer.setPosition(x, y);
  }

  cleanup() {
    // Remove listeners and destroy artifacts
    this.events.off("postupdate", this.checkStorytellerCleanup, this);
    this.destroyTalkBubble();
    if (this.storyteller) {
      this.storyteller.destroy();
      this.storyteller = null;
    }
    // Detach hotkeys if present
    if (this._hotkeyHandlers) {
      const { goIntro, goL1, goL2 } = this._hotkeyHandlers;
      this.input.keyboard.off("keydown-ONE", goIntro, this);
      this.input.keyboard.off("keydown-TWO", goL1, this);
      this.input.keyboard.off("keydown-THREE", goL2, this);
      this._hotkeyHandlers = null;
    }
  }
}
