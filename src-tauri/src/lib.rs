// lib.rs - Complete Fixed Version

mod remote_server;

use std::path::PathBuf;
use std::collections::HashSet;
use std::fs;
use sha2::{Sha256, Digest};
use tauri::{Manager, Emitter};  // ✅ Added Emitter trait

#[derive(Clone, serde::Serialize)]
struct RemoteServerState {
    is_running: bool,
    port: u16,
    connection_url: String,
}

struct AppState {
    remote_server: std::sync::Mutex<RemoteServerState>,
    remote_state: std::sync::Arc<std::sync::Mutex<Option<remote_server::SharedState>>>,
}

// ============================================================================
// REMOTE SERVER COMMANDS
// ============================================================================

#[tauri::command]
async fn start_remote_server(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<RemoteServerState, String> {
    let mut server_state = state.remote_server.lock().unwrap();

    if server_state.is_running {
        log::info!("⚡ Remote server already running at {}", server_state.connection_url);
        return Ok(server_state.clone());
    }

    let local_ip = if let Ok(ips) = local_ip_address::list_afinet_netifas() {
        ips.iter()
            .find(|(_, ip)| {
                let ip_str = ip.to_string();
                (ip_str.starts_with("192.168.") || ip_str.starts_with("10.") || ip_str.starts_with("172.")) 
                && !ip_str.starts_with("127.")
            })
            .map(|(_, ip)| *ip)
            .unwrap_or_else(|| local_ip_address::local_ip().unwrap_or(std::net::IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1))))
    } else {
        local_ip_address::local_ip().unwrap_or(std::net::IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1)))
    };

    let port = 8765;
    let connection_url = format!("http://{}:{}", local_ip, port);

    // Create WebSocket server (port + 1)
    let ws_server = remote_server::RemoteServer::new(app_handle.clone(), port + 1);
    let shared_state = ws_server.get_state();
    
    // Start WebSocket server
    let ws_handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = ws_server.start().await {
            log::error!("WebSocket server error: {}", e);
            let _ = ws_handle.emit("remote-server-error", format!("WebSocket error: {}", e));
        }
    });

    // Start HTTP server with shared state
    let http_server = remote_server::MobileInterfaceServer::with_state(port, shared_state.clone());
    let http_handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = http_server.start().await {
            log::error!("HTTP server error: {}", e);
            let _ = http_handle.emit("remote-server-error", format!("HTTP error: {}", e));
        }
    });

    log::info!("🚀 Remote control servers started on port {}", port);

    server_state.is_running = true;
    server_state.port = port;
    server_state.connection_url = connection_url.clone();

    // Store the remote state for other commands to use
    let mut app_remote_state = state.remote_state.lock().unwrap();
    *app_remote_state = Some(shared_state);

    Ok(server_state.clone())
}

#[tauri::command]
async fn generate_remote_qr(connection_url: String) -> Result<String, String> {
    use qrcode::{QrCode, render::svg};  // ✅ Single import, properly scoped
    
    let qr_code = QrCode::new(connection_url.as_bytes())
        .map_err(|e| format!("Failed to generate QR code: {}", e))?;

    let svg = qr_code.render::<svg::Color>()  // ✅ Explicit type parameter
        .min_dimensions(200, 200)
        .build();

    Ok(svg)
}

#[tauri::command]
async fn toggle_window_fullscreen(window: tauri::Window) -> Result<(), String> {
    let is_fullscreen = window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(!is_fullscreen).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn set_window_fullscreen(window: tauri::Window, fullscreen: bool) -> Result<(), String> {
    window.set_fullscreen(fullscreen).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn sync_remote_status(
    status: remote_server::RemoteStatus,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let remote_state = {
        let lock = state.remote_state.lock().unwrap();
        lock.clone()
    };
    
    if let Some(rs) = remote_state {
        remote_server::update_status(rs, status).await;
        Ok(())
    } else {
        Err("Remote server is not running".to_string())
    }
}

// ============================================================================
// PROJECT STORAGE COMMANDS
// ============================================================================

#[tauri::command]
async fn atomic_save_json(path: String, data: serde_json::Value) -> Result<String, String> {
    let path_buf = PathBuf::from(&path);
    
    if let Some(parent) = path_buf.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }
    
    let temp_path = format!("{}.tmp", path);
    
    let json_data = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("JSON serialization failed: {}", e))?;
    
    fs::write(&temp_path, json_data)
        .map_err(|e| format!("Failed to write temp file '{}': {}", temp_path, e))?;
    
    fs::rename(&temp_path, &path)
        .map_err(|e| format!("Atomic rename failed from '{}' to '{}': {}", temp_path, path, e))?;
    
    log::info!("✅ Successfully saved project to: {}", path);
    
    Ok(path)
}

// ============================================================================
// ASSET STORAGE COMMANDS
// ============================================================================

#[tauri::command]
async fn store_asset(
    app_handle: tauri::AppHandle, 
    bytes: Vec<u8>, 
    extension: String
) -> Result<String, String> {
    let clean_extension = extension.trim_start_matches('.').to_lowercase();
    if clean_extension.is_empty() {
        return Err("Invalid file extension".to_string());
    }
    
    if bytes.is_empty() {
        return Err("Cannot store empty asset".to_string());
    }
    
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let hash = format!("{:x}", hasher.finalize());
    
    let app_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let assets_dir = app_dir.join("global_assets");
    
    if !assets_dir.exists() {
        fs::create_dir_all(&assets_dir)
            .map_err(|e| format!("Failed to create global_assets directory: {}", e))?;
        log::info!("📁 Created global_assets directory at: {:?}", assets_dir);
    }
    
    let filename = format!("{}.{}", hash, clean_extension);
    let file_path = assets_dir.join(&filename);
    
    if !file_path.exists() {
        fs::write(&file_path, &bytes)
            .map_err(|e| format!("Failed to write asset to '{}': {}", file_path.display(), e))?;
        log::info!("💾 Stored new asset: {} ({} bytes)", filename, bytes.len());
    } else {
        log::info!("♻️  Asset already exists (deduplicated): {}", filename);
    }
    
    Ok(format!("global_assets/{}", filename))
}

