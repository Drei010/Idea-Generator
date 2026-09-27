import { createStore } from 'zustand/vanilla';
import type { GeneratedIdea, ResearchStatus } from '../domain/idea';
import { combinationFromIndexes, firstReelFaces, randomCategoryIndexes, randomIndexes, reelFacesForSelection, type Combination, type ReelFaces, type ReelIndexes, type ReelName } from '../domain/categories';
export type Status = 'idle' | 'spinning' | 'settling' | 'generating' | 'success' | 'error';
export type MachineState = {
  status: Status;
  reelIndexes: ReelIndexes;
  reelFaces: ReelFaces;
  stoppedReels: ReelName[];
  spinId: number;
  idea: string | null;
  researchStatus: ResearchStatus | null;
  error: string | null;
  spin: () => void;
  reelStopped: (name: ReelName, index: number, spinId: number) => void;
  retry: () => Promise<void>;
};
export function createSlotMachineStore(generateIdea: (combination: Combination) => Promise<GeneratedIdea>, pick = randomIndexes, pickCategories = randomCategoryIndexes) {
  return createStore<MachineState>((set, get) => {
    async function requestIdea(retry = false) {
      const combination = combinationFromIndexes(get().reelIndexes, get().reelFaces);
      try { set({ ...await generateIdea(combination), error: null, status: retry ? 'success' : 'settling' }); }
      catch (error) { set({ status: retry ? 'error' : 'settling', error: error instanceof Error ? error.message : 'Generation failed. Please retry.' }); }
    }
    return {
      status: 'idle', reelIndexes: { domain: 0, approach: 0, niche: 0 }, reelFaces: firstReelFaces, stoppedReels: [], spinId: 0, idea: null, researchStatus: null, error: null,
      spin() {
        if (!['idle', 'success', 'error'].includes(get().status)) return;
        const indexes = pick();
        const reelFaces = reelFacesForSelection(indexes, pickCategories());
        combinationFromIndexes(indexes, reelFaces);
        set({ status: 'spinning', reelIndexes: indexes, reelFaces, stoppedReels: [], spinId: get().spinId + 1, idea: null, researchStatus: null, error: null });
        void requestIdea();
      },
      reelStopped(name, index, spinId) {
        const state = get();
        if (state.status !== 'settling' || spinId !== state.spinId || index !== state.reelIndexes[name] || state.stoppedReels.includes(name)) return;
        const stoppedReels = [...state.stoppedReels, name];
        set({ stoppedReels, status: stoppedReels.length === 3 ? state.error !== null ? 'error' : 'success' : 'settling' });
      },
      async retry() {
        if (get().status !== 'error') return;
        set({ status: 'generating', error: null });
        await requestIdea(true);
      },
    };
  });
}
