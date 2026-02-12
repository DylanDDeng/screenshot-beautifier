import { useRef, useEffect, useState, useCallback } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { useHistoryStore } from "../../stores/historyStore";
import type { Annotation, AnnotationTool } from "../../types/annotation";
import type { Background } from "../../types/background";
import { rgbaToCSS } from "../../types/background";

const MIN_SHAPE_SIZE = 5;

export function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const {
    originalImage,
    beautifyOptions,
    annotations,
    activeTool,
    activeColor,
    activeStrokeWidth,
    setOriginalImage,
    addAnnotation,
    setActiveTool,
  } = useEditorStore();

  const pushState = useHistoryStore((s) => s.pushState);

  // Load image
  useEffect(() => {
    if (!originalImage) return;
    const img = new Image();
    img.onload = () => setImageEl(img);
    img.src = `data:image/png;base64,${originalImage}`;
  }, [originalImage]);

  // Load background image
  useEffect(() => {
    const bg = beautifyOptions.background;
    if (bg.type === 'image' && bg.base64) {
      const img = new Image();
      img.onload = () => setBackgroundImage(img);
      img.src = bg.base64.startsWith('data:') ? bg.base64 : `data:image/png;base64,${bg.base64}`;
    } else {
      setBackgroundImage(null);
    }
  }, [beautifyOptions.background]);

  // Calculate fit scale
  const updateScale = useCallback(() => {
    if (!imageEl || !containerRef.current) return;
    const container = containerRef.current;
    const imgW = imageEl.naturalWidth;
    const imgH = imageEl.naturalHeight;

    const padding = beautifyOptions.padding;
    const shadowExtra = Math.ceil(beautifyOptions.shadow_blur * 2);
    const canvasW = imgW + padding * 2 + shadowExtra;
    const canvasH = imgH + padding * 2 + shadowExtra;

    const containerW = container.clientWidth - 40;
    const containerH = container.clientHeight - 40;
    const s = Math.min(1, containerW / canvasW, containerH / canvasH);
    setScale(s);
  }, [imageEl, beautifyOptions]);

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [updateScale]);

  // Render canvas
  useEffect(() => {
    if (!canvasRef.current || !imageEl) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgW = imageEl.naturalWidth;
    const imgH = imageEl.naturalHeight;
    const padding = beautifyOptions.padding;
    const shadowExtra = Math.ceil(beautifyOptions.shadow_blur * 2);
    const canvasW = imgW + padding * 2 + shadowExtra;
    const canvasH = imgH + padding * 2 + shadowExtra;

    canvas.width = canvasW;
    canvas.height = canvasH;

    // Draw background
    drawBackground(ctx, beautifyOptions.background, backgroundImage, canvasW, canvasH);

    const imgX = padding + shadowExtra / 2;
    const imgY = padding + shadowExtra / 2;

    // Draw shadow
    if (beautifyOptions.shadow_blur > 0) {
      const sc = beautifyOptions.shadow_color;
      ctx.save();
      ctx.shadowColor = rgbaToCSS(sc);
      ctx.shadowBlur = beautifyOptions.shadow_blur;
      ctx.shadowOffsetX = beautifyOptions.shadow_offset_x;
      ctx.shadowOffsetY = beautifyOptions.shadow_offset_y;

      const radius = Math.min(imgW, imgH) * beautifyOptions.corner_radius_percent / 100;
      drawRoundedRect(ctx, imgX, imgY, imgW, imgH, radius);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.restore();
    }

    // Draw image with rounded corners
    ctx.save();
    const radius = Math.min(imgW, imgH) * beautifyOptions.corner_radius_percent / 100;
    ctx.beginPath();
    roundedRectPath(ctx, imgX, imgY, imgW, imgH, radius);
    ctx.clip();
    ctx.drawImage(imageEl, imgX, imgY, imgW, imgH);
    ctx.restore();

    // Draw annotations on top of image
    ctx.save();
    ctx.translate(imgX, imgY);
    annotations.forEach((ann) => drawAnnotation(ctx, ann));
    ctx.restore();

    setOffset({ x: imgX, y: imgY });
  }, [imageEl, beautifyOptions, annotations, backgroundImage]);

  // Drawing state
  const drawingRef = useRef<{
    tool: AnnotationTool;
    startX: number;
    startY: number;
    annotation?: Annotation;
  } | null>(null);

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / scale - offset.x,
        y: (e.clientY - rect.top) / scale - offset.y,
      };
    },
    [scale, offset]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!activeTool || !imageEl) return;
      const { x, y } = getCanvasCoords(e);

      drawingRef.current = {
        tool: activeTool,
        startX: x,
        startY: y,
      };
    },
    [activeTool, imageEl, getCanvasCoords]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawingRef.current || !imageEl) return;
      const { x, y } = getCanvasCoords(e);
      const { tool, startX, startY } = drawingRef.current;

      let annotation: Annotation | undefined;
      const id = `temp-${Date.now()}`;

      switch (tool) {
        case "arrow":
        case "line":
          annotation = {
            id,
            tool,
            x: startX,
            y: startY,
            endX: x,
            endY: y,
            color: activeColor,
            strokeWidth: activeStrokeWidth,
          } as Annotation;
          break;
        case "rectangle":
          annotation = {
            id,
            tool: "rectangle",
            x: Math.min(startX, x),
            y: Math.min(startY, y),
            width: Math.abs(x - startX),
            height: Math.abs(y - startY),
            color: activeColor,
            strokeWidth: activeStrokeWidth,
          } as Annotation;
          break;
        case "ellipse":
          annotation = {
            id,
            tool: "ellipse",
            x: (startX + x) / 2,
            y: (startY + y) / 2,
            radiusX: Math.abs(x - startX) / 2,
            radiusY: Math.abs(y - startY) / 2,
            color: activeColor,
            strokeWidth: activeStrokeWidth,
          } as Annotation;
          break;
        case "number":
          annotation = {
            id,
            tool: "number",
            x: startX,
            y: startY,
            number: annotations.filter((a) => a.tool === "number").length + 1,
            radius: 16,
            color: activeColor,
            strokeWidth: activeStrokeWidth,
          } as Annotation;
          break;
        case "blur":
          annotation = {
            id,
            tool: "blur",
            x: Math.min(startX, x),
            y: Math.min(startY, y),
            width: Math.abs(x - startX),
            height: Math.abs(y - startY),
            intensity: 10,
            color: activeColor,
            strokeWidth: activeStrokeWidth,
          } as Annotation;
          break;
        case "text":
          const text = prompt("Enter text:");
          if (text) {
            annotation = {
              id,
              tool: "text",
              x: startX,
              y: startY,
              text,
              fontSize: 16,
              color: activeColor,
              strokeWidth: activeStrokeWidth,
            } as Annotation;
          }
          break;
      }

      drawingRef.current.annotation = annotation;
    },
    [imageEl, getCanvasCoords, activeTool, activeColor, activeStrokeWidth, annotations]
  );

  const handleMouseUp = useCallback(() => {
    if (drawingRef.current?.annotation) {
      const ann = drawingRef.current.annotation;
      const isValid =
        ("width" in ann && ann.width >= MIN_SHAPE_SIZE) ||
        ("endX" in ann) ||
        ann.tool === "number" ||
        ann.tool === "text";

      if (isValid) {
        pushState({ beautifyOptions, annotations });
        addAnnotation({
          ...ann,
          id: `ann-${Date.now()}`,
        });
        setActiveTool(null);
      }
    }
    drawingRef.current = null;
  }, [addAnnotation, setActiveTool, pushState, beautifyOptions, annotations]);

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

  if (!originalImage) {
    return (
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center bg-gray-100"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <div className="text-center text-gray-400">
          <p className="text-lg">No screenshot loaded</p>
          <p className="text-sm mt-1">Press Cmd+N to capture or drag an image here</p>
        </div>
      </div>
    );
  }

  const canvasSize = imageEl
    ? {
        width: imageEl.naturalWidth + beautifyOptions.padding * 2 + Math.ceil(beautifyOptions.shadow_blur * 2),
        height: imageEl.naturalHeight + beautifyOptions.padding * 2 + Math.ceil(beautifyOptions.shadow_blur * 2),
      }
    : { width: 0, height: 0 };

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center bg-gray-100 overflow-hidden"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{
        backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: canvasSize.width * scale,
          height: canvasSize.height * scale,
          cursor: activeTool ? "crosshair" : "default",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}

