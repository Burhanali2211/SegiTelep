
# Desktop Application Startup and Playback Improvements Plan

## ✅ IMPLEMENTATION COMPLETE

All phases have been implemented successfully.

---

## Changes Made

### Phase 1: Welcome Dashboard ✅
- Created `WelcomeDashboard.tsx` with recent projects list, thumbnails, and metadata
- Keyboard shortcuts: `N` for new, `↑↓` to navigate, `Enter` to open
- Auto-resume checkbox persisted to localStorage

### Phase 2: Duration Calculation ✅
- Fixed `totalDuration` in `FullscreenPlayer.tsx` to calculate from visible segments
- Duration now shows `00:00.00` when empty
- Uses `Math.max(lastSegmentEndTime, audioFile.duration)` when audio exists

### Phase 3: Playback Auto-Stop ✅
- Verified auto-stop logic at `elapsed >= totalDuration`
- Playback resets to beginning after completion
- Audio stops and resets with visual segments

### Phase 4: Session Restoration Flow ✅
- Added `StartupMode` type (`'welcome'` | `'editor'`)
- Added `AUTO_RESUME_KEY` localStorage preference
- Session only auto-restores when preference is enabled

### Phase 5: Integration ✅
- `VisualEditor` shows `WelcomeDashboard` when `startupMode === 'welcome'`
- Exported `WelcomeDashboard` from index

---

---

## Implementation Plan

### Phase 1: Welcome Dashboard / Startup Screen

**New Component: `WelcomeDashboard.tsx`**

Create a professional startup screen that displays:

```text
+--------------------------------------------------+
|                                                  |
|        Welcome to ProTeleprompter                |
|                                                  |
|   +------------------------------------------+   |
|   |   Recent Projects                        |   |
|   +------------------------------------------+   |
|   | [Thumb] Project Name 1      2h ago    >  |   |
|   | [Thumb] Project Name 2      1d ago    >  |   |
|   | [Thumb] Project Name 3      3d ago    >  |   |
|   +------------------------------------------+   |
|                                                  |
|   [ + New Project ]  [ Open Existing ]           |
|                                                  |
|   [ ] Resume last session automatically          |
|                                                  |
+--------------------------------------------------+
```

Features:
- Recent projects with thumbnails (first page image)
- Project metadata (last modified, page count, segment count)
- "New Project" button to start fresh
- "Open Existing" button to browse all projects
- Optional "Resume last session" checkbox (persisted preference)
- Keyboard shortcuts: `N` for new, `Enter` to open selected

**Files to Create:**
- `src/components/Teleprompter/VisualEditor/WelcomeDashboard.tsx`

**Files to Modify:**
- `src/pages/Index.tsx` - Add startup flow state machine
- `src/hooks/useVisualProjectSession.ts` - Add preference for auto-resume

---

### Phase 2: Fix Duration Calculation

**Current Problem in `FullscreenPlayer.tsx`:**
```typescript
const totalDuration = React.useMemo(() => {
  if (allSegments.length === 0) return 0;
  const maxSegmentEnd = Math.max(...allSegments.map(s => s.endTime));
  return audioFile?.duration ? Math.max(maxSegmentEnd, audioFile.duration) : maxSegmentEnd;
}, [allSegments, audioFile?.duration]);
```

**Fix:**
1. Calculate `lastSegmentEndTime` from the maximum `endTime` across ALL visible segments
2. Use `lastSegmentEndTime` as the base duration
3. Only extend with audio duration if audio is longer
4. Add safeguard for empty segments (show 0:00 not hardcoded value)

**Update formula:**
```typescript
const totalDuration = React.useMemo(() => {
  const visibleSegments = allSegments.filter(s => !s.isHidden);
  if (visibleSegments.length === 0) return 0;
  
  const lastSegmentEndTime = Math.max(...visibleSegments.map(s => s.endTime));
  
  // Use audio duration only if it's longer than segments
  if (audioFile?.duration && audioFile.duration > lastSegmentEndTime) {
    return audioFile.duration;
  }
  
  return lastSegmentEndTime;
}, [allSegments, audioFile?.duration]);
```

**Files to Modify:**
- `src/components/Teleprompter/VisualEditor/FullscreenPlayer.tsx`
- `src/components/Teleprompter/VisualEditor/AudioWaveform.tsx` (for consistency)

---

### Phase 3: Fix Segment Playback Auto-Stop

**Problem:** Playback may not stop correctly when the last segment ends.

**Solution in `FullscreenPlayer.tsx`:**

