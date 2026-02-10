import { useEffect } from 'react';

export interface KeyboardShortcutsHandlers {
  setShowShortcuts: (v: boolean) => void;
  createNewProject: () => void;
  setShowProjectList: (v: boolean) => void;
  handleExport: () => void;
  saveProject: () => void;
  setDrawing: (v: boolean) => void;
  selectedSegmentIds: Set<string>;
  saveState: () => void;
  deleteSegments: (ids: string[]) => void;
  copySelected: () => void;
  paste: () => void;
  duplicateSegment: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  undo: () => void;
  redo: () => void;
  zoom: number;
  setZoom: (z: number) => void;
  pages: { length: number };
  currentPageIndex: number;
  setCurrentPage: (i: number) => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutsHandlers) {
  const {
    setShowShortcuts,
    createNewProject,
    setShowProjectList,
    handleExport,
    saveProject,
    setDrawing,
    selectedSegmentIds,
    saveState,
    deleteSegments,
    copySelected,
    paste,
    duplicateSegment,
    selectAll,
    deselectAll,
    undo,
    redo,
    zoom,
    setZoom,
    pages,
    currentPageIndex,
    setCurrentPage,
  } = handlers;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }
      if (ctrl && e.key === 'n') {
        e.preventDefault();
        createNewProject();
        return;
      }
      if (ctrl && e.key === 'o') {
        e.preventDefault();
        setShowProjectList(true);
        return;
      }
      if (ctrl && e.shiftKey && e.key === 's') {
        e.preventDefault();
        handleExport();
        return;
      }
      if (ctrl && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        saveProject();
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setDrawing(true);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSegmentIds.size > 0) {
        e.preventDefault();
        saveState();
        deleteSegments(Array.from(selectedSegmentIds));
        return;
      }
      if (ctrl && e.key === 'c') {
        e.preventDefault();
        copySelected();
        return;
      }
      if (ctrl && e.key === 'v') {
        e.preventDefault();
        saveState();
        paste();
        return;
      }
      if (ctrl && e.key === 'd' && selectedSegmentIds.size === 1) {
        e.preventDefault();
        saveState();
        duplicateSegment(Array.from(selectedSegmentIds)[0]);
        return;
      }
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        deselectAll();
        setDrawing(false);
        return;
      }
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (ctrl && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(zoom + 0.25);
        return;
      }
      if (e.key === '-') {
        e.preventDefault();
        setZoom(zoom - 0.25);
        return;
      }
      if (e.key === 'PageUp') {
        e.preventDefault();
        if (currentPageIndex > 0) setCurrentPage(currentPageIndex - 1);
        return;
      }
      if (e.key === 'PageDown') {
        e.preventDefault();
        if (currentPageIndex < pages.length - 1) setCurrentPage(currentPageIndex + 1);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    setShowShortcuts,
    createNewProject,
    setShowProjectList,
    handleExport,
    saveProject,
    setDrawing,
    selectedSegmentIds,
    saveState,
    deleteSegments,
    copySelected,
    paste,
    duplicateSegment,
    selectAll,
    deselectAll,
    undo,
    redo,
    zoom,
    setZoom,
    pages.length,
    currentPageIndex,
    setCurrentPage,
  ]);
}
