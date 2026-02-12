use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct PermissionStatus {
    pub screen_capture: bool,
}

#[cfg(target_os = "macos")]
pub fn check_screen_capture_permission() -> PermissionStatus {
    let has_permission = xcap::Monitor::all()
        .ok()
        .and_then(|monitors| monitors.into_iter().next())
        .and_then(|m| m.capture_image().ok())
        .is_some();

    PermissionStatus {
        screen_capture: has_permission,
    }
}

#[cfg(not(target_os = "macos"))]
pub fn check_screen_capture_permission() -> PermissionStatus {
    PermissionStatus {
        screen_capture: true,
    }
}
