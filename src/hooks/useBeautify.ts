import { useCallback } from "react";
import { useEditorStore } from "../stores/editorStore";
import type { BeautifyOptions } from "../types/editor";
import type { Annotation } from "../types/annotation";

interface RenderOptions {
  annotations?: Annotation[];
  beautifyOptions?: BeautifyOptions;
}

export function useRender() {
  const { originalImage } = useEditorStore();

  const renderImage = useCallback(
    async (_options?: RenderOptions) => {
      if (!originalImage) return null;
      return originalImage;
    },
    [originalImage]
  );

  return { renderImage };
}

export function useBeautify() {
  const { beautifyOptions } = useEditorStore();

  const applyBeautify = useCallback(
    async (options?: BeautifyOptions) => {
      console.log("applyBeautify called with:", options || beautifyOptions);
      return options || beautifyOptions;
    },
    [beautifyOptions]
  );

  return { applyBeautify };
}
