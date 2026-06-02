//! Helper for running the bundled NirSoft command-line tools (sidecars).

use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

/// Run a bundled sidecar to completion and return its stdout.
///
/// The NirSoft tools mostly communicate through files (e.g. `/scomma <file>`)
/// rather than stdout, so callers typically write to a temp file and read it
/// back; this just guarantees the process has exited before we continue.
pub async fn run_sidecar(app: &AppHandle, name: &str, args: Vec<String>) -> Result<String, String> {
    let command = app
        .shell()
        .sidecar(name)
        .map_err(|e| format!("sidecar '{name}' not found: {e}"))?;

    let output = command
        .args(args)
        .output()
        .await
        .map_err(|e| format!("failed to run '{name}': {e}"))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        Err(format!(
            "'{name}' exited with {:?}: {}",
            output.status.code(),
            String::from_utf8_lossy(&output.stderr)
        ))
    }
}
