import type { Ant } from "../entities/ant";
import type { AntRole } from "../types";

// ---- Pixel legend -----------------------------------------------------------
//   0 = transparent
//   1 = body
//   2 = accent  (petiole / waist — darker)
//   3 = limb    (legs)
//   4 = antenna
//   5 = wing    (drones — drawn at 55 % opacity)

// ---- Sprite definition ------------------------------------------------------
interface SpriteSpec {
  cols: number;
  rows: number;
  anchor: number; // thorax-center row; maps to ant.pos.y in world space
  frameA: number[][];
  frameB: number[][];
}

// ---- WORKER / PLAYER  (8 × 12, anchor = 6) ----------------------------------
// Frame A — front & hind legs spread, mid legs tucked
const WORKER_A: number[][] = [
  [0, 4, 0, 0, 0, 0, 4, 0], //  0  antennae tips
  [0, 0, 4, 0, 0, 4, 0, 0], //  1  antennae
  [0, 0, 0, 1, 1, 0, 0, 0], //  2  head top
  [3, 0, 0, 1, 1, 0, 0, 3], //  3  head + front legs OUT
  [0, 0, 0, 1, 1, 0, 0, 0], //  4  head bottom
  [0, 0, 1, 1, 1, 1, 0, 0], //  5  thorax top
  [0, 3, 1, 1, 1, 1, 3, 0], //  6  thorax center + mid legs IN   ← ANCHOR
  [0, 0, 1, 1, 1, 1, 0, 0], //  7  thorax bottom
  [0, 0, 0, 2, 2, 0, 0, 0], //  8  petiole
  [0, 0, 1, 1, 1, 1, 0, 0], //  9  abdomen top
  [3, 0, 1, 1, 1, 1, 0, 3], // 10  abdomen center + hind legs OUT
  [0, 0, 1, 1, 1, 1, 0, 0], // 11  abdomen bottom
];

// Frame B — mid legs spread, front & hind legs tucked
const WORKER_B: number[][] = [
  [0, 4, 0, 0, 0, 0, 4, 0],
  [0, 0, 4, 0, 0, 4, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 3, 0, 1, 1, 0, 3, 0], //  3  head + front legs IN
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [3, 0, 1, 1, 1, 1, 0, 3], //  6  thorax center + mid legs OUT  ← ANCHOR
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 2, 2, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 3, 1, 1, 1, 1, 3, 0], // 10  abdomen center + hind legs IN
  [0, 0, 1, 1, 1, 1, 0, 0],
];

const SPRITE_WORKER: SpriteSpec = {
  cols: 8,
  rows: 12,
  anchor: 6,
  frameA: WORKER_A,
  frameB: WORKER_B,
};

// ---- SOLDIER  (10 × 14, anchor = 7) -----------------------------------------
// Wider, heavier head with prominent mandibles; thick 6-wide thorax & abdomen.
// Frame A — front & hind legs spread, mid legs tucked
const SOLDIER_A: number[][] = [
  [0, 0, 4, 0, 0, 0, 0, 4, 0, 0], //  0  antennae tips
  [0, 0, 0, 4, 0, 0, 4, 0, 0, 0], //  1  antennae
  [0, 0, 0, 1, 1, 1, 1, 0, 0, 0], //  2  head top  (4-wide)
  [1, 1, 0, 1, 1, 1, 1, 0, 1, 1], //  3  head + mandibles wide
  [0, 1, 0, 1, 1, 1, 1, 0, 1, 0], //  4  head + mandibles angled
  [3, 0, 0, 1, 1, 1, 1, 0, 0, 3], //  5  head bottom + front legs OUT
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0], //  6  thorax top  (6-wide)
  [0, 3, 1, 1, 1, 1, 1, 1, 3, 0], //  7  thorax center + mid legs IN  ← ANCHOR
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0], //  8  thorax bottom
  [0, 0, 0, 2, 2, 2, 2, 0, 0, 0], //  9  petiole  (4-wide)
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0], // 10  abdomen top
  [3, 0, 1, 1, 1, 1, 1, 1, 0, 3], // 11  abdomen center + hind legs OUT
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0], // 12  abdomen lower
  [0, 0, 0, 1, 1, 1, 1, 0, 0, 0], // 13  abdomen tip
];

