export default class Combat extends Phaser.Scene {
  constructor() {
    super({ key: "Combat" });

    // Config defaults
    this.promptKeys = ["A", "S", "D", "F", "G"];
    this.promptTime = 1500; // ms
    this.rounds = 6;

    // State
    this.active = false;
    this.currentKey = null;
    this.promptStart = 0;
    this.currentRound = 0;
    this.result = null; // "win" | "lose" | null
    this.failed = false;

    // Callbacks / scene return
    this.onEnd = null;
    this.returnSceneKey = null;
  }

  init(data) {
    // Called when starting the scene with this.scene.start('Combat', data)
    this.promptTime = data.promptTime ?? this.promptTime;
    this.rounds = data.rounds ?? this.rounds;
    this.onEnd = data.onEnd ?? null;
    this.returnSceneKey = data.returnSceneKey ?? null;
  }

  create() {
    const { width } = this.scale;

    // Center UI container
    this.promptRect = this.add
      .rectangle(width / 2, 330, 260, 60, 0xffc8c8)
      .setStrokeStyle(2, 0x000000)
      .setOrigin(0.5);

    this.promptText = this.add
      .text(width / 2, 330, "", {
        font: "24px Arial",
        fill: "#000",
      })
      .setOrigin(0.5);

    // Set up key listeners for A,S,D,F,G
    this.keyObjects = this.promptKeys.reduce((map, key) => {
      map[key] = this.input.keyboard.addKey(key);
      return map;
    }, {});

    this.startCombat();
  }

  startCombat() {
    this.active = true;
    this.result = null;
    this.failed = false;
    this.currentRound = 0;
    this.nextPrompt();
  }

  nextPrompt() {
    const randomIndex = Phaser.Math.Between(0, this.promptKeys.length - 1);
    this.currentKey = this.promptKeys[randomIndex];
    this.promptStart = this.time.now;

    this.promptText.setText(
      `Press ${this.currentKey}! (${this.currentRound + 1}/${this.rounds})`,
    );
  }

  update(time, delta) {
    if (!this.active) return;

    // Check time-out
    if (time - this.promptStart > this.promptTime) {
      this.failRound();
    }

    // Check key presses
    for (const key of this.promptKeys) {
      if (Phaser.Input.Keyboard.JustDown(this.keyObjects[key])) {
        if (key === this.currentKey) {
          this.handleCorrectKey();
        } else {
          this.failRound();
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

  failRound() {
    this.failed = true;
    this.endCombat("lose");
  }

  endCombat(result) {
    this.active = false;
    this.result = result;

    if (this.onEnd) {
      this.onEnd(result);
    }

    if (this.returnSceneKey) {
      // Return to the previous scene after a short delay
      this.time.delayedCall(1000, () => {
        this.scene.start(this.returnSceneKey);
      });
    }
  }
}
