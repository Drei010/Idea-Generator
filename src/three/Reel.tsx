import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import type { ReelName } from '../domain/categories';
import { TextMesh } from './TextMesh';
import { angleToIndex, easeOutQuint, getTargetRotation, indexToAngle, normalizeRotation, STEP } from './utils/reelMath';
export type ReelProps = { name: ReelName; labels: readonly string[]; x: number; targetIndex: number; spinId: number; spinning: boolean; waiting: boolean; duration: number; onStopped: (name: ReelName, index: number, spinId: number) => void };
function ReelEmblem({ name }: { name: ReelName }) {
  return <group position={[0, 0.2, 0.07]}>
    {name === 'domain' ? <>
      <mesh><sphereGeometry args={[0.21, 20, 16]} /><meshStandardMaterial color="#1788a3" roughness={0.2} metalness={0.25} /></mesh>
      {[0, Math.PI / 2].map(angle => <mesh key={angle} rotation={[0, angle, 0]}><torusGeometry args={[0.215, 0.012, 6, 24]} /><meshBasicMaterial color="#ffd476" /></mesh>)}
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.215, 0.012, 6, 24]} /><meshBasicMaterial color="#ffd476" /></mesh>
    </> : name === 'approach' ? <>
      <mesh position={[0, 0.045, 0]}><sphereGeometry args={[0.18, 20, 16]} /><meshStandardMaterial color="#ffd16e" emissive="#ec9f28" emissiveIntensity={0.25} roughness={0.2} /></mesh>
      {[0, 1, 2].map(i => <mesh key={i} position={[0, -0.14 - i * 0.032, 0]}><boxGeometry args={[0.15 - i * 0.02, 0.024, 0.1]} /><meshStandardMaterial color="#344757" metalness={0.3} /></mesh>)}
    </> : [-1, 0, 1].map(i => <group key={i} position={[i * 0.16, i === 0 ? 0.035 : -0.025, i === 0 ? 0.04 : 0]}>
      <mesh position={[0, 0.085, 0]}><sphereGeometry args={[0.075, 12, 10]} /><meshStandardMaterial color={i === 0 ? '#f7b958' : '#efcf99'} roughness={0.3} /></mesh>
      <mesh position={[0, -0.08, 0]} scale={[1, 0.85, 0.5]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial color={i === 0 ? '#236d88' : '#509d9c'} roughness={0.3} /></mesh>
    </group>)}
  </group>;
}
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
  const radius = 1.75;
  return <group position={[x, 0.4, -0.45]} ref={group} name={`${name}-reel`}>
    {labels.map((label, index) => {
      const angle = indexToAngle(index);
      return <group key={label} position={[0, radius * Math.sin(angle), radius * Math.cos(angle)]} rotation={[-angle, 0, 0]} name={`${name}-face-${index}`}>
        <mesh><planeGeometry args={[1.29, 2 * radius * Math.tan(STEP / 2)]} /><meshStandardMaterial color="#f6ead2" roughness={0.35} /></mesh>
        <ReelEmblem name={name} />
        <TextMesh wrap text={label} width={1.08} height={0.28} position={[0, -0.28, 0.006]} />
        <mesh position={[0, -0.5, 0.008]}><planeGeometry args={[1.06, 0.009]} /><meshBasicMaterial color="#c8b995" /></mesh>
      </group>;
    })}
  </group>;
}
