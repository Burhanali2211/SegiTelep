import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export type AppView = 'home' | 'visual';
export type EditorType = 'visual';

export const useAppViewState = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize app view from localStorage or default to 'home'
  const [appView, setAppView] = useState<AppView>(() => {
    // Check URL params first (handles both /?view=... and /#/...)
    const params = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.search);
    const viewParam = params.get('view') as AppView;

    if (viewParam && ['home', 'visual'].includes(viewParam)) {
      return viewParam;
    }

    const saved = localStorage.getItem('teleprompter-app-view');
    return (saved as AppView) || 'home';
  });

  // Always use 'visual' editor type now
  const [editorType, setEditorType] = useState<EditorType>('visual');

  // Update URL when view changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (appView !== 'home') {
      params.set('view', appView);
    }

    // Editor type is always visual, so we only set it if explicitly needed in URL
    params.set('editor', 'visual');

    const newUrl = params.toString() ? `/?${params.toString()}` : '/';
    navigate(newUrl, { replace: true });
  }, [appView, navigate]);

  // Persist app view changes to localStorage
  useEffect(() => {
    localStorage.setItem('teleprompter-app-view', appView);
  }, [appView]);

  // Persist editor type changes to localStorage
  useEffect(() => {
    localStorage.setItem('teleprompter-editor-type', 'visual');
  }, []);

  return {
    appView,
    setAppView,
    editorType,
    setEditorType,
  };
};
