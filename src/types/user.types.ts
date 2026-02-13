export interface UserProfile {
    id: string;
    name: string;
    role: string;
    email?: string;
    avatar?: string; // Base64 or URL
    isOnboarded: boolean;
    createdAt: number;
    updatedAt: number;
}
