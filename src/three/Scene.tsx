import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { ExtrudeGeometry, Group, MeshStandardMaterial, PerspectiveCamera, PMREMGenerator, Shape, Vector3 } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useMemo } from 'react';
import { Reel } from './Reel';
import { TextMesh } from './TextMesh';
import { categories, reelNames, type ReelFaces, type ReelIndexes, type ReelName } from '../domain/categories';
export type SceneProps = { machineWidth?: number; indexes: ReelIndexes; faces: ReelFaces; spinId: number; spinning: boolean; waiting: boolean; celebrating: boolean; pull: number; reducedMotion: boolean; duration?: number; onStopped: (name: ReelName, index: number, spinId: number) => void; onReady: () => void; onLeverPosition: (position: { x: number; y: number }) => void };
const possibilities = (categories.domain.length * categories.approach.length * categories.niche.length).toLocaleString('en-US');
function Box({ size, position, color, metal = 0, radius = 0.06 }: { size: [number, number, number]; position: [number, number, number]; color: string; metal?: number; radius?: number }) {
  const geometry = useMemo(() => new RoundedBoxGeometry(...size, 3, radius), [size[0], size[1], size[2], radius]);
  return <mesh position={position} geometry={geometry}><meshStandardMaterial color={color} metalness={metal} roughness={metal ? 0.2 : 0.23} emissive={metal ? color : "#000000"} emissiveIntensity={metal ? 0.12 : 0} /></mesh>;
}
function Crown() {
  const geometry = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-2.38, 1.2); shape.lineTo(-2.38, 3.15);
    shape.quadraticCurveTo(-2.38, 3.6, -1.95, 3.6);
    shape.lineTo(-1.35, 3.66); shape.quadraticCurveTo(-1.15, 3.88, -0.8, 3.88);
    shape.lineTo(0.8, 3.88); shape.quadraticCurveTo(1.15, 3.88, 1.35, 3.66);
    shape.lineTo(1.95, 3.6); shape.quadraticCurveTo(2.38, 3.6, 2.38, 3.15);
    shape.lineTo(2.38, 1.2); shape.closePath();
    return new ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: true, bevelSize: 0.055, bevelThickness: 0.04, bevelSegments: 3, steps: 1 });
  }, []);
  return <group>
    <mesh geometry={geometry} position={[0, 0, 0.69]}><meshStandardMaterial color="#f4b847" metalness={0.55} roughness={0.2} emissive="#d99019" emissiveIntensity={0.2} /></mesh>
    <mesh geometry={geometry} position={[0, 0.1, 0.89]} scale={[0.955, 0.94, 0.45]}><meshStandardMaterial color="#b50d22" roughness={0.2} metalness={0.15} /></mesh>
  </group>;
}
function Star({ position, size = 0.18 }: { position: [number, number, number]; size?: number }) {
  const geometry = useMemo(() => {
    const shape = new Shape();
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? size * 0.45 : size;
      if (i === 0) shape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    shape.closePath();
    return new ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.025, bevelSegments: 1, steps: 1 });
  }, [size]);
  return <mesh position={position} geometry={geometry}><meshStandardMaterial color="#ffd26d" metalness={0.4} roughness={0.2} emissive="#e7aa36" emissiveIntensity={0.25} /></mesh>;
}
function Lamp({ position, active, reducedMotion, radius = 0.075, phase = 0 }: { position: [number, number, number]; active: boolean; reducedMotion: boolean; radius?: number; phase?: number }) {
  const material = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (material.current) material.current.emissiveIntensity = active && (reducedMotion || Math.sin(clock.elapsedTime * Math.PI * 3 + phase) > 0) ? 4 : 0;
  });
  return <mesh position={position}><sphereGeometry args={[radius, 20, 16]} /><meshStandardMaterial ref={material} color="#781c12" emissive="#ff9b32" roughness={0.18} metalness={0.15} /></mesh>;
}
function Lever({ pull, spinning, reducedMotion }: { pull: number; spinning: boolean; reducedMotion: boolean }) {
  const arm = useRef<Group>(null);
  const velocity = useRef(0);
  useFrame((_, delta) => {
    if (!arm.current) return;
    if (pull > 0 || reducedMotion) {
      arm.current.rotation.x = pull * 2.2;
      velocity.current = 0;
      return;
    }
    // Small integration steps keep the spring stable after a slow frame or resume.
    for (let remaining = Math.min(delta, .1); remaining > 0;) {
      const step = Math.min(remaining, 1 / 120);
      velocity.current += (-280 * arm.current.rotation.x - 16 * velocity.current) * step;
      arm.current.rotation.x += velocity.current * step;
      remaining -= step;
    }
    if (Math.abs(arm.current.rotation.x) < .0001 && Math.abs(velocity.current) < .001) {
      arm.current.rotation.x = 0;
      velocity.current = 0;
    }
  });
  return <group position={[3.15, -0.4, 0.4]}>
    <Box size={[0.8, 0.22, 0.35]} position={[-0.4, 0, 0]} color="#efb649" metal={0.55} />
    <Box size={[0.55, 0.55, 0.7]} position={[0, 0, 0]} color="#efb649" metal={0.55} />
    <group ref={arm}>
      <mesh position={[0, 0.8, 0.1]}><cylinderGeometry args={[0.065, 0.095, 1.6, 16]} /><meshStandardMaterial color="#efb649" metalness={0.9} roughness={0.2} /></mesh>
      <mesh position={[0, 1.6, 0.1]}><sphereGeometry args={[0.26, 32, 24]} /><meshStandardMaterial color={spinning ? '#ad272b' : '#ec4439'} metalness={0.3} roughness={0.22} /></mesh>
    </group>
  </group>;
}
export function Scene({ machineWidth = 430, indexes, faces, spinId, spinning, waiting, celebrating, pull, reducedMotion, duration = 2.3, onStopped, onReady, onLeverPosition }: SceneProps) {
  const { camera, size, gl, scene } = useThree();
  useEffect(() => {
    const generator = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const reflection = generator.fromScene(room, 0.04);
    scene.environment = reflection.texture;
    scene.environmentIntensity = 0.65;
    room.dispose(); generator.dispose();
    return () => { scene.environment = null; reflection.dispose(); };
  }, [gl, scene]);
  const renderedFrames = useRef(0);
  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    cam.position.set(0.43, 0.05, 1.575 + 5.588 * size.height / (2 * Math.tan(cam.fov * Math.PI / 360) * Math.min(machineWidth, size.width - 8)));
    cam.lookAt(0.43, 0.05, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const knob = new Vector3(3.15 * 1.1, 1.2, 0.5).project(cam);
    onLeverPosition({ x: (knob.x + 1) * size.width / 2, y: (1 - knob.y) * size.height / 2 });
  }, [camera, size, machineWidth, onLeverPosition]);
  // Signal readiness after a normal Fiber frame; native rendering presents via endFrameEXP.
  useFrame(() => { if (++renderedFrames.current === 2) onReady(); });
  return <>
    <ambientLight intensity={0.55} />
    <directionalLight position={[-3, 5, 8]} intensity={2.4} color="#ffe1aa" />
    <directionalLight position={[5, 2, 3]} intensity={1.2} color="#d8f1e6" />
    <group scale={[1.1, 1, 1]}>
      <Box size={[4.85, 7.5, 2.2]} position={[0, 0, -0.65]} color="#b50d22" radius={0.18} />
      <Box size={[4.98, 7.1, 0.16]} position={[0, 0, 0.48]} color="#efb649" metal={0.55} radius={0.03} />
      <Box size={[4.65, 6.95, 0.12]} position={[0, 0, 0.59]} color="#171b1c" radius={0.025} />
      <group position={[0, 0, 0.7]}>
      <Crown />
      <TextMesh raised text="LUCKY IDEA" width={3.58} height={0.64} position={[0.025, 3.005, 1.04]} color="#5a0711" />
      <TextMesh raised text="LUCKY IDEA" width={3.58} height={0.64} position={[0, 3.07, 1.11]} color="#ffd982" />
      {[-1.99, 1.99].map(x => <Star key={x} position={[x, 3.01, 1.1]} />)}
      <TextMesh text="CHANCE & POSSIBILITY" width={2.9} height={0.15} position={[0, 2.5, 1.06]} color="#f1c364" />
      {[-1, 1].map(x => <group key={x}>
        <Box size={[1.86, 0.68, 0.04]} position={[x * 1.03, 2.02, 1.05]} color="#b98b3f" metal={0.5} radius={0.01} />
        <Box size={[1.78, 0.6, 0.04]} position={[x * 1.03, 2.02, 1.08]} color="#191d1b" radius={0.01} />
        <TextMesh text={x < 0 ? 'THREE REELS' : 'ONE NEW IDEA'} width={1.53} height={0.18} position={[x * 1.03, 2.02, 1.12]} color="#f5ce76" />
      </group>)}
      </group>
      <Box size={[4.65, 0.3, 1.05]} position={[0, 1.50, 1.06]} color="#232829" radius={0.025} />
      <Box size={[4.65, 0.35, 1.05]} position={[0, -0.75, 1.06]} color="#232829" radius={0.025} />
      <Box size={[4.38, 0.09, 0.16]} position={[0, 1.32, 1.61]} color="#dfbd6b" metal={0.7} />
      <Box size={[4.38, 0.09, 0.16]} position={[0, -0.52, 1.61]} color="#dfbd6b" metal={0.7} />
      {[-2.24, -0.735, 0.735, 2.24].map(x => <Box key={x} size={[0.15, 1.91, 0.18]} position={[x, 0.4, 1.61]} color="#efb649" metal={0.55} />)}
      {reelNames.map((name, i) => <Reel key={name} name={name} labels={faces[name]} x={(i - 1) * 1.46} targetIndex={indexes[name]} spinId={spinId} spinning={spinning} waiting={waiting} duration={reducedMotion ? 0 : duration + i * 0.4} onStopped={onStopped} />)}
      {['DOMAIN', 'APPROACH', 'NICHE'].map((text, i) => <TextMesh key={text} text={text} width={0.9} height={0.11} position={[(i - 1) * 1.46, -0.76, 1.65]} color="#f9d692" />)}
      <Box size={[4.8, 0.58, 1.22]} position={[0, -1.15, 1.05]} color="#efb649" metal={0.55} radius={0.04} />
      <Box size={[4.32, 0.42, 0.08]} position={[0, -1.15, 1.69]} color="#242728" radius={0.02} />
      {[-1.46, 0, 1.46].map((x, i) => <Lamp key={x} position={[x, -1.15, 1.76]} active={celebrating} reducedMotion={reducedMotion} radius={0.2} phase={i * Math.PI / 2} />)}
      <Box size={[0.44, 0.09, 0.06]} position={[1.86, -1.43, 1.7]} color="#171b1c" metal={0.5} />
      <group position={[0, 0, 0.65]}>
      <Box size={[4.42, 1.4, 0.18]} position={[0, -2.17, 0.8]} color="#efb649" metal={0.55} radius={0.025} />
      <Box size={[4.2, 1.19, 0.12]} position={[0, -2.17, 0.92]} color="#a30920" radius={0.13} />
      <TextMesh raised text="POSSIBILITY" width={3.45} height={0.48} position={[0.025, -2.09, 1.04]} color="#57070f" />
      <TextMesh raised text="POSSIBILITY" width={3.45} height={0.48} position={[0, -2.03, 1.11]} color="#ffda82" />
      {[-1.94, 1.94].map(x => <Star key={x} position={[x, -2.12, 1.1]} size={0.16} />)}
      <TextMesh text={`${possibilities} COMBINATIONS`} width={2.6} height={0.17} position={[0, -2.49, 1.01]} color="#f9d692" />
      {[-2.73, -1.62, 2.44].map(y => <Box key={y} size={[3.72, 0.035, 0.025]} position={[0, y, 1.01]} color="#e4b34e" metal={0.6} radius={0.01} />)}
      {[-1, 1].flatMap(x => [-2.65, -1.65, 2.46].map(y => <mesh key={`${x}-${y}`} position={[x * 1.89, y, 1.02]} rotation={[0, 0, Math.PI / 4]}><planeGeometry args={[0.15, 0.15]} /><meshBasicMaterial color="#edbd59" /></mesh>))}
      </group>
      <Box size={[1.27, 0.6, 0.08]} position={[0, -3.21, 0.77]} color="#efb649" metal={0.55} radius={0.01} />
      {Array.from({ length: 6 }, (_, i) => <Box key={i} size={[1.09, 0.035, 0.025]} position={[0, -2.99 - i * 0.085, 0.83]} color="#202425" radius={0.005} />)}
      <Box size={[5.08, 0.22, 3.05]} position={[0, -3.83, 0.04]} color="#161b1c" radius={0.035} />
      <Box size={[5.08, 0.36, 0.13]} position={[0, -3.57, 1.51]} color="#22282a" metal={0.4} radius={0.025} />
      {[-2.47, 2.47].map(x => <Box key={x} size={[0.14, 0.38, 1.1]} position={[x, -3.57, 1]} color="#22282a" metal={0.4} radius={0.025} />)}
      <Box size={[0.5, 0.12, 0.5]} position={[0, 4.02, 1.1]} color="#efb649" metal={0.9} />
      <Lamp position={[0, 4.25, 1.1]} active={celebrating} reducedMotion={reducedMotion} radius={0.29} />
      {[-2.12, 2.12].flatMap(x => [1.70, 2.25, 2.78, 3.43, -1.67, -2.72].map((y, i) => <Lamp key={`${x}-${y}`} position={[x, y, y > 0 ? 1.72 : 1.67]} active={celebrating} reducedMotion={reducedMotion} phase={i * Math.PI / 2} />))}
      {[-1.75, -1.15, -0.58, 0, 0.58, 1.15, 1.75].map((x, i) => <Lamp key={x} position={[x, Math.abs(x) > 1.3 ? 3.46 : 3.64, 1.78]} active={celebrating} reducedMotion={reducedMotion} radius={0.08} phase={i * Math.PI / 2} />)}
      <Box size={[5.05, 0.08, 0.2]} position={[0, -3.39, 1.55]} color="#efb649" metal={0.5} />
      <Lever pull={pull} spinning={spinning} reducedMotion={reducedMotion} />
    </group>
  </>;
}
