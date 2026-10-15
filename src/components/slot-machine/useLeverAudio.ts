import { useCallback, useEffect, useRef } from 'react';
import { useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { CREAK_SECONDS, creakRate, moveLever, releaseLever, restingLever, type LeverEvent } from './leverMotion';
import { playSoundWhenReady } from './spinSound';

const volumes = { creak: .45, ratchet: .3, soft: .26, firm: .32, slam: .5, spring: .38 };
type LeverSound = keyof typeof volumes;

// Drives every lever sound from the handle's position and speed, so a partial pull never plays the full throw.
export function useLeverAudio(soundEnabled: boolean, canPlay: () => boolean) {
  const players: Record<LeverSound, AudioPlayer> = {
    creak: useAudioPlayer(require('../../../assets/sounds/lever-creak.wav')),
    ratchet: useAudioPlayer(require('../../../assets/sounds/lever-ratchet.wav')),
    soft: useAudioPlayer(require('../../../assets/sounds/lever-thunk-soft.wav')),
    firm: useAudioPlayer(require('../../../assets/sounds/lever-pull.wav')),
    slam: useAudioPlayer(require('../../../assets/sounds/lever-slam.wav')),
    spring: useAudioPlayer(require('../../../assets/sounds/lever-spring.wav')),
  };
  const motion = useRef(restingLever());
  const creaking = useRef(false);
  const creakResume = useRef(0);
  const creakStop = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const thrownAt = useRef(0);
  useEffect(() => {
    for (const name of Object.keys(volumes) as LeverSound[]) {
      players[name].volume = soundEnabled ? volumes[name] : 0;
      if (!soundEnabled) players[name].pause();
    }
  }, [soundEnabled, ...Object.values(players)]);
  useEffect(() => () => clearTimeout(creakStop.current), []);

  const play = (name: LeverSound, loudness = 1, at = 0, rate = 1) => {
    if (!soundEnabled) return;
    const player = players[name];
    player.volume = volumes[name] * loudness;
    player.setPlaybackRate(rate);
    playSoundWhenReady(player, canPlay, at);
  };
  const stopCreak = () => {
    clearTimeout(creakStop.current);
    if (!creaking.current) return;
    creaking.current = false;
    players.creak.pause();
  };
  const handle = (events: LeverEvent[]) => {
    for (const event of events) {
      if (event.type === 'ratchet') play('ratchet', Math.min(1, .5 + event.speed / 8), 0, Math.min(1.4, .85 + event.speed / 20));
      else if (event.type === 'spring') { stopCreak(); play('spring', .4 + .6 * event.strength); }
      else { stopCreak(); play(event.strike); }
    }
  };

  const pull = useCallback((progress: number) => {
    const now = Date.now();
    const previous = motion.current;
    if (progress <= 0) {
      const events = releaseLever(previous);
      if (previous.bottomed || events.some(event => event.type === 'snap')) thrownAt.current = now;
      motion.current = restingLever(now);
      creakResume.current = 0;
      stopCreak();
      handle(events);
      return;
    }
    const next = moveLever(previous, progress, now);
    motion.current = next.motion;
    const target = Math.min(progress, .95) * CREAK_SECONDS;
    // The creak may lag the handle but never runs ahead of it.
    if (creaking.current && players.creak.currentTime > target + .1) { creakResume.current = players.creak.currentTime; stopCreak(); }
    if (progress > previous.progress && !next.motion.bottomed) {
      if (!creaking.current && soundEnabled && target >= creakResume.current) {
        creaking.current = true;
        play('creak', Math.min(1, .55 + next.motion.speed / 8), target, creakRate(next.motion.speed));
      } else if (creaking.current) players.creak.setPlaybackRate(creakRate(next.motion.speed));
      clearTimeout(creakStop.current);
      creakStop.current = setTimeout(stopCreak, 90);
    } else stopCreak();
    handle(next.events);
  }, [soundEnabled, canPlay, ...Object.values(players)]);

  // A tap, key press or the spin button throws the lever in one go; a drag already made its own sounds.
  const throwLever = useCallback(() => {
    if (Date.now() - thrownAt.current < 250) return;
    stopCreak();
    play('creak');
    play('firm');
  }, [soundEnabled, canPlay, ...Object.values(players)]);

  return { pull, throwLever };
}
