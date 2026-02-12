import { invoke } from "@tauri-apps/api/core";
import type { Region, WindowInfo, PermissionStatus } from "../types/capture";
import type { BeautifyOptions } from "../types/editor";

export async function captureFullscreen(): Promise<string> {
  return invoke<string>("capture_fullscreen");
}

export async function captureRegion(region: Region): Promise<string> {
  return invoke<string>("capture_region", {
    x: region.x,
    y: region.y,
    width: region.width,
    height: region.height,
  });
}

export async function listWindows(): Promise<WindowInfo[]> {
  return invoke<WindowInfo[]>("list_windows");
}

export async function captureWindow(windowId: number): Promise<string> {
  return invoke<string>("capture_window", { windowId });
}

export async function checkPermissions(): Promise<PermissionStatus> {
  return invoke<PermissionStatus>("check_permissions");
}

export async function cropImage(
  imageBase64: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string> {
  return invoke<string>("crop_image", {
    imageBase64,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  });
}

export async function getCachedScreenshot(): Promise<string> {
  return invoke<string>("get_cached_screenshot");
}

export async function clearScreenshotCache(): Promise<void> {
  return invoke("clear_screenshot_cache");
}

export async function captureAndCache(): Promise<void> {
  return invoke("capture_and_cache");
}

export async function cropCachedImage(
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string> {
  return invoke<string>("crop_cached_image", {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  });
}

export async function beautifyImage(
  imageBase64: string,
  options: BeautifyOptions
): Promise<string> {
  return invoke<string>("beautify_image", {
    imageBase64,
    options,
  });
}

export async function blurRegion(
  imageBase64: string,
  x: number,
  y: number,
  width: number,
  height: number,
  blockSize: number
): Promise<string> {
  return invoke<string>("blur_region", {
    imageBase64,
    x,
    y,
    width,
    height,
    blockSize,
  });
}

export async function saveImage(
  imageBase64: string,
  path: string,
  format: string,
  quality?: number
): Promise<void> {
  return invoke("save_image", { imageBase64, path, format, quality });
}

export async function copyImageToClipboard(
  imageBase64: string
): Promise<void> {
  return invoke("copy_image_to_clipboard", { imageBase64 });
}
