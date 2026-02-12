mod capture;
mod commands;
mod export;
mod processing;
pub mod utils;

use commands::{capture_commands, export_commands, process_commands};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            capture_commands::capture_fullscreen,
            capture_commands::capture_region,
            capture_commands::list_windows,
            capture_commands::capture_window,
            capture_commands::check_permissions,
            capture_commands::crop_image,
            capture_commands::crop_cached_image,
            capture_commands::capture_and_cache,
            capture_commands::get_cached_screenshot,
            capture_commands::clear_screenshot_cache,
            process_commands::beautify_image,
            process_commands::blur_region,
            export_commands::save_image,
            export_commands::copy_image_to_clipboard,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    window.hide().unwrap_or_default();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { has_visible_windows, .. } = event {
                if !has_visible_windows {
                    if let Some(window) = _app.get_webview_window("main") {
                        window.show().unwrap_or_default();
                        window.set_focus().unwrap_or_default();
                    }
                }
            }
        });
}
