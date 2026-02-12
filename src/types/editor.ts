import type { Background } from "./background";
import { DEFAULT_BACKGROUND } from "./background";

export interface BeautifyOptions {
  shadow_blur: number;
  shadow_offset_x: number;
  shadow_offset_y: number;
  shadow_color: [number, number, number, number];
  corner_radius_percent: number;
  background: Background;
  padding: number;
}

export interface BeautifyPreset {
  name: string;
  options: BeautifyOptions;
}

export const DEFAULT_BEAUTIFY_OPTIONS: BeautifyOptions = {
  shadow_blur: 20,
  shadow_offset_x: 0,
  shadow_offset_y: 10,
  shadow_color: [0, 0, 0, 80],
  corner_radius_percent: 3,
  background: DEFAULT_BACKGROUND,
  padding: 60,
};

// 辅助函数：创建纯色背景的 BeautifyOptions
function createSolidPreset(name: string, color: [number, number, number, number]): BeautifyPreset {
  return {
    name,
    options: {
      ...DEFAULT_BEAUTIFY_OPTIONS,
      background: { type: 'solid', color },
    },
  };
}

// 辅助函数：创建渐变背景的 BeautifyOptions
function createGradientPreset(name: string, background: Background): BeautifyPreset {
  return {
    name,
    options: {
      ...DEFAULT_BEAUTIFY_OPTIONS,
      background,
    },
  };
}

import { GRADIENT_PRESETS } from "./background";

export const BEAUTIFY_PRESETS: BeautifyPreset[] = [
  // 纯色预设
  createSolidPreset("Clean", [255, 255, 255, 255]),
  createSolidPreset("Gray", [245, 245, 245, 255]),
  createSolidPreset("Dark", [30, 30, 30, 255]),
  createSolidPreset("Indigo", [99, 102, 241, 255]),
  createSolidPreset("Purple", [168, 85, 247, 255]),
  createSolidPreset("Pink", [236, 72, 153, 255]),
  // 渐变预设
  ...GRADIENT_PRESETS.slice(0, 6).map(p => createGradientPreset(p.name, p.background)),
];

export type ExportFormat = "png" | "jpeg";

// 导出 background 相关类型和常量
export type { 
  Background, 
  BackgroundType, 
  GradientStop, 
  GradientAngle,
  SolidBackground,
  LinearGradientBackground,
  RadialGradientBackground,
  ImageBackground,
  BackgroundPreset,
  SavedBackground,
} from "./background";

export { 
  SOLID_COLOR_PRESETS, 
  GRADIENT_PRESETS, 
  RADIAL_GRADIENT_PRESETS,
  DEFAULT_BACKGROUND,
  rgbaToCSS,
  rgbaToHex,
  hexToRgba,
  getSavedBackgrounds,
  saveBackground,
  deleteSavedBackground,
} from "./background";
