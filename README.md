# Ant Wars

A top-down real-time action game rendered on an HTML5 `<canvas>`. You play as a single ant on a scrollable overworld, fight enemy ants from rival species, earn kills to climb the US Marines enlisted rank ladder, and try to survive.

---

## Install & Run

**Requirements:** Node.js ≥ 18

```bash
npm install
npm run dev        # start Vite dev server with hot reload
```

Open the URL printed by Vite (default `http://localhost:5173`).

### Other scripts

```bash
npm run build      # compile TypeScript + produce dist/
npm run preview    # serve the production build locally
```

---

## How to Play

### Controls

| Input | Action |
|---|---|
| **Left-click** terrain | Place a march flag — your ant walks there |
| **Left-click** enemy ant | Charge and attack that enemy |
| **Left-click** minimap | Jump the camera to that world position |
| **Right-click** your ant | Open context menu (recruit squad, ask for food) |
| **Arrow keys / WASD** | Scroll the camera |
| **Mouse near canvas edge** | Edge-scroll the camera |
| **Tab** or **☰ button** | Toggle the stats panel |

### Objective

There is no formal win condition — the game is an open sandbox. Your goal is to fight enemy ants, accumulate **Battle Wins**, and rank up to **Gunnery Sergeant (E-7)**.

### Combat

Combat triggers automatically when your ant comes within contact range of an enemy ant from a different species. Fights resolve in real time:

- Each combatant's power is calculated from **attack**, **caste**, **rank**, **current energy**, and species advantage.
- The loser takes damage minus their defense stat.
- If both ants are still alive after **1.2 seconds**, the one with the lower HP ratio is instantly killed.
- Crits (±15% roll) can land for **1.5×** bonus damage.

### Species — Rock-Paper-Scissors

Each species has a natural prey it deals **1.5× damage** against:

| Species | Beats | Color |
|---|---|---|
| Black (Army) | Yellow | Dark grey |
| Yellow (Carpenter) | Red | Gold |
| Red (Fire) | Green | Red |
| Green (Leaf-cutter) | Black | Dark green |

### Castes

| Caste | Combat Multiplier | Notes |
|---|---|---|
| Queen | 2.0× | NPC only |
| Soldier | 1.5× | Heavy hitter |
| Worker | 1.0× | Balanced |
| Drone | 0.7× | Fast but fragile |

### Energy

Moving drains energy. If your ant's energy hits **0** it dies. When energy drops to **20% or below**, right-click your ant and choose **"Ask for food"** to request a resupply.

### Ranking Up

Every kill adds a Battle Win. Reach the following thresholds to rank up (each rank grants **+5 attack / +4 defense / +20 max HP**):

| Rank | Grade | Wins Required |
|---|---|---|
| Private | E-1 | — |
| Private First Class | E-2 | 1 |
| Lance Corporal | E-3 | 3 |
| Corporal | E-4 | 6 |
| Sergeant | E-5 | 12 |
| Staff Sergeant | E-6 | 25 |
| Gunnery Sergeant | E-7 | 50 |

### Death & Respawn

When you die, a **YOU DIED** overlay appears. Choose a new caste (**Drone**, **Worker**, or **Soldier**) to respawn at the world centre with fresh stats.

---

## UI Overview

- **Stats Panel** (right side, toggle with Tab) — shows portrait, state, HP bar, energy bar, rank insignia, and combat stats.
- **Minimap** (bottom-left) — overview of the world with ant positions and the current viewport.
- **Fight Cloud** — animated visual that appears while two ants are in combat.
- **Speech Bubbles** — quips from your ant when marching, charging, or recruiting.

---

## Tech Stack

- **TypeScript** — all game logic
- **HTML5 Canvas** — rendering (no external game engine)
- **Vite** — dev server and build tooling
- No runtime dependencies; all art is procedurally drawn

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/). Current version: **v0.1.0**

```bash
# Tag a release
git tag v0.x.0
git push --tags
```
