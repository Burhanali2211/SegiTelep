import { create } from 'zustand';
import { UserProfile } from '@/types/user.types';
import { getUserProfile, saveUserProfile } from '@/core/storage/UserStorage';

interface UserState {
    user: UserProfile | null;
    isLoading: boolean;
    error: string | null;

    loadUser: () => Promise<void>;
    updateUser: (profile: Partial<UserProfile>) => Promise<void>;
    clearUser: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
    user: null,
    isLoading: true,
    error: null,

    loadUser: async () => {
        set({ isLoading: true, error: null });
        try {
            const user = await getUserProfile();
            set({ user: user || null, isLoading: false });
        } catch (error) {
            console.error('Failed to load user profile:', error);
            set({ error: 'Failed to load user profile', isLoading: false });
        }
    },

    updateUser: async (updates) => {
        const currentUser = get().user;
        const now = Date.now();

        // Create new profile or update existing
        const newProfile: UserProfile = currentUser
            ? { ...currentUser, ...updates, updatedAt: now }
            : {
                id: 'current_user',
                name: updates.name || '',
                role: updates.role || '',
                isOnboarded: true,
                createdAt: now,
                updatedAt: now,
                ...updates
            } as UserProfile;

        // specific check for required fields if new
        if (!currentUser && (!newProfile.name || !newProfile.role)) {
            // Maybe allow partial updates? Use case: initial creation.
        }

        set({ isLoading: true });
        try {
            await saveUserProfile(newProfile);
            set({ user: newProfile, isLoading: false });
        } catch (error) {
            console.error('Failed to save user profile:', error);
            set({ error: 'Failed to save user profile', isLoading: false });
        }
    },

    clearUser: () => set({ user: null })
}));
