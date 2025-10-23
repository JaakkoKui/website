// Intro cutscene: responsive layout with fading title and fox animation.
// Uses StoryTeller for typewriter text and a rounded speech bubble.
import { StoryTeller } from "../core/storytelling.js";
import {
	GAME_BASE_HEIGHT,
	GAME_BASE_WIDTH,
} from "../core/constants.js";

const INTRO_CFG = {
	fox: {
		startX: 360,
		startY: 580,
		yOffset: 60,
		width: 160,
		height: 112,
		walkSpeed: 2,
	},
	title: {
		text: "Based on a true story",
		fadeDelay: 1000,
		fadeDuration: 1000,
		fontFamily: "comic sans ms, sans-serif",
		fontSize: 40,
		color: "#fd7600ff",
		verticalOffset: 100,
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
		baseFontSize: 18,
	},
};

const STATES = {
	SILENT: "silent",
	TALKING: "talking",
	FLIPPING: "flipping",
	WALKING: "walking",
};

export class IntroCutscene extends Phaser.Scene {
	constructor() {
		super({ key: "Intro" });
		this.textFadeDuration = INTRO_CFG.title.fadeDuration;
		this._foxProgress = INTRO_CFG.fox.startX / GAME_BASE_WIDTH;
		this.viewWidth = GAME_BASE_WIDTH;
		this.viewHeight = GAME_BASE_HEIGHT;
	}

	init() {
		this.resetSceneState();
	}

	preload() {
		this.load.setPath("assets/");
		this.load.image("backgroundSofa", "backgrounds/sofa.png");
		this.load.image("foxStanding", "fromSide/foxStanding.png");
		this.load.image("foxTired", "fromSide/tiredFox.png");
		this.load.image("foxFrown", "fromSide/frownFox.png");
	}

	create() {
		this.events.on("postupdate", this.handlePostUpdate, this);
		this.events.once("shutdown", this.cleanup, this);
		this.events.once("destroy", this.cleanup, this);

		this._handleResize = (gameSize) => this.applyLayout(gameSize);
		this.scale.on("resize", this._handleResize, this);

		this.buildScene();
		this.applyLayout(this.scale.gameSize);
		this.setFoxState(STATES.SILENT);

		this.enterKey = this.input.keyboard.addKey(
			Phaser.Input.Keyboard.KeyCodes.ENTER,
		);

		this.timer = 0;
	}

	buildScene() {
		this.introText = this.add
			.text(0, 0, INTRO_CFG.title.text, {
				fontFamily: INTRO_CFG.title.fontFamily,
				fontSize: `${INTRO_CFG.title.fontSize}px`,
				color: INTRO_CFG.title.color,
			})
			.setOrigin(0.5, 0.5);

		this.background = this.add
			.image(0, 0, "backgroundSofa")
			.setVisible(false)
			.setOrigin(0.5, 0.5);

		this.foxTired = this.add
			.image(0, 0, "foxTired")
			.setOrigin(0.5, 0.5)
			.setVisible(false);
		this.foxFrown = this.add
			.image(0, 0, "foxFrown")
			.setOrigin(0.5, 0.5)
			.setVisible(false);
		this.foxTiredFlipped = this.add
			.image(0, 0, "foxTired")
			.setOrigin(0.5, 0.5)
			.setFlipY(true)
			.setVisible(false);
	}

	applyLayout(gameSize) {
		const width = gameSize?.width ?? this.scale.width ?? GAME_BASE_WIDTH;
		const height = gameSize?.height ?? this.scale.height ?? GAME_BASE_HEIGHT;
		this.prevViewWidth = this.viewWidth;
		this.viewWidth = width;
		this.viewHeight = height;

		const scaleX = width / GAME_BASE_WIDTH;
		const scaleY = height / GAME_BASE_HEIGHT;
		const baseScale = Math.min(scaleX, scaleY);
		this.spriteScale = Phaser.Math.Clamp(baseScale * 0.85, 0.35, 1.2);
		this.walkSpeed = INTRO_CFG.fox.walkSpeed * Phaser.Math.Clamp(scaleX, 0.6, 1.2);

		if (this.introText) {
			const titleY = height / 2 - INTRO_CFG.title.verticalOffset * scaleY;
			const scaledFont = Phaser.Math.Clamp(
				Math.round(INTRO_CFG.title.fontSize * scaleY * 0.9),
				18,
				48,
			);
			this.introText
				.setFontSize(scaledFont)
				.setPosition(width / 2, titleY);
		}

		if (this.background) {
			this.background
				.setPosition(width / 2, height / 2)
				.setDisplaySize(width, height);
		}

		const foxWidth = INTRO_CFG.fox.width * this.spriteScale;
		const foxHeight = INTRO_CFG.fox.height * this.spriteScale;
		[this.foxTired, this.foxFrown, this.foxTiredFlipped].forEach((sprite) => {
			sprite?.setDisplaySize(foxWidth, foxHeight);
		});

		const priorWidth = this.prevViewWidth || width;
		if (this.foxPos) {
			this._foxProgress = this.foxPos.x / priorWidth;
		}
		const foxYRatio =
			(INTRO_CFG.fox.startY - INTRO_CFG.fox.yOffset) / GAME_BASE_HEIGHT;
		this.foxPos = {
			x: width * this._foxProgress,
			y: height * foxYRatio,
		};
		this.updateFoxSpritePosition();

		const bubbleScale = Phaser.Math.Clamp(this.spriteScale, 0.45, 1);
		this.bubbleMetrics = {
			width: INTRO_CFG.bubble.width * bubbleScale,
			height: INTRO_CFG.bubble.height * bubbleScale,
			offsetX: INTRO_CFG.bubble.offsetX * bubbleScale,
			offsetY: INTRO_CFG.bubble.offsetY * bubbleScale,
			textPadX: INTRO_CFG.bubble.textPadX * bubbleScale,
			textPadY: INTRO_CFG.bubble.textPadY * bubbleScale,
			fontSize: Math.max(
				12,
				Math.round(INTRO_CFG.bubble.baseFontSize * bubbleScale),
			),
		};

		if (this.bubbleContainer) {
			const bx = this.foxPos.x + this.bubbleMetrics.offsetX;
			const by = this.foxPos.y + this.bubbleMetrics.offsetY;
			this.updateTalkBubblePosition(bx, by);
		}
	}

