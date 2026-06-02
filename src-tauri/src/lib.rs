// App icon embedded from src-tauri/icons at build time.
mod audio;
mod master;
mod monitors;
mod sidecar;
mod store;
mod tray;

use tauri::WebviewWindow;
use tauri_plugin_autostart::{ManagerExt, MacosLauncher};

/// Hide the main window back to the tray.
#[tauri::command]
fn hide_window(window: WebviewWindow) {
    let _ = window.hide();
}

/// Open a URL in the user's default browser.
#[tauri::command]
fn open_external(app: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

/// Enable or disable launching PepeTools when the user logs in.
#[tauri::command]
fn set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let manager = app.autolaunch();
    let result = if enabled {
        manager.enable()
    } else {
        manager.disable()
    };
    result.map_err(|e| e.to_string())
}

#[tauri::command]
fn get_autostart(app: tauri::AppHandle) -> Result<bool, String> {
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            tray::setup_tray(app.handle())?;
            master::register_all_hotkeys(app.handle());
            Ok(())
        })
        .on_window_event(|window, event| {
            // Keep the app alive in the tray when the *main* window is closed;
            // dialog windows should close normally.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            store::get_config,
            monitors::save_monitor_preset,
            monitors::update_monitor_preset,
            monitors::apply_monitor_preset,
            monitors::active_monitor_presets,
            monitors::delete_monitor_preset,
            audio::list_audio_devices,
            audio::save_audio_preset,
            audio::update_audio_preset,
            audio::apply_audio_preset,
            audio::delete_audio_preset,
            master::save_master_preset,
            master::update_master_preset,
            master::apply_master_preset,
            master::reorder_master_presets,
            master::delete_master_preset,
            set_autostart,
            get_autostart,
            hide_window,
            open_external,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
