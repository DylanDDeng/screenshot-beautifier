use anyhow::Result;
use image::RgbaImage;
use xcap::Monitor;

pub fn capture_primary_monitor() -> Result<RgbaImage> {
    let monitors = Monitor::all()?;
    let primary = monitors
        .into_iter()
        .find(|m| m.is_primary().unwrap_or(false))
        .ok_or_else(|| anyhow::anyhow!("No primary monitor found"))?;
    let img = primary.capture_image()?;
    Ok(img)
}

#[allow(dead_code)]
pub fn capture_monitor_by_index(index: usize) -> Result<RgbaImage> {
    let monitors = Monitor::all()?;
    let monitor = monitors
        .into_iter()
        .nth(index)
        .ok_or_else(|| anyhow::anyhow!("Monitor index {} not found", index))?;
    let img = monitor.capture_image()?;
    Ok(img)
}

pub fn get_primary_monitor() -> Result<Monitor> {
    let monitors = Monitor::all()?;
    monitors
        .into_iter()
        .find(|m| m.is_primary().unwrap_or(false))
        .ok_or_else(|| anyhow::anyhow!("No primary monitor found"))
}
