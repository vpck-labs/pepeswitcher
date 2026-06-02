//! Audio output presets, backed by SoundVolumeView.

use crate::sidecar::run_sidecar;
use crate::store::{load_config, new_id, save_config, AudioPreset};
use serde::Serialize;
use std::fs;
use tauri::{AppHandle, Manager};

const TOOL: &str = "soundvolumeview";

/// An active audio output device discovered on the system.
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AudioDevice {
    pub name: String,
    /// "Command-Line Friendly ID" — stable handle passed to `/SetDefault`.
    pub id: String,
    pub is_default: bool,
}

/// Parse a single CSV line, honouring double-quoted fields that contain commas.
fn parse_csv_line(line: &str) -> Vec<String> {
    let mut fields = Vec::new();
    let mut cur = String::new();
    let mut in_quotes = false;
    let mut chars = line.chars().peekable();

    while let Some(c) = chars.next() {
        match c {
            '"' if in_quotes && chars.peek() == Some(&'"') => {
                cur.push('"');
                chars.next();
            }
            '"' => in_quotes = !in_quotes,
            ',' if !in_quotes => fields.push(std::mem::take(&mut cur)),
            _ => cur.push(c),
        }
    }
    fields.push(cur);
    fields
}

/// List active render (output) devices by exporting SoundVolumeView's table.
#[tauri::command]
pub async fn list_audio_devices(app: AppHandle) -> Result<Vec<AudioDevice>, String> {
    let tmp = app
        .path()
        .temp_dir()
        .map_err(|e| e.to_string())?
        .join(format!("wintools-audio-{}.csv", new_id()));
    let tmp_str = tmp.to_string_lossy().into_owned();

    run_sidecar(&app, TOOL, vec!["/scomma".into(), tmp_str]).await?;

    let raw = fs::read_to_string(&tmp).map_err(|e| e.to_string())?;
    let _ = fs::remove_file(&tmp);

    // SoundVolumeView writes the CSV as UTF-8 *with* a BOM; strip it so the
    // first header column is "Name" and not "\u{feff}Name".
    let raw = raw.trim_start_matches('\u{feff}');

    let mut lines = raw.lines();
    let header = lines.next().ok_or("empty CSV from SoundVolumeView")?;
    let cols = parse_csv_line(header);
    let idx = |name: &str| cols.iter().position(|c| c == name);

    let i_name = idx("Name").ok_or("missing Name column")?;
    let i_type = idx("Type").ok_or("missing Type column")?;
    let i_dir = idx("Direction").ok_or("missing Direction column")?;
    let i_state = idx("Device State").ok_or("missing Device State column")?;
    let i_friendly = idx("Command-Line Friendly ID").ok_or("missing friendly-id column")?;
    let i_def = idx("Default");
    let i_def_mm = idx("Default Multimedia");

    let get = |row: &[String], i: usize| row.get(i).cloned().unwrap_or_default();

    let mut devices = Vec::new();
    for line in lines {
        if line.trim().is_empty() {
            continue;
        }
        let row = parse_csv_line(line);
        if get(&row, i_type) != "Device"
            || get(&row, i_dir) != "Render"
            || get(&row, i_state) != "Active"
        {
            continue;
        }
        let is_default = i_def.map(|i| !get(&row, i).is_empty()).unwrap_or(false)
            || i_def_mm.map(|i| !get(&row, i).is_empty()).unwrap_or(false);

        devices.push(AudioDevice {
            name: get(&row, i_name),
            id: get(&row, i_friendly),
            is_default,
        });
    }
    Ok(devices)
}

#[tauri::command]
pub async fn save_audio_preset(
    app: AppHandle,
    name: String,
    device_id: String,
    device_name: String,
) -> Result<AudioPreset, String> {
    let preset = AudioPreset {
        id: new_id(),
        name,
        device_id,
        device_name,
        hotkey: None,
    };
    let mut config = load_config(&app).map_err(|e| e.to_string())?;
    config.audio_presets.push(preset.clone());
    save_config(&app, &config).map_err(|e| e.to_string())?;
    Ok(preset)
}

/// Make the preset's device the default output for all roles.
#[tauri::command]
pub async fn apply_audio_preset(app: AppHandle, id: String) -> Result<(), String> {
    let config = load_config(&app).map_err(|e| e.to_string())?;
    let preset = config
        .audio_presets
        .iter()
        .find(|p| p.id == id)
        .ok_or_else(|| format!("audio preset '{id}' not found"))?;

    run_sidecar(
        &app,
        TOOL,
        vec!["/SetDefault".into(), preset.device_id.clone(), "all".into()],
    )
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn delete_audio_preset(app: AppHandle, id: String) -> Result<(), String> {
    let mut config = load_config(&app).map_err(|e| e.to_string())?;
    config.audio_presets.retain(|p| p.id != id);
    save_config(&app, &config).map_err(|e| e.to_string())?;
    Ok(())
}
