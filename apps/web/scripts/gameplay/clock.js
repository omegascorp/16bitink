// Injected before any page script: lets the recorder take over time.
// Until freeze() the page runs in real time. After it, requestAnimationFrame
// callbacks and performance.now/Date.now only move when step(ms) is called,
// so each captured frame is exactly 1/fps apart however slow the capture is.
(() => {
  const realPerf = performance.now.bind(performance);
  const realDate = Date.now;
  const realRaf = window.requestAnimationFrame.bind(window);
  const realCancel = window.cancelAnimationFrame.bind(window);
  let virtual = false;
  let now = 0;
  let dateBase = 0;
  let nextId = 1e6;
  let queue = new Map();

  performance.now = () => (virtual ? now : realPerf());
  Date.now = () => (virtual ? Math.round(dateBase + now) : realDate());
  window.requestAnimationFrame = (cb) => {
    if (!virtual) return realRaf(cb);
    const id = ++nextId;
    queue.set(id, cb);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    if (queue.delete(id)) return;
    realCancel(id);
  };

  window.__clock = {
    freeze() {
      if (virtual) return;
      now = realPerf();
      dateBase = realDate() - now;
      virtual = true;
    },
    step(ms) {
      now += ms;
      const due = [...queue.values()];
      queue = new Map();
      for (const cb of due) {
        try { cb(now); } catch (err) { console.error('[clock] frame callback failed', err); }
      }
    },
    get virtual() { return virtual; },
  };
})();
