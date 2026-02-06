
# Professional Header and Navigation System Redesign

## Overview

Transform the current basic header into a professional desktop-style navigation with organized menus, quick actions, and future-ready feature placeholders. This will make the application feel like a complete professional teleprompter tool.

---

## Current State Analysis

The existing header has:
- Basic hamburger menu with 4-5 items scattered
- Logo and app name
- Text/Visual mode tabs
- Project name display
- A few icon buttons (Settings, Shortcuts, Open)

**Problems:**
- Features are scattered across dropdown and icon buttons
- No organized menu structure (File, Edit, View, etc.)
- No dedicated pages for settings, templates, help
- Missing professional teleprompter features
- No way to access advanced features

---

## Proposed Header Structure

```text
+-----------------------------------------------------------------------------------------+
| [Logo] ProTeleprompter    | File | Edit | View | Playback | Tools | Help |    [Search] |
|                           |      |      |      |          |       |      |    [User]   |
+-----------------------------------------------------------------------------------------+
| [< Home] | Project: My Script [*] | [Text Mode] [Visual Mode] |  [Play] [Settings] [?] |
+-----------------------------------------------------------------------------------------+
```

### Main Menu Bar

**File Menu:**
- New Project (Ctrl+N)
- Open Project (Ctrl+O)
- Open Recent > (submenu with recent 5 projects)
- Save (Ctrl+S)
- Save As...
- Import Project
- Export Project
- Export as PDF (future)
- Export as Video (future placeholder)
- ─────────────
- Project Settings
- Exit

**Edit Menu:**
- Undo (Ctrl+Z)
- Redo (Ctrl+Shift+Z)
- ─────────────
- Cut (Ctrl+X)
- Copy (Ctrl+C)
- Paste (Ctrl+V)
- Duplicate (Ctrl+D)
- Delete (Del)
- ─────────────
- Select All (Ctrl+A)
- Deselect All (Esc)

**View Menu:**
- Toggle Sidebar (Ctrl+B)
- Toggle Preview Panel
- ─────────────
- Zoom In (+)
- Zoom Out (-)
- Fit to Window
- ─────────────
- Text Mode
- Visual Mode
- Expand Editor
- ─────────────
- Theme > Dark / Light / System (future)

**Playback Menu:**
- Play/Pause (Space)
- Stop (Esc)
- ─────────────
- Previous Segment
- Next Segment
- ─────────────
- Speed Presets > (submenu)
- Countdown Settings
- ─────────────
- Fullscreen Player (F)
- External Display (future)
- ─────────────
- Mirror Mode (M)
- Show Guide Line

**Tools Menu:**
- Segment Timer Calculator
- Script Statistics
- ─────────────
- Audio Manager
- ─────────────
- Templates > (future)
- ─────────────
- Keyboard Shortcuts (?)
- Remote Control (future placeholder)
- Voice Input (future placeholder)

**Help Menu:**
- Welcome Guide
- Keyboard Shortcuts
- ─────────────
- Documentation (link)
- Video Tutorials (link)
- ─────────────
- Check for Updates (future)
- About ProTeleprompter

---

## Secondary Toolbar

Below the main menu, a contextual toolbar with:

```text
| [← Home] | Project: [Name Input] [*unsaved] | [Text Mode | Visual Mode] | Spacer | [▶ Play] [⚙] [?] |
```

- **Home button**: Returns to Welcome Dashboard
- **Project name**: Editable inline
- **Mode switcher**: Text/Visual tabs
- **Play button**: Quick access to fullscreen player
- **Settings**: Opens project settings dialog
- **Help**: Opens keyboard shortcuts

---

## New Components to Create

### 1. `AppHeader.tsx` - Main Header Component
The main header with menu bar and toolbar

### 2. `MainMenuBar.tsx` - Menu System
Implements File, Edit, View, Playback, Tools, Help menus using `@radix-ui/react-menubar`

### 3. `SecondaryToolbar.tsx` - Quick Actions Bar
Project controls, mode switcher, play button

### 4. `ScriptStatisticsDialog.tsx` - Script Stats Tool
Shows word count, estimated reading time, segment count, etc.

### 5. `CountdownSettingsDialog.tsx` - Countdown Preferences
Configure countdown duration, enable/disable, sound effects

---

## New Feature Dialogs