	update(time, delta) {
		const dt = delta;

		if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
			this.scene.start("Level1");
		}

		this.timer += dt;

		if (this.timer > INTRO_CFG.title.fadeDelay && this.textAlpha > 0) {
			this.textAlpha -= dt / this.textFadeDuration;
			if (this.textAlpha < 0) this.textAlpha = 0;
			this.introText.setAlpha(this.textAlpha);
			if (this.textAlpha === 0) {
				this.background.setVisible(true);
				this.setFoxState(this.foxState);
			} else {
				this.currentFoxSprite?.setVisible(false);
				this.hideTalkBubble();
			}
		}

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

		if (this.foxState === STATES.TALKING && !this.storyteller) {
			this.storyteller = new StoryTeller(
				this,
				"The Fox awakens to the new day with a hangover curse",
			);
		}
		this.storyteller?.update(dt);

		if (this.textAlpha === 0) {
			this.setFoxState(this.foxState);

			if (this.foxState === STATES.WALKING) {
				const step = this.walkSpeed * (dt / 16.6667);
				this.foxPos.x += step;
				if (this.viewWidth > 0) {
					this._foxProgress = this.foxPos.x / this.viewWidth;
				}
			}
			this.updateFoxSpritePosition();

			if (this.foxState === STATES.WALKING) {
				this.showTalkBubble(INTRO_CFG.bubble.text);
				const bx = this.foxPos.x + this.bubbleMetrics.offsetX;
				const by = this.foxPos.y + this.bubbleMetrics.offsetY;
				this.updateTalkBubblePosition(bx, by);
			} else {
				this.hideTalkBubble();
			}
		}

		if (this.timer > INTRO_CFG.timings.endSceneAt) {
			this.scene.start("Level1");
		}
	}

	updateFoxSpritePosition() {
		if (!this.foxPos) return;
		const { x, y } = this.foxPos;
		[this.foxTired, this.foxFrown, this.foxTiredFlipped].forEach((sprite) => {
			sprite?.setPosition(x, y);
		});
		if (this.currentFoxSprite) {
			this.currentFoxSprite.setPosition(x, y);
		}
	}

	showTalkBubble(text) {
		if (this.bubbleContainer) return;
		const m = this.bubbleMetrics;
		const radius = Math.min(m.width, m.height) * 0.25;
		const container = this.add.container(
			this.foxPos.x + m.offsetX,
			this.foxPos.y + m.offsetY,
		);
		const gfx = this.add.graphics();
		gfx.fillStyle(INTRO_CFG.bubble.fill, 1);
		gfx.fillRoundedRect(0, 0, m.width, m.height, radius);
		gfx.lineStyle(2, INTRO_CFG.bubble.stroke, 1);
		gfx.strokeRoundedRect(0, 0, m.width, m.height, radius);
		const txt = this.add.text(m.textPadX, m.textPadY, text, {
			fontFamily: "sans-serif",
			fontSize: `${m.fontSize}px`,
			color: "#141414",
		});
		container.add([gfx, txt]);
		this.bubbleContainer = container;
	}

	hideTalkBubble() {
		if (!this.bubbleContainer) return;
		this.bubbleContainer.destroy(true);
		this.bubbleContainer = null;
	}

	handlePostUpdate() {
		if (this.storyteller && this.storyteller.isFinished()) {
			this.storyteller.destroy();
			this.storyteller = null;
		}
		if (this.foxState !== STATES.WALKING) {
			this.hideTalkBubble();
		}
	}

	updateTalkBubblePosition(x, y) {
		this.bubbleContainer?.setPosition(x, y);
	}

	cleanup() {
		this.events.off("postupdate", this.handlePostUpdate, this);
		if (this._handleResize) {
			this.scale.off("resize", this._handleResize, this);
			this._handleResize = null;
		}
		this.hideTalkBubble();
		this.storyteller?.destroy();
		this.storyteller = null;
	}

	resetSceneState() {
		this.timer = 0;
		this.textAlpha = 1;
		const width = this.scale?.gameSize?.width ?? GAME_BASE_WIDTH;
		const height = this.scale?.gameSize?.height ?? GAME_BASE_HEIGHT;
		this.viewWidth = width;
		this.viewHeight = height;
		const foxYRatio =
			(INTRO_CFG.fox.startY - INTRO_CFG.fox.yOffset) / GAME_BASE_HEIGHT;
		this.foxPos = {
			x: width * this._foxProgress,
			y: height * foxYRatio,
		};
		this.foxState = STATES.SILENT;
		this.storyteller = null;
		this.bubbleContainer = null;
		this.currentFoxSprite = null;
	}

	setFoxState(state) {
		this.foxState = state;
		if (!this.foxTired) return;
		this.foxTired.setVisible(false);
		this.foxFrown.setVisible(false);
		this.foxTiredFlipped.setVisible(false);

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

		if (this.currentFoxSprite) {
			this.currentFoxSprite
				.setVisible(this.textAlpha === 0)
				.setPosition(this.foxPos.x, this.foxPos.y);
		}
	}
}

