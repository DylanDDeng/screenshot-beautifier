use anyhow::Result;
use image::ImageEncoder;
use image::RgbaImage;

#[allow(dead_code)]
pub fn image_to_png_bytes(image: &RgbaImage) -> Result<Vec<u8>> {
    let mut buf = Vec::new();
    let encoder = image::codecs::png::PngEncoder::new(&mut buf);
    encoder.write_image(
        image.as_raw(),
        image.width(),
        image.height(),
        image::ExtendedColorType::Rgba8,
    )?;
    Ok(buf)
}
