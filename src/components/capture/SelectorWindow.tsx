import { useCallback, useRef, useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen, emitTo } from "@tauri-apps/api/event";

import type {
  Region,
  SelectionState,
  HandlePosition,
  HitZone,
} from "../../types/capture";

// --- Constants ---

const HANDLE_SIZE = 12;
const HANDLE_HIT_AREA = 16;
const MIN_SELECTION = 5;

const CURSOR_MAP: Record<HandlePosition, string> = {
  nw: "nwse-resize",
  ne: "nesw-resize",
  se: "nwse-resize",
  sw: "nesw-resize",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
};

const HANDLE_ORDER: HandlePosition[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

// --- Hit testing ---

function getHitZone(
  clientX: number,
  clientY: number,
  region: Region
): HitZone {
  const x = clientX;
  const y = clientY;
  const { x: rx, y: ry, width: rw, height: rh } = region;
  const h = HANDLE_HIT_AREA;

  // Check handles (corners first, then edges)
  if (Math.abs(x - rx) <= h && Math.abs(y - ry) <= h) return "handle-nw";
  if (Math.abs(x - (rx + rw)) <= h && Math.abs(y - ry) <= h) return "handle-ne";
  if (Math.abs(x - (rx + rw)) <= h && Math.abs(y - (ry + rh)) <= h)
    return "handle-se";
  if (Math.abs(x - rx) <= h && Math.abs(y - (ry + rh)) <= h) return "handle-sw";
  if (Math.abs(y - ry) <= h && x > rx + h && x < rx + rw - h) return "handle-n";
  if (Math.abs(y - (ry + rh)) <= h && x > rx + h && x < rx + rw - h)
    return "handle-s";
  if (Math.abs(x - (rx + rw)) <= h && y > ry + h && y < ry + rh - h)
    return "handle-e";
  if (Math.abs(x - rx) <= h && y > ry + h && y < ry + rh - h) return "handle-w";

  // Inside the selection
  if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) return "inside";

  return "outside";
}

function getCursorForZone(zone: HitZone): string {
  if (zone === "inside") return "move";
  if (zone === "outside") return "crosshair";
  const handle = zone.replace("handle-", "") as HandlePosition;
  return CURSOR_MAP[handle];
}

// --- Resize logic ---

function applyResize(
  handle: HandlePosition,
  startRegion: Region,
  dx: number,
  dy: number
): Region {
  let { x, y, width, height } = startRegion;

  switch (handle) {
    case "nw":
      x += dx; y += dy; width -= dx; height -= dy;
      break;
    case "n":
      y += dy; height -= dy;
      break;
    case "ne":
      y += dy; width += dx; height -= dy;
      break;
    case "e":
      width += dx;
      break;
    case "se":
      width += dx; height += dy;
      break;
    case "s":
      height += dy;
      break;
    case "sw":
      x += dx; width -= dx; height += dy;
      break;
    case "w":
      x += dx; width -= dx;
      break;
  }

  // Normalize: if width or height went negative, flip
  if (width < 0) { x += width; width = -width; }
  if (height < 0) { y += height; height = -height; }

  return { x, y, width, height };
}

function normalizeRegion(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number
): Region {
  return {
    x: Math.min(startX, currentX),
    y: Math.min(startY, currentY),
    width: Math.abs(currentX - startX),
    height: Math.abs(currentY - startY),
  };
}

// --- Handle positions for rendering ---

function getHandlePositions(
  region: Region
): { position: HandlePosition; x: number; y: number }[] {
  const { x, y, width: w, height: h } = region;
  return [
    { position: "nw", x, y },
    { position: "n", x: x + w / 2, y },
    { position: "ne", x: x + w, y },
    { position: "e", x: x + w, y: y + h / 2 },
    { position: "se", x: x + w, y: y + h },
    { position: "s", x: x + w / 2, y: y + h },
    { position: "sw", x, y: y + h },
    { position: "w", x, y: y + h / 2 },
  ];
}

// --- Component ---

