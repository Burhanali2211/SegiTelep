import React, { memo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';

interface AudioUploaderProps {
  onUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export const AudioUploader = memo<AudioUploaderProps>(({
  onUpload,
  isLoading = false,
  className
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      await onUpload(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onUpload]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={className}>
      <Button
        onClick={handleClick}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Upload size={16} />
        )}
        Add Audio Files
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      <span className="text-xs text-muted-foreground ml-3">
        MP3, WAV, OGG, M4A (max 50MB)
      </span>
    </div>
  );
});

AudioUploader.displayName = 'AudioUploader';
