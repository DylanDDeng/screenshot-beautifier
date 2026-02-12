# Screenshot Interaction Specification

## Overview

This document defines the complete interaction specification for the screenshot area selection feature of the Screenshot Beautifier application. It is based on research of mainstream screenshot tools (macOS native, CleanShot X, Shottr, Snipaste) and tailored for the Tauri v2 + React architecture.

---

## 1. State Machine

### States

| State       | Description                                      |
|-------------|--------------------------------------------------|
| `IDLE`      | No capture in progress. Main window is visible.  |
| `READY`     | Fullscreen overlay active, awaiting user draw.    |
| `DRAWING`   | User is dragging to draw the selection rectangle. |
| `DRAWN`     | Selection complete; user can adjust or confirm.   |
| `RESIZING`  | User is dragging a resize handle.                 |
| `MOVING`    | User is dragging the selection to reposition it.  |
| `CONFIRMED` | User confirmed the selection (terminal state).    |
| `CANCELLED` | User cancelled the selection (terminal state).    |

### Transitions

```
IDLE ──[trigger capture]──> READY
READY ──[mousedown]──> DRAWING
READY ──[ESC]──> CANCELLED
DRAWING ──[mouseup, area >= 5x5px]──> DRAWN
DRAWING ──[mouseup, area < 5x5px]──> READY  (reset, too small)
DRAWING ──[ESC]──> CANCELLED
DRAWN ──[mousedown on handle]──> RESIZING
DRAWN ──[mousedown inside selection]──> MOVING
DRAWN ──[mousedown outside selection]──> DRAWING  (redraw from scratch)
DRAWN ──[Enter / double-click inside]──> CONFIRMED
DRAWN ──[ESC]──> CANCELLED
RESIZING ──[mouseup]──> DRAWN
MOVING ──[mouseup]──> DRAWN
```

### State Machine Diagram

```
                    trigger
    ┌──────┐  capture   ┌───────┐
    │ IDLE │───────────>│ READY │<────────────────┐
    └──────┘            └───┬───┘                 │
        ^                   │ mousedown           │ mouseup
        │                   v                     │ (area < 5x5)
        │              ┌─────────┐                │
        │              │ DRAWING │────────────────┘
        │              └────┬────┘
        │                   │ mouseup (area >= 5x5)
        │                   v
        │              ┌─────────┐
        │         ┌───>│  DRAWN  │<───┐
        │         │    └─┬──┬──┬─┘    │
        │         │      │  │  │      │
        │  mouseup│      │  │  │      │mouseup
        │    ┌────┘      │  │  │      └────┐
        │    │  handle   │  │  │  inside   │
        │    │  drag     │  │  │  drag     │
        │ ┌──┴─────┐    │  │  │  ┌────────┴─┐
        │ │RESIZING│    │  │  │  │  MOVING   │
        │ └────────┘    │  │  │  └───────────┘
        │               │  │  │
        │    Enter/     │  │  │ mousedown
        │    dblclick   │  │  │ outside
        │               v  │  v
        │        ┌──────────┐  ┌──────────┐
        │        │CONFIRMED │  │ DRAWING  │
        │        └─────┬────┘  └──────────┘
        │              │
        │              │ (proceed to crop)
        └──────────────┘

        ESC from any state ──> CANCELLED ──> IDLE
```

---

## 2. State Behaviors

### 2.1 IDLE

- Main application window is visible.
- No overlay, no selection UI.
- User triggers capture via button click or keyboard shortcut (Cmd+N).

**On trigger:**
1. Hide main window.
2. Wait ~200ms for window hide animation.
3. Capture fullscreen screenshot (freeze screen content).
4. Resize selector window to cover full screen.
5. Display screenshot as background image in selector window.
6. Apply dark overlay on top.
7. Transition to READY.

### 2.2 READY

- Fullscreen selector window visible.
- Screenshot displayed as frozen background.
- Dark semi-transparent overlay (rgba(0,0,0,0.3)) covers everything.
- Crosshair cursor everywhere.
- Center instruction text: "Drag to select area | ESC to cancel".
- Optional: Show mouse coordinates near cursor.

**Cursor:** `crosshair`

**Events:**
- `mousedown` -> record start position, transition to DRAWING.
- `ESC` -> transition to CANCELLED.

### 2.3 DRAWING

