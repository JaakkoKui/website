// === Rainbow color utility ===
export function getRainbowColor(phase) {
  // phase is between [0, 1)
  const h = phase * 360; // convert to degrees for clarity
  const s = 1;
  const v = 1;

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r1, g1, b1;
  if (h >= 0 && h < 60) {
    [r1, g1, b1] = [c, x, 0];
  } else if (h >= 60 && h < 120) {
    [r1, g1, b1] = [x, c, 0];
  } else if (h >= 120 && h < 180) {
    [r1, g1, b1] = [0, c, x];
  } else if (h >= 180 && h < 240) {
    [r1, g1, b1] = [0, x, c];
  } else if (h >= 240 && h < 300) {
    [r1, g1, b1] = [x, 0, c];
  } else {
    [r1, g1, b1] = [c, 0, x];
  }

  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);

  return { r, g, b };
}

// === Segis class ===
export class Segis {
  constructor(initial = 0) {
    this.value = Math.min(100, Math.max(0, initial));
  }

  add(amount) {
    this.value = Math.min(100, this.value + amount);
  }

  subtract(amount) {
    this.value = Math.max(0, this.value - amount);
  }

  update(dt, decayRate = 0.01) {
    // dt is in milliseconds (like Phaser's delta)
    this.subtract(decayRate * (dt / 1000));
  }

  get() {
    return parseFloat(this.value.toFixed(2));
  }

  reset() {
    this.value = 0;
  }
}

// Global segis instance (like in Python)
export const segis = new Segis();
