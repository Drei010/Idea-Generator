import { describe, expect, it } from 'vitest';
import { creakRate, moveLever, releaseLever, restingLever, strikeForSpeed, type LeverEvent, type LeverMotion } from '../../src/components/slot-machine/leverMotion';

// Drags the handle from rest to `to` in even steps over `ms` milliseconds.
function drag(to: number, ms: number, steps = 10) {
  let motion: LeverMotion = restingLever(0);
  const events: LeverEvent[] = [];
  for (let i = 1; i <= steps; i++) {
    const next = moveLever(motion, to * i / steps, ms * i / steps);
    motion = next.motion;
    events.push(...next.events);
  }
  return { motion, events };
}

describe('lever motion audio', () => {
  it('only ratchets past the notches the handle actually reached', () => {
    expect(drag(.3, 300).events.filter(event => event.type === 'ratchet')).toHaveLength(1);
    expect(drag(.7, 300).events.filter(event => event.type === 'ratchet')).toHaveLength(3);
    expect(drag(1, 300).events.filter(event => event.type === 'ratchet')).toHaveLength(4);
  });

  it('plays the stop only when the handle reaches the bottom', () => {
    const partial = drag(.9, 300);
    expect(partial.motion.bottomed).toBe(false);
    expect(partial.events.some(event => event.type === 'bottom')).toBe(false);
    expect(drag(1, 300).events.filter(event => event.type === 'bottom')).toHaveLength(1);
  });

  it('picks a softer or harder stop from the pull speed', () => {
    const strike = (ms: number) => drag(1, ms).events.find(event => event.type === 'bottom');
    expect(strike(1200)).toEqual({ type: 'bottom', strike: 'soft' });
    expect(strike(300)).toEqual({ type: 'bottom', strike: 'firm' });
    expect(strike(80)).toEqual({ type: 'bottom', strike: 'slam' });
    expect(strikeForSpeed(0)).toBe('soft');
  });

  it('springs back on a short release and snaps through on a long one', () => {
    expect(releaseLever(drag(.4, 300).motion)).toEqual([{ type: 'spring', strength: .4 }]);
    expect(releaseLever(drag(.75, 300).motion)).toEqual([{ type: 'snap', strike: 'firm' }]);
    expect(releaseLever(drag(1, 300).motion)).toEqual([]);
    expect(releaseLever(drag(.03, 300).motion)).toEqual([]);
  });

  it('re-ratchets when the handle is eased up and pulled again', () => {
    let { motion } = drag(.5, 200);
    motion = moveLever(motion, .1, 400).motion;
    expect(moveLever(motion, .5, 600).events.filter(event => event.type === 'ratchet')).toHaveLength(2);
  });

  it('stretches the creak for slow pulls and rushes it for fast ones within limits', () => {
    expect(creakRate(1 / .65)).toBeCloseTo(1);
    expect(creakRate(.1)).toBe(.3);
    expect(creakRate(20)).toBe(2);
  });
});

describe('lever motion timing', () => {
  it('does not count time spent resting as part of the next pull', () => {
    const first = moveLever(restingLever(0), .6, 60_000);
    const second = moveLever(first.motion, 1, 60_040);
    expect(second.events).toContainEqual({ type: 'bottom', strike: 'slam' });
  });
});
