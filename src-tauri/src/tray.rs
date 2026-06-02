//! System tray icon and its menu.

use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, PhysicalPosition, WebviewWindow};

/// Dedicated tray icon (white logo on transparent, 16x16), embedded at build
/// time. Kept separate from the app/installer icon, which stays opaque so it's
/// visible in Explorer.
const TRAY_ICON_PNG: &[u8] = include_bytes!("../icons/tray.png");

/// Show and focus the main window (it starts hidden / hides on close),
/// docking it to the bottom-right of the screen first.
pub fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        dock_bottom_right(&window);
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

/// Position the window in the bottom-right corner, just inside the work area
/// (i.e. above the taskbar). Recomputed on every show so it follows
/// resolution / monitor changes.
fn dock_bottom_right(window: &WebviewWindow) {
    let monitor = match window.current_monitor() {
        Ok(Some(m)) => Some(m),
        _ => window.primary_monitor().ok().flatten(),
    };
    let Some(monitor) = monitor else { return };
    let Ok(size) = window.outer_size() else { return };
    if size.width == 0 {
        return;
    }

    let area = monitor.work_area();
    let margin = (12.0 * monitor.scale_factor()).round() as i32;
    let x = area.position.x + area.size.width as i32 - size.width as i32 - margin;
    let y = area.position.y + area.size.height as i32 - size.height as i32 - margin;
    let _ = window.set_position(PhysicalPosition::new(x, y));
}

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open WinTools", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &sep, &quit])?;

    TrayIconBuilder::with_id("main-tray")
        .icon(Image::from_bytes(TRAY_ICON_PNG).expect("valid tray icon PNG"))
        .tooltip("PepeSwitcher")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show_main(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}
