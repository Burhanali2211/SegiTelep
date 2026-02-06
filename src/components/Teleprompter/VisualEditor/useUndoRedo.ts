import { useCallback, useState } from 'react';
import { ImagePage, useVisualEditorState } from './useVisualEditorState';
import { safeSerialize } from '@/utils/serializationHelpers';

interface UndoRedoState {
  pages: ImagePage[];
}

const MAX_HISTORY = 50;

// Simple module-level storage for undo/redo stacks
const undoStack: UndoRedoState[] = [];
const redoStack: UndoRedoState[] = [];

export const useUndoRedo = () => {
  const pages = useVisualEditorState((s) => s.pages);
  
  // Track stack lengths with useState for reactivity
  const [stackLengths, setStackLengths] = useState({ undo: 0, redo: 0 });
  
  // Update stack lengths helper
  const updateStackLengths = useCallback(() => {
    setStackLengths({ undo: undoStack.length, redo: redoStack.length });
  }, []);
  
  const saveState = useCallback(() => {
    try {
      // Use safe serialization to handle any non-serializable data
      const currentState: UndoRedoState = {
        pages: safeSerialize(pages),
      };
      
      undoStack.push(currentState);
      
      if (undoStack.length > MAX_HISTORY) {
        undoStack.shift();
      }
      
      // Clear redo stack on new action
      redoStack.length = 0;
      updateStackLengths();
    } catch (error) {
      console.error('[UndoRedo] Failed to save state:', error);
    }
  }, [pages, updateStackLengths]);
  
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    try {
      const currentPages = useVisualEditorState.getState().pages;
      const currentState: UndoRedoState = {
        pages: safeSerialize(currentPages),
      };
      redoStack.push(currentState);
      
      const prevState = undoStack.pop();
      if (prevState) {
        useVisualEditorState.setState({ pages: prevState.pages, isDirty: true });
      }
      updateStackLengths();
    } catch (error) {
      console.error('[UndoRedo] Failed to undo:', error);
    }
  }, [updateStackLengths]);
  
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    try {
      const currentPages = useVisualEditorState.getState().pages;
      const currentState: UndoRedoState = {
        pages: safeSerialize(currentPages),
      };
      undoStack.push(currentState);
      
      const nextState = redoStack.pop();
      if (nextState) {
        useVisualEditorState.setState({ pages: nextState.pages, isDirty: true });
      }
      updateStackLengths();
    } catch (error) {
      console.error('[UndoRedo] Failed to redo:', error);
    }
  }, [updateStackLengths]);
  
  const canUndo = stackLengths.undo > 0;
  const canRedo = stackLengths.redo > 0;
  
  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
