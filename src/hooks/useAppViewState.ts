import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export type AppView = 'home' | 'text' | 'visual';
export type EditorType = 'text' | 'visual';

export const useAppViewState = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize app view from localStorage or default to 'home'
  const [appView, setAppView] = useState<AppView>(() => {
    // Check URL params first, then localStorage
    const params = new URLSearchParams(location.search);
    const viewParam = params.get('view') as AppView;
    
    if (viewParam && ['home', 'text', 'visual'].includes(viewParam)) {
      return viewParam;
    }
    
    const saved = localStorage.getItem('teleprompter-app-view');
    return (saved as AppView) || 'home';
  });
  
  // Initialize editor type from localStorage or default to 'text'
  const [editorType, setEditorType] = useState<EditorType>(() => {
    // Check URL params first, then localStorage
    const params = new URLSearchParams(location.search);
    const editorParam = params.get('editor') as EditorType;
    
    if (editorParam && ['text', 'visual'].includes(editorParam)) {
      return editorParam;
    }
    
    const saved = localStorage.getItem('teleprompter-editor-type');
    return (saved as EditorType) || 'text';
  });
  
  // Update URL when view changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (appView !== 'home') {
      params.set('view', appView);
    }
    if (editorType !== 'text') {
      params.set('editor', editorType);
    }
    
    const newUrl = params.toString() ? `/?${params.toString()}` : '/';
    navigate(newUrl, { replace: true });
  }, [appView, editorType, navigate]);
  
  // Persist app view changes to localStorage
  useEffect(() => {
    localStorage.setItem('teleprompter-app-view', appView);
  }, [appView]);
  
  // Persist editor type changes to localStorage
  useEffect(() => {
    localStorage.setItem('teleprompter-editor-type', editorType);
  }, [editorType]);

  return {
    appView,
    setAppView,
    editorType,
    setEditorType,
  };
};
