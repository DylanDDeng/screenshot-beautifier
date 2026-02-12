// 背景类型
export type BackgroundType = 'solid' | 'linear_gradient' | 'radial_gradient' | 'image';

// 渐变颜色点
export interface GradientStop {
  color: [number, number, number, number];  // RGBA (0-255)
  position: number;  // 0-1
}

// 渐变方向角度
export type GradientAngle = 45 | 90 | 135 | 180;

// 纯色背景
export interface SolidBackground {
  type: 'solid';
  color: [number, number, number, number];
}

// 线性渐变背景
export interface LinearGradientBackground {
  type: 'linear_gradient';
  angle: GradientAngle;
  stops: GradientStop[];
}

// 径向渐变背景
export interface RadialGradientBackground {
  type: 'radial_gradient';
  stops: GradientStop[];
}

// 图片背景
export interface ImageBackground {
  type: 'image';
  base64: string;
  blur: number;  // 0-20
  scale: 'fill' | 'fit' | 'cover';
}

// 背景联合类型
export type Background = 
  | SolidBackground 
  | LinearGradientBackground 
  | RadialGradientBackground 
  | ImageBackground;

// 背景预设
export interface BackgroundPreset {
  name: string;
  background: Background;
  thumbnail?: string;
}

// 预设颜色（用于纯色）
export const SOLID_COLOR_PRESETS: [number, number, number, number][] = [
  // 中性色系
  [255, 255, 255, 255],  // 纯白
  [248, 250, 252, 255],  // 雪白
  [241, 245, 249, 255],  // 浅银
  [226, 232, 240, 255],  // 银灰
  [30, 41, 59, 255],     // 深蓝灰
  [15, 23, 42, 255],     // 近黑
  // 暖色系
  [254, 243, 199, 255],  // 奶油黄
  [254, 215, 170, 255],  // 杏色
  [254, 202, 202, 255],  // 浅粉
  [251, 207, 232, 255],  // 樱花粉
  [255, 228, 230, 255],  // 玫瑰
  [254, 226, 226, 255],  // 淡红
  // 冷色系
  [219, 234, 254, 255],  // 天空蓝
  [191, 219, 254, 255],  // 浅蓝
  [224, 231, 255, 255],  // 靛蓝
  [237, 233, 254, 255],  // 薰衣草
  [209, 250, 229, 255],  // 薄荷
  [207, 250, 254, 255],  // 青色
  // 品牌色
  [99, 102, 241, 255],   // Indigo
  [168, 85, 247, 255],   // Purple
  [236, 72, 153, 255],   // Pink
  [239, 68, 68, 255],    // Red
  [245, 158, 11, 255],   // Amber
  [34, 197, 94, 255],    // Green
  [6, 182, 212, 255],    // Cyan
];

// 辅助函数：创建渐变预设
function createLinearGradient(
  colors: [number, number, number, number][],
  angle: GradientAngle = 135
): LinearGradientBackground {
  const stops: GradientStop[] = colors.map((color, index) => ({
    color,
    position: index / (colors.length - 1),
  }));
  return { type: 'linear_gradient', angle, stops };
}

function createRadialGradient(
  colors: [number, number, number, number][]
): RadialGradientBackground {
  const stops: GradientStop[] = colors.map((color, index) => ({
    color,
    position: index / (colors.length - 1),
  }));
  return { type: 'radial_gradient', stops };
}

