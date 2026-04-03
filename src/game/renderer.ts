/**
 * renderer.ts
 *
 * One render pass: world geometry → ants → fight effects → minimap → HUD.
 */

import type { GameState } from "./gameState";
import type { FightManager } from "./fightManager";
import type { MinimapDot } from "../ui/minimap";
import { drawOverworld, drawFlag } from "../world/overworld";
import { drawMinimap, defaultMinimapConfig } from "../ui/minimap";
import { drawPlayerAnt } from "../prefabs/playerAntPrefab";
import { drawAnt } from "../prefabs/antPrefab";
import { updatePlayerStats } from "../ui/statsPanel";
import { drawFightCloud, drawFightResolution } from "../gfx/fightCloud";
import { drawFood } from "../prefabs/foodPrefab";

export function render(state: GameState, fights: FightManager): void {
  const {
    ctx,
    vw,
    vh,
    camera,
    worldWidth,
    worldHeight,
    flag,
    playerAnt,
    allAnts,
    foods,
    gameTime,
  } = state;

  // ---- World-space pass ---------------------------------------------------
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, vw, vh);
  ctx.clip();
  ctx.translate(-camera.x, -camera.y);

  drawOverworld(ctx, worldWidth, worldHeight);
  if (flag) drawFlag(ctx, flag);

  // Ground food (drawn below ants)
  for (const food of foods) {
    if (!food.isCarried) drawFood(ctx, food);
  }

  for (const ant of allAnts) {
    if (!ant.isPlayer) drawAnt(ctx, ant);
  }
  drawPlayerAnt(ctx, playerAnt);

  // Carried food (drawn above ants — shows as held in mandibles)
  for (const food of foods) {
    if (food.isCarried) drawFood(ctx, food);
  }

  // Fight cloud (0–1.2 s) then resolution splash (1.2–2.8 s)
  for (const [, rec] of fights.records) {
    const elapsed = gameTime - rec.startTime;
    if (elapsed < 1.2) {
      drawFightCloud(
        ctx,
        rec.midX,
        rec.midY,
        gameTime,
        rec.antA.species,
        rec.antB.species,
      );
    } else if (elapsed < 2.8) {
      const winnerSpecies = rec.antA.isAlive
        ? rec.antA.species
        : rec.antB.species;
      drawFightResolution(
        ctx,
        rec.midX,
        rec.midY,
        elapsed - 1.2,
        winnerSpecies,
        rec.resolvedOutcome ?? "K.O.!",
      );
    }
  }

  ctx.restore();

  // ---- Screen-space pass: minimap -----------------------------------------
  const mm = defaultMinimapConfig(
    vw,
    vh,
    worldWidth,
    worldHeight,
    camera.x,
    camera.y,
  );

  const dots: MinimapDot[] = [];
  if (flag) dots.push({ wx: flag.x, wy: flag.y, color: "#e63946" });
  // Food items — small lime dots
  for (const food of foods) {
    if (!food.isCarried)
      dots.push({ wx: food.pos.x, wy: food.pos.y, color: "#4ade80" });
  }
  for (const ant of allAnts) {
    if (!ant.isAlive) continue;
    dots.push({
      wx: ant.pos.x,
      wy: ant.pos.y,
      color: ant.isPlayer ? "#f4d03f" : ant.color,
    });
  }
  mm.dots = dots;
  drawMinimap(ctx, mm);

  // ---- HUD: right-side stats panel ----------------------------------------
  updatePlayerStats(playerAnt);
}
