import type { Ant } from "../entities/ant";
import type { Nest } from "../entities/nest";
import { RANKS } from "../types";
import { drawRankInsignia } from "../prefabs/playerAntPrefab";

// Cached reference to the rank insignia canvas (looked up once)
let rankCanvas: HTMLCanvasElement | null = null;
let rankCtx: CanvasRenderingContext2D | null = null;

export interface ColonyStats {
  name: string;
  species: string;
  population: number;
  workers: number;
  soldiers: number;
  drones: number;
  food: number;
}

export function updateStats(stats: Partial<ColonyStats>): void {
  const set = (id: string, val: string | number) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  };

  if (stats.name !== undefined) set("stat-name", stats.name);
  if (stats.species !== undefined) set("stat-species", stats.species);
  if (stats.population !== undefined) set("stat-population", stats.population);
  if (stats.workers !== undefined) set("stat-workers", stats.workers);
  if (stats.soldiers !== undefined) set("stat-soldiers", stats.soldiers);
  if (stats.drones !== undefined) set("stat-drones", stats.drones);
  if (stats.food !== undefined) set("stat-food", stats.food);
}

// ---- Player ant live stats --------------------------------------------------

const STATE_COLORS: Record<string, string> = {
  idle: "#7a7aaa",
  moving: "#22c55e",
  attacking: "#ef4444",
  gathering: "#f59e0b",
  returning: "#60a5fa",
  dead: "#555555",
};

export function updatePlayerStats(ant: Ant): void {
  const sel = (id: string) => document.getElementById(id);

  // When dead, show all vitals as 0 / dead and bail out of live updates
  const isDead = !ant.isAlive;

  // Portrait label
  const portrait = sel("ant-portrait-label");
  if (portrait) {
    const r = RANKS[ant.rank];
    portrait.textContent = `${ant.species.toUpperCase()} · ${r.grade} ${r.name.toUpperCase()}`;
  }

  // State badge
  const stateEl = sel("stat-ant-state");
  if (stateEl) {
    stateEl.textContent = ant.state;
    (stateEl as HTMLElement).style.color = STATE_COLORS[ant.state] ?? "#d0d0d0";
  }

  // HP
  const hpRatio = isDead ? 0 : Math.max(0, ant.hp / ant.maxHp);
  const hpColor =
    hpRatio > 0.5 ? "#22c55e" : hpRatio > 0.25 ? "#f59e0b" : "#ef4444";
  const hpEl = sel("stat-ant-hp");
  if (hpEl)
    hpEl.textContent = isDead ? `0 / ${ant.maxHp}` : `${ant.hp} / ${ant.maxHp}`;
  const hpBar = sel("stat-ant-hp-bar") as HTMLElement | null;
  if (hpBar) {
    hpBar.style.width = `${hpRatio * 100}%`;
    hpBar.style.backgroundColor = isDead ? "#555555" : hpColor;
  }

  // Energy
  const enRatio = isDead ? 0 : Math.max(0, ant.energy / ant.maxEnergy);
  const enEl = sel("stat-ant-energy");
  if (enEl)
    enEl.textContent = isDead
      ? `0 / ${ant.maxEnergy}`
      : `${Math.round(ant.energy)} / ${ant.maxEnergy}`;
  const enBar = sel("stat-ant-energy-bar") as HTMLElement | null;
  if (enBar) {
    enBar.style.width = `${enRatio * 100}%`;
    enBar.style.backgroundColor = isDead ? "#555555" : "#3b82f6";
  }

  // Rank & wins
  const rankEl = sel("stat-ant-rank");
  if (rankEl) {
    const r = RANKS[ant.rank];
    rankEl.textContent = `${r.grade} · ${r.name}`;
  }

  // Rank insignia canvas
  if (!rankCanvas) {
    rankCanvas = sel("rank-insignia-canvas") as HTMLCanvasElement | null;
    rankCtx = rankCanvas?.getContext("2d") ?? null;
  }
  if (rankCanvas && rankCtx) {
    const cw = rankCanvas.width;
    const ch = rankCanvas.height;
    rankCtx.clearRect(0, 0, cw, ch);
    // Draw centred in the canvas; topY = ch (insignia builds upward from bottom)
    drawRankInsignia(rankCtx, Math.floor(cw / 2), ch, ant.rank);
  }
  const winsEl = sel("stat-ant-wins");
  if (winsEl) winsEl.textContent = String(ant.battleWins);

  // Combat
  const atkEl = sel("stat-ant-attack");
  if (atkEl) atkEl.textContent = String(ant.attack);
  const defEl = sel("stat-ant-defense");
  if (defEl) defEl.textContent = String(ant.defense);
}

// ── Colony panels (tabbed) ───────────────────────────────────────────────────

// Two fixed panels: 0 = player colony (black), 1 = opfor (red).
// Keyed by species so array order in state.nests doesn't matter.
const PANEL_SPECIES = ["black", "red"] as const;

let tabsInitialised = false;
function initColonyTabs(): void {
  if (tabsInitialised) return;
  tabsInitialised = true;
  for (let i = 0; i < 2; i++) {
    const btn = document.getElementById(`colony-tab-${i}`);
    if (!btn) continue;
    btn.addEventListener("click", () => {
      for (let j = 0; j < 2; j++) {
        document
          .getElementById(`colony-tab-${j}`)
          ?.classList.toggle("active", j === i);
        const panel = document.getElementById(`colony-panel-${j}`);
        if (panel) panel.style.display = j === i ? "block" : "none";
      }
    });
  }
}

export function updateColonyPanels(nests: readonly Nest[]): void {
  initColonyTabs();

  PANEL_SPECIES.forEach((species, i) => {
    const nest = nests.find((n) => n.species === species);
    const set = (suffix: string, val: string | number) => {
      const el = document.getElementById(`colony-${i}-${suffix}`);
      if (el) el.textContent = String(val);
    };
    if (!nest) {
      ["population", "workers", "soldiers", "drones", "queens", "food"].forEach(
        (k) => set(k, "—"),
      );
      return;
    }
    set("population", nest.population);
    set("workers", nest.workers);
    set("soldiers", nest.soldiers);
    set("drones", nest.drones);
    set("queens", nest.queens);
    set("food", nest.foodDelivered);
  });
}
