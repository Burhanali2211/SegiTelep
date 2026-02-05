

# Comprehensive Teleprompter Enhancement Plan

## Overview

This plan addresses the critical issues with image/PDF segment handling, adds region selection for creating multiple segments from a single image, implements proper audio synchronization, and creates separate editing interfaces for visual vs text content.

---

## Current Issues Identified

1. **No Region Selection for Images**: Cannot select multiple areas within an image to create separate segments
2. **Image Display Bug**: Images stored as base64 but rendering may show incorrectly
3. **Single Editor for All Types**: Text editor shown even for image/PDF segments
4. **Audio Sync Missing**: Audio manager exists but isn't connected to segments
5. **Missing Duration-based Playback**: Image/PDF segments need timed playback

---

## Architecture Changes

### New Component Structure

```text
src/components/Teleprompter/
├── editors/
│   ├── TextSegmentEditor.tsx     (current ContentEditor, renamed)
│   ├── VisualSegmentEditor.tsx   (NEW - for images/PDFs with region selection)
│   └── RegionSelector.tsx        (NEW - canvas-based region drawing tool)
├── SegmentList.tsx               (enhanced with visual indicators)
├── TeleprompterDisplay.tsx       (enhanced for timed playback)
└── AudioManager.tsx              (enhanced with segment binding)
```

---

## Implementation Details

### Phase 1: Extended Data Types

**Update `teleprompter.types.ts`:**

- Add `imageRegion` type for segments created from image regions
- Add region coordinates (x, y, width, height) to Segment interface
- Add `audioId` field to Segment for audio sync
- Add `sourceImageId` to track which image a region came from

```text
New Segment Type:
- type: 'text' | 'image' | 'image-region' | 'pdf-page'
- region?: { x, y, width, height } (percentage-based for responsiveness)
- audioId?: string (reference to audio file)
- sourceAssetId?: string (for regions, reference to source image)
```

### Phase 2: Visual Segment Editor with Region Selection

**New `VisualSegmentEditor.tsx`:**

A dedicated editor for images and PDFs that includes:

1. **Canvas-based image display** with zoom and pan
2. **Region selection tool** - draw rectangles on the image
3. **Region list** showing all selected regions as potential segments
4. **Per-region settings:**
   - Name
   - Duration (how long to display)
   - Audio assignment
5. **Batch operations:**
   - "Create All Segments" from selected regions
   - Reorder regions before creating
   - Preview individual regions

**Region Selection Flow:**

```text
1. Upload Image → Image displays on canvas
2. Click "Add Region" → Draw rectangle on image
3. Region appears in list → Set name, duration
4. Repeat for multiple regions
5. Click "Create Segments" → Creates one segment per region
6. Segments play sequentially with set durations
```

### Phase 3: Dynamic Editor Switching in Index.tsx

**Modify main layout:**

- Detect selected segment type
- Show `TextSegmentEditor` for text segments
- Show `VisualSegmentEditor` for image/pdf segments
- Pass relevant props to each editor

```text
Layout Logic:
IF selectedSegment.type === 'text'
   SHOW TextSegmentEditor (current ContentEditor)
ELSE IF selectedSegment.type === 'image' OR 'image-region' OR 'pdf-page'
   SHOW VisualSegmentEditor (new component)
```

### Phase 4: Enhanced Teleprompter Display

**Update `TeleprompterDisplay.tsx`:**

1. **Duration-based playback** for image/region segments
2. **Progress indicator** showing time remaining
3. **Auto-advance** when duration completes
4. **Region cropping** - display only the selected region from source image

**Playback Logic for Visual Segments:**

```text
1. Start segment → Start timer based on duration
2. Display image (or cropped region)
3. Progress bar shows elapsed/total time
4. When timer completes → Auto-advance to next segment
5. If audio attached → Play audio, optionally sync duration to audio length
```

### Phase 5: Audio Synchronization

**Enhance `AudioManager.tsx`:**

1. Add audio assignment per segment (store audioId in segment)
2. Play audio when segment starts
3. Option: "Match duration to audio length"
4. Stop audio when segment changes

