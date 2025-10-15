export class StoryTeller {
  constructor(
    scene,
    text,
    {
      fontSize = 36,
      letterDelay = 30,
      pauseDelay = 30,
      fadeDelay = 1000,
      fadeDuration = 1000,
    } = {},
  ) {
    this.scene = scene;
    this.storyText = text;
    this.storyWords = text.split(" ");
    this.storyDisplayed = "";
    this.storyWordIndex = 0;
    this.storyLetterIndex = 0;
    this.storyTimer = 0;
    this.state = "letter"; // 'letter', 'pause', 'fade'
    this.letterDelay = letterDelay;
    this.pauseDelay = pauseDelay;
    this.fadeDelay = fadeDelay;
    this.fadeDuration = fadeDuration;
    this.fadeTimer = 0;
    this.alpha = 1;

    // Create graphics & text objects
    const { width, height } = scene.scale;
    this.container = scene.add.container(0, 0);

    this.boxGraphics = scene.add.graphics();
    this.shadowGraphics = scene.add.graphics();
    this.textObj = scene.add
      .text(width / 2, height / 8, "", {
        fontFamily: "sans-serif",
        fontSize: `${fontSize}px`,
        color: "#1e1e1e",
        align: "center",
        wordWrap: { width: width * 0.8 },
      })
      .setOrigin(0.5, 0.5);

    this.container.add([this.shadowGraphics, this.boxGraphics, this.textObj]);
  }

  update(dt) {
    this.storyTimer += dt;

    if (this.state === "letter" || this.state === "pause") {
      if (this.storyWordIndex < this.storyWords.length) {
        const word = this.storyWords[this.storyWordIndex];
        if (this.state === "letter") {
          if (this.storyLetterIndex < word.length) {
            if (this.storyTimer > this.letterDelay) {
              this.storyDisplayed += word[this.storyLetterIndex];
              this.storyLetterIndex++;
              this.storyTimer = 0;
            }
          } else {
            this.state = "pause";
            this.storyTimer = 0;
          }
        } else if (this.state === "pause") {
          if (this.storyTimer > this.pauseDelay) {
            this.storyWordIndex++;
            this.storyLetterIndex = 0;
            if (this.storyWordIndex < this.storyWords.length) {
              this.storyDisplayed += " ";
            }
            this.state = "letter";
            this.storyTimer = 0;
          }
        }
      } else {
        this.state = "fade";
        this.fadeTimer = 0;
        this.alpha = 1;
      }
    } else if (this.state === "fade") {
      this.fadeTimer += dt;
      if (this.fadeTimer > this.fadeDelay) {
        const fadeProgress = Math.min(
          1,
          (this.fadeTimer - this.fadeDelay) / this.fadeDuration,
        );
        this.alpha = 1 - fadeProgress;
        if (this.alpha <= 0) {
          this.alpha = 0;
          this.storyDisplayed = "";
        }
      }
    }

    this.draw();
  }

  draw() {
    const displayText = this.storyDisplayed || " ";
    this.textObj.setText(displayText);
    this.textObj.setAlpha(this.alpha);

    const paddingX = 40;
    const paddingY = 28;
    const textBounds = this.textObj.getBounds();
    const boxWidth = textBounds.width + paddingX;
    const boxHeight = textBounds.height + paddingY;
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    const boxX = (screenWidth - boxWidth) / 2;
    const boxY = (screenHeight - boxHeight) / 8;

    // Shadow
    this.shadowGraphics.clear();
    const shadowAlpha = Math.max(0, Math.min(1, this.alpha));
    this.shadowGraphics.fillStyle(
      Phaser.Display.Color.GetColor32(
        80,
        80,
        80,
        Math.floor(shadowAlpha * 128),
      ),
    );
    this.shadowGraphics.fillRoundedRect(
      boxX + 6,
      boxY + 6,
      boxWidth,
      boxHeight,
      18,
    );

    // Box
    this.boxGraphics.clear();
    const boxColor = Phaser.Display.Color.GetColor32(
      255,
      255,
      245,
      Math.floor(shadowAlpha * 255),
    );
    const borderColor = Phaser.Display.Color.GetColor32(
      40,
      40,
      40,
      Math.floor(shadowAlpha * 255),
    );
    this.boxGraphics.fillStyle(boxColor);
    this.boxGraphics.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 18);
    this.boxGraphics.lineStyle(3, borderColor);
    this.boxGraphics.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 18);

    // Position text at center of box
    this.textObj.setPosition(boxX + boxWidth / 2, boxY + boxHeight / 2);
  }

  reset() {
    this.storyDisplayed = "";
    this.storyWordIndex = 0;
    this.storyLetterIndex = 0;
    this.storyTimer = 0;
    this.state = "letter";
    this.fadeTimer = 0;
    this.alpha = 1;
  }
}
