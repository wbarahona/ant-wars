/**
 * foodPrefab.ts
 *
 * Pixel-art renderer for Food entities.
 *
 * Visual design: a 3-D orb/berry with a tiny stem.
 * Light source: top-left.  Shading: highlight → light → mid → dark → shadow.
 *
 * Grid: 8 × 8 pixels, each rendered at FOOD_SCALE px.
 * The sprite is centred on food.pos (food.pos is the orb centre in world space).
 *
 * Pixel legend
 * ────────────
 *   0  transparent
 *   1  stem        (#3d2b1f  dark brown)
 *   2  highlight   (#d8ffd4  near-white green)
 *   3  light       (#96e893  pale green)
 *   4  mid         (#3db841  base green)
 *   5  dark        (#1f7a27  forest green)
 *   6  shadow      (#0b4012  deep shadow)
 */

import type { Food } from "../entities/food";

const FOOD_SCALE = 3; // world-px per sprite pixel

// 8 × 8 grid — sphere with top-left light, bottom-right shadow, and a stem
const FOOD_PIXELS: number[][] = [
  [0, 0, 4, 4, 4, 4, 0, 0], // row 0  stem
  [0, 4, 4, 2, 3, 4, 4, 0], // row 1  top highlight
  [4, 2, 2, 4, 4, 4, 4, 4], // row 2  upper body
  [4, 2, 4, 4, 4, 4, 4, 5], // row 3  upper-mid
  [4, 3, 4, 4, 4, 4, 4, 5], // row 4  lower-mid
  [4, 4, 4, 4, 4, 4, 4, 5], // row 5  lower
  [0, 4, 4, 4, 4, 4, 5, 0], // row 6  bottom
  [0, 0, 4, 5, 5, 5, 0, 0], // row 7  empty
];

const FOOD_PALETTE: Record<number, string> = {
  1: "#3d2b1f", // stem
  2: "#d8ffd4", // highlight
  3: "#96e893", // light
  4: "#3db841", // mid
  5: "#1f7a27", // dark
  6: "#0b4012", // shadow
};

/**
 * Draws a food item centred on food.pos.
 * Call inside the camera-translated world-space ctx.save() block.
 */
export function drawFood(ctx: CanvasRenderingContext2D, food: Food): void {
  // Centre the 8×8 grid on pos — anchor at (4, 3.5) so the orb body is centred
  // and the stem protrudes above
  const startX = Math.round(food.pos.x - 4 * FOOD_SCALE);
  const startY = Math.round(food.pos.y - 3.5 * FOOD_SCALE);

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const v = FOOD_PIXELS[row][col];
      if (v === 0) continue;
      ctx.fillStyle = FOOD_PALETTE[v];
      ctx.fillRect(
        startX + col * FOOD_SCALE,
        startY + row * FOOD_SCALE,
        FOOD_SCALE,
        FOOD_SCALE,
      );
    }
  }
}