#[tauri::command]
async fn get_absolute_path(
    app_handle: tauri::AppHandle, 
    relative_path: String
) -> Result<String, String> {
    let app_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let normalized_path = relative_path.replace('\\', "/");
    let full_path = app_dir.join(normalized_path);
    
    if !full_path.exists() {
        return Err(format!("File not found: {}", full_path.display()));
    }
    
    Ok(full_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn cleanup_global_assets(
    app_handle: tauri::AppHandle, 
    active_assets: Vec<String>
) -> Result<usize, String> {
    let active_asset_set: HashSet<String> = active_assets.into_iter().collect();
    
    let app_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let assets_dir = app_dir.join("global_assets");
    
    if !assets_dir.exists() {
        log::info!("No global_assets directory found, nothing to clean up");
        return Ok(0);
    }
    
    let mut deleted_count = 0;
    let mut failed_deletions = Vec::new();
    
    match fs::read_dir(&assets_dir) {
        Ok(entries) => {
            for entry in entries.flatten() {
                if let Ok(file_name) = entry.file_name().into_string() {
                    let path_key = format!("global_assets/{}", file_name);
                    
                    if !active_asset_set.contains(&path_key) {
                        match fs::remove_file(entry.path()) {
                            Ok(_) => {
                                deleted_count += 1;
                                log::info!("🗑️  Deleted orphaned asset: {}", file_name);
                            }
                            Err(e) => {
                                let error_msg = format!("Failed to delete {}: {}", file_name, e);
                                log::warn!("{}", error_msg);
                                failed_deletions.push(error_msg);
                            }
                        }
                    }
                }
            }
        }
        Err(e) => {
            return Err(format!("Failed to read assets directory: {}", e));
        }
    }
    
    if !failed_deletions.is_empty() {
        log::warn!("⚠️  Some assets could not be deleted: {:?}", failed_deletions);
    }
    
    log::info!("✅ Cleanup complete: {} orphaned assets deleted", deleted_count);
    
    Ok(deleted_count)
}

// ============================================================================
// FILE SYSTEM COMMANDS
// ============================================================================

#[tauri::command]
async fn get_download_dir() -> Result<String, String> {
    let download_dir = dirs::download_dir()
        .ok_or_else(|| "Could not determine download directory".to_string())?;
    
    Ok(download_dir.to_string_lossy().to_string())
}

#[tauri::command]
async fn open_file(file_path: String) -> Result<(), String> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("cmd")
            .args(["/C", "start", "", &file_path])
            .spawn()
            .map_err(|e| format!("Failed to open file on Windows: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open file on macOS: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        Command::new("xdg-open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open file on Linux: {}", e))?;
    }
    
    log::info!("📂 Opened file: {}", file_path);
    
    Ok(())
}

#[tauri::command]
async fn show_in_folder(file_path: String) -> Result<(), String> {
    let path = PathBuf::from(&file_path);
    
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("explorer")
            .args(["/select,", &file_path])
            .spawn()
            .map_err(|e| format!("Failed to show file in folder on Windows: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .args(["-R", &file_path])
            .spawn()
            .map_err(|e| format!("Failed to show file in folder on macOS: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        let parent_dir = path.parent()
            .ok_or_else(|| "File has no parent directory".to_string())?;
        
        Command::new("xdg-open")
            .arg(parent_dir)
            .spawn()
            .map_err(|e| format!("Failed to show file in folder on Linux: {}", e))?;
    }
    
    log::info!("📁 Showed file in folder: {}", file_path);
    
    Ok(())
}

// ============================================================================
// APPLICATION ENTRY POINT
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .manage(AppState {
            remote_server: std::sync::Mutex::new(RemoteServerState {
                is_running: false,
                port: 0,
                connection_url: String::new(),
            }),
            remote_state: std::sync::Arc::new(std::sync::Mutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![
            start_remote_server,
            generate_remote_qr,
            atomic_save_json,
            store_asset,
            get_absolute_path,
            cleanup_global_assets,
            get_download_dir,
            open_file,
            show_in_folder,
            toggle_window_fullscreen,
            set_window_fullscreen,
            sync_remote_status,
        ])
        .setup(|app| {
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(if cfg!(debug_assertions) {
                        log::LevelFilter::Debug
                    } else {
                        log::LevelFilter::Info
                    })
                    .build(),
            )?;

            log::info!("═══════════════════════════════════════════");
            log::info!("🚀 SegiTelep Pro Starting Up");
            log::info!("═══════════════════════════════════════════");
            log::info!("📱 Environment: {}", if cfg!(debug_assertions) { 
                "Development" 
            } else { 
                "Production" 
            });
            log::info!("💻 Platform: {}", std::env::consts::OS);
            log::info!("🏗️  Architecture: {}", std::env::consts::ARCH);
            
            if let Ok(app_dir) = app.path().app_data_dir() {
                log::info!("📁 App Data Dir: {:?}", app_dir);
            }
            
            log::info!("═══════════════════════════════════════════");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("❌ Fatal error: Failed to run Tauri application");
}