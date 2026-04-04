/**
 * gameEndScreen.ts
 *
 * Shows / hides the game-over overlay with a result title and a per-colony
 * stats summary.  Called from update.ts the moment a queen dies.
 */

import type { Nest } from "../entities/nest";
import type { GameResult } from "../game/gameState";

const COLONY_LABELS: Record<string, string> = {
  black: "⬥ YOUR NEST",
  red: "⬥ OPFOR COLONY",
};

const RESULT_SUBTITLES: Record<GameResult, string> = {
  victory: "The enemy queen has fallen. Your colony prevails!",
  defeat: "Your queen is dead. The colony is lost.",
};

export function showGameEndScreen(result: GameResult, nests: Nest[]): void {
  const overlay = document.getElementById("game-end-overlay");
  const title = document.getElementById("game-end-title");
  const subtitle = document.getElementById("game-end-subtitle");
  const colonies = document.getElementById("game-end-colonies");
  if (!overlay || !title || !subtitle || !colonies) return;

  // Title
  title.textContent = result === "victory" ? "VICTORY!" : "DEFEAT";
  title.className = result;
  subtitle.textContent = RESULT_SUBTITLES[result];

  // Colony summaries
  colonies.innerHTML = "";
  for (const nest of nests) {
    const block = document.createElement("div");
    block.className = "end-colony-block";

    const label =
      COLONY_LABELS[nest.species] ?? `⬥ ${nest.species.toUpperCase()} COLONY`;
    block.innerHTML = `
      <div class="end-colony-name">${label}</div>
      <div class="end-stat-row"><span>Population</span><span>${nest.population}</span></div>
      <div class="end-stat-row"><span>Workers</span><span>${nest.workers}</span></div>
      <div class="end-stat-row"><span>Soldiers</span><span>${nest.soldiers}</span></div>
      <div class="end-stat-row"><span>Drones</span><span>${nest.drones}</span></div>
      <div class="end-stat-row"><span>Total food foraged</span><span>${nest.foodDelivered}</span></div>
      <div class="end-stat-row"><span>Queen status</span><span>${nest.queenAnt?.isAlive ? "🟢 ALIVE" : "💀 DEAD"}</span></div>
    `;
    colonies.appendChild(block);
  }

  overlay.classList.add("visible");
}
