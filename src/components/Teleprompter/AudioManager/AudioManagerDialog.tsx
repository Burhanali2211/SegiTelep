import React, { memo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Music } from 'lucide-react';
import { useAudioManager } from './useAudioManager';
import { AudioUploader } from './AudioUploader';
import { AudioFileList } from './AudioFileList';
import { AudioPreview } from './AudioPreview';

interface AudioManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segmentId?: string;
  onAssignAudio?: (segmentId: string, audioId: string, autoAdvance: boolean) => void;
  /** When true, show "Use in Project" to load selected audio into current visual project */
  onUseInProject?: (audioFile: { id: string; name: string; data: string; duration: number }) => void;
}

export const AudioManagerDialog = memo<AudioManagerDialogProps>(({
  open,
  onOpenChange,
  segmentId,
  onAssignAudio,
  onUseInProject,
}) => {
  const {
    audioFiles,
    selectedAudioId,
    playingId,
    volume,
    isLoading,
    addAudioFile,
    deleteAudioFile,
    renameAudioFile,
    togglePlayback,
    setVolume,
    toggleMute,
    selectAudio,
    getAudioById,
  } = useAudioManager();

  const [autoAdvance, setAutoAdvance] = React.useState(true);

  const handleAssign = useCallback(() => {
    if (!segmentId || !selectedAudioId || !onAssignAudio) return;
    onAssignAudio(segmentId, selectedAudioId, autoAdvance);
    onOpenChange(false);
  }, [segmentId, selectedAudioId, autoAdvance, onAssignAudio, onOpenChange]);

  const isAssignMode = Boolean(segmentId);
  const isVisualProjectMode = Boolean(onUseInProject);
  const selectedAudio = selectedAudioId ? getAudioById(selectedAudioId) : undefined;

  const handleUseInProject = useCallback(() => {
    if (selectedAudio && onUseInProject) {
      onUseInProject({
        id: selectedAudio.id,
        name: selectedAudio.name,
        data: selectedAudio.data,
        duration: selectedAudio.duration,
      });
      onOpenChange(false);
    }
  }, [selectedAudio, onUseInProject, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music size={20} className="text-primary" />
            {isAssignMode ? 'Assign Audio to Segment' : 'Audio Library'}
          </DialogTitle>
          <DialogDescription>
            {isAssignMode 
              ? 'Select an audio file to assign to this segment'
              : 'Upload and manage your audio files for teleprompter segments'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Upload section */}
          <AudioUploader
            onUpload={addAudioFile}
            isLoading={isLoading}
          />

          {/* Audio list */}
          <AudioFileList
            audioFiles={audioFiles}
            selectedAudioId={selectedAudioId}
            playingId={playingId}
            onSelect={selectAudio}
            onTogglePlay={togglePlayback}
            onDelete={deleteAudioFile}
            onRename={renameAudioFile}
            maxHeight="350px"
          />

          {/* Volume control */}
          <AudioPreview
            volume={volume}
            onVolumeChange={setVolume}
            onToggleMute={toggleMute}
          />

          {/* Auto-advance option for segment assignment */}
          {isAssignMode && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <Label className="text-sm font-medium">Auto-advance when audio ends</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically go to next segment when audio finishes
                </p>
              </div>
              <Switch
                checked={autoAdvance}
                onCheckedChange={setAutoAdvance}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isAssignMode ? 'Cancel' : 'Close'}
          </Button>
          {isAssignMode && (
            <Button onClick={handleAssign} disabled={!selectedAudioId}>
              Assign Audio
            </Button>
          )}
          {isVisualProjectMode && !isAssignMode && (
            <Button onClick={handleUseInProject} disabled={!selectedAudioId}>
              Use in Project
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

AudioManagerDialog.displayName = 'AudioManagerDialog';
