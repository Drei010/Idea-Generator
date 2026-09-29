import { describe, expect, it, vi } from 'vitest';
import type { AudioPlayer } from 'expo-audio';
import { playSoundWhenReady, updateSpinSound } from '../../src/components/slot-machine/spinSound';

function mockPlayer() {
  let playbackRate = 0;
  const player = {
    loop: false,
    volume: 0,
    play: vi.fn(),
    pause: vi.fn(),
    seekTo: vi.fn(() => Promise.resolve()),
    setPlaybackRate: vi.fn((rate: number) => { playbackRate = rate; }),
  } as unknown as Pick<AudioPlayer, 'loop' | 'pause' | 'play' | 'seekTo' | 'setPlaybackRate' | 'volume'>;
  Object.defineProperty(player, 'playbackRate', { get: () => playbackRate });
  return { player, playbackRate: () => playbackRate };
}

describe('spin audio', () => {
  it('uses the native rate method through spin and settle, then resets for the next spin', () => {
    const { player, playbackRate } = mockPlayer();
    const update = (status: string, stoppedReels: number) => updateSpinSound(player, {
      soundEnabled: true, status, stoppedReels,
    });

    expect(() => update('spinning', 0)).not.toThrow();
    expect(playbackRate()).toBe(1);
    update('settling', 0);
    expect(playbackRate()).toBe(.8);
    update('settling', 1);
    expect(playbackRate()).toBe(.65);
    update('success', 3);
    update('spinning', 0);
    expect(playbackRate()).toBe(1);
    expect(player.setPlaybackRate).toHaveBeenCalledTimes(5);
    expect(player.play).not.toHaveBeenCalled();
    expect(player.pause).not.toHaveBeenCalled();
  });

  it('does not play a pending sound after the component becomes inactive', async () => {
    const { player } = mockPlayer();
    let resolveSeek!: () => void;
    player.seekTo = vi.fn(() => new Promise<void>(resolve => { resolveSeek = resolve; }));
    let active = true;

    playSoundWhenReady(player, () => active);
    active = false;
    resolveSeek();
    await Promise.resolve();

    expect(player.play).not.toHaveBeenCalled();
  });
});
