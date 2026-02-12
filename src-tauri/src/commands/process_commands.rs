use crate::export::file::encode_png_base64;
use crate::processing::beautify::{apply_beautify, BeautifyOptions};
use crate::processing::blur;
use crate::utils::decode_base64_image;

#[tauri::command]
pub async fn beautify_image(image_base64: String, options: BeautifyOptions) -> Result<String, String> {
    let img = decode_base64_image(&image_base64)?;
    let result = apply_beautify(&img, &options).map_err(|e| e.to_string())?;
    encode_png_base64(&result).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn blur_region(
    image_base64: String,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
    block_size: u32,
) -> Result<String, String> {
    let img = decode_base64_image(&image_base64)?;
    let result = blur::apply_mosaic(&img, x, y, width, height, block_size).map_err(|e| e.to_string())?;
    encode_png_base64(&result).map_err(|e| e.to_string())
}
