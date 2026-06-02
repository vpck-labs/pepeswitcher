//! Preset storage: typed config persisted as JSON in the app config dir.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

/// A saved monitor arrangement. The actual layout lives in a MultiMonitorTool
/// `.cfg` file referenced by `file`; this just records the metadata.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MonitorPreset {
    pub id: String,
    pub name: String,
    pub file: String,
    #[serde(default)]
    pub hotkey: Option<String>,
}

/// A saved default-audio-output choice.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AudioPreset {
    pub id: String,
    pub name: String,
    /// SoundVolumeView "Command-Line Friendly ID" used to set the default.
    pub device_id: String,
    pub device_name: String,
    #[serde(default)]
    pub hotkey: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    #[serde(default)]
    pub monitor_presets: Vec<MonitorPreset>,
    #[serde(default)]
    pub audio_presets: Vec<AudioPreset>,
}

/// Time-based unique id; nanosecond resolution is plenty for hand-created presets.
pub fn new_id() -> String {
    let n = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{:x}", n)
}

fn config_dir(app: &AppHandle) -> Result<PathBuf> {
    let dir = app.path().app_config_dir()?;
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

pub fn config_path(app: &AppHandle) -> Result<PathBuf> {
    Ok(config_dir(app)?.join("config.json"))
}

/// Directory holding the per-preset MultiMonitorTool `.cfg` files.
pub fn monitors_dir(app: &AppHandle) -> Result<PathBuf> {
    let dir = config_dir(app)?.join("monitors");
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

pub fn load_config(app: &AppHandle) -> Result<AppConfig> {
    let path = config_path(app)?;
    if !path.exists() {
        return Ok(AppConfig::default());
    }
    let raw = fs::read_to_string(&path)?;
    Ok(serde_json::from_str(&raw).unwrap_or_default())
}

pub fn save_config(app: &AppHandle, config: &AppConfig) -> Result<()> {
    let path = config_path(app)?;
    fs::write(&path, serde_json::to_string_pretty(config)?)?;
    Ok(())
}

/// Exposed to the frontend so it can render the current preset lists.
#[tauri::command]
pub fn get_config(app: AppHandle) -> Result<AppConfig, String> {
    load_config(&app).map_err(|e| e.to_string())
}
