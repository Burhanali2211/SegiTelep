import React, { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart, ExternalLink, Github, Mail, Instagram } from 'lucide-react';
import { AppLogo } from '@/components/Layout/AppLogo';

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AboutDialog = memo<AboutDialogProps>(({ open, onOpenChange }) => {
  const currentYear = new Date().getFullYear();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mb-4">
            <AppLogo size="xl" showText={false} />
          </div>
          <DialogTitle className="text-xl">SegiTelep</DialogTitle>
          <DialogDescription>
            Professional Segmentation Teleprompter
          </DialogDescription>
        </DialogHeader>
        
        <div className="text-center space-y-4 py-4">
          <div>
            <p className="text-sm text-muted-foreground">Version 1.0.0</p>
          </div>
          
          <div className="py-4 border-y border-border">
            <p className="text-sm text-muted-foreground">
              A professional teleprompter with advanced segmentation features, 
              designed for smooth content delivery and broadcast workflows.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Features
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Text and Visual editing modes</li>
              <li>• Advanced segment management</li>
              <li>• Audio waveform synchronization</li>
              <li>• Mirror mode for teleprompter glass</li>
              <li>• Professional playback controls</li>
              <li>• Keyboard shortcuts for hands-free control</li>
            </ul>
          </div>
          
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8" 
              onClick={() => window.open('https://github.com/Burhanali2211', '_blank')}
            >
              <Github size={14} className="mr-1.5" />
              GitHub
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8" 
              onClick={() => window.open('https://instagram.com/burhan_ali313', '_blank')}
            >
              <Instagram size={14} className="mr-1.5" />
              Instagram
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8" 
              onClick={() => window.open('mailto:gamingcristy19@gmail.com', '_blank')}
            >
              <Mail size={14} className="mr-1.5" />
              Email
            </Button>
          </div>
          
          <div className="pt-4 text-center space-y-1">
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              Made with <Heart size={10} className="text-destructive fill-destructive" /> by Ali
            </p>
            <p className="text-[10px] text-muted-foreground">
              © {currentYear} Ali. All rights reserved
            </p>
            <p className="text-[10px] text-muted-foreground">
              GitHub: @Burhanali2211 | Instagram: @burhan_ali313
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

AboutDialog.displayName = 'AboutDialog';
