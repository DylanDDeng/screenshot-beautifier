interface ColorPickerProps {
  label: string;
  color: [number, number, number, number];
  onChange: (color: [number, number, number, number]) => void;
  presets?: string[];
}

const DEFAULT_PRESETS = [
  "#ffffff",
  "#f8f9fa",
  "#e9ecef",
  "#1e1e1e",
  "#000000",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#06b6d4",
];

function rgbaToHex(rgba: [number, number, number, number]): string {
  const r = rgba[0].toString(16).padStart(2, "0");
  const g = rgba[1].toString(16).padStart(2, "0");
  const b = rgba[2].toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function hexToRgba(
  hex: string,
  alpha: number
): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, alpha];
}

export function ColorPicker({
  label,
  color,
  onChange,
  presets = DEFAULT_PRESETS,
}: ColorPickerProps) {
  const hex = rgbaToHex(color);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-gray-600">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={hex}
            onChange={(e) => onChange(hexToRgba(e.target.value, color[3]))}
            className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => onChange(hexToRgba(preset, color[3]))}
              className="w-5 h-5 rounded-sm border border-gray-200 cursor-pointer hover:scale-110 transition-transform"
              style={{ backgroundColor: preset }}
              title={preset}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
