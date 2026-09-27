import { useMemo } from 'react';
import { PanResponder, View } from 'react-native';
import type { LeverControlProps } from './LeverControl.web';
export default function LeverControl({ position, disabled, onPull, onActivate }: LeverControlProps) {
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, gesture) => { onPull(Math.min(1, Math.max(0, gesture.dy / 100))); },
    onPanResponderRelease: (_, gesture) => { onPull(0); if (!disabled && (Math.abs(gesture.dy) < 5 || gesture.dy >= 60)) onActivate(); },
    onPanResponderTerminate: () => onPull(0),
  }), [disabled, onPull, onActivate]);
  return <View {...pan.panHandlers} accessible accessibilityRole="button" accessibilityLabel="Pull lever to generate an idea" accessibilityState={{ disabled }} accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'activate' && !disabled) onActivate(); }} testID="lever" style={{ position: 'absolute', left: position.x - 28, top: position.y - 28, width: 56, height: 160 }} />;
}