- User is actively dragging to define the selection rectangle.
- Selection rectangle rendered in real-time from start point to current mouse position.
- The area inside the selection is clear (no dark overlay) to preview the captured content.
- The area outside the selection has the dark overlay.
- A blue/white border (2px) outlines the selection.
- Size indicator label shows current dimensions (in physical pixels) near the selection.
  - Positioned above the selection (or below if selection is near the top edge).
- Holding Space while drawing enters a temporary "translate origin" mode where moving the mouse repositions the start point (shifts the entire rectangle) without changing the size.

**Cursor:** `crosshair`

**Events:**
- `mousemove` -> update current position, re-render selection rectangle.
- `mouseup` (selection >= 5x5 physical px) -> transition to DRAWN.
- `mouseup` (selection < 5x5 physical px) -> reset positions, transition to READY.
- `ESC` -> transition to CANCELLED.
- `Space` (held) -> while Space is down, mousemove shifts the start point by the same delta, effectively translating the whole rectangle.

### 2.4 DRAWN

This is the key state that the current implementation is missing. After the user finishes drawing, the selection stays visible and interactive.

- Selection rectangle fixed on screen.
- 8 resize handles displayed:
  - 4 corner handles (top-left, top-right, bottom-left, bottom-right): 8x8px white squares with 1px gray border.
  - 4 edge midpoint handles (top-center, right-center, bottom-center, left-center): 6x8px or 8x6px white rectangles.
