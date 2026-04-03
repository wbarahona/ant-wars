/**
 * gameState.ts
 *
 * Shared mutable game state created once at boot and passed to every module.
 * Keeps canvas/world setup co-located with the objects that depend on it.
 */

import type { Point } from "../types";
import type { AntRole } from "../types";
import { Camera } from "../world/camera";
import { InputHandler } from "../input";
import { Ant } from "../entities/ant";

export interface GameState {
  // Render targets
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  // Viewport / world dimensions
  vw: number;
  vh: number;
  worldWidth: number;
  worldHeight: number;

  // Systems
  camera: Camera;
  input: InputHandler;

  // Mutable game state
  flag: Point | null;
  followerCount: number;
  gameTime: number;

  // Entities
  playerAnt: Ant;
  allAnts: Ant[];

  // Respawn flow
  /** True from the moment the player dies until the new ant is spawned. */
  pendingRespawn: boolean;
}

export function createGameState(): GameState {
  // ---- Canvas sizing: full window -----------------------------------------
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  canvas.width = vw;
  canvas.height = vh;

  // ---- World: 3× viewport in each axis ------------------------------------
  const worldWidth = vw * 3;
  const worldHeight = vh * 3;

  // ---- Systems ------------------------------------------------------------
  const camera = new Camera(vw, vh, worldWidth, worldHeight);
  const input = new InputHandler(canvas);

  // ---- Entities -----------------------------------------------------------
  const playerAnt = new Ant(
    "black",
    "drone",
    { x: worldWidth / 2, y: worldHeight / 2 },
    true,
  );
  playerAnt.rank = 0;

  const testNpc = new Ant("red", "worker", {
    x: worldWidth / 2 + 60,
    y: worldHeight / 2,
  });
  testNpc.rank = 0;

  const buffedNpc = new Ant("red", "soldier", {
    x: worldWidth / 2 + 120,
    y: worldHeight / 2,
  });
  buffedNpc.rank = 4;

  const greenNpc = new Ant("green", "soldier", {
    x: worldWidth / 2 - 80,
    y: worldHeight / 2,
  });
  greenNpc.rank = 1;

  const yellowNpc = new Ant("yellow", "worker", {
    x: worldWidth / 2,
    y: worldHeight / 2 + 80,
  });
  yellowNpc.rank = 0;

  const allAnts: Ant[] = [playerAnt, testNpc, buffedNpc, greenNpc, yellowNpc];

  camera.centerOn(playerAnt.pos.x, playerAnt.pos.y);

  return {
    canvas,
    ctx,
    vw,
    vh,
    worldWidth,
    worldHeight,
    camera,
    input,
    flag: null,
    followerCount: 0,
    gameTime: 0,
    playerAnt,
    allAnts,
    pendingRespawn: false,
  };
}

/**
 * Called on window resize — updates canvas dimensions and camera viewport.
 * World size stays fixed; only the visible window changes.
 */
export function resizeViewport(state: GameState): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  state.canvas.width = vw;
  state.canvas.height = vh;
  state.vw = vw;
  state.vh = vh;
  state.camera.resize(vw, vh);
}

/**
 * Replaces the dead player ant with a fresh one of the chosen caste.
 * Stats reset to base values; spawns at world centre; old ant removed from allAnts.
 */
export function respawnPlayer(state: GameState, newRole: AntRole): void {
  const spawnPos = { x: state.worldWidth / 2, y: state.worldHeight / 2 };
  const newAnt = new Ant(state.playerAnt.species, newRole, spawnPos, true);

  // Swap old player ant for new one in the shared array
  const idx = state.allAnts.indexOf(state.playerAnt);
  if (idx !== -1) state.allAnts[idx] = newAnt;
  else state.allAnts.unshift(newAnt);

  state.playerAnt = newAnt;
  state.flag = null;
  state.followerCount = 0;
  state.pendingRespawn = false;
  state.camera.centerOn(spawnPos.x, spawnPos.y);
}
