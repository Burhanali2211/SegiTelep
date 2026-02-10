import React from 'react';
import { Bug } from 'lucide-react';

interface DevConsoleToggleProps {
  onClick: () => void;
  isDevelopment?: boolean;
}

export const DevConsoleToggle: React.FC<DevConsoleToggleProps> = ({ 
  onClick, 
  isDevelopment = import.meta.env.DEV 
}) => {
  if (!isDevelopment) return null;

  return (
    <div className="fixed top-4 right-4 z-40">
      <button
        onClick={onClick}
        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
        title="Toggle Developer Console (Ctrl + `)"
      >
        <Bug className="w-4 h-4" />
        <span className="text-sm font-medium">Dev Console</span>
      </button>
    </div>
  );
};