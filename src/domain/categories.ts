import domainData from './data/domains.json';
import approachData from './data/approaches.json';
import nicheData from './data/niches.json';

export const domains: readonly string[] = domainData;
export const approaches: readonly string[] = approachData;
export const niches: readonly string[] = nicheData;
export const categories = { domain: domains, approach: approaches, niche: niches };
export const reelNames = ['domain', 'approach', 'niche'] as const;
export type ReelName = typeof reelNames[number];
export type ReelIndexes = Record<ReelName, number>;
export type ReelFaces = Record<ReelName, readonly string[]>;
export type Combination = Record<ReelName, string>;
const FACE_COUNT = 10;
export const firstReelFaces: ReelFaces = {
  domain: domains.slice(0, FACE_COUNT),
  approach: approaches.slice(0, FACE_COUNT),
  niche: niches.slice(0, FACE_COUNT),
};

export function combinationFromIndexes(indexes: ReelIndexes, faces = firstReelFaces): Combination {
  for (const key of reelNames) if (!Number.isInteger(indexes[key]) || indexes[key] < 0 || indexes[key] >= FACE_COUNT) throw new Error('Reel index must be between 0 and 9.');
  return { domain: faces.domain[indexes.domain], approach: faces.approach[indexes.approach], niche: faces.niche[indexes.niche] };
}

export function reelFacesForSelection(indexes: ReelIndexes, selected: ReelIndexes): ReelFaces {
  const faces = {} as Record<ReelName, readonly string[]>;
  for (const key of reelNames) {
    const values = categories[key];
    if (values.length < FACE_COUNT || !Number.isInteger(selected[key]) || selected[key] < 0 || selected[key] >= values.length) throw new Error('Selected category index is invalid.');
    const start = (selected[key] - indexes[key] + values.length) % values.length;
    faces[key] = Array.from({ length: FACE_COUNT }, (_, offset) => values[(start + offset) % values.length]);
  }
  return faces;
}

export function randomIndexes(random = Math.random): ReelIndexes {
  const pick = () => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Random source must return a value in [0, 1).');
    return Math.floor(value * FACE_COUNT);
  };
  return { domain: pick(), approach: pick(), niche: pick() };
}

export function randomCategoryIndexes(random = Math.random): ReelIndexes {
  const pick = (values: readonly string[]) => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Random source must return a value in [0, 1).');
    return Math.floor(value * values.length);
  };
  return { domain: pick(domains), approach: pick(approaches), niche: pick(niches) };
}
