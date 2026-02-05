
# Complete Visual Mode Editor Rewrite

## Overview

This plan replaces the existing Visual Mode editor with a professional-grade image segment editor featuring comprehensive editing capabilities, multi-selection, audio waveform integration, zoom/pan controls, undo/redo, and keyboard shortcuts.

---

## Architecture

### New Component Structure

```text
src/components/Teleprompter/
├── VisualEditor/
│   ├── VisualEditor.tsx           (Main container - replaces VisualSegmentEditor)
│   ├── ImageCanvas.tsx            (Canvas with zoom/pan, segment drawing)
│   ├── SegmentOverlay.tsx         (Draggable/resizable segment rectangles)
│   ├── TimelineStrip.tsx          (Horizontal segment timeline with times)
│   ├── AudioWaveform.tsx          (Audio visualization and seek)
│   ├── PageNavigator.tsx          (Image/PDF page switcher)
│   ├── SelectionToolbar.tsx       (Floating toolbar for selected segments)
│   ├── SegmentListPanel.tsx       (Segment list grouped by page)
│   ├── useVisualEditorState.ts    (Hook for editor state management)
│   └── useUndoRedo.ts             (Hook for undo/redo functionality)
```

### State Management

New Zustand slice for visual editor state:

| State | Type | Purpose |
|-------|------|---------|
| images | ImagePage[] | Loaded images/PDFs with segments |
| currentPageIndex | number | Active page |
| selectedSegmentIds | Set<string> | Multi-selection |
| clipboard | Segment[] | Copy/paste buffer |
| zoom | number | Canvas zoom level (0.5-4) |
| pan | {x, y} | Canvas pan offset |
| isDrawing | boolean | Drawing mode active |
| chainTimesMode | boolean | Link segment times |
| hiddenSegmentIds | Set<string> | Hidden segments |
| undoStack | State[] | Undo history |
| redoStack | State[] | Redo history |
| playbackTime | number | Current audio position |
| audioFile | AudioFile | Loaded audio |

---

## Component Specifications

### 1. VisualEditor.tsx (Main Container)

Layout structure:

```text
+------------------------------------------------------------------+
| Header: [Pages: 1/3] [<] [>] | [Zoom] [Undo] [Redo] | [Preview]  |
+------------------------------------------------------------------+
|                                                                    |
|                    IMAGE CANVAS (80% height)                       |
|        (Zoom/pan, draw segments, move/resize segments)             |
|                                                                    |
+------------------------------------------------------------------+
| Audio Waveform (optional, 60px)                                    |
| [========|=====|======] [0:15 / 2:30] [Play] [Speed]              |
+------------------------------------------------------------------+
| Timeline Strip (80px)                                              |
| [Seg1: 00:00-00:05] [Seg2: 00:05-00:12] [+New]                    |
+------------------------------------------------------------------+
| Selection Toolbar (when segments selected)                         |
| [Delete] [Copy] [Deselect] [All] [-1s] [+1s] [Play Selection]     |
+------------------------------------------------------------------+
```

### 2. ImageCanvas.tsx

Features:
- Display current page/image with zoom and pan
- Draw new segments by click-drag
- Segment overlays with move and resize handles
- Alt+drag for panning when zoomed
- Click to select, Ctrl+click multi-select, Shift+click range select
- Double-click segment to edit label
- Grid/snap option for alignment

### 3. SegmentOverlay.tsx

Individual segment rectangle component:
- Draggable to reposition
- Resize handles on top and bottom edges
- Label display with inline edit
- Time display (start - end)
- Visual states: default, selected, multi-selected, hidden, playing
- Context menu: Edit, Duplicate, Delete, Hide, Play

### 4. TimelineStrip.tsx

Horizontal timeline showing all segments:
- Segments as colored bars with duration
- Click to select
- Drag edges to adjust start/end times
- Time input fields (MM:SS.CC format)
- "Capture time" buttons to set from current playback position
- +/- buttons for fine-tuning (100ms steps)
- Chain icon to toggle linked times mode

### 5. AudioWaveform.tsx

Audio visualization:
- Waveform rendering using Web Audio API
- Playhead position indicator
- Click to seek
- Segment markers on waveform
- Click segment marker to select
- Double-click segment marker to play that segment
- Playback controls: Play/Pause, speed (0.5x, 1x, 1.5x, 2x)
- Time display (current / total)

### 6. PageNavigator.tsx

For multi-page images/PDFs:
- Page thumbnails strip (collapsible)
- Page number with segment count badge
- Previous/Next page buttons
- "Add Image/PDF" button

### 7. SelectionToolbar.tsx

Floating toolbar when segments are selected:
- Delete selected
- Copy selected
- Paste (from clipboard)
- Duplicate
- Deselect
- Select All
- Shift times: -1s, +1s
- Mini player for single selection
- Count indicator: "3 selected"

