import { useMemo } from 'react';
import { ShapeGeometry, type BufferGeometry } from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import fontData from '../../assets/fonts/reel-font.typeface.json';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import boldData from '../../assets/fonts/cabinet-bold.typeface.json';
import { wrapLabel } from './utils/reelMath';
const boldFont = new FontLoader().parse(boldData);
const font = new FontLoader().parse(fontData);
const SIZE = 0.24;
const LINE_HEIGHT = SIZE * 1.5;
// maxScale caps how far short labels grow, so neighbouring labels share one letter size.
export function TextMesh({ text, raised = false, wrap = false, width = 1, height = 0.4, maxScale = Infinity, color = '#29251b', position = [0, 0, 0] }: { text: string; raised?: boolean; wrap?: boolean; width?: number; height?: number; maxScale?: number; color?: string; position?: [number, number, number] }) {
  const geometry = useMemo(() => {
    const lines = (wrap ? wrapLabel(text) : text).split('\n');
    // Each line is centered on its own so two-line labels sit evenly instead of flush left.
    const parts: BufferGeometry[] = lines.map((line, index) => {
      const part = raised ? new TextGeometry(line, { font: boldFont, size: SIZE, depth: 0.024, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.004, bevelSegments: 2, curveSegments: 5 }) : new ShapeGeometry(font.generateShapes(line, SIZE));
      part.computeBoundingBox();
      const box = part.boundingBox!;
      part.translate(-(box.min.x + box.max.x) / 2, -index * LINE_HEIGHT, 0);
      return part;
    });
    const result = parts.length === 1 ? parts[0] : mergeGeometries(parts)!;
    if (parts.length > 1) parts.forEach(part => part.dispose());
    result.computeBoundingBox();
    const box = result.boundingBox!;
    const scale = Math.min(width / (box.max.x - box.min.x), height / (box.max.y - box.min.y), maxScale);
    result.center(); result.scale(scale, scale, 1);
    return result;
  }, [text, raised, wrap, width, height, maxScale]);
  return <mesh geometry={geometry} position={position}>{raised ? <meshStandardMaterial color={color} metalness={0.45} roughness={0.22} emissive={color} emissiveIntensity={0.18} /> : <meshBasicMaterial color={color} />}</mesh>;
}
