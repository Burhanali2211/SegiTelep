export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const centis = Math.round((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
};

export const parseTime = (timeStr: string): number => {
  const trimmed = timeStr.trim();
  if (!trimmed) return 0;

  // Handle M:SS format
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0] || '0') * 60 + parseFloat(parts[1] || '0');
    }
    if (parts.length === 3) {
      return parseInt(parts[0] || '0') * 3600 + parseInt(parts[1] || '0') * 60 + parseFloat(parts[2] || '0');
    }
  }

  // Handle User Shorthand: 1.37 -> 1m 37s
  // We only treat it as M.SS if there's exactly one dot and it looks like minutes.seconds
  if (trimmed.includes('.') && !trimmed.includes(':')) {
    const parts = trimmed.split('.');
    if (parts.length === 2) {
      const mins = parseInt(parts[0]) || 0;
      const secs = parseInt(parts[1]) || 0;
      // If the user types "1.37", treat as 1m 37s
      // If they type "0.5", treat as 0.5s (traditional decimal)
      // Standard heuristic: if mins > 0, it's M.SS. If mins == 0, it's decimal seconds.
      if (mins > 0) {
        return mins * 60 + secs;
      }
      return parseFloat(trimmed);
    }
  }

  return parseFloat(trimmed) || 0;
};

/**
 * Formats seconds for display, choosing between SSs and M:SS based on length.
 */
export const formatDuration = (seconds: number): string => {
  const rounded = Math.round(seconds);
  if (rounded < 60) return `${rounded}s`;

  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
