import { useEditorStore } from "../../stores/editorStore";
import { useExport } from "../../hooks/useExport";
import { useBeautify } from "../../hooks/useBeautify";
import { useState, useRef, useEffect } from "react";
import { showError, showSuccess } from "../common/Toast";

export function ExportPanel() {
  const { exportFormat, setExportFormat, jpegQuality, setJpegQuality } =
    useEditorStore();
  const { saveToFile, copyToClipboard } = useExport();
  const { applyBeautify } = useBeautify();
  const [isSaving, setIsSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeout on unmount to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await applyBeautify();
      await saveToFile();
    } catch (err) {
      console.error("Save failed:", err);
      showError("Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    setIsCopying(true);
    try {
      await applyBeautify();
      await copyToClipboard();
      showSuccess("Copied to clipboard");
      // Brief visual feedback with cleanup-safe timer
      copyTimerRef.current = setTimeout(() => {
        setIsCopying(false);
        copyTimerRef.current = null;
      }, 1000);
    } catch (err) {
      console.error("Copy failed:", err);
      showError("Copy to clipboard failed");
      setIsCopying(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-white border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-800">Export</h3>

      {/* Format selection */}
      <div className="flex gap-2">
        <button
          onClick={() => setExportFormat("png")}
          className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
            exportFormat === "png"
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          PNG
        </button>
        <button
          onClick={() => setExportFormat("jpeg")}
          className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
            exportFormat === "jpeg"
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          JPEG
        </button>
      </div>

      {/* JPEG quality */}
      {exportFormat === "jpeg" && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">Quality:</label>
          <input
            type="range"
            min={10}
            max={100}
            value={jpegQuality}
            onChange={(e) => setJpegQuality(Number(e.target.value))}
            className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <span className="text-xs text-gray-500 tabular-nums w-8 text-right">
            {jpegQuality}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {isSaving ? "Saving..." : "Save (⌘S)"}
        </button>
        <button
          onClick={handleCopy}
          disabled={isCopying}
          className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {isCopying ? "Copied!" : "Copy (⇧⌘C)"}
        </button>
      </div>
    </div>
  );
}
