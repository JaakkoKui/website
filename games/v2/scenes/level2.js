export class Level2Scene extends Phaser.Scene {
  constructor() {
    super("Level2");
  }

  preload() {
    this.load.setPath("assets/");
    // Player (fallback)
    this.load.image("player", "player.png");

    // Prefer background & mask from assets/backgrounds/
    this.load.image("bg_a", "backgrounds/level2_bg.png");
    this.load.image("bg_b", "backgrounds/background.png");
    this.load.image("msk_a", "backgrounds/level2_mask.png");
    this.load.image("msk_b", "backgrounds/mask.png");

    // Also allow fromAbove and legacy root as fallbacks
    this.load.image("fa_bg", "fromAbove/background.png");
    this.load.image("fa_bg2", "fromAbove/level2_bg.png");
    this.load.image("fa_mask", "fromAbove/mask.png");
    this.load.image("fa_mask2", "fromAbove/level2_mask.png");
    this.load.image("level2_bg", "level2_bg.png");
    this.load.image("level2_mask", "level2_mask.png");

    // Directional fox sprites from fromAbove/
    this.load.image("foxLeft", "fromAbove/foxLeft.png");
    this.load.image("foxRight", "fromAbove/foxRight.png");
    this.load.image("foxUp", "fromAbove/foxUp.png");
    this.load.image("foxDown", "fromAbove/foxDown.png");
    this.load.on("loaderror", (f) => console.warn("[loaderror]", f?.key || f));
  }

  create() {
    // Keyboard
    this.input.keyboard.enabled = true;
    this.input.keyboard.addCapture([
      "W",
      "A",
      "S",
      "D",
      "UP",
      "DOWN",
      "LEFT",
      "RIGHT",
    ]);

    // Decide which keys to use (prefer backgrounds/*, then fromAbove/*, then root)
    const has = (k) => this.textures.exists(k);
    const bgKey = has("bg_a")
      ? "bg_a"
      : has("bg_b")
        ? "bg_b"
        : has("fa_bg")
          ? "fa_bg"
          : has("fa_bg2")
            ? "fa_bg2"
            : "level2_bg";
    const maskKey = has("msk_a")
      ? "msk_a"
      : has("msk_b")
        ? "msk_b"
        : has("fa_mask")
          ? "fa_mask"
          : has("fa_mask2")
            ? "fa_mask2"
            : "level2_mask";

    // Are directional fox sprites available?
    this.hasFoxDirs =
      has("foxLeft") && has("foxRight") && has("foxUp") && has("foxDown");

    // Source (unscaled) sizes
    const hasBg = has(bgKey);
    let srcW = 1024;
    let srcH = 768;
    if (hasBg) {
      const bgSrc = this.textures.get(bgKey).getSourceImage();
      srcW = bgSrc.naturalWidth || bgSrc.width;
      srcH = bgSrc.naturalHeight || bgSrc.height;
    }

    // Visual zoom
    const BG_ZOOM = 1.7; // keep this
    if (hasBg) {
      this.bg = this.add
        .image(0, 0, bgKey)
        .setOrigin(0)
        .setDepth(-10)
        .setScale(BG_ZOOM);
    } else {
      // Fallback: draw a grid background
      const g = this.add.graphics().setDepth(-10);
      g.fillStyle(0x404040, 1).fillRect(0, 0, srcW * BG_ZOOM, srcH * BG_ZOOM);
      g.lineStyle(1, 0x606060, 1);
      for (let x = 0; x < srcW * BG_ZOOM; x += 64)
        g.lineBetween(x, 0, x, srcH * BG_ZOOM);
      for (let y = 0; y < srcH * BG_ZOOM; y += 64)
        g.lineBetween(0, y, srcW * BG_ZOOM, y);
      this.bg = g;
    }

    // Mask visual + bitmap mask
    const hasMask = has(maskKey);
    if (hasMask && hasBg) {
      const maskImg = this.add
        .image(0, 0, maskKey)
        .setOrigin(0)
        .setVisible(false)
        .setScale(BG_ZOOM);
      this.worldMask = new Phaser.Display.Masks.BitmapMask(this, maskImg);
      this.bg.setMask(this.worldMask);
    } else {
      this.worldMask = null;
    }

    // Mask texture sizes
    let maskW = srcW;
    let maskH = srcH;
    if (hasMask) {
      const mSrc = this.textures.get(maskKey).getSourceImage();
      maskW = mSrc.naturalWidth || mSrc.width;
      maskH = mSrc.naturalHeight || mSrc.height;
    }

    // World size AFTER zoom (camera/physics bounds must use this)
    this.worldW = srcW * BG_ZOOM;
    this.worldH = srcH * BG_ZOOM;

    // World→mask pixel mapping that respects zoom
    const w2mX = maskW / (srcW * BG_ZOOM);
    const w2mY = maskH / (srcH * BG_ZOOM);

    // Walkable sampling (white = walkable)
    const tex = this.textures;
    const THRESH = 96;
    const INVERT = false; // set true if black=walkable
    if (hasMask) {
      this.sampleLum = (wx, wy) => {
        if (wx < 0 || wy < 0 || wx >= this.worldW || wy >= this.worldH)
          return -1;
        const px = (wx * w2mX) | 0;
        const py = (wy * w2mY) | 0;
        const c = tex.getPixel(px, py, maskKey);
        if (!c) return -1;
        return (c.r + c.g + c.b) / 3;
      };
      this.isWalkable = (wx, wy) => {
        const lum = this.sampleLum(wx, wy);
        if (lum < 0) return false;
        const on = lum >= THRESH;
        return INVERT ? !on : on;
      };
    } else {
      // No mask available: everything is walkable
      this.sampleLum = () => 255;
      this.isWalkable = () => true;
    }
    this.isClear = (x, y, clearance) =>
      this.isWalkable(x, y) &&
      this.isWalkable(x - clearance, y) &&
      this.isWalkable(x + clearance, y) &&
      this.isWalkable(x, y - clearance) &&
      this.isWalkable(x, y + clearance);

    // Player spawn at (1500, 1400)
    let startKey = this.hasFoxDirs ? "foxDown" : "player";
    if (!has(startKey)) {
      // Generate a simple fallback player texture
      const g = this.add.graphics();
      g.fillStyle(0xffaa00, 1).fillCircle(12, 12, 12);
      g.generateTexture("fallbackPlayer", 24, 24);
      g.destroy();
      startKey = "fallbackPlayer";
    }
    this.player = this.physics.add.sprite(1550, 1400, startKey).setScale(0.2);
    this.player.body.setSize(this.player.width, this.player.height, true);
    this.player.setCollideWorldBounds(true);
    if (this.worldMask) this.player.setMask(this.worldMask);
    //this.snapToNearestWalkable(this.player, 600);

    // Camera/bounds
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,SHIFT");

    // Global hotkeys: 1->Intro, 2->Level1, 3->Level2
    this.input.keyboard.on("keydown-ONE", () => this.scene.start("Intro"));
    this.input.keyboard.on("keydown-TWO", () => this.scene.start("Level1"));
    this.input.keyboard.on("keydown-THREE", () => this.scene.start("Level2"));

    // Hold-to-move toward pointer (mouse/finger)
    this.followPointer = false;
    this.input.on("pointerdown", () => {
      this.followPointer = true;
    });
    this.input.on("pointerup", () => {
      this.followPointer = false;
    });
  }

  snapToNearestWalkable(sprite, maxR = 600) {
    const start = new Phaser.Math.Vector2(sprite.x, sprite.y);
    const clearance =
      Math.min(sprite.displayWidth, sprite.displayHeight) * 0.12;
    if (this.isClear(start.x, start.y, clearance)) return;
    for (let r = 2; r <= maxR; r += 2) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) {
        const x = start.x + Math.cos(a) * r;
        const y = start.y + Math.sin(a) * r;
        if (this.isClear(x, y, clearance)) {
          sprite.setPosition(x, y);
          return;
        }
      }
    }
  }

  update() {
    const speed = 160;
    let vx = 0,
      vy = 0;

    // Pointer follow (priority when held)
    if (this.followPointer && this.input.activePointer.isDown) {
      const p = this.input.activePointer;
      const dx = p.worldX - this.player.x;
      const dy = p.worldY - this.player.y;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        vx = (dx / d) * speed;
        vy = (dy / d) * speed;
      }
    } else {
      // Keyboard
      if (this.cursors.left.isDown || this.keys.A.isDown) vx = -speed;
      else if (this.cursors.right.isDown || this.keys.D.isDown) vx = speed;
      if (this.cursors.up.isDown || this.keys.W.isDown) vy = -speed;
      else if (this.cursors.down.isDown || this.keys.S.isDown) vy = speed;
    }

    // Mask collision + sliding (hold Shift to bypass)
    if (!this.keys.SHIFT.isDown) {
      const probe = 6;
      const clearance =
        Math.min(this.player.body.halfWidth, this.player.body.halfHeight) *
        0.45;
      const canX =
        vx === 0 ||
        this.isClear(
          this.player.x + Math.sign(vx) * probe,
          this.player.y,
          clearance,
        );
      const canY =
        vy === 0 ||
        this.isClear(
          this.player.x,
          this.player.y + Math.sign(vy) * probe,
          clearance,
        );
      if (!canX) vx = 0;
      if (!canY) vy = 0;
      if (
        vx === 0 &&
        vy === 0 &&
        !this.isClear(this.player.x, this.player.y, clearance)
      ) {
        this.snapToNearestWalkable(this.player, 80);
      }
    }

    // Face movement: swap directional fox textures if available; else rotate
    if (vx !== 0 || vy !== 0) {
      const angle = Math.atan2(vy, vx);
      if (this.hasFoxDirs) {
        const deg = Phaser.Math.RadToDeg(angle);
        let key = "foxRight";
        if (deg >= 45 && deg < 135) key = "foxDown";
        else if (deg >= 135 || deg < -135) key = "foxLeft";
        else if (deg >= -135 && deg < -45) key = "foxUp";
        if (this.player.texture.key !== key) {
          const pos = { x: this.player.x, y: this.player.y };
          const scale = this.player.scale;
          this.player.setTexture(key);
          this.player.setPosition(pos.x, pos.y).setScale(scale);
          this.player.body.setSize(this.player.width, this.player.height, true);
        }
        this.player.rotation = 0;
      } else {
        this.player.rotation = angle;
      }
    }

    this.player.setVelocity(vx, vy);
  }
}
