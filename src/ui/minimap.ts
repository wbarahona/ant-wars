export interface MinimapDot {
  wx: number; // world-space x
  wy: number; // world-space y
  color: string;
}

export interface MinimapConfig {
  /** Screen-space position of the minimap top-left corner */
  x: number;
  y: number;
  /** Minimap pixel dimensions */
  width: number;
  height: number;
  /** Full world dimensions */
  worldWidth: number;
  worldHeight: number;
  /** Current camera position */
  cameraX: number;
  cameraY: number;
  /** Viewport dimensions */
  viewWidth: number;
  viewHeight: number;
  /** World assets to render as 1×1 dots */
  dots: MinimapDot[];
}

const PAD = 8;
const BORDER = 1;

export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  cfg: MinimapConfig,
): void {
  const { x, y, width, height } = cfg;
  const scaleX = width / cfg.worldWidth;
  const scaleY = height / cfg.worldHeight;

  ctx.save();

  // ---- Background ---------------------------------------------------------
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = "#0a1a0a";
  ctx.fillRect(x - PAD, y - PAD, width + PAD * 2, height + PAD * 2);

  // Outer border
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#2a4a2a";
  ctx.lineWidth = BORDER;
  ctx.strokeRect(
    x - PAD + 0.5,
    y - PAD + 0.5,
    width + PAD * 2 - 1,
    height + PAD * 2 - 1,
  );

  // ---- World area (grass) -------------------------------------------------
  ctx.fillStyle = "#3a6a32";
  ctx.fillRect(x, y, width, height);

  // ---- Grid lines (faint) -------------------------------------------------
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 0.5;
  // 3×3 dividers matching the tile regions
  for (let i = 1; i < 3; i++) {
    const lx = x + (cfg.worldWidth / 3) * i * scaleX;
    ctx.beginPath();
    ctx.moveTo(lx, y);
    ctx.lineTo(lx, y + height);
    ctx.stroke();

    const ly = y + (cfg.worldHeight / 3) * i * scaleY;
    ctx.beginPath();
    ctx.moveTo(x, ly);
    ctx.lineTo(x + width, ly);
    ctx.stroke();
  }

  // ---- Viewport rectangle -------------------------------------------------
  const vpX = x + cfg.cameraX * scaleX;
  const vpY = y + cfg.cameraY * scaleY;
  const vpW = cfg.viewWidth * scaleX;
  const vpH = cfg.viewHeight * scaleY;

  // Tinted fill
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillRect(vpX, vpY, vpW, vpH);

  // Solid border
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  ctx.strokeRect(vpX + 0.5, vpY + 0.5, vpW - 1, vpH - 1);

  // Corner ticks for clarity
  const tick = 3;
  ctx.strokeStyle = "#f4d03f";
  ctx.lineWidth = 1;
  for (const [cx, cy, sx, sy] of [
    [vpX, vpY, 1, 1],
    [vpX + vpW, vpY, -1, 1],
    [vpX, vpY + vpH, 1, -1],
    [vpX + vpW, vpY + vpH, -1, -1],
  ] as [number, number, number, number][]) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * tick, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * tick);
    ctx.stroke();
  }

  // ---- Label --------------------------------------------------------------
  ctx.fillStyle = "#7a9a7a";
  ctx.font = "9px monospace";
  ctx.fillText("MAP", x - PAD + 3, y - PAD + 9);

  // ---- Dots (world assets) -----------------------------------------------
  // Drawn after the viewport rect so they appear on top.
  // 2×2 pixels so they're clearly visible at minimap scale.
  for (const dot of cfg.dots) {
    const px = Math.round(x + dot.wx * scaleX);
    const py = Math.round(y + dot.wy * scaleY);
    // Clamp to minimap area (use 2-px size in clamp so edge dots are visible)
    if (px < x || px + 2 > x + width || py < y || py + 2 > y + height) continue;
    // Dark 1-px outline so the dot pops against any background
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(px - 1, py - 1, 4, 4);
    ctx.fillStyle = dot.color;
    ctx.fillRect(px, py, 2, 2);
  }

  ctx.restore();
}

/** Returns the default minimap config positioned bottom-left of the canvas */
export function defaultMinimapConfig(
  canvasWidth: number,
  canvasHeight: number,
  worldWidth: number,
  worldHeight: number,
  cameraX: number,
  cameraY: number,
): MinimapConfig {
  const mmW = Math.round(canvasWidth * 0.18);
  const mmH = Math.round(mmW * (worldHeight / worldWidth));
  return {
    x: PAD * 2,
    y: canvasHeight - mmH - PAD * 2,
    width: mmW,
    height: mmH,
    worldWidth,
    worldHeight,
    cameraX,
    cameraY,
    viewWidth: canvasWidth,
    viewHeight: canvasHeight,
    dots: [],
  };
}