// Draw background based on type
function drawBackground(
  ctx: CanvasRenderingContext2D,
  background: Background,
  backgroundImage: HTMLImageElement | null,
  w: number,
  h: number
) {
  switch (background.type) {
    case 'solid':
      ctx.fillStyle = rgbaToCSS(background.color);
      ctx.fillRect(0, 0, w, h);
      break;

    case 'linear_gradient':
      const angle = background.angle;
      const angleRad = (angle - 90) * Math.PI / 180;
      const centerX = w / 2;
      const centerY = h / 2;
      const length = Math.sqrt(w * w + h * h) / 2;
      
      const x1 = centerX - Math.cos(angleRad) * length;
      const y1 = centerY - Math.sin(angleRad) * length;
      const x2 = centerX + Math.cos(angleRad) * length;
      const y2 = centerY + Math.sin(angleRad) * length;

      const linearGrad = ctx.createLinearGradient(x1, y1, x2, y2);
      background.stops.forEach(stop => {
        linearGrad.addColorStop(stop.position, rgbaToCSS(stop.color));
      });
      ctx.fillStyle = linearGrad;
      ctx.fillRect(0, 0, w, h);
      break;

    case 'radial_gradient':
      const radialGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
      background.stops.forEach(stop => {
        radialGrad.addColorStop(stop.position, rgbaToCSS(stop.color));
      });
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, w, h);
      break;

    case 'image':
      if (backgroundImage) {
        ctx.save();
        
        // Apply blur if needed
        if (background.blur > 0) {
          ctx.filter = `blur(${background.blur}px)`;
        }

        // Calculate image dimensions based on scale mode
        let drawWidth = w;
        let drawHeight = h;
        let drawX = 0;
        let drawY = 0;

        const imgRatio = backgroundImage.naturalWidth / backgroundImage.naturalHeight;
        const canvasRatio = w / h;

        switch (background.scale) {
          case 'fill':
            // Stretch to fill
            break;
          case 'fit':
            // Fit within canvas (may have empty space)
            if (imgRatio > canvasRatio) {
              drawWidth = w;
              drawHeight = w / imgRatio;
            } else {
              drawHeight = h;
              drawWidth = h * imgRatio;
            }
            drawX = (w - drawWidth) / 2;
            drawY = (h - drawHeight) / 2;
            break;
          case 'cover':
            // Cover canvas (may crop image)
            if (imgRatio > canvasRatio) {
              drawHeight = h;
              drawWidth = h * imgRatio;
            } else {
              drawWidth = w;
              drawHeight = w / imgRatio;
            }
            drawX = (w - drawWidth) / 2;
            drawY = (h - drawHeight) / 2;
            break;
        }

        ctx.drawImage(backgroundImage, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
      } else {
        // Fallback to gray if image not loaded
        ctx.fillStyle = '#e5e5e5';
        ctx.fillRect(0, 0, w, h);
      }
      break;
  }
}