### 8. SegmentListPanel.tsx

Right sidebar segment list:
- Grouped by page when multiple pages
- Segment row: thumbnail, label, time range
- Click to select (respects multi-select modifiers)
- Double-click to edit label
- Play button per segment
- Eye icon to toggle visibility
- Auto-scroll to currently playing segment
- Drag to reorder

---

## Segment Data Structure

```text
interface VisualSegment {
  id: string;
  pageIndex: number;
  region: { x, y, width, height };  // percentage coordinates
  label: string;
  startTime: number;    // seconds with centiseconds (e.g., 5.25)
  endTime: number;
  isHidden: boolean;
  order: number;        // for sequencing during playback
}
```

---

## Feature Implementation Details

### Multi-Selection

| Action | Behavior |
|--------|----------|
| Click | Select single, deselect others |
| Ctrl+Click | Toggle selection |
| Shift+Click | Range select (from last selected to clicked) |
| Ctrl+A | Select all on current page |
| Escape | Deselect all |
| Click canvas | Deselect all |

### Time Editing

- Input format: MM:SS.CC (e.g., 01:23.45)
- Capture buttons: Set start/end from current audio playback position
- Fine-tune buttons: +100ms / -100ms
- Chain mode: Changing end time shifts subsequent segments

### Zoom and Pan

| Control | Action |
|---------|--------|
| Mouse wheel | Zoom in/out at cursor |
| Zoom buttons | +25% / -25% / Reset to fit |
| Alt+Drag | Pan canvas when zoomed |
| Double-click canvas | Reset zoom |

### Undo/Redo

Actions tracked:
- Create segment
- Delete segment(s)
- Move segment
- Resize segment
- Change times
- Paste
- Reorder
- Hide/Show

Stack limit: 50 states

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause |
| S | Set start time to current |
| E | Set end time to current |
| N | New segment at current time |
| Delete/Backspace | Delete selected |
| Ctrl+C | Copy |
| Ctrl+V | Paste |
| Ctrl+D | Duplicate |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| +/- | Zoom in/out |
| Left/Right | Seek audio |
| Shift+Left/Right | Adjust times |
| Page Up/Down | Previous/Next page |
| Escape | Deselect |
| Ctrl+A | Select all |

---

## Files to Delete

| File | Reason |
|------|--------|
| `src/components/Teleprompter/editors/VisualSegmentEditor.tsx` | Replaced by new VisualEditor |
| `src/components/Teleprompter/editors/RegionSelector.tsx` | Replaced by ImageCanvas |

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/Teleprompter/VisualEditor/VisualEditor.tsx` | Main editor container |
| `src/components/Teleprompter/VisualEditor/ImageCanvas.tsx` | Canvas with zoom/pan and segment drawing |
| `src/components/Teleprompter/VisualEditor/SegmentOverlay.tsx` | Draggable/resizable segment component |
| `src/components/Teleprompter/VisualEditor/TimelineStrip.tsx` | Horizontal timeline editor |
| `src/components/Teleprompter/VisualEditor/AudioWaveform.tsx` | Audio visualization |
| `src/components/Teleprompter/VisualEditor/PageNavigator.tsx` | Page/image switcher |
| `src/components/Teleprompter/VisualEditor/SelectionToolbar.tsx` | Selection actions toolbar |
| `src/components/Teleprompter/VisualEditor/SegmentListPanel.tsx` | Segment list sidebar |
| `src/components/Teleprompter/VisualEditor/useVisualEditorState.ts` | State management hook |
| `src/components/Teleprompter/VisualEditor/useUndoRedo.ts` | Undo/redo hook |
| `src/components/Teleprompter/VisualEditor/index.ts` | Exports |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Import new VisualEditor, remove duplicate buttons |
| `src/components/Teleprompter/index.ts` | Update exports |
| `src/types/teleprompter.types.ts` | Add VisualSegment interface with time fields |
| `src/store/teleprompterStore.ts` | Add visual editor state slice |

---

## UI/UX Principles

1. **No duplicate controls**: Playback buttons appear only once (in timeline or header, not both)
2. **Context-aware UI**: Show only relevant controls for current action
3. **Responsive layout**: Canvas maximizes available space
4. **Consistent interactions**: Same click/drag behavior everywhere
5. **Visual feedback**: Clear selection states, hover effects, drag previews
6. **No file names displayed**: Segments identified by label and thumbnail only

---

## Implementation Order

1. Create state management hooks (useVisualEditorState, useUndoRedo)
2. Build ImageCanvas with zoom/pan and basic segment display
3. Add SegmentOverlay for move/resize
4. Create TimelineStrip for time editing
5. Build SelectionToolbar
6. Add PageNavigator
7. Create SegmentListPanel
8. Integrate AudioWaveform
9. Add keyboard shortcuts
10. Update Index.tsx layout
11. Clean up old files