### Script Statistics Dialog
```text
+------------------------------------------+
|  Script Statistics                       |
+------------------------------------------+
|  Total Segments: 12                      |
|  Total Words: 2,450                      |
|  Estimated Duration: 15:30               |
|  Average Speed: 120 wpm                  |
|                                          |
|  Pages: 5                                |
|  Visual Segments: 8                      |
|  Text Segments: 4                        |
+------------------------------------------+
```

### Countdown Settings Dialog
```text
+------------------------------------------+
|  Countdown Settings                      |
+------------------------------------------+
|  [x] Enable countdown before playback    |
|  Duration: [3] seconds                   |
|  [ ] Play sound on countdown             |
|  [ ] Show segment preview during count   |
+------------------------------------------+
```

---

## Implementation Phases

### Phase 1: Core Menu Bar Structure
1. Create `MainMenuBar.tsx` with all menu items
2. Create `SecondaryToolbar.tsx` for quick actions
3. Create `AppHeader.tsx` to combine both
4. Update `Index.tsx` to use new header

### Phase 2: Menu Functionality
1. Wire up existing actions (save, open, settings)
2. Implement View menu actions (zoom, sidebar toggle)
3. Implement Playback menu actions
4. Add keyboard shortcuts for all menu items

### Phase 3: New Feature Dialogs
1. Create `ScriptStatisticsDialog.tsx`
2. Create `CountdownSettingsDialog.tsx`
3. Create `AboutDialog.tsx`

### Phase 4: Future Placeholders
1. Add disabled menu items with "Coming Soon" tooltips
2. Template system placeholder
3. Multi-display placeholder
4. Voice input placeholder

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/Layout/AppHeader.tsx` | Main header wrapper |
| `src/components/Layout/MainMenuBar.tsx` | Menu bar with dropdowns |
| `src/components/Layout/SecondaryToolbar.tsx` | Quick action toolbar |
| `src/components/Layout/index.ts` | Barrel export |
| `src/components/Teleprompter/ScriptStatisticsDialog.tsx` | Script stats |
| `src/components/Teleprompter/CountdownSettingsDialog.tsx` | Countdown config |
| `src/components/Teleprompter/AboutDialog.tsx` | About dialog |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Replace header with new `AppHeader` component |
| `src/components/Teleprompter/VisualEditor/VisualEditor.tsx` | Remove duplicate header in visual mode |
| `src/hooks/useVisualProjectSession.ts` | Add navigation to home function |

### Menu Implementation

Using `@radix-ui/react-menubar` which is already available in the project:

```typescript
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
} from "@/components/ui/menubar";
```

### State Management

Add to teleprompter store:
- `showAbout: boolean`
- `showStatistics: boolean`
- `showCountdownSettings: boolean`

### Keyboard Shortcut Registry

Create a centralized shortcut handler:
```typescript
const GLOBAL_SHORTCUTS = {
  'ctrl+n': 'newProject',
  'ctrl+o': 'openProject',
  'ctrl+s': 'save',
  'ctrl+shift+s': 'saveAs',
  // ... etc
};
```

---

## Visual Design

### Header Styling
- Height: 40px for menu bar + 44px for toolbar = 84px total
- Background: `bg-card` with `border-b`
- Menu items: Ghost buttons with hover state
- Active menu: Primary color highlight

### Menu Dropdowns
- Width: Auto (min 200px)
- Icons: 16px Lucide icons
- Shortcuts: Right-aligned, muted color
- Separators: `<MenubarSeparator />`

### Icons for Menu Items

| Feature | Icon |
|---------|------|
| New Project | `FilePlus` |
| Open Project | `FolderOpen` |
| Save | `Save` |
| Import | `Upload` |
| Export | `Download` |
| Undo | `Undo2` |
| Redo | `Redo2` |
| Copy | `Copy` |
| Paste | `Clipboard` |
| Play | `Play` |
| Pause | `Pause` |
| Fullscreen | `Maximize` |
| Settings | `Settings` |
| Help | `HelpCircle` |
| About | `Info` |

---

## Testing Checklist

After implementation:
1. [ ] All menu items are clickable and perform actions
2. [ ] Keyboard shortcuts work for all menu items
3. [ ] Visual mode header is replaced with unified header
4. [ ] Home button navigates to Welcome Dashboard
5. [ ] Mode switcher works correctly
6. [ ] Play button opens fullscreen player
7. [ ] Recent projects submenu shows correct projects
8. [ ] Statistics dialog shows accurate counts
9. [ ] Countdown settings persist correctly
10. [ ] Disabled items show "Coming Soon" tooltip
