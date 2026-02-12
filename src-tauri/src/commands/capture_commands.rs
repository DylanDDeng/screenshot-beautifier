use crate::capture::{permissions, region, screen, window};
use crate::export::file::{encode_png_base64, encode_png_base64_fast};
use base64::Engine;
use image::GenericImageView;
use std::sync::Mutex;

static SCREENSHOT_CACHE: Mutex<Option<String>> = Mutex::new(None);

#[tauri::command]
pub async fn capture_fullscreen() -> Result<String, String> {
    let img = screen::capture_primary_monitor().map_err(|e| e.to_string())?;
    let b64 = encode_png_base64(&img).map_err(|e| e.to_string())?;
    // Cache for cross-window access
    if let Ok(mut cache) = SCREENSHOT_CACHE.lock() {
        *cache = Some(b64.clone());
    }
    Ok(b64)
}

/// Capture fullscreen and cache only — does not return the base64 to the caller.
/// This avoids transferring ~30MB+ over IPC to the main window.
#[tauri::command]
pub async fn capture_and_cache() -> Result<(), String> {
    let img = screen::capture_primary_monitor().map_err(|e| e.to_string())?;
    let b64 = encode_png_base64_fast(&img).map_err(|e| e.to_string())?;
    let mut cache = SCREENSHOT_CACHE.lock().map_err(|e| e.to_string())?;
    *cache = Some(b64);
    Ok(())
}

#[tauri::command]
pub async fn get_cached_screenshot() -> Result<String, String> {
    let cache = SCREENSHOT_CACHE.lock().map_err(|e| e.to_string())?;
    cache.clone().ok_or_else(|| "No cached screenshot".to_string())
}

#[tauri::command]
pub async fn clear_screenshot_cache() -> Result<(), String> {
    let mut cache = SCREENSHOT_CACHE.lock().map_err(|e| e.to_string())?;
    *cache = None;
    Ok(())
}

#[tauri::command]
pub async fn capture_region(x: u32, y: u32, width: u32, height: u32) -> Result<String, String> {
    let img = region::capture_region(x, y, width, height).map_err(|e| e.to_string())?;
    let b64 = encode_png_base64(&img).map_err(|e| e.to_string())?;
    Ok(b64)
}

#[tauri::command]
pub async fn list_windows() -> Result<Vec<window::WindowInfo>, String> {
    window::list_windows().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn capture_window(window_id: u32) -> Result<String, String> {
    let img = window::capture_window_by_id(window_id).map_err(|e| e.to_string())?;
    let b64 = encode_png_base64(&img).map_err(|e| e.to_string())?;
    Ok(b64)
}

#[tauri::command]
pub async fn check_permissions() -> Result<permissions::PermissionStatus, String> {
    Ok(permissions::check_screen_capture_permission())
}

#[tauri::command]
pub async fn crop_image(
    image_base64: String,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
) -> Result<String, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&image_base64)
        .map_err(|e| e.to_string())?;
    let img = image::load_from_memory(&bytes).map_err(|e| e.to_string())?;
    let (img_w, img_h) = img.dimensions();

    // Clamp region to image bounds
    let x = x.min(img_w.saturating_sub(1));
    let y = y.min(img_h.saturating_sub(1));
    let width = width.min(img_w.saturating_sub(x));
    let height = height.min(img_h.saturating_sub(y));

    let cropped = img.crop_imm(x, y, width, height).to_rgba8();
    let b64 = encode_png_base64(&cropped).map_err(|e| e.to_string())?;
    Ok(b64)
}

/// Crop directly from the Rust screenshot cache, avoiding round-trip of full base64 through JS.
#[tauri::command]
pub async fn crop_cached_image(
    x: u32,
    y: u32,
    width: u32,
    height: u32,
) -> Result<String, String> {
    let cache = SCREENSHOT_CACHE.lock().map_err(|e| e.to_string())?;
    let b64_full = cache
        .as_ref()
        .ok_or_else(|| "No cached screenshot".to_string())?;

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(b64_full)
        .map_err(|e| e.to_string())?;
    let img = image::load_from_memory(&bytes).map_err(|e| e.to_string())?;
    let (img_w, img_h) = img.dimensions();

    let x = x.min(img_w.saturating_sub(1));
    let y = y.min(img_h.saturating_sub(1));
    let width = width.min(img_w.saturating_sub(x));
    let height = height.min(img_h.saturating_sub(y));

    let cropped = img.crop_imm(x, y, width, height).to_rgba8();
    let b64 = encode_png_base64(&cropped).map_err(|e| e.to_string())?;
    Ok(b64)
}
