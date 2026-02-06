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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, MessageSquare, Settings, AlertCircle } from 'lucide-react';
import { useVoiceInput } from './useVoiceInput';
import { VoiceRecorder } from './VoiceRecorder';
import { TranscriptionDisplay } from './TranscriptionDisplay';
import { VoiceCommands } from './VoiceCommands';
import { SUPPORTED_LANGUAGES } from './types';
import { useTeleprompterStore } from '@/store/teleprompterStore';
import { toast } from 'sonner';

interface VoiceInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertText?: (text: string) => void;
}

export const VoiceInputDialog = memo<VoiceInputDialogProps>(({
  open,
  onOpenChange,
  onInsertText,
}) => {
  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    language,
    continuous,
    toggleListening,
    clearTranscript,
    setLanguage,
    setContinuous,
  } = useVoiceInput({
    enableCommands: true,
  });

  const updateSegment = useTeleprompterStore((s) => s.updateSegment);
  const selectedSegmentId = useTeleprompterStore((s) => s.editor.selectedSegmentId);
  const project = useTeleprompterStore((s) => s.project);

  // Get current segment
  const currentSegment = selectedSegmentId
    ? project?.segments.find((s) => s.id === selectedSegmentId)
    : null;

  // Insert transcript into selected segment
  const handleInsertToSegment = useCallback(() => {
    if (!selectedSegmentId || !transcript) {
      toast.error('No segment selected or no transcript available');
      return;
    }

    const existingContent = currentSegment?.content || '';
    const newContent = existingContent
      ? `${existingContent}\n\n${transcript}`
      : transcript;

    updateSegment(selectedSegmentId, { content: newContent });
    toast.success('Text inserted into segment');
    clearTranscript();
  }, [selectedSegmentId, transcript, currentSegment, updateSegment, clearTranscript]);

  // External insert handler
  const handleInsert = useCallback(() => {
    if (onInsertText && transcript) {
      onInsertText(transcript);
      clearTranscript();
    } else {
      handleInsertToSegment();
    }
  }, [onInsertText, transcript, clearTranscript, handleInsertToSegment]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic size={20} className="text-primary" />
            Voice Input
          </DialogTitle>
          <DialogDescription>
            Use your voice to add text or control playback
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <Tabs defaultValue="record" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="record" className="gap-2">
              <Mic size={14} />
              Record
            </TabsTrigger>
            <TabsTrigger value="commands" className="gap-2">
              <MessageSquare size={14} />
              Commands
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings size={14} />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="record" className="mt-4 space-y-4">
            <VoiceRecorder
              isListening={isListening}
              isSupported={isSupported}
              onToggle={toggleListening}
            />
            
            <TranscriptionDisplay
              transcript={transcript}
              interimTranscript={interimTranscript}
              onClear={clearTranscript}
            />
          </TabsContent>

          <TabsContent value="commands" className="mt-4">
            <VoiceCommands />
          </TabsContent>

          <TabsContent value="settings" className="mt-4 space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Continuous Recognition</Label>
                  <p className="text-xs text-muted-foreground">
                    Keep listening until manually stopped
                  </p>
                </div>
                <Switch
                  checked={continuous}
                  onCheckedChange={setContinuous}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleInsert}
            disabled={!transcript || !selectedSegmentId}
          >
            Insert to Segment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

VoiceInputDialog.displayName = 'VoiceInputDialog';
