import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import CanvasHost from '../../three/CanvasHost';
import { createSlotMachineStore } from '../../state/slotMachineStore';
import { categories, combinationFromIndexes, randomCategoryIndexes, randomIndexes, reelNames, type ReelIndexes, type ReelName } from '../../domain/categories';
import { generateIdea } from '../../services/ideaApi';
import LeverControl from './LeverControl';
import { playSoundWhenReady, updateSpinSound } from './spinSound';

declare global { interface Window { __IDEA_TEST__?: { indexes?: ReelIndexes; categoryIndexes?: ReelIndexes; duration?: number } } }
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Text accessibilityRole="alert" style={s.sceneError}>The 3D scene could not start. Enable graphics acceleration and reload to try again.</Text> : this.props.children; }
}
export default function SlotMachine() {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const [receiptWidth, setReceiptWidth] = useState(430);
  // The injected test seam is deliberately absent from production bundles.
  const test = useRef(__DEV__ && Platform.OS === 'web' && typeof window !== 'undefined' ? window.__IDEA_TEST__ : undefined).current;
  const [store] = useState(() => createSlotMachineStore(generateIdea, () => test?.indexes ?? randomIndexes(), () => test ? test.categoryIndexes ?? test.indexes ?? randomCategoryIndexes() : randomCategoryIndexes()));
  const state = useStore(store);
  const leverSound = useAudioPlayer(require('../../../assets/sounds/lever-pull.wav'));
  const creakSound = useAudioPlayer(require('../../../assets/sounds/lever-creak.wav'));
  const spinSound = useAudioPlayer(require('../../../assets/sounds/reel-spin.wav'));
  const stopSound = useAudioPlayer(require('../../../assets/sounds/reel-stop.wav'));
  const winSound = useAudioPlayer(require('../../../assets/sounds/win-chime.wav'));
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pull, setPull] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [ready, setReady] = useState(false);
  const [leverPosition, setLeverPosition] = useState({ x: 0, y: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mounted, setMounted] = useState(false);
  const audioEnabled = useRef(soundEnabled);
  const componentActive = useRef(true);
  const pulling = useRef(false);
  const leverReturn = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  audioEnabled.current = soundEnabled;
  useEffect(() => {
    componentActive.current = true;
    setMounted(true);
    void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { componentActive.current = false; clearTimeout(leverReturn.current); subscription.remove(); };
  }, []);
  useEffect(() => {
    for (const [player, volume] of [[leverSound, .32], [creakSound, .45], [stopSound, .5], [winSound, .55]] as const) {
      player.volume = soundEnabled ? volume : 0;
      if (!soundEnabled) player.pause();
    }
  }, [soundEnabled, leverSound, creakSound, stopSound, winSound]);
  const rolling = !reduceMotion && (state.status === 'spinning' || state.status === 'settling');
  useEffect(() => {
    spinSound.loop = true;
    if (rolling && soundEnabled) spinSound.play();
    else spinSound.pause();
  }, [rolling, soundEnabled, spinSound]);
  useEffect(() => {
    updateSpinSound(spinSound, { soundEnabled, stoppedReels: state.stoppedReels.length, status: state.status });
  }, [soundEnabled, state.status, state.stoppedReels.length, spinSound]);
  useEffect(() => {
    if (state.stoppedReels.length !== 3 || state.error) { setCelebrating(false); return; }
    setCelebrating(true);
    const timer = setTimeout(() => setCelebrating(false), 4500);
    return () => clearTimeout(timer);
  }, [state.stoppedReels, state.error]);
  const busy = ['spinning', 'settling', 'generating'].includes(state.status);
  const selected = state.stoppedReels.length === 3;
  const combination = combinationFromIndexes(state.reelIndexes, state.reelFaces);
  const playEffect = useCallback((player: AudioPlayer) => {
    if (!soundEnabled) return;
    playSoundWhenReady(player, () => componentActive.current && audioEnabled.current);
  }, [soundEnabled]);
  const onReelStopped = useCallback((name: ReelName, index: number, spinId: number) => {
    const before = store.getState().stoppedReels.length;
    store.getState().reelStopped(name, index, spinId);
    const after = store.getState();
    if (after.stoppedReels.length > before) {
      playEffect(stopSound);
      if (after.status === 'success') playEffect(winSound);
    }
  }, [store, playEffect, stopSound, winSound]);
  const onPull = useCallback((progress: number) => {
    clearTimeout(leverReturn.current);
    if (progress > 0 && !pulling.current) playEffect(creakSound);
    pulling.current = progress > 0;
    setPull(progress);
  }, [playEffect, creakSound]);
  const activate = useCallback(() => {
    if (!ready) return;
    if (!creakSound.playing) playEffect(creakSound);
    playEffect(leverSound);
    clearTimeout(leverReturn.current);
    setPull(1);
    leverReturn.current = setTimeout(() => setPull(0), reduceMotion ? 0 : 180);
    state.spin(); // The store ignores new spins while a generation is active.
  }, [ready, reduceMotion, state.spin, playEffect, leverSound, creakSound]);
  const status = !ready ? 'Loading the machine…' : state.status === 'spinning' ? 'Turning chance into an idea…' : state.status === 'generating' || state.status === 'settling' ? 'Turning chance into an idea…' : state.status === 'error' ? 'Your combination is saved.' : state.status === 'success' ? 'A fresh idea, just for this combination.' : 'Ready when you are.';
  useEffect(() => { if (Platform.OS !== 'web' && ready) AccessibilityInfo.announceForAccessibility(status); }, [status, ready]);
  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={[s.page, compact && s.pageCompact]}>
      <View style={s.header}>
        <Text style={s.wordmark}>Lucky Idea<Text style={s.wordmarkDot}>.</Text></Text>
        <Text style={s.headerNote}>A small spark for your next big thing.</Text>
      </View>
      <View style={[s.intro, compact && { marginTop: 24 }]}>
        <Text accessibilityRole="header" style={[s.title, compact && s.titleCompact]}>Good ideas start{compact ? '\n' : ' '}with a little chance.</Text>
        <Text style={s.subtitle}>Three reels. One unexpected combination. Pull the lever and see what you could make.</Text>
      </View>
      <View style={[s.main, compact && s.mainCompact]} testID="slot-machine">
        <View style={[s.stage, compact && s.stageCompact]}>
          <View testID="machine-canvas" style={[s.canvas, compact && s.canvasCompact, { height: receiptWidth * 1.65 }]}>
            {mounted && <SceneBoundary><CanvasHost machineWidth={receiptWidth} indexes={state.reelIndexes} faces={state.reelFaces} spinId={state.spinId} celebrating={celebrating} spinning={state.status === 'spinning' || state.status === 'settling'} waiting={state.status === 'spinning'} pull={pull} reducedMotion={reduceMotion} duration={test?.duration} onStopped={onReelStopped} onReady={() => setReady(true)} onLeverPosition={setLeverPosition} /></SceneBoundary>}
            <LeverControl position={leverPosition} disabled={!ready} onPull={onPull} onActivate={activate} />
          </View>
          <View style={s.srOnly} accessibilityLiveRegion="none">
            {reelNames.map(name => <Text key={name} testID={`${name}-reel`}>{state.stoppedReels.includes(name) || !['spinning', 'settling'].includes(state.status) ? combination[name] : 'Spinning'}</Text>)}
            <Text testID="celebration-state">{celebrating ? reduceMotion ? 'steady' : 'flashing' : 'off'}</Text><Text testID="machine-state">{state.status}</Text><Text testID="spin-id">{state.spinId}</Text>
          </View>
        </View>
        <View testID="idea-receipt" onLayout={event => setReceiptWidth(event.nativeEvent.layout.width)} style={[s.receipt, compact && s.receiptCompact, compact && { transform: [{ translateX: -receiptWidth * .43 / 5.588 }] }]}>
          <View style={s.receiptTop}><Text style={s.receiptTitle}>Your next possibility</Text><View style={s.receiptSeal}><Text style={s.sealText}>IDEA</Text></View></View>
          <Text style={s.receiptLead}>{selected ? 'A combination you might never have put together.' : 'Something worth making is waiting in the reels.'}</Text>
          <View style={s.selection}>
            {reelNames.map((name, i) => <View key={name} style={s.selectionRow}><Text style={s.selectionLabel}>{name.toUpperCase()}</Text><Text testID={`selected-${name}`} style={[s.selectionValue, !selected && s.placeholder]}>{selected ? combination[name] : ['A field to explore', 'A fresh perspective', 'Someone to build for'][i]}</Text></View>)}
          </View>
          <View style={s.ideaBody} accessibilityLiveRegion="polite">
            {busy ? <View style={s.loading}><ActivityIndicator color="#85262f" /><Text style={s.receiptBody}>Connecting the dots…</Text></View> : state.status === 'error' ? <><Text accessibilityRole="alert" style={s.error}>{state.error}</Text><Pressable accessibilityRole="button" testID="retry-button" onPress={() => void state.retry()} style={s.retry}><Text style={s.retryText}>Retry this combination</Text></Pressable></> : state.idea ? <>{state.researchStatus === 'unavailable' && <Text testID="research-warning" accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.researchWarning}>Market research unavailable; this idea was not checked.</Text>}<Text testID="generated-idea" style={s.idea}>{state.idea}</Text></> : <><Text style={s.emptyTitle}>What if…</Text><Text style={s.receiptBody}>A familiar problem met an unfamiliar solution? Your first spin is a good place to find out.</Text></>}
          </View>
          <View style={s.receiptFoot}><Text style={s.receiptFootText}>A starting point. Make it your own.</Text></View>
        </View>
      </View>
      <View testID="machine-controls" style={s.action}>
        <View style={s.actionRow}>
          <Pressable testID="spin-button" accessibilityRole="button" accessibilityLabel={state.status === 'success' || state.status === 'error' ? 'Spin for another idea' : 'Spin for an idea'} accessibilityState={{ disabled: !ready || busy }} disabled={!ready || busy} onPress={activate} style={({ pressed }) => [s.spinButton, pressed && { opacity: 0.8 }, (!ready || busy) && s.disabled]}>
            <Text style={s.spinText}>{busy ? 'Generating…' : state.status === 'success' || state.status === 'error' ? 'Spin again' : 'Give it a spin'}</Text>
          </Pressable>
          <Pressable testID="sound-toggle" accessibilityRole="button" accessibilityLabel={`Turn sound ${soundEnabled ? 'off' : 'on'}`} accessibilityState={{ checked: soundEnabled }} onPress={() => setSoundEnabled(enabled => !enabled)} style={s.soundToggle}>
            <Text style={s.soundText}>Sound {soundEnabled ? 'on' : 'off'}</Text>
          </Pressable>
        </View>
        <Text testID="generation-status" role="status" accessibilityLiveRegion="polite" style={s.status}>{status}</Text>
      </View>
      <View style={s.footer}><Text style={s.footerText}>{categories.domain.length} domains × {categories.approach.length} approaches × {categories.niche.length} niches</Text><Text style={s.footerText}>{(categories.domain.length * categories.approach.length * categories.niche.length).toLocaleString('en-US')} ways to get started.</Text></View>
    </ScrollView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#102c28' },
  page: { paddingHorizontal: 56, paddingTop: 26, paddingBottom: 28, maxWidth: 1500, width: '100%', alignSelf: 'center' }, pageCompact: { paddingHorizontal: 20, paddingTop: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 20 }, wordmark: { flexShrink: 0, fontFamily: 'DMSerif', fontSize: 27, color: '#f1e5c9' }, wordmarkDot: { color: '#edb45b' }, headerNote: { maxWidth: 220, color: '#bac9bc', fontSize: 12, flexShrink: 1, textAlign: 'right' },
  intro: { marginTop: 42, alignItems: 'center' }, title: { fontFamily: 'DMSerif', fontSize: 48, lineHeight: 57, color: '#f4ead2', textAlign: 'center' }, titleCompact: { fontSize: 35, lineHeight: 41 }, subtitle: { fontSize: 15, color: '#b7c8bc', marginTop: 13, lineHeight: 23, textAlign: 'center', maxWidth: 560 },
  main: { flexDirection: 'row', alignItems: 'flex-start', gap: 44, width: '100%', maxWidth: 1130, alignSelf: 'center', marginTop: 15 }, mainCompact: { flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 4 }, stage: { flex: 1.5, minWidth: 0, alignItems: 'center' }, stageCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%' },
  canvas: { width: '100%', height: 710 }, canvasCompact: { maxWidth: 500 }, action: { alignItems: 'center', marginTop: 16, gap: 8 }, actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, spinButton: { backgroundColor: '#efd18d', minHeight: 48, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 }, spinText: { color: '#263228', fontWeight: '700', fontSize: 15 }, soundToggle: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 10 }, soundText: { color: '#d7e1d0', fontSize: 12 }, disabled: { opacity: 0.5 }, status: { color: '#d7e1d0', fontSize: 12, textAlign: 'center', minHeight: 20 },
  receipt: { flex: 1, backgroundColor: '#f3ead5', paddingHorizontal: 28, paddingTop: 25, minHeight: 435, maxWidth: 430, borderRadius: 3, transform: [{ rotate: '1deg' }] }, receiptCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '84%', transform: [{ rotate: '0deg' }], minHeight: 405 }, receiptTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, receiptTitle: { fontFamily: 'DMSerif', color: '#293c32', fontSize: 24, flex: 1 }, receiptSeal: { borderWidth: 1, borderColor: '#9a6b4d', borderRadius: 24, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-12deg' }] }, sealText: { color: '#8c3b36', fontSize: 10, fontWeight: '700', letterSpacing: 1 }, receiptLead: { color: '#655e4d', fontSize: 13, lineHeight: 20, marginTop: 13, maxWidth: 300 },
  selection: { marginTop: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#c9bfa8', paddingVertical: 15, gap: 15 }, selectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, selectionLabel: { color: '#6d644f', fontSize: 10, fontWeight: '600', letterSpacing: 1, width: 77 }, selectionValue: { color: '#293c32', fontSize: 14, fontWeight: '600', flex: 1 }, placeholder: { color: '#716954', fontWeight: '400' },
  ideaBody: { paddingVertical: 24, flexGrow: 1 }, emptyTitle: { fontFamily: 'DMSerif', color: '#6f6652', fontSize: 31, marginBottom: 7 }, receiptBody: { color: '#6b624f', fontSize: 14, lineHeight: 23 }, idea: { color: '#293c32', fontSize: 17, lineHeight: 27 }, researchWarning: { color: '#8c4a24', fontSize: 12, lineHeight: 18, marginBottom: 8 }, loading: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18 }, error: { color: '#942834', fontSize: 14, lineHeight: 22 }, retry: { marginTop: 16, paddingVertical: 12, minHeight: 48 }, retryText: { color: '#792631', textDecorationLine: 'underline', fontWeight: '700' }, receiptFoot: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#c9bfa8', paddingVertical: 17 }, receiptFootText: { color: '#716752', fontSize: 11 },
  footer: { marginTop: 38, paddingTop: 21, borderTopWidth: 1, borderColor: '#355047', flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }, footerText: { color: '#a6baac', fontSize: 11 }, srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 }, sceneError: { color: '#ffe0c2', padding: 30, lineHeight: 24 },
});
