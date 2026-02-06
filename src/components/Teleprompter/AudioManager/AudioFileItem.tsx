import React, { memo, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  Pause, 
  Trash2, 
  CheckCircle, 
  Pencil,
  X,
  Check,
} from 'lucide-react';
import { AudioFile } from './types';
import { cn } from '@/lib/utils';

interface AudioFileItemProps {
  audioFile: AudioFile;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: (id: string) => void;
  onTogglePlay: (audioFile: AudioFile) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const AudioFileItem = memo<AudioFileItemProps>(({
  audioFile,
  isSelected,
  isPlaying,
  onSelect,
  onTogglePlay,
  onDelete,
  onRename,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(audioFile.name);

  const handleStartEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(audioFile.name);
    setIsEditing(true);
  }, [audioFile.name]);

  const handleSaveEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (editName.trim()) {
      onRename(audioFile.id, editName.trim());
    }
    setIsEditing(false);
  }, [audioFile.id, editName, onRename]);

  const handleCancelEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditName(audioFile.name);
  }, [audioFile.name]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editName.trim()) {
        onRename(audioFile.id, editName.trim());
      }
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(audioFile.name);
    }
  }, [audioFile.id, audioFile.name, editName, onRename]);

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-transparent bg-card hover:bg-secondary'
      )}
      onClick={() => onSelect(audioFile.id)}
    >
      {/* Play button */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-9 w-9"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePlay(audioFile);
        }}
      >
        {isPlaying ? (
          <Pause size={18} className="text-primary" />
        ) : (
          <Play size={18} />
        )}
      </Button>

      {/* Name and info */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="h-7 text-sm"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleSaveEdit}
            >
              <Check size={14} className="text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleCancelEdit}
            >
              <X size={14} />
            </Button>
          </div>
        ) : (
          <>
            <p className="font-medium truncate">{audioFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDuration(audioFile.duration)} • {formatFileSize(audioFile.size)}
            </p>
          </>
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && !isEditing && (
        <CheckCircle size={18} className="text-primary shrink-0" />
      )}

      {/* Actions */}
      {!isEditing && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleStartEdit}
          >
            <Pencil size={14} />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(audioFile.id);
            }}
          >
            <Trash2 size={14} />
          </Button>
        </>
      )}
    </div>
  );
});

AudioFileItem.displayName = 'AudioFileItem';
