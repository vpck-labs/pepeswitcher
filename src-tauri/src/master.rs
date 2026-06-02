//! Master presets: a named monitor+audio combination with an optional global
//! hotkey that applies both at once.

use crate::store::{load_config, new_id, save_config, MasterPreset};
use crate::{audio, monitors};
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

/// Apply a master preset: apply its monitor preset and/or audio preset.
pub async fn apply_master(app: &AppHandle, id: &str) -> Result<(), String> {
    let config = load_config(app).map_err(|e| e.to_string())?;
    let master = config
        .master_presets
        .iter()
        .find(|m| m.id == id)
        .ok_or_else(|| format!("master preset '{id}' not found"))?
        .clone();

    if let Some(monitor_id) = master.monitor_preset_id {
        monitors::apply_monitor_preset(app.clone(), monitor_id).await?;
    }
    if let Some(audio_id) = master.audio_preset_id {
        audio::apply_audio_preset(app.clone(), audio_id).await?;
    }
    Ok(())
}

/// Register a global hotkey that applies the given master preset on press.
fn register_hotkey(app: &AppHandle, master_id: &str, accelerator: &str) -> Result<(), String> {
    let master_id = master_id.to_string();
    app.global_shortcut()
        .on_shortcut(accelerator, move |app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                let app = app.clone();
                let id = master_id.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = apply_master(&app, &id).await;
                });
            }
        })
        .map_err(|e| format!("couldn't register hotkey '{accelerator}': {e}"))
}

fn unregister_hotkey(app: &AppHandle, accelerator: &str) {
    let _ = app.global_shortcut().unregister(accelerator);
}

/// Register every saved master preset's hotkey (called once at startup).
pub fn register_all_hotkeys(app: &AppHandle) {
    let Ok(config) = load_config(app) else { return };
    for master in config.master_presets {
        if let Some(accelerator) = master.hotkey.as_deref() {
            let _ = register_hotkey(app, &master.id, accelerator);
        }
    }
}

#[tauri::command]
pub async fn save_master_preset(
    app: AppHandle,
    name: String,
    monitor_preset_id: Option<String>,
    audio_preset_id: Option<String>,
    hotkey: Option<String>,
) -> Result<MasterPreset, String> {
    let preset = MasterPreset {
        id: new_id(),
        name,
        monitor_preset_id,
        audio_preset_id,
        hotkey: hotkey.clone(),
    };

    // Register the hotkey first so a bad/duplicate accelerator fails before we
    // persist anything.
    if let Some(accelerator) = hotkey.as_deref() {
        register_hotkey(&app, &preset.id, accelerator)?;
    }

    let mut config = load_config(&app).map_err(|e| e.to_string())?;
    config.master_presets.push(preset.clone());
    save_config(&app, &config).map_err(|e| e.to_string())?;
    Ok(preset)
}

#[tauri::command]
pub async fn apply_master_preset(app: AppHandle, id: String) -> Result<(), String> {
    apply_master(&app, &id).await
}

/// Update a master preset's name and/or hotkey (re-registering the global
/// shortcut as needed). The referenced monitor/audio presets are unchanged.
#[tauri::command]
pub async fn update_master_preset(
    app: AppHandle,
    id: String,
    name: String,
    hotkey: Option<String>,
) -> Result<(), String> {
    let mut config = load_config(&app).map_err(|e| e.to_string())?;
    let idx = config
        .master_presets
        .iter()
        .position(|m| m.id == id)
        .ok_or_else(|| format!("master preset '{id}' not found"))?;

    let old_hotkey = config.master_presets[idx].hotkey.clone();
    if old_hotkey != hotkey {
        // Register the new one first so a bad/duplicate accelerator fails
        // before we drop the old binding.
        if let Some(new) = hotkey.as_deref() {
            register_hotkey(&app, &id, new)?;
        }
        if let Some(old) = old_hotkey.as_deref() {
            unregister_hotkey(&app, old);
        }
    }

    let preset = &mut config.master_presets[idx];
    preset.name = name;
    preset.hotkey = hotkey;
    save_config(&app, &config).map_err(|e| e.to_string())?;
    Ok(())
}

/// Reorder master presets to match the given id order (ids not present are
/// pushed to the end).
#[tauri::command]
pub async fn reorder_master_presets(app: AppHandle, ordered_ids: Vec<String>) -> Result<(), String> {
    let mut config = load_config(&app).map_err(|e| e.to_string())?;
    config.master_presets.sort_by_key(|m| {
        ordered_ids
            .iter()
            .position(|id| id == &m.id)
            .unwrap_or(usize::MAX)
    });
    save_config(&app, &config).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_master_preset(app: AppHandle, id: String) -> Result<(), String> {
    let mut config = load_config(&app).map_err(|e| e.to_string())?;
    if let Some(pos) = config.master_presets.iter().position(|m| m.id == id) {
        let removed = config.master_presets.remove(pos);
        if let Some(accelerator) = removed.hotkey.as_deref() {
            unregister_hotkey(&app, accelerator);
        }
        save_config(&app, &config).map_err(|e| e.to_string())?;
    }
    Ok(())
}
