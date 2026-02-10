use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::Message};
use futures_util::{StreamExt, SinkExt};
use serde::{Deserialize, Serialize};
use tauri::Emitter;
use std::net::SocketAddr;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteCommand {
    #[serde(rename = "type")]
    pub command_type: String,
    pub value: Option<serde_json::Value>,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteStatus {
    pub is_playing: bool,
    pub current_speed: f64,
    pub current_segment: Option<usize>,
    pub total_segments: usize,
    pub project_name: String,
    pub timestamp: i64,
}

pub struct RemoteServer {
    app_handle: tauri::AppHandle,
    port: u16,
}

impl RemoteServer {
    pub fn new(app_handle: tauri::AppHandle, port: u16) -> Self {
        Self { app_handle, port }
    }

    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        let addr: SocketAddr = format!("0.0.0.0:{}", self.port).parse()?;
        let listener: tokio::net::TcpListener = TcpListener::bind(addr).await?;
        
        println!("🚀 Remote control server listening on port {}", self.port);

        while let Ok((stream, peer_addr)) = listener.accept().await {
            println!("📱 Remote connection from: {}", peer_addr);
            
            let app_handle = self.app_handle.clone();
            tokio::spawn(async move {
                if let Err(e) = Self::handle_connection(stream, app_handle).await {
                    eprintln!("❌ Error handling remote connection: {}", e);
                }
            });
        }

        Ok(())
    }

    async fn handle_connection(
        stream: TcpStream,
        app_handle: tauri::AppHandle,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let ws_stream = accept_async(stream).await?;
        let (mut write, mut read) = ws_stream.split();

        // Send initial status
        let initial_status = Self::get_current_status(&app_handle).await;
        if let Ok(json) = serde_json::to_string(&initial_status) {
            let _ = write.send(Message::Text(json)).await;
        }

        // Handle incoming messages
        while let Some(msg) = read.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Ok(command) = serde_json::from_str::<RemoteCommand>(&text) {
                        Self::handle_command(command, &app_handle).await;
                        
                        // Send updated status
                        let status = Self::get_current_status(&app_handle).await;
                        if let Ok(json) = serde_json::to_string(&status) {
                            let _ = write.send(Message::Text(json)).await;
                        }
                    }
                }
                Ok(Message::Close(_)) => {
                    println!("🔌 Remote connection closed");
                    break;
                }
                Err(e) => {
                    eprintln!("WebSocket error: {}", e);
                    break;
                }
                _ => {
                    // Ignore other message types
                }
            }
        }

        Ok(())
    }

    async fn handle_command(command: RemoteCommand, app_handle: &tauri::AppHandle) {
        match command.command_type.as_str() {
            "play" => {
                app_handle.emit("remote-play", ()).ok();
            }
            "pause" => {
                app_handle.emit("remote-pause", ()).ok();
            }
            "stop" => {
                app_handle.emit("remote-stop", ()).ok();
            }
            "next_segment" => {
                app_handle.emit("remote-next-segment", ()).ok();
            }
            "prev_segment" => {
                app_handle.emit("remote-prev-segment", ()).ok();
            }
            "set_speed" => {
                if let Some(value) = command.value {
                    if let Some(speed) = value.as_f64() {
                        let speed = speed.max(0.5).min(2.0);
                        app_handle.emit("remote-set-speed", speed).ok();
                    }
                }
            }
            "toggle_mirror" => {
                app_handle.emit("remote-toggle-mirror", ()).ok();
            }
            "reset_position" => {
                app_handle.emit("remote-reset-position", ()).ok();
            }
            _ => {
                println!("⚠️ Unknown remote command: {}", command.command_type);
            }
        }
    }

    async fn get_current_status(_app_handle: &tauri::AppHandle) -> RemoteStatus {
        // This would typically get the actual status from the frontend
        // For now, we'll return a default status
        RemoteStatus {
            is_playing: false,
            current_speed: 1.0,
            current_segment: Some(0),
            total_segments: 1,
            project_name: "Untitled Project".to_string(),
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }
}

// HTTP server for serving the mobile interface
pub struct MobileInterfaceServer {
    port: u16,
}

impl MobileInterfaceServer {
    pub fn new(port: u16) -> Self {
        Self { port }
    }

    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        let app = axum::Router::new()
            .route("/", axum::routing::get(Self::serve_mobile_interface))
            .route("/remote", axum::routing::get(Self::serve_mobile_interface))
            .route("/status", axum::routing::get(Self::serve_status))
            .route("/command", axum::routing::post(Self::handle_command))
            .into_make_service();

        let addr: SocketAddr = format!("0.0.0.0:{}", self.port).parse()?;
        println!("🌐 Mobile interface server listening on port {}", self.port);

        let listener = tokio::net::TcpListener::bind(addr).await?;
        axum::serve(listener, app).await?;

        Ok(())
    }

    async fn serve_mobile_interface() -> axum::response::Html<String> {
        axum::response::Html(include_str!("../mobile_remote.html").to_string())
    }

    async fn serve_status() -> axum::response::Json<RemoteStatus> {
        // This would get the actual status
        axum::response::Json(RemoteStatus {
            is_playing: false,
            current_speed: 1.0,
            current_segment: Some(0),
            total_segments: 1,
            project_name: "Untitled Project".to_string(),
            timestamp: chrono::Utc::now().timestamp_millis(),
        })
    }

    async fn handle_command(
        axum::extract::Json(command): axum::extract::Json<RemoteCommand>,
    ) -> axum::response::Json<serde_json::Value> {
        // Handle the command
        println!("Received HTTP command: {}", command.command_type);
        
        axum::response::Json(serde_json::json!({
            "success": true,
            "message": "Command received"
        }))
    }
}
