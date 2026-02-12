import { create } from "zustand";
import type { BeautifyOptions } from "../types/editor";
import type { Annotation } from "../types/annotation";

interface EditorSnapshot {
  beautifyOptions: BeautifyOptions;
  annotations: Annotation[];
}

interface HistoryState {
  past: EditorSnapshot[];
  future: EditorSnapshot[];

  pushState: (snapshot: EditorSnapshot) => void;
  undo: () => EditorSnapshot | null;
  redo: () => EditorSnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

const MAX_HISTORY = 50;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],

  pushState: (snapshot) =>
    set((state) => ({
      past: [...state.past.slice(-MAX_HISTORY + 1), snapshot],
      future: [],
    })),

  undo: () => {
    const state = get();
    if (state.past.length === 0) return null;
    const previous = state.past[state.past.length - 1];
    set({
      past: state.past.slice(0, -1),
      future: [previous, ...state.future],
    });
    // Return the popped snapshot (the state before the most recent change)
    return previous;
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0) return null;
    const next = state.future[0];
    set({
      past: [...state.past, next],
      future: state.future.slice(1),
    });
    return next;
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  clear: () => set({ past: [], future: [] }),
}));
