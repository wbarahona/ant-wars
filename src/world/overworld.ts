import type { Point } from "../types";

const TILE = 80;

export function drawOverworld(
  ctx: CanvasRenderingContext2D,
  worldWidth: number,
  worldHeight: number,
): void {
  // Base grass
  ctx.fillStyle = "#4a7c3f";
  ctx.fillRect(0, 0, worldWidth, worldHeight);

  // Subtle tile grid — makes camera movement readable
  ctx.strokeStyle = "rgba(0, 0, 0, 0.07)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= worldWidth; x += TILE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, worldHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= worldHeight; y += TILE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(worldWidth, y);
    ctx.stroke();
  }
}

export function drawFlag(ctx: CanvasRenderingContext2D, pos: Point): void {
  const { x, y } = pos;

  // Pole
  ctx.strokeStyle = "#5c3a1e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 28);
  ctx.stroke();

  // Flag banner
  ctx.fillStyle = "#e63946";
  ctx.beginPath();
  ctx.moveTo(x, y - 28);
  ctx.lineTo(x + 14, y - 22);
  ctx.lineTo(x, y - 16);
  ctx.closePath();
  ctx.fill();

  // Base circle
  ctx.fillStyle = "#5c3a1e";
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}
