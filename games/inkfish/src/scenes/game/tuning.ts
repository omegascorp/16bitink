/** Gameplay constants in one place for easy balancing. */
export const TUNING = {
  playerSpeed: 300,
  playerAccel: 5,
  speedBoost: 1.6,
  speedBoostMs: 6000,
  dashSpeed: 820,
  dashCooldownMs: 1400,
  lives: 3,
  invulnerableMs: 2500,
  stunMs: 1100,
  /** Jellyfish stings other fish for longer: they have no player to steer them out. */
  fishStunMs: 1800,
  /** How long a hooked player thrashes before slipping off (if lives remain). */
  hookStruggleMs: 750,
  /** Falling items: one every so often, resting on the seabed this long before they're gone. */
  itemEverySec: 11,
  itemRestMs: 14000,
  slowFactor: 0.55,
  sickMs: 4500,
  tangledMs: 5000,
  shockRadius: 280,
  shockMs: 3500,
  /** Shocked fish up to this many times your size can be eaten while stunned. */
  shockEdibleRatio: 1.6,
  blastRadius: 250,
  blastKillRatio: 2.2,
  deadFloatMs: 8000,
  decoyMs: 6500,
  glowMs: 20000,
  glowFactor: 1.8,
  chumSchool: 8,
  treasureScore: 500,
  hookWarnMs: 1500,
  hookHoldMs: 3200,
  baseVisibleHeight: 430,
} as const;
