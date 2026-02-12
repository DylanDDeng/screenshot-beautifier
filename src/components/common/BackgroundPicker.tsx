import { useState, useRef } from "react";
import type { 
  Background,
  GradientAngle,
  LinearGradientBackground,
  RadialGradientBackground,
} from "../../types/background";
import {
  SOLID_COLOR_PRESETS,
  GRADIENT_PRESETS,
  RADIAL_GRADIENT_PRESETS,
  rgbaToCSS,
  rgbaToHex,
  hexToRgba,
  getSavedBackgrounds,
  saveBackground,
  deleteSavedBackground,
} from "../../types/background";

interface BackgroundPickerProps {
  value: Background;
  onChange: (background: Background) => void;
}

type TabType = 'solid' | 'gradient' | 'radial' | 'image' | 'saved';

export function BackgroundPicker({ value, onChange }: BackgroundPickerProps) {
  const [activeTab, setActiveTab] = useState<TabType>(value.type === 'solid' ? 'solid' : 
                                                        value.type === 'linear_gradient' ? 'gradient' :
                                                        value.type === 'radial_gradient' ? 'radial' :
                                                        value.type === 'image' ? 'image' : 'solid');
  const [customName, setCustomName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'solid', label: 'Solid' },
    { id: 'gradient', label: 'Gradient' },
    { id: 'radial', label: 'Radial' },
    { id: 'image', label: 'Image' },
    { id: 'saved', label: 'Saved' },
  ];

  const handleSelectSolid = (color: [number, number, number, number]) => {
    onChange({ type: 'solid', color });
  };

  const handleSelectGradient = (preset: typeof GRADIENT_PRESETS[0]) => {
    onChange(preset.background);
  };

  const handleSelectRadial = (preset: typeof RADIAL_GRADIENT_PRESETS[0]) => {
    onChange(preset.background);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onChange({
        type: 'image',
        base64,
        blur: 0,
        scale: 'cover',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleImageBlurChange = (blur: number) => {
    if (value.type === 'image') {
      onChange({ ...value, blur });
    }
  };

  const handleImageScaleChange = (scale: 'fill' | 'fit' | 'cover') => {
    if (value.type === 'image') {
      onChange({ ...value, scale });
    }
  };

  const handleGradientAngleChange = (angle: GradientAngle) => {
    if (value.type === 'linear_gradient') {
      onChange({ ...value, angle });
    }
  };

  const handleSaveBackground = () => {
    if (!customName.trim()) {
      const name = prompt("Enter a name for this background:");
      if (!name) return;
      saveBackground(name, value);
    } else {
      saveBackground(customName, value);
      setCustomName("");
    }
  };

  const renderSolidTab = () => (
    <div className="space-y-2">
      <div className="grid grid-cols-6 gap-1">
        {SOLID_COLOR_PRESETS.map((color, index) => (
          <button
            key={index}
            onClick={() => handleSelectSolid(color)}
            className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
              value.type === 'solid' && 
              value.color[0] === color[0] && 
              value.color[1] === color[1] && 
              value.color[2] === color[2]
                ? 'border-blue-500'
                : 'border-gray-200'
            }`}
            style={{ backgroundColor: rgbaToCSS(color) }}
          />
        ))}
      </div>
      
      {/* Custom color picker */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Custom:</label>
        <input
          type="color"
          value={value.type === 'solid' ? rgbaToHex(value.color) : '#ffffff'}
          onChange={(e) => handleSelectSolid(hexToRgba(e.target.value))}
          className="w-8 h-6 rounded cursor-pointer"
        />
      </div>
    </div>
  );

  const renderGradientTab = () => {
    const currentValue = value.type === 'linear_gradient' ? value : null;
    
    return (
      <div className="space-y-3">
        {/* Angle selector */}
        {value.type === 'linear_gradient' && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Angle:</label>
            <div className="flex gap-1">
              {([45, 90, 135, 180] as GradientAngle[]).map((angle) => (
                <button
                  key={angle}
                  onClick={() => handleGradientAngleChange(angle)}
                  className={`px-2 py-1 text-xs rounded ${
                    value.angle === angle
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {angle}°
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preset gradients */}
        <div className="grid grid-cols-5 gap-1">
          {GRADIENT_PRESETS.map((preset, index) => {
            const presetBg = preset.background as LinearGradientBackground;
            const isActive = currentValue && 
              JSON.stringify(currentValue.stops) === JSON.stringify(presetBg.stops);
            return (
              <button
                key={index}
                onClick={() => handleSelectGradient(preset)}
                className={`h-8 rounded border-2 transition-transform hover:scale-105 ${
                  isActive ? 'border-blue-500' : 'border-gray-200'
                }`}
                style={{ background: getGradientCSS(presetBg) }}
                title={preset.name}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const renderRadialTab = () => {
    const currentValue = value.type === 'radial_gradient' ? value : null;
    
    return (
      <div className="grid grid-cols-4 gap-1">
        {RADIAL_GRADIENT_PRESETS.map((preset, index) => {
          const presetBg = preset.background as RadialGradientBackground;
          const isActive = currentValue &&
            JSON.stringify(currentValue.stops) === JSON.stringify(presetBg.stops);
          return (
            <button
              key={index}
              onClick={() => handleSelectRadial(preset)}
              className={`h-12 rounded border-2 transition-transform hover:scale-105 ${
                isActive ? 'border-blue-500' : 'border-gray-200'
              }`}
              style={{ background: getRadialGradientCSS(presetBg) }}
              title={preset.name}
            />
          );
        })}
      </div>
    );
  };

  const renderImageTab = () => (
    <div className="space-y-3">
      {/* Upload button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full py-2 px-3 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-200"
      >
        {value.type === 'image' ? 'Change Image' : 'Upload Image'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Image options */}
      {value.type === 'image' && (
        <>
          {/* Blur */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-12">Blur:</label>
            <input
              type="range"
              min="0"
              max="20"
              value={value.blur}
              onChange={(e) => handleImageBlurChange(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs text-gray-400 w-6">{value.blur}</span>
          </div>

          {/* Scale */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-12">Scale:</label>
            <div className="flex gap-1">
              {(['fill', 'fit', 'cover'] as const).map((scale) => (
                <button
                  key={scale}
                  onClick={() => handleImageScaleChange(scale)}
                  className={`px-2 py-1 text-xs rounded ${
                    value.scale === scale
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {scale.charAt(0).toUpperCase() + scale.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div 
            className="w-full h-16 rounded border border-gray-200 bg-cover bg-center"
            style={{ backgroundImage: `url(${value.base64})` }}
          />
        </>
      )}
    </div>
  );

  const renderSavedTab = () => {
    const saved = getSavedBackgrounds();
    
    if (saved.length === 0) {
      return (
        <div className="text-center py-4 text-sm text-gray-400">
          No saved backgrounds yet.
          <br />
          Create a custom background and save it!
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {saved.map((item) => (
          <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <button
              onClick={() => onChange(item.background)}
              className="w-8 h-8 rounded border-2 border-gray-200 hover:border-blue-400"
              style={{ background: getBackgroundPreviewCSS(item.background) }}
              title={item.name}
            />
            <span className="flex-1 text-sm truncate">{item.name}</span>
            <button
              onClick={() => deleteSavedBackground(item.id)}
              className="text-gray-400 hover:text-red-500 text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-2 py-1 text-xs rounded ${
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="py-2">
        {activeTab === 'solid' && renderSolidTab()}
        {activeTab === 'gradient' && renderGradientTab()}
        {activeTab === 'radial' && renderRadialTab()}
        {activeTab === 'image' && renderImageTab()}
        {activeTab === 'saved' && renderSavedTab()}
      </div>

      {/* Save button */}
      {(value.type !== 'image' || (value.type === 'image' && value.base64)) && (
        <button
          onClick={handleSaveBackground}
          className="w-full py-1 text-xs text-gray-500 hover:text-blue-500 border border-gray-200 rounded hover:border-blue-400"
        >
          Save Current Background
        </button>
      )}
    </div>
  );
}

// Helper functions for CSS generation
function getGradientCSS(bg: LinearGradientBackground): string {
  const stops = bg.stops
    .map((s) => `${rgbaToCSS(s.color)} ${s.position * 100}%`)
    .join(', ');
  return `linear-gradient(${bg.angle}deg, ${stops})`;
}

function getRadialGradientCSS(bg: RadialGradientBackground): string {
  const stops = bg.stops
    .map((s) => `${rgbaToCSS(s.color)} ${s.position * 100}%`)
    .join(', ');
  return `radial-gradient(circle, ${stops})`;
}

function getBackgroundPreviewCSS(bg: Background): string {
  switch (bg.type) {
    case 'solid':
      return rgbaToCSS(bg.color);
    case 'linear_gradient':
      return getGradientCSS(bg);
    case 'radial_gradient':
      return getRadialGradientCSS(bg);
    case 'image':
      return `url(${bg.base64})`;
    default:
      return '#ffffff';
  }
}
