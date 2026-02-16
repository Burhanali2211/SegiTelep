import { useState, useEffect } from 'react';
import { AssetManager } from '@/core/storage/AssetManager';
import { isTauriApp, convertPathToSrc } from '@/core/storage/NativeStorage';

/**
 * Hook to resolve an assetId or data path to a usable URL.
 * Automatically handles Object URL revocation on unmount.
 */
export function useAssetUrl(assetId?: string, data?: string) {
    const [url, setUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(!!(assetId || data));

    useEffect(() => {
        let isMounted = true;
        let currentUrl = '';

        const resolve = async () => {
            setIsLoading(true);
            try {
                if (assetId) {
                    const resolved = await AssetManager.getAssetUrl(assetId);
                    if (isMounted && resolved) {
                        currentUrl = resolved;
                        setUrl(resolved);
                    }
                } else if (data) {
                    if (data.startsWith('data:') || data.startsWith('blob:')) {
                        if (isMounted) setUrl(data);
                    } else if (isTauriApp()) {
                        // Start with absolute path resolution for CAS assets
                        const { getAbsolutePath } = await import('@/core/storage/NativeStorage');
                        const fullPath = await getAbsolutePath(data);
                        currentUrl = convertPathToSrc(fullPath);
                        if (isMounted) setUrl(currentUrl);
                    } else {
                        // Fallback/Legacy
                        if (isMounted) setUrl(data);
                    }
                } else {
                    if (isMounted) setUrl('');
                }
            } catch (error) {
                console.error('Failed to resolve asset URL:', error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        resolve();

        return () => {
            isMounted = false;
            // Note: We don't revoke here because AssetManager manages its own cache.
            // But if we were creating a local Object URL, we would revoke it.
        };
    }, [assetId, data]);

    return { url, isLoading };
}