// Helper functions
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation) {
  ctx.strokeStyle = ann.color;
  ctx.fillStyle = ann.color;
  ctx.lineWidth = ann.strokeWidth;

  switch (ann.tool) {
    case "arrow":
      drawArrow(ctx, ann.x, ann.y, ann.endX, ann.endY);
      break;
    case "line":
      ctx.beginPath();
      ctx.moveTo(ann.x, ann.y);
      ctx.lineTo(ann.endX, ann.endY);
      ctx.stroke();
      break;
    case "rectangle":
      ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
      break;
    case "ellipse":
      ctx.beginPath();
      ctx.ellipse(ann.x, ann.y, ann.radiusX, ann.radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "number":
      ctx.beginPath();
      ctx.arc(ann.x, ann.y, ann.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(ann.number), ann.x, ann.y);
      break;
    case "text":
      ctx.font = `${ann.fontSize}px sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(ann.text, ann.x, ann.y);
      break;
    case "blur":
      ctx.fillStyle = "rgba(128, 128, 128, 0.3)";
      ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
      ctx.strokeStyle = "rgba(128, 128, 128, 0.8)";
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
      ctx.setLineDash([]);
      break;
    case "highlight":
      ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
      ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
      break;
  }
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
) {
  const headLen = 12;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLen * Math.cos(angle - Math.PI / 6),
    toY - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headLen * Math.cos(angle + Math.PI / 6),
    toY - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}
