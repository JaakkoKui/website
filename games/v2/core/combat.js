// Combat: a tiny reaction mini-game shown as an overlay.
// - Shows a random key from [A,S,D,F,G]
// - Gives the player `promptTime` ms to press ONLY that key
// - Uses a small input grace at start to avoid accidental key carryover
// - Uses delta-based timing to avoid random timeouts on tab throttling
export default class Combat extends Phaser.Scene {
  constructor() {
    super({ key: "Combat" });

    // Config defaults
    this.promptKeys = ["A", "S", "D", "F", "G"];
    this.promptTime = 1500; // ms
    this.rounds = 1; // default single prompt like Python

    // State
    this.active = false;
    this.currentKey = null;
    this.promptElapsed = 0; // ms accumulated per prompt
    this.graceRemaining = 0; // ms before accepting input
    this.currentRound = 0;
    this.result = null; // "win" | "lose" | null
    this.failed = false;
    this.onEnd = null;
    this.returnSceneKey = null;
    this.lastFailReason = null; // 'wrong' | 'timeout' | null
    // Touch/UI
    this.buttonRow = null;
    this.buttonMap = new Map(); // key -> {container, rect, label}
  }

  init(data) {
    // Called when launching the scene. Allows config overrides from callers.
    this.promptTime = data.promptTime ?? this.promptTime;
    this.rounds = data.rounds ?? this.rounds;
    this.onEnd = data.onEnd ?? null;
    this.returnSceneKey = data.returnSceneKey ?? null;
    this.resultDisplayDuration = data.resultDisplayDuration ?? 800; // ms
  }

  create() {
    const { width, height } = this.scale;

    // Ensure keyboard is enabled and capture A,S,D,F,G so they don't leak
    this.input.keyboard.enabled = true;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.input.keyboard.addCapture([K.A, K.S, K.D, K.F, K.G]);

    // Dim background to indicate a modal mini-game (keeps gameplay paused underneath)
    this.backdrop = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000)
      .setAlpha(0.4)
      .setDepth(-1);

    // Title
    this.add
      .text(width / 2, 220, "Combat — press shown key", {
        font: "26px Arial",
        fill: "#ffffff",
      })
      .setOrigin(0.5);

    // Center UI container
    this.promptRect = this.add
      .rectangle(width / 2, 330, 260, 60, 0xffc8c8)
      .setStrokeStyle(2, 0x000000)
      .setOrigin(0.5);

    this.promptText = this.add
      .text(width / 2, 330, "", { font: "24px Arial", fill: "#ffffff" })
      .setOrigin(0.5);

    // Result text (hidden until end)
    this.resultText = this.add
      .text(width / 2, 280, "", { font: "28px Arial", fill: "#ffff66" })
      .setOrigin(0.5)
      .setAlpha(0);

    // Create key objects for prompt keys
    this.keyObjects = this.input.keyboard.addKeys(this.promptKeys.join(","));

    // On-screen mobile buttons (phones only)
    const os =
      (this.sys &&
        this.sys.game &&
        this.sys.game.device &&
        this.sys.game.device.os) ||
      {};
    const isPhone = !!(os.android || os.iOS);
    if (isPhone) {
      this.createTouchButtons();
    }

