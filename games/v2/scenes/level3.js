import { segis, getRainbowColor } from "../core/segis.js";

export class Level3 extends Phaser.Scene {
  constructor() { super('Level3'); }

  preload() {
    this.load.setPath('assets/');
    this.load.image('lvl3bg', 'backgrounds/level3_bg.png');
      this.load.image('car_lvl3', 'car/car1.png');
      this.load.image('poliisi_car', 'car/poliisi1.png');
      this.load.image('Alcho', 'miscImages/alchoNoBG.png');
    this.load.on('loaderror', (f) => console.warn('[Level3 loaderror]', f?.key || f));
  }

  create() {
    const bgKey = 'lvl3bg';
    const srcImg = this.textures.get(bgKey).getSourceImage();
    const srcW = srcImg.naturalWidth || srcImg.width;
    const srcH = srcImg.naturalHeight || srcImg.height;

    const BG_ZOOM = 3.1;
    this.bg = this.add.image(0, 0, bgKey).setOrigin(0).setScale(BG_ZOOM);

    // World bounds based on zoomed background
    this.worldW = srcW * BG_ZOOM;
    this.worldH = srcH * BG_ZOOM;

    // Player
    const startX = this.worldW * 0.4;
    const startY = this.worldH * 0.5;
    this.player = this.physics.add.sprite(startX, startY, 'car_lvl3');
    this.poliisiCars = [
      this.add.image(1650, 2500, 'poliisi_car').setFlipX(true).setScale(0.25),
      this.add.image(2000, 3100, 'poliisi_car').setScale(0.25),
    ];
    this.alcho = this.add.image(1860, 2370, 'Alcho').setScale(0.40);
    this.player.setScale(0.08).setOrigin(0.5, 0.5);
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

    this.input.on('pointerdown', (p) => {
      this.followPointer = true;
      this.targetPos.set(p.worldX, p.worldY);
    });
    this.input.on('pointerup', () => {
      this.followPointer = false;
    });
    this.input.on('pointermove', (p) => {
      if (p.isDown) {
        this.followPointer = true;
        this.targetPos.set(p.worldX, p.worldY);
      }
    });
    this.edgeText = null;

    this.segisText = this.add
      .text(16, 16, "Segis: 0", {
        fontFamily: "Arial, sans-serif",
        fontSize: "24px",
        color: "#ffffff",
      })
      .setScrollFactor(0)
      .setDepth(200);
    this.segisColorPhase = 0;
  }

  update(time, delta) {
    const dt = delta;
    const speed = 300;
    let vx = 0, vy = 0;

    if (this.followPointer) {
      const dx = this.targetPos.x - this.player.x;
      const dy = this.targetPos.y - this.player.y;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        vx = (dx / d) * speed;
        vy = (dy / d) * speed;
      }
    } else {
      if (this.cursors.left.isDown || this.keys.A.isDown) vx = -speed;
      else if (this.cursors.right.isDown || this.keys.D.isDown) vx = speed;
      if (this.cursors.up.isDown || this.keys.W.isDown) vy = -speed;
      else if (this.cursors.down.isDown || this.keys.S.isDown) vy = speed;
    }

    this.player.setVelocity(vx, vy);

    const ORIENTATION_OFFSET = Math.PI / 2;
    const moving = Math.abs(vx) + Math.abs(vy) > 1;
    if (moving) {
      const ang = Math.atan2(vy, vx);
      this.player.setRotation(ang + ORIENTATION_OFFSET);
    }

    const edgeMargin = 160;
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
        120,
        "Alcho isn't here",
        { fontFamily: "Arial, sans-serif",
        fontSize: "30px",
        color: "#e9600bff",
        backgroundColor: "#00000080",
        padding: { x: 8, y: 4 },
      }
      ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100).setVisible(false);
    }
    const cam = this.cameras.main;
    this.edgeText.setPosition(cam.width / 2, 120);
    this.edgeText.setVisible(nearEdge);

  const segVal = segis.get();
  const colorSpeed = 0.000005 * segVal;
  this.segisColorPhase += colorSpeed * dt;
  segis.update(dt);
    const rgb = getRainbowColor(this.segisColorPhase % 1);
    const hex = `#${rgb.r.toString(16).padStart(2, "0")}${rgb.g
      .toString(16)
      .padStart(2, "0")}${rgb.b.toString(16).padStart(2, "0")}`;
    if (this.segisText) {
      this.segisText.setText(`Segis: ${segVal}`);
      this.segisText.setColor(hex);
    }
  }
}