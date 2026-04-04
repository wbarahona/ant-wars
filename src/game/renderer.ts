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
import { updatePlayerStats, updateColonyPanels } from "../ui/statsPanel";
import { updateNotificationBanner } from "../ui/notificationBanner";
import { drawFightCloud, drawFightResolution } from "../gfx/fightCloud";
import { drawFood } from "../prefabs/foodPrefab";
import { drawAnthill } from "../prefabs/anthillPrefab";

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

  // Anthills — drawn just above the overworld but below everything else
  for (const nest of state.nests) {
    drawAnthill(ctx, nest);
  }

  // Pheromone trails — below food and ants (own-colony only)
  state.pheromoneLayer.draw(
    ctx,
    "food",
    state.showFoodTrail,
    playerAnt.species,
  );
  state.pheromoneLayer.draw(
    ctx,
    "attack",
    state.showAttackTrail,
    playerAnt.species,
  );

  // Ground food (drawn below ants)
  for (const food of foods) {
    if (!food.isCarried) drawFood(ctx, food);
  }

  for (const ant of allAnts) {
    if (!ant.isPlayer) drawAnt(ctx, ant);
  }
  drawPlayerAnt(ctx, playerAnt);

  // NPC queen indicator — pulsing gold ring so they stand out as VIP targets
  for (const nest of state.nests) {
    const q = nest.queenAnt;
    if (!q || !q.isAlive) continue;
    const pulse = 0.55 + 0.45 * Math.sin(state.gameTime * 4);
    ctx.save();
    ctx.strokeStyle = nest.species === "black" ? "#f4d03f" : "#ff6b6b";
    ctx.lineWidth = 2;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(q.pos.x, q.pos.y, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

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
  // Nests — drawn first (below ants) as larger landmarks
  for (const nest of state.nests) {
    dots.push({ wx: nest.pos.x, wy: nest.pos.y, color: nest.color, size: 5 });
  }
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

  // Pheromone minimap overlay (drawn on top of minimap)
  state.pheromoneLayer.drawMinimap(
    ctx,
    "food",
    state.showFoodTrail,
    playerAnt.species,
    mm.x,
    mm.y,
    mm.width,
    mm.height,
    worldWidth,
    worldHeight,
  );
  state.pheromoneLayer.drawMinimap(
    ctx,
    "attack",
    state.showAttackTrail,
    playerAnt.species,
    mm.x,
    mm.y,
    mm.width,
    mm.height,
    worldWidth,
    worldHeight,
  );

  // ---- HUD: right-side stats panel ----------------------------------------
  updatePlayerStats(playerAnt);
  updateColonyPanels(state.nests, state.playerSpecies, state.foeSpecies);
  updateNotificationBanner(state, fights);

  // ---- Pause overlay -------------------------------------------------------
  if (state.paused) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, vw, vh);
    ctx.font = "bold 48px 'Courier New', monospace";
    ctx.fillStyle = "#f4d03f";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⏸  PAUSED", vw / 2, vh / 2);
    ctx.font = "14px 'Courier New', monospace";
    ctx.fillStyle = "#7a7aaa";
    ctx.fillText("Press P to resume", vw / 2, vh / 2 + 52);
    ctx.restore();
  }
}