    this.startCombat();
  }

  startCombat() {
    // Reset state for a new combat sequence
    this.active = true;
    this.result = null;
    this.failed = false;
    this.currentRound = 0;
    // Reset keyboard state and ignore inputs briefly to avoid the launching key (G)
    if (this.input && this.input.keyboard) this.input.keyboard.resetKeys();
    this.graceRemaining = 300;
    this.nextPrompt();
  }

  nextPrompt() {
    const randomIndex = Phaser.Math.Between(0, this.promptKeys.length - 1);
    this.currentKey = this.promptKeys[randomIndex];
    this.promptElapsed = 0;

    this.promptText.setText(
      `Press ${this.currentKey}  (${this.currentRound + 1}/${this.rounds})`,
    );

    // Highlight expected key on buttons
    this.updateButtonHighlights();
  }

  update(time, delta) {
    if (!this.active) return;

    // Accumulate elapsed time with clamping to avoid huge jumps on tab resume
    const step = Math.min(delta || 0, 50);
    this.promptElapsed += step;
    if (this.graceRemaining > 0)
      this.graceRemaining = Math.max(0, this.graceRemaining - step);

    // Timeout when elapsed exceeds promptTime (robust to throttling)
    if (this.promptElapsed > this.promptTime) {
      this.failRound("timeout");
      return;
    }

    // After grace: pressing the expected key wins the round; any other prompt key loses
    if (this.graceRemaining === 0) {
      for (const keyName of this.promptKeys) {
        const keyObj = this.keyObjects[keyName];
        if (keyObj && Phaser.Input.Keyboard.JustDown(keyObj)) {
          if (keyName === this.currentKey) {
            this.handleCorrectKey();
          } else {
            this.failRound("wrong");
          }
          break;
        }
      }
    }
  }

  handleCorrectKey() {
    this.currentRound++;
    if (this.currentRound >= this.rounds) {
      this.endCombat("win");
    } else {
      this.nextPrompt();
    }
  }

  failRound(reason = "wrong") {
    this.failed = true;
    this.lastFailReason = reason;
    this.endCombat("lose");
  }

  endCombat(result) {
    this.active = false;
    this.result = result;

    // Show brief result feedback
    if (this.resultText) {
      let msg = "WIN!";
      if (result !== "win") {
        msg = this.lastFailReason === "timeout" ? "Too slow" : "Wrong rune";
      }
      this.resultText.setText(msg);
      this.resultText.setAlpha(1);
      this.tweens.add({
        targets: this.resultText,
        alpha: 0,
        duration: Math.max(200, this.resultDisplayDuration),
        ease: "sine.out",
      });
    }

    const finish = () => {
      if (this.onEnd) this.onEnd(result);
      if (this.returnSceneKey) this.scene.start(this.returnSceneKey);
    };
    // Brief delay to let player see outcome
    this.time.delayedCall(this.resultDisplayDuration, finish);
  }

  // --- Mobile buttons -----------------------------------------------------
  createTouchButtons() {
    const { width, height } = this.scale;
    const buttonWidth = 80;
    const buttonHeight = 64;
    const gap = 12;
    const totalWidth =
      this.promptKeys.length * buttonWidth + (this.promptKeys.length - 1) * gap;
    const startX = (width - totalWidth) / 2 + buttonWidth / 2;
    const y = 430;

    for (let i = 0; i < this.promptKeys.length; i++) {
      const key = this.promptKeys[i];
      const x = startX + i * (buttonWidth + gap);
      const cont = this.add.container(x, y);
      const rect = this.add
        .rectangle(0, 0, buttonWidth, buttonHeight, 0x212121)
        .setStrokeStyle(2, 0xffffff)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(0, 0, key, { font: "28px Arial", fill: "#ffffff" })
        .setOrigin(0.5);
      cont.add([rect, label]);

      rect.on("pointerdown", () => {
        if (!this.active) return;
        if (this.graceRemaining > 0) return; // still in grace
        this.handleTouchKey(key);
      });

      this.buttonMap.set(key, { container: cont, rect, label });
    }
    this.buttonRow = true;
    this.updateButtonHighlights();
  }

  updateButtonHighlights() {
    if (!this.buttonRow) return;
    for (const key of this.promptKeys) {
      const btn = this.buttonMap.get(key);
      if (!btn) continue;
      const isTarget = key === this.currentKey;
      // Neutral highlight: darker fill only, no green stroke or label color
      btn.rect.setFillStyle(isTarget ? 0x2a2a2a : 0x212121, 1);
      btn.rect.setStrokeStyle(2, 0xffffff, 1);
      btn.label.setColor("#ffffff");
    }
  }

  handleTouchKey(keyName) {
    if (keyName === this.currentKey) {
      this.handleCorrectKey();
    } else if (this.promptKeys.includes(keyName)) {
      this.failRound("wrong");
    }
  }
}
