import React, { useEffect, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, User, Briefcase, Mail } from 'lucide-react';

interface UserProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UserProfileDialog({ open, onOpenChange }: UserProfileDialogProps) {
    const { user, updateUser, isLoading } = useUserStore();

    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [email, setEmail] = useState('');
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    // Initialize form when user data is loaded or dialog opens
    useEffect(() => {
        if (open && user) {
            setName(user.name);
            setRole(user.role);
            setEmail(user.email || '');
            setAvatarPreview(user.avatar || null);
        } else if (open && !user) {
            // Clear form for new user
            setName('');
            setRole('');
            setEmail('');
            setAvatarPreview(null);
        }
    }, [open, user]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !role.trim()) return;

        await updateUser({
            name,
            role,
            email,
            avatar: avatarPreview || undefined,
        });

        onOpenChange(false);
    };

    const isEditMode = !!user;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Profile' : 'Welcome to SegiTelep'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode
                            ? 'Update your personal details here.'
                            : 'Please set up your profile to continue.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative group">
                            <Avatar className="h-24 w-24 border-2 border-primary/20">
                                <AvatarImage src={avatarPreview || ''} />
                                <AvatarFallback className="text-2xl">{name ? name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                            </Avatar>
                            <label
                                htmlFor="avatar-upload"
                                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                            >
                                <Camera className="w-6 h-6 text-white" />
                            </label>
                            <input
                                id="avatar-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarChange}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">Click to upload avatar</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="flex items-center gap-2">
                                <User size={14} /> Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role" className="flex items-center gap-2">
                                <Briefcase size={14} /> Role / Title <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                placeholder="Chief Director"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-2">
                                <Mail size={14} /> Email <span className="text-muted-foreground text-[10px] ml-auto">(Optional)</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="john@example.com"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isLoading || !name || !role} className="w-full">
                            {isLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Start Using App')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