// Frame B — mid legs spread, front & hind legs tucked
const SOLDIER_B: number[][] = [
  [0, 0, 4, 0, 0, 0, 0, 4, 0, 0],
  [0, 0, 0, 4, 0, 0, 4, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
  [1, 1, 0, 1, 1, 1, 1, 0, 1, 1], // mandibles always visible
  [0, 1, 0, 1, 1, 1, 1, 0, 1, 0],
  [0, 3, 0, 1, 1, 1, 1, 0, 3, 0], //  5  head bottom + front legs IN
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
  [3, 0, 1, 1, 1, 1, 1, 1, 0, 3], //  7  thorax center + mid legs OUT ← ANCHOR
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 2, 2, 2, 2, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 3, 1, 1, 1, 1, 1, 1, 3, 0], // 11  abdomen center + hind legs IN
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
];

const SPRITE_SOLDIER: SpriteSpec = {
  cols: 10,
  rows: 14,
  anchor: 7,
  frameA: SOLDIER_A,
  frameB: SOLDIER_B,
};

// ---- DRONE  (10 × 12, anchor = 6) -------------------------------------------
// Worker-sized body centred inside a wider 10-col grid.
// Cols 0–2 (left) and 7–9 (right) carry wing pixels (value 5) at the thorax
// rows (5–8), giving the top-down impression of spread wings over the back.
// Frame A — front & hind legs spread, mid legs tucked
const DRONE_A: number[][] = [
  [0, 0, 4, 0, 0, 0, 0, 4, 0, 0], //  0  antennae tips
  [0, 0, 0, 4, 0, 0, 4, 0, 0, 0], //  1  antennae
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0], //  2  head top  (2-wide, centred)
  [0, 3, 0, 0, 1, 1, 0, 0, 3, 0], //  3  head + front legs OUT
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0], //  4  head bottom
  [5, 5, 5, 1, 1, 1, 1, 5, 5, 5], //  5  thorax top + wings spread
  [5, 5, 3, 1, 1, 1, 1, 3, 5, 5], //  6  thorax center + mid legs IN + wings ← ANCHOR
  [0, 5, 5, 1, 1, 1, 1, 5, 5, 0], //  7  thorax bottom + wing lower portion
  [0, 0, 5, 0, 2, 2, 0, 5, 0, 0], //  8  petiole + wing tips
  [0, 0, 0, 1, 1, 1, 1, 0, 0, 0], //  9  abdomen top
  [3, 0, 0, 1, 1, 1, 1, 0, 0, 3], // 10  abdomen center + hind legs OUT
  [0, 0, 0, 1, 1, 1, 1, 0, 0, 0], // 11  abdomen bottom
];

// Frame B — mid legs spread, front & hind legs tucked  (wings are static)
const DRONE_B: number[][] = [
  [0, 0, 4, 0, 0, 0, 0, 4, 0, 0],
  [0, 0, 0, 4, 0, 0, 4, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 3, 0, 1, 1, 0, 3, 0, 0], //  3  head + front legs IN
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  [5, 5, 5, 1, 1, 1, 1, 5, 5, 5], // wings unchanged between frames
  [3, 5, 0, 1, 1, 1, 1, 0, 5, 3], //  6  thorax center + mid legs OUT ← ANCHOR
  [0, 5, 5, 1, 1, 1, 1, 5, 5, 0],
  [0, 0, 5, 0, 2, 2, 0, 5, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
  [0, 3, 0, 1, 1, 1, 1, 0, 3, 0], // 10  abdomen center + hind legs IN
  [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
];

const SPRITE_DRONE: SpriteSpec = {
  cols: 10,
  rows: 12,
  anchor: 6,
  frameA: DRONE_A,
  frameB: DRONE_B,
};

// ---- QUEEN  (8 × 14, anchor = 6) --------------------------------------------
// Same head + thorax as worker; abdomen is extended and narrows to a long tip.
// Frame A — front & hind legs spread, mid legs tucked
const QUEEN_A: number[][] = [
  [0, 4, 0, 0, 0, 0, 4, 0], //  0  antennae tips
  [0, 0, 4, 0, 0, 4, 0, 0], //  1  antennae
  [0, 0, 0, 1, 1, 0, 0, 0], //  2  head top
  [3, 0, 0, 1, 1, 0, 0, 3], //  3  head + front legs OUT
  [0, 0, 0, 1, 1, 0, 0, 0], //  4  head bottom
  [0, 0, 1, 1, 1, 1, 0, 0], //  5  thorax top
  [0, 3, 1, 1, 1, 1, 3, 0], //  6  thorax center + mid legs IN  ← ANCHOR
  [0, 0, 1, 1, 1, 1, 0, 0], //  7  thorax bottom
  [0, 0, 0, 2, 2, 0, 0, 0], //  8  petiole
  [0, 0, 1, 1, 1, 1, 0, 0], //  9  abdomen top
  [3, 0, 1, 1, 1, 1, 0, 3], // 10  abdomen upper + hind legs OUT
  [0, 0, 1, 1, 1, 1, 0, 0], // 11  abdomen mid
  [0, 0, 0, 1, 1, 0, 0, 0], // 12  abdomen narrows
  [0, 0, 0, 1, 1, 0, 0, 0], // 13  abdomen tip (extended)
];

// Frame B — mid legs spread, front & hind legs tucked
const QUEEN_B: number[][] = [
  [0, 4, 0, 0, 0, 0, 4, 0],
  [0, 0, 4, 0, 0, 4, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 3, 0, 1, 1, 0, 3, 0], //  3  head + front legs IN
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [3, 0, 1, 1, 1, 1, 0, 3], //  6  thorax center + mid legs OUT ← ANCHOR
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 2, 2, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 3, 1, 1, 1, 1, 3, 0], // 10  abdomen upper + hind legs IN
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
];

const SPRITE_QUEEN: SpriteSpec = {
  cols: 8,
  rows: 14,
  anchor: 6,
  frameA: QUEEN_A,
  frameB: QUEEN_B,
};

// ---- Role → sprite ----------------------------------------------------------
const ROLE_SPRITE: Record<AntRole, SpriteSpec> = {
  worker: SPRITE_WORKER,

  soldier: SPRITE_SOLDIER,
  drone: SPRITE_DRONE,
  queen: SPRITE_QUEEN,
};

// ---- Role scales ------------------------------------------------------------
// queen=4 → 32×56px  soldier=3 → 30×42px  drone/worker=2 → 16-20×24px
const ROLE_SCALE: Record<AntRole, number> = {
  queen: 4,
  soldier: 3,
  worker: 2,
  drone: 2,
};

// ---- Public API -------------------------------------------------------------

/**
 * Optional callback to draw a custom indicator above the ant sprite.
 * Receives ctx, the ant's centre x, and the sprite's top-most y (unrotated).
 * Called inside the rotated ctx.save() block so indicators rotate with the ant.
 */
export type IndicatorFn = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  scale: number,
) => void;

