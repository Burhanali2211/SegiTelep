// remote_server.rs - COMPLETE FIXED VERSION

use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::Message};
use futures_util::{StreamExt, SinkExt};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::RwLock;

// ✅ ADD THESE AXUM IMPORTS AT THE TOP
use axum::{
    routing::{get, post},
    Router,
    extract::State,
    response::{Html, Json},
};

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteCommand {
    #[serde(rename = "type")]
    pub command_type: String,
    pub value: Option<serde_json::Value>,
    #[serde(default)]
    pub timestamp: i64,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum IncomingMessage {
    #[serde(rename = "browser-register")]
    BrowserRegister,
    #[serde(rename = "status-sync")]
    StatusSync { status: RemoteStatus },
    #[serde(other)]
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteStatus {
    pub is_playing: bool,
    pub current_speed: f64,
    pub current_segment: Option<usize>,
    pub total_segments: usize,
    pub project_name: String,
    pub timestamp: i64,
    pub connected_clients: usize,
    pub is_live: bool,
}

#[derive(Debug, Clone)]
pub struct ServerState {
    pub status: RemoteStatus,
    pub app_handle: AppHandle,
    pub broadcast_tx: tokio::sync::broadcast::Sender<String>,
}

pub type SharedState = Arc<RwLock<ServerState>>;

// ============================================================================
// WEBSOCKET SERVER
// ============================================================================

pub struct RemoteServer {
    port: u16,
    state: SharedState,
}

impl RemoteServer {
    pub fn new(app_handle: AppHandle, port: u16) -> Self {
        let initial_status = RemoteStatus {
            is_playing: false,
            current_speed: 1.0,
            current_segment: Some(0),
            total_segments: 1,
            project_name: "Untitled Project".to_string(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            connected_clients: 0,
            is_live: false,
        };

        let (broadcast_tx, _) = tokio::sync::broadcast::channel(32);

        let state = Arc::new(RwLock::new(ServerState {
            status: initial_status,
            app_handle: app_handle.clone(),
            broadcast_tx,
        }));

        Self {
            port,
            state,
        }
    }

    pub fn get_state(&self) -> SharedState {
        self.state.clone()
    }

    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let addr: SocketAddr = format!("0.0.0.0:{}", self.port)
            .parse()
            .map_err(|e| format!("Invalid address: {}", e))?;
        
        let listener = TcpListener::bind(addr).await
            .map_err(|e| format!("Failed to bind WebSocket server to port {}: {}", self.port, e))?;
        
        log::info!("🚀 WebSocket remote control server listening on port {}", self.port);

        let state = self.state.clone();
        
        loop {
            match listener.accept().await {
                Ok((stream, peer_addr)) => {
                    log::info!("📱 New remote connection from: {}", peer_addr);
                    
                    {
                        let mut state_guard = state.write().await;
                        state_guard.status.connected_clients += 1;
                    }
                    
                    let state_clone = state.clone();
                    tokio::spawn(async move {
                        if let Err(e) = Self::handle_connection(stream, state_clone.clone(), peer_addr).await {
                            log::error!("❌ Error handling remote connection from {}: {}", peer_addr, e);
                        }
                        
                        let mut state_guard = state_clone.write().await;
                        state_guard.status.connected_clients = state_guard.status.connected_clients.saturating_sub(1);
                        log::info!("📱 Remote disconnected: {} (active connections: {})", peer_addr, state_guard.status.connected_clients);
                    });
                }
                Err(e) => {
                    log::error!("Failed to accept connection: {}", e);
                }
            }
        }
    }

    async fn handle_connection(
        stream: TcpStream,
        state: SharedState,
        peer_addr: SocketAddr,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let ws_stream = accept_async(stream).await
            .map_err(|e| format!("WebSocket handshake failed: {}", e))?;
        
        let (mut write_half, mut read_half) = ws_stream.split();
        let (tx, mut rx_local) = tokio::sync::mpsc::unbounded_channel::<Message>();

        // Subscribe to status updates
        let mut rx_broadcast = {
            let state_guard = state.read().await;
            state_guard.broadcast_tx.subscribe()
        };

        // Dedicated task to push all updates to this specific client
        let peer_addr_clone = peer_addr.clone();
        let writer_task = tokio::spawn(async move {
            loop {
                tokio::select! {
                    // Individual messages (initial status, ping/pong, etc)
                    Some(msg) = rx_local.recv() => {
                        if let Err(e) = write_half.send(msg).await {
                            log::warn!("Failed to send individual message to {}: {}", peer_addr_clone, e);
                            break;
                        }
                    }
                    // Broadcast updates
                    Ok(json) = rx_broadcast.recv() => {
                        if let Err(e) = write_half.send(Message::Text(json)).await {
                            log::warn!("Failed to push broadcast update to {}: {}", peer_addr_clone, e);
                            break;
                        }
                    }
                    else => break,
                }
            }
        });

        // Send initial status immediately
        {
            let state_guard = state.read().await;
            let status = state_guard.status.clone();
            if let Ok(json) = serde_json::to_string(&status) {
                let _ = tx.send(Message::Text(json));
            }
        }

        while let Some(msg) = read_half.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    log::debug!("Received message from {}: {}", peer_addr, text);
                    
                    // First try to parse as a special sync/register message
                    if let Ok(incoming) = serde_json::from_str::<IncomingMessage>(&text) {
                        match incoming {
                            IncomingMessage::BrowserRegister => {
                                log::info!("🖥️ Browser Host registered via WebSocket: {}", peer_addr);
                                continue;
                            }
                            IncomingMessage::StatusSync { status } => {
                                // Update internal state from browser sync
                                let mut state_guard = state.write().await;
                                let server_client_count = state_guard.status.connected_clients;
                                state_guard.status = status;
                                // Preserve the accurate server-side client count
                                state_guard.status.connected_clients = server_client_count;
                                continue;
                            }
                            IncomingMessage::Other => {}
                        }
                    }

                    // Otherwise, try to parse as a command
                    match serde_json::from_str::<RemoteCommand>(&text) {
                        Ok(command) => {
                            let app_handle = {
                                let state_guard = state.read().await;
                                state_guard.app_handle.clone()
                            };
                            Self::handle_command(command, &app_handle).await;
                            
                            // Send back current status for immediate feedback
                            let state_guard = state.read().await;
                            let status = state_guard.status.clone();
                            if let Ok(json) = serde_json::to_string(&status) {
                                let _ = tx.send(Message::Text(json));
                            }
                        }
                        Err(e) => {
                            log::warn!("🚫 Failed to parse message from {}: {}. Raw: {}", peer_addr, e, text);
                        }
                    }
                }
                Ok(Message::Ping(data)) => {
                    let _ = tx.send(Message::Pong(data));
                }
                Ok(Message::Close(_)) => {
                    log::info!("🔌 Remote connection closed by client: {}", peer_addr);
                    break;
                }
                Err(e) => {
                    log::error!("WebSocket error from {}: {}", peer_addr, e);
                    break;
                }
                _ => {}
            }
        }

        // Clean up writer task
        writer_task.abort();

        Ok(())
    }

    async fn handle_command(command: RemoteCommand, app_handle: &AppHandle) {
        log::info!("🎮 Executing remote command: {}", command.command_type);
        
        let result = match command.command_type.as_str() {
            "play" => app_handle.emit("remote-play", ()),
            "pause" => app_handle.emit("remote-pause", ()),
            "stop" => app_handle.emit("remote-stop", ()),
            "next_segment" => app_handle.emit("remote-next-segment", ()),
            "prev_segment" => app_handle.emit("remote-prev-segment", ()),
            "set_speed" => {
                if let Some(value) = command.value {
                    if let Some(speed) = value.as_f64() {
                        let clamped_speed = speed.max(0.5).min(2.0);
                        app_handle.emit("remote-set-speed", clamped_speed)
                    } else {
                        log::warn!("Invalid speed value: {:?}", value);
                        return;
                    }
                } else {
                    log::warn!("Missing speed value for set_speed command");
                    return;
                }
            }
            "toggle_mirror" => app_handle.emit("remote-toggle-mirror", ()),
            "reset_position" => app_handle.emit("remote-reset-position", ()),
            "go_live" => app_handle.emit("remote-go-live", ()),
            "exit_live" => app_handle.emit("remote-exit-live", ()),
            "seek" => {
                if let Some(value) = command.value {
                    if let Some(position) = value.as_f64() {
                        app_handle.emit("remote-seek", position)
                    } else {
                        log::warn!("Invalid seek position: {:?}", value);
                        return;
                    }
                } else {
                    log::warn!("Missing position value for seek command");
                    return;
                }
            }
            _ => {
                log::warn!("⚠️ Unknown remote command: {}", command.command_type);
                return;
            }
        };

        if let Err(e) = result {
            log::error!("Failed to emit event for command {}: {}", command.command_type, e);
        }
    }
}

