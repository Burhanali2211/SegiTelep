/**
 * Centralized welcome content for SegiTelep.
 * Content is sourced from here (not from backend) for consistency and theming support.
 * Theme variants (e.g. beige) can override these values later.
 */
export const WELCOME_CONTENT = {
  /** Main welcome heading */
  title: 'Welcome to SegiTelep',
  /** Tagline below the title */
  tagline: 'Create professional teleprompter presentations with visual segments',
  /** Section labels */
  sections: {
    recentProjects: 'Recent Projects',
    viewAll: 'View All',
    newProject: 'New Project',
    openExisting: 'Open Existing',
    noProjectsYet: 'No projects yet. Create your first project to get started!',
    autoResume: 'Resume last session automatically on startup',
  },
  /** Keyboard hints */
  keyboardHints: {
    new: 'New',
    navigate: 'Navigate',
    openSelected: 'Open selected',
  },
  /** Empty state */
  emptyState: {
    iconAlt: 'Project placeholder',
  },
} as const;

export type WelcomeContent = typeof WELCOME_CONTENT;
