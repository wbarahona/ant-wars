/**
 * notificationBanner.ts
 *
 * A single top-of-screen banner that shows the most important game alert.
 * Priority (highest first):
 *   1. Player ant has critically low HP      — red flashing
 *   2. Player ant is hungry (low energy)     — red flashing
 *   3. Player queen engaging in combat       — red flashing
 *   4. Nest food supply critically short     — normal text
 *
 * Call `updateNotificationBanner(state, fights)` once per render frame.
 */

import type { GameState } from "../game/gameState";
import type { FightManager } from "../game/fightManager";

// ── DOM refs (looked up once) ─────────────────────────────────────────────────
let bannerEl: HTMLElement | null = null;
let textEl: HTMLElement | null = null;

function ensureBanner(): void {
  if (bannerEl) return;
  bannerEl = document.getElementById("notification-banner");
  textEl = document.getElementById("notification-text");
}

// ── Thresholds ────────────────────────────────────────────────────────────────
const LOW_HP_RATIO = 0.25; // ≤ 25% HP
const LOW_ENERGY_RATIO = 0.2; // ≤ 20% energy
const LOW_FOOD_THRESHOLD = 3; // ≤ 3 food stored in player nest

/** Possible banner states. `null` = hidden. */
type BannerVariant = "flash" | "normal" | null;

let lastVariant: BannerVariant = null;
let lastText = "";

export function updateNotificationBanner(
  state: GameState,
  fights: FightManager,
): void {
  ensureBanner();
  if (!bannerEl || !textEl) return;

  // Only show notifications while actually playing
  if (state.phase !== "playing") {
    hideBanner();
    return;
  }

  const player = state.playerAnt;

  // ── Priority 1: critically low HP ────────────────────────────────────────
  if (player.isAlive && player.hp / player.maxHp <= LOW_HP_RATIO) {
    showBanner(
      `⚠ CRITICAL HP — ${Math.ceil(player.hp)} / ${player.maxHp}`,
      "flash",
    );
    return;
  }

  // ── Priority 2: player ant hungry ────────────────────────────────────────
  if (player.isAlive && player.energy / player.maxEnergy <= LOW_ENERGY_RATIO) {
    showBanner(
      `⚠ HUNGRY — energy at ${Math.round((player.energy / player.maxEnergy) * 100)}%`,
      "flash",
    );
    return;
  }

  // ── Priority 3: player queen (NPC colony queen) in active combat ──────────
  const playerNest = state.nests.find((n) => n.species === state.playerSpecies);
  const colonyQueen = playerNest?.queenAnt;
  if (colonyQueen && colonyQueen.isAlive) {
    const queenInFight = [...fights.records.values()].some(
      (r) =>
        (r.antA === colonyQueen || r.antB === colonyQueen) &&
        r.resolvedOutcome === null,
    );
    if (queenInFight) {
      showBanner("⚠ QUEEN UNDER ATTACK!", "flash");
      return;
    }
  }

  // ── Priority 4: nest food supply short ───────────────────────────────────
  if (playerNest && playerNest.foodStored <= LOW_FOOD_THRESHOLD) {
    showBanner(
      `⬥ Food reserves low — ${playerNest.foodStored} stored`,
      "normal",
    );
    return;
  }

  // Nothing to report
  hideBanner();
}

function showBanner(text: string, variant: BannerVariant): void {
  if (!bannerEl || !textEl) return;
  if (text === lastText && variant === lastVariant) return; // nothing changed

  lastText = text;
  lastVariant = variant;

  textEl.textContent = text;
  bannerEl.className = variant === "flash" ? "flash" : "";
  bannerEl.style.display = "flex";
}

function hideBanner(): void {
  if (!bannerEl) return;
  if (lastVariant === null) return;
  lastVariant = null;
  lastText = "";
  bannerEl.style.display = "none";
}
