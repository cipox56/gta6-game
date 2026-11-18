// Keyboard and mouse input: held keys, edge-triggered presses, and click position.
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.clicked = false;
    this.onKey = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.pressed.add(k);
      this.keys.add(k);
    };
    this.onKeyUp = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys.delete(k);
    };
    this.onMouse = (e) => {
      const r = e.target.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) * (1280 / r.width);
      this.mouseY = (e.clientY - r.top) * (720 / r.height);
      this.clicked = true;
    };
  }
  attach(canvas) {
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('mousedown', this.onMouse);
  }
  down(...names) {
    return names.some((n) => this.keys.has(n));
  }
  wasPressed(...names) {
    return names.some((n) => this.pressed.has(n));
  }
  // Edge-triggered press that is consumed on first read, so one physical press can
  // never fire twice when the loop runs several fixed steps in a single frame.
  take(...names) {
    for (const n of names) {
      if (this.pressed.has(n)) {
        this.pressed.delete(n);
        return true;
      }
    }
    return false;
  }
  endFrame() {
    this.pressed.clear();
    this.clicked = false;
  }
}