1. **Auto-stop at total duration:**
```typescript
// In the animate() function
if (elapsed >= totalDuration) {
  setPlaybackState('idle');
  pausedTimeRef.current = 0;
  setCurrentTime(0);
  setCurrentSegmentIndex(0);
  // Stop audio
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
  return; // Exit animation loop
}
```

2. **Handle case when last segment ends but audio continues:**
- If segments end before audio, show black screen but continue playing audio
- If audio ends before segments, segments continue displaying in timed sequence

3. **Add "loop" option (optional enhancement):**
- User preference to loop playback
- When enabled, restart from beginning instead of stopping

**Files to Modify:**
- `src/components/Teleprompter/VisualEditor/FullscreenPlayer.tsx`

---

### Phase 4: Session Restoration Flow

**Improve `useVisualProjectSession.ts`:**

1. Add startup mode preference:
```typescript
type StartupMode = 'welcome' | 'auto-resume' | 'last-project';
```

2. Store preference in localStorage:
```typescript
const STARTUP_MODE_KEY = 'teleprompter-startup-mode';
```

3. Expose loading state to UI:
```typescript
return {
  ...existing,
  startupMode,
  setStartupMode,
  hasStoredSession: !!localStorage.getItem(LAST_PROJECT_KEY),
};
```

**Files to Modify:**
- `src/hooks/useVisualProjectSession.ts`

---

### Phase 5: Performance Optimizations for Low-End Windows

1. **Lazy loading of heavy components:**
```typescript
const FullscreenPlayer = React.lazy(() => import('./FullscreenPlayer'));
const WelcomeDashboard = React.lazy(() => import('./WelcomeDashboard'));
```

2. **Image optimization:**
- Add image compression on upload (already using EXIF normalization)
- Limit thumbnail sizes for project list
- Use `loading="lazy"` for non-visible images

3. **Memory management:**
- Clear unused image data when switching pages
- Implement LRU cache for loaded images
- Release audio resources when not playing

4. **Canvas optimization:**
- Use `requestAnimationFrame` efficiently (already done)
- Reduce canvas redraws when not playing
- Batch segment marker rendering

---

## Technical Details

### New State for Startup Flow

Add to `useVisualEditorState.ts` or create new store:
```typescript
interface AppStartupState {
  showWelcome: boolean;
  startupMode: 'welcome' | 'auto-resume';
  isRestoring: boolean;
  restoredProjectId: string | null;
}
```

### Startup Flow Sequence

```text
App Launch
    |
    v
Check startup preference
    |
    +-- auto-resume = true --> Restore last session --> Editor
    |
    +-- auto-resume = false --> Show Welcome Dashboard
                                     |
                                     +-- Select project --> Load --> Editor
                                     |
                                     +-- New project --> Editor (empty)
```

### Duration Display Fixes

| Scenario | Duration Shown |
|----------|---------------|
| No segments | 00:00.00 |
| 3 segments (last ends at 15s) | 00:15.00 |
| 3 segments (15s) + Audio (45s) | 00:45.00 |
| 3 segments (45s) + Audio (15s) | 00:45.00 |

---

## Files to Be Modified

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Add startup flow, welcome dashboard integration |
| `src/components/Teleprompter/VisualEditor/VisualEditor.tsx` | Integrate welcome dashboard |
| `src/components/Teleprompter/VisualEditor/FullscreenPlayer.tsx` | Fix duration calculation, auto-stop |
| `src/hooks/useVisualProjectSession.ts` | Add startup preferences |

## New Files to Be Created

| File | Purpose |
|------|---------|
| `src/components/Teleprompter/VisualEditor/WelcomeDashboard.tsx` | Startup welcome screen |

---

## Testing Checklist

After implementation, verify:

1. **Startup Flow:**
   - [ ] App launches to Welcome Dashboard (first time)
   - [ ] Recent projects display with thumbnails
   - [ ] "New Project" creates empty project
   - [ ] "Open Existing" shows full project list
   - [ ] Auto-resume preference persists across sessions

2. **Duration Display:**
   - [ ] Empty project shows 00:00.00
   - [ ] Duration updates as segments are added
   - [ ] Duration reflects last segment end time
   - [ ] Audio duration extends total if longer than segments

3. **Playback:**
   - [ ] Segments advance at correct times
   - [ ] Playback stops when last segment ends
   - [ ] Playback stops when audio ends (if audio present)
   - [ ] Restart works correctly after completion

4. **Performance:**
   - [ ] Smooth scrolling on low-end hardware
   - [ ] No memory leaks on project switching
   - [ ] Canvas renders at 60 FPS during playback
