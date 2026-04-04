/**
 * hints.ts
 *
 * Bottom-centre tutorial hints shown sequentially during the first play-through.
 * Hint 0 (burrow) persists during "placing_burrow" phase and clears the moment
 * the player transitions to "playing". All others auto-advance after their duration.
 * Shown only once ever — completion is persisted in localStorage.
 *
 * Animation cycle per hint (non-burrow):
 *   fade-in  (0.4 s)  →  visible  (HINT_DURATION ms)  →  fade-out  (0.5 s)
 *   → gap  (4 s)  → next hint
 */

import type { GamePhase } from "../game/gameState";

const STORAGE_KEY = "ant-wars-hints-v1-done";

/** How long each hint stays fully visible (ms). */
const HINT_DURATION = 6000;
/** Gap between hints (ms). */
const GAP_DURATION = 4000;
/** CSS fade-out transition duration (ms) — must match #hint-banner transition. */
const FADE_OUT_MS = 500;

interface Hint {
  text: string;
  /** True only for the very first hint — it stays until the burrow is placed. */
  waitForBurrow?: boolean;
}

const HINTS: Hint[] = [
  {
    text: "Right-click your queen ant → select 'Burrow Here' to build your nest and start the colony.",
    waitForBurrow: true,
  },
  {
    text: "Your ant has two bars: HP (health) and Energy. Fellow ants do not.",
  },
  {
    text: "Press TAB to open the stats panel — your ant's stats, colony data, and enemy intel.",
  },
  {
    text: "The bar at the top shows critical alerts. Keep an eye on it during battle!",
  },
  {
    text: "Green dots on the world are food items. Collect them — your colony needs food to spawn ants.",
  },
  { text: "Click anywhere on the overworld to send your ant there." },
  {
    text: "Click a food item to pick it up. Click your burrow to deliver it.",
  },
  {
    text: "The minimap (bottom-left) shows the full world. Click it to jump to any location.",
  },
  {
    text: "Move the mouse to a screen edge to scroll the camera in that direction.",
  },
  { text: "WASD or Arrow keys move the camera around the overworld." },
  { text: "Press P to pause the game. Press P again to resume." },
  {
    text: "Click a friendly ant to meet up — they'll walk to you and share energy.",
  },
  {
    text: "Right-click your ant (or press Q) for the action menu: recruit, release squad, ask for food.",
  },
  {
    text: "Click an enemy ant to attack it. Winning ranks up your ant. Rank-ups boost your stats!",
  },
  {
    text: "You win by defeating the enemy queen in combat. Click the enemy nest to scout it out!",
  },
  {
    text: "You lose if your queen dies. Keep her safe, and she'll lead your colony to victory!",
  },
];

// ── Module state ──────────────────────────────────────────────────────────────
let initialized = false;
let hintIndex = 0;
let done = false;
let prevPhase: GamePhase | null = null;

// State machine: "visible" while showing, "between" during fade-out + gap.
type HintState = "visible" | "between";
let hintState: HintState = "visible";

let bannerEl: HTMLElement | null = null;
let textEl: HTMLElement | null = null;

function ensureDOM(): boolean {
  if (bannerEl && textEl) return true;
  bannerEl = document.getElementById("hint-banner");
  textEl = document.getElementById("hint-text");
  return !!(bannerEl && textEl);
}

/** Fade in and display hint at index idx. */
function showHint(idx: number): void {
  if (!ensureDOM() || !textEl || !bannerEl) return;
  hintIndex = idx;
  hintState = "visible";
  textEl.textContent = HINTS[idx].text;
  // Reset to transparent then animate in
  bannerEl.style.transition = "none";
  bannerEl.style.opacity = "0";
  bannerEl.style.display = "flex";
  // Next frame: fade in
  requestAnimationFrame(() => {
    if (!bannerEl) return;
    bannerEl.style.transition = "opacity 0.4s ease";
    bannerEl.style.opacity = "1";
  });

  // Schedule fade-out (only for non-burrow hints)
  if (!HINTS[idx].waitForBurrow) {
    setTimeout(beginFadeOut, HINT_DURATION);
  }
}

/** Start the fade-out, then schedule the gap, then advance. */
function beginFadeOut(): void {
  if (done || !bannerEl) return;
  hintState = "between";
  bannerEl.style.transition = `opacity ${FADE_OUT_MS}ms ease`;
  bannerEl.style.opacity = "0";
  // After fade completes, hide and wait for the gap
  setTimeout(() => {
    if (!bannerEl) return;
    bannerEl.style.display = "none";
    // After gap, show the next hint
    setTimeout(advanceHint, GAP_DURATION);
  }, FADE_OUT_MS);
}

function advanceHint(): void {
  const next = hintIndex + 1;
  if (next >= HINTS.length) {
    done = true;
    localStorage.setItem(STORAGE_KEY, "1");
    return;
  }
  showHint(next);
}

function hideBanner(): void {
  if (bannerEl) {
    bannerEl.style.display = "none";
    bannerEl.style.opacity = "0";
  }
}

/**
 * Call once per render frame.
 * Drives only the burrow-placed transition; animation is timer-driven.
 */
export function updateHints(phase: GamePhase): void {
  if (done) return;
  if (localStorage.getItem(STORAGE_KEY)) {
    done = true;
    return;
  }
  if (phase === "game_over") {
    hideBanner();
    return;
  }

  // First call — show hint 0
  if (!initialized) {
    initialized = true;
    if (!ensureDOM()) return;
    showHint(0);
    prevPhase = phase;
    return;
  }

  // Hint 0 (burrow): move on immediately when placing_burrow → playing
  if (HINTS[hintIndex].waitForBurrow && hintState === "visible") {
    if (prevPhase === "placing_burrow" && phase === "playing") {
      beginFadeOut();
    }
  }

  prevPhase = phase;
}
