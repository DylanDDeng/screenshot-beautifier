import { useEffect, useCallback, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen, emitTo } from "@tauri-apps/api/event";
import { currentMonitor } from "@tauri-apps/api/window";
import { LogicalSize, LogicalPosition } from "@tauri-apps/api/dpi";
import { useEditorStore } from "./stores/editorStore";
import { useHistoryStore } from "./stores/historyStore";
import type { AnnotationTool } from "./types/annotation";
import { useExport } from "./hooks/useExport";
import * as commands from "./lib/tauri-commands";
import { EditorCanvas } from "./components/editor/EditorCanvas";
import { BeautifyPanel } from "./components/editor/BeautifyPanel";
import { AnnotationToolbar } from "./components/editor/AnnotationToolbar";
import { ExportPanel } from "./components/editor/ExportPanel";
import { ToastContainer, showError } from "./components/common/Toast";

interface RegionPayload {
  x: number;
  y: number;
  width: number;
  height: number;
}

function App() {
  const { originalImage, setOriginalImage } = useEditorStore();
  const { saveToFile, copyToClipboard } = useExport();
  const isCapturingRef = useRef(false);

  const handleStartCapture = useCallback(async () => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    try {
      const selectorWindow = await WebviewWindow.getByLabel("selector");
      const monitor = await currentMonitor();

      if (!selectorWindow || !monitor) {
        showError("Failed to initialize capture");
        return;
      }

      const { width, height } = monitor.size;
      const scaleFactor = monitor.scaleFactor;
      const logicalWidth = width / scaleFactor;
      const logicalHeight = height / scaleFactor;

      // 1. 预配置 selector 窗口尺寸/位置（在隐藏主窗口之前）
      await Promise.all([
        selectorWindow.setSize(new LogicalSize(logicalWidth, logicalHeight)),
        selectorWindow.setPosition(new LogicalPosition(0, 0)),
      ]);

      // 2. 隐藏主窗口和 selector 窗口（必须在截图之前）
      await Promise.all([
        getCurrentWindow().hide(),
        selectorWindow.hide(),
      ]);

      // 3. 短暂等待窗口隐藏（减少延迟）
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 4. 重置 selector 窗口的选区状态（防止残留）
      await emitTo("selector", "reset-selection");

      // 5. 立即显示 selector 窗口（让用户先看到选区 UI）
      await selectorWindow.show();
      await selectorWindow.setFocus();

      // 5. 并行执行截图和获取图片
      const [base64] = await Promise.all([
        (async () => {
          await commands.captureAndCache();
          return commands.getCachedScreenshot();
        })(),
      ]);

      // 6. 发送图片数据给 selector
      await emitTo("selector", "screenshot-ready", { base64 });
    } catch (err) {
      console.error("Failed to start capture:", err);
      showError("Failed to start capture");
      await getCurrentWindow().show();
    } finally {
      isCapturingRef.current = false;
    }
  }, []);

  // Listen for region-selected event from selector window
  useEffect(() => {
    const unlisten = listen<RegionPayload>("region-selected", async (event) => {
      try {
        const { x, y, width, height } = event.payload;

        // Crop directly from Rust cache — no round-trip of full base64 through JS
        const cropped = await commands.cropCachedImage(x, y, width, height);
        useHistoryStore.getState().clear();
        setOriginalImage(cropped);

        // Clean up Rust cache
        await commands.clearScreenshotCache();

        // Show main window
        await getCurrentWindow().show();
        await getCurrentWindow().setFocus();
      } catch (err) {
        console.error("Failed to process region:", err);
        showError("Failed to process screenshot region");
        await getCurrentWindow().show();
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setOriginalImage]);

  // Listen for selection-cancelled event from selector window
  useEffect(() => {
    const unlisten = listen("selection-cancelled", async () => {
      await commands.clearScreenshotCache();
      await getCurrentWindow().show();
      await getCurrentWindow().setFocus();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Handle file drop
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        if (base64) {
          useHistoryStore.getState().clear();
          setOriginalImage(base64);
        }
      };
      reader.readAsDataURL(file);
    },
    [setOriginalImage]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      const { setActiveTool, activeTool, setBeautifyOptions, setAnnotations } =
        useEditorStore.getState();

      // Tool shortcuts (when not in input field)
      if (!isMeta && document.activeElement?.tagName !== "INPUT") {
        const toolKeys: Record<string, AnnotationTool> = {
          a: "arrow",
          r: "rectangle",
          e: "ellipse",
          l: "line",
          n: "number",
          t: "text",
          b: "blur",
          h: "highlight",
        };
        const tool = toolKeys[e.key.toLowerCase()];
        if (tool) {
          e.preventDefault();
          setActiveTool(activeTool === tool ? null : tool);
          return;
        }
        // Escape to deselect tool
        if (e.key === "Escape") {
          e.preventDefault();
          setActiveTool(null);
          return;
        }
      }

      if (isMeta && e.key === "s" && originalImage) {
        e.preventDefault();
        try {
          await saveToFile();
        } catch (err) {
          console.error("Save failed:", err);
          showError("Save failed");
        }
      } else if (isMeta && e.shiftKey && e.key === "c" && originalImage) {
        e.preventDefault();
        try {
          await copyToClipboard();
        } catch (err) {
          console.error("Copy failed:", err);
          showError("Copy to clipboard failed");
        }
      } else if (isMeta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const snapshot = useHistoryStore.getState().undo();
        if (snapshot) {
          setBeautifyOptions(snapshot.beautifyOptions);
          setAnnotations(snapshot.annotations);
        }
      } else if (isMeta && e.shiftKey && e.key === "z") {
        e.preventDefault();
        const snapshot = useHistoryStore.getState().redo();
        if (snapshot) {
          setBeautifyOptions(snapshot.beautifyOptions);
          setAnnotations(snapshot.annotations);
        }
      } else if (isMeta && e.shiftKey && e.key === "p") {
        e.preventDefault();
        handleStartCapture();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    saveToFile,
    copyToClipboard,
    originalImage,
    handleStartCapture,
  ]);

  // Set window title
  useEffect(() => {
    getCurrentWindow().setTitle("Screenshot Beautifier").catch(() => {});
  }, []);

  return (
    <div
      className="flex flex-col h-screen bg-gray-50"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-gray-800">
            Screenshot Beautifier
          </h1>
          <button
            onClick={handleStartCapture}
            className="px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors"
          >
            New Capture (⌘⇧P)
          </button>
        </div>
      </div>

      {/* Annotation toolbar */}
      {originalImage && <AnnotationToolbar />}

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <EditorCanvas />

        {/* Right panel */}
        {originalImage && (
          <div className="flex flex-col shrink-0 overflow-y-auto max-h-full">
            <BeautifyPanel />
            <ExportPanel />
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}

export default App;
