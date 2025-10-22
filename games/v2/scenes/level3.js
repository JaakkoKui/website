export class Level3 extends Phaser.Scene {
  constructor() { super('Level3'); }

  preload() {
    this.load.setPath('assets/');
    this.load.image('lvl3bg', 'backgrounds/level3_bg.png');
      // Use a unique key to avoid clashes with Level2's 'car' texture
      this.load.image('car_lvl3', 'car/car1.png');
      this.load.on('loaderror', (f) => console.warn('[Level3 loaderror]', f?.key || f));
  }

  create() {
    // Pick aerial background (prefer kerava)
    const bgKey = 'lvl3bg';
    const srcImg = this.textures.get(bgKey).getSourceImage();
    const srcW = srcImg.naturalWidth || srcImg.width;
    const srcH = srcImg.naturalHeight || srcImg.height;

    // Zoom in to feel closer to the ground
  const BG_ZOOM = 3.1; // deeper zoom into the aerial background
    this.bg = this.add.image(0, 0, bgKey).setOrigin(0).setScale(BG_ZOOM);

    // World bounds based on zoomed background
    this.worldW = srcW * BG_ZOOM;
    this.worldH = srcH * BG_ZOOM;

    // Player
    const startX = this.worldW * 0.5;
    const startY = this.worldH * 0.6;
    this.player = this.physics.add.sprite(startX, startY, 'car_lvl3');
    // Normalize visual size to a consistent, readable width
    const targetW = 56; // px on screen; tweak as needed
    const baseW = this.player.width || 100;
    const scale = targetW / baseW;
    this.player.setScale(scale).setOrigin(0.5, 0.5);
    // Align physics body to displayed sprite for accurate bounds
    this.player.body.setSize(this.player.displayWidth, this.player.displayHeight, true);
    this.player.setCollideWorldBounds(true);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');

    // Camera
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldW, this.worldH);
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    cam.startFollow(this.player, true, 0.15, 0.15);
    // Optional extra camera zoom for even closer feel
    // cam.setZoom(1.0);

    // Follow pointer
    this.followPointer = false;
    this.targetPos = new Phaser.Math.Vector2();

    this.input.on('pointerdown', p => {
      this.followPointer = true;
      this.targetPos.set(p.worldX, p.worldY);
    });
    this.input.on('pointerup', () => { this.followPointer = false; });
    this.input.on('pointermove', p => {
      if (p.isDown) {
        this.followPointer = true;
        this.targetPos.set(p.worldX, p.worldY);
      }
    });
  }

  update() {
    const speed = 220;
    let vx = 0, vy = 0;

    if (this.followPointer) {
      const dx = this.targetPos.x - this.player.x;
      const dy = this.targetPos.y - this.player.y;
      const d = Math.hypot(dx, dy);
      if (d > 6) { vx = (dx/d) * speed; vy = (dy/d) * speed; }
    } else {
      // WASD/Arrows as fallback
      if (this.cursors.left.isDown || this.keys.A.isDown) vx = -speed;
      else if (this.cursors.right.isDown || this.keys.D.isDown) vx = speed;
      if (this.cursors.up.isDown || this.keys.W.isDown) vy = -speed;
      else if (this.cursors.down.isDown || this.keys.S.isDown) vy = speed;
    }

    this.player.setVelocity(vx, vy);

    // Rotate car to face movement direction (assumes sprite graphic points UP by default)
  const ORIENTATION_OFFSET = Math.PI / 2; // adjust if your art faces a different base direction
    const moving = Math.abs(vx) + Math.abs(vy) > 1;
    if (moving) {
      const ang = Math.atan2(vy, vx);
      this.player.setRotation(ang + ORIENTATION_OFFSET);
    }

    // Edge message: if near world edges, show info
    const edgeMargin = 60; // px
    const nearEdge = (
      this.player.x <= edgeMargin ||
      this.player.y <= edgeMargin ||
      this.player.x >= this.worldW - edgeMargin ||
      this.player.y >= this.worldH - edgeMargin
    );
    if (!this.edgeText) {
      const cam = this.cameras.main;
      this.edgeText = this.add.text(
        cam.width / 2,
        24,
        "Alcho isn't here",
        { fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#ffe082' }
      ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100).setVisible(false);
    }
    // Keep text pinned to top center of the screen (screen-space coords with scrollFactor 0)
    const cam = this.cameras.main;
    this.edgeText.setPosition(cam.width / 2, 24);
    this.edgeText.setVisible(nearEdge);
  }
}