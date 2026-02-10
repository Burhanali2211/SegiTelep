mod remote_server;

use std::path::PathBuf;

#[derive(Clone, serde::Serialize)]
struct RemoteServerState {
    is_running: bool,
    port: u16,
    connection_url: String,
}

#[tauri::command]
async fn start_remote_server(app_handle: tauri::AppHandle) -> Result<RemoteServerState, String> {
    let local_ip = local_ip_address::local_ip()
        .map_err(|e| format!("Failed to get local IP: {}", e))?;

    let port = 8765;
    let connection_url = format!("http://{}:{}", local_ip, port);

    // Start WebSocket server for real-time communication
    let _ws_server = remote_server::RemoteServer::new(app_handle.clone(), port + 1);
    let _ws_handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = _ws_server.start().await {
            eprintln!("WebSocket server error: {}", e);
        }
    });

    // Start HTTP server for mobile interface
    let _http_server = remote_server::MobileInterfaceServer::new(port);
    let _http_handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = _http_server.start().await {
            eprintln!("HTTP server error: {}", e);
        }
    });

    println!("🚀 Remote control servers started on port {}", port);

    Ok(RemoteServerState {
        is_running: true,
        port,
        connection_url,
    })
}

#[tauri::command]
async fn generate_remote_qr(connection_url: String) -> Result<String, String> {
    let qr_code = qrcode::QrCode::new(connection_url.as_bytes())
        .map_err(|e| format!("Failed to generate QR code: {}", e))?;

    let svg = qr_code.render::<qrcode::render::svg::Color>()
        .min_dimensions(200, 200)
        .build();

    Ok(svg)
}

#[tauri::command]
async fn get_download_dir() -> Result<String, String> {
    let download_dir = dirs::download_dir()
        .unwrap_or_else(|| PathBuf::from("."));
    Ok(download_dir.to_string_lossy().to_string())
}

#[tauri::command]
async fn open_file(file_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("cmd")
            .args(&["/C", "start", "", &file_path])
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        Command::new("xdg-open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
async fn show_in_folder(file_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("explorer")
            .args(&["/select,", &file_path])
            .spawn()
            .map_err(|e| format!("Failed to show file in folder: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .args(&["-R", &file_path])
            .spawn()
            .map_err(|e| format!("Failed to show file in folder: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        Command::new("xdg-open")
            .arg(std::path::Path::new(&file_path).parent().unwrap_or_else(|| std::path::Path::new(".")))
            .spawn()
            .map_err(|e| format!("Failed to show file in folder: {}", e))?;
    }
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(RemoteServerState {
            is_running: false,
            port: 0,
            connection_url: String::new(),
        })
        .invoke_handler(tauri::generate_handler![
            start_remote_server,
            generate_remote_qr,
            get_download_dir,
            open_file,
            show_in_folder,
        ])
        .setup(|app| {
            // Enable logging in both debug and release for better debugging
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(if cfg!(debug_assertions) {
                        log::LevelFilter::Debug
                    } else {
                        log::LevelFilter::Info
                    })
                    .build(),
            )?;

            // Log app startup
            log::info!("🚀 SegiTelep starting up...");
            log::info!("📱 Environment: {}", if cfg!(debug_assertions) { "Development" } else { "Production" });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
