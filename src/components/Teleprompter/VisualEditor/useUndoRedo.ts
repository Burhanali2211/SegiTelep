import { useCallback, useRef, useSyncExternalStore } from 'react';
import { ImagePage, useVisualEditorState } from './useVisualEditorState';
import { safeSerialize } from '@/utils/serializationHelpers';

interface UndoRedoState {
  pages: ImagePage[];
}

const MAX_HISTORY = 50;

// External store for undo/redo state to enable proper reactivity
const undoRedoStore = {
  undoStack: [] as UndoRedoState[],
  redoStack: [] as UndoRedoState[],
  listeners: new Set<() => void>(),
  
  subscribe(listener: () => void) {
    undoRedoStore.listeners.add(listener);
    return () => undoRedoStore.listeners.delete(listener);
  },
  
  notify() {
    undoRedoStore.listeners.forEach(l => l());
  },
  
  getSnapshot() {
    return {
      canUndo: undoRedoStore.undoStack.length > 0,
      canRedo: undoRedoStore.redoStack.length > 0,
    };
  },
};

export const useUndoRedo = () => {
  const pages = useVisualEditorState((s) => s.pages);
  
  // Subscribe to undo/redo state changes for reactivity
  const { canUndo, canRedo } = useSyncExternalStore(
    undoRedoStore.subscribe,
    undoRedoStore.getSnapshot,
    undoRedoStore.getSnapshot
  );
  
  const saveState = useCallback(() => {
    try {
      // Use safe serialization to handle any non-serializable data
      const currentState: UndoRedoState = {
        pages: safeSerialize(pages),
      };
      
      undoRedoStore.undoStack.push(currentState);
      
      if (undoRedoStore.undoStack.length > MAX_HISTORY) {
        undoRedoStore.undoStack.shift();
      }
      
      // Clear redo stack on new action
      undoRedoStore.redoStack = [];
      undoRedoStore.notify();
    } catch (error) {
      console.error('[UndoRedo] Failed to save state:', error);
    }
  }, [pages]);
  
  const undo = useCallback(() => {
    if (undoRedoStore.undoStack.length === 0) return;
    
    try {
      const currentPages = useVisualEditorState.getState().pages;
      const currentState: UndoRedoState = {
        pages: safeSerialize(currentPages),
      };
      undoRedoStore.redoStack.push(currentState);
      
      const prevState = undoRedoStore.undoStack.pop();
      if (prevState) {
        useVisualEditorState.setState({ pages: prevState.pages, isDirty: true });
      }
      undoRedoStore.notify();
    } catch (error) {
      console.error('[UndoRedo] Failed to undo:', error);
    }
  }, []);
  
  const redo = useCallback(() => {
    if (undoRedoStore.redoStack.length === 0) return;
    
    try {
      const currentPages = useVisualEditorState.getState().pages;
      const currentState: UndoRedoState = {
        pages: safeSerialize(currentPages),
      };
      undoRedoStore.undoStack.push(currentState);
      
      const nextState = undoRedoStore.redoStack.pop();
      if (nextState) {
        useVisualEditorState.setState({ pages: nextState.pages, isDirty: true });
      }
      undoRedoStore.notify();
    } catch (error) {
      console.error('[UndoRedo] Failed to redo:', error);
    }
  }, []);
  
  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
