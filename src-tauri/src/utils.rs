pub fn decode_base64_image(b64: &str) -> Result<image::RgbaImage, String> {
    let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, b64)
        .map_err(|e| e.to_string())?;
    let img = image::load_from_memory(&bytes).map_err(|e| e.to_string())?;
    Ok(img.to_rgba8())
}
