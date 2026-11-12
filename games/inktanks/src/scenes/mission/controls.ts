import type { TankInput } from '../../logic/match/types';

/**
 * Player controls from the DOM. Desktop: WASD or arrows drive (A/D turn,
 * W/S throttle), the mouse aims, click or hold fires, E (held) swaps, Q
 * repairs. Touch: a floating left stick drives towards where it points; a
 * floating right stick aims and fires while pulled past the dead zone
 * (as InkSnake's stick: 56 px pull, 22% dead zone); swap and repair are
 * buttons.
 */
const STICK = { radius: 56, deadZone: 0.22 };

interface Stick {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  el: HTMLDivElement;
}

export class Controls {
  private readonly keys = new Set<string>();
  private mouse: { x: number; y: number } | null = null;
  private mouseDown = false;
  private left: Stick | null = null;
  private right: Stick | null = null;
  swapHeld = false;
  private repairPressed = false;
  touchUsed = matchMedia('(pointer: coarse)').matches;
  enabled = true;

  constructor(private readonly surface: HTMLElement, private readonly toWorld: (cx: number, cy: number) => { x: number; y: number }) {
    addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (k === 'q') this.repairPressed = true;
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });
    surface.addEventListener('pointerdown', (e) => this.down(e));
    addEventListener('pointermove', (e) => this.move(e));
    addEventListener('pointerup', (e) => this.up(e));
    addEventListener('pointercancel', (e) => this.up(e));
    surface.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Wires a held button (swap) and a pressed one (repair). */
  bindButtons(swap: HTMLElement, repair: HTMLElement): void {
    const hold = (on: boolean) => (e: Event) => {
      e.preventDefault();
      this.swapHeld = on;
    };
    swap.addEventListener('pointerdown', hold(true));
    swap.addEventListener('pointerup', hold(false));
    swap.addEventListener('pointerleave', hold(false));
    repair.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.repairPressed = true;
    });
  }

  private down(e: PointerEvent): void {
    if (e.pointerType === 'mouse') {
      this.mouse = { x: e.clientX, y: e.clientY };
      if (e.button === 0) this.mouseDown = true;
      return;
    }
    this.touchUsed = true;
    const side = e.clientX < innerWidth / 2 ? 'left' : 'right';
    if (this[side]) return;
    const el = document.createElement('div');
    el.className = 'stick';
    el.innerHTML = '<i></i>';
    el.style.left = `${e.clientX}px`;
    el.style.top = `${e.clientY}px`;
    document.body.appendChild(el);
    this[side] = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, el };
  }

  private move(e: PointerEvent): void {
    if (e.pointerType === 'mouse') {
      this.mouse = { x: e.clientX, y: e.clientY };
      return;
    }
    for (const s of [this.left, this.right]) {
      if (!s || s.id !== e.pointerId) continue;
      s.dx = e.clientX - s.x;
      s.dy = e.clientY - s.y;
      const d = Math.hypot(s.dx, s.dy);
      const k = d > STICK.radius ? STICK.radius / d : 1;
      (s.el.firstChild as HTMLElement).style.transform = `translate(${s.dx * k}px, ${s.dy * k}px)`;
    }
  }

  private up(e: PointerEvent): void {
    if (e.pointerType === 'mouse') {
      if (e.button === 0) this.mouseDown = false;
      return;
    }
    for (const side of ['left', 'right'] as const) {
      const s = this[side];
      if (s?.id === e.pointerId) {
        s.el.remove();
        this[side] = null;
      }
    }
  }

  private pull(s: Stick | null): { angle: number; mag: number } | null {
    if (!s) return null;
    const d = Math.hypot(s.dx, s.dy);
    if (d <= STICK.radius * STICK.deadZone) return null;
    return { angle: Math.atan2(s.dy, s.dx), mag: Math.min(1, d / STICK.radius) };
  }

  read(tank: { x: number; y: number; turret: number }): TankInput {
    if (!this.enabled) return { move: null, aim: null, fire: false, swap: false, repair: false };
    const k = this.keys;
    const throttle = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    const turn = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    const l = this.pull(this.left);
    const r = this.pull(this.right);
    const move: TankInput['move'] = l ? { kind: 'point', angle: l.angle, mag: l.mag } : throttle || turn ? { kind: 'tank', throttle, turn } : null;
    let aim: number | null = null;
    let fire = false;
    if (r) {
      aim = r.angle;
      fire = true;
    } else if (this.mouse && !this.touchUsed) {
      const w = this.toWorld(this.mouse.x, this.mouse.y);
      aim = Math.atan2(w.y - tank.y, w.x - tank.x);
      fire = this.mouseDown;
    }
    const repair = this.repairPressed;
    this.repairPressed = false;
    return { move, aim, fire, swap: this.swapHeld || k.has('e'), repair };
  }
}
