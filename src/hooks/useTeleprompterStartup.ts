import { useState, useEffect } from 'react';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { createProject, getAllProjects, loadProject } from '@/core/storage/ProjectStorage';
import { AppView } from './useAppViewState';

export const useTeleprompterStartup = (appView: AppView) => {
  const [initialized, setInitialized] = useState(false);
  const setProject = useTeleprompterStore((s) => s.setProject);
  const addSegment = useTeleprompterStore((s) => s.addSegment);
  
  // Initialize text editor only when user opens it (not on app load)
  useEffect(() => {
    if (appView !== 'text') return;
    if (initialized) return;

    const init = async () => {
      try {
        const projects = await getAllProjects();
        if (projects.length > 0) {
          const recent = await loadProject(projects[0].id);
          if (recent) setProject(recent);
        } else {
          const newProject = await createProject('My First Script');
          setProject(newProject);
        }
      } catch (error) {
        console.error('Failed to initialize teleprompter:', error);
      } finally {
        setInitialized(true);
      }
    };
    
    init();
  }, [appView, initialized, setProject]);

  // Add first segment if project is empty
  useEffect(() => {
    const project = useTeleprompterStore.getState().project;
    if (project && project.segments.length === 0) {
      addSegment({
        name: 'Introduction',
        content: `Welcome to SegiTelep!

This is your first segment. Click here to edit the text that will scroll on your teleprompter.

Here are some tips to get started:

• Use the segment list on the left to organize your script
• Adjust speed, font size, and colors in the editor toolbar
• Press SPACE to start/pause playback
• Use arrow keys to navigate between segments
• Press F for fullscreen mode
• Press M to mirror the display

Your text will scroll smoothly at the speed you set. Try adjusting the scroll speed using the up/down arrow keys during playback.

Delete this text and start writing your own script!`,
      });
    }
  }, [initialized, addSegment]);

  return { initialized };
};
