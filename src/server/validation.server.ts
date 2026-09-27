import { categories, reelNames, type Combination } from '../domain/categories';
export function validateCombination(value: unknown): Combination | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 3) return null;
  for (const key of reelNames) if (typeof record[key] !== 'string' || !(categories[key] as readonly string[]).includes(record[key] as string)) return null;
  return record as Combination;
}
