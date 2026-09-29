import type { AudioPlayer } from 'expo-audio';

type SpinSound = Pick<AudioPlayer, 'setPlaybackRate' | 'volume'>;

export function updateSpinSound(
  player: SpinSound,
  { soundEnabled, stoppedReels, status }: { soundEnabled: boolean; stoppedReels: number; status: string },
) {
  player.volume = soundEnabled ? .4 * (3 - stoppedReels) / 3 : 0;
  player.setPlaybackRate(status === 'settling' ? .8 - stoppedReels * .15 : 1);
}

export function playSoundWhenReady(player: Pick<AudioPlayer, 'play' | 'seekTo'>, canPlay: () => boolean) {
  try {
    void player.seekTo(0).then(() => { if (canPlay()) player.play(); }).catch(() => {});
  } catch { /* Audio can be unavailable while the app is backgrounded. */ }
}
