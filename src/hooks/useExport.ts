import { useCallback } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { useEditorStore } from "../stores/editorStore";
import * as commands from "../lib/tauri-commands";

export function useExport() {
  const { exportFormat, jpegQuality, beautifyOptions } = useEditorStore();

  const getExportImage = useCallback(async () => {
    const { originalImage } = useEditorStore.getState();
    if (!originalImage) return null;

    try {
      const result = await commands.beautifyImage(originalImage, beautifyOptions);
      return result;
    } catch (err) {
      console.error("Export render failed:", err);
      return originalImage;
    }
  }, [beautifyOptions]);

  const saveToFile = useCallback(async () => {
    const image = await getExportImage();
    if (!image) return;

    const filters =
      exportFormat === "png"
        ? [{ name: "PNG Image", extensions: ["png"] }]
        : [{ name: "JPEG Image", extensions: ["jpg", "jpeg"] }];

    const path = await save({
      filters,
      defaultPath: `screenshot.${exportFormat === "jpeg" ? "jpg" : "png"}`,
    });

    if (!path) return;

    await commands.saveImage(
      image,
      path,
      exportFormat,
      exportFormat === "jpeg" ? jpegQuality : undefined
    );
  }, [getExportImage, exportFormat, jpegQuality]);

  const copyToClipboard = useCallback(async () => {
    const image = await getExportImage();
    if (!image) return;
    await commands.copyImageToClipboard(image);
  }, [getExportImage]);

  return { saveToFile, copyToClipboard, getExportImage };
}
