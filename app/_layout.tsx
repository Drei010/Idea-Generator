import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
export default function Layout() {
  const [loaded, error] = useFonts({ DMSerif: DMSerifDisplay_400Regular });
  return <SafeAreaProvider><StatusBar style="light" />{(loaded || error || Platform.OS === 'web') && <Slot />}</SafeAreaProvider>;
}
