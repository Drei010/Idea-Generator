import { Canvas, type RootState } from '@react-three/fiber/native';
import { Scene, type SceneProps } from './Scene';
const rendererOptions = { antialias: false, alpha: false };
const camera = { fov: 35, position: [0, 0, 12] as [number, number, number] };
function configureRenderer(state: RootState) { state.gl.setClearColor('#102c28', 1); }
export default function CanvasHost(props: SceneProps) {
  return <Canvas camera={camera} gl={rendererOptions} onCreated={configureRenderer} style={{ flex: 1 }}><Scene {...props} /></Canvas>;
}
