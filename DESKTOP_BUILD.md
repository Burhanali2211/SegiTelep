# ProTeleprompter - Desktop Application

A professional teleprompter desktop application built with React, TypeScript, and Tauri.

## Features

- **Text and Visual Modes**: Edit scripts in text mode or visual region mode
- **Timed Segment Playback**: Precise timing control for professional presentations
- **Audio Waveform Synchronization**: Sync your script with audio tracks
- **Mirror Mode**: Perfect for reflecting glass teleprompters
- **Native Filesystem Storage**: No storage limits - save unlimited projects and audio files
- **Cross-Platform**: Runs on Windows, macOS, and Linux

## Development

### Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Rust** - [Install via rustup](https://rustup.rs/)
3. **Tauri CLI** - Installed automatically via npm

### System Dependencies

**Windows:**
- Microsoft Visual Studio C++ Build Tools
- WebView2 (usually pre-installed on Windows 10/11)

**macOS:**
- Xcode Command Line Tools: `xcode-select --install`

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd proteleprompter
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install Tauri CLI:**
   ```bash
   npm install -D @tauri-apps/cli
   ```

### Running in Development

**Web Preview (for UI development):**
```bash
npm run dev
```

**Desktop App (full native features):**
```bash
npm run tauri dev
```

### Building for Production

**Build the desktop application:**
```bash
npm run tauri build
```

The built application will be in:
- **Windows:** `src-tauri/target/release/ProTeleprompter.exe`
- **macOS:** `src-tauri/target/release/bundle/dmg/ProTeleprompter.dmg`
- **Linux:** `src-tauri/target/release/bundle/appimage/ProTeleprompter.AppImage`

## Architecture

### Storage

When running as a desktop app, ProTeleprompter uses the native filesystem:
- **Projects:** `~/<AppData>/proteleprompter/projects/`
- **Audio Library:** `~/<AppData>/proteleprompter/audio-library/`

This provides:
- ✅ Unlimited storage (no browser quotas)
- ✅ Fast file access
- ✅ Projects persist across browser sessions
- ✅ Large audio files supported

When running in web preview mode, it falls back to IndexedDB/localStorage with typical browser limitations.

### Project Structure

```
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── core/              # Core business logic
│   │   └── storage/       # Storage abstraction (native + web fallback)
│   ├── hooks/             # React hooks
│   └── store/             # State management (Zustand)
├── src-tauri/             # Tauri backend (Rust)
│   ├── src/main.rs        # Native commands
│   └── tauri.conf.json    # App configuration
└── public/                # Static assets
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start web development server |
| `npm run build` | Build for web deployment |
| `npm run tauri dev` | Run desktop app in development |
| `npm run tauri build` | Build desktop application |

## License

MIT © ProTeleprompter
