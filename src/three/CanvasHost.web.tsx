import { Canvas } from '@react-three/fiber';
import { Scene, type SceneProps } from './Scene';
export default function CanvasHost(props: SceneProps) {
  return <Canvas camera={{ fov: 35, position: [0, 0, 12] }} dpr={[1, 2]} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} aria-label="Three-dimensional red and gold slot machine"><Scene {...props} /></Canvas>;
}
