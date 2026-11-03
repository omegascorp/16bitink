// Procedural pixel art on one locked grid. Shapes are written in logical
// units (320×180); a density S (1 = 16-bit, 2 = 32-bit, 4 = 64-bit "hi-bit")
// rasterizes them at S device pixels per unit with more shades per colour.
// The result is only ever upscaled by whole numbers.
(() => {
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
  const hash = (x, y) => {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const W = 320, H = 180, GROUND = 104;

  const MATS = ['', 'sky', 'cloud', 'mtn', 'snow', 'hill', 'tree', 'pine', 'grass', 'stone', 'stoneFar', 'roof', 'steel', 'blade', 'cape', 'plume', 'gold', 'leather', 'fur', 'feather', 'beak', 'wing', 'wolf', 'eye', 'void', 'white', 'flower'];
  const MID = Object.fromEntries(MATS.map((m, i) => [m, i]));
  // Surface grain that only shows once there are pixels to spare for it.
  const TEX = { fur: 0.2, wolf: 0.26, wing: 0.22, tree: 0.4, pine: 0.34, feather: 0.1, steel: 0.06, cape: 0.1, stone: 0.24, stoneFar: 0.12, plume: 0.14, leather: 0.12 };

  function makeArt(S) {
    const LV = 3 * S + 1; // shades per material: 4, 7, 13
    const OUT = LV;       // outline index sits after the shades
    const fix = (s) => (s >= 4 ? OUT : Math.round((s * (LV - 1)) / 3));
    const texK = S === 1 ? 0 : S === 2 ? 1 : 1.35;

    const buf = (w, h) => ({ w, h, m: new Uint8Array(w * h), s: new Uint8Array(w * h) });
    const raw = (b, x, y, m, s) => {
      if (x < 0 || y < 0 || x >= b.w || y >= b.h) return;
      const i = y * b.w + x;
      b.m[i] = m === null ? 0 : MID[m]; b.s[i] = s;
    };
    // A logical pixel: an S×S block.
    const set = (b, x, y, m, s) => {
      x = Math.floor(x) * S; y = Math.floor(y) * S;
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) raw(b, x + i, y + j, m, m === null ? 0 : fix(s));
    };

    const light = (nx, ny, d) => -0.5 * nx - 0.7 * ny + 0.5 * Math.sqrt(Math.max(0, 1 - d));
    function shadeOf(l) {
      if (S === 1) return l > 0.62 ? 0 : l > 0.2 ? 1 : l > -0.22 ? 2 : 3;
      const t = (0.85 - l) / 0.433; // 0..3 on the 16-bit scale
      return clamp(Math.round((t * (LV - 1)) / 3), 0, LV - 1);
    }
    const grain = (m, x, y) => (texK && TEX[m] ? (hash(x, y) - 0.5) * TEX[m] * texK : 0);
    const biasOf = (o) => Math.round(((o.bias || 0) * (LV - 1)) / 3);

    function ell(b, cx, cy, rx, ry, m, o = {}) {
      for (let y = Math.floor((cy - ry) * S); y <= Math.ceil((cy + ry) * S); y++) {
        for (let x = Math.floor((cx - rx) * S); x <= Math.ceil((cx + rx) * S); x++) {
          const nx = ((x + 0.5) / S - cx) / rx, ny = ((y + 0.5) / S - cy) / ry, d = nx * nx + ny * ny;
          if (d > 1) continue;
          const l = light(nx, ny, d) + (o.dither ? (bay(x, y) - 0.5) * o.dither : 0) + grain(m, x, y);
          raw(b, x, y, m, o.flat != null ? fix(o.flat) : clamp(shadeOf(l) + biasOf(o), 0, LV - 1));
        }
      }
    }

    function inside(pts, x, y) {
      let c = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    }

    function poly(b, pts, m, o = {}) {
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = Math.max(1, (x1 - x0) / 2), hh = Math.max(1, (y1 - y0) / 2);
      for (let y = Math.floor(y0 * S); y <= Math.ceil(y1 * S); y++) {
        for (let x = Math.floor(x0 * S); x <= Math.ceil(x1 * S); x++) {
          const lx = (x + 0.5) / S, ly = (y + 0.5) / S;
          if (!inside(pts, lx, ly)) continue;
          const nx = (lx - cx) / hw, ny = (ly - cy) / hh, d = Math.min(1, nx * nx + ny * ny) * 0.9;
          const l = light(nx, ny, d) + (o.dither ? (bay(x, y) - 0.5) * o.dither : 0) + grain(m, x, y);
          raw(b, x, y, m, o.flat != null ? fix(o.flat) : clamp(shadeOf(l) + biasOf(o), 0, LV - 1));
        }
      }
    }

    function rect(b, x, y, w, h, m, s = 1) {
      for (let j = 0; j < h * S; j++) for (let i = 0; i < w * S; i++) raw(b, x * S + i, y * S + j, m, fix(s));
    }

    // A rounded column: lit on the left, shadowed on the right.
    function column(b, x, y, w, h, m, bias = 0) {
      for (let i = 0; i < w * S; i++) {
        const nx = ((i + 0.5) / (w * S)) * 2 - 1;
        for (let j = 0; j < h * S; j++) {
          let s;
          if (S === 1) s = clamp((nx < -0.45 ? 0 : nx < 0.35 ? 1 : 2) + bias, 0, 3);
          else s = clamp(shadeOf(0.62 - nx * 0.75 + grain(m, x * S + i, y * S + j)) + Math.round((bias * (LV - 1)) / 3), 0, LV - 1);
          raw(b, x * S + i, y * S + j, m, S === 1 ? s : s);
        }
      }
    }

    // Lines are logical-pixel thick unless `thin`, which draws at device resolution (fine detail).
    function line(b, x0, y0, x1, y1, m, s, every = 1, thin = false) {
      const k = thin ? S : 1;
      let ax = Math.round(x0 * k), ay = Math.round(y0 * k);
      const bx = Math.round(x1 * k), by = Math.round(y1 * k);
      let dx = Math.abs(bx - ax), dy = -Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1, err = dx + dy, n = 0;
      const plot = thin ? (x, y) => raw(b, x, y, m, fix(s)) : (x, y) => set(b, x, y, m, s);
      for (;;) {
        if (n++ % every === 0) plot(ax, ay);
        if (ax === bx && ay === by) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; ax += sx; }
        if (e2 <= dx) { err += dx; ay += sy; }
      }
    }

    // Selective outline. Past 16-bit, edges facing the light take the part's
    // darkest shade instead of the outline, so forms stay soft on the lit side.
    function outline(b) {
      const add = [];
      for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
        const i = y * b.w + x;
        if (b.m[i]) continue;
        const nb = [[x + 1, y, true], [x, y + 1, true], [x - 1, y, false], [x, y - 1, false]];
        for (const [nx, ny, lit] of nb) {
          if (nx < 0 || ny < 0 || nx >= b.w || ny >= b.h) continue;
          const j = ny * b.w + nx;
          if (b.m[j] && b.s[j] < OUT) { add.push([i, b.m[j], S > 1 && lit ? LV - 1 : OUT]); break; }
        }
      }
      for (const [i, m, s] of add) { b.m[i] = m; b.s[i] = s; }
    }

    function flipX(b) {
      const o = buf(b.w, b.h);
      for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
        const a = y * b.w + x, c = y * b.w + (b.w - 1 - x);
        o.m[c] = b.m[a]; o.s[c] = b.s[a];
      }
      return o;
    }

    function blit(dst, src, ox, oy) {
      ox *= S; oy *= S;
      for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
        const i = y * src.w + x;
        if (!src.m[i]) continue;
        const X = ox + x, Y = oy + y;
        if (X < 0 || Y < 0 || X >= dst.w || Y >= dst.h) continue;
        dst.m[Y * dst.w + X] = src.m[i]; dst.s[Y * dst.w + X] = src.s[i];
      }
    }

    // ---------- figures ----------

    function knight() {
      const b = buf(26 * S, 37 * S);
      poly(b, [[8, 12], [15, 12], [14, 33], [3, 32], [4, 22]], 'cape');
      line(b, 6, 18, 5, 31, 'cape', 3, 1, S > 1); line(b, 9, 16, 8, 32, 'cape', 2, 1, S > 1);
      column(b, 9, 25, 3, 8, 'steel');
      column(b, 13, 25, 3, 8, 'steel', 1);
      rect(b, 8, 32, 5, 2, 'leather', 2); rect(b, 13, 32, 5, 2, 'leather', 3);
      rect(b, 8, 32, 5, 1, 'leather', 1);
      ell(b, 12.5, 19.5, 5, 6.5, 'steel');
      poly(b, [[9, 16], [16, 16], [17, 28], [8, 28]], 'cape');
      rect(b, 12, 18, 1, 6, 'gold', 0); rect(b, 10, 20, 5, 1, 'gold', 0); set(b, 13, 19, 'gold', 2); set(b, 13, 21, 'gold', 2);
      rect(b, 8, 25, 9, 1, 'leather', 2); set(b, 12, 25, 'gold', 0);
      ell(b, 8.5, 15, 2.6, 2.2, 'steel');
      ell(b, 12.5, 9, 4.2, 4.6, 'steel');
      rect(b, 13, 8, 4, 1, 'void', 0); set(b, 15, 10, 'void', 0); set(b, 16, 11, 'void', 0);
      rect(b, 12, 4, 1, 9, 'gold', 1);
      ell(b, 9.5, 4, 3.6, 2.1, 'plume'); ell(b, 6.5, 6.5, 1.6, 2.6, 'plume', { bias: 1 });
      ell(b, 16.5, 15, 2.6, 2.2, 'steel');
      column(b, 16, 16, 3, 4, 'steel');
      rect(b, 19, 3, 1, 15, 'blade', 0); rect(b, 20, 3, 1, 15, 'blade', 2); set(b, 19, 2, 'blade', 1);
      rect(b, 17, 18, 6, 1, 'gold', 1); set(b, 17, 18, 'gold', 0); set(b, 22, 18, 'gold', 2);
      ell(b, 19, 20, 1.7, 1.6, 'leather');
      set(b, 19, 22, 'gold', 0); set(b, 20, 22, 'gold', 2);
      if (S > 1) { // rivets and a mail hem, only where pixels allow
        for (const [x, y] of [[10.2, 14.6], [15.8, 14.6], [12.5, 12.2]]) raw(b, Math.round(x * S), Math.round(y * S), 'steel', 0);
        for (let x = 8 * S; x < 17 * S; x += 2) raw(b, x, 28 * S, 'steel', fix(2));
      }
      outline(b);
      return b;
    }

    function griffin() {
      const b = buf(40 * S, 33 * S);
      poly(b, [[9, 15], [15, 12], [15, 3], [10, 0], [4, 2], [1, 8]], 'wing', { bias: 1 });
      line(b, 7, 20, 4, 16, 'fur', 2); line(b, 7, 21, 4, 17, 'fur', 3);
      ell(b, 3, 14, 2, 2.2, 'wing');
      column(b, 10, 22, 2, 8, 'fur', 2);
      column(b, 21, 21, 2, 8, 'beak', 1);
      ell(b, 14.5, 19, 8.5, 5, 'fur');
      ell(b, 9.5, 21.5, 3.2, 3.6, 'fur');
      column(b, 7, 24, 3, 6, 'fur');
      rect(b, 7, 30, 4, 1, 'fur', 2);
      column(b, 23, 21, 2, 9, 'beak');
      set(b, 22, 30, 'beak', 3); set(b, 25, 30, 'beak', 3); set(b, 24, 30, 'beak', 2);
      ell(b, 21.5, 16, 5, 6, 'feather');
      line(b, 19, 18, 22, 21, 'feather', 2, 1, S > 1); line(b, 21, 17, 24, 20, 'feather', 2, 1, S > 1);
      if (S > 1) line(b, 20, 13, 23, 16, 'feather', 2, 1, true);
      poly(b, [[11, 18], [22, 14], [25, 4], [21, 0], [14, 0], [7, 4], [8, 12]], 'wing');
      poly(b, [[8, 4], [14, 0.5], [21, 0.5], [24.5, 4], [22, 6], [10, 7]], 'fur', { bias: -1 });
      for (const [x0, y0, x1, y1] of [[9, 10, 22, 8], [9, 13, 21, 11], [10, 16, 20, 14]]) line(b, x0, y0, x1, y1, 'wing', 3, 1, S > 1);
      for (let i = 0; i < 4; i++) line(b, 11 + i * 3, 17 - i, 12 + i * 3, 12 - i, 'wing', 0, 2, S > 1);
      if (S > 1) for (let i = 0; i < 7; i++) line(b, 9.5 + i * 1.6, 9.5 + i * 0.1, 10.5 + i * 1.6, 6.5, 'fur', 2, 1, true);
      for (const [x, y] of [[9, 17], [12, 18], [15, 17], [18, 16]]) set(b, x, y, null);
      ell(b, 26.5, 10, 4.6, 4.2, 'feather');
      set(b, 23, 5, 'feather', 1); set(b, 24, 5, 'feather', 0); set(b, 22, 4, 'feather', 1);
      poly(b, [[29.5, 8], [34.5, 10], [33.5, 13], [29.5, 12]], 'beak');
      set(b, 34, 12, 'beak', 3);
      set(b, 28, 9, 'void', 0); set(b, 27, 8, 'feather', 3); set(b, 28, 8, 'feather', 3);
      if (S > 1) raw(b, 28 * S, 9 * S, 'white', 0); // catch-light in the eye
      outline(b);
      return b;
    }

    function wolf() {
      const b = buf(33 * S, 22 * S);
      poly(b, [[6.5, 9], [1, 13], [2, 15.5], [7.5, 12]], 'wolf');
      column(b, 9, 14, 2, 6, 'wolf', 2);
      column(b, 19, 14, 2, 6, 'wolf', 2);
      ell(b, 14, 11, 9, 4.5, 'wolf');
      ell(b, 20, 10, 4, 5, 'wolf');
      line(b, 12, 9, 17, 9, 'wolf', 2, 2, S > 1);
      if (S > 1) for (let i = 0; i < 6; i++) line(b, 17 + i * 0.9, 6.5, 16 + i * 0.9, 13, 'wolf', 2, 2, true);
      ell(b, 15, 14, 5, 1.3, 'wolf', { flat: 0 });
      column(b, 11, 14, 2, 6, 'wolf');
      column(b, 22, 13, 2, 7, 'wolf');
      rect(b, 11, 20, 3, 1, 'wolf', 2); rect(b, 22, 20, 3, 1, 'wolf', 2);
      rect(b, 9, 20, 2, 1, 'wolf', 3); rect(b, 19, 20, 2, 1, 'wolf', 3);
      ell(b, 24.5, 8, 3.8, 3.2, 'wolf');
      poly(b, [[26, 7], [31.5, 9], [30.5, 11.5], [26, 11.5]], 'wolf');
      set(b, 31, 9, 'void', 0);
      poly(b, [[21.5, 2], [24, 5.5], [20.5, 6]], 'wolf'); poly(b, [[25, 2], [26.5, 5.5], [23.5, 5.5]], 'wolf');
      set(b, 25, 7, 'eye', 0);
      line(b, 27, 11, 29, 11, 'wolf', 3, 1, S > 1);
      outline(b);
      return b;
    }

    function rock(r) {
      const b = buf((Math.ceil(r * 2) + 3) * S, (Math.ceil(r * 1.4) + 3) * S);
      ell(b, r + 1.5, r * 0.75 + 1.5, r, r * 0.7, 'stone', { dither: 0.25 });
      outline(b);
      return b;
    }

    // ---------- scene (loops run at device resolution) ----------

    const mtn = (x) => 64 + 12 * Math.sin(x * 0.035 + 0.5) + 7 * Math.sin(x * 0.083 + 2) + 3 * Math.sin(x * 0.21);
    const hill = (x) => 88 + 5 * Math.sin(x * 0.022 + 1.3) + 2.5 * Math.sin(x * 0.07);
    const SKY = 4 * S + 1; // sky steps: 5, 9, 17

    function sky(b) {
      for (let y = 0; y < GROUND * S; y++) for (let x = 0; x < W * S; x++) {
        raw(b, x, y, 'sky', clamp(Math.floor((y / (70 * S)) * (SKY - 1) + bay(x, y) - 0.5), 0, SKY - 1));
      }
      const CL = 2 * S + 1;
      for (const [cx, cy, rx, ry] of [[58, 22, 24, 6], [80, 18, 14, 6], [44, 25, 12, 4], [176, 32, 28, 5], [198, 28, 13, 5], [292, 15, 22, 5], [306, 18, 12, 4]]) {
        for (let y = Math.floor((cy - ry) * S); y <= (cy + ry) * S; y++) for (let x = Math.floor((cx - rx) * S); x <= (cx + rx) * S; x++) {
          const nx = ((x + 0.5) / S - cx) / rx, ny = ((y + 0.5) / S - cy) / ry;
          if (nx * nx + ny * ny > 1 || ny > 0.55) continue;
          const l = -ny * 0.9 - nx * 0.3 + (bay(x, y) - 0.5) * (S === 1 ? 0.5 : 0.25);
          const t = clamp((0.25 - l) / 0.6 + 1, 0, 2.99); // 0..3 on the 16-bit cloud ramp
          raw(b, x, y, 'cloud', S === 1 ? (l > 0.25 ? 0 : l > -0.35 ? 1 : 2) : clamp(Math.round((t * (CL - 1)) / 2.99), 0, CL - 1));
        }
      }
    }

    function mountains(b) {
      for (let x = 0; x < W * S; x++) {
        const lx = (x + 0.5) / S, top = Math.round(mtn(lx) * S), slope = mtn(lx + 1) - mtn(lx - 1);
        for (let y = top; y < GROUND * S; y++) {
          const depth = (y - top) / S;
          const snowLine = (56 + hash(Math.floor(lx), 3) * 3) * S;
          const m = y < snowLine + (y - top) * 0.2 && depth < 6 ? 'snow' : 'mtn';
          let s;
          if (S === 1) s = clamp((slope < -0.5 ? 0 : slope < 0.5 ? 1 : 2) + (depth > 14 && bay(x, y) > 0.5 ? 1 : 0), 0, 3);
          else s = clamp(shadeOf(0.42 - slope * 0.42 - depth * 0.014 + (bay(x, y) - 0.5) * 0.12 + grain('stone', x, y) * 0.3), 0, LV - 1);
          raw(b, x, y, m, s);
        }
      }
      for (let x = 0; x < W * S; x++) {
        const top = Math.round(hill((x + 0.5) / S) * S);
        for (let y = top; y < GROUND * S; y++) {
          const k = (y - top) / S;
          raw(b, x, y, 'hill', S === 1 ? (k === 0 ? 0 : k === 1 && bay(x, y) > 0.5 ? 0 : 1) : clamp(Math.round(k * 0.9 + bay(x, y) - 0.5), 0, (LV - 1) / 3));
        }
      }
    }

    function castle(b) {
      const base = 96;
      rect(b, 240, 64, 50, base - 64, 'stoneFar', 1);
      for (let x = 240; x < 290; x += 4) rect(b, x, 61, 2, 3, 'stoneFar', 1);
      rect(b, 240, 64, 50, 1, 'stoneFar', 2);
      if (S > 1) for (let y = 66; y < base; y += 3) for (let x = 240 * S + ((y / 3) % 2) * 3 * S; x < 290 * S; x += 6 * S) raw(b, x, y * S, 'stoneFar', fix(2));
      for (const [x0, w, top, flag] of [[232, 12, 50, false], [256, 16, 36, true], [288, 12, 52, false]]) {
        column(b, x0, top, w, base - top, 'stoneFar');
        column(b, x0 - 1, top - 3, w + 2, 3, 'stoneFar');
        poly(b, [[x0 - 2.5, top - 3], [x0 + w / 2, top - 18], [x0 + w + 2.5, top - 3]], 'roof');
        if (S > 1) for (let r = 1; r < 6; r++) line(b, x0 - 2 + r * 0.4, top - 3 - r * 2.6, x0 + w + 2 - r * 0.4, top - 3 - r * 2.6, 'roof', 3, 2, true);
        for (let j = top + 6; j < base - 10; j += 9) rect(b, x0 + Math.floor(w / 2) - 1, j, 1, 2, 'void', 0);
        if (flag) {
          const px = x0 + w / 2;
          line(b, px, top - 18, px, top - 27, 'leather', 2);
          rect(b, px + 1, top - 27, 6, 3, 'cape', 1); rect(b, px + 1, top - 25, 6, 1, 'cape', 2);
        }
      }
      ell(b, 264, 84, 4, 4, 'void', { flat: 0 }); rect(b, 260, 84, 9, base - 84, 'void', 0);
      for (const x of [246, 250, 280, 284]) rect(b, x, 72, 1, 2, 'void', 0);
    }

    function ground(b) {
      for (let y = GROUND * S; y < H * S; y++) for (let x = 0; x < W * S; x++) {
        const t = (y / S - GROUND) / (H - GROUND);
        let s = t < 0.08 ? (bay(x, y) > 0.5 ? 0 : 1) : 1;
        if (t > 0.7 && bay(x, y) < (t - 0.7) * 1.6) s = 2;
        const r = hash(x, y);
        if (r > 0.955) s = 2; else if (r < 0.03 && t > 0.1) s = 0;
        if (S === 1) { raw(b, x, y, 'grass', s); continue; }
        // Finer grass: a soft gradient plus short dark blades and light tips.
        let q = fix(s);
        if (hash(x >> 1, y) > 0.86) q = fix(1) + 1;
        if (hash(x, y >> 1) < 0.06) q = Math.max(0, fix(1) - 1);
        raw(b, x, y, 'grass', clamp(q, 0, LV - 1));
      }
    }

    function trees(b) {
      const rows = [[GROUND - 3, 0.75, 11], [GROUND + 1, 1, 0]];
      for (const [baseY, k, seed] of rows) {
        for (let x = -4; x < W + 6; x += 7 + Math.floor(hash(x, seed) * 6)) {
          if (x > 226 && x < 300 && k < 1) continue;
          const pine = hash(x, seed + 5) > 0.6;
          const r = (4 + hash(x, seed + 9) * 4) * k;
          if (pine) {
            const h = r * 3.4;
            for (let i = 0; i < 3; i++) {
              const y0 = baseY - h + i * h * 0.27, w = r * (0.55 + i * 0.3);
              poly(b, [[x - w, y0 + h * 0.36], [x, y0], [x + w, y0 + h * 0.36]], 'pine', { dither: 0.2 });
            }
            rect(b, x, baseY - 2, 1, 3, 'leather', 2);
          } else {
            rect(b, Math.round(x), Math.round(baseY - r * 0.6), 1, Math.round(r * 0.6) + 1, 'leather', 2);
            ell(b, x, baseY - r * 1.5, r, r * 1.1, 'tree', { dither: 0.35 });
            ell(b, x - r * 0.35, baseY - r * 1.85, r * 0.45, r * 0.4, 'tree', S === 1 ? { flat: 0 } : { bias: -1 });
          }
        }
      }
    }

    const HEX_ROWS = [120, 133, 146, 159, 172];
    const hexPts = (cx, cy) => [[cx, cy - 8], [cx + 11, cy - 4], [cx + 11, cy + 4], [cx, cy + 8], [cx - 11, cy + 4], [cx - 11, cy - 4]];
    function hexGrid(b) {
      HEX_ROWS.forEach((cy, r) => {
        for (let cx = 55 + (r % 2) * 11; cx < 300; cx += 22) {
          const p = hexPts(cx, cy);
          for (let i = 0; i < 6; i++) line(b, p[i][0], p[i][1], p[(i + 1) % 6][0], p[(i + 1) % 6][1], 'grass', 2, 2, S > 1);
        }
      });
    }
    function hexHighlight(b, cx, cy) {
      const p = hexPts(cx, cy);
      for (let i = 0; i < 6; i++) line(b, p[i][0], p[i][1], p[(i + 1) % 6][0], p[(i + 1) % 6][1], 'gold', 0, 1, S > 1);
    }

    function tufts(b) {
      for (let i = 0; i < 70; i++) {
        const x = Math.floor(hash(i, 91) * W), y = GROUND + 8 + Math.floor(hash(i, 92) * (H - GROUND - 10));
        if (S === 1) {
          set(b, x, y, 'grass', 0); set(b, x - 1, y + 1, 'grass', 0); set(b, x + 1, y + 1, 'grass', 0); set(b, x, y + 1, 'grass', 3);
        } else {
          for (let k = -2; k <= 2; k++) line(b, x + 0.5 + k * 0.45, y + 1.9, x + 0.5 + k * 0.7, y + 0.2 + Math.abs(k) * 0.3, 'grass', k < 0 ? 0 : 1, 1, true);
          line(b, x - 0.6, y + 1.9, x + 1.6, y + 1.9, 'grass', 3, 1, true);
        }
        if (hash(i, 93) > 0.7) {
          if (S === 1) { set(b, x + 3, y - 1, 'flower', 0); set(b, x + 5, y, 'flower', 1); }
          else for (const [fx, fy] of [[x + 3, y - 1], [x + 5, y]]) ell(b, fx + 0.5, fy + 0.5, 0.6, 0.6, 'flower', { flat: 0 });
        }
      }
    }

    function shadow(b, cx, cy, rx) {
      for (let y = (cy - 2) * S; y <= (cy + 2) * S; y++) for (let x = (cx - rx) * S; x <= (cx + rx) * S; x++) {
        const nx = ((x + 0.5) / S - cx) / rx, ny = ((y + 0.5) / S - cy) / 2.4;
        if (nx * nx + ny * ny <= 1) raw(b, x, y, 'grass', fix(3));
      }
    }

    // Count badges: a glyph size per density, so the numbers sit on the same grid as the art.
    const FONT3 = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001010010', 8: '111101111101111', 9: '111101111001111' };
    const FONT5 = {
      0: '01110100011001110101110011000101110', 1: '00100011000010000100001000010001110', 2: '01110100010000100010001000100011111',
      3: '01110100010000100110000011000101110', 4: '00010001100101010010111110001000010', 5: '11111100001111000001000011000101110',
      6: '00110010001000011110100011000101110', 7: '11111000010001000100010000100001000', 8: '01110100011000101110100011000101110',
      9: '01110100011000101111000010001001100',
    };
    function badge(b, x, y, n, m) {
      const str = String(n), big = S > 1, gw = big ? 5 : 3, gh = big ? 7 : 5, px = S === 4 ? 3 : 1, pad = S === 4 ? 5 : big ? 3 : 2;
      const w = (str.length * (gw + 1) - 1) * px + pad * 2, h = gh * px + pad * 2;
      const X = x * S, Y = y * S;
      for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
        const edge = i < 0 || j < 0 || i >= w || j >= h;
        if (edge && (i < 0 || i >= w) && (j < 0 || j >= h)) continue;
        raw(b, X + i, Y + j, m, edge ? OUT : j === 0 ? 0 : j === h - 1 ? LV - 1 : fix(1));
      }
      [...str].forEach((ch, c) => {
        const g = (big ? FONT5 : FONT3)[ch];
        for (let k = 0; k < gw * gh; k++) if (g[k] === '1') {
          for (let a = 0; a < px; a++) for (let bb = 0; bb < px; bb++) raw(b, X + pad + (c * (gw + 1) + (k % gw)) * px + a, Y + pad + Math.floor(k / gw) * px + bb, 'white', 0);
        }
      });
    }

    const FIG = { knight: knight(), griffin: griffin(), wolf: wolf() };
    FIG.wolfL = flipX(FIG.wolf);

    function unit(b, spr, footX, footY, count, side) {
      const w = spr.w / S, h = spr.h / S;
      shadow(b, footX, footY, Math.round(w / 3));
      blit(b, spr, footX - Math.floor(w / 2), footY - h + 1);
      if (count) badge(b, footX + Math.floor(w / 2) - 1, footY - 6, count, side === 'player' ? 'cape' : 'gold');
    }

    function battle() {
      const b = buf(W * S, H * S);
      sky(b); mountains(b); castle(b); ground(b); trees(b); hexGrid(b); tufts(b);
      for (const [x, y, r] of [[150, 128, 4], [196, 168, 5], [120, 174, 3]]) blit(b, rock(r), x, y);
      hexHighlight(b, 110, 146);
      unit(b, FIG.knight, 26, 150, 0, 'player');
      unit(b, FIG.griffin, 110, 150, 8, 'player');
      unit(b, FIG.wolfL, 220, 137, 12, 'neutral');
      unit(b, FIG.wolfL, 253, 163, 9, 'neutral');
      return b;
    }

    return { S, battle, FIG, buf, ground };
  }

  // ---------- themes ----------

  const SIXTEEN = {
    sky: ['#26386f', '#34539a', '#5a80bd', '#93b5da', '#dcd8bf'],
    cloud: ['#ffffff', '#dfe7f2', '#aebfd9'],
    mtn: ['#a3add0', '#7f8bb6', '#626e98', '#4c5679'],
    snow: ['#ffffff', '#dfe6f4', '#b6c1dc', '#98a3c2'],
    hill: ['#6c9a62', '#557f53', '#426644', '#2f4b33'],
    tree: ['#79b552', '#4a8f3e', '#2f6a33', '#1d4a28', '#0f2616'],
    pine: ['#5fa05a', '#3b7a45', '#275a37', '#183e27', '#0b2014'],
    grass: ['#9acb5d', '#74ad49', '#58903d', '#3d6c30', '#22401c'],
    stone: ['#ddd6c4', '#aea590', '#7d7564', '#565045', '#2a2620'],
    stoneFar: ['#d2d3dc', '#a8abbc', '#80849a', '#5d6178', '#353848'],
    roof: ['#e06a50', '#b0412f', '#7f2a24', '#561b18', '#26100c'],
    steel: ['#eef3f7', '#aebbc9', '#71809a', '#4a5470', '#1d2034'],
    blade: ['#ffffff', '#d4dee9', '#8c9bb0', '#5a6478', '#1d2034'],
    cape: ['#77a2e6', '#4068bd', '#29428a', '#1b2c5f', '#0f152e'],
    plume: ['#ff8e70', '#da4832', '#9b2621', '#661816', '#2a0a0a'],
    gold: ['#ffe58c', '#e3ab3b', '#a9711f', '#6e4416', '#2e1a0c'],
    leather: ['#b47d4c', '#825432', '#5b3820', '#3c2214', '#1e1009'],
    fur: ['#f5d38a', '#d6a152', '#9f6c33', '#6a4422', '#2a1a0c'],
    feather: ['#ffffff', '#e8e0cb', '#b6aa8f', '#7e7360', '#2e2a24'],
    beak: ['#ffe36b', '#eab232', '#b37b1b', '#70480e', '#2e1a06'],
    wing: ['#cd8e56', '#925c33', '#653b21', '#40220f', '#1e0f06'],
    wolf: ['#cfcbc3', '#96918b', '#646060', '#403c3f', '#18161a'],
    eye: ['#fff27a', '#ffd23a'],
    void: ['#14101a'],
    white: ['#ffffff'],
    flower: ['#fff6a8', '#ffffff'],
  };
  const INK = '#2a1d14';
  const INKY = {
    sky: ['#dccfa9', '#e3d6b2', '#e9ddbc', '#efe4c6', '#f4eacf'],
    cloud: ['#fbf5e4', '#efe5c8', '#d6c8a2'],
    mtn: ['#d4c49c', '#bdab81', '#a28f68', '#877452'],
    snow: ['#fbf5e4', '#ebe1c5', '#d4c49c', '#bdab81'],
    hill: ['#c6b07f', '#ad9668', '#927b53', '#776241'],
    tree: ['#b9a777', '#94834f', '#6e5f38', '#4c4026', INK],
    pine: ['#a9996a', '#857547', '#625433', '#433a23', INK],
    grass: ['#ebdfb9', '#dacb9f', '#c1b081', '#9c8a5e', INK],
    stone: ['#efe7d2', '#cdbf9f', '#a29374', '#76694f', INK],
    stoneFar: ['#ebe1c8', '#d0c3a3', '#b0a283', '#8d7f62', '#5e5340'],
    roof: ['#e3a08b', '#bb5d4a', '#8e3a30', '#62261f', '#2a1410'],
    steel: ['#f8f3e5', '#d2c9b1', '#9f947b', '#6f6550', INK],
    blade: ['#fffaf0', '#e4dcc6', '#aa9e82', '#6f6550', INK],
    cape: ['#a4b4d8', '#6378b0', '#405289', '#2a3766', '#1d1a2e'],
    plume: ['#e3a08b', '#bb5d4a', '#8e3a30', '#62261f', '#2a1410'],
    gold: ['#efcc7c', '#cc9d4a', '#9a7232', '#6e4f22', INK],
    leather: ['#b38d64', '#8b6745', '#664a30', '#47331f', INK],
    fur: ['#edd6a0', '#d2b06e', '#a8844b', '#7a5d33', INK],
    feather: ['#fcf7e8', '#e8dec2', '#c0b394', '#8f8266', INK],
    beak: ['#efcc7c', '#cc9d4a', '#9a7232', '#6e4f22', INK],
    wing: ['#c39d6c', '#9b7549', '#735332', '#4f3822', INK],
    wolf: ['#e0d7c2', '#b5aa91', '#887d67', '#5e5545', INK],
    eye: ['#bb5d4a', '#8e3a30'],
    void: [INK],
    white: ['#fbf5e4'],
    flower: ['#bb5d4a', '#fbf5e4'],
  };

  const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  // Midpoints with a slight hue shift: cooler toward shadow, warmer toward light.
  function between(a, b) {
    const A = hex2(a), B = hex2(b);
    return toHex(A.map((v, i) => clamp((v + B[i]) / 2 + (i === 0 ? 2 : i === 2 ? -2 : 0), 0, 255)));
  }
  const expandRamp = (r) => r.flatMap((c, i) => (i < r.length - 1 ? [c, between(c, r[i + 1])] : [c]));
  // A theme at density S: each ramp gains in-between shades (4 → 7 → 13); outlines stay.
  function themeAt(base, S) {
    if (S === 1) return base;
    const out = {};
    for (const [k, r] of Object.entries(base)) {
      let ramp = r;
      const tail = k !== 'sky' && r.length === 5 ? [r[4]] : [];
      let body = tail.length ? r.slice(0, 4) : r;
      if (body.length >= 3) for (let s = 1; s < S; s *= 2) body = expandRamp(body);
      ramp = [...body, ...tail];
      out[k] = ramp;
    }
    return out;
  }

  const rgbCache = new Map();
  const rgb = (h) => { if (!rgbCache.has(h)) rgbCache.set(h, hex2(h)); return rgbCache.get(h); };

  function toCanvas(b, theme) {
    const c = document.createElement('canvas');
    c.width = b.w; c.height = b.h;
    const ctx = c.getContext('2d'), img = ctx.createImageData(b.w, b.h);
    const colours = new Set();
    for (let i = 0; i < b.w * b.h; i++) {
      if (!b.m[i]) continue;
      const ramp = theme[MATS[b.m[i]]], hex = ramp[Math.min(b.s[i], ramp.length - 1)];
      colours.add(hex);
      const [r, g, bl] = rgb(hex);
      img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = bl; img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    c.colourCount = colours.size;
    return c;
  }

  window.InkPixel = { makeArt, themeAt, toCanvas, SIXTEEN, INKY, W, H, GROUND };
})();
