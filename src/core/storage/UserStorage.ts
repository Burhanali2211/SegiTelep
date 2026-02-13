import { getDB } from './db';
import { UserProfile } from '@/types/user.types';

const USER_PROFILE_KEY = 'current_user';

export async function saveUserProfile(profile: UserProfile): Promise<void> {
    const db = await getDB();
    await db.put('user_profile', { ...profile, id: USER_PROFILE_KEY });
}

export async function getUserProfile(): Promise<UserProfile | undefined> {
    const db = await getDB();
    return db.get('user_profile', USER_PROFILE_KEY);
}

export async function deleteUserProfile(): Promise<void> {
    const db = await getDB();
    await db.delete('user_profile', USER_PROFILE_KEY);
}
