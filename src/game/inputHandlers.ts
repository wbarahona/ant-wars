/**
 * inputHandlers.ts
 *
 * Registers all canvas/document event listeners.
 * Mutates GameState directly (flag, followerCount, camera).
 */

import type { GameState } from "./gameState";
import { resizeViewport, respawnPlayer } from "./gameState";
import type { FightManager } from "./fightManager";
import { Nest } from "../entities/nest";
import { Ant } from "../entities/ant";
import { showBurrowDialog } from "./burrowDialog";
import { ANTHILL_HALF_W, ANTHILL_HEIGHT } from "../prefabs/anthillPrefab";
import {
  orderMarch,
  orderCharge,
  orderPickFood,
  orderApproachFriend,
  showPlayerContextMenu,
  hidePlayerContextMenu,
  type ContextMenuAction,
} from "../prefabs/playerAntPrefab";
import { recruitAnts, releaseSquad, countSquad } from "./squadManager";

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

  // ---- Trail visibility checkboxes ----------------------------------------
  const cbFoodTrail = document.getElementById(
    "cb-food-trail",
  ) as HTMLInputElement | null;
  const cbAttackTrail = document.getElementById(
    "cb-attack-trail",
  ) as HTMLInputElement | null;
  cbFoodTrail?.addEventListener("change", () => {
    state.showFoodTrail = cbFoodTrail.checked;
  });
  cbAttackTrail?.addEventListener("change", () => {
    state.showAttackTrail = cbAttackTrail.checked;
  });

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

    // ESC: close context menu
    if (e.key === "Escape") {
      hidePlayerContextMenu();
    }

    // P key: pause / resume (only during active gameplay)
    if (e.key === "p" || e.key === "P") {
      if (state.phase === "playing") {
        state.paused = !state.paused;
      }
    }

    // Q key: snap camera to player ant and open context menu at cursor
    if (e.key === "q" || e.key === "Q") {
      if (!state.playerAnt.isAlive) return;
      if (state.phase === "game_over") return;

      // Center viewport on player
      state.camera.centerOn(state.playerAnt.pos.x, state.playerAnt.pos.y);

      // Use current mouse position (or fall back to screen centre)
      const mx = state.input.mouseX >= 0 ? state.input.mouseX : state.vw / 2;
      const my = state.input.mouseY >= 0 ? state.input.mouseY : state.vh / 2;

      const isHungry =
        state.playerAnt.energy / state.playerAnt.maxEnergy <= 0.2;
      showPlayerContextMenu(
        state.playerAnt,
        mx,
        my,
        isHungry,
        state.phase,
        (action: ContextMenuAction) => {
          if (action === "burrowHere") {
            const playerNest = new Nest(state.playerAnt.species, {
              x: state.playerAnt.pos.x,
              y: state.playerAnt.pos.y,
            });
            const colonyQueen = new Ant(state.playerAnt.species, "queen", {
              x: state.playerAnt.pos.x + (Math.random() - 0.5) * 40,
              y: state.playerAnt.pos.y + (Math.random() - 0.5) * 40,
            });
            playerNest.queenAnt = colonyQueen;
            state.allAnts.push(colonyQueen);
            state.nests.push(playerNest);
            showBurrowDialog(state.playerAnt.species, (role) => {
              respawnPlayer(state, role);
              state.phase = "playing";
            });
            return;
          }
          if (action === "recruit5") {
            state.followerCount = recruitAnts(
              5,
              state.allAnts,
              state.playerAnt,
            );
          }
          if (action === "recruit10") {
            state.followerCount = recruitAnts(
              10,
              state.allAnts,
              state.playerAnt,
            );
          }
          if (action === "release") {
            state.followerCount = releaseSquad(state.allAnts);
          }
        },
      );
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
      state.phase,
      (action: ContextMenuAction) => {
        if (action === "burrowHere") {
          // Create and register the player's nest at the queen's position
          const playerNest = new Nest(state.playerAnt.species, {
            x: state.playerAnt.pos.x,
            y: state.playerAnt.pos.y,
          });
          // Spawn the colony NPC queen next to the burrow (not player-controlled)
          const colonyQueen = new Ant(state.playerAnt.species, "queen", {
            x: state.playerAnt.pos.x + (Math.random() - 0.5) * 40,
            y: state.playerAnt.pos.y + (Math.random() - 0.5) * 40,
          });
          playerNest.queenAnt = colonyQueen;
          state.allAnts.push(colonyQueen);
          state.nests.push(playerNest);
          showBurrowDialog(state.playerAnt.species, (role) => {
            respawnPlayer(state, role);
            state.phase = "playing";
          });
          return;
        }
        if (action === "recruit5") {
          state.followerCount = recruitAnts(5, state.allAnts, state.playerAnt);
        }
        if (action === "recruit10") {
          state.followerCount = recruitAnts(10, state.allAnts, state.playerAnt);
        }
        if (action === "release") {
          state.followerCount = releaseSquad(state.allAnts);
        }
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

    // Check if a friendly ant was clicked — approach and replenish energy
    const FRIEND_HIT_RADIUS = 20;
    const FRIEND_MAX_RANGE = 280; // only reachable friends within ~280 world px
    const clickedFriend = state.allAnts.find((a) => {
      if (a === state.playerAnt || !a.isAlive) return false;
      if (a.species !== state.playerAnt.species) return false;
      const fx = a.pos.x - worldClickX;
      const fy = a.pos.y - worldClickY;
      return Math.sqrt(fx * fx + fy * fy) <= FRIEND_HIT_RADIUS;
    });

    if (clickedFriend) {
      // Range-gate: only allow if the clicked ant is close enough to the player
      const prx = clickedFriend.pos.x - state.playerAnt.pos.x;
      const pry = clickedFriend.pos.y - state.playerAnt.pos.y;
      if (prx * prx + pry * pry <= FRIEND_MAX_RANGE * FRIEND_MAX_RANGE) {
        state.flag = null;
        orderApproachFriend(state.playerAnt, clickedFriend.pos);
        // Start tracking: ally will follow player position each tick
        state.replenishTarget = clickedFriend;
      }
      return;
    }

    // Check if a food item was clicked
    const FOOD_HIT_RADIUS = 14;
    const clickedFood = state.foods.find((food) => {
      const fx = food.pos.x - worldClickX;
      const fy = food.pos.y - worldClickY;
      return Math.sqrt(fx * fx + fy * fy) <= FOOD_HIT_RADIUS && !food.isCarried;
    });

    if (clickedFood) {
      state.flag = null;
      orderPickFood(state.playerAnt, clickedFood.pos);
      return;
    }

    // Check if a nest/burrow was clicked — clear any waypoint and do nothing else
    const clickedNest = state.nests.find((nest) => {
      const dx = worldClickX - nest.pos.x;
      const dy = worldClickY - nest.pos.y;
      return Math.abs(dx) <= ANTHILL_HALF_W && dy >= -ANTHILL_HEIGHT && dy <= 0;
    });

    if (clickedNest) {
      // March to the nest silently — no flag marker shown
      state.flag = null;
      orderMarch(
        state.playerAnt,
        { x: clickedNest.pos.x, y: clickedNest.pos.y },
        state.followerCount,
      );
      return;
    }
    state.flag = { x: worldClickX, y: worldClickY };
    orderMarch(state.playerAnt, state.flag, state.followerCount);
  });
}
