import { useCallback } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { useHistoryStore } from "../../stores/historyStore";
import { BEAUTIFY_PRESETS, rgbaToCSS } from "../../types/editor";
import type { BeautifyOptions, Background } from "../../types/editor";
import { Slider } from "../common/Slider";
import { BackgroundPicker } from "../common/BackgroundPicker";

function isPresetActive(current: BeautifyOptions, preset: BeautifyOptions): boolean {
  return (
    current.padding === preset.padding &&
    current.corner_radius_percent === preset.corner_radius_percent &&
    current.shadow_blur === preset.shadow_blur &&
    current.shadow_offset_x === preset.shadow_offset_x &&
    current.shadow_offset_y === preset.shadow_offset_y &&
    current.shadow_color[0] === preset.shadow_color[0] &&
    current.shadow_color[1] === preset.shadow_color[1] &&
    current.shadow_color[2] === preset.shadow_color[2] &&
    current.shadow_color[3] === preset.shadow_color[3] &&
    JSON.stringify(current.background) === JSON.stringify(preset.background)
  );
}

function getBackgroundThumbnail(options: BeautifyOptions): string {
  const bg = options.background;
  switch (bg.type) {
    case 'solid':
      return rgbaToCSS(bg.color);
    case 'linear_gradient':
      const stops = bg.stops.map(s => `${rgbaToCSS(s.color)} ${s.position * 100}%`).join(', ');
      return `linear-gradient(${bg.angle}deg, ${stops})`;
    case 'radial_gradient':
      const rStops = bg.stops.map(s => `${rgbaToCSS(s.color)} ${s.position * 100}%`).join(', ');
      return `radial-gradient(circle, ${rStops})`;
    case 'image':
      return `url(${bg.base64})`;
    default:
      return '#f5f5f5';
  }
}

export function BeautifyPanel() {
  const { beautifyOptions, annotations, setBeautifyOptions, applyPreset } = useEditorStore();
  const pushState = useHistoryStore((s) => s.pushState);

  const updateWithHistory = useCallback(
    (opts: Partial<BeautifyOptions>) => {
      pushState({ beautifyOptions, annotations });
      setBeautifyOptions(opts);
    },
    [beautifyOptions, annotations, pushState, setBeautifyOptions]
  );

  const applyPresetWithHistory = useCallback(
    (opts: BeautifyOptions) => {
      pushState({ beautifyOptions, annotations });
      applyPreset(opts);
    },
    [beautifyOptions, annotations, pushState, applyPreset]
  );

  const handleBackgroundChange = useCallback(
    (background: Background) => {
      updateWithHistory({ background });
    },
    [updateWithHistory]
  );

  return (
    <div className="flex flex-col gap-4 p-4 w-64 bg-white border-l border-gray-200 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-800">Beautify</h3>

      {/* Presets */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-gray-600">Presets</label>
        <div className="grid grid-cols-3 gap-1.5">
          {BEAUTIFY_PRESETS.map((preset) => {
            const active = isPresetActive(beautifyOptions, preset.options);
            return (
              <button
                key={preset.name}
                onClick={() => applyPresetWithHistory(preset.options)}
                className={`px-2 py-1.5 text-xs rounded border transition-colors truncate ${
                  active
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                }`}
                title={preset.name}
              >
                <div
                  className="w-full h-4 rounded-sm mb-1"
                  style={{ background: getBackgroundThumbnail(preset.options) }}
                />
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Background */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-gray-600">Background</label>
        <BackgroundPicker
          value={beautifyOptions.background}
          onChange={handleBackgroundChange}
        />
      </div>

      {/* Padding */}
      <Slider
        label="Padding"
        value={beautifyOptions.padding}
        min={0}
        max={120}
        step={4}
        onChange={(v) => updateWithHistory({ padding: v })}
      />

      {/* Corner Radius */}
      <Slider
        label="Corner Radius"
        value={beautifyOptions.corner_radius_percent}
        min={0}
        max={20}
        step={0.5}
        formatValue={(v) => `${v}%`}
        onChange={(v) => updateWithHistory({ corner_radius_percent: v })}
      />

      {/* Shadow */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-600 font-medium">Shadow</label>
        <Slider
          label="Blur"
          value={beautifyOptions.shadow_blur}
          min={0}
          max={60}
          step={1}
          onChange={(v) => updateWithHistory({ shadow_blur: v })}
        />
        <Slider
          label="Offset X"
          value={beautifyOptions.shadow_offset_x}
          min={-30}
          max={30}
          step={1}
          onChange={(v) => updateWithHistory({ shadow_offset_x: v })}
        />
        <Slider
          label="Offset Y"
          value={beautifyOptions.shadow_offset_y}
          min={-30}
          max={30}
          step={1}
          onChange={(v) => updateWithHistory({ shadow_offset_y: v })}
        />
        <Slider
          label="Opacity"
          value={beautifyOptions.shadow_color[3]}
          min={0}
          max={255}
          step={1}
          formatValue={(v) => `${Math.round((v / 255) * 100)}%`}
          onChange={(v) =>
            updateWithHistory({
              shadow_color: [
                beautifyOptions.shadow_color[0],
                beautifyOptions.shadow_color[1],
                beautifyOptions.shadow_color[2],
                v,
              ],
            })
          }
        />
      </div>
    </div>
  );
}
