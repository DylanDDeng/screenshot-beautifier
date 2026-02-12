use anyhow::Result;
use image::ImageEncoder;
use image::RgbaImage;
use std::path::Path;

pub fn save_png(image: &RgbaImage, path: &Path) -> Result<()> {
    image.save_with_format(path, image::ImageFormat::Png)?;
    Ok(())
}

pub fn save_jpeg(image: &RgbaImage, path: &Path, quality: u8) -> Result<()> {
    let rgb = image::DynamicImage::ImageRgba8(image.clone()).to_rgb8();
    let mut writer = std::io::BufWriter::new(std::fs::File::create(path)?);
    let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut writer, quality);
    encoder.write_image(
        rgb.as_raw(),
        rgb.width(),
        rgb.height(),
        image::ExtendedColorType::Rgb8,
    )?;
    Ok(())
}

pub fn encode_png_base64(image: &RgbaImage) -> Result<String> {
    let mut buf = Vec::new();
    let encoder = image::codecs::png::PngEncoder::new(&mut buf);
    encoder.write_image(
        image.as_raw(),
        image.width(),
        image.height(),
        image::ExtendedColorType::Rgba8,
    )?;
    Ok(base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        &buf,
    ))
}

/// Fast PNG encoding with minimal compression for speed (used for screenshot cache).
pub fn encode_png_base64_fast(image: &RgbaImage) -> Result<String> {
    let mut buf = Vec::with_capacity(image.as_raw().len());
    let encoder = image::codecs::png::PngEncoder::new_with_quality(
        &mut buf,
        image::codecs::png::CompressionType::Fast,
        image::codecs::png::FilterType::Sub,
    );
    encoder.write_image(
        image.as_raw(),
        image.width(),
        image.height(),
        image::ExtendedColorType::Rgba8,
    )?;
    Ok(base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        &buf,
    ))
}
