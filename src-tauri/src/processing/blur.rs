use anyhow::Result;
use image::RgbaImage;

#[allow(dead_code)]
pub fn apply_gaussian_blur(source: &RgbaImage, sigma: f32) -> Result<RgbaImage> {
    let blurred = imageproc::filter::gaussian_blur_f32(source, sigma);
    Ok(blurred)
}

pub fn apply_mosaic(source: &RgbaImage, x: u32, y: u32, w: u32, h: u32, block_size: u32) -> Result<RgbaImage> {
    let mut output = source.clone();
    let block = block_size.max(1);

    let end_x = (x + w).min(source.width());
    let end_y = (y + h).min(source.height());

    let mut by = y;
    while by < end_y {
        let mut bx = x;
        while bx < end_x {
            let bw = block.min(end_x - bx);
            let bh = block.min(end_y - by);

            // Average color in block
            let mut r_sum: u64 = 0;
            let mut g_sum: u64 = 0;
            let mut b_sum: u64 = 0;
            let mut a_sum: u64 = 0;
            let mut count: u64 = 0;

            for dy in 0..bh {
                for dx in 0..bw {
                    let p = source.get_pixel(bx + dx, by + dy);
                    r_sum += p[0] as u64;
                    g_sum += p[1] as u64;
                    b_sum += p[2] as u64;
                    a_sum += p[3] as u64;
                    count += 1;
                }
            }

            if count > 0 {
                let avg = image::Rgba([
                    (r_sum / count) as u8,
                    (g_sum / count) as u8,
                    (b_sum / count) as u8,
                    (a_sum / count) as u8,
                ]);

                for dy in 0..bh {
                    for dx in 0..bw {
                        output.put_pixel(bx + dx, by + dy, avg);
                    }
                }
            }

            bx += block;
        }
        by += block;
    }

    Ok(output)
}
