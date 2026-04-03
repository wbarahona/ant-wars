/**
 * inputHandlers.ts
 *
 * Registers all canvas/document event listeners.
 * Mutates GameState directly (flag, followerCount, camera).
 */

import type { GameState } from "./gameState";
import { resizeViewport } from "./gameState";
import type { FightManager } from "./fightManager";
import {
  orderMarch,
  orderCharge,
  showPlayerContextMenu,
  hidePlayerContextMenu,
  type ContextMenuAction,
} from "../prefabs/playerAntPrefab";

export function registerInputHandlers(
  state: GameState,
  fights: FightManager,
): void {
  const { canvas } = state;

  // ---- Stats panel toggle (burger button + Tab key) -----------------------
  const statsPanel = document.getElementById("stats-panel");
  const hudToggle = document.getElementById("hud-toggle");

  function toggleStats(): void {
    statsPanel?.classList.toggle("open");
  }

  hudToggle?.addEventListener("click", toggleStats);

  // ---- Window resize: recalculate canvas + camera -------------------------
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => resizeViewport(state), 100);
  });

  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      toggleStats();
    }
  });

  // ---- Right-click: player ant context menu --------------------------------
  canvas.addEventListener("contextmenu", (e: MouseEvent) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Hit-test: within 20 px of player ant in screen space?
    const ax = state.playerAnt.pos.x - state.camera.x;
    const ay = state.playerAnt.pos.y - state.camera.y;
    const dx = sx - ax;
    const dy = sy - ay;
    if (Math.sqrt(dx * dx + dy * dy) > 20) return;

    const isHungry = state.playerAnt.energy / state.playerAnt.maxEnergy <= 0.2;

    showPlayerContextMenu(
      state.playerAnt,
      e.clientX,
      e.clientY,
      isHungry,
      (action: ContextMenuAction) => {
        if (action === "recruit5") state.followerCount += 5;
        if (action === "recruit10") state.followerCount += 10;
        if (action === "release") state.followerCount = 0;
        // "askFood" — no game state change yet
      },
    );
  });

  // Dismiss context menu on any click elsewhere
  document.addEventListener("click", () => hidePlayerContextMenu());

  // ---- Left-click: minimap nav / enemy charge / terrain march --------------
  canvas.addEventListener("click", (e: MouseEvent) => {
    // Dead player can't issue orders
    if (!state.playerAnt.isAlive) return;

    // Busy fighting — lock movement/charge until the fight resolves
    const inFight = [...fights.records.values()].some(
      (r) =>
        (r.antA === state.playerAnt || r.antB === state.playerAnt) &&
        r.resolvedOutcome === null,
    );
    if (inFight) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Minimap hit bounds (must match drawMinimap constants)
    const mmW = Math.round(state.vw * 0.18);
    const mmH = Math.round(mmW * (state.worldHeight / state.worldWidth));
    const mmX = 16;
    const mmY = state.vh - mmH - 16;

    if (sx >= mmX && sx <= mmX + mmW && sy >= mmY && sy <= mmY + mmH) {
      const worldX = ((sx - mmX) / mmW) * state.worldWidth;
      const worldY = ((sy - mmY) / mmH) * state.worldHeight;
      state.camera.centerOn(worldX, worldY);
      return;
    }

    const worldClickX = sx + state.camera.x;
    const worldClickY = sy + state.camera.y;

    // Check if an enemy ant was clicked
    const enemies = state.allAnts.filter(
      (a) => a.species !== state.playerAnt.species && a.isAlive,
    );
    const HIT_RADIUS = 20; // px in world space
    const clickedEnemy = enemies.find((enemy) => {
      const ex = enemy.pos.x - worldClickX;
      const ey = enemy.pos.y - worldClickY;
      return Math.sqrt(ex * ex + ey * ey) <= HIT_RADIUS;
    });

    if (clickedEnemy) {
      state.flag = null;
      orderCharge(state.playerAnt, clickedEnemy.pos, state.followerCount);
      return;
    }

    // Terrain click — place flag and march
    state.flag = { x: worldClickX, y: worldClickY };
    orderMarch(state.playerAnt, state.flag, state.followerCount);
  });
}
