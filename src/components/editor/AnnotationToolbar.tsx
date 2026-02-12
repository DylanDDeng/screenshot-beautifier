import { useEditorStore } from "../../stores/editorStore";
import type { AnnotationTool } from "../../types/annotation";

const tools: { id: AnnotationTool; label: string; icon: string; shortcut: string }[] = [
  { id: "arrow", label: "Arrow", icon: "↗", shortcut: "A" },
  { id: "rectangle", label: "Rectangle", icon: "▢", shortcut: "R" },
  { id: "ellipse", label: "Ellipse", icon: "○", shortcut: "E" },
  { id: "line", label: "Line", icon: "╱", shortcut: "L" },
  { id: "number", label: "Number", icon: "①", shortcut: "N" },
  { id: "text", label: "Text", icon: "T", shortcut: "T" },
  { id: "blur", label: "Blur", icon: "▦", shortcut: "B" },
  { id: "highlight", label: "Highlight", icon: "█", shortcut: "H" },
];

const COLORS = [
  "#ff3b30",
  "#ff9500",
  "#ffcc00",
  "#34c759",
  "#007aff",
  "#5856d6",
  "#af52de",
  "#ffffff",
  "#000000",
];

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 200;
}

export function AnnotationToolbar() {
  const {
    activeTool,
    setActiveTool,
    activeColor,
    setActiveColor,
    activeStrokeWidth,
    setActiveStrokeWidth,
    annotations,
    selectedAnnotationId,
    removeAnnotation,
    selectAnnotation,
    clearAnnotations,
  } = useEditorStore();

  const selectedAnnotation = annotations.find((a) => a.id === selectedAnnotationId);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
      {/* Tool buttons */}
      <div className="flex items-center gap-0.5">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
            className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${
              activeTool === tool.id
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            title={`${tool.label} (${tool.shortcut})`}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-200" />

      {/* Color picker */}
      <div className="flex items-center gap-0.5">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => setActiveColor(color)}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${
              activeColor === color
                ? "border-blue-500 scale-110"
                : isLightColor(color)
                  ? "border-gray-300"
                  : "border-gray-200"
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-gray-200" />

      {/* Stroke width */}
      <div className="flex items-center gap-0.5">
        {[2, 3, 5, 8].map((w) => (
          <button
            key={w}
            onClick={() => setActiveStrokeWidth(w)}
            className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${
              activeStrokeWidth === w
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-200" />

      {/* Annotation actions */}
      {annotations.length > 0 && (
        <>
          <button
            onClick={clearAnnotations}
            className="px-2 py-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
            title="Clear all annotations"
          >
            Clear All
          </button>
          <div className="text-xs text-gray-400">
            {annotations.length} annotation{annotations.length !== 1 ? "s" : ""}
          </div>
        </>
      )}

      {/* Selected annotation actions */}
      {selectedAnnotation && (
        <>
          <div className="w-px h-6 bg-gray-200" />
          <button
            onClick={() => removeAnnotation(selectedAnnotation.id)}
            className="px-2 py-1 text-xs text-red-500 hover:text-red-600 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => selectAnnotation(null)}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Deselect
          </button>
        </>
      )}
    </div>
  );
}
