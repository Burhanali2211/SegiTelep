
# Production-Ready Visual Teleprompter Plan

## Overview
Transform the Visual Editor into a production-ready desktop application with robust session management, automatic persistence, and polished user experience.

---

## 1. Session Management & Persistence

### Auto-Save System
- Integrate `scheduleVisualAutoSave` with `useVisualEditorState` changes
- Save state automatically after 3 seconds of inactivity
- Display "Saving..." / "Saved" indicator in header
- Persist current project ID to localStorage for session restoration

### Session Restoration
- On app load, check localStorage for `lastVisualProjectId`
- Automatically restore last working project from IndexedDB
- Show "Restored session" toast notification
- Handle corrupted/missing project gracefully

### Session Timeout (1 Hour)
- Track last modification timestamp
- Clean up stale auto-save data older than 1 hour
- Warn user if restoring a session older than 1 hour

---

## 2. Project Management Improvements

### Enhanced Project Dropdown
- **New Project**: Clear state, create fresh project
- **Open Recent**: List last 10 projects with timestamps
- **Duplicate**: Copy current project
- **Delete**: Remove with confirmation dialog
- **Export**: Download as `.visualprompt.json`
- **Import**: Upload and restore project file

### Project List View
- Sortable by name/date
- Search/filter capability
- Preview thumbnails (first page)
- Delete confirmation modal

---

## 3. State Integration Updates

### Modified Files

**`useVisualEditorState.ts`** - Add persistence hooks:
- `projectId` state field
- `projectName` state field  
- `lastSaved` timestamp
- `isDirty` flag for unsaved changes
- `loadProject()` action
- `markDirty()` triggered on any state change

**`VisualEditor.tsx`** - Integrate auto-save:
- Subscribe to state changes
- Trigger `scheduleVisualAutoSave` on modifications
- Show save status in header
- Warn before closing with unsaved changes

---

## 4. UI/UX Polish

### Header Improvements
- Project name inline edit
- Save status indicator (Saved ✓ / Saving... / Unsaved changes)
- Last saved timestamp on hover
- Keyboard shortcut hints

### Empty States
- "No images" - prominent upload button with drag-drop
- "No segments" - instructional overlay showing how to draw
- "No audio" - subtle prompt in waveform area

### Loading States
- Skeleton loader while restoring session
- Progress indicator for large file imports
- Disabled controls during save operations

### Notifications
- "Project saved" on manual save
- "Auto-saved" quietly in status bar
- "Project restored" on session restore
- Error toasts with retry options

---

## 5. Unsaved Changes Protection

### Before Leave Warning
- Add `beforeunload` event listener
- Check `isDirty` flag
- Show native browser confirmation dialog

### Route Change Protection
- Wrap with custom confirmation modal
- Offer Save/Discard/Cancel options

---

## 6. Keyboard Shortcuts

### Add Missing Shortcuts
- `Ctrl+O` - Open project dialog
- `Ctrl+N` - New project
- `Ctrl+Shift+S` - Save As (export)
- `?` - Show shortcuts overlay

### Shortcuts Help Panel
- Floating overlay triggered by `?`
- Categorized: File, Edit, Playback, Navigation
- Searchable

---

## 7. Performance Optimizations

### Memory Management
- Lazy load project pages (thumbnails first)
- Cleanup unused image data on page remove
- Throttle auto-save to prevent excessive writes

### Rendering Optimizations
- Virtualized segment list for 50+ segments
- Debounced canvas redraws
- Memoized expensive calculations

---

## 8. Error Handling

### Graceful Degradation
- IndexedDB unavailable fallback (localStorage)
- Audio decode failure handling
- Image load error states
- Network timeout recovery

### User Feedback
- Specific error messages (not generic)
- Retry buttons where applicable
- Contact support link for persistent issues

---

## Technical Implementation

### Files to Create
1. `src/hooks/useVisualProjectSession.ts` - Session management hook
2. `src/components/Teleprompter/VisualEditor/ProjectListDialog.tsx` - Full project browser

### Files to Modify
1. `src/components/Teleprompter/VisualEditor/useVisualEditorState.ts` - Add persistence fields
2. `src/components/Teleprompter/VisualEditor/VisualEditor.tsx` - Integrate session management
3. `src/core/storage/VisualProjectStorage.ts` - Add session restoration utilities
4. `src/pages/Index.tsx` - Add beforeunload handler

### New Dependencies
None required - using existing `idb`, `zustand`, and `sonner`.

---

## Implementation Order

1. **Phase 1**: State integration (persistence fields, dirty tracking)
2. **Phase 2**: Auto-save integration with debounce
3. **Phase 3**: Session restoration on app load
4. **Phase 4**: Unsaved changes protection
5. **Phase 5**: Enhanced project management UI
6. **Phase 6**: Polish (empty states, loading, shortcuts)

---

## Estimated Changes

| Component | Lines Changed |
|-----------|--------------|
| useVisualEditorState.ts | +80 |
| VisualEditor.tsx | +120 |
| VisualProjectStorage.ts | +50 |
| useVisualProjectSession.ts (new) | +100 |
| ProjectListDialog.tsx (new) | +180 |
| Index.tsx | +30 |

**Total**: ~560 lines of new/modified code

