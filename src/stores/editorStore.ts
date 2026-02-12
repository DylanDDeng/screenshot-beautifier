import { create } from "zustand";
import type { Annotation, AnnotationTool } from "../types/annotation";
import {
  type BeautifyOptions,
  type ExportFormat,
  DEFAULT_BEAUTIFY_OPTIONS,
} from "../types/editor";

interface EditorState {
  // 图片
  originalImage: string | null;

  // 标注
  annotations: Annotation[];
  selectedAnnotationId: string | null;

  // 工具
  activeTool: AnnotationTool | null;
  activeColor: string;
  activeStrokeWidth: number;

  // 美化参数
  beautifyOptions: BeautifyOptions;

  // 导出
  exportFormat: ExportFormat;
  jpegQuality: number;

  // UI 状态
  isDrawing: boolean;

  // Actions - 图片
  setOriginalImage: (image: string | null) => void;

  // Actions - 标注
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  selectAnnotation: (id: string | null) => void;
  setAnnotations: (annotations: Annotation[]) => void;

  // Actions - 工具
  setActiveTool: (tool: AnnotationTool | null) => void;
  setActiveColor: (color: string) => void;
  setActiveStrokeWidth: (width: number) => void;

  // Actions - 美化
  setBeautifyOptions: (options: Partial<BeautifyOptions>) => void;
  resetBeautifyOptions: () => void;
  applyPreset: (options: BeautifyOptions) => void;

  // Actions - 导出
  setExportFormat: (format: ExportFormat) => void;
  setJpegQuality: (quality: number) => void;

  // Actions - UI
  setIsDrawing: (isDrawing: boolean) => void;

  // Actions - 重置
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  originalImage: null,
  annotations: [],
  selectedAnnotationId: null,
  activeTool: null,
  activeColor: "#ff0000",
  activeStrokeWidth: 3,
  beautifyOptions: { ...DEFAULT_BEAUTIFY_OPTIONS },
  exportFormat: "png",
  jpegQuality: 90,
  isDrawing: false,

  setOriginalImage: (image) =>
    set({
      originalImage: image,
      annotations: [],
      selectedAnnotationId: null,
    }),

  addAnnotation: (annotation) =>
    set((state) => ({
      annotations: [...state.annotations, annotation],
    })),

  updateAnnotation: (id, updates) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === id ? ({ ...a, ...updates } as Annotation) : a
      ),
    })),

  removeAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      selectedAnnotationId:
        state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    })),

  clearAnnotations: () => set({ annotations: [], selectedAnnotationId: null }),

  selectAnnotation: (id) => set({ selectedAnnotationId: id }),

  setAnnotations: (annotations) => set({ annotations }),

  setActiveTool: (tool) => set({ activeTool: tool, selectedAnnotationId: null }),

  setActiveColor: (color) => set({ activeColor: color }),

  setActiveStrokeWidth: (width) => set({ activeStrokeWidth: width }),

  setBeautifyOptions: (options) =>
    set((state) => ({
      beautifyOptions: { ...state.beautifyOptions, ...options },
    })),

  resetBeautifyOptions: () =>
    set({ beautifyOptions: { ...DEFAULT_BEAUTIFY_OPTIONS } }),

  applyPreset: (options) => set({ beautifyOptions: { ...options } }),

  setExportFormat: (format) => set({ exportFormat: format }),

  setJpegQuality: (quality) => set({ jpegQuality: quality }),

  setIsDrawing: (isDrawing) => set({ isDrawing }),

  reset: () =>
    set({
      originalImage: null,
      annotations: [],
      selectedAnnotationId: null,
      activeTool: null,
      beautifyOptions: { ...DEFAULT_BEAUTIFY_OPTIONS },
    }),
}));
