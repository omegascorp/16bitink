import { shapeBounds, type Bounds } from '../geom';
import type { StructRt } from './types';

/** A static bucket grid over the structures, for collision and shot queries. */
export class StructGrid {
  private readonly buckets = new Map<number, number[]>();
  private readonly stamp: Uint32Array;
  private mark = 1;
  private readonly out: number[] = [];

  constructor(private readonly structs: readonly StructRt[], private readonly size = 160) {
    this.stamp = new Uint32Array(structs.length);
    structs.forEach((s, i) => {
      const b = shapeBounds(s.def.shape, s.def.x, s.def.y);
      for (let by = Math.floor(b.y0 / size); by <= Math.floor(b.y1 / size); by++) {
        for (let bx = Math.floor(b.x0 / size); bx <= Math.floor(b.x1 / size); bx++) {
          const k = by * 4096 + bx;
          const list = this.buckets.get(k);
          if (list) list.push(i);
          else this.buckets.set(k, [i]);
        }
      }
    });
  }

  /** Structure indices whose buckets touch the bounds. The array is reused: copy it to keep it. */
  query(b: Bounds): readonly number[] {
    this.out.length = 0;
    this.mark++;
    const s = this.size;
    for (let by = Math.floor(b.y0 / s); by <= Math.floor(b.y1 / s); by++) {
      for (let bx = Math.floor(b.x0 / s); bx <= Math.floor(b.x1 / s); bx++) {
        const list = this.buckets.get(by * 4096 + bx);
        if (!list) continue;
        for (const i of list) {
          if (this.stamp[i] === this.mark) continue;
          this.stamp[i] = this.mark;
          this.out.push(i);
        }
      }
    }
    return this.out;
  }

  get all(): readonly StructRt[] {
    return this.structs;
  }
}
