# 🎬 SegiTelep Pro - Professional Segmentation Teleprompter

![SegiTelep Pro Banner](https://img.shields.io/badge/Status-Pro_Version-blue?style=for-the-badge&logo=appveyor)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite)
![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC107?style=for-the-badge&logo=tauri)

**SegiTelep Pro** is a high-performance, studio-grade visual teleprompter application designed for news anchors, content creators, and professional broadcasters. Unlike traditional text-only prompters, SegiTelep focuses on **visual segmentation**, allowing users to map script segments to specific images, PDF slides, and audio triggers for a seamless production experience.

---

## 🔥 Key Features

### 🖼️ Visual Command Center
- **Advanced Visual Editor**: Map script segments directly onto high-resolution images or PDF pages.
- **Timeline Strip**: A responsive, scrollable timeline for managing project segments with precision.
- **Dynamic Selection Toolbar**: Real-time tools for cropping, resizing, and positioning visual cues.

### 📄 Document & Asset Management
- **PDF Integration**: Full PDF support with page-by-page selection and thumbnail previewing.
- **Intelligent Asset Manager**: Efficiently handles images and large PDF files via IndexedDB and local storage.
- **Audio Synchronization**: Attach audio cues or background tracks to specific segments with live waveform visualization.

### ⚙️ Performance & Core Engines
- **Scroll Engine**: Ultra-smooth, hardware-accelerated scrolling for consistent teleprompter movement.
- **Render Engine**: Optimized canvas-based rendering for high-resolution visual prompts without lag.
- **Virtualization**: Uses `react-window` and `react-virtualized-auto-sizer` for lightning-fast handling of large PDF files and many-segment projects.

### 🎮 Broadcast-Ready Tools
- **Go Live Mode**: Dedicated fullscreen player with a clean, distraction-free interface for actual broadcasts.
- **Remote Control**: Integrated support for controlling the prompter via external devices.
- **Smart Countdown**: Customizable pre-roll countdowns to ensure perfect timing.
- **Statistics**: Built-in script analytics and timing calculators.

---

## 🛠️ Technology Stack

### Core Frameworks
- **Frontend**: [React 18](https://reactjs.org/) with **TypeScript** for type-safe development.
- **Build Tool**: [Vite](https://vitejs.dev/) for blazing-fast HMR and optimized builds.
- **Desktop Shell**: [Tauri 2.0](https://tauri.app/) for native cross-platform performance and local filesystem access.

### UI & Styling
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with `tailwindcss-animate`.
- **Components**: [Radix UI](https://www.radix-ui.com/) primitives for accessible and robust UI patterns.
- **Icons**: [Lucide React](https://lucide.dev/) for a clean, modern iconography set.
- **Animations**: Custom CSS transitions and framer-motion-like experiences with `embla-carousel`.

### State & Data
- **Global State**: [Zustand](https://github.com/pmndrs/zustand) for high-performance, boilerplate-free state management.
- **Data Persistence**: [IndexedDB (via idb)](https://github.com/jakearchibald/idb) for local project and asset storage.
- **Queries**: [TanStack Query (React Query)](https://tanstack.com/query/latest) for state-synchronized data fetching.

### Specialized Modules
- **PDF Rendering**: `pdfjs-dist` for high-fidelity document parsing.
- **Storage**: Custom `AssetManager` and `ProjectStorage` built on top of browser and native APIs.

---

## 📁 Directory Structure

```text
SegiTelep/
├── src/
│   ├── api/             # API services and external integrations
│   ├── components/      
│   │   ├── Layout/      # Shared layout components (Header, Logo)
│   │   ├── Teleprompter/ # Core functionality (Editors, Controls, Displays)
│   │   │   ├── VisualEditor/ # The primary visual-segment mapping tool
│   │   │   ├── AudioManager/ # Audio recording and playback logic
│   │   │   └── VoiceInput/   # Speech-to-text integration
│   │   └── ui/          # Reusable Radix-based UI toolkit
│   ├── core/            # The heavy lifters
│   │   ├── engine/      # Scroll and Render engines
│   │   ├── projects/    # Project creation and manipulation logic
│   │   └── storage/     # DB, Asset, and Native storage adapters
│   ├── hooks/           # Shared React hooks (Undo/Redo, Sync, etc.)
│   ├── store/           # Zustand store slices for global state
│   ├── types/           # Global TypeScript definitions
│   └── utils/           # Helper functions for calculations and formatting
├── src-tauri/           # Native Rust code for the desktop application
├── public/              # Static assets and fonts
└── package.json         # Dependencies and project scripts
```

---

## 🧠 Architectural Insights

### 1. The Rendering Loop
The project utilizes a dedicated `RenderEngine` that decouples the visual state from the React render cycle where necessary, ensuring that even complex visual segments scroll smoothly at high refresh rates.

### 2. Segment-Based Data Model
Everything is a **Segment**. Whether it's a block of text, an image, or a PDF page, the core logic treats them as sequential segments with timing and trigger properties, making it incredibly flexible for future media types.

### 3. Progressive Onboarding
The application features a "Psychological Hook" based onboarding process in `HomePage.tsx`, designed to make professionals feel "at home" by suggesting roles and studio settings immediately upon first lunch.

### 4. Cross-Platform Adapter Pattern
The system uses a robust adapter pattern (`NativeProjectAdapter` vs `WebProjectAdapter`) to handle project data seamlessly whether running as a web application or a native Tauri desktop app. This ensures consistent behavior regardless of the environment.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://www.rust-lang.org/) (if building the Tauri desktop version)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Burhanali2211/bright-script-pro.git
   cd SegiTelep
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Development
Start the Vite development server:
```bash
npm run dev
```

Run the Tauri desktop application:
```bash
npm run tauri dev
```

### Build
Create a production web bundle:
```bash
npm run build
```

Build the native desktop application:
```bash
npm run tauri build
```

---

## 👤 Author

**Ali**
- GitHub: [@Burhanali2211](https://github.com/Burhanali2211)
- Email: gamingcristy19@gmail.com

---

## 📄 License

This project is private and intended for professional use. All rights reserved.