**Update `teleprompterStore.ts`:**

- Add `setSegmentAudio(segmentId, audioId)` action
- Add audio playback state tracking

---

## User Interface Design

### Visual Segment Editor Layout

```text
┌─────────────────────────────────────────────────────────┐
│ [Image Name]                          [Zoom: 100%] [⚙]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│     ┌─────────────────────────────────────────────┐     │
│     │                                              │     │
│     │          IMAGE CANVAS                        │     │
│     │     (with drawn region rectangles)           │     │
│     │                                              │     │
│     │   ┌──────────┐                              │     │
│     │   │ Region 1 │     ┌──────────┐             │     │
│     │   └──────────┘     │ Region 2 │             │     │
│     │                    └──────────┘             │     │
│     └─────────────────────────────────────────────┘     │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ REGIONS                                    [+ Add Region]│
│ ├─ Region 1: Intro (5s)              [🔊] [⚙] [🗑]     │
│ ├─ Region 2: Main Point (10s)        [🔊] [⚙] [🗑]     │
│ └─ Region 3: Conclusion (5s)         [🔊] [⚙] [🗑]     │
├─────────────────────────────────────────────────────────┤
│ [Preview Selected] [Create All Segments]                 │
└─────────────────────────────────────────────────────────┘
```

### Region Settings Panel

```text
┌──────────────────────────────────┐
│ Region Settings                   │
├──────────────────────────────────┤
│ Name: [Introduction Slide      ] │
│ Duration: [5] seconds            │
│                                  │
│ Audio: [None selected    ▼]      │
│ □ Match duration to audio        │
│                                  │
│ [Save]                           │
└──────────────────────────────────┘
```

---

## File Changes Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/Teleprompter/editors/VisualSegmentEditor.tsx` | Main editor for images/PDFs with region selection |
| `src/components/Teleprompter/editors/RegionSelector.tsx` | Canvas component for drawing selection regions |
| `src/components/Teleprompter/editors/TextSegmentEditor.tsx` | Renamed from ContentEditor |

### Files to Modify

| File | Changes |
|------|---------|
| `src/types/teleprompter.types.ts` | Add region coordinates, audioId, new segment types |
| `src/store/teleprompterStore.ts` | Add audio sync actions, region management |
| `src/pages/Index.tsx` | Dynamic editor switching based on segment type |
| `src/components/Teleprompter/TeleprompterDisplay.tsx` | Duration-based playback, region cropping |
| `src/components/Teleprompter/SegmentList.tsx` | Visual indicators for segment types, region thumbnails |
| `src/components/Teleprompter/AudioManager.tsx` | Segment binding, enhanced playback |
| `src/core/engine/RenderEngine.ts` | Region cropping support for images |
| `src/components/Teleprompter/index.ts` | Export new components |

---

## Technical Implementation Notes

### Region Selection Algorithm

```text
1. Store regions as percentage coordinates (0-100) for responsiveness
2. Convert to pixel coordinates based on current canvas size for drawing
3. Support snap-to-edge with 10px tolerance
4. Minimum region size: 10% of image dimensions
5. Allow overlapping regions (same area can be multiple segments)
```

### Image Cropping for Regions

```text
When rendering a region segment:
1. Load source image from cache
2. Calculate crop coordinates from region percentages
3. Use ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
4. Scale cropped region to fill display
```

### Audio Synchronization

```text
When segment starts:
1. Check if segment has audioId
2. If yes, load audio from localStorage cache
3. Play audio
4. If "match duration" enabled, use audio.duration as segment duration
5. On segment end, stop audio
```

---

## Testing Checklist

After implementation, verify:

- [ ] Upload image and see it displayed (not as a link)
- [ ] Draw multiple regions on single image
- [ ] Create segments from regions
- [ ] Segments play with correct duration timing
- [ ] Region segments show cropped portion only
- [ ] Audio plays when segment with audio starts
- [ ] Audio stops when switching segments
- [ ] Text editor shows for text segments only
- [ ] Visual editor shows for image/PDF segments only
- [ ] All existing functionality still works

