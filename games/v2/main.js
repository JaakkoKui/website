// Phaser 3 Starter for Ketunkolo

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  pixelArt: true,
  backgroundColor: "#1d1d1d",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [MainScene],
};

new Phaser.Game(config);

function MainScene() {}

MainScene.prototype.preload = function () {
  // Load under assets/ by default
  this.load.setPath("assets/");

  // Background + sprites
  this.load.image("background", "background.png");
  this.load.image("player", "player.png");

  // Tilemap (optional). If these files or names don’t exist, we’ll fall back safely.
  this.load.image("tiles", "tiles.png");
  this.load.tilemapTiledJSON("map", "map.json");

  // Helpful logs
  this.load.on("loaderror", (file) =>
    console.warn("[loaderror]", file?.key || file),
  );
  this.load.on("complete", () => console.log("[load complete]"));
};

MainScene.prototype.create = function () {
  // Background behind the world (fixed to camera view, parallax-ready)
  this.bg = this.add
    .tileSprite(0, 0, this.scale.width, this.scale.height, "background")
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(-10);

  // Try to build the tilemap if present
  let map = null;
  try {
    if (this.cache.tilemap.exists("map")) {
      map = this.make.tilemap({ key: "map" });

      // IMPORTANT: this string must match the Tileset name inside your Tiled map
      // If your tileset is named something else in Tiled, change 'tiles' below.
      const tileset = map.addTilesetImage("tiles", "tiles");
      const worldLayer = map.createLayer("World", tileset, 0, 0);
      if (worldLayer) {
        worldLayer.setCollisionByProperty({ collides: true });
        this.worldLayer = worldLayer;
      } else {
        console.warn(
          "Tilemap layer 'World' not found – continuing without collisions.",
        );
      }
    } else {
      console.warn("Tilemap 'map' not found – running fallback scene.");
    }
  } catch (e) {
    console.error("Error building tilemap:", e);
    map = null;
  }

  // Player
  this.player = this.physics.add.sprite(100, 100, "player");
  this.player.setCollideWorldBounds(true);
  if (this.worldLayer) {
    this.physics.add.collider(this.player, this.worldLayer);
  }

  // World/camera bounds
  if (map) {
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
  } else {
    // Fallback bounds: just use a modest area so you can move around
    this.physics.world.setBounds(0, 0, 2000, 1200);
    this.cameras.main.setBounds(0, 0, 2000, 1200);
  }
  this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

  // Input
  this.cursors = this.input.keyboard.createCursorKeys();

  // Touch controls (tap to move toward pointer)
  this.touchZone = this.add
    .zone(0, 0, this.cameras.main.width, this.cameras.main.height)
    .setOrigin(0)
    .setInteractive();
  this.touchPointer = null;
  this.touchZone.on("pointerdown", (p) => {
    this.touchPointer = p;
  });
  this.touchZone.on("pointerup", () => {
    this.touchPointer = null;
  });

  console.log("[create] ready");
};

MainScene.prototype.update = function () {
  const speed = 160;
  let vx = 0,
    vy = 0;

  // Keyboard
  if (this.cursors?.left.isDown) vx = -speed;
  else if (this.cursors?.right.isDown) vx = speed;

  if (this.cursors?.up.isDown) vy = -speed;
  else if (this.cursors?.down.isDown) vy = speed;

  // Touch: move toward touch point
  if (this.touchPointer) {
    const dx = this.touchPointer.worldX - this.player.x;
    const dy = this.touchPointer.worldY - this.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 8) {
      vx = (dx / dist) * speed;
      vy = (dy / dist) * speed;
    }
  }

  this.player.setVelocity(vx, vy);

  // Mild parallax for background
  if (this.bg) {
    const cam = this.cameras.main;
    this.bg.tilePositionX = cam.scrollX * 0.2;
    this.bg.tilePositionY = cam.scrollY * 0.2;
  }
};
