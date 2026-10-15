import { useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { CircleGeometry, SRGBColorSpace, TextureLoader } from 'three';
import { categories, type ReelName } from '../domain/categories';
import { medallions } from './utils/medallions';

export function ReelEmblem({ name, label }: { name: ReelName; label: string }) {
  const texture = useLoader(TextureLoader, require('../../assets/images/casino-icons.png') as string);
  texture.colorSpace = SRGBColorSpace;
  const geometry = useMemo(() => {
    const index = categories[name].indexOf(label);
    if (index < 0) throw new Error(`Missing casino icon for ${label}`);
    const [x, y, rim] = medallions[name][index];
    const diameter = rim * 2;
    const disc = new CircleGeometry(0.4, 48);
    const uv = disc.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (x + (uv.getX(i) - 0.5) * diameter) / 1536, 1 - (y + (0.5 - uv.getY(i)) * diameter) / 1024);
    }
    return disc;
  }, [name, label]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group position={[0, 0.28, 0.07]}>
    <mesh position={[0.025, -0.025, -0.035]}><circleGeometry args={[0.43, 48]} /><meshBasicMaterial color="#030b0a" /></mesh>
    <mesh><torusGeometry args={[0.406, 0.022, 8, 48]} /><meshStandardMaterial color="#ffd476" metalness={0.6} roughness={0.2} /></mesh>
    <mesh geometry={geometry} position={[0, 0, 0.025]}><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
  </group>;
}
