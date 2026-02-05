import { useCallback, useRef } from 'react';
import { ImagePage, useVisualEditorState } from './useVisualEditorState';

interface UndoRedoState {
  pages: ImagePage[];
}

const MAX_HISTORY = 50;

export const useUndoRedo = () => {
  const undoStack = useRef<UndoRedoState[]>([]);
  const redoStack = useRef<UndoRedoState[]>([]);
  
  const pages = useVisualEditorState((s) => s.pages);
  
  const saveState = useCallback(() => {
    const currentState: UndoRedoState = {
      pages: JSON.parse(JSON.stringify(pages)),
    };
    
    undoStack.current.push(currentState);
    
    if (undoStack.current.length > MAX_HISTORY) {
      undoStack.current.shift();
    }
    
    // Clear redo stack on new action
    redoStack.current = [];
  }, [pages]);
  
  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    
    const currentState: UndoRedoState = {
      pages: JSON.parse(JSON.stringify(pages)),
    };
    redoStack.current.push(currentState);
    
    const prevState = undoStack.current.pop();
    if (prevState) {
      // Restore state - we need to update the store directly
      const store = useVisualEditorState.getState();
      useVisualEditorState.setState({ pages: prevState.pages });
    }
  }, [pages]);
  
  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    
    const currentState: UndoRedoState = {
      pages: JSON.parse(JSON.stringify(pages)),
    };
    undoStack.current.push(currentState);
    
    const nextState = redoStack.current.pop();
    if (nextState) {
      useVisualEditorState.setState({ pages: nextState.pages });
    }
  }, [pages]);
  
  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;
  
  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
  };
};
