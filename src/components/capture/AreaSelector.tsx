import { useState, useCallback, useRef, useEffect } from "react";
import type { Region } from "../../types/capture";

interface AreaSelectorProps {
  onSelect: (region: Region) => void;
  onCancel: () => void;
}

export function AreaSelector({ onSelect, onCancel }: AreaSelectorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const region: Region | null =
    isDragging || (startPos.x !== currentPos.x && startPos.y !== currentPos.y)
      ? {
          x: Math.min(startPos.x, currentPos.x),
          y: Math.min(startPos.y, currentPos.y),
          width: Math.abs(currentPos.x - startPos.x),
          height: Math.abs(currentPos.y - startPos.y),
        }
      : null;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) * window.devicePixelRatio;
      const y = (e.clientY - rect.top) * window.devicePixelRatio;
      setStartPos({ x, y });
      setCurrentPos({ x, y });
      setIsDragging(true);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) * window.devicePixelRatio;
      const y = (e.clientY - rect.top) * window.devicePixelRatio;
      setCurrentPos({ x, y });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (region && region.width > 5 && region.height > 5) {
      onSelect({
        x: Math.round(region.x),
        y: Math.round(region.y),
        width: Math.round(region.width),
        height: Math.round(region.height),
      });
    }
  }, [isDragging, region, onSelect]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  // Convert physical pixels back to CSS pixels for display
  const displayRegion = region
    ? {
        x: region.x / window.devicePixelRatio,
        y: region.y / window.devicePixelRatio,
        width: region.width / window.devicePixelRatio,
        height: region.height / window.devicePixelRatio,
      }
    : null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 cursor-crosshair select-none"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {displayRegion && displayRegion.width > 0 && displayRegion.height > 0 && (
        <>
          {/* Selected region - clear area */}
          <div
            className="absolute border-2 border-blue-500"
            style={{
              left: displayRegion.x,
              top: displayRegion.y,
              width: displayRegion.width,
              height: displayRegion.height,
              backgroundColor: "rgba(0, 0, 0, 0)",
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.3)",
            }}
          />
          {/* Size indicator */}
          <div
            className="absolute bg-black/80 text-white text-xs px-2 py-1 rounded"
            style={{
              left: displayRegion.x,
              top: displayRegion.y - 28,
            }}
          >
            {Math.round(region!.width)} × {Math.round(region!.height)}
          </div>
        </>
      )}
      {/* Instructions */}
      {!isDragging && !region && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/70 text-white px-6 py-3 rounded-lg text-sm">
            Drag to select area · Press ESC to cancel
          </div>
        </div>
      )}
    </div>
  );
}
