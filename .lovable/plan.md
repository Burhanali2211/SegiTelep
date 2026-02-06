# ProTeleprompter Development Plan

## Status: Desktop Application Setup Complete ✅

---

## Desktop Application (Tauri)

ProTeleprompter is configured as a **native desktop application** using Tauri:

### What's Set Up:
- `src-tauri/` - Tauri backend with Rust
- `src-tauri/tauri.conf.json` - App configuration (window size, permissions, bundling)
- `src-tauri/src/main.rs` - Native filesystem commands
- `src/core/storage/NativeStorage.ts` - Native storage API
- `src/core/storage/VisualProjectStorage.ts` - Hybrid storage (native + web fallback)
- `src/core/storage/AudioStorage.ts` - Audio storage (native + web fallback)

### Benefits of Desktop App:
| Feature | Web (Browser) | Desktop (Tauri) |
|---------|--------------|-----------------|
| Storage Limit | ~50MB quota | **Unlimited** |
| Audio Files | Limited size | **No limit** |
| Project Files | IndexedDB | **Native filesystem** |
| Offline Support | Limited | **Full** |
| Performance | Good | **Excellent** |

### Build Instructions:

1. **Export to GitHub** from Lovable
2. Clone and install:
   ```bash
   git clone <your-repo>
   cd proteleprompter
   npm install
   npm install -D @tauri-apps/cli
   ```
3. Install Rust: https://rustup.rs/
4. Run: `npm run tauri dev`
5. Build: `npm run tauri build`

See `DESKTOP_BUILD.md` for full documentation.

---

## Completed Features

### ✅ Desktop Application Startup and Playback Improvements
- Welcome Dashboard with recent projects list, thumbnails, and metadata
- Dynamic duration calculation from segment end times
- Auto-stop when playback reaches end of content
- Session restoration with auto-resume preference

### ✅ Professional Header and Navigation System
- Full menu bar with File, Edit, View, Playback, Tools, Help menus
- Secondary toolbar with Home button, project name, mode switcher, quick actions
- Script Statistics Dialog showing word counts, segment counts, and duration estimates
- Countdown Settings Dialog for pre-roll configuration
- About Dialog with app information

### ✅ Tools Menu Features (Phase 3)
- **Audio Manager**: Refactored into modular components (AudioManager/)
  - Upload audio files (MP3, WAV, OGG, M4A up to 50MB)
  - Preview/playback with volume control
  - Rename and delete files
  - Assign audio to segments
- **Remote Control**: BroadcastChannel-based cross-tab control
  - QR code for mobile access
  - Play/Pause/Stop, Next/Previous, Speed controls
  - Connection status indicator
- **Voice Input**: Web Speech API integration
  - Speech-to-text transcription
  - Voice commands for playback control
  - Multi-language support (13 languages)
  - Insert transcription into segments

---

## Architecture

### Components Created

| Component | Purpose |
|-----------|---------|
| `AppHeader.tsx` | Unified header wrapper combining menu bar + toolbar |
| `MainMenuBar.tsx` | Professional menu system |
| `SecondaryToolbar.tsx` | Quick actions bar with project controls |
| `WelcomeDashboard.tsx` | Startup screen with recent projects |
| `ScriptStatisticsDialog.tsx` | Word count, duration, segment statistics |
| `CountdownSettingsDialog.tsx` | Pre-playback countdown configuration |
| `AboutDialog.tsx` | Application information |
| `AudioManager/*` | Modular audio management (7 files) |
| `RemoteControl/*` | Remote control system (6 files) |
| `VoiceInput/*` | Voice input system (6 files) |

### Menu Structure

- **File**: New, Open, Recent, Save, Import/Export, Settings, Exit
- **Edit**: Undo/Redo, Copy/Paste, Duplicate, Delete, Select All
- **View**: Sidebar toggle, Zoom, Text/Visual mode, Theme (future)
- **Playback**: Play/Pause/Stop, Navigation, Speed, Mirror, Fullscreen
- **Tools**: Statistics, Audio Manager, Remote Control, Voice Input, Shortcuts
- **Help**: Guide, Shortcuts, Docs, About

---

## Voice Commands Supported

| Command | Triggers | Action |
|---------|----------|--------|
| Play | "play", "start", "go", "begin" | Start playback |
| Pause | "pause", "wait", "hold" | Pause playback |
| Stop | "stop", "end", "finish" | Stop playback |
| Next | "next", "forward", "skip" | Next segment |
| Previous | "previous", "back", "before" | Previous segment |
| Faster | "faster", "speed up", "quicker" | Increase speed |
| Slower | "slower", "speed down" | Decrease speed |

---

## Future Enhancements (Placeholders Added)

- [ ] Theme switching (Dark/Light/System)
- [ ] Export as PDF
- [ ] Export as Video
- [ ] External display support
- [ ] Segment Timer Calculator
- [ ] Template library

---

## Testing Checklist

- [x] Menu bar renders with all 6 menus
- [x] Keyboard shortcuts work (Ctrl+S, Ctrl+N, Ctrl+O, ?)
- [x] Mode switcher transitions between Text/Visual
- [x] Home button returns to Welcome Dashboard
- [x] Statistics dialog shows accurate counts
- [x] Countdown settings persist in localStorage
- [x] About dialog displays version info
- [x] Recent projects appear in File menu
- [x] Audio Manager opens from Tools menu
- [x] Remote Control opens with QR code and controls
- [x] Voice Input opens with recording interface
