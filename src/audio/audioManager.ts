/**
 * audioManager.ts
 *
 * Two-track background music system:
 *   • "intro"     — plays on the title / species-select screen, loops.
 *   • "overworld" — plays during active gameplay, loops.
 *
 * Switching tracks cross-fades smoothly (0.6 s). The overworld track
 * is never stopped by dialogs or the game-end screen; instead, pausing
 * the game lowers its volume to 20 % and restores it on resume.
 */

import introSrc from "../music/intro-music.mp3?url";
import overworldSrc from "../music/overworld-music.mp3?url";

type TrackId = "intro" | "overworld";

const VOLUME_NORMAL = 0.55;
const VOLUME_PAUSED = 0.15;
const FADE_STEPS = 20;
const FADE_INTERVAL_MS = 30; // 20 × 30 ms ≈ 0.6 s

// ── Audio element factory ─────────────────────────────────────────────────────
function makeAudio(src: string): HTMLAudioElement {
  const a = new Audio(src);
  a.loop = true;
  a.volume = 0;
  return a;
}

const tracks: Record<TrackId, HTMLAudioElement> = {
  intro: makeAudio(introSrc),
  overworld: makeAudio(overworldSrc),
};

let current: TrackId | null = null;
// Tracks the last known pause state so setGamePaused only fires fadeTo on
// transitions — NOT every frame (caller is renderer, runs at ~60 fps and would
// cancel the fade timer every 16 ms before a single 30 ms step could fire).
let pauseState: boolean = false;
// Each track gets its own fade timer so fade-out and fade-in run concurrently.
const fadeTimers: Record<TrackId, ReturnType<typeof setInterval> | null> = {
  intro: null,
  overworld: null,
};

// ── Fade helpers ──────────────────────────────────────────────────────────────
function clearFade(id: TrackId): void {
  if (fadeTimers[id] !== null) {
    clearInterval(fadeTimers[id]!);
    fadeTimers[id] = null;
  }
}

function fadeTo(id: TrackId, target: number, onDone?: () => void): void {
  const audio = tracks[id];
  clearFade(id);
  const start = audio.volume;
  const delta = (target - start) / FADE_STEPS;
  let step = 0;
  fadeTimers[id] = setInterval(() => {
    step++;
    audio.volume = Math.min(1, Math.max(0, start + delta * step));
    if (step >= FADE_STEPS) {
      audio.volume = target;
      clearFade(id);
      onDone?.();
    }
  }, FADE_INTERVAL_MS);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Switch to a track. If already playing that track, does nothing.
 * Cross-fades out the current track while fading in the new one.
 */
export function playTrack(id: TrackId): void {
  if (current === id) return;

  const prevId = current;
  current = id;
  pauseState = false; // reset so pause transitions are detected fresh

  // Fade out previous track, then fully stop it
  if (prevId) {
    fadeTo(prevId, 0, () => {
      tracks[prevId].pause();
      tracks[prevId].currentTime = 0;
    });
  }

  // Fade in new track — runs concurrently on its own timer.
  // All callers of playTrack() must be inside a user-gesture handler so
  // .play() is guaranteed to succeed (no silent-catch retry needed).
  const next = tracks[id];
  if (next.paused) {
    next.currentTime = 0;
    next.play().catch(() => {});
  }
  fadeTo(id, VOLUME_NORMAL);
}

/**
 * Lower the overworld track volume while the game is paused.
 * Has no effect if the overworld track is not currently playing.
 */
export function setGamePaused(paused: boolean): void {
  if (current !== "overworld") return;
  if (paused === pauseState) return; // no transition — don't reset the fade timer
  pauseState = paused;
  fadeTo("overworld", paused ? VOLUME_PAUSED : VOLUME_NORMAL);
}
