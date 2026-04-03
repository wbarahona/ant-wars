/**
 * update.ts
 *
 * One game-logic tick: camera scroll, ant updates, fight manager step.
 */

import type { GameState } from "./gameState";
import { respawnPlayer } from "./gameState";
import type { FightManager } from "./fightManager";
import { showRespawnDialog } from "./respawnDialog";

const SCROLL_SPEED = 600; // px/s
const EDGE_ZONE = 40; // px from canvas edge to trigger edge scroll

export function update(
  state: GameState,
  fights: FightManager,
  dt: number,
): void {
  let dx = 0;
  let dy = 0;

  const { input, vw, vh, camera } = state;

  // Keyboard (arrows + WASD)
  if (input.isDown("ArrowLeft") || input.isDown("KeyA"))
    dx -= SCROLL_SPEED * dt;
  if (input.isDown("ArrowRight") || input.isDown("KeyD"))
    dx += SCROLL_SPEED * dt;
  if (input.isDown("ArrowUp") || input.isDown("KeyW")) dy -= SCROLL_SPEED * dt;
  if (input.isDown("ArrowDown") || input.isDown("KeyS"))
    dy += SCROLL_SPEED * dt;

  // Mouse edge scroll (proportional to how close to the edge)
  const mx = input.mouseX;
  const my = input.mouseY;
  if (mx >= 0) {
    if (mx < EDGE_ZONE) dx -= SCROLL_SPEED * dt * (1 - mx / EDGE_ZONE);
    if (mx > vw - EDGE_ZONE)
      dx += SCROLL_SPEED * dt * ((mx - (vw - EDGE_ZONE)) / EDGE_ZONE);
    if (my < EDGE_ZONE) dy -= SCROLL_SPEED * dt * (1 - my / EDGE_ZONE);
    if (my > vh - EDGE_ZONE)
      dy += SCROLL_SPEED * dt * ((my - (vh - EDGE_ZONE)) / EDGE_ZONE);
  }

  camera.move(dx, dy);
  state.gameTime += dt;

  for (const ant of state.allAnts) ant.update(dt);

  fights.update(state.allAnts, state.gameTime);

  // Freeze player movement for the duration of any active fight
  const playerInActiveFight = [...fights.records.values()].some(
    (r) =>
      (r.antA === state.playerAnt || r.antB === state.playerAnt) &&
      r.resolvedOutcome === null,
  );
  if (playerInActiveFight) {
    state.playerAnt.target = null;
    state.flag = null;
  }

  // Detect player death — show respawn dialog exactly once
  if (!state.playerAnt.isAlive && !state.pendingRespawn) {
    state.pendingRespawn = true;
    state.flag = null; // clear any pending march marker
    showRespawnDialog((role) => respawnPlayer(state, role));
  }
}
