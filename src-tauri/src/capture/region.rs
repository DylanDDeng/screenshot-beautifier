use anyhow::Result;
use image::RgbaImage;

use super::screen::get_primary_monitor;

pub fn capture_region(x: u32, y: u32, width: u32, height: u32) -> Result<RgbaImage> {
    let monitor = get_primary_monitor()?;
    let img = monitor.capture_region(x, y, width, height)?;
    Ok(img)
}
