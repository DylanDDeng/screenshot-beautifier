import { useCallback } from "react";
import { useCaptureStore } from "../stores/captureStore";
import { useEditorStore } from "../stores/editorStore";
import * as commands from "../lib/tauri-commands";
import type { Region } from "../types/capture";

export function useCapture() {
  const { setIsCapturing, setCapturedImage } = useCaptureStore();
  const { setOriginalImage } = useEditorStore();

  const captureFullscreen = useCallback(async () => {
    try {
      setIsCapturing(true);
      const base64 = await commands.captureFullscreen();
      setCapturedImage(base64);
      return base64;
    } catch (err) {
      console.error("Fullscreen capture failed:", err);
      throw err;
    } finally {
      setIsCapturing(false);
    }
  }, [setIsCapturing, setCapturedImage]);

  const cropCapturedImage = useCallback(
    async (region: Region) => {
      const { capturedImage } = useCaptureStore.getState();
      if (!capturedImage) throw new Error("No captured image to crop");

      const cropped = await commands.cropImage(
        capturedImage,
        region.x,
        region.y,
        region.width,
        region.height
      );
      setOriginalImage(cropped);
      return cropped;
    },
    [setOriginalImage]
  );

  const captureWindow = useCallback(
    async (windowId: number) => {
      try {
        setIsCapturing(true);
        const base64 = await commands.captureWindow(windowId);
        setCapturedImage(base64);
        setOriginalImage(base64);
        return base64;
      } catch (err) {
        console.error("Window capture failed:", err);
        throw err;
      } finally {
        setIsCapturing(false);
      }
    },
    [setIsCapturing, setCapturedImage, setOriginalImage]
  );

  const checkPermissions = useCallback(async () => {
    return commands.checkPermissions();
  }, []);

  return {
    captureFullscreen,
    cropCapturedImage,
    captureWindow,
    checkPermissions,
  };
}
