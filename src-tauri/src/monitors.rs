//! Monitor arrangement presets, backed by MultiMonitorTool's save/load config.

use crate::sidecar::run_sidecar;
use crate::store::{load_config, monitors_dir, new_id, save_config, MonitorPreset};
use std::fs;
use tauri::{AppHandle, Manager};

const TOOL: &str = "multimonitortool";

/// Reduce a `.cfg` to a comparable form: trimmed, non-empty lines only.
/// MultiMonitorTool emits deterministic INI for a given arrangement, so two
/// configs describing the same layout normalize to identical strings.
fn normalize_cfg(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes)
        .lines()
        .map(|l| l.trim_end())
        .filter(|l| !l.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

/// Capture the current monitor arrangement (positions, resolutions, which
/// displays are enabled) into a new preset.
#[tauri::command]
pub async fn save_monitor_preset(app: AppHandle, name: String) -> Result<MonitorPreset, String> {
    let id = new_id();
    let file = format!("{id}.cfg");
    let path = monitors_dir(&app)
        .map_err(|e| e.to_string())?
        .join(&file);

    run_sidecar(
        &app,
        TOOL,
        vec!["/SaveConfig".into(), path.to_string_lossy().into_owned()],
    )
    .await?;

    if !path.exists() {
        return Err("MultiMonitorTool did not produce a config file".into());
    }

    let preset = MonitorPreset {
        id,
        name,
        file,
        hotkey: None,
    };

    let mut config = load_config(&app).map_err(|e| e.to_string())?;
    config.monitor_presets.push(preset.clone());
    save_config(&app, &config).map_err(|e| e.to_string())?;

    Ok(preset)
}

/// Restore a previously saved monitor arrangement.
#[tauri::command]
pub async fn apply_monitor_preset(app: AppHandle, id: String) -> Result<(), String> {
    let config = load_config(&app).map_err(|e| e.to_string())?;
    let preset = config
        .monitor_presets
        .iter()
        .find(|p| p.id == id)
        .ok_or_else(|| format!("monitor preset '{id}' not found"))?;

    let path = monitors_dir(&app)
        .map_err(|e| e.to_string())?
        .join(&preset.file);
    if !path.exists() {
        return Err(format!("config file for preset '{}' is missing", preset.name));
    }

    run_sidecar(
        &app,
        TOOL,
        vec!["/LoadConfig".into(), path.to_string_lossy().into_owned()],
    )
    .await?;
    Ok(())
}

/// Rename a monitor preset (the saved arrangement is unchanged).
#[tauri::command]
pub async fn update_monitor_preset(app: AppHandle, id: String, name: String) -> Result<(), String> {
    let mut config = load_config(&app).map_err(|e| e.to_string())?;
    let preset = config
        .monitor_presets
        .iter_mut()
        .find(|p| p.id == id)
        .ok_or_else(|| format!("monitor preset '{id}' not found"))?;
    preset.name = name;
    save_config(&app, &config).map_err(|e| e.to_string())?;
    Ok(())
}

/// Return the ids of every preset whose layout matches the *current* monitor
/// arrangement. Captures the live state to a temp config (read-only — it does
/// not change any display) and compares it against each saved preset, so the
/// result reflects changes made outside the app too.
#[tauri::command]
pub async fn active_monitor_presets(app: AppHandle) -> Result<Vec<String>, String> {
    let dir = monitors_dir(&app).map_err(|e| e.to_string())?;
    let tmp = app
        .path()
        .temp_dir()
        .map_err(|e| e.to_string())?
        .join(format!("wintools-current-{}.cfg", new_id()));

    run_sidecar(
        &app,
        TOOL,
        vec!["/SaveConfig".into(), tmp.to_string_lossy().into_owned()],
    )
    .await?;

    let current = match fs::read(&tmp) {
        Ok(bytes) => normalize_cfg(&bytes),
        Err(e) => return Err(format!("couldn't read current arrangement: {e}")),
    };
    let _ = fs::remove_file(&tmp);

    let config = load_config(&app).map_err(|e| e.to_string())?;
    let mut active = Vec::new();
    for preset in config.monitor_presets {
        if let Ok(bytes) = fs::read(dir.join(&preset.file)) {
            if normalize_cfg(&bytes) == current {
                active.push(preset.id);
            }
        }
    }
    Ok(active)
}

#[tauri::command]
pub async fn delete_monitor_preset(app: AppHandle, id: String) -> Result<(), String> {
    let mut config = load_config(&app).map_err(|e| e.to_string())?;
    if let Some(pos) = config.monitor_presets.iter().position(|p| p.id == id) {
        let preset = config.monitor_presets.remove(pos);
        let path = monitors_dir(&app)
            .map_err(|e| e.to_string())?
            .join(&preset.file);
        let _ = fs::remove_file(path);
        save_config(&app, &config).map_err(|e| e.to_string())?;
    }
    Ok(())
}
