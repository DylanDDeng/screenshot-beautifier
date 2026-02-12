export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowInfo {
  id: number;
  title: string;
  app_name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  is_minimized: boolean;
}

export interface PermissionStatus {
  screen_capture: boolean;
}

export type CaptureMode = "fullscreen" | "region" | "window";

export type HandlePosition = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export type SelectionState =
  | { type: "ready" }
  | { type: "drawing"; startX: number; startY: number }
  | { type: "drawn"; region: Region }
  | {
      type: "resizing";
      handle: HandlePosition;
      startRegion: Region;
      startX: number;
      startY: number;
    }
  | {
      type: "moving";
      startRegion: Region;
      startX: number;
      startY: number;
    };

export type HitZone =
  | `handle-${HandlePosition}`
  | "inside"
  | "outside";