export function drawAnt(
  ctx: CanvasRenderingContext2D,
  ant: Ant,
  indicator?: IndicatorFn,
): void {
  const palette = ant.palette; // species-specific palette from Species base class
  const scale = ROLE_SCALE[ant.role];
  const spec = ROLE_SPRITE[ant.role];

  const drawX = Math.round(ant.pos.x - (spec.cols * scale) / 2);
  const drawY = Math.round(ant.pos.y - spec.anchor * scale);

  ctx.save();

  // Rotate to last known facing direction
  ctx.translate(ant.pos.x, ant.pos.y);
  ctx.rotate(ant.facingAngle);
  ctx.translate(-ant.pos.x, -ant.pos.y);

  // Dead ants: grayscale filter; alpha is handled per-pixel below
  if (ant.state === "dead") ctx.filter = "grayscale(100%)";

  const baseAlpha = ant.state === "dead" ? 0.35 : 1.0;

  // Pick animation frame
  const frame =
    ant.state === "moving"
      ? Math.floor(ant.walkPhase) % 2 === 0
        ? spec.frameA
        : spec.frameB
      : spec.frameB; // idle

  // Render pixels — wings (value 5) get reduced opacity
  for (let row = 0; row < spec.rows; row++) {
    for (let col = 0; col < spec.cols; col++) {
      const pixel = frame[row][col];
      if (pixel === 0) continue;
      ctx.globalAlpha = pixel === 5 ? baseAlpha * 0.55 : baseAlpha;
      ctx.fillStyle = palette[pixel as 1 | 2 | 3 | 4 | 5];
      ctx.fillRect(drawX + col * scale, drawY + row * scale, scale, scale);
    }
  }
  ctx.globalAlpha = 1.0;

  // Role decorators
  if (ant.role === "queen") drawCrown(ctx, ant.pos.x, drawY, scale);

  // Custom per-ant indicator (e.g. rank chevrons for the player)
  if (indicator) indicator(ctx, ant.pos.x, drawY, scale);

  ctx.restore();
}

// ---- Role decorators --------------------------------------------------------

export function drawCrown(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  scale: number,
): void {
  ctx.fillStyle = "#f4d03f";
  for (const ox of [-scale, 0, scale]) {
    ctx.fillRect(
      Math.round(cx + ox - scale / 2),
      topY - scale * 2,
      scale,
      scale * 2,
    );
  }
}
