export class Camera {
  x = 0;
  y = 0;

  constructor(
    public viewWidth: number,
    public viewHeight: number,
    readonly worldWidth: number,
    readonly worldHeight: number,
  ) {}

  move(dx: number, dy: number): void {
    this.x = Math.max(
      0,
      Math.min(this.worldWidth - this.viewWidth, this.x + dx),
    );
    this.y = Math.max(
      0,
      Math.min(this.worldHeight - this.viewHeight, this.y + dy),
    );
  }

  /** Update viewport dimensions on window resize and re-clamp scroll position. */
  resize(vw: number, vh: number): void {
    this.viewWidth = vw;
    this.viewHeight = vh;
    // Re-clamp so the camera doesn't show past world edges at the new size
    this.x = Math.max(0, Math.min(this.worldWidth - vw, this.x));
    this.y = Math.max(0, Math.min(this.worldHeight - vh, this.y));
  }

  /** Center the viewport on a world-space point, clamped to world boundaries. */
  centerOn(wx: number, wy: number): void {
    this.x = Math.max(
      0,
      Math.min(this.worldWidth - this.viewWidth, wx - this.viewWidth / 2),
    );
    this.y = Math.max(
      0,
      Math.min(this.worldHeight - this.viewHeight, wy - this.viewHeight / 2),
    );
  }
}
