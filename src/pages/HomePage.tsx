import React, { memo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  Image,
  User,
  Building2,
  Briefcase,
  ChevronRight,
  Loader2,
  Sparkles,
  Clock,
  Check
} from 'lucide-react';
import { AppLogo } from '@/components/Layout/AppLogo';
import { cn } from '@/lib/utils';
import { readJsonFile, writeJsonFile, isTauriApp } from '@/core/storage/NativeStorage';
import { toast } from 'sonner';
import { useUserStore } from '@/store/userStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserProfile {
  name: string;
  role: string;
  studioName: string;
  onboardedAt: number;
}

interface HomePageProps {
  onOpenVisualEditor: () => void;
  className?: string;
}

const USER_PROFILE_FILE = 'user_profile.json';
const LOCAL_STORAGE_KEY = 'segitelep_user_profile';

// Psychological hook: Endowed progress - suggested roles make users feel they're already partway there
const ROLE_SUGGESTIONS = [
  'News Anchor',
  'Content Creator',
  'Presenter',
  'Director',
  'Producer',
];

const STUDIO_SUGGESTIONS = [
  'Studio A',
  'Home Office',
  'Main Stage',
  'Production Room',
];

export const HomePage = memo<HomePageProps>(({ onOpenVisualEditor, className }) => {
  const { user, updateUser, isLoading: isStoreLoading } = useUserStore();
  const [step, setStep] = useState<'loading' | 'onboarding' | 'dashboard'>('loading');
  // const [profile, setProfile] = useState<UserProfile | null>(null); // Use store user instead
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    studioName: '',
    avatar: '',
  });
  const [formStep, setFormStep] = useState(0); // Progressive disclosure
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Load profile on mount
  useEffect(() => {
    // If store is loaded
    if (!isStoreLoading) {
      if (user) {
        setStep('dashboard');
        setTimeout(() => setShowWelcome(true), 100);
      } else {
        setStep('onboarding');
      }
    }
  }, [user, isStoreLoading]);

  /* 
  // Old load logic removed in favor of store */

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation with specific feedback
    if (!formData.name.trim()) {
      toast.error('Please enter your name to continue');
      return;
    }

    setIsSubmitting(true);

    try {
      // Artificial delay for perceived thoroughness (psychological hook)
      await new Promise(resolve => setTimeout(resolve, 800));

      await updateUser({
        name: formData.name,
        role: formData.role || 'Director',
        // studioName: formData.studioName, // UserProfile type might need this field, but for now we map to what we have
        avatar: formData.avatar,
        email: formData.studioName // Hack: Storing studio name in email or just ignoring it if not in type
      });

      // Save to localStorage for backup/HomePage local needs if any, strictly optional now
      // ...

      // Success feedback with celebration
      toast.success(
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span>Welcome to SegiTelep, {formData.name.split(' ')[0]}!</span>
        </div>
      );

      setStep('dashboard');
      setTimeout(() => setShowWelcome(true), 100);
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getMotivationalMessage = () => {
    const messages = [
      "Ready to create something amazing?",
      "Let's make today's broadcast unforgettable",
      "Your audience is waiting",
      "Time to shine on screen",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // Loading state with branded experience
  if (step === 'loading') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="relative">
          <AppLogo size="xl" />
          <Loader2 className="h-6 w-6 animate-spin text-primary absolute -bottom-8 left-1/2 -translate-x-1/2" />
        </div>
      </div>
    );
  }

  // Onboarding with progressive disclosure and psychological hooks
  if (step === 'onboarding') {
    return (
      <div className={cn(
        "min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6 md:p-8",
        className
      )}>
        <div className="w-full max-w-2xl">
          {/* Progress indicator - Zeigarnik effect */}
          <div className="mb-8 flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  i <= formStep ? "w-12 bg-primary" : "w-8 bg-muted",
                )}
              />
            ))}
          </div>

          <Card className="border-border/40 shadow-2xl bg-card/80 backdrop-blur-xl overflow-hidden">
            {/* Decorative header gradient */}
            <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />

            <CardHeader className="text-center pb-6 pt-8 px-4 sm:px-6 md:px-8">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <AppLogo size="lg" />
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
                </div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                Welcome to SegiTelep
              </CardTitle>
              <CardDescription className="text-base sm:text-lg mt-3 max-w-md mx-auto">
                {formStep === 0 && "Let's get you set up in just a few seconds"}
                {formStep === 1 && "Tell us about your professional role"}
                {formStep === 2 && "Where will you be broadcasting from?"}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-4 sm:px-6 md:px-8 pb-6">
              <form onSubmit={handleOnboardingSubmit} className="space-y-6">
                {/* Step 0: Name and Avatar */}
                <div className={cn(
                  "space-y-4 transition-all duration-500",
                  formStep === 0 ? "opacity-100 translate-y-0" : "hidden"
                )}>
                  <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="relative group cursor-pointer">
                      <Avatar className="h-24 w-24 border-4 border-primary/20 ring-4 ring-primary/5 transition-all group-hover:scale-105">
                        <AvatarImage src={formData.avatar} />
                        <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                          {formData.name ? formData.name.charAt(0).toUpperCase() : <User size={32} />}
                        </AvatarFallback>
                      </Avatar>
                      <label
                        htmlFor="avatar-upload-home"
                        className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-300"
                      >
                        <span className="text-white font-medium text-xs">Change</span>
                      </label>
                      <input
                        id="avatar-upload-home"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2 text-base font-medium">
                      <User size={18} className="text-primary" />
                      What's your name?
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-background/50 h-12 text-base border-border/50 focus:border-primary transition-colors"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && formData.name.trim()) {
                          e.preventDefault();
                          setFormStep(1);
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be displayed on your dashboard
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => formData.name.trim() && setFormStep(1)}
                    disabled={!formData.name.trim()}
                    className="w-full h-12 text-base font-semibold group relative overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      Continue
                      <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  </Button>
                </div>

                {/* Step 1: Role */}
                <div className={cn(
                  "space-y-4 transition-all duration-500",
                  formStep === 1 ? "opacity-100 translate-y-0" : "hidden"
                )}>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="flex items-center gap-2 text-base font-medium">
                      <Briefcase size={18} className="text-primary" />
                      What's your role?
                    </Label>
                    <Input
                      id="role"
                      placeholder="e.g. News Anchor, Content Creator"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="bg-background/50 h-12 text-base border-border/50 focus:border-primary transition-colors"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setFormStep(2);
                        }
                      }}
                    />

                    {/* Quick select suggestions - Endowed progress */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {ROLE_SUGGESTIONS.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setFormData({ ...formData, role })}
                          className={cn(
                            "px-3 py-1.5 text-xs rounded-full border transition-all hover:scale-105",
                            formData.role === role
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background/50 border-border/50 hover:border-primary/50"
                          )}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={() => setFormStep(0)}
                      variant="outline"
                      className="flex-1 h-12"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setFormStep(2)}
                      className="flex-1 h-12 text-base font-semibold group"
                    >
                      Continue
                      <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>

                {/* Step 2: Studio */}
                <div className={cn(
                  "space-y-4 transition-all duration-500",
                  formStep === 2 ? "opacity-100 translate-y-0" : "hidden"
                )}>
                  <div className="space-y-2">
                    <Label htmlFor="studio" className="flex items-center gap-2 text-base font-medium">
                      <Building2 size={18} className="text-primary" />
                      Where's your studio?
                    </Label>
                    <Input
                      id="studio"
                      placeholder="e.g. Studio A, Home Office"
                      value={formData.studioName}
                      onChange={(e) => setFormData({ ...formData, studioName: e.target.value })}
                      className="bg-background/50 h-12 text-base border-border/50 focus:border-primary transition-colors"
                      autoFocus
                    />

                    {/* Quick select suggestions */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {STUDIO_SUGGESTIONS.map((studio) => (
                        <button
                          key={studio}
                          type="button"
                          onClick={() => setFormData({ ...formData, studioName: studio })}
                          className={cn(
                            "px-3 py-1.5 text-xs rounded-full border transition-all hover:scale-105",
                            formData.studioName === studio
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background/50 border-border/50 hover:border-primary/50"
                          )}
                        >
                          {studio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={() => setFormStep(1)}
                      variant="outline"
                      className="flex-1 h-12"
                      disabled={isSubmitting}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 h-12 text-base font-semibold group relative overflow-hidden"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          <span className="relative z-10 flex items-center">
                            Get Started
                            <Sparkles className="ml-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-accent/30 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>

            <CardFooter className="justify-center pt-2 pb-6 px-4 bg-muted/20">
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                🔒 Your details are stored locally on your device for a personalized experience
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Dashboard with psychological hooks and improved responsiveness
  return (
    <div
      className={cn(
        'min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6 md:p-8',
        className
      )}
    >
      <div className={cn(
        "w-full max-w-4xl transition-all duration-700",
        showWelcome ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}>
        {/* Welcome header with staggered animations */}
        <div className="mb-8 sm:mb-12 text-center">
          <div className={cn(
            "flex justify-center mb-6 transition-all duration-500 delay-100",
            showWelcome ? "opacity-100 scale-100" : "opacity-0 scale-95"
          )}>
            <div className="relative">
              <AppLogo size="xl" showText={false} />
              {/* Ambient pulse effect */}
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            </div>
          </div>

          <div className={cn(
            "transition-all duration-500 delay-200",
            showWelcome ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 tracking-tight">
              {getTimeGreeting()},{' '}
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient bg-300-percent">
                {user?.name?.split(' ')[0]}
              </span>
            </h1>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl text-muted-foreground mb-4">
              <span className="flex items-center gap-2">
                <Briefcase size={16} className="text-primary" />
                {user?.role}
              </span>
              <span className="hidden sm:inline text-muted-foreground/40">•</span>
              <span className="flex items-center gap-2">
                <Building2 size={16} className="text-accent" />
                {user?.email || 'Studio One'}
              </span>
            </div>

            <p className="text-muted-foreground/80 text-sm sm:text-base mt-4 font-medium">
              {getMotivationalMessage()}
            </p>
          </div>
        </div>

        {/* Editor selection cards - Simplified to only Visual Editor */}
        <div className={cn(
          "flex justify-center mb-8 transition-all duration-500 delay-300",
          showWelcome ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          {/* Visual Editor Card */}
          <Card
            className="group cursor-pointer border-2 border-border/40 hover:border-accent/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:shadow-accent/10 hover:-translate-y-1 overflow-hidden max-w-md w-full"
            onClick={onOpenVisualEditor}
          >
            {/* Decorative gradient bar */}
            <div className="h-1 bg-gradient-to-r from-accent/50 via-accent to-accent/50 group-hover:via-accent/80 transition-colors" />

            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                {/* Icon with animated background */}
                <div className="relative">
                  <div className="absolute inset-0 bg-accent/20 rounded-2xl blur-xl group-hover:bg-accent/30 transition-colors" />
                  <div className="relative p-4 sm:p-5 rounded-2xl bg-accent/10 group-hover:bg-accent/20 transition-all group-hover:scale-110">
                    <Image className="w-10 h-10 sm:w-12 sm:h-12 text-accent" />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h3 className="font-bold text-xl sm:text-2xl">Visual Editor</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Image-based prompts and visual cues
                  </p>
                </div>

                {/* Features list */}
                <div className="w-full pt-4 space-y-2 text-left border-t border-border/30">
                  {['Visual prompts', 'Image slides', 'Multimedia support'].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <Check size={14} className="text-accent flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Button
                  variant="secondary"
                  className="w-full bg-accent/10 hover:bg-accent/20 border border-accent/30 group-hover:shadow-lg group-hover:shadow-accent/20 transition-shadow"
                  onClick={onOpenVisualEditor}
                >
                  Start New Project
                  <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick stats - Social proof and engagement */}
        <div className={cn(
          "grid grid-cols-3 gap-3 sm:gap-4 mb-6 transition-all duration-500 delay-400",
          showWelcome ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <div className="text-center p-3 sm:p-4 rounded-lg bg-card/30 backdrop-blur-sm border border-border/20">
            <div className="text-lg sm:text-2xl font-bold text-primary">
              {Math.floor((Date.now() - (user?.createdAt || Date.now())) / (1000 * 60 * 60 * 24))}
            </div>
            <div className="text-xs text-muted-foreground">Days Active</div>
          </div>

          <div className="text-center p-3 sm:p-4 rounded-lg bg-card/30 backdrop-blur-sm border border-border/20">
            <div className="flex items-center justify-center gap-1 text-lg sm:text-2xl font-bold text-accent">
              <Clock size={20} className="hidden sm:inline" />
              Ready
            </div>
            <div className="text-xs text-muted-foreground">Status</div>
          </div>

          <div className="text-center p-3 sm:p-4 rounded-lg bg-card/30 backdrop-blur-sm border border-border/20">
            <div className="text-lg sm:text-2xl font-bold text-primary">Pro</div>
            <div className="text-xs text-muted-foreground">Version</div>
          </div>
        </div>

        {/* Footer */}
        <div className={cn(
          "text-center transition-all duration-500 delay-500",
          showWelcome ? "opacity-100" : "opacity-0"
        )}>
          <p className="text-xs sm:text-sm text-muted-foreground/40">
            SegiTelep Pro v1.0.0 • Designed for professional broadcasters
          </p>
        </div>
      </div>


    </div>
  );
});

HomePage.displayName = 'HomePage';