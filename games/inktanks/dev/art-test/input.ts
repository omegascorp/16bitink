/**
 * Input for the art test, from the DOM: WASD/arrows and the mouse on a
 * desktop; on a touch screen two floating thumbsticks (as InkSnake's), the
 * left one drives and the right one aims and fires while it's pulled.
 */
export interface StickState {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

/** Pull (CSS px) that counts as full, and the dead zone, as InkSnake's stick. */
const STICK = { radius: 56, deadZone: 0.22 };

export class Input {
  private readonly keys = new Set<string>();
  mouse: { x: number; y: number } | null = null;
  mouseDown = false;
  left: StickState | null = null;
  right: StickState | null = null;
  private readonly owners = new Map<number, 'left' | 'right'>();
  private readonly visuals: Record<'left' | 'right', { base: HTMLDivElement; knob: HTMLDivElement }>;

  constructor(onKey: (key: string) => void) {
    addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      onKey(e.key.toLowerCase());
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());
    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') this.mouse = { x: e.clientX, y: e.clientY };
      else this.moveStick(e);
    });
    addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      if (e.pointerType === 'mouse') {
        this.mouse = { x: e.clientX, y: e.clientY };
        if (e.button === 0) this.mouseDown = true;
        return;
      }
      const side = e.clientX < innerWidth / 2 ? 'left' : 'right';
      if (this[side]) return;
      this.owners.set(e.pointerId, side);
      this[side] = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
      this.drawStick(side);
    });
    const up = (e: PointerEvent): void => {
      if (e.pointerType === 'mouse') {
        if (e.button === 0) this.mouseDown = false;
        return;
      }
      const side = this.owners.get(e.pointerId);
      if (!side) return;
      this.owners.delete(e.pointerId);
      this[side] = null;
      this.drawStick(side);
    };
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
    const make = (cls: string): HTMLDivElement => {
      const d = document.createElement('div');
      d.className = cls;
      document.body.appendChild(d);
      return d;
    };
    this.visuals = {
      left: { base: make('stick-base'), knob: make('stick-knob') },
      right: { base: make('stick-base aim'), knob: make('stick-knob aim') },
    };
  }

  private moveStick(e: PointerEvent): void {
    const side = this.owners.get(e.pointerId);
    const st = side && this[side];
    if (!side || !st) return;
    st.dx = e.clientX - st.x;
    st.dy = e.clientY - st.y;
    this.drawStick(side);
  }

  /** Where each stick rests when no thumb is on it, so a player sees where to put one. */
  restStick(side: 'left' | 'right', x: number, y: number, show: boolean): void {
    const v = this.visuals[side];
    if (this[side]) return;
    for (const el of [v.base, v.knob]) {
      el.style.display = show ? 'block' : 'none';
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.opacity = '0.35';
    }
  }

  private drawStick(side: 'left' | 'right'): void {
    const st = this[side];
    const v = this.visuals[side];
    if (!st) return;
    const d = Math.hypot(st.dx, st.dy);
    const k = d > STICK.radius ? STICK.radius / d : 1;
    v.base.style.display = v.knob.style.display = 'block';
    v.base.style.opacity = v.knob.style.opacity = '0.9';
    v.base.style.left = `${st.x}px`;
    v.base.style.top = `${st.y}px`;
    v.knob.style.left = `${st.x + st.dx * k}px`;
    v.knob.style.top = `${st.y + st.dy * k}px`;
  }

  /** The drive direction from keys or the left stick, length 0..1, or null. */
  move(): { x: number; y: number } | null {
    const k = this.keys;
    const x = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    const y = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
    if (x || y) {
      const d = Math.hypot(x, y);
      return { x: x / d, y: y / d };
    }
    return this.stick(this.left);
  }

  /** The right stick's pull as a direction, or null inside its dead zone. */
  aimStick(): { x: number; y: number } | null {
    return this.stick(this.right);
  }

  private stick(st: StickState | null): { x: number; y: number } | null {
    if (!st) return null;
    const d = Math.hypot(st.dx, st.dy);
    if (d <= STICK.radius * STICK.deadZone) return null;
    const m = Math.min(1, d / STICK.radius);
    return { x: (st.dx / d) * m, y: (st.dy / d) * m };
  }
}
