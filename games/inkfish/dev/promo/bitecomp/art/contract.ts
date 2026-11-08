/**
 * The one shape every animal in the bite-force video is drawn through, so the
 * engine can stage any of them on the sensor bar the same way.
 *
 * A head-and-shoulders side view, FACING RIGHT. The animal is placed by its
 * bite point: where its biting teeth meet when the jaw is shut (for a bite on
 * the sensor bar, the bar sits there). Everything else is drawn to the LEFT
 * of it and above/below it, in proportion to `size`.
 */
export interface HeadPose {
  /** The bite point, canvas px. */
  readonly x: number;
  readonly y: number;
  /** Head length, snout tip to the back of the skull, in px. Neck and shoulders extend past it to the left (about 0.8 × size more). */
  readonly size: number;
  /** 0 = shut .. 1 = wide open (the lower jaw rotates down about its hinge). */
  readonly jaw: number;
  /** Seconds, for idle motion only (breathing, a blink, the line boil). Must not move the bite point. */
  readonly t: number;
}

export type DrawHead = (ctx: CanvasRenderingContext2D, pose: HeadPose) => void;

/** Placeholder until an animal's painted drawing lands: a grey head with a hinged jaw. */
export function placeholderHead(label: string): DrawHead {
  return (ctx, p) => {
    const s = p.size;
    const open = p.jaw * 0.6;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = '#8a8f96';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = Math.max(2, s * 0.02);
    ctx.beginPath();
    ctx.ellipse(-s * 0.55, -s * 0.18, s * 0.6, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.translate(-s * 0.85, 0);
    ctx.rotate(open);
    ctx.beginPath();
    ctx.rect(0, 0, s * 0.85, s * 0.14);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.round(s * 0.12)}px sans-serif`;
    ctx.fillText(label, -s * 0.9, -s * 0.2);
    ctx.restore();
  };
}
