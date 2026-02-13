import React, { memo, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  LayoutTemplate,
  FileText,
  Mic,
  Video,
  Presentation,
  Plus,
  Download,
  Trash2,
  Star,
  StarOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

const TEMPLATES_STORAGE_KEY = 'teleprompter-templates';

export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'presentation' | 'interview' | 'video' | 'speech' | 'custom';
  content: string;
  wordCount: number;
  estimatedDuration: number; // seconds
  isFavorite: boolean;
  isBuiltIn: boolean;
  createdAt: number;
}

// Built-in templates
const BUILT_IN_TEMPLATES: Omit<ScriptTemplate, 'id' | 'createdAt'>[] = [
  {
    name: 'Video Introduction',
    description: 'Standard YouTube/video intro template with hook and channel intro',
    category: 'video',
    content: `Hey everyone, welcome back to the channel!

If you're new here, my name is [Your Name] and on this channel we talk about [Topic].

Today we're going to be covering [Main Topic], and by the end of this video you'll learn:
- Point 1
- Point 2  
- Point 3

Before we dive in, make sure to hit that subscribe button and the notification bell so you don't miss any future videos.

Alright, let's get into it!`,
    wordCount: 82,
    estimatedDuration: 35,
    isFavorite: false,
    isBuiltIn: true,
  },
  {
    name: 'Presentation Opening',
    description: 'Professional presentation opening for meetings and conferences',
    category: 'presentation',
    content: `Good [morning/afternoon], everyone. Thank you for being here today.

My name is [Your Name], and I'm the [Your Role] at [Company/Organization].

Today I'll be presenting on [Topic], which I believe is crucial for [Reason/Impact].

Over the next [X] minutes, I'll walk you through:
1. [Agenda Item 1]
2. [Agenda Item 2]
3. [Agenda Item 3]

Please feel free to save your questions for the Q&A session at the end.

Let's begin with [First Topic]...`,
    wordCount: 78,
    estimatedDuration: 32,
    isFavorite: false,
    isBuiltIn: true,
  },
  {
    name: 'Interview Response',
    description: 'STAR method response template for interviews',
    category: 'interview',
    content: `That's a great question. Let me share an example.

**Situation:**
In my previous role at [Company], we faced [Challenge/Situation].

**Task:**
I was responsible for [Your Responsibility].

**Action:**
I took the following steps:
- First, I [Action 1]
- Then, I [Action 2]
- Finally, I [Action 3]

**Result:**
As a result of these efforts, we achieved [Outcome/Metrics].

This experience taught me [Key Learning], which I believe would be valuable in this role.`,
    wordCount: 85,
    estimatedDuration: 36,
    isFavorite: false,
    isBuiltIn: true,
  },
  {
    name: 'Speech Introduction',
    description: 'Engaging speech opening with hook and credibility',
    category: 'speech',
    content: `[Pause and make eye contact]

[Opening Hook - Choose one:]
- "Did you know that [Surprising Statistic]?"
- "Imagine a world where [Vision]..."
- "[Powerful Quote]"

That's exactly what I want to talk to you about today.

I've spent the last [X years] [Your Experience], and in that time I've discovered [Key Insight].

Today, I want to share with you [Number] key ideas that will change how you think about [Topic].

Are you ready? Let's dive in.`,
    wordCount: 76,
    estimatedDuration: 30,
    isFavorite: false,
    isBuiltIn: true,
  },
  {
    name: 'Video Outro',
    description: 'Standard video ending with call-to-action',
    category: 'video',
    content: `And that's everything you need to know about [Topic]!

Quick recap of what we covered:
- [Key Point 1]
- [Key Point 2]
- [Key Point 3]

If you found this video helpful, please give it a thumbs up - it really helps the channel grow.

And if you want to see more content like this, make sure to subscribe and hit that bell icon.

Drop a comment below letting me know [Question for Engagement].

I'll see you in the next one. Take care!`,
    wordCount: 78,
    estimatedDuration: 33,
    isFavorite: false,
    isBuiltIn: true,
  },
];

interface TemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (content: string) => void;
}

