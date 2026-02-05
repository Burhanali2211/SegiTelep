

# Improved Layout for Visual Editing

## Problem Analysis

The current layout divides the screen into 3 fixed horizontal panels, resulting in only ~35% of screen width for the editor. The VisualSegmentEditor then further splits this with a 256px regions sidebar, leaving an extremely cramped canvas area for drawing regions.

---

## Solution: Context-Aware Layout System

Implement a dynamic layout that adapts based on the current editing mode:

### Layout Modes

| Mode | When Active | Layout |
|------|------------|--------|
| **Text Mode** | Text segment selected | Current 3-panel horizontal layout |
| **Visual Mode** | Image/PDF segment selected | 2-panel layout with collapsible segment list |
| **Fullscreen Editor** | User clicks "Expand" | Editor takes full workspace, preview in floating panel |

---

## Visual Mode Layout Design

When editing images/PDFs, use this optimized layout:

```text
+------------------------------------------+
| Header                                    |
+------+-----------------------------------+
|      |                                   |
| Seg  |     LARGE IMAGE CANVAS            |
| List |     (Region Selection Area)       |
| (col |                                   |
| lap- |                                   |
| si-  +-----------------------------------+
| ble) | Regions Strip (horizontal)        |
|      | [Reg1] [Reg2] [Reg3] [+Add]       |
+------+-----------------------------------+
| Mini Preview | Playback Controls         |
+------------------------------------------+
```

### Key Changes

1. **Collapsible Segment List**: Toggle button to collapse to icons-only (48px) or hide completely
2. **Horizontal Regions Strip**: Move regions panel from right side to bottom as a horizontal strip
3. **Bottom Mini Preview**: Small teleprompter preview at bottom (collapsible)
4. **Maximize Button**: Expand canvas to near-fullscreen for detailed region work

---

## Implementation Details

### Phase 1: Add Layout Mode State

**Update `src/store/teleprompterStore.ts`:**

Add new state for layout preferences:

```text
editor: {
  selectedSegmentId: string | null;
  layoutMode: 'default' | 'visual-expanded' | 'fullscreen-editor';
  segmentListCollapsed: boolean;
  previewCollapsed: boolean;
}
```

### Phase 2: Refactor Index.tsx Layout

**Modify `src/pages/Index.tsx`:**

- Detect when visual segment is selected
- Switch to visual-optimized layout automatically
- Add collapse/expand buttons for panels
- Move preview to bottom in visual mode

```text
Layout Logic:
IF selectedSegment is visual type:
  - Collapse segment list to 48px (icons only)
  - Hide teleprompter preview OR move to bottom as mini-preview
  - Give editor maximum horizontal space
ELSE:
  - Use current 3-panel layout
```

### Phase 3: Redesign VisualSegmentEditor

**Modify `src/components/Teleprompter/editors/VisualSegmentEditor.tsx`:**

Current internal layout:
```text
[Header]
[Settings Bar]
[Image Canvas (flex-1)] | [Regions Panel (256px fixed)]
```

New internal layout:
```text
[Compact Header with inline settings]
[Image Canvas (full width, maximum height)]
[Horizontal Region Strip (80px height)]
```

### Phase 4: Create CollapsiblePanel Component

**Create `src/components/ui/collapsible-panel.tsx`:**

A wrapper that smoothly collapses panels with:
- Animated width/height transitions
- Icon-only collapsed state
- Expand button

### Phase 5: Add Bottom Mini Preview

**Create `src/components/Teleprompter/MiniPreview.tsx`:**

A compact teleprompter preview (150px height) that:
- Shows current segment preview
- Has play/pause button
- Can be expanded to full preview
- Can be completely hidden

---

## UI Mockup: Visual Mode

```text
+----------------------------------------------------------------+
| [=] ProTeleprompter | Image Segment | [Collapse] [Expand] [X]  |
+----+-----------------------------------------------------------+
| S  |                                                            |
| E  |                                                            |
| G  |           LARGE IMAGE CANVAS                               |
| M  |           (Draw regions here)                              |
| E  |                                                            |
| N  |                                                            |
| T  |                                                            |
| S  +-----------------------------------------------------------+
|    | Regions: [Intro 5s] [Main 10s] [End 5s] [+ Draw] [Create] |
+----+-----------------------------------------------------------+
| [>] Mini Preview: Intro slide...     | [Play] Speed: 100px/s  |
+----------------------------------------------------------------+
```

### Collapsed Segment List (48px)

```text
+--+
|+ |  <- Add segment
|T |  <- Text segment icon
|I |  <- Image segment (selected)
|T |  <- Another text
+--+
```

---

## File Changes Summary

### Files to Modify

| File | Changes |
|------|---------|
| `src/store/teleprompterStore.ts` | Add layout mode state, collapse toggles |
| `src/pages/Index.tsx` | Context-aware layout switching, collapse buttons |
| `src/components/Teleprompter/editors/VisualSegmentEditor.tsx` | Horizontal regions strip, maximize button |
| `src/components/Teleprompter/SegmentList.tsx` | Collapsed icon-only mode |

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/Teleprompter/MiniPreview.tsx` | Compact bottom preview for visual mode |

---

## User Benefits

1. **4x more canvas space**: Image canvas gets ~80% of screen vs current ~25%
2. **Better region precision**: More room to draw accurate regions
3. **Quick toggle**: Easy to switch between full layout and editing focus
4. **Persistent preview**: Can still see preview while editing (just smaller)
5. **Smooth transitions**: Animated collapse/expand for professional feel

---

## Testing Checklist

After implementation:

- [ ] Segment list collapses to icon-only mode
- [ ] Visual segments trigger expanded layout automatically
- [ ] Can draw regions with more precision
- [ ] Regions strip shows all regions horizontally
- [ ] Mini preview shows current segment
- [ ] Can expand back to full 3-panel layout
- [ ] Layout preferences persist between segments

