/**
 * anthillPrefab.ts
 *
 * Pixel-art anthill: a dirt-coloured cone with a dark entrance hole.
 *
 * Sprite is 16 × 12 pixels, rendered at ANTHILL_SCALE (default 4×).
 * World anchor: bottom-centre of the cone base.
 *
 * Pixel legend
 * ────────────
 *   0 = transparent
 *   1 = outer dirt    (#8B5E3C)
 *   2 = inner dirt    (#A0714F)
 *   3 = highlight     (#C4966A)
 *   4 = shadow        (#6B4226)
 *   5 = entrance hole (#1a1008)  ← the black opening
 */

import type { Nest } from "../entities/nest";

export const ANTHILL_SCALE = 4;
const COLS = 16;
const ROWS = 12;

// ── Pixel grid ────────────────────────────────────────────────────────────────
// Row 0 = top of sprite
const ANTHILL_PIXELS: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0], //  0  peak
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0], //  1
  [0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0], //  2
  [0, 0, 0, 0, 1, 2, 2, 3, 2, 2, 2, 1, 0, 0, 0, 0], //  3  highlight
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0], //  4
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0], //  5
  [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0], //  6
  [0, 1, 2, 2, 2, 5, 5, 5, 5, 5, 5, 2, 2, 2, 1, 0], //  7  entrance row 1
  [0, 1, 4, 4, 4, 5, 5, 5, 5, 5, 5, 4, 4, 4, 1, 0], //  8  entrance row 2 (shadow)
  [1, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1, 1], //  9  base shadow strip
  [1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1], // 10  base
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 11  bottom edge
];

const PALETTE: Record<number, string> = {
  1: "#8B5E3C",
  2: "#A0714F",
  3: "#C4966A",
  4: "#6B4226",
  5: "#1a1008",
};

/** Half-width in world pixels — used for boundary clamping. */
export const ANTHILL_HALF_W = Math.ceil((COLS * ANTHILL_SCALE) / 2);
/** Full height in world pixels — used for boundary clamping. */
export const ANTHILL_HEIGHT = ROWS * ANTHILL_SCALE;

/**
 * Draw the anthill centred horizontally at nest.pos, bottom-anchored at nest.pos.y.
 * ctx must already be in world space (translated by camera).
 * Draws a subtle tinted species ring underneath the base.
 */
export function drawAnthill(ctx: CanvasRenderingContext2D, nest: Nest): void {
  const s = ANTHILL_SCALE;
  const startX = Math.round(nest.pos.x - (COLS * s) / 2);
  const startY = Math.round(nest.pos.y - ROWS * s);

  // Species-coloured ground shadow beneath the hill
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = nest.color;
  ctx.beginPath();
  ctx.ellipse(
    nest.pos.x,
    nest.pos.y + s,
    ANTHILL_HALF_W + 4,
    s * 2,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();

  // Pixel sprite
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const v = ANTHILL_PIXELS[row][col];
      if (v === 0) continue;
      ctx.fillStyle = PALETTE[v];
      ctx.fillRect(startX + col * s, startY + row * s, s, s);
    }
  }
}