export function SelectorWindow() {
  // The "state type" drives re-renders for UI changes (instructions, hint text, cursor)
  // The actual region and positions are tracked in refs for 60fps DOM manipulation
  const stateRef = useRef<SelectionState>({ type: "ready" });
  const [stateType, setStateType] = useState<SelectionState["type"]>("ready");
  const [imgLoaded, setImgLoaded] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<Region | null>(null);

  // DOM refs for direct manipulation (avoids React re-renders during drag)
  const overlayRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);
  const sizeInfoRef = useRef<HTMLDivElement>(null);
  const handlesContainerRef = useRef<HTMLDivElement>(null);

  // Helper to update state ref + trigger re-render via stateType
  const setState = useCallback((newState: SelectionState) => {
    stateRef.current = newState;
    setStateType(newState.type);
  }, []);

  // Ref to store resetAll function for use in event listeners
  const resetAllRef = useRef<(() => void) | null>(null);

  // Listen for screenshot-ready event from main window (receives base64 directly)
  useEffect(() => {
    const unlisten = listen<{ base64: string }>("screenshot-ready", (event) => {
      console.log("[Selector] screenshot-ready event received");
      const { base64 } = event.payload;
      if (imgRef.current) {
        imgRef.current.src = `data:image/png;base64,${base64}`;
      }
      setImgLoaded(true);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Listen for reset-selection event to clear previous state when window is reused
  useEffect(() => {
    const unlisten = listen("reset-selection", () => {
      console.log("[Selector] reset-selection event received");
      resetAllRef.current?.();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // --- Direct DOM manipulation for 60fps updates ---
  const updateSelectionDOM = useCallback((region: Region | null) => {
    console.log("[Selector] updateSelectionDOM called, region:", region, "stateRef:", stateRef.current);
    if (!region || region.width <= 0 || region.height <= 0) {
      if (selectionRef.current) selectionRef.current.style.display = "none";
      if (sizeInfoRef.current) sizeInfoRef.current.style.display = "none";
      if (handlesContainerRef.current)
        handlesContainerRef.current.style.display = "none";
      if (overlayRef.current) overlayRef.current.style.display = "block";
      return;
    }

    if (overlayRef.current) overlayRef.current.style.display = "none";

    const sel = selectionRef.current;
    if (sel) {
      sel.style.display = "block";
      sel.style.left = `${region.x}px`;
      sel.style.top = `${region.y}px`;
      sel.style.width = `${region.width}px`;
      sel.style.height = `${region.height}px`;
    }

    const info = sizeInfoRef.current;
    if (info) {
      const dpr = window.devicePixelRatio;
      const physW = Math.round(region.width * dpr);
      const physH = Math.round(region.height * dpr);
      info.style.display = "block";
      info.style.left = `${region.x}px`;
      info.style.top =
        region.y > 32
          ? `${region.y - 28}px`
          : `${region.y + region.height + 4}px`;
      info.textContent = `${physW} x ${physH}`;
    }

    // Show handles only in drawn state
    const handles = handlesContainerRef.current;
    if (handles) {
      const showHandles = stateRef.current.type === "drawn";
      handles.style.display = showHandles ? "block" : "none";
      if (showHandles) {
        const positions = getHandlePositions(region);
        const children = handles.children;
        for (let i = 0; i < positions.length && i < children.length; i++) {
          const el = children[i] as HTMLElement;
          el.style.left = `${positions[i].x - HANDLE_SIZE / 2}px`;
          el.style.top = `${positions[i].y - HANDLE_SIZE / 2}px`;
        }
      }
    }
  }, []);

  const resetAll = useCallback(() => {
    console.log("[Selector] resetAll called, current state:", stateRef.current);
    // 同步更新 stateRef，确保 updateSelectionDOM 能获取到正确的状态
    stateRef.current = { type: "ready" };
    setStateType("ready");
    regionRef.current = null;
    setImgLoaded(false);
    if (imgRef.current) {
      imgRef.current.src = "";
    }
    // 清除 DOM 中的选区框
    updateSelectionDOM(null);
  }, [updateSelectionDOM]);

  // Keep the ref in sync with the callback
  resetAllRef.current = resetAll;

  const confirmSelection = useCallback(async () => {
    const region = regionRef.current;
    if (!region || region.width < MIN_SELECTION || region.height < MIN_SELECTION)
      return;

    // Convert CSS pixels to physical pixels for Rust cropping
    const dpr = window.devicePixelRatio;
    const finalRegion = {
      x: Math.round(region.x * dpr),
      y: Math.round(region.y * dpr),
      width: Math.round(region.width * dpr),
      height: Math.round(region.height * dpr),
    };

    await emitTo("main", "region-selected", finalRegion);
    await getCurrentWindow().hide();
    resetAll();
  }, [resetAll]);

  const cancelSelection = useCallback(async () => {
    await emitTo("main", "selection-cancelled");
    await getCurrentWindow().hide();
    resetAll();
  }, [resetAll]);

  // --- Mouse handlers ---
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      console.log("[Selector] handleMouseDown called, button:", e.button, "state:", stateRef.current);
      if (e.button !== 0) return;
      const x = e.clientX;
      const y = e.clientY;
      const s = stateRef.current;

      if (s.type === "ready") {
        setState({ type: "drawing", startX: x, startY: y });
        return;
      }

      if (s.type === "drawn") {
        const region = regionRef.current;
        if (!region) return;

        const zone = getHitZone(x, y, region);
        if (zone === "outside") {
          // 点击外部时，清除当前选区，开始画新框
          regionRef.current = null;
          updateSelectionDOM(null);
          setState({ type: "drawing", startX: x, startY: y });
        } else if (zone === "inside") {
          setState({
            type: "moving",
            startRegion: { ...region },
            startX: x,
            startY: y,
          });
        } else {
          // Handle resize
          const handle = zone.replace("handle-", "") as HandlePosition;
          setState({
            type: "resizing",
            handle,
            startRegion: { ...region },
            startX: x,
            startY: y,
          });
        }
      }
    },
    [setState, updateSelectionDOM]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      const s = stateRef.current;

      if (s.type === "drawing") {
        const region = normalizeRegion(s.startX, s.startY, x, y);
        regionRef.current = region;
        updateSelectionDOM(region);
        return;
      }

      if (s.type === "moving") {
        const dx = x - s.startX;
        const dy = y - s.startY;
        const region: Region = {
          x: s.startRegion.x + dx,
          y: s.startRegion.y + dy,
          width: s.startRegion.width,
          height: s.startRegion.height,
        };
        regionRef.current = region;
        updateSelectionDOM(region);
        return;
      }

      if (s.type === "resizing") {
        const dx = x - s.startX;
        const dy = y - s.startY;
        const region = applyResize(s.handle, s.startRegion, dx, dy);
        regionRef.current = region;
        updateSelectionDOM(region);
        return;
      }

      // Hover cursor in drawn state
      if (s.type === "drawn" && regionRef.current && containerRef.current) {
        const zone = getHitZone(x, y, regionRef.current);
        containerRef.current.style.cursor = getCursorForZone(zone);
      }
    },
    [updateSelectionDOM]
  );

  const handleMouseUp = useCallback(() => {
    const s = stateRef.current;

    if (s.type === "drawing" || s.type === "moving" || s.type === "resizing") {
      const region = regionRef.current;
      if (region && region.width >= MIN_SELECTION && region.height >= MIN_SELECTION) {
        setState({ type: "drawn", region: { ...region } });
        // Re-render to show handles
        updateSelectionDOM(region);
        // Need to update handle visibility after state change
        if (handlesContainerRef.current) {
          handlesContainerRef.current.style.display = "block";
          const positions = getHandlePositions(region);
          const children = handlesContainerRef.current.children;
          for (let i = 0; i < positions.length && i < children.length; i++) {
            const el = children[i] as HTMLElement;
            el.style.left = `${positions[i].x - HANDLE_SIZE / 2}px`;
            el.style.top = `${positions[i].y - HANDLE_SIZE / 2}px`;
          }
        }
      } else {
        regionRef.current = null;
        setState({ type: "ready" });
        updateSelectionDOM(null);
      }
    }
  }, [setState, updateSelectionDOM]);

  const handleDoubleClick = useCallback(() => {
    if (stateRef.current.type === "drawn" && regionRef.current) {
      confirmSelection();
    }
  }, [confirmSelection]);

  // --- Keyboard handler ---
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        await cancelSelection();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        await confirmSelection();
        return;
      }

      // Arrow key nudge in drawn state
      if (stateRef.current.type === "drawn" && regionRef.current) {
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        switch (e.key) {
          case "ArrowUp": dy = -step; break;
          case "ArrowDown": dy = step; break;
          case "ArrowLeft": dx = -step; break;
          case "ArrowRight": dx = step; break;
          default: return;
        }
        e.preventDefault();
        const region: Region = {
          x: regionRef.current.x + dx,
          y: regionRef.current.y + dy,
          width: regionRef.current.width,
          height: regionRef.current.height,
        };
        regionRef.current = region;
        stateRef.current = { type: "drawn", region };
        updateSelectionDOM(region);
        // Update handles
        if (handlesContainerRef.current) {
          const positions = getHandlePositions(region);
          const children = handlesContainerRef.current.children;
          for (let i = 0; i < positions.length && i < children.length; i++) {
            const el = children[i] as HTMLElement;
            el.style.left = `${positions[i].x - HANDLE_SIZE / 2}px`;
            el.style.top = `${positions[i].y - HANDLE_SIZE / 2}px`;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelSelection, confirmSelection, updateSelectionDOM]);

  // Determine cursor from state type (for React-driven renders)
  const s = stateRef.current;
  const baseCursor =
    s.type === "drawing"
      ? "crosshair"
      : s.type === "moving"
        ? "move"
        : s.type === "resizing"
          ? CURSOR_MAP[s.handle]
          : "crosshair";

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 select-none overflow-hidden"
      style={{ backgroundColor: "transparent", cursor: baseCursor }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      {/* Screenshot as background */}
      <img
        ref={imgRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ objectFit: "cover", display: imgLoaded ? "block" : "none" }}
        draggable={false}
      />

      {/* Dark overlay -- visible when no selection is active */}
      <div
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
      />

      {/* Selection region with box-shadow overlay */}
      <div
        ref={selectionRef}
        className="absolute border-2 border-blue-500 pointer-events-none"
        style={{
          display: "none",
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.3)",
          zIndex: 10,
        }}
      />

      {/* Size indicator */}
      <div
        ref={sizeInfoRef}
        className="absolute bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none"
        style={{ display: "none", zIndex: 11 }}
      />

      {/* Resize handles (8 total: 4 corners + 4 edge midpoints) */}
      <div ref={handlesContainerRef} style={{ display: "none", zIndex: 12 }}>
        {HANDLE_ORDER.map((pos) => (
          <div
            key={pos}
            className="absolute bg-white border border-blue-500 rounded-sm pointer-events-none"
            style={{
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              cursor: CURSOR_MAP[pos],
            }}
          />
        ))}
      </div>

      {/* Ready state instructions */}
      {stateType === "ready" && imgLoaded && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 20 }}
        >
          <div className="bg-black/70 text-white px-6 py-3 rounded-lg text-sm">
            Drag to select area &middot; Press ESC to cancel
          </div>
        </div>
      )}

      {/* Drawn state hint bar */}
      {stateType === "drawn" && (
        <div
          className="absolute pointer-events-none"
          style={{ left: 0, right: 0, bottom: 24, textAlign: "center", zIndex: 20 }}
        >
          <span className="bg-black/70 text-white px-4 py-2 rounded-lg text-xs inline-block">
            Drag handles to resize &middot; Drag inside to move &middot;
            Enter or double-click to confirm &middot; ESC to cancel
          </span>
        </div>
      )}
    </div>
  );
}
