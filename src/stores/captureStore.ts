import { create } from "zustand";
import type { CaptureMode, Region } from "../types/capture";

interface CaptureState {
  mode: CaptureMode;
  isCapturing: boolean;
  selectedRegion: Region | null;
  capturedImage: string | null; // base64 PNG

  setMode: (mode: CaptureMode) => void;
  setIsCapturing: (isCapturing: boolean) => void;
  setSelectedRegion: (region: Region | null) => void;
  setCapturedImage: (image: string | null) => void;
  reset: () => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
  mode: "region",
  isCapturing: false,
  selectedRegion: null,
  capturedImage: null,

  setMode: (mode) => set({ mode }),
  setIsCapturing: (isCapturing) => set({ isCapturing }),
  setSelectedRegion: (region) => set({ selectedRegion: region }),
  setCapturedImage: (image) => set({ capturedImage: image }),
  reset: () =>
    set({
      isCapturing: false,
      selectedRegion: null,
      capturedImage: null,
    }),
}));
