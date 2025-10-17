export class Level2Scene extends Phaser.Scene {
  constructor() {
    super("Level2");
  }

  preload() {
    this.load.setPath("assets/");
    this.load.image("fa_bg2", "backgrounds/level2_bg.png");
    this.load.image("fa_mask2", "backgrounds/level2_mask.png");
    // Single fox sprite used for all directions
    this.load.image("fox", "player.png");
    this.load.on("loaderror", (f) => console.warn("[loaderror]", f?.key || f));
  }

  create() {
    const bgKey = "fa_bg2";
    const maskKey = "fa_mask2";
    const has = (k) => this.textures.exists(k);

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
    this.bg = this.add.image(0, 0, bgKey).setOrigin(0).setDepth(-10).setScale(BG_ZOOM);

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
      throw new Error("Mask not available (fa_mask2), no fallback allowed");
    }

    // Mask texture sizes
    let maskW = srcW;
    let maskH = srcH;
  const mSrc = this.textures.get(maskKey).getSourceImage();
  maskW = mSrc.naturalWidth || mSrc.width;
  maskH = mSrc.naturalHeight || mSrc.height;

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

    const startKey = "fox";
  this.player = this.physics.add.sprite(1000, 1100, startKey).setScale(0.2);
    this.player.body.setSize(this.player.width, this.player.height, true);
    this.player.setCollideWorldBounds(true);
    if (this.worldMask) this.player.setMask(this.worldMask);

    // Camera/bounds
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,SHIFT");
    // Allow pointer events to pass through non-interactive children
    this.input.topOnly = false;

    // Global hotkeys: 1->Intro, 2->Level1, 3->Level2
    this.input.keyboard.on("keydown-ONE", () => this.scene.start("Intro"));
    this.input.keyboard.on("keydown-TWO", () => this.scene.start("Level1"));
    this.input.keyboard.on("keydown-THREE", () => this.scene.start("Level2"));

    // Hold-to-move toward pointer (mouse/finger)
    this.followPointer = false;
    this.targetPos = new Phaser.Math.Vector2();
    this.input.on("pointerdown", (p) => {
      this.followPointer = true;
      this.targetPos.set(p.worldX, p.worldY);
    });
    this.input.on("pointerup", () => {
      this.followPointer = false;
    });
    // Keep following while dragging on touch/mobile
    this.input.on("pointermove", (p) => {
      if (p.isDown) {
        this.followPointer = true;
        this.targetPos.set(p.worldX, p.worldY);
      }
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
    if (this.followPointer) {
      const dx = this.targetPos.x - this.player.x;
      const dy = this.targetPos.y - this.player.y;
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
      const probe = 4;
      const clearance =
        Math.min(this.player.body.halfWidth, this.player.body.halfHeight) *
        0.30;
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
        this.snapToNearestWalkable(this.player, 200);
      }
    }

    // Face movement with a single fox sprite:
    // - Horizontal: flipX for left, rotation 0
    // - Up: rotate -90°, Down: rotate +90° (no flip)
    // - Diagonals: use horizontal facing by vx sign, rotation 0
    if (vx !== 0 || vy !== 0) {
      if (this.player.texture.key !== "fox" && this.textures.exists("fox")) {
        const pos = { x: this.player.x, y: this.player.y };
        const scale = this.player.scale;
        this.player.setTexture("fox");
        this.player.setPosition(pos.x, pos.y).setScale(scale);
        this.player.body.setSize(this.player.width, this.player.height, true);
      }

      let flipX = false;
      let rot = 0;
      if (vy < 0 && vx === 0) {
        // Up
        flipX = false;
        rot = -Math.PI / 2;
      } else if (vy > 0 && vx === 0) {
        // Down
        flipX = false;
        rot = Math.PI / 2;
      } else if (vx < 0 && vy === 0) {
        // Left
        flipX = true;
        rot = 0;
      } else if (vx > 0 && vy === 0) {
        // Right
        flipX = false;
        rot = 0;
      } else {
        // Diagonals → choose left/right by vx sign
        flipX = vx < 0;
        rot = 0;
      }

      this.player.setFlipX(flipX);
      this.player.setRotation(rot);
    }

    this.player.setVelocity(vx, vy);
  }
}