- Selection border is solid, 1-2px, bright color (blue #3B82F6 or white).
- Area inside selection: clear (no overlay).
- Area outside selection: dark overlay.
- Size indicator displayed (e.g., "1920 x 1080") above or below the selection.
- Action hint bar near the selection bottom or screen bottom:
  "Enter to confirm | ESC to cancel | Drag to move | Drag handles to resize"

**Cursor zones:**
- Inside selection (not on a handle): `move`
- On corner handles: `nwse-resize`, `nesw-resize` (depending on corner)
- On top/bottom edge handles: `ns-resize`
- On left/right edge handles: `ew-resize`
- Outside selection: `crosshair`

**Events:**
- `mousedown` on a resize handle -> record which handle, transition to RESIZING.
- `mousedown` inside selection (not on handle) -> transition to MOVING.
- `mousedown` outside selection -> reset and transition to DRAWING (redraw new selection).
- `Enter` -> transition to CONFIRMED.
- Double-click inside selection -> transition to CONFIRMED.
- `ESC` -> transition to CANCELLED.
- Arrow keys -> nudge selection by 1px (or 10px with Shift held).

### 2.5 RESIZING

- User is dragging a resize handle to change the selection dimensions.
- The opposite corner/edge remains anchored.
- Selection updates in real-time following the mouse.
- Constrain: selection stays within screen bounds (0, 0, screenWidth, screenHeight).
- Minimum selection size: 5x5 physical px.
- Size indicator updates in real-time.

**Handle behaviors:**
- Corner handles: freely resize both width and height.
- Edge handles: constrain to one axis (top/bottom = vertical only, left/right = horizontal only).
- Holding Shift while resizing a corner handle maintains aspect ratio.

**Cursor:** Same resize cursor as the handle that was grabbed.

**Events:**
- `mousemove` -> update the selection based on the active handle and mouse position.
- `mouseup` -> transition to DRAWN.

### 2.6 MOVING

- User is dragging inside the selection to reposition it.
- The selection size remains constant; only position changes.
- Constrain: the selection rectangle stays within screen bounds.
- Size indicator updates position along with the selection.

**Cursor:** `move` (or `grabbing` for a more tactile feel)

**Events:**
- `mousemove` -> update selection position (x, y) by the mouse delta.
- `mouseup` -> transition to DRAWN.

### 2.7 CONFIRMED

Terminal state. The selection is finalized.

1. Read the final selection rectangle (x, y, width, height) in physical pixels.
2. Emit `region-selected` event to the main window with the region data.
3. Hide selector window.
4. Main window receives the event, crops the cached screenshot, and displays result.
5. Clean up state; transition back to IDLE.

### 2.8 CANCELLED

Terminal state. The selection is abandoned.

1. Emit `selection-cancelled` event to the main window.
2. Hide selector window.
3. Main window clears cached screenshot and restores itself.
4. Clean up state; transition back to IDLE.

---

## 3. Keyboard Shortcuts

| Key              | State(s)      | Action                                              |
|------------------|---------------|-----------------------------------------------------|
| `ESC`            | Any (READY, DRAWING, DRAWN) | Cancel selection, return to IDLE.      |
| `Enter`          | DRAWN         | Confirm selection.                                  |
| `Space` (hold)   | DRAWING       | Translate the drawing origin (move entire rect).    |
| `Arrow Keys`     | DRAWN         | Nudge selection position by 1px.                    |
| `Shift + Arrow`  | DRAWN         | Nudge selection position by 10px.                   |
| `Shift` (hold)   | RESIZING (corner) | Maintain aspect ratio while resizing.          |
| `Cmd+A`          | READY, DRAWN  | Select entire screen.                               |

---

## 4. Mouse Cursor Map

| Context                           | Cursor Style      |
|-----------------------------------|--------------------|
| READY: anywhere                   | `crosshair`        |
| DRAWING: anywhere                 | `crosshair`        |
| DRAWN: inside selection           | `move`             |
| DRAWN: outside selection          | `crosshair`        |
| DRAWN: top-left handle            | `nwse-resize`      |
| DRAWN: top-right handle           | `nesw-resize`      |
| DRAWN: bottom-left handle         | `nesw-resize`      |
| DRAWN: bottom-right handle        | `nwse-resize`      |
| DRAWN: top-center handle          | `ns-resize`        |
| DRAWN: bottom-center handle       | `ns-resize`        |
| DRAWN: left-center handle         | `ew-resize`        |
| DRAWN: right-center handle        | `ew-resize`        |
| RESIZING: any handle              | Same as the handle  |
| MOVING: inside selection          | `move` / `grabbing` |

---

## 5. Visual Specifications

### Overlay
- Color: `rgba(0, 0, 0, 0.3)`
- Applied via `box-shadow: 0 0 0 9999px rgba(0,0,0,0.3)` on the selection div (current approach works well).

### Selection Border
- Color: `#3B82F6` (Tailwind blue-500) or white
- Width: 2px
- Style: solid

### Resize Handles
- Corner handles: 8x8px white squares, 1px solid `#9CA3AF` (gray-400) border
- Edge handles: 6x8px (horizontal) or 8x6px (vertical) white rectangles, same border
- Positioned centered on the selection edge/corner
- z-index above the selection border

### Size Indicator
- Background: `rgba(0, 0, 0, 0.8)`
- Text: white, 12px, monospace preferred for alignment
- Padding: 4px 8px
- Border radius: 4px
- Content format: `{width} x {height}` (physical pixels)
- Position: 4-8px above the top-left of selection; if top edge < 36px from screen top, show below the bottom-left instead.

### Action Hint Bar (optional but recommended)
- Semi-transparent dark background bar
- White text, 12px
- Positioned 8px below the selection or at the bottom of the screen
- Shows context-sensitive hints based on current state

---

## 6. Implementation Architecture for Tauri + React

### 6.1 Current Problem Analysis

The current `SelectorWindow.tsx` has two critical issues:

1. **No DRAWN state**: On `mouseup`, the code immediately emits `region-selected` and hides the window. There is no intermediate state where the user can review or adjust the selection.

2. **Latency**: The flow involves hiding main window -> waiting 300ms -> capturing screenshot -> resizing selector -> showing selector -> sending event -> loading base64 image. This chain introduces visible delay before the user can start drawing.

### 6.2 Recommended State Management

Use a single state variable for the state machine instead of separate booleans:

```typescript
type SelectionState = 'ready' | 'drawing' | 'drawn' | 'resizing' | 'moving';

interface SelectionStore {
  state: SelectionState;
  // The selection rectangle in physical pixels
  selection: { x: number; y: number; width: number; height: number } | null;
  // Which handle is being dragged (for RESIZING state)
  activeHandle: HandlePosition | null;
  // The anchor point during resize (the opposite corner/edge)
  resizeAnchor: { x: number; y: number } | null;
  // The mouse offset from selection origin (for MOVING state)
  moveOffset: { x: number; y: number } | null;
  // Screen dimensions in physical pixels
  screenSize: { width: number; height: number };
}
```

### 6.3 Handle Hit-Testing

For the DRAWN state, compute hit zones for the 8 handles:

```typescript
type HandlePosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

function getHandleAtPoint(
  x: number, y: number,
  selection: Region,
  handleSize: number = 8,
  hitPadding: number = 4  // extra hit area
): HandlePosition | null {
  // Check each of the 8 handle rects
  // Return the matching handle or null
}

function getHitZone(
  x: number, y: number,
  selection: Region
): 'handle' | 'inside' | 'outside' {
  // 1. Check handles first (they take priority)
  // 2. Check if inside selection rect
  // 3. Otherwise outside
}
```

### 6.4 Mouse Event Handling (unified)

Instead of separate `onMouseDown`, `onMouseMove`, `onMouseUp` handlers that check `isDragging`, implement a unified event handler that dispatches based on the current state:

```typescript
function handleMouseDown(e: React.MouseEvent) {
  const physX = e.clientX * devicePixelRatio;
  const physY = e.clientY * devicePixelRatio;

  switch (state) {
    case 'ready':
      // Start drawing
      startDrawing(physX, physY);
      break;
    case 'drawn': {
      const handle = getHandleAtPoint(physX, physY, selection);
      if (handle) {
        startResizing(handle, physX, physY);
      } else if (isInsideSelection(physX, physY, selection)) {
        startMoving(physX, physY);
      } else {
        // Click outside: start new drawing
        startDrawing(physX, physY);
      }
      break;
    }
  }
}

function handleMouseMove(e: React.MouseEvent) {
  const physX = e.clientX * devicePixelRatio;
  const physY = e.clientY * devicePixelRatio;

  switch (state) {
    case 'drawing':
      updateDrawing(physX, physY);
      break;
    case 'resizing':
      updateResize(physX, physY);
      break;
    case 'moving':
      updateMove(physX, physY);
      break;
    case 'drawn':
      // Only update cursor style
      updateCursor(physX, physY);
      break;
  }
}

function handleMouseUp() {
  switch (state) {
    case 'drawing':
      if (selectionIsBigEnough()) {
        setState('drawn'); // KEY: do NOT emit event here
      } else {
        resetSelection();
        setState('ready');
      }
      break;
    case 'resizing':
    case 'moving':
      setState('drawn');
      break;
  }
}
```

### 6.5 Rendering the Handles

Render 8 handle elements positioned around the selection in the DRAWN state:

```typescript
function renderHandles(selection: Region, dpr: number) {
  const handles: { position: HandlePosition; x: number; y: number; cursor: string }[] = [
    { position: 'top-left',      x: sel.x,                    y: sel.y,                     cursor: 'nwse-resize' },
    { position: 'top-center',    x: sel.x + sel.width / 2,    y: sel.y,                     cursor: 'ns-resize'   },
    { position: 'top-right',     x: sel.x + sel.width,        y: sel.y,                     cursor: 'nesw-resize' },
    { position: 'middle-left',   x: sel.x,                    y: sel.y + sel.height / 2,    cursor: 'ew-resize'   },
    { position: 'middle-right',  x: sel.x + sel.width,        y: sel.y + sel.height / 2,    cursor: 'ew-resize'   },
    { position: 'bottom-left',   x: sel.x,                    y: sel.y + sel.height,         cursor: 'nesw-resize' },
    { position: 'bottom-center', x: sel.x + sel.width / 2,    y: sel.y + sel.height,         cursor: 'ns-resize'   },
    { position: 'bottom-right',  x: sel.x + sel.width,        y: sel.y + sel.height,         cursor: 'nwse-resize' },
  ];

  // Convert to CSS pixels and render as positioned divs
  return handles.map(h => (
    <div
      key={h.position}
      style={{
        position: 'absolute',
        left: (h.x / dpr) - 4,
        top: (h.y / dpr) - 4,
        width: 8,
        height: 8,
        background: 'white',
        border: '1px solid #9CA3AF',
        cursor: h.cursor,
        zIndex: 20,
      }}
    />
  ));
}
```

### 6.6 Reduce Startup Latency

The current 300ms wait + base64 transfer adds delay. Recommended optimizations:

1. **Pre-capture on trigger**: Instead of waiting for selector to open, capture immediately after hiding main window.
2. **Reduce hide-wait**: Use 150ms instead of 300ms (test on target macOS version).
3. **Use shared memory or file path**: Instead of transferring large base64 strings via events, write the screenshot to a temp file and pass the file path. The selector window reads from the file. This avoids base64 encoding/decoding overhead.
4. **Show selector immediately with overlay**: Show the dark overlay immediately when triggered, even before the screenshot is loaded. Once the screenshot arrives, set it as background. This makes the UI feel more responsive.

### 6.7 Coordinate System

All internal selection coordinates should be in **physical pixels** (matching the screenshot resolution). Only convert to CSS pixels (divide by `window.devicePixelRatio`) for rendering DOM elements. This avoids rounding issues and ensures the crop region aligns exactly with the captured screenshot.

### 6.8 Event Flow (Updated)

```
[User clicks "New Capture" or presses Cmd+N]
  1. Main window hides
  2. Wait ~150ms
  3. Capture fullscreen, save to Rust cache (and write to temp file)
  4. Resize + show selector window
  5. Selector loads screenshot from cache/file
  6. State -> READY

[User draws selection]
  7. State -> DRAWING -> DRAWN

[User adjusts selection (optional)]
  8. DRAWN -> RESIZING/MOVING -> DRAWN (repeat as needed)

[User confirms]
  9. State -> CONFIRMED
  10. Emit "region-selected" with final region
  11. Selector hides
  12. Main window crops screenshot with region and displays result
  13. State -> IDLE
```

---

## 7. Edge Cases and Constraints

### Screen Boundary Clamping
- During DRAWING: clamp the current mouse position to screen bounds.
- During MOVING: clamp so the selection rectangle never goes outside the screen.
- During RESIZING: clamp the handle position to screen bounds; enforce minimum 5x5px.

### Multi-Monitor Support
- The selector window covers only the primary monitor (simplest approach).
- If multi-monitor is needed later, create one selector window per monitor, each covering its respective screen. The captured screenshot corresponds to the monitor where the capture was triggered.

### HiDPI / Retina
- `window.devicePixelRatio` is 2 on Retina Macs.
- All mouse events report in CSS pixels; multiply by DPR for physical pixels.
- The screenshot captured by xcap is already in physical pixels.
- The selection coordinates emitted to the main window must be in physical pixels.

### Minimum Selection Size
- Threshold: 5x5 physical pixels (2.5x2.5 CSS pixels on Retina).
- If the user releases the mouse and the selection is smaller than this, reset to READY.

### Transparent Window Considerations (Tauri)
- The selector window uses `transparent: true` and `decorations: false`.
- On macOS, `macOSPrivateApi: true` is required for transparent windows.
- The window must be `alwaysOnTop: true` to stay above the desktop.
- Mouse events on transparent areas may not be captured. The background must have some non-transparent content (the screenshot image or the overlay) to receive mouse events.

---

## 8. Comparison with Current Implementation

| Aspect                     | Current                              | Required                           |
|----------------------------|--------------------------------------|------------------------------------|
| States                     | 2 (idle/dragging)                    | 6 (ready/drawing/drawn/resizing/moving + idle) |
| After mouseup              | Immediately emits and hides          | Stays in DRAWN for adjustment      |
| Resize handles             | None                                 | 8 handles (4 corners + 4 edges)    |
| Move selection             | Not possible                         | Drag inside selection to move      |
| Confirm action             | Automatic on mouseup                 | Explicit Enter / double-click      |
| Redraw selection           | Not possible after mouseup           | Click outside to start new draw    |
| Keyboard nudge             | None                                 | Arrow keys move selection          |
| Cursor feedback            | Always crosshair                     | Context-sensitive per zone         |
| Space to translate         | None                                 | Holds origin, translates rect      |
| Startup latency mitigation | 300ms wait + base64 transfer         | Reduce wait + optimize transfer    |

---

## 9. Summary of Required Changes

### SelectorWindow.tsx (complete rewrite)
1. Replace boolean `isDragging` with proper state machine (`SelectionState`).
2. Add DRAWN state rendering with 8 resize handles.
3. Add hit-testing logic for handles vs. inside vs. outside selection.
4. Add unified mouse event handling that dispatches by state.
5. Add keyboard event handling (Enter to confirm, arrow keys to nudge).
6. Add double-click to confirm.
7. Add dynamic cursor management based on mouse position and state.

### captureStore.ts
1. Add `selectionState` field to the store (or keep state local to SelectorWindow).
2. The CONFIRMED transition should be the only point that emits `region-selected`.

### App.tsx
1. The `handleStartCapture` flow may benefit from optimizations (reduce 300ms wait).
2. No other changes needed; the event contract stays the same.

### types/capture.ts
1. Add `HandlePosition` type.
2. Optionally add `SelectionState` type if stored globally.

---

*Document version: 1.0*
*Based on research of: macOS native screenshot, CleanShot X, Shottr, Snipaste*
*Target platform: macOS (Tauri v2 + React 19)*
