import { useRef, useState } from 'react';
export type LeverControlProps = { position: { x: number; y: number }; disabled: boolean; onPull: (progress: number) => void; onActivate: () => void };
export default function LeverControl({ position, disabled, onPull, onActivate }: LeverControlProps) {
  const start = useRef<number | null>(null);
  const [phase, setPhase] = useState('idle');
  const reset = () => { start.current = null; onPull(0); setPhase('idle'); };
  return <button aria-label="Pull lever to generate an idea" data-testid="lever" data-phase={phase} aria-disabled={disabled}
    onPointerDown={e => { if (disabled) return; start.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); setPhase('dragging'); }}
    onPointerMove={e => { if (start.current !== null) onPull(Math.min(1, Math.max(0, (e.clientY - start.current) / 100))); }}
    onPointerUp={e => { if (start.current === null) return; const distance = e.clientY - start.current; reset(); if (Math.abs(distance) < 5 || distance >= 60) onActivate(); }}
    onPointerCancel={reset} onLostPointerCapture={reset}
    onClick={e => { if (e.detail === 0 && !disabled) onActivate(); }}
    style={{ position: 'absolute', left: position.x - 28, top: position.y - 28, width: 56, height: 160, background: 'transparent', border: 0, borderRadius: 18, cursor: disabled ? 'wait' : 'grab', touchAction: 'none' }} />;
}
