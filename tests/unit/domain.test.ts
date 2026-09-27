import { describe, it, expect } from 'vitest';
import { categories, combinationFromIndexes, randomCategoryIndexes, randomIndexes, reelFacesForSelection } from '../../src/domain/categories';
import { angleToIndex, getTargetRotation, normalizeRotation, indexToAngle, wrapLabel, TAU, STEP } from '../../src/three/utils/reelMath';
import { validateCombination } from '../../src/server/validation.server';

describe('canonical categories', () => {
  it('loads 46 unique values per reel and preserves canonical strings', () => {
    for (const values of Object.values(categories)) { expect(values).toHaveLength(46); expect(new Set(values).size).toBe(46); }
    expect(combinationFromIndexes({ domain: 2, approach: 7, niche: 4 })).toEqual({ domain: 'Finance', approach: 'Augmented Reality', niche: 'Senior Citizens' });
  });
  it('puts any expanded category pool selection on the chosen ten-face reel position', () => {
    const target = { domain: 2, approach: 7, niche: 4 };
    const selected = { domain: 45, approach: 44, niche: 43 };
    const faces = reelFacesForSelection(target, selected);
    expect(combinationFromIndexes(target, faces)).toEqual({ domain: categories.domain[45], approach: categories.approach[44], niche: categories.niche[43] });
    for (const key of Object.keys(target) as (keyof typeof target)[]) expect(faces[key]).toHaveLength(10);
    expect(randomCategoryIndexes(() => 0.999)).toEqual({ domain: 45, approach: 45, niche: 45 });
  });
  it('supports deterministic randomness and rejects invalid indexes', () => {
    let i = 0; expect(randomIndexes(() => [0.2, 0.7, 0.4][i++])).toEqual({ domain: 2, approach: 7, niche: 4 });
    expect(() => randomIndexes(() => 1)).toThrow();
    expect(() => combinationFromIndexes({ domain: -1, approach: 0, niche: 0 })).toThrow();
  });
});
describe('reel alignment', () => {
  it('round-trips every face from positive, negative and fractional starting rotations', () => {
    for (let index = 0; index < 10; index++) for (const current of [0, TAU, TAU * 14, -TAU * 3, -0.1, 2.456]) {
      const target = getTargetRotation(current, index);
      expect(target - current).toBeGreaterThanOrEqual(TAU * 3 - 1e-9);
      expect(angleToIndex(target)).toBe(index);
      expect(angleToIndex(target + 1e-10)).toBe(index);
      expect(angleToIndex(target - 1e-10)).toBe(index);
      expect(Math.min(Math.abs(normalizeRotation(target) - indexToAngle(index)), Math.abs(normalizeRotation(target) - indexToAngle(index) - TAU))).toBeLessThan(1e-9);
    }
    expect(angleToIndex(-STEP)).toBe(9);
    expect(angleToIndex(STEP / 2 - 1e-8)).toBe(0);
    expect(angleToIndex(STEP / 2 + 1e-8)).toBe(1);
  });
  it('wraps long labels without altering their words', () => {
    for (const label of Object.values(categories).flat()) { const text = wrapLabel(label); expect(text.replace('\n', ' ')).toBe(label); expect(text.split('\n').length).toBeLessThanOrEqual(2); }
    expect(wrapLabel('Artificial Intelligence')).toBe('Artificial\nIntelligence');
    expect(() => wrapLabel('')).toThrow();
  });
});
describe('request validation', () => {
  it('accepts combinations from the expanded category pools', () => {
    for (const domain of categories.domain) for (const approach of categories.approach) for (const niche of categories.niche) expect(validateCombination({ domain, approach, niche })).toEqual({ domain, approach, niche });
  });
  it.each([null, 1, [], {}, { domain: 'Healthcare' }, { domain: 'Anything', approach: 'Automation', niche: 'Freelancers' }, { domain: 'Finance', approach: '', niche: 'Children' }, { domain: 'Finance', approach: 'Automation', niche: 5 }, { domain: 'Finance', approach: 'Automation', niche: 'Children', extra: true }])('rejects invalid body %j', body => expect(validateCombination(body)).toBeNull());
});
