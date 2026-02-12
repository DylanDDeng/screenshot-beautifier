use std::path::PathBuf;
use crate::utils::decode_base64_image;

#[tauri::command]
pub async fn save_image(image_base64: String, path: String, format: String, quality: Option<u8>) -> Result<(), String> {
    let img = decode_base64_image(&image_base64)?;
    let path = PathBuf::from(path);

    match format.as_str() {
        "png" => crate::export::file::save_png(&img, &path).map_err(|e| e.to_string()),
        "jpeg" | "jpg" => {
            let q = quality.unwrap_or(90);
            crate::export::file::save_jpeg(&img, &path, q).map_err(|e| e.to_string())
        }
        _ => Err(format!("Unsupported format: {}", format)),
    }
}

#[tauri::command]
pub async fn copy_image_to_clipboard(
    app: tauri::AppHandle,
    image_base64: String,
) -> Result<(), String> {
    let img = decode_base64_image(&image_base64)?;

    // Use tauri clipboard plugin to write raw RGBA image data
    use tauri_plugin_clipboard_manager::ClipboardExt;
    let image = tauri::image::Image::new_owned(
        img.as_raw().clone(),
        img.width(),
        img.height(),
    );
    app.clipboard().write_image(&image).map_err(|e| e.to_string())?;

    Ok(())
}
