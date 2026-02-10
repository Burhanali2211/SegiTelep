export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const centis = Math.round((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
};

export const parseTime = (timeStr: string): number => {
  const match = timeStr.match(/^(\d+):(\d{2})\.(\d{2})$/);
  if (!match) return 0;
  const [, mins, secs, centis] = match;
  return parseInt(mins) * 60 + parseInt(secs) + parseInt(centis) / 100;
};
