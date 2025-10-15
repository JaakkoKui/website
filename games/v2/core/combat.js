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
    this.promptStart = 0; // retained for reference
    this.promptElapsed = 0; // ms accumulated per prompt
    this.graceRemaining = 0; // ms before accepting input
    this.currentRound = 0;
    this.result = null; // "win" | "lose" | null
    this.failed = false;
    this.onEnd = null;
    this.returnSceneKey = null;
  }

  init(data) {
    // Called when starting the scene with this.scene.start('Combat', data)
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

    // Dim background to indicate a modal mini-game
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

    // Use addKeys for reliable key creation
    this.keyObjects = this.input.keyboard.addKeys(this.promptKeys.join(","));

    this.startCombat();
  }

  startCombat() {
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
    this.promptStart = this.time.now;
    this.promptElapsed = 0;

    this.promptText.setText(
      `Press ${this.currentKey}  (${this.currentRound + 1}/${this.rounds})`,
    );
  }

  update(time, delta) {
    if (!this.active) return;

    // Accumulate elapsed time with clamping to avoid huge jumps on tab resume
    const step = Math.min(delta || 0, 50);
    this.promptElapsed += step;
    if (this.graceRemaining > 0)
      this.graceRemaining = Math.max(0, this.graceRemaining - step);

    // Timeout only when elapsed exceeds promptTime (robust to throttling)
    if (this.promptElapsed > this.promptTime) {
      this.failRound();
      return;
    }

    // Accept only the expected key after grace; ignore wrong keys to reduce false losses
    if (this.graceRemaining === 0) {
      const expectedKeyObj = this.keyObjects[this.currentKey];
      if (expectedKeyObj && Phaser.Input.Keyboard.JustDown(expectedKeyObj)) {
        this.handleCorrectKey();
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

  failRound() {
    this.failed = true;
    this.endCombat("lose");
  }

  endCombat(result) {
    this.active = false;
    this.result = result;

    // Show brief result feedback
    if (this.resultText) {
      this.resultText.setText(result === "win" ? "WIN!" : "LOSE");
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
}
