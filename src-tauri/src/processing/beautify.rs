use anyhow::Result;
use image::{Rgba, RgbaImage};
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct GradientStop {
    pub color: [u8; 4],
    pub position: f32,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum Background {
    #[serde(rename = "solid")]
    Solid { color: [u8; 4] },

    #[serde(rename = "linear_gradient")]
    LinearGradient {
        angle: u32,
        stops: Vec<GradientStop>,
    },

    #[serde(rename = "radial_gradient")]
    RadialGradient { stops: Vec<GradientStop> },

    #[serde(rename = "image")]
    Image {
        base64: String,
        blur: u32,
        scale: String,
    },
}

impl Default for Background {
    fn default() -> Self {
        Self::Solid {
            color: [245, 245, 245, 255],
        }
    }
}

#[derive(Debug, Deserialize, Clone)]
pub struct BeautifyOptions {
    pub shadow_blur: f32,
    pub shadow_offset_x: f32,
    pub shadow_offset_y: f32,
    pub shadow_color: [u8; 4],
    pub corner_radius_percent: f32,
    pub background: Background,
    pub padding: u32,
}

impl Default for BeautifyOptions {
    fn default() -> Self {
        Self {
            shadow_blur: 20.0,
            shadow_offset_x: 0.0,
            shadow_offset_y: 10.0,
            shadow_color: [0, 0, 0, 80],
            corner_radius_percent: 3.0,
            background: Background::default(),
            padding: 60,
        }
    }
}

pub fn apply_beautify(source: &RgbaImage, options: &BeautifyOptions) -> Result<RgbaImage> {
    let src_w = source.width();
    let src_h = source.height();
    let padding = options.padding;

    let shadow_extra = (options.shadow_blur * 2.0) as u32;
    let out_w = src_w + padding * 2 + shadow_extra;
    let out_h = src_h + padding * 2 + shadow_extra;

    let mut output = RgbaImage::new(out_w, out_h);

    // Draw background
    draw_background(&mut output, &options.background, out_w, out_h)?;

    let img_x = padding + shadow_extra / 2;
    let img_y = padding + shadow_extra / 2;

    // Calculate corner radius
    let shorter_edge = src_w.min(src_h) as f32;
    let corner_radius = shorter_edge * options.corner_radius_percent / 100.0;

    // Draw shadow
    if options.shadow_blur > 0.0 {
        draw_shadow(
            &mut output,
            img_x as i32 + options.shadow_offset_x as i32,
            img_y as i32 + options.shadow_offset_y as i32,
            src_w,
            src_h,
            options.shadow_blur,
            &options.shadow_color,
        );
    }

    // Draw the source image with rounded corners
    draw_rounded_image(&mut output, source, img_x, img_y, corner_radius);

    Ok(output)
}

fn draw_background(
    output: &mut RgbaImage,
    background: &Background,
    width: u32,
    height: u32,
) -> Result<()> {
    match background {
        Background::Solid { color } => {
            let pixel = Rgba(*color);
            for y in 0..height {
                for x in 0..width {
                    output.put_pixel(x, y, pixel);
                }
            }
        }

        Background::LinearGradient { angle, stops } => {
            let angle_rad = (*angle as f32 - 90.0).to_radians();
            let center_x = width as f32 / 2.0;
            let center_y = height as f32 / 2.0;
            let length = (width as f32 * width as f32 + height as f32 * height as f32).sqrt() / 2.0;

            let x1 = center_x - angle_rad.cos() * length;
            let y1 = center_y - angle_rad.sin() * length;
            let x2 = center_x + angle_rad.cos() * length;
            let y2 = center_y + angle_rad.sin() * length;

            for y in 0..height {
                for x in 0..width {
                    let t = calculate_linear_gradient_position(x as f32, y as f32, x1, y1, x2, y2);
                    let color = interpolate_gradient(stops, t);
                    output.put_pixel(x, y, color);
                }
            }
        }

        Background::RadialGradient { stops } => {
            let center_x = width as f32 / 2.0;
            let center_y = height as f32 / 2.0;
            let max_radius = (width as f32).max(height as f32) / 2.0;

            for y in 0..height {
                for x in 0..width {
                    let dx = x as f32 - center_x;
                    let dy = y as f32 - center_y;
                    let dist = (dx * dx + dy * dy).sqrt();
                    let t = (dist / max_radius).min(1.0);
                    let color = interpolate_gradient(stops, t);
                    output.put_pixel(x, y, color);
                }
            }
        }

        Background::Image {
            base64,
            blur,
            scale,
        } => {
            // Decode base64 image
            let image_data = base64_decode(base64)?;
            let bg_img = image::load_from_memory(&image_data)?;
            let bg_rgba = bg_img.to_rgba8();

            let bg_w = bg_rgba.width();
            let bg_h = bg_rgba.height();

            // Calculate draw dimensions based on scale mode
            let (draw_w, draw_h, offset_x, offset_y) = match scale.as_str() {
                "fill" => (width, height, 0.0, 0.0),
                "fit" => {
                    let img_ratio = bg_w as f32 / bg_h as f32;
                    let canvas_ratio = width as f32 / height as f32;
                    if img_ratio > canvas_ratio {
                        let h = width as f32 / img_ratio;
                        (width, h as u32, 0.0, (height as f32 - h) / 2.0)
                    } else {
                        let w = height as f32 * img_ratio;
                        (w as u32, height, (width as f32 - w) / 2.0, 0.0)
                    }
                }
                "cover" | _ => {
                    let img_ratio = bg_w as f32 / bg_h as f32;
                    let canvas_ratio = width as f32 / height as f32;
                    if img_ratio > canvas_ratio {
                        let w = height as f32 * img_ratio;
                        (w as u32, height, (width as f32 - w) / 2.0, 0.0)
                    } else {
                        let h = width as f32 / img_ratio;
                        (width, h as u32, 0.0, (height as f32 - h) / 2.0)
                    }
                }
            };

            // Draw scaled background image
            for y in 0..height {
                for x in 0..width {
                    let src_x = ((x as f32 - offset_x) / draw_w as f32 * bg_w as f32) as i32;
                    let src_y = ((y as f32 - offset_y) / draw_h as f32 * bg_h as f32) as i32;

                    if src_x >= 0 && src_x < bg_w as i32 && src_y >= 0 && src_y < bg_h as i32 {
                        let pixel = bg_rgba.get_pixel(src_x as u32, src_y as u32);

                        // Apply blur if needed
                        if *blur > 0 {
                            let blurred = apply_blur_at(
                                &bg_rgba,
                                src_x as u32,
                                src_y as u32,
                                *blur,
                                bg_w,
                                bg_h,
                            );
                            output.put_pixel(x, y, blurred);
                        } else {
                            output.put_pixel(x, y, *pixel);
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

fn calculate_linear_gradient_position(x: f32, y: f32, x1: f32, y1: f32, x2: f32, y2: f32) -> f32 {
    let dx = x2 - x1;
    let dy = y2 - y1;
    let length_sq = dx * dx + dy * dy;

    if length_sq == 0.0 {
        return 0.0;
    }

    let t = ((x - x1) * dx + (y - y1) * dy) / length_sq;
    t.max(0.0).min(1.0)
}

fn interpolate_gradient(stops: &[GradientStop], t: f32) -> Rgba<u8> {
    if stops.is_empty() {
        return Rgba([255, 255, 255, 255]);
    }

    if stops.len() == 1 {
        return Rgba(stops[0].color);
    }

    // Find the two stops to interpolate between
    let mut lower = &stops[0];
    let mut upper = &stops[stops.len() - 1];

    for i in 0..stops.len() - 1 {
        if t >= stops[i].position && t <= stops[i + 1].position {
            lower = &stops[i];
            upper = &stops[i + 1];
            break;
        }
    }

    // Calculate interpolation factor
    let range = upper.position - lower.position;
    let factor = if range == 0.0 {
        0.0
    } else {
        (t - lower.position) / range
    };

    // Interpolate colors
    let r =
        (lower.color[0] as f32 + (upper.color[0] as f32 - lower.color[0] as f32) * factor) as u8;
    let g =
        (lower.color[1] as f32 + (upper.color[1] as f32 - lower.color[1] as f32) * factor) as u8;
    let b =
        (lower.color[2] as f32 + (upper.color[2] as f32 - lower.color[2] as f32) * factor) as u8;
    let a =
        (lower.color[3] as f32 + (upper.color[3] as f32 - lower.color[3] as f32) * factor) as u8;

    Rgba([r, g, b, a])
}

fn apply_blur_at(img: &RgbaImage, x: u32, y: u32, radius: u32, w: u32, h: u32) -> Rgba<u8> {
    let r = radius as i32;
    let mut sum_r = 0u32;
    let mut sum_g = 0u32;
    let mut sum_b = 0u32;
    let mut sum_a = 0u32;
    let mut count = 0u32;

    for dy in -r..=r {
        for dx in -r..=r {
            let px = x as i32 + dx;
            let py = y as i32 + dy;

            if px >= 0 && px < w as i32 && py >= 0 && py < h as i32 {
                let pixel = img.get_pixel(px as u32, py as u32);
                sum_r += pixel[0] as u32;
                sum_g += pixel[1] as u32;
                sum_b += pixel[2] as u32;
                sum_a += pixel[3] as u32;
                count += 1;
            }
        }
    }

    if count == 0 {
        return *img.get_pixel(x, y);
    }

    Rgba([
        (sum_r / count) as u8,
        (sum_g / count) as u8,
        (sum_b / count) as u8,
        (sum_a / count) as u8,
    ])
}

fn base64_decode(input: &str) -> Result<Vec<u8>> {
    // Remove data URL prefix if present
    let data = if input.starts_with("data:") {
        let comma_pos = input
            .find(',')
            .ok_or_else(|| anyhow::anyhow!("Invalid data URL"))?;
        &input[comma_pos + 1..]
    } else {
        input
    };

    use base64::{engine::general_purpose, Engine as _};
    Ok(general_purpose::STANDARD.decode(data)?)
}

fn draw_shadow(canvas: &mut RgbaImage, x: i32, y: i32, w: u32, h: u32, blur: f32, color: &[u8; 4]) {
    let blur_radius = blur as i32;
    if blur_radius <= 0 {
        return;
    }

    let canvas_w = canvas.width() as i32;
    let canvas_h = canvas.height() as i32;

    for dy in -blur_radius..=(h as i32 + blur_radius) {
        for dx in -blur_radius..=(w as i32 + blur_radius) {
            let px = x + dx;
            let py = y + dy;

            if px < 0 || py < 0 || px >= canvas_w || py >= canvas_h {
                continue;
            }

            let dist_x = if dx < 0 {
                -dx as f32
            } else if dx >= w as i32 {
                (dx - w as i32 + 1) as f32
            } else {
                0.0
            };
            let dist_y = if dy < 0 {
                -dy as f32
            } else if dy >= h as i32 {
                (dy - h as i32 + 1) as f32
            } else {
                0.0
            };
            let dist = (dist_x * dist_x + dist_y * dist_y).sqrt();

            if dist > blur {
                continue;
            }

            let alpha = if dist <= 0.0 {
                color[3] as f32
            } else {
                let t = 1.0 - dist / blur;
                color[3] as f32 * t * t
            };

            let existing = canvas.get_pixel(px as u32, py as u32);
            let blended = blend_pixel(existing, &Rgba([color[0], color[1], color[2], alpha as u8]));
            canvas.put_pixel(px as u32, py as u32, blended);
        }
    }
}

fn draw_rounded_image(canvas: &mut RgbaImage, source: &RgbaImage, x: u32, y: u32, radius: f32) {
    let w = source.width();
    let h = source.height();

    for sy in 0..h {
        for sx in 0..w {
            if !is_inside_rounded_rect(sx as f32, sy as f32, w as f32, h as f32, radius) {
                continue;
            }

            let px = x + sx;
            let py = y + sy;

            if px < canvas.width() && py < canvas.height() {
                let src_pixel = source.get_pixel(sx, sy);
                let existing = canvas.get_pixel(px, py);
                let blended = blend_pixel(existing, src_pixel);
                canvas.put_pixel(px, py, blended);
            }
        }
    }
}

fn is_inside_rounded_rect(x: f32, y: f32, w: f32, h: f32, radius: f32) -> bool {
    let r = radius.min(w / 2.0).min(h / 2.0);

    if x < r && y < r {
        let dx = r - x;
        let dy = r - y;
        return dx * dx + dy * dy <= r * r;
    }
    if x > w - r && y < r {
        let dx = x - (w - r);
        let dy = r - y;
        return dx * dx + dy * dy <= r * r;
    }
    if x < r && y > h - r {
        let dx = r - x;
        let dy = y - (h - r);
        return dx * dx + dy * dy <= r * r;
    }
    if x > w - r && y > h - r {
        let dx = x - (w - r);
        let dy = y - (h - r);
        return dx * dx + dy * dy <= r * r;
    }

    true
}

fn blend_pixel(bg: &Rgba<u8>, fg: &Rgba<u8>) -> Rgba<u8> {
    let fg_a = fg[3] as f32 / 255.0;
    let bg_a = bg[3] as f32 / 255.0;
    let out_a = fg_a + bg_a * (1.0 - fg_a);

    if out_a == 0.0 {
        return Rgba([0, 0, 0, 0]);
    }

    let r = (fg[0] as f32 * fg_a + bg[0] as f32 * bg_a * (1.0 - fg_a)) / out_a;
    let g = (fg[1] as f32 * fg_a + bg[1] as f32 * bg_a * (1.0 - fg_a)) / out_a;
    let b = (fg[2] as f32 * fg_a + bg[2] as f32 * bg_a * (1.0 - fg_a)) / out_a;

    Rgba([r as u8, g as u8, b as u8, (out_a * 255.0) as u8])
}
