export const TAU = 2 * Math.PI;
export const STEP = TAU / 10;
export const normalizeRotation = (rotation: number) => ((rotation % TAU) + TAU) % TAU;
export function indexToAngle(index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= 10) throw new Error('Invalid reel index.');
  return index * STEP;
}
export const angleToIndex = (rotation: number) => Math.round(normalizeRotation(rotation) / STEP) % 10;
export function getTargetRotation(currentRotation: number, targetIndex: number, minimumRotations = 3): number {
  if (!Number.isFinite(currentRotation) || !Number.isInteger(minimumRotations) || minimumRotations < 0) throw new Error('Invalid rotation.');
  return currentRotation + TAU * minimumRotations + normalizeRotation(indexToAngle(targetIndex) - normalizeRotation(currentRotation));
}
export const easeOutQuint = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 5;
export function wrapLabel(label: string): string {
  if (!label.trim()) throw new Error('Label cannot be empty.');
  if (label.length <= 14 || !label.includes(' ')) return label;
  const words = label.split(' ');
  let split = 1;
  for (let i = 2; i < words.length; i++) {
    if (Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length) < Math.abs(words.slice(0, split).join(' ').length - words.slice(split).join(' ').length)) split = i;
  }
  return `${words.slice(0, split).join(' ')}\n${words.slice(split).join(' ')}`;
}
