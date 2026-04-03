import type { Point, AntSpecies, AntRole, AntState, RankLevel } from "../types";
import { Species } from "./species";

// Stat buff applied *every* rank-up (hard-capped at rank 6)
const RANK_UP_ATTACK = 5;
const RANK_UP_DEFENSE = 4;
const RANK_UP_MAX_HP = 20; // max HP ceiling raised on rank-up; current HP unchanged
// Wins required to reach each next rank level (6 thresholds for ranks 1–6)
const WINS_PER_RANK = [1, 3, 6, 12, 25, 50];

export class Ant extends Species {
  // Identity
  readonly id: number;
  readonly role: AntRole;
  /** True when this ant is directly controlled by the human player. */
  readonly isPlayer: boolean;

  // Position & movement
  pos: Point;
  target: Point | null = null;

  // Stats (mutable — rank-ups bump attack, defense, and maxHp)
  maxHp: number;
  hp: number;
  readonly speed: number;
  attack: number;
  defense: number;

  // Behaviour
  state: AntState = "idle";

  // Animation
  walkPhase = 0;
  facingAngle = 0; // default: facing up (north), no rotation needed

  // Energy — only meaningful for player role; AI ants have unlimited energy
  readonly maxEnergy: number;
  energy: number;

  // Rank & progression — player ant only
  rank: RankLevel = 0;
  battleWins = 0;

  // Combat / replenishment cooldown (seconds) — prevents per-frame resolution
  combatCooldown = 0;

  // Transient speech bubble — set via setSpeechBubble(), expires automatically
  speechBubbleText: string | null = null;
  private speechBubbleExpiry = 0;

  private static nextId = 1;

  constructor(
    species: AntSpecies,
    role: AntRole,
    pos: Point,
    isPlayer = false,
  ) {
    super(species); // sets this.species, this.color, this.palette
    this.id = Ant.nextId++;
    this.role = role;
    this.isPlayer = isPlayer;
    this.pos = { ...pos };

    const stats = this.baseStats(role); // per-species per-role stats
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.speed = stats.speed;
    this.attack = stats.attack;
    this.defense = stats.defense;
    this.maxEnergy = 100;
    this.energy = 100;
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }

  setSpeechBubble(text: string, durationMs: number): void {
    this.speechBubbleText = text;
    this.speechBubbleExpiry = Date.now() + durationMs;
  }

  update(dt: number): void {
    // Expire timed speech bubbles
    if (
      this.speechBubbleText !== null &&
      Date.now() >= this.speechBubbleExpiry
    ) {
      this.speechBubbleText = null;
    }

    // Tick combat / replenishment cooldown
    if (this.combatCooldown > 0)
      this.combatCooldown = Math.max(0, this.combatCooldown - dt);

    if (this.state === "dead") return;

    // NPC energy regenerates while idle (resting after exhaustion)
    if (
      !this.isPlayer &&
      this.state === "idle" &&
      this.energy < this.maxEnergy
    ) {
      this.energy = Math.min(this.maxEnergy, this.energy + dt * 8);
    }

    if (this.target === null) return;

    // Player dies at 0 energy
    if (this.isPlayer && this.energy <= 0) {
      this.state = "dead";
      this.target = null;
      return;
    }

    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= 2) {
      this.pos = { ...this.target };
      this.target = null;
      this.state = "idle";
      this.walkPhase = 0;
      return;
    }

    this.state = "moving";
    this.facingAngle = Math.atan2(dy, dx) + Math.PI / 2;
    const step = this.speed * dt;
    const ratio = step / dist;
    this.pos.x += dx * ratio;
    this.pos.y += dy * ratio;
    this.walkPhase += step * 0.3;

    // All ants drain energy while moving
    this.energy = Math.max(0, this.energy - step * 0.04);

    // NPC exhausted: rest until energy recovers (player death handled above)
    if (!this.isPlayer && this.energy <= 0) {
      this.state = "idle";
      this.target = null;
    }
  }

  takeDamage(amount: number): void {
    const effective = Math.max(0, amount - this.defense);
    this.hp = Math.max(0, this.hp - effective);
    if (this.hp === 0) this.state = "dead";
  }

  attackTarget(target: Ant): void {
    if (!this.isAlive || !target.isAlive) return;
    this.state = "attacking";
    target.takeDamage(this.attack);
  }

  /**
   * Call after the player ant delivers the killing blow.
   * Always +1 rank (up to cap 6), bumps attack, defense, and max HP ceiling.
   * Current HP is NOT restored — the player must seek food or ally replenishment.
   * No-op for non-player ants or if already at max rank.
   */
  recordKill(): void {
    if (!this.isPlayer) return;
    this.battleWins++;
    if (this.rank >= 6) return; // already at max
    // Only promote when cumulative wins hit the threshold for the next rank
    if (this.battleWins < WINS_PER_RANK[this.rank]) return;
    this.rank = (this.rank + 1) as RankLevel;
    this.attack += RANK_UP_ATTACK;
    this.defense += RANK_UP_DEFENSE;
    this.maxHp += RANK_UP_MAX_HP; // ceiling grows; current hp unchanged
  }
}