// 渐变预设
export const GRADIENT_PRESETS: BackgroundPreset[] = [
  // 柔和渐变
  {
    name: 'Sunset',
    background: createLinearGradient([
      [254, 180, 123, 255],
      [255, 126, 95, 255],
    ]),
  },
  {
    name: 'Dawn',
    background: createLinearGradient([
      [253, 235, 113, 255],
      [248, 216, 0, 255],
    ]),
  },
  {
    name: 'Ocean',
    background: createLinearGradient([
      [46, 49, 146, 255],
      [27, 255, 255, 255],
    ], 135),
  },
  {
    name: 'Forest',
    background: createLinearGradient([
      [17, 153, 142, 255],
      [56, 239, 125, 255],
    ]),
  },
  {
    name: 'Lavender',
    background: createLinearGradient([
      [196, 113, 245, 255],
      [250, 113, 205, 255],
    ]),
  },
  {
    name: 'Peach',
    background: createLinearGradient([
      [255, 183, 178, 255],
      [255, 218, 185, 255],
    ]),
  },
  // 鲜艳渐变
  {
    name: 'Fire',
    background: createLinearGradient([
      [248, 39, 17, 255],
      [245, 175, 25, 255],
    ], 45),
  },
  {
    name: 'Aurora',
    background: createLinearGradient([
      [0, 201, 255, 255],
      [146, 254, 157, 255],
    ]),
  },
  {
    name: 'Candy',
    background: createLinearGradient([
      [211, 149, 155, 255],
      [254, 254, 254, 255],
    ]),
  },
  {
    name: 'Neon',
    background: createLinearGradient([
      [248, 87, 166, 255],
      [255, 88, 88, 255],
    ], 45),
  },
  {
    name: 'Galaxy',
    background: createLinearGradient([
      [15, 12, 41, 255],
      [48, 43, 99, 255],
      [36, 36, 62, 255],
    ]),
  },
  {
    name: 'Cosmic',
    background: createLinearGradient([
      [102, 126, 234, 255],
      [118, 75, 162, 255],
    ]),
  },
  {
    name: 'Mint',
    background: createLinearGradient([
      [134, 239, 172, 255],
      [71, 200, 155, 255],
    ]),
  },
  {
    name: 'Sky',
    background: createLinearGradient([
      [135, 206, 250, 255],
      [255, 255, 255, 255],
    ], 180),
  },
  {
    name: 'Rose',
    background: createLinearGradient([
      [255, 228, 225, 255],
      [255, 105, 180, 255],
    ]),
  },
];

// 径向渐变预设
export const RADIAL_GRADIENT_PRESETS: BackgroundPreset[] = [
  {
    name: 'Spotlight',
    background: createRadialGradient([
      [255, 255, 255, 255],
      [200, 200, 200, 255],
    ]),
  },
  {
    name: 'Vignette',
    background: createRadialGradient([
      [255, 255, 255, 255],
      [50, 50, 50, 255],
    ]),
  },
  {
    name: 'Warm Glow',
    background: createRadialGradient([
      [255, 200, 150, 255],
      [100, 50, 20, 255],
    ]),
  },
  {
    name: 'Cool Glow',
    background: createRadialGradient([
      [150, 200, 255, 255],
      [20, 50, 100, 255],
    ]),
  },
];

// 默认背景
export const DEFAULT_BACKGROUND: Background = {
  type: 'solid',
  color: [245, 245, 245, 255],
};

// 工具函数
export function rgbaToCSS(rgba: [number, number, number, number]): string {
  return `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${rgba[3] / 255})`;
}

export function rgbaToHex(rgba: [number, number, number, number]): string {
  const r = rgba[0].toString(16).padStart(2, '0');
  const g = rgba[1].toString(16).padStart(2, '0');
  const b = rgba[2].toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function hexToRgba(hex: string, alpha: number = 255): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, alpha];
}

// 保存的自定义背景（存储在 localStorage）
export interface SavedBackground {
  id: string;
  name: string;
  background: Background;
  createdAt: number;
}

const SAVED_BACKGROUNDS_KEY = 'screenshot-beautifier-saved-backgrounds';

export function getSavedBackgrounds(): SavedBackground[] {
  try {
    const data = localStorage.getItem(SAVED_BACKGROUNDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveBackground(name: string, background: Background): SavedBackground {
  const saved: SavedBackground = {
    id: `saved-${Date.now()}`,
    name,
    background,
    createdAt: Date.now(),
  };
  
  const existing = getSavedBackgrounds();
  existing.push(saved);
  localStorage.setItem(SAVED_BACKGROUNDS_KEY, JSON.stringify(existing));
  
  return saved;
}

export function deleteSavedBackground(id: string): void {
  const existing = getSavedBackgrounds();
  const filtered = existing.filter(b => b.id !== id);
  localStorage.setItem(SAVED_BACKGROUNDS_KEY, JSON.stringify(filtered));
}