export const TemplatesDialog = memo<TemplatesDialogProps>(({
  open,
  onOpenChange,
  onSelectTemplate,
}) => {
  const [templates, setTemplates] = useState<ScriptTemplate[]>(() => {
    // Load custom templates from storage
    try {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      const customTemplates: ScriptTemplate[] = stored ? JSON.parse(stored) : [];

      // Combine built-in and custom templates
      const builtInWithIds = BUILT_IN_TEMPLATES.map(t => ({
        ...t,
        id: `builtin-${t.name.toLowerCase().replace(/\s+/g, '-')}`,
        createdAt: 0,
      }));

      return [...builtInWithIds, ...customTemplates];
    } catch {
      return BUILT_IN_TEMPLATES.map(t => ({
        ...t,
        id: `builtin-${t.name.toLowerCase().replace(/\s+/g, '-')}`,
        createdAt: 0,
      }));
    }
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch = (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sort: favorites first, then by name
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.name.localeCompare(b.name);
  });

  const saveTemplates = useCallback((newTemplates: ScriptTemplate[]) => {
    const customOnly = newTemplates.filter(t => !t.isBuiltIn);
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(customOnly));
    setTemplates(newTemplates);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    saveTemplates(templates.map(t =>
      t.id === id ? { ...t, isFavorite: !t.isFavorite } : t
    ));
  }, [templates, saveTemplates]);

  const deleteTemplate = useCallback((id: string) => {
    const template = templates.find(t => t.id === id);
    if (template?.isBuiltIn) {
      toast.error('Cannot delete built-in templates');
      return;
    }
    saveTemplates(templates.filter(t => t.id !== id));
    toast.success('Template deleted');
  }, [templates, saveTemplates]);

  const handleUseTemplate = useCallback((template: ScriptTemplate) => {
    onSelectTemplate(template.content);
    onOpenChange(false);
    toast.success(`Applied template: ${template.name}`);
  }, [onSelectTemplate, onOpenChange]);

  const categoryIcons: Record<string, React.ReactNode> = {
    presentation: <Presentation size={14} />,
    interview: <Mic size={14} />,
    video: <Video size={14} />,
    speech: <FileText size={14} />,
    custom: <LayoutTemplate size={14} />,
  };

  const categories = ['all', 'presentation', 'interview', 'video', 'speech', 'custom'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate size={20} className="text-primary" />
            Script Templates
          </DialogTitle>
          <DialogDescription>
            Choose a template to quickly start your script
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Search and Filter */}
          <div className="flex gap-2">
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="h-7 text-xs capitalize"
              >
                {cat === 'all' ? 'All' : (
                  <>
                    {categoryIcons[cat]}
                    <span className="ml-1">{cat}</span>
                  </>
                )}
              </Button>
            ))}
          </div>

          <Separator />

          {/* Templates List */}
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-4">
              {sortedTemplates.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <LayoutTemplate size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No templates found</p>
                </div>
              ) : (
                sortedTemplates.map(template => (
                  <div
                    key={template.id}
                    className={cn(
                      "p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer group",
                      template.isFavorite && "border-primary/30 bg-primary/5"
                    )}
                    onClick={() => handleUseTemplate(template)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm truncate">{template.name}</h4>
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {categoryIcons[template.category]}
                            <span className="ml-1">{template.category}</span>
                          </Badge>
                          {template.isBuiltIn && (
                            <Badge variant="outline" className="text-[10px]">Built-in</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span>{template.wordCount} words</span>
                          <span>~{Math.ceil(template.estimatedDuration / 60)} min</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(template.id);
                          }}
                        >
                          {template.isFavorite ? (
                            <Star size={14} className="text-warning fill-warning" />
                          ) : (
                            <StarOff size={14} />
                          )}
                        </Button>
                        {!template.isBuiltIn && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTemplate(template.id);
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

TemplatesDialog.displayName = 'TemplatesDialog';

// Export function to save current content as template
export function saveAsTemplate(
  name: string,
  description: string,
  category: ScriptTemplate['category'],
  content: string
): ScriptTemplate {
  const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
  const estimatedDuration = Math.ceil((wordCount / 150) * 60); // 150 WPM average

  const template: ScriptTemplate = {
    id: uuidv4(),
    name,
    description,
    category,
    content,
    wordCount,
    estimatedDuration,
    isFavorite: false,
    isBuiltIn: false,
    createdAt: Date.now(),
  };

  // Save to storage
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    const existing: ScriptTemplate[] = stored ? JSON.parse(stored) : [];
    existing.push(template);
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to save template:', e);
  }

  return template;
}
