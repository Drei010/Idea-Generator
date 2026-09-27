import { useMemo } from 'react';
import { ShapeGeometry } from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import fontData from '../../assets/fonts/reel-font.typeface.json';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import boldData from '../../assets/fonts/cabinet-bold.typeface.json';
import { wrapLabel } from './utils/reelMath';
const boldFont = new FontLoader().parse(boldData);
const font = new FontLoader().parse(fontData);
export function TextMesh({ text, raised = false, wrap = false, width = 1, height = 0.4, color = '#29251b', position = [0, 0, 0] }: { text: string; raised?: boolean; wrap?: boolean; width?: number; height?: number; color?: string; position?: [number, number, number] }) {
  const geometry = useMemo(() => {
    const label = wrap ? wrapLabel(text) : text;
    const result = raised ? new TextGeometry(label, { font: boldFont, size: 0.24, depth: 0.024, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.004, bevelSegments: 2, curveSegments: 5 }) : new ShapeGeometry(font.generateShapes(label, 0.24));
    result.computeBoundingBox();
    const box = result.boundingBox!;
    const scale = Math.min(width / (box.max.x - box.min.x), height / (box.max.y - box.min.y));
    result.center(); result.scale(scale, scale, 1);
    return result;
  }, [text, raised, wrap, width, height]);
  return <mesh geometry={geometry} position={position}>{raised ? <meshStandardMaterial color={color} metalness={0.45} roughness={0.22} emissive={color} emissiveIntensity={0.18} /> : <meshBasicMaterial color={color} />}</mesh>;
}
