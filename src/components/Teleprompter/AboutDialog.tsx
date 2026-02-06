import React, { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Monitor, Heart, ExternalLink, Github, Mail } from 'lucide-react';

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AboutDialog = memo<AboutDialogProps>(({ open, onOpenChange }) => {
  const currentYear = new Date().getFullYear();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <Monitor size={32} className="text-primary" />
          </div>
          <DialogTitle className="text-xl">ProTeleprompter</DialogTitle>
          <DialogDescription>
            Professional teleprompter for content creators
          </DialogDescription>
        </DialogHeader>
        
        <div className="text-center space-y-4 py-4">
          <div>
            <p className="text-sm text-muted-foreground">Version 1.0.0</p>
          </div>
          
          <div className="py-4 border-y border-border">
            <p className="text-sm text-muted-foreground">
              A powerful, browser-based teleprompter with visual region editing, 
              audio synchronization, and professional playback controls.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Features
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Text and Visual editing modes</li>
              <li>• Timed segment playback</li>
              <li>• Audio waveform synchronization</li>
              <li>• Mirror mode for reflecting glass</li>
              <li>• Keyboard shortcuts for hands-free control</li>
            </ul>
          </div>
          
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8" onClick={() => window.open('https://github.com', '_blank')}>
              <Github size={14} className="mr-1.5" />
              GitHub
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => window.open('mailto:support@example.com', '_blank')}>
              <Mail size={14} className="mr-1.5" />
              Support
            </Button>
          </div>
          
          <div className="pt-4 text-center">
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              Made with <Heart size={10} className="text-destructive fill-destructive" /> by Lovable
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              © {currentYear} All rights reserved
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

AboutDialog.displayName = 'AboutDialog';
