// Pure lever physics for audio: where the handle is, how fast it moves, and which sounds that earns.
export type LeverStrike = 'soft' | 'firm' | 'slam';
export type LeverMotion = { progress: number; time: number; speed: number; notches: number; bottomed: boolean };
export type LeverEvent =
  | { type: 'ratchet'; speed: number }
  | { type: 'bottom'; strike: LeverStrike }
  | { type: 'snap'; strike: LeverStrike }
  | { type: 'spring'; strength: number };

export const NOTCHES = 4; // Ratchet teeth between rest and the stop.
export const BOTTOM = .98;
export const ACTIVATE_AT = .6; // A release past this point throws the lever the rest of the way.
export const CREAK_SECONDS = .65;

export const restingLever = (time = 0): LeverMotion => ({ progress: 0, time, speed: 0, notches: 0, bottomed: false });

// Speed is in full pulls per second.
export const strikeForSpeed = (speed: number): LeverStrike => speed >= 6 ? 'slam' : speed >= 2.2 ? 'firm' : 'soft';

export function moveLever(motion: LeverMotion, progress: number, time: number): { motion: LeverMotion; events: LeverEvent[] } {
  // A resting lever has no meaningful last sample, so its first move counts as one pointer frame.
  const elapsed = Math.max(motion.progress === 0 ? Math.min(time - motion.time, 50) : time - motion.time, 1);
  const instant = Math.max(0, progress - motion.progress) / elapsed * 1000;
  const speed = progress > motion.progress ? motion.speed * .4 + instant * .6 : motion.speed * .5;
  const notches = Math.min(NOTCHES, Math.floor(progress * (NOTCHES + 1)));
  const events: LeverEvent[] = [];
  for (let notch = motion.notches; notch < notches; notch++) events.push({ type: 'ratchet', speed });
  const bottomed = motion.bottomed || progress >= BOTTOM;
  if (bottomed && !motion.bottomed) events.push({ type: 'bottom', strike: strikeForSpeed(speed) });
  return { motion: { progress, time, speed, notches, bottomed }, events };
}

export function releaseLever(motion: LeverMotion): LeverEvent[] {
  if (motion.bottomed) return [];
  if (motion.progress >= ACTIVATE_AT) return [{ type: 'snap', strike: strikeForSpeed(motion.speed) }];
  return motion.progress > .05 ? [{ type: 'spring', strength: motion.progress }] : [];
}

// Matches the creak's playback to the handle so a slow pull drags it out and a flick rushes it.
export const creakRate = (speed: number) => Math.min(2, Math.max(.3, speed * CREAK_SECONDS));
