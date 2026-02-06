// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use tauri::api::path::app_data_dir;

#[tauri::command]
fn get_app_data_path(app_handle: tauri::AppHandle) -> Result<String, String> {
    app_data_dir(&app_handle.config())
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not get app data directory".to_string())
}

#[tauri::command]
fn ensure_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file_bytes(path: String, contents: Vec<u8>) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_files(path: String) -> Result<Vec<String>, String> {
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let files: Vec<String> = entries
        .filter_map(|e| e.ok())
        .map(|e| e.path().to_string_lossy().to_string())
        .collect();
    Ok(files)
}

#[tauri::command]
fn file_exists(path: String) -> bool {
    PathBuf::from(&path).exists()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_app_data_path,
            ensure_directory,
            read_file_bytes,
            write_file_bytes,
            delete_file,
            list_files,
            file_exists
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