// ============================================================================
// HTTP SERVER FOR MOBILE INTERFACE
// ============================================================================

pub struct MobileInterfaceServer {
    port: u16,
    state: SharedState,
}

impl MobileInterfaceServer {
    pub fn with_state(port: u16, state: SharedState) -> Self {
        Self { port, state }
    }

    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let state_clone = self.state.clone();

        let app = Router::new()
            .route("/", get(serve_mobile_interface))
            .route("/remote", get(serve_mobile_interface))
            .route("/status", get(serve_status))
            .route("/command", post(handle_command))
            .with_state(state_clone);

        let addr: SocketAddr = format!("0.0.0.0:{}", self.port)
            .parse()
            .map_err(|e| format!("Invalid HTTP address: {}", e))?;
        
        log::info!("🌐 HTTP mobile interface server listening on port {}", self.port);

        let listener = tokio::net::TcpListener::bind(addr).await
            .map_err(|e| format!("Failed to bind HTTP server to port {}: {}", self.port, e))?;
        
        axum::serve(listener, app).await
            .map_err(|e| format!("HTTP server error: {}", e).into())
    }
}

// ============================================================================
// AXUM HANDLER FUNCTIONS (Must be standalone, outside impl block)
// ============================================================================

async fn serve_mobile_interface() -> Html<String> {
    // ✅ FIXED PATH - Remove ../ since we're already in src/
    Html(include_str!("assets/mobile_remote.html").to_string())
}

async fn serve_status(
    State(state): State<SharedState>,
) -> Json<RemoteStatus> {
    let state_guard = state.read().await;
    let mut status = state_guard.status.clone();
    status.timestamp = chrono::Utc::now().timestamp_millis();
    Json(status)
}

async fn handle_command(
    State(state): State<SharedState>,
    Json(command): Json<RemoteCommand>,
) -> Json<serde_json::Value> {
    log::info!("📨 Received HTTP command: {}", command.command_type);
    
    let app_handle = {
        let state_guard = state.read().await;
        state_guard.app_handle.clone()
    };
    
    RemoteServer::handle_command(command.clone(), &app_handle).await;
    
    Json(serde_json::json!({
        "success": true,
        "message": "Command executed",
        "command": command.command_type,
        "timestamp": chrono::Utc::now().timestamp_millis()
    }))
}

// ✅ NEW HELPER FOR UPDATING STATUS FROM TAURI
pub async fn update_status(state: SharedState, new_status: RemoteStatus) {
    let mut state_guard = state.write().await;
    state_guard.status = new_status.clone();
    
    // Broadcast to all connected clients
    if let Ok(json) = serde_json::to_string(&new_status) {
        let _ = state_guard.broadcast_tx.send(json);
    }
}