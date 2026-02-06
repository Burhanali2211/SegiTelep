import React, { memo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music } from 'lucide-react';
import { AudioFile } from './types';
import { AudioFileItem } from './AudioFileItem';

interface AudioFileListProps {
  audioFiles: AudioFile[];
  selectedAudioId: string | null;
  playingId: string | null;
  onSelect: (id: string) => void;
  onTogglePlay: (audioFile: AudioFile) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  maxHeight?: string;
}

export const AudioFileList = memo<AudioFileListProps>(({
  audioFiles,
  selectedAudioId,
  playingId,
  onSelect,
  onTogglePlay,
  onDelete,
  onRename,
  maxHeight = '300px',
}) => {
  if (audioFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Music size={32} className="text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">No audio files yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Upload audio files to use with your segments
        </p>
      </div>
    );
  }

  return (
    <ScrollArea style={{ maxHeight }} className="pr-2">
      <div className="space-y-2">
        {audioFiles.map((audioFile) => (
          <AudioFileItem
            key={audioFile.id}
            audioFile={audioFile}
            isSelected={selectedAudioId === audioFile.id}
            isPlaying={playingId === audioFile.id}
            onSelect={onSelect}
            onTogglePlay={onTogglePlay}
            onDelete={onDelete}
            onRename={onRename}
          />
        ))}
      </div>
    </ScrollArea>
  );
});

AudioFileList.displayName = 'AudioFileList';
