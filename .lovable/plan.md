
# Fix Plan: Save Function Not Working

## Problem Summary
The save functionality fails repeatedly due to stale closure values, race conditions during drag operations, and improper error handling. The save function captures state when the callback is created, but during rapid updates (dragging segments), this data becomes stale and causes save failures.

## Technical Analysis

### Issue 1: Stale Closure Values
The `saveProject` callback captures `pages` and `audioFile` at creation time:
```javascript
const saveProject = useCallback(async (...) => {
  const safePages = safeSerialize(pages);  // Uses stale closure value!
}, [projectId, projectName, pages, audioFile, ...]);
```
During retry, the same stale `pages` value is used.

### Issue 2: Race Condition During Drag
When dragging segments:
1. `updateSegment` fires on every mouse move
2. Each call sets `isDirty: true`
3. Multiple autosave attempts compete
4. Save uses stale data from original callback creation

### Issue 3: Double Serialization Overhead
Data goes through:
1. `safeSerialize(pages)` in useVisualProjectSession
2. `deepClone()` in saveProjectWeb
This is redundant and can fail on large image data.

## Solution

### Fix 1: Fetch Fresh State in saveProject
Instead of using closure values, get fresh state directly from the store:
```javascript
const saveProject = useCallback(async (showToast = true, retryCount = 0) => {
  // Get fresh state from store
  const state = useVisualEditorState.getState();
  const { pages, audioFile, projectName, projectId } = state;
  
  if (pages.length === 0) return;
  // ... rest of save logic
}, [setSaveStatus, setProjectId, setLastSaved, setIsDirty]);
```

### Fix 2: Add Save Lock During Drag
Prevent autosave from triggering during active drag operations:
```javascript
// In useVisualEditorState, add:
isActiveDrag: boolean;
setActiveDrag: (active: boolean) => void;

// In scheduleAutoSave:
if (useVisualEditorState.getState().isActiveDrag) {
  // Reschedule for later
  return;
}
```

### Fix 3: Remove Redundant Serialization
Use safeSerialize only once, not twice:
```javascript
// In saveProjectWeb, remove deepClone:
async function saveProjectWeb(project: VisualProject): Promise<void> {
  const db = await getDB();
  const updated = {
    ...project,
    modifiedAt: Date.now(),
  };
  await db.put('visualProjects', updated);
}
```
The data is already serialized by `safeSerialize` before it reaches this function.

### Fix 4: Better Error Handling
Add detailed error logging and prevent retry loop for certain errors:
```javascript
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[Save] Attempt ${retryCount + 1} failed:`, errorMessage, error);
  
  // Don't retry for data structure errors
  if (errorMessage.includes('DataCloneError') || 
      errorMessage.includes('circular') ||
      errorMessage.includes('could not be cloned')) {
    setSaveStatus('error');
    toast.error('Save failed: Invalid data structure');
    return;
  }
  // ... continue with retry for transient errors
}
```

## Files to Modify

### 1. src/hooks/useVisualProjectSession.ts
- Change `saveProject` to fetch fresh state from store
- Add drag lock check in autosave
- Improve error handling with specific error messages
- Remove dependency on closure values

### 2. src/core/storage/VisualProjectStorage.ts
- Remove redundant `deepClone` in `saveProjectWeb`
- Add error wrapping for better debugging

### 3. src/components/Teleprompter/VisualEditor/useVisualEditorState.ts
- Add `isActiveDrag` state flag
- Add `setActiveDrag` action

### 4. src/components/Teleprompter/VisualEditor/ImageCanvas.tsx
- Call `setActiveDrag(true)` on drag start
- Call `setActiveDrag(false)` on drag end

## Implementation Steps

1. **Update useVisualEditorState**: Add isActiveDrag flag and setter
2. **Update ImageCanvas**: Set drag flag during segment drag operations
3. **Fix saveProject**: Use fresh store state, not closures
4. **Fix saveProjectWeb**: Remove redundant deepClone
5. **Add Error Details**: Log specific error types for debugging

## Expected Outcome
- Save will work reliably during and after drag operations
- No more "Max retries exceeded" errors
- Clear error messages if save fails for a specific reason
- Both web and desktop versions will save correctly
