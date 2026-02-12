use anyhow::Result;
use image::RgbaImage;
use serde::Serialize;
use xcap::Window;

#[derive(Debug, Serialize)]
pub struct WindowInfo {
    pub id: u32,
    pub title: String,
    pub app_name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_minimized: bool,
}

pub fn list_windows() -> Result<Vec<WindowInfo>> {
    let windows = Window::all()?;
    let mut infos = Vec::new();
    for w in windows {
        let is_minimized = w.is_minimized().unwrap_or(false);
        let width = w.width().unwrap_or(0);
        let height = w.height().unwrap_or(0);
        if is_minimized || width == 0 || height == 0 {
            continue;
        }
        infos.push(WindowInfo {
            id: w.id().unwrap_or(0),
            title: w.title().unwrap_or_default(),
            app_name: w.app_name().unwrap_or_default(),
            x: w.x().unwrap_or(0),
            y: w.y().unwrap_or(0),
            width,
            height,
            is_minimized,
        });
    }
    Ok(infos)
}

pub fn capture_window_by_id(window_id: u32) -> Result<RgbaImage> {
    let windows = Window::all()?;
    let window = windows
        .into_iter()
        .find(|w| w.id().unwrap_or(0) == window_id)
        .ok_or_else(|| anyhow::anyhow!("Window with id {} not found", window_id))?;
    let img = window.capture_image()?;
    Ok(img)
}
