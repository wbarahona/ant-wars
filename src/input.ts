export class InputHandler {
  private keys = new Set<string>();
  mouseX = -1;
  mouseY = -1;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      // Prevent arrow keys from scrolling the page
      if (e.code.startsWith("Arrow")) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));

    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });
    canvas.addEventListener("mouseleave", () => {
      this.mouseX = -1;
      this.mouseY = -1;
    });
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }
}
