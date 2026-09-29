import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import type { ReelName } from '../domain/categories';
import { TextMesh } from './TextMesh';
import { ReelEmblem } from './ReelEmblem';
import { angleToIndex, easeOutQuint, getTargetRotation, indexToAngle, normalizeRotation, STEP } from './utils/reelMath';
export type ReelProps = { name: ReelName; labels: readonly string[]; x: number; targetIndex: number; spinId: number; spinning: boolean; waiting: boolean; duration: number; onStopped: (name: ReelName, index: number, spinId: number) => void };
export function Reel({ name, labels, x, targetIndex, spinId, spinning, waiting, duration, onStopped }: ReelProps) {
  const group = useRef<Group>(null);
  const animation = useRef({ spinId: 0, elapsed: 0, start: 0, target: 0, done: true });
  useFrame((_, delta) => {
    if (!group.current || !spinning) return;
    const a = animation.current;
    if (a.spinId !== spinId) Object.assign(a, { spinId, elapsed: 0, start: group.current.rotation.x, target: getTargetRotation(group.current.rotation.x, targetIndex), done: false });
    if (waiting) {
      if (duration > 0) group.current.rotation.x = normalizeRotation(group.current.rotation.x + delta * 12);
      Object.assign(a, { elapsed: 0, start: group.current.rotation.x, target: getTargetRotation(group.current.rotation.x, targetIndex) });
      return;
    }
    if (a.done) return;
    a.elapsed += delta;
    const progress = duration === 0 ? 1 : Math.min(1, a.elapsed / duration);
    group.current.rotation.x = a.start + (a.target - a.start) * easeOutQuint(progress);
    if (progress === 1) {
      group.current.rotation.x = normalizeRotation(a.target);
      a.done = true;
      onStopped(name, angleToIndex(group.current.rotation.x), spinId);
    }
  });
  useFrame(() => {
    if (!group.current) return;
    const rotation = group.current.rotation.x;
    group.current.children.forEach((face, index) => {
      face.visible = Math.cos(indexToAngle(index) - rotation) > 0.65;
    });
  });
  const radius = 2.75;
  return <group position={[x, 0.4, 1.3 - radius]} ref={group} name={`${name}-reel`}>
    {labels.map((label, index) => {
      const angle = indexToAngle(index);
      return <group key={label} position={[0, radius * Math.sin(angle), radius * Math.cos(angle)]} rotation={[-angle, 0, 0]} name={`${name}-face-${index}`}>
        <mesh><planeGeometry args={[1.29, 2 * radius * Math.tan(STEP / 2)]} /><meshStandardMaterial color={name === 'domain' ? '#4b0714' : name === 'approach' ? '#06283c' : '#103b20'} roughness={0.3} /></mesh>
        <ReelEmblem name={name} label={label} />
        <TextMesh raised wrap text={label.toUpperCase()} width={1.16} height={0.38} position={[0.012, -0.44, 0.012]} color="#160a04" />
        <TextMesh raised wrap text={label.toUpperCase()} width={1.16} height={0.38} position={[0, -0.42, 0.04]} color="#ffe1a0" />
        <mesh position={[0, -0.69, 0.008]}><planeGeometry args={[1.06, 0.009]} /><meshBasicMaterial color="#d59c3d" /></mesh>
      </group>;
    })}
  </group>;
}
