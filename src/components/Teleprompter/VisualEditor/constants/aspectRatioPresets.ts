import {
  Maximize,
  Monitor,
  RectangleHorizontal,
  MonitorPlay,
  Square,
  Smartphone,
  Tv,
  Settings2
} from 'lucide-react';

export const ASPECT_RATIO_PRESETS = [
  { value: 'free', label: 'Free Draw', description: 'Flexible region', icon: Maximize },
  { value: 'auto-detect', label: 'Auto (Screen)', description: 'Match display', icon: Monitor },
  { value: '16:9', label: '16:9 Wide', description: 'Cinematic / YouTube', icon: MonitorPlay },
  { value: '4:3', label: '4:3 Standard', description: 'SD / TV Broadcast', icon: Tv },
  { value: '1:1', label: '1:1 Square', description: 'Social Media', icon: Square },
  { value: '9:16', label: '9:16 Vertical', description: 'Shorts / TikTok', icon: Smartphone },
  { value: '21:9', label: '21:9 Ultra', description: 'Panoramic view', icon: RectangleHorizontal },
  { value: 'custom', label: 'Custom', description: 'Manual input', icon: Settings2 },
];

